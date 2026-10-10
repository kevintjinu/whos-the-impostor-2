import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  createPlayer,
  MAX_PLAYER_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Player,
  validatePlayerName,
} from './game/players'
import './PlayerSetup.css'

type PlayerSetupScreenProps = {
  players: Player[]
  onBack: () => void
  onPlayersChange: (players: Player[]) => void
}

function PlayerSetupScreen({ players, onBack, onPlayersChange }: PlayerSetupScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [draftName, setDraftName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const editingPlayer = players.find((player) => player.id === editingId)
  const playerCountLabel = `${players.length} of ${MAX_PLAYERS} players`
  const canContinue = players.length >= MIN_PLAYERS

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus()
    }
  }, [editingId])

  const clearMessages = () => {
    setFieldError('')
    setConfirmation('')
  }

  const resetEditor = () => {
    setDraftName('')
    setEditingId(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearMessages()

    if (!editingId && players.length >= MAX_PLAYERS) {
      setFieldError(`You can add up to ${MAX_PLAYERS} players.`)
      return
    }

    const otherPlayers = editingId
      ? players.filter((player) => player.id !== editingId)
      : players
    const validation = validatePlayerName(draftName, otherPlayers)

    if (!validation.isValid) {
      setFieldError(validation.message)
      return
    }

    if (editingId) {
      onPlayersChange(
        players.map((player) =>
          player.id === editingId ? { ...player, name: validation.name } : player,
        ),
      )
    } else {
      onPlayersChange([...players, createPlayer(validation.name)])
    }

    resetEditor()
  }

  const handleEdit = (player: Player) => {
    setDraftName(player.name)
    setEditingId(player.id)
    clearMessages()
  }

  const handleRemove = (player: Player) => {
    onPlayersChange(players.filter((currentPlayer) => currentPlayer.id !== player.id))
    if (editingId === player.id) {
      resetEditor()
    }
    clearMessages()
  }

  const handleContinue = () => {
    if (!canContinue) {
      return
    }

    setConfirmation('Game configuration is coming next.')
  }

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="player-setup-screen">
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

      <main className="setup-main">
        <div className="setup-heading">
          <p className="eyebrow">Player setup</p>
          <h1>Who&apos;s playing?</h1>
          <p className="setup-intro">Add everyone around the table to get started.</p>
        </div>

        <section className="player-editor" aria-labelledby="player-form-title">
          <div className="section-heading">
            <h2 id="player-form-title">Players</h2>
            <p aria-live="polite">{playerCountLabel}</p>
          </div>

          <form
            ref={formRef}
            className={`player-form${editingPlayer ? ' is-editing' : ''}`}
            onSubmit={handleSubmit}
            noValidate
          >
            <label className="visually-hidden" htmlFor="player-name">
              {editingPlayer ? `Edit ${editingPlayer.name}` : 'Player name'}
            </label>
            <input
              ref={inputRef}
              id="player-name"
              name="playerName"
              type="text"
              value={draftName}
              onKeyDown={handleNameKeyDown}
              onChange={(event) => {
                setDraftName(event.target.value)
                setFieldError('')
                setConfirmation('')
              }}
              placeholder="Enter a name"
              autoComplete="off"
              maxLength={MAX_PLAYER_NAME_LENGTH + 1}
              aria-describedby={fieldError ? 'player-name-error' : undefined}
              aria-invalid={fieldError ? true : undefined}
            />
            <button className="button button-primary add-player-button" type="submit">
              {editingPlayer ? 'Save name' : 'Add player'}
            </button>
            {editingPlayer && (
              <button className="button button-secondary cancel-edit-button" type="button" onClick={resetEditor}>
                Cancel
              </button>
            )}
          </form>
          {editingPlayer && <p className="editing-note">Editing {editingPlayer.name}</p>}
          {fieldError && (
            <p className="form-error" id="player-name-error" role="alert">
              {fieldError}
            </p>
          )}
        </section>

        <section className="player-list-section" aria-labelledby="player-list-title">
          <h2 className="visually-hidden" id="player-list-title">
            Added players
          </h2>
          {players.length === 0 ? (
            <p className="empty-players">No one has joined yet.</p>
          ) : (
            <ol className="player-list">
              {players.map((player, index) => (
                <li className="player-row" key={player.id}>
                  <span className="player-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="player-name">{player.name}</span>
                  <div className="player-actions">
                    <button className="icon-button" type="button" onClick={() => handleEdit(player)}>
                      Edit<span className="visually-hidden"> {player.name}</span>
                    </button>
                    <button
                      className="icon-button remove-button"
                      type="button"
                      onClick={() => handleRemove(player)}
                    >
                      Remove<span className="visually-hidden"> {player.name}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className="setup-footer">
        <p className="minimum-note">{canContinue ? 'Ready when you are.' : `Add ${MIN_PLAYERS - players.length} more to continue.`}</p>
        <button className="button button-primary continue-button" type="button" disabled={!canContinue} onClick={handleContinue}>
          Continue
          <span aria-hidden="true">→</span>
        </button>
        <p className="setup-confirmation" role="status" aria-live="polite">
          {confirmation}
        </p>
      </footer>
    </div>
  )
}

export default PlayerSetupScreen
