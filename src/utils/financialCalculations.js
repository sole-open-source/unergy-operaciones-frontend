// ──────────────────────────────────────────────────────────────────────────
// Utilidad financiera centralizada — fuente única de precisión y redondeo.
//
// Toda aritmética de dinero debe pasar por aquí: el tipo `number` nativo de JS
// es de coma flotante binaria y acumula error (0.1 + 0.2 === 0.30000000000004),
// lo que en sumas de muchas líneas de liquidación produce descuadres de pesos.
// `decimal.js` opera en base decimal con 20 dígitos significativos y redondeo
// HALF_UP, eliminando ese riesgo de integridad de datos.
//
// Convención de DISPLAY: COP se muestra sin decimales en casi toda la app
// (es la convención local); el módulo de Liquidaciones usa 2 decimales. Por eso
// `formatCurrency` recibe `displayPrecision` explícito y cada vista conserva su
// precisión actual. No se fuerza un único número de decimales globalmente.
// ──────────────────────────────────────────────────────────────────────────
import Decimal from 'decimal.js'

// Precisión interna alta para que ningún cálculo intermedio pierda dígitos;
// el redondeo de presentación se aplica aparte, al formatear/round().
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export const DEFAULT_ROUNDING = Decimal.ROUND_HALF_UP
export const DISPLAY_PRECISION = 2

/**
 * Convierte cualquier valor a un Decimal. Valores nulos / vacíos / no numéricos
 * se tratan como 0, replicando la semántica heredada `Number(v) || 0` usada en
 * todo el código de liquidaciones (evita NaN propagándose por las sumas).
 * Si ya es un Decimal lo devuelve tal cual.
 */
export function createDecimal(value) {
  if (value instanceof Decimal) return value
  if (value == null || value === '') return new Decimal(0)
  try {
    const d = new Decimal(value)
    return d.isNaN() ? new Decimal(0) : d
  } catch {
    return new Decimal(0)
  }
}

export function add(a, b) {
  return createDecimal(a).plus(createDecimal(b))
}

export function subtract(a, b) {
  return createDecimal(a).minus(createDecimal(b))
}

export function multiply(a, b) {
  return createDecimal(a).times(createDecimal(b))
}

export function divide(a, b) {
  const divisor = createDecimal(b)
  if (divisor.isZero()) return new Decimal(0)
  return createDecimal(a).dividedBy(divisor)
}

/** Redondea a `precision` decimales con HALF_UP. */
export function round(value, precision = DISPLAY_PRECISION) {
  return createDecimal(value).toDecimalPlaces(precision, Decimal.ROUND_HALF_UP)
}

/**
 * Suma una lista con precisión decimal. `accessor` opcional extrae el valor de
 * cada elemento (p.ej. una clave de objeto). Reemplaza los reduce((s,x)=>s+...)
 * nativos sin arrastrar error de coma flotante.
 */
export function sum(list, accessor = (x) => x) {
  return (list || []).reduce((acc, item) => acc.plus(createDecimal(accessor(item))), new Decimal(0))
}

/** Decimal | number | string → number nativo (para Intl, charts, props). */
export function toNumber(value) {
  return createDecimal(value).toNumber()
}

/**
 * Formatea un valor como moneda usando Intl.NumberFormat.
 * Null / undefined / no numérico → '—' (placeholder usado en toda la app).
 * El valor se redondea HALF_UP a `displayPrecision` antes de formatear para que
 * el redondeo de presentación sea consistente con el resto de la utilidad.
 */
export function formatCurrency(value, currencyCode = 'COP', locale = 'es-CO', displayPrecision = DISPLAY_PRECISION) {
  if (value == null) return '—'
  const d = value instanceof Decimal ? value : createDecimal(value)
  // createDecimal nunca lanza, pero distingue "0 real" de "junk → 0": revalidar.
  if (!(value instanceof Decimal) && typeof value !== 'number' && Number.isNaN(Number(value))) return '—'
  if (typeof value === 'number' && Number.isNaN(value)) return '—'
  const rounded = d.toDecimalPlaces(displayPrecision, Decimal.ROUND_HALF_UP)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: displayPrecision,
    maximumFractionDigits: displayPrecision,
  }).format(rounded.toNumber())
}

export default {
  createDecimal, add, subtract, multiply, divide, round, sum, toNumber, formatCurrency,
  DEFAULT_ROUNDING, DISPLAY_PRECISION,
}
