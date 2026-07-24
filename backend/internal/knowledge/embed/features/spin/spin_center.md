# Feature: Spin Center

| Field | Value |
|-------|-------|
| Feature ID | `spin.spin_center` |
| Status | experimental |
| Unit | normalized (x, y) |
| Code | ankle midpoint (implicit in travel) |

## Definition

当前帧旋转中心近似点：左右踝关节水平中点。完整 COM 未独立暴露为实时指标，travel 使用其中心轨迹。

## Importance

为 drift 轨迹可视化与未来 COM 特征提供锚点。

## Inputs

Left / right ankle landmarks.

## Formula

`center.x = (leftAnkle.x + rightAnkle.x) / 2`

## Validation

Covered indirectly by travel tests.

## References

- `knowledge/biomechanics/center_of_mass.md`
