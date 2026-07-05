import { ref, reactive } from 'vue'
import api from '@/api/client'

/**
 * useCrudManager — centraliza fetch / paginación / filtros / acciones CRUD
 * sobre un endpoint del backend (`@/api/client`, baseURL `/api/v1`).
 *
 * Soporta dos formas de respuesta del backend:
 *   - Array plano  → paginación en cliente (la tabla pagina el array completo).
 *   - { items, total } → paginación en servidor (usar `lazy: true`).
 *
 * @param {Object} config
 * @param {string} config.endpoint        Ruta relativa, p. ej. '/clientes'.
 * @param {string} [config.idField='id']  Nombre del campo identificador.
 * @param {Object} [config.defaultFilters] Filtros iniciales (también los que resetFilters restaura).
 * @param {number} [config.pageSize=20]   Tamaño de página.
 * @param {boolean} [config.lazy=false]   true → manda page/size al backend y lee { items, total }.
 * @param {boolean} [config.immediate=false] true → hace fetchData() al crear.
 * @param {Object} [config.params]        Params fijos que siempre se envían.
 * @param {Function} [config.transform]   Transforma la respuesta cruda antes de asignarla.
 * @param {Function} [config.onError]     Callback de error; si se omite, fetchData relanza.
 */
export function useCrudManager(config) {
  const {
    endpoint,
    idField = 'id',
    defaultFilters = {},
    pageSize = 20,
    lazy = false,
    immediate = false,
    params: fixedParams = {},
    transform = (d) => d,
    onError = null,
  } = config

  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref(null)
  const pagination = reactive({ page: 1, size: pageSize, sortField: null, sortOrder: null })
  const filters = reactive({ ...defaultFilters })

  function buildParams() {
    const params = { ...fixedParams }
    for (const [k, v] of Object.entries(filters)) {
      if (v !== null && v !== undefined && v !== '') params[k] = v
    }
    if (lazy) {
      params.page = pagination.page
      params.size = pagination.size
    }
    if (pagination.sortField) {
      params.sort = pagination.sortField
      params.order = pagination.sortOrder === -1 ? 'desc' : 'asc'
    }
    return params
  }

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get(endpoint, { params: buildParams() })
      const payload = transform(data)
      if (Array.isArray(payload)) {
        items.value = payload
        total.value = payload.length
      } else {
        items.value = payload?.items ?? []
        total.value = payload?.total ?? items.value.length
      }
      return items.value
    } catch (e) {
      error.value = e
      if (onError) { onError(e); return [] }
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createItem(payload, opts = {}) {
    const { data } = await api.post(opts.endpoint || endpoint, payload, { params: opts.params })
    return data
  }

  async function updateItem(id, payload, opts = {}) {
    const method = opts.method || 'patch'
    const { data } = await api[method](`${opts.endpoint || endpoint}/${id}`, payload, { params: opts.params })
    return data
  }

  async function deleteItem(id, opts = {}) {
    await api.delete(`${opts.endpoint || endpoint}/${id}`)
    // Optimista: quita el registro de la lista local sin recargar.
    items.value = items.value.filter((i) => i[idField] !== id)
    total.value = Math.max(0, total.value - 1)
  }

  let debounceTimer = null
  /** Cambia un filtro y recarga. `debounce` (ms) agrupa entradas rápidas (búsqueda). */
  function setFilter(key, value, { debounce = 0, resetPage = true } = {}) {
    filters[key] = value
    if (resetPage) pagination.page = 1
    if (debounce) {
      clearTimeout(debounceTimer)
      return new Promise((resolve) => {
        debounceTimer = setTimeout(() => resolve(fetchData()), debounce)
      })
    }
    return fetchData()
  }

  function resetFilters() {
    Object.keys(filters).forEach((k) => { delete filters[k] })
    Object.assign(filters, defaultFilters)
    pagination.page = 1
    return fetchData()
  }

  function setPage(page, size) {
    pagination.page = page
    if (size) pagination.size = size
    return fetchData()
  }

  function setSort(field, order) {
    pagination.sortField = field
    pagination.sortOrder = order
    return fetchData()
  }

  if (immediate) fetchData()

  return {
    items,
    data: items, // alias
    total,
    loading,
    error,
    pagination,
    filters,
    fetchData,
    createItem,
    updateItem,
    deleteItem,
    setFilter,
    resetFilters,
    setPage,
    setSort,
  }
}

export default useCrudManager
