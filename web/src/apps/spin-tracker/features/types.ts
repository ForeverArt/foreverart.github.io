import type { PoseLandmark } from '@/platforms/figure-skating/core'

/** @deprecated Prefer PoseLandmark from figure-skating core */
export type Landmark = PoseLandmark

export interface SpinMetrics {
  tiltAngle: number
  baselineTilt: number
  tiltWobble: number
  driftRange: number
  rpm: number
  armSymmetry: number
  isSpinning: boolean
}

export const DEFAULT_METRICS: SpinMetrics = {
  tiltAngle: 0,
  baselineTilt: 0,
  tiltWobble: 0,
  driftRange: 0,
  rpm: 0,
  armSymmetry: 1,
  isSpinning: false,
}
