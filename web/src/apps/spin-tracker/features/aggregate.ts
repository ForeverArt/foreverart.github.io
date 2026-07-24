import type { PoseLandmark } from '@/platforms/figure-skating/core'
import type { SpinMetrics } from './types'
import { computeSpineTilt, computeSpineTilt3D, computeTiltStats } from './spine'
import { computeDriftRange, computeRPM, detectIsSpinning } from './motion'
import { computeArmSymmetry } from './symmetry'

export function computeMetrics(
  currentLandmarks: PoseLandmark[],
  frameHistory: PoseLandmark[][],
  fps: number
): SpinMetrics {
  const windowSize = Math.min(frameHistory.length, Math.max(Math.floor(fps * 2), 30))
  const tiltHistory = frameHistory.slice(-windowSize).map(computeSpineTilt3D)
  const { baselineTilt, tiltWobble } = computeTiltStats(tiltHistory)

  return {
    tiltAngle: computeSpineTilt(currentLandmarks),
    baselineTilt,
    tiltWobble,
    driftRange: computeDriftRange(frameHistory),
    rpm: computeRPM(frameHistory, fps),
    armSymmetry: computeArmSymmetry(currentLandmarks),
    isSpinning: detectIsSpinning(frameHistory, fps),
  }
}
