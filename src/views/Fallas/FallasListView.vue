<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold" style="color: #2C2039;">Gestión de fallas</h2>
      <Button label="Registrar falla" icon="pi pi-plus" @click="openNew"
        style="background: #915BD8; border-color: #915BD8;" />
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center"
      style="border: 1px solid #e8e0f0;">
      <IconField class="flex-1 min-w-[180px]">
        <InputIcon class="pi pi-search" />
        <InputText v-model="filters.q" placeholder="Buscar por código o descripción…"
          class="w-full" @input="debouncedLoad" />
      </IconField>

      <Select v-model="filters.estado_id" :options="catalogos.estados" optionLabel="etiqueta"
        optionValue="id" placeholder="Estado" showClear class="min-w-[140px]" @change="load" />

      <Select v-model="filters.prioridad_id" :options="catalogos.prioridades" optionLabel="etiqueta"
        optionValue="id" placeholder="Prioridad" showClear class="min-w-[140px]" @change="load" />

      <Select v-model="filters.proyecto_id" :options="proyectos" optionLabel="nombre_comercial"
        optionValue="id" placeholder="Proyecto" showClear filter class="min-w-[180px]" @change="load" />

      <Button v-if="hasFilters" label="Limpiar" icon="pi pi-times" severity="secondary"
        size="small" @click="clearFilters" />
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <!--
        Scroll virtual desactivado a propósito: la lista de fallas ya usa
        paginación *lazy* en el servidor (filtros incluidos), por lo que sólo
        ~20 filas viven en el DOM a la vez — el objetivo de rendimiento ya se
        cumple sin cargar miles de registros en el cliente. Se usa VirtualTable
        para estandarizar el componente y reenviar eventos (onPage) al padre.
      -->
      <VirtualTable :value="items" :virtualScroll="false" lazy :loading="loading" :rows="size"
        :totalRecords="total" paginator @page="onPage" rowHover size="small" class="text-xs"
        :rowsPerPageOptions="[10, 20, 50]" @row-click="goToDetail">
        <template #empty>
          <div class="py-10 text-center text-sm" style="color: #9b89b5;">
            No hay fallas registradas con los filtros actuales.
          </div>
        </template>

        <Column field="codigo_interno" header="Código" style="width: 130px; font-family: monospace;" />

        <Column header="Proyecto" style="min-width: 160px;">
          <template #body="{ data }">
            <span class="text-[11px] font-medium" style="color: #2C2039;">{{ data.proyecto?.nombre_comercial }}</span>
          </template>
        </Column>

        <Column header="Tipo" style="min-width: 150px;">
          <template #body="{ data }">
            <div v-memo="[data.id, data.tipo?.id]">
              <span class="text-[10px] px-1.5 py-0.5 rounded font-medium"
                :style="{ background: data.tipo?.categoria?.color_hex + '18', color: data.tipo?.categoria?.color_hex }">
                {{ data.tipo?.categoria?.etiqueta }}
              </span>
              <p class="text-[11px] mt-0.5" style="color: #9b89b5;">{{ data.tipo?.etiqueta }}</p>
            </div>
          </template>
        </Column>

        <Column header="Estado" style="width: 120px;">
          <template #body="{ data }">
            <span class="text-[11px] px-1.5 py-0.5 rounded font-medium"
              :style="estadoStyle(data.estado)">
              {{ data.estado?.etiqueta }}
            </span>
          </template>
        </Column>

        <Column header="Prioridad" style="width: 100px;">
          <template #body="{ data }">
            <Tag :value="data.prioridad?.etiqueta" :severity="prioSeverity(data.prioridad?.nivel)"
              class="text-[11px]" />
          </template>
        </Column>

        <Column header="Fecha" style="width: 100px;">
          <template #body="{ data }">
            <span class="text-[11px] font-normal" style="color: #9b89b5;">{{ formatDate(data.fecha_identificacion) }}</span>
          </template>
        </Column>

        <Column header="SLA" style="width: 100px;">
          <template #body="{ data }">
            <span v-if="data.sla_cumplido === true"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: rgba(16,185,129,0.12); color: #10B981;">
              OK
            </span>
            <span v-else-if="data.sla_cumplido === false"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: rgba(214,68,85,0.12); color: #D64455;">
              Vencido
            </span>
            <span v-else-if="slaAtRisk(data)"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: rgba(240,192,64,0.12); color: #CA8A04;">
              En riesgo
            </span>
            <span v-else class="text-xs" style="color: #9b89b5;">—</span>
          </template>
        </Column>

        <Column header="Asignado a" style="min-width: 120px;">
          <template #body="{ data }">
            <span v-if="data.asignado_a" class="text-[11px]" style="color: #6b5a8a;">
              {{ data.asignado_a.nombre }}
            </span>
            <span v-else class="text-[11px] italic" style="color: #c5b9db;">Sin asignar</span>
          </template>
        </Column>

        <Column style="width: 60px;">
          <template #body="{ data }">
            <Button icon="pi pi-chevron-right" text rounded severity="secondary" size="small"
              @click.stop="goToDetail({ data })" />
          </template>
        </Column>
      </VirtualTable>
    </div>

    <!-- Dialog crear -->
    <Dialog v-model:visible="dialogVisible" header="Registrar nueva falla" modal
      class="w-full max-w-2xl" :closable="!saving">
      <FallaForm :catalogos="catalogos" @save="onCreate" @cancel="dialogVisible = false" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import FallaForm from './FallaForm.vue'
