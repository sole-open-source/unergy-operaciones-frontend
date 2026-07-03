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
 * Todas las rutas de export (aoa_to_sheet, json_to_sheet y los CSV armados a
 * mano) deben pasar por estos helpers. Ver `sanitizeAoa`/`sanitizeRow` para los
 * dos formatos que consume la librería `xlsx`, y `sanitizeCell` para el resto.
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

// Prefijos que, al inicio de una celda, disparan la evaluación de fórmulas.
const DANGEROUS_PREFIXES = ['=', '+', '-', '@']

/**
 * Neutraliza el valor de una celda destinada a un export Excel/CSV.
 *
 * Solo actúa sobre cadenas: si el texto (tras recortar espacios) empieza por
 * un prefijo peligroso, se le antepone una comilla simple. `trim()` en la
 * detección también cubre el bypass clásico de anteponer un TAB/salto de línea
 * al payload (`"\t=cmd"`), sin alterar el valor visible. Los valores no-string
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

/**
 * Sanea todos los valores string de un objeto-fila (el formato que consume
 * `XLSX.utils.json_to_sheet`). Devuelve un objeto nuevo; no muta el original.
 *
 * @param {Object} row - Fila en formato { columna: valor }.
 * @returns {Object} Fila saneada.
 */
export function sanitizeRow(row) {
  if (row == null || typeof row !== 'object') return row
  const out = {}
  for (const k in row) out[k] = sanitizeCell(row[k])
  return out
}

/**
 * Sanea una matriz de filas (el formato que consume `XLSX.utils.aoa_to_sheet`).
 * Preserva huecos de arrays esparcidos (los construidos con `aoa[r][c] = v`) y
 * deja intactos los valores no-string, por lo que es seguro envolver cualquier
 * `aoa` justo antes de `aoa_to_sheet(aoa)` sin romper números ni estilos que se
 * apliquen luego por referencia de celda.
 *
 * @param {Array<Array<*>>} aoa - Matriz fila×columna.
 * @returns {Array<Array<*>>} Matriz saneada.
 */
export function sanitizeAoa(aoa) {
  if (!Array.isArray(aoa)) return aoa
  return aoa.map(row => (Array.isArray(row) ? row.map(sanitizeCell) : sanitizeCell(row)))
}
