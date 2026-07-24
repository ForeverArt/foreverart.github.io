import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { listActiveSpinFeatures, SPIN_FEATURE_REGISTRY } from './registry'

const repoRoot = path.resolve(__dirname, '../../../../../')

describe('SPIN_FEATURE_REGISTRY', () => {
  it('has unique stable IDs', () => {
    const ids = SPIN_FEATURE_REGISTRY.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('requires unit, version, and knowledge path for every feature', () => {
    for (const feature of SPIN_FEATURE_REGISTRY) {
      expect(feature.id).toMatch(/^spin\./)
      expect(feature.unit.length).toBeGreaterThan(0)
      expect(feature.version.length).toBeGreaterThan(0)
      expect(feature.knowledgePath.startsWith('knowledge/features/spin/')).toBe(true)
    }
  })

  it('points knowledge paths at existing markdown files', () => {
    for (const feature of SPIN_FEATURE_REGISTRY) {
      const abs = path.join(repoRoot, feature.knowledgePath)
      expect(existsSync(abs), `missing ${feature.knowledgePath}`).toBe(true)
    }
  })

  it('exposes at least one active feature', () => {
    expect(listActiveSpinFeatures().length).toBeGreaterThan(0)
  })
})
