import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from './api'
import type { User } from './api'

interface UseServerKeywordsReturn {
  keywords: string[]
  loading: boolean
  syncing: boolean
  syncError: string | null
  add: (kw: string) => void
  remove: (kw: string) => void
}

const DEBOUNCE_MS = 1000

export function useServerKeywords(user: User | null): UseServerKeywordsReturn {
  const [keywords, setKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingRef = useRef<string[] | null>(null)

  // Load keywords from server when user logs in
  useEffect(() => {
    if (!user) {
      setKeywords([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .myKeywords(user.token)
      .then((res) => {
        if (!cancelled) setKeywords(res.keywords)
      })
      .catch(() => {
        // Silently fail on load — user can still add keywords
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.userId])

  // Flush pending sync on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (pendingRef.current && user) {
        api.setKeywords(user.token, pendingRef.current).catch(() => {})
      }
    }
  }, [user])

  const syncToServer = useCallback(
    (kws: string[]) => {
      if (!user) return
      setSyncing(true)
      setSyncError(null)
      api
        .setKeywords(user.token, kws)
        .then(() => {})
        .catch((err: Error) => {
          setSyncError(err.message)
        })
        .finally(() => {
          setSyncing(false)
        })
    },
    [user],
  )

  const scheduleSync = useCallback(
    (kws: string[]) => {
      pendingRef.current = kws
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pendingRef.current = null
        syncToServer(kws)
      }, DEBOUNCE_MS)
    },
    [syncToServer],
  )

  const add = useCallback(
    (kw: string) => {
      const trimmed = kw.trim()
      if (!trimmed) return
      setKeywords((prev) => {
        if (prev.includes(trimmed)) return prev
        const next = [...prev, trimmed]
        scheduleSync(next)
        return next
      })
    },
    [scheduleSync],
  )

  const remove = useCallback(
    (kw: string) => {
      setKeywords((prev) => {
        const next = prev.filter((k) => k !== kw)
        scheduleSync(next)
        return next
      })
    },
    [scheduleSync],
  )

  return { keywords, loading, syncing, syncError, add, remove }
}
