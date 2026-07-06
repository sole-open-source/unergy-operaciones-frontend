import axios from 'axios'
import { getAccessToken, clearTokens, isPreviewToken } from '@/utils/security'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Cuando el backend migre el refresh token a una cookie httpOnly, habilitar
  // `withCredentials: true` aquí y configurar CORS con
  // Access-Control-Allow-Credentials en el servidor. Ver SECURITY.md.
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Rutas del backend para la gestión de informes faltantes. Se centralizan aquí
// como única fuente de verdad; el servicio (@/services/informesService) las
// consume. El backend responde 201 al crear, 200 al actualizar y 409 cuando el
// faltante ya existe o ya fue convertido a borrador — la vista traduce esos
// estados a mensajes para el usuario. Axios rechaza cualquier respuesta no-2xx,
// por lo que 409 llega como error con `err.response.status === 409`.
export const FALTANTES_ENDPOINTS = {
  list: '/informes/faltantes',
  create: '/informes/faltantes',
  update: (id) => `/informes/faltantes/${id}`,
  convertirDraft: (id) => `/informes/faltantes/${id}/convertir-draft`,
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      // El token de preview (solo DEV) no debe disparar logout.
      if (isPreviewToken(getAccessToken())) return Promise.reject(err)
      clearTokens()
      // En la app móvil (rutas /m/...) volvemos a su propio login, no al de la plataforma.
      const enMovil = window.location.pathname.startsWith('/m/') || window.location.pathname === '/m'
      window.location.href = enMovil ? '/m/login' : '/login'
    }
    if (status === 403) {
      const msg = err.response.data?.detail || 'No tienes permisos para esta acción'
      if (typeof window.__primeToast === 'function') {
        window.__primeToast({ severity: 'error', summary: 'Acceso denegado', detail: msg, life: 4000 })
      }
    }
    return Promise.reject(err)
  }
)

export default api
