import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 生产部署在 nginx 同一 server 的 /dashboard/ 路径下，
// API 走同源 /api（由 nginx 反代到 foreverart-api）。
export default defineConfig({
  plugins: [react()],
  base: '/dashboard/',
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
