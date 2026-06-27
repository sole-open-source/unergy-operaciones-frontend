import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

/**
 * Store centralizado de alertas.
 *
 * ── Modelo unificado de alerta ──────────────────────────────────────────────
 * Las alertas de la plataforma viven hoy en endpoints especializados y con
 * formas de datos muy distintas (MGS, PPA, Fallas). Este store las normaliza a
 * una sola forma para poder listarlas, filtrarlas y paginarlas de forma común:
 *
 *   {
 *     id:        string   // clave única compuesta, p.ej. 'monitoreo-12'
 *     rawId:     any       // id original en su backend (para acciones)
 *     type:      string    // 'monitoreo' | 'ppa' | 'general'
 *     severity:  string    // 'critical' | 'warning' | 'info'
 *     message:   string    // texto principal mostrado al usuario
 *     timestamp: string    // ISO date (o null si la fuente no la provee)
 *     isRead:    boolean    // resuelta/atendida
 *     details:   object     // datos específicos del tipo (link, conteos, etc.)
 *   }
 *
 * NOTA: no existe (todavía) un endpoint unificado `/api/alerts` ni un modelo de
 * "leído/no leído" persistido para PPA o Fallas. La única fuente con acción de
 * persistencia real es MGS (`PATCH /mgs/alarms/{id}/resolve`). Por eso
 * `markAlertAsRead` solo persiste para alertas de tipo 'monitoreo'; para el
 * resto el cambio es local (la fuente es un snapshot calculado por el backend).
 */

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 }

function mgsSeverity(raw) {
  const s = String(raw || '').toUpperCase()
  if (s === 'CRITICAL') return 'critical'
  if (s === 'WARNING') return 'warning'
  return 'info'
}

// ── Normalizadores: convierten cada fuente al modelo unificado ──────────────

function normalizeMgsAlarms(rows) {
  return (rows || []).map((a) => ({
    id: `monitoreo-${a.id}`,
    rawId: a.id,
    type: 'monitoreo',
    severity: mgsSeverity(a.severity),
    message: `${a.proyecto_nombre || 'Minigranja'} — ${(a.alarm_type || '').replace(/_/g, ' ')}`,
    timestamp: a.created_at || null,
    isRead: !!a.resolved_at,
    details: {
      proyecto_nombre: a.proyecto_nombre,
      alarm_type: a.alarm_type,
      text: a.details,
      canResolve: !a.resolved_at,
    },
  }))
}

function normalizePpa(data) {
  const out = []
  for (const h of data?.huerfanos || []) {
    out.push({
      id: `ppa-huerfano-${h.proyecto_id}`,
      rawId: h.proyecto_id,
      type: 'ppa',
      severity: 'warning',
      message: `${h.nombre_comercial} — sin contrato activo en GESCON`,
      timestamp: data?.fecha_consulta || null,
      isRead: false,
      details: {
        kind: 'huerfano',
        proyecto_id: h.proyecto_id,
        estado: h.estado,
        tipo_proyecto: h.tipo_proyecto,
        link: `/proyectos/${h.proyecto_id}/ppa`,
        canResolve: false,
      },
    })
  }
  for (const d of data?.duplicados || []) {
    out.push({
      id: `ppa-duplicado-${d.proyecto_id}`,
      rawId: d.proyecto_id,
      type: 'ppa',
      severity: 'critical',
      message: `${d.nombre_comercial} — ${(d.sics?.length || 0)} contratos activos simultáneos`,
      timestamp: data?.fecha_consulta || null,
      isRead: false,
      details: {
        kind: 'duplicado',
        proyecto_id: d.proyecto_id,
        tipo_proyecto: d.tipo_proyecto,
        sics: d.sics,
        link: `/proyectos/${d.proyecto_id}`,
        canResolve: false,
      },
    })
  }
  return out
}

function normalizeFallas(rows) {
  return (rows || [])
    .filter((f) => !f.estado?.es_estado_final)
    .map((f) => {
      const dias = f.dias_abierta ?? 0
      return {
        id: `general-${f.id}`,
        rawId: f.id,
        type: 'general',
        severity: dias >= 30 ? 'critical' : dias >= 7 ? 'warning' : 'info',
        message: `${f.codigo_interno || 'Falla'} — ${f.proyecto?.nombre_comercial || 's/proyecto'}`,
        timestamp: null,
        isRead: false,
        details: {
          falla_id: f.id,
          descripcion: f.descripcion,
          estado: f.estado?.nombre,
          prioridad: f.prioridad?.nombre,
          dias_abierta: dias,
          link: `/fallas/${f.id}`,
          canResolve: false,
        },
      }
    })
}

