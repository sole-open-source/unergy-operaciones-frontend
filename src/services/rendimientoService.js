// ──────────────────────────────────────────────────────────────────────────
// rendimientoService — expone la generación real (MWh) de fronteras/proyectos
// frente a las simulaciones P50/P90/P99, y la sincronización de datos de
// fronteras (estado operacional + medidor Quoia).
//
// NOTA sobre backend: al momento de escribir esto el backend (unergy-operaciones-
// backend, montado en /api/v1 vía @/api/client) todavía NO expone los endpoints
// mensuales de generación real por frontera/proyecto ni el POST de sincronización.
// Siguiendo la misma convención que reportAggregatorService.js, el servicio
// arranca en modo MOCK (datos deterministas y realistas) y deja cableada la ruta
// "real" para el día que existan. Las vistas ofrecen el toggle correspondiente.
//
// Las simulaciones P50/P90/P99 SÍ son reales: viven en el proyecto
// (p50_mensual_kwh / p90_mensual_kwh / p99_mensual_kwh, arreglos de 12 meses en
// kWh). Cuando la vista las tiene a mano se pasan por `opts.simulacion` y el mock
// solo genera la serie "real". Así el lado simulado del gráfico usa datos reales.
// ──────────────────────────────────────────────────────────────────────────

import api from '@/api/client'

// Endpoints previstos (aún no disponibles en el backend). Fuente única de verdad
// para cuando se implementen.
export const ENDPOINTS = {
  projectPerformance: (id) => `/proyectos/${id}/rendimiento`,
  fronteraPerformance: (id) => `/fronteras/${id}/rendimiento`,
  syncFronteras: '/sync_fronteras',
  fronteraStatus: (id) => `/fronteras/${id}/status`,
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ESTADOS_OP = ['normal', 'degradada', 'sin_datos', 'fuera_servicio']

// Perfil solar estacional (Colombia): más recurso en verano/inicio de año, menos
// en la temporada de lluvias. Índice por mes calendario (0=Ene … 11=Dic).
const SEASONAL = [1.08, 1.05, 1.02, 0.94, 0.9, 0.88, 0.95, 0.98, 0.96, 0.99, 1.02, 1.06]

// ── RNG determinista (sin Math.random) para estabilidad entre recargas ─────
function seeded(id) {
  let s = (Number(id) || 7) * 2654435761 % 0x7fffffff
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** Ventana de los últimos `n` meses (incluido el mes actual). */
function ultimosMeses(n) {
  const hoy = new Date()
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    out.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 })
  }
  return out
}

/** Normaliza `p50_mensual_kwh` etc.: acepta array, string JSON o null. MWh out. */
function parseSimArray(val) {
  let arr = val
  if (typeof val === 'string') {
    try { arr = JSON.parse(val) } catch { arr = null }
  }
  if (!Array.isArray(arr)) return null
  return arr.map(v => (v == null ? null : Number(v) / 1000)) // kWh → MWh
}

// ── Generador de la serie mock ─────────────────────────────────────────────
function buildMockSeries({ id, months, simulacion }) {
  const rnd = seeded(id)
  const base = 35 + Math.round(rnd() * 40) // ~35-75 MWh/mes de referencia
  const ventana = ultimosMeses(months)

  // Simulaciones reales por mes calendario (MWh), si la vista las proveyó.
  const p50Real = simulacion ? parseSimArray(simulacion.p50) : null
  const p90Real = simulacion ? parseSimArray(simulacion.p90) : null
  const p99Real = simulacion ? parseSimArray(simulacion.p99) : null

  return ventana.map(({ ano, mes }, idx) => {
    const cm = mes - 1 // índice mes calendario
    // P50/P90/P99: reales si existen, si no derivados del perfil estacional.
    let p50 = p50Real?.[cm]
    if (p50 == null) p50 = base * SEASONAL[cm]
    let p90 = p90Real?.[cm]
    if (p90 == null) p90 = p50 * 0.88
    let p99 = p99Real?.[cm]
    if (p99 == null) p99 = p50 * 0.8

    // Generación real: gira en torno a P50 con algún mes de bajón (falla).
    const esUltimo = idx === ventana.length - 1
    const sinDatos = esUltimo && rnd() < 0.18 // el mes en curso puede no estar aún
    let real = null
    let estado = 'normal'
    if (sinDatos) {
      estado = 'sin_datos'
    } else {
      const falla = rnd() < 0.14
      const factor = falla ? 0.55 + rnd() * 0.28 : 0.9 + rnd() * 0.18
      real = Math.round(p50 * factor * 10) / 10
      if (real < p99) estado = 'fuera_servicio'
      else if (real < p90) estado = 'degradada'
    }

    return {
      ano,
      mes,
      label: `${MESES[cm]} ${String(ano).slice(2)}`,
      real_mwh: real,
      p50: Math.round(p50 * 10) / 10,
      p90: Math.round(p90 * 10) / 10,
      p99: Math.round(p99 * 10) / 10,
      estado_operacional: estado,
    }
  })
}

/** Mapea la respuesta real del backend a la serie normalizada. */
function mapApiSeries(data) {
  const rows = Array.isArray(data) ? data : (data?.serie ?? data?.rendimiento ?? [])
  return rows.map(r => {
    const mes = Number(r.mes)
    const ano = Number(r.ano ?? r.anio ?? r.year)
    return {
      ano,
      mes,
      label: `${MESES[(mes - 1 + 12) % 12] || '?'} ${String(ano || '').slice(2)}`,
      real_mwh: r.real_mwh == null ? null : Number(r.real_mwh),
      p50: r.p50 == null ? null : Number(r.p50),
      p90: r.p90 == null ? null : Number(r.p90),
      p99: r.p99 == null ? null : Number(r.p99),
      estado_operacional: r.estado_operacional || 'normal',
    }
  })
}

