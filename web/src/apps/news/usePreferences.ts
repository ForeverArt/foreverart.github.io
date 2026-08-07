import { useState, useCallback, useEffect } from 'react'
import { api, type AllPreferences } from './api'

export function usePreferences(token: string | null) {
  const [preferences, setPreferences] = useState<AllPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const prefs = await api.preferences(token)
      setPreferences(prefs)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return { preferences, loading, error, refetch: fetchPreferences }
}
