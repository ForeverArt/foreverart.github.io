import type { FeatureStatus } from './types'

export interface FeatureDefinition {
  id: string
  name: string
  unit: string
  status: FeatureStatus
  version: string
  knowledgePath: string
  description: string
}

/** Canonical spin feature registry — must stay in sync with knowledge/features/spin/*.md */
export const SPIN_FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    id: 'spin.axis_stability',
    name: 'Axis Stability',
    unit: 'deg',
    status: 'active',
    version: '1.0.0',
    knowledgePath: 'knowledge/features/spin/axis_stability.md',
    description: 'Cone half-angle temporal std (wobble)',
  },
  {
    id: 'spin.baseline_tilt',
    name: 'Baseline Tilt',
    unit: 'deg',
    status: 'active',
    version: '1.0.0',
    knowledgePath: 'knowledge/features/spin/baseline_tilt.md',
    description: 'Mean cone half-angle (intrinsic lean)',
  },
  {
    id: 'spin.travel',
    name: 'Travel',
    unit: 'normalized',
    status: 'active',
    version: '1.0.0',
    knowledgePath: 'knowledge/features/spin/travel.md',
    description: 'Horizontal spin-center drift range',
  },
  {
    id: 'spin.spin_center',
    name: 'Spin Center',
    unit: 'normalized',
    status: 'experimental',
    version: '0.1.0',
    knowledgePath: 'knowledge/features/spin/spin_center.md',
    description: 'Ankle-midpoint approximation of spin center',
  },
  {
    id: 'spin.spin_speed',
    name: 'Spin Speed',
    unit: 'rpm',
    status: 'active',
    version: '1.0.0',
    knowledgePath: 'knowledge/features/spin/spin_speed.md',
    description: 'Shoulder-signal zero-crossing RPM',
  },
  {
    id: 'spin.arm_symmetry',
    name: 'Arm Symmetry',
    unit: 'ratio',
    status: 'active',
    version: '1.0.0',
    knowledgePath: 'knowledge/features/spin/arm_symmetry.md',
    description: 'Mirrored wrist symmetry relative to hip mid',
  },
]

export function getSpinFeature(id: string): FeatureDefinition | undefined {
  return SPIN_FEATURE_REGISTRY.find(f => f.id === id)
}

export function listActiveSpinFeatures(): FeatureDefinition[] {
  return SPIN_FEATURE_REGISTRY.filter(f => f.status === 'active')
}
