/**
 * Prueba mínima de la capa de caché (src/utils/cache.js).
 * Ejecutar:  node src/utils/cache.test.mjs
 *
 * Igual que conciliacionMandatos.test.mjs: no hay runner (vitest/jest) en el
 * repo, así que evaluamos el código fuente quitando los `export` y corremos
 * aserciones contra un localStorage simulado.
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'cache.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')

// localStorage simulado controlable (permite forzar fallos para probar fallback).
function makeStorage({ failOnSet = false } = {}) {
  const map = new Map()
  return {
    get length() { return map.size },
    key(i) { return Array.from(map.keys())[i] ?? null },
    getItem(k) { return map.has(k) ? map.get(k) : null },
    setItem(k, v) { if (failOnSet) throw new Error('QuotaExceeded'); map.set(k, String(v)) },
    removeItem(k) { map.delete(k) },
    _dump() { return map },
  }
}

let ok = true
const assert = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false }

function build() {
  return new Function(
    'localStorage',
    src + '\nreturn { createCacheManager, cache, isExpired, STATIC_TTL, SEMI_STATIC_TTL, PREFIX };'
  )(globalThis.localStorage)
}

// ── 1) set/get básico con persistencia y forma { value, expiresAt } ──────────
globalThis.localStorage = makeStorage()
let { createCacheManager, isExpired, STATIC_TTL, SEMI_STATIC_TTL, PREFIX } = build()
let c = createCacheManager()

c.set('refdata:proyectos', [{ id: 1 }], SEMI_STATIC_TTL)
const hit = c.get('refdata:proyectos')
assert(hit && Array.isArray(hit.value) && hit.value[0].id === 1, 'get devuelve el value guardado')
assert(typeof hit.expiresAt === 'number' && hit.expiresAt > Date.now(), 'la entrada tiene expiresAt futuro')
assert(globalThis.localStorage.getItem(PREFIX + 'refdata:proyectos') != null,
  `se persiste bajo el prefijo ${PREFIX}`)

// ── 2) expiración: TTL negativo => expirada => get auto-elimina ──────────────
c.set('refdata:viejo', { a: 1 }, -1000)
assert(c.get('refdata:viejo') === null, 'entrada expirada devuelve null')
assert(globalThis.localStorage.getItem(PREFIX + 'refdata:viejo') == null,
  'entrada expirada se auto-elimina del storage')

// ── 3) isExpired helper ──────────────────────────────────────────────────────
assert(isExpired(null) === true, 'isExpired(null) === true')
assert(isExpired({ expiresAt: Date.now() - 1 }) === true, 'isExpired(pasado) === true')
assert(isExpired({ expiresAt: Date.now() + 100000 }) === false, 'isExpired(futuro) === false')
assert(isExpired({}) === true, 'isExpired(sin expiresAt) === true')

// ── 4) invalidate puntual ────────────────────────────────────────────────────
c.set('refdata:clientes', [1, 2], SEMI_STATIC_TTL)
c.invalidate('refdata:clientes')
assert(c.get('refdata:clientes') === null, 'invalidate elimina la clave')

// ── 5) invalidatePrefix ──────────────────────────────────────────────────────
c.set('refdata:a', 1, SEMI_STATIC_TTL)
c.set('refdata:b', 2, SEMI_STATIC_TTL)
c.set('http:get:/x', 3, SEMI_STATIC_TTL)
c.invalidatePrefix('refdata:')
assert(c.get('refdata:a') === null && c.get('refdata:b') === null, 'invalidatePrefix borra todas las refdata:')
assert(c.get('http:get:/x') !== null, 'invalidatePrefix NO toca otros prefijos')

// ── 6) clearAll ──────────────────────────────────────────────────────────────
c.clearAll()
assert(c.get('http:get:/x') === null, 'clearAll borra todo el namespace')
assert(globalThis.localStorage.length === 0, 'storage queda vacío tras clearAll')

// ── 7) fallback a memoria cuando localStorage falla ──────────────────────────
globalThis.localStorage = makeStorage({ failOnSet: true })
;({ createCacheManager } = build())
const cm = createCacheManager()
cm.set('refdata:fallback', { ok: true }, SEMI_STATIC_TTL) // setItem lanza → cae a memoria
const fb = cm.get('refdata:fallback')
assert(fb && fb.value.ok === true, 'set/get funcionan vía fallback en memoria cuando localStorage falla')
assert(globalThis.localStorage.length === 0, 'nada se escribió en localStorage roto (se usó memoria)')

// ── 8) constantes TTL razonables ─────────────────────────────────────────────
assert(STATIC_TTL === 24 * 60 * 60 * 1000, 'STATIC_TTL = 24h')
assert(SEMI_STATIC_TTL === 60 * 60 * 1000, 'SEMI_STATIC_TTL = 1h')

console.log(ok ? '\n🎉 Todos los tests de cache pasaron' : '\n💥 Hay tests de cache fallando')
process.exit(ok ? 0 : 1)
