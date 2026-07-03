import { usePermissionStore } from '@/stores/permissionStore'

// ─────────────────────────────────────────────────────────────────────────────
// Directiva v-has-permission
//
//   <Button v-has-permission="'projects.create'" />         → se elimina del DOM
//   <Button v-has-permission="['a','b']" />                  → OR: basta con uno
//   <Button v-has-permission:disabled="'finanzas.edit'" />  → se deshabilita
//
// Por defecto, si el usuario NO tiene el permiso, el elemento se retira del DOM
// (útil para acciones/botones). Con el argumento `:disabled`, en lugar de
// retirarlo se deshabilita — pensado para formularios donde conviene mostrar el
// control pero impedir su uso. El modo `:disabled` es reactivo (se reevalúa en
// `updated`); el modo de eliminación se aplica una sola vez al montar, tal como
// es habitual para controles ocultos por permisos.
// ─────────────────────────────────────────────────────────────────────────────

function applyDisabled(el, allowed) {
  if (allowed) {
    el.removeAttribute('disabled')
    el.classList.remove('has-permission-disabled')
    if (el.__hpPointerEvents !== undefined) {
      el.style.pointerEvents = el.__hpPointerEvents
    }
  } else {
    el.setAttribute('disabled', 'disabled')
    el.classList.add('has-permission-disabled')
    if (el.__hpPointerEvents === undefined) el.__hpPointerEvents = el.style.pointerEvents
    el.style.pointerEvents = 'none'
  }
}

function evaluate(el, binding) {
  const store = usePermissionStore()
  const allowed = store.hasPermission(binding.value)

  if (binding.arg === 'disabled') {
    applyDisabled(el, allowed)
    return
  }

  // Modo eliminación: retirar el elemento del DOM si no está permitido.
  if (!allowed && el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

export const hasPermission = {
  mounted(el, binding) {
    evaluate(el, binding)
  },
  updated(el, binding) {
    // Solo el modo :disabled se reevalúa; un elemento eliminado ya no existe.
    if (binding.arg === 'disabled') evaluate(el, binding)
  },
}

export default hasPermission
