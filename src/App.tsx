import { useState } from 'react'
import type { Player } from './game/players'
import GameConfigurationScreen from './GameConfigurationScreen'
import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  normaliseGameSettings,
} from './game/settings'
import PlayerSetupScreen from './PlayerSetupScreen'
import HomeScreen from './HomeScreen'
import './App.css'

type Screen = 'home' | 'player-setup' | 'game-configuration'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS)
  const [configurationNotice, setConfigurationNotice] = useState('')

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

  if (screen === 'game-configuration') {
    return (
      <GameConfigurationScreen
        notice={configurationNotice}
        onBack={() => setScreen('player-setup')}
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
