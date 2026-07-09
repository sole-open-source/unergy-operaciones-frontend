// ──────────────────────────────────────────────────────────────────────────
// Helpers compartidos del módulo de Liquidaciones (formato + cálculo del neto).
// Fuente única de verdad — antes estaban duplicados en 4 vistas.
// ──────────────────────────────────────────────────────────────────────────
import {
  ESTADO_SEVERITY, ESTADO_LABEL, ETIQUETAS, LABEL_SERVICIO,
  TIPOS_INGRESO_BRUTO, TIPOS_COMERCIALIZACION,
} from '@/constants/liquidaciones'

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

// Flujo de estado del panel (#12), DERIVADO de señales existentes (sin migración):
// Cargado (hay panel) → Numerado (tiene consecutivos) → Firmado (fecha_firma).
export const ESTADO_FLUJO = [
  { key: 'cargado', label: 'Cargado', color: '#F59E0B', sev: 'warn' },
  { key: 'numerado', label: 'Numerado', color: '#3B82F6', sev: 'info' },
  { key: 'firmado', label: 'Firmado', color: '#10B981', sev: 'success' },
]
export function estadoFlujoPanel(p) {
  if (p?.fecha_firma) return ESTADO_FLUJO[2]
  if (p?.consecutivo_ingresos != null || p?.consecutivo_costos != null) return ESTADO_FLUJO[1]
  return ESTADO_FLUJO[0]
}

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

// ── Desglose del Estado de Resultados (grupos + neto, con soportes) ──────────
// Lógica única usada tanto por la tarjeta "Total" como por la vista por
// inversionista del detalle. Recibe los mandatos YA seleccionados (Total del
// proyecto o de un inversionista) y devuelve los grupos listos para pintar.

// Líneas que NO requieren documento soporte (impuestos / totales).
export const TIPOS_SIN_SOPORTE = new Set([
  'iva', 'reteica', 'retencion_fuente', 'ica_opex', 'otro_impuesto', 'valor_a_pagar',
])

// Conceptos que pertenecen SOLO a "Facturas de servicio" (no a Costos operativos).
// Evita que representación/CGM/administración se dupliquen entre Costos y Facturas.
export const TIPOS_FACTURA_SERVICIO = new Set([
  'representacion', 'cgm', 'administracion', 'administracion_operacion',
])

const _num = (v) => Number(v) || 0
const _etiqueta = (t) => ETIQUETAS[normTipo(t)] || t
const _norm = (s) => (s == null ? '' : String(s)).trim().toLowerCase()

/**
 * Código corto de una referencia de soporte. La referencia suele venir como
 * "SOFV909 | SOFV909 Minigranja Solar El Son Mes Abril Mantenimiento" → "SOFV909".
 * Toma el primer segmento (antes de "|") y su primera palabra.
 */
export function codigoSoporte(ref) {
  if (!ref) return null
  const first = String(ref).split('|')[0].trim()
  return first.split(/\s+/)[0] || first || null
}

function _buscarSoporte(soportes, tipo, concepto) {
  if (!soportes) return null
  return soportes[tipo] || soportes[_norm(concepto)] || null
}

/**
 * Índice de adjuntos a nivel PROYECTO, indexado por tipo y por concepto.
 * Los adjuntos (soporte_url) solo se guardan a nivel proyecto (LiquidacionCosto
 * por tipo_costo y LiquidacionFactura por tipo_servicio); cada concepto comparte
 * un único documento de respaldo entre todos los inversionistas. Este índice
 * permite mostrar ese mismo soporte en el desglose por inversionista.
 */
export function indiceSoportesProyecto(liq) {
  const idx = {}
  const add = (key, url, ref) => {
    if (!key || !url) return
    if (!idx[key]) idx[key] = { url, ref: ref || null }
  }
  for (const c of (liq?.costos || [])) {
    add(c.tipo_costo, c.soporte_url, c.nro_soporte)
    add(_norm(c.descripcion), c.soporte_url, c.nro_soporte)
  }
  for (const f of (liq?.facturas || [])) {
    add(f.tipo_servicio, f.soporte_url, f.nro_soporte || f.numero_factura)
  }
  // Por si alguna línea de mandato (Total o no) sí trae su propio soporte.
  for (const m of (liq?.mandatos || [])) {
    for (const l of (m.lineas || [])) {
      if (!l.soporte_url) continue
      add(normTipo(l.tipo_linea), l.soporte_url, l.referencia_factura)
      add(_norm(l.concepto), l.soporte_url, l.referencia_factura)
    }
  }
  return idx
}

/** Líneas individuales (con su soporte) de una lista de mandatos. */
function _lineasDeMandatos(mandatos, filtro, { abs = false, soportes = null } = {}) {
  const out = []
  for (const m of (mandatos || [])) {
    for (const l of (m.lineas || [])) {
      const t = normTipo(l.tipo_linea)
      if (t === 'valor_a_pagar') continue
      if (filtro && !filtro(t)) continue
      const valor = _num(l.valor_cop)
      if (valor === 0) continue
      let soporte_url = l.soporte_url || null
      let referencia = l.referencia_factura || null
      // El adjunto del concepto vive a nivel proyecto (mismo documento para todos
      // los inversionistas) → completarlo desde el índice cuando la línea no lo trae.
      if (!soporte_url && soportes) {
        const s = _buscarSoporte(soportes, t, l.concepto)
        if (s) { soporte_url = s.url; referencia = referencia || s.ref }
      }
      out.push({
        tipo: t,
        label: _etiqueta(l.tipo_linea),
        valor: abs ? Math.abs(valor) : valor,
        soporte_url,
        referencia,
        refCodigo: codigoSoporte(referencia),
        requiereSoporte: !TIPOS_SIN_SOPORTE.has(t),
      })
    }
  }
  return out
}

