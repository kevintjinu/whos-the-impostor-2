export const GAME_MODES = ['chaos', 'close-call', 'no-clue', 'double-trouble'] as const
export const CATEGORIES = [
  'mixed',
  'everyday-things',
  'food-and-drink',
  'places',
  'animals-and-nature',
  'activities',
  'entertainment',
] as const
export const ROUND_COUNTS = [5, 10, 'endless'] as const
export const SCORING_PREFERENCES = ['casual', 'competitive'] as const

export type GameMode = (typeof GAME_MODES)[number]
export type Category = (typeof CATEGORIES)[number]
export type RoundCount = (typeof ROUND_COUNTS)[number]
export type ScoringPreference = (typeof SCORING_PREFERENCES)[number]

export type GameSettings = {
  mode: GameMode
  category: Category
  roundCount: RoundCount
  scoring: ScoringPreference
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  mode: 'chaos',
  category: 'mixed',
  roundCount: 10,
  scoring: 'casual',
}

export function isGameModeAllowed(mode: GameMode, playerCount: number) {
  return mode !== 'double-trouble' || playerCount >= 6
}

export function isRoundCount(value: number | string): value is RoundCount {
  return ROUND_COUNTS.some((roundCount) => roundCount === value)
}

export function isGameSettingsValid(settings: GameSettings, playerCount: number) {
  return (
    GAME_MODES.includes(settings.mode) &&
    CATEGORIES.includes(settings.category) &&
    SCORING_PREFERENCES.includes(settings.scoring) &&
    isGameModeAllowed(settings.mode, playerCount) &&
    isRoundCount(settings.roundCount)
  )
}

export function normaliseGameSettings(settings: GameSettings, playerCount: number): GameSettings {
  if (!isGameModeAllowed(settings.mode, playerCount)) {
    return { ...settings, mode: DEFAULT_GAME_SETTINGS.mode }
  }

  return settings
}
