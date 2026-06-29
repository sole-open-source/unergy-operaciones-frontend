/**
 * Servicio de Arriendos — llamadas a la API de datos de arriendos.
 *
 * Reemplaza al antiguo `src/data/pagoarriendos.json`, que duplicaba —y exponía
 * en el bundle del cliente— valores financieros sensibles (valor base, canon de
 * arrendamiento). La fuente única ahora es el backend: la tabla `arr_proyectos`,
 * servida por `GET /arriendos/proyectos`.
 */
import api from '@/api/client'

// Caché en memoria: los datos de configuración son prácticamente estáticos
// dentro de una sesión, así evitamos llamadas repetidas al backend.
let _paymentConfigCache = null

/**
 * Configuración de pago de arriendos por proyecto.
 *
 * GET /arriendos/proyectos → [{ id, nombre, codigo, fecha_firma_contrato,
 *   valor_base, canon_archivo, activo }]
 *
 * El backend usa snake_case; aquí lo mapeamos a la forma histórica que
 * `ArriendosInfo.vue` espera, para no tocar la lógica de la vista:
 *   { Codigo, Proyecto, "Fecha firma contrato", "Valor base", "Canon arrendamiento" }
 *
 * @param {{ force?: boolean }} [opts] - `force: true` ignora la caché.
 * @returns {Promise<Array<object>>} arreglo de proyectos (vacío ante error).
 */
export async function getPaymentConfig({ force = false } = {}) {
  if (_paymentConfigCache && !force) return _paymentConfigCache
  try {
    const { data } = await api.get('/arriendos/proyectos')
    const filas = Array.isArray(data) ? data : []
    _paymentConfigCache = filas.map((p) => ({
      Codigo: p.codigo ?? null,
      Proyecto: p.nombre,
      'Fecha firma contrato': p.fecha_firma_contrato ?? null,
      'Valor base': p.valor_base ?? null,
      'Canon arrendamiento': p.canon_archivo ?? null,
    }))
  } catch (err) {
    console.error('Error cargando configuración de pago de arriendos:', err)
    // No cacheamos el fallo: el siguiente llamado reintenta.
    _paymentConfigCache = null
    return []
  }
  return _paymentConfigCache
}
