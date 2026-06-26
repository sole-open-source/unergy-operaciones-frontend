import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Solo specs de vitest (.test.js). Se excluye conciliacionMandatos.test.mjs,
    // un script legacy que se ejecuta con `node` y llama a process.exit().
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
})
