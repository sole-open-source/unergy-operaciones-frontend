/**
 * Pruebas de la política de reintentos (src/api/retry.js).
 * Ejecutar:  node src/api/retry.test.mjs
 *
 * Igual que cache.test.mjs / conciliacionMandatos.test.mjs: no hay runner
 * (vitest/jest) en el repo, así que cargamos el fuente quitando los `export`
 * y corremos aserciones. retry.js no importa nada, así que es directo.
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'retry.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')

const m = new Function(
  src +
    '\nreturn { MAX_RETRIES, RETRY_STATUSES, RETRYABLE_METHODS, backoffDelay, shouldRetry };'
)()

let ok = true
const assert = (cond, msg) => {
  console.log((cond ? '✅' : '❌') + ' ' + msg)
  if (!cond) ok = false
}

// ── shouldRetry: estados 5xx transitorios en GET dentro del tope ─────────────
assert(m.shouldRetry('get', 503, 1) === true, 'reintenta GET 503 (intento 1)')
assert(m.shouldRetry('GET', 502, 2) === true, 'reintenta GET 502 case-insensitive')
assert(m.shouldRetry('get', 504, 3) === true, 'reintenta GET 504 en el intento tope (3)')
assert(m.shouldRetry('get', 503, 4) === false, 'NO reintenta más allá de MAX_RETRIES (intento 4)')
assert(m.shouldRetry('get', 503, 0) === false, 'NO reintenta con intento < 1')

// ── shouldRetry: no reintentar métodos con efectos secundarios ───────────────
assert(m.shouldRetry('post', 503, 1) === false, 'NO reintenta POST (no idempotente)')
assert(m.shouldRetry('put', 503, 1) === false, 'NO reintenta PUT')
assert(m.shouldRetry('delete', 503, 1) === false, 'NO reintenta DELETE')
assert(m.shouldRetry('patch', 503, 1) === false, 'NO reintenta PATCH')

// ── shouldRetry: no reintentar estados no transitorios ───────────────────────
assert(m.shouldRetry('get', 500, 1) === false, 'NO reintenta 500 (no en la lista)')
assert(m.shouldRetry('get', 404, 1) === false, 'NO reintenta 404')
assert(m.shouldRetry('get', 401, 1) === false, 'NO reintenta 401')
assert(m.shouldRetry('get', undefined, 1) === false, 'NO reintenta sin status (error de red)')

// ── shouldRetry: método ausente cae a GET (default seguro) ───────────────────
assert(m.shouldRetry(undefined, 503, 1) === true, 'método ausente → trata como GET')

// ── backoffDelay: exponencial con tope y jitter determinista ─────────────────
const z = () => 0 // rand=0 → sin jitter, valores base exactos
assert(m.backoffDelay(1, z) === 500, 'backoff intento 1 = 500ms')
assert(m.backoffDelay(2, z) === 1000, 'backoff intento 2 = 1000ms')
assert(m.backoffDelay(3, z) === 2000, 'backoff intento 3 = 2000ms')
assert(m.backoffDelay(10, z) === 4000, 'backoff tope = 4000ms para intentos altos')

// jitter acotado a [0,100)
const d = m.backoffDelay(1, () => 0.999)
assert(d >= 500 && d < 600, 'jitter mantiene el delay dentro de [base, base+100)')

// ── invariantes de configuración ─────────────────────────────────────────────
assert(m.MAX_RETRIES === 3, 'MAX_RETRIES = 3')
assert(JSON.stringify(m.RETRY_STATUSES) === '[502,503,504]', 'RETRY_STATUSES correctos')
assert(JSON.stringify(m.RETRYABLE_METHODS) === '["get"]', 'solo GET es reintentable')

console.log(ok ? '\n✅ TODO OK' : '\n❌ FALLOS')
process.exit(ok ? 0 : 1)
