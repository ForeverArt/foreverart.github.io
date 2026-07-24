import { describe, expect, it } from 'vitest'
import { LANDMARKS, type PoseLandmark } from '@/platforms/figure-skating/core'
import {
  computeArmSymmetry,
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

describe('computeTiltStats', () => {
  it('returns near-zero wobble for constant cone angles', () => {
    const history = Array.from({ length: 20 }, () => 12)
    const { baselineTilt, tiltWobble } = computeTiltStats(history)
    expect(baselineTilt).toBeCloseTo(12, 5)
    expect(tiltWobble).toBeCloseTo(0, 5)
  })

  it('estimates wobble for oscillating angles', () => {
    const history = Array.from({ length: 30 }, (_, i) => 10 + (i % 2 === 0 ? 2 : -2))
    const { tiltWobble } = computeTiltStats(history)
    expect(tiltWobble).toBeGreaterThan(1.5)
    expect(tiltWobble).toBeLessThan(3)
  })
})

describe('computeDriftRange', () => {
  it('is zero when ankles stay fixed', () => {
    const frame = blankFrame()
    set(frame, LANDMARKS.LEFT_ANKLE, { x: 0.4 })
    set(frame, LANDMARKS.RIGHT_ANKLE, { x: 0.6 })
    const history = Array.from({ length: 10 }, () => frame.map(l => ({ ...l })))
    expect(computeDriftRange(history)).toBe(0)
  })

  it('matches horizontal travel of ankle midpoint', () => {
    const history = [0.4, 0.5, 0.55].map(mid => {
      const frame = blankFrame()
      set(frame, LANDMARKS.LEFT_ANKLE, { x: mid - 0.05 })
      set(frame, LANDMARKS.RIGHT_ANKLE, { x: mid + 0.05 })
      return frame
    })
    expect(computeDriftRange(history)).toBeCloseTo(0.15, 5)
  })
})

describe('computeRPM', () => {
  it('recovers known period from synthetic shoulder signal', () => {
    const fps = 30
    // Algorithm treats each pos→neg zero-crossing as a half-turn.
    // Sine period 20 frames → crossing spacing 20 → estimated full period 40
    // → RPM = (30/40)*60 = 45
    const period = 20
    const history = Array.from({ length: fps * 2 }, (_, i) => {
      const frame = blankFrame()
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

describe('detectIsSpinning', () => {
  it('is false for static shoulders', () => {
    const fps = 30
    const history = Array.from({ length: fps }, () => {
      const frame = blankFrame()
      set(frame, LANDMARKS.LEFT_SHOULDER, { x: 0.4 })
      set(frame, LANDMARKS.RIGHT_SHOULDER, { x: 0.6 })
      return frame
    })
    expect(detectIsSpinning(history, fps)).toBe(false)
  })

  it('is true for oscillating shoulder width signal', () => {
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
})

describe('computeArmSymmetry', () => {
  it('is near 1 for mirrored wrists', () => {
    const frame = blankFrame()
    set(frame, LANDMARKS.LEFT_HIP, { x: 0.45, y: 0.6 })
    set(frame, LANDMARKS.RIGHT_HIP, { x: 0.55, y: 0.6 })
    set(frame, LANDMARKS.LEFT_SHOULDER, { x: 0.4, y: 0.3 })
    set(frame, LANDMARKS.RIGHT_SHOULDER, { x: 0.6, y: 0.3 })
    set(frame, LANDMARKS.LEFT_WRIST, { x: 0.35, y: 0.5 })
    set(frame, LANDMARKS.RIGHT_WRIST, { x: 0.65, y: 0.5 })
    expect(computeArmSymmetry(frame)).toBeGreaterThan(0.95)
  })

  it('drops when one arm is extended asymmetrically', () => {
    const frame = blankFrame()
    set(frame, LANDMARKS.LEFT_HIP, { x: 0.45, y: 0.6 })
    set(frame, LANDMARKS.RIGHT_HIP, { x: 0.55, y: 0.6 })
    set(frame, LANDMARKS.LEFT_SHOULDER, { x: 0.4, y: 0.3 })
    set(frame, LANDMARKS.RIGHT_SHOULDER, { x: 0.6, y: 0.3 })
    set(frame, LANDMARKS.LEFT_WRIST, { x: 0.1, y: 0.5 })
    set(frame, LANDMARKS.RIGHT_WRIST, { x: 0.55, y: 0.55 })
    expect(computeArmSymmetry(frame)).toBeLessThan(0.7)
  })
})
