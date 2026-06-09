import { useToast } from 'primevue/usetoast'

/**
 * Manejo granular de errores de API sobre el cliente Axios centralizado
 * (`@/api/client`).
 *
 * El interceptor global ya gestiona los casos de seguridad:
 *  - 401 → limpia la sesión y redirige a /login
 *  - 403 → toast "Acceso denegado"
 *
 * Este composable cubre el resto de errores (4xx/5xx) ofreciendo un toast
 * estandarizado sin escribir el bloque catch a mano, y permite suprimirlo
 * para llamadas silenciosas (404 esperados, reintentos, degradación elegante).
 *
 * @example
 *   const { withErrorToast } = useApiError()
 *   const { data } = await withErrorToast(api.get('/clientes'))
 *
 *   // Silencioso (no muestra toast aunque falle):
 *   await withErrorToast(api.get('/opcional'), { showGlobalError: false })
 */
export function useApiError() {
  const toast = useToast()

  /**
   * Ejecuta una promesa de API y muestra un toast de error estandarizado
   * si falla. Re-lanza siempre el error para que el llamador pueda reaccionar.
   *
   * @param {Promise} promise  Llamada de API (p.ej. `api.get('/x')`).
   * @param {object}  [opts]
   * @param {string}  [opts.summary='Error']               Título del toast.
   * @param {string}  [opts.fallback='La operación falló'] Mensaje por defecto.
   * @param {boolean} [opts.showGlobalError=true]          `false` → no notifica.
   * @returns {Promise} La respuesta resuelta de la promesa.
   */
  async function withErrorToast(
    promise,
    { summary = 'Error', fallback = 'La operación falló', showGlobalError = true } = {},
  ) {
    try {
      return await promise
    } catch (e) {
      const status = e?.response?.status
      // 401 y 403 ya se manejan globalmente en el interceptor.
      if (showGlobalError && status !== 401 && status !== 403) {
        toast.add({
          severity: 'error',
          summary,
          detail: e?.response?.data?.detail || e?.message || fallback,
          life: 4000,
        })
      }
      throw e
    }
  }

  return { withErrorToast }
}
