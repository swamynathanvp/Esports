import { useState } from 'react'
import LoginGateway from './components/LoginGateway'
import ManagerApp from './components/ManagerApp'
import PlayerApp from './components/PlayerApp'
import './App.css'

function App() {
  const [role, setRole] = useState(null); // 'manager' | 'player' | null

  if (!role) {
    return <LoginGateway onLogin={(selectedRole) => setRole(selectedRole)} />
  }

  if (role === 'manager') {
    return <ManagerApp onLogout={() => setRole(null)} />
  }

  if (role === 'player') {
    return <PlayerApp onLogout={() => setRole(null)} />
  }

  return null;
}

export default App
