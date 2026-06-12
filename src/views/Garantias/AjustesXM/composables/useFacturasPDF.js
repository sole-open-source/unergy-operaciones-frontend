import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const MESES = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, sept:8, oct:9, nov:10, dic:11 }
const DATE_RE = /(\d{1,2})-([a-zA-Záéíóú]+)\.?-(\d{2,4})/

// Clasificación primaria por prefijo del número de documento (inequívoco).
// signo: +1 suma al total a descontar (Unergy paga), -1 resta (a favor), 0 informativo.
const PREFIX_MAP = {
  ASIC: { tipo: 'DÉBITO',       concepto: 'Factura de venta',  descuenta: true,  signo: 1 },
  NDAS: { tipo: 'DÉBITO',       concepto: 'Factura de venta',  descuenta: true,  signo: 1 },
  OSE:  { tipo: 'DÉBITO',       concepto: 'Factura de venta',  descuenta: true,  signo: 1 },
  ASNC: { tipo: 'CRÉDITO',      concepto: 'Nota crédito',      descuenta: false, signo: -1 },
  ASIV: { tipo: 'INFORME',      concepto: 'Informe de ventas', descuenta: false, signo: 0 },
  AAVC: { tipo: 'AJUSTE CARGO', concepto: 'Ajuste a cargo',    descuenta: false, signo: 1 },
  AAVF: { tipo: 'AJUSTE FAVOR', concepto: 'Ajuste a favor',    descuenta: false, signo: -1 },
}

// Fallback por título — más específicos primero (la Nota Crédito contiene "factura electrónica de venta").
const TIPO_RULES = [
  { re: /Nota\s*cr[eé]dito/i,               tipo: 'CRÉDITO',      concepto: 'Nota crédito',      descuenta: false, signo: -1 },
  { re: /Informe de Ventas/i,               tipo: 'INFORME',      concepto: 'Informe de ventas', descuenta: false, signo: 0 },
  { re: /Ajuste de Ventas a Cargo/i,        tipo: 'AJUSTE CARGO', concepto: 'Ajuste a cargo',    descuenta: false, signo: 1 },
  { re: /Ajuste de Ventas a Favor/i,        tipo: 'AJUSTE FAVOR', concepto: 'Ajuste a favor',    descuenta: false, signo: -1 },
  { re: /FACTURA ELECTR[OÓ]NICA DE VENTA/i, tipo: 'DÉBITO',       concepto: 'Factura de venta',  descuenta: true,  signo: 1 },
]

function classify(numero, text) {
  if (numero) {
    const pre = (numero.match(/^[A-Z]+/) || [])[0]
    if (pre && PREFIX_MAP[pre]) return PREFIX_MAP[pre]
  }
  for (const r of TIPO_RULES) if (r.re.test(text)) return r
  return { tipo: 'DESCONOCIDO', concepto: '—', descuenta: false, signo: 0 }
}

// Detecta formato CO (9.755,00) o US/SAP (996,711.40) por el separador decimal más a la derecha.
function parseAmount(s) {
  if (s == null) return null
  s = String(s).trim()
  const ld = s.lastIndexOf('.'), lc = s.lastIndexOf(',')
  let n
  if (ld > lc) n = s.replace(/,/g, '')
  else if (lc > ld) n = s.replace(/\./g, '').replace(',', '.')
  else n = s.replace(/[.,]/g, '')
  const r = parseFloat(n)
  return isNaN(r) ? null : r
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
          descuenta: false, signo: 0, numero: null, valorTotal: null, vencimiento: null,
          warnings: ['escaneada'] })
        continue
      }

      const numero = (text.match(/\b([A-Z]{2,5}\d{4,})\b/) || [])[1] || null
      const cls = classify(numero, text)

      // Valor Total: cabecera con dos puntos (CO) — fallback a "VALOR TOTAL" resumen (OSE/SAP).
      const valMatches = [...text.matchAll(/Valor Total:\s*([\d.,]+)/g)]
      let valorTotal = valMatches.length ? parseAmount(valMatches[0][1]) : null
      if (valMatches.length > 1) warnings.push('multiple_valor')
      if (!valMatches.length) {
        const m = text.match(/VALOR TOTAL\s+([\d.,]+)/)
        if (m) valorTotal = parseAmount(m[1])
        else warnings.push('sin_valor')
      }

      let vStr = vencimientoDesdeItems(items)
      if (!vStr) {
        const after = text.split(/vencimiento/i)[1]
        if (after) { const m = after.match(DATE_RE); if (m) vStr = m[0] }
      }
      const vDate = parseFechaES(vStr)
      if (!vDate) warnings.push('sin_vencimiento')

      documentos.push({
        archivo: file.name, pagina: p,
        tipo: cls.tipo, concepto: cls.concepto, descuenta: cls.descuenta, signo: cls.signo ?? 0,
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
