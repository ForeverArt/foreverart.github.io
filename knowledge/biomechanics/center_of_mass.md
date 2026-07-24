# Center of Mass / Spin Center

## Definition

旋转中支撑脚与身体质心投影在水平面上的稳定点。当前实现用左右踝关节水平中点近似旋转中心。

## Importance

中心漂移（travel）过大会降低旋转连续性与可控性，也是教练常见纠错点。

## Related Features

- `spin.travel`

## Notes

完整 COM 估计需要质量分布模型；当前为启发式近似，非全身质心重建。
