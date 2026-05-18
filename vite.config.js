import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://backend-production-63d8.up.railway.app',
        changeOrigin: true,
      },
      '/monitoreo': {
        target: 'https://backend-production-63d8.up.railway.app',
        changeOrigin: true,
      },
    },
  },
})
