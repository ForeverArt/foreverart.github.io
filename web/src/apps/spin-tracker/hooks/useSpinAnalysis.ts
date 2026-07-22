import { useEffect, useRef, useState } from 'react'
import type { Landmark } from '@spin/lib/spinAlgorithm'
import {
  computeMetrics,
  computeScores,
  generateFeedback,
  getStatusLabel,
  DEFAULT_THRESHOLDS,
  type SpinMetrics,
  type SpinScores,
  type SpinThresholds,
} from '@spin/lib/spinAlgorithm'

const HISTORY_SIZE = 90  // 保留3秒帧历史（30fps × 3s）

export interface SpinAnalysisState {
  metrics: SpinMetrics
  scores: SpinScores
  status: { text: string; level: 'good' | 'warn' | 'bad' | 'idle' }
  feedback: string[]
}

const DEFAULT_METRICS: SpinMetrics = {
  tiltAngle: 0,
  driftRange: 0,
  rpm: 0,
  armSymmetry: 1,
  isSpinning: false,
}

const DEFAULT_SCORES: SpinScores = {
  stability: 100,
  symmetry: 100,
  drift: 100,
  tilt: 100,
  overall: 100,
}

export function useSpinAnalysis(
  landmarks: Landmark[] | null,
  fps: number,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
) {
  const historyRef = useRef<Landmark[][]>([])
  const [state, setState] = useState<SpinAnalysisState>({
    metrics: DEFAULT_METRICS,
    scores: DEFAULT_SCORES,
    status: { text: '等待检测', level: 'idle' },
    feedback: [],
  })

  useEffect(() => {
    if (!landmarks || landmarks.length === 0) return

    // 更新帧历史
    historyRef.current = [
      ...historyRef.current.slice(-(HISTORY_SIZE - 1)),
      landmarks,
    ]

    const effectiveFps = fps > 0 ? fps : 30
    const metrics = computeMetrics(landmarks, historyRef.current, effectiveFps)
    const scores = computeScores(metrics, thresholds)
    const status = getStatusLabel(metrics, scores)
    const feedback = generateFeedback(metrics)

    setState({ metrics, scores, status, feedback })
  }, [landmarks, fps, thresholds])

  // 获取帧历史（供 Canvas 渲染用）
  const getHistory = () => historyRef.current

  return { ...state, getHistory }
}
