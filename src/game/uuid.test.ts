import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPlayer, MAX_PLAYER_NAME_LENGTH, normalisePlayerName, validatePlayerName } from './players'
import { createUuidV4, SecureRandomUnavailableError } from './uuid'

function fillWith(values: number[]) {
  return (target: Uint8Array<ArrayBuffer>) => {
    target.set(values)
    return target
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UUID v4 creation', () => {
  it('formats random bytes as an RFC 4122 version 4 UUID', () => {
    const id = createUuidV4(fillWith(Array.from({ length: 16 }, (_, index) => index)))

    expect(id).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('produces different IDs for different random inputs', () => {
    const first = createUuidV4(fillWith(Array(16).fill(0)))
    const second = createUuidV4(fillWith(Array(16).fill(255)))

    expect(first).not.toBe(second)
  })

  it('creates players without crypto.randomUUID when getRandomValues is available', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: fillWith(Array.from({ length: 16 }, (_, index) => index + 16)),
    })

    const player = createPlayer('Alex')

    expect(globalThis.crypto.randomUUID).toBeUndefined()
    expect(player).toEqual({ id: '10111213-1415-4617-9819-1a1b1c1d1e1f', name: 'Alex' })
  })

  it('fails explicitly when cryptographic randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined)

    expect(() => createUuidV4()).toThrow(SecureRandomUnavailableError)
  })
})

describe('player validation', () => {
  it('keeps normalization, duplicate checks, and edits/removals compatible with stable IDs', () => {
    const alex = { id: 'player-alex', name: 'Alex' }
    const blair = { id: 'player-blair', name: 'Blair' }
    const players = [alex, blair]

    expect(normalisePlayerName('  Alex   Morgan  ')).toBe('Alex Morgan')
    expect(validatePlayerName(' alex ', players)).toEqual({
      isValid: false,
      message: 'That name is already in the game.',
    })
    expect(validatePlayerName('x'.repeat(MAX_PLAYER_NAME_LENGTH + 1), players)).toEqual({
      isValid: false,
      message: `Keep names to ${MAX_PLAYER_NAME_LENGTH} characters or fewer.`,
    })

    const editedPlayers = players.map((player) =>
      player.id === alex.id ? { ...player, name: 'Alex Morgan' } : player,
    )
    const remainingPlayers = editedPlayers.filter((player) => player.id !== blair.id)

    expect(remainingPlayers).toEqual([{ id: 'player-alex', name: 'Alex Morgan' }])
  })
})
