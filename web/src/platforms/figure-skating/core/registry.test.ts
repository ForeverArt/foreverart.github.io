import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { listMvpSpinFeatures, MVP_FEATURE_IDS, SPIN_FEATURE_REGISTRY } from './registry'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../')

describe('SPIN_FEATURE_REGISTRY', () => {
  it('has unique stable IDs', () => {
    const ids = SPIN_FEATURE_REGISTRY.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('defines exactly six MVP features', () => {
    expect(MVP_FEATURE_IDS).toHaveLength(6)
    expect(listMvpSpinFeatures().map(f => f.id).sort()).toEqual([...MVP_FEATURE_IDS].sort())
  })

  it('requires knowledge and rule paths for MVP features', () => {
    for (const feature of listMvpSpinFeatures()) {
      expect(feature.knowledgePath.startsWith('knowledge/features/spin/')).toBe(true)
      expect(feature.rulePath?.startsWith('knowledge/rules/spin/')).toBe(true)
      expect(existsSync(path.join(repoRoot, feature.knowledgePath))).toBe(true)
      expect(existsSync(path.join(repoRoot, feature.rulePath!))).toBe(true)
    }
  })

  it('keeps arm symmetry experimental / non-MVP', () => {
    const arm = SPIN_FEATURE_REGISTRY.find(f => f.id === 'spin.arm_symmetry')
    expect(arm?.mvp).toBe(false)
    expect(arm?.status).toBe('experimental')
  })
})
