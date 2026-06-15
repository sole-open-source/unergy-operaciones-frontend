// Instancia Axios centralizada de la aplicación.
//
// El proyecto ya concentra TODAS las llamadas HTTP en una única instancia con
// interceptores para: adjuntar el JWT, cierre de sesión automático en 401,
// aviso en 403, reintentos con backoff en 500/503 y toasts de error de red.
// Esa instancia vive en `@/api/client`.
//
// Este módulo la re-exporta para quien prefiera importarla desde `@/services/api`.
// NO crea una segunda instancia: ambos caminos comparten el mismo singleton y,
// por tanto, los mismos interceptores y configuración.
import api from '@/api/client'

export default api
export { api }
