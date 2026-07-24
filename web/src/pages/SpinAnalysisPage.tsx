import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileVideo, Download, Sparkles } from 'lucide-react'
import type { SpinAnalysis } from '@/platforms/figure-skating/core'
import { IS_FS_DOMAIN } from '@/lib/domain'
import {
  downloadJson,
  downloadText,
  getBackendBaseUrl,
  processOfflineVideo,
  requestSpinReport,
  setBackendBaseUrl,
  toReportRequest,
  type OfflineProgress,
} from '@spin/offline'

export default function SpinAnalysisPage() {
  const navigate = useNavigate()
  const backTo = IS_FS_DOMAIN ? '/' : '/platforms/figure-skating'
  const abortRef = useRef<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<OfflineProgress | null>(null)
  const [analysis, setAnalysis] = useState<SpinAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backendUrl, setBackendUrl] = useState(getBackendBaseUrl())
  const [llmBusy, setLlmBusy] = useState(false)

  const onAnalyze = useCallback(async () => {
    if (!file) return
    setError(null)
    setAnalysis(null)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const result = await processOfflineVideo({
        file,
        targetFps: 12,
        includePose: false,
        signal: ac.signal,
        onProgress: setProgress,
      })
      setAnalysis(result)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : '分析失败')
      setProgress({ phase: 'error', currentFrame: 0, totalFrames: 0, percent: 0, message: '失败' })
    }
  }, [file])

  const onExport = () => {
    if (!analysis) return
    downloadJson(`${analysis.meta.spinId}.analysis.json`, analysis)
  }

  const onLlm = async () => {
    if (!analysis) return
    setLlmBusy(true)
    setError(null)
    setBackendBaseUrl(backendUrl)
    try {
      const llm = await requestSpinReport(toReportRequest(analysis), backendUrl)
      const next = { ...analysis, llm }
      setAnalysis(next)
      downloadText(`${analysis.meta.spinId}.analysis.md`, llm.markdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LLM 报告失败')
    } finally {
      setLlmBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={15} />
          返回平台
        </button>

        <h1 className="text-2xl font-bold mb-1">Upright Spin 离线分析</h1>
        <p className="text-sm text-muted-foreground mb-6">
          本地导入 mp4 → Pose → Feature → Rule → Event → Report。视频不上传。LLM 仅解释 Report JSON。
        </p>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted-foreground">技能类型</span>
            <input
              className="rounded border border-border bg-background px-3 py-2"
              value="Upright Spin（用户选择）"
              disabled
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-muted-foreground">视频文件（本地）</span>
            <input
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!file || progress?.phase === 'processing' || progress?.phase === 'loading'}
              onClick={() => void onAnalyze()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
            >
              <FileVideo size={16} />
              开始分析
            </button>
            <button
              type="button"
              disabled={!progress || progress.phase === 'done'}
              onClick={() => abortRef.current?.abort()}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              取消
            </button>
          </div>

          {progress && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>{progress.message ?? progress.phase}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {analysis && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold">Deterministic Report</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>综合分：{analysis.report.summary.overallScore}</div>
              <div>等级：{analysis.report.summary.overallGrade}</div>
              <div>帧数：{analysis.report.summary.processedFrames}</div>
              <div>时长：{analysis.report.summary.durationSec.toFixed(1)}s</div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {Object.values(analysis.report.features).map(f => (
                <li key={f.featureId}>
                  {f.featureId}: last={f.last?.toFixed?.(2) ?? f.last ?? 'n/a'} {f.unit}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              事件 {analysis.events.length} 个；proxy 指标非真实厘米/COM。
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExport}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Download size={15} />
                下载 Analysis JSON
              </button>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-muted-foreground">Go 报告服务 URL</span>
              <input
                className="rounded border border-border bg-background px-3 py-2"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
              />
            </label>

            <button
              type="button"
              disabled={llmBusy}
              onClick={() => void onLlm()}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
            >
              <Sparkles size={16} />
              {llmBusy ? '生成中…' : '生成 AI 报告 (analysis.md)'}
            </button>

            {analysis.llm && (
              <pre className="text-xs whitespace-pre-wrap rounded bg-muted/40 p-3 max-h-80 overflow-auto">
                {analysis.llm.markdown}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
