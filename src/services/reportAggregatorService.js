// ──────────────────────────────────────────────────────────────────────────
// reportAggregatorService — agrega datos técnicos (generación), de cumplimiento
// PPA, exposición a bolsa (XM) e impacto financiero en un único objeto
// normalizado para el dashboard InformesMensualesDashboard.vue.
//
// Modo REAL (useMock=false): usa endpoints que YA existen en el backend
// (unergy-operaciones-backend, montado en /api/v1 vía @/api/client). Solo hace
// lecturas (GET); no escribe ninguna tabla.
//   - /ppa                   → contrato PPA del proyecto (tarifa_base = COP/kWh).
//   - /cumplimiento/ppa/resumen → FUENTE de los KPIs: generación real, obligación
//                              mínima (cumplimiento) y compras/excedentes de bolsa
//                              valorados en COP. Es por CONTRATO (misma data que la
//                              vista de Cumplimiento). Consulta la API de Unergy.
//   - /generacion            → solo la serie diaria del gráfico (kwh_real vs P90);
//                              si está vacía, los KPIs igual se llenan del resumen.
//
// Modo MOCK (useMock=true, por defecto en la UI para demo): datos de desarrollo
// deterministas, sin red. La UI ofrece un toggle Mock / Real.
// ──────────────────────────────────────────────────────────────────────────

import api from '@/api/client'
import {
  calculatePPARevenue, calculateSpotDifference, calculateSLAFine,
  calculateUnderGeneration, calculateCompliancePct,
} from '@/utils/financialCalculations'

