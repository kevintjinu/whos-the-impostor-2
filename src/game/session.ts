import { updateAccusationSelection } from './accusation'
import {
  initialEndgame,
  lockAndRevealAccusation,
  recordFinalGuess,
  type EndgameState,
  type RoundResult,
} from './endgame'
import type { Player } from './players'
import {
  createAssignmentHistory,
  createRound,
  type AssignmentHistory,
  type GameRound,
  type RandomSource,
} from './round'
import type { GameSettings } from './settings'

export type GameSession = Readonly<{
  players: readonly Readonly<Player>[]
  settings: Readonly<GameSettings>
  history: AssignmentHistory
  round: GameRound
  endgame: EndgameState
  draft: readonly string[]
  revealComplete: boolean
  results: readonly RoundResult[]
  scores: Readonly<Record<string, number>>
  status: 'playing' | 'finished'
}>

export class SessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionError'
  }
}

export function createSession(
  players: readonly Player[],
  settings: GameSettings,
  random?: RandomSource,
): GameSession {
  const roster = Object.freeze(players.map((player) => Object.freeze({ ...player })))
  const savedSettings = Object.freeze({ ...settings })
  const created = createRound(roster, savedSettings, createAssignmentHistory(), random)
  return Object.freeze({
    players: roster,
    settings: savedSettings,
    history: created.history,
    round: created.round,
    endgame: initialEndgame(),
    draft: Object.freeze([]),
    revealComplete: false,
    results: Object.freeze([]),
    scores: Object.freeze(Object.fromEntries(roster.map(({ id }) => [id, 0]))),
    status: 'playing',
  })
}

export function markRevealComplete(session: GameSession): GameSession {
  if (session.status !== 'playing' || session.endgame.phase !== 'accusation') {
    throw new SessionError('This round is no longer in the private reveal phase.')
  }
  return session.revealComplete ? session : Object.freeze({ ...session, revealComplete: true })
}

export function selectAccusedPlayer(session: GameSession, playerId: string): GameSession {
  if (!session.revealComplete || session.endgame.phase !== 'accusation' || session.status !== 'playing') {
    throw new SessionError('This accusation cannot be changed.')
  }
  return Object.freeze({
    ...session,
    draft: updateAccusationSelection(
      session.round.mode,
      session.players.map(({ id }) => id),
      session.draft,
      playerId,
    ),
  })
}

function applyEndgame(session: GameSession, endgame: EndgameState): GameSession {
  if (endgame.phase !== 'completed') {
    return Object.freeze({ ...session, endgame })
  }

  const result = endgame.result
  if (session.results.some(({ roundNumber }) => roundNumber === result.roundNumber)) {
    throw new SessionError('This round has already been scored.')
  }
  const scores = { ...session.scores }
  if (session.settings.scoring === 'competitive') {
    for (const { id } of session.players) {
      const isImpostor = result.impostorIds.includes(id)
      if (isImpostor === (result.winner === 'impostors')) {
        scores[id] += 1
      }
    }
  }
  const results = Object.freeze([...session.results, result])
  const finished = session.settings.roundCount !== 'endless'
    && results.length >= session.settings.roundCount

  return Object.freeze({
    ...session,
    endgame,
    results,
    scores: Object.freeze(scores),
    status: finished ? 'finished' : 'playing',
  })
}

export function revealAccusation(session: GameSession): GameSession {
  if (!session.revealComplete || session.status !== 'playing') {
    throw new SessionError('Finish the private reveals before locking an accusation.')
  }
  return applyEndgame(session, lockAndRevealAccusation(
    session.endgame,
    session.round,
    session.players.map(({ id }) => id),
    session.draft,
  ))
}

export function judgeFinalGuess(session: GameSession, correct: boolean): GameSession {
  if (session.status !== 'playing') {
    throw new SessionError('This session has finished.')
  }
  return applyEndgame(session, recordFinalGuess(session.endgame, session.round, correct))
}

export function startNextRound(session: GameSession, random?: RandomSource): GameSession {
  if (session.status !== 'playing' || session.endgame.phase !== 'completed') {
    throw new SessionError('Complete the current round before starting another.')
  }
  const created = createRound(session.players, session.settings, session.history, random)
  return Object.freeze({
    ...session,
    round: created.round,
    history: created.history,
    endgame: initialEndgame(),
    draft: Object.freeze([]),
    revealComplete: false,
  })
}

export function finishSession(session: GameSession): GameSession {
  if (session.endgame.phase !== 'completed') {
    throw new SessionError('Finish this round before ending the game.')
  }
  return session.status === 'finished' ? session : Object.freeze({ ...session, status: 'finished' })
}

export function restartSession(session: GameSession) {
  if (session.status !== 'finished') {
    throw new SessionError('Finish the current session before starting a new one.')
  }
  // Preparing a fresh setup must not create a round or consume randomness.
  // Configuration's intentional Continue creates a new history and Round 1.
  return Object.freeze({ players: session.players, settings: session.settings })
}

export function getLeaderboard(session: GameSession) {
  // Preserve roster order for tied scores; equal scores share the same displayed rank.
  return session.players
    .map(({ id, name }) => ({ id, name, score: session.scores[id] }))
    .sort((a, b) => b.score - a.score)
    .map((player, index, ranked) => ({
      ...player,
      rank: index > 0 && ranked[index - 1].score === player.score
        ? ranked.findIndex(({ score }) => score === player.score) + 1
        : index + 1,
    }))
}
