export interface SpinThresholds {
  maxWobbleDeg: number
  maxDrift: number
  minRPM: number
  /** Heuristic: arm symmetry below this triggers feedback */
  minArmSymmetry: number
  /** Heuristic: overall score ≥ this → good */
  goodOverallScore: number
  /** Heuristic: overall score ≥ this → warn (else bad) */
  warnOverallScore: number
  /** Heuristic: baseline tilt tip threshold (feedback only) */
  highBaselineTiltDeg: number
}

export const DEFAULT_THRESHOLDS: SpinThresholds = {
  maxWobbleDeg: 5,
  maxDrift: 0.05,
  minRPM: 60,
  minArmSymmetry: 0.7,
  goodOverallScore: 80,
  warnOverallScore: 50,
  highBaselineTiltDeg: 15,
}
