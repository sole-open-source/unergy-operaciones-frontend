/**
 * parseCOP — parsea el "Valor a Facturar" editado inline a un entero COP.
 *
 * Convención colombiana: '.' = separador de miles, ',' = decimal.
 * Preserva el signo negativo (guion o paréntesis contable) y redondea a entero
 * (el campo COP no lleva decimales). Devuelve null si el texto está vacío o no
 * es un número reconocible (mejor null que un valor silenciosamente incorrecto).
 *
 * Ejemplos:
 *   '1500000'        -> 1500000
 *   '$1.500.000'     -> 1500000
 *   '1.500.000,50'   -> 1500001   (antes daba 150000050: x100 por borrar la coma)
 *   '-500000'        -> -500000   (antes perdía el signo)
 *   '' | null | 'abc'-> null
 */
export function parseCOP(str) {
  if (str == null) return null
  let t = String(str).trim().replace(/\$/g, '').replace(/\s/g, '')
  if (t === '') return null

  const neg = /^-/.test(t) || /^\(.*\)$/.test(t)   // guion o paréntesis contable
  t = t.replace(/[()]/g, '').replace(/^-/, '')
  if (t === '') return null

  // Colombiano: quitar puntos de miles, coma decimal -> punto.
  t = t.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null        // rechaza formatos ambiguos/no numéricos

  const n = Number(t)
  if (!Number.isFinite(n)) return null
  const entero = Math.round(n)
  return neg ? -entero : entero
}
