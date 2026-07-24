# Feature: Angular Deceleration

| Field | Value |
|-------|-------|
| Feature ID | `spin.angular_deceleration` |
| Status | active (MVP) |
| Unit | rpm/s |
| Rule | `knowledge/rules/spin/deceleration.md` |

## Definition

时间戳化 RPM 序列的稳健线性斜率取负并向 0 裁剪：`max(0, -dRPM/dt)`。

样本不足或低置信度时标记 unavailable，不伪造 0。

## Formula

1. Collect recent RPM samples with timestamps
2. Robust linear fit slope `m` (rpm per second)
3. `angular_deceleration = max(0, -m)`

## Validation

Linearly decreasing RPM → positive deceleration; rising RPM → 0.

## References

- `knowledge/physics/angular_velocity.md`
