// Formateo VISUAL de nombres (proyectos, clientes) -- no toca el dato en la BD.
// Los nombres llegan con mezcla de mayúsculas/minúsculas según quién los cargó
// (algunos todo en mayúscula, otros normales). Estandarizamos la vista:
// siglas conocidas se quedan en mayúscula, el resto en "primera letra
// mayúscula, resto minúscula" por palabra, y se quitan guiones/guion
// bajo/comas/etc.
//
// Las siglas son una lista fija -- no hay forma de adivinar si "NAOS" es una
// sigla a propósito o alguien escribió el nombre completo en mayúscula, así
// que si aparece una nueva, hay que agregarla acá a mano.
const SIGLAS = [
  'MGS', 'GD', 'COX', 'S.A.S.', 'E.S.P.',
  'MDM', 'IML', 'AMC', 'IX', 'VIII', 'PSF', 'CSCI', 'FMO', 'FEM', 'BBVA', 'S.A', 'E2E', 'CGM',
  'AGGE', 'AGPE',
]
const SIGLAS_POR_CLAVE = new Map(SIGLAS.map(s => [s.replace(/\./g, '').toUpperCase(), s]))

export function formatearNombre(nombre) {
  if (!nombre) return nombre
  return nombre
    // Guion y guion bajo actúan como separador de palabra (si no, quedan
    // pegados al texto vecino, ej. "El_Remolino" -> "Elremolino" en vez de
    // "El Remolino").
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map(palabra => {
      // Quita comas y cualquier caracter que no sea letra/número (los puntos
      // de las siglas tipo "S.A.S." se recuperan via SIGLAS_POR_CLAVE).
      const limpio = palabra.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '')
      if (!limpio) return ''
      const clave = limpio.toUpperCase()
      const sigla = SIGLAS_POR_CLAVE.get(clave)
      if (sigla) return sigla
      return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase()
    })
    .filter(Boolean)
    .join(' ')
}
