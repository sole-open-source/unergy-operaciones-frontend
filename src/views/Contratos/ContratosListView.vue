<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-gray-800">Servicios</h2>
      <p class="text-xs text-gray-400 mt-0.5">Gestión de contratos y servicios por tipo</p>
    </div>

    <!-- Botón nuevo contrato -->
    <div class="flex justify-end">
      <Button v-if="servicioActivo === 'ppa'" label="Nuevo contrato PPA" icon="pi pi-plus"
        class="bg-amber-500 border-amber-500 hover:bg-amber-600" @click="showWizard = true" />
      <Button v-else-if="servicioActivo !== 'ppa'" :label="`Nuevo contrato ${servicioInfo?.label}`"
        icon="pi pi-plus"
        :style="`background:${servicioInfo?.color}; border-color:${servicioInfo?.color}`"
        @click="showServicioWizard = true" />
    </div>

    <!-- Tarjetas de servicio -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="srv in SERVICIOS" :key="srv.key"
        class="flex flex-col items-center gap-3 rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 select-none"
        :class="servicioActivo === srv.key
          ? 'shadow-sm'
          : 'border-gray-100 bg-gray-50 opacity-70 hover:opacity-90'"
        :style="servicioActivo === srv.key
          ? `background:${srv.bg}; border-color:${srv.color}50`
          : ''"
        @click="seleccionarServicio(srv.key)"
      >
        <div class="w-12 h-12 rounded-full flex items-center justify-center"
          :style="servicioActivo === srv.key ? `background:${srv.color}25` : 'background:#e5e7eb'">
          <i :class="srv.icon" class="text-2xl"
            :style="servicioActivo === srv.key ? `color:${srv.color}` : 'color:#9ca3af'" />
        </div>
        <span class="text-sm font-semibold text-center"
          :style="servicioActivo === srv.key ? `color:${srv.color}` : 'color:#6b7280'">
          {{ srv.label }}
        </span>
        <span v-if="conteoServicio(srv.key) > 0 && servicioActivo === srv.key"
          class="text-xs font-medium px-2 py-0.5 rounded-full"
          :style="`background:${srv.color}20; color:${srv.color}`">
          {{ conteoServicio(srv.key) }}
        </span>
      </div>
    </div>

    <!-- ── PPA ─────────────────────────────────────────────────────── -->
    <template v-if="servicioActivo === 'ppa'">
      <div class="flex gap-3 items-center">
        <IconField class="flex-1 max-w-sm">
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroQ" placeholder="Buscar por proyecto, nombre, comprador…"
            class="w-full" @input="buscar" />
        </IconField>
      </div>

      <DataTable
        :value="contratosFiltrados"
        :loading="loading"
        stripedRows
        class="text-sm"
        paginator
        :rows="20"
        :rowsPerPageOptions="[10, 20, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        emptyMessage="No hay contratos PPA registrados."
        rowHover
        sortField="fecha_inicio"
        :sortOrder="1"
      >
        <Column field="nombre_interno" header="Nombre interno" sortable>
          <template #body="{ data }">
            <span class="font-medium text-gray-800">{{ data.nombre_interno || '—' }}</span>
          </template>
        </Column>
        <Column field="numero_codigo_contrato" header="N° contrato" sortable style="width:160px">
          <template #body="{ data }">
            <span class="font-mono text-xs text-gray-500">{{ data.numero_codigo_contrato || '—' }}</span>
          </template>
        </Column>
        <Column header="Comprador">
          <template #body="{ data }">{{ data.comprador_nombre || '—' }}</template>
        </Column>
        <Column header="Vendedor">
          <template #body="{ data }">{{ data.vendedor_nombre || '—' }}</template>
        </Column>
        <Column field="fecha_inicio" header="Inicio" sortable style="width:100px">
          <template #body="{ data }">{{ formatFecha(data.fecha_inicio) }}</template>
        </Column>
        <Column field="fecha_fin" header="Fin" sortable style="width:100px">
          <template #body="{ data }">{{ formatFecha(data.fecha_fin) }}</template>
        </Column>
        <Column style="width:50px">
          <template #body="{ data }">
            <Button icon="pi pi-arrow-right" text size="small" severity="secondary"
              @click.stop="irAContrato(data)" v-tooltip="'Ver detalle'" />
          </template>
        </Column>
      </DataTable>
    </template>

    <!-- ── REPRESENTACIÓN / OPERACIÓN / REC ───────────────────────── -->
    <template v-else>
      <div class="flex gap-3 items-center">
        <IconField class="flex-1 max-w-sm">
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroServicio" placeholder="Buscar por número, contratante, prestador…"
            class="w-full" @input="buscarServicio" />
        </IconField>
      </div>

      <DataTable
        :value="contratosServicioFiltrados"
        :loading="loadingServicio"
        stripedRows
        class="text-sm"
        paginator
        :rows="20"
        :rowsPerPageOptions="[10, 20, 50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        :emptyMessage="`No hay contratos de ${servicioInfo?.label} registrados.`"
        rowHover
        sortField="fecha_inicio"
        :sortOrder="1"
      >
        <Column field="numero_contrato" header="N° contrato" sortable style="width:160px">
          <template #body="{ data }">
            <span class="font-mono text-xs text-gray-500">{{ data.numero_contrato || '—' }}</span>
          </template>
        </Column>
        <Column header="Contratante">
          <template #body="{ data }">{{ data.contratante_nombre || '—' }}</template>
        </Column>
        <Column header="Prestador">
          <template #body="{ data }">{{ data.prestador_nombre || '—' }}</template>
        </Column>
        <Column field="fecha_inicio" header="Inicio" sortable style="width:100px">
          <template #body="{ data }">{{ formatFecha(data.fecha_inicio) }}</template>
        </Column>
        <Column field="fecha_fin" header="Fin" sortable style="width:100px">
          <template #body="{ data }">{{ formatFecha(data.fecha_fin) }}</template>
        </Column>
        <Column header="Estado" style="width:120px">
          <template #body="{ data }">
            <Tag :value="ESTADO_LABELS[data.estado] || data.estado" :severity="ESTADO_SEVERITY[data.estado]" />
          </template>
        </Column>
        <Column v-if="servicioActivo === 'representacion'" header="CGM" style="width:60px">
          <template #body="{ data }">
            <i v-if="data.tiene_cgm" class="pi pi-check-circle text-green-500" v-tooltip="'Incluye CGM'" />
            <i v-else class="pi pi-minus text-gray-300" />
          </template>
        </Column>
        <Column v-if="servicioActivo === 'representacion'" header="Promotor" style="width:70px">
          <template #body="{ data }">
            <i v-if="data.tiene_promotor" class="pi pi-check-circle text-blue-400" v-tooltip="'Incluye Promotor'" />
            <i v-else class="pi pi-minus text-gray-300" />
          </template>
        </Column>
      </DataTable>
    </template>

    <!-- Wizards -->
    <PPAContratoWizard v-if="showWizard" :visible="showWizard"
      @cerrar="showWizard = false" @creado="onContratoCreado" />

    <ContratoServicioWizard
      v-if="showServicioWizard"
      :visible="showServicioWizard"
      :tipo="servicioActivo"
      @cerrar="showServicioWizard = false"
      @creado="onServicioCreado" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import PPAContratoWizard from './PPAContratoWizard.vue'
