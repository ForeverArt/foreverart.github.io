/**
 * Compatibility barrel — prefer @spin/features, @spin/rules, @spin/pipeline.
 */
export { LANDMARKS } from '@/platforms/figure-skating/core'
export type { PoseLandmark as Landmark } from '@/platforms/figure-skating/core'

export {
  computeSpineTilt,
  computeSpineTilt3D,
  computeTiltStats,
  computeDriftRange,
  computeCenterDrift,
  computeComOffsetProxy,
  computeAngularDeceleration,
  computeRPM,
  detectIsSpinning,
  computeArmSymmetry,
  computeMetrics,
  type SpinMetrics,
} from '@spin/features'

export {
  DEFAULT_THRESHOLDS,
  computeScores,
  getStatusLabel,
  generateFeedback,
  type SpinThresholds,
  type SpinScores,
} from '@spin/rules'
