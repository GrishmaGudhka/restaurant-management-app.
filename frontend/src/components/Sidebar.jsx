import React, { useState } from 'react'
import PinPadModal from './PinPadModal' // Adjust path if PinPadModal is in another directory

export default function Sidebar({ user, onLogout, onUserSwitched, activeTab, setActiveTab }) {
  const [showPinModal, setShowPinModal] = useState(false)

  return (
    <aside className="w-64 bg-stone-900 text-stone-100 flex flex-col justify-between p-4 h-screen">
      {/* Top Nav Items */}
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-bold font-serif text-amber-100">The Corner Table</h1>
          <p className="text-xs text-amber-200/60 font-mono">back of house</p>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('floor')}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-mono text-sm transition-colors ${
              activeTab === 'floor' ? 'bg-amber-700 text-white font-bold' : 'hover:bg-stone-800 text-stone-300'
            }`}
          >
            Floor
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-mono text-sm transition-colors ${
              activeTab === 'menu' ? 'bg-amber-700 text-white font-bold' : 'hover:bg-stone-800 text-stone-300'
            }`}
          >
            Menu board
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full text-left px-4 py-2.5 rounded-lg font-mono text-sm transition-colors ${
              activeTab === 'tickets' ? 'bg-amber-700 text-white font-bold' : 'hover:bg-stone-800 text-stone-300'
            }`}
          >
            Ticket rail
          </button>
        </nav>
      </div>

      {/* Bottom User Profile Section */}
      <div className="border-t border-stone-800 pt-4 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-stone-200">{user?.username || 'User'}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono border border-amber-700/50">
              {user?.role || 'staff'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick PIN Switch Trigger */}
          <button
            onClick={() => setShowPinModal(true)}
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 transition-colors"
          >
            🔑 Switch
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 text-xs font-mono rounded text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Render PIN Pad Modal */}
      {showPinModal && (
        <PinPadModal
          onClose={() => setShowPinModal(false)}
          onSuccess={(newUser) => {
            setShowPinModal(false)
            if (onUserSwitched) onUserSwitched(newUser)
          }}
        />
      )}
    </aside>
  )
}