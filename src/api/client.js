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

// ──────────────────────────────────────────────────────────────────
// Informes: helpers para el nuevo campo estructurado `datos_operativos`.
//
// El informe se guarda de forma versionada mediante POST /informes/ (cada
// guardado crea una nueva versión), por lo que `updateInforme` mantiene ese
// patrón e incluye tanto `datos_operativos` (JSON) como `html_content`
// (capa de presentación). La validación se delega al backend vía
// POST /informes/{id}/validate. Ver InformeDetailView.vue.
// ──────────────────────────────────────────────────────────────────

/** Obtiene un informe por id. Incluye `datos_operativos` cuando el backend lo expone. */
export function getInformeById(id) {
  return api.get(`/informes/${id}`).then((r) => r.data)
}

/**
 * Guarda una nueva versión del informe.
 * @param {object} payload - Debe incluir metadatos del informe (tipo, sub_project,
 *   periodo_*), la capa de presentación `html_content` y los datos estructurados
 *   `datos_operativos`.
 */
export function updateInforme(payload) {
  return api.post('/informes/', payload).then((r) => r.data)
}

/**
 * Valida los datos operativos de un informe contra las reglas del backend.
 * @param {number|string} id
 * @param {object} datosOperativos
 * @returns {Promise<{status:'valid'|'invalid'|'warning', messages:Array}>}
 */
export function validateInforme(id, datosOperativos) {
  return api
    .post(`/informes/${id}/validate`, { datos_operativos: datosOperativos })
    .then((r) => r.data)
}
