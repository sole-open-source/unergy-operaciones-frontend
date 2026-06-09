/**
 * Punto de entrada de servicios de API.
 *
 * La instancia Axios centralizada —con los interceptores globales de
 * autenticación (Bearer token), redirección 401, y notificación de errores—
 * vive en `@/api/client`, que es el módulo que importan las vistas en todo
 * el proyecto. Este archivo simplemente lo reexporta para quien prefiera la
 * ruta `@/services/api`, garantizando una única instancia (singleton).
 */
export { default } from '@/api/client'
export { default as api } from '@/api/client'
