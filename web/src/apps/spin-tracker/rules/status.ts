import type { SpinMetrics } from '@spin/features'
import type { SpinScores } from './scoring'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from './thresholds'

export type StatusLevel = 'good' | 'warn' | 'bad' | 'idle'

export interface StatusLabel {
  text: string
  level: StatusLevel
}

export function getStatusLabel(
  metrics: SpinMetrics,
  scores: SpinScores,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
): StatusLabel {
  if (!metrics.isSpinning) return { text: '等待旋转', level: 'idle' }
  if (scores.overall >= thresholds.goodOverallScore) return { text: '轴心稳定', level: 'good' }
  if (scores.overall >= thresholds.warnOverallScore) return { text: '轻微晃动', level: 'warn' }
  return { text: '轴心晃动', level: 'bad' }
}

/** Unified quality flag for skeleton / HUD coloring. */
export function isQualityGood(level: StatusLevel): boolean {
  return level === 'good' || level === 'idle'
}
