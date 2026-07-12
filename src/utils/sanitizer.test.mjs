/**
 * Pruebas del saneador central (sanitizer.js).
 * Ejecutar:  node --test src/utils/sanitizer.test.mjs
 *
 * Se prueba el NÚCLEO determinista (stripHtml y derivados), que es la garantía
 * en todo entorno; DOMPurify solo actúa en navegador y se omite aquí.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadModule } from './_esmLoader.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const S = loadModule(join(here, 'sanitizer.js'), { DOMPurify: undefined })

test('stripHtml elimina etiquetas simples', () => {
  assert.equal(S.stripHtml('<b>hola</b>'), 'hola')
})

test('stripHtml elimina bloques <script> con su contenido', () => {
  assert.equal(S.stripHtml('a<script>alert(1)</script>b'), 'ab')
})

test('sanitizeString neutraliza XSS clásico de imagen', () => {
  const out = S.sanitizeString('<img src=x onerror=alert(1)>')
  assert.ok(!/onerror/i.test(out), `no debe quedar onerror: ${out}`)
  assert.ok(!/</.test(out) || !/>/.test(out))
})

test('sanitizeString expone y elimina payload doble-codificado', () => {
  const out = S.sanitizeString('&lt;script&gt;alert(1)&lt;/script&gt;')
  assert.ok(!/script/i.test(out), `no debe quedar script: ${out}`)
})

test('sanitizeString elimina el protocolo javascript:', () => {
  const out = S.sanitizeString('javascript:alert(1)')
  assert.ok(!/javascript:/i.test(out), out)
})

test('sanitizeString elimina el protocolo vbscript:', () => {
  const out = S.sanitizeString('vbscript:msgbox(1)')
  assert.ok(!/vbscript:/i.test(out), out)
})

test('sanitizeString sigue neutralizando XSS aunque venga en etiqueta abierta', () => {
  // El stripping de etiquetas (no la pasada de texto plano) es la defensa real.
  const out = S.sanitizeString('<img src=x onerror=alert(1)>')
  assert.ok(!/onerror/i.test(out), `no debe quedar onerror: ${out}`)
})

test('sanitizeString PRESERVA texto financiero legítimo (regresión: sin corromper)', () => {
  // Antes, las pasadas de `data:`/`on\w+=` sobre texto plano borraban palabras
  // legítimas. Estos casos DEBEN conservarse intactos.
  assert.equal(S.sanitizeString('Big Data: análisis de cartera'), 'Big Data: análisis de cartera')
  assert.equal(S.sanitizeString('el pago se hará online = transferencia'), 'el pago se hará online = transferencia')
  assert.equal(S.sanitizeString('once=11 unidades'), 'once=11 unidades')
  assert.equal(S.sanitizeString('metadata: cláusula tercera'), 'metadata: cláusula tercera')
})

test('sanitizeString recorta espacios y preserva texto normal', () => {
  assert.equal(S.sanitizeString('  Empresa S.A.S  '), 'Empresa S.A.S')
})

test('sanitizeString con null/undefined devuelve cadena vacía', () => {
  assert.equal(S.sanitizeString(null), '')
  assert.equal(S.sanitizeString(undefined), '')
})

test('sanitizeObject sanea cadenas anidadas y preserva tipos', () => {
  const out = S.sanitizeObject({
    nombre: '<b>ACME</b>',
    valor: 1500,
    activo: true,
    nulo: null,
    hijos: [{ nota: '<script>x</script>ok' }],
  })
  assert.equal(out.nombre, 'ACME')
  assert.equal(out.valor, 1500)
  assert.equal(out.activo, true)
  assert.equal(out.nulo, null)
  assert.equal(out.hijos[0].nota, 'ok')
})

test('sanitizeObject no muta el objeto original', () => {
  const orig = { nombre: '<b>x</b>' }
  S.sanitizeObject(orig)
  assert.equal(orig.nombre, '<b>x</b>')
})

test('neutralizeFormulaInjection antepone apóstrofo a fórmulas', () => {
  assert.equal(S.neutralizeFormulaInjection('=SUM(A1:A2)'), "'=SUM(A1:A2)")
  assert.equal(S.neutralizeFormulaInjection('@cmd'), "'@cmd")
})

test('neutralizeFormulaInjection respeta números (incl. negativos)', () => {
  assert.equal(S.neutralizeFormulaInjection('-1500.50'), '-1500.50')
  assert.equal(S.neutralizeFormulaInjection('1000'), '1000')
})

test('sanitizeFileContent elimina CDATA, DOCTYPE y ENTITY (XXE)', () => {
  const xml = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><a><![CDATA[<script>x</script>]]>ok</a>'
  const out = S.sanitizeFileContent(xml)
  assert.ok(!/DOCTYPE/i.test(out), out)
  assert.ok(!/ENTITY/i.test(out), out)
  assert.ok(!/script/i.test(out), out)
  assert.ok(out.includes('ok'))
})

test('stripHtml elimina caracteres de control y NUL', () => {
  assert.equal(S.stripHtml('a\u0000b\u0007c'), 'abc')
})
