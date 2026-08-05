const BACKEND_BASE = import.meta.env.VITE_BACKEND_BASE_URL || ''

export interface TRPlatform {
  id: number
  name: string
}

export interface TRNewsItem {
  id: number
  title: string
  platformId: number
  platformName: string
  rank: number
  url: string
  firstCrawlAt: string
  lastCrawlAt: string
  crawlCount: number
}

export interface TRLatestGroup {
  platform: TRPlatform
  items: TRNewsItem[]
}

export interface TRRankPoint {
  rank: number
  crawlTime: string
}

export interface Digest {
  date: string
  content: string
  generatedAt: string
}

export interface User {
  userId: number
  username: string
  token: string
}

export interface FeedInfo {
  token: string
  url: string
  createdAt: string
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// Public endpoints
export const api = {
  platforms: (date?: string) =>
    fetchJSON<TRPlatform[]>(`/api/v1/news/platforms${date ? `?date=${date}` : ''}`),

  latest: (date?: string) =>
    fetchJSON<TRLatestGroup[]>(`/api/v1/news/latest${date ? `?date=${date}` : ''}`),

  items: (params: { date?: string; platform?: string; q?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params.date) qs.set('date', params.date)
    if (params.platform) qs.set('platform', params.platform)
    if (params.q) qs.set('q', params.q)
    if (params.limit) qs.set('limit', String(params.limit))
    return fetchJSON<TRNewsItem[]>(`/api/v1/news/items?${qs}`)
  },

  history: (itemId: number, date?: string) =>
    fetchJSON<TRRankPoint[]>(`/api/v1/news/items/${itemId}/history${date ? `?date=${date}` : ''}`),

  digest: (date?: string) =>
    fetchJSON<Digest>(`/api/v1/news/digest${date ? `?date=${date}` : ''}`),

  refreshDigest: () =>
    fetchJSON<Digest>('/api/v1/news/digest', { method: 'POST' }),

  // Auth
  register: (username: string, password: string) =>
    fetchJSON<User>('/api/v1/news/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    fetchJSON<User>('/api/v1/news/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  // Protected endpoints (require token)
  myKeywords: (token: string) =>
    fetchJSON<{ keywords: string[] }>('/api/v1/news/me/keywords', {
      headers: authHeaders(token),
    }),

  setKeywords: (token: string, keywords: string[]) =>
    fetchJSON<{ keywords: string[] }>('/api/v1/news/me/keywords', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ keywords }),
    }),

  myFeed: (token: string) =>
    fetchJSON<FeedInfo>('/api/v1/news/me/feed', {
      headers: authHeaders(token),
    }),

  resetFeed: (token: string) =>
    fetchJSON<FeedInfo>('/api/v1/news/me/feed/reset', {
      method: 'POST',
      headers: authHeaders(token),
    }),
}
