/** Schema version for SpinSession / FeatureTimeline JSON. */
export const FIGURE_SKATING_SCHEMA_VERSION = '1.0.0' as const

export type PoseSourceAdapter = 'mediapipe' | 'synthetic' | 'unknown'

export interface PoseLandmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

export interface PoseFrame {
  t: number
  landmarks: PoseLandmark[]
  source: PoseSourceAdapter
  fps?: number
  quality?: {
    detected: boolean
    meanVisibility?: number
  }
}

export type FeatureStatus = 'active' | 'experimental' | 'deprecated'

export interface FeatureSample {
  featureId: string
  t: number
  value: number
  unit: string
}

export type AnalysisEventType =
  | 'tracking_acquired'
  | 'tracking_lost'
  | 'axis_stable'
  | 'axis_wobble'
  | 'drift_detected'
  | 'speed_drop'
  | 'spin_started'
  | 'spin_ended'

export interface AnalysisEvent {
  t: number
  type: AnalysisEventType
  featureId?: string
  value?: number
  message?: string
}

export interface FeatureTimeline {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  samples: FeatureSample[]
  events?: AnalysisEvent[]
}

export interface FeatureSummary {
  featureId: string
  mean?: number
  min?: number
  max?: number
  last?: number
  unit: string
}

export interface SpinSession {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  spinId: string
  athlete: string
  startedAt: string
  endedAt?: string
  source: PoseSourceAdapter
  features: Record<string, FeatureSummary>
  timeline: FeatureTimeline
  events: AnalysisEvent[]
}

export interface AnalyzerTickResult {
  frame: PoseFrame
  samples: FeatureSample[]
  events: AnalysisEvent[]
}
