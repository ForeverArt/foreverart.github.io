# Feature: Arm Symmetry

| Field | Value |
|-------|-------|
| Feature ID | `spin.arm_symmetry` |
| Status | active |
| Unit | ratio 0–1 (1 = perfect) |
| Code | `armSymmetry` in SpinMetrics |

## Definition

以髋中点为原点，双腕相对位置镜像比较；差值相对肩宽归一化后映射为对称性。

## Importance

不对称手臂会破坏旋转紧度与轴对称，是常见即时纠错点。

## Inputs

Wrists, hips, shoulders of current frame.

## Formula

Mirror left wrist relative to hip mid; compare to right; `symmetry = 1 - clamp(diff / shoulderWidth, 0, 1)`.

## Validation

- Mirrored wrists → ≈ 1
- One arm extended → lower score
- Vitest: `computeArmSymmetry`

## References

- Heuristic feedback threshold 0.7（非 ISU）
