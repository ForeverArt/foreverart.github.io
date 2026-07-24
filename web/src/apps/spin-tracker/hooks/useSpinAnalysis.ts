import { useEffect, useRef, useState, useCallback } from 'react'
import type { AnalysisEvent, PoseLandmark } from '@/platforms/figure-skating/core'
import {
  createIdlePipelineFrame,
  SpinPipeline,
  type PipelineFrame,
} from '@spin/pipeline'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from '@spin/rules'
import type { SpeechEvent } from '@spin/lib/speechService'

export type SpinAnalysisState = Pick<
  PipelineFrame,
  'metrics' | 'scores' | 'status' | 'feedback' | 'samples' | 'events' | 'speechEvents'
>

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
      samples: idle.samples,
      events: idle.events as AnalysisEvent[],
      speechEvents: idle.speechEvents as SpeechEvent[],
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
      samples: frame.samples,
      events: frame.events,
      speechEvents: frame.speechEvents,
    })
  }, [landmarks, fps, thresholds])

  const getHistory = useCallback(() => pipelineRef.current.getHistory(), [])

  return { ...state, getHistory }
}
