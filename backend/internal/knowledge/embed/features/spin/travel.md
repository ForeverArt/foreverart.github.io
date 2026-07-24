# Feature: Center Drift (Travel)

| Field | Value |
|-------|-------|
| Feature ID | `spin.center_drift` |
| Status | active (MVP) |
| Unit | body-normalized (torso lengths) |
| Rule | `knowledge/rules/spin/travel.md` |
| Proxy | yes — not real centimeters |

## Definition

历史窗口内踝中点水平位移范围，除以窗口中位躯干长度（肩中点–髋中点距离）。

## Formula

`center_drift = (max(ankleMidX) - min(ankleMidX)) / median(torsoLength)`

## Validation

Fixed ankles → 0; known horizontal travel → proportional to body scale.

## References

- `knowledge/biomechanics/balance.md`
- `knowledge/physics/center_of_mass.md`
