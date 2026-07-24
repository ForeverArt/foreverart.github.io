import { describe, expect, it } from 'vitest'
import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import {
  computeAngularDeceleration,
  computeArmSymmetry,
  computeCenterDrift,
  computeComOffsetProxy,
  computeDriftRange,
  computeRPM,
  computeTiltStats,
  detectIsSpinning,
} from '@spin/features'

function blankFrame(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }))
}

function set(frame: PoseLandmark[], id: number, partial: Partial<PoseLandmark>) {
  frame[id] = { ...frame[id], ...partial }
}

function withTorso(frame: PoseLandmark[]) {
  set(frame, LANDMARKS.LEFT_SHOULDER, { x: 0.4, y: 0.3, z: 0, visibility: 1 })
  set(frame, LANDMARKS.RIGHT_SHOULDER, { x: 0.6, y: 0.3, z: 0, visibility: 1 })
  set(frame, LANDMARKS.LEFT_HIP, { x: 0.45, y: 0.55, z: 0, visibility: 1 })
  set(frame, LANDMARKS.RIGHT_HIP, { x: 0.55, y: 0.55, z: 0, visibility: 1 })
  set(frame, LANDMARKS.LEFT_ANKLE, { x: 0.48, y: 0.9, z: 0, visibility: 1 })
  set(frame, LANDMARKS.RIGHT_ANKLE, { x: 0.52, y: 0.9, z: 0, visibility: 1 })
}

describe('computeTiltStats', () => {
  it('returns near-zero wobble for constant cone angles', () => {
    const history = Array.from({ length: 20 }, () => 12)
    const { baselineTilt, tiltWobble } = computeTiltStats(history)
    expect(baselineTilt).toBeCloseTo(12, 5)
    expect(tiltWobble).toBeCloseTo(0, 5)
  })
})

describe('computeCenterDrift', () => {
  it('is zero when ankles stay fixed', () => {
    const frame = blankFrame()
    withTorso(frame)
    const history = Array.from({ length: 10 }, () => frame.map(l => ({ ...l })))
    expect(computeCenterDrift(history)).toBe(0)
    expect(computeDriftRange(history)).toBe(0)
  })

  it('scales drift by torso length', () => {
    const history = [0.4, 0.55].map(mid => {
      const frame = blankFrame()
      withTorso(frame)
      set(frame, LANDMARKS.LEFT_ANKLE, { x: mid - 0.02 })
      set(frame, LANDMARKS.RIGHT_ANKLE, { x: mid + 0.02 })
      return frame
    })
    const drift = computeCenterDrift(history)
    expect(drift).toBeGreaterThan(0.4)
    expect(drift).toBeLessThan(1.0)
  })
})

describe('computeComOffsetProxy', () => {
  it('is near zero when hip and ankle mid align', () => {
    const frame = blankFrame()
    withTorso(frame)
    expect(computeComOffsetProxy(frame)).toBeLessThan(0.05)
  })

  it('increases with lateral hip shift', () => {
    const frame = blankFrame()
    withTorso(frame)
    set(frame, LANDMARKS.LEFT_HIP, { x: 0.25, y: 0.55 })
    set(frame, LANDMARKS.RIGHT_HIP, { x: 0.35, y: 0.55 })
    expect(computeComOffsetProxy(frame)).toBeGreaterThan(0.3)
  })
})

describe('computeAngularDeceleration', () => {
  it('detects decreasing RPM', () => {
    const samples = [
      { t: 0, rpm: 120 },
      { t: 1000, rpm: 100 },
      { t: 2000, rpm: 80 },
      { t: 3000, rpm: 60 },
    ]
    const d = computeAngularDeceleration(samples)
    expect(d).not.toBeNull()
    expect(d!).toBeGreaterThan(15)
  })

  it('returns null when insufficient samples', () => {
    expect(computeAngularDeceleration([{ t: 0, rpm: 100 }])).toBeNull()
  })

  it('returns 0 for accelerating RPM', () => {
    const samples = [
      { t: 0, rpm: 60 },
      { t: 1000, rpm: 80 },
      { t: 2000, rpm: 100 },
      { t: 3000, rpm: 120 },
    ]
    expect(computeAngularDeceleration(samples)).toBe(0)
  })
})

describe('computeRPM', () => {
  it('recovers known period from synthetic shoulder signal', () => {
    const fps = 30
    const period = 20
    const history = Array.from({ length: fps * 2 }, (_, i) => {
      const frame = blankFrame()
      withTorso(frame)
      const phase = (2 * Math.PI * i) / period
      const signal = Math.sin(phase) * 0.1
      set(frame, LANDMARKS.LEFT_SHOULDER, { x: 0.5 + signal / 2 })
      set(frame, LANDMARKS.RIGHT_SHOULDER, { x: 0.5 - signal / 2 })
      return frame
    })
    const rpm = computeRPM(history, fps)
    expect(rpm).toBeGreaterThan(35)
    expect(rpm).toBeLessThan(55)
  })
})

describe('detectIsSpinning / symmetry', () => {
  it('detects oscillating shoulders as spinning', () => {
    const fps = 30
    const history = Array.from({ length: fps }, (_, i) => {
      const frame = blankFrame()
      const signal = Math.sin((2 * Math.PI * i) / 15) * 0.15
      set(frame, LANDMARKS.LEFT_SHOULDER, { x: 0.5 + signal / 2 })
      set(frame, LANDMARKS.RIGHT_SHOULDER, { x: 0.5 - signal / 2 })
      return frame
    })
    expect(detectIsSpinning(history, fps)).toBe(true)
  })

  it('scores mirrored wrists highly', () => {
    const frame = blankFrame()
    withTorso(frame)
    set(frame, LANDMARKS.LEFT_WRIST, { x: 0.35, y: 0.5 })
    set(frame, LANDMARKS.RIGHT_WRIST, { x: 0.65, y: 0.5 })
    expect(computeArmSymmetry(frame)).toBeGreaterThan(0.95)
  })
})
