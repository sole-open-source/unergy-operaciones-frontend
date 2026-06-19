import axios from 'axios'

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATEGIA DE AUTENTICACIÓN — nota de seguridad
//
// Objetivo de seguridad: los tokens de autenticación NO deberían vivir en
// `localStorage`, porque cualquier script (incluido un XSS) puede leerlos. La
// práctica recomendada es que el BACKEND emita el token de sesión en una cookie
// `HttpOnly; Secure; SameSite=Strict`, inaccesible desde JavaScript, y que el
// frontend solo conserve metadatos NO sensibles (id, rol) para la UI.
//
// Estado actual: el backend de esta app aún entrega el JWT en el cuerpo de la
// respuesta de login y se valida vía cabecera `Authorization: Bearer`. Mientras
// el backend no exponga el flujo basado en cookies, eliminar el token de
// `localStorage` aquí rompería TODA la autenticación. Por eso:
//
//   1. Se habilita `withCredentials` para que, en cuanto el backend empiece a
//      enviar la cookie de sesión `HttpOnly`, esta viaje automáticamente en
//      cada petición sin tocar más código.
//   2. Se mantiene el envío del Bearer token SOLO si existe en `localStorage`
//      (compatibilidad hacia atrás). Cuando el backend migre a cookies, basta
//      con dejar de guardar el token en `src/stores/auth.js`.
//
// TODO(backend): emitir cookie de sesión HttpOnly en /auth/token y dejar de
// devolver `access_token` en el cuerpo. Tras ello, retirar el bloque Bearer.
// ─────────────────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  // Permite que las cookies de sesión HttpOnly (cuando el backend las emita)
  // se envíen automáticamente. Inofensivo en peticiones same-origin actuales.
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  // Compatibilidad: si aún se usa el JWT en localStorage, adjuntarlo. La meta es
  // que esto desaparezca cuando el backend gestione la sesión vía cookie HttpOnly.
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
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
