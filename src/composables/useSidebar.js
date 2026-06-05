import { ref, watch } from 'vue'

// ── Estado mobile (overlay) ────────────────────────────────────────────────
const mobileOpen = ref(false)

// ── Colapso del sidebar en escritorio (ocultar para concentrarse) ──────────
const LS_COLLAPSED = 'sb:collapsed'
const collapsed = ref(localStorage.getItem(LS_COLLAPSED) === '1')
watch(collapsed, (v) => localStorage.setItem(LS_COLLAPSED, v ? '1' : '0'))

// ── Secciones: SIEMPRE recogidas al cargar ─────────────────────────────────
// Guardamos los grupos EXPANDIDOS en memoria (no se persiste), de modo que
// en cada carga todas las secciones aparecen recogidas. El usuario las puede
// desplegar durante la sesión.
const expandedGroups = ref(new Set())

export function useSidebar() {
  function toggle() {
    mobileOpen.value = !mobileOpen.value
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function isGroupCollapsed(label) {
    return !expandedGroups.value.has(label)
  }

  function toggleGroup(label) {
    const next = new Set(expandedGroups.value)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    expandedGroups.value = next
  }

  return {
    mobileOpen,
    toggle,
    collapsed,
    toggleCollapsed,
    isGroupCollapsed,
    toggleGroup,
  }
}
