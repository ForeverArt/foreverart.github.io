# Center of Mass

## Definition

质量分布的等效点。单目姿态估计无法可靠重建真实人体 COM。

## MVP Proxy Policy

本平台用 **pelvis-to-support-base proxy**（髋中点相对踝中点）与 **ankle-mid travel** 近似旋转中心行为，单位为身体尺度归一，不输出真实厘米。

## Related Features

- `spin.com_offset_proxy`
- `spin.center_drift`
