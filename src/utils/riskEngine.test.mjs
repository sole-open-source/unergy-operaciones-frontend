/**
 * Pruebas del motor de Riesgo Vivo (garantías × exposición XM).
 * Ejecutar:  node --test src/utils/riskEngine.test.mjs
 *
 * Sigue el patrón del repo (ver financialCalculations.test.mjs): no hay runner
 * (vitest/jest), así que se lee el fuente, se quitan los `export`/`import` y se
 * evalúa. riskEngine importa de financialCalculations → se concatenan ambos.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const leer = (f) => fs.readFileSync(join(here, f), 'utf8')

const src = [leer('financialCalculations.js'), leer('riskEngine.js')]
  .join('\n')
  .replace(/^import .*$/gm, '')                     // el import se resuelve concatenando
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ')

const api = new Function(src + `
return {
  calculateRisk, saldoEfectivoGarantia, saldoVivoDesdeMovimientos, nivelPorCobertura,
  agruparGarantiasPorProyecto, alertasAccionables, calculateExposure, diasHastaVencimiento,
  formatFechaVencimiento, NIVEL, TIPO_ALERTA, DIAS_VENCIMIENTO_PROXIMO, ESTADOS_QUE_RESPALDAN,
};`)()

const HOY = new Date(2026, 6, 14)   // 2026-07-14, fecha fija → pruebas deterministas

/** Fecha "YYYY-MM-DD" a N días de HOY. */
function enDias(n) {
  const d = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const garantia = (over = {}) => ({
  id: 1, proyecto_id: 1, proyecto_nombre: 'Minigranja El Son',
  tipo: 'cuenta_custodia', estado: 'vigente',
  valor_cop: 100_000_000, fecha_vencimiento: enDias(365),
  ...over,
})

/** Panel de /liquidaciones/resumen-panel con exposición (grupo comercialización). */
const panel = (proyecto_id, comercializacion, over = {}) => ({
  proyecto_id, proyecto: `Proyecto ${proyecto_id}`, liquidacion_id: 10 + proyecto_id,
  ingresos_cop: 500_000_000, costos_cop: comercializacion,
  inversionistas: [{ cliente_nombre: 'Inv A', grupos_totales: { ingresos: 500_000_000, comercializacion, costos: 0, facturas: 0 } }],
  ...over,
})

// ── calculateExposure: de dónde sale la exposición ───────────────────────────

test('calculateExposure: suma el grupo de comercialización de todos los inversionistas', () => {
  const p = {
    inversionistas: [
      { grupos_totales: { comercializacion: 30_000_000, costos: 9_000_000, facturas: 1_000_000 } },
      { grupos_totales: { comercializacion: 20_000_000, costos: 5_000_000, facturas: 0 } },
    ],
    costos_cop: 65_000_000,
  }
  // Solo comercialización (50 M). OPEX y facturas se pagan a terceros, no a XM.
  assert.equal(api.calculateExposure(p), 50_000_000)
})

test('calculateExposure: comercialización negativa → se toma su magnitud', () => {
  const p = { inversionistas: [{ grupos_totales: { comercializacion: -40_000_000 } }] }
  assert.equal(api.calculateExposure(p), 40_000_000)
})

test('calculateExposure: sin desglose → cae a costos_cop (conservador)', () => {
  assert.equal(api.calculateExposure({ costos_cop: 12_000_000, inversionistas: [] }), 12_000_000)
})

test('calculateExposure: panel nulo / vacío → 0', () => {
  assert.equal(api.calculateExposure(null), 0)
  assert.equal(api.calculateExposure({}), 0)
})

// ── Saldo efectivo de la garantía ────────────────────────────────────────────

test('saldoEfectivoGarantia: vigente y sin vencer → su valor', () => {
  assert.equal(api.saldoEfectivoGarantia(garantia(), HOY), 100_000_000)
})

test('saldoEfectivoGarantia: estados que no respaldan → 0', () => {
  for (const estado of ['vencida', 'liberada', 'en_proceso']) {
    assert.equal(api.saldoEfectivoGarantia(garantia({ estado }), HOY), 0, estado)
  }
  // En renovación sí respalda: sigue constituida.
  assert.equal(api.saldoEfectivoGarantia(garantia({ estado: 'en_renovacion' }), HOY), 100_000_000)
})

test('saldoEfectivoGarantia: fecha vencida → 0 aunque el estado siga "vigente"', () => {
  const vencida = garantia({ estado: 'vigente', fecha_vencimiento: enDias(-1) })
  assert.equal(api.saldoEfectivoGarantia(vencida, HOY), 0)
})

test('saldoEfectivoGarantia: vence HOY todavía respalda', () => {
  assert.equal(api.saldoEfectivoGarantia(garantia({ fecha_vencimiento: enDias(0) }), HOY), 100_000_000)
})

// ── Saldo vivo (movimientos aplicados) ──────────────────────────────────────

test('saldoEfectivoGarantia: con saldo_vivo_cop lo usa, NO valor_cop (una ejecución XM baja la cobertura)', () => {
  const ejecutada = garantia({ saldo_vivo_cop: 30_000_000 })   // valor_cop sigue en 100M
  assert.equal(api.saldoEfectivoGarantia(ejecutada, HOY), 30_000_000)
})

test('saldoEfectivoGarantia: saldo_vivo_cop = 0 es 0, no cae a valor_cop (no esconder críticos)', () => {
  assert.equal(api.saldoEfectivoGarantia(garantia({ saldo_vivo_cop: 0 }), HOY), 0)
})

test('saldoEfectivoGarantia: saldo_vivo_cop negativo → 0 (no restar cobertura a otros proyectos)', () => {
  assert.equal(api.saldoEfectivoGarantia(garantia({ saldo_vivo_cop: -5_000_000 }), HOY), 0)
})

test('saldoEfectivoGarantia: sin saldo_vivo_cop cae a valor_cop (garantía sin movimientos)', () => {
  assert.equal(api.saldoEfectivoGarantia(garantia({ saldo_vivo_cop: null }), HOY), 100_000_000)
  assert.equal(api.saldoEfectivoGarantia(garantia({ saldo_vivo_cop: 'no-num' }), HOY), 100_000_000)
})

test('saldoVivoDesdeMovimientos: toma el saldo del ÚLTIMO movimiento (fecha desc, id desc como el backend)', () => {
  const movs = [
    { id: 1, fecha: '2026-07-01', saldo_posterior_cop: 80_000_000 },
    { id: 3, fecha: '2026-07-10', saldo_posterior_cop: 30_000_000 },
    { id: 2, fecha: '2026-07-05', saldo_posterior_cop: 55_000_000 },
  ]
  assert.equal(api.saldoVivoDesdeMovimientos(movs), 30_000_000)
  // Empate de fecha → decide el id más alto (mismo criterio del backend al crear).
  const empate = [
    { id: 7, fecha: '2026-07-10', saldo_posterior_cop: 10_000_000 },
    { id: 9, fecha: '2026-07-10', saldo_posterior_cop: 5_000_000 },
  ]
  assert.equal(api.saldoVivoDesdeMovimientos(empate), 5_000_000)
})

test('saldoVivoDesdeMovimientos: sin movimientos con saldo → null (el motor usará valor_cop)', () => {
  assert.equal(api.saldoVivoDesdeMovimientos([]), null)
  assert.equal(api.saldoVivoDesdeMovimientos(null), null)
  assert.equal(api.saldoVivoDesdeMovimientos([{ id: 1, fecha: '2026-07-01', saldo_posterior_cop: null }]), null)
})

test('calculateRisk: la ejecución de XM aflora el CRÍTICO que valor_cop escondía', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ saldo_vivo_cop: 40_000_000 })],   // constituida 100M, ejecutada a 40M
    paneles: [panel(1, 90_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.saldo_efectivo_cop, 40_000_000)
  assert.equal(p.nivel, api.NIVEL.CRITICO)                   // 44 % < 80 %
  assert.equal(p.deficit_cop, 50_000_000)
  assert.equal(p.valor_garantias_cop, 100_000_000)           // el nominal constituido se sigue mostrando
})

