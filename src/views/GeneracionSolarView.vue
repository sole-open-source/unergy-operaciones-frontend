<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold" style="color: #2C2039;">Generación Solar</h1>
        <p class="text-sm" style="color: #6b5a8a;">Datos en tiempo real de Solenium</p>
      </div>
      <button @click="loadData" :disabled="loading"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              :style="{ backgroundColor: loading ? '#a78bcc' : '#915BD8' }">
        <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" class="mr-1" />
        Actualizar
      </button>
    </div>

    <!-- Fleet KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div v-for="kpi in fleetKpis" :key="kpi.label"
           class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">{{ kpi.label }}</p>
        <p class="text-2xl font-bold mt-1" :style="{ color: kpi.color || '#2C2039' }">{{ kpi.value }}</p>
        <p v-if="kpi.sub" class="text-xs mt-0.5" style="color: #915BD8;">{{ kpi.sub }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-white rounded-lg p-1 shadow-sm" style="border: 1px solid #e8e0f0;">
      <button v-for="(tab, i) in TABS" :key="tab" @click="activeTab = i"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :style="activeTab === i
                ? { backgroundColor: '#915BD8', color: 'white' }
                : { color: '#6b5a8a' }">
        {{ tab }}
      </button>
    </div>

    <!-- Tab 0: Fleet Table -->
    <div v-if="activeTab === 0" class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
      <div class="flex items-center gap-3 mb-4">
        <div class="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button @click="fleetFilter = 'all'" class="px-3 py-1 text-xs rounded-md font-medium"
                  :style="fleetFilter === 'all' ? { backgroundColor: '#915BD8', color: 'white' } : { color: '#6b5a8a' }">
            Todos
          </button>
          <button @click="fleetFilter = 'minifarm'" class="px-3 py-1 text-xs rounded-md font-medium"
                  :style="fleetFilter === 'minifarm' ? { backgroundColor: '#915BD8', color: 'white' } : { color: '#6b5a8a' }">
            Minigranjas
          </button>
          <button @click="fleetFilter = 'gd'" class="px-3 py-1 text-xs rounded-md font-medium"
                  :style="fleetFilter === 'gd' ? { backgroundColor: '#915BD8', color: 'white' } : { color: '#6b5a8a' }">
            GD / Autoconsumo
          </button>
        </div>
        <input v-model="searchText" type="text" placeholder="Buscar proyecto..."
               class="px-3 py-1.5 rounded-lg border text-sm flex-1" style="border-color: #e8e0f0;" />
      </div>

      <DataTable :value="filteredProjects" size="small" stripedRows :rowHover="true"
                 :paginator="filteredProjects.length > 25" :rows="25"
                 scrollable scrollHeight="500px" sortField="power_kw" :sortOrder="-1"
                 class="text-sm">
        <Column field="name" header="Proyecto" style="min-width:220px" sortable>
          <template #body="{ data }">
            <div>
              <span class="font-medium" style="color: #2C2039;">{{ data.name }}</span>
              <span v-if="data.is_minifarm" class="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                    style="background: rgba(145,91,216,0.1); color: #915BD8;">MGS</span>
            </div>
            <span class="text-xs" style="color: #6b5a8a;">{{ data.location }}</span>
          </template>
        </Column>
        <Column field="capacity_kwp" header="Cap. (kWp)" style="min-width:100px" sortable>
          <template #body="{ data }">
            <span class="font-mono text-xs">{{ (data.capacity_kwp || 0).toLocaleString() }}</span>
          </template>
        </Column>
        <Column field="power_kw" header="Potencia (kW)" style="min-width:120px" sortable>
          <template #body="{ data }">
            <span class="font-mono text-sm font-semibold"
                  :style="{ color: data.power_kw > 0 ? '#10B981' : '#9CA3AF' }">
              {{ (data.power_kw || 0).toFixed(1) }}
            </span>
          </template>
        </Column>
        <Column header="Utilización" style="min-width:130px" sortable sortField="utilization">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="h-full rounded-full transition-all"
                     :style="{ width: Math.min(data.utilization || 0, 100) + '%',
                               backgroundColor: data.utilization > 50 ? '#10B981' : data.utilization > 20 ? '#F0C040' : '#D64455' }" />
              </div>
              <span class="text-xs font-mono w-10 text-right" style="color: #6b5a8a;">
                {{ (data.utilization || 0).toFixed(0) }}%
              </span>
            </div>
          </template>
        </Column>
        <Column field="irradiance_w_m2" header="Irrad. (W/m²)" style="min-width:110px" sortable>
          <template #body="{ data }">
            <span class="font-mono text-xs" :style="{ color: data.irradiance_w_m2 ? '#D4A017' : '#9CA3AF' }">
              {{ data.irradiance_w_m2 ? data.irradiance_w_m2.toFixed(0) : '—' }}
            </span>
          </template>
        </Column>
        <Column header="" style="min-width:60px">
          <template #body="{ data }">
            <button @click="selectProject(data)" class="text-xs px-2 py-1 rounded"
                    style="color: #915BD8; background: rgba(145,91,216,0.08);">
              <i class="pi pi-eye" />
            </button>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Tab 1: Availability -->
    <div v-if="activeTab === 1" class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
      <h3 class="text-sm font-semibold mb-4" style="color: #2C2039;">Disponibilidad de Flota</h3>
      <div v-if="availability" class="space-y-4">
        <div v-for="(cat, key) in availability.categories" :key="key"
             class="rounded-lg p-4" :style="{ background: catColors[key]?.bg || '#f5f5f5' }">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold" :style="{ color: catColors[key]?.color || '#333' }">
              {{ catLabels[key] || key }} ({{ cat.count }})
            </span>
          </div>
          <div v-if="cat.projects?.length" class="flex flex-wrap gap-2">
            <span v-for="p in cat.projects" :key="p.id"
                  class="text-xs px-2 py-1 rounded" style="background: rgba(255,255,255,0.7);">
              {{ p.name }}
              <span v-if="p.availability != null" class="font-mono ml-1">{{ p.availability }}%</span>
            </span>
          </div>
          <p v-else class="text-xs" style="color: #6b5a8a;">Sin proyectos</p>
        </div>
      </div>
      <p v-else class="text-sm" style="color: #6b5a8a;">Cargando disponibilidad...</p>
    </div>

    <!-- Tab 2: Project Detail (selected) -->
    <div v-if="activeTab === 2" class="space-y-4">
      <div v-if="!selectedProject" class="bg-white rounded-xl shadow-sm p-8 text-center" style="border: 1px solid #e8e0f0;">
        <i class="pi pi-info-circle text-3xl mb-2" style="color: #6b5a8a;" />
        <p class="text-sm" style="color: #6b5a8a;">Selecciona un proyecto de la tabla para ver detalle</p>
      </div>
      <template v-else>
        <div class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold" style="color: #2C2039;">{{ selectedProject.name }}</h3>
              <p class="text-sm" style="color: #6b5a8a;">{{ selectedProject.location }}</p>
            </div>
            <button @click="selectedProject = null" class="text-xs px-3 py-1 rounded-lg"
                    style="color: #915BD8; background: rgba(145,91,216,0.08);">
              ← Volver a flota
            </button>
          </div>

          <!-- Project detail info -->
          <div v-if="projectDetail" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div v-for="item in projectDetailKpis" :key="item.label" class="p-3 rounded-lg" style="background: #f8f6fb;">
              <p class="text-xs" style="color: #6b5a8a;">{{ item.label }}</p>
              <p class="text-lg font-bold" style="color: #2C2039;">{{ item.value }}</p>
            </div>
          </div>
        </div>

        <!-- Inverters -->
        <div v-if="projectDetail?.inverters?.length" class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
          <h4 class="text-sm font-semibold mb-3" style="color: #2C2039;">
            Inversores ({{ projectDetail.inverters.length }})
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="inv in projectDetail.inverters" :key="inv.id"
                 class="p-3 rounded-lg flex items-center justify-between" style="border: 1px solid #e8e0f0;">
              <div>
                <p class="text-sm font-medium" style="color: #2C2039;">{{ inv.dev_name }}</p>
                <p class="text-xs" :style="{ color: inv.state === 'Grid-connected' ? '#10B981' : '#D64455' }">
                  {{ inv.state }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold" :style="{ color: inv.power > 0 ? '#10B981' : '#9CA3AF' }">
                  {{ (inv.power || 0).toFixed(1) }}
                </p>
                <p class="text-xs" style="color: #6b5a8a;">kW</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Power curve today -->
        <div v-if="projectDetail?.power_today" class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
          <h4 class="text-sm font-semibold mb-3" style="color: #2C2039;">Curva de Potencia Hoy</h4>
          <div class="overflow-x-auto">
            <svg :viewBox="`0 0 800 200`" class="w-full" style="max-height: 200px;">
              <template v-for="(curve, invName) in powerCurves" :key="invName">
                <polyline :points="curve.points" fill="none" :stroke="curve.color" stroke-width="2" />
              </template>
              <!-- X axis labels -->
              <text v-for="h in [0,4,8,12,16,20]" :key="h"
                    :x="h/24*780+10" y="195" fill="#6b5a8a" font-size="10" text-anchor="middle">
                {{ h }}:00
              </text>
            </svg>
          </div>
          <div class="flex flex-wrap gap-3 mt-2">
            <span v-for="(curve, invName) in powerCurves" :key="invName"
                  class="text-xs flex items-center gap-1">
              <span class="w-3 h-1 rounded-full inline-block" :style="{ backgroundColor: curve.color }" />
              {{ invName }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import api from '@/api/client'

const TABS = ['Flota', 'Disponibilidad', 'Detalle Proyecto']
const activeTab = ref(0)
const loading = ref(true)
const fleetFilter = ref('all')
const searchText = ref('')

const fleet = ref({})
const availability = ref(null)
const selectedProject = ref(null)
const projectDetail = ref(null)

const catLabels = { high: '> 90%', medium: '66-90%', low: '33-66%', critical: '< 33%', disconnect: 'Sin datos' }
const catColors = {
  high: { color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  medium: { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  low: { color: '#F0C040', bg: 'rgba(240,192,64,0.08)' },
  critical: { color: '#D64455', bg: 'rgba(214,68,85,0.08)' },
  disconnect: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.05)' },
}

const CHART_COLORS = ['#915BD8', '#10B981', '#3B82F6', '#F0C040', '#D64455', '#14B8A6', '#6366F1', '#EC4899']

const fleetKpis = computed(() => {
  const d = fleet.value
  return [
    { label: 'Proyectos', value: d.total_projects ?? '—' },
    { label: 'Online', value: d.online ?? '—', color: '#10B981' },
    { label: 'Potencia Total', value: d.total_power_kw != null ? `${d.total_power_kw > 1000 ? (d.total_power_kw/1000).toFixed(1)+' MW' : d.total_power_kw+' kW'}` : '—', color: '#D4A017' },
    { label: 'Capacidad', value: d.total_capacity_kwp != null ? `${(d.total_capacity_kwp/1000).toFixed(1)} MWp` : '—' },
    { label: 'Utilización', value: d.utilization_pct != null ? `${d.utilization_pct}%` : '—', color: d.utilization_pct > 30 ? '#10B981' : '#D64455' },
  ]
})

const projectsWithUtil = computed(() => {
  const projects = fleet.value.projects || []
  return projects.map(p => ({
    ...p,
    utilization: p.capacity_kwp > 0 ? (p.power_kw / p.capacity_kwp * 100) : 0,
  }))
})

const filteredProjects = computed(() => {
  let list = projectsWithUtil.value
  if (fleetFilter.value === 'minifarm') list = list.filter(p => p.is_minifarm)
  if (fleetFilter.value === 'gd') list = list.filter(p => !p.is_minifarm)
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q))
  }
  return list
})

