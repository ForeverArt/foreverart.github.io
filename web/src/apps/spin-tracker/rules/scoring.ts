import type { SpinMetrics } from '@spin/features'
import { clamp } from '@spin/features'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from './thresholds'

export interface SpinScores {
  stability: number
  symmetry: number
  drift: number
  tilt: number
  overall: number
}

export const DEFAULT_SCORES: SpinScores = {
  stability: 100,
  symmetry: 100,
  drift: 100,
  tilt: 100,
  overall: 100,
}

export function computeScores(
  metrics: SpinMetrics,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
): SpinScores {
  const wobbleScore = clamp(
    100 - (metrics.tiltWobble / thresholds.maxWobbleDeg) * 100,
    0, 100
  )

  const driftScore = clamp(
    100 - (metrics.driftRange / thresholds.maxDrift) * 100,
    0, 100
  )

  const symmetryScore = metrics.armSymmetry * 100
  const stabilityScore = wobbleScore * 0.4 + driftScore * 0.6
  const overall = stabilityScore * 0.35 + symmetryScore * 0.25 + driftScore * 0.25 + wobbleScore * 0.15

  return {
    stability: Math.round(stabilityScore),
    symmetry: Math.round(symmetryScore),
    drift: Math.round(driftScore),
    tilt: Math.round(wobbleScore),
    overall: Math.round(overall),
  }
}
