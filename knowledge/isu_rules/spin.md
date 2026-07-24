# ISU Spin Rules — Boundary Notes

## Status

资料边界文档。当前软件评分**不是**官方 ISU 自动打分器。

## Scope

花样滑冰旋转（spin）涉及：

- 旋转类型与基本姿势
- 旋转圈数与特征难度（features / levels）
- GOE（Grade of Execution）加减分因素

## Current Software Position

Spin Tracker 输出的是生物力学启发式指标（轴稳定、漂移、转速、对称性），用于训练反馈，**不得**宣称等于 ISU Level / GOE。

## Heuristic Thresholds

`SpinThresholds`（如 maxWobbleDeg、maxDrift、minRPM）为经验阈值，标注为 **heuristic**，不是 ISU 条文。

## Future

若引入 Level / GOE 映射，必须先在本目录补充可引用来源，再进入 Feature / Rule 实现。
