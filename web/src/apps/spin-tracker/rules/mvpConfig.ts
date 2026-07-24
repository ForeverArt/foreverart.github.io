import type { Grade } from '@/platforms/figure-skating/core'

export interface GradeBands {
  /** lower-is-better features use max thresholds; higher-is-better use min. */
  direction: 'lower_better' | 'higher_better'
  excellent: number
  good: number
  poor: number
}

export interface MvpRuleConfig {
  bands: Record<string, GradeBands>
  weights: Record<string, number>
  uprightInclinationWarnDeg: number
  speech: {
    maxWobbleDeg: number
    maxCenterDrift: number
    minRPM: number
  }
}

/** Typed rule config — mirrors knowledge/rules/spin/*.md (heuristic). */
export const MVP_RULE_CONFIG: MvpRuleConfig = {
  bands: {
    'spin.axis_stability': { direction: 'lower_better', excellent: 2, good: 5, poor: 8 },
    'spin.center_drift': { direction: 'lower_better', excellent: 0.08, good: 0.2, poor: 0.35 },
    'spin.com_offset_proxy': { direction: 'lower_better', excellent: 0.08, good: 0.18, poor: 0.3 },
    'spin.inclination': { direction: 'lower_better', excellent: 12, good: 20, poor: 35 },
    'spin.angular_deceleration': { direction: 'lower_better', excellent: 15, good: 40, poor: 80 },
    'spin.speed': { direction: 'higher_better', excellent: 120, good: 80, poor: 60 },
  },
  weights: {
    'spin.axis_stability': 0.25,
    'spin.center_drift': 0.2,
    'spin.com_offset_proxy': 0.15,
    'spin.inclination': 0.1,
    'spin.angular_deceleration': 0.1,
    'spin.speed': 0.2,
  },
  uprightInclinationWarnDeg: 35,
  speech: {
    maxWobbleDeg: 5,
    maxCenterDrift: 0.2,
    minRPM: 60,
  },
}

export function gradeFromBands(value: number | null, bands: GradeBands): Grade {
  if (value === null || Number.isNaN(value)) return 'unavailable'
  if (bands.direction === 'lower_better') {
    if (value < bands.excellent) return 'excellent'
    if (value < bands.good) return 'good'
    if (value < bands.poor) return 'warn'
    return 'poor'
  }
  if (value >= bands.excellent) return 'excellent'
  if (value >= bands.good) return 'good'
  if (value >= bands.poor) return 'warn'
  return 'poor'
}

export function scoreFromGrade(grade: Grade): number | null {
  switch (grade) {
    case 'excellent': return 95
    case 'good': return 80
    case 'warn': return 55
    case 'poor': return 30
    case 'unavailable': return null
  }
}
