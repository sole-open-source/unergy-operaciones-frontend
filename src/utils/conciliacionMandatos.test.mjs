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
const api = new Function(src + '\nreturn { parseAsientos, extractMandate, suggestTag, reconciliar, plantaDesdeEtiqueta, parseIngresos, matchIngresoContab, parseMandatoNumber, parseAsientoNumber, normalizarCifra, expandirAbreviaturas };')()
const { parseAsientos, extractMandate, suggestTag, reconciliar, plantaDesdeEtiqueta, parseIngresos, matchIngresoContab, parseMandatoNumber, parseAsientoNumber, normalizarCifra, expandirAbreviaturas } = api

let ok = true
const assert = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false }

// 0) PARSEO NUMÉRICO POR FUENTE — el mandato (PDF) usa formato US (coma=miles,
//    punto=decimal) y el asiento (Odoo) usa formato CO (punto=miles, coma=decimal).
//    Parsearlos igual genera diferencias falsas enormes en la conciliación.
// -- Mandato (US): coma=miles, punto=decimal --
assert(parseMandatoNumber('2,011.51') === 2011.51, `parseMandatoNumber("2,011.51") = ${parseMandatoNumber('2,011.51')} (esperado 2011.51)`)
assert(parseMandatoNumber('129') === 129, `parseMandatoNumber("129") = ${parseMandatoNumber('129')} (esperado 129)`)
assert(parseMandatoNumber('$ 2,011,510.00') === 2011510, `parseMandatoNumber("$ 2,011,510.00") = ${parseMandatoNumber('$ 2,011,510.00')} (esperado 2011510)`)
assert(parseMandatoNumber('497,333') === 497333, `parseMandatoNumber("497,333") = ${parseMandatoNumber('497,333')} (esperado 497333)`)
assert(parseMandatoNumber('0.50') === 0.5, `parseMandatoNumber("0.50") = ${parseMandatoNumber('0.50')} (esperado 0.5)`)
assert(parseMandatoNumber('-1,000.50') === -1000.5, `parseMandatoNumber("-1,000.50") = ${parseMandatoNumber('-1,000.50')} (esperado -1000.5)`)
assert(parseMandatoNumber('') === 0 && parseMandatoNumber(null) === 0 && parseMandatoNumber(undefined) === 0, 'parseMandatoNumber vacío/null/undefined = 0')
assert(parseMandatoNumber(2011.51) === 2011.51, 'parseMandatoNumber(number) pasa directo')
// -- Asiento (CO): punto=miles, coma=decimal --
assert(parseAsientoNumber('2.011,51') === 2011.51, `parseAsientoNumber("2.011,51") = ${parseAsientoNumber('2.011,51')} (esperado 2011.51)`)
assert(parseAsientoNumber('129.413') === 129413, `parseAsientoNumber("129.413") = ${parseAsientoNumber('129.413')} (esperado 129413, son miles)`)
assert(parseAsientoNumber('129') === 129, `parseAsientoNumber("129") = ${parseAsientoNumber('129')} (esperado 129)`)
assert(parseAsientoNumber('$ 1.234.567,89') === 1234567.89, `parseAsientoNumber("$ 1.234.567,89") = ${parseAsientoNumber('$ 1.234.567,89')} (esperado 1234567.89)`)
assert(parseAsientoNumber('-1.000,50') === -1000.5, `parseAsientoNumber("-1.000,50") = ${parseAsientoNumber('-1.000,50')} (esperado -1000.5)`)
assert(parseAsientoNumber('') === 0 && parseAsientoNumber(null) === 0, 'parseAsientoNumber vacío/null = 0')
assert(parseAsientoNumber(2011.51) === 2011.51, 'parseAsientoNumber(number) pasa directo')
// -- Mismo valor, distinta fuente: deben coincidir (diferencia = céntimos, no miles) --
{
  const mv = parseMandatoNumber('2,011.51')   // mandato US
  const av = parseAsientoNumber('2.011,51')   // asiento CO
  assert(Math.abs(mv - av) < 0.001, `mismo valor US vs CO: |${mv} - ${av}| ≈ 0 (no diferencia de miles)`)
}

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
//    Montos en formato US del mandato (coma=miles, punto=decimal).
const pdf = `CMU12345
en calidad de mandatario, y STRADA ASOCIADOS S.A.S., con NIT. 900.123.456-7, en calidad de mandante, relacionado con el proyecto MINIGRANJA SOLAR LA RESERVA.
MANTENIMIENTO $ 497,333.00
VALOR A PAGAR $ 497,333.00`
const m = extractMandate(pdf, 'x-CMU12345.pdf')
assert(m.mandante.includes('STRADA'), `extractMandate mandante = "${m.mandante}"`)
assert(m.nit === '900.123.456-7', `extractMandate nit = "${m.nit}"`)
assert(m.vals.mant === 497333 && m.total === 497333, `extractMandate mant=${m.vals.mant} total=${m.total}`)

