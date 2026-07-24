# Backend (Go) — Spin Report API

Upright Spin MVP 离线报告服务。接收 deterministic Report JSON，加载 curated knowledge，调用 OpenAI-compatible LLM，返回 `analysis.md`。

## Run

```bash
cd backend
set LLM_API_KEY=sk-...
set CORS_ORIGINS=http://localhost:5173,https://foreverart.github.io
go run ./cmd/server
```

Optional:

| Env | Default | Meaning |
|-----|---------|---------|
| `PORT` | `8080` | listen port |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base |
| `LLM_MODEL` | `gpt-4o-mini` | model id |
| `KNOWLEDGE_ROOT` | embedded | override with repo `knowledge/` path |
| `REQUEST_TIMEOUT_SEC` | `60` | upstream timeout |

## API

### `GET /healthz`

### `POST /api/v1/spin-reports`

Body: `SpinReportRequest`（Report JSON + meta）。**不接收视频或姿态帧。**

Response:

```json
{
  "reportId": "...",
  "markdown": "## 总体评价\n...",
  "model": "gpt-4o-mini",
  "generatedAt": "...",
  "knowledgeRefs": ["knowledge/features/spin/axis.md"]
}
```

## Principles

- LLM explains, never calculates
- Secrets stay in server env — never `VITE_*`
- GitHub Pages 与本服务分离部署；无鉴权仅适合本地/私有部署

## Test

```bash
go test ./...
```
