import { useRef, useState } from 'react'
import ClueDiscussionScreen from './ClueDiscussionScreen'
import {
  AccusationError,
} from './game/accusation'
import { createSpeakingOrder } from './game/cluePhase'
import { getPublicEndgame } from './game/endgame'
import type { Player } from './game/players'
import {
  createSession,
  finishSession,
  getLeaderboard,
  judgeFinalGuess,
  markRevealComplete,
  restartSession,
  revealAccusation,
  selectAccusedPlayer,
  startNextRound,
  type GameSession,
} from './game/session'
import GameConfigurationScreen from './GameConfigurationScreen'
import GroupAccusationScreen from './GroupAccusationScreen'
import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  normaliseGameSettings,
} from './game/settings'
import PlayerSetupScreen from './PlayerSetupScreen'
import HomeScreen from './HomeScreen'
import SecretRevealScreen from './SecretRevealScreen'
import './App.css'

type Screen =
  | 'home'
  | 'player-setup'
  | 'game-configuration'
  | 'secret-reveal'
  | 'clue-discussion'
  | 'group-accusation'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)
  const [configurationNotice, setConfigurationNotice] = useState('')
  const [session, setSession] = useState<GameSession | null>(null)
  const sessionRef = useRef<GameSession | null>(null)
  const startingSessionRef = useRef(false)
  const [accusationNotice, setAccusationNotice] = useState('')

  const saveSession = (next: GameSession) => {
    sessionRef.current = next
    setSession(next)
    setAccusationNotice('')
  }

  // A stale callback (including a second synchronous tap) cannot process a
  // transition twice. Randomness and score updates run only inside handlers.
  const transitionSession = (change: (current: GameSession) => GameSession) => {
    if (!session || sessionRef.current !== session) return false
    try {
      saveSession(change(session))
      return true
    } catch (error) {
      setAccusationNotice(error instanceof AccusationError && error.code === 'TOO_MANY_SELECTIONS'
        ? 'Deselect one player before choosing someone else.'
        : 'This action could not be completed. Check the selection and try again.')
      return false
    }
  }

  const handleSettingsChange = (nextSettings: GameSettings) => {
    setSettings(normaliseGameSettings(nextSettings, players.length))
    setConfigurationNotice(session?.status === 'playing'
      ? 'Changed setup starts a fresh session. Scores and word history will reset.'
      : '')
  }

  const handlePlayersChange = (nextPlayers: Player[]) => {
    setPlayers(nextPlayers)
    if (session?.status === 'playing') {
      setConfigurationNotice('Changed players start a fresh session. Scores and word history will reset.')
    }

    if (settings.mode === 'double-trouble' && nextPlayers.length < 6) {
      setSettings(normaliseGameSettings(settings, nextPlayers.length))
      setConfigurationNotice('Double Trouble was changed to Chaos because it requires at least 6 players.')
    }
  }

  const handleCreateRound = () => {
    if (startingSessionRef.current) return
    startingSessionRef.current = true
    try {
      const current = sessionRef.current
      const canResume = current?.status === 'playing'
        && current.endgame.phase === 'accusation'
        && JSON.stringify(current.players) === JSON.stringify(players)
        && JSON.stringify(current.settings) === JSON.stringify(settings)
      saveSession(canResume ? current : createSession(players, settings))
      setConfigurationNotice('')
      setScreen('secret-reveal')
    } catch {
      startingSessionRef.current = false
      setConfigurationNotice('The round could not be created. Check the players and game setup. Secure browser randomness is required.')
    }
  }

  const handleLeaveReveal = () => {
    startingSessionRef.current = false
    setConfigurationNotice('Round paused. Continue with the same setup to resume it. Changing players or settings starts a fresh session.')
    setScreen('game-configuration')
  }

  const handleBeginRound = () => {
    if (transitionSession(markRevealComplete)) setScreen('clue-discussion')
  }

  const handleNextRound = () => {
    if (transitionSession(startNextRound)) setScreen('secret-reveal')
  }

  const handleNewSession = () => {
    if (!session || sessionRef.current !== session || session.status !== 'finished') return
    const setup = restartSession(session)
    sessionRef.current = null
    setSession(null)
    setPlayers([...setup.players])
    setSettings({ ...setup.settings })
    startingSessionRef.current = false
    setConfigurationNotice('Ready for a fresh session. Continue to start Round 1.')
    setAccusationNotice('')
    setScreen('game-configuration')
  }

  if (screen === 'group-accusation' && session) {
    return (
      <GroupAccusationScreen
        players={session.players}
        mode={session.round.mode}
        roundNumber={session.round.roundNumber}
        roundCount={session.settings.roundCount}
        selectedPlayerIds={session.draft}
        endgame={getPublicEndgame(session.endgame, session.round)}
        sessionComplete={session.status === 'finished'}
        completedResults={session.results}
        leaderboard={session.settings.scoring === 'competitive' ? getLeaderboard(session) : null}
        notice={accusationNotice}
        onBack={() => {
          if (sessionRef.current?.endgame.phase === 'accusation') setScreen('clue-discussion')
        }}
        onSelectPlayer={(id) => transitionSession((current) => selectAccusedPlayer(current, id))}
        onConfirm={() => transitionSession(revealAccusation)}
        onJudgeGuess={(correct) => transitionSession((current) => judgeFinalGuess(current, correct))}
        onNextRound={handleNextRound}
        onEndGame={() => transitionSession(finishSession)}
        onNewSession={handleNewSession}
        onHome={() => {
          startingSessionRef.current = false
          setScreen('home')
        }}
      />
    )
  }

  if (screen === 'clue-discussion' && session) {
    return (
      <ClueDiscussionScreen
        players={session.players}
        speakingOrder={createSpeakingOrder(
          session.players.map((player) => player.id),
          session.round.startingPlayerId,
        )}
        onBack={() => {
          if (sessionRef.current?.endgame.phase === 'accusation') setScreen('secret-reveal')
        }}
        onContinue={() => setScreen('group-accusation')}
      />
    )
  }

  if (screen === 'secret-reveal' && session) {
    return (
      <SecretRevealScreen
        key={session.round.roundNumber}
        initiallyComplete={session.revealComplete}
        players={session.players}
        round={session.round}
        onBeginRound={handleBeginRound}
        onLeave={handleLeaveReveal}
      />
    )
  }

  if (screen === 'game-configuration') {
    return (
      <GameConfigurationScreen
        notice={configurationNotice}
        onBack={() => setScreen('player-setup')}
        onContinue={handleCreateRound}
        onSettingsChange={handleSettingsChange}
        playerCount={players.length}
        settings={settings}
      />
    )
  }

  if (screen === 'player-setup') {
    return (
      <PlayerSetupScreen
        players={players}
        onBack={() => setScreen('home')}
        onContinue={() => setScreen('game-configuration')}
        onPlayersChange={handlePlayersChange}
      />
    )
  }

  return <HomeScreen onStartGame={() => setScreen('player-setup')} />
}

export default App
