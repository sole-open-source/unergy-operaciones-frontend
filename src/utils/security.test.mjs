/**
 * Pruebas de `isValidZipEntryPath` (mitigación Zip Slip por-entrada) de security.js.
 * Ejecutar:  node --test src/utils/security.test.mjs
 *
 * Sigue el patrón del repo (ver zipSecurityValidator.test.mjs): no hay runner.
 * security.js usa `window` e `import.meta` a nivel de módulo, así que no se puede
 * importar en node; se extrae solo la función pura `isValidZipEntryPath` (el último
 * export del archivo) y se evalúa de forma aislada.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const full = fs.readFileSync(join(here, 'security.js'), 'utf8')
const m = full.match(/export function isValidZipEntryPath[\s\S]*/)
assert.ok(m, 'no se encontró isValidZipEntryPath en security.js')
const isValidZipEntryPath = new Function(
  m[0].replace('export function', 'function') + '\nreturn isValidZipEntryPath;'
)()

// ── Rutas válidas ──────────────────────────────────────────────────────────────
test('acepta ruta relativa simple', () => {
  assert.equal(isValidZipEntryPath('pago_1/cuenta_cobro.pdf'), true)
})

test('acepta ".." interno que no escapa de la raíz (profundidad neta ≥ 0)', () => {
  assert.equal(isValidZipEntryPath('a/b/../c.pdf'), true)
})

test('acepta segmentos "." y barras redundantes', () => {
  assert.equal(isValidZipEntryPath('a/./b//c.pdf'), true)
})

test('normaliza separadores windows', () => {
  assert.equal(isValidZipEntryPath('pago_1\\factura.pdf'), true)
})

// ── Rutas inválidas ──────────────────────────────────────────────────────────────
test('rechaza ruta vacía', () => {
  assert.equal(isValidZipEntryPath(''), false)
})

test('rechaza ruta solo con espacios', () => {
  assert.equal(isValidZipEntryPath('   '), false)
})

test('rechaza valor no-string', () => {
  assert.equal(isValidZipEntryPath(null), false)
  assert.equal(isValidZipEntryPath(undefined), false)
})

test('rechaza ruta absoluta unix', () => {
  assert.equal(isValidZipEntryPath('/etc/passwd'), false)
})

test('rechaza recorrido que escapa de la raíz ("../")', () => {
  assert.equal(isValidZipEntryPath('../../evil.txt'), false)
})

test('rechaza recorrido que escapa tras un subdirectorio', () => {
  assert.equal(isValidZipEntryPath('dir/../../evil.txt'), false)
})
