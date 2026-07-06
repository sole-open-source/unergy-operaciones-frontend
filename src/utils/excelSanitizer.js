// ─────────────────────────────────────────────────────────────────────────────
// Sanitizador de inyección de fórmulas en exportaciones Excel/CSV.
//
// SEGURIDAD — léase antes de modificar:
//   • Excel, Google Sheets y LibreOffice interpretan como FÓRMULA cualquier celda
//     de texto que empiece por `=`, `+`, `-` o `@`. Si un dato controlado por el
//     usuario (nombre de predio, comentario, descripción…) empieza por uno de
//     esos caracteres, al abrir el archivo se puede ejecutar contenido no
//     deseado (CSV/Formula Injection → exfiltración de datos o RCE vía DDE).
//   • La defensa estándar (OWASP) es anteponer un apóstrofo `'` al valor, que
//     fuerza a la hoja de cálculo a tratar la celda como texto literal. El
//     apóstrofo no se muestra como contenido: la celda enseña `=1+1` sin
//     evaluarlo.
//   • Se sanitiza SOLO texto. Los números, fechas y demás tipos no-string se
//     devuelven intactos para no romper el formato numérico de las celdas.
// ─────────────────────────────────────────────────────────────────────────────

// Caracteres que las hojas de cálculo interpretan como inicio de fórmula.
const FORMULA_TRIGGERS = ['=', '+', '-', '@']

/**
 * Neutraliza una celda ante inyección de fórmulas.
 *
 * Si `value` es una cadena que empieza por un carácter de fórmula (`=`, `+`,
 * `-`, `@`), le antepone un apóstrofo para que la hoja de cálculo la trate como
 * texto. Cualquier otro valor (números, fechas, null, undefined, objetos) se
 * devuelve sin cambios para preservar su tipo y formato.
 *
 * @param {*} value Valor a escribir en la celda.
 * @returns {*} El valor saneado si era texto peligroso; si no, el valor original.
 */
export function sanitizeCell(value) {
  if (typeof value !== 'string' || value.length === 0) return value
  if (FORMULA_TRIGGERS.includes(value[0])) return `'${value}`
  return value
}
