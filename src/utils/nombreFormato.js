// Formateo VISUAL de nombres (proyectos, clientes, fronteras) -- no toca el
// dato en la BD. Los nombres llegan con mezcla de mayúsculas/minúsculas según
// quién los cargó (algunos todo en mayúscula, otros normales). Estandarizamos
// la vista: siglas conocidas se quedan en mayúscula, el resto en "primera
// letra mayúscula, resto minúscula" por palabra. Puntos y guiones se
// conservan tal cual vienen (ej. "5.5 MVA", "PSF- Yurbaqua"); el guion bajo
// sigue actuando como separador invisible de palabra.
//
// Las siglas son una lista fija -- no hay forma de adivinar si "NAOS" es una
// sigla a propósito o alguien escribió el nombre completo en mayúscula, así
// que si aparece una nueva, hay que agregarla acá a mano.
const SIGLAS = [
  'MGS', 'GD', 'COX', 'S.A.S.', 'E.S.P.',
  'MDM', 'IML', 'AMC', 'IX', 'VIII', 'PSF', 'CSCI', 'FMO', 'FEM', 'BBVA', 'S.A', 'E2E', 'CGM',
  'AGGE', 'AGPE', 'MVA', 'X', 'I',
]
const SIGLAS_POR_CLAVE = new Map(SIGLAS.map(s => [s.replace(/\./g, '').toUpperCase(), s]))

// Dá formato a un fragmento sin guiones (solo letras/dígitos/puntos): si es
// una sigla conocida la devuelve tal cual estaba definida (con sus puntos),
// si no, capitaliza solo la primera letra y deja números/puntos como estaban.
function formatearFragmento(frag) {
  if (!frag) return ''
  const clave = frag.replace(/\./g, '').toUpperCase()
  const sigla = SIGLAS_POR_CLAVE.get(clave)
  if (sigla) return sigla
  let vistaLetra = false
  return frag.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, (c) => {
    const out = vistaLetra ? c.toLowerCase() : c.toUpperCase()
    vistaLetra = true
    return out
  })
}

export function formatearNombre(nombre) {
  if (!nombre) return nombre
  return nombre
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map(palabra => {
      if (!palabra) return ''
      if (!palabra.includes('-')) {
        // Quita comas y cualquier símbolo suelto que no sea letra/dígito/punto.
        const limpio = palabra.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.]/g, '')
        return formatearFragmento(limpio)
      }
      // Tiene guion: se conserva literal, y cada tramo alrededor se formatea
      // por separado (ej. "PSF-" -> "PSF-", "MGS 0030 - Chimá..." -> el "-"
      // suelto queda igual).
      return palabra
        .split('-')
        .map(tramo => formatearFragmento(tramo.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.]/g, '')))
        .join('-')
    })
    .filter(Boolean)
    .join(' ')
}
