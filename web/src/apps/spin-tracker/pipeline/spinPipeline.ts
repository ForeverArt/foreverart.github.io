import type {
  AnalysisEvent,
  FeatureSample,
  PoseFrame,
  PoseLandmark,
} from '@/platforms/figure-skating/core'
import { toPoseFrame } from '@spin/lib/mediapipeAdapter'
import {
  computeMetrics,
  DEFAULT_METRICS,
  type RpmSample,
  type SpinMetrics,
} from '@spin/features'
import {
  analysisEventsToSpeechKeys,
  computeScores,
  DEFAULT_SCORES,
  DEFAULT_THRESHOLDS,
  evaluateAnalysisEvents,
  generateFeedback,
  getStatusLabel,
  INITIAL_EVENT_STATE,
  type EventEngineState,
  type SpinScores,
  type SpinThresholds,
  type StatusLabel,
} from '@spin/rules'
import type { SpeechEvent } from '@spin/lib/speechService'
import { FrameBuffer, DEFAULT_HISTORY_SIZE } from './frameBuffer'

export interface PipelineFrame {
  frame: PoseFrame
  metrics: SpinMetrics
  scores: SpinScores
  status: StatusLabel
  feedback: string[]
  samples: FeatureSample[]
  events: AnalysisEvent[]
  speechEvents: SpeechEvent[]
  history: PoseLandmark[][]
}

export interface SpinPipelineOptions {
  historySize?: number
  thresholds?: SpinThresholds
  source?: PoseFrame['source']
}

export class SpinPipeline {
  private readonly buffer: FrameBuffer
  private thresholds: SpinThresholds
  private readonly rpmHistory: RpmSample[] = []
  private eventState: EventEngineState = { ...INITIAL_EVENT_STATE }
  private source: PoseFrame['source']

  constructor(options: SpinPipelineOptions = {}) {
    this.buffer = new FrameBuffer(options.historySize ?? DEFAULT_HISTORY_SIZE)
    this.thresholds = options.thresholds ?? DEFAULT_THRESHOLDS
    this.source = options.source ?? 'mediapipe'
  }

  setThresholds(thresholds: SpinThresholds): void {
    this.thresholds = thresholds
  }

  reset(): void {
    this.buffer.clear()
    this.rpmHistory.length = 0
    this.eventState = { ...INITIAL_EVENT_STATE }
  }

  getHistory(): PoseLandmark[][] {
    return this.buffer.getHistory()
  }

  tick(poseFrame: PoseFrame): PipelineFrame
  tick(landmarks: PoseLandmark[], fps: number, t?: number): PipelineFrame
  tick(
    landmarksOrFrame: PoseLandmark[] | PoseFrame,
    fps?: number,
    t = performance.now()
  ): PipelineFrame {
    const frame: PoseFrame = Array.isArray(landmarksOrFrame)
      ? toPoseFrame(landmarksOrFrame, {
          t,
          fps: fps ?? 30,
          source: this.source,
        })
      : landmarksOrFrame

    const history = this.buffer.push(frame.landmarks)
    const effectiveFps = frame.fps && frame.fps > 0 ? frame.fps : (fps && fps > 0 ? fps : 30)
    const metrics = computeMetrics(frame.landmarks, history, effectiveFps, this.rpmHistory)

    if (metrics.speed > 0) {
      this.rpmHistory.push({ t: frame.t, rpm: metrics.speed })
      if (this.rpmHistory.length > 90) this.rpmHistory.splice(0, this.rpmHistory.length - 90)
      // recompute with updated rpm history for deceleration
      const withDecel = computeMetrics(frame.landmarks, history, effectiveFps, this.rpmHistory)
      Object.assign(metrics, withDecel)
    }

    const scores = computeScores(metrics, this.thresholds)
    const status = getStatusLabel(metrics, scores, this.thresholds)
    const feedback = generateFeedback(metrics, this.thresholds)
    const samples = toMvpFeatureSamples(metrics, frame.t)
    const hasLandmarks = frame.landmarks.length > 0 && (frame.quality?.detected ?? true)
    const { events, next } = evaluateAnalysisEvents(this.eventState, {
      t: frame.t,
      hasLandmarks,
      metrics,
    })
    this.eventState = next

    return {
      frame,
      metrics,
      scores,
      status,
      feedback,
      samples,
      events,
      speechEvents: analysisEventsToSpeechKeys(events),
      history,
    }
  }
}

export function createIdlePipelineFrame(): PipelineFrame {
  return {
    frame: { t: 0, landmarks: [], source: 'unknown', quality: { detected: false } },
    metrics: DEFAULT_METRICS,
    scores: DEFAULT_SCORES,
    status: { text: '等待检测', level: 'idle' },
    feedback: [],
    samples: [],
    events: [],
    speechEvents: [],
    history: [],
  }
}

export function toMvpFeatureSamples(metrics: SpinMetrics, t: number): FeatureSample[] {
  return [
    {
      featureId: 'spin.speed',
      t,
      value: metrics.speed,
      unit: 'rpm',
      available: metrics.speed > 0,
      quality: metrics.speed > 0 ? 'ok' : 'unavailable',
    },
    {
      featureId: 'spin.axis_stability',
      t,
      value: metrics.axisStability,
      unit: 'deg',
      available: true,
      quality: 'ok',
    },
    {
      featureId: 'spin.center_drift',
      t,
      value: metrics.centerDrift,
      unit: 'body-normalized',
      available: true,
      quality: 'ok',
    },
    {
      featureId: 'spin.com_offset_proxy',
      t,
      value: metrics.comOffsetProxy,
      unit: 'body-normalized',
      available: true,
      quality: 'ok',
    },
    {
      featureId: 'spin.inclination',
      t,
      value: metrics.inclination,
      unit: 'deg',
      available: true,
      quality: 'ok',
    },
    {
      featureId: 'spin.angular_deceleration',
      t,
      value: metrics.angularDeceleration,
      unit: 'rpm/s',
      available: metrics.decelerationAvailable,
      quality: metrics.decelerationAvailable ? 'ok' : 'unavailable',
    },
  ]
}
