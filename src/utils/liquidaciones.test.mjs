/**
 * Pruebas de los helpers de Liquidaciones (formato + cálculo del neto y del
 * Estado de Resultados).  Ejecutar:  npm test
 *
 * Importa `@/constants/liquidaciones` vía el hook de alias (test/setup.mjs), igual
 * que la app bajo Vite.  Cubre formato monetario/fechas/porcentajes, los tres
 * lectores de la vista por-proyecto (neto / valor a pagar / costos), el índice de
 * soportes y, en detalle, construirEstadoResultados con sus ramas de respaldo.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  fmtCOP, fmtCompact, formatPeriodo, toISOMonth, mesActualISO,
  normTipo, normPct, pct, estadoSeverity, estadoLabel, facturaEstadoSeverity,
  netoFromVista, valorAPagarFromVista, costosFromVista,
  codigoSoporte, indiceSoportesProyecto, construirEstadoResultados,
  TIPOS_SIN_SOPORTE, TIPOS_FACTURA_SERVICIO,
} from './liquidaciones.js'

// ════════════════════════════════════════════════════════════════════════════
//  FORMATO
// ════════════════════════════════════════════════════════════════════════════

describe('fmtCOP', () => {
  test('null → guion', () => assert.equal(fmtCOP(null), '—'))
  test('undefined → guion', () => assert.equal(fmtCOP(undefined), '—'))
  test('valor → moneda COP con separadores', () => {
    const s = fmtCOP(1000)
    assert.ok(s.includes('1.000'))
    assert.ok(s.includes('$'))
  })
  test('cero es un valor válido (no guion)', () => {
    assert.notEqual(fmtCOP(0), '—')
  })
})

describe('fmtCompact', () => {
  test('null → guion', () => assert.equal(fmtCompact(null), '—'))
  test('miles → K', () => assert.equal(fmtCompact(3000), '$3K'))
  test('millones → M (1 decimal)', () => assert.equal(fmtCompact(2.5e6), '$2.5M'))
  test('miles de millones → B', () => assert.equal(fmtCompact(1.5e9), '$1.5B'))
  test('negativos llevan signo', () => assert.equal(fmtCompact(-2.5e6), '-$2.5M'))
  test('por debajo de mil → valor plano', () => assert.equal(fmtCompact(500), '$500'))
})

describe('formatPeriodo', () => {
  test('"2026-05-01" → "May 2026"', () => assert.equal(formatPeriodo('2026-05-01'), 'May 2026'))
  test('enero', () => assert.equal(formatPeriodo('2026-01-01'), 'Ene 2026'))
  test('vacío → cadena vacía', () => assert.equal(formatPeriodo(''), ''))
  test('null → cadena vacía', () => assert.equal(formatPeriodo(null), ''))
})

describe('toISOMonth', () => {
  test('fecha → primer día del mes', () => assert.equal(toISOMonth('2026-05-15'), '2026-05-01'))
  test('null → null', () => assert.equal(toISOMonth(null), null))
  test('formato con padding de mes', () => assert.equal(toISOMonth('2026-03-09'), '2026-03-01'))
})

describe('mesActualISO', () => {
  test('formato YYYY-MM-01', () => assert.match(mesActualISO(), /^\d{4}-\d{2}-01$/))
})

// ════════════════════════════════════════════════════════════════════════════
//  ENUMS / PORCENTAJES / SEVERIDADES
// ════════════════════════════════════════════════════════════════════════════

describe('normTipo', () => {
  test('quita el prefijo del enum del backend', () => {
    assert.equal(normTipo('TipoLineaMandatoEnum.ingreso_bruto'), 'ingreso_bruto')
  })
  test('valor ya normalizado pasa intacto', () => assert.equal(normTipo('arriendo'), 'arriendo'))
  test('null → cadena vacía', () => assert.equal(normTipo(null), ''))
})

describe('normPct', () => {
  test('fracción 0–1 se conserva', () => assert.equal(normPct(0.5), 0.5))
  test('porcentaje 0–100 se divide', () => assert.equal(normPct(50), 0.5))
  test('1 es el límite (se conserva)', () => assert.equal(normPct(1), 1))
  test('null → 0', () => assert.equal(normPct(null), 0))
})

describe('pct', () => {
  test('fracción → porcentaje con 2 decimales', () => assert.equal(pct(0.1106), '11.06%'))
  test('porcentaje 0–100 también', () => assert.equal(pct(11.06), '11.06%'))
})

describe('estadoSeverity / estadoLabel', () => {
  test('estado conocido', () => assert.equal(estadoSeverity('facturado'), 'success'))
  test('estado desconocido → secondary', () => assert.equal(estadoSeverity('zzz'), 'secondary'))
  test('label conocido', () => assert.equal(estadoLabel('iniciada'), 'Iniciada'))
  test('label desconocido pasa intacto', () => assert.equal(estadoLabel('xxx'), 'xxx'))
  test('label null → guion', () => assert.equal(estadoLabel(null), '—'))
})

describe('facturaEstadoSeverity', () => {
  test('pagada → success', () => assert.equal(facturaEstadoSeverity('pagada'), 'success'))
  test('emitida → info', () => assert.equal(facturaEstadoSeverity('emitida'), 'info'))
  test('vencida → danger', () => assert.equal(facturaEstadoSeverity('vencida'), 'danger'))
  test('desconocido → secondary', () => assert.equal(facturaEstadoSeverity('???'), 'secondary'))
})

// ════════════════════════════════════════════════════════════════════════════
//  LECTORES DE LA VISTA POR-PROYECTO
// ════════════════════════════════════════════════════════════════════════════

describe('netoFromVista', () => {
  test('null → 0', () => assert.equal(netoFromVista(null), 0))

  test('valor a pagar − costos − facturas (con detalle)', () => {
    const liq = {
      mandatos_total_ingresos: [{ valor_neto_cop: 1000 }],
      mandatos_total_costos: [{ valor_neto_cop: 300 }],
      facturas_servicio: [{ valor_cop: 200 }],
    }
    assert.equal(netoFromVista(liq), 500)
  })

  test('respaldo: resumen pre-calculado del backend', () => {
    const liq = { resumen: { ingreso_neto_cop: 777 } }
    assert.equal(netoFromVista(liq), 777)
  })

  test('respaldo cuando no hay listas ni resumen → 0', () => {
    assert.equal(netoFromVista({}), 0)
  })
})

describe('valorAPagarFromVista', () => {
  test('null → 0', () => assert.equal(valorAPagarFromVista(null), 0))
  test('suma valor_neto_cop de ingresos', () => {
    assert.equal(valorAPagarFromVista({ mandatos_total_ingresos: [{ valor_neto_cop: 900 }, { valor_neto_cop: 100 }] }), 1000)
  })
  test('respaldo resumen.total_ingresos_cop', () => {
    assert.equal(valorAPagarFromVista({ resumen: { total_ingresos_cop: 1234 } }), 1234)
  })
})

describe('costosFromVista', () => {
  test('null → 0', () => assert.equal(costosFromVista(null), 0))
  test('mandato de costos + facturas de servicio', () => {
    const liq = {
      mandatos_total_costos: [{ valor_neto_cop: 300 }],
      facturas_servicio: [{ valor_cop: 150 }],
    }
    assert.equal(costosFromVista(liq), 450)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  SOPORTES
// ════════════════════════════════════════════════════════════════════════════

describe('codigoSoporte', () => {
  test('"SOFV909 | SOFV909 Minigranja…" → "SOFV909"', () => {
    assert.equal(codigoSoporte('SOFV909 | SOFV909 Minigranja Solar El Son Mantenimiento'), 'SOFV909')
  })
  test('referencia simple', () => assert.equal(codigoSoporte('ABC123'), 'ABC123'))
  test('null → null', () => assert.equal(codigoSoporte(null), null))
})

describe('indiceSoportesProyecto', () => {
  test('indexa por tipo y por descripción/concepto normalizado', () => {
    const liq = {
      costos: [{ tipo_costo: 'mantenimiento', soporte_url: 'http://m', nro_soporte: 'SOFV1', descripcion: 'Mant Planta' }],
      facturas: [{ tipo_servicio: 'cgm', soporte_url: 'http://c', nro_soporte: 'F9' }],
      mandatos: [{ lineas: [{ tipo_linea: 'TipoLineaMandatoEnum.arriendo', soporte_url: 'http://a', referencia_factura: 'R5', concepto: 'Arr' }] }],
    }
    const idx = indiceSoportesProyecto(liq)
    assert.equal(idx['mantenimiento'].url, 'http://m')
    assert.equal(idx['mant planta'].url, 'http://m')   // descripción normalizada
    assert.equal(idx['cgm'].url, 'http://c')
    assert.equal(idx['arriendo'].url, 'http://a')
  })

  test('entrada nula no rompe', () => {
    assert.deepEqual(indiceSoportesProyecto(null), {})
    assert.deepEqual(indiceSoportesProyecto({}), {})
  })

  test('ignora líneas/costos sin url', () => {
    const idx = indiceSoportesProyecto({ costos: [{ tipo_costo: 'arriendo', soporte_url: null }] })
    assert.equal(idx['arriendo'], undefined)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  construirEstadoResultados
// ════════════════════════════════════════════════════════════════════════════

describe('construirEstadoResultados', () => {
  test('sin argumentos → estructura neutra', () => {
    const r = construirEstadoResultados()
    assert.equal(r.valorAPagar, 0)
    assert.equal(r.costosOperativos, 0)
    assert.equal(r.facturasTotal, 0)
    assert.equal(r.neto, 0)
    assert.deepEqual(r.grupos, [])
  })

  test('caso completo: ingresos, comercialización, ajustes, costos, facturas', () => {
    const ingresosMandatos = [{
      valor_neto_cop: 1000,
      lineas: [
        { tipo_linea: 'TipoLineaMandatoEnum.ingreso_bruto', valor_cop: 1200, concepto: 'Ingreso', soporte_url: 'http://a', referencia_factura: 'REF1' },
        { tipo_linea: 'comercializacion', valor_cop: -200, concepto: 'Com' },
        { tipo_linea: 'ajuste_unergy', valor_cop: 50, concepto: 'Ajuste' },
        { tipo_linea: 'valor_a_pagar', valor_cop: 1000 },   // se ignora
        { tipo_linea: 'ingreso_bruto', valor_cop: 0 },       // valor 0 → se ignora
      ],
    }]
    const costosMandatos = [{
      lineas: [
        { tipo_linea: 'mantenimiento', valor_cop: 300, concepto: 'Mant' },
        { tipo_linea: 'representacion', valor_cop: 100, concepto: 'Rep' },  // factura de servicio → fuera de OPEX
      ],
    }]
    const facturas = [
      { tipo_servicio: 'cgm', valor_cop: 80, nro_soporte: 'F1' },
      { tipo_servicio: 'cgm', valor_cop: 80, nro_soporte: 'F1' },          // duplicado → deduplicado
      { tipo_servicio: 'representacion', valor_cop: 120, soporte_url: 'http://f', numero_factura: 'NF2' },
    ]
    const r = construirEstadoResultados({ ingresosMandatos, costosMandatos, facturas })

    assert.equal(r.valorAPagar, 1000)         // de valor_neto_cop
    assert.equal(r.costosOperativos, 300)     // representación excluida
    assert.equal(r.facturasTotal, 200)        // 80 (cgm dedup) + 120
    assert.equal(r.neto, 500)                 // 1000 − 300 − 200

    const keys = r.grupos.map(g => g.key)
    assert.deepEqual(keys, ['ingresos', 'comercializacion', 'ajustes', 'costos', 'facturas'])
    const com = r.grupos.find(g => g.key === 'comercializacion')
    assert.equal(com.total, 200)              // valor absoluto
    assert.equal(com.sign, -1)
  })

  test('esAutoconsumo omite el grupo de comercialización', () => {
    const ingresosMandatos = [{
      valor_neto_cop: 1000,
      lineas: [
        { tipo_linea: 'ingreso_bruto', valor_cop: 1200, concepto: 'I' },
        { tipo_linea: 'comercializacion', valor_cop: -200, concepto: 'C' },
      ],
    }]
    const r = construirEstadoResultados({ ingresosMandatos, esAutoconsumo: true })
    assert.ok(!r.grupos.some(g => g.key === 'comercializacion'))
  })

  test('valorAPagar de respaldo: bruto − comercialización por líneas', () => {
    const ingresosMandatos = [{
      lineas: [
        { tipo_linea: 'ingreso_bruto', valor_cop: 1000, concepto: 'I' },
        { tipo_linea: 'comercializacion', valor_cop: -100, concepto: 'C' },
      ],
    }]
    const r = construirEstadoResultados({ ingresosMandatos })
    assert.equal(r.valorAPagar, 900)
  })

  test('costosOperativos de respaldo: valor_neto_cop del mandato de costos', () => {
    const r = construirEstadoResultados({ costosMandatos: [{ valor_neto_cop: 250, lineas: [] }] })
    assert.equal(r.costosOperativos, 250)
  })

  test('costosOperativos de respaldo: lista de costos a nivel proyecto', () => {
    const costos = [
      { tipo_costo: 'arriendo', valor_cop: 400, descripcion: 'Arr', soporte_url: 'u', nro_soporte: 'S1' },
      { tipo_costo: 'representacion', valor_cop: 50 },   // factura de servicio → excluida
      { tipo_costo: 'seguro', valor_cop: 0 },            // cero → excluido
    ]
    const r = construirEstadoResultados({ costos })
    assert.equal(r.costosOperativos, 400)
    assert.ok(r.grupos.some(g => g.key === 'costos'))
  })

  test('completa el soporte de una línea desde el índice de proyecto', () => {
    const idx = indiceSoportesProyecto({
      costos: [{ tipo_costo: 'mantenimiento', soporte_url: 'http://m', nro_soporte: 'SOFV1' }],
    })
    const costosMandatos = [{ lineas: [{ tipo_linea: 'mantenimiento', valor_cop: 300, concepto: 'Mant' }] }]
    const r = construirEstadoResultados({ costosMandatos, soportes: idx })
    const costos = r.grupos.find(g => g.key === 'costos')
    assert.equal(costos.lineas[0].soporte_url, 'http://m')
    assert.equal(costos.lineas[0].refCodigo, 'SOFV1')
  })

  test('completa el soporte por CONCEPTO cuando el tipo no está indexado', () => {
    const idx = indiceSoportesProyecto({
      costos: [{ tipo_costo: 'otro_costo_x', soporte_url: 'http://x', nro_soporte: 'SX', descripcion: 'Concepto Raro' }],
    })
    // La línea es de tipo 'seguro' (no indexado) pero su concepto coincide con la descripción indexada.
    const costosMandatos = [{ lineas: [{ tipo_linea: 'seguro', valor_cop: 99, concepto: 'Concepto Raro' }] }]
    const r = construirEstadoResultados({ costosMandatos, soportes: idx })
    const costos = r.grupos.find(g => g.key === 'costos')
    assert.equal(costos.lineas[0].soporte_url, 'http://x')
  })

  test('respaldo de costos usa la descripción como etiqueta si el tipo no tiene ETIQUETA', () => {
    const costos = [{ tipo_costo: 'tipo_inexistente', valor_cop: 500, descripcion: 'Mi Costo Especial', nro_soporte: 'S2' }]
    const r = construirEstadoResultados({ costos })
    const grupo = r.grupos.find(g => g.key === 'costos')
    assert.equal(grupo.lineas[0].label, 'Mi Costo Especial')
  })

  test('grupo de ajustes con total negativo lleva sign -1', () => {
    const ingresosMandatos = [{
      valor_neto_cop: 0,
      lineas: [{ tipo_linea: 'ajuste_unergy', valor_cop: -75, concepto: 'Ajuste neg' }],
    }]
    const r = construirEstadoResultados({ ingresosMandatos })
    const aj = r.grupos.find(g => g.key === 'ajustes')
    assert.equal(aj.total, -75)
    assert.equal(aj.sign, -1)
  })

  test('línea de impuesto (iva) no requiere soporte', () => {
    const costosMandatos = [{ lineas: [{ tipo_linea: 'iva', valor_cop: 19, concepto: 'IVA' }] }]
    const r = construirEstadoResultados({ costosMandatos })
    const costos = r.grupos.find(g => g.key === 'costos')
    assert.equal(costos.lineas[0].requiereSoporte, false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  SETS EXPORTADOS
// ════════════════════════════════════════════════════════════════════════════

describe('sets de clasificación', () => {
  test('TIPOS_SIN_SOPORTE incluye impuestos y valor_a_pagar', () => {
    assert.ok(TIPOS_SIN_SOPORTE.has('iva'))
    assert.ok(TIPOS_SIN_SOPORTE.has('valor_a_pagar'))
    assert.ok(!TIPOS_SIN_SOPORTE.has('mantenimiento'))
  })
  test('TIPOS_FACTURA_SERVICIO incluye representación/cgm/administración', () => {
    assert.ok(TIPOS_FACTURA_SERVICIO.has('representacion'))
    assert.ok(TIPOS_FACTURA_SERVICIO.has('cgm'))
    assert.ok(!TIPOS_FACTURA_SERVICIO.has('arriendo'))
  })
})
