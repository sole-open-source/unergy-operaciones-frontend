// ─────────────────────────────────────────────────────────────────────────────
// useSecureInput — composable para saneamiento de entradas de formularios
//
// Envuelve el saneamiento anti-XSS para usarlo de forma uniforme en los
// formularios:
//   • `sanitizeOnBlur(model, key)` → handler para limpiar un campo al perder foco
//   • `beforeSubmit(payload)`      → sanea todo el payload antes de enviarlo a la API
//   • `safeValue(ref)`             → computed con el valor saneado para mostrar
//   • `secureLog(...)`             → log que NUNCA imprime campos sensibles
// ─────────────────────────────────────────────────────────────────────────────
import { computed, unref } from 'vue'
import { sanitizeText, sanitizeJSON } from '@/utils/sanitization'

// Claves que jamás deben registrarse en consola ni exponerse en logs.
const CLAVES_SENSIBLES = [
  'password', 'contrasena', 'contraseña', 'clave',
  'token', 'access_token', 'refresh_token',
  'api_key', 'apikey', 'api_keys', 'secret', 'authorization',
]

function esClaveSensible(key) {
  const k = String(key).toLowerCase()
  return CLAVES_SENSIBLES.some(s => k.includes(s))
}

/**
 * Devuelve una copia del objeto con los valores de campos sensibles
 * reemplazados por «[oculto]», para poder loguear sin filtrar secretos.
 */
function redactar(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(redactar)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = esClaveSensible(k) ? '[oculto]' : (typeof v === 'object' ? redactar(v) : v)
  }
  return out
}

export function useSecureInput() {
  /**
   * Handler de blur: sanea in-place el campo `key` de un modelo reactivo.
   * Uso:  @blur="sanitizeOnBlur(form, 'descripcion')"
   */
  function sanitizeOnBlur(model, key) {
    if (model && key in model) {
      model[key] = sanitizeText(model[key])
    }
  }

  /**
   * Sanea recursivamente el payload completo justo antes de enviarlo a la API.
   * Preserva File/Blob/Date (ver sanitizeJSON), por lo que es seguro pasar
   * payloads con adjuntos.
   */
  function beforeSubmit(payload) {
    return sanitizeJSON(payload)
  }

  /** Computed de solo lectura con el valor saneado, para render seguro. */
  function safeValue(source) {
    return computed(() => sanitizeText(unref(source)))
  }

  /**
   * Log seguro: redacta campos sensibles antes de imprimir. Solo en DEV;
   * en producción no imprime nada para no filtrar datos en la consola.
   */
  function secureLog(...args) {
    if (!import.meta.env.DEV) return
    // eslint-disable-next-line no-console
    console.log(...args.map(a => (a && typeof a === 'object' ? redactar(a) : a)))
  }

  return { sanitizeOnBlur, beforeSubmit, safeValue, secureLog, redactar }
}

export default useSecureInput
