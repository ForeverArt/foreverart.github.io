import type { AnalysisEvent, FeatureSample } from '@/platforms/figure-skating/core'
import type { SpinMetrics } from '@spin/features'
import { MVP_RULE_CONFIG } from './mvpConfig'

export interface EventEngineState {
  hasLandmarks: boolean
  isSpinning: boolean
  axisGood: boolean
  wobbleHigh: boolean
  travelHigh: boolean
  scopeWarned: boolean
  lastRpm: number
}

export const INITIAL_EVENT_STATE: EventEngineState = {
  hasLandmarks: false,
  isSpinning: false,
  axisGood: false,
  wobbleHigh: false,
  travelHigh: false,
  scopeWarned: false,
  lastRpm: 0,
}

export function evaluateAnalysisEvents(
  prev: EventEngineState,
  input: {
    t: number
    hasLandmarks: boolean
    metrics: SpinMetrics
  }
): { events: AnalysisEvent[]; next: EventEngineState } {
  const { t, hasLandmarks, metrics } = input
  const events: AnalysisEvent[] = []
  const speech = MVP_RULE_CONFIG.speech

  if (hasLandmarks && !prev.hasLandmarks) {
    events.push({ t, type: 'tracking_acquired', message: '已追踪到目标' })
  } else if (!hasLandmarks && prev.hasLandmarks) {
    events.push({ t, type: 'tracking_lost', message: '目标丢失' })
  }

  if (metrics.isSpinning && !prev.isSpinning) {
    events.push({ t, type: 'spin_started', featureId: 'spin.speed', value: metrics.speed })
  } else if (!metrics.isSpinning && prev.isSpinning) {
    events.push({ t, type: 'spin_ended', featureId: 'spin.speed', value: metrics.speed })
  }

  const wobbleHigh = metrics.axisStability >= speech.maxWobbleDeg
  const travelHigh = metrics.centerDrift >= speech.maxCenterDrift
  const axisGood = metrics.isSpinning && metrics.axisStability < speech.maxWobbleDeg

  if (metrics.isSpinning && hasLandmarks) {
    if (wobbleHigh && !prev.wobbleHigh) {
      events.push({
        t,
        type: 'wobble',
        featureId: 'spin.axis_stability',
        ruleId: 'spin.axis_stability:poor',
        value: metrics.axisStability,
        message: '轴心晃动',
      })
    }
    if (!wobbleHigh && prev.wobbleHigh && axisGood) {
      events.push({
        t,
        type: 'axis_recovery',
        featureId: 'spin.axis_stability',
        value: metrics.axisStability,
        message: '轴心恢复',
      })
    }
    if (axisGood && !prev.axisGood) {
      events.push({
        t,
        type: 'axis_stable',
        featureId: 'spin.axis_stability',
        value: metrics.axisStability,
        message: '轴心稳定',
      })
    }
    if (travelHigh && !prev.travelHigh) {
      events.push({
        t,
        type: 'travel',
        featureId: 'spin.center_drift',
        ruleId: 'spin.center_drift:poor',
        value: metrics.centerDrift,
        message: '旋转中心漂移',
      })
    }
    if (
      prev.lastRpm >= speech.minRPM
      && metrics.speed > 0
      && metrics.speed < prev.lastRpm * 0.75
    ) {
      events.push({
        t,
        type: 'speed_drop',
        featureId: 'spin.speed',
        value: metrics.speed,
        message: '速度下降',
      })
    }
    if (
      !prev.scopeWarned
      && metrics.inclination >= MVP_RULE_CONFIG.uprightInclinationWarnDeg
    ) {
      events.push({
        t,
        type: 'upright_scope_warning',
        featureId: 'spin.inclination',
        value: metrics.inclination,
        message: '倾角偏高，可能超出直立旋转范围',
      })
    }
  }

  return {
    events,
    next: {
      hasLandmarks,
      isSpinning: metrics.isSpinning,
      axisGood,
      wobbleHigh,
      travelHigh,
      scopeWarned: prev.scopeWarned || metrics.inclination >= MVP_RULE_CONFIG.uprightInclinationWarnDeg,
      lastRpm: metrics.speed > 0 ? metrics.speed : prev.lastRpm,
    },
  }
}

/** Map realtime TTS consumers to analysis events. */
export function analysisEventsToSpeechKeys(events: AnalysisEvent[]): Array<
  'tracking_acquired' | 'tracking_lost' | 'axis_stable' | 'axis_wobble' | 'drift_detected' | 'speed_drop'
> {
  const out: Array<'tracking_acquired' | 'tracking_lost' | 'axis_stable' | 'axis_wobble' | 'drift_detected' | 'speed_drop'> = []
  for (const e of events) {
    if (e.type === 'tracking_acquired') out.push('tracking_acquired')
    if (e.type === 'tracking_lost') out.push('tracking_lost')
    if (e.type === 'axis_stable') out.push('axis_stable')
    if (e.type === 'wobble') out.push('axis_wobble')
    if (e.type === 'travel') out.push('drift_detected')
    if (e.type === 'speed_drop') out.push('speed_drop')
  }
  return out
}

export function latestSample(
  samples: FeatureSample[],
  featureId: string
): number | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].featureId === featureId && samples[i].available) {
      return samples[i].value
    }
  }
  return null
}
