import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import { midpoint } from './math'

/** Shoulder-mid to hip-mid length in normalized image coords. */
export function computeTorsoLength(landmarks: PoseLandmark[]): number | null {
  const lsh = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rsh = landmarks[LANDMARKS.RIGHT_SHOULDER]
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]
  if (!lsh || !rsh || !lhip || !rhip) return null

  const shoulder = midpoint(lsh, rsh)
  const hip = midpoint(lhip, rhip)
  const dx = shoulder.x - hip.x
  const dy = shoulder.y - hip.y
  const len = Math.sqrt(dx * dx + dy * dy)
  return len < 1e-4 ? null : len
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function medianTorsoLength(frameHistory: PoseLandmark[][]): number | null {
  const lengths = frameHistory
    .map(computeTorsoLength)
    .filter((v): v is number => v !== null)
  return median(lengths)
}