// 2b) REGRESIÓN del bug: un mandato con miles en formato US (comas) NO debe
//     producir una diferencia falsa de millones contra un asiento del mismo valor.
{
  const pdfBug = `CMU9999
en calidad de mandatario, y ACME S.A.S., con NIT. 900.000.000-0, en calidad de mandante, relacionado con el proyecto PLANTA DEMO.
MANTENIMIENTO $ 2,011,510.00
VALOR A PAGAR $ 2,011,510.00`
  const mb = extractMandate(pdfBug, 'x-CMU9999.pdf')
  assert(mb.vals.mant === 2011510, `regresión: mandato US 2,011,510.00 = ${mb.vals.mant} (esperado 2011510, NO 2.01)`)
  // Asiento CO con el mismo valor real.
  const asientoRows = [
    ['Asiento contable', 'Asociado', 'Cuenta', 'Debe', 'Haber', 'Etiqueta', 'Cuenta analitica'],
    ['AS9', 'ACME S A S', '28151002 Mantenimiento', '2.011.510,00', '0', 'x', 'PLANTA DEMO'],
  ]
  const { details: db } = parseAsientos(asientoRows)
  const resBug = reconciliar(mb, db, 'PLANTA DEMO')
  assert(Math.round(resBug.sums.mant) === 2011510, `regresión: asiento CO 2.011.510,00 = ${resBug.sums && resBug.sums.mant} (esperado 2011510)`)
  const difMant = resBug.flags.find((f) => f.code === 'DIFERENCIA')
  assert(!difMant, `regresión: NO debe haber DIFERENCIA falsa (fue: ${difMant && difMant.txt})`)
  assert(resBug.status === 'ok', `regresión: status = ${resBug.status} (esperado ok — valores iguales)`)
}

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

// 7) ARRIENDO La Esmeralda (CMU0996) — datos reales del Excel de mayo 2026.
//    Cuenta de costo 28150517, analítica [10038] LA ESMERALDA, mandante Bancolombia.
//    Son 5 contratos; en CADA UNO el mandante (la fiduciaria) aparece con el MISMO
//    importe en débito (costo) y en crédito (contrapartida) → el NETO (debe − haber)
//    se cancela y el arriendo "no aparece" (queda 0). El costo real es la suma de los
//    DÉBITOS: 5 × 368.513,81 = 1.842.569,05 = arriendo del mandato.
//    Además cada contrato lleva un crédito al ARRENDADOR (persona natural), que NO debe
//    sumarse: su asociado no es el mandante y, además, es crédito (no débito).
const ESM = '[10038] LA ESMERALDA'
const BANC = 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA SA SOCIEDAD FIDUCIARIA'
const DEB = 368513.81
const arrendadores = ['EDGARDO JESUS AROCA MENDIOLA', 'DULM DAYAN AROCA GUTIERREZ', 'CARLOS ALBERTO AROCA MINDIOLA']
const arrLineas = []
for (const ct of ['30980', '30976', '30982', '30978', '30974']) {
  arrLineas.push({ asociado: BANC, acc: '28150517', accDesc: 'Costo arriendo', debe: 0, haber: DEB, etiqueta: ct, proj: ESM })
  arrLineas.push({ asociado: BANC, acc: '28150517', accDesc: 'Costo arriendo', debe: DEB, haber: 0, etiqueta: ct, proj: ESM })
}
// Créditos a los arrendadores (personas naturales) en 3 de los contratos.
arrendadores.forEach((p, i) =>
  arrLineas.push({ asociado: p, acc: '28150517', accDesc: 'Costo arriendo', debe: 0, haber: 184256.91, etiqueta: ['30982', '30978', '30974'][i], proj: ESM }))

const resArr = reconciliar({ mandante: BANC, vals: { arr: 1842569 }, total: 1842569 }, arrLineas, ESM)
assert(Math.round(resArr.sums.arr) === 1842569,
  `ESMERALDA arriendo (suma de débitos, 5 contratos) = ${resArr.sums && Math.round(resArr.sums.arr)} (esperado 1842569, NO 0, NO 184257)`)
