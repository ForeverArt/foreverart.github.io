import {
  FIGURE_SKATING_SCHEMA_VERSION,
  type AnalysisEvent,
  type FeatureSample,
  type PoseFrame,
  type SpinAnalysis,
  type SpinReportRequest,
} from '@/platforms/figure-skating/core'
import { SpinPipeline } from '@spin/pipeline'
import { buildDeterministicReport, evaluateMvpRules, summarizeFeatureSamples } from '@spin/rules'

export interface OfflineProgress {
  phase: 'loading' | 'processing' | 'building' | 'done' | 'error' | 'cancelled'
  currentFrame: number
  totalFrames: number
  percent: number
  message?: string
}

export class OfflineAnalysisSession {
  private readonly pipeline = new SpinPipeline({ source: 'mediapipe' })
  private readonly poseFrames: PoseFrame[] = []
  private readonly samples: FeatureSample[] = []
  private readonly events: AnalysisEvent[] = []
  private processed = 0

  reset(): void {
    this.pipeline.reset()
    this.poseFrames.length = 0
    this.samples.length = 0
    this.events.length = 0
    this.processed = 0
  }

  ingest(frame: PoseFrame): void {
    const tick = this.pipeline.tick(frame)
    this.poseFrames.push(frame)
    this.samples.push(...tick.samples)
    this.events.push(...tick.events)
    this.processed += 1
  }

  build(meta: {
    spinId?: string
    athlete?: string
    videoFileName?: string
    durationSec: number
    effectiveFps: number
    includePose?: boolean
  }): SpinAnalysis {
    const features = summarizeFeatureSamples(this.samples)
    const rules = evaluateMvpRules(features)
    const report = buildDeterministicReport({
      skill: 'upright_spin',
      features,
      rules,
      events: this.events,
      durationSec: meta.durationSec,
      processedFrames: this.processed,
    })

    return {
      schemaVersion: FIGURE_SKATING_SCHEMA_VERSION,
      meta: {
        spinId: meta.spinId ?? `spin-${Date.now()}`,
        athlete: meta.athlete ?? 'anonymous',
        skill: 'upright_spin',
        source: 'mediapipe',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        videoFileName: meta.videoFileName,
        durationSec: meta.durationSec,
        processedFrames: this.processed,
        effectiveFps: meta.effectiveFps,
      },
      pose: meta.includePose === false
        ? undefined
        : {
            schemaVersion: FIGURE_SKATING_SCHEMA_VERSION,
            frames: this.poseFrames,
          },
      features,
      timeline: {
        schemaVersion: FIGURE_SKATING_SCHEMA_VERSION,
        samples: this.samples,
      },
      rules,
      events: this.events,
      report,
    }
  }
}

export function toReportRequest(analysis: SpinAnalysis): SpinReportRequest {
  return {
    schemaVersion: analysis.schemaVersion,
    report: analysis.report,
    meta: {
      spinId: analysis.meta.spinId,
      athlete: analysis.meta.athlete,
      skill: analysis.meta.skill,
      source: analysis.meta.source,
      videoFileName: analysis.meta.videoFileName,
    },
    options: { locale: 'zh-CN', profile: 'report' },
  }
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
