# Feature: Inclination

| Field | Value |
|-------|-------|
| Feature ID | `spin.inclination` |
| Status | active (MVP) |
| Unit | deg |
| Rule | `knowledge/rules/spin/inclination.md` |

## Definition

窗口内 3D 锥半角均值 = 固有倾斜。Upright Spin 期望较低；过高触发范围警告（可能非 upright）。

## Formula

`inclination = mean(clean(θ_3d))`

## Validation

Covered by tilt stats tests.

## References

- `knowledge/physics/rigid_body.md`
- `knowledge/biomechanics/axis.md`
