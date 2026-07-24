import { describe, expect, it } from 'vitest'
import { LANDMARKS, type PoseFrame, type PoseLandmark } from '@/platforms/figure-skating/core'
import { OfflineAnalysisSession, toReportRequest } from './sessionBuilder'

function frameAt(t: number, ankleX = 0.5): PoseFrame {
  const landmarks: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5, y: 0.5, z: 0, visibility: 1,
  }))
  landmarks[LANDMARKS.LEFT_SHOULDER] = { x: 0.4, y: 0.3, z: 0, visibility: 1 }
  landmarks[LANDMARKS.RIGHT_SHOULDER] = { x: 0.6, y: 0.3, z: 0, visibility: 1 }
  landmarks[LANDMARKS.LEFT_HIP] = { x: 0.45, y: 0.55, z: 0, visibility: 1 }
  landmarks[LANDMARKS.RIGHT_HIP] = { x: 0.55, y: 0.55, z: 0, visibility: 1 }
  landmarks[LANDMARKS.LEFT_ANKLE] = { x: ankleX - 0.02, y: 0.9, z: 0, visibility: 1 }
  landmarks[LANDMARKS.RIGHT_ANKLE] = { x: ankleX + 0.02, y: 0.9, z: 0, visibility: 1 }
  return { t, landmarks, source: 'synthetic', fps: 30, quality: { detected: true } }
}

describe('OfflineAnalysisSession', () => {
  it('builds SpinAnalysis + report request without pose by default', () => {
    const session = new OfflineAnalysisSession()
    for (let i = 0; i < 40; i++) {
      session.ingest(frameAt(i * (1000 / 30), 0.5 + (i % 5) * 0.01))
    }
    const analysis = session.build({
      durationSec: 2,
      effectiveFps: 30,
      includePose: false,
      videoFileName: 'demo.mp4',
    })
    expect(analysis.schemaVersion).toBe('2.0.0')
    expect(analysis.report.traceability.featureIds).toHaveLength(6)
    expect(analysis.pose).toBeUndefined()
    const req = toReportRequest(analysis)
    expect(req.report.summary.processedFrames).toBe(40)
    expect((req as { pose?: unknown }).pose).toBeUndefined()
  })
})
