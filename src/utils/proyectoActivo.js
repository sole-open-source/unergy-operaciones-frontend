/**
 * Devuelve true si el proyecto sigue activo (bajo representación) en el mes/año indicados.
 * Un proyecto sin fecha_fin_representacion se considera siempre activo.
 *
 * @param {Object} proyecto - Objeto con campo fecha_fin_representacion (string YYYY-MM-DD o null)
 * @param {number} anio
 * @param {number} mes - 1-indexed
 * @returns {boolean}
 */
export function proyectoActivoEnMes(proyecto, anio, mes) {
  if (!proyecto?.fecha_fin_representacion) return true
  const fin = new Date(proyecto.fecha_fin_representacion)
  return new Date(anio, mes - 1) <= fin
}
