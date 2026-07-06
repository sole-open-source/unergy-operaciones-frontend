/**
 * Pruebas del sanitizador de inyección de fórmulas en Excel/CSV.
 * Ejecutar:  node --test src/utils/excelSanitizer.test.mjs
 *
 * Sigue el patrón del repo (ver financialCalculations.test.mjs): no hay runner
 * (vitest/jest), así que se lee el fuente, se quitan los `export` y se evalúa.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'excelSanitizer.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')
const { sanitizeCell } = new Function(src + '\nreturn { sanitizeCell };')()

test('antepone apóstrofo a los caracteres de fórmula', () => {
  assert.equal(sanitizeCell('=1+1'), "'=1+1")
  assert.equal(sanitizeCell('+1+1'), "'+1+1")
  assert.equal(sanitizeCell('-1+1'), "'-1+1")
  assert.equal(sanitizeCell('@SUM(A1)'), "'@SUM(A1)")
  assert.equal(sanitizeCell('=cmd|/c calc'), "'=cmd|/c calc")
})

test('deja intacto el texto normal', () => {
  assert.equal(sanitizeCell('Minigranja Solar Baraya'), 'Minigranja Solar Baraya')
  assert.equal(sanitizeCell('MGS 0012 La Reserva'), 'MGS 0012 La Reserva')
  assert.equal(sanitizeCell(''), '')
  assert.equal(sanitizeCell('a=b'), 'a=b') // el disparador solo cuenta al inicio
})

test('no altera valores no-string (preserva tipo/formato)', () => {
  assert.equal(sanitizeCell(100), 100)
  assert.equal(sanitizeCell(-5.5), -5.5)
  assert.equal(sanitizeCell(0), 0)
  assert.equal(sanitizeCell(null), null)
  assert.equal(sanitizeCell(undefined), undefined)
  const d = new Date(2026, 0, 1)
  assert.equal(sanitizeCell(d), d)
})
