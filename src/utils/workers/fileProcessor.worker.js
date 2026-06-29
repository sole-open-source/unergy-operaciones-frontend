// ── Worker de procesamiento de archivos ─────────────────────────────────────────
// Ejecuta en un hilo aparte el trabajo CPU/memoria intensivo de archivos para no
// congelar la UI: descompresión de ZIP (jszip), extracción de texto de PDF
// (pdfjs-dist) y lectura de hojas de cálculo (xlsx).
//
// La lógica de parseo XLSX/PDF de Garantías reutiliza directamente los módulos puros
// existentes (no hay duplicación): este worker sólo los importa y los expone.
// El parseo del ZIP de Arriendos vivía en línea dentro del componente .vue y se ha
// movido aquí íntegro.

import JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import { parseFacturas } from '@/views/Garantias/AjustesXM/composables/useFacturasPDF.js'
import { parseSemanales, parseTxr, parseMensual } from '@/views/Garantias/AjustesXM/composables/useGarantiasParser.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

let uidCounter = 0
const uid = () => `n_${++uidCounter}`

// ════════════════════════════════════════════════════════════════════════════════
// ZIP de Arriendos — lógica trasladada de ArriendosZipUpload.vue
// ════════════════════════════════════════════════════════════════════════════════

// Período del nombre del ZIP
function extraerPeriodoDeZip(filename) {
  const m = filename.match(/(\d{4}-\d{2})/)
  if (!m) return null
  const mm = parseInt(m[1].split('-')[1])
  return (mm >= 1 && mm <= 12) ? m[1] : null
}

// Selección del archivo principal según prioridad
function seleccionarPrincipal(archivos) {
  const cc = archivos.filter(a =>
    a.nombre.toLowerCase().includes('cuenta_cobro') &&
    !a.nombre.toLowerCase().includes('enviada') &&
    !a.nombre.toLowerCase().includes('_env'))
  if (cc.length) return { principal: cc[0], tipoArchivo: 'cuenta_cobro' }

  const factPdf = archivos.filter(a =>
    a.nombre.toLowerCase().includes('factura_electronica') && a.nombre.toLowerCase().endsWith('.pdf'))
  if (factPdf.length) return { principal: factPdf[0], tipoArchivo: 'factura_electronica' }

  const factJpg = archivos.filter(a =>
    a.nombre.toLowerCase().includes('factura_electronica') &&
    (a.nombre.toLowerCase().endsWith('.jpg') || a.nombre.toLowerCase().endsWith('.jpeg')))
  if (factJpg.length) return { principal: factJpg[0], tipoArchivo: 'factura_electronica_jpg' }

  const otroPdf = archivos.filter(a => a.nombre.toLowerCase().endsWith('.pdf') && !a.nombre.toLowerCase().includes('enviada'))
  if (otroPdf.length) return { principal: otroPdf[0], tipoArchivo: 'pdf' }

  return { principal: archivos[0] || null, tipoArchivo: 'desconocido' }
}

function seleccionarSecundario(archivos, principal) {
  return archivos.find(a =>
    a !== principal &&
    a.nombre.toLowerCase().includes('enviada') &&
    a.nombre.toLowerCase().endsWith('.pdf')) ?? null
}

// Extracción de texto del PDF → líneas
async function extraerLineas(arrayBuffer) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    const lineas = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page    = await pdf.getPage(p)
      const content = await page.getTextContent()
      const byY = {}
      for (const item of content.items) {
        if (!item.str?.trim()) continue
        const y = Math.round(item.transform[5])
        if (!byY[y]) byY[y] = []
        byY[y].push({ x: item.transform[4], str: item.str })
      }
      Object.keys(byY).map(Number).sort((a, b) => b - a).forEach(y => {
        const linea = byY[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim()
        if (linea) lineas.push(linea)
      })
    }
    return lineas
  } catch { return [] }
}

