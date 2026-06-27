/**
 * Composable `useAlerts` — interfaz única y consistente para que los
 * componentes Vue interactúen con la lógica de alertas, abstrayendo el store
 * Pinia subyacente (`useAlertsStore`).
 *
 * Expone propiedades reactivas (derivadas de los getters del store) y métodos
 * que delegan en las acciones del store.
 */
import { storeToRefs } from 'pinia'
import { useAlertsStore } from '@/stores/alerts'

export function useAlerts() {
  const store = useAlertsStore()
  // IMPORTANTE: en un setup store de Pinia, acceder a `store.<computed>`
  // devuelve el VALOR desenvuelto en ese instante (no el ref), por lo que
  // asignarlo a una propiedad lo congela en su valor inicial (lista vacía).
  // `storeToRefs` también extrae los getters/computeds como refs reactivos.
  const {
    loading,
    error,
    filters,
    pagination,
    degradedSources,
    getFilteredAndPaginatedAlerts,
    getUnreadCount,
    filteredCount,
  } = storeToRefs(store)

  return {
    // ── Estado reactivo ──────────────────────────────────────────────────────
    alerts: getFilteredAndPaginatedAlerts,
    loading,
    error,
    unreadCount: getUnreadCount,
    filteredCount,
    degradedSources,
    currentFilters: filters,
    pagination,

    // ── Métodos ──────────────────────────────────────────────────────────────
    loadAlerts: (type = 'all') => store.fetchAlerts({ type }),
    updateFilter: (filterName, value) => store.setFilter(filterName, value),
    toggleAlertReadStatus: (id) => store.markAlertAsRead(id),
    goToPage: (page) => store.setPagination(page, null),
    setPageSize: (pageSize) => store.setPagination(1, pageSize),
  }
}
