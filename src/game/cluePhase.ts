export type CluePhaseErrorCode =
  | 'EMPTY_ROSTER'
  | 'DUPLICATE_PLAYER_ID'
  | 'STARTING_PLAYER_NOT_FOUND'

export class CluePhaseError extends Error {
  readonly code: CluePhaseErrorCode

  constructor(code: CluePhaseErrorCode, message: string) {
    super(message)
    this.name = 'CluePhaseError'
    this.code = code
  }
}

export function createSpeakingOrder(
  playerIds: readonly string[],
  startingPlayerId: string,
): string[] {
  if (playerIds.length === 0) {
    throw new CluePhaseError('EMPTY_ROSTER', 'A clue phase requires at least one player.')
  }

  if (new Set(playerIds).size !== playerIds.length) {
    throw new CluePhaseError(
      'DUPLICATE_PLAYER_ID',
      'A clue phase requires unique player IDs.',
    )
  }

  const startingIndex = playerIds.indexOf(startingPlayerId)
  if (startingIndex === -1) {
    throw new CluePhaseError(
      'STARTING_PLAYER_NOT_FOUND',
      'The selected starting player is not in the current roster.',
    )
  }

  return [...playerIds.slice(startingIndex), ...playerIds.slice(0, startingIndex)]
}
