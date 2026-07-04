/**
 * Pruebas de las funciones puras de cálculo financiero del dashboard mensual.
 * Ejecutar:  node --test src/utils/financialCalculations.test.mjs
 *
 * Sigue el patrón del repo (ver conciliacionMandatos.test.mjs): no hay runner
 * (vitest/jest), así que se lee el fuente, se quitan los `export` y se evalúa.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'financialCalculations.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')
const api = new Function(src + `
return {
  calculatePPARevenue, calculateSpotDifference, calculateSLAFine,
  calculateUnderGeneration, calculateCompliancePct,
  formatCurrency, formatCurrencyCompact, formatMWh,
};`)()

test('calculatePPARevenue: energía × precio', () => {
  assert.equal(api.calculatePPARevenue(100, 250000), 25000000)
})

test('calculatePPARevenue: nulos / cero / negativos → 0', () => {
  assert.equal(api.calculatePPARevenue(null, 250000), 0)
  assert.equal(api.calculatePPARevenue(100, null), 0)
  assert.equal(api.calculatePPARevenue(0, 250000), 0)
  assert.equal(api.calculatePPARevenue(-5, 250000), 0)
})

test('calculateSpotDifference: favorable y desfavorable', () => {
  assert.equal(api.calculateSpotDifference(10, 300000, 250000), 500000)   // spot > ppa
  assert.equal(api.calculateSpotDifference(10, 200000, 250000), -500000)  // spot < ppa
  assert.equal(api.calculateSpotDifference(0, 300000, 250000), 0)
})

test('calculateSLAFine: solo penaliza déficit real', () => {
  assert.equal(api.calculateSLAFine(20, 150000), 3000000)
  assert.equal(api.calculateSLAFine(0, 150000), 0)
  assert.equal(api.calculateSLAFine(-3, 150000), 0)   // excedente no multa
  assert.equal(api.calculateSLAFine(20, null), 0)
})

test('calculateUnderGeneration: gap positivo o cero', () => {
  assert.equal(api.calculateUnderGeneration(80, 100), 20)
  assert.equal(api.calculateUnderGeneration(120, 100), 0)  // superó la meta
  assert.equal(api.calculateUnderGeneration(null, 100), 100)
})

test('calculateCompliancePct: porcentaje y meta cero', () => {
  assert.equal(api.calculateCompliancePct(90, 100), 90)
  assert.equal(api.calculateCompliancePct(100, 100), 100)
  assert.equal(api.calculateCompliancePct(50, 0), null)
})

test('formatCurrency: COP y nulos', () => {
  assert.equal(api.formatCurrency(null), '—')
  assert.equal(api.formatCurrency(NaN), '—')
  assert.match(api.formatCurrency(1234567), /1\.234\.567/)
})

test('formatCurrencyCompact: escalas', () => {
  assert.equal(api.formatCurrencyCompact(1_500_000), '$1.5 M')
  assert.equal(api.formatCurrencyCompact(2_000_000_000), '$2.0 B')
  assert.equal(api.formatCurrencyCompact(-3_000_000), '-$3.0 M')
  assert.equal(api.formatCurrencyCompact(null), '—')
})

test('formatMWh: sufijo y nulos', () => {
  assert.equal(api.formatMWh(null), '—')
  assert.match(api.formatMWh(1234.5), /MWh/)
})
