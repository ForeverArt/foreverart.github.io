import { describe, expect, it } from 'vitest'
import type { SpinMetrics } from '@spin/features'
import {
  computeScores,
  DEFAULT_THRESHOLDS,
  evaluateSpeechEvents,
  generateFeedback,
  getStatusLabel,
  INITIAL_SPEECH_RULE_STATE,
} from '@spin/rules'

const spinningStable: SpinMetrics = {
  tiltAngle: 0,
  baselineTilt: 8,
  tiltWobble: 1,
  driftRange: 0.01,
  rpm: 120,
  armSymmetry: 0.95,
  isSpinning: true,
}

const spinningUnstable: SpinMetrics = {
  tiltAngle: 5,
  baselineTilt: 20,
  tiltWobble: 8,
  driftRange: 0.12,
  rpm: 40,
  armSymmetry: 0.4,
  isSpinning: true,
}

describe('computeScores / getStatusLabel', () => {
  it('scores stable spin highly and labels good', () => {
    const scores = computeScores(spinningStable, DEFAULT_THRESHOLDS)
    expect(scores.overall).toBeGreaterThanOrEqual(80)
    expect(getStatusLabel(spinningStable, scores).level).toBe('good')
  })

  it('scores unstable spin poorly and labels bad', () => {
    const scores = computeScores(spinningUnstable, DEFAULT_THRESHOLDS)
    expect(scores.overall).toBeLessThan(50)
    expect(getStatusLabel(spinningUnstable, scores).level).toBe('bad')
  })

  it('returns idle when not spinning', () => {
    const metrics = { ...spinningStable, isSpinning: false }
    const scores = computeScores(metrics)
    expect(getStatusLabel(metrics, scores).level).toBe('idle')
  })
})

describe('generateFeedback', () => {
  it('mentions wobble and drift for unstable metrics', () => {
    const tips = generateFeedback(spinningUnstable, DEFAULT_THRESHOLDS)
    expect(tips.some(t => t.includes('晃动'))).toBe(true)
    expect(tips.some(t => t.includes('漂移'))).toBe(true)
  })
})

describe('evaluateSpeechEvents', () => {
  it('emits tracking_acquired once on rising edge', () => {
    const first = evaluateSpeechEvents(INITIAL_SPEECH_RULE_STATE, {
      hasLandmarks: true,
      metrics: spinningStable,
      statusLevel: 'good',
      thresholds: DEFAULT_THRESHOLDS,
    })
    expect(first.events).toContain('tracking_acquired')

    const second = evaluateSpeechEvents(first.next, {
      hasLandmarks: true,
      metrics: spinningStable,
      statusLevel: 'good',
      thresholds: DEFAULT_THRESHOLDS,
    })
    expect(second.events).not.toContain('tracking_acquired')
  })

  it('emits axis_wobble when crossing wobble threshold', () => {
    const prev = {
      ...INITIAL_SPEECH_RULE_STATE,
      hasLandmarks: true,
      isSpinning: true,
      statusLevel: 'warn' as const,
      tiltWobble: 2,
      driftRange: 0.01,
    }
    const { events } = evaluateSpeechEvents(prev, {
      hasLandmarks: true,
      metrics: { ...spinningStable, tiltWobble: 6 },
      statusLevel: 'warn',
      thresholds: DEFAULT_THRESHOLDS,
    })
    expect(events).toContain('axis_wobble')
  })
})
