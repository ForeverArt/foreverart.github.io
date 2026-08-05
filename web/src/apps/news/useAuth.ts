import { useState, useCallback } from 'react'
import { api, type User } from './api'

const STORAGE_KEY = 'news_auth'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { user: JSON.parse(raw), loading: false, error: null } : { user: null, loading: false, error: null }
    } catch {
      return { user: null, loading: false, error: null }
    }
  })

  const register = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const user = await api.register(username, password)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      setState({ user, loading: false, error: null })
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
      throw err
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const user = await api.login(username, password)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      setState({ user, loading: false, error: null })
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ user: null, loading: false, error: null })
  }, [])

  return { ...state, register, login, logout }
}
