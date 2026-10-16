import { useEffect, useRef, type FormEvent } from 'react'
import { getRequiredAccusationCount } from './game/accusation'
import type { PublicEndgame, RoundResult } from './game/endgame'
import type { Player } from './game/players'
import type { GameMode, RoundCount } from './game/settings'
import './GroupAccusation.css'

type GroupAccusationScreenProps = {
  players: readonly Player[]
  mode: GameMode
  roundNumber: number
  roundCount: RoundCount
  selectedPlayerIds: readonly string[]
  endgame: PublicEndgame
  sessionComplete: boolean
  completedResults: readonly RoundResult[]
  leaderboard: readonly { id: string; name: string; score: number; rank: number }[] | null
  notice: string
  onBack: () => void
  onSelectPlayer: (playerId: string) => void
  onConfirm: () => void
  onJudgeGuess: (correct: boolean) => void
  onNextRound: () => void
  onEndGame: () => void
  onNewSession: () => void
  onHome: () => void
}

function GroupAccusationScreen({
  players, mode, roundNumber, roundCount, selectedPlayerIds, endgame,
  sessionComplete, completedResults, leaderboard, notice,
  onBack, onSelectPlayer, onConfirm, onJudgeGuess, onNextRound, onEndGame, onNewSession, onHome,
}: GroupAccusationScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const requiredCount = getRequiredAccusationCount(mode)
  const isDoubleTrouble = requiredCount === 2
  const isSelecting = endgame.phase === 'accusation'
  const playerName = (id: string) => players.find((player) => player.id === id)?.name ?? 'Unknown player'
  const hasValidSelection = selectedPlayerIds.length === requiredCount
    && new Set(selectedPlayerIds).size === requiredCount
    && selectedPlayerIds.every((id) => players.some((player) => player.id === id))
  const result = endgame.phase === 'completed' ? endgame.result : null
  const impostorIds = endgame.phase === 'accusation' ? []
    : endgame.phase === 'final-guess' ? endgame.impostorIds : endgame.result.impostorIds

  useEffect(() => {
    headingRef.current?.focus()
  }, [endgame.phase, sessionComplete])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (hasValidSelection) onConfirm()
  }

  return (
    <div className="group-accusation-screen">
      <header className={`accusation-header${isSelecting ? '' : ' accusation-header-locked'}`}>
        {isSelecting && (
          <button className="back-button" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to Clues
          </button>
        )}
        <div className="brand" aria-label="Who&apos;s the Impostor">
          <span className="brand-mark" aria-hidden="true">?</span>
          <span>Who&apos;s the Impostor?</span>
        </div>
      </header>

      <main className="accusation-main">
        <p className="eyebrow">
          {sessionComplete ? 'Session complete · ' : ''}Round {roundNumber}{roundCount === 'endless' ? '' : ` of ${roundCount}`}
        </p>
        <h1 id="accusation-title" ref={headingRef} tabIndex={-1}>
          {isSelecting ? (isDoubleTrouble ? 'Who are the impostors?' : 'Who is the impostor?')
            : endgame.phase === 'final-guess' ? 'One last guess.'
              : result?.winner === 'impostors' ? 'Impostors win.' : 'Majority wins.'}
        </h1>

        {isSelecting ? (
          <>
            <p className="accusation-intro">The group has voted. Record your final accusation.</p>
            <form className="accusation-form" onSubmit={handleSubmit}>
              <fieldset>
                <legend>{isDoubleTrouble ? 'Select two players' : 'Select one player'}</legend>
                {isDoubleTrouble && (
                  <p className="selection-progress" aria-live="polite">{selectedPlayerIds.length} of 2 selected</p>
                )}
                <div className="accusation-options">
                  {players.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id)
                    return (
                      <label className={`accusation-option${isSelected ? ' is-selected' : ''}`} key={player.id}>
                        <input
                          checked={isSelected}
                          name={isDoubleTrouble ? `accused-${player.id}` : 'accused-player'}
                          onChange={() => onSelectPlayer(player.id)}
                          type={isDoubleTrouble ? 'checkbox' : 'radio'}
                          value={player.id}
                        />
                        <span>{player.name}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <p className="reveal-warning" id="reveal-warning">This locks the group&apos;s choice and reveals the {isDoubleTrouble ? 'impostors' : 'impostor'}. It cannot be undone.</p>
              <button
                className="button button-primary confirm-accusation-button"
                type="submit"
                disabled={!hasValidSelection}
                aria-describedby="reveal-warning"
              >
                Lock &amp; Reveal Impostor <span aria-hidden="true">→</span>
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="accusation-intro">
              {endgame.phase === 'final-guess'
                ? 'The group found every impostor. There is one chance to turn it around.'
                : sessionComplete
                  ? `${completedResults.length} ${completedResults.length === 1 ? 'round' : 'rounds'} played. ${leaderboard ? 'The final standings are below.' : 'Thanks for playing together.'}`
                  : 'Round complete. The table has its answer.'}
            </p>

            <section className="locked-selection" aria-labelledby="impostor-names-title">
              <h2 id="impostor-names-title">{isDoubleTrouble ? 'The impostors' : 'The impostor'}</h2>
              <ul>{impostorIds.map((id) => <li key={id}>{playerName(id)}</li>)}</ul>
            </section>

            {endgame.phase === 'final-guess' && (
              <section className="final-guess" aria-labelledby="final-guess-title">
                <h2 id="final-guess-title">One verbal word guess</h2>
                <p>{isDoubleTrouble ? 'Both impostors cooperate on one spoken guess of the majority word.' : 'The impostor guesses the majority word aloud.'} Judge it together before showing the answer.</p>
                <div className="guess-actions">
                  <button className="button button-primary" type="button" onClick={() => onJudgeGuess(true)}>Guessed Correctly</button>
                  <button className="button button-secondary" type="button" onClick={() => onJudgeGuess(false)}>Guessed Incorrectly</button>
                </div>
              </section>
            )}

            {result && (
              <>
                <dl className="round-answers">
                  <div><dt>Majority word</dt><dd className="result-majority-word">{result.majorityWord}</dd></div>
                  {result.decoyWord !== null && <div><dt>Decoy word</dt><dd className="result-decoy-word">{result.decoyWord}</dd></div>}
                </dl>
                <dl className="result-details">
                  <div><dt>Group accused</dt><dd>{result.accusedPlayerIds.map(playerName).join(' and ')}</dd></div>
                  <div><dt>Accusation</dt><dd>{result.accusationCorrect ? 'Completely correct' : 'Incorrect'}</dd></div>
                  <div><dt>Final guess</dt><dd>{result.finalGuess === 'not-needed' ? 'Not needed' : result.finalGuess === 'correct' ? 'Correct' : 'Incorrect'}</dd></div>
                </dl>

                {leaderboard && (
                  <section className="leaderboard" aria-labelledby="leaderboard-title">
                    <h2 id="leaderboard-title">{sessionComplete ? 'Final standings' : 'Standings'}</h2>
                    <ol>{leaderboard.map(({ id, name, score, rank }) => (
                      <li key={id}>
                        <span className="score-rank"><span className="visually-hidden">Rank </span>{rank}</span>
                        <span className="score-name">{name}</span>
                        <span>{score} <span className="score-unit">{score === 1 ? 'point' : 'points'}</span></span>
                      </li>
                    ))}</ol>
                  </section>
                )}

                {sessionComplete && completedResults.length > 1 && (
                  <details className="session-history">
                    <summary>Round history</summary>
                    <ol>{completedResults.map((completed) => (
                      <li key={completed.roundNumber}>
                        <span>Round {completed.roundNumber}</span>
                        <span>{completed.winner === 'majority' ? 'Majority' : 'Impostors'} won · {completed.majorityWord}</span>
                      </li>
                    ))}</ol>
                  </details>
                )}

                <div className="result-actions">
                  {sessionComplete ? (
                    <>
                      <button className="button button-primary" type="button" onClick={onNewSession}>New Session <span aria-hidden="true">→</span></button>
                      <button className="button button-secondary" type="button" onClick={onHome}>Return Home</button>
                    </>
                  ) : (
                    <>
                      <button className="button button-primary next-round-button" type="button" onClick={onNextRound}>Next Round <span aria-hidden="true">→</span></button>
                      <button className="button button-secondary" type="button" onClick={onEndGame}>End Game</button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {notice && <p className="accusation-error-message" role="alert">{notice}</p>}
      </main>
    </div>
  )
}

export default GroupAccusationScreen
