# Feature: Spin Speed

| Field | Value |
|-------|-------|
| Feature ID | `spin.speed` |
| Status | active (MVP) |
| Unit | rpm |
| Rule | `knowledge/rules/spin/speed.md` |

## Definition

肩部左右 X 差信号去均值后，下降过零点间距估计转速。

## Inputs

Shoulder landmarks over history + FPS / timestamps.

## Formula

1. `signal = leftShoulder.x - rightShoulder.x`
2. Pos→neg zero crossings → half-turn spacing (implementation convention)
3. Convert to RPM; filter outside 30–800

## Validation

Synthetic sinusoidal shoulder signal → expected RPM band.

## References

- `knowledge/physics/angular_velocity.md`