assert(resArr.lines.every((l) => l.asociado === BANC),
  'ESMERALDA: las líneas conciliadas son solo del mandante (arrendadores excluidos)')
assert(resArr.status === 'ok', `ESMERALDA arriendo: status = ${resArr.status} (esperado ok — reconcilia exacto)`)

// 8) BUG 1 — Póliza y Servicios Públicos: cuentas 28151004/28151007/28151008
//    que antes se ignoraban (ni se sumaban del asiento ni se buscaban en el PDF).
{
  const TAGP = '[10099] PLANTA POLIZA'
  const MANDP = 'ACME S A S'
  const pdfPol = `CMU7001
en calidad de mandatario, y ACME S.A.S., con NIT. 900.111.222-3, en calidad de mandante, relacionado con el proyecto PLANTA POLIZA.
POLIZA TODO RIESGO Y LUCROCESANTE $ 500,000.00
IVA POLIZA $ 95,000.00
SERVICIOS PUBLICOS - CONSUMO DE ENERGIA $ 300,000.00
VALOR A PAGAR $ 895,000.00`
  const mp = extractMandate(pdfPol, 'x-CMU7001.pdf')
  assert(mp.vals.poliza === 500000, `BUG1: PDF poliza = ${mp.vals.poliza} (esperado 500000)`)
  assert(mp.vals.iva_poliza === 95000, `BUG1: PDF iva_poliza = ${mp.vals.iva_poliza} (esperado 95000, NO en poliza)`)
  assert(mp.vals.serv_pub === 300000, `BUG1: PDF serv_pub = ${mp.vals.serv_pub} (esperado 300000)`)
  const polLineas = [
    { asociado: MANDP, acc: '28151004', accDesc: '', debe: 500000, haber: 0, etiqueta: '', proj: TAGP },
    { asociado: MANDP, acc: '28151007', accDesc: '', debe: 95000, haber: 0, etiqueta: '', proj: TAGP },
    { asociado: MANDP, acc: '28151008', accDesc: '', debe: 300000, haber: 0, etiqueta: '', proj: TAGP },
  ]
  const resPol = reconciliar(mp, polLineas, TAGP)
  assert(resPol.sums.poliza === 500000 && resPol.sums.iva_poliza === 95000 && resPol.sums.serv_pub === 300000,
    `BUG1: sums poliza/iva/serv = ${resPol.sums.poliza}/${resPol.sums.iva_poliza}/${resPol.sums.serv_pub}`)
  assert(resPol.status === 'ok', `BUG1: status = ${resPol.status} (esperado ok — Póliza y Serv. Públicos ahora conciliados)`)
}

// 9) BUG 2 — abreviatura "PA" (Patrimonio Autónomo) en el Asociado (caso Nestlé).
//    El asiento abrevia el mandante con "PA"; debe reconocerse igual al mandato
//    que trae el nombre completo "PATRIMONIOS AUTONOMOS...".
{
  assert(expandirAbreviaturas('FIDUCIARIA BANCOLOMBIA PA NESTLE 18254').includes('PATRIMONIOS AUTONOMOS'),
    'BUG2: expandirAbreviaturas expande "PA" -> "PATRIMONIOS AUTONOMOS"')
  // "PARQUE" NO debe expandirse (solo la palabra completa "PA").
  assert(!expandirAbreviaturas('PARQUE INDUSTRIAL').includes('PATRIMONIOS AUTONOMOS'),
    'BUG2: "PARQUE" no se toca (límite de palabra)')
  const TAGN = '[18254] NESTLE'
  const MAND_FULL = 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA S A SOCIEDAD FIDUCIARIA NESTLE'
  const ASO_ABREV = 'FIDUCIARIA BANCOLOMBIA PA NESTLE 18254'
  const nestleLineas = [
    { asociado: ASO_ABREV, acc: '28151002', accDesc: '', debe: 1000000, haber: 0, etiqueta: '', proj: TAGN },
    { asociado: ASO_ABREV, acc: '28151003', accDesc: '', debe: 190000, haber: 0, etiqueta: '', proj: TAGN },
  ]
  const resNestle = reconciliar({ mandante: MAND_FULL, vals: { mant: 1000000, iva_mant: 190000 }, total: 1190000 }, nestleLineas, TAGN)
  assert(resNestle.lines.length === 2, `BUG2: líneas conciliadas = ${resNestle.lines.length} (esperado 2, "PA" reconocido)`)
  assert(resNestle.sums.mant === 1000000 && resNestle.sums.iva_mant === 190000,
    `BUG2: mant/iva = ${resNestle.sums.mant}/${resNestle.sums.iva_mant} pasan de "no registrado" a coincide`)
  assert(resNestle.status === 'ok', `BUG2: status = ${resNestle.status} (esperado ok)`)
}

