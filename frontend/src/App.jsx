import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import MenuManagement from './pages/MenuManagement'
import TableView from './pages/TableView'
import Orders from './pages/Orders'

function Dashboard() {
  const { username, logout } = useAuth()
  const [tab, setTab] = useState('tables')

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>🍽️ Restaurant Manager</h1>
        <div>
          <span style={{ marginRight: 12 }}>Hi, {username}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="nav">
        <button className={tab === 'tables' ? 'active' : ''} onClick={() => setTab('tables')}>Tables</button>
        <button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>Menu</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
      </div>

      {tab === 'tables' && <TableView />}
      {tab === 'menu' && <MenuManagement />}
      {tab === 'orders' && <Orders />}
    </div>
  )
}

function AppInner() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <Dashboard /> : <div className="app"><Login /></div>
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
