// Extracción de series de potencia para la app móvil.
// Portado de SolarLiveView.vue para reutilizar la misma lógica de datos.

// Etiquetas de tiempo cada 5 min (00:00–23:55) → 288 slots.
export const TIME_LABELS = Array.from({ length: 288 }, (_, i) => {
  const h = Math.floor((i * 5) / 60)
  const m = (i * 5) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

// Hora de un timestamp de Gaia (medidor).
export function gaiaTime(t) {
  if (!t) return ''
  const idx = t.indexOf('T')
  return idx >= 0 ? t.slice(idx + 1, idx + 6) : t.slice(0, 5)
}

// Agrupa puntos en buckets de 5 min y promedia (mismo algoritmo que la plataforma).
export function mapMinutes(points, getTime, getKw) {
  const buckets = {}
  for (const pt of points) {
    const raw = getTime(pt)
    if (!raw) continue
    const m = raw.match(/(\d{1,2}):(\d{2})/)
    if (!m) continue
    const slot = parseInt(m[1], 10) * 12 + Math.floor(parseInt(m[2], 10) / 5)
    if (!buckets[slot]) buckets[slot] = []
    const v = getKw(pt)
    if (v != null) buckets[slot].push(v)
  }
  return TIME_LABELS.map((_, i) => {
    const arr = buckets[i]
    if (!arr?.length) return null
    return +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3)
  })
}

// Elige el mejor snapshot de medidor (principal vs respaldo, el de mayor energía).
export function bestMedidorSnap(detail) {
  if (!detail) return null
  const sp = detail.gaia_snapshot_principal
  const sr = detail.gaia_snapshot_respaldo
  if (!sp && !sr) return null
  if (!sp) return sr
  if (!sr) return sp
  return (sp.eae_wh ?? 0) >= (sr.eae_wh ?? 0) ? sp : sr
}

// Serie de inversores (288 valores kW o null).
export function inverterSeries(detail) {
  const curve = detail?.power_curve ?? []
  if (!curve.length) return null
  const data = mapMinutes(
    curve,
    (pt) => { const t = pt.time || ''; return t.includes(' ') ? t.split(' ')[1] : t },
    (pt) => (pt.kw != null ? +pt.kw : null),
  )
  return data.every((v) => v == null) ? null : data
}

// Serie de medidor (288 valores kW o null).
export function meterSeries(detail) {
  const snap = bestMedidorSnap(detail)
  const rows = (snap?.time_series?.power ?? []).filter((r) => r.kw != null)
  if (!rows.length) return null
  const data = mapMinutes(rows, (r) => gaiaTime(r.time), (r) => +Math.abs(r.kw))
  return data.every((v) => v == null) ? null : data
}

// Último valor no nulo de una serie (potencia "ahora").
export function latest(series) {
  if (!series) return null
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) return series[i]
  }
  return null
}

// Formatea kW → "1.2 MW" / "312.0 kW" / "—".
export function fmtKw(kw) {
  if (kw == null) return '—'
  if (kw >= 1000) return (kw / 1000).toFixed(1) + ' MW'
  return kw.toFixed(1) + ' kW'
}
