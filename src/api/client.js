import axios from 'axios'

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

// ── Reintento con backoff exponencial para errores 5xx transitorios ──────────
// Solo en GET (idempotente): un 502/503/504 suele ser un hiccup del gateway o
// del backend reiniciando. Reintentamos hasta 3 veces con espera creciente
// (~0.5s, 1s, 2s) antes de propagar el error. No aplica a POST/PUT/etc. para
// evitar duplicar operaciones con efectos secundarios.
const MAX_RETRIES = 3
const RETRY_STATUSES = [502, 503, 504]

function backoffDelay(attempt) {
  // attempt empieza en 1 → 500ms, 1000ms, 2000ms (con jitter leve)
  return Math.min(500 * 2 ** (attempt - 1), 4000) + Math.random() * 100
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const config = err.config
    const status = err.response?.status
    const method = (config?.method || 'get').toLowerCase()

    if (config && method === 'get' && RETRY_STATUSES.includes(status)) {
      config.__retryCount = (config.__retryCount || 0) + 1
      if (config.__retryCount <= MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(config.__retryCount)))
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