import VirtualTable from '@/components/common/VirtualTable.vue'
import api from '@/api/client'

const router = useRouter()
const toast = useToast()

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const catalogos = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos = ref([])

const filters = ref({ q: '', estado_id: null, prioridad_id: null, proyecto_id: null })
const hasFilters = computed(() => filters.value.q || filters.value.estado_id || filters.value.prioridad_id || filters.value.proyecto_id)

function slaAtRisk(data) {
  if (!data.sla_limite_horas || data.sla_cumplido !== null) return false
  if (!data.fecha_identificacion) return false
  const created = new Date(data.fecha_identificacion + 'T00:00:00')
  const deadline = new Date(created.getTime() + data.sla_limite_horas * 3600000)
  const now = new Date()
  const remaining = (deadline - now) / 3600000
  return remaining > 0 && remaining < data.sla_limite_horas * 0.25
}

let debounceTimer = null
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 350)
}

const prioSeverity = (n) => ({ 1: 'danger', 2: 'warn', 3: 'info', 4: 'secondary' }[n] ?? 'secondary')

function estadoStyle(estado) {
  const hex = estado?.color_hex ?? '#915BD8'
  return { background: hex + '22', color: hex }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadCatalogos() {
  try {
    const { data } = await api.get('/fallas/catalogos')
    catalogos.value = data
  } catch {
    // Keep empty defaults
  }
}

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, size: size.value }
    if (filters.value.q) params.q = filters.value.q
    if (filters.value.estado_id) params.estado_id = filters.value.estado_id
    if (filters.value.prioridad_id) params.prioridad_id = filters.value.prioridad_id
    if (filters.value.proyecto_id) params.proyecto_id = filters.value.proyecto_id
    const { data } = await api.get('/fallas', { params })
    items.value = data.items
    total.value = data.total
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.value = { q: '', estado_id: null, prioridad_id: null, proyecto_id: null }
  page.value = 1
  load()
}

function onPage(e) {
  page.value = e.page + 1
  load()
}

function openNew() {
  dialogVisible.value = true
}

function goToDetail({ data }) {
  router.push(`/fallas/${data.id}`)
}

async function onCreate(payload) {
  saving.value = true
  try {
    const notaInicial = payload.nota_inicial
    delete payload.nota_inicial
    const { data: nueva } = await api.post('/fallas', payload)
    if (notaInicial) {
      await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
    }
    dialogVisible.value = false
    toast.add({ severity: 'success', summary: 'Falla registrada', life: 3000 })
    page.value = 1
    load()
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al registrar la falla'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    saving.value = false
  }
}

async function loadProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = data.items ?? []
  } catch {
    // non-critical
  }
}

onMounted(() => {
  loadCatalogos()
  loadProyectos()
  load()
})
</script>
