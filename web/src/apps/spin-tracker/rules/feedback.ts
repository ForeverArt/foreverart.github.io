import type { SpinMetrics } from '@spin/features'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from './thresholds'

export function generateFeedback(
  metrics: SpinMetrics,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
): string[] {
  const tips: string[] = []

  if (metrics.tiltWobble > thresholds.maxWobbleDeg) {
    tips.push(`旋转轴晃动 ${metrics.tiltWobble.toFixed(1)}°，收紧核心让惯性主轴保持稳定`)
  }

  if (metrics.driftRange > thresholds.maxDrift) {
    tips.push(`旋转中心漂移过大，专注于支撑脚的固定点`)
  }

  if (metrics.armSymmetry < thresholds.minArmSymmetry) {
    tips.push(`手臂不对称，收紧双臂使其贴近身体两侧均匀`)
  }

  if (metrics.isSpinning && metrics.rpm < thresholds.minRPM) {
    tips.push(`转速偏低，尝试收紧手臂提升旋转速度`)
  }

  if (tips.length === 0 && metrics.isSpinning) {
    if (metrics.baselineTilt > thresholds.highBaselineTiltDeg) {
      tips.push(`轴心稳定（固有倾斜 ${metrics.baselineTilt.toFixed(1)}°），保持当前姿态`)
    } else {
      tips.push(`旋转状态良好，保持当前姿态`)
    }
  }

  return tips
}
