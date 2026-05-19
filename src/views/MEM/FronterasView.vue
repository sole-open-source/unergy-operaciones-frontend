<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold" style="color: #2C2039;">Fronteras Comerciales</h2>
        <p class="text-sm mt-1" style="color: #6b5a8a;">{{ filteredFronteras.length }} fronteras registradas</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <span class="p-input-icon-left w-full sm:w-auto">
          <i class="pi pi-search" />
          <InputText v-model="search" placeholder="Buscar frontera..." class="w-full sm:w-64" />
        </span>
        <Dropdown v-model="estadoFilter" :options="estadoOptions" optionLabel="label" optionValue="value"
                  placeholder="Estado" class="w-40" showClear />
      </div>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label"
           class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">{{ stat.label }}</p>
        <p class="text-2xl font-bold mt-1" :style="{ color: stat.color }">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl" style="color: #915BD8;" />
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <DataTable :value="filteredFronteras" :paginator="true" :rows="20"
                 :rowsPerPageOptions="[10, 20, 50]" responsiveLayout="scroll"
                 stripedRows class="p-datatable-sm">
        <Column field="codigo_frontera" header="Código" sortable style="min-width: 140px">
          <template #body="{ data }">
            <span class="font-mono text-sm font-semibold" style="color: #915BD8;">{{ data.codigo_frontera || '—' }}</span>
          </template>
        </Column>
        <Column field="nombre_frontera" header="Nombre" sortable style="min-width: 200px" />
        <Column field="proyecto_nombre" header="Proyecto" sortable style="min-width: 180px">
          <template #body="{ data }">
            <RouterLink v-if="data.proyecto_id" :to="`/proyectos/${data.proyecto_id}`"
                        class="text-sm underline" style="color: #915BD8;">
              {{ data.proyecto_nombre || `#${data.proyecto_id}` }}
            </RouterLink>
            <span v-else class="text-sm" style="color: #999;">—</span>
          </template>
        </Column>
        <Column field="tipo_frontera" header="Tipo" sortable style="min-width: 130px">
          <template #body="{ data }">
            <Tag :value="tipoLabel(data.tipo_frontera)" :severity="tipoSeverity(data.tipo_frontera)" />
          </template>
        </Column>
        <Column field="estado" header="Estado" sortable style="min-width: 120px">
          <template #body="{ data }">
            <Tag :value="data.estado" :severity="estadoSeverity(data.estado)" />
          </template>
        </Column>
        <Column field="operador_red" header="Operador" sortable style="min-width: 120px" />
        <Column field="capacidad_efectiva_mw" header="Cap. MW" sortable style="min-width: 100px">
          <template #body="{ data }">
            {{ data.capacidad_efectiva_mw ? Number(data.capacidad_efectiva_mw).toFixed(3) : '—' }}
          </template>
        </Column>
        <Column field="municipio" header="Municipio" sortable style="min-width: 130px" />
        <Column field="departamento" header="Departamento" sortable style="min-width: 130px" />
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'

const fronteras = ref([])
const loading = ref(true)
const search = ref('')
const estadoFilter = ref(null)

const estadoOptions = [
  { label: 'Activa', value: 'activa' },
  { label: 'En registro', value: 'en_registro' },
  { label: 'En falla', value: 'en_falla' },
  { label: 'Cancelada', value: 'cancelada' },
]

const filteredFronteras = computed(() => {
  let list = fronteras.value
  if (estadoFilter.value) list = list.filter(f => f.estado === estadoFilter.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter(f =>
      (f.codigo_frontera || '').toLowerCase().includes(s) ||
      (f.nombre_frontera || '').toLowerCase().includes(s) ||
      (f.proyecto_nombre || '').toLowerCase().includes(s) ||
      (f.operador_red || '').toLowerCase().includes(s) ||
      (f.municipio || '').toLowerCase().includes(s)
    )
  }
  return list
})

const stats = computed(() => {
  const all = fronteras.value
  return [
    { label: 'Total', value: all.length, color: '#2C2039' },
    { label: 'Activas', value: all.filter(f => f.estado === 'activa').length, color: '#10B981' },
    { label: 'En registro', value: all.filter(f => f.estado === 'en_registro').length, color: '#F0C040' },
    { label: 'Cap. total MW', value: all.reduce((s, f) => s + (Number(f.capacidad_efectiva_mw) || 0), 0).toFixed(1), color: '#915BD8' },
  ]
})

function tipoLabel(t) {
  const map = { generacion: 'Generación', consumo: 'Consumo', generacion_consumo: 'Gen+Consumo', consumo_auxiliar: 'Auxiliar', consumo_propio: 'Propio' }
  return map[t] || t
}
function tipoSeverity(t) {
  if (t === 'generacion') return 'success'
  if (t === 'consumo') return 'info'
  return 'warn'
}
function estadoSeverity(e) {
  const map = { activa: 'success', en_registro: 'warn', en_falla: 'danger', cancelada: 'secondary' }
  return map[e] || 'info'
}

onMounted(async () => {
  try {
    const { data } = await api.get('/fronteras')
    fronteras.value = data
  } catch (e) {
    console.error('Error loading fronteras:', e)
  } finally {
    loading.value = false
  }
})
</script>
