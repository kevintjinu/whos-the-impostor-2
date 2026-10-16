import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GroupAccusationScreen from './GroupAccusationScreen'
import type { PublicEndgame } from './game/endgame'
import { createSession, getLeaderboard, markRevealComplete, revealAccusation, selectAccusedPlayer, judgeFinalGuess, finishSession } from './game/session'
import { getPublicEndgame } from './game/endgame'
import { DEFAULT_GAME_SETTINGS } from './game/settings'
import type { Player } from './game/players'

const players: Player[] = [
  { id: 'alex', name: 'Alex' },
  { id: 'ben', name: 'Ben' },
  { id: 'chloe', name: 'Chloe' },
]

function renderScreen({
  mode = 'chaos',
  selectedPlayerIds = [],
  endgame = { phase: 'accusation' },
}: Partial<{
  mode: 'chaos' | 'double-trouble'
  selectedPlayerIds: readonly string[]
  endgame: PublicEndgame
}> = {}) {
  return renderToStaticMarkup(
    <GroupAccusationScreen
      players={players}
      mode={mode}
      selectedPlayerIds={selectedPlayerIds}
      endgame={endgame}
      roundNumber={1}
      roundCount={10}
      sessionComplete={false}
      completedResults={[]}
      leaderboard={null}
      notice=""
      onBack={() => undefined}
      onSelectPlayer={() => undefined}
      onConfirm={() => undefined}
      onJudgeGuess={() => undefined}
      onNextRound={() => undefined}
      onEndGame={() => undefined}
      onNewSession={() => undefined}
      onHome={() => undefined}
    />,
  )
}

describe('GroupAccusationScreen', () => {
  it('renders every public player as a single-impostor radio choice', () => {
    const markup = renderScreen()

    expect(markup).toContain('Who is the impostor?')
    expect(markup.match(/type="radio"/g)).toHaveLength(players.length)
    players.forEach((player) => expect(markup).toContain(player.name))
    expect(markup).toContain('Lock &amp; Reveal Impostor')
    expect(markup).toContain('It cannot be undone.')
    expect(markup).toContain('disabled=""')
  })

  it('renders Double Trouble as two-player checkbox selection with progress', () => {
    const markup = renderScreen({ mode: 'double-trouble', selectedPlayerIds: ['alex'] })

    expect(markup).toContain('Who are the impostors?')
    expect(markup).toContain('1 of 2 selected')
    expect(markup.match(/type="checkbox"/g)).toHaveLength(players.length)
    expect(markup).toContain('checked=""')
  })

  it('shows revealed impostors and one cooperative verbal guess without any words', () => {
    const markup = renderScreen({
      mode: 'double-trouble',
      selectedPlayerIds: ['alex', 'chloe'],
      endgame: {
        phase: 'final-guess',
        accusedPlayerIds: ['alex', 'chloe'],
        impostorIds: ['alex', 'chloe'],
      },
    })

    expect(markup).toContain('One last guess.')
    expect(markup).toContain('Both impostors cooperate on one spoken guess of the majority word.')
    expect(markup).toContain('Guessed Correctly')
    expect(markup).toContain('Guessed Incorrectly')
    expect(markup).not.toContain('result-majority-word')
    expect(markup).not.toContain('result-decoy-word')
    expect(markup).not.toContain('Accusation locked.')
    expect(markup).not.toContain('Reveal the Impostor')
    expect(markup).not.toContain('type="checkbox"')
    expect(markup).not.toContain('Confirm Accusation')
  })

  it('reveals completed answers and session standings in the existing view', () => {
    let session = markRevealComplete(createSession(players, { ...DEFAULT_GAME_SETTINGS, scoring: 'competitive' }, () => 0))
    session = revealAccusation(selectAccusedPlayer(session, session.round.impostorIds[0]))
    session = finishSession(judgeFinalGuess(session, false))
    const markup = renderToStaticMarkup(
      <GroupAccusationScreen
        players={players}
        mode={session.round.mode}
        roundNumber={1}
        roundCount={10}
        selectedPlayerIds={session.draft}
        endgame={getPublicEndgame(session.endgame, session.round)}
        sessionComplete
        completedResults={session.results}
        leaderboard={getLeaderboard(session)}
        notice=""
        onBack={() => undefined}
        onSelectPlayer={() => undefined}
        onConfirm={() => undefined}
        onJudgeGuess={() => undefined}
        onNextRound={() => undefined}
        onEndGame={() => undefined}
        onNewSession={() => undefined}
        onHome={() => undefined}
      />,
    )
    expect(markup).toContain('Majority wins.')
    expect(markup).toContain(session.round.majorityWord)
    expect(markup).toContain('Final standings')
    expect(markup).toContain('New Session')
    expect(markup).not.toContain('Guessed Correctly')
    expect(markup).not.toContain('Next Round')
  })
})