/**
 * Construye el desglose del Estado de Resultados a partir de los mandatos de
 * ingresos/costos ya filtrados. `costos` y `facturas` son a nivel proyecto
 * (opcionales: la vista por inversionista no los pasa).
 * Devuelve { grupos, valorAPagar, costosOperativos, facturasTotal, neto }.
 */
export function construirEstadoResultados({
  ingresosMandatos = [], costosMandatos = [],
  costos = [], facturas = [], esAutoconsumo = false, soportes = null,
} = {}) {
  // Valor a pagar (ingresos)
  const conNetoIng = ingresosMandatos.filter(x => x.valor_neto_cop != null)
  let valorAPagar
  if (conNetoIng.length) {
    valorAPagar = conNetoIng.reduce((s, x) => s + _num(x.valor_neto_cop), 0)
  } else {
    let bruto = 0, comer = 0
    for (const x of ingresosMandatos) for (const l of (x.lineas || [])) {
      const t = normTipo(l.tipo_linea)
      if (TIPOS_INGRESO_BRUTO.has(t)) bruto += _num(l.valor_cop)
      if (TIPOS_COMERCIALIZACION.has(t)) comer += Math.abs(_num(l.valor_cop))
    }
    valorAPagar = bruto - comer
  }

  // Costos operativos (OPEX). representación/CGM/administración NO van aquí: son
  // "Facturas de servicio" → se excluyen para no duplicarlas ni doble-contarlas en el neto.
  let cos = _lineasDeMandatos(costosMandatos, t => !TIPOS_FACTURA_SERVICIO.has(t), { soportes })
  let costosOperativos
  if (cos.length) {
    costosOperativos = cos.reduce((s, l) => s + l.valor, 0)
  } else if (costosMandatos.some(x => x.valor_neto_cop != null)) {
    costosOperativos = costosMandatos.reduce((s, x) => s + _num(x.valor_neto_cop), 0)
  } else {
    cos = (costos || []).filter(c => _num(c.valor_cop) !== 0 && !TIPOS_FACTURA_SERVICIO.has(c.tipo_costo)).map(c => ({
      tipo: c.tipo_costo,
      label: ETIQUETAS[c.tipo_costo] || c.descripcion || c.tipo_costo,
      valor: _num(c.valor_cop), soporte_url: c.soporte_url || null,
      referencia: c.nro_soporte || null, refCodigo: codigoSoporte(c.nro_soporte), requiereSoporte: true,
    }))
    costosOperativos = cos.reduce((s, l) => s + l.valor, 0)
  }

  // Dedupe facturas duplicadas (mismo servicio y valor): defensa ante registros
  // cargados dos veces; se conserva la que tenga soporte adjunto.
  const _facturas = []
  const _seenFac = new Set()
  for (const f of [...(facturas || [])].sort((a, b) => (b?.soporte_url ? 1 : 0) - (a?.soporte_url ? 1 : 0))) {
    const k = `${f?.tipo_servicio}|${_num(f?.valor_cop)}`
    if (_seenFac.has(k)) continue
    _seenFac.add(k)
    _facturas.push(f)
  }
  const facturasTotal = _facturas.reduce((s, f) => s + _num(f.valor_cop), 0)
  const neto = valorAPagar - costosOperativos - facturasTotal

  const grupos = []

  const ing = _lineasDeMandatos(ingresosMandatos, t => TIPOS_INGRESO_BRUTO.has(t), { soportes })
  if (ing.length) grupos.push({ key: 'ingresos', label: 'Ingresos', lineas: ing, total: ing.reduce((s, l) => s + l.valor, 0), sign: 1 })

  if (!esAutoconsumo) {
    const com = _lineasDeMandatos(ingresosMandatos, t => TIPOS_COMERCIALIZACION.has(t), { abs: true, soportes })
    if (com.length) grupos.push({ key: 'comercializacion', label: 'Comercialización / Bolsa', lineas: com, total: com.reduce((s, l) => s + l.valor, 0), sign: -1 })
  }

  const aj = _lineasDeMandatos(ingresosMandatos, t => !TIPOS_INGRESO_BRUTO.has(t) && !TIPOS_COMERCIALIZACION.has(t), { soportes })
  if (aj.length) {
    const t = aj.reduce((s, l) => s + l.valor, 0)
    grupos.push({ key: 'ajustes', label: 'Ajustes', lineas: aj, total: t, sign: t < 0 ? -1 : 1 })
  }

  if (cos.length) grupos.push({ key: 'costos', label: 'Costos operativos (OPEX)', lineas: cos, total: costosOperativos, sign: -1 })

  const fac = _facturas.filter(f => _num(f.valor_cop) !== 0).map(f => {
    const ref = f.nro_soporte || f.numero_factura || null
    return {
      tipo: f.tipo_servicio,
      label: LABEL_SERVICIO[f.tipo_servicio] || f.tipo_servicio,
      valor: _num(f.valor_cop), soporte_url: f.soporte_url || null,
      referencia: ref, refCodigo: codigoSoporte(ref), requiereSoporte: true,
    }
  })
  if (fac.length) grupos.push({ key: 'facturas', label: 'Facturas de servicio', lineas: fac, total: facturasTotal, sign: -1 })

  return { grupos, valorAPagar, costosOperativos, facturasTotal, neto }
}
