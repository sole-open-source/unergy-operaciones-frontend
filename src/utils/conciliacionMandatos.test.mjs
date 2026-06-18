/**
 * Prueba mínima del motor de conciliación de costos.
 * Ejecutar:  node src/utils/conciliacionMandatos.test.mjs
 *
 * No hay runner (vitest/jest) en el repo, así que este test evalúa el código
 * fuente del módulo (quitando los `export`, que node no interpreta en .js bajo
 * un package CommonJS) y corre aserciones. Caso central: STRADA vs. ESTRADA.
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'conciliacionMandatos.js'), 'utf8')
src = src.replace(/export const /g, 'const ').replace(/export function /g, 'function ')
const api = new Function(src + '\nreturn { parseAsientos, extractMandate, suggestTag, reconciliar, plantaDesdeEtiqueta, parseIngresos, matchIngresoContab };')()
const { parseAsientos, extractMandate, suggestTag, reconciliar, plantaDesdeEtiqueta, parseIngresos, matchIngresoContab } = api

let ok = true
const assert = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false }

// 1) STRADA / La Reserva — el emparejamiento por palabra completa NO debe sumar Estrada.
const TAG = 'MINIGRANJA SOLAR LA RESERVA'
const details = [
  { asociado: 'STRADA ASOCIADOS S A S', acc: '28151002', accDesc: '', debe: 497333, haber: 0, etiqueta: '', proj: TAG },
  { asociado: 'INVERSIONES ESTRADA ARBELAEZ Y CIA S. EN C.', acc: '28151002', accDesc: '', debe: 2655667, haber: 0, etiqueta: '', proj: TAG },
]
const resStrada = reconciliar({ mandante: 'STRADA ASOCIADOS S.A.S.', vals: { mant: 497333 }, total: 497333 }, details, TAG)
assert(resStrada.sums.mant === 497333, `STRADA: suma mant = ${resStrada.sums.mant} (esperado 497333, NO 3153000)`)
assert(resStrada.lines.length === 1, 'STRADA: solo la línea de STRADA (Estrada excluido)')
assert(resStrada.status === 'ok', `STRADA: status = ${resStrada.status}`)

const resEstrada = reconciliar({ mandante: 'INVERSIONES ESTRADA ARBELAEZ Y CIA S EN C', vals: { mant: 2655667 }, total: 2655667 }, details, TAG)
assert(resEstrada.sums.mant === 2655667, `ESTRADA: suma mant = ${resEstrada.sums.mant} (esperado 2655667)`)

// 2) extractMandate lee mandante/NIT/total del CUERPO del PDF.
const pdf = `CMU12345
en calidad de mandatario, y STRADA ASOCIADOS S.A.S., con NIT. 900.123.456-7, en calidad de mandante, relacionado con el proyecto MINIGRANJA SOLAR LA RESERVA.
MANTENIMIENTO $ 497.333
VALOR A PAGAR $ 497.333`
const m = extractMandate(pdf, 'x-CMU12345.pdf')
assert(m.mandante.includes('STRADA'), `extractMandate mandante = "${m.mandante}"`)
assert(m.nit === '900.123.456-7', `extractMandate nit = "${m.nit}"`)
assert(m.vals.mant === 497333 && m.total === 497333, `extractMandate mant=${m.vals.mant} total=${m.total}`)

// 3) parseAsientos + suggestTag.
const rows = [
  ['Asiento contable', 'Asociado', 'Cuenta', 'Debe', 'Haber', 'Etiqueta', 'Cuenta analitica'],
  ['AS1', 'STRADA ASOCIADOS S A S', '28151002 Mantenimiento', '497333', '0', 'x', TAG],
]
const pa = parseAsientos(rows)
assert(pa.details.length === 1 && pa.tags.includes(TAG), `parseAsientos detalles=${pa.details.length} tags=${JSON.stringify(pa.tags)}`)
assert(suggestTag('La Reserva', pa.tags, {}).tag === TAG, 'suggestTag("La Reserva") -> tag correcto')

// 4) INGRESOS: plantaDesdeEtiqueta normaliza concepto + clasificador + mes.
assert(plantaDesdeEtiqueta('INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL') === 'MINIGRANJA SOLAR URUACO',
  `plantaDesdeEtiqueta INGRESO BRUTO = "${plantaDesdeEtiqueta('INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL')}"`)
assert(plantaDesdeEtiqueta('COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL') === 'MINIGRANJA SOLAR URUACO',
  'plantaDesdeEtiqueta COMERCIALIZACIÓN agrupa igual que INGRESO BRUTO')
assert(plantaDesdeEtiqueta('INGRESO BRUTO BIAC GD NAOS 1 ABRIL 2026 BIA ENERGY') === 'GD NAOS 1',
  `plantaDesdeEtiqueta quita BIAC = "${plantaDesdeEtiqueta('INGRESO BRUTO BIAC GD NAOS 1 ABRIL 2026 BIA ENERGY')}"`)

// 5) parseIngresos: suma neto de 28150505 por (asociado, planta); ignora 28151001 (contra-asiento).
// Debe/Haber como NÚMEROS, igual que los entrega SheetJS al leer el .xlsx.
const ingRows = [
  ['Asiento contable', 'Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
  ['CM/1', '28150505 INGRESO DE ENERGIA', 'RODRIGUEZ VELEZ BEATRIZ', 'INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 0, 3712635.47],
  ['CM/1', '28150505 INGRESO DE ENERGIA', 'RODRIGUEZ VELEZ BEATRIZ', 'COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 273321.72, 0],
  ['CM/1', '28151001 FACTURAS DE COMERCIALIZACION', 'RODRIGUEZ VELEZ BEATRIZ', 'COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 0, 273321.72],
  ['CM/1', '28150501 GANANCIAS POR PARTICIPACION', 'TERPEL ENERGIA S.A.S E.S.P', 'INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 3712635.47, 0],
]
const ing = parseIngresos(ingRows)
const rodri = ing.find((g) => g.asociado.includes('RODRIGUEZ'))
assert(ing.length === 1, `parseIngresos: 1 grupo (TERPEL 28150501 excluido) — fue ${ing.length}`)
assert(rodri && Math.round(Math.abs(rodri.valor_contabilidad)) === 3439314,
  `parseIngresos: neto = ${rodri && Math.round(Math.abs(rodri.valor_contabilidad))} (esperado 3439314, NO 3712635 bruto)`)

// 6) matchIngresoContab: empareja por asociado (palabra completa) + planta (con número).
const grupos = [
  { asociado: 'GD EL REMOLINO 1 S.A.S. E.S.P', planta: 'GD NAOS 1', valor_contabilidad: -58469697 },
  { asociado: 'GD EL REMOLINO 1 S.A.S. E.S.P', planta: 'GD NAOS 2', valor_contabilidad: -56507155 },
  { asociado: 'RODRIGUEZ VELEZ BEATRIZ', planta: 'MINIGRANJA SOLAR URUACO', valor_contabilidad: -3439314 },
]
const mNaos = matchIngresoContab({ mandante: 'GD EL REMOLINO 1 S.A.S. E.S.P.', projName: 'GD NAOS 1' }, grupos)
assert(mNaos && mNaos.planta === 'GD NAOS 1', `matchIngresoContab NAOS 1 (no 2) = "${mNaos && mNaos.planta}"`)
const mUru = matchIngresoContab({ mandante: 'Rodríguez Vélez Beatriz', projName: 'Minigranja Solar Uruaco' }, grupos)
assert(mUru && mUru.planta === 'MINIGRANJA SOLAR URUACO', `matchIngresoContab Uruaco = "${mUru && mUru.planta}"`)

console.log(ok ? '\nTODOS LOS TESTS PASARON' : '\nHAY FALLOS')
process.exit(ok ? 0 : 1)
