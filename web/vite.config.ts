/// <reference types="vitest/config" />
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
        {
          src: 'node_modules/@mediapipe/pose/pose_landmark_full.tflite',
          dest: 'mediapipe',
        },
      ],
    }),
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  base: '/',
  build: {
    outDir: '../',
    emptyOutDir: false,
    rollupOptions: {
      external: (id) => id.startsWith('/vendors/'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@spin': path.resolve(__dirname, 'src/apps/spin-tracker'),
      '@listen': path.resolve(__dirname, 'src/apps/listening'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
