import { ref, reactive, onMounted } from 'vue'
import api from '@/api/client'

// ── useListManager ──────────────────────────────────────────────────────────
// Encapsula la lógica común de las vistas de lista: carga de datos, paginación
// (modelo del Paginator de PrimeVue, `page` base 0), ordenamiento (modelo de
// sort del DataTable) y filtro global de búsqueda.
//
// Todas las llamadas pasan por `@/api/client` (instancia axios ya configurada
// con baseURL `/api/v1` y el token), NO por axios directo.
//
// Convención de respuesta del backend:
//   - Paginada:  { items: [...], total: N }
//   - Lista cruda: [...]  → totalRecords se infiere del largo.
//
// Parámetros por defecto que se envían al backend (ver `defaultParamsBuilder`):
//   page (base 1), size, q, sort, order
// Cualquier vista con un contrato distinto puede pasar `customParamsBuilder`.
//
//   const lm = useListManager('/clientes', { initialRows: 20 })
//   lm.data, lm.loading, lm.error, lm.totalRecords
//   lm.onPage(e), lm.onSort(e), lm.setGlobalFilter(txt), lm.refreshData()
// ──────────────────────────────────────────────────────────────────────────────

function defaultParamsBuilder({ pagination, sort, filters }) {
  const params = {
    page: pagination.page + 1,   // el backend pagina en base 1
    size: pagination.rows,
  }
  if (filters.global) params.q = filters.global
  if (sort.field) {
    params.sort = sort.field
    params.order = sort.order === -1 ? 'desc' : 'asc'
  }
  return params
}

export function useListManager(apiEndpoint, options = {}) {
  const {
    initialRows = 10,
    defaultSortField = null,
    defaultSortOrder = null,
    customParamsBuilder = null,
    // Debounce (ms) antes de refetch cuando cambian los parámetros. Evita
    // disparar una petición por cada tecla en la búsqueda global.
    debounceMs = 300,
  } = options

  // ── Estado ────────────────────────────────────────────────────────────────
  const data = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalRecords = ref(0)

  const pagination = reactive({ page: 0, rows: initialRows, first: 0 })
  const sort = reactive({ field: defaultSortField, order: defaultSortOrder })
  const filters = reactive({ global: null })

  const buildParams = () =>
    (customParamsBuilder || defaultParamsBuilder)({ pagination, sort, filters })

  // ── Carga de datos ──────────────────────────────────────────────────────────
  let requestId = 0
  async function fetchData() {
    const current = ++requestId
    loading.value = true
    error.value = null
    try {
      const { data: payload } = await api.get(apiEndpoint, { params: buildParams() })
      // Ignora respuestas obsoletas (una petición más reciente ya salió).
      if (current !== requestId) return
      if (Array.isArray(payload)) {
        data.value = payload
        totalRecords.value = payload.length
      } else {
        data.value = payload?.items ?? []
        totalRecords.value = payload?.total ?? data.value.length
      }
    } catch (e) {
      if (current !== requestId) return
      error.value = e?.response?.data?.detail || e?.message || 'Error al cargar los datos.'
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  function refreshData() {
    return fetchData()
  }

  // Debounce SOLO para la búsqueda global (evita una petición por tecla). La
  // paginación y el ordenamiento son acciones discretas del usuario y refetchean
  // de inmediato — meterlos en el debounce añadía ~300ms de latencia percibida
  // en cada clic de página.
  let debounceTimer = null
  function debouncedFetch() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchData, debounceMs)
  }

  // ── Handlers (modelos de PrimeVue) ──────────────────────────────────────────
  function onPage(event) {
    pagination.page = event.page
    pagination.rows = event.rows
    pagination.first = event.first ?? event.page * event.rows
    fetchData()
  }

  function onSort(event) {
    sort.field = event.sortField ?? null
    sort.order = event.sortOrder ?? null
    resetToFirstPage()
    fetchData()
  }

  function onFilter(event) {
    // Compatibilidad con el evento @filter del DataTable; también soporta un
    // string simple para la búsqueda global.
    const value = typeof event === 'string'
      ? event
      : event?.filters?.global?.value ?? event?.value ?? null
    setGlobalFilter(value)
  }

  function setGlobalFilter(value) {
    filters.global = value || null
    resetToFirstPage()
    debouncedFetch()
  }

  function resetToFirstPage() {
    pagination.page = 0
    pagination.first = 0
  }

  onMounted(fetchData)

  return {
    // estado
    data, loading, error, totalRecords,
    pagination, sort, filters,
    // acciones
    fetchData, refreshData, onPage, onSort, onFilter, setGlobalFilter,
  }
}
