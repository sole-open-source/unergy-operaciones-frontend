/**
 * Servicio de Arriendos — llamadas a la API de datos de arriendos.
 *
 * Reemplaza al antiguo `src/data/pagoarriendos.json`, que exponía valores
 * financieros sensibles (valor base, canon de arrendamiento) directamente en
 * el bundle del cliente. Esos datos ahora se sirven desde el backend seguro.
 */
import api from '@/api/client'

// Caché en memoria: los datos de configuración son prácticamente estáticos
// dentro de una sesión, así evitamos llamadas repetidas al backend.
let _paymentConfigCache = null

/**
 * Configuración de pago de arriendos por proyecto.
 *
 * GET /arriendos/payment-config
 * Devuelve un arreglo de objetos con la misma forma que tenía el JSON:
 *   { Codigo, Proyecto, "Fecha firma contrato", "Valor base", "Canon arrendamiento" }
 *
 * @param {{ force?: boolean }} [opts] - `force: true` ignora la caché.
 * @returns {Promise<Array<object>>} arreglo de proyectos (vacío ante error).
 */
export async function getPaymentConfig({ force = false } = {}) {
  if (_paymentConfigCache && !force) return _paymentConfigCache
  try {
    const { data } = await api.get('/arriendos/payment-config')
    _paymentConfigCache = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Error cargando configuración de pago de arriendos:', err)
    _paymentConfigCache = null
    return []
  }
  return _paymentConfigCache
}