// Endpoints reales del backend usados por el camino "real". Fuente única de
// verdad de las rutas que consume este panel.
export const ENDPOINTS = {
  generation: '/generacion',                 // GET ?proyecto_id&fecha_inicio&fecha_fin&size
  ppa: '/ppa',                               // GET ?proyecto_id
  cumplimiento: '/cumplimiento/ppa/resumen', // GET ?year&month
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Cache en memoria del resumen de cumplimiento por período (año-mes). El resumen
// abarca TODO el portafolio y es idéntico para cualquier proyecto del mismo mes,
// así que al cambiar de proyecto no repetimos la llamada pesada (consulta la API
// de Unergy por cada planta). Se limpia al recargar la página.
const _cumplimientoCache = new Map()

async function fetchCumplimientoResumen(month, year) {
  const key = `${year}-${month}`
  if (!_cumplimientoCache.has(key)) {
    const req = api
      .get(ENDPOINTS.cumplimiento, { params: { year, month }, timeout: 90000 })
      .then(r => r.data)
      .catch(() => null) // degradar a null: los KPIs quedan sin datos, con aviso en la UI
    _cumplimientoCache.set(key, req)
  }
  return _cumplimientoCache.get(key)
}

// Cache del Estado de Resultados (espejo del Panel Contable) por período. Igual
// que cumplimiento: abarca todo el portafolio y es idéntico para cualquier
// proyecto del mismo mes. Es solo lectura (no toca Liquidaciones).
const _panelCache = new Map()

async function fetchResumenPanel(month, year, tipo) {
  const periodo = `${year}-${String(month).padStart(2, '0')}`
  const key = `${periodo}|${tipo}`
  if (!_panelCache.has(key)) {
    const req = api
      .get('/liquidaciones/resumen-panel', { params: { periodo, tipo }, timeout: 60000 })
      .then(r => r.data)
      .catch(() => null)
    _panelCache.set(key, req)
  }
  return _panelCache.get(key)
}

// Cache del simulador (despacho GESCON por planta) por período. Consulta la API
// de Unergy, así que se cachea igual que el resumen. Solo lectura.
const _simuladorCache = new Map()

async function fetchSimulador(month, year) {
  const key = `${year}-${month}`
  if (!_simuladorCache.has(key)) {
    const req = api
      .get('/cumplimiento/simulador', { params: { year, month }, timeout: 90000 })
      .then(r => r.data)
      .catch(() => null)
    _simuladorCache.set(key, req)
  }
  return _simuladorCache.get(key)
}

// contrato_id al que GESCON despacha la energía de la planta (proyecto). Toma la
// fila primaria (id numérico == projectId); si solo hay duplicados, el primero con
// contrato. Devuelve null si la planta no está o no tiene contrato de venta.
function contratoIdPorGescon(sim, projectId) {
  if (!sim) return null
  const pid = Number(projectId)
  const plantas = sim.plantas ?? []
  const primaria = plantas.find(p => p.id === pid && p.contrato_id != null)
  if (primaria) return primaria.contrato_id
  const dup = plantas.find(p => typeof p.id === 'string' && p.id.startsWith(`${pid}_`) && p.contrato_id != null)
  return dup ? dup.contrato_id : null
}

// Busca la fila del proyecto en el Estado de Resultados del período, probando
// primero 'preliquidacion' (lo que muestra el detalle de la liquidación) y, si el
// proyecto aún no tiene panel ahí, 'oficial' (meses ya cerrados/finalizados). Así
// también aparecen las liquidaciones anteriores ya oficializadas.
async function buscarPanelProyecto(month, year, projectId) {
  const pid = Number(projectId)
  let fallback = null
  for (const tipo of ['preliquidacion', 'oficial']) {
    const pr = await fetchResumenPanel(month, year, tipo)
    const p = (pr?.proyectos ?? []).find(x => x.proyecto_id === pid) || null
    if (p && (p.ingresos_cop != null || p.valor_a_pagar_total != null)) return p
    if (p && !fallback) fallback = p
  }
  return fallback
}

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
 * @param {{ useMock?: boolean }} [opts]  useMock=true usa datos de desarrollo
 *        deterministas; false usa los endpoints reales del backend (ver cabecera).
 * @returns {Promise<{ technicalData, financialData, complianceMetrics, meta }>}
 */
export async function aggregateMonthlyData(projectId, month, year, opts = {}) {
  const { useMock = true } = opts

  if (useMock) {
    // Envuelto en Promise para que la UI ejerza su ruta async/loading real.
    return normalize(buildMock(projectId, month, year))
  }

  // ── Camino "real" (endpoints existentes del backend, solo lectura) ────────
  // Combina tres fuentes:
  //   • NIVEL PROYECTO: /generacion (serie diaria y MWh de la planta) + tarifa
  //     mensual del PPA (/ppa) → base para el estimado de ingreso si no hay panel.
  //   • ESTADO DE RESULTADOS: /liquidaciones/resumen-panel (espejo del Panel
  //     Contable) → Ingresos, Costos y Neto reales del proyecto (aunque la
  //     liquidación esté "iniciada"). Es la fuente primaria de las finanzas.
  //   • NIVEL CONTRATO: /cumplimiento/ppa/resumen → cumplimiento y bolsa/XM.
  const dias = diasDelMes(month, year)
  const pad = (n) => String(n).padStart(2, '0')
  const fechaInicio = `${year}-${pad(month)}-01`
  const fechaFin = `${year}-${pad(month)}-${pad(dias)}`
  const toMWh = (kwh) => (Number(kwh) || 0) / 1000

  const slaThresholdPct = 90

  // ── NIVEL PROYECTO (generación e ingresos de la planta seleccionada) ──────
  // 1. Serie y generación diaria REAL del proyecto (kwh_real). La "contratada"
  //    (P90) puede no estar cargada → se deja null para no pintar una línea en 0.
  let serie = []
  try {
    const gen = await api.get(ENDPOINTS.generation, {
      params: { proyecto_id: projectId, fecha_inicio: fechaInicio, fecha_fin: fechaFin, size: 400 },
    })
    serie = (gen.data?.items ?? [])
      .map(r => ({
        fecha: r.fecha,
        real: toMWh(r.kwh_real),
        contratada: r.kwh_p90 != null ? toMWh(r.kwh_p90) : null,
      }))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
  } catch { /* sin serie diaria: el gráfico queda vacío */ }
  const projectGenMWh = serie.reduce((s, d) => s + (d.real || 0), 0)
  const projectP90MWh = serie.reduce((s, d) => s + (d.contratada || 0), 0)

  // 2. Contratos PPA vigentes del proyecto por ENLACE DIRECTO (respaldo).
  let contratosDirectos = []
  try {
    const ppa = await api.get(ENDPOINTS.ppa, { params: { proyecto_id: projectId } })
    contratosDirectos = contratosVigentesVenta(ppa.data, month, year)
  } catch { /* sin contrato por enlace directo */ }

  // ── NIVEL CONTRATO (cumplimiento y bolsa/XM del contrato PPA) ─────────────
  // 3. Resumen de cumplimiento (por contrato) + simulador (despacho GESCON por
  //    planta). Ambos cacheados por mes. El contrato del proyecto se determina
  //    PRIMERO por GESCON (/cumplimiento/simulador → contrato_id de la planta),
  //    que es a dónde va realmente su energía y alcanza contratos SIN enlace
  //    directo (Terpel COX, NEU I, etc.). Respaldo: contrato directo más relevante.
  const [cum, sim] = await Promise.all([
    fetchCumplimientoResumen(month, year),
    fetchSimulador(month, year),
  ])
  const filaById = {}
  for (const c of (cum?.contratos ?? [])) filaById[c.id] = c

  const gesconId = contratoIdPorGescon(sim, projectId)
  const contratoId =
    (gesconId != null && filaById[gesconId]) ? gesconId
      : (elegirContratoRelevante(contratosDirectos, filaById)?.id
        ?? gesconId
        ?? contratosDirectos[0]?.id
        ?? null)
  const fila = contratoId != null ? (filaById[contratoId] || null) : null
  const precioBolsaKwh = cum?.valoracion_bolsa?.precio_bolsa_avg_cop_kwh
  const precioBolsa = precioBolsaKwh != null ? Number(precioBolsaKwh) * 1000 : null

  // Objeto del contrato (tarifa y nombre): del enlace directo si está ahí; si es un
  // contrato GESCON-only, se pide por id. El nombre puede venir del resumen.
  let ppaContrato = contratosDirectos.find(c => c.id === contratoId) || null
  if (!ppaContrato && contratoId != null) {
    try { ppaContrato = (await api.get(`/ppa/${contratoId}`)).data } catch { /* sin detalle */ }
  }
  const contratoNombre =
    ppaContrato?.nombre_interno || ppaContrato?.numero_codigo_contrato || fila?.nombre_interno || null

  // Precio PPA: tarifa MENSUAL del contrato (COP/kWh); tarifa_base suele venir null.
  const tarifaMes = ppaContrato?.tarifas?.find(
    t => Number(t['año'] ?? t.anio) === year && Number(t.mes) === month,
  )?.tarifa
  const ppaPrice = (Number(tarifaMes ?? ppaContrato?.tarifa_base ?? ppaContrato?.gescon_precio) || 0) * 1000
  const contratoGenMWh = fila ? Number(fila.gen_proyectada_mwh ?? fila.gen_total_mwh) || 0 : 0
  const contratoMinMWh = fila && fila.energia_minima_mwh != null ? Number(fila.energia_minima_mwh) || 0 : 0
  const compliancePct = calculateCompliancePct(contratoGenMWh, contratoMinMWh)
  const underGen = calculateUnderGeneration(contratoGenMWh, contratoMinMWh)
  const breached = compliancePct != null && compliancePct < slaThresholdPct

  // 4. Bolsa (XM) del contrato.
  const comprasMWh = Number(fila?.compras_bolsa_mwh) || 0
  const excedMWh = Number(fila?.excedentes_bolsa_mwh) || 0
  const comprasCop = Number(fila?.compras_bolsa_cop) || 0
  const excedCop = Number(fila?.excedentes_bolsa_cop) || 0

  const xmRows = []
  if (comprasMWh) {
    xmRows.push({
      fecha: 'Compras de bolsa', concepto: 'Compras de bolsa',
      mwhAsignados: comprasMWh, precioSpot: precioBolsa, precioPpa: ppaPrice,
      impacto: -comprasCop, estado: 'Desfavorable',
    })
  }
  if (excedMWh) {
    xmRows.push({
      fecha: 'Excedentes de bolsa', concepto: 'Excedentes de bolsa',
      mwhAsignados: excedMWh, precioSpot: precioBolsa, precioPpa: ppaPrice,
      impacto: excedCop, estado: 'Favorable',
    })
  }

  // 5. Ingresos PPA y Neto DEL PROYECTO desde el Estado de Resultados (espejo del
  //    Panel Contable) — es EXACTAMENTE lo que muestra la plataforma en el detalle
  //    de la liquidación, y funciona aunque la liquidación esté "iniciada" (se
  //    calcula de las líneas contables). Solo lectura. Si el proyecto aún no tiene
  //    Panel del período, estimamos generación del proyecto × tarifa.
  let panel = null
  try {
    panel = await buscarPanelProyecto(month, year, projectId)
  } catch { /* panel contable no disponible */ }

  const ingresoPanel = panel && panel.ingresos_cop != null ? Number(panel.ingresos_cop) : null
  const netoPanel = panel && panel.valor_a_pagar_total != null ? Number(panel.valor_a_pagar_total) : null
  // costos_cop viene firmado negativo (deducción); lo mostramos en magnitud.
  const costosTotales = panel && panel.costos_cop != null ? Math.abs(Number(panel.costos_cop)) : null
  const liquidada = ingresoPanel != null || netoPanel != null

  const ingresoPPA = ingresoPanel != null ? ingresoPanel : calculatePPARevenue(projectGenMWh, ppaPrice)
  const liquidacionXM = excedCop           // excedentes de bolsa del contrato (contexto)
  const multaSLA = comprasCop              // compras de bolsa del contrato (proyectado)
  // Neto del Estado de Resultados si existe; si no, ingreso estimado del proyecto.
  const neto = netoPanel != null ? netoPanel : ingresoPPA

  return {
    technicalData: {
      serie,
      realTotalMWh: projectGenMWh,          // generación del PROYECTO
      contractedTotalMWh: projectP90MWh,    // P90 del proyecto (0 si no está cargado)
      gapMWh: underGen,
    },
    financialData: {
      ingresoPPA,
      liquidacionXM,
      multaSLA,
      neto,
      // Desglose del Estado de Resultados (para la tarjeta de impacto financiero).
      costosTotales,
      liquidada,
      xm: xmRows,
    },
    complianceMetrics: {
      compliancePct,                        // a nivel de CONTRATO
      slaThresholdPct,
      breached,
      penaltyRate: 0,
      ppaPrice,
      underGenerationMWh: underGen,
      fineEstimated: multaSLA,
      fineYtd: multaSLA,
      esContrato: true,                     // marca: cumplimiento/bolsa son del contrato
      contratoGenMWh,
      contratoMinMWh,
    },
    meta: {
      source: 'real',
      projectId,
      month,
      year,
      periodoLabel: `${MESES[month - 1]} ${year}`,
      contratoNombre,
      sinContrato: contratoId == null,
      sinDatosCumplimiento: contratoId != null && !fila,
      tarifaPPA: tarifaMes != null ? Number(tarifaMes) : null,
      // true = estimado (gen×tarifa); false = Estado de Resultados (Panel Contable)
      ingresoEstimado: ingresoPanel == null,
    },
  }
}

/**
 * Contratos de VENTA vigentes en (month, year) para un proyecto, de la lista que
 * devuelve GET /ppa?proyecto_id. Si no hay de venta vigentes, degrada a los que
 * haya (para no quedarse sin contrato).
 * @param {Array} contratos  PPAContratoOut[]
 * @returns {Array}
 */
function contratosVigentesVenta(contratos, month, year) {
  if (!Array.isArray(contratos) || !contratos.length) return []
  const primerDia = new Date(year, month - 1, 1)
  const ultimoDia = new Date(year, month, 0)
  const vig = (c) => {
    const fi = c.fecha_inicio ? new Date(c.fecha_inicio) : null
    const ff = c.fecha_fin ? new Date(c.fecha_fin) : null
    return (!fi || fi <= ultimoDia) && (!ff || ff >= primerDia)
  }
  const venta = contratos.filter(c => (c.tipo_contrato || 'venta') !== 'compra')
  const base = venta.length ? venta : contratos
  const vigentes = base.filter(vig)
  return vigentes.length ? vigentes : base
}

/**
 * De los contratos del proyecto, elige el MÁS RELEVANTE para el mes usando el
 * resumen de cumplimiento (indexado por id): prioriza el que tiene movimiento de
 * bolsa, luego el que tiene compromiso de energía, luego cualquiera con fila, y
 * por último el primero. Así Cumplimiento y la pestaña XM reflejan el contrato
 * que realmente opera ese mes cuando la planta está en varios.
 * @param {Array} contratos
 * @param {Record<number, object>} filaById  filas del resumen de cumplimiento
 * @returns {object|null}
 */
function elegirContratoRelevante(contratos, filaById) {
  if (!contratos.length) return null
  const score = (c) => {
    const f = filaById[c.id]
    if (!f) return 0
    if ((Number(f.compras_bolsa_mwh) || 0) > 0 || (Number(f.excedentes_bolsa_mwh) || 0) > 0) return 3
    if (f.energia_minima_mwh != null) return 2
    return 1
  }
  return [...contratos].sort((a, b) => score(b) - score(a))[0]
}

export default { aggregateMonthlyData, ENDPOINTS }
