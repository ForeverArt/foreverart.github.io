# Feature: COM Offset Proxy

| Field | Value |
|-------|-------|
| Feature ID | `spin.com_offset_proxy` |
| Status | active (MVP) |
| Unit | body-normalized |
| Rule | `knowledge/rules/spin/com.md` |
| Proxy | yes — pelvis-to-support-base, not true COM |

## Definition

当前帧髋中点相对踝中点的水平距离，除以躯干长度。

## Formula

`com_offset_proxy = |hipMid.x - ankleMid.x| / torsoLength`

## Validation

Aligned hip/ankle → ~0; lateral hip shift → increases.

## References

- `knowledge/physics/center_of_mass.md`
- `knowledge/biomechanics/balance.md`