// 10) BUG 3 — el mandato lista el mismo concepto en dos líneas: se SUMA (no se pisa).
{
  const pdfDup = `CMU7003
en calidad de mandatario, y ACME S.A.S., con NIT. 900.000.000-0, en calidad de mandante, relacionado con el proyecto PLANTA DUP.
ARRIENDO CUENTA DE COBRO $ 79,705.00
ARRIENDO FACTURA ELECTRONICA $ 79,706.00
VALOR A PAGAR $ 159,411.00`
  const md = extractMandate(pdfDup, 'x-CMU7003.pdf')
  // arr_cc y arr_fact son conceptos distintos aquí; el sumar aplica cuando dos
  // líneas caen en el MISMO concepto — se comprueba con dos genéricos "ARRIENDO".
  const pdfDup2 = `CMU7004
en calidad de mandatario, y ACME S.A.S., con NIT. 900.000.000-0, en calidad de mandante, relacionado con el proyecto PLANTA DUP2.
ARRIENDO $ 40,000.00
ARRIENDO $ 39,705.00
VALOR A PAGAR $ 79,705.00`
  const md2 = extractMandate(pdfDup2, 'x-CMU7004.pdf')
  assert(md2.vals.arr === 79705, `BUG3: dos líneas "ARRIENDO" se suman = ${md2.vals.arr} (esperado 79705, NO 39705 pisado)`)
  assert(md.vals.arr_cc === 79705 && md.vals.arr_fact === 79706,
    `BUG3/4: arr_cc/arr_fact = ${md.vals.arr_cc}/${md.vals.arr_fact} (reglas específicas antes de la genérica)`)
}

// 11) BUG 4 — split de arriendo por ETIQUETA del asiento (caso La Reserva).
//     Misma cuenta 28150517, distinta etiqueta: "CC" (Cuenta de Cobro) vs "FACT".
{
  const pdfLR = `CMU1136
en calidad de mandatario, y STRADA ASOCIADOS S.A.S., con NIT. 900.123.456-7, en calidad de mandante, relacionado con el proyecto MINIGRANJA SOLAR LA RESERVA.
ARRIENDO CUENTA DE COBRO $ 79,705.00
ARRIENDO FACTURA ELECTRONICA $ 79,706.00
VALOR A PAGAR $ 159,411.00`
  const mLR = extractMandate(pdfLR, 'x-CMU1136.pdf')
  const TAGLR = 'MINIGRANJA SOLAR LA RESERVA'
  const MANDLR = 'STRADA ASOCIADOS S A S'
  const lrLineas = [
    { asociado: MANDLR, acc: '28150517', accDesc: '', debe: 79705, haber: 0, etiqueta: 'ARRIENDO CC 40100', proj: TAGLR },
    { asociado: MANDLR, acc: '28150517', accDesc: '', debe: 79706, haber: 0, etiqueta: 'ARRIENDO FACT 40101', proj: TAGLR },
  ]
  const resLR = reconciliar(mLR, lrLineas, TAGLR)
  assert(resLR.sums.arr_cc === 79705, `BUG4: arr_cc del asiento = ${resLR.sums.arr_cc} (esperado 79705 por etiqueta CC)`)
  assert(resLR.sums.arr_fact === 79706, `BUG4: arr_fact del asiento = ${resLR.sums.arr_fact} (esperado 79706 por etiqueta FACT)`)
  assert(resLR.sums.arr === undefined, 'BUG4: no queda "arr" genérico cuando la etiqueta reclasifica ambas')
  assert(resLR.status === 'ok', `BUG4: status = ${resLR.status} (esperado ok — cada factura concilia por separado)`)
  // Regresión: si la etiqueta NO trae CC/FACT, sigue cayendo en 'arr' genérico.
  const lrGen = [{ asociado: MANDLR, acc: '28150517', accDesc: '', debe: 100, haber: 0, etiqueta: 'ARRIENDO ABRIL', proj: TAGLR }]
  const resGen = reconciliar({ mandante: MANDLR, vals: { arr: 100 }, total: 100 }, lrGen, TAGLR)
  assert(resGen.sums.arr === 100, `BUG4: etiqueta sin CC/FACT sigue en 'arr' genérico = ${resGen.sums.arr}`)
}

