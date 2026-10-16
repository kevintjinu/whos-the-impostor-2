import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react'
import type { Player } from './game/players'
import type { GameRound, PrivateRole } from './game/round'
import './SecretReveal.css'

type SecretRevealScreenProps = {
  players: readonly Player[]
  round: GameRound
  initiallyComplete?: boolean
  onBeginRound: () => void
  onLeave: () => void
}

type RevealMethod = 'hold' | 'controlled' | null

function SecretContent({ assignment, controlled, hideButtonRef, onHide }: {
  assignment: PrivateRole
  controlled: boolean
  hideButtonRef: Ref<HTMLButtonElement>
  onHide: () => void
}) {
  const isImpostor = assignment.role === 'impostor'

  return (
    <section className="secret-content" aria-labelledby="secret-role" aria-live="assertive">
      <p className="secret-label">Your role</p>
      <h2 id="secret-role">{isImpostor ? 'Impostor' : 'Majority'}</h2>
      <p className="secret-word-label">Your word</p>
      <p className={`secret-word${assignment.word ? '' : ' no-word'}`}>
        {assignment.word ?? 'No word'}
      </p>
      <p className="secret-instruction">{assignment.instruction}</p>
      {controlled ? (
        <button
          ref={hideButtonRef}
          className="button button-secondary hide-secret-button"
          type="button"
          onClick={onHide}
        >
          Hide secret
        </button>
      ) : (
        <p className="release-note">Release to hide</p>
      )}
    </section>
  )
}

