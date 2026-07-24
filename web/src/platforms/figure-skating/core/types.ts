/** Schema version for SpinAnalysis / Report JSON. */
export const FIGURE_SKATING_SCHEMA_VERSION = '2.0.0' as const

export type PoseSourceAdapter = 'mediapipe' | 'synthetic' | 'unknown'

export type SkillType = 'upright_spin'

export type FeatureStatus = 'active' | 'experimental' | 'deprecated'

export type Grade = 'excellent' | 'good' | 'warn' | 'poor' | 'unavailable'

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

export interface PoseTimeline {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  frames: PoseFrame[]
}

export interface FeatureSample {
  featureId: string
  t: number
  value: number | null
  unit: string
  available: boolean
  quality?: 'ok' | 'low' | 'unavailable'
}

export type AnalysisEventType =
  | 'tracking_acquired'
  | 'tracking_lost'
  | 'wobble'
  | 'travel'
  | 'speed_drop'
  | 'axis_recovery'
  | 'axis_stable'
  | 'spin_started'
  | 'spin_ended'
  | 'upright_scope_warning'

export interface AnalysisEvent {
  t: number
  type: AnalysisEventType
  featureId?: string
  ruleId?: string
  value?: number
  message?: string
}

export interface FeatureTimeline {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  samples: FeatureSample[]
}

export interface FeatureSummary {
  featureId: string
  unit: string
  mean?: number | null
  min?: number | null
  max?: number | null
  last?: number | null
  availableRatio: number
}

export interface RuleFeatureResult {
  featureId: string
  value: number | null
  unit: string
  score: number | null
  grade: Grade
  matchedRule: string
  knowledgePath: string
  rulePath: string
}

export interface RuleResult {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  overallScore: number
  overallGrade: Grade
  features: Record<string, RuleFeatureResult>
  weights: Record<string, number>
}

export interface DeterministicReport {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  skill: SkillType
  summary: {
    overallScore: number
    overallGrade: Grade
    durationSec: number
    processedFrames: number
    warnings: string[]
  }
  features: Record<string, FeatureSummary>
  rules: RuleResult
  events: AnalysisEvent[]
  traceability: {
    knowledgeRefs: string[]
    ruleRefs: string[]
    featureIds: string[]
  }
}

export interface LlmReportResult {
  markdown: string
  model: string
  generatedAt: string
  knowledgeRefs: string[]
}

export interface SpinAnalysisMeta {
  spinId: string
  athlete: string
  skill: SkillType
  source: PoseSourceAdapter
  startedAt: string
  endedAt?: string
  videoFileName?: string
  durationSec?: number
  processedFrames?: number
  effectiveFps?: number
}

/** Unified analysis aggregate — local export may include pose timeline. */
export interface SpinAnalysis {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  meta: SpinAnalysisMeta
  pose?: PoseTimeline
  features: Record<string, FeatureSummary>
  timeline: FeatureTimeline
  rules: RuleResult
  events: AnalysisEvent[]
  report: DeterministicReport
  llm?: LlmReportResult
}

/** Payload sent to Go backend — no pose/video. */
export interface SpinReportRequest {
  schemaVersion: typeof FIGURE_SKATING_SCHEMA_VERSION
  report: DeterministicReport
  meta: Pick<SpinAnalysisMeta, 'spinId' | 'athlete' | 'skill' | 'source' | 'videoFileName'>
  options?: {
    locale?: string
    profile?: 'report'
  }
}

export interface AnalyzerTickResult {
  frame: PoseFrame
  samples: FeatureSample[]
  events: AnalysisEvent[]
  rulesSnapshot?: RuleResult
}
