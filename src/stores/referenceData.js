/**
 * Store central de datos de referencia / semi-estáticos.
 *
 * Centraliza el fetch + caché (TTL + localStorage vía src/utils/cache) de las
 * listas de apoyo que varias vistas piden una y otra vez, evitando golpear la
 * red en cada navegación.
 *
 * Endpoints reales descubiertos en el código (NO hardcodear otros):
 *   - /fallas/catalogos          → { estados, prioridades, tipos, resoluciones } (muy estático)
 *   - /proyectos?size=500        → lista de plantas usada como :options en wizards
 *   - /clientes?size=500         → lista de clientes usada como :options en wizards
 *   - /usuarios?size=200         → lista de usuarios (asignación de fallas, etc.)
 *   - /proyectos?servicio=representacion&size=500 → plantas con representación (ContratosListView)
 *
 * NOTA: las listas paginadas devuelven `{ items, total }` pero algunas vistas
 * consumen el `data` crudo. Normalizamos con `data.items ?? data` para que el
 * valor cacheado sea siempre un array, compatible con todos los consumidores.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'
import { cache, STATIC_TTL, SEMI_STATIC_TTL } from '@/utils/cache'

const pickItems = (data) => (data && data.items != null ? data.items : data)

export const useReferenceData = defineStore('referenceData', () => {
  // ── Estado de cada conjunto ──────────────────────────────────────────────
  const fallasCatalogos = ref(null)
  const proyectos = ref([])
  const clientes = ref([])
  const usuarios = ref([])
  const representacionPlantas = ref([])

  // name -> bool. Objeto reactivo único para no declarar N refs.
  const loading = ref({})

  // Configuración declarativa por conjunto. `empty` es el valor de reset.
  const SETS = {
    fallasCatalogos: {
      url: '/fallas/catalogos', params: null, ttl: STATIC_TTL,
      state: fallasCatalogos, pick: (d) => d, empty: null,
    },
    proyectos: {
      url: '/proyectos', params: { size: 500 }, ttl: SEMI_STATIC_TTL,
      state: proyectos, pick: pickItems, empty: [],
    },
    clientes: {
      url: '/clientes', params: { size: 500 }, ttl: SEMI_STATIC_TTL,
      state: clientes, pick: pickItems, empty: [],
    },
    usuarios: {
      url: '/usuarios', params: { size: 200 }, ttl: SEMI_STATIC_TTL,
      state: usuarios, pick: pickItems, empty: [],
    },
    representacionPlantas: {
      url: '/proyectos', params: { servicio: 'representacion', size: 500 }, ttl: SEMI_STATIC_TTL,
      state: representacionPlantas, pick: pickItems, empty: [],
    },
  }

  const cacheKey = (name) => `refdata:${name}`
  const hasValue = (v) => (Array.isArray(v) ? v.length > 0 : v != null)
  const setLoading = (name, val) => { loading.value = { ...loading.value, [name]: val } }

  /**
   * Helper interno: devuelve el conjunto `name`, sirviéndolo de caché si está
   * vigente. Ante cualquier indisponibilidad de localStorage degrada a red
   * (lo maneja la capa de caché). Si `force`, ignora caché y vuelve a pedir.
   */
  async function _fetchCached(name, force = false) {
    const cfg = SETS[name]
    if (!cfg) throw new Error(`referenceData: conjunto desconocido "${name}"`)

    if (!force) {
      // Memoria del store en esta sesión.
      if (hasValue(cfg.state.value)) return cfg.state.value
      // Caché persistente (TTL).
      const entry = cache.get(cacheKey(name))
      if (entry) {
        cfg.state.value = entry.value
        return entry.value
      }
    }

    setLoading(name, true)
    try {
      const { data } = await api.get(cfg.url, cfg.params ? { params: cfg.params } : undefined)
      const value = cfg.pick(data)
      cfg.state.value = value
      cache.set(cacheKey(name), value, cfg.ttl)
      return value
    } finally {
      setLoading(name, false)
    }
  }

  // ── Acciones públicas ─────────────────────────────────────────────────────
  const ensureFallasCatalogos = (force = false) => _fetchCached('fallasCatalogos', force)
  const ensureProyectos = (force = false) => _fetchCached('proyectos', force)
  const ensureClientes = (force = false) => _fetchCached('clientes', force)
  const ensureUsuarios = (force = false) => _fetchCached('usuarios', force)
  const ensureRepresentacionPlantas = (force = false) => _fetchCached('representacionPlantas', force)

  // ── Flags de carga ──────────────────────────────────────────────────────--
  const isLoadingFallasCatalogos = computed(() => !!loading.value.fallasCatalogos)
  const isLoadingProyectos = computed(() => !!loading.value.proyectos)
  const isLoadingClientes = computed(() => !!loading.value.clientes)
  const isLoadingUsuarios = computed(() => !!loading.value.usuarios)
  const isLoadingRepresentacionPlantas = computed(() => !!loading.value.representacionPlantas)

  /** Invalida un conjunto: borra su caché persistente y resetea el estado. */
  function invalidate(name) {
    cache.invalidate(cacheKey(name))
    const cfg = SETS[name]
    if (cfg) cfg.state.value = cfg.empty
  }

  /** Fuerza el re-fetch de todos los conjuntos (botón "refrescar"). */
  async function refreshAll() {
    return Promise.all(Object.keys(SETS).map((name) => _fetchCached(name, true)))
  }

  return {
    // estado
    fallasCatalogos, proyectos, clientes, usuarios, representacionPlantas,
    // acciones
    ensureFallasCatalogos, ensureProyectos, ensureClientes, ensureUsuarios,
    ensureRepresentacionPlantas,
    invalidate, refreshAll,
    // flags
    isLoadingFallasCatalogos, isLoadingProyectos, isLoadingClientes,
    isLoadingUsuarios, isLoadingRepresentacionPlantas,
  }
})
