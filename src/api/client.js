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

// ── Términos contractuales PPA ────────────────────────────────────────────────
// Relación 1:1 opcional con el contrato PPA (puntos de entrega, penalizaciones,
// base de cálculo y horario de operación). Se persiste en /ppa/{id}/terminos.

// Normaliza `puntos_entrega` a un arreglo JSON antes de enviarlo al backend (JSONB).
// Acepta un arreglo ya listo, un JSON string (ej. '["Punto A","Punto B"]') o una
// lista separada por comas (ej. 'Punto A, Punto B'). Cadena vacía → null.
function normalizarPuntosEntrega(valor) {
  if (valor == null) return null
  if (Array.isArray(valor)) return valor
  const texto = String(valor).trim()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    return texto.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

// GET términos de un PPA. El backend responde 404/null cuando aún no existen.
export function getPPATerminos(ppaId) {
  return api.get(`/ppa/${ppaId}/terminos`)
}

// PUT (crear o actualizar) términos de un PPA. Serializa `puntos_entrega` a JSONB.
export function updatePPATerminos(ppaId, data) {
  const payload = { ...data, puntos_entrega: normalizarPuntosEntrega(data.puntos_entrega) }
  return api.put(`/ppa/${ppaId}/terminos`, payload)
}

export default api
