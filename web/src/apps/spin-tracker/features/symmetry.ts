import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import { clamp, midpoint } from './math'

/** Arm symmetry 0–1 (1 = perfect mirror about hip mid). */
export function computeArmSymmetry(landmarks: PoseLandmark[]): number {
  const lw = landmarks[LANDMARKS.LEFT_WRIST]
  const rw = landmarks[LANDMARKS.RIGHT_WRIST]
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]
  const lsh = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rsh = landmarks[LANDMARKS.RIGHT_SHOULDER]

  if (!lw || !rw || !lhip || !rhip || !lsh || !rsh) return 1

  const hip = midpoint(lhip, rhip)
  const shoulderWidth = Math.abs(lsh.x - rsh.x)
  if (shoulderWidth < 0.01) return 1

  const leftRelX = hip.x - lw.x
  const leftRelY = lw.y - hip.y

  const rightRelX = rw.x - hip.x
  const rightRelY = rw.y - hip.y

  const diffX = leftRelX - rightRelX
  const diffY = leftRelY - rightRelY
  const diff = Math.sqrt(diffX * diffX + diffY * diffY)

  return 1 - clamp(diff / shoulderWidth, 0, 1)
}
