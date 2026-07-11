/**
 * Pruebas de las funciones puras de parseo del servicio de fronteras.
 * Ejecutar:  node --test src/services/fronterasService.test.mjs
 *
 * Sigue el patrón del repo (ver src/utils/conciliacionMandatos.test.mjs): no hay
 * runner (vitest/jest), así que se lee el fuente, se quitan las líneas `import`
 * (que apuntan a `@/api/client`, no resoluble aquí) y los `export`, y se evalúa.
 * Las funciones `api` (getFronteraMeasurements, etc.) referencian `api` sólo al
 * llamarse; como estas pruebas no las invocan, no hace falta stub del cliente.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'fronterasService.js'), 'utf8')
src = src
  .split('\n')
  .filter((l) => !/^\s*import\s/.test(l))          // quitar imports (api)
  .join('\n')
  .replace(/export default[\s\S]*$/m, '')          // quitar export default (usa `api`)
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ')

const mod = new Function(src + `
return {
  FUENTE_META, normalizarFuente, metaFuente, normalizarTipo, esRespuestaVacia,
  parseRegistro, parseUltimasMediciones, parseHistorico,
  formatMedicionValor, formatMedicionFecha,
};`)()

const {
  normalizarFuente, metaFuente, normalizarTipo, esRespuestaVacia,
  parseRegistro, parseUltimasMediciones, parseHistorico, formatMedicionValor,
} = mod

// ── Normalización de fuente (XM / SIDER / Manual) ──────────────────────────────
test('normalizarFuente mapea a las claves canónicas', () => {
  assert.equal(normalizarFuente('xm'), 'XM')
  assert.equal(normalizarFuente(' XM '), 'XM')
  assert.equal(normalizarFuente('SIDER'), 'SIDER')
  assert.equal(normalizarFuente('manual'), 'MANUAL')
  // Desconocido / ausente → MANUAL (cargado a mano).
  assert.equal(normalizarFuente(null), 'MANUAL')
  assert.equal(normalizarFuente('otra-cosa'), 'MANUAL')
  assert.equal(metaFuente('xm').severity, 'info')
  assert.equal(metaFuente('sider').label, 'SIDER')
})

test('normalizarTipo tolera acentos y prefijos', () => {
  assert.equal(normalizarTipo('Generación'), 'generacion')
  assert.equal(normalizarTipo('GEN'), 'generacion')
  assert.equal(normalizarTipo('Consumo'), 'consumo')
  assert.equal(normalizarTipo('consumo_auxiliar'), 'consumo')
  assert.equal(normalizarTipo(null), null)
})

// ── Escenario "LiquidacionXMDato vacía" (sin datos) ────────────────────────────
test('esRespuestaVacia detecta las variantes de respuesta sin datos', () => {
  assert.equal(esRespuestaVacia(null), true)
  assert.equal(esRespuestaVacia([]), true)
  assert.equal(esRespuestaVacia({}), true)
  assert.equal(esRespuestaVacia({ detail: 'LiquidacionXMDato vacía' }), true)
  assert.equal(esRespuestaVacia({ ultima: null, recientes: [] }), true)
  // Con datos reales → false.
  assert.equal(esRespuestaVacia({ ultima: { valor_mwh: 12.3 } }), false)
})

test('parseUltimasMediciones devuelve disponible:false ante LiquidacionXMDato vacía', () => {
  const res = parseUltimasMediciones({ detail: 'LiquidacionXMDato vacía' })
  assert.equal(res.disponible, false)
  assert.equal(res.ultima, null)
  assert.deepEqual(res.recientes, [])
})

// ── Parseo de registros XM / SIDER / Manual ────────────────────────────────────
test('parseRegistro normaliza valor, tipo y fuente XM', () => {
  const r = parseRegistro({ valor_mwh: 45.678, tipo: 'generacion', fuente: 'XM', fecha_registro: '2026-07-01T00:00:00Z' })
  assert.equal(r.valorMwh, 45.678)
  assert.equal(r.valorKwh, 45678)
  assert.equal(r.tipo, 'generacion')
  assert.equal(r.tipoLabel, 'Generación')
  assert.equal(r.fuente, 'XM')
  assert.equal(r.fuenteSeverity, 'info')
  assert.equal(r.fecha, '2026-07-01T00:00:00Z')
})

test('parseRegistro descarta registros sin valor numérico', () => {
  assert.equal(parseRegistro({ tipo: 'consumo', fuente: 'SIDER' }), null)
  assert.equal(parseRegistro(null), null)
})

test('parseUltimasMediciones ordena recientes por fecha desc y elige la última', () => {
  const raw = {
    recientes: [
      { valor_mwh: 10, tipo: 'generacion', fuente: 'XM', fecha_registro: '2026-07-01' },
      { valor_mwh: 20, tipo: 'generacion', fuente: 'SIDER', fecha_registro: '2026-07-03' },
      { valor_mwh: 15, tipo: 'generacion', fuente: 'MANUAL', fecha_registro: '2026-07-02' },
    ],
  }
  const res = parseUltimasMediciones(raw)
  assert.equal(res.disponible, true)
  assert.equal(res.recientes.length, 3)
  assert.equal(res.recientes[0].fecha, '2026-07-03')   // más reciente primero
  assert.equal(res.ultima.valorMwh, 20)                // última = más reciente
  assert.equal(res.ultima.fuente, 'SIDER')
})

// ── Histórico → series de generación / consumo ─────────────────────────────────
test('parseHistorico separa generación y consumo, orden ascendente', () => {
  const raw = {
    registros: [
      { valor_mwh: 5, tipo: 'consumo', fuente: 'XM', fecha_registro: '2026-07-02' },
      { valor_mwh: 30, tipo: 'generacion', fuente: 'XM', fecha_registro: '2026-07-02' },
      { valor_mwh: 28, tipo: 'generacion', fuente: 'XM', fecha_registro: '2026-07-01' },
    ],
  }
  const h = parseHistorico(raw)
  assert.equal(h.generacion.length, 2)
  assert.equal(h.consumo.length, 1)
  assert.equal(h.generacion[0].fecha, '2026-07-01')   // ascendente
  assert.equal(h.generacion[1].valorMwh, 30)
})

test('parseHistorico vacío ante sin datos', () => {
  assert.deepEqual(parseHistorico(null), { generacion: [], consumo: [] })
  assert.deepEqual(parseHistorico({ detail: 'LiquidacionXMDato vacía' }), { generacion: [], consumo: [] })
})

// ── Formateo de valor (MWh / kWh) ──────────────────────────────────────────────
test('formatMedicionValor degrada a kWh para valores pequeños', () => {
  assert.equal(formatMedicionValor(null), '—')
  assert.equal(formatMedicionValor('x'), '—')
  assert.match(formatMedicionValor(45.678), /MWh/)
  assert.match(formatMedicionValor(0.5), /kWh/)   // 500 kWh
})
