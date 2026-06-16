import { ref } from 'vue'
import api from '@/api/client'

// ── Fuente de datos ─────────────────────────────────────────────────────────
// "Proyectos próximos a energizarse" vive 100% en la BD de operaciones. Un job
// sincroniza el pipeline de TSF (Sun Factory + originabotdb + generación Unergy)
// hacia la tabla `proyectos` (ver backend app/services/tsf_sync.py). Este
// composable solo lee/escribe contra esa BD vía la API — SIN localStorage.
//
//   GET   /proximos-energizar         → lista (pipeline + fechas futuras)
//   POST  /proximos-energizar/sync    → re-sincroniza con Solenium (force opc.)
//   PATCH /proximos-energizar/{id}    → persiste ediciones del operador
// ──────────────────────────────────────────────────────────────────────────────

function rehydrate(p) {
  return {
    ...p,
    commercialName: p.commercialName ?? '',
    energizationDate: p.energizationDate ? new Date(p.energizationDate) : null,
    contracts: Array.isArray(p.contracts) ? p.contracts : [],
    monthlyMwh: Number(p.monthlyMwh) || 0,
  }
}

function toIsoDate(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return null
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useEnergizationProjects() {
  const projects = ref([])
  const loading = ref(false)
  const error = ref(null)
  const warning = ref(null)   // aviso del backend (config faltante / fuente caída)
  const source = ref(null)    // 'operaciones_db' | null
  const syncing = ref(false)
  const lastSync = ref(null)

  async function loadProjects() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/proximos-energizar')
      const list = Array.isArray(data?.projects) ? data.projects : []
      projects.value = list.map(rehydrate)
      source.value = data?.source || null
      return true
    } catch (e) {
      console.error('Error loading proyectos próximos a energizar from API', e)
      error.value = e
      warning.value = e?.response?.data?.detail || 'No se pudo cargar el pipeline desde la API.'
      return false
    } finally {
      loading.value = false
    }
  }

  // Persiste una edición inline del operador (con debounce por proyecto).
  const _timers = {}
  function persistField(project, key, value) {
    project[key] = value
    const payload = {}
    if (key === 'commercialName') payload.commercialName = value
    else if (key === 'status') payload.status = value
    else if (key === 'monthlyMwh') payload.monthlyMwh = Number(value) || 0
    else if (key === 'energizationDate') payload.energizationDate = toIsoDate(value)
    else return // campos no persistibles (p. ej. contracts → se gestionan vía PPA)

    clearTimeout(_timers[project.id])
    _timers[project.id] = setTimeout(async () => {
      try {
        const { data } = await api.patch(`/proximos-energizar/${project.id}`, payload)
        // Refleja el flag de "editada manual" devuelto por el backend.
        const idx = projects.value.findIndex(p => p.id === project.id)
        if (idx >= 0 && data) {
          projects.value[idx] = { ...projects.value[idx], editadaManual: data.editadaManual }
        }
      } catch (e) {
        console.error('Error al guardar la edición del proyecto', e)
      }
    }, 600)
  }

  async function removeProject(projectId) {
    try {
      await api.delete(`/proyectos/${projectId}`)
      projects.value = projects.value.filter(p => p.id !== projectId)
    } catch (e) {
      console.error('Error al eliminar el proyecto', e)
    }
  }

  // Re-sincroniza con Solenium. force=true sobrescribe las fechas que el operador
  // haya editado manualmente (Solenium suele tener la fecha más fresca).
  async function syncNow(force = false) {
    syncing.value = true
    try {
      const { data } = await api.post(`/proximos-energizar/sync`, null, { params: { force } })
      lastSync.value = new Date()
      await loadProjects()
      return data
    } catch (e) {
      console.error('Error al sincronizar con Solenium', e)
      warning.value = e?.response?.data?.detail || 'No se pudo sincronizar con Solenium.'
      return null
    } finally {
      syncing.value = false
    }
  }

  return {
    projects, loading, error, warning, source, syncing, lastSync,
    loadProjects, persistField, removeProject, syncNow,
  }
}