// 12) BUG 5 — Administración e IVA administración: cuentas 28151020/28151021
//     que antes se ignoraban (ni se sumaban del asiento ni se buscaban en el PDF).
{
  const TAGA = '[10100] PLANTA ADMIN'
  const MANDA = 'ACME S A S'
  const pdfAdm = `CMU7002
en calidad de mandatario, y ACME S.A.S., con NIT. 900.111.222-3, en calidad de mandante, relacionado con el proyecto PLANTA ADMIN.
ADMINISTRACION DE PROYECTOS $ 200,000.00
IVA ADMINISTRACION $ 38,000.00
VALOR A PAGAR $ 238,000.00`
  const ma = extractMandate(pdfAdm, 'x-CMU7002.pdf')
  assert(ma.vals.admin === 200000, `BUG5: PDF admin = ${ma.vals.admin} (esperado 200000)`)
  assert(ma.vals.iva_admin === 38000, `BUG5: PDF iva_admin = ${ma.vals.iva_admin} (esperado 38000, NO en admin)`)
  const admLineas = [
    { asociado: MANDA, acc: '28151020', accDesc: '', debe: 200000, haber: 0, etiqueta: '', proj: TAGA },
    { asociado: MANDA, acc: '28151021', accDesc: '', debe: 38000, haber: 0, etiqueta: '', proj: TAGA },
  ]
  const resAdm = reconciliar(ma, admLineas, TAGA)
  assert(resAdm.sums.admin === 200000 && resAdm.sums.iva_admin === 38000,
    `BUG5: sums admin/iva = ${resAdm.sums.admin}/${resAdm.sums.iva_admin}`)
  assert(resAdm.status === 'ok', `BUG5: status = ${resAdm.status} (esperado ok — Administración ahora conciliada)`)
}

// 13) BUG 6 — asociado ABREVIADO en el asiento (caso real Sol Sierra, CMU1107).
//     El mandante del PDF trae el nombre corporativo completo + fondo, pero el
//     asiento abrevia a "PA 17844 SOL DE LA SIERRA" (sin FIDUCIARIA/BANCOLOMBIA).
//     Debe reconciliar; y fondos distintos (18254 Nestlé, Skandia) NO deben cruzar.
{
  const TAGSS = '[10051] COLCEST53P1 LA PAZ LEYENDA'
  const MAND_SS = 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA S A SOCIEDAD FIDUCIARIA - 17844 SOL DE LA SIERRA'
  const lineasSS = [
    { asociado: 'PA 17844 SOL DE LA SIERRA', acc: '28151009', accDesc: '', debe: 64706.3, haber: 0, etiqueta: '', proj: TAGSS },
    { asociado: 'PA 17844 SOL DE LA SIERRA', acc: '28151010', accDesc: '', debe: 12294.2, haber: 0, etiqueta: '', proj: TAGSS },
    { asociado: 'PA 17844 SOL DE LA SIERRA', acc: '28151020', accDesc: '', debe: 2681883.45, haber: 0, etiqueta: '', proj: TAGSS },
    { asociado: 'PA 17844 SOL DE LA SIERRA', acc: '28151021', accDesc: '', debe: 509557.86, haber: 0, etiqueta: '', proj: TAGSS },
    // Ruido: otro tercero del MISMO proyecto que NO debe sumarse.
    { asociado: 'SOLENIUM SAS', acc: '28151020', accDesc: '', debe: 999999, haber: 0, etiqueta: '', proj: TAGSS },
    // Otro patrimonio Bancolombia con fondo DISTINTO (Nestlé 18254): NO debe cruzar.
    { asociado: 'FIDUCIARIA BANCOLOMBIA PA NESTLE 18254', acc: '28151020', accDesc: '', debe: 888888, haber: 0, etiqueta: '', proj: TAGSS },
  ]
  const resSS = reconciliar({ mandante: MAND_SS, vals: { int: 64706.3, iva_int: 12294.2, admin: 2681883.45, iva_admin: 509557.86 }, total: 3268441.81 }, lineasSS, TAGSS)
  assert(resSS.lines.length === 4, `BUG6: líneas Sol Sierra = ${resSS.lines.length} (esperado 4, "PA 17844 SOL DE LA SIERRA" reconocido; Solenium y Nestlé fuera)`)
  assert(Math.round(resSS.sums.admin) === 2681883, `BUG6: admin = ${resSS.sums.admin} (esperado 2681883, sin sumar 999999/888888)`)
  assert(resSS.status === 'ok', `BUG6: status = ${resSS.status} (esperado ok — antes: todo faltante, suma 0)`)
  // Fondo distinto: un mandato Nestlé (18254) NO debe emparejar la línea Sol Sierra.
  const resNo = reconciliar({ mandante: 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA S A SOCIEDAD FIDUCIARIA - 18254 NESTLE',
    vals: { admin: 888888 }, total: 888888 }, lineasSS, TAGSS)
  assert(resNo.sums.admin === 888888, `BUG6: Nestlé (18254) solo suma su propia línea = ${resNo.sums.admin} (esperado 888888, NO Sol Sierra)`)
}

