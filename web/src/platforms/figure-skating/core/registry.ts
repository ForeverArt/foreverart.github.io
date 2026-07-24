import type { FeatureStatus } from './types'

export interface FeatureDefinition {
  id: string
  name: string
  unit: string
  status: FeatureStatus
  version: string
  knowledgePath: string
  rulePath?: string
  mvp: boolean
  proxy?: boolean
  description: string
}

/** Canonical spin feature registry — must stay in sync with knowledge/features/spin/*.md */
export const SPIN_FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: 'spin.speed',
    name: 'Spin Speed',
    unit: 'rpm',
    status: 'active',
    version: '2.0.0',
    knowledgePath: 'knowledge/features/spin/speed.md',
    rulePath: 'knowledge/rules/spin/speed.md',
    mvp: true,
    description: 'Shoulder-signal zero-crossing RPM',
  },
  {
    id: 'spin.axis_stability',
    name: 'Axis Stability',
    unit: 'deg',
    status: 'active',
    version: '2.0.0',
    knowledgePath: 'knowledge/features/spin/axis.md',
    rulePath: 'knowledge/rules/spin/axis.md',
    mvp: true,
    description: 'Cone half-angle temporal std (wobble)',
  },
  {
    id: 'spin.center_drift',
    name: 'Center Drift',
    unit: 'body-normalized',
    status: 'active',
    version: '2.0.0',
    knowledgePath: 'knowledge/features/spin/travel.md',
    rulePath: 'knowledge/rules/spin/travel.md',
    mvp: true,
    proxy: true,
    description: 'Ankle-mid drift range / median torso length',
  },
  {
    id: 'spin.com_offset_proxy',
    name: 'COM Offset Proxy',
    unit: 'body-normalized',
    status: 'active',
    version: '2.0.0',
    knowledgePath: 'knowledge/features/spin/com.md',
    rulePath: 'knowledge/rules/spin/com.md',
    mvp: true,
    proxy: true,
    description: 'Hip-mid vs ankle-mid horizontal offset / torso length',
  },
  {
    id: 'spin.inclination',
    name: 'Inclination',
    unit: 'deg',
    status: 'active',
    version: '2.0.0',
    knowledgePath: 'knowledge/features/spin/inclination.md',
    rulePath: 'knowledge/rules/spin/inclination.md',
    mvp: true,
    description: 'Mean cone half-angle (intrinsic lean)',
  },
  {
    id: 'spin.angular_deceleration',
    name: 'Angular Deceleration',
    unit: 'rpm/s',
    status: 'active',
    version: '2.0.0',
    knowledgePath: 'knowledge/features/spin/deceleration.md',
    rulePath: 'knowledge/rules/spin/deceleration.md',
    mvp: true,
    description: 'max(0, -dRPM/dt) from timestamped RPM window',
  },
  {
    id: 'spin.arm_symmetry',
    name: 'Arm Symmetry',
    unit: 'ratio',
    status: 'experimental',
    version: '1.0.0',
    knowledgePath: 'knowledge/features/spin/arm_symmetry.md',
    mvp: false,
    description: 'Non-MVP experimental symmetry metric',
  },
]

export const MVP_FEATURE_IDS = SPIN_FEATURE_REGISTRY.filter(f => f.mvp).map(f => f.id)

export function getSpinFeature(id: string): FeatureDefinition | undefined {
  return SPIN_FEATURE_REGISTRY.find(f => f.id === id)
}

export function listMvpSpinFeatures(): FeatureDefinition[] {
  return SPIN_FEATURE_REGISTRY.filter(f => f.mvp && f.status === 'active')
}

export function listActiveSpinFeatures(): FeatureDefinition[] {
  return SPIN_FEATURE_REGISTRY.filter(f => f.status === 'active')
}
