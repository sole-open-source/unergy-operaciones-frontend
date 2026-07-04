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
