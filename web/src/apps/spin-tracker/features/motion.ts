import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import { midpoint } from './math'
import { computeTorsoLength, medianTorsoLength } from './scale'
import type { RpmSample } from './types'

/** Horizontal ankle-midpoint drift range in frame units (legacy helper). */
export function computeDriftRange(frameHistory: PoseLandmark[][]): number {
  if (frameHistory.length < 2) return 0

  const xs = frameHistory.map(frame => {
    const la = frame[LANDMARKS.LEFT_ANKLE]
    const ra = frame[LANDMARKS.RIGHT_ANKLE]
    if (!la || !ra) return null
    return (la.x + ra.x) / 2
  }).filter((x): x is number => x !== null)

  if (xs.length < 2) return 0
  return Math.max(...xs) - Math.min(...xs)
}

/**
 * Center drift: ankle-mid X range / median torso length (body-normalized).
 * Feature ID: spin.center_drift
 */
export function computeCenterDrift(frameHistory: PoseLandmark[][]): number {
  const raw = computeDriftRange(frameHistory)
  const scale = medianTorsoLength(frameHistory)
  if (!scale || scale < 1e-4) return 0
  return raw / scale
}

/**
 * COM offset proxy: |hipMid.x - ankleMid.x| / torsoLength.
 * Feature ID: spin.com_offset_proxy
 */
export function computeComOffsetProxy(landmarks: PoseLandmark[]): number {
  const lhip = landmarks[LANDMARKS.LEFT_HIP]
  const rhip = landmarks[LANDMARKS.RIGHT_HIP]
  const la = landmarks[LANDMARKS.LEFT_ANKLE]
  const ra = landmarks[LANDMARKS.RIGHT_ANKLE]
  if (!lhip || !rhip || !la || !ra) return 0

  const torso = computeTorsoLength(landmarks)
  if (!torso) return 0

  const hip = midpoint(lhip, rhip)
  const ankle = midpoint(la, ra)
  return Math.abs(hip.x - ankle.x) / torso
}

/** RPM via shoulder X-diff zero crossings. Feature ID: spin.speed */
export function computeRPM(frameHistory: PoseLandmark[][], fps: number): number {
  if (frameHistory.length < fps) return 0

  const signal = frameHistory.map(frame => {
    const ls = frame[LANDMARKS.LEFT_SHOULDER]
    const rs = frame[LANDMARKS.RIGHT_SHOULDER]
    if (!ls || !rs) return null
    return ls.x - rs.x
  }).filter((v): v is number => v !== null)

  if (signal.length < 10) return 0

  const mean = signal.reduce((a, b) => a + b, 0) / signal.length
  const centered = signal.map(v => v - mean)

  const zeroCrossings: number[] = []
  for (let i = 1; i < centered.length; i++) {
    if (centered[i - 1] > 0 && centered[i] <= 0) {
      zeroCrossings.push(i)
    }
  }

  if (zeroCrossings.length < 2) return 0

  const halfPeriods: number[] = []
  for (let i = 1; i < zeroCrossings.length; i++) {
    halfPeriods.push(zeroCrossings[i] - zeroCrossings[i - 1])
  }

  const avgHalfPeriodFrames = halfPeriods.reduce((a, b) => a + b, 0) / halfPeriods.length
  const avgPeriodFrames = avgHalfPeriodFrames * 2
  const rpm = (fps / avgPeriodFrames) * 60

  if (rpm < 30 || rpm > 800) return 0
  return Math.round(rpm)
}

/**
 * Angular deceleration: max(0, -dRPM/dt) from timestamped RPM samples.
 * Returns null when unavailable.
 */
export function computeAngularDeceleration(samples: RpmSample[]): number | null {
  const usable = samples.filter(s => s.rpm > 0)
  if (usable.length < 4) return null

  const t0 = usable[0].t
  const xs = usable.map(s => (s.t - t0) / 1000)
  const ys = usable.map(s => s.rpm)
  const n = xs.length

  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den < 1e-6) return null

  const slope = num / den // rpm per second
  return Math.max(0, -slope)
}

/** Spinning if recent shoulder X-diff variance exceeds threshold. */
export function detectIsSpinning(frameHistory: PoseLandmark[][], fps: number): boolean {
  if (frameHistory.length < fps * 0.5) return false

  const signal = frameHistory.slice(-Math.floor(fps)).map(frame => {
    const ls = frame[LANDMARKS.LEFT_SHOULDER]
    const rs = frame[LANDMARKS.RIGHT_SHOULDER]
    if (!ls || !rs) return null
    return ls.x - rs.x
  }).filter((v): v is number => v !== null)

  if (signal.length < 8) return false

  const mean = signal.reduce((a, b) => a + b, 0) / signal.length
  const variance = signal.reduce((sum, v) => sum + (v - mean) ** 2, 0) / signal.length
  return variance > 0.002
}
