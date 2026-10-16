import { MAX_PLAYERS, MIN_PLAYERS, type Player } from './players'
import { isGameSettingsValid, type GameMode, type GameSettings } from './settings'
import { getWordPool, normaliseWord, type WordCategory, type WordEntry } from './wordBank'

// Returns an unsigned 32-bit integer, including both 0 and 0xffffffff.
export type RandomSource = () => number

const UINT32_RANGE = 0x1_0000_0000

export type AssignmentHistory = {
  roundsCreated: number
  impostorTurns: Record<string, number>
  startingTurns: Record<string, number>
  previousImpostorIds: string[]
  usedMajorityWordIds: string[]
  usedDecoyWords: string[]
  usedDecoyPairKeys: string[]
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
  | 'INVALID_WORD_ENTRY'
  | 'INVALID_RANDOM_SOURCE'
  | 'INVALID_HISTORY'

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
    previousImpostorIds: [],
    usedMajorityWordIds: [],
    usedDecoyWords: [],
    usedDecoyPairKeys: [],
  }
}

export function secureRandom(): number {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new RoundCreationError(
      'INVALID_RANDOM_SOURCE',
      'Cryptographically secure randomness is unavailable in this browser.',
    )
  }

  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0]
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

export function randomIndex(length: number, random: RandomSource = secureRandom): number {
  if (!Number.isInteger(length) || length < 1 || length > UINT32_RANGE) {
    throw new RangeError('The random bound must be an integer from 1 through 2^32.')
  }

  // Only accept a range containing an equal number of values for every index.
  const limit = UINT32_RANGE - (UINT32_RANGE % length)
  let value: number

  do {
    value = random()
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new RoundCreationError(
        'INVALID_RANDOM_SOURCE',
        'The random source must return an unsigned 32-bit integer.',
      )
    }
  } while (value >= limit)

  return value % length
}

function pickRandom<Item>(items: readonly Item[], random: RandomSource): Item {
  return items[randomIndex(items.length, random)]
}

function selectRandomPlayers(
  players: readonly Player[],
  count: number,
  random: RandomSource,
) {
  const available = [...players]
  const selected: Player[] = []

  while (selected.length < count) {
    const chosenIndex = randomIndex(available.length, random)
    selected.push(available[chosenIndex])
    available.splice(chosenIndex, 1)
  }

  return selected
}

function selectWord(
  settings: GameSettings,
  history: AssignmentHistory,
  random: RandomSource,
): { wordEntry: WordEntry; usedMajorityWordIds: string[] } {
  const usedIds = new Set(history.usedMajorityWordIds)
  const wordPool = getWordPool(settings.category)
  let availableWords = wordPool.filter((entry) => !usedIds.has(entry.id))
  let retainedHistory = history.usedMajorityWordIds

  if (availableWords.length === 0) {
    const recycledIds = new Set(wordPool.map((entry) => entry.id))
    retainedHistory = history.usedMajorityWordIds.filter((id) => !recycledIds.has(id))
    availableWords = [...wordPool]
  }

  if (availableWords.length === 0) {
    throw new RoundCreationError('WORD_POOL_EXHAUSTED', 'No majority words are available.')
  }

  const wordEntry = pickRandom(availableWords, random)
  return {
    wordEntry,
    usedMajorityWordIds: [...retainedHistory, wordEntry.id],
  }
}

function selectDecoyWord(
  mode: GameMode,
  wordEntry: WordEntry,
  history: AssignmentHistory,
  random: RandomSource,
) {
  if (mode === 'no-clue') {
    return {
      decoyWord: null,
      usedDecoyWords: history.usedDecoyWords,
      usedDecoyPairKeys: history.usedDecoyPairKeys,
    }
  }

  const candidates = mode === 'close-call' ? wordEntry.relatedDecoys : wordEntry.chaosDecoys
  const majorityKey = normaliseWord(wordEntry.majority)
  const validCandidates = [...new Map(
    candidates
      .filter((candidate) => normaliseWord(candidate) !== majorityKey)
      .map((candidate) => [normaliseWord(candidate), candidate]),
  ).values()]

  if (validCandidates.length === 0) {
    throw new RoundCreationError(
      'INVALID_WORD_ENTRY',
      `No valid ${mode} decoys are available for ${wordEntry.id}.`,
    )
  }

  const usedWords = new Set(history.usedDecoyWords)
  const pairPrefix = `${mode}:${wordEntry.id}:`
  const pairKey = (candidate: string) => `${pairPrefix}${normaliseWord(candidate)}`
  const usedPairs = new Set(history.usedDecoyPairKeys)
  const unusedWords = validCandidates.filter((candidate) => !usedWords.has(normaliseWord(candidate)))
  const unusedPairs = validCandidates.filter((candidate) => !usedPairs.has(pairKey(candidate)))
  const eligibleCandidates = unusedWords.length > 0
    ? unusedWords
    : unusedPairs.length > 0
      ? unusedPairs
      : validCandidates
  const decoyWord = pickRandom(eligibleCandidates, random)
  const decoyKey = normaliseWord(decoyWord)
  const retainedPairKeys = unusedPairs.length > 0
    ? history.usedDecoyPairKeys
    : history.usedDecoyPairKeys.filter((key) => !key.startsWith(pairPrefix))

  return {
    decoyWord,
    usedDecoyWords: usedWords.has(decoyKey)
      ? history.usedDecoyWords
      : [...history.usedDecoyWords, decoyKey],
    usedDecoyPairKeys: [...retainedPairKeys, pairKey(decoyWord)],
  }
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
  const previousImpostors = new Set(history.previousImpostorIds)
  const eligibleImpostors = players.filter((player) => !previousImpostors.has(player.id))
  if (eligibleImpostors.length < impostorCount) {
    throw new RoundCreationError('INVALID_HISTORY', 'Not enough eligible players remain after the previous impostors are excluded.')
  }
  const impostors = selectRandomPlayers(eligibleImpostors, impostorCount, random)
  const startingPlayer = pickRandom(players, random)
  const wordSelection = selectWord(settings, history, random)
  const wordEntry = wordSelection.wordEntry
  const decoySelection = selectDecoyWord(settings.mode, wordEntry, history, random)
  const decoyWord = decoySelection.decoyWord
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
      previousImpostorIds: [...impostorIds],
      usedMajorityWordIds: wordSelection.usedMajorityWordIds,
      usedDecoyWords: decoySelection.usedDecoyWords,
      usedDecoyPairKeys: decoySelection.usedDecoyPairKeys,
    },
  }
}
