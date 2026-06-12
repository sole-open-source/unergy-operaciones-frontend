import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const MESES = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, sept:8, oct:9, nov:10, dic:11 }
const DATE_RE = /(\d{1,2})-([a-zA-Záéíóú]+)\.?-(\d{2,4})/

const TIPO_RULES = [
  { re: /FACTURA ELECTR[OÓ]NICA DE VENTA/i, tipo: 'DÉBITO',       concepto: 'Factura de venta',  descuenta: true },
  { re: /Nota\s*cr[eé]dito/i,               tipo: 'CRÉDITO',      concepto: 'Nota crédito',      descuenta: false },
  { re: /Informe de Ventas/i,               tipo: 'INFORME',      concepto: 'Informe de ventas', descuenta: false },
  { re: /Ajuste de Ventas a Cargo/i,        tipo: 'AJUSTE CARGO', concepto: 'Ajuste a cargo',    descuenta: false },
  { re: /Ajuste de Ventas a Favor/i,        tipo: 'AJUSTE FAVOR', concepto: 'Ajuste a favor',    descuenta: false },
]

function classifyTipo(text) {
  for (const r of TIPO_RULES) if (r.re.test(text)) return r
  return { tipo: 'DESCONOCIDO', concepto: '—', descuenta: false }
}

function parseCO(s) {
  if (s == null) return null
  const n = parseFloat(String(s).trim().replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseFechaES(s) {
  const m = String(s).toLowerCase().match(DATE_RE)
  if (!m) return null
  const mes = MESES[m[2].slice(0, 4)] ?? MESES[m[2].slice(0, 3)]
  if (mes == null) return null
  let yy = parseInt(m[3], 10); if (yy < 100) yy += 2000
  const d = new Date(yy, mes, parseInt(m[1], 10))
  return isNaN(d.getTime()) ? null : d
}

function fechaISO(d) {
  if (!d) return null
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function vencimientoDesdeItems(items) {
  const label = items.find((it) => /vencimiento/i.test(it.str))
  if (!label) return null
  const lx = label.transform[4], ly = label.transform[5]
  let best = null, score = Infinity
  for (const it of items) {
    const m = it.str.match(DATE_RE)
    if (!m) continue
    const x = it.transform[4], y = it.transform[5]
    const dy = ly - y
    if (dy < -2) continue
    const s = Math.abs(dy) + Math.abs(x - lx) * 0.5
    if (s < score) { score = s; best = m[0] }
  }
  return best
}

export async function parseFacturas(files) {
  const documentos = []
  const errors = []
  for (const file of files) {
    let pdf
    try {
      const data = await file.arrayBuffer()
      pdf = await pdfjsLib.getDocument({ data }).promise
    } catch (e) {
      errors.push(`No se pudo leer ${file.name}: ${e.message}`)
      continue
    }
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      const items = content.items
      const text = items.map((i) => i.str).join(' ')
      const warnings = []

      if (!text.trim()) {
        documentos.push({ archivo: file.name, pagina: p, tipo: 'DESCONOCIDO', concepto: '—',
          descuenta: false, numero: null, valorTotal: null, vencimiento: null,
          warnings: ['escaneada'] })
        continue
      }

      const cls = classifyTipo(text)
      const numero = (text.match(/\b([A-Z]{2,5}\d{4,})\b/) || [])[1] || null

      const valMatches = [...text.matchAll(/Valor Total:\s*([\d.,]+)/g)]
      const valorTotal = valMatches.length ? parseCO(valMatches[0][1]) : null
      if (valMatches.length > 1) warnings.push('multiple_valor')
      if (!valMatches.length) warnings.push('sin_valor')

      let vStr = vencimientoDesdeItems(items)
      if (!vStr) {
        const after = text.split(/vencimiento/i)[1]
        if (after) { const m = after.match(DATE_RE); if (m) vStr = m[0] }
      }
      const vDate = parseFechaES(vStr)
      if (!vDate) warnings.push('sin_vencimiento')

      documentos.push({
        archivo: file.name, pagina: p,
        tipo: cls.tipo, concepto: cls.concepto, descuenta: cls.descuenta,
        numero, valorTotal,
        vencimiento: fechaISO(vDate),
        warnings,
      })
    }
  }
  const seen = new Set()
  const dedup = documentos.filter((d) => {
    if (!d.numero) return true
    if (seen.has(d.numero)) return false
    seen.add(d.numero); return true
  })
  return { documentos: dedup, errors }
}

export function viernesDeEstaSemana(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = d.getDay()
  const diff = 5 - day
  d.setDate(d.getDate() + diff)
  return d
}
