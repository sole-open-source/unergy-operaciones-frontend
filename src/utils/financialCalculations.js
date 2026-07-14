// ──────────────────────────────────────────────────────────────────────────
// Cálculos financieros del panel de Informes Mensuales (dashboard agregado).
// Funciones PURAS: sin efectos secundarios, sin dependencias de red. Toleran
// valores nulos / cero para que la UI nunca reviente por datos faltantes.
//
// Convención de unidades:
//   - Generación en MWh.
//   - Precios en COP/MWh (el llamador debe pasar precios en la misma unidad
//     que la energía; si maneja $/kWh, multiplique ×1000 antes de invocar).
// ──────────────────────────────────────────────────────────────────────────

/** Convierte a número finito; null / undefined / NaN → 0. */
function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Ingreso PPA = energía generada × precio contratado.
 * @param {number} generationMWh  Energía facturable bajo PPA (MWh).
 * @param {number} price          Precio del PPA (COP/MWh).
 * @returns {number} Ingreso en COP (0 si algún insumo es inválido).
 */
export function calculatePPARevenue(generationMWh, price) {
  const mwh = toNum(generationMWh)
  const p = toNum(price)
  if (mwh <= 0 || p <= 0) return 0
  return mwh * p
}

/**
 * Impacto financiero de exponer la generación al precio spot en lugar del PPA.
 * Positivo → el spot pagó más que el PPA (favorable); negativo → desfavorable.
 * @param {number} realGen    Energía asignada al mercado (MWh).
 * @param {number} spotPrice  Precio spot / bolsa (COP/MWh).
 * @param {number} ppaPrice   Precio del PPA (COP/MWh).
 * @returns {number} Diferencial en COP.
 */
export function calculateSpotDifference(realGen, spotPrice, ppaPrice) {
  const mwh = toNum(realGen)
  if (mwh <= 0) return 0
  return mwh * (toNum(spotPrice) - toNum(ppaPrice))
}

/**
 * Multa SLA proyectada por subgeneración frente a la obligación contractual.
 * Solo penaliza el déficit (subgeneración > 0); un excedente no genera multa.
 * @param {number} underGeneration  Déficit de energía (MWh). Se usa su magnitud.
 * @param {number} penaltyRate       Tasa de penalización (COP/MWh faltante).
 * @returns {number} Multa estimada en COP (siempre ≥ 0).
 */
export function calculateSLAFine(underGeneration, penaltyRate) {
  const deficit = toNum(underGeneration)
  const rate = toNum(penaltyRate)
  if (deficit <= 0 || rate <= 0) return 0
  return deficit * rate
}

/**
 * Déficit de generación frente a la obligación contratada.
 * @returns {number} MWh faltantes (≥ 0); 0 si se cumplió o superó la meta.
 */
export function calculateUnderGeneration(realMWh, contractedMWh) {
  const gap = toNum(contractedMWh) - toNum(realMWh)
  return gap > 0 ? gap : 0
}

/**
 * Porcentaje de cumplimiento = generación real / generación contratada.
 * @returns {number|null} Porcentaje (100 = cumplió exacto); null si no hay meta.
 */
export function calculateCompliancePct(realMWh, contractedMWh) {
  const contracted = toNum(contractedMWh)
  if (contracted <= 0) return null
  return (toNum(realMWh) / contracted) * 100
}

const _cop = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})

/**
 * Formatea un valor como moneda COP (sin decimales, estilo colombiano).
 * @param {number} value
 * @returns {string} p.ej. "$ 1.234.567". Null / inválido → "—".
 */
export function formatCurrency(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return _cop.format(Number(value))
}

/** Formato compacto para KPIs grandes: $1.2 M / $3.4 B. Null → "—". */
export function formatCurrencyCompact(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const v = Number(value)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)} B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)} M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)} K`
  return `${sign}$${abs.toFixed(0)}`
}

/** Formatea energía en MWh con separador de miles. Null → "—". */
export function formatMWh(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MWh`
}

// ── Exposición ante XM y fechas de vencimiento ──────────────────────────────
// Usado por el motor de Riesgo Vivo (riskEngine.js) para cruzar garantías
// contra lo que el proyecto le debe al mercado en el período.

const MS_DIA = 86400000

/**
 * Parsea una fecha "YYYY-MM-DD" (o Date) a medianoche LOCAL.
 * `new Date('2026-07-14')` se interpreta como UTC y en Colombia (UTC-5) retrocede
 * al día anterior, corriendo los "días restantes" en 1. Por eso se parsea a mano.
 * @returns {Date|null} null si la entrada es vacía o inválida.
 */
export function parseFechaLocal(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Días calendario que faltan para `fecha`, contados desde `hoy` (por defecto, ahora).
 * Negativo → ya venció. Se comparan días completos, no horas.
 * @returns {number|null} null si no hay fecha o es inválida.
 */
export function diasHastaVencimiento(fecha, hoy = new Date()) {
  const f = parseFechaLocal(fecha)
  if (!f) return null
  const ref = parseFechaLocal(hoy) || new Date()
  const a = new Date(f.getFullYear(), f.getMonth(), f.getDate())
  const b = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  return Math.round((a - b) / MS_DIA)
}

/** Fecha de vencimiento legible: "14 jul 2026". Null / inválida → "—". */
export function formatFechaVencimiento(fecha) {
  const f = parseFechaLocal(fecha)
  if (!f) return '—'
  return f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Exposición ante XM de un proyecto en un período: lo que el proyecto le debe al
 * mercado y que la garantía respalda.
 *
 * Recibe una fila de proyecto de `GET /liquidaciones/resumen-panel` (el mismo
 * insumo que usan las demás vistas del módulo; no existe un `GET /liquidaciones`
 * plano). La exposición es el grupo de COMERCIALIZACIÓN — comercialización,
 * ajuste de comercialización y compras en bolsa (ver TIPOS_COMERCIALIZACION en
 * constants/liquidaciones.js) —, que es la deuda con el mercado. Los OPEX y las
 * facturas de servicio se pagan a terceros, NO a XM, y por eso no se incluyen.
 *
 * `grupos_totales` solo viene desglosado por inversionista, así que se suma sobre
 * ellos. Si el panel no trae el desglose, se cae a `costos_cop` (sobreestima la
 * exposición: es el lado conservador para una alerta de riesgo).
 *
 * @param {object} panel Fila de proyecto de /liquidaciones/resumen-panel.
 * @returns {number} Exposición en COP (siempre ≥ 0; 0 si no hay datos).
 */
export function calculateExposure(panel) {
  if (!panel) return 0
  const inversionistas = Array.isArray(panel.inversionistas) ? panel.inversionistas : []
  let xm = 0
  let hayDesglose = false
  for (const inv of inversionistas) {
    const g = inv?.grupos_totales
    if (!g || g.comercializacion == null) continue
    hayDesglose = true
    xm += Math.abs(toNum(g.comercializacion))
  }
  if (hayDesglose) return xm
  return Math.abs(toNum(panel.costos_cop))
}