// Parseo de números (US "1,646,075.85" o CO "1.646.075,85")
function parseValor(s) {
  if (!s) return null
  let t = String(s).replace(/[^\d.,]/g, '')
  if (!t) return null
  const lastComma = t.lastIndexOf(',')
  const lastDot   = t.lastIndexOf('.')
  if (lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.')
  else                     t = t.replace(/,/g, '')
  const v = parseFloat(t)
  return isNaN(v) ? null : v
}

// Código corto de predio
function predioShort(codigo) {
  if (!codigo) return null
  const m = codigo.match(/COL[A-Z0-9]+P\d+/i)
  return m ? m[0].toUpperCase() : null
}

function prediosDeNombre(nombre) {
  const out = [], seen = new Set()
  const re = /COL[A-Z0-9]+P\d+/gi
  let m
  while ((m = re.exec(nombre)) !== null) {
    const s = m[0].toUpperCase()
    if (!seen.has(s)) { seen.add(s); out.push(s) }
  }
  return out
}

function matchPredio(short, proyectos) {
  if (!short) return null
  return proyectos.find(p => predioShort(p.codigo) === short) ?? null
}

// Encabezado: N° de cuenta + arrendatario (DEBE A)
function extraerEncabezado(lineas) {
  const texto = lineas.join('\n')
  let numero = null, arrendatario = null

  const mNum = texto.match(/CUENTA\s+DE\s+COBRO[^A-Z0-9]*([A-Z]+-[\d-]+)/i)
  if (mNum) numero = mNum[1].trim()

  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/DEBE\s+A\s*:?\s*(.+)/i)
    if (m && m[1].trim()) { arrendatario = m[1].trim(); break }
    if (/DEBE\s+A\s*:?\s*$/i.test(lineas[i]) && lineas[i + 1]) { arrendatario = lineas[i + 1].trim(); break }
  }
  if (arrendatario) arrendatario = arrendatario.replace(/\s*(C\.?C\.?|NIT)\.?\s*[\d.\-]+.*$/i, '').trim()
  return { numero, arrendatario }
}

// Emisora de una factura de tercero (best-effort)
function extraerEmisora(lineas) {
  for (const l of lineas) {
    const m = l.match(/raz[oó]n\s+social\s*:?\s*(.+)/i)
    if (m && m[1].trim()) return m[1].split(/[,;|]/)[0].trim().slice(0, 80)
  }
  for (const l of lineas) {
    if (/\b(S\.?A\.?S|LTDA|E\.?U|S\.?A)\b/i.test(l) && /[A-Za-z]{4,}/.test(l)) {
      return l.replace(/\s*(NIT|C\.?C)\.?.*$/i, '').trim().slice(0, 80)
    }
  }
  return null
}

// Predios desde la tabla de conceptos (Formato A)
function extraerPrediosTabla(lineas) {
  const predios = []
  const seen = new Set()
  for (const l of lineas) {
    if (!/Arriendo\s+de\s+Proyecto/i.test(l) && !/COL[A-Z0-9]+P\d+/i.test(l)) continue
    const mFull = l.match(/COL[A-Z0-9]+P\d+(?:_[A-Z0-9\-]+)*/i)
    if (!mFull) continue
    const short = predioShort(mFull[0])
    if (!short || seen.has(short)) continue
    const nums  = l.match(/\d[\d.,]*\d/g) || []
    const valor = nums.length ? parseValor(nums[nums.length - 1]) : null
    seen.add(short)
    predios.push({ codigoPredio: short, valor })
  }
  return predios
}

// Monto total (para repartir en Formato B)
function extraerTotal(lineas) {
  for (const l of lineas) {
    if (/total/i.test(l)) {
      const nums = l.match(/\d[\d.,]*\d/g)
      if (nums?.length) { const v = parseValor(nums[nums.length - 1]); if (v) return v }
    }
  }
  let best = null
  for (const l of lineas) {
    for (const n of (l.match(/\d[\d.,]*\d/g) || [])) {
      const v = parseValor(n)
      if (v && (best === null || v > best)) best = v
    }
  }
  return best
}

