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

test('cellThreats detecta payloads ejecutables reales', () => {
  assert.ok(FV.cellThreats('<img src=x onerror=alert(1)>').some((t) => t.code === 'EVENT_HANDLER'))
  assert.ok(FV.cellThreats('<a href="javascript:alert(1)">x</a>').some((t) => t.code === 'JS_PROTOCOL'))
})

// REGRESIÓN — el escaneo bloqueaba el archivo ENTERO (aborta la conciliación)
// por contenido corriente de un Excel contable. Nada de esto es un ataque:
// las fórmulas son amenaza al EXPORTAR, no al importar, y el marcado suelto se
// neutraliza al pintar (escapeHtml), no rechazando el archivo del usuario.
test('cellThreats NO bloquea contenido legítimo de un Excel contable', () => {
  const legitimos = [
    '+57 300 123 4567',   // teléfono colombiano
    '+573001234567',
    '@hillary',           // handle
    '=SUM(A1:A5)',        // fórmula real de la hoja
    '=1+1',
    'Big Data: análisis', // "data:" en español
    'metadata: v2',
    'Bodega <norte>',     // marcado suelto, inofensivo
    'once=11 unidades',   // matcheaba \bon\w+=
    'pago online = transferencia',
    '-1500.50',
    'Bancolombia',
  ]
  for (const v of legitimos) {
    assert.deepEqual(FV.cellThreats(v), [], `no debe bloquear: ${v}`)
  }
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

// El dato importado se CONSERVA: si el usuario concilia un teléfono "+57 300…",
// ese debe seguir siendo el valor. Antes se le anteponía un apóstrofo (y se le
// quitaba el marcado), corrompiendo silenciosamente lo que se conciliaba.
test('sanitizeRows normaliza sin reescribir el dato ni mutar la entrada', () => {
  const input = [['<b>ACME</b>', '=SUM(A1:A5)', '+57 300 123 4567', 500]]
  const out = FV.sanitizeRows(input)
  assert.equal(out[0][0], '<b>ACME</b>')
  assert.equal(out[0][1], '=SUM(A1:A5)')
  assert.equal(out[0][2], '+57 300 123 4567')
  assert.equal(out[0][3], 500)
  assert.equal(input[0][0], '<b>ACME</b>') // original intacto
})

test('sanitizeRows sí quita caracteres de control', () => {
  assert.equal(FV.sanitizeRows([['ACME\u0000 S.A.']])[0][0], 'ACME S.A.')
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
