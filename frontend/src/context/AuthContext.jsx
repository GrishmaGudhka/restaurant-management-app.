import { createContext, useContext, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    role: localStorage.getItem('role'),
  })

  const login = ({ access_token, username, role }) => {
    localStorage.setItem('token', access_token)
    localStorage.setItem('username', username)
    localStorage.setItem('role', role)
    setSession({ token: access_token, username, role })
  }

  const pinLogin = async (pin) => {
    const data = await api.pinLogin(pin)
    login({
      access_token: data.access_token,
      username: data.username,
      role: data.role,
    })
    return data
  }

  const logout = () => {
    ;['token', 'username', 'role'].forEach((k) => localStorage.removeItem(k))
    setSession({ token: null, username: null, role: null })
  }

  const isLoggedIn = !!session.token && !!session.role

  return (
    <AuthContext.Provider value={{ ...session, login, pinLogin, logout, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}