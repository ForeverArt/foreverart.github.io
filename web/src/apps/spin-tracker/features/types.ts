import type { PoseLandmark } from '@/platforms/figure-skating/core'

/** @deprecated Prefer PoseLandmark from figure-skating core */
export type Landmark = PoseLandmark

/** Flat metrics for realtime UI compatibility + MVP six features. */
export interface SpinMetrics {
  tiltAngle: number
  /** Alias of inclination (mean cone half-angle). */
  baselineTilt: number
  inclination: number
  /** Axis stability / wobble. */
  tiltWobble: number
  axisStability: number
  /** Body-normalized center drift. */
  driftRange: number
  centerDrift: number
  comOffsetProxy: number
  rpm: number
  speed: number
  angularDeceleration: number | null
  decelerationAvailable: boolean
  armSymmetry: number
  isSpinning: boolean
}

export const DEFAULT_METRICS: SpinMetrics = {
  tiltAngle: 0,
  baselineTilt: 0,
  inclination: 0,
  tiltWobble: 0,
  axisStability: 0,
  driftRange: 0,
  centerDrift: 0,
  comOffsetProxy: 0,
  rpm: 0,
  speed: 0,
  angularDeceleration: null,
  decelerationAvailable: false,
  armSymmetry: 1,
  isSpinning: false,
}

export interface RpmSample {
  t: number
  rpm: number
}