// ── Umbrales del ratio ───────────────────────────────────────────────────────

test('nivelPorCobertura: umbrales 80 / 100', () => {
  assert.equal(api.nivelPorCobertura(79.9), api.NIVEL.CRITICO)
  assert.equal(api.nivelPorCobertura(80), api.NIVEL.ADVERTENCIA)     // 80–100 → advertencia
  assert.equal(api.nivelPorCobertura(100), api.NIVEL.ADVERTENCIA)    // exacto: cubre sin colchón
  assert.equal(api.nivelPorCobertura(100.1), api.NIVEL.SALUDABLE)
  assert.equal(api.nivelPorCobertura(null), api.NIVEL.SALUDABLE)     // sin exposición → sin riesgo
})

// ── Casos centrales del plan de pruebas ──────────────────────────────────────

test('Caso 1 — Garantía > Exposición: saludable, sin déficit ni alerta', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ valor_cop: 100_000_000 })],
    paneles: [panel(1, 50_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.cobertura_pct, 200)
  assert.equal(p.nivel, api.NIVEL.SALUDABLE)
  assert.equal(p.deficit_cop, 0)
  assert.equal(p.sin_garantia, false)
  assert.equal(r.alertas.length, 0)
  assert.equal(r.totales.cobertura_global_pct, 200)
})

