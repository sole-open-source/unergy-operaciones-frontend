import { ref, watch } from 'vue'

// ── Estado mobile (overlay) ────────────────────────────────────────────────
const mobileOpen = ref(false)

// ── Colapso del sidebar en escritorio (ocultar para concentrarse) ──────────
const LS_COLLAPSED = 'sb:collapsed'
const collapsed = ref(localStorage.getItem(LS_COLLAPSED) === '1')
watch(collapsed, (v) => localStorage.setItem(LS_COLLAPSED, v ? '1' : '0'))

// ── Secciones plegadas (por label) ─────────────────────────────────────────
const LS_GROUPS = 'sb:collapsedGroups'
function loadCollapsedGroups() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_GROUPS) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}
const collapsedGroups = ref(new Set(loadCollapsedGroups()))

function persistGroups() {
  localStorage.setItem(LS_GROUPS, JSON.stringify([...collapsedGroups.value]))
}

export function useSidebar() {
  function toggle() {
    mobileOpen.value = !mobileOpen.value
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function isGroupCollapsed(label) {
    return collapsedGroups.value.has(label)
  }

  function toggleGroup(label) {
    const next = new Set(collapsedGroups.value)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    collapsedGroups.value = next
    persistGroups()
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
