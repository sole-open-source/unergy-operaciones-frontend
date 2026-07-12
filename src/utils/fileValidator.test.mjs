/**
 * Pruebas del validador de contenido de archivos (fileValidator.js).
 * Ejecutar:  node --test src/utils/fileValidator.test.mjs
 *
 * El núcleo (scanRows/sanitizeRows/cellThreats) se prueba puro. La integración
 * con SheetJS se prueba construyendo un workbook real con una celda maliciosa.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadModule } from './_esmLoader.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const sanitizer = loadModule(join(here, 'sanitizer.js'), { DOMPurify: undefined })
const FV = loadModule(join(here, 'fileValidator.js'), {
  XLSX,
  sanitizeString: sanitizer.sanitizeString,
  neutralizeFormulaInjection: sanitizer.neutralizeFormulaInjection,
})

test('cellThreats detecta <script>', () => {
  assert.ok(FV.cellThreats('<script>alert(1)</script>').some((t) => t.code === 'SCRIPT'))
})

test('cellThreats detecta inyección de fórmula pero no números', () => {
  assert.ok(FV.cellThreats('=1+1').some((t) => t.code === 'FORMULA_INJECTION'))
  assert.equal(FV.cellThreats('-1500.50').length, 0)
  assert.equal(FV.cellThreats('Bancolombia').length, 0)
})

test('cellThreats marca protocolos ejecutables pero NO "data:"/"metadata:" (regresión)', () => {
  assert.ok(FV.cellThreats('javascript:alert(1)').some((t) => t.code === 'JS_PROTOCOL'))
  // Texto legítimo de celda que contiene "data:" no debe bloquear el archivo.
  assert.equal(FV.cellThreats('metadata: cláusula 3').length, 0)
  assert.equal(FV.cellThreats('Big Data: informe mensual').length, 0)
})

test('scanRows marca inválida una matriz con payload', () => {
  const res = FV.scanRows([
    ['Planta', 'Inversionista', 'Valor'],
    ['Solar 1', '<img src=x onerror=alert(1)>', 1000],
  ])
  assert.equal(res.is_valid, false)
  assert.ok(res.errors.length >= 1)
  assert.equal(res.errors[0].row, 1)
})

test('scanRows acepta una matriz limpia', () => {
  const res = FV.scanRows([
    ['Planta', 'Valor'],
    ['Solar 1', 1000],
    ['Solar 2', 2000],
  ])
  assert.equal(res.is_valid, true)
})

test('sanitizeRows limpia HTML y neutraliza fórmulas sin mutar', () => {
  const input = [['<b>ACME</b>', '=cmd', 500]]
  const out = FV.sanitizeRows(input)
  assert.equal(out[0][0], 'ACME')
  assert.equal(out[0][1], "'=cmd")
  assert.equal(out[0][2], 500)
  assert.equal(input[0][0], '<b>ACME</b>') // original intacto
})

test('validateExcelBuffer BLOQUEA un Excel con celda maliciosa', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Planta', 'Inversionista', 'Valor'],
    ['Solar 1', '<script>steal()</script>', 1000],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

  const res = FV.validateExcelBuffer(buf)
  assert.equal(res.is_valid, false, 'debe bloquear el archivo malicioso')
  assert.ok(res.errors.some((e) => e.code === 'SCRIPT' || e.code === 'HTML_TAG'))
})

test('validateExcelBuffer acepta un Excel limpio y devuelve datos saneados', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Planta', 'Valor'],
    ['Solar 1', 1000],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

  const res = FV.validateExcelBuffer(buf)
  assert.equal(res.is_valid, true, JSON.stringify(res.errors))
  assert.ok(Array.isArray(res.sanitized_data))
  assert.equal(res.sanitized_data[1][0], 'Solar 1')
})

test('validateExcelBuffer maneja buffer ilegible sin lanzar', () => {
  const res = FV.validateExcelBuffer(new Uint8Array([1, 2, 3]).buffer)
  assert.equal(typeof res.is_valid, 'boolean')
  assert.ok(Array.isArray(res.errors))
})
