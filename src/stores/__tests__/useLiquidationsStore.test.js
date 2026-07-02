import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLiquidationsStore } from '@/stores/useLiquidationsStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useLiquidationsStore · formato', () => {
  it('fmtCOP formatea moneda y devuelve — para null', () => {
    const s = useLiquidationsStore()
    expect(s.fmtCOP(null)).toBe('—')
    const out = s.fmtCOP(1000)
    expect(out).toContain('1.000')
    expect(out).toContain('$')
  })

  it('fmtCompact usa sufijos K/M/B con signo', () => {
    const s = useLiquidationsStore()
    expect(s.fmtCompact(null)).toBe('—')
    expect(s.fmtCompact(2_000_000)).toBe('$2.0M')
    expect(s.fmtCompact(-3_000_000_000)).toBe('-$3.0B')
    expect(s.fmtCompact(5_000)).toBe('$5K')
    expect(s.fmtCompact(500)).toBe('$500')
  })

  it('formatPeriodo y toISOMonth', () => {
    const s = useLiquidationsStore()
    expect(s.formatPeriodo('2026-05-01')).toBe('May 2026')
    expect(s.formatPeriodo('')).toBe('')
    // Fecha construida con componentes locales para no depender de la zona horaria.
    expect(s.toISOMonth(new Date(2026, 4, 15))).toBe('2026-05-01')
    expect(s.toISOMonth(null)).toBeNull()
    expect(s.mesActualISO()).toMatch(/^\d{4}-\d{2}-01$/)
  })
})

describe('useLiquidationsStore · normalizaciones y estados', () => {
  it('normTipo quita el prefijo del enum del backend', () => {
    const s = useLiquidationsStore()
    expect(s.normTipo('TipoLineaMandatoEnum.ingreso_bruto')).toBe('ingreso_bruto')
    expect(s.normTipo('mantenimiento')).toBe('mantenimiento')
    expect(s.normTipo(null)).toBe('')
  })

  it('normPct acepta 0–1 o 0–100 y pct los formatea', () => {
    const s = useLiquidationsStore()
    expect(s.normPct(50)).toBeCloseTo(0.5)
    expect(s.normPct(0.5)).toBeCloseTo(0.5)
    expect(s.normPct(1)).toBe(1)
    expect(s.pct(11.06)).toBe('11.06%')
    expect(s.pct(0.1106)).toBe('11.06%')
  })

  it('estadoSeverity / estadoLabel / facturaEstadoSeverity con defaults', () => {
    const s = useLiquidationsStore()
    expect(s.estadoSeverity('facturado')).toBe('success')
    expect(s.estadoSeverity('desconocido')).toBe('secondary')
    expect(s.estadoLabel('iniciada')).toBe('Iniciada')
    expect(s.estadoLabel('zzz')).toBe('zzz')
    expect(s.estadoLabel(null)).toBe('—')
    expect(s.facturaEstadoSeverity('pagada')).toBe('success')
    expect(s.facturaEstadoSeverity('otra')).toBe('secondary')
  })

  it('codigoSoporte toma el primer código de la referencia', () => {
    const s = useLiquidationsStore()
    expect(s.codigoSoporte('SOFV909 | SOFV909 Minigranja Solar El Son Mes Abril')).toBe('SOFV909')
    expect(s.codigoSoporte(null)).toBeNull()
  })
})

describe('useLiquidationsStore · cálculo del neto (vista por-proyecto)', () => {
  const liq = {
    mandatos_total_ingresos: [{ valor_neto_cop: 1000 }],
    mandatos_total_costos: [{ valor_neto_cop: 200 }],
    facturas_servicio: [{ valor_cop: 100 }],
  }

  it('netoFromVista = valor a pagar − costos − facturas', () => {
    const s = useLiquidationsStore()
    expect(s.netoFromVista(liq)).toBe(700)
    expect(s.netoFromVista(null)).toBe(0)
  })

  it('netoFromVista usa el resumen pre-calculado cuando no hay mandatos', () => {
    const s = useLiquidationsStore()
    expect(s.netoFromVista({ resumen: { ingreso_neto_cop: 555 } })).toBe(555)
  })

  it('valorAPagarFromVista y costosFromVista', () => {
    const s = useLiquidationsStore()
    expect(s.valorAPagarFromVista(liq)).toBe(1000)
    expect(s.costosFromVista(liq)).toBe(300)
  })
})

