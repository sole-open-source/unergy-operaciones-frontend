/**
 * Pruebas de los esquemas Zod (financial / mandato / client).
 * Ejecutar:  node --test src/utils/schemas/schemas.test.mjs
 *
 * Se inyecta zod REAL y el sanitizer real (su núcleo determinista), así se
 * prueba la validación + auto-saneo tal como corre en la app.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadModule } from '../_esmLoader.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const utils = join(here, '..')

const sanitizer = loadModule(join(utils, 'sanitizer.js'), { DOMPurify: undefined })
const { sanitizeString } = sanitizer

const mandato = loadModule(join(here, 'mandatoSchemas.js'), { z, sanitizeString })
const financial = loadModule(join(here, 'financialSchemas.js'), {
  z,
  sanitizeString,
  mandatoSchema: mandato.mandatoSchema,
})
const client = loadModule(join(here, 'clientSchemas.js'), { z, sanitizeString })

// ── Financial: IPC ─────────────────────────────────────────────────────────
test('ipcTasaSchema acepta datos válidos y sanea la fuente', () => {
  const r = financial.ipcTasaSchema.safeParse({ año: 2024, tasa: 0.092, fuente: '<b>DANE</b>' })
  assert.ok(r.success, JSON.stringify(r.error?.issues))
  assert.equal(r.data.fuente, 'DANE')
})

test('ipcTasaSchema rechaza tasa negativa', () => {
  const r = financial.ipcTasaSchema.safeParse({ año: 2024, tasa: -0.1 })
  assert.ok(!r.success)
})

test('ipcTasaSchema rechaza año fuera de rango', () => {
  assert.ok(!financial.ipcTasaSchema.safeParse({ año: 1800, tasa: 0.05 }).success)
})

// ── Financial: Arriendos ────────────────────────────────────────────────────
test('arriendoSchema rechaza valor_base negativo', () => {
  const r = financial.arriendoSchema.safeParse({ periodo: '2024-05', valor_base: -1 })
  assert.ok(!r.success)
})

test('arriendoSchema rechaza período mal formado', () => {
  assert.ok(!financial.arriendoSchema.safeParse({ periodo: '2024/5', valor_base: 100 }).success)
})

// ── Financial: Costos ───────────────────────────────────────────────────────
test('costoSchema rechaza monto no positivo y sanea tipo_accion', () => {
  assert.ok(!financial.costoSchema.safeParse({ monto: 0, fecha: '2024-01-01', tipo_accion: 'x' }).success)
  const ok = financial.costoSchema.safeParse({ monto: 10, fecha: '2024-01-01', tipo_accion: '<i>pago</i>' })
  assert.ok(ok.success, JSON.stringify(ok.error?.issues))
  assert.equal(ok.data.tipo_accion, 'pago')
})

// ── Mandato ──────────────────────────────────────────────────────────────────
test('mandatoSchema valida cmu no negativo e inversionista', () => {
  assert.ok(mandato.mandatoSchema.safeParse({ periodo: '2024-05', cmu: 1000, inversionista_id: 3 }).success)
  assert.ok(!mandato.mandatoSchema.safeParse({ periodo: '2024-05', cmu: -1, inversionista_id: 3 }).success)
})

// ── Client ─────────────────────────────────────────────────────────────────
test('clienteSchema sanea razón social con HTML', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: '<script>alert(1)</script>ACME S.A.S' })
  assert.ok(r.success, JSON.stringify(r.error?.issues))
  assert.equal(r.data.razon_social_nombre, 'ACME S.A.S')
})

test('clienteSchema rechaza razón social vacía tras sanear', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: '<script></script>' })
  assert.ok(!r.success)
})

test('clienteSchema rechaza correo inválido', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: 'ACME', correo_electronico: 'no-es-correo' })
  assert.ok(!r.success)
})

test('clienteSchema acepta correo válido', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: 'ACME', correo_electronico: 'a@b.com' })
  assert.ok(r.success, JSON.stringify(r.error?.issues))
})

test('clienteSchema rechaza NIT con letras/símbolos', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: 'ACME', nit_cedula: 'abc$$$' })
  assert.ok(!r.success)
})

test('clienteSchema acepta NIT con puntos y guion', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: 'ACME', nit_cedula: '900.123.456-7' })
  assert.ok(r.success, JSON.stringify(r.error?.issues))
})

test('clienteSchema con passthrough conserva campos no modelados', () => {
  const r = client.clienteSchema.safeParse({ razon_social_nombre: 'ACME', campo_extra: 'x' })
  assert.ok(r.success)
  assert.equal(r.data.campo_extra, 'x')
})

test('sanitizeEmailList filtra correos inválidos y sanea', () => {
  const out = client.sanitizeEmailList('a@b.com; <b>c@d.com</b>, malo')
  assert.deepEqual(out, ['a@b.com', 'c@d.com'])
})

test('validateCliente devuelve estructura sin lanzar', () => {
  const bad = client.validateCliente({ razon_social_nombre: '' })
  assert.equal(bad.success, false)
  assert.ok(Array.isArray(bad.errors) && bad.errors.length > 0)
})
