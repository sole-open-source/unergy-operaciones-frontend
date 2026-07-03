import { usePermissionStore } from '@/stores/permissionStore'

/**
 * Composable para lógica de permisos a nivel de componente. Complementa a la
 * directiva `v-has-permission` para casos donde se necesita decidir de forma
 * reactiva la visibilidad de secciones completas (con `v-if`) o ejecutar lógica
 * programática.
 *
 *   const { checkPermission, checkRole, isAllowed, store } = usePermissions()
 *   <section v-if="checkPermission('finanzas.view')"> … </section>
 */
export function usePermissions() {
  const store = usePermissionStore()

  /** ¿Tiene el permiso (o alguno del array)? */
  const checkPermission = (permission) => store.hasPermission(permission)

  /** ¿Tiene todos los permisos del array (semántica AND)? */
  const checkEveryPermission = (permission) => store.hasEveryPermission(permission)

  /** ¿Tiene alguno de los roles indicados? */
  const checkRole = (role) => store.hasRole(role)

  /**
   * Evalúa un objeto `meta` de ruta ({ roles?, permissions? }). Devuelve true
   * si el usuario cumple tanto los roles como los permisos requeridos.
   */
  const isAllowed = (routeMeta) => {
    if (!routeMeta) return true
    if (routeMeta.roles && !store.hasRole(routeMeta.roles)) return false
    if (routeMeta.permissions && !store.hasPermission(routeMeta.permissions)) return false
    return true
  }

  return { store, checkPermission, checkEveryPermission, checkRole, isAllowed }
}

export default usePermissions
