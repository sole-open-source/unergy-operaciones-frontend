import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api/v1/evo': {
          target: env.EVO_API_URL || 'http://localhost:18800',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/evo/, ''),
          headers: env.EVO_API_TOKEN
            ? { 'X-EVO-Token': env.EVO_API_TOKEN }
            : {},
        },
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
  }
})
