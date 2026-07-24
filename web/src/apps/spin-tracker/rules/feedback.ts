import type { SpinMetrics } from '@spin/features'
import { DEFAULT_THRESHOLDS, type SpinThresholds } from './thresholds'

export function generateFeedback(
  metrics: SpinMetrics,
  thresholds: SpinThresholds = DEFAULT_THRESHOLDS
): string[] {
  const tips: string[] = []

  if (metrics.axisStability > thresholds.maxWobbleDeg) {
    tips.push(`旋转轴晃动 ${metrics.axisStability.toFixed(1)}°，收紧核心让惯性主轴保持稳定`)
  }

  if (metrics.centerDrift > thresholds.maxDrift) {
    tips.push(`旋转中心漂移过大，专注于支撑脚的固定点`)
  }

  if (metrics.isSpinning && metrics.speed < thresholds.minRPM) {
    tips.push(`转速偏低，尝试收紧手臂提升旋转速度`)
  }

  if (metrics.decelerationAvailable && (metrics.angularDeceleration ?? 0) > 40) {
    tips.push(`转速下降偏快，保持紧姿态`)
  }

  if (tips.length === 0 && metrics.isSpinning) {
    tips.push(`旋转状态良好，保持当前姿态`)
  }

  return tips
}