// 14) normalizarCifra — función ÚNICA que detecta miles/decimal en AMBOS formatos.
{
  // Mandato (US): coma=miles, punto=decimal
  assert(normalizarCifra('1,234,567') === 1234567, `normalizarCifra("1,234,567") = ${normalizarCifra('1,234,567')} (esperado 1234567)`)
  assert(normalizarCifra('2,011.51') === 2011.51, `normalizarCifra("2,011.51") = ${normalizarCifra('2,011.51')} (esperado 2011.51)`)
  assert(normalizarCifra('$ 2,011,510.00') === 2011510, `normalizarCifra("$ 2,011,510.00") = ${normalizarCifra('$ 2,011,510.00')} (esperado 2011510)`)
  assert(normalizarCifra('497,333') === 497333, `normalizarCifra("497,333") = ${normalizarCifra('497,333')} (esperado 497333, miles)`)
  assert(normalizarCifra('0.50') === 0.5, `normalizarCifra("0.50") = ${normalizarCifra('0.50')} (esperado 0.5)`)
  // Asiento (CO): punto=miles, coma=decimal
  assert(normalizarCifra('1.234.567') === 1234567, `normalizarCifra("1.234.567") = ${normalizarCifra('1.234.567')} (esperado 1234567)`)
  assert(normalizarCifra('2.011,51') === 2011.51, `normalizarCifra("2.011,51") = ${normalizarCifra('2.011,51')} (esperado 2011.51)`)
  assert(normalizarCifra('129.413') === 129413, `normalizarCifra("129.413") = ${normalizarCifra('129.413')} (esperado 129413, miles)`)
  assert(normalizarCifra('$ 1.234.567,89') === 1234567.89, `normalizarCifra("$ 1.234.567,89") = ${normalizarCifra('$ 1.234.567,89')} (esperado 1234567.89)`)
  assert(normalizarCifra('0,50') === 0.5, `normalizarCifra("0,50") = ${normalizarCifra('0,50')} (esperado 0.5)`)
  // Casos reales del lote Sol Sierra (mandato US)
  assert(normalizarCifra('2,681,883.45') === 2681883.45, `normalizarCifra("2,681,883.45") = ${normalizarCifra('2,681,883.45')} (esperado 2681883.45)`)
  assert(normalizarCifra('64,706.30') === 64706.3, `normalizarCifra("64,706.30") = ${normalizarCifra('64,706.30')} (esperado 64706.3)`)
  // Sin separador, negativos, número nativo, vacío
  assert(normalizarCifra('129') === 129, `normalizarCifra("129") = ${normalizarCifra('129')}`)
  assert(normalizarCifra('-1,000.50') === -1000.5, `normalizarCifra("-1,000.50") = ${normalizarCifra('-1,000.50')} (esperado -1000.5)`)
  assert(normalizarCifra('-1.000,50') === -1000.5, `normalizarCifra("-1.000,50") = ${normalizarCifra('-1.000,50')} (esperado -1000.5)`)
  assert(normalizarCifra('(1.234)') === -1234, `normalizarCifra("(1.234)") = ${normalizarCifra('(1.234)')} (esperado -1234, paréntesis=negativo)`)
  assert(normalizarCifra(2011.51) === 2011.51, 'normalizarCifra(number) pasa directo')
  assert(normalizarCifra('') === 0 && normalizarCifra(null) === 0, 'normalizarCifra vacío/null = 0')
  // MISMO valor, distinta fuente → deben coincidir (no diferencia de miles)
  assert(Math.abs(normalizarCifra('2,011.51') - normalizarCifra('2.011,51')) < 0.001, 'US vs CO: mismo valor coincide')
  // El bug original de "Auditoría PDFs": $2,011,510.00 (US) NO debe leerse como 2.011
  assert(normalizarCifra('2,011,510.00') !== 2.011, 'regresión Auditoría: US con comas no se lee como 2.011')
}

