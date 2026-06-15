/**
 * Utilidades para manejo seguro de credenciales (API keys, secrets, tokens).
 * Nunca registran en consola ni exponen el valor sensible.
 */

/**
 * Enmascara un valor sensible dejando visibles solo los últimos caracteres.
 *
 * @param {string} value - Valor a enmascarar (api key, secret, token).
 * @param {number} visibleChars - Cantidad de caracteres finales visibles (default 4).
 * @returns {string} Valor enmascarado, ej: '••••••••abc1'. '••••••••' si el valor es vacío.
 */
export function maskSecret(value, visibleChars = 4) {
  if (!value) return '••••••••'
  const str = String(value)
  if (str.length <= visibleChars) return '•'.repeat(str.length)
  return '•'.repeat(str.length - visibleChars) + str.slice(-visibleChars)
}

/**
 * Copia texto al portapapeles usando la Clipboard API sin filtrar el contenido a logs.
 * En caso de error solo se registra un mensaje genérico, nunca el texto ni la etiqueta.
 *
 * @param {string} text - Texto a copiar.
 * @param {string} label - Etiqueta descriptiva (solo uso interno, no se registra).
 * @returns {Promise<boolean>} true si la copia fue exitosa.
 */
export async function safeCopyToClipboard(text, label) {
  void label
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    console.error('No se pudo copiar al portapapeles')
    return false
  }
}
