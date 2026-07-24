import { MVP_RULE_CONFIG } from './mvpConfig'

/** Legacy realtime thresholds mapped onto MVP speech/rule config. */
export interface SpinThresholds {
  maxWobbleDeg: number
  maxDrift: number
  minRPM: number
  minArmSymmetry: number
  goodOverallScore: number
  warnOverallScore: number
  highBaselineTiltDeg: number
}

export const DEFAULT_THRESHOLDS: SpinThresholds = {
  maxWobbleDeg: MVP_RULE_CONFIG.speech.maxWobbleDeg,
  maxDrift: MVP_RULE_CONFIG.speech.maxCenterDrift,
  minRPM: MVP_RULE_CONFIG.speech.minRPM,
  minArmSymmetry: 0.7,
  goodOverallScore: 80,
  warnOverallScore: 50,
  highBaselineTiltDeg: MVP_RULE_CONFIG.uprightInclinationWarnDeg,
}
