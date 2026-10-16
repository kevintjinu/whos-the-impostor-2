import { describe, expect, it } from 'vitest'
import {
  createConfirmedAccusation,
  getRequiredAccusationCount,
  updateAccusationSelection,
} from './accusation'
import type { GameMode } from './settings'

const playerIds = ['first', 'second', 'middle', 'fourth', 'fifth', 'last']

describe('accusation requirements', () => {
  it.each([
    ['chaos', 1],
    ['close-call', 1],
    ['no-clue', 1],
    ['double-trouble', 2],
  ] satisfies [GameMode, number][])('%s requires %i accused player(s)', (mode, count) => {
    expect(getRequiredAccusationCount(mode)).toBe(count)
  })

  it('rejects one or three selections in Double Trouble', () => {
    expect(() => createConfirmedAccusation(null, 'double-trouble', playerIds, ['first']))
      .toThrowError(expect.objectContaining({ code: 'INCORRECT_SELECTION_COUNT' }))
    expect(() => createConfirmedAccusation(
      null,
      'double-trouble',
      playerIds,
      ['first', 'second', 'middle'],
    )).toThrowError(expect.objectContaining({ code: 'INCORRECT_SELECTION_COUNT' }))
  })

  it('rejects duplicate and stale selected IDs', () => {
    expect(() => createConfirmedAccusation(null, 'double-trouble', playerIds, ['first', 'first']))
      .toThrowError(expect.objectContaining({ code: 'DUPLICATE_SELECTION' }))
    expect(() => createConfirmedAccusation(null, 'chaos', playerIds, ['departed-player']))
      .toThrowError(expect.objectContaining({ code: 'UNKNOWN_PLAYER' }))
  })

  it('rejects duplicate IDs in the current roster', () => {
    expect(() => createConfirmedAccusation(
      null,
      'chaos',
      ['first', 'first', 'third'],
      ['first'],
    ))
      .toThrowError(expect.objectContaining({ code: 'INVALID_ROSTER' }))
  })

  it('rejects Double Trouble with fewer than six current players', () => {
    expect(() => createConfirmedAccusation(
      null,
      'double-trouble',
      playerIds.slice(0, 5),
      ['first', 'second'],
    )).toThrowError(expect.objectContaining({ code: 'INVALID_ROSTER' }))
  })

  it.each(['chaos', 'close-call', 'no-clue'] as const)('%s rejects more than one accused player', (mode) => {
    expect(() => createConfirmedAccusation(null, mode, playerIds, ['first', 'last']))
      .toThrowError(expect.objectContaining({ code: 'INCORRECT_SELECTION_COUNT' }))
  })
})

describe('accusation drafting', () => {
  it.each(['first', 'middle', 'last'])('allows the %s roster position to be accused', (playerId) => {
    expect(createConfirmedAccusation(null, 'chaos', playerIds, [playerId]).accusedPlayerIds)
      .toEqual([playerId])
  })

  it('replaces the previous selection in a single-impostor mode', () => {
    const firstSelection = updateAccusationSelection('close-call', playerIds, [], 'first')
    const correctedSelection = updateAccusationSelection(
      'close-call',
      playerIds,
      firstSelection,
      'last',
    )

    expect(firstSelection).toEqual(['first'])
    expect(correctedSelection).toEqual(['last'])
  })

  it('adds and removes two distinct Double Trouble selections', () => {
    const firstSelection = updateAccusationSelection('double-trouble', playerIds, [], 'first')
    const secondSelection = updateAccusationSelection(
      'double-trouble',
      playerIds,
      firstSelection,
      'middle',
    )
    const correctedSelection = updateAccusationSelection(
      'double-trouble',
      playerIds,
      secondSelection,
      'first',
    )

    expect(secondSelection).toEqual(['first', 'middle'])
    expect(correctedSelection).toEqual(['middle'])
  })

  it('rejects a third Double Trouble selection instead of silently replacing one', () => {
    expect(() => updateAccusationSelection(
      'double-trouble',
      playerIds,
      ['first', 'second'],
      'middle',
    )).toThrowError(expect.objectContaining({ code: 'TOO_MANY_SELECTIONS' }))
  })

  it('rejects an already invalid draft rather than silently correcting it', () => {
    expect(() => updateAccusationSelection('chaos', playerIds, ['first', 'last'], 'middle'))
      .toThrowError(expect.objectContaining({ code: 'INCORRECT_SELECTION_COUNT' }))
  })
})

describe('confirmed accusations', () => {
  it('is independent of any private role assignment', () => {
    const publicResult = createConfirmedAccusation(null, 'chaos', playerIds, ['second'])
    const unrelatedPrivateRoles = [
      { playerId: 'first', role: 'impostor', word: 'secret' },
      { playerId: 'second', role: 'majority', word: 'private' },
    ]

    expect(publicResult).toEqual({ mode: 'chaos', accusedPlayerIds: ['second'] })
    expect(JSON.stringify(publicResult)).not.toMatch(/role|word|impostor|majority|secret|private/i)
    expect(unrelatedPrivateRoles).toHaveLength(2)
  })

  it('creates an immutable record that cannot be accidentally changed', () => {
    const result = createConfirmedAccusation(
      null,
      'double-trouble',
      playerIds,
      ['first', 'last'],
    )

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.accusedPlayerIds)).toBe(true)
    expect(() => (result.accusedPlayerIds as string[]).push('middle')).toThrow()
    expect(result.accusedPlayerIds).toEqual(['first', 'last'])
  })

  it('prevents duplicate submission', () => {
    const confirmed = createConfirmedAccusation(null, 'no-clue', playerIds, ['middle'])

    expect(() => createConfirmedAccusation(confirmed, 'no-clue', playerIds, ['last']))
      .toThrowError(expect.objectContaining({ code: 'ALREADY_CONFIRMED' }))
  })
})
