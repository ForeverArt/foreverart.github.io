import {
  FIGURE_SKATING_SCHEMA_VERSION,
  listMvpSpinFeatures,
  type AnalysisEvent,
  type DeterministicReport,
  type FeatureSummary,
  type RuleResult,
  type SkillType,
} from '@/platforms/figure-skating/core'

export function buildDeterministicReport(input: {
  skill?: SkillType
  features: Record<string, FeatureSummary>
  rules: RuleResult
  events: AnalysisEvent[]
  durationSec: number
  processedFrames: number
  warnings?: string[]
}): DeterministicReport {
  const mvp = listMvpSpinFeatures()
  const knowledgeRefs = [
    ...mvp.map(f => f.knowledgePath),
    ...mvp.map(f => f.rulePath).filter((p): p is string => !!p),
  ]
  const warnings = [...(input.warnings ?? [])]
  if (input.events.some(e => e.type === 'upright_scope_warning')) {
    warnings.push('Inclination exceeds upright spin heuristic scope')
  }

  return {
    schemaVersion: FIGURE_SKATING_SCHEMA_VERSION,
    skill: input.skill ?? 'upright_spin',
    summary: {
      overallScore: input.rules.overallScore,
      overallGrade: input.rules.overallGrade,
      durationSec: input.durationSec,
      processedFrames: input.processedFrames,
      warnings: [...new Set(warnings)],
    },
    features: input.features,
    rules: input.rules,
    events: input.events,
    traceability: {
      knowledgeRefs: [...new Set(knowledgeRefs)],
      ruleRefs: mvp.map(f => f.rulePath).filter((p): p is string => !!p),
      featureIds: mvp.map(f => f.id),
    },
  }
}

export function summarizeFeatureSamples(
  samples: Array<{ featureId: string; value: number | null; available: boolean; unit: string }>
): Record<string, FeatureSummary> {
  const byId = new Map<string, Array<number | null>>()
  const units = new Map<string, string>()
  const availableCounts = new Map<string, { ok: number; total: number }>()

  for (const s of samples) {
    units.set(s.featureId, s.unit)
    const list = byId.get(s.featureId) ?? []
    list.push(s.value)
    byId.set(s.featureId, list)
    const c = availableCounts.get(s.featureId) ?? { ok: 0, total: 0 }
    c.total += 1
    if (s.available && s.value !== null) c.ok += 1
    availableCounts.set(s.featureId, c)
  }

  const out: Record<string, FeatureSummary> = {}
  for (const [featureId, values] of byId) {
    const nums = values.filter((v): v is number => v !== null)
    const c = availableCounts.get(featureId) ?? { ok: 0, total: 1 }
    out[featureId] = {
      featureId,
      unit: units.get(featureId) ?? '',
      mean: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
      min: nums.length ? Math.min(...nums) : null,
      max: nums.length ? Math.max(...nums) : null,
      last: nums.length ? nums[nums.length - 1] : null,
      availableRatio: c.ok / c.total,
    }
  }
  return out
}
