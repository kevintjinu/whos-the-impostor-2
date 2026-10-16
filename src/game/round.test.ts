import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Player } from './players'
import { DEFAULT_GAME_SETTINGS, type GameSettings } from './settings'
import {
  createAssignmentHistory,
  createRound,
  randomIndex,
  RoundCreationError,
  secureRandom,
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

afterEach(() => {
  vi.unstubAllGlobals()
})

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
      sequenceRandom([0, 4, 7]),
    )

    expect(round.impostorIds).toHaveLength(expectedCount)
    expect(round.privateRoles.filter((role) => role.role === 'impostor')).toHaveLength(expectedCount)
  })

  it('assigns two distinct impostors with the same decoy in Double Trouble', () => {
    const { round } = createRound(
      players,
      settings({ mode: 'double-trouble' }),
      createAssignmentHistory(),
      sequenceRandom([0, 0, 2, 3]),
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

  it.each(['chaos', 'close-call', 'no-clue'] as const)(
    'can select every roster position in %s regardless of historical counts',
    (mode) => {
      for (let position = 0; position < players.length; position += 1) {
        const history: AssignmentHistory = {
          ...createAssignmentHistory(),
          impostorTurns: { [players[position].id]: 100 },
        }
        const { round } = createRound(
          players,
          settings({ mode }),
          history,
          sequenceRandom([position, 0, 0]),
        )

        expect(round.impostorIds).toEqual([players[position].id])
      }
    },
  )

  it.each([0, 1, 2])('can select three-player roster position %i', (position) => {
    const { round } = createRound(
      players.slice(0, 3),
      settings(),
      createAssignmentHistory(),
      sequenceRandom([position, 0, 0]),
    )

    expect(round.impostorIds).toEqual([players[position].id])
    expect(round.privateRoles[position].role).toBe('impostor')
  })

  it('does not constrain selection to the least-used players', () => {
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
    const second = createRound(players, settings(), history, sequenceRandom([7, 0, 0]))

    expect(first.round.impostorIds).toEqual(['player-1'])
    expect(second.round.impostorIds).toEqual(['player-8'])
  })

  it('allows the same player in consecutive rounds without enforcing rotation', () => {
    const first = createRound(players.slice(0, 3), settings(), createAssignmentHistory(), () => 2)
    const second = createRound(players.slice(0, 3), settings(), first.history, () => 2)
    const third = createRound(players.slice(0, 3), settings(), second.history, () => 2)

    expect([first.round, second.round, third.round].map((round) => round.impostorIds)).toEqual([
      ['player-3'], ['player-3'], ['player-3'],
    ])
    expect(third.history.impostorTurns['player-3']).toBe(3)
    expect(third.history.usedMajorityWordIds).toHaveLength(3)
  })

  it.each([6, 7, 8, 9, 10, 11, 12])(
    'selects every eligible Double Trouble pair for %i players through two equal draw paths',
    (playerCount) => {
    const group = Array.from({ length: playerCount }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Player ${index + 1}`,
    }))
    const pairCounts = new Map<string, number>()
    for (let first = 0; first < group.length; first += 1) {
      for (let second = 0; second < group.length - 1; second += 1) {
        const { round } = createRound(
          group,
          settings({ mode: 'double-trouble' }),
          { ...createAssignmentHistory(), impostorTurns: { 'player-1': 100 } },
          sequenceRandom([first, second, 0, 0]),
        )
        const remaining = group.filter((_, index) => index !== first)
        expect(round.impostorIds).toEqual([group[first].id, remaining[second].id])
        expect(new Set(round.impostorIds).size).toBe(2)
        const key = [...round.impostorIds].sort().join(',')
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }

    expect(pairCounts.size).toBe(group.length * (group.length - 1) / 2)
    // Each unordered pair has exactly two equally likely draw paths.
    expect([...pairCounts.values()].every((count) => count === 2)).toBe(true)
    },
  )

  it('selects the starting player independently and allows them to be the impostor', () => {
    const history: AssignmentHistory = {
      ...createAssignmentHistory(),
      startingTurns: { 'player-1': 100, 'player-2': 0, 'player-3': 0 },
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
    expect(nextHistory.startingTurns['player-1']).toBe(101)
  })

  it('supports all nine combinations of impostor and starter in a three-player group', () => {
    for (let impostor = 0; impostor < 3; impostor += 1) {
      for (let starter = 0; starter < 3; starter += 1) {
        const { round } = createRound(
          players.slice(0, 3),
          settings(),
          createAssignmentHistory(),
          sequenceRandom([impostor, starter, 0]),
        )
        expect(round.impostorIds).toEqual([players[impostor].id])
        expect(round.startingPlayerId).toBe(players[starter].id)
      }
    }
  })

  it('keeps an assigned round stable after later draws and round creation', () => {
    const random = vi.fn(sequenceRandom([0, 1, 2, 3, 4, 5]))
    const first = createRound(players, settings(), createAssignmentHistory(), random)
    const savedRound = structuredClone(first.round)
    const savedHistory = structuredClone(first.history)

    createRound(players, settings(), first.history, random)

    expect(first.round).toEqual(savedRound)
    expect(first.history).toEqual(savedHistory)
    expect(random).toHaveBeenCalledTimes(8)
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
    const { round } = createRound(players, settings({ category: 'mixed' }), createAssignmentHistory(), () => 59)
    expect(WORD_BANK.some((entry) => entry.majority === round.majorityWord)).toBe(true)
  })

  it.each([
    ['everyday-things', 0],
    ['food-and-drink', 50],
    ['places', 100],
    ['animals-and-nature', 150],
    ['activities', 200],
    ['entertainment', 250],
  ] as const)('lets Mixed select from %s', (expectedCategory, wordIndex) => {
    const { round } = createRound(
      players,
      settings({ category: 'mixed' }),
      createAssignmentHistory(),
      sequenceRandom([0, 0, wordIndex, 0]),
    )

    expect(round.wordCategory).toBe(expectedCategory)
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

    expect(closeCall.decoyWord).toBe(WORD_BANK[0].relatedDecoys[0])
    expect(chaos.decoyWord).toBe(WORD_BANK[0].chaosDecoys[0])
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

  it('varies the decoy for the same majority when alternatives exist', () => {
    const first = createRound(
      players,
      settings({ mode: 'close-call' }),
      createAssignmentHistory(),
      sequenceRandom([0, 0, 0, 0]),
    )
    const second = createRound(
      players,
      settings({ mode: 'close-call' }),
      createAssignmentHistory(),
      sequenceRandom([0, 0, 0, 1]),
    )

    expect(second.round.majorityWord).toBe(first.round.majorityWord)
    expect(second.round.decoyWord).not.toBe(first.round.decoyWord)
  })

  it('uses every Close Call pairing before recycling one for a majority', () => {
    const pool = getWordPool('everyday-things')
    const target = pool[0]
    const otherIds = pool.slice(1).map((entry) => entry.id)
    let history: AssignmentHistory = createAssignmentHistory()
    const decoys: Array<string | null> = []

    for (let draw = 0; draw < target.relatedDecoys.length + 1; draw += 1) {
      history = { ...history, usedMajorityWordIds: otherIds }
      const result = createRound(
        players,
        settings({ mode: 'close-call', category: 'everyday-things' }),
        history,
        () => 0,
      )
      decoys.push(result.round.decoyWord)
      history = result.history
    }

    expect(new Set(decoys.slice(0, target.relatedDecoys.length)).size).toBe(target.relatedDecoys.length)
    expect(decoys.at(-1)).toBe(decoys[0])
  })

  it('uses every Chaos pairing before recycling one for a majority', () => {
    const pool = getWordPool('places')
    const target = pool[0]
    const otherIds = pool.slice(1).map((entry) => entry.id)
    let history: AssignmentHistory = createAssignmentHistory()
    const decoys: Array<string | null> = []

    for (let draw = 0; draw < target.chaosDecoys.length + 1; draw += 1) {
      history = { ...history, usedMajorityWordIds: otherIds }
      const result = createRound(
        players,
        settings({ mode: 'chaos', category: 'places' }),
        history,
        () => 0,
      )
      decoys.push(result.round.decoyWord)
      history = result.history
    }

    expect(new Set(decoys.slice(0, target.chaosDecoys.length)).size).toBe(target.chaosDecoys.length)
    expect(decoys.at(-1)).toBe(decoys[0])
  })

  it('gives both Double Trouble impostors one shared decoy and varies it across rounds', () => {
    const pool = getWordPool('food-and-drink')
    const otherIds = pool.slice(1).map((entry) => entry.id)
    let history: AssignmentHistory = createAssignmentHistory()
    const decoys: Array<string | null> = []

    for (let draw = 0; draw < 2; draw += 1) {
      history = { ...history, usedMajorityWordIds: otherIds }
      const result = createRound(
        players,
        settings({ mode: 'double-trouble', category: 'food-and-drink' }),
        history,
        () => 0,
      )
      const impostorWords = result.round.privateRoles
        .filter((role) => role.role === 'impostor')
        .map((role) => role.word)

      expect(new Set(impostorWords)).toEqual(new Set([result.round.decoyWord]))
      decoys.push(result.round.decoyWord)
      history = result.history
    }

    expect(decoys[1]).not.toBe(decoys[0])
  })

  it('does not consume decoy history in No Clue mode', () => {
    const history: AssignmentHistory = {
      ...createAssignmentHistory(),
      usedDecoyWords: ['existing'],
      usedDecoyPairKeys: ['chaos:entry:existing'],
    }
    const result = createRound(players, settings({ mode: 'no-clue' }), history, () => 0)

    expect(result.round.decoyWord).toBeNull()
    expect(result.history.usedDecoyWords).toEqual(history.usedDecoyWords)
    expect(result.history.usedDecoyPairKeys).toEqual(history.usedDecoyPairKeys)
  })

  it('recycles an exhausted category without changing category', () => {
    const exhaustedHistory: AssignmentHistory = {
      ...createAssignmentHistory(),
      usedMajorityWordIds: getWordPool('places').map((entry) => entry.id),
    }

    const result = createRound(players, settings({ category: 'places' }), exhaustedHistory, () => 0)

    expect(result.round.wordCategory).toBe('places')
    expect(result.round.majorityWord).toBe(getWordPool('places')[0].majority)
    expect(result.history.usedMajorityWordIds).toEqual([getWordPool('places')[0].id])
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
    expect(() => createRound(players, settings(), createAssignmentHistory(), () => 0.5)).toThrowError(
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

describe('unbiased bounded randomness', () => {
  it('rejects the incomplete uint32 tail before applying the remainder', () => {
    const random = vi.fn(sequenceRandom([0xffffffff, 0xfffffffe]))

    expect(randomIndex(3, random)).toBe(2)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it.each([3, 6, 7, 12, 60])('maps equal accepted buckets for bound %i', (bound) => {
    const counts = Array<number>(bound).fill(0)
    for (let value = 0; value < bound * 3; value += 1) {
      counts[randomIndex(bound, () => value)] += 1
    }
    expect(counts).toEqual(Array<number>(bound).fill(3))
  })

  it('accepts unsigned endpoints when the bound divides the uint32 range', () => {
    expect(randomIndex(8, () => 0)).toBe(0)
    expect(randomIndex(8, () => 0xffffffff)).toBe(7)
  })

  it.each([-1, 0.5, NaN, Infinity, 0x1_0000_0000])('rejects invalid random input %s', (value) => {
    expect(() => randomIndex(3, () => value)).toThrowError(
      expect.objectContaining({ code: 'INVALID_RANDOM_SOURCE' }),
    )
  })

  it.each([0, -1, 1.5, NaN, Infinity, 0x1_0000_0001])('rejects invalid bound %s', (bound) => {
    expect(() => randomIndex(bound, () => 0)).toThrow(RangeError)
  })

  it('reads production randomness from getRandomValues without requiring randomUUID', () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 0xffffffff
      return values
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(secureRandom()).toBe(0xffffffff)
    expect(getRandomValues).toHaveBeenCalledOnce()
  })

  it('fails explicitly without cryptographic randomness', () => {
    vi.stubGlobal('crypto', undefined)
    expect(() => secureRandom()).toThrowError(
      expect.objectContaining({ code: 'INVALID_RANDOM_SOURCE' }),
    )
  })
})

describe('word bank integrity', () => {
  it('provides fifty curated entries for every concrete category', () => {
    for (const category of [
      'everyday-things',
      'food-and-drink',
      'places',
      'animals-and-nature',
      'activities',
      'entertainment',
    ] as const) {
      expect(getWordPool(category)).toHaveLength(50)
    }
  })

  it('contains no duplicate IDs, majority words, or same-entry majority/decoy values', () => {
    expect(new Set(WORD_BANK.map((entry) => entry.id)).size).toBe(WORD_BANK.length)
    expect(new Set(WORD_BANK.map((entry) => entry.majority.toLocaleLowerCase())).size).toBe(WORD_BANK.length)

    for (const entry of WORD_BANK) {
      expect(entry.relatedDecoys).not.toContain(entry.majority)
      expect(entry.chaosDecoys).not.toContain(entry.majority)
      expect(entry.relatedDecoys.some((word) => entry.chaosDecoys.includes(word))).toBe(false)
    }
  })
})
