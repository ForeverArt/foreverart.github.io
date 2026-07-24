# Backend (Go)

可选服务端。首轮花滑分析平台基础架构**不启用**后端。

## Convention

- 语言：**Go**
- 目录：本目录（后续可落地 `cmd/`、`internal/` 等）
- 职责边界：会话持久化、多设备同步、离线报告编排、LLM 代理、鉴权等
- **不做**：实时姿态推理、实时 Feature 提取、实时 Rule / TTS

## Expected API Shape (future)

前端提交标准化 JSON（见 `architecture/data-contracts.md`）：

- `FeatureTimeline`
- `SpinSession`

默认**不**接收视频或 MediaPipe 原始帧。

## Status

Placeholder only. No HTTP server, database, or deployment in this phase.