import ContratoServicioWizard from './ContratoServicioWizard.vue'
import api from '@/api/client'

const router = useRouter()
const toast = useToast()

const SERVICIOS = [
  { key: 'ppa',           label: 'PPA',           icon: 'pi pi-bolt',      color: '#f59e0b', bg: '#fffbeb' },
  { key: 'representacion',label: 'Representación', icon: 'pi pi-file-edit', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'operacion',     label: 'Operación',      icon: 'pi pi-chart-bar', color: '#10b981', bg: '#f0fdf4' },
  { key: 'rec',           label: 'REC',            icon: 'pi pi-verified',  color: '#14b8a6', bg: '#f0fdfa' },
]

const ESTADO_LABELS = {
  vigente:      'Vigente',
  vencido:      'Vencido',
  terminado:    'Terminado',
  en_renovacion:'En renovación',
}
const ESTADO_SEVERITY = {
  vigente:      'success',
  vencido:      'danger',
  terminado:    'secondary',
  en_renovacion:'warn',
}

const servicioActivo = ref('ppa')
const showWizard = ref(false)
const showServicioWizard = ref(false)

const servicioInfo = computed(() => SERVICIOS.find(s => s.key === servicioActivo.value))

// PPA
const contratos = ref([])
const loading = ref(false)
const filtroQ = ref('')

const contratosFiltrados = computed(() => {
  const q = filtroQ.value.toLowerCase()
  if (!q) return contratos.value
  return contratos.value.filter(c =>
    (c.nombre_interno ?? '').toLowerCase().includes(q) ||
    (c.numero_codigo_contrato ?? '').toLowerCase().includes(q) ||
    (c.comprador_nombre ?? '').toLowerCase().includes(q) ||
    (c.proyectos ?? []).some(p => (p.nombre_comercial ?? '').toLowerCase().includes(q))
  )
})

// Otros servicios
const contratosServicio = ref([])
const loadingServicio = ref(false)
const filtroServicio = ref('')

const contratosServicioFiltrados = computed(() => {
  const q = filtroServicio.value.toLowerCase()
  if (!q) return contratosServicio.value
  return contratosServicio.value.filter(c =>
    (c.numero_contrato ?? '').toLowerCase().includes(q) ||
    (c.contratante_nombre ?? '').toLowerCase().includes(q) ||
    (c.prestador_nombre ?? '').toLowerCase().includes(q)
  )
})

function conteoServicio(key) {
  if (key === 'ppa') return contratos.value.length
  if (key === servicioActivo.value) return contratosServicio.value.length
  return 0
}

function seleccionarServicio(key) {
  servicioActivo.value = key
  filtroServicio.value = ''
  if (key === 'ppa') cargar()
  else cargarServicio(key)
}

function formatFecha(f) {
  if (!f) return '—'
  return String(f).slice(0, 10)
}

function irAContrato(data) {
  router.push(`/contratos/${data.id}`)
}

let buscarTimeout = null
function buscar() {
  clearTimeout(buscarTimeout)
  buscarTimeout = setTimeout(cargar, 350)
}

let buscarServicioTimeout = null
function buscarServicio() {
  clearTimeout(buscarServicioTimeout)
  // client-side filter — no debounce needed, but keep consistent
}

function onContratoCreado() {
  cargar()
}

function onServicioCreado() {
  cargarServicio(servicioActivo.value)
}

async function cargar() {
  loading.value = true
  try {
    const params = {}
    if (filtroQ.value) params.q = filtroQ.value
    const { data } = await api.get('/ppa', { params })
    contratos.value = data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar contratos', detail: e.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

async function cargarServicio(tipo) {
  loadingServicio.value = true
  try {
    const { data } = await api.get('/contratos-servicio', { params: { tipo } })
    contratosServicio.value = data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar contratos', detail: e.message, life: 3000 })
  } finally {
    loadingServicio.value = false
  }
}

onMounted(cargar)
</script>
