import { describe, expect, it } from 'vitest'
import type { Player } from './players'
import { DEFAULT_GAME_SETTINGS, type GameSettings } from './settings'
import {
  createAssignmentHistory,
  createRound,
  RoundCreationError,
  type AssignmentHistory,
  type RandomSource,
} from './round'
import { getWordPool, WORD_BANK } from './wordBank'

const players: Player[] = Array.from({ length: 8 }, (_, index) => ({
  id: `player-${index + 1}`,
  name: `Player ${index + 1}`,
}))

function sequenceRandom(values: number[]): RandomSource {
  let index = 0
  return () => values[index++ % values.length]
}

function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_GAME_SETTINGS, ...overrides }
}

describe('round creation', () => {
  it.each([
    ['chaos', 1],
    ['close-call', 1],
    ['no-clue', 1],
    ['double-trouble', 2],
  ] as const)('assigns the correct impostor count for %s', (mode, expectedCount) => {
    const { round } = createRound(
      players,
      settings({ mode }),
      createAssignmentHistory(),
      sequenceRandom([0, 0.4, 0.7]),
    )

    expect(round.impostorIds).toHaveLength(expectedCount)
    expect(round.privateRoles.filter((role) => role.role === 'impostor')).toHaveLength(expectedCount)
  })

  it('assigns two distinct impostors with the same decoy in Double Trouble', () => {
    const { round } = createRound(
      players,
      settings({ mode: 'double-trouble' }),
      createAssignmentHistory(),
      sequenceRandom([0, 0, 0.2, 0.3]),
    )
    const impostorRoles = round.privateRoles.filter((role) => role.role === 'impostor')

    expect(new Set(round.impostorIds).size).toBe(2)
    expect(impostorRoles[0].word).toBe(impostorRoles[1].word)
    expect(impostorRoles[0].word).toBe(round.decoyWord)
  })

  it.each([
    { invalidPlayers: players.slice(0, 2) },
    {
      invalidPlayers: [
        ...players,
        ...players.slice(0, 5).map((player, index) => ({ ...player, id: `extra-${index}` })),
      ],
    },
  ])(
    'rejects an invalid player count',
    ({ invalidPlayers }) => {
      expect(() => createRound(invalidPlayers, settings(), createAssignmentHistory(), () => 0)).toThrowError(
        expect.objectContaining({ code: 'INVALID_PLAYERS' }),
      )
    },
  )

  it('rejects duplicate stable player IDs', () => {
    const invalidPlayers = [players[0], { ...players[1], id: players[0].id }, players[2]]
    expect(() => createRound(invalidPlayers, settings(), createAssignmentHistory(), () => 0)).toThrowError(
      expect.objectContaining({ code: 'INVALID_PLAYERS' }),
    )
  })

  it('prefers players with fewer prior impostor turns and randomizes within that tier', () => {
    const history: AssignmentHistory = {
      ...createAssignmentHistory(),
      impostorTurns: {
        'player-1': 2,
        'player-2': 1,
        'player-3': 0,
        'player-4': 0,
        'player-5': 1,
        'player-6': 1,
        'player-7': 1,
        'player-8': 1,
      },
    }
    const first = createRound(players, settings(), history, sequenceRandom([0, 0, 0]))
    const second = createRound(players, settings(), history, sequenceRandom([0.99, 0, 0]))

    expect(first.round.impostorIds).toEqual(['player-3'])
    expect(second.round.impostorIds).toEqual(['player-4'])
  })

  it('selects the starting player from separate history and allows them to be the impostor', () => {
    const history: AssignmentHistory = {
      ...createAssignmentHistory(),
      startingTurns: { 'player-1': 0, 'player-2': 1, 'player-3': 1 },
    }
    const { round, history: nextHistory } = createRound(
      players.slice(0, 3),
      settings(),
      history,
      sequenceRandom([0, 0, 0]),
    )

    expect(round.impostorIds).toEqual(['player-1'])
    expect(round.startingPlayerId).toBe('player-1')
    expect(nextHistory.impostorTurns['player-1']).toBe(1)
    expect(nextHistory.startingTurns['player-1']).toBe(1)
  })

  it.each([
    'everyday-things',
    'food-and-drink',
    'places',
    'animals-and-nature',
    'activities',
    'entertainment',
  ] as const)('honors the configured %s category', (category) => {
    const { round } = createRound(
      players,
      settings({ category }),
      createAssignmentHistory(),
      sequenceRandom([0, 0, 0]),
    )
    expect(round.configuredCategory).toBe(category)
    expect(round.wordCategory).toBe(category)
    expect(getWordPool(category).some((entry) => entry.majority === round.majorityWord)).toBe(true)
  })

  it('selects Mixed words from the supported category pool', () => {
    const { round } = createRound(players, settings({ category: 'mixed' }), createAssignmentHistory(), () => 0.99)
    expect(WORD_BANK.some((entry) => entry.majority === round.majorityWord)).toBe(true)
  })

  it('uses curated related and unrelated pairs without duplicate words', () => {
    const closeCall = createRound(
      players,
      settings({ mode: 'close-call' }),
      createAssignmentHistory(),
      () => 0,
    ).round
    const chaos = createRound(
      players,
      settings({ mode: 'chaos' }),
      createAssignmentHistory(),
      () => 0,
    ).round

    expect(closeCall.decoyWord).toBe(WORD_BANK[0].relatedDecoy)
    expect(chaos.decoyWord).toBe(WORD_BANK[0].unrelatedDecoy)
    expect(closeCall.decoyWord).not.toBe(closeCall.majorityWord)
    expect(chaos.decoyWord).not.toBe(chaos.majorityWord)
  })

  it('gives No Clue impostors no decoy or private word', () => {
    const { round } = createRound(
      players,
      settings({ mode: 'no-clue' }),
      createAssignmentHistory(),
      () => 0,
    )
    const impostorRole = round.privateRoles.find((role) => role.role === 'impostor')

    expect(round.decoyWord).toBeNull()
    expect(impostorRole?.word).toBeNull()
  })

  it('does not repeat a majority word while unused entries remain', () => {
    const first = createRound(players, settings({ category: 'places' }), createAssignmentHistory(), () => 0)
    const second = createRound(players, settings({ category: 'places' }), first.history, () => 0)

    expect(second.round.majorityWord).not.toBe(first.round.majorityWord)
    expect(second.history.usedMajorityWordIds).toHaveLength(2)
  })

  it('reports explicit pool exhaustion instead of repeating or changing category', () => {
    const exhaustedHistory: AssignmentHistory = {
      ...createAssignmentHistory(),
      usedMajorityWordIds: getWordPool('places').map((entry) => entry.id),
    }

    expect(() =>
      createRound(players, settings({ category: 'places' }), exhaustedHistory, () => 0),
    ).toThrowError(expect.objectContaining({ code: 'WORD_POOL_EXHAUSTED' }))
  })

  it('rejects settings that are invalid for the player count', () => {
    expect(() =>
      createRound(
        players.slice(0, 5),
        settings({ mode: 'double-trouble' }),
        createAssignmentHistory(),
        () => 0,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }))
  })

  it.each([
    { ...settings(), mode: 'unknown-mode' },
    { ...settings(), category: 'unknown-category' },
    { ...settings(), roundCount: 7 },
    { ...settings(), scoring: 'unknown-scoring' },
  ])('rejects malformed setting values', (invalidSettings) => {
    expect(() =>
      createRound(
        players,
        invalidSettings as unknown as GameSettings,
        createAssignmentHistory(),
        () => 0,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }))
  })

  it('rejects an invalid injected random source', () => {
    expect(() => createRound(players, settings(), createAssignmentHistory(), () => 1)).toThrowError(
      RoundCreationError,
    )
  })

  it('creates consistent private round data without leaking another role into an assignment', () => {
    const { round } = createRound(players, settings(), createAssignmentHistory(), () => 0)
    const rolePlayerIds = round.privateRoles.map((role) => role.playerId)

    expect(rolePlayerIds).toEqual(players.map((player) => player.id))
    expect(new Set(rolePlayerIds).size).toBe(players.length)
    expect(round.privateRoles.every((role) => role.word === round.majorityWord || role.word === round.decoyWord)).toBe(true)
    expect(round.privateRoles.filter((role) => role.role === 'impostor').map((role) => role.playerId)).toEqual(
      round.impostorIds,
    )
    expect(players.some((player) => player.id === round.startingPlayerId)).toBe(true)
  })
})

describe('word bank integrity', () => {
  it('provides ten curated entries for every concrete category', () => {
    for (const category of [
      'everyday-things',
      'food-and-drink',
      'places',
      'animals-and-nature',
      'activities',
      'entertainment',
    ] as const) {
      expect(getWordPool(category)).toHaveLength(10)
    }
  })

  it('contains no duplicate IDs, majority words, or same-entry majority/decoy values', () => {
    expect(new Set(WORD_BANK.map((entry) => entry.id)).size).toBe(WORD_BANK.length)
    expect(new Set(WORD_BANK.map((entry) => entry.majority.toLocaleLowerCase())).size).toBe(WORD_BANK.length)

    for (const entry of WORD_BANK) {
      expect(entry.majority).not.toBe(entry.relatedDecoy)
      expect(entry.majority).not.toBe(entry.unrelatedDecoy)
      expect(entry.relatedDecoy).not.toBe(entry.unrelatedDecoy)
    }
  })
})
