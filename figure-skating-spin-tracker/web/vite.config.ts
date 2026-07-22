import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@mediapipe/pose/*.{js,wasm,binarypb,data}',
          dest: 'mediapipe',
        },
      ],
    }),
  ],
  define: {
    // 构建时注入时间戳（ISO 字符串），开发时为当前时间
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  base: '/figure-skating-spin-tracker/dist/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
