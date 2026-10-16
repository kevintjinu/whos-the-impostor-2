import { useLayoutEffect, useState, type ChangeEvent } from 'react'
import type {
  Category,
  GameMode,
  GameSettings,
  RoundCount,
  ScoringPreference,
} from './game/settings'
import { isGameModeAllowed, isGameSettingsValid, isRoundCount } from './game/settings'
import './GameConfiguration.css'

type GameConfigurationScreenProps = {
  playerCount: number
  settings: GameSettings
  notice: string
  onBack: () => void
  onContinue: () => void
  onSettingsChange: (settings: GameSettings) => void
}

type ModeOption = {
  value: GameMode
  label: string
  description: string
}

const modeOptions: readonly ModeOption[] = [
  {
    value: 'chaos',
    label: 'Chaos',
    description: 'The impostor gets an unrelated decoy word.',
  },
  {
    value: 'close-call',
    label: 'Close Call',
    description: 'The impostor gets a closely related decoy word.',
  },
  {
    value: 'no-clue',
    label: 'No Clue',
    description: 'The impostor gets no word at all.',
  },
  {
    value: 'double-trouble',
    label: 'Double Trouble',
    description: 'Two impostors share the same decoy word.',
  },
]

const categoryOptions: readonly { value: Category; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'everyday-things', label: 'Everyday Things' },
  { value: 'food-and-drink', label: 'Food & Drink' },
  { value: 'places', label: 'Places' },
  { value: 'animals-and-nature', label: 'Animals & Nature' },
  { value: 'activities', label: 'Activities' },
  { value: 'entertainment', label: 'Entertainment' },
]

const roundCountOptions: readonly { value: RoundCount; label: string; description: string }[] = [
  { value: 5, label: 'Quick', description: '5 rounds' },
  { value: 10, label: 'Standard', description: '10 rounds' },
  { value: 'endless', label: 'Endless', description: 'Unlimited rounds' },
]

const scoringOptions: readonly { value: ScoringPreference; label: string; description: string }[] = [
  { value: 'casual', label: 'Casual', description: 'No competitive points.' },
  { value: 'competitive', label: 'Competitive', description: 'Track points and rankings.' },
]

function GameConfigurationScreen({
  playerCount,
  settings,
  notice,
  onBack,
  onContinue,
  onSettingsChange,
}: GameConfigurationScreenProps) {
  const [confirmation, setConfirmation] = useState('')

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const updateSetting = <Key extends keyof GameSettings>(key: Key, value: GameSettings[Key]) => {
    onSettingsChange({ ...settings, [key]: value })
    setConfirmation('')
  }

  const handleModeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSetting('mode', event.target.value as GameMode)
  }

  const handleCategoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSetting('category', event.target.value as Category)
  }

  const handleRoundCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const roundCount = event.target.value === 'endless' ? 'endless' : Number(event.target.value)

    if (isRoundCount(roundCount)) {
      updateSetting('roundCount', roundCount)
    }
  }

  const handleScoringChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSetting('scoring', event.target.value as ScoringPreference)
  }

  const handleContinue = () => {
    if (!isGameSettingsValid(settings, playerCount)) {
      setConfirmation('Choose a valid game setup to continue.')
      return
    }

    setConfirmation('')
    onContinue()
  }

  return (
    <div className="game-configuration-screen">
      <header className="setup-header">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Back
        </button>
        <div className="brand" aria-label="Who&apos;s the Impostor">
          <span className="brand-mark" aria-hidden="true">?</span>
          <span>Who&apos;s the Impostor?</span>
        </div>
      </header>

      <main className="configuration-main">
        <div className="configuration-heading">
          <p className="eyebrow">Game setup</p>
          <h1>Make it your game.</h1>
          <p>Choose the feel of this round before you pass the phone around.</p>
          <p className="player-summary" aria-live="polite">
            <strong>{playerCount}</strong> {playerCount === 1 ? 'player' : 'players'} joining this game
          </p>
        </div>

        <form className="configuration-form" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="configuration-section">
            <legend>Game mode</legend>
            <p className="section-intro">How much help should the impostor get?</p>
            <div className="mode-options">
              {modeOptions.map((option) => {
                const isAllowed = isGameModeAllowed(option.value, playerCount)
                const requirement = option.value === 'double-trouble' && !isAllowed

                return (
                  <label className="mode-option" key={option.value}>
                    <input
                      checked={settings.mode === option.value}
                      disabled={!isAllowed}
                      name="game-mode"
                      onChange={handleModeChange}
                      type="radio"
                      value={option.value}
                    />
                    <span className="choice-content">
                      <span className="choice-title">{option.label}</span>
                      <span className="choice-description">{option.description}</span>
                      {requirement && <span className="choice-requirement">Requires at least 6 players.</span>}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="configuration-section">
            <legend>Category</legend>
            <p className="section-intro">Pick a direction for the words.</p>
            <div className="compact-options category-options">
              {categoryOptions.map((option) => (
                <label className="compact-option" key={option.value}>
                  <input
                    checked={settings.category === option.value}
                    name="category"
                    onChange={handleCategoryChange}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="configuration-section">
            <legend>Rounds</legend>
            <div className="compact-options three-up-options">
              {roundCountOptions.map((option) => (
                <label className="compact-option with-description" key={option.value}>
                  <input
                    checked={settings.roundCount === option.value}
                    name="round-count"
                    onChange={handleRoundCountChange}
                    type="radio"
                    value={String(option.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="configuration-section">
            <legend>Scoring</legend>
            <div className="compact-options two-up-options">
              {scoringOptions.map((option) => (
                <label className="compact-option with-description" key={option.value}>
                  <input
                    checked={settings.scoring === option.value}
                    name="scoring"
                    onChange={handleScoringChange}
                    type="radio"
                    value={option.value}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </main>

      <footer className="configuration-footer">
        <p className="configuration-notice" role="status" aria-live="polite">
          {notice}
        </p>
        <button
          className="button button-primary continue-button"
          type="button"
          onClick={handleContinue}
        >
          Continue
          <span aria-hidden="true">→</span>
        </button>
        <p className="configuration-confirmation" role="status" aria-live="polite">
          {confirmation}
        </p>
      </footer>
    </div>
  )
}

export default GameConfigurationScreen
