# Architecture Principles (Constitution)

## 1. Knowledge First

所有新功能必须首先新增或更新 Knowledge，再定义 Feature，最后实现代码。

## 2. Feature is Atomic

每个 Feature 必须独立定义、独立计算、独立测试，不依赖 UI 或具体业务。

## 3. Rules are Configurable

评分标准、阈值和事件映射不得硬编码在 UI；MVP 使用类型化配置对象，后续可迁 YAML。

## 4. LLM Explains, Never Calculates

LLM 只能解释、归因、生成建议，不参与任何数值计算和评分。

## 5. Everything is Traceable

任何结论都必须能够追溯到：`Knowledge → Feature → Rule → Event → Report`。

## 6. Model Agnostic

姿态模型与大模型均为可替换组件，核心契约是 `PoseFrame` / `SpinAnalysis` / Report JSON。

## Upright Spin MVP Assumptions

- 用户显式选择 Upright Spin；系统不做动作分类
- inclination 过高仅触发 scope warning
- Center Drift / COM Offset 使用身体尺度归一 proxy
