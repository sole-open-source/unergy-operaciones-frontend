/**
 * Prueba del composable usePolling (sondeo con backoff adaptativo).
 * Ejecutar:  node src/composables/usePolling.test.mjs
 *
 * No hay runner (vitest/jest) en el repo, así que — igual que
 * conciliacionMandatos.test.mjs — evaluamos el código fuente del módulo:
 *   1. quitamos el `import ... from 'vue'` (node no resuelve el alias)
 *   2. inyectamos stubs de ref/onMounted/onUnmounted
 *   3. quitamos `export`
 *   4. instalamos un reloj falso (setTimeout/clearTimeout deterministas)
 * y verificamos lo crítico: crecimiento del backoff ante errores, reset al
 * primer éxito, y que stop() limpia el temporizador (no más sondeos).
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'usePolling.js'), 'utf8')

// 1+3) Quitar el import de vue y los `export`.
src = src
  .replace(/import\s*\{[^}]*\}\s*from\s*'vue'\s*\n/, '')
  .replace(/export function /g, 'function ')

// 2) Stubs de la API de composición de Vue.
const mountedCbs = []
const unmountedCbs = []
const ref = (v) => ({ value: v })
const onMounted = (fn) => mountedCbs.push(fn)
const onUnmounted = (fn) => unmountedCbs.push(fn)

// 4) Reloj falso. Guardamos el setTimeout real para drenar microtareas.
const realSetTimeout = setTimeout
let now = 0
let tasks = []
let seq = 1
globalThis.setTimeout = (fn, ms) => {
  const id = seq++
  tasks.push({ id, time: now + (ms || 0), fn })
  return id
}
globalThis.clearTimeout = (id) => { tasks = tasks.filter((t) => t.id !== id) }
const flush = () => new Promise((r) => realSetTimeout(r, 0))
async function advance(ms) {
  const target = now + ms
  for (;;) {
    tasks.sort((a, b) => a.time - b.time)
    if (!tasks.length || tasks[0].time > target) break
    const t = tasks.shift()
    now = t.time
    t.fn()
    await flush(); await flush() // dejar asentar el await del fetch + scheduleNext
  }
  now = target
}
// ms hasta el próximo sondeo agendado (o null si no hay ninguno).
const nextDelay = () => (tasks.length ? Math.min(...tasks.map((t) => t.time)) - now : null)

// Materializar usePolling vía new Function, inyectando los stubs de vue como
// parámetros (mismo enfoque que conciliacionMandatos.test.mjs). setTimeout/
// clearTimeout se resuelven contra el reloj falso ya instalado en globalThis.
const usePolling = new Function(
  'ref', 'onMounted', 'onUnmounted',
  src + '\nreturn usePolling',
)(ref, onMounted, onUnmounted)

let failed = 0
function assert(cond, msg) {
  if (cond) { console.log('  ok  -', msg) } else { failed++; console.error('  FAIL -', msg) }
}

// ── Caso 1: backoff crece ante errores y se topa en maxInterval ──────────────
async function testBackoff() {
  console.log('Caso 1: backoff adaptativo ante errores')
  tasks = []; now = 0
  let calls = 0
  const fetchFn = async () => { calls++; throw new Error('boom') }
  const p = usePolling(fetchFn, {
    initialInterval: 1000, onErrorIntervalMultiplier: 2, maxInterval: 4000,
    autoStart: false, immediate: false,
  })
  p.start()
  // immediate:false → primer sondeo agendado a initialInterval.
  assert(calls === 0, 'no sondea hasta el primer intervalo')
  assert(nextDelay() === 1000, 'primer sondeo agendado a 1000ms')

  await advance(1000)
  assert(calls === 1, '1er sondeo ejecutado')
  assert(p.error.value instanceof Error, 'error capturado tras el fallo')
  assert(nextDelay() === 2000, 'backoff → 2000ms tras 1 error')

  await advance(2000)
  assert(calls === 2, '2º sondeo ejecutado')
  assert(nextDelay() === 4000, 'backoff → 4000ms tras 2 errores')

  await advance(4000)
  assert(calls === 3, '3er sondeo ejecutado')
  assert(nextDelay() === 4000, 'backoff topado en maxInterval (no 8000)')
  p.stop()
}

// ── Caso 2: un éxito resetea el backoff a initialInterval ────────────────────
async function testResetOnSuccess() {
  console.log('Caso 2: reset del backoff al primer éxito')
  tasks = []; now = 0
  let calls = 0
  let shouldFail = true
  const fetchFn = async () => { calls++; if (shouldFail) throw new Error('boom'); return 'ok' }
  const p = usePolling(fetchFn, {
    initialInterval: 1000, onErrorIntervalMultiplier: 3, maxInterval: 60000,
    autoStart: false, immediate: false,
  })
  p.start()
  await advance(1000)              // falla → backoff 3000
  assert(nextDelay() === 3000, 'backoff → 3000ms tras error')
  shouldFail = false
  await advance(3000)              // éxito → reset a 1000
  assert(p.error.value === null, 'error limpiado tras éxito')
  assert(p.data.value === 'ok', 'data poblada con el resultado')
  assert(nextDelay() === 1000, 'cadencia reseteada a initialInterval tras éxito')
  p.stop()
}

// ── Caso 3: stop() limpia el temporizador (sin fugas / sin más sondeos) ──────
async function testStopClears() {
  console.log('Caso 3: stop() detiene el sondeo')
  tasks = []; now = 0
  let calls = 0
  const fetchFn = async () => { calls++; return 'ok' }
  const p = usePolling(fetchFn, { initialInterval: 1000, autoStart: false, immediate: false })
  p.start()
  await advance(1000)
  const after = calls
  assert(after >= 1, 'al menos un sondeo antes de parar')
  p.stop()
  assert(nextDelay() === null, 'no queda temporizador agendado tras stop()')
  await advance(10000)
  assert(calls === after, 'ningún sondeo adicional tras stop()')
  // onUnmounted debe estar registrado para limpiar al desmontar el componente.
  assert(unmountedCbs.length > 0, 'onUnmounted registrado para limpieza de ciclo de vida')
}

await testBackoff()
await testResetOnSuccess()
await testStopClears()

if (failed) { console.error(`\n${failed} aserción(es) fallaron`); process.exit(1) }
console.log('\nTodas las aserciones de usePolling pasaron ✔')
