import { createUuidV4 } from './uuid'

export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 12
export const MAX_PLAYER_NAME_LENGTH = 24

export type Player = {
  id: string
  name: string
}

type NameValidationResult =
  | { isValid: true; name: string }
  | { isValid: false; message: string }

export function normalisePlayerName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function validatePlayerName(
  value: string,
  players: readonly Player[],
): NameValidationResult {
  const name = normalisePlayerName(value)

  if (!name) {
    return { isValid: false, message: 'Enter a player name.' }
  }

  if (name.length > MAX_PLAYER_NAME_LENGTH) {
    return {
      isValid: false,
      message: `Keep names to ${MAX_PLAYER_NAME_LENGTH} characters or fewer.`,
    }
  }

  const nameKey = name.toLocaleLowerCase()
  if (players.some((player) => player.name.toLocaleLowerCase() === nameKey)) {
    return { isValid: false, message: 'That name is already in the game.' }
  }

  return { isValid: true, name }
}

export function createPlayer(name: string): Player {
  return { id: createUuidV4(), name }
}
