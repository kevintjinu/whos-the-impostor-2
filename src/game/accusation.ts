import { MAX_PLAYERS, MIN_PLAYERS } from './players'
import type { GameMode } from './settings'

export type ConfirmedAccusation = Readonly<{
  mode: GameMode
  accusedPlayerIds: readonly string[]
}>

export type AccusationErrorCode =
  | 'INVALID_MODE'
  | 'INVALID_ROSTER'
  | 'DUPLICATE_SELECTION'
  | 'UNKNOWN_PLAYER'
  | 'INCORRECT_SELECTION_COUNT'
  | 'TOO_MANY_SELECTIONS'
  | 'ALREADY_CONFIRMED'

export class AccusationError extends Error {
  readonly code: AccusationErrorCode

  constructor(code: AccusationErrorCode, message: string) {
    super(message)
    this.name = 'AccusationError'
    this.code = code
  }
}

export function getRequiredAccusationCount(mode: GameMode): 1 | 2 {
  switch (mode) {
    case 'chaos':
    case 'close-call':
    case 'no-clue':
      return 1
    case 'double-trouble':
      return 2
    default:
      throw new AccusationError('INVALID_MODE', 'The game mode is not valid for an accusation.')
  }
}

function validateRoster(mode: GameMode, playerIds: readonly string[]) {
  if (
    playerIds.length < MIN_PLAYERS
    || playerIds.length > MAX_PLAYERS
    || playerIds.some((playerId) => !playerId)
    || (mode === 'double-trouble' && playerIds.length < 6)
  ) {
    throw new AccusationError('INVALID_ROSTER', 'An accusation requires a valid player roster.')
  }

  if (new Set(playerIds).size !== playerIds.length) {
    throw new AccusationError('INVALID_ROSTER', 'An accusation requires unique player IDs.')
  }
}

function validateKnownDistinctIds(
  selectedPlayerIds: readonly string[],
  playerIds: readonly string[],
) {
  if (new Set(selectedPlayerIds).size !== selectedPlayerIds.length) {
    throw new AccusationError(
      'DUPLICATE_SELECTION',
      'Each accused player may only be selected once.',
    )
  }

  const rosterIds = new Set(playerIds)
  if (selectedPlayerIds.some((playerId) => !rosterIds.has(playerId))) {
    throw new AccusationError(
      'UNKNOWN_PLAYER',
      'Every accused player must belong to the current round.',
    )
  }
}

export function updateAccusationSelection(
  mode: GameMode,
  playerIds: readonly string[],
  selectedPlayerIds: readonly string[],
  playerId: string,
): readonly string[] {
  validateRoster(mode, playerIds)
  validateKnownDistinctIds(selectedPlayerIds, playerIds)
  const requiredCount = getRequiredAccusationCount(mode)
  if (selectedPlayerIds.length > requiredCount) {
    throw new AccusationError('INCORRECT_SELECTION_COUNT', 'The current accusation draft has too many players.')
  }

  if (!playerIds.includes(playerId)) {
    throw new AccusationError('UNKNOWN_PLAYER', 'That player does not belong to the current round.')
  }

  if (requiredCount === 1) {
    return Object.freeze([playerId])
  }

  if (selectedPlayerIds.includes(playerId)) {
    return Object.freeze(selectedPlayerIds.filter((selectedId) => selectedId !== playerId))
  }

  if (selectedPlayerIds.length >= 2) {
    throw new AccusationError(
      'TOO_MANY_SELECTIONS',
      'Double Trouble requires exactly two accused players.',
    )
  }

  return Object.freeze([...selectedPlayerIds, playerId])
}

export function createConfirmedAccusation(
  existingAccusation: ConfirmedAccusation | null,
  mode: GameMode,
  playerIds: readonly string[],
  selectedPlayerIds: readonly string[],
): ConfirmedAccusation {
  if (existingAccusation) {
    throw new AccusationError('ALREADY_CONFIRMED', 'This accusation has already been confirmed.')
  }

  validateRoster(mode, playerIds)
  validateKnownDistinctIds(selectedPlayerIds, playerIds)

  const requiredCount = getRequiredAccusationCount(mode)
  if (selectedPlayerIds.length !== requiredCount) {
    throw new AccusationError(
      'INCORRECT_SELECTION_COUNT',
      `This mode requires exactly ${requiredCount} accused ${requiredCount === 1 ? 'player' : 'players'}.`,
    )
  }

  return Object.freeze({
    mode,
    accusedPlayerIds: Object.freeze([...selectedPlayerIds]),
  })
}
