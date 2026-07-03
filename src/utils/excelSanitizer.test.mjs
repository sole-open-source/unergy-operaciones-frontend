/**
 * Tests del saneador anti-inyección de fórmulas. Se ejecuta con el runner
 * nativo de Node (sin dependencias): `npm test` (equivale a `node --test`, que
 * descubre los `*.test.mjs`) o directo `node src/utils/excelSanitizer.test.mjs`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeCell, sanitizeRow, sanitizeAoa } from './excelSanitizer.js'

test('sanitizeCell neutraliza cada prefijo peligroso', () => {
  for (const p of ['=', '+', '-', '@']) {
    assert.equal(sanitizeCell(`${p}cmd`), `'${p}cmd`)
  }
  assert.equal(sanitizeCell('=CMD|\' /C calc\'!A0'), '\'=CMD|\' /C calc\'!A0')
})

test('sanitizeCell cubre el bypass de TAB/salto de línea antepuesto', () => {
  assert.equal(sanitizeCell('\t=cmd'), '\'\t=cmd')
  assert.equal(sanitizeCell(' =SUM(A1)'), '\' =SUM(A1)')
})

test('sanitizeCell deja intactos los valores seguros', () => {
  assert.equal(sanitizeCell('texto normal'), 'texto normal')
  assert.equal(sanitizeCell('Planta #3'), 'Planta #3')
  assert.equal(sanitizeCell(''), '')
})

test('sanitizeCell no altera tipos no-string', () => {
  assert.equal(sanitizeCell(42), 42)
  assert.equal(sanitizeCell(0), 0)
  assert.equal(sanitizeCell(null), null)
  assert.equal(sanitizeCell(undefined), undefined)
  const d = new Date('2026-01-01')
  assert.equal(sanitizeCell(d), d)
})

test('sanitizeRow sanea valores string y preserva números/nulos', () => {
  const out = sanitizeRow({ nombre: '=HYPERLINK("http://x")', valor: 100, nota: null })
  assert.equal(out.nombre, '\'=HYPERLINK("http://x")')
  assert.equal(out.valor, 100)
  assert.equal(out.nota, null)
})

test('sanitizeRow no muta el objeto original', () => {
  const orig = { a: '=evil' }
  sanitizeRow(orig)
  assert.equal(orig.a, '=evil')
})

test('sanitizeAoa sanea celdas string y preserva números', () => {
  const out = sanitizeAoa([
    ['Encabezado', 'Valor'],
    ['=cmd', 3.14],
    ['Planta', '+DDE'],
  ])
  assert.deepEqual(out, [
    ['Encabezado', 'Valor'],
    ['\'=cmd', 3.14],
    ['Planta', '\'+DDE'],
  ])
})

test('sanitizeAoa preserva huecos de arrays esparcidos (aoa[r][c] = v)', () => {
  const aoa = []
  aoa[0] = []
  aoa[0][0] = 'Título'
  aoa[2] = []
  aoa[2][1] = '=evil'
  const out = sanitizeAoa(aoa)
  assert.equal(out[0][0], 'Título')
  assert.equal(out[2][1], '\'=evil')
  assert.equal(1 in out, false) // el hueco de la fila 1 se conserva
})

test('helpers son defensivos ante entradas no-array/no-objeto', () => {
  assert.equal(sanitizeAoa(null), null)
  assert.equal(sanitizeRow(null), null)
  assert.equal(sanitizeRow('x'), 'x')
})
