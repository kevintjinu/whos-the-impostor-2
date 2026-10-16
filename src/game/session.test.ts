import { describe, expect, it, vi } from 'vitest'
import {
  createSession,
  finishSession,
  getLeaderboard,
  judgeFinalGuess,
  markRevealComplete,
  restartSession,
  revealAccusation,
  selectAccusedPlayer,
  startNextRound,
  type GameSession,
} from './session'
import { getPublicEndgame } from './endgame'
import { DEFAULT_GAME_SETTINGS } from './settings'

const players = Array.from({ length: 6 }, (_, index) => ({ id: `p${index}`, name: `Player ${index}` }))
function completeRound(session: GameSession, correctAccusation = false, correctGuess = false) {
  let next = markRevealComplete(session)
  const ids = correctAccusation ? session.round.impostorIds : session.round.mode === 'double-trouble' ? ['p4', 'p5'] : ['p5']
  for (const id of ids) next = selectAccusedPlayer(next, id)
  next = revealAccusation(next)
  return next.endgame.phase === 'final-guess' ? judgeFinalGuess(next, correctGuess) : next
}

describe('session scoring and safe transitions', () => {
  it('requires private reveals and rejects early progression and ending', () => {
    const session = createSession(players, DEFAULT_GAME_SETTINGS, () => 0)
    expect(() => revealAccusation(session)).toThrow()
    expect(() => selectAccusedPlayer(session, 'p1')).toThrow()
    expect(() => startNextRound(session, () => 0)).toThrow()
    expect(() => finishSession(session)).toThrow()
    expect(() => restartSession(session)).toThrow()
  })

  it.each([
    [false, false, 'impostors'],
    [true, true, 'impostors'],
    [true, false, 'majority'],
  ] as const)('scores the correct winning side: accusation=%s guess=%s', (accusationCorrect, guessCorrect, winner) => {
    const initial = createSession(players, { ...DEFAULT_GAME_SETTINGS, scoring: 'competitive' }, () => 0)
    const completed = completeRound(initial, accusationCorrect, guessCorrect)
    expect(completed.results).toHaveLength(1)
    expect(completed.results[0].winner).toBe(winner)
    for (const { id } of players) {
      const wins = initial.round.impostorIds.includes(id) === (winner === 'impostors')
      expect(completed.scores[id]).toBe(wins ? 1 : 0)
    }
    expect(() => revealAccusation(completed)).toThrow()
    expect(() => judgeFinalGuess(completed, true)).toThrow()
    expect(() => selectAccusedPlayer(completed, 'p2')).toThrow()
    expect(completed.results).toHaveLength(1)
  })

  it('awards no points in Casual', () => {
    const completed = completeRound(createSession(players, DEFAULT_GAME_SETTINGS, () => 0))
    expect(Object.values(completed.scores)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('scores both Double Trouble impostors once for a successful cooperative guess', () => {
    const initial = createSession(players, { ...DEFAULT_GAME_SETTINGS, mode: 'double-trouble', scoring: 'competitive' }, () => 0)
    const completed = completeRound(initial, true, true)
    expect(completed.results[0].impostorIds).toEqual(['p0', 'p1'])
    expect(completed.scores).toEqual({ p0: 1, p1: 1, p2: 0, p3: 0, p4: 0, p5: 0 })
  })

  it('keeps words private through the pending final guess and awards nothing until completion', () => {
    let session = markRevealComplete(createSession(players, { ...DEFAULT_GAME_SETTINGS, scoring: 'competitive' }, () => 0))
    session = revealAccusation(selectAccusedPlayer(session, session.round.impostorIds[0]))
    expect(session.endgame.phase).toBe('final-guess')
    expect(session.results).toHaveLength(0)
    expect(Object.values(session.scores).every((score) => score === 0)).toBe(true)
    expect(getPublicEndgame(session.endgame, session.round)).not.toHaveProperty('majorityWord')
  })

  it('preserves draft and round through read-only views and reveal completion', () => {
    let session = markRevealComplete(createSession(players, DEFAULT_GAME_SETTINGS, () => 0))
    session = selectAccusedPlayer(session, 'p4')
    const round = session.round
    for (let index = 0; index < 5; index += 1) {
      getPublicEndgame(session.endgame, session.round)
      session = markRevealComplete(session)
    }
    expect(session.round).toBe(round)
    expect(session.draft).toEqual(['p4'])
  })

  it('preserves roster, settings, scores, results and word history on Next Round', () => {
    const completed = completeRound(createSession(players, { ...DEFAULT_GAME_SETTINGS, scoring: 'competitive' }, () => 0))
    const random = vi.fn(() => 0)
    const next = startNextRound(completed, random)
    const drawCount = random.mock.calls.length
    expect(next.players).toBe(completed.players)
    expect(next.settings).toBe(completed.settings)
    expect(next.scores).toBe(completed.scores)
    expect(next.results).toBe(completed.results)
    expect(next.history.usedMajorityWordIds).toHaveLength(2)
    expect(next.history.usedMajorityWordIds).toContain(completed.history.usedMajorityWordIds[0])
    expect(next.round.majorityWord).not.toBe(completed.round.majorityWord)
    expect(next.round.roundNumber).toBe(2)
    expect(next.round).not.toBe(completed.round)
    expect(next.round.impostorIds.some((id) => completed.round.impostorIds.includes(id))).toBe(false)
    expect(next.revealComplete).toBe(false)
    expect(next.draft).toEqual([])
    for (let index = 0; index < 5; index += 1) getPublicEndgame(next.endgame, next.round)
    expect(random).toHaveBeenCalledTimes(drawCount)
    expect(() => startNextRound(next, random)).toThrow()
    expect(random).toHaveBeenCalledTimes(drawCount)
  })

  it.each([5, 10] as const)('completes a finite session after exactly %i rounds', (roundCount) => {
    let session = createSession(players, { ...DEFAULT_GAME_SETTINGS, roundCount, scoring: 'competitive' }, () => 0)
    for (let index = 1; index <= roundCount; index += 1) {
      session = completeRound(session)
      expect(session.results).toHaveLength(index)
      expect(session.status).toBe(index === roundCount ? 'finished' : 'playing')
      if (index < roundCount) session = startNextRound(session, () => 0)
    }
    expect(session.scores.p0).toBe(Math.ceil(roundCount / 2))
    expect(session.scores.p1).toBe(Math.floor(roundCount / 2))
    expect(() => startNextRound(session, () => 0)).toThrow()
    const setup = restartSession(session)
    expect(Object.keys(setup).sort()).toEqual(['players', 'settings'])
    expect(setup).not.toHaveProperty('round')
    // Only the later intentional Configuration action creates a fresh Round 1.
    const restarted = createSession(setup.players, setup.settings, () => 0)
    expect(restarted.players).toEqual(session.players)
    expect(restarted.settings).toEqual(session.settings)
    expect(restarted.results).toEqual([])
    expect(restarted.scores.p0).toBe(0)
    expect(restarted.history.roundsCreated).toBe(1)
    expect(restarted.history.usedMajorityWordIds).toHaveLength(1)
    expect(restarted.round.roundNumber).toBe(1)
    expect(restarted.round.impostorIds).toEqual(['p0'])
    expect(restarted.history.previousImpostorIds).toEqual(['p0'])
  })

  it('progresses Endless beyond ten and retains completed results when ended', () => {
    let session = createSession(players, { ...DEFAULT_GAME_SETTINGS, roundCount: 'endless' }, () => 0)
    for (let index = 0; index < 11; index += 1) {
      session = completeRound(session)
      if (index < 10) session = startNextRound(session, () => 0)
    }
    expect(session.status).toBe('playing')
    const finished = finishSession(session)
    expect(finished.status).toBe('finished')
    expect(finished.results).toBe(session.results)
    expect(finished.scores).toBe(session.scores)
    expect(finishSession(finished)).toBe(finished)
    expect(() => startNextRound(finished, () => 0)).toThrow()
  })

  it('ranks equal scores equally without changing player identity or roster order', () => {
    const session = completeRound(createSession(players, { ...DEFAULT_GAME_SETTINGS, scoring: 'competitive' }, () => 0), true, false)
    expect(getLeaderboard(session).map(({ id, score, rank }) => ({ id, score, rank }))).toEqual([
      ...players.slice(1).map(({ id }) => ({ id, score: 1, rank: 1 })),
      { id: 'p0', score: 0, rank: 6 },
    ])
  })
})
