# Feature: Axis Stability

| Field | Value |
|-------|-------|
| Feature ID | `spin.axis_stability` |
| Status | active (MVP) |
| Unit | deg |
| Rule | `knowledge/rules/spin/axis.md` |

## Definition

3D 锥半角时间窗口标准差（MAD 剔除后）= wobble。

## Inputs

Shoulders + hips with usable z and visibility.

## Formula

`axis_stability = std(clean(θ_3d))` over ~2s window.

## Validation

Constant θ → ~0; oscillating θ → ≈ perturbation std.

## References

- `knowledge/biomechanics/axis.md`
- `knowledge/biomechanics/wobble.md`
- `knowledge/physics/rigid_body.md`
