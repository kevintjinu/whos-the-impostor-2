import { createConfirmedAccusation, type ConfirmedAccusation } from './accusation'
import type { GameRound } from './round'

export type WinningSide = 'majority' | 'impostors'
export type FinalGuess = 'correct' | 'incorrect' | 'not-needed'

export type RoundResult = Readonly<{
  roundNumber: number
  mode: GameRound['mode']
  accusedPlayerIds: readonly string[]
  impostorIds: readonly string[]
  accusationCorrect: boolean
  finalGuess: FinalGuess
  winner: WinningSide
  majorityWord: string
  decoyWord: string | null
}>

export type EndgameState =
  | Readonly<{ phase: 'accusation' }>
  | Readonly<{ phase: 'final-guess'; roundNumber: number; accusation: ConfirmedAccusation }>
  | Readonly<{ phase: 'completed'; result: RoundResult }>

// This projection is the only endgame data supplied to the public screen.
// In particular, the pending guess contains no word fields, even hidden ones.
export type PublicEndgame =
  | Readonly<{ phase: 'accusation' }>
  | Readonly<{
    phase: 'final-guess'
    accusedPlayerIds: readonly string[]
    impostorIds: readonly string[]
  }>
  | Readonly<{ phase: 'completed'; result: RoundResult }>

export class EndgameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EndgameError'
  }
}

export function initialEndgame(): EndgameState {
  return Object.freeze({ phase: 'accusation' })
}

function completeResult(
  round: GameRound,
  accusation: ConfirmedAccusation,
  accusationCorrect: boolean,
  finalGuess: FinalGuess,
): EndgameState {
  return Object.freeze({
    phase: 'completed',
    result: Object.freeze({
      roundNumber: round.roundNumber,
      mode: round.mode,
      accusedPlayerIds: accusation.accusedPlayerIds,
      impostorIds: Object.freeze([...round.impostorIds]),
      accusationCorrect,
      finalGuess,
      winner: !accusationCorrect || finalGuess === 'correct' ? 'impostors' : 'majority',
      majorityWord: round.majorityWord,
      decoyWord: round.decoyWord,
    }),
  })
}

export function lockAndRevealAccusation(
  state: EndgameState,
  round: GameRound,
  playerIds: readonly string[],
  selectedPlayerIds: readonly string[],
): EndgameState {
  if (state.phase !== 'accusation') {
    throw new EndgameError('The accusation is already locked.')
  }

  const accusation = createConfirmedAccusation(null, round.mode, playerIds, selectedPlayerIds)
  const requiredCount = round.mode === 'double-trouble' ? 2 : 1
  if (
    round.impostorIds.length !== requiredCount
    || new Set(round.impostorIds).size !== requiredCount
    || round.impostorIds.some((id) => !playerIds.includes(id))
  ) {
    throw new EndgameError('The round has invalid role assignments.')
  }

  const isCorrect = accusation.accusedPlayerIds.every((id) => round.impostorIds.includes(id))
  return isCorrect
    ? Object.freeze({ phase: 'final-guess', roundNumber: round.roundNumber, accusation })
    : completeResult(round, accusation, false, 'not-needed')
}

export function recordFinalGuess(
  state: EndgameState,
  round: GameRound,
  correct: boolean,
): EndgameState {
  if (state.phase !== 'final-guess') {
    throw new EndgameError('A final guess can only be judged once after a correct accusation.')
  }
  if (typeof correct !== 'boolean') {
    throw new EndgameError('The final guess requires a clear judgement.')
  }
  if (state.roundNumber !== round.roundNumber || state.accusation.mode !== round.mode) {
    throw new EndgameError('The judgement must belong to the same round.')
  }
  return completeResult(round, state.accusation, true, correct ? 'correct' : 'incorrect')
}

export function getPublicEndgame(state: EndgameState, round: GameRound): PublicEndgame {
  switch (state.phase) {
    case 'accusation':
      return Object.freeze({ phase: 'accusation' })
    case 'final-guess':
      return Object.freeze({
        phase: 'final-guess',
        accusedPlayerIds: state.accusation.accusedPlayerIds,
        impostorIds: Object.freeze([...round.impostorIds]),
      })
    case 'completed':
      return Object.freeze({ phase: 'completed', result: state.result })
  }
}