/** KPIs agregados sobre una serie normalizada. */
export function computeKpis(series) {
  const sum = (key) => series.reduce((s, r) => s + (Number(r[key]) || 0), 0)
  const realTotal = sum('real_mwh')
  const p50Total = sum('p50')
  const p90Total = sum('p90')
  const p99Total = sum('p99')

  // Acumulado del año calendario en curso.
  const anoActual = new Date().getFullYear()
  const delAno = series.filter(r => r.ano === anoActual)
  const realYtd = delAno.reduce((s, r) => s + (Number(r.real_mwh) || 0), 0)
  const p50Ytd = delAno.reduce((s, r) => s + (Number(r.p50) || 0), 0)

  // Último mes con dato real disponible.
  const ultimoConDato = [...series].reverse().find(r => r.real_mwh != null) || null

  const cumplimientoP50Pct = p50Total > 0 ? (realTotal / p50Total) * 100 : null
  return {
    realTotal,
    p50Total,
    p90Total,
    p99Total,
    cumplimientoP50Pct,
    belowP90: realTotal < p90Total,
    realYtd,
    p50Ytd,
    cumplimientoYtdPct: p50Ytd > 0 ? (realYtd / p50Ytd) * 100 : null,
    ultimoMes: ultimoConDato,
    mesesSinDatos: series.filter(r => r.estado_operacional === 'sin_datos').length,
  }
}

/**
 * Rendimiento de un proyecto (agregado de sus fronteras del lado backend real,
 * o mock determinista mientras tanto).
 * @param {number|string} projectId
 * @param {{ useMock?: boolean, months?: number, simulacion?: {p50, p90, p99} }} [opts]
 * @returns {Promise<{ series: Array, kpis: object, meta: object }>}
 */
export async function getProjectPerformance(projectId, opts = {}) {
  const { useMock = true, months = 12, simulacion = null } = opts
  let series
  if (useMock) {
    series = buildMockSeries({ id: projectId, months, simulacion })
  } else {
    const { data } = await api.get(ENDPOINTS.projectPerformance(projectId), { params: { meses: months } })
    series = mapApiSeries(data)
  }
  return { series, kpis: computeKpis(series), meta: { source: useMock ? 'mock' : 'real', projectId, months } }
}

/**
 * Rendimiento de una frontera puntual.
 * @param {number|string} fronteraId
 * @param {{ useMock?: boolean, months?: number, simulacion?: object }} [opts]
 */
export async function getFronteraPerformance(fronteraId, opts = {}) {
  const { useMock = true, months = 12, simulacion = null } = opts
  let series
  if (useMock) {
    // Semilla desplazada para que la frontera no calque la serie del proyecto.
    series = buildMockSeries({ id: Number(fronteraId) * 13 + 5, months, simulacion })
  } else {
    const { data } = await api.get(ENDPOINTS.fronteraPerformance(fronteraId), { params: { meses: months } })
    series = mapApiSeries(data)
  }
  return { series, kpis: computeKpis(series), meta: { source: useMock ? 'mock' : 'real', fronteraId, months } }
}

/**
 * Estado operacional + medidor de una frontera (para el panel de sincronización).
 * @param {number|string} fronteraId
 * @param {{ useMock?: boolean }} [opts]
 */
export async function getFronteraStatus(fronteraId, opts = {}) {
  const { useMock = true } = opts
  if (!useMock) {
    const { data } = await api.get(ENDPOINTS.fronteraStatus(fronteraId))
    return {
      estado_operacional: data?.estado_operacional || 'sin_datos',
      quoia_meter_id: data?.quoia_meter_id ?? null,
      sincronizado_en: data?.sincronizado_en ?? data?.ultimo_sync ?? null,
    }
  }
  const rnd = seeded(Number(fronteraId) * 7 + 1)
  const estado = ESTADOS_OP[Math.floor(rnd() * ESTADOS_OP.length)]
  return {
    estado_operacional: estado,
    quoia_meter_id: rnd() < 0.2 ? null : `QM-${1000 + Math.floor(rnd() * 8999)}`,
    sincronizado_en: new Date(Date.now() - Math.floor(rnd() * 6) * 86400000).toISOString(),
  }
}

/**
 * Dispara la sincronización de fronteras (masiva o de una lista concreta).
 * @param {Array<number|string>|null} fronteraIds  null = todas
 * @param {{ useMock?: boolean }} [opts]
 * @returns {Promise<{ sincronizadas: number, errores: Array, sincronizado_en: string }>}
 */
export async function syncFronteras(fronteraIds = null, opts = {}) {
  const { useMock = true } = opts
  if (!useMock) {
    const { data } = await api.post(ENDPOINTS.syncFronteras, {
      frontera_ids: Array.isArray(fronteraIds) ? fronteraIds : undefined,
    })
    return {
      sincronizadas: Number(data?.sincronizadas ?? data?.count ?? 0),
      errores: Array.isArray(data?.errores) ? data.errores : [],
      sincronizado_en: data?.sincronizado_en ?? new Date().toISOString(),
    }
  }
  // Mock: pequeña espera para ejercitar la UI de progreso.
  await new Promise(r => setTimeout(r, 600))
  const ids = Array.isArray(fronteraIds) ? fronteraIds : []
  return {
    sincronizadas: ids.length,
    errores: [],
    sincronizado_en: new Date().toISOString(),
  }
}

export default {
  ENDPOINTS,
  getProjectPerformance,
  getFronteraPerformance,
  getFronteraStatus,
  syncFronteras,
  computeKpis,
}
