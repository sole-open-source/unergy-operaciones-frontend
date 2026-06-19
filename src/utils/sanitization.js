// ─────────────────────────────────────────────────────────────────────────────
// Utilidades centralizadas de saneamiento de entradas (anti-XSS)
//
// Vue ya escapa la interpolación `{{ }}` por defecto, así que el riesgo real de
// XSS en esta app es bajo. Estas utilidades son una capa de defensa en
// profundidad: limpian el texto del usuario ANTES de enviarlo al backend (y
// antes de cualquier render con `v-html`, que debe evitarse).
//
// Se apoya en DOMPurify para eliminar etiquetas/atributos HTML de forma robusta.
// ─────────────────────────────────────────────────────────────────────────────
import DOMPurify from 'dompurify'

// Tipos que NO deben recorrerse/clonarse: se devuelven intactos.
function esTipoOpaco(v) {
  return (
    v instanceof File ||
    v instanceof Blob ||
    v instanceof Date ||
    (typeof FileList !== 'undefined' && v instanceof FileList) ||
    (typeof FormData !== 'undefined' && v instanceof FormData)
  )
}

/**
 * Elimina todo el HTML (etiquetas y atributos) de un string.
 * Los valores que no son string (null, undefined, number, boolean…) se
 * devuelven sin modificar para no romper payloads tipados.
 *
 * @param {*} input
 * @returns {*} el texto saneado, o el valor original si no era string
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return input
  if (input === '') return ''
  // ALLOWED_TAGS/ATTR vacíos → se descarta cualquier marcado, queda solo texto.
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Limpia recursivamente un objeto/array, saneando todos los strings que
 * contenga. Preserva números, booleanos, null y objetos «opacos» (File, Blob,
 * Date, FormData) tal cual — esto es importante para no corromper los archivos
 * adjuntos ni las fechas de los formularios.
 *
 * @param {*} obj
 * @returns {*} una copia saneada
 */
export function sanitizeJSON(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeText(obj)
  if (typeof obj !== 'object') return obj          // number, boolean, bigint…
  if (esTipoOpaco(obj)) return obj                 // File, Blob, Date, FormData

  if (Array.isArray(obj)) return obj.map(sanitizeJSON)

  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = sanitizeJSON(v)
  }
  return out
}

/**
 * Codifica los caracteres especiales de HTML para renderizar texto de forma
 * segura cuando no se puede usar interpolación de Vue (p. ej. al construir HTML
 * manualmente). Los no-string se convierten a '' para evitar "undefined".
 *
 * @param {*} str
 * @returns {string}
 */
export function encodeHtmlEntities(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default { sanitizeText, sanitizeJSON, encodeHtmlEntities }
