import axios from 'axios'
import { shouldRetry, backoffDelay } from './retry'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    // Reintento con backoff para 5xx transitorios en peticiones idempotentes (GET).
    const config = err.config
    const status = err.response?.status
    if (config) {
      const nextAttempt = (config.__retryCount || 0) + 1
      if (shouldRetry(config.method, status, nextAttempt)) {
        config.__retryCount = nextAttempt
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(nextAttempt)))
        return api(config)
      }
    }

    if (err.response?.status === 401) {
      const token = localStorage.getItem('token')
      if (import.meta.env.DEV && token?.endsWith('.preview')) return Promise.reject(err)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // En la app móvil (rutas /m/...) volvemos a su propio login, no al de la plataforma.
      const enMovil = window.location.pathname.startsWith('/m/') || window.location.pathname === '/m'
      window.location.href = enMovil ? '/m/login' : '/login'
    }
    if (err.response?.status === 403) {
      const msg = err.response.data?.detail || 'No tienes permisos para esta acción'
      if (typeof window.__primeToast === 'function') {
        window.__primeToast({ severity: 'error', summary: 'Acceso denegado', detail: msg, life: 4000 })
      }
    }
    return Promise.reject(err)
  }
)

export default api
