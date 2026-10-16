import { describe, expect, it } from 'vitest'
import {
  CluePhaseError,
  createSpeakingOrder,
} from './cluePhase'

describe('clue speaking order', () => {
  it('starts with the saved player and continues circularly', () => {
    expect(createSpeakingOrder(['alex', 'ben', 'chloe', 'daniel'], 'chloe')).toEqual([
      'chloe',
      'daniel',
      'alex',
      'ben',
    ])
  })

  it.each(Array.from({ length: 10 }, (_, index) => index + 3))(
    'includes every player exactly once in a %i-player group',
    (playerCount) => {
    const playerIds = Array.from({ length: playerCount }, (_, index) => `player-${index + 1}`)
    const order = createSpeakingOrder(playerIds, playerIds[playerCount - 2])

    expect(order).toHaveLength(playerCount)
    expect(new Set(order)).toEqual(new Set(playerIds))
    expect(order[0]).toBe(playerIds[playerCount - 2])
    },
  )

  it('returns only the supplied public player IDs and never mutates the roster', () => {
    const playerIds = ['alex', 'ben', 'chloe']
    const order = createSpeakingOrder(playerIds, 'ben')

    expect(order).toEqual(['ben', 'chloe', 'alex'])
    expect(playerIds).toEqual(['alex', 'ben', 'chloe'])
    expect(JSON.stringify(order)).not.toMatch(/word|role|impostor|decoy/i)
  })

  it('rejects an empty roster, duplicate IDs, and a missing starting player', () => {
    expect(() => createSpeakingOrder([], 'alex')).toThrowError(
      expect.objectContaining({ code: 'EMPTY_ROSTER' }),
    )
    expect(() => createSpeakingOrder(['alex', 'alex'], 'alex')).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_PLAYER_ID' }),
    )
    expect(() => createSpeakingOrder(['alex', 'ben', 'chloe'], 'daniel')).toThrowError(
      expect.objectContaining({ code: 'STARTING_PLAYER_NOT_FOUND' }),
    )
    expect(() => createSpeakingOrder(['alex'], 'missing')).toThrow(CluePhaseError)
  })
})
