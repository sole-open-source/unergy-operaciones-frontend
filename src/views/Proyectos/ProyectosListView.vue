<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Proyectos</h2>
      <Button label="Nuevo proyecto" icon="pi pi-plus" @click="openNew" />
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="field-label">Buscar</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filters.q" placeholder="Nombre comercial…" class="w-56" @input="onSearch" />
        </IconField>
      </div>
      <div>
        <label class="field-label">Estado</label>
        <Select v-model="filters.estado" :options="ESTADOS" class="w-40" placeholder="Todos" showClear @change="load" />
      </div>
      <div>
        <label class="field-label">Tipo</label>
        <Select v-model="filters.tipo_proyecto" :options="TIPOS_PROYECTO" class="w-44" placeholder="Todos" showClear @change="load" />
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <DataTable :value="items" lazy :loading="loading" :rows="size" :totalRecords="total"
        paginator @page="onPage" rowHover class="text-sm">
        <Column field="nombre_comercial" header="Nombre comercial" sortable />
        <Column field="estado" header="Estado">
          <template #body="{ data }">
            <Tag :value="data.estado" :severity="estadoSeverity(data.estado)" />
          </template>
        </Column>
        <Column field="tipo_proyecto" header="Tipo" />
        <Column field="potencia_instalada_kwp" header="kWp" />
        <Column header="Potencia (kW)" style="width:110px">
          <template #body="{ data }">
            <span v-if="fleetMap[data.nombre_comercial] != null"
                  class="font-mono text-sm font-semibold"
                  :style="{ color: fleetMap[data.nombre_comercial] > 0 ? '#10B981' : '#9CA3AF' }">
              {{ fleetMap[data.nombre_comercial].toFixed(1) }}
            </span>
            <span v-else class="text-gray-300 text-xs">—</span>
          </template>
        </Column>
        <Column field="codigo_tsf" header="Cód. TSF" />
        <Column header="Servicios" style="width:160px">
          <template #body="{ data }">
            <div class="flex gap-1 flex-wrap">
              <span v-for="srv in SERVICIOS_BADGES" :key="srv.key">
                <span v-if="data[srv.key]" class="srv-badge">{{ srv.badge }}</span>
              </span>
            </div>
          </template>
        </Column>
        <Column header="Inversionistas" style="width:180px">
          <template #body="{ data }">
            <div v-if="data.inversionistas?.length" class="flex gap-1 flex-wrap">
              <span v-for="inv in data.inversionistas.slice(0, 2)" :key="inv.id" class="inv-badge">
                {{ inv.cliente_nombre }}
              </span>
              <span v-if="data.inversionistas.length > 2" class="inv-badge-more">
                +{{ data.inversionistas.length - 2 }}
              </span>
            </div>
            <span v-else class="text-gray-400 text-xs">—</span>
          </template>
        </Column>
        <Column header="" style="width:120px">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button icon="pi pi-eye" text size="small" @click="goDetail(data)" v-tooltip="'Ver detalle'" />
              <Button icon="pi pi-pencil" text size="small" severity="info" @click="goEdit(data)" v-tooltip="'Editar'" />
              <Button icon="pi pi-trash" text size="small" severity="danger" @click="confirmDelete(data)" v-tooltip="'Eliminar'" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog: Nuevo proyecto -->
    <Dialog v-model:visible="dialogVisible" header="Nuevo proyecto" modal class="w-full max-w-xl">
      <ProyectoForm @save="onCreate" @cancel="dialogVisible = false" />
    </Dialog>

    <!-- Dialog: Confirmar eliminación -->
    <Dialog v-model:visible="deleteVisible" header="Eliminar proyecto" modal class="w-full max-w-sm">
      <p class="text-sm text-gray-700 mb-4">
        ¿Estás seguro de que deseas eliminar <strong>{{ deleteProyecto?.nombre_comercial }}</strong>?
        Esta acción no se puede deshacer.
      </p>
      <div class="flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" @click="deleteVisible = false" />
        <Button label="Eliminar" severity="danger" :loading="deleting" @click="doDelete" />
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import ProyectoForm from './ProyectoForm.vue'

const router = useRouter()
const toast = useToast()

const ESTADOS = ['en_desarrollo', 'en_operacion', 'suspendido', 'cancelado']
const TIPOS_PROYECTO = ['minigranja', 'autoconsumo', 'gd', 'movilidad_electrica', 'otro']
const SERVICIOS_BADGES = [
  { key: 'srv_operacion', badge: 'OP' },
  { key: 'srv_representacion', badge: 'REP' },
  { key: 'srv_cgm', badge: 'CGM' },
  { key: 'srv_ppa', badge: 'PPA' },
  { key: 'srv_promotor', badge: 'PROM' },
  { key: 'srv_rec', badge: 'REC' },
]

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)
const dialogVisible = ref(false)

const deleteVisible = ref(false)
const deleteProyecto = ref(null)
const deleting = ref(false)

const filters = reactive({ q: '', estado: null, tipo_proyecto: null })
const fleetData = ref([])

const fleetMap = computed(() => {
  const map = {}
  for (const p of fleetData.value) {
    map[p.name] = p.power_kw || 0
  }
  return map
})

const estadoSeverity = (e) => (
  { en_operacion: 'success', en_desarrollo: 'info', suspendido: 'warn', cancelado: 'secondary' }[e] || 'secondary'
)

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, size: size.value }
    if (filters.q) params.q = filters.q
    if (filters.estado) params.estado = filters.estado
    if (filters.tipo_proyecto) params.tipo_proyecto = filters.tipo_proyecto
    const { data } = await api.get('/proyectos', { params })
    items.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  api.get('/generacion-solar/fleet').then(r => {
    if (r.data?.projects) fleetData.value = r.data.projects
  }).catch(() => {})
})

let searchTimer
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
}

function onPage(e) { page.value = e.page + 1; load() }
function goDetail(row) { router.push(`/proyectos/${row.id}`) }
function goEdit(row) { router.push(`/proyectos/${row.id}?edit=true`) }
function openNew() { dialogVisible.value = true }

function confirmDelete(row) {
  deleteProyecto.value = row
  deleteVisible.value = true
}

async function onCreate(payload) {
  try {
    await api.post('/proyectos', payload)
    toast.add({ severity: 'success', summary: 'Proyecto creado', life: 3000 })
    dialogVisible.value = false
    load()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 4000 })
  }
}

async function doDelete() {
  deleting.value = true
  try {
    await api.delete(`/proyectos/${deleteProyecto.value.id}`)
    toast.add({ severity: 'success', summary: 'Proyecto eliminado', life: 3000 })
    deleteVisible.value = false
    load()
  } catch (e) {
    const detail = e.response?.data?.detail || 'Error al eliminar'
    toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail, life: 5000 })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
.srv-badge { @apply bg-green-100 text-green-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.inv-badge { @apply bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded max-w-[80px] truncate inline-block; }
.inv-badge-more { @apply bg-gray-100 text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
</style>
