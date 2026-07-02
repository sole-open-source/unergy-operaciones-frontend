import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Configuración de Vitest independiente del vite.config.js de la app (que trae
// proxies de dev que no aplican en tests). Reutiliza el alias '@' → src y activa
// jsdom para que los stores que tocan localStorage / Intl funcionen igual que en
// el navegador.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,ts}'],
    // El test legado node-only (conciliacionMandatos.test.mjs) se corre aparte
    // con `node` y no debe entrar al runner de Vitest.
    exclude: ['**/node_modules/**', 'src/utils/conciliacionMandatos.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/stores/**/*.js'],
      exclude: ['src/stores/__tests__/**'],
    },
  },
})
