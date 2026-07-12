// ─────────────────────────────────────────────────────────────────────────────
// Validación y saneamiento del CONTENIDO de archivos Excel/CSV/XML.
//
// Complementa a zipSecurityValidator.js (que valida rutas/extensiones): aquí se
// mira dentro del archivo. Se lee el buffer con SheetJS, se recorren todas las
// celdas de todas las hojas y se:
//   1. detectan payloads peligrosos (script/handlers/protocolos/fórmulas),
//   2. sanean los valores de texto,
//   3. opcionalmente se valida cada fila contra un esquema Zod.
//
// Devuelve un resultado estructurado { is_valid, errors, sanitized_data } y NO
// lanza, para que la vista pueda bloquear el envío y mostrar el motivo.
//
// El núcleo (`scanRows`, `sanitizeRows`, `cellThreats`) es puro y no depende de
// SheetJS ni del DOM → es lo que cubren las pruebas (fileValidator.test.mjs).
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'
import { sanitizeString } from './sanitizer.js'

// Patrones que bloquean la carga de un archivo.
//
// Criterio: solo se bloquea lo que es INEQUÍVOCAMENTE ejecutable. Bloquear un
// archivo aborta una conciliación completa, así que un falso positivo aquí es
// una caída del producto, no una molestia. Un Excel contable real trae teléfonos
// ("+57 300 123 4567"), handles ("@hillary"), notas ("Bodega <norte>",
// "metadata: v2") y fórmulas ("=SUM(A1:A5)"): NADA de eso es un ataque contra
// esta app y ninguno vuelve a bloquear la carga.
//
// Lo que NO se filtra aquí y por qué:
//   • Marcado HTML genérico (`<norte>`): inofensivo. Los datos del archivo se
//     pintan escapados (Vue `{{ }}` y `escapeHtml` en los sitios que arman HTML
//     a mano) — la defensa XSS vive en el RENDER, no en la puerta de entrada.
//   • `=`/`+`/`@` al inicio de celda: la inyección de fórmula es una amenaza de
//     ESCRITURA (un CSV/XLSX que NOSOTROS generamos y el usuario abre en Excel),
//     no de lectura. Se neutraliza al exportar, no al importar.
//   • `data:`: aparece en español legítimo ("Big Data:", "metadata:").
const THREAT_PATTERNS = [
  { code: 'SCRIPT', re: /<\s*script/i, message: 'Contiene un bloque <script>' },
  // Manejador inline: solo dentro de una etiqueta (`<img … onerror=`). Sin el
  // contexto de etiqueta, `on\w+=` matchea español corriente ("once=11",
  // "pago online = transferencia") y tumbaba el archivo entero.
  { code: 'EVENT_HANDLER', re: /<[^>]+\bon\w+\s*=/i, message: 'Contiene un manejador de eventos inline' },
  { code: 'JS_PROTOCOL', re: /(javascript|vbscript)\s*:/i, message: 'Contiene un protocolo ejecutable' },
]

// Amenazas detectadas en una celda (solo aplica a valores de texto).
export function cellThreats(value) {
  if (typeof value !== 'string') return []
  const v = value.trim()
  if (v === '') return []
  const found = []
  for (const p of THREAT_PATTERNS) {
    if (p.re.test(v)) found.push({ code: p.code, message: p.message })
  }
  return found
}

// Recorre una matriz 2D (filas × columnas) y reporta amenazas por celda.
export function scanRows(rows) {
  const errors = []
  const matrix = Array.isArray(rows) ? rows : []
  matrix.forEach((row, r) => {
    const cols = Array.isArray(row) ? row : Object.values(row || {})
    cols.forEach((value, c) => {
      for (const t of cellThreats(value)) {
        errors.push({ row: r, col: c, code: t.code, message: t.message, value: String(value).slice(0, 120) })
      }
    })
  })
  return { is_valid: errors.length === 0, errors }
}

// Devuelve una copia de la matriz con el texto normalizado (sin caracteres de
// control, recortado). No muta la entrada.
//
// NO reescribe el dato: no quita marcado ni antepone apóstrofo a las celdas que
// empiezan por `=`/`+`/`@`. Al importar, el dato del usuario se conserva tal cual
// (un teléfono "+57 300 123 4567" debe seguir siendo ese teléfono al conciliar).
// La neutralización de fórmulas es una defensa de EXPORTACIÓN y se aplica al
// ESCRIBIR el CSV (ver csvText → neutralizeFormulaInjection en
// ValidadorMandatosView.vue), que es el sink real donde la fórmula se ejecuta.
export function sanitizeRows(rows) {
  const matrix = Array.isArray(rows) ? rows : []
  const clean = (v) => (typeof v === 'string' ? sanitizeString(v, { stripMarkup: false }) : v)
  return matrix.map((row) => {
    if (Array.isArray(row)) return row.map(clean)
    const out = {}
    for (const [k, v] of Object.entries(row || {})) out[k] = clean(v)
    return out
  })
}

// ── Integración con SheetJS ────────────────────────────────────────────────────
// Extrae todas las hojas de un workbook como matrices 2D.
function workbookToMatrices(wb) {
  const sheets = {}
  for (const name of wb.SheetNames || []) {
    sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
  }
  return sheets
}

// Escanea un workbook ya leído (todas sus hojas) en busca de amenazas.
// Devuelve { is_valid, errors } con la hoja anotada en cada error.
export function validateWorkbook(wb) {
  const sheets = workbookToMatrices(wb)
  const errors = []
  for (const [sheet, matrix] of Object.entries(sheets)) {
    const res = scanRows(matrix)
    for (const e of res.errors) errors.push({ sheet, ...e })
  }
  return { is_valid: errors.length === 0, errors }
}

// Punto de entrada de alto nivel: lee un buffer/ArrayBuffer de Excel, escanea,
// sanea y (opcional) valida cada fila de la primera hoja contra un esquema Zod.
// Devuelve { is_valid, errors, sanitized_data }.
export function validateExcelBuffer(buffer, options = {}) {
  const { schema = null, rowMapper = null, sheetIndex = 0 } = options
  let wb
  try {
    wb = XLSX.read(buffer, { type: 'array' })
  } catch (err) {
    return { is_valid: false, errors: [{ code: 'READ_ERROR', message: `No se pudo leer el archivo: ${err.message}` }], sanitized_data: [] }
  }

  const scan = validateWorkbook(wb)
  const sheetName = (wb.SheetNames || [])[sheetIndex]
  const matrix = sheetName ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) : []
  const sanitized = sanitizeRows(matrix)
  const errors = [...scan.errors]

  // Validación opcional fila-a-fila contra un esquema (usa rowMapper para
  // convertir la fila cruda en el objeto que espera el esquema).
  if (schema && rowMapper) {
    sanitized.forEach((row, i) => {
      const mapped = rowMapper(row, i)
      if (mapped == null) return
      const result = schema.safeParse(mapped)
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            row: i,
            code: 'SCHEMA',
            field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? ''),
            message: issue.message,
          })
        }
      }
    })
  }

  return { is_valid: errors.length === 0, errors, sanitized_data: sanitized }
}
