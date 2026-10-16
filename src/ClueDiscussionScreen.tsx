import { useEffect, useRef, useState } from 'react'
import type { Player } from './game/players'
import './ClueDiscussion.css'

type ClueDiscussionScreenProps = {
  players: readonly Player[]
  speakingOrder: readonly string[]
  onBack: () => void
}

function ClueDiscussionScreen({
  players,
  speakingOrder,
  onBack,
}: ClueDiscussionScreenProps) {
  const [nextStepNotice, setNextStepNotice] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const orderedPlayers = speakingOrder.map((playerId) =>
    players.find((player) => player.id === playerId),
  )
  const startingPlayer = orderedPlayers[0]
  const hasCompleteOrder = orderedPlayers.every((player) => player !== undefined)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (!startingPlayer || !hasCompleteOrder) {
    return (
      <div className="clue-discussion-screen">
        <main className="clue-main clue-error" role="alert">
          <h1>Unable to continue the clue round.</h1>
          <p>The speaking order no longer matches the current players.</p>
          <button className="button button-secondary" type="button" onClick={onBack}>
            Return to ready screen
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="clue-discussion-screen">
      <header className="clue-header">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Back
        </button>
        <div className="brand" aria-label="Who&apos;s the Impostor">
          <span className="brand-mark" aria-hidden="true">?</span>
          <span>Who&apos;s the Impostor?</span>
        </div>
      </header>

      <main className="clue-main">
        <section className="clue-overview" aria-labelledby="clue-round-title">
          <p className="eyebrow">Shared round</p>
          <h1 id="clue-round-title" ref={headingRef} tabIndex={-1}>
            Clues &amp; Discussion
          </h1>
          <p className="starting-player"><strong>{startingPlayer.name}</strong> starts!</p>
          <p className="clue-intro">Follow the order once, then talk it through together.</p>

          <section className="speaking-order" aria-labelledby="speaking-order-title">
            <h2 id="speaking-order-title">Speaking order</h2>
            <ol>
              {orderedPlayers.map((player, index) => (
                <li key={player?.id}>
                  <span className="speaker-number" aria-hidden="true">{index + 1}</span>
                  <span>{player?.name}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="group-instructions">
            <section aria-labelledby="give-clues-title">
              <h2 id="give-clues-title">Give your clues</h2>
              <p>Take turns in this order. Give one clue each without saying your secret word.</p>
            </section>
            <section aria-labelledby="discuss-title">
              <h2 id="discuss-title">Then discuss</h2>
              <p>Talk through the clues, question suspicious answers and work out who&apos;s bluffing.</p>
            </section>
          </div>

          <button
            className="button button-primary continue-questions-button"
            type="button"
            onClick={() => setNextStepNotice('Question Round is coming next.')}
          >
            Continue to Questions
            <span aria-hidden="true">→</span>
          </button>
          <p className="clue-next-step" role="status" aria-live="polite">
            {nextStepNotice}
          </p>
        </section>
      </main>
    </div>
  )
}

export default ClueDiscussionScreen
