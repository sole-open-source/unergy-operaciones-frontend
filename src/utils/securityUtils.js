// Utilidades para enmascarar datos sensibles antes de mostrarlos en la UI
// o registrarlos en consola/red. Evita filtrar API keys, tokens, contraseñas
// y cadenas de conexión.

// Patrones de nombres de campo que típicamente contienen secretos.
const SENSITIVE_PATTERNS = [
  'key',
  'secret',
  'token',
  'password',
  'passwd',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'connection_string',
  'conn_str',
  'credential',
]

/**
 * Indica si el nombre de un campo sugiere que contiene datos sensibles.
 * @param {string} key
 * @returns {boolean}
 */
export function isSensitiveKey(key) {
  if (typeof key !== 'string') return false
  const k = key.toLowerCase()
  return SENSITIVE_PATTERNS.some((p) => k.includes(p))
}

/**
 * Enmascara un secreto dejando visibles solo los primeros `visibleChars`.
 * Si la entrada no es un string, se devuelve sin modificar.
 * @param {*} value
 * @param {number} visibleChars
 * @returns {*}
 */
export function maskSecret(value, visibleChars = 4) {
  if (typeof value !== 'string' || value.length === 0) return value
  if (value.length <= visibleChars) return '****'
  return `${value.slice(0, visibleChars)}****...`
}

/**
 * Recorre recursivamente un objeto/array y enmascara los valores cuyas claves
 * sugieren datos sensibles. Devuelve una copia; no muta la entrada original.
 * Útil para registrar payloads sin filtrar secretos.
 * @param {*} obj
 * @returns {*}
 */
export function sanitizeLogObject(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') return obj
  // Evitar ciclos (p.ej. configs de axios con referencias circulares).
  if (seen.has(obj)) return '[Circular]'
  seen.add(obj)

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogObject(item, seen))
  }

  const out = {}
  for (const [key, val] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      out[key] = typeof val === 'string' ? maskSecret(val) : '****'
    } else if (val && typeof val === 'object') {
      out[key] = sanitizeLogObject(val, seen)
    } else {
      out[key] = val
    }
  }
  return out
}

export default { isSensitiveKey, maskSecret, sanitizeLogObject }
