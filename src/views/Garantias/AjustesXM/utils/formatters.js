export function fmtCOP(v) {
  if (v == null || isNaN(v)) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v)
}

export function addBusinessDays(date, days) {
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d
}

export function fmtISODate(date) {
  return date.toISOString().slice(0, 10)
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function fmtAxisCOP(v) {
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B'
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M'
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'k'
  return '$' + v.toFixed(0)
}
