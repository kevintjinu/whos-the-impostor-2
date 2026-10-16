import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ClueDiscussionScreen from './ClueDiscussionScreen'
import type { Player } from './game/players'

const players: Player[] = [
  { id: 'alex', name: 'Alex' },
  { id: 'ben', name: 'Ben' },
  { id: 'chloe', name: 'Chloe' },
]

function renderScreen() {
  return renderToStaticMarkup(
    <ClueDiscussionScreen
      players={players}
      speakingOrder={['chloe', 'alex', 'ben']}
      onBack={() => undefined}
      onContinue={() => undefined}
    />,
  )
}

describe('shared verbal gameplay screen', () => {
  it('shows the saved speaking order and complete verbal group flow', () => {
    const markup = renderScreen()

    expect(markup.indexOf('Chloe')).toBeLessThan(markup.indexOf('Alex'))
    expect(markup.indexOf('Alex')).toBeLessThan(markup.indexOf('Ben'))
    expect(markup).toContain('Give your clues')
    expect(markup).toContain('Question &amp; discuss')
    expect(markup).toContain('Vote together')
    expect(markup).toContain('Continue to Accusation')
  })

  it('contains only public player data and no obsolete Question Round controls', () => {
    const markup = renderScreen()

    expect(markup).not.toMatch(/majority word|decoy word|private role/i)
    expect(markup).not.toContain('Continue to Questions')
    expect(markup).not.toContain('Assigned exchanges')
    expect(markup).not.toContain('Next Player')
  })
})
