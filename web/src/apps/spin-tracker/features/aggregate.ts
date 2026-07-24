import type { PoseLandmark } from '@/platforms/figure-skating/core'
import type { RpmSample, SpinMetrics } from './types'
import { computeSpineTilt, computeSpineTilt3D, computeTiltStats } from './spine'
import {
  computeAngularDeceleration,
  computeCenterDrift,
  computeComOffsetProxy,
  computeRPM,
  detectIsSpinning,
} from './motion'
import { computeArmSymmetry } from './symmetry'

export function computeMetrics(
  currentLandmarks: PoseLandmark[],
  frameHistory: PoseLandmark[][],
  fps: number,
  rpmHistory: RpmSample[] = []
): SpinMetrics {
  const windowSize = Math.min(frameHistory.length, Math.max(Math.floor(fps * 2), 30))
  const tiltHistory = frameHistory.slice(-windowSize).map(computeSpineTilt3D)
  const { baselineTilt, tiltWobble } = computeTiltStats(tiltHistory)
  const rpm = computeRPM(frameHistory, fps)
  const deceleration = computeAngularDeceleration(rpmHistory)
  const centerDrift = computeCenterDrift(frameHistory)
  const comOffsetProxy = computeComOffsetProxy(currentLandmarks)

  return {
    tiltAngle: computeSpineTilt(currentLandmarks),
    baselineTilt,
    inclination: baselineTilt,
    tiltWobble,
    axisStability: tiltWobble,
    driftRange: centerDrift,
    centerDrift,
    comOffsetProxy,
    rpm,
    speed: rpm,
    angularDeceleration: deceleration,
    decelerationAvailable: deceleration !== null,
    armSymmetry: computeArmSymmetry(currentLandmarks),
    isSpinning: detectIsSpinning(frameHistory, fps),
  }
}