describe('useLiquidationsStore · estado de resultados', () => {
  it('construirEstadoResultados agrupa ingresos/comercialización/costos/facturas y calcula el neto', () => {
    const s = useLiquidationsStore()
    const res = s.construirEstadoResultados({
      ingresosMandatos: [{
        valor_neto_cop: 1000,
        lineas: [
          { tipo_linea: 'ingreso_bruto', valor_cop: 1200 },
          { tipo_linea: 'ajuste_comercializacion', valor_cop: -200 },
        ],
      }],
      costosMandatos: [{
        lineas: [
          { tipo_linea: 'mantenimiento', valor_cop: 300 },
          { tipo_linea: 'representacion', valor_cop: 50 }, // factura de servicio: NO cuenta como OPEX
        ],
      }],
      facturas: [{ tipo_servicio: 'representacion', valor_cop: 80 }],
    })
    expect(res.valorAPagar).toBe(1000)
    expect(res.costosOperativos).toBe(300)
    expect(res.facturasTotal).toBe(80)
    expect(res.neto).toBe(620)
    const keys = res.grupos.map((g) => g.key)
    expect(keys).toEqual(expect.arrayContaining(['ingresos', 'comercializacion', 'costos', 'facturas']))
  })

  it('dedup de facturas duplicadas (mismo servicio y valor) — se cuentan una vez', () => {
    const s = useLiquidationsStore()
    const res = s.construirEstadoResultados({
      ingresosMandatos: [{ valor_neto_cop: 500, lineas: [] }],
      facturas: [
        { tipo_servicio: 'cgm', valor_cop: 100 },
        { tipo_servicio: 'cgm', valor_cop: 100 },
      ],
    })
    expect(res.facturasTotal).toBe(100)
    expect(res.neto).toBe(400)
  })

  it('esAutoconsumo omite el grupo de comercialización', () => {
    const s = useLiquidationsStore()
    const res = s.construirEstadoResultados({
      ingresosMandatos: [{
        valor_neto_cop: 1000,
        lineas: [
          { tipo_linea: 'ingreso_bruto', valor_cop: 1000 },
          { tipo_linea: 'ajuste_comercializacion', valor_cop: -50 },
        ],
      }],
      esAutoconsumo: true,
    })
    expect(res.grupos.map((g) => g.key)).not.toContain('comercializacion')
  })

  it('indiceSoportesProyecto indexa adjuntos por tipo y por descripción', () => {
    const s = useLiquidationsStore()
    const idx = s.indiceSoportesProyecto({
      costos: [{ tipo_costo: 'mantenimiento', descripcion: 'Mtto planta', soporte_url: 'http://x/1.pdf', nro_soporte: 'SOFV1' }],
      facturas: [{ tipo_servicio: 'cgm', soporte_url: 'http://x/2.pdf', nro_soporte: 'SOFV2' }],
    })
    expect(idx.mantenimiento).toEqual({ url: 'http://x/1.pdf', ref: 'SOFV1' })
    expect(idx['mtto planta']).toBeTruthy()
    expect(idx.cgm.url).toBe('http://x/2.pdf')
  })
})

describe('useLiquidationsStore · liquidación activa (estado + getters)', () => {
  it('setLiquidation deriva neto / valorAPagar / costos y reset los limpia', () => {
    const s = useLiquidationsStore()
    s.setLiquidation({
      mandatos_total_ingresos: [{ valor_neto_cop: 1000 }],
      mandatos_total_costos: [{ valor_neto_cop: 200 }],
      facturas_servicio: [{ valor_cop: 100 }],
    })
    expect(s.neto).toBe(700)
    expect(s.valorAPagar).toBe(1000)
    expect(s.costos).toBe(300)
    s.reset()
    expect(s.liquidationData).toBeNull()
    expect(s.neto).toBe(0)
  })
})
