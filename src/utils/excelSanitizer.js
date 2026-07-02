/**
 * Utilidad centralizada contra la inyección de fórmulas en hojas de cálculo
 * (Excel/CSV Formula Injection, también conocido como CSV Injection).
 *
 * Un atacante puede almacenar en la base de datos un texto que empiece por
 * `=`, `+`, `-` o `@` (por ejemplo `=CMD|' /C calc'!A0`). Al exportar ese dato
 * a un .xlsx o .csv, Excel/LibreOffice lo interpretan como fórmula y pueden
 * ejecutar código o filtrar datos al abrir el archivo.
 *
 * Anteponer una comilla simple (`'`) fuerza a la aplicación de hoja de cálculo
 * a tratar la celda como texto literal, neutralizando el payload.
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

// Prefijos que, al inicio de una celda, disparan la evaluación de fórmulas.
const DANGEROUS_PREFIXES = ['=', '+', '-', '@']

/**
 * Neutraliza el valor de una celda destinada a un export Excel/CSV.
 *
 * Solo actúa sobre cadenas: si el texto (tras recortar espacios) empieza por
 * un prefijo peligroso, se le antepone una comilla simple. Los valores no-string
 * (números, fechas, null, undefined, objetos) se devuelven intactos para no
 * alterar tipos ni convertir números en texto.
 *
 * @param {*} value - Valor original de la celda.
 * @returns {*} La cadena saneada, o el valor original si no es una cadena.
 */
export function sanitizeCell(value) {
  if (typeof value !== 'string') return value
  if (DANGEROUS_PREFIXES.includes(value.trim().charAt(0))) return `'${value}`
  return value
}
