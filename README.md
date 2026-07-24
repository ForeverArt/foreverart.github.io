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
| `backend/` | Go 报告服务（LLM Analyzer） |
| `PRD.md` | Upright Spin MVP 产品定义 |
| `listening.html` / `vendors/` | 遗留 Listening 静态页 |

## Platforms

- **生活工具平台** → Listening
- **花滑分析平台** → Spin Tracker（实时）+ Upright Spin 离线分析（MVP）；跳跃 / 滑行待开放

## Pipelines

### Realtime Coach

`Camera → Pose Adapter → Feature → Rule → Event → UI / TTS`

- 仅 Axis / Speed / Travel 语音；**不**接入 LLM

### Offline Analyzer（MVP）

`Local mp4 → Pose → Feature → Rule → Event → Report JSON → Go LLM → analysis.md`

- 视频不上传；LLM 只解释 deterministic Report JSON

## Backend Convention

- 实时链路留在浏览器端
- 离线 AI 报告在 [`backend/`](backend/) 用 **Go** 实现（OpenAI-compatible Provider）
- 默认只提交 Report JSON，不上传视频/姿态帧
- 密钥仅服务端环境变量，禁止写入 Vite bundle

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
