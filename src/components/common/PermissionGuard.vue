<!--
  PermissionGuard — renderiza su contenido solo si el usuario cumple los
  permisos/roles requeridos. Reactivo: si la sesión cambia, el contenido
  aparece/desaparece al instante. Útil para envolver secciones completas.

    <PermissionGuard permission="finanzas.view">
      <FinanceSummary />
      <template #fallback><p>Sin acceso</p></template>
    </PermissionGuard>
-->
<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>

<script setup>
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

const props = defineProps({
  // Permiso(s) requerido(s) — string o array (semántica OR).
  permission: { type: [String, Array], default: null },
  // Rol(es) requerido(s) — string o array (semántica OR).
  role: { type: [String, Array], default: null },
})

const { store } = usePermissions()

const allowed = computed(() => {
  if (props.permission && !store.hasPermission(props.permission)) return false
  if (props.role && !store.hasRole(props.role)) return false
  return true
})
</script>
