import {
  FIGURE_SKATING_SCHEMA_VERSION,
  getSpinFeature,
  type FeatureSummary,
  type Grade,
  type RuleFeatureResult,
  type RuleResult,
} from '@/platforms/figure-skating/core'
import { gradeFromBands, MVP_RULE_CONFIG, scoreFromGrade } from './mvpConfig'

export function evaluateMvpRules(
  features: Record<string, FeatureSummary>
): RuleResult {
  const featureResults: Record<string, RuleFeatureResult> = {}
  let weighted = 0
  let weightSum = 0

  for (const [featureId, bands] of Object.entries(MVP_RULE_CONFIG.bands)) {
    const summary = features[featureId]
    const def = getSpinFeature(featureId)
    const value = summary?.last ?? summary?.mean ?? null
    const grade = gradeFromBands(value, bands)
    const score = scoreFromGrade(grade)
    const weight = MVP_RULE_CONFIG.weights[featureId] ?? 0

    featureResults[featureId] = {
      featureId,
      value,
      unit: summary?.unit ?? def?.unit ?? '',
      score,
      grade,
      matchedRule: `${featureId}:${grade}`,
      knowledgePath: def?.knowledgePath ?? '',
      rulePath: def?.rulePath ?? '',
    }

    if (score !== null && weight > 0) {
      weighted += score * weight
      weightSum += weight
    }
  }

  const overallScore = weightSum > 0 ? Math.round(weighted / weightSum) : 0
  const overallGrade: Grade =
    overallScore >= 90 ? 'excellent'
      : overallScore >= 75 ? 'good'
        : overallScore >= 50 ? 'warn'
          : 'poor'

  return {
    schemaVersion: FIGURE_SKATING_SCHEMA_VERSION,
    overallScore,
    overallGrade,
    features: featureResults,
    weights: { ...MVP_RULE_CONFIG.weights },
  }
}
