import { ref } from 'vue'
import api from '@/api/client'

// ── Fuente de datos ─────────────────────────────────────────────────────────
// "Proyectos próximos a energizarse" vive 100% en la BD de operaciones. Un job
// sincroniza el pipeline de TSF (Sun Factory + originabotdb + generación Unergy)
// hacia la tabla `proyectos` (ver backend app/services/tsf_sync.py). Este
// composable solo lee contra esa BD vía la API — SIN localStorage. Todos los
// campos son de solo lectura: vienen tal cual de la fuente, sin edición manual.
//
//   GET   /proximos-energizar         → lista (pipeline + fechas futuras)
//   POST  /proximos-energizar/sync    → re-sincroniza con Solenium (force opc.)
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
      // Fecha real del último sync (on-demand o job de 6h) que tocó el pipeline
      // en la BD -- no depende de que esta sesión haya apretado "Actualizar".
      if (data?.ultimaSincronizacion) lastSync.value = new Date(data.ultimaSincronizacion)
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

  async function removeProject(projectId) {
    try {
      await api.delete(`/proyectos/${projectId}`)
      projects.value = projects.value.filter(p => p.id !== projectId)
    } catch (e) {
      console.error('Error al eliminar el proyecto', e)
    }
  }

  // Re-sincroniza con Solenium.
  async function syncNow() {
    syncing.value = true
    try {
      const { data } = await api.post(`/proximos-energizar/sync`)
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
    loadProjects, removeProject, syncNow,
  }
}
