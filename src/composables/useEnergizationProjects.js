import { ref, watch, onMounted } from 'vue'

const LOCAL_STORAGE_KEY = 'unergy_energization_projects'

// ── TODO: Solenium API integration ────────────────────────────────────────────
// This composable currently persists the "Proyectos próximos a energizarse" data
// in localStorage as an MVP. The upcoming-projects information actually lives in
// Solenium (project pipeline / construction tracker), which is not directly
// reachable from the browser.
//
// To productionize this:
//   1. Build a backend proxy endpoint (e.g. `/proyectos/proximos-energizar`) that
//      authenticates against Solenium and normalizes its payload into the project
//      shape used here ({ id, name, status, energizationDate, contracts, monthlyMwh }).
//   2. Replace the body of `loadProjects` below with a call to that proxy
//      (via `@/api/client`) that populates the `projects` ref from the response.
//   3. Decide on the write path: either keep edits local, or `PUT`/`PATCH` changes
//      back through the proxy in `saveProjects` instead of writing to localStorage.
// Until that proxy exists, localStorage keeps this feature fully functional.
// ──────────────────────────────────────────────────────────────────────────────

function defaultProject() {
  return {
    id: Date.now(),
    name: 'Nuevo Proyecto',
    status: 'En construcción',
    energizationDate: new Date(),
    contracts: [],
    monthlyMwh: 200,
  }
}

function mockProjects() {
  const now = new Date()
  return [
    {
      id: Date.now(),
      name: 'Granja Solar La Esperanza',
      status: 'En construcción',
      energizationDate: new Date(now.getFullYear(), now.getMonth() + 1, 16),
      contracts: ['Terpel'],
      monthlyMwh: 320,
    },
    {
      id: Date.now() + 1,
      name: 'Parque FV El Mirador',
      status: 'Pruebas',
      energizationDate: new Date(now.getFullYear(), now.getMonth() + 2, 1),
      contracts: ['Klik', 'Consolidado'],
      monthlyMwh: 180,
    },
  ]
}

export function useEnergizationProjects() {
  const projects = ref([])

  function loadProjects() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return false
      // energizationDate is serialized as a string — rehydrate it into a Date.
      projects.value = parsed.map(p => ({
        ...p,
        energizationDate: p.energizationDate ? new Date(p.energizationDate) : new Date(),
        contracts: Array.isArray(p.contracts) ? p.contracts : [],
      }))
      return true
    } catch (e) {
      console.error('Error parsing energization projects from localStorage', e)
      return false
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

  onMounted(() => {
    const loaded = loadProjects()
    if (!loaded) {
      projects.value = mockProjects()
    }
  })

  // Persist any change (add / remove / inline edit) automatically.
  watch(projects, saveProjects, { deep: true })

  return { projects, addProject, removeProject, updateProject, loadProjects, saveProjects }
}
