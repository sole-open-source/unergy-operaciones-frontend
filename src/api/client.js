import axios from 'axios'

/**
 * Cliente Axios centralizado de la aplicación.
 *
 * Interceptores globales:
 *  - Request:  adjunta el token JWT (Bearer) leído de localStorage.
 *  - Response:
 *      · 401 → limpia la sesión y redirige a /login (con aviso de expiración).
 *      · 403 → toast "Acceso denegado".
 *      · Resto de 4xx/5xx → toast genérico SÓLO si la petición lo solicita
 *        explícitamente con `{ showGlobalError: true }`.
 *
 * El toast genérico es opt-in a propósito: las vistas ya muestran toasts
 * contextuales en sus bloques catch (p.ej. "Identificación actualizada"),
 * así que activarlo por defecto duplicaría los mensajes. El composable
 * `@/composables/useApiError` ofrece una forma cómoda de activarlo por llamada.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

/** Muestra un toast global si el ToastService de PrimeVue está montado. */
function notify(opts) {
  if (typeof window.__primeToast === 'function') window.__primeToast(opts)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status
    const config = err.config || {}

    // ── 401: sesión inválida o expirada ──────────────────────────────────
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Evitar bucle de redirección si ya estamos en la pantalla de login.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1'
      }
      return Promise.reject(err)
    }

    // ── 403: autenticado pero sin permisos ───────────────────────────────
    if (status === 403) {
      notify({
        severity: 'error',
        summary: 'Acceso denegado',
        detail: err.response?.data?.detail || 'No tienes permisos para esta acción',
        life: 4000,
      })
      return Promise.reject(err)
    }

    // ── Resto de errores 4xx/5xx: notificación global opcional ───────────
    if (config.showGlobalError) {
      notify({
        severity: 'error',
        summary: 'Error',
        detail: err.response?.data?.detail || err.message || 'La operación falló',
        life: 4000,
      })
    }

    return Promise.reject(err)
  }
)

export default api
