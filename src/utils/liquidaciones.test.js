import { describe, it, expect } from 'vitest'
import {
  netoFromVista, valorAPagarFromVista, costosFromVista,
  construirEstadoResultados, normPct, pct,
} from './liquidaciones.js'

describe('netoFromVista', () => {
  it('neto = valor a pagar − costos − facturas de servicio', () => {
    const liq = {
      mandatos_total_ingresos: [{ valor_neto_cop: 1000000 }],
      mandatos_total_costos: [{ valor_neto_cop: 200000 }],
      facturas_servicio: [{ valor_cop: 50000 }, { valor_cop: 25000 }],
    }
    expect(netoFromVista(liq)).toBe(1000000 - 200000 - 75000)
  })
  it('cae al resumen pre-calculado cuando no hay desglose', () => {
    expect(netoFromVista({ resumen: { ingreso_neto_cop: 123.45 } })).toBe(123.45)
  })
  it('null → 0', () => {
    expect(netoFromVista(null)).toBe(0)
  })
  it('no acumula error de coma flotante en sumas decimales', () => {
    const liq = {
      mandatos_total_ingresos: [{ valor_neto_cop: 0.1 }, { valor_neto_cop: 0.2 }],
      mandatos_total_costos: [],
      facturas_servicio: [],
    }
    expect(netoFromVista(liq)).toBe(0.3) // con + nativo daría 0.30000000000000004
  })
})

describe('valorAPagarFromVista / costosFromVista', () => {
  it('valorAPagar suma mandatos de ingresos', () => {
    expect(valorAPagarFromVista({ mandatos_total_ingresos: [{ valor_neto_cop: 10 }, { valor_neto_cop: 5.5 }] })).toBe(15.5)
  })
  it('costos = mandatos de costos + facturas de servicio', () => {
    expect(costosFromVista({
      mandatos_total_costos: [{ valor_neto_cop: 100 }],
      facturas_servicio: [{ valor_cop: 25 }],
    })).toBe(125)
  })
})

describe('construirEstadoResultados', () => {
  it('calcula neto y grupos a partir de mandatos con valor_neto_cop', () => {
    const r = construirEstadoResultados({
      ingresosMandatos: [{ valor_neto_cop: 1000 }],
      costosMandatos: [{ valor_neto_cop: 300 }],
      facturas: [{ tipo_servicio: 'cgm', valor_cop: 100 }],
    })
    expect(r.valorAPagar).toBe(1000)
    expect(r.costosOperativos).toBe(300)
    expect(r.facturasTotal).toBe(100)
    expect(r.neto).toBe(600)
  })

  it('deriva valor a pagar de líneas brutas − comercialización cuando no hay neto', () => {
    const r = construirEstadoResultados({
      ingresosMandatos: [{
        lineas: [
          { tipo_linea: 'ingreso_bruto', valor_cop: 1000 },
          { tipo_linea: 'comercializacion', valor_cop: -150 },
        ],
      }],
    })
    // energia es ingreso bruto; comercializacion se resta en valor absoluto
    expect(r.valorAPagar).toBe(850)
  })
})

describe('normPct / pct', () => {
  it('normaliza 0–100 a fracción y deja 0–1 igual', () => {
    expect(normPct(50)).toBe(0.5)
    expect(normPct(0.5)).toBe(0.5)
  })
  it('pct formatea a 2 decimales', () => {
    expect(pct(0.1106)).toBe('11.06%')
    expect(pct(11.06)).toBe('11.06%')
  })
})
