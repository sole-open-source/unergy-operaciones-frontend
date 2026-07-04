// ──────────────────────────────────────────────────────────────────────────
// reportAggregatorService — agrega datos técnicos (generación), de cumplimiento
// PPA, asignaciones XM e impacto financiero en un único objeto normalizado para
// el dashboard InformesMensualesDashboard.vue.
//
// NOTA sobre backend: al momento de escribir esto, el backend de la plataforma
// (unergy-operaciones-backend, montado en /api/v1 vía @/api/client) NO expone
// endpoints agregados de generación/PPA/XM/liquidaciones bajo la forma que
// necesita este panel. Por eso el servicio arranca en modo MOCK (datos de
// desarrollo, coherentes y realistas) y deja el camino "real" cableado a las
// rutas previstas para cuando existan. La UI ofrece un toggle Mock / Real.
// ──────────────────────────────────────────────────────────────────────────

import api from '@/api/client'
import {
  calculatePPARevenue, calculateSpotDifference, calculateSLAFine,
  calculateUnderGeneration, calculateCompliancePct,
} from '@/utils/financialCalculations'

// Endpoints previstos (aún no disponibles en el backend). Se dejan como una
// única fuente de verdad para el día que se implementen.
export const ENDPOINTS = {
  generation: '/generacion/historico',
  ppa: '/ppa/contratos',
  xm: '/xm/asignaciones',
  settlements: '/liquidaciones/xm',
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Días de un mes (1..12). */
function diasDelMes(month, year) {
  return new Date(year, month, 0).getDate()
}

// ── Generador de datos mock deterministas ──────────────────────────────────
// Determinista (sin Math.random) para que la UI sea estable entre recargas y
// fácil de validar. Varía por proyecto/mes mediante una semilla simple.
function seeded(projectId, month, year) {
  const base = (Number(projectId) || 7) * 31 + month * 7 + (year % 100)
  let s = base
  return () => {
    // LCG simple → fracción [0,1)
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function buildMock(projectId, month, year) {
  const dias = diasDelMes(month, year)
  const rnd = seeded(projectId, month, year)

  // Parámetros del contrato (mock)
  const ppaPrice = 250_000                       // COP/MWh
  const penaltyRate = 180_000                    // COP por MWh no generado
  const slaThresholdPct = 90                     // umbral de cumplimiento
  const contractedDailyMWh = 40 + Math.round(rnd() * 20)  // ~40-60 MWh/día

  // Serie diaria: generación real vs contratada, con algunos días de bajón.
  const serie = []
  let realTotal = 0
  let contractedTotal = 0
  for (let d = 1; d <= dias; d++) {
    const contracted = contractedDailyMWh * (0.9 + rnd() * 0.2)
    // Factor de desempeño: la mayoría de días ~0.85-1.05, algunos con falla.
    const falla = rnd() < 0.15
    const factor = falla ? 0.45 + rnd() * 0.25 : 0.85 + rnd() * 0.22
    const real = contracted * factor
    realTotal += real
    contractedTotal += contracted
    serie.push({
      fecha: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      real: Math.round(real * 10) / 10,
      contratada: Math.round(contracted * 10) / 10,
    })
  }

  // Asignaciones XM (una fila por semana ~ para no saturar la tabla).
  const spotBase = 230_000
  const xm = []
  for (let d = 1; d <= dias; d += 3) {
    const dia = serie[d - 1]
    if (!dia) continue
    const asignados = Math.round(dia.real * (0.3 + rnd() * 0.25) * 10) / 10
    const spot = Math.round((spotBase * (0.7 + rnd() * 0.8)) / 1000) * 1000
    const impacto = calculateSpotDifference(asignados, spot, ppaPrice)
    xm.push({
      fecha: dia.fecha,
      mwhAsignados: asignados,
      precioSpot: spot,
      precioPpa: ppaPrice,
      impacto,
      estado: spot >= ppaPrice ? 'Favorable' : 'Desfavorable',
    })
  }

  return {
    _meta: { source: 'mock', projectId, month, year },
    contrato: { ppaPrice, penaltyRate, slaThresholdPct },
    serie,
    xm,
    realTotalMWh: realTotal,
    contractedTotalMWh: contractedTotal,
    // Multa acumulada del año hasta el mes anterior (mock, para el "YTD").
    fineYtdPrevio: Math.round((month - 1) * 4_200_000 * (0.6 + rnd() * 0.8)),
  }
}

// ── Normalización → { technicalData, financialData, complianceMetrics } ─────
function normalize(raw) {
  const { contrato, serie, xm, realTotalMWh, contractedTotalMWh, fineYtdPrevio } = raw

  const underGen = calculateUnderGeneration(realTotalMWh, contractedTotalMWh)
  const compliancePct = calculateCompliancePct(realTotalMWh, contractedTotalMWh)

  const ingresoPPA = calculatePPARevenue(realTotalMWh, contrato.ppaPrice)
  const liquidacionXM = xm.reduce((s, r) => s + (r.impacto || 0), 0)
  const multaSLA = compliancePct != null && compliancePct < contrato.slaThresholdPct
    ? calculateSLAFine(underGen, contrato.penaltyRate)
    : 0
  const neto = ingresoPPA + liquidacionXM - multaSLA

  return {
    technicalData: {
      serie,                                  // [{ fecha, real, contratada }]
      realTotalMWh,
      contractedTotalMWh,
      gapMWh: underGen,
    },
    financialData: {
      ingresoPPA,
      liquidacionXM,
      multaSLA,
      neto,
      xm,                                     // detalle para la tabla
    },
    complianceMetrics: {
      compliancePct,
      slaThresholdPct: contrato.slaThresholdPct,
      breached: compliancePct != null && compliancePct < contrato.slaThresholdPct,
      penaltyRate: contrato.penaltyRate,
      ppaPrice: contrato.ppaPrice,
      underGenerationMWh: underGen,
      fineEstimated: multaSLA,
      fineYtd: fineYtdPrevio + multaSLA,
    },
    meta: {
      ...raw._meta,
      periodoLabel: `${MESES[raw._meta.month - 1]} ${raw._meta.year}`,
    },
  }
}

/**
 * Punto de entrada del servicio: agrega los datos del mes para un proyecto.
 *
 * @param {number|string} projectId
 * @param {number} month  1..12
 * @param {number} year
 * @param {{ useMock?: boolean }} [opts]  useMock=true (por defecto) usa datos
 *        de desarrollo; false intenta los endpoints reales (aún no disponibles).
 * @returns {Promise<{ technicalData, financialData, complianceMetrics, meta }>}
 */
export async function aggregateMonthlyData(projectId, month, year, opts = {}) {
  const { useMock = true } = opts

  if (useMock) {
    // Envuelto en Promise para que la UI ejerza su ruta async/loading real.
    return normalize(buildMock(projectId, month, year))
  }

  // ── Camino "real" (para cuando el backend exponga los endpoints) ──────────
  const params = { proyecto_id: projectId, mes: month, anio: year }
  const [gen, ppa, xm, settle] = await Promise.all([
    api.get(ENDPOINTS.generation, { params }),
    api.get(ENDPOINTS.ppa, { params: { proyecto_id: projectId } }),
    api.get(ENDPOINTS.xm, { params }),
    api.get(ENDPOINTS.settlements, { params }),
  ])

  const serie = (gen.data?.serie ?? []).map(d => ({
    fecha: d.fecha, real: Number(d.real) || 0, contratada: Number(d.contratada) || 0,
  }))
  const realTotalMWh = serie.reduce((s, d) => s + d.real, 0)
  const contractedTotalMWh = serie.reduce((s, d) => s + d.contratada, 0)
  const contrato = {
    ppaPrice: Number(ppa.data?.precio_ppa) || 0,
    penaltyRate: Number(ppa.data?.tasa_penalizacion) || 0,
    slaThresholdPct: Number(ppa.data?.umbral_sla) || 90,
  }
  const xmRows = (xm.data?.asignaciones ?? []).map(r => {
    const impacto = calculateSpotDifference(r.mwh, r.precio_spot, contrato.ppaPrice)
    return {
      fecha: r.fecha,
      mwhAsignados: Number(r.mwh) || 0,
      precioSpot: Number(r.precio_spot) || 0,
      precioPpa: contrato.ppaPrice,
      impacto,
      estado: (Number(r.precio_spot) || 0) >= contrato.ppaPrice ? 'Favorable' : 'Desfavorable',
    }
  })

  return normalize({
    _meta: { source: 'real', projectId, month, year },
    contrato,
    serie,
    xm: xmRows,
    realTotalMWh,
    contractedTotalMWh,
    fineYtdPrevio: Number(settle.data?.multa_ytd_previo) || 0,
  })
}

export default { aggregateMonthlyData, ENDPOINTS }