// 15) BUG jun-2026 — conceptos y clasificadores nuevos del soporte de INGRESOS.
//     El batch de junio trajo conceptos que la regex vieja no reconocía, así que
//     plantaDesdeEtiqueta NO les quitaba el prefijo y cada línea quedaba como una
//     "planta" distinta (382 grupos en vez de ~70) → el match se quedaba con el
//     bruto sin restar costos (~3% de diferencia falsa). Cada concepto/clasificador
//     nuevo debe colapsar a la MISMA planta que INGRESO BRUTO.
const URU = 'MINIGRANJA SOLAR URUACO'
const etq = (concepto) => `${concepto} MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL`
for (const concepto of [
  'SERVICIOS DESPACHO Y COORDINACION CND',
  'DESPACHO',
  'ENERGIA EN BOLSA',
  'ARRANQUE Y PARADA',
  'SERVICIOS DE ADMINISTRACION SIC',
  'I.V.A. SIC 19',
  'CARGO POR CONFIABILIDAD',
  'FAZNI',
]) {
  assert(plantaDesdeEtiqueta(etq(concepto)) === URU,
    `plantaDesdeEtiqueta "${concepto}" → "${plantaDesdeEtiqueta(etq(concepto))}" (esperado "${URU}")`)
}
// Clasificadores nuevos entre el concepto y la planta (antes solo BIAC/UNGC/PPA):
assert(plantaDesdeEtiqueta('INGRESO BRUTO TERPEL 1 MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL') === URU,
  `plantaDesdeEtiqueta quita "TERPEL 1" = "${plantaDesdeEtiqueta('INGRESO BRUTO TERPEL 1 MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL')}"`)
assert(plantaDesdeEtiqueta('INGRESO BRUTO TERPEL 2 MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL') === URU,
  `plantaDesdeEtiqueta quita "TERPEL 2" = "${plantaDesdeEtiqueta('INGRESO BRUTO TERPEL 2 MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL')}"`)
assert(plantaDesdeEtiqueta('INGRESO BRUTO UNGG MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL') === URU,
  `plantaDesdeEtiqueta quita "UNGG" = "${plantaDesdeEtiqueta('INGRESO BRUTO UNGG MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL')}"`)
// Sufijo COP/GENERADOR/COMERCIALIZADOR tras el concepto también debe quedar fuera:
assert(plantaDesdeEtiqueta('ENERGIA EN BOLSA COP GENERADOR MINIGRANJA SOLAR URUACO JUNIO 2026') === URU,
  `plantaDesdeEtiqueta sufijo COP/GENERADOR = "${plantaDesdeEtiqueta('ENERGIA EN BOLSA COP GENERADOR MINIGRANJA SOLAR URUACO JUNIO 2026')}"`)