test('Caso 2 — Garantía < Exposición: crítico, con déficit y alerta de cobertura', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ valor_cop: 20_000_000 })],
    paneles: [panel(1, 100_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.cobertura_pct, 20)
  assert.equal(p.nivel, api.NIVEL.CRITICO)
  assert.equal(p.deficit_cop, 80_000_000)
  assert.equal(r.totales.criticos, 1)

  const alerta = r.alertas.find(a => a.tipo === api.TIPO_ALERTA.COBERTURA)
  assert.equal(alerta.nivel, api.NIVEL.CRITICO)
  assert.equal(alerta.proyecto_id, 1)
})

test('Caso 2b — cobertura entre 80 % y 100 % → advertencia (cubre, sin colchón)', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ valor_cop: 90_000_000 })],
    paneles: [panel(1, 100_000_000)],
    hoy: HOY,
  })
  assert.equal(r.proyectos[0].nivel, api.NIVEL.ADVERTENCIA)
  assert.equal(r.proyectos[0].deficit_cop, 10_000_000)
  assert.equal(r.alertas.length, 1)
})

test('Caso 3 — Garantía vencida: no respalda → 0 % y crítico', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ valor_cop: 500_000_000, fecha_vencimiento: enDias(-10) })],
    paneles: [panel(1, 100_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.saldo_efectivo_cop, 0)
  assert.equal(p.cobertura_pct, 0)
  assert.equal(p.nivel, api.NIVEL.CRITICO)
  assert.equal(p.sin_garantia, true)
  assert.equal(p.deficit_cop, 100_000_000)
  // Ya venció: no es un "vencimiento próximo", es un hueco abierto.
  assert.equal(p.vencimiento_proximo, false)
  assert.equal(r.alertas.filter(a => a.tipo === api.TIPO_ALERTA.VENCIMIENTO_PROXIMO).length, 0)
})

test('Caso 4 — Proyecto sin garantías: exposición descubierta → crítico', () => {
  const r = api.calculateRisk({ garantias: [], paneles: [panel(7, 30_000_000)], hoy: HOY })
  const p = r.proyectos[0]
  assert.equal(p.proyecto_id, 7)
  assert.equal(p.saldo_efectivo_cop, 0)
  assert.equal(p.cobertura_pct, 0)
  assert.equal(p.nivel, api.NIVEL.CRITICO)
  assert.equal(p.sin_garantia, true)
  assert.equal(p.garantias.length, 0)
  assert.match(r.alertas[0].mensaje, /sin garantía/i)
})

// ── Vencimiento próximo (plan de pruebas #3: garantía a 15 días) ─────────────

test('Vencimiento a 15 días → alerta VENCIMIENTO_PROXIMO', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ valor_cop: 200_000_000, fecha_vencimiento: enDias(15) })],
    paneles: [panel(1, 50_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.dias_para_vencimiento, 15)
  assert.equal(p.vencimiento_proximo, true)
  assert.equal(p.nivel, api.NIVEL.SALUDABLE)   // la cobertura está bien; lo que urge es renovar
  assert.equal(r.totales.por_vencer, 1)

  const alerta = r.alertas.find(a => a.tipo === api.TIPO_ALERTA.VENCIMIENTO_PROXIMO)
  assert.equal(alerta.dias_para_vencimiento, 15)
  // Aunque el nivel sea saludable, un vencimiento próximo SIEMPRE es accionable.
  assert.equal(api.alertasAccionables(r.alertas).length, 1)
})

test('Vencimiento a 45 días → todavía no alerta (ventana de 30)', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ fecha_vencimiento: enDias(45) })],
    paneles: [panel(1, 10_000_000)],
    hoy: HOY,
  })
  assert.equal(r.proyectos[0].vencimiento_proximo, false)
  assert.equal(r.alertas.length, 0)
})

