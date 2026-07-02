import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMandatesStore } from '@/stores/useMandatesStore'

// Etiqueta analítica usada en varios casos (proyecto La Reserva).
const TAG = 'MINIGRANJA SOLAR LA RESERVA'

// Matriz de COSTOS (formato SheetJS header:1) con una línea de mantenimiento.
const costosMatriz = [
  ['Asiento contable', 'Asociado', 'Cuenta', 'Debe', 'Haber', 'Etiqueta', 'Cuenta analitica'],
  ['AS1', 'STRADA ASOCIADOS S A S', '28151002 Mantenimiento', '497333', '0', 'x', TAG],
]

// Matriz de INGRESOS: neto de 28150505 por (asociado, planta); 28151001 es
// contra-asiento y 28150501 es del comercializador (ambos se ignoran).
const ingresosMatriz = [
  ['Asiento contable', 'Cuenta', 'Asociado', 'Etiqueta', 'Debe', 'Haber'],
  ['CM/1', '28150505 INGRESO DE ENERGIA', 'RODRIGUEZ VELEZ BEATRIZ', 'INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 0, 3712635.47],
  ['CM/1', '28150505 INGRESO DE ENERGIA', 'RODRIGUEZ VELEZ BEATRIZ', 'COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 273321.72, 0],
  ['CM/1', '28151001 FACTURAS DE COMERCIALIZACION', 'RODRIGUEZ VELEZ BEATRIZ', 'COMERCIALIZACIÓN MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 0, 273321.72],
  ['CM/1', '28150501 GANANCIAS POR PARTICIPACION', 'TERPEL ENERGIA S.A.S E.S.P', 'INGRESO BRUTO MINIGRANJA SOLAR URUACO ABRIL 2026 TERPEL', 3712635.47, 0],
]

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useMandatesStore · estado inicial', () => {
  it('arranca con soporte vacío, sin cargar y sin error', () => {
    const s = useMandatesStore()
    expect(s.contabilidadData).toEqual([])
    expect(s.asientosDetalle).toEqual([])
    expect(s.tagsAnaliticos).toEqual([])
    expect(s.savedTagMap).toEqual({})
    expect(s.isLoading).toBe(false)
    expect(s.error).toBeNull()
  })
})

describe('useMandatesStore · loadContabilidad', () => {
  it('procesa la matriz de costos: detalle línea-a-línea + etiquetas analíticas', () => {
    const s = useMandatesStore()
    const counts = s.loadContabilidad(costosMatriz)
    expect(counts).toEqual({ grupos: 0, lineas: 1, tags: 1 })
    expect(s.asientosDetalle).toHaveLength(1)
    expect(s.tagsAnaliticos).toContain(TAG)
    expect(s.isLoading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('procesa la matriz de ingresos: 1 grupo con el neto correcto (28150501 excluido)', () => {
    const s = useMandatesStore()
    const counts = s.loadContabilidad(ingresosMatriz)
    expect(counts.grupos).toBe(1)
    const rodri = s.contabilidadData.find((g) => g.asociado.includes('RODRIGUEZ'))
    expect(rodri).toBeTruthy()
    expect(Math.round(Math.abs(rodri.valor_contabilidad))).toBe(3439314)
  })

  it('con matriz vacía no lanza y devuelve conteos en cero', () => {
    const s = useMandatesStore()
    expect(s.loadContabilidad([])).toEqual({ grupos: 0, lineas: 0, tags: 0 })
    expect(s.error).toBeNull()
  })

  it('reset limpia el soporte pero conserva el mapa recordado', () => {
    const s = useMandatesStore()
    s.loadContabilidad(costosMatriz)
    s.rememberTag('La Reserva', TAG)
    s.reset()
    expect(s.asientosDetalle).toEqual([])
    expect(s.tagsAnaliticos).toEqual([])
    expect(s.savedTagMap).toHaveProperty('LA RESERVA', TAG)
  })
})

describe('useMandatesStore · sugerencia y memoria de etiquetas', () => {
  it('suggestTagFor empareja por token contra las etiquetas cargadas', () => {
    const s = useMandatesStore()
    s.loadContabilidad(costosMatriz)
    const sug = s.suggestTagFor('La Reserva')
    expect(sug.tag).toBe(TAG)
    expect(sug.status).toBe('auto')
  })

  it('rememberTag persiste en localStorage y luego sugiere "recordado"', () => {
    const s = useMandatesStore()
    s.loadContabilidad(costosMatriz)
    s.rememberTag('La Reserva', TAG)
    // persistencia
    const raw = JSON.parse(localStorage.getItem('conc_costos_tagmap'))
    expect(raw).toHaveProperty('LA RESERVA', TAG)
    // el mapa recordado tiene prioridad → status 'recordado'
    expect(s.suggestTagFor('La Reserva').status).toBe('recordado')
  })

  it('rememberTag ignora tag o proyecto vacíos', () => {
    const s = useMandatesStore()
    s.rememberTag('', TAG)
    s.rememberTag('Algo', '')
    expect(s.savedTagMap).toEqual({})
    expect(localStorage.getItem('conc_costos_tagmap')).toBeNull()
  })
})

describe('useMandatesStore · conciliación de costos (sobre estado cargado)', () => {
  it('reconcile concilia el mandato contra el detalle cargado', () => {
    const s = useMandatesStore()
    s.loadContabilidad(costosMatriz)
    const rec = s.reconcile({ mandante: 'STRADA ASOCIADOS S.A.S.', vals: { mant: 497333 }, total: 497333 }, TAG)
    expect(rec.sums.mant).toBe(497333)
    expect(rec.status).toBe('ok')
  })

  it('reconcile sin etiqueta devuelve status bad (SIN_TAG)', () => {
    const s = useMandatesStore()
    s.loadContabilidad(costosMatriz)
    const rec = s.reconcile({ mandante: 'STRADA ASOCIADOS S.A.S.', vals: { mant: 497333 } }, '')
    expect(rec.status).toBe('bad')
    expect(rec.flags[0].code).toBe('SIN_TAG')
  })

  it('reconcileCosto orquesta sugerencia + conciliación en un solo paso', () => {
    const s = useMandatesStore()
    s.loadContabilidad(costosMatriz)
    const r = s.reconcileCosto({ mandante: 'STRADA ASOCIADOS S.A.S.', projName: 'La Reserva', vals: { mant: 497333 }, total: 497333 })
    expect(r.tag).toBe(TAG)
    expect(r.sugStatus).toBe('auto')
    expect(r.status).toBe('ok')
    expect(r.sums.mant).toBe(497333)
  })
})

describe('useMandatesStore · emparejamiento de ingresos (sobre estado cargado)', () => {
  it('matchIngreso empareja por mandante (palabra completa) + planta', () => {
    const s = useMandatesStore()
    s.loadContabilidad(ingresosMatriz)
    const g = s.matchIngreso({ mandante: 'Rodríguez Vélez Beatriz', projName: 'Minigranja Solar Uruaco' })
    expect(g).toBeTruthy()
    expect(g.planta).toBe('MINIGRANJA SOLAR URUACO')
  })

  it('matchIngreso devuelve null cuando no hay planta reconocible', () => {
    const s = useMandatesStore()
    s.loadContabilidad(ingresosMatriz)
    expect(s.matchIngreso({ mandante: 'Rodríguez Vélez Beatriz', projName: '' })).toBeNull()
  })
})

// ── Cobertura del motor puro re-expuesto por el store ────────────────────────
describe('useMandatesStore · motor puro re-expuesto', () => {
  it('extractMandate lee mandante / NIT / conceptos / total del cuerpo del PDF', () => {
    const s = useMandatesStore()
    const pdf = [
      'CMU12345',
      'en calidad de mandatario, y STRADA ASOCIADOS S.A.S., con NIT. 900.123.456-7, en calidad de mandante, relacionado con el proyecto MINIGRANJA SOLAR LA RESERVA.',
      'MANTENIMIENTO $ 497.333',
      'VALOR A PAGAR $ 497.333',
    ].join('\n')
    const m = s.extractMandate(pdf, 'x-CMU12345.pdf')
    expect(m.cmu).toBe('CMU12345')
    expect(m.mandante).toContain('STRADA')
    expect(m.nit).toBe('900.123.456-7')
    expect(m.vals.mant).toBe(497333)
    expect(m.total).toBe(497333)
  })

  it('reconciliar empareja por PALABRA COMPLETA: STRADA no suma Estrada', () => {
    const s = useMandatesStore()
    const details = [
      { asociado: 'STRADA ASOCIADOS S A S', acc: '28151002', accDesc: '', debe: 497333, haber: 0, etiqueta: '', proj: TAG },
      { asociado: 'INVERSIONES ESTRADA ARBELAEZ Y CIA S. EN C.', acc: '28151002', accDesc: '', debe: 2655667, haber: 0, etiqueta: '', proj: TAG },
    ]
    const res = s.reconciliar({ mandante: 'STRADA ASOCIADOS S.A.S.', vals: { mant: 497333 }, total: 497333 }, details, TAG)
    expect(res.sums.mant).toBe(497333)
    expect(res.lines).toHaveLength(1)
    expect(res.status).toBe('ok')
  })

  it('reconciliar arriendo (La Esmeralda): suma los DÉBITOS de los 5 contratos del mandante', () => {
    const s = useMandatesStore()
    const ESM = '[10038] LA ESMERALDA'
    const BANC = 'PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA SA SOCIEDAD FIDUCIARIA'
    const DEB = 368513.81
    const lineas = []
    for (const ct of ['30980', '30976', '30982', '30978', '30974']) {
      lineas.push({ asociado: BANC, acc: '28150517', accDesc: 'Costo arriendo', debe: 0, haber: DEB, etiqueta: ct, proj: ESM })
      lineas.push({ asociado: BANC, acc: '28150517', accDesc: 'Costo arriendo', debe: DEB, haber: 0, etiqueta: ct, proj: ESM })
    }
    // Créditos a arrendadores (personas naturales): no son del mandante y son crédito → fuera.
    ;['EDGARDO JESUS AROCA MENDIOLA', 'DULM DAYAN AROCA GUTIERREZ', 'CARLOS ALBERTO AROCA MINDIOLA'].forEach((p, i) =>
      lineas.push({ asociado: p, acc: '28150517', accDesc: 'Costo arriendo', debe: 0, haber: 184256.91, etiqueta: ['30982', '30978', '30974'][i], proj: ESM }))
    const res = s.reconciliar({ mandante: BANC, vals: { arr: 1842569 }, total: 1842569 }, lineas, ESM)
    expect(Math.round(res.sums.arr)).toBe(1842569)
    expect(res.lines.every((l) => l.asociado === BANC)).toBe(true)
    expect(res.status).toBe('ok')
  })

  it('matchIngresoContab distingue NAOS 1 de NAOS 2 por el número', () => {
    const s = useMandatesStore()
    const grupos = [
      { asociado: 'GD EL REMOLINO 1 S.A.S. E.S.P', planta: 'GD NAOS 1', valor_contabilidad: -58469697 },
      { asociado: 'GD EL REMOLINO 1 S.A.S. E.S.P', planta: 'GD NAOS 2', valor_contabilidad: -56507155 },
    ]
    const g = s.matchIngresoContab({ mandante: 'GD EL REMOLINO 1 S.A.S. E.S.P.', projName: 'GD NAOS 1' }, grupos)
    expect(g.planta).toBe('GD NAOS 1')
  })

  it('parseAsientos detecta columnas y arma detalle + etiquetas', () => {
    const s = useMandatesStore()
    const pa = s.parseAsientos(costosMatriz)
    expect(pa.details).toHaveLength(1)
    expect(pa.tags).toContain(TAG)
    expect(pa.details[0].acc).toBe('28151002')
  })
})
