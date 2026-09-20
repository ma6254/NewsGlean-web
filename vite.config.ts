import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 38080,
    open: true,
    // 开发时把 /api 与 /swagger 代理到后端，避免跨域
    proxy: {
      '/api': 'http://127.0.0.1:28080',
      '/swagger': 'http://127.0.0.1:28080',
    },
  },
})