test('El vencimiento reportado es el de la garantía activa que vence PRIMERO', () => {
  const r = api.calculateRisk({
    garantias: [
      garantia({ id: 1, valor_cop: 60_000_000, fecha_vencimiento: enDias(200) }),
      garantia({ id: 2, valor_cop: 40_000_000, fecha_vencimiento: enDias(10) }),
    ],
    paneles: [panel(1, 50_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.saldo_efectivo_cop, 100_000_000)   // varias garantías suman
  assert.equal(p.dias_para_vencimiento, 10)
  assert.equal(p.vencimiento_proximo, true)
})

test('Una garantía vencida no arrastra el vencimiento del grupo', () => {
  const r = api.calculateRisk({
    garantias: [
      garantia({ id: 1, valor_cop: 80_000_000, fecha_vencimiento: enDias(-5) }),  // ya venció → no aporta
      garantia({ id: 2, valor_cop: 90_000_000, fecha_vencimiento: enDias(120) }),
    ],
    paneles: [panel(1, 50_000_000)],
    hoy: HOY,
  })
  const p = r.proyectos[0]
  assert.equal(p.saldo_efectivo_cop, 90_000_000)      // solo la vigente
  assert.equal(p.valor_garantias_cop, 170_000_000)    // el valor nominal sí las suma todas
  assert.equal(p.dias_para_vencimiento, 120)
  assert.equal(p.vencimiento_proximo, false)
})

// ── Bordes ───────────────────────────────────────────────────────────────────

test('Proyecto sin exposición: cobertura n/a, saludable, sin dividir por cero', () => {
  const r = api.calculateRisk({ garantias: [garantia()], paneles: [panel(1, 0)], hoy: HOY })
  const p = r.proyectos[0]
  assert.equal(p.exposicion_cop, 0)
  assert.equal(p.cobertura_pct, null)          // n/a, NO 0 % (no hay deuda que cubrir)
  assert.equal(p.nivel, api.NIVEL.SALUDABLE)
  assert.equal(p.deficit_cop, 0)
})

test('Garantía sin panel en el período: aparece, sin exposición, pero avisa vencimiento', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ proyecto_id: 9, fecha_vencimiento: enDias(5) })],
    paneles: [],
    hoy: HOY,
  })
  assert.equal(r.proyectos.length, 1)
  assert.equal(r.proyectos[0].exposicion_cop, 0)
  assert.equal(r.proyectos[0].vencimiento_proximo, true)
  assert.equal(r.alertas[0].tipo, api.TIPO_ALERTA.VENCIMIENTO_PROXIMO)
})

test('Garantía sin proyecto_id se ignora (no hay con qué cruzarla)', () => {
  const r = api.calculateRisk({
    garantias: [garantia({ proyecto_id: null, valor_cop: 999_000_000 })],
    paneles: [panel(1, 10_000_000)],
    hoy: HOY,
  })
  assert.equal(r.proyectos.length, 1)
  assert.equal(r.proyectos[0].saldo_efectivo_cop, 0)   // no la cuenta a favor de nadie
  assert.equal(r.totales.total_garantizado_cop, 0)
})

test('Totales y orden: crítico primero, mayor déficit arriba', () => {
  const r = api.calculateRisk({
    garantias: [
      garantia({ id: 1, proyecto_id: 1, valor_cop: 200_000_000 }),   // saludable
      garantia({ id: 2, proyecto_id: 2, valor_cop: 10_000_000 }),    // crítico, déficit 90 M
      garantia({ id: 3, proyecto_id: 3, valor_cop: 5_000_000 }),     // crítico, déficit 195 M
    ],
    paneles: [panel(1, 100_000_000), panel(2, 100_000_000), panel(3, 200_000_000)],
    hoy: HOY,
  })
  assert.deepEqual(r.proyectos.map(p => p.proyecto_id), [3, 2, 1])
  assert.equal(r.totales.criticos, 2)
  assert.equal(r.totales.saludables, 1)
  assert.equal(r.totales.total_garantizado_cop, 215_000_000)
  assert.equal(r.totales.total_expuesto_cop, 400_000_000)
  assert.equal(r.totales.cobertura_global_pct, 53.75)
})

test('Sin datos: no revienta y devuelve estructura vacía', () => {
  const r = api.calculateRisk()
  assert.deepEqual(r.proyectos, [])
  assert.deepEqual(r.alertas, [])
  assert.equal(r.totales.cobertura_global_pct, null)
  assert.equal(r.totales.total_expuesto_cop, 0)
})

// ── Fechas ───────────────────────────────────────────────────────────────────

test('diasHastaVencimiento: "YYYY-MM-DD" se lee en hora LOCAL (no se corre un día)', () => {
  // new Date('2026-07-14') sería UTC → 2026-07-13 19:00 en Colombia → daría -1.
  assert.equal(api.diasHastaVencimiento('2026-07-14', HOY), 0)
  assert.equal(api.diasHastaVencimiento('2026-07-29', HOY), 15)
  assert.equal(api.diasHastaVencimiento('2026-07-04', HOY), -10)
  assert.equal(api.diasHastaVencimiento(null, HOY), null)
  assert.equal(api.diasHastaVencimiento('no-es-fecha', HOY), null)
})