// 16) BUG jun-2026 — colapso en parseIngresos: las 6 líneas de Uruaco de junio
//     (con conceptos nuevos) deben agrupar en UN solo grupo cuyo neto (débito −
//     crédito) = 44.345.428, NO el bruto 45.786.907 (income sin restar costos).
//     NOTA: no se entregaron las 6 líneas crudas; los importes por línea son
//     representativos, elegidos para reproducir los totales reportados de junio
//     (bruto 45.786.907 / neto 44.345.428). Lo que fija la regresión es (a) que
//     todas colapsen a UN grupo y (b) que el neto reste los costos de conceptos
//     nuevos. Reemplazar por las líneas reales del Excel cuando estén disponibles.
const AC = '28150505 INGRESO DE ENERGIA'
const ASO = 'RODRIGUEZ VELEZ BEATRIZ'
const ingJun = [
  ['Asiento contable', 'Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
  // Ingresos (haber) — bruto = 44.000.000 + 1.500.000 + 286.907 = 45.786.907
  ['CM/6', AC, ASO, 'INGRESO BRUTO TERPEL 1 MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL', 0, 44000000],
  ['CM/6', AC, ASO, 'CARGO POR CONFIABILIDAD MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL', 0, 1500000],
  ['CM/6', AC, ASO, 'FAZNI MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL', 0, 286907],
  // Costos (debe) — total = 900.000 + 400.000 + 141.479 = 1.441.479
  ['CM/6', AC, ASO, 'COMERCIALIZACION MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL', 900000, 0],
  ['CM/6', AC, ASO, 'ARRANQUE Y PARADA MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL', 400000, 0],
  ['CM/6', AC, ASO, 'I.V.A. SIC 19 MINIGRANJA SOLAR URUACO JUNIO 2026 TERPEL', 141479, 0],
]
const ingJunRes = parseIngresos(ingJun)
assert(ingJunRes.length === 1,
  `parseIngresos jun-2026: 6 líneas → 1 grupo (colapso) — fue ${ingJunRes.length} grupos`)
assert(ingJunRes[0] && Math.round(Math.abs(ingJunRes[0].valor_contabilidad)) === 44345428,
  `parseIngresos jun-2026: neto = ${ingJunRes[0] && Math.round(Math.abs(ingJunRes[0].valor_contabilidad))} (esperado 44345428, NO bruto 45786907)`)

// 17) BUG jun-2026 — mandante ABREVIADO en la contabilidad (caso Sol de la Sierra).
//     El PDF trae "PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA ... 17844 SOL DE LA
//     SIERRA" pero el asiento abrevia el PA a "PA 17844 SOL DE LA SIERRA" (sin
//     FIDUCIARIA/BANCOLOMBIA). Comparten el código de portafolio 17844 → es el mismo
//     PA. Antes matchIngresoContab exigía TODOS los tokens del mandante en el asociado
//     y las 8 plantas de Sol de la Sierra quedaban SIN match (verificado con datos
//     reales de junio: valor a pagar La Paz Leyenda = 66.407.637 = neto contable).
const MSIERRA = 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA S A SOCIEDAD FIDUCIARIA - 17844 SOL DE LA SIERRA'
const gSierra = [
  { asociado: 'PA 17844 SOL DE LA SIERRA', planta: 'MINIGRANJA SOLAR LA PAZ LEYENDA', valor_contabilidad: -66407637 },
  { asociado: 'PA 17844 SOL DE LA SIERRA', planta: 'MINIGRANJA SOLAR SAN DIEGO SUR', valor_contabilidad: -57570713 },
  // Decoy: otro fondo (18254) con el MISMO nombre de planta NO debe robar el match.
  { asociado: 'PA 18254 OTRO FONDO', planta: 'MINIGRANJA SOLAR LA PAZ LEYENDA', valor_contabilidad: -999 },
]
const mLPL = matchIngresoContab({ mandante: MSIERRA, projName: 'Minigranja Solar La Paz Leyenda' }, gSierra)
assert(mLPL && mLPL.asociado === 'PA 17844 SOL DE LA SIERRA' && Math.round(mLPL.valor_contabilidad) === -66407637,
  `matchIngresoContab Sol de la Sierra/La Paz Leyenda (abrev. por código 17844) → ${mLPL ? mLPL.asociado + ' ' + Math.round(mLPL.valor_contabilidad) : 'SIN MATCH'} (esperado 'PA 17844 SOL DE LA SIERRA' -66407637)`)
const mSDS = matchIngresoContab({ mandante: MSIERRA, projName: 'Minigranja Solar San Diego Sur' }, gSierra)
assert(mSDS && mSDS.planta === 'MINIGRANJA SOLAR SAN DIEGO SUR',
  `matchIngresoContab Sol de la Sierra/San Diego Sur → "${mSDS && mSDS.planta}" (esperado SAN DIEGO SUR)`)
// El código distinto (18254) NO debe emparejar contra el fondo 17844 aunque compartan
// el nombre de planta: al pedir el fondo 18254, el único grupo 17844/San Diego Sur no aplica.
const mOtro = matchIngresoContab({ mandante: 'PATRIMONIOS AUTONOMOS X - 18254 OTRO FONDO', projName: 'Minigranja Solar San Diego Sur' }, gSierra)
assert(!mOtro, `matchIngresoContab fondo 18254 no roba San Diego Sur del 17844 → ${mOtro ? mOtro.asociado : 'SIN MATCH (correcto)'}`)

console.log(ok ? '\nTODOS LOS TESTS PASARON' : '\nHAY FALLOS')
process.exit(ok ? 0 : 1)
