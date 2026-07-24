# Feature: Spin Speed

| Field | Value |
|-------|-------|
| Feature ID | `spin.spin_speed` |
| Status | active |
| Unit | RPM (revolutions per minute) |
| Code | `rpm` in SpinMetrics |

## Definition

肩部左右 X 差信号去均值后，下降过零点间距估计半周期，换算 RPM。

## Importance

转速偏低时常伴随松臂；实时教练可提示收臂加速。

## Inputs

Shoulder landmarks over history + FPS.

## Formula

1. `signal = leftShoulder.x - rightShoulder.x`
2. Zero crossings (pos→neg) → half periods
3. `rpm = (fps / (avgHalfPeriod * 2)) * 60`
4. Filter outside 30–800 RPM

## Validation

- Synthetic sinusoidal shoulder signal at known period → expected RPM
- Vitest: `computeRPM`

## References

- `knowledge/biomechanics/angular_velocity.md`
- Heuristic `minRPM`（非 ISU）
