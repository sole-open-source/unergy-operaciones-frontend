import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  ADMIN_ROLE,
  permissionsForRole,
} from '@/utils/permissionDefinitions'

// Clave para una lista de permisos explícita (p. ej. entregada por el backend).
// Si está presente, tiene prioridad sobre los permisos derivados del rol.
const LS_OVERRIDE = 'permissions:override'

/**
 * Store de permisos. La identidad (token/usuario) sigue viviendo en
 * `useAuthStore` — su única fuente de verdad. Este store deriva de forma
 * reactiva el conjunto de permisos a partir del rol del usuario, de modo que
 * cualquier cambio en la sesión (login, logout, cambio de rol) actualiza la UI
 * al instante sin recargar.
 */
export const usePermissionStore = defineStore('permissions', () => {
  const auth = useAuthStore()

  // ── Override explícito opcional (persistido) ──────────────────────────────
  let storedOverride = null
  try {
    const raw = localStorage.getItem(LS_OVERRIDE)
    if (raw) storedOverride = JSON.parse(raw)
  } catch { storedOverride = null }
  const override = ref(Array.isArray(storedOverride) ? storedOverride : null)

  // ── Estado derivado de auth ───────────────────────────────────────────────
  const user    = computed(() => auth.user)
  const role    = computed(() => auth.role)
  const roles   = computed(() => (role.value ? [role.value] : []))
  const isAdmin = computed(() => role.value === ADMIN_ROLE)

  const permissions = computed(() =>
    override.value ?? permissionsForRole(role.value)
  )

  // ── Consultas ─────────────────────────────────────────────────────────────
  /**
   * ¿El usuario tiene el permiso indicado? Con un array se aplica semántica
   * "cualquiera" (OR): basta con tener uno de los permisos listados.
   * `admin` siempre pasa. Un permiso vacío/nulo se considera permitido.
   */
  function hasPermission(permission) {
    if (permission == null || permission === '') return true
    if (isAdmin.value) return true
    const needed = Array.isArray(permission) ? permission : [permission]
    if (needed.length === 0) return true
    return needed.some((p) => permissions.value.includes(p))
  }

  /** Variante estricta (AND): el usuario debe tener TODOS los permisos. */
  function hasEveryPermission(permission) {
    const needed = Array.isArray(permission) ? permission : [permission]
    return needed.every((p) => hasPermission(p))
  }

  /**
   * ¿El usuario tiene alguno de los roles indicados? `admin` siempre pasa,
   * coherente con `useAuthStore().can()`.
   */
  function hasRole(role_) {
    if (role_ == null || role_ === '') return true
    if (isAdmin.value) return true
    const needed = Array.isArray(role_) ? role_ : [role_]
    return needed.includes(role.value)
  }

  // ── Acciones ────────────────────────────────────────────────────────────────
  /**
   * Sincroniza el store tras un login. La identidad la gestiona `auth`; aquí
   * solo se acepta, opcionalmente, una lista explícita de permisos entregada
   * por el backend. Si `payload.user` viene, se refleja en `auth`.
   */
  function setUser(payload) {
    if (!payload) return
    if (payload.user) auth.user = payload.user
    if (Array.isArray(payload.permissions)) {
      override.value = payload.permissions
      localStorage.setItem(LS_OVERRIDE, JSON.stringify(payload.permissions))
    }
  }

  /** Limpia cualquier override explícito (vuelve a permisos derivados del rol). */
  function clear() {
    override.value = null
    localStorage.removeItem(LS_OVERRIDE)
  }

  return {
    user, role, roles, isAdmin, permissions,
    hasPermission, hasEveryPermission, hasRole,
    setUser, clear,
  }
})
