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
| `HOST` | *(all interfaces)* | listen address; 生产设为 `127.0.0.1` 走 nginx 反代 |
| `PORT` | `8080` | listen port（服务器上 onday 占 8080，本服务用 `8081`） |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base |
| `LLM_MODEL` | `gpt-4o-mini` | model id |
| `KNOWLEDGE_ROOT` | embedded | override with repo `knowledge/` path |
| `REQUEST_TIMEOUT_SEC` | `60` | upstream timeout |
| `MAX_BODY_BYTES` | `5242880` | 请求体上限 |
| `ADMIN_PASSWORD` | *(empty = admin off)* | `/api/v1/admin/*` 的 `X-Admin-Password` 口令 |

## API

### `GET /healthz` / `GET /api/v1/healthz`

服务健康 + 构建信息：

```json
{ "ok": true, "build_time": "2026-07-24T08:00:00Z", "uptime_sec": 123, "llm_model": "deepseek-chat", "llm_ready": true }
```

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

### `GET /api/v1/admin/stats`

需请求头 `X-Admin-Password`（未配置 `ADMIN_PASSWORD` 时端点返回 404）。返回请求计数、运行时长与最近 50 次报告调用记录（进程内统计，重启清零）。

## 生产部署（阿里云，与 onday-backend 共存）

```
https://foreverart.github.io          前端（GitHub Pages，不变）
        │  VITE_BACKEND_BASE_URL（CORS 已放行该 origin）
        ▼
https://api.<域名>                    nginx（sites-available/foreverart）
        ├── /api/        → 127.0.0.1:8081   systemd: foreverart-api
        └── /dashboard/  → ~/foreverart-backend/dist/   backend-dashboard 静态产物

已有：80 → onday-backend（sites-enabled/default，不触碰）
```

自动部署：push `backend/**` 或 `backend-dashboard/**` 到 `master` 触发
[deploy-backend.yml](../.github/workflows/deploy-backend.yml)（编译 → SCP → systemctl restart foreverart-api）。
Secrets 复用 onday 的 `HOST` / `SSH_PRIVATE_KEY`。

**首次服务器初始化**（一次性）：

```bash
git clone git@github.com:ForeverArt/foreverart.github.io.git /home/admin/foreverart-backend
cd /home/admin/foreverart-backend

cp backend/.env.example backend/.env   # 填入 LLM_API_KEY / ADMIN_PASSWORD，PORT=8081
chmod 600 backend/.env

sudo cp backend/foreverart-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now foreverart-api

sudo cp backend/nginx.conf /etc/nginx/sites-available/foreverart   # 先改 server_name
sudo ln -s /etc/nginx/sites-available/foreverart /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload

# 域名解析生效后签证书（certbot 自动补 443 并跳转 80→443）
sudo certbot --nginx -d api.<域名>
```

阿里云安全组需放行 **443**（80 已开）。前端联调：Pages 站点设置 `VITE_BACKEND_BASE_URL=https://api.<域名>`，
或页面里通过 `localStorage["spin-analysis-backend-url"]` 覆盖（见 `web/src/apps/spin-tracker/offline/reportClient.ts`）。

## Principles

- LLM explains, never calculates
- Secrets stay in server env — never `VITE_*`
- GitHub Pages 与本服务分离部署，经 nginx + HTTPS 暴露
- `/api/v1/spin-reports` 面向终端用户公开；`/api/v1/admin/*` 由 `ADMIN_PASSWORD` 保护

## Test

```bash
go test ./...
```
