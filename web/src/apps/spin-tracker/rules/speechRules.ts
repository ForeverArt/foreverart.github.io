import type { SpinMetrics } from '@spin/features'
import type { SpeechEvent } from '@spin/lib/speechService'
import type { StatusLevel } from './status'
import type { SpinThresholds } from './thresholds'

export interface SpeechRuleState {
  hasLandmarks: boolean
  isSpinning: boolean
  statusLevel: StatusLevel
  tiltWobble: number
  driftRange: number
}

export const INITIAL_SPEECH_RULE_STATE: SpeechRuleState = {
  hasLandmarks: false,
  isSpinning: false,
  statusLevel: 'idle',
  tiltWobble: 0,
  driftRange: 0,
}

export function evaluateSpeechEvents(
  prev: SpeechRuleState,
  input: {
    hasLandmarks: boolean
    metrics: SpinMetrics
    statusLevel: StatusLevel
    thresholds: SpinThresholds
  }
): { events: SpeechEvent[]; next: SpeechRuleState } {
  const events: SpeechEvent[] = []
  const { hasLandmarks, metrics, statusLevel, thresholds } = input

  if (hasLandmarks && !prev.hasLandmarks) events.push('tracking_acquired')
  else if (!hasLandmarks && prev.hasLandmarks) events.push('tracking_lost')

  if (metrics.isSpinning && hasLandmarks) {
    if (statusLevel === 'good' && prev.statusLevel !== 'good') {
      events.push('axis_stable')
    }
    if (metrics.tiltWobble >= thresholds.maxWobbleDeg && prev.tiltWobble < thresholds.maxWobbleDeg) {
      events.push('axis_wobble')
    }
    if (metrics.driftRange >= thresholds.maxDrift && prev.driftRange < thresholds.maxDrift) {
      events.push('drift_detected')
    }
  }

  return {
    events,
    next: {
      hasLandmarks,
      isSpinning: metrics.isSpinning,
      statusLevel,
      tiltWobble: metrics.tiltWobble,
      driftRange: metrics.driftRange,
    },
  }
}
