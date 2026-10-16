import { MAX_PLAYERS, MIN_PLAYERS, type Player } from './players'
import { isGameSettingsValid, type GameMode, type GameSettings } from './settings'
import { getWordPool, type WordCategory, type WordEntry } from './wordBank'

export type RandomSource = () => number

export type AssignmentHistory = {
  roundsCreated: number
  impostorTurns: Record<string, number>
  startingTurns: Record<string, number>
  usedMajorityWordIds: string[]
}

export type PrivateRole = {
  playerId: string
  role: 'majority' | 'impostor'
  word: string | null
  instruction: string
}

export type GameRound = {
  roundNumber: number
  mode: GameMode
  configuredCategory: GameSettings['category']
  wordCategory: WordCategory
  majorityWord: string
  decoyWord: string | null
  impostorIds: string[]
  startingPlayerId: string
  privateRoles: PrivateRole[]
}

export type RoundCreationResult = {
  round: GameRound
  history: AssignmentHistory
}

export type RoundCreationErrorCode =
  | 'INVALID_PLAYERS'
  | 'INVALID_SETTINGS'
  | 'WORD_POOL_EXHAUSTED'
  | 'INVALID_RANDOM_SOURCE'

export class RoundCreationError extends Error {
  readonly code: RoundCreationErrorCode

  constructor(code: RoundCreationErrorCode, message: string) {
    super(message)
    this.name = 'RoundCreationError'
    this.code = code
  }
}

export function createAssignmentHistory(): AssignmentHistory {
  return {
    roundsCreated: 0,
    impostorTurns: {},
    startingTurns: {},
    usedMajorityWordIds: [],
  }
}

export function secureRandom(): number {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] / 0x1_0000_0000
}

function validatePlayers(players: readonly Player[]) {
  const uniqueIds = new Set(players.map((player) => player.id))
  if (
    players.length < MIN_PLAYERS ||
    players.length > MAX_PLAYERS ||
    uniqueIds.size !== players.length
  ) {
    throw new RoundCreationError(
      'INVALID_PLAYERS',
      `A round requires ${MIN_PLAYERS}–${MAX_PLAYERS} players with unique IDs.`,
    )
  }
}

function randomIndex(length: number, random: RandomSource) {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RoundCreationError(
      'INVALID_RANDOM_SOURCE',
      'The random source must return a number from 0 up to, but not including, 1.',
    )
  }

  return Math.floor(value * length)
}

function pickRandom<Item>(items: readonly Item[], random: RandomSource): Item {
  return items[randomIndex(items.length, random)]
}

function selectFairPlayers(
  players: readonly Player[],
  assignmentCounts: Readonly<Record<string, number>>,
  count: number,
  random: RandomSource,
) {
  const available = [...players]
  const selected: Player[] = []

  while (selected.length < count) {
    const minimumTurns = Math.min(...available.map((player) => assignmentCounts[player.id] ?? 0))
    const leastAssigned = available.filter(
      (player) => (assignmentCounts[player.id] ?? 0) === minimumTurns,
    )
    const chosen = pickRandom(leastAssigned, random)
    selected.push(chosen)
    available.splice(available.findIndex((player) => player.id === chosen.id), 1)
  }

  return selected
}

function selectWord(
  settings: GameSettings,
  history: AssignmentHistory,
  random: RandomSource,
): WordEntry {
  const usedIds = new Set(history.usedMajorityWordIds)
  const availableWords = getWordPool(settings.category).filter((entry) => !usedIds.has(entry.id))

  if (availableWords.length === 0) {
    throw new RoundCreationError(
      'WORD_POOL_EXHAUSTED',
      `No unused majority words remain in the ${settings.category} pool.`,
    )
  }

  return pickRandom(availableWords, random)
}

function getDecoyWord(mode: GameMode, wordEntry: WordEntry) {
  if (mode === 'no-clue') {
    return null
  }

  return mode === 'close-call' ? wordEntry.relatedDecoy : wordEntry.unrelatedDecoy
}

function getImpostorInstruction(mode: GameMode) {
  if (mode === 'no-clue') {
    return 'You have no word. Listen closely, infer the secret, and blend in.'
  }

  if (mode === 'close-call') {
    return 'Your word is related but different. Listen closely and blend in.'
  }

  if (mode === 'double-trouble') {
    return 'Another impostor has the same decoy. Blend in without revealing yourself.'
  }

  return 'Infer the majority word from the clues and bluff convincingly.'
}

function createPrivateRoles(
  players: readonly Player[],
  impostorIds: ReadonlySet<string>,
  majorityWord: string,
  decoyWord: string | null,
  mode: GameMode,
): PrivateRole[] {
  return players.map((player) => {
    if (impostorIds.has(player.id)) {
      return {
        playerId: player.id,
        role: 'impostor',
        word: decoyWord,
        instruction: getImpostorInstruction(mode),
      }
    }

    return {
      playerId: player.id,
      role: 'majority',
      word: majorityWord,
      instruction: 'Keep the word secret. Give clues that help your team without making it obvious.',
    }
  })
}

function incrementCounts(
  counts: Readonly<Record<string, number>>,
  playerIds: readonly string[],
) {
  const nextCounts = { ...counts }
  for (const playerId of playerIds) {
    nextCounts[playerId] = (nextCounts[playerId] ?? 0) + 1
  }
  return nextCounts
}

export function createRound(
  players: readonly Player[],
  settings: GameSettings,
  history: AssignmentHistory,
  random: RandomSource = secureRandom,
): RoundCreationResult {
  validatePlayers(players)

  if (!isGameSettingsValid(settings, players.length)) {
    throw new RoundCreationError('INVALID_SETTINGS', 'The game settings are not valid for this group.')
  }

  const impostorCount = settings.mode === 'double-trouble' ? 2 : 1
  const impostors = selectFairPlayers(players, history.impostorTurns, impostorCount, random)
  const startingPlayer = selectFairPlayers(players, history.startingTurns, 1, random)[0]
  const wordEntry = selectWord(settings, history, random)
  const decoyWord = getDecoyWord(settings.mode, wordEntry)
  const impostorIds = impostors.map((player) => player.id)
  const privateRoles = createPrivateRoles(
    players,
    new Set(impostorIds),
    wordEntry.majority,
    decoyWord,
    settings.mode,
  )

  return {
    round: {
      roundNumber: history.roundsCreated + 1,
      mode: settings.mode,
      configuredCategory: settings.category,
      wordCategory: wordEntry.category,
      majorityWord: wordEntry.majority,
      decoyWord,
      impostorIds,
      startingPlayerId: startingPlayer.id,
      privateRoles,
    },
    history: {
      roundsCreated: history.roundsCreated + 1,
      impostorTurns: incrementCounts(history.impostorTurns, impostorIds),
      startingTurns: incrementCounts(history.startingTurns, [startingPlayer.id]),
      usedMajorityWordIds: [...history.usedMajorityWordIds, wordEntry.id],
    },
  }
}
