import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TABS_BY_ROLE, TAB_LABELS } from './lib/permissions'
import Login from './pages/Login'
import MenuManagement from './pages/MenuManagement'
import TableView from './pages/TableView'
import Orders from './pages/Orders'
import Team from './pages/Team'

const PAGES = { floor: TableView, menu: MenuManagement, orders: Orders, team: Team }

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="15.5" stroke="#D9A94A" strokeWidth="1.3" />
      <circle cx="17" cy="17" r="12" stroke="#D9A94A" strokeWidth="0.6" opacity="0.55" />
      <text x="17" y="22.5" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="14" fill="#D9A94A">CT</text>
    </svg>
  )
}

function Dashboard() {
  const { username, role, logout } = useAuth()
  const tabs = TABS_BY_ROLE[role] || []
  const [tab, setTab] = useState(tabs[0])
  const Page = PAGES[tab]

  return (
    <div className="shell">
      <nav className="rail">
        <div className="brand">
          <BrandMark />
          <div className="brand-text">
            The Corner Table
            <span>back of house</span>
          </div>
        </div>

        <div className="tab-strip">
          {tabs.map((key) => (
            <button key={key} className={`ticket-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="rail-footer">
          <span className="who">{username} <span className="role-tag">{role}</span></span>
          <button onClick={logout}>Log out</button>
        </div>
      </nav>

      <main className="main">
        <div className="page-header">
          <h2>{TAB_LABELS[tab]}</h2>
          <span className="who">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        {Page && <Page />}
      </main>
    </div>
  )
}

function AppInner() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <Dashboard /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
