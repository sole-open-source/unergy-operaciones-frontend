/**
 * sanitization.js
 * ---------------------------------------------------------------------------
 * Utilidades centralizadas para neutralizar contenido no confiable (texto
 * extraído de PDFs/Excel subidos por el usuario, nombres de archivo, mensajes
 * de error…) ANTES de inyectarlo en el DOM con `innerHTML` o `v-html`.
 *
 * Nota importante sobre el contexto:
 *   - La interpolación normal de Vue (`{{ valor }}`) YA es segura: escapa el
 *     texto automáticamente. Estas utilidades son solo para el código que
 *     construye HTML a mano (innerHTML/v-html).
 *   - Usar `sanitizeText` cuando el valor va DENTRO de un nodo de texto HTML.
 *   - Usar `sanitizeAttr` cuando el valor va DENTRO de un atributo entre
 *     comillas (p. ej. value="${x}"): ahí quitar etiquetas no basta, hay que
 *     escapar las comillas para evitar inyección de atributos (onerror=…).
 * ---------------------------------------------------------------------------
 */

import DOMPurify from 'dompurify'

/**
 * Elimina TODO el HTML de un valor y devuelve solo su texto, seguro para
 * insertarse en un nodo de texto vía innerHTML/v-html. Neutraliza payloads
 * como `<script>…</script>` o `<img src=x onerror=…>`.
 *
 * @param {*} value  Valor no confiable (se convierte a string).
 * @returns {string} Texto sin etiquetas HTML.
 */
export function sanitizeText(value) {
  if (value == null) return ''
  return DOMPurify.sanitize(String(value), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
}

/**
 * Escapa un valor para insertarse DENTRO de un atributo HTML entrecomillado.
 * A diferencia de sanitizeText, escapa comillas y `<`/`>` como entidades, de
 * modo que el valor no pueda "romper" el atributo ni abrir una etiqueta.
 *
 * @param {*} value  Valor no confiable (se convierte a string).
 * @returns {string} Texto con caracteres peligrosos escapados como entidades.
 */
export function sanitizeAttr(value) {
  if (value == null) return ''
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]))
}
