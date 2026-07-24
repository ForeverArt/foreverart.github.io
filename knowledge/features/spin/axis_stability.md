# Feature: Axis Stability

| Field | Value |
|-------|-------|
| Feature ID | `spin.axis_stability` |
| Status | active |
| Unit | degree (°) |
| Code | `tiltWobble` in SpinMetrics |

## Definition

旋转轴连续变化程度：3D 锥半角时间窗口内的标准差（MAD 剔除异常后）。

## Importance

决定 Wobble；区分固有倾斜与轴心不稳。

## Inputs

MediaPipe-compatible landmarks: shoulders, hips（需可用 z 与足够 visibility）。

## Formula

1. 每帧 `computeSpineTilt3D` → 锥半角 θ
2. 窗口（约 2s）`computeTiltStats` → `tiltWobble = std(clean(θ))`

## Output

Degree; lower is more stable.

## Validation

- 恒定倾斜序列 → wobble ≈ 0
- 叠加正弦扰动 → wobble 近似扰动标准差
- Vitest: `computeTiltStats`

## References

- `knowledge/biomechanics/axis_stability.md`
- `knowledge/biomechanics/wobble.md`
