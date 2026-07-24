// ── 基础请求 ──────────────────────────────────────────────
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

// ── spin-reports ──────────────────────────────────────────────
export interface SpinFeatureValue {
  featureId: string
  unit: string
  last: number
  mean?: number
  std?: number
  availableRatio: number
}

export interface SpinReportRequest {
  schemaVersion: '2.0.0'
  report: {
    schemaVersion: '2.0.0'
    skill: 'upright_spin'
    summary: {
      overallScore: number
      overallGrade: string
      durationSec: number
      processedFrames?: number
      warnings: string[]
    }
    features: Record<string, SpinFeatureValue>
    rules: {
      schemaVersion: '2.0.0'
      overallScore: number
      overallGrade: string
      features: Record<string, unknown>
      weights: Record<string, unknown>
    }
    events: unknown[]
    traceability: {
      knowledgeRefs: string[]
      ruleRefs: string[]
      featureIds: string[]
    }
  }
  meta: {
    spinId: string
    athlete: string
    skill: 'upright_spin'
    source: string
    videoFileName?: string
  }
}

export interface SpinReportResponse {
  reportId: string
  schemaVersion: string
  markdown: string
  model: string
  generatedAt: string
  knowledgeRefs: string[]
}

// ── HTTP helpers ──────────────────────────────────────────────
async function request<T>(
  path: string,
  opts?: { method?: string; body?: unknown; adminPassword?: string }
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts?.adminPassword) headers['X-Admin-Password'] = opts.adminPassword

  const res = await fetch(path, {
    method: opts?.method ?? 'GET',
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401) throw new Error('unauthorized')
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`请求失败 ${res.status}${text ? ': ' + text : ''}`)
  }
  return res.json() as Promise<T>
}

// ── Public API ──────────────────────────────────────────────
export function fetchHealth(): Promise<Health> {
  return request<Health>('/api/v1/healthz')
}

export function fetchStats(adminPassword: string): Promise<Stats> {
  return request<Stats>('/api/v1/admin/stats', { adminPassword })
}

export function postSpinReport(req: SpinReportRequest): Promise<SpinReportResponse> {
  return request<SpinReportResponse>('/api/v1/spin-reports', {
    method: 'POST',
    body: req,
  })
}

// ── 密码管理 ──────────────────────────────────────────────
const PASSWORD_KEY = 'foreverart-dashboard-password'

export function getAdminPassword(): string {
  return localStorage.getItem(PASSWORD_KEY) ?? ''
}

export function setAdminPassword(pw: string): void {
  if (pw) localStorage.setItem(PASSWORD_KEY, pw)
  else localStorage.removeItem(PASSWORD_KEY)
}

// ── 本地 rules.json 持久化（localStorage 模拟）──────────────
const RULES_KEY = 'foreverart-rules-v1'

export interface SavedRuleThresholds {
  id: string
  grades: { grade: string; value: number; unit: string }[]
  savedAt: string
}

export function loadSavedRules(): Record<string, SavedRuleThresholds> {
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveRuleThresholds(id: string, grades: SavedRuleThresholds['grades']): void {
  const all = loadSavedRules()
  all[id] = { id, grades, savedAt: new Date().toISOString() }
  localStorage.setItem(RULES_KEY, JSON.stringify(all))
}

// ── 本地 Session 存储 ──────────────────────────────────────────
const SESSIONS_KEY = 'foreverart-sessions-v1'

export interface LocalSession {
  id: string
  date: string
  skater: string
  videoFileName: string
  spinType: 'upright_spin'
  reportRequest: SpinReportRequest
  reportResponse?: SpinReportResponse
  featureTimeline?: { t: number; axis: number; speed: number; drift: number }[]
}

export function loadLocalSessions(): LocalSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveLocalSession(session: LocalSession): void {
  const all = loadLocalSessions()
  const idx = all.findIndex(s => s.id === session.id)
  if (idx >= 0) all[idx] = session
  else all.unshift(session)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, 100)))
}

// ── Prompt 版本存储 ──────────────────────────────────────────
const PROMPTS_KEY = 'foreverart-prompts-v1'

export interface PromptVersion {
  id: string
  name: string
  type: 'report' | 'coaching' | 'explain'
  version: string
  content: string
  createdAt: string
  usageCount: number
  lastUsedAt?: string
  notes?: string
}

export function loadPrompts(): PromptVersion[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PROMPTS_KEY) ?? 'null')
    if (saved) return saved
  } catch { /* empty */ }
  // 默认内置 Prompt
  return DEFAULT_PROMPTS
}

export function savePrompts(prompts: PromptVersion[]): void {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts))
}

export const DEFAULT_PROMPTS: PromptVersion[] = [
  {
    id: 'report-v1',
    name: 'Offline Spin Report',
    type: 'report',
    version: 'v1',
    content: `你是一名花滑技术教练助手。只能依据提供的 Knowledge excerpts、Feature、Rule、Event 进行分析。

约束：
- 不重新计算任何数值
- 不修改分数或 grade
- 不臆测 ISU Level / GOE
- 每个结论尽量引用输入数值与 knowledge 路径
- Center Drift / COM Offset 是身体尺度 proxy，不得写成真实厘米

输出固定章节：
## 总体评价
## 优点
## 不足
## 原因分析
## 训练建议`,
    createdAt: '2026-07-01T00:00:00Z',
    usageCount: 12,
    lastUsedAt: '2026-07-22T14:33:00Z',
    notes: '初版，来自 knowledge/prompts/report.md',
  },
  {
    id: 'coaching-v1',
    name: 'Realtime Coach',
    type: 'coaching',
    version: 'v1',
    content: `你是实时旋转教练助手。根据当前帧的 Feature 数值给出简短口头反馈（不超过 2 句话）。
只说当前最需要改善的一点。使用简洁、鼓励性语言。`,
    createdAt: '2026-07-05T00:00:00Z',
    usageCount: 38,
    lastUsedAt: '2026-07-23T09:15:00Z',
    notes: '来自 knowledge/prompts/coaching.md',
  },
  {
    id: 'explain-v1',
    name: 'Feature Explainer',
    type: 'explain',
    version: 'v1',
    content: `根据一个 Feature 的数值，用通俗语言向运动员解释其含义和重要性。不超过 3 句话。`,
    createdAt: '2026-07-10T00:00:00Z',
    usageCount: 7,
    lastUsedAt: '2026-07-20T11:00:00Z',
    notes: '来自 knowledge/prompts/explain.md',
  },
]
