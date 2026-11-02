import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function PinPadModal({ isOpen, onClose }) {
  const { pinLogin } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit)
      setError('')
    }
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!pin) return
    try {
      await pinLogin(pin)
      setPin('')
      onClose()
    } catch (err) {
      setError(err.message || 'Invalid PIN code')
      setPin('')
    }
  }

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="pin-card" style={{
        background: '#fff', padding: '24px', borderRadius: '12px',
        width: '280px', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px' }}>Switch User</h3>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Enter 4-digit PIN</p>

        <div style={{
          fontSize: '24px', letterSpacing: '8px', height: '36px',
          borderBottom: '2px solid #ccc', marginBottom: '16px', fontWeight: 'bold'
        }}>
          {'•'.repeat(pin.length) || <span style={{ opacity: 0.3, letterSpacing: 'normal', fontSize: '14px' }}>ENTER PIN</span>}
        </div>

        {error && <div style={{ color: '#d32f2f', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(String(num))}
              style={{ padding: '14px', fontSize: '18px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            style={{ padding: '14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', background: '#f5f5f5' }}
          >
            CLR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{ padding: '14px', fontSize: '18px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{ padding: '14px', fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#2e7d32', color: '#fff', fontWeight: 'bold' }}
          >
            OK
          </button>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}