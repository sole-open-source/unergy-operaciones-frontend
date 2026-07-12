// ─────────────────────────────────────────────────────────────────────────────
// Utilidad central de saneamiento de entradas.
//
// Objetivo: eliminar HTML/XSS y vectores de inyección de TODA entrada de usuario
// (formularios financieros, formularios de cliente y contenido de archivos
// Excel/CSV/XML) ANTES de enviarla al backend. Es defensa en capas: Vue ya
// escapa `{{ }}`, pero el dato viaja al backend y puede renderizarse luego en
// contextos no escapados (PDF, otro sistema, export CSV → Excel).
//
// Estrategia:
//   • En navegador se usa DOMPurify (robusto, mantiene solo texto) y ADEMÁS el
//     núcleo determinista `stripHtml` como cinturón-y-tirantes.
//   • En Node/SSR (sin DOM) DOMPurify no puede correr; el núcleo `stripHtml`
//     es la garantía real y es lo que cubren las pruebas (sanitizer.test.mjs).
//
// Ninguna función lanza: siempre devuelve un valor saneado.
// ─────────────────────────────────────────────────────────────────────────────

import DOMPurify from 'dompurify'

// DOMPurify solo opera con un DOM real. Fuera del navegador su `sanitize` no
// existe (o es un passthrough inseguro), así que se detecta y se omite.
function canUseDOMPurify() {
  return typeof window !== 'undefined' && !!DOMPurify && typeof DOMPurify.sanitize === 'function'
}

// Convierte un punto de código a carácter, ignorando valores inválidos.
function safeFromCodePoint(cp) {
  try {
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return ''
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

// Decodifica las entidades HTML más comunes (incluidas numéricas/hex) para que un
// payload doble-codificado (`&amp;lt;script&amp;gt;`) quede expuesto y se pueda
// re-quitar en la siguiente pasada de stripHtml.
function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
}

// Elimina caracteres de control (incluye NUL) que no deberían viajar en texto.
function stripControlChars(s) {
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

// Núcleo determinista de saneamiento: quita etiquetas/scripts, decodifica y
// re-quita hasta estabilizar, y neutraliza protocolos peligrosos y manejadores
// de eventos inline. No depende del DOM → corre igual en navegador y en Node.
export function stripHtml(input) {
  let out = stripControlChars(input == null ? '' : String(input))

  // Bloques con contenido ejecutable/embebido: se eliminan enteros.
  const BLOCK = /<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi

  let prev
  let pass = 0
  do {
    prev = out
    out = out.replace(BLOCK, '')
    out = out.replace(/<[^>]*>/g, '')   // cualquier etiqueta cerrada
    out = decodeEntities(out)           // expone payloads codificados
    pass++
  } while (out !== prev && pass < 6)

  // Última limpieza tras el último decode.
  out = out.replace(BLOCK, '').replace(/<[^>]*>/g, '')
  // Protocolos peligrosos que puedan quedar en texto suelto.
  out = out.replace(/(javascript|vbscript|data)\s*:/gi, '')
  // Manejadores de eventos inline sobrevivientes (onerror=, onclick=…).
  out = out.replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  return out
}

// Sanea un valor a texto plano seguro. `null`/`undefined` → ''.
// opts.trim (por defecto true) recorta espacios en los extremos.
export function sanitizeString(input, opts = {}) {
  const { trim = true } = opts
  if (input == null) return ''
  let str = typeof input === 'string' ? input : String(input)
  if (canUseDOMPurify()) {
    // ALLOWED_TAGS/ATTR vacíos + KEEP_CONTENT → solo el texto, sin marcado.
    str = DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true })
  }
  str = stripHtml(str)
  return trim ? str.trim() : str
}

// Recorre un valor y sanea recursivamente todas las cadenas, preservando tipos
// (números, booleanos, null), fechas, arreglos y objetos. No muta el original ni
// entra en File/Blob. Pensado para limpiar un payload completo antes de enviarlo.
export function sanitizeObject(value) {
  if (typeof value === 'string') return sanitizeString(value)
  if (value == null || typeof value !== 'object') return value
  if (value instanceof Date) return value
  if (typeof File !== 'undefined' && value instanceof File) return value
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value
  if (Array.isArray(value)) return value.map((v) => sanitizeObject(v))
  const out = {}
  for (const [k, v] of Object.entries(value)) out[k] = sanitizeObject(v)
  return out
}

// Neutraliza la inyección de fórmulas en CSV/Excel: una celda que empieza por
// `= + - @` (o tab/CR) puede ejecutarse al abrir el archivo. Se antepone un
// apóstrofo. Los números (incl. negativos) se dejan intactos para no romper su
// interpretación numérica.
export function neutralizeFormulaInjection(value) {
  if (typeof value !== 'string') return value
  const v = value
  if (/^-?\d+([.,]\d+)*$/.test(v.trim())) return v            // número legítimo
  if (/^[=+\-@\t\r]/.test(v)) return `'${v}`
  return v
}

// Sanea contenido crudo de archivos de texto (CSV/XML/TXT) antes de extraer
// datos: quita NUL, bloques CDATA, instrucciones de proceso XML, DOCTYPE y
// declaraciones ENTITY (vector de XXE) y luego pasa por stripHtml.
export function sanitizeFileContent(content) {
  if (content == null) return ''
  let s = stripControlChars(String(content))
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
  s = s.replace(/<\?[\s\S]*?\?>/g, '')
  s = s.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  s = s.replace(/<!ENTITY[\s\S]*?>/gi, '')
  s = stripHtml(s)
  return s
}
