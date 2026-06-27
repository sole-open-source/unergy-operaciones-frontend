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
  const { loading, error, filters, pagination } = storeToRefs(store)

  return {
    // ── Estado reactivo ──────────────────────────────────────────────────────
    alerts: store.getFilteredAndPaginatedAlerts, // computed (ya reactivo)
    loading,
    error,
    unreadCount: store.getUnreadCount,
    filteredCount: store.filteredCount,
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
