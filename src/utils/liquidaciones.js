// ──────────────────────────────────────────────────────────────────────────
// Helpers compartidos del módulo de Liquidaciones (formato + cálculo del neto).
// Fuente única de verdad — antes estaban duplicados en 4 vistas.
// ──────────────────────────────────────────────────────────────────────────
import { ESTADO_SEVERITY, ESTADO_LABEL } from '@/constants/liquidaciones'

// ── Formato ────────────────────────────────────────────────────────────────

const _cop = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 2,
})

/** Formatea un valor como moneda COP completa. Null → '—'. */
export function fmtCOP(v) {
  if (v == null) return '—'
  return _cop.format(v)
}

/** Formato compacto: $1.2M / $3.4B / $5.6K. Null → '—'. */
export function fmtCompact(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

/** "2026-05-01" → "May 2026". */
export function formatPeriodo(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}

/** Date | string → "YYYY-MM-01" (primer día del mes, como lo llavea el backend). */
export function toISOMonth(d) {
  if (!d) return null
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
}

/** Período (YYYY-MM-01) del mes actual. */
export function mesActualISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
}

// El backend serializa enums como "TipoLineaMandatoEnum.foo" — normalizar a "foo".
export const normTipo = (t) => (t || '').replace(/^TipoLineaMandatoEnum\./, '')

/** Normaliza un porcentaje de participación que puede venir en 0–1 o 0–100 → fracción 0–1. */
export function normPct(p) {
  const n = Number(p) || 0
  return n > 1 ? n / 100 : n
}

/** Porcentaje legible "11.06%". Acepta 0–1 o 0–100. */
export function pct(p) {
  return `${(normPct(p) * 100).toFixed(2)}%`
}

export const estadoSeverity = (e) => ESTADO_SEVERITY[e] || 'secondary'
export const estadoLabel = (e) => ESTADO_LABEL[e] || e || '—'

export function facturaEstadoSeverity(e) {
  return { emitida: 'info', pagada: 'success', vencida: 'danger' }[e] || 'secondary'
}

// ── Cálculo del INGRESO NETO ─────────────────────────────────────────────────
// Fórmula oficial (confirmada por dirección):
//   ingreso_neto = valor a pagar (mandato de INGRESOS "Total")
//                − valor a pagar (mandato de COSTOS "Total", si aplica)
//                − Σ facturas de servicio (CGM + Representación + Administración)
// El "valor a pagar" del mandato YA encapsula:
//   ingreso bruto − comercialización − compras en bolsa + ventas en bolsa
//   ± ajuste de protocolo (incluye el caso NEU, que resta compras/ajustes extra).
// Por eso usamos valor_neto_cop directo y NO recalculamos línea por línea.

const _sum = (arr, key) => (arr || []).reduce((s, x) => s + (Number(x?.[key]) || 0), 0)

/**
 * Neto a partir de la forma que devuelve GET /liquidaciones/vistas/por-proyecto
 * (cada liquidación trae mandatos_total_ingresos[], mandatos_total_costos[],
 *  facturas_servicio[] y un resumen{} de respaldo).
 */
export function netoFromVista(liqResumen) {
  if (!liqResumen) return 0
  const ingTotal = liqResumen.mandatos_total_ingresos || []
  const cosTotal = liqResumen.mandatos_total_costos || []
  const facturas = liqResumen.facturas_servicio || []

  if (ingTotal.length || cosTotal.length || facturas.length) {
    const valorAPagar = _sum(ingTotal, 'valor_neto_cop')
    const costos = _sum(cosTotal, 'valor_neto_cop')
    const serv = _sum(facturas, 'valor_cop')
    return valorAPagar - costos - serv
  }
  // Respaldo: el resumen pre-calculado del backend
  return Number(liqResumen.resumen?.ingreso_neto_cop) || 0
}

/** "Valor a pagar" (ingreso bruto neto de comercialización/bolsa) de la vista por-proyecto. */
export function valorAPagarFromVista(liqResumen) {
  if (!liqResumen) return 0
  const ingTotal = liqResumen.mandatos_total_ingresos || []
  if (ingTotal.length) return _sum(ingTotal, 'valor_neto_cop')
  return Number(liqResumen.resumen?.total_ingresos_cop) || 0
}

/** Costos totales (mandato de costos + facturas de servicio) de la vista por-proyecto. */
export function costosFromVista(liqResumen) {
  if (!liqResumen) return 0
  const cosTotal = liqResumen.mandatos_total_costos || []
  const facturas = liqResumen.facturas_servicio || []
  return _sum(cosTotal, 'valor_neto_cop') + _sum(facturas, 'valor_cop')
}
