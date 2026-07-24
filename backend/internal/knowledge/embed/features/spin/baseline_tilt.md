# Feature: Baseline Tilt

| Field | Value |
|-------|-------|
| Feature ID | `spin.baseline_tilt` |
| Status | active |
| Unit | degree (°) |
| Code | `baselineTilt` in SpinMetrics |

## Definition

旋转窗口内 3D 锥半角的均值：惯性主轴相对竖直轴的固有倾角。蹲转等动作可有较大固有倾斜且仍稳定。

## Importance

用于解释与提示，**不**作为主扣分项；评分使用 `spin.axis_stability`（wobble）。

## Inputs / Formula

Same window as axis stability; `baselineTilt = mean(clean(θ))`.

## Validation

Covered by `computeTiltStats` tests.

## References

- `knowledge/features/spin/axis_stability.md`
- `knowledge/biomechanics/axis_stability.md`
