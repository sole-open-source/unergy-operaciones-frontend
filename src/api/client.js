import axios from 'axios'
import { sanitizeLogObject } from '@/utils/securityUtils'

// Logging de depuración opt-in. Activar con VITE_API_DEBUG=true. Cualquier
// volcado de config/respuesta pasa por sanitizeLogObject para no filtrar
// cabeceras de auth, API keys ni cadenas de conexión a la consola.
const DEBUG = import.meta.env.VITE_API_DEBUG === 'true'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (DEBUG) {
    console.debug('[api →]', config.method?.toUpperCase(), config.url,
      sanitizeLogObject({ headers: config.headers, params: config.params, data: config.data }))
  }
  return config
})

api.interceptors.response.use(
  (r) => {
    if (DEBUG) console.debug('[api ←]', r.status, r.config?.url, sanitizeLogObject({ data: r.data }))
    return r
  },
  (err) => {
    if (DEBUG) {
      console.debug('[api ✗]', err.response?.status, err.config?.url,
        sanitizeLogObject({ data: err.response?.data }))
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
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
