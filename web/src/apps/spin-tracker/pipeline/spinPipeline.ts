import type { FeatureSample, PoseFrame, PoseLandmark } from '@/platforms/figure-skating/core'
import {
  computeMetrics,
  DEFAULT_METRICS,
  type SpinMetrics,
} from '@spin/features'
import {
  computeScores,
  DEFAULT_SCORES,
  DEFAULT_THRESHOLDS,
  generateFeedback,
  getStatusLabel,
  type SpinScores,
  type SpinThresholds,
  type StatusLabel,
} from '@spin/rules'
import { FrameBuffer, DEFAULT_HISTORY_SIZE } from './frameBuffer'

export interface PipelineFrame {
  metrics: SpinMetrics
  scores: SpinScores
  status: StatusLabel
  feedback: string[]
  samples: FeatureSample[]
  history: PoseLandmark[][]
}

export interface SpinPipelineOptions {
  historySize?: number
  thresholds?: SpinThresholds
}

export class SpinPipeline {
  private readonly buffer: FrameBuffer
  private thresholds: SpinThresholds

  constructor(options: SpinPipelineOptions = {}) {
    this.buffer = new FrameBuffer(options.historySize ?? DEFAULT_HISTORY_SIZE)
    this.thresholds = options.thresholds ?? DEFAULT_THRESHOLDS
  }

  setThresholds(thresholds: SpinThresholds): void {
    this.thresholds = thresholds
  }

  reset(): void {
    this.buffer.clear()
  }

  getHistory(): PoseLandmark[][] {
    return this.buffer.getHistory()
  }

  tick(landmarks: PoseLandmark[], fps: number, t = performance.now()): PipelineFrame {
    const history = this.buffer.push(landmarks)
    const effectiveFps = fps > 0 ? fps : 30
    const metrics = computeMetrics(landmarks, history, effectiveFps)
    const scores = computeScores(metrics, this.thresholds)
    const status = getStatusLabel(metrics, scores, this.thresholds)
    const feedback = generateFeedback(metrics, this.thresholds)
    const samples = toFeatureSamples(metrics, t)

    return { metrics, scores, status, feedback, samples, history }
  }

  /** Build a PoseFrame envelope for adapters / offline tooling. */
  toPoseFrame(landmarks: PoseLandmark[], fps: number, t = performance.now()): PoseFrame {
    const vis = landmarks
      .map(l => l.visibility)
      .filter((v): v is number => v !== undefined)
    const meanVisibility = vis.length
      ? vis.reduce((a, b) => a + b, 0) / vis.length
      : undefined

    return {
      t,
      landmarks,
      source: 'mediapipe',
      fps,
      quality: {
        detected: landmarks.length > 0,
        meanVisibility,
      },
    }
  }
}

export function createIdlePipelineFrame(): PipelineFrame {
  return {
    metrics: DEFAULT_METRICS,
    scores: DEFAULT_SCORES,
    status: { text: '等待检测', level: 'idle' },
    feedback: [],
    samples: [],
    history: [],
  }
}

function toFeatureSamples(metrics: SpinMetrics, t: number): FeatureSample[] {
  return [
    { featureId: 'spin.axis_stability', t, value: metrics.tiltWobble, unit: 'deg' },
    { featureId: 'spin.baseline_tilt', t, value: metrics.baselineTilt, unit: 'deg' },
    { featureId: 'spin.travel', t, value: metrics.driftRange, unit: 'normalized' },
    { featureId: 'spin.spin_speed', t, value: metrics.rpm, unit: 'rpm' },
    { featureId: 'spin.arm_symmetry', t, value: metrics.armSymmetry, unit: 'ratio' },
  ]
}
