/**
 * Pruebas de la utilidad de validación de seguridad de ZIP (Zip Slip + allowlist).
 * Ejecutar:  node --test src/utils/zipSecurityValidator.test.mjs
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
let src = fs.readFileSync(join(here, 'zipSecurityValidator.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')
const api = new Function(src + `
return { validateZipEntries, getSafeFilePath, DEFAULT_ALLOWED_EXTENSIONS };`)()

// Construye un objeto con la forma pública de JSZip (`.files`): mapa ruta → ZipObject.
function fakeZip(entries) {
  const files = {}
  for (const [name, dir] of entries) files[name] = { name, dir: !!dir }
  return { files }
}

const DOCS = { allowedExtensions: ['pdf', 'jpg', 'jpeg'] }

// ── validateZipEntries ─────────────────────────────────────────────────────────
test('validateZipEntries: acepta extensiones permitidas', () => {
  const zip = fakeZip([['pago_1/cuenta_cobro.pdf'], ['pago_1/factura.jpg']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, true)
  assert.equal(res.errors.length, 0)
})

test('validateZipEntries: rechaza path traversal con ".."', () => {
  const zip = fakeZip([['pago_1/../../../etc/passwd.pdf']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some(e => e.code === 'PATH_TRAVERSAL'))
})

test('validateZipEntries: rechaza ruta absoluta unix', () => {
  const zip = fakeZip([['/etc/passwd.pdf']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some(e => e.code === 'ABSOLUTE_PATH'))
})

test('validateZipEntries: rechaza ruta absoluta windows (drive letter)', () => {
  const zip = fakeZip([['C:\\Windows\\evil.pdf']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some(e => e.code === 'ABSOLUTE_PATH'))
})

test('validateZipEntries: rechaza extensión no permitida (.exe)', () => {
  const zip = fakeZip([['pago_1/cuenta.pdf'], ['pago_1/malware.exe']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some(e => e.code === 'DISALLOWED_EXTENSION' && /exe/.test(e.path)))
})

test('validateZipEntries: rechaza archivo sin extensión', () => {
  const zip = fakeZip([['pago_1/passwd']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, false)
  assert.ok(res.errors.some(e => e.code === 'DISALLOWED_EXTENSION'))
})

test('validateZipEntries: ignora entradas de directorio', () => {
  const zip = fakeZip([['pago_1/', true], ['pago_1/cuenta.pdf']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, true)
})

test('validateZipEntries: ignora metadatos de SO (__MACOSX, .DS_Store, Thumbs.db)', () => {
  const zip = fakeZip([
    ['__MACOSX/pago_1/._cuenta.pdf'],
    ['pago_1/.DS_Store'],
    ['pago_1/Thumbs.db'],
    ['pago_1/cuenta.pdf'],
  ])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, true, JSON.stringify(res.errors))
})

test('validateZipEntries: respeta allowlist personalizada', () => {
  const zip = fakeZip([['data.csv'], ['libro.xlsx']])
  const res = api.validateZipEntries(zip, { allowedExtensions: ['csv', 'xlsx'] })
  assert.equal(res.valid, true)
})

test('validateZipEntries: usa DEFAULT_ALLOWED_EXTENSIONS (csv/xls/xlsx) sin opciones', () => {
  assert.deepEqual(api.DEFAULT_ALLOWED_EXTENSIONS, ['csv', 'xls', 'xlsx'])
  const zip = fakeZip([['reporte.csv']])
  assert.equal(api.validateZipEntries(zip).valid, true)
  const zip2 = fakeZip([['documento.pdf']])
  assert.equal(api.validateZipEntries(zip2).valid, false)
})

test('validateZipEntries: acumula múltiples errores', () => {
  const zip = fakeZip([['../x.pdf'], ['/y.exe'], ['z.bat']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, false)
  assert.ok(res.errors.length >= 3)
})

test('validateZipEntries: la extensión es case-insensitive', () => {
  const zip = fakeZip([['pago_1/CUENTA.PDF']])
  const res = api.validateZipEntries(zip, DOCS)
  assert.equal(res.valid, true)
})

// ── getSafeFilePath ──────────────────────────────────────────────────────────
test('getSafeFilePath: ruta relativa simple no cambia', () => {
  assert.equal(api.getSafeFilePath('a/b/c.pdf'), 'a/b/c.pdf')
})

test('getSafeFilePath: elimina barra inicial (ruta absoluta → relativa)', () => {
  assert.equal(api.getSafeFilePath('/etc/passwd'), 'etc/passwd')
})

test('getSafeFilePath: colapsa segmentos ".." sin escapar de la raíz', () => {
  assert.equal(api.getSafeFilePath('a/../../b.pdf'), 'b.pdf')
  assert.equal(api.getSafeFilePath('../../etc/passwd'), 'etc/passwd')
})

test('getSafeFilePath: elimina "." y normaliza separadores windows + drive', () => {
  assert.equal(api.getSafeFilePath('a/./b.pdf'), 'a/b.pdf')
  assert.equal(api.getSafeFilePath('C:\\Windows\\x.pdf'), 'Windows/x.pdf')
})

test('getSafeFilePath: vacío/nulo → cadena vacía', () => {
  assert.equal(api.getSafeFilePath(''), '')
  assert.equal(api.getSafeFilePath(null), '')
})
