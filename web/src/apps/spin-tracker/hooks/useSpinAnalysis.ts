import { useEffect, useRef, useState, useCallback } from 'react'
import type { PoseLandmark } from '@/platforms/figure-skating/core'
import {
  createIdlePipelineFrame,
  SpinPipeline,
  type PipelineFrame,
} from '@spin/pipeline'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from '@spin/rules'

export type SpinAnalysisState = Omit<PipelineFrame, 'samples' | 'history'>

export function useSpinAnalysis(
  landmarks: PoseLandmark[] | null,
  fps: number,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
) {
  const pipelineRef = useRef(new SpinPipeline({ thresholds }))
  const [state, setState] = useState<SpinAnalysisState>(() => {
    const idle = createIdlePipelineFrame()
    return {
      metrics: idle.metrics,
      scores: idle.scores,
      status: idle.status,
      feedback: idle.feedback,
    }
  })

  useEffect(() => {
    pipelineRef.current.setThresholds(thresholds)
  }, [thresholds])

  useEffect(() => {
    if (!landmarks || landmarks.length === 0) return

    const frame = pipelineRef.current.tick(landmarks, fps)
    setState({
      metrics: frame.metrics,
      scores: frame.scores,
      status: frame.status,
      feedback: frame.feedback,
    })
  }, [landmarks, fps, thresholds])

  const getHistory = useCallback(() => pipelineRef.current.getHistory(), [])

  return { ...state, getHistory }
}
