import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'

/** Horizontal ankle-midpoint drift range (normalized 0–1). */
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

/** RPM via shoulder X-diff zero crossings. */
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
