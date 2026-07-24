# PRD v0.1 — Upright Spin Analysis MVP

## Product Vision

建立一个以**领域知识（Knowledge）驱动**的花样滑冰旋转分析平台。

平台不直接依赖某一种姿态模型（如 MediaPipe），也不依赖某一个大模型，而是通过统一的知识、特征和规则体系，实现：

- 实时训练辅助
- 离线深度分析
- 可持续扩展新的技术动作
- AI 辅助知识演进

MVP 阶段仅支持：**直立旋转（Upright Spin）**。

## Success Criteria

验证整条架构链路是否成立，而不是堆功能：

```text
Video → Pose → Feature → Rule → Event → Report → LLM → analysis.md
```

若该链路稳定，后续任意 Feature 均为复制扩展。

## Scope

### In scope

- 单人、单镜头
- 浏览器本地离线视频（mp4）
- MediaPipe Pose Provider
- Upright Spin
- 六项 Feature
- 确定性 Rule / Event / Report JSON
- Go 后端 OpenAI-compatible LLM 解释报告
- 保留现有 Realtime Coach（Axis / Speed / Travel TTS）

### Out of scope

- Jump / Sit Spin / Camel
- 多人、多机位
- 比赛评分（ISU Level / GOE 自动打分）
- 视频上传到服务端
- YAML 可配置规则（MVP 用类型化配置对象）

## MVP Features

| Feature ID | Name | Unit | Notes |
|------------|------|------|-------|
| `spin.speed` | Spin Speed | rpm | shoulder zero-crossing |
| `spin.axis_stability` | Axis Stability | deg | cone half-angle std |
| `spin.center_drift` | Center Drift | body-normalized | ankle mid range / torso |
| `spin.com_offset_proxy` | COM Offset Proxy | body-normalized | hip mid vs ankle mid |
| `spin.inclination` | Inclination | deg | mean cone half-angle |
| `spin.angular_deceleration` | Angular Deceleration | rpm/s | `-dRPM/dt` clipped at 0 |

Center Drift 与 COM Offset 为**身体尺度归一化 proxy**，不宣称真实厘米或完整人体质心。

## Architecture Principles

### 1. Knowledge First

所有新功能必须首先新增或更新 Knowledge，再定义 Feature，最后实现代码。

### 2. Feature is Atomic

每个 Feature 必须独立定义、独立计算、独立测试，不依赖 UI 或具体业务。

### 3. Rules are Configurable

评分标准、阈值和事件映射不得散落在 UI；MVP 使用类型化配置，后续可迁 YAML/知识库。

### 4. LLM Explains, Never Calculates

LLM 只能解释、归因、生成建议，不参与任何数值计算和评分。

### 5. Everything is Traceable

任何结论都必须能够追溯到：`Knowledge → Feature → Rule → Event → Report`。

### 6. Model Agnostic

姿态模型（MediaPipe、RTMPose 等）和大模型（GPT、Qwen 等）都属于可替换组件，不影响核心架构。

## Acceptance

导入已知 Upright Spin `mp4` 后，系统完成：

Pose → Feature → Rule → Event → Report JSON → Go LLM → 下载 `analysis.md`

报告必须引用输入数值、不得改分、不得臆测 GOE/Level。
