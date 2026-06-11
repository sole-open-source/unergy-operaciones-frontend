import { ref, watch, onMounted } from 'vue'
import api from '@/api/client'

const LOCAL_STORAGE_KEY = 'unergy_energization_projects'

// ── Fuente de datos ─────────────────────────────────────────────────────────
// El pipeline real de "Proyectos próximos a energizarse" vive en originabotdb
// (minifarm_project). El backend lo expone normalizado en
// `GET /api/v1/proximos-energizar`, cruzándolo con la generación de Unergy para
// detectar plantas ya energizadas. Este composable carga desde ahí; si la API
// falla, cae a la última copia en localStorage y, en último caso, a mocks.
//
// Las ediciones manuales (agregar/borrar/editar inline) se siguen persistiendo
// en localStorage como override local hasta que exista un write-path en el backend.
// ──────────────────────────────────────────────────────────────────────────────

function rehydrate(p) {
  return {
    ...p,
    // Compat con copias viejas en localStorage que solo guardaban `name`.
    commercialName: p.commercialName ?? p.name ?? '',
    energizationDate: p.energizationDate ? new Date(p.energizationDate) : new Date(),
    contracts: Array.isArray(p.contracts) ? p.contracts : [],
    monthlyMwh: Number(p.monthlyMwh) || 0,
  }
}

function defaultProject() {
  return {
    id: Date.now(),
    name: '',                       // código origina (vacío en altas manuales)
    commercialName: 'Nuevo Proyecto',
    status: 'En construcción',
    energizationDate: new Date(),
    contracts: [],
    monthlyMwh: 200,
  }
}

export function useEnergizationProjects() {
  const projects = ref([])
  const loading = ref(false)
  const error = ref(null)
  const warning = ref(null)   // aviso del backend (config faltante / fuente caída)
  const source = ref(null)    // 'originabotdb' | 'unavailable' | null

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) return false
      projects.value = parsed.map(rehydrate)
      return true
    } catch (e) {
      console.error('Error parsing energization projects from localStorage', e)
      return false
    }
  }

  async function loadProjects() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/proximos-energizar')
      const list = Array.isArray(data?.projects) ? data.projects : []
      projects.value = list.map(rehydrate)
      warning.value = data?.warning || null
      source.value = data?.source || null
      if (data?.warning) console.warn('proximos-energizar:', data.warning)
      return true
    } catch (e) {
      console.error('Error loading proyectos próximos a energizar from API', e)
      error.value = e
      warning.value = e?.response?.data?.detail || 'No se pudo cargar el pipeline desde la API.'
      // Degradación: última copia local; si no hay, deja lo que haya.
      loadFromLocalStorage()
      return false
    } finally {
      loading.value = false
    }
  }

  function saveProjects() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects.value))
    } catch (e) {
      console.error('Error saving energization projects to localStorage', e)
    }
  }

  function addProject() {
    projects.value.push(defaultProject())
  }

  function removeProject(projectId) {
    projects.value = projects.value.filter(p => p.id !== projectId)
  }

  function updateProject(projectId, updatedData) {
    const idx = projects.value.findIndex(p => p.id === projectId)
    if (idx >= 0) {
      projects.value[idx] = { ...projects.value[idx], ...updatedData }
    }
  }

  onMounted(loadProjects)

  // Persist any change (add / remove / inline edit) as a local override/cache.
  watch(projects, saveProjects, { deep: true })

  return { projects, loading, error, warning, source, addProject, removeProject, updateProject, loadProjects, saveProjects }
}
