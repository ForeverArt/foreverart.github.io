export interface Health {
  ok: boolean
  build_time: string
  uptime_sec: number
  llm_model: string
  llm_ready: boolean
}

export interface ReportRecord {
  report_id: string
  model: string
  status: 'success' | 'error'
  latency_ms: number
  at: string
}

export interface Stats {
  build_time: string
  uptime_sec: number
  requests_total: number
  llm_model: string
  llm_base_url: string
  llm_ready: boolean
  recent_reports: ReportRecord[]
}

// 同源部署：nginx 将 /api 反代到 foreverart-api；dev 走 vite proxy。
async function getJSON<T>(path: string, adminPassword?: string): Promise<T> {
  const headers: Record<string, string> = {}
  if (adminPassword) {
    headers['X-Admin-Password'] = adminPassword
  }
  const res = await fetch(path, { headers })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    throw new Error(`请求失败 ${res.status}`)
  }
  return (await res.json()) as T
}

export function fetchHealth(): Promise<Health> {
  return getJSON<Health>('/api/v1/healthz')
}

export function fetchStats(adminPassword: string): Promise<Stats> {
  return getJSON<Stats>('/api/v1/admin/stats', adminPassword)
}