const projectDetailKpis = computed(() => {
  if (!projectDetail.value) return []
  const p = projectDetail.value.project || {}
  return [
    { label: 'Capacidad (kWp)', value: p.installed_capacity || '—' },
    { label: 'Voltaje red (V)', value: p.grid_voltage || '—' },
    { label: 'Paneles', value: p.panel_quantity || '—' },
    { label: 'Operador Red', value: p.grid_operator || '—' },
    { label: 'Inversores', value: p.inverter_quantity || '—' },
    { label: 'Pot. inversor (kW)', value: p.inverter_power || '—' },
    { label: 'Tipo', value: p.is_minifarm ? 'Minigranja' : 'GD/Autoconsumo' },
    { label: 'Ubicación', value: p.location || '—' },
  ]
})

const powerCurves = computed(() => {
  const data = projectDetail.value?.power_today
  if (!data?.power) return {}
  const result = {}
  let idx = 0
  for (const [invName, timeseries] of Object.entries(data.power)) {
    const entries = Object.entries(timeseries).sort(([a], [b]) => a.localeCompare(b))
    if (!entries.length) continue
    const maxPower = Math.max(...entries.map(([, v]) => v), 1)
    const points = entries.map(([time, val]) => {
      const parts = time.split(' ')[1]?.split(':') || ['0', '0']
      const hours = parseInt(parts[0]) + parseInt(parts[1]) / 60
      const x = (hours / 24) * 780 + 10
      const y = 180 - (val / maxPower) * 170
      return `${x},${y}`
    }).join(' ')
    result[invName] = { points, color: CHART_COLORS[idx % CHART_COLORS.length] }
    idx++
  }
  return result
})

async function selectProject(proj) {
  selectedProject.value = proj
  activeTab.value = 2
  try {
    const res = await api.get(`/generacion-solar/project/${proj.id}`)
    projectDetail.value = res.data
  } catch {
    projectDetail.value = null
  }
}

async function loadData() {
  loading.value = true
  try {
    const [fleetRes, availRes] = await Promise.all([
      api.get('/generacion-solar/fleet').catch(() => null),
      api.get('/generacion-solar/availability').catch(() => null),
    ])
    if (fleetRes?.data) fleet.value = fleetRes.data
    if (availRes?.data) availability.value = availRes.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
