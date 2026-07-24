# ForeverArt

多平台静态站点：生活工具与花样滑冰分析。

## Philosophy

本项目不是一个基于 MediaPipe 的人体姿态检测程序。

本项目旨在建立一个可持续演进的花样滑冰分析平台（Figure Skating Analysis Platform），并与生活工具等其它平台并存。

系统由三部分共同演进：

1. Domain Knowledge（领域知识）
2. Feature Extraction（特征提取）
3. Software Implementation（软件实现）

任何新增功能都应首先回答：

1. 对应哪条花滑知识？
2. 对应哪个生物力学特征？
3. 如何计算？
4. 如何验证？
5. 如何解释？

代码只是知识的实现，而不是知识本身。

知识文档解释「为什么」；TypeScript contract 与测试约束「系统实际执行什么」。二者必须可追踪，避免 Markdown 与代码各自漂移。

## AI Development Principles

本项目采用 Knowledge-driven Development（知识驱动开发），而不是 Code-driven Development（代码驱动开发）。

任何新增功能都必须遵循以下流程：

1. 先定义领域知识（`knowledge/`）
2. 再定义 Feature（输入、公式、单位、验证方式）
3. 再实现代码（Feature 独立模块；Rule Engine 映射评分与事件；LLM 不负责计算，只负责解释与建议）
4. 每次提交同步更新 `knowledge/`、`tests/`、`docs`/`architecture/`、`src/`

所有 AI Agent 在修改代码前，应优先阅读 `knowledge/` 与 `architecture/`，再进行实现。

## Feature Lifecycle

```
Knowledge → Feature Definition → Feature Extraction → Validation
  → Rule → Report → Realtime Feedback
```

## Repository Layout

| Path | Role |
|------|------|
| `knowledge/` | 领域知识、Feature 定义、Prompt 模板 |
| `architecture/` | 平台边界、管线、数据契约 |
| `web/` | React SPA（平台目录 + 应用） |
| `backend/` | 可选 Go 后端（首轮未启用） |
| `listening.html` / `vendors/` | 遗留 Listening 静态页 |

## Platforms

- **生活工具平台** → Listening
- **花滑分析平台** → Spin Tracker（旋转分析）；跳跃 / 滑行分析待开放

## Pipelines

### Realtime Coach（当前）

`Camera → Pose Adapter → Feature → Rule → UI / TTS`

- 低延迟，浏览器内完成
- **不**接入 LLM

### Offline Analyzer（后续）

`Video / Pose Source → Feature Timeline → Session Store → Curated Knowledge + LLM → Report`

- LLM 只消费标准化 Feature Timeline / Session，不直接吃视频

## Backend Convention

- 实时姿态检测、特征提取、规则判定、TTS 反馈留在浏览器端。
- 一旦需要服务端能力（会话持久化、多设备同步、离线报告编排、LLM 代理、鉴权等），一律在 [`backend/`](backend/) 用 **Go** 实现。
- 前端默认只提交标准化 `FeatureTimeline` / `SpinSession` JSON，不把视频或 MediaPipe 原始帧作为默认服务端输入。
- 首轮仅保留占位说明，不引入 HTTP API、数据库或部署流程。

## Development

```bash
cd web
yarn install
yarn dev
yarn test
yarn build
```

构建产物输出到仓库根目录，供 GitHub Pages 托管。

## Docs

- [Architecture Overview](architecture/overview.md)
- [Pipelines](architecture/pipelines.md)
- [Feature Lifecycle](architecture/feature-lifecycle.md)
- [Data Contracts](architecture/data-contracts.md)
- [Knowledge Index](knowledge/README.md)