export const useAlertsStore = defineStore('alerts', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const allAlerts = ref([])
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({ type: 'all', search: '', onlyUnread: false })
  const pagination = ref({ page: 1, pageSize: 10, total: 0 })

  // ── Getters ─────────────────────────────────────────────────────────────────
  const getAlerts = computed(() => allAlerts.value)

  const getUnreadCount = computed(() =>
    allAlerts.value.filter((a) => !a.isRead).length,
  )

  const getFilteredAlerts = computed(() => {
    const { type, search, onlyUnread } = filters.value
    const term = search.trim().toLowerCase()
    return allAlerts.value
      .filter((a) => (type === 'all' ? true : a.type === type))
      .filter((a) => (onlyUnread ? !a.isRead : true))
      .filter((a) =>
        term
          ? `${a.message} ${a.details?.text || ''} ${a.details?.descripcion || ''}`
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
  })

  // Total de elementos tras aplicar filtros (para el paginador).
  const filteredCount = computed(() => getFilteredAlerts.value.length)

  const getFilteredAndPaginatedAlerts = computed(() => {
    const { page, pageSize } = pagination.value
    const start = (page - 1) * pageSize
    return getFilteredAlerts.value.slice(start, start + pageSize)
  })

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Carga alertas según el tipo solicitado. Cada tipo agrupa una o más fuentes
   * reales y las normaliza al modelo unificado.
   * @param {{ type?: string }} payload  type: 'all' | 'monitoreo' | 'ppa' | 'general'
   */
  async function fetchAlerts(payload = {}) {
    const type = payload.type || 'all'
    loading.value = true
    error.value = null
    try {
      const wants = (t) => type === 'all' || type === t

      const [mgsRes, ppaRes, fallasRes] = await Promise.all([
        wants('monitoreo')
          ? api.get('/mgs/alarms').catch(() => ({ data: [] }))
          : Promise.resolve(null),
        wants('ppa')
          ? api.get('/alertas/contratos-ppa').catch(() => ({ data: {} }))
          : Promise.resolve(null),
        wants('general')
          ? api
              .get('/fallas', { params: { size: 100, solo_alerta: false } })
              .catch(() => ({ data: { items: [] } }))
          : Promise.resolve(null),
      ])

      const collected = []
      if (mgsRes) collected.push(...normalizeMgsAlarms(mgsRes.data ?? []))
      if (ppaRes) collected.push(...normalizePpa(ppaRes.data ?? {}))
      if (fallasRes) {
        const items = fallasRes.data?.items ?? fallasRes.data ?? []
        collected.push(...normalizeFallas(items))
      }

      allAlerts.value = collected
      pagination.value.total = collected.length
      pagination.value.page = 1
    } catch (e) {
      console.error('Error cargando alertas:', e)
      error.value = e?.message || 'No se pudieron cargar las alertas'
      allAlerts.value = []
      pagination.value.total = 0
    } finally {
      loading.value = false
    }
  }

  /**
   * Marca una alerta como atendida/leída. Para alertas de monitoreo (MGS) lo
   * persiste vía el endpoint de resolución; para el resto es solo local.
   */
  async function markAlertAsRead(alertId) {
    const alert = allAlerts.value.find((a) => a.id === alertId)
    if (!alert || alert.isRead) return

    alert.isRead = true
    if (alert.details) alert.details.canResolve = false

    if (alert.type === 'monitoreo' && alert.rawId != null) {
      try {
        await api.patch(`/mgs/alarms/${alert.rawId}/resolve`)
      } catch (e) {
        console.error('Error resolviendo alarma MGS:', e)
        error.value = 'No se pudo persistir la resolución de la alarma'
        alert.isRead = false
        if (alert.details) alert.details.canResolve = true
      }
    }
  }

  function setFilter(filterName, value) {
    filters.value[filterName] = value
    pagination.value.page = 1
  }

  function setPagination(page, pageSize) {
    if (page != null) pagination.value.page = page
    if (pageSize != null) pagination.value.pageSize = pageSize
  }

  return {
    // state
    allAlerts,
    loading,
    error,
    filters,
    pagination,
    // getters
    getAlerts,
    getUnreadCount,
    getFilteredAlerts,
    getFilteredAndPaginatedAlerts,
    filteredCount,
    // actions
    fetchAlerts,
    markAlertAsRead,
    setFilter,
    setPagination,
  }
})
