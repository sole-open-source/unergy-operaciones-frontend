/**
 * Pruebas del motor de conciliación "Mandato (PDF) vs. Asiento contable (Odoo)".
 * Ejecutar:  npm test   (node --test, con cobertura nativa).
 *
 * Importa el módulo directamente (el repo es `"type": "module"`), de modo que la
 * cobertura nativa de Node instrumenta el archivo real. Cubre las reglas de
 * negocio aprendidas en producción (STRADA⊂ESTRADA, arriendo por débito, ingresos
 * por neto) más casos límite: entradas vacías/nulas, columnas faltantes, etc.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  norm, parseNum, projectTokens, nameTokenSet, plantaTokens,
  parseAsientos, extractMandate, suggestTag, reconciliar,
  plantaDesdeEtiqueta, parseIngresos, matchIngresoContab,
  ACC2CONCEPT, CONCEPTS, NON_COST_ACCOUNTS, TOL, INGRESO_ACC_PREFIX, fmt,
} from './conciliacionMandatos.js'

// ════════════════════════════════════════════════════════════════════════════
//  UTILIDADES PURAS
// ════════════════════════════════════════════════════════════════════════════

describe('norm', () => {
  test('quita tildes, mayúsculas y colapsa espacios', () => {
    assert.equal(norm('  Áéíóú  ñ Ñ  '), 'AEIOU N N')
  })
  test('elimina signos de puntuación a espacio', () => {
    assert.equal(norm('S.A.S., y/o'), 'S A S Y O')
  })
  test('null/undefined → cadena vacía', () => {
    assert.equal(norm(null), '')
    assert.equal(norm(undefined), '')
  })
  test('acepta números', () => {
    assert.equal(norm(1234), '1234')
  })
})

describe('parseNum', () => {
  test('formato colombiano "1.234.567,89"', () => {
    assert.equal(parseNum('1.234.567,89'), 1234567.89)
  })
  test('quita símbolo de peso y espacios', () => {
    assert.equal(parseNum('$ 497.333'), 497333)
  })
  test('número se devuelve tal cual', () => {
    assert.equal(parseNum(42.5), 42.5)
  })
  test('null → 0', () => {
    assert.equal(parseNum(null), 0)
  })
  test('texto no numérico → 0', () => {
    assert.equal(parseNum('abc'), 0)
  })
  test('cadena vacía → 0', () => {
    assert.equal(parseNum(''), 0)
  })
})

describe('projectTokens / nameTokenSet / plantaTokens', () => {
  test('projectTokens descarta relleno y tokens cortos', () => {
    assert.deepEqual(projectTokens('Minigranja Solar La Reserva'), ['RESERVA'])
  })
  test('nameTokenSet descarta STOP words y tokens < 3', () => {
    const s = nameTokenSet('STRADA ASOCIADOS S.A.S.')
    assert.ok(s.has('STRADA'))
    assert.ok(s.has('ASOCIADOS'))
    assert.ok(!s.has('SAS'))
  })
  test('plantaTokens conserva los dígitos (NAOS 1 vs 2)', () => {
    assert.deepEqual(plantaTokens('GD NAOS 1'), ['NAOS', '1'])
  })
  test('projectTokens descarta los dígitos (a diferencia de plantaTokens)', () => {
    assert.deepEqual(projectTokens('GD NAOS 1'), ['NAOS'])
  })
})

describe('fmt', () => {
  test('formatea entero con separadores es-CO', () => {
    assert.equal(fmt(1842569), '1.842.569')
  })
  test('null → 0', () => {
    assert.equal(fmt(null), '0')
  })
})

describe('catálogos exportados', () => {
  test('TOL es 1 peso', () => assert.equal(TOL, 1))
  test('INGRESO_ACC_PREFIX', () => assert.equal(INGRESO_ACC_PREFIX, '28150505'))
  test('mapas de configuración presentes', () => {
    assert.equal(ACC2CONCEPT['28151002'], 'mant')
    assert.equal(CONCEPTS.mant, 'Mantenimiento')
    assert.ok('23355002' in NON_COST_ACCOUNTS)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  parseAsientos
// ════════════════════════════════════════════════════════════════════════════

describe('parseAsientos', () => {
  const TAG = 'MINIGRANJA SOLAR LA RESERVA'

  test('detecta columnas DEBE/HABER y extrae cuenta + descripción', () => {
    const rows = [
      ['Asiento contable', 'Asociado', 'Cuenta', 'Debe', 'Haber', 'Etiqueta', 'Cuenta analitica'],
      ['AS1', 'STRADA ASOCIADOS S A S', '28151002 Mantenimiento', '497333', '0', 'x', TAG],
    ]
    const { details, tags } = parseAsientos(rows)
    assert.equal(details.length, 1)
    assert.equal(details[0].acc, '28151002')
    assert.equal(details[0].accDesc, 'Mantenimiento')
    assert.equal(details[0].debe, 497333)
    assert.equal(details[0].proj, TAG)
    assert.deepEqual(tags, [TAG])
  })

  test('entrada vacía / sin filas → estructura vacía', () => {
    assert.deepEqual(parseAsientos([]), { details: [], tags: [] })
    assert.deepEqual(parseAsientos(null), { details: [], tags: [] })
  })

  test('omite líneas sin asociado o sin cuenta', () => {
    const rows = [
      ['Asociado', 'Cuenta', 'Debe', 'Haber'],
      ['', '28151002 X', '1', '0'],          // sin asociado
      ['ALGUIEN', '', '1', '0'],             // sin cuenta
      ['ALGUIEN', '28151002 X', '1', '0'],   // válida
    ]
    assert.equal(parseAsientos(rows).details.length, 1)
  })

  test('salta filas con sangría en columna asiento (subtotales)', () => {
    const rows = [
      ['Asiento contable', 'Asociado', 'Cuenta', 'Debe', 'Haber'],
      [' subtotal', 'ALGUIEN', '28151002 X', '5', '0'],  // empieza con espacio → subtotal
      ['AS1', 'ALGUIEN', '28151002 X', '5', '0'],
    ]
    assert.equal(parseAsientos(rows).details.length, 1)
  })

  test('deriva debe/haber de columna IMPORTE con signo', () => {
    const rows = [
      ['Asociado', 'Cuenta', 'Importe en moneda'],
      ['A', '28151002 X', '100'],
      ['A', '28151002 X', '-40'],
    ]
    const { details } = parseAsientos(rows)
    assert.equal(details[0].debe, 100)
    assert.equal(details[0].haber, 0)
    assert.equal(details[1].haber, 40)
    assert.equal(details[1].debe, 0)
  })

  test('usa ETIQUETA como proyecto cuando no hay columna ANALITICA', () => {
    const rows = [
      ['Asociado', 'Cuenta', 'Debe', 'Haber', 'Etiqueta'],
      ['A', '28151002 X', '1', '0', 'PLANTA ALFA'],
    ]
    assert.equal(parseAsientos(rows).details[0].proj, 'PLANTA ALFA')
  })

  test('salta filas null intercaladas', () => {
    const rows = [
      ['Asociado', 'Cuenta', 'Debe', 'Haber'],
      null,
      ['A', '28151002 X', '1', '0'],
    ]
    assert.equal(parseAsientos(rows).details.length, 1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  extractMandate
// ════════════════════════════════════════════════════════════════════════════

describe('extractMandate', () => {
  test('lee mandante/NIT/total/conceptos del CUERPO del PDF', () => {
    const pdf = `CMU12345
en calidad de mandatario, y STRADA ASOCIADOS S.A.S., con NIT. 900.123.456-7, en calidad de mandante, relacionado con el proyecto MINIGRANJA SOLAR LA RESERVA.
MANTENIMIENTO $ 497.333
VALOR A PAGAR $ 497.333`
    const m = extractMandate(pdf, 'x-CMU12345.pdf')
    assert.equal(m.cmu, 'CMU12345')
    assert.ok(m.mandante.includes('STRADA'))
    assert.equal(m.nit, '900.123.456-7')
    assert.equal(m.vals.mant, 497333)
    assert.equal(m.total, 497333)
  })

  test('separa IVA mantenimiento de mantenimiento', () => {
    const pdf = `CMU0001
MANTENIMIENTO $ 100.000
IVA MANTENIMIENTO $ 19.000
VALOR A PAGAR $ 119.000`
    const m = extractMandate(pdf)
    assert.equal(m.vals.mant, 100000)
    assert.equal(m.vals.iva_mant, 19000)
  })

  test('cmu desde el nombre de archivo si no está en el texto', () => {
    const m = extractMandate('texto sin codigo', 'archivo-CMU0777.pdf')
    assert.equal(m.cmu, 'CMU0777')
  })

  test('cmu "?" cuando no hay en texto ni archivo', () => {
    assert.equal(extractMandate('nada', 'archivo.pdf').cmu, '?')
  })

  test('mandante fallback desde el nombre de archivo', () => {
    const m = extractMandate('sin cuerpo', 'Mandato-Costos-Planta-ACME SA.pdf')
    assert.equal(m.mandante, 'ACME SA')
  })

  test('proyecto vía "a saber" (con punto que corta el primer patrón)', () => {
    const pdf = 'relacionado con el proyecto Planta Beta a saber algo. Fin.'
    assert.equal(extractMandate(pdf).projName, 'Planta Beta')
  })

  test('texto null no rompe', () => {
    const m = extractMandate(null, '')
    assert.equal(m.cmu, '?')
    assert.deepEqual(m.vals, {})
    assert.equal(m.total, null)
  })

  test('reconoce todos los conceptos (internet, arriendo + IVAs)', () => {
    const pdf = `CMU9
SERVICIO DE INTERNET $ 50.000
IVA INTERNET $ 9.500
ARRIENDO $ 200.000
IVA ARRIENDO $ 38.000`
    const m = extractMandate(pdf)
    assert.equal(m.vals.int, 50000)
    assert.equal(m.vals.iva_int, 9500)
    assert.equal(m.vals.arr, 200000)
    assert.equal(m.vals.iva_arr, 38000)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  suggestTag
// ════════════════════════════════════════════════════════════════════════════

describe('suggestTag', () => {
  const tags = ['MINIGRANJA SOLAR LA RESERVA', 'MINIGRANJA SOLAR EL SON', 'PLANTA NAOS 1']

  test('mapa recordado tiene prioridad', () => {
    const r = suggestTag('La Reserva', tags, { 'LA RESERVA': 'MINIGRANJA SOLAR LA RESERVA' })
    assert.equal(r.status, 'recordado')
    assert.equal(r.tag, 'MINIGRANJA SOLAR LA RESERVA')
  })

  test('mapa recordado pero etiqueta inexistente → cae a automático', () => {
    const r = suggestTag('La Reserva', tags, { 'LA RESERVA': 'TAG QUE NO EXISTE' })
    assert.notEqual(r.status, 'recordado')
  })

  test('un solo candidato → auto', () => {
    const r = suggestTag('Reserva', tags, {})
    assert.equal(r.status, 'auto')
    assert.equal(r.tag, 'MINIGRANJA SOLAR LA RESERVA')
  })

  test('proyecto sin tokens distintivos → revisar', () => {
    const r = suggestTag('La De El', tags, {})
    assert.equal(r.status, 'revisar')
  })

  test('sin candidatos → revisar', () => {
    const r = suggestTag('Xyzzy Qwerty Foobar', tags, {})
    assert.equal(r.status, 'revisar')
  })

  test('varios candidatos con ganador claro → auto', () => {
    const tags2 = ['PLANTA NAOS UNO ESPECIAL', 'OTRA NAOS']
    const r = suggestTag('Naos Uno Especial', tags2, {})
    assert.equal(r.status, 'auto')
    assert.equal(r.tag, 'PLANTA NAOS UNO ESPECIAL')
  })

  test('empate entre candidatos → elige', () => {
    const tags2 = ['ALFA BRAVO', 'ALFA CHARLIE']
    const r = suggestTag('Alfa', tags2, {})
    assert.equal(r.status, 'elige')
    assert.equal(r.candidates.length, 2)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  reconciliar — reglas de negocio centrales
// ════════════════════════════════════════════════════════════════════════════

describe('reconciliar', () => {
  const TAG = 'MINIGRANJA SOLAR LA RESERVA'

  test('sin tag → bad SIN_TAG', () => {
    const r = reconciliar({ mandante: 'X', vals: {} }, [], '')
    assert.equal(r.status, 'bad')
    assert.equal(r.flags[0].code, 'SIN_TAG')
  })

  test('STRADA NO suma a ESTRADA (palabra completa)', () => {
    const details = [
      { asociado: 'STRADA ASOCIADOS S A S', acc: '28151002', accDesc: '', debe: 497333, haber: 0, etiqueta: '', proj: TAG },
      { asociado: 'INVERSIONES ESTRADA ARBELAEZ Y CIA S. EN C.', acc: '28151002', accDesc: '', debe: 2655667, haber: 0, etiqueta: '', proj: TAG },
    ]
    const r = reconciliar({ mandante: 'STRADA ASOCIADOS S.A.S.', vals: { mant: 497333 }, total: 497333 }, details, TAG)
    assert.equal(r.sums.mant, 497333)
    assert.equal(r.lines.length, 1)
    assert.equal(r.status, 'ok')
  })

  test('ESTRADA suma solo su línea', () => {
    const details = [
      { asociado: 'STRADA ASOCIADOS S A S', acc: '28151002', accDesc: '', debe: 497333, haber: 0, etiqueta: '', proj: TAG },
      { asociado: 'INVERSIONES ESTRADA ARBELAEZ Y CIA S. EN C.', acc: '28151002', accDesc: '', debe: 2655667, haber: 0, etiqueta: '', proj: TAG },
    ]
    const r = reconciliar({ mandante: 'INVERSIONES ESTRADA ARBELAEZ Y CIA S EN C', vals: { mant: 2655667 }, total: 2655667 }, details, TAG)
    assert.equal(r.sums.mant, 2655667)
  })

  test('FALTANTE: concepto del mandato ausente en el asiento', () => {
    const r = reconciliar({ mandante: 'ACME', vals: { mant: 1000 }, total: 1000 }, [], TAG)
    assert.ok(r.flags.some(f => f.code === 'FALTANTE'))
    assert.equal(r.status, 'bad')
  })

  test('DIFERENCIA: importes que no coinciden (más allá de la tolerancia)', () => {
    const details = [{ asociado: 'ACME SA', acc: '28151002', debe: 900, haber: 0, proj: TAG }]
    const r = reconciliar({ mandante: 'ACME', vals: { mant: 1000 }, total: 1000 }, details, TAG)
    assert.ok(r.flags.some(f => f.code === 'DIFERENCIA'))
    assert.equal(r.status, 'bad')
  })

  test('tolerancia de $1: diferencia de 1 peso se considera OK', () => {
    const details = [{ asociado: 'ACME SA', acc: '28151002', debe: 1001, haber: 0, proj: TAG }]
    const r = reconciliar({ mandante: 'ACME', vals: { mant: 1000 }, total: 1001 }, details, TAG)
    assert.ok(r.flags.some(f => f.code === 'OK'))
  })

  test('SOBRANTE: concepto en el asiento no listado en el mandato', () => {
    const details = [
      { asociado: 'ACME SA', acc: '28151002', debe: 1000, haber: 0, proj: TAG },   // mant (en mandato)
      { asociado: 'ACME SA', acc: '28150515', debe: 500, haber: 0, proj: TAG },     // arr (sobrante)
    ]
    const r = reconciliar({ mandante: 'ACME', vals: { mant: 1000 } }, details, TAG)
    assert.ok(r.flags.some(f => f.code === 'SOBRANTE'))
    assert.equal(r.status, 'warn')
  })

  test('CUENTA equivocada: débito en cuenta que no es de costo', () => {
    const details = [
      { asociado: 'ACME SA', acc: '28151002', debe: 1000, haber: 0, proj: TAG },
      { asociado: 'ACME SA', acc: '23355002', debe: 300, haber: 0, proj: TAG },     // no-cost con débito
    ]
    const r = reconciliar({ mandante: 'ACME', vals: { mant: 1000 } }, details, TAG)
    assert.ok(r.flags.some(f => f.code === 'CUENTA'))
    assert.equal(r.status, 'bad')
  })

  test('TOTAL: valor a pagar no cuadra con la suma de costos', () => {
    const details = [{ asociado: 'ACME SA', acc: '28151002', debe: 1000, haber: 0, proj: TAG }]
    const r = reconciliar({ mandante: 'ACME', vals: { mant: 1000 }, total: 5000 }, details, TAG)
    assert.ok(r.flags.some(f => f.code === 'TOTAL'))
  })

  test('ARRIENDO La Esmeralda: suma de DÉBITOS, no el neto (5 contratos)', () => {
    const ESM = '[10038] LA ESMERALDA'
    const BANC = 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA SA SOCIEDAD FIDUCIARIA'
    const DEB = 368513.81
    const arrendadores = ['EDGARDO JESUS AROCA MENDIOLA', 'DULM DAYAN AROCA GUTIERREZ', 'CARLOS ALBERTO AROCA MINDIOLA']
    const lineas = []
    for (const ct of ['30980', '30976', '30982', '30978', '30974']) {
      lineas.push({ asociado: BANC, acc: '28150517', debe: 0, haber: DEB, etiqueta: ct, proj: ESM })
      lineas.push({ asociado: BANC, acc: '28150517', debe: DEB, haber: 0, etiqueta: ct, proj: ESM })
    }
    arrendadores.forEach((p, i) =>
      lineas.push({ asociado: p, acc: '28150517', debe: 0, haber: 184256.91, etiqueta: ['30982', '30978', '30974'][i], proj: ESM }))
    const r = reconciliar({ mandante: BANC, vals: { arr: 1842569 }, total: 1842569 }, lineas, ESM)
    assert.equal(Math.round(r.sums.arr), 1842569)
    assert.ok(r.lines.every(l => l.asociado === BANC))
    assert.equal(r.status, 'ok')
  })

  test('mandante vacío no empareja ninguna línea', () => {
    const details = [{ asociado: 'ACME SA', acc: '28151002', debe: 1000, haber: 0, proj: TAG }]
    const r = reconciliar({ mandante: '', vals: { mant: 1000 } }, details, TAG)
    assert.equal(r.lines.length, 0)
  })

  test('mandato sin vals ni total → todo lo del asiento es SOBRANTE', () => {
    const details = [{ asociado: 'ACME SA', acc: '28151002', debe: 1000, haber: 0, proj: TAG }]
    const r = reconciliar({ mandante: 'ACME' }, details, TAG)
    assert.ok(r.flags.some(f => f.code === 'SOBRANTE'))
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  INGRESOS: plantaDesdeEtiqueta / parseIngresos / matchIngresoContab
// ════════════════════════════════════════════════════════════════════════════

describe('plantaDesdeEtiqueta', () => {
  test('quita concepto + mes/año/comercializador', () => {
    assert.equal(
      plantaDesdeEtiqueta('INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL'),
      'MINIGRANJA SOLAR URUACO')
  })
  test('COMERCIALIZACIÓN agrupa igual que INGRESO BRUTO', () => {
    assert.equal(
      plantaDesdeEtiqueta('COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL'),
      'MINIGRANJA SOLAR URUACO')
  })
  test('quita el clasificador BIAC/UNGC/PPA', () => {
    assert.equal(
      plantaDesdeEtiqueta('INGRESO BRUTO BIAC GD NAOS 1 ABRIL 2026 BIA ENERGY'),
      'GD NAOS 1')
  })
})

describe('parseIngresos', () => {
  test('suma neto de 28150505 por (asociado, planta); excluye 28150501/28151001', () => {
    const rows = [
      ['Asiento contable', 'Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
      ['CM/1', '28150505 INGRESO DE ENERGIA', 'RODRIGUEZ VELEZ BEATRIZ', 'INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 0, 3712635.47],
      ['CM/1', '28150505 INGRESO DE ENERGIA', 'RODRIGUEZ VELEZ BEATRIZ', 'COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 273321.72, 0],
      ['CM/1', '28151001 FACTURAS DE COMERCIALIZACION', 'RODRIGUEZ VELEZ BEATRIZ', 'COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 0, 273321.72],
      ['CM/1', '28150501 GANANCIAS POR PARTICIPACION', 'TERPEL ENERGIA S.A.S E.S.P', 'INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 3712635.47, 0],
    ]
    const ing = parseIngresos(rows)
    assert.equal(ing.length, 1)
    const rodri = ing.find(g => g.asociado.includes('RODRIGUEZ'))
    assert.equal(Math.round(Math.abs(rodri.valor_contabilidad)), 3439314)
  })

  test('descarta grupos con neto ≈ 0 (|valor| ≤ 1)', () => {
    const rows = [
      ['Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
      ['28150505 X', 'A', 'INGRESO BRUTO PLANTA ALFA ABRIL 2026 C', 100, 100],
    ]
    assert.equal(parseIngresos(rows).length, 0)
  })

  test('ignora líneas sin planta o sin asociado', () => {
    const rows = [
      ['Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
      ['28150505 X', 'A', 'ABRIL 2026 C', 5000, 0],   // etiqueta solo mes → planta vacía
    ]
    assert.equal(parseIngresos(rows).length, 0)
  })

  test('respeta prefijo de cuenta personalizado', () => {
    const rows = [
      ['Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
      ['99999 OTRA', 'A', 'INGRESO BRUTO PLANTA ALFA ABRIL 2026 C', 5000, 0],
    ]
    assert.equal(parseIngresos(rows, '99999').length, 1)
    assert.equal(parseIngresos(rows).length, 0)
  })
})

describe('matchIngresoContab', () => {
  const grupos = [
    { asociado: 'GD EL REMOLINO 1 S.A.S. E.S.P', planta: 'GD NAOS 1', valor_contabilidad: -58469697 },
    { asociado: 'GD EL REMOLINO 1 S.A.S. E.S.P', planta: 'GD NAOS 2', valor_contabilidad: -56507155 },
    { asociado: 'RODRIGUEZ VELEZ BEATRIZ', planta: 'MINIGRANJA SOLAR URUACO', valor_contabilidad: -3439314 },
  ]

  test('empareja por asociado + planta con número (NAOS 1, no 2)', () => {
    const m = matchIngresoContab({ mandante: 'GD EL REMOLINO 1 S.A.S. E.S.P.', projName: 'GD NAOS 1' }, grupos)
    assert.equal(m.planta, 'GD NAOS 1')
  })

  test('insensible a tildes/mayúsculas del PDF', () => {
    const m = matchIngresoContab({ mandante: 'Rodríguez Vélez Beatriz', projName: 'Minigranja Solar Uruaco' }, grupos)
    assert.equal(m.planta, 'MINIGRANJA SOLAR URUACO')
  })

  test('proyecto sin tokens → null', () => {
    assert.equal(matchIngresoContab({ mandante: 'X', projName: '' }, grupos), null)
  })

  test('sin coincidencia de asociado → null', () => {
    assert.equal(matchIngresoContab({ mandante: 'EMPRESA INEXISTENTE XYZ', projName: 'GD NAOS 1' }, grupos), null)
  })

  test('empareja por planta cuando no se da mandante (mandTok vacío)', () => {
    const m = matchIngresoContab({ mandante: '', projName: 'Uruaco' }, grupos)
    assert.equal(m.planta, 'MINIGRANJA SOLAR URUACO')
  })

  test('sin tokens de planta compartidos → null', () => {
    assert.equal(matchIngresoContab({ mandante: '', projName: 'Zzz Inexistente' }, grupos), null)
  })
})
