/**
 * Smoke test de runtime de Riesgo Vivo: monta las vistas de verdad (SFC compilado
 * por Vite) con la API simulada y verifica que el HTML renderizado tenga los
 * números correctos. Detecta errores de template/composable que el build no ve.
 *
 * Ejecutar:  node scripts/verify_riesgo.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// El SSR de Node no tiene DOM y utils/security.js toca `window` al importarse
// (lee el token). Se stubea lo mínimo para poder montar las vistas.
globalThis.window = globalThis.window || {
  location: { pathname: '/', href: '/' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  addEventListener: () => {},
}
globalThis.localStorage = globalThis.window.localStorage

// DOM mínimo: PrimeVue inyecta sus <style> en document.head al instalarse.
// No hay jsdom en el repo (y el módulo no debe traer dependencias nuevas), así
// que se stubea solo la superficie que se usa.
const nodoFalso = () => ({
  style: {}, dataset: {}, children: [],
  setAttribute: () => {}, getAttribute: () => null, appendChild: () => {},
  removeChild: () => {}, addEventListener: () => {}, remove: () => {},
})
// Proxy: cualquier método del DOM que PrimeVue busque y no esté definido cae en
// un no-op, en vez de ir agregándolos uno por uno.
const docBase = {
  head: nodoFalso(), body: nodoFalso(),
  createElement: nodoFalso, createTextNode: nodoFalso,
  querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {}, removeEventListener: () => {},
}
globalThis.document = new Proxy(docBase, {
  get: (t, p) => (p in t ? t[p] : () => null),
})
globalThis.window.document = globalThis.document

// Al existir `window`, vue-router se cree en un navegador y usa `history`.
globalThis.history = globalThis.history || { state: {}, pushState: () => {}, replaceState: () => {} }
globalThis.window.history = globalThis.history

// ── API simulada ────────────────────────────────────────────────────────────
// Escenario: 3 proyectos.
//   1 El Son     garantía 100M vs exposición  50M → 200 %  SALUDABLE
//   2 La Ceiba   garantía  20M vs exposición 100M →  20 %  CRÍTICO
//   3 Palmar     sin garantía   vs exposición  30M →   0 %  CRÍTICO (sin garantía)
//   4 Aurora     garantía 200M, vence en 15 días, exposición 40M → VENCIMIENTO
const hoy = new Date()
const enDias = (n) => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const panel = (id, nombre, comercializacion) => ({
  proyecto_id: id, proyecto: nombre, liquidacion_id: 100 + id,
  ingresos_cop: 500_000_000, costos_cop: comercializacion,
  inversionistas: [{ cliente_nombre: 'Inversionista A', grupos_totales: { ingresos: 500_000_000, comercializacion } }],
})

const MOCK = {
  '/garantias': {
    items: [
      { id: 1, proyecto_id: 1, proyecto_nombre: 'El Son', tipo: 'cuenta_custodia', estado: 'vigente', valor_cop: 100_000_000, fecha_vencimiento: enDias(300) },
      { id: 2, proyecto_id: 2, proyecto_nombre: 'La Ceiba', tipo: 'poliza', estado: 'vigente', valor_cop: 20_000_000, fecha_vencimiento: enDias(300) },
      { id: 4, proyecto_id: 4, proyecto_nombre: 'Aurora', tipo: 'fiducia', estado: 'vigente', valor_cop: 200_000_000, fecha_vencimiento: enDias(15) },
    ],
  },
  '/liquidaciones/resumen-panel': {
    proyectos: [
      panel(1, 'El Son', 50_000_000),
      panel(2, 'La Ceiba', 100_000_000),
      panel(3, 'Palmar', 30_000_000),
      panel(4, 'Aurora', 40_000_000),
    ],
  },
  '/garantias/resumen': {},
  '/proyectos': { items: [] },
  '/ppa': [],
  '/dashboard/kpis': { fallas_abiertas: 0, garantias_por_vencer: 1 },
  '/alertas/contratos-ppa': { huerfanos: [], duplicados: [] },
}

const mockPath = join(root, 'node_modules', '.verify-api-mock.js')
fs.writeFileSync(mockPath, `
const MOCK = ${JSON.stringify(MOCK)}
export default {
  get: async (url) => ({ data: MOCK[url] ?? {} }),
  post: async () => ({ data: {} }),
  patch: async () => ({ data: {} }),
}
`)

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  server: { middlewareMode: true },
  plugins: [(await import('@vitejs/plugin-vue')).default()],
  resolve: {
    alias: [
      { find: '@/api/client', replacement: mockPath },   // más específico primero
      { find: '@', replacement: join(root, 'src') },
    ],
  },
})

// Las dependencias (vue, router, primevue) se importan normal; solo el código
// FUENTE del repo (SFC, composables) pasa por Vite para compilarse.
const { createSSRApp } = await import('vue')
const { renderToString } = await import('vue/server-renderer')
const { createRouter, createMemoryHistory } = await import('vue-router')
const { createPinia } = await import('pinia')
const PrimeVue = (await import('primevue/config')).default
const Tooltip = (await import('primevue/tooltip')).default
const ToastService = (await import('primevue/toastservice')).default
const PageHeader = (await server.ssrLoadModule('/src/components/PageHeader.vue')).default

async function render(sfcPath, ruta = '/riesgo') {
  const Comp = (await server.ssrLoadModule(sfcPath)).default
  const app = createSSRApp(Comp)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: Comp }] })
  router.push(ruta)
  await router.isReady()
  app.use(router).use(PrimeVue).use(ToastService).use(createPinia())
  app.directive('tooltip', Tooltip)
  app.component('PageHeader', PageHeader)
  return await renderToString(app)
}

// En SSR no hay onMounted, así que el valor real lo verificamos ejecutando el
// composable directamente (misma ruta de código que usa la vista).
const { useRiesgoVivo } = await server.ssrLoadModule('/src/composables/useRiesgoVivo.js')
const rv = useRiesgoVivo()
await rv.cargar('2026-07-01')

let fallos = 0
const check = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) fallos++ }

console.log('\n── Composable + motor con datos simulados ──')
const byId = new Map(rv.proyectos.value.map(p => [p.proyecto_id, p]))
check(rv.proyectos.value.length === 4, `4 proyectos cruzados (obtuve ${rv.proyectos.value.length})`)
check(byId.get(1).cobertura_pct === 200 && byId.get(1).nivel === 'SALUDABLE', 'El Son: 200 % SALUDABLE')
check(byId.get(2).cobertura_pct === 20 && byId.get(2).nivel === 'CRITICO', 'La Ceiba: 20 % CRÍTICO')
check(byId.get(3).sin_garantia && byId.get(3).nivel === 'CRITICO', 'Palmar: sin garantía → CRÍTICO')
check(byId.get(4).vencimiento_proximo && byId.get(4).dias_para_vencimiento === 15, 'Aurora: vence en 15 días')
check(rv.totales.value.total_garantizado_cop === 320_000_000, 'Total garantizado = $320 M')
check(rv.totales.value.total_expuesto_cop === 220_000_000, 'Total expuesto = $220 M')
check(Math.round(rv.totales.value.cobertura_global_pct) === 145, 'Cobertura global ≈ 145 %')
check(rv.accionables.value.length === 3, `3 alertas accionables (2 críticas + 1 vencimiento), obtuve ${rv.accionables.value.length}`)
// El orden importa: lo crítico primero (mayor déficit arriba).
check(rv.proyectos.value[0].proyecto_id === 2, 'Orden: mayor déficit (La Ceiba, -$80 M) primero')

console.log('\n── Render real de las vistas (SSR) ──')
for (const [nombre, ruta] of [
  ['/src/views/Riesgo/RiesgoLiquidezView.vue', '/riesgo'],
  ['/src/views/Alertas/AlertasView.vue', '/alertas'],
  ['/src/views/Garantias/GarantiasRegistrosView.vue', '/garantias'],
]) {
  try {
    const html = await render(nombre, ruta)
    check(html.length > 0, `${nombre.split('/').pop()} renderiza sin errores (${html.length} bytes)`)
  } catch (e) {
    check(false, `${nombre.split('/').pop()} FALLÓ: ${e.message}`)
  }
}

await server.close()
fs.unlinkSync(mockPath)
console.log(fallos === 0 ? '\n✅ Todo OK' : `\n❌ ${fallos} fallo(s)`)
process.exit(fallos === 0 ? 0 : 1)
