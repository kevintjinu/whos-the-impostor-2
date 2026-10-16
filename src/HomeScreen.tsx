import { useRef } from 'react'

type HomeScreenProps = {
  onStartGame: () => void
}

function HomeScreen({ onStartGame }: HomeScreenProps) {
  const rulesDialogRef = useRef<HTMLDialogElement>(null)

  const openRules = () => {
    rulesDialogRef.current?.showModal()
  }

  return (
    <div className="home-screen">
      <header className="home-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">?</span>
          <span>Who&apos;s the Impostor?</span>
        </div>
        <p className="header-note">For the people in the room</p>
      </header>

      <main className="home-hero" id="main-content">
        <p className="eyebrow">A social word game</p>
        <h1 id="home-title">
          One word.
          <br />
          One impostor.
          <br />
          <span>Don&apos;t get caught.</span>
        </h1>
        <p className="home-intro">
          Pass the phone around the table. Give careful clues. Work out who is
          pretending.
        </p>

        <div className="home-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={onStartGame}
          >
            Start Game
            <span aria-hidden="true">→</span>
          </button>
          <button className="button button-secondary" type="button" onClick={openRules}>
            How to Play
          </button>
        </div>
      </main>

      <footer aria-label="Game summary">
        <ul className="home-footer">
          <li>Pass the phone</li>
          <li>Give clues</li>
          <li>Find the impostor</li>
        </ul>
      </footer>

      <dialog className="rules-dialog" ref={rulesDialogRef} aria-labelledby="rules-title">
        <div className="dialog-heading">
          <p className="eyebrow">The short version</p>
          <h2 id="rules-title">How to play</h2>
        </div>
        <ol>
          <li>Read your role privately. Most players share a word; impostors get a decoy or no word.</li>
          <li>Give clues in order, then question, discuss and vote aloud.</li>
          <li>Lock the group&apos;s accusation. Caught impostors get one final spoken word guess before the answers appear.</li>
        </ol>
        <form method="dialog">
          <button className="button button-secondary dialog-close" type="submit">
            Got it
          </button>
        </form>
      </dialog>
    </div>
  )
}

export default HomeScreen
