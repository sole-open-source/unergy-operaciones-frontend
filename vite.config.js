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
        // Algunos componentes locales (definidos inline en un <script> plano,
        // no en <script setup>) usan `template: \`...\`` como string en vez de
        // un <template> de SFC. El build "vue" por defecto es runtime-only y
        // no puede compilar esos strings -- el componente renderiza vacío, sin
        // error visible (solo un warning en consola). Este alias usa el build
        // completo (con compilador) para que esos casos sigan funcionando.
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },
    server: {
      port: 5173,
      // En desarrollo el proxy hace que el frontend y la API compartan origen,
      // por lo que no hay CORS. Tokens sensibles del lado servidor (p. ej.
      // EVO_API_TOKEN) se inyectan aquí y NUNCA llegan al bundle del cliente.
      // En producción, CORS y HSTS deben configurarse en el servidor. Ver SECURITY.md.
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
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
        '/monitoreo': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
