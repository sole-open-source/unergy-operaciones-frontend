import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Muestra un toast global de error si el componente Toast ya está montado.
function toastError(summary, detail, life = 4000) {
  if (typeof window.__primeToast === 'function') {
    window.__primeToast({ severity: 'error', summary, detail, life })
  }
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Una vista puede desactivar el toast global con { skipErrorToast: true }
    // en la config de la petición cuando quiere manejar el error a su manera.
    const skipToast = err.config?.skipErrorToast
    const status = err.response?.status

    if (status === 401) {
      const token = localStorage.getItem('token')
      if (import.meta.env.DEV && token?.endsWith('.preview')) return Promise.reject(err)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // En la app móvil (rutas /m/...) volvemos a su propio login, no al de la plataforma.
      const enMovil = window.location.pathname.startsWith('/m/') || window.location.pathname === '/m'
      window.location.href = enMovil ? '/m/login' : '/login'
    } else if (status === 403) {
      const msg = err.response.data?.detail || 'No tienes permisos para esta acción'
      if (!skipToast) toastError('Acceso denegado', msg)
    } else if (!err.response) {
      // Sin respuesta: timeout, red caída o petición cancelada. Las vistas suelen
      // mostrar aquí un mensaje pobre (e.message = "Network Error"), así que damos
      // un mensaje claro de forma centralizada.
      if (!skipToast && err.code !== 'ERR_CANCELED') {
        toastError('Sin conexión', 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
      }
    } else if (status >= 500) {
      // Error del servidor: mensaje genérico centralizado (el detalle real
      // rara vez es útil para el usuario y a menudo viene vacío).
      if (!skipToast) {
        toastError('Error del servidor', err.response.data?.detail || 'Ocurrió un error inesperado. Intenta de nuevo más tarde.')
      }
    }

    return Promise.reject(err)
  }
)

export default api
