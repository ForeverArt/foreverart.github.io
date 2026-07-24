import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import { clamp, midpoint } from './math'

/**
 * 2D spine tilt vs vertical (degrees). Visualization only — phase-dependent while spinning.
 */
export function computeSpineTilt(landmarks: PoseLandmark[]): number {
  const lsh = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rsh = landmarks[LANDMARKS.RIGHT_SHOULDER]
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]

  if (!lsh || !rsh || !lhip || !rhip) return 0

  const shoulder = midpoint(lsh, rsh)
  const hip = midpoint(lhip, rhip)

  const dx = shoulder.x - hip.x
  const dy = shoulder.y - hip.y

  return Math.atan2(dx, -dy) * (180 / Math.PI)
}

/**
 * 3D cone half-angle between torso vector and vertical (degrees).
 * Returns null when z/visibility is insufficient.
 */
export function computeSpineTilt3D(landmarks: PoseLandmark[]): number | null {
  const ids = [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP]
  const pts = ids.map(i => landmarks[i])

  for (const p of pts) {
    if (!p || p.z === undefined) return null
    if (p.visibility !== undefined && p.visibility < 0.5) return null
  }

  const [lsh, rsh, lhip, rhip] = pts as [PoseLandmark, PoseLandmark, PoseLandmark, PoseLandmark]

  const vx = (lsh.x + rsh.x) / 2 - (lhip.x + rhip.x) / 2
  const vy = (lsh.y + rsh.y) / 2 - (lhip.y + rhip.y) / 2
  const vz = (lsh.z! + rsh.z!) / 2 - (lhip.z! + rhip.z!) / 2

  const len = Math.sqrt(vx * vx + vy * vy + vz * vz)
  if (len < 1e-6) return null

  const cosAngle = clamp(-vy / len, -1, 1)
  return Math.acos(cosAngle) * (180 / Math.PI)
}

/**
 * Intrinsic lean (mean) and wobble (std) from cone half-angle history.
 */
export function computeTiltStats(tiltHistory: (number | null)[]): {
  baselineTilt: number
  tiltWobble: number
} {
  const valid = tiltHistory.filter((v): v is number => v !== null)
  if (valid.length < 5) return { baselineTilt: 0, tiltWobble: 0 }

  const sorted = [...valid].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const deviations = valid.map(v => Math.abs(v - median)).sort((a, b) => a - b)
  const mad = deviations[Math.floor(deviations.length / 2)]
  const cutoff = Math.max(mad * 5, 1.5)
  const clean = valid.filter(v => Math.abs(v - median) <= cutoff)

  if (clean.length < 3) return { baselineTilt: median, tiltWobble: 0 }

  const mean = clean.reduce((a, b) => a + b, 0) / clean.length
  const variance = clean.reduce((sum, v) => sum + (v - mean) ** 2, 0) / clean.length

  return { baselineTilt: mean, tiltWobble: Math.sqrt(variance) }
}