function SecretRevealScreen({
  players,
  round,
  initiallyComplete = false,
  onBeginRound,
  onLeave,
}: SecretRevealScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealMethod, setRevealMethod] = useState<RevealMethod>(null)
  const [hasViewed, setHasViewed] = useState(false)
  const [isComplete, setIsComplete] = useState(initiallyComplete)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const holdButtonRef = useRef<HTMLButtonElement>(null)
  const controlledRevealButtonRef = useRef<HTMLButtonElement>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const assignment = round.privateRoles[currentIndex]
  const player = players.find((candidate) => candidate.id === assignment?.playerId)
  const isSecretVisible = revealMethod !== null

  const releaseActivePointerCapture = useCallback(() => {
    const pointerId = activePointerIdRef.current
    const holdButton = holdButtonRef.current

    if (pointerId !== null && holdButton?.hasPointerCapture(pointerId)) {
      holdButton.releasePointerCapture(pointerId)
    }
    activePointerIdRef.current = null
  }, [])

  useEffect(() => {
    const hideSecret = () => {
      releaseActivePointerCapture()
      setRevealMethod(null)
    }
    const hideWhenDocumentIsHidden = () => {
      if (document.visibilityState !== 'visible') {
        hideSecret()
      }
    }

    window.addEventListener('blur', hideSecret)
    window.addEventListener('pagehide', hideSecret)
    document.addEventListener('visibilitychange', hideWhenDocumentIsHidden)

    return () => {
      releaseActivePointerCapture()
      window.removeEventListener('blur', hideSecret)
      window.removeEventListener('pagehide', hideSecret)
      document.removeEventListener('visibilitychange', hideWhenDocumentIsHidden)
    }
  }, [releaseActivePointerCapture])

  useEffect(() => {
    headingRef.current?.focus()
  }, [currentIndex, isComplete])

  useEffect(() => {
    if (revealMethod === 'controlled') {
      hideButtonRef.current?.focus()
    }
  }, [revealMethod])

  const showSecret = (method: Exclude<RevealMethod, null>) => {
    setRevealMethod(method)
    setHasViewed(true)
  }

  const hideSecret = () => {
    setRevealMethod(null)
  }

  const hideControlledSecret = () => {
    setRevealMethod(null)
    requestAnimationFrame(() => controlledRevealButtonRef.current?.focus())
  }

  const handleHoldStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

    activePointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    showSecret('hold')
  }

  const handleHoldEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (activePointerIdRef.current === event.pointerId) {
      activePointerIdRef.current = null
    }

    if (revealMethod !== 'hold') {
      return
    }

    hideSecret()
  }

  const handleHoldKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault()
      showSecret('hold')
    }
  }

  const handleHoldKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      hideSecret()
    }
  }

  const handleNextPlayer = () => {
    if (!hasViewed || isSecretVisible) {
      return
    }

    setHasViewed(false)
    if (currentIndex === round.privateRoles.length - 1) {
      setIsComplete(true)
      return
    }

    setCurrentIndex((index) => index + 1)
  }

  const handleLeave = () => {
    releaseActivePointerCapture()
    hideSecret()
    onLeave()
  }

  if (!assignment || !player) {
    return (
      <div className="role-reveal-screen">
        <main className="reveal-main reveal-error" role="alert">
          <h1>Unable to continue this reveal.</h1>
          <p>The player list no longer matches this round.</p>
          <button className="button button-primary" type="button" onClick={handleLeave}>
            Return to game setup
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="role-reveal-screen">
      <header className="reveal-header">
        <button className="back-button" type="button" onClick={handleLeave}>
          <span aria-hidden="true">←</span>
          Leave reveal
        </button>
        <div className="brand" aria-label="Who&apos;s the Impostor">
          <span className="brand-mark" aria-hidden="true">?</span>
          <span>Who&apos;s the Impostor?</span>
        </div>
      </header>

      <main className={`reveal-main${isComplete ? ' is-complete' : ''}`}>
        {isComplete ? (
          <section className="reveal-ready" aria-labelledby="ready-title">
            <p className="eyebrow">Roles revealed</p>
            <h1 id="ready-title" ref={headingRef} tabIndex={-1}>Everyone knows their role.</h1>
            <p>Ready to find the impostor?</p>
            <button
              className="button button-primary"
              type="button"
              onClick={onBeginRound}
            >
              Begin round
              <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : (
          <>
            <div className="reveal-progress" aria-label={`Player ${currentIndex + 1} of ${players.length}`}>
              <span>Private reveal</span>
              <span>{currentIndex + 1} / {players.length}</span>
            </div>

            <section className="reveal-handoff" aria-labelledby="handoff-title">
              <p className="eyebrow">Pass the phone</p>
              <h1 id="handoff-title" ref={headingRef} tabIndex={-1}>Pass the phone to {player.name}.</h1>
              <p>Only {player.name} should look at the screen.</p>
            </section>

            {isSecretVisible && (
              <SecretContent
                assignment={assignment}
                controlled={revealMethod === 'controlled'}
                hideButtonRef={hideButtonRef}
                onHide={hideControlledSecret}
              />
            )}

            <div className="reveal-controls">
              {revealMethod !== 'controlled' && (
                <button
                  ref={holdButtonRef}
                  className={`button hold-reveal-button${revealMethod === 'hold' ? ' is-held' : ''}`}
                  type="button"
                  aria-pressed={revealMethod === 'hold'}
                  onBlur={() => {
                    if (revealMethod === 'hold') {
                      hideSecret()
                    }
                  }}
                  onKeyDown={handleHoldKeyDown}
                  onKeyUp={handleHoldKeyUp}
                  onLostPointerCapture={handleHoldEnd}
                  onPointerCancel={handleHoldEnd}
                  onPointerDown={handleHoldStart}
                  onPointerLeave={handleHoldEnd}
                  onPointerUp={handleHoldEnd}
                >
                  {revealMethod === 'hold' ? 'Release to hide' : 'Press and hold to reveal'}
                </button>
              )}

              {revealMethod !== 'controlled' && (
                <button
                  ref={controlledRevealButtonRef}
                  className="controlled-reveal-button"
                  type="button"
                  onClick={() => showSecret('controlled')}
                >
                  Use tap or assistive controls
                </button>
              )}

              {!isSecretVisible && (
                <button
                  className="button button-primary next-player-button"
                  type="button"
                  disabled={!hasViewed}
                  onClick={handleNextPlayer}
                >
                  {currentIndex === players.length - 1 ? 'Finish reveals' : 'I’ve seen my role'}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default SecretRevealScreen
