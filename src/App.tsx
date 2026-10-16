import { useRef, useState } from 'react'
import type { Player } from './game/players'
import {
  createAssignmentHistory,
  createRound,
  RoundCreationError,
  type GameRound,
} from './game/round'
import GameConfigurationScreen from './GameConfigurationScreen'
import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  normaliseGameSettings,
} from './game/settings'
import PlayerSetupScreen from './PlayerSetupScreen'
import HomeScreen from './HomeScreen'
import SecretRevealScreen from './SecretRevealScreen'
import './App.css'

type Screen = 'home' | 'player-setup' | 'game-configuration' | 'secret-reveal'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)
  const [configurationNotice, setConfigurationNotice] = useState('')
  const [assignmentHistory, setAssignmentHistory] = useState(createAssignmentHistory)
  const [activeRound, setActiveRound] = useState<GameRound | null>(null)
  const roundCreationLockRef = useRef(false)

  const handleSettingsChange = (nextSettings: GameSettings) => {
    setSettings(normaliseGameSettings(nextSettings, players.length))
    setConfigurationNotice('')
  }

  const handlePlayersChange = (nextPlayers: Player[]) => {
    setPlayers(nextPlayers)

    if (settings.mode === 'double-trouble' && nextPlayers.length < 6) {
      setSettings(normaliseGameSettings(settings, nextPlayers.length))
      setConfigurationNotice('Double Trouble was changed to Chaos because it requires at least 6 players.')
    }
  }

  const handleCreateRound = () => {
    if (roundCreationLockRef.current) {
      return
    }

    roundCreationLockRef.current = true

    try {
      const result = createRound(players, settings, assignmentHistory)
      setActiveRound(result.round)
      setAssignmentHistory(result.history)
      setConfigurationNotice('')
      setScreen('secret-reveal')
    } catch (error) {
      roundCreationLockRef.current = false

      if (error instanceof RoundCreationError && error.code === 'WORD_POOL_EXHAUSTED') {
        setConfigurationNotice('No unused words remain in this category. Choose another category to continue.')
      } else {
        setConfigurationNotice('The round could not be created. Check the players and game setup.')
      }
    }
  }

  const handleLeaveReveal = () => {
    setActiveRound(null)
    roundCreationLockRef.current = false
    setScreen('game-configuration')
  }

  if (screen === 'secret-reveal' && activeRound) {
    return <SecretRevealScreen players={players} round={activeRound} onLeave={handleLeaveReveal} />
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
