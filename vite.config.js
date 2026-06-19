import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Content Security Policy (CSP)
//
// Política estricta en lo que más importa (script/object/base) pero lo bastante
// permisiva en img/connect/worker para no romper la app:
//   • MapLibre crea Web Workers vía blob: y carga teselas (img/connect)
//   • pdf.js usa workers y wasm
//   • Google Fonts (style + font) y embeds de Google Drive (frame/img)
//
// Nota: en producción lo ideal es servir esta CSP como cabecera HTTP desde el
// proxy/CDN (nginx, Cloudflare…). Un build estático no controla las cabeceras de
// respuesta, así que la inyectamos como <meta http-equiv> en index.html — válido
// pero con la limitación de que `frame-ancestors`/`form-action` se ignoran en
// meta (sí aplican en el server de desarrollo, vía server.headers).
// ─────────────────────────────────────────────────────────────────────────────
function buildCsp(env) {
  // Permitir explícitamente la URL de la API si es de otro origen.
  const apiUrl = env.VITE_API_URL || env.VITE_API_BASE_URL || ''
  const apiOrigin = (() => {
    try { return apiUrl ? new URL(apiUrl).origin : '' } catch { return '' }
  })()

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    // 'unsafe-inline' requerido por estilos inline de PrimeVue/Tailwind y por el
    // bootstrap del bundle; 'wasm-unsafe-eval' lo necesita pdf.js.
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self' https://drive.google.com",
    `connect-src 'self' https: wss:${apiOrigin ? ` ${apiOrigin}` : ''}`,
  ].join('; ')
}

// Versión apta para <meta>: se omiten las directivas que el navegador ignora en
// meta (frame-ancestors, form-action) para no generar warnings en consola.
function cspForMeta(csp) {
  return csp
    .split('; ')
    .filter(d => !/^(frame-ancestors|form-action)\b/.test(d))
    .join('; ')
}

// Plugin que inyecta la CSP como <meta http-equiv> en el <head> del index.html.
function cspMetaPlugin(csp) {
  const metaCsp = cspForMeta(csp)
  return {
    name: 'inject-csp-meta',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${metaCsp}" />`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const csp = buildCsp(env)
  return {
    plugins: [vue(), cspMetaPlugin(csp)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // En desarrollo aplicamos la CSP completa como cabecera para detectar
      // violaciones temprano (incluye frame-ancestors/form-action).
      headers: {
        'Content-Security-Policy': csp,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
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
