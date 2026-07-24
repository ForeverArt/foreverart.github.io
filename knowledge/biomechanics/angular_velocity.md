# Angular Velocity

## Definition

身体绕竖直轴的旋转角速度。当前用肩部左右 X 差信号的过零点估计 RPM（圈/分钟）。

## Importance

转速过低时难以维持紧姿态；过高或突变可能伴随失控。实时教练以「速度下降 / 偏低」为短句反馈。

## Related Features

- `spin.spin_speed`

## Notes

过零点法依赖可见肩部与足够帧率；遮挡或侧视可能失效。