// Procesamiento completo del ZIP. Devuelve { periodoZip, grupos, warning }.
// Los grupos incluyen Blobs (clonables por estructura) listos para subir, y los
// predios ya emparejados contra `proyectos`. El chequeo de duplicados (que requiere
// una llamada a la API) se mantiene en el hilo principal.
async function processZip({ file, proyectos = [] }) {
  const periodoZip = extraerPeriodoDeZip(file.name)

  const zip = await JSZip.loadAsync(file)
  const carpetas = new Set()
  zip.forEach((path) => {
    const top = path.split('/')[0]
    if (top.toLowerCase().startsWith('pago_')) carpetas.add(top)
  })

  if (!carpetas.size) {
    return { periodoZip, grupos: [], warning: 'ZIP sin carpetas pago_*' }
  }

  const grupos = []

  for (const carpeta of [...carpetas].sort()) {
    const partes         = carpeta.split('_')
    const pagoId         = parseInt(partes[1]) || 0
    const codigoExtraido = partes.slice(2).join('_')

    const archivos = []
    zip.forEach((path, entry) => {
      if (path.startsWith(carpeta + '/') && !entry.dir) {
        archivos.push({ path, entry, nombre: path.split('/').pop() })
      }
    })
    if (!archivos.length) continue

    const { principal, tipoArchivo } = seleccionarPrincipal(archivos)
    const secundario = seleccionarSecundario(archivos, principal)
    if (!principal) continue

    const esPdf     = principal.nombre.toLowerCase().endsWith('.pdf')
    const esJpg     = !esPdf
    const pdfBuffer = await principal.entry.async('arraybuffer')
    const pdfBlob   = new Blob([pdfBuffer], { type: esPdf ? 'application/pdf' : 'image/jpeg' })

    let pdfSecBlob = null, pdfSecNombre = null
    if (secundario) {
      pdfSecBlob   = new Blob([await secundario.entry.async('arraybuffer')], { type: 'application/pdf' })
      pdfSecNombre = secundario.nombre
    }

    let numeroCuentaCobro = null, nombreArrendatario = null, total = null
    let prediosTabla = []
    let lineas = []
    if (esPdf) {
      lineas = await extraerLineas(pdfBuffer)
      const enc = extraerEncabezado(lineas)
      numeroCuentaCobro  = enc.numero
      nombreArrendatario = enc.arrendatario
      prediosTabla = extraerPrediosTabla(lineas)
      total = extraerTotal(lineas)
    }

    const esCuentaCobro = tipoArchivo === 'cuenta_cobro'

    // Determinar formato y lista de códigos de predio
    let formato, codigosPredio
    if (prediosTabla.length) {
      formato = 'A'
      codigosPredio = prediosTabla.map(p => p.codigoPredio)
    } else {
      codigosPredio = prediosDeNombre(principal.nombre)
      if (esJpg)              formato = 'D'
      else if (esCuentaCobro) formato = 'B'
      else                    formato = 'C'
    }

    // Arrendatario según formato
    if (formato === 'C' && !nombreArrendatario) nombreArrendatario = extraerEmisora(lineas)
    if (formato === 'D') nombreArrendatario = nombreArrendatario || ''

    // Valor por predio
    const valoresTabla = Object.fromEntries(prediosTabla.map(p => [p.codigoPredio, p.valor]))
    const nPredios = codigosPredio.length || 1
    function valorDe(codigo) {
      if (formato === 'A') return valoresTabla[codigo] ?? null
      if (formato === 'B' && total) return Math.round(total / nPredios)
      return null
    }

    const predios = (codigosPredio.length ? codigosPredio : [codigoExtraido]).map(codigo => {
      const short = predioShort(codigo) || codigo
      const m = matchPredio(short, proyectos)
      return {
        uid: uid(),
        codigoPredio:   short,
        valor:          valorDe(short),
        proyectoId:     m?.id ?? null,
        proyectoNombre: m?.proyecto ?? null,
        conPago:        false,   // se calcula luego (predio repetido entre pagos)
        yaExiste:       false,
      }
    })

    grupos.push({
      uid: uid(), carpeta, pagoId, codigoExtraido,
      numeroCuentaCobro, nombreArrendatario, tipoArchivo, formato,
      pdfBlob, pdfSecBlob, pdfSecNombre, originalName: principal.nombre, predios,
    })
  }

  if (!grupos.length) {
    return { periodoZip, grupos: [], warning: 'No se encontraron documentos procesables' }
  }

  // Marcar predios repetidos entre pagos (para el sufijo _pagoN)
  const conteo = {}
  for (const g of grupos) for (const p of g.predios) conteo[p.codigoPredio] = (conteo[p.codigoPredio] || 0) + 1
  for (const g of grupos) for (const p of g.predios) p.conPago = conteo[p.codigoPredio] > 1

  return { periodoZip, grupos, warning: null }
}

// ════════════════════════════════════════════════════════════════════════════════
// Despachador de mensajes
// ════════════════════════════════════════════════════════════════════════════════

const HANDLERS = {
  processZip:     (payload) => processZip(payload),
  parseFacturas:  ({ files }) => parseFacturas(files),
  parseSemanales: ({ garantia, saldo, web }) => parseSemanales(garantia, saldo, web),
  parseTxr:       ({ file }) => parseTxr(file),
  parseMensual:   ({ file }) => parseMensual(file),
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data || {}
  const handler = HANDLERS[type]
  if (!handler) {
    self.postMessage({ id, ok: false, error: `Operación desconocida: ${type}` })
    return
  }
  try {
    const result = await handler(payload || {})
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) })
  }
}
