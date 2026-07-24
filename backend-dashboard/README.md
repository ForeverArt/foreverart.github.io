# Backend Dashboard

[foreverart-api](../backend/README.md) 的管理面板。Vite + React 静态 SPA，构建产物由 nginx 托管在 API 同一 server 的 `/dashboard/` 路径下，与 API 同源调用，无跨域。

## 功能

| 区块 | 数据源 | 说明 |
|------|--------|------|
| 服务状态 | `GET /api/v1/healthz` | 健康、构建时间、运行时长（15s 轮询） |
| LLM 上游 | 同上 + admin stats | 模型、密钥就绪状态、Base URL |
| 请求统计 | `GET /api/v1/admin/stats` | 累计请求数（进程内，重启清零） |
| 最近报告 | 同上 | 最近 50 次 spin-report 调用：时间 / reportId / 模型 / 状态 / 耗时 |

Admin 数据需要密码：即服务器 `backend/.env` 中的 `ADMIN_PASSWORD`，
经 `X-Admin-Password` 头发送，验证后缓存在浏览器 localStorage。

## 开发

```bash
cd backend-dashboard
yarn install
yarn dev        # /api 由 vite proxy 转发到 http://localhost:8080（本地后端）
```

## 构建

```bash
yarn build      # 类型检查 + 产物输出到 dist/（base=/dashboard/）
```

## 部署

无需手动操作：push `backend-dashboard/**` 到 `master` 触发
[deploy-backend.yml](../.github/workflows/deploy-backend.yml)，
构建产物解压到服务器 `/home/admin/foreverart-backend/dist/`，
由 nginx `location /dashboard/` 提供（见 [backend/nginx.conf](../backend/nginx.conf)）。

访问入口：`https://api.<域名>/dashboard/`

## 约定

- 纯静态、零后端依赖：只调 `/api/**` 相对路径，不硬编码任何主机名
- 新增管理端点时，在后端加 `/api/v1/admin/*` 并挂 `httpx.AdminAuth`，本面板在 `src/api.ts` 加对应封装
- 不引入组件库：样式集中在 `src/styles.css`，保持依赖最小
