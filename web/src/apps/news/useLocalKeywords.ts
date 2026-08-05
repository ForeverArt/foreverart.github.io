import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'news_local_keywords'

export function useLocalKeywords() {
  const [keywords, setKeywordsState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keywords))
  }, [keywords])

  const add = useCallback((kw: string) => {
    const trimmed = kw.trim()
    if (!trimmed) return
    setKeywordsState((prev) => {
      if (prev.includes(trimmed)) return prev
      return [...prev, trimmed]
    })
  }, [])

  const remove = useCallback((kw: string) => {
    setKeywordsState((prev) => prev.filter((k) => k !== kw))
  }, [])

  const clear = useCallback(() => {
    setKeywordsState([])
  }, [])

  return { keywords, add, remove, clear, setKeywords: setKeywordsState }
}

// Check if a title matches any keyword (case-insensitive)
export function matchesKeyword(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase()
  return keywords.some((kw) => lower.includes(kw.toLowerCase()))
}
