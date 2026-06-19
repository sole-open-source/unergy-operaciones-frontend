// ─────────────────────────────────────────────────────────────────────────────
// securityMiddleware — guardas de seguridad para la navegación
//
// Inspecciona los parámetros de ruta y query antes de entrar a una vista para
// detectar payloads sospechosos (etiquetas <script>, manejadores inline,
// `javascript:`, payloads codificados…). Si detecta algo malicioso, redirige a
// una ruta segura en lugar de pasar el valor crudo al componente.
// ─────────────────────────────────────────────────────────────────────────────
import { sanitizeText } from '@/utils/sanitization'

// Ruta segura a la que redirigir si se detecta un parámetro peligroso.
const RUTA_SEGURA = '/dashboard'

// Patrones de inyección comunes. Se evalúan sobre el valor decodificado.
const PATRONES_PELIGROSOS = [
  /<\s*script/i,                 // <script>
  /<\s*\/?\s*iframe/i,           // <iframe>
  /<\s*img[^>]*\bon\w+\s*=/i,    // <img onerror=...>
  /javascript:/i,               // javascript: URI
  /\bon\w+\s*=/i,               // onload=, onclick=, onerror=…
  /<\s*svg[^>]*\bon\w+/i,        // <svg onload=...>
  /data:text\/html/i,           // data:text/html payloads
  /%3c\s*script/i,              // <script codificado en %3C
]

/** Intenta decodificar componentes de URL de forma segura (sin lanzar). */
function decodeSeguro(valor) {
  let v = String(valor)
  for (let i = 0; i < 2; i++) {            // doble decode para payloads anidados
    try {
      const dec = decodeURIComponent(v)
      if (dec === v) break
      v = dec
    } catch { break }
  }
  return v
}

/** ¿El valor contiene algún patrón de inyección conocido? */
export function esValorPeligroso(valor) {
  if (valor == null) return false
  const v = decodeSeguro(valor)
  return PATRONES_PELIGROSOS.some(re => re.test(v))
}

/**
 * Recorre params y query de la ruta destino. Devuelve `true` si alguno
 * contiene un payload sospechoso.
 */
export function rutaTieneParametrosPeligrosos(to) {
  const fuentes = [to.params, to.query]
  for (const fuente of fuentes) {
    for (const valor of Object.values(fuente || {})) {
      const valores = Array.isArray(valor) ? valor : [valor]
      if (valores.some(esValorPeligroso)) return true
    }
  }
  return false
}

/**
 * Sanea in-place los valores string de `to.query` (los params suelen estar
 * tipados por la ruta; la query es texto libre del usuario). No muta cuando no
 * hace falta para no provocar navegaciones redundantes.
 */
export function sanitizarQuery(to) {
  if (!to.query) return
  for (const [k, v] of Object.entries(to.query)) {
    if (typeof v === 'string') {
      const limpio = sanitizeText(v)
      if (limpio !== v) to.query[k] = limpio
    }
  }
}

/**
 * Guarda de navegación. Devuelve la ruta segura si detecta un payload
 * peligroso, o `undefined` para permitir la navegación normal.
 * Se conecta en `router.beforeEach`.
 */
export function securityGuard(to) {
  if (rutaTieneParametrosPeligrosos(to)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[security] Parámetro de ruta sospechoso bloqueado:', to.fullPath)
    }
    return RUTA_SEGURA
  }
  sanitizarQuery(to)
  return undefined
}

export default securityGuard
