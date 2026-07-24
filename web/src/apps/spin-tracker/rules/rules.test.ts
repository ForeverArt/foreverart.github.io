import { describe, expect, it } from 'vitest'
import type { SpinMetrics } from '@spin/features'
import {
  analysisEventsToSpeechKeys,
  buildDeterministicReport,
  evaluateAnalysisEvents,
  evaluateMvpRules,
  INITIAL_EVENT_STATE,
  summarizeFeatureSamples,
} from '@spin/rules'

const spinningStable: SpinMetrics = {
  tiltAngle: 0,
  baselineTilt: 8,
  inclination: 8,
  tiltWobble: 1,
  axisStability: 1,
  driftRange: 0.05,
  centerDrift: 0.05,
  comOffsetProxy: 0.04,
  rpm: 120,
  speed: 120,
  angularDeceleration: 5,
  decelerationAvailable: true,
  armSymmetry: 0.95,
  isSpinning: true,
}

describe('evaluateMvpRules', () => {
  it('grades excellent axis when wobble is low', () => {
    const features = summarizeFeatureSamples([
      { featureId: 'spin.axis_stability', value: 1.2, available: true, unit: 'deg' },
      { featureId: 'spin.center_drift', value: 0.05, available: true, unit: 'body-normalized' },
      { featureId: 'spin.com_offset_proxy', value: 0.04, available: true, unit: 'body-normalized' },
      { featureId: 'spin.inclination', value: 10, available: true, unit: 'deg' },
      { featureId: 'spin.angular_deceleration', value: 8, available: true, unit: 'rpm/s' },
      { featureId: 'spin.speed', value: 130, available: true, unit: 'rpm' },
    ])
    const rules = evaluateMvpRules(features)
    expect(rules.features['spin.axis_stability'].grade).toBe('excellent')
    expect(rules.overallScore).toBeGreaterThan(80)
  })
})

describe('evaluateAnalysisEvents', () => {
  it('emits wobble and maps to speech keys', () => {
    const prev = {
      ...INITIAL_EVENT_STATE,
      hasLandmarks: true,
      isSpinning: true,
      lastRpm: 100,
    }
    const { events } = evaluateAnalysisEvents(prev, {
      t: 1.2,
      hasLandmarks: true,
      metrics: { ...spinningStable, axisStability: 6, tiltWobble: 6 },
    })
    expect(events.some(e => e.type === 'wobble')).toBe(true)
    expect(analysisEventsToSpeechKeys(events)).toContain('axis_wobble')
  })

  it('emits speed_drop on sharp RPM decrease', () => {
    const prev = {
      ...INITIAL_EVENT_STATE,
      hasLandmarks: true,
      isSpinning: true,
      lastRpm: 120,
    }
    const { events } = evaluateAnalysisEvents(prev, {
      t: 2,
      hasLandmarks: true,
      metrics: { ...spinningStable, speed: 80, rpm: 80 },
    })
    expect(events.some(e => e.type === 'speed_drop')).toBe(true)
  })
})

describe('buildDeterministicReport', () => {
  it('includes six MVP feature ids in traceability', () => {
    const features = summarizeFeatureSamples([
      { featureId: 'spin.axis_stability', value: 2, available: true, unit: 'deg' },
      { featureId: 'spin.center_drift', value: 0.1, available: true, unit: 'body-normalized' },
      { featureId: 'spin.com_offset_proxy', value: 0.1, available: true, unit: 'body-normalized' },
      { featureId: 'spin.inclination', value: 15, available: true, unit: 'deg' },
      { featureId: 'spin.angular_deceleration', value: 20, available: true, unit: 'rpm/s' },
      { featureId: 'spin.speed', value: 90, available: true, unit: 'rpm' },
    ])
    const rules = evaluateMvpRules(features)
    const report = buildDeterministicReport({
      features,
      rules,
      events: [],
      durationSec: 3,
      processedFrames: 45,
    })
    expect(report.traceability.featureIds).toHaveLength(6)
    expect(report.schemaVersion).toBe('2.0.0')
  })
})
