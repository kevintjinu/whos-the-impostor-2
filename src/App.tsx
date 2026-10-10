import { useState } from 'react'
import type { Player } from './game/players'
import PlayerSetupScreen from './PlayerSetupScreen'
import HomeScreen from './HomeScreen'
import './App.css'

type Screen = 'home' | 'player-setup'

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [players, setPlayers] = useState<Player[]>([])

  if (screen === 'player-setup') {
    return (
      <PlayerSetupScreen
        players={players}
        onBack={() => setScreen('home')}
        onPlayersChange={setPlayers}
      />
    )
  }

  return <HomeScreen onStartGame={() => setScreen('player-setup')} />
}

export default App
