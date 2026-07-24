# Knowledge Base

知识库是本平台的权威语义层。代码与测试必须能追溯到此处。

## Structure

```
knowledge/
├── biomechanics/     # 生物力学概念
├── isu_rules/        # ISU / 规则边界（启发式阈值需标注）
├── features/spin/    # 旋转 Feature 定义
└── prompts/          # 离线 LLM Prompt（非实时）
```

## Feature Doc Template

每个 Feature 文档应包含：

- **Definition** — 定义
- **Importance** — 为何重要
- **Inputs** — 输入数据
- **Formula** — 计算公式
- **Unit** — 输出单位
- **Validation** — 如何验证
- **References** — 知识 / 规则 / 论文引用
- **Status** — `active` | `experimental` | `deprecated`
- **Feature ID** — 与 TypeScript registry 对齐的稳定 ID

## Traceability

| Layer | Source of truth |
|-------|-----------------|
| Why | `knowledge/` |
| What runs | TypeScript contracts + Feature registry |
| Correctness | Vitest / fixtures |
