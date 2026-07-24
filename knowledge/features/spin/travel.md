# Feature: Travel (Drift)

| Field | Value |
|-------|-------|
| Feature ID | `spin.travel` |
| Status | active |
| Unit | normalized (0–1 of frame width) |
| Code | `driftRange` in SpinMetrics |

## Definition

旋转中心水平漂移范围：历史窗口内左右踝中点 X 的 max − min。

## Importance

Travel 过大表示旋转中心不稳，影响圈数与姿态保持。

## Inputs

Ankle landmarks over frame history.

## Formula

`driftRange = max(ankleMidX) - min(ankleMidX)` over history.

## Output

Normalized horizontal range.

## Validation

- 固定踝中点 → drift = 0
- 线性水平移动 → drift ≈ 位移量
- Vitest: `computeDriftRange`

## References

- `knowledge/biomechanics/center_of_mass.md`
- Heuristic threshold `maxDrift`（非 ISU）
