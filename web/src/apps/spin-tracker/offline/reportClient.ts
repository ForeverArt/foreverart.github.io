import type { LlmReportResult, SpinReportRequest } from '@/platforms/figure-skating/core'

const STORAGE_KEY = 'spin-analysis-backend-url'

export function getBackendBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY)
    || import.meta.env.VITE_BACKEND_BASE_URL
    || 'http://localhost:8080'
}

export function setBackendBaseUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ''))
}

export async function requestSpinReport(
  body: SpinReportRequest,
  baseUrl = getBackendBaseUrl()
): Promise<LlmReportResult> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/spin-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`报告服务错误 ${res.status}: ${text}`)
  }
  const data = await res.json() as {
    markdown: string
    model: string
    generatedAt: string
    knowledgeRefs?: string[]
  }
  return {
    markdown: data.markdown,
    model: data.model,
    generatedAt: data.generatedAt,
    knowledgeRefs: data.knowledgeRefs ?? [],
  }
}
