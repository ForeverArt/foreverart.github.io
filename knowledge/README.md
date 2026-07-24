# Knowledge Base

知识库是本平台的权威语义层。代码、规则与 LLM 必须可追溯到此处。

## Structure

```
knowledge/
├── physics/           # 物理基础
├── biomechanics/      # 生物力学
├── isu/               # ISU 边界（非自动打分）
├── features/spin/     # 旋转 Feature 定义
├── rules/spin/        # 评分阈值与事件规则
└── prompts/           # 离线 LLM Prompt
```

## MVP Features

| ID | Doc |
|----|-----|
| `spin.speed` | `features/spin/speed.md` |
| `spin.axis_stability` | `features/spin/axis.md` |
| `spin.center_drift` | `features/spin/travel.md` |
| `spin.com_offset_proxy` | `features/spin/com.md` |
| `spin.inclination` | `features/spin/inclination.md` |
| `spin.angular_deceleration` | `features/spin/deceleration.md` |

## Traceability

| Layer | Source of truth |
|-------|-----------------|
| Why | `knowledge/` |
| What runs | TypeScript contracts + Feature registry |
| Correctness | Vitest / Go tests / fixtures |
