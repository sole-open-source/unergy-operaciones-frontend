import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// ── Configuración de reintentos ──────────────────────────────────────────────
// Errores transitorios del servidor (500/503) se reintentan con backoff
// exponencial antes de molestar al usuario con un toast de error.
const maxRetries = 2            // intentos extra tras el fallo inicial
const retryDelay = 1000         // base en ms → 1ª espera 1s, 2ª espera 2s

/** Lanza un toast usando el puente global de PrimeVue (definido en App.vue). */
function notify(severity, summary, detail, life = 4000) {
  if (typeof window.__primeToast === 'function') {
    window.__primeToast({ severity, summary, detail, life })
  }
}

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
    const { config, response } = err
    const status = response?.status

    if (status === 401) {
      const token = localStorage.getItem('token')
      if (import.meta.env.DEV && token?.endsWith('.preview')) return Promise.reject(err)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // En la app móvil (rutas /m/...) volvemos a su propio login, no al de la plataforma.
      const enMovil = window.location.pathname.startsWith('/m/') || window.location.pathname === '/m'
      window.location.href = enMovil ? '/m/login' : '/login'
      return Promise.reject(err)
    }

    if (status === 403) {
      const msg = response.data?.detail || 'No tienes permisos para esta acción'
      notify('error', 'Acceso denegado', msg)
      return Promise.reject(err)
    }

    // 500/503: error transitorio del servidor → reintentar con backoff exponencial.
    if (config && (status === 500 || status === 503)) {
      config.__retryCount = config.__retryCount || 0
      if (config.__retryCount < maxRetries) {
        config.__retryCount += 1
        const wait = retryDelay * 2 ** (config.__retryCount - 1) // 1s, luego 2s
        await new Promise((resolve) => setTimeout(resolve, wait))
        return api(config)
      }
      // Reintentos agotados → avisar al usuario.
      notify('error', 'Error del servidor', response.data?.detail || 'Inténtalo de nuevo en unos minutos.')
      return Promise.reject(err)
    }

    // Sin respuesta del servidor y no fue una petición cancelada → problema de red.
    if (!response && err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError') {
      notify('error', 'Sin conexión', 'Revisa tu conexión a internet e inténtalo de nuevo.')
    }

    return Promise.reject(err)
  }
)

export default api
