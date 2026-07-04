/**
 * Validación de solapamiento de fechas en contratos ASIC (GESCON).
 *
 * Contexto de negocio:
 *   Un contrato ASIC registra una planta (proyecto) bajo un código SIC ante XM,
 *   con una ventana [fecha_inicio, fecha_fin]. Si la MISMA planta queda activa en
 *   dos contratos con fechas que se cruzan, su generación se cuenta dos veces en
 *   Cumplimiento. El modelo ya expone dos banderas para resolver ese cruce:
 *     - reemplaza_anterior : esta planta sustituye al registro previo en el SIC.
 *     - es_duplicado       : "compra en bolsa" — la planta ya está en otro
 *                            contrato; el suministro cuenta pero su origen es bolsa.
 *   Un cruce SIN ninguna de las dos banderas es un conflicto de atribución.
 *
 * Este módulo son funciones puras (sin dependencias de Vue ni de red) para poder
 * usarlas en la vista y probarlas con node (ver validacionContratos.test.mjs).
 */

// Estados que ya no aportan energía: no cuentan para el solapamiento.
export const ESTADOS_INACTIVOS = ['rechazado', 'desistido', 'terminado']

// Centinelas para tratar fechas abiertas como ±infinito en comparación de strings.
const MIN_DATE = '0000-01-01'
const MAX_DATE = '9999-12-31'

/**
 * Normaliza un valor de fecha (Date | 'YYYY-MM-DD...' | null) a 'YYYY-MM-DD'.
 * Usa componentes locales para no correr el día por zona horaria.
 */
export function toIsoDate(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

/**
 * ¿El contrato sigue vigente/activo? (no rechazado/desistido/terminado).
 */
export function contratoActivo(c) {
  return !ESTADOS_INACTIVOS.includes(c?.estado_solicitud)
}

/**
 * Devuelve los contratos de `existingContracts` cuya ventana de fechas se cruza
 * con [startDate, endDate]. Un extremo nulo se trata como abierto (±infinito).
 *
 * Regla canónica de solapamiento de rangos: f1.inicio <= f2.fin && f1.fin >= f2.inicio.
 */
export function checkDateOverlap(startDate, endDate, existingContracts = []) {
  const s1 = toIsoDate(startDate) || MIN_DATE
  const e1 = toIsoDate(endDate) || MAX_DATE
  return (existingContracts || []).filter((c) => {
    const s2 = toIsoDate(c.fecha_inicio) || MIN_DATE
    const e2 = toIsoDate(c.fecha_fin) || MAX_DATE
    return s1 <= e2 && e1 >= s2
  })
}

/**
 * Busca los contratos que el nuevo registro reemplazaría: mismos SIC, activos,
 * con fechas que se cruzan, excluyendo el propio registro (por id) y — si el nuevo
 * trae proyecto — las plantas realmente distintas se conservan porque "reemplaza
 * anterior" opera a nivel de SIC (una planta sustituye a la anterior del SIC).
 */
export function findReplacementContract(newContract = {}, existingContracts = []) {
  const sic = newContract.codigo_sic_contrato || null
  if (!sic) return []
  const candidatos = (existingContracts || []).filter((c) =>
    c.id !== newContract.id &&
    contratoActivo(c) &&
    c.codigo_sic_contrato === sic,
  )
  return checkDateOverlap(newContract.fecha_inicio, newContract.fecha_fin, candidatos)
}

/**
 * Detecta duplicados exactos del contrato: mismo SIC, misma planta, mismas fechas
 * de inicio/fin y mismo tipo de solicitud (excluyendo el propio registro por id).
 */
export function validateContractUniqueness(contract = {}, existingContracts = []) {
  const sic = contract.codigo_sic_contrato || null
  const proyecto = contract.proyecto_id ?? null
  const ini = toIsoDate(contract.fecha_inicio)
  const fin = toIsoDate(contract.fecha_fin)
  return (existingContracts || []).filter((c) =>
    c.id !== contract.id &&
    (c.codigo_sic_contrato || null) === sic &&
    (c.proyecto_id ?? null) === proyecto &&
    toIsoDate(c.fecha_inicio) === ini &&
    toIsoDate(c.fecha_fin) === fin &&
    (c.tipo_solicitud ?? null) === (contract.tipo_solicitud ?? null),
  )
}

/**
 * Núcleo de la validación de atribución de generación para la vista.
 * Devuelve los contratos ACTIVOS de la MISMA planta cuyas fechas se cruzan con la
 * ventana propuesta (excluyendo el propio registro). Es el eje de doble conteo.
 *
 * @param {object} contract  { id?, proyecto_id, fecha_inicio, fecha_fin }
 * @param {Array}  existing  contratos ya cargados
 */
export function conflictosAtribucion(contract = {}, existingContracts = []) {
  const proyecto = contract.proyecto_id ?? null
  if (proyecto == null) return []
  if (!contract.fecha_inicio) return []
  const mismaPlanta = (existingContracts || []).filter((c) =>
    c.id !== contract.id &&
    contratoActivo(c) &&
    (c.proyecto_id ?? null) === proyecto,
  )
  return checkDateOverlap(contract.fecha_inicio, contract.fecha_fin, mismaPlanta)
}
