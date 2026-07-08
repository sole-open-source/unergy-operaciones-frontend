<template>
  <div class="space-y-5">
    <!-- Header -->
    <PageHeader title="Fronteras Comerciales" :subtitle="`${filteredFronteras.length} fronteras registradas`">
      <template #actions>
        <span class="p-input-icon-left flex-1 sm:flex-none">
          <i class="pi pi-search" />
          <InputText v-model="search" placeholder="Buscar frontera..." class="w-full sm:w-64" />
        </span>
        <Dropdown v-model="estadoFilter" :options="estadoOptions" optionLabel="label" optionValue="value"
                  placeholder="Estado" class="w-40" showClear />
        <Dropdown v-model="proyectoFilter" :options="proyectoOptions" optionLabel="label" optionValue="value"
                  placeholder="Proyecto" class="w-48" showClear filter />
        <Dropdown v-model="operadorFilter" :options="operadorOptions" optionLabel="label" optionValue="value"
                  placeholder="Operador" class="w-40" showClear />
        <Button icon="pi pi-chart-scatter" label="Diagrama Fasorial" size="small"
                @click="showFasorial = true"
                style="background: #915BD8; border-color: #915BD8;"
                class="whitespace-nowrap" />
      </template>
    </PageHeader>

    <!-- Resumen Card -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
        <Column header="Est. Operacional" style="min-width: 130px">
          <template #body="{ data }">
            <span v-if="data.estado_operacional"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              :style="opStyle(data.estado_operacional)">
              {{ opLabel(data.estado_operacional) }}
            </span>
            <span v-else class="text-xs" style="color: #9b89b5;">—</span>
          </template>
        </Column>
        <Column field="nro_serie_med_ppal" header="Serial Medidor Principal" style="min-width: 170px">
          <template #body="{ data }">
            <span v-if="data.nro_serie_med_ppal" class="font-mono text-xs" style="color: #6b5a8a;">{{ data.nro_serie_med_ppal }}</span>
            <span v-else class="text-xs" style="color: #c4b8d4;">—</span>
          </template>
        </Column>
        <Column field="nro_serie_med_resp" header="Serial Medidor Respaldo" style="min-width: 170px">
          <template #body="{ data }">
            <span v-if="data.nro_serie_med_resp" class="font-mono text-xs" style="color: #6b5a8a;">{{ data.nro_serie_med_resp }}</span>
            <span v-else class="text-xs" style="color: #c4b8d4;">—</span>
          </template>
        </Column>
        <Column field="operador_comercial" header="Operador" sortable style="min-width: 120px">
          <template #body="{ data }">
            {{ data.operador_comercial || data.operador_red || '—' }}
          </template>
        </Column>
        <Column field="capacidad_efectiva_mw" header="Cap. MW" sortable style="min-width: 100px">
          <template #body="{ data }">
            {{ data.capacidad_efectiva_mw ? Number(data.capacidad_efectiva_mw).toFixed(3) : '—' }}
          </template>
        </Column>
        <Column field="municipio" header="Municipio" sortable style="min-width: 130px" />
        <Column header="" style="width: 90px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
              @click="editFrontera(data)" v-tooltip="'Editar'" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger"
              @click="deleteFrontera(data)" v-tooltip="'Eliminar'" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Diagrama Fasorial Dialog -->
    <Dialog v-model:visible="showFasorial" header="Diagrama Fasorial — Sistema Trifásico"
      modal class="w-full max-w-lg">
      <div class="space-y-5 pt-2">

        <!-- Selector de proyecto / medidor (Quoia) -->
        <div>
          <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Proyecto / Medidor (Quoia)</label>
          <Dropdown
            v-model="selectedMeterId"
            :options="meters"
            optionLabel="name"
            optionValue="id"
            :loading="metersLoading"
            filter
            showClear
            placeholder="Busca y selecciona un proyecto..."
            class="w-full"
            @change="onMeterChange" />
          <p class="text-xs mt-1" style="color: #9b89b5;">
            Las tensiones y corrientes se obtienen automáticamente de la última lectura del medidor.
          </p>
        </div>

        <!-- Título -->
        <div>
          <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Título / Identificación</label>
          <InputText v-model="fasorial.titulo" class="w-full" placeholder="Ej: GD Agustín 2 Principal" />
        </div>

        <!-- Cargando lectura desde Quoia -->
        <div v-if="lecturaLoading" class="flex items-center justify-center gap-2 py-6" style="color: #915BD8;">
          <i class="pi pi-spin pi-spinner text-xl" />
          <span class="text-sm">Consultando Quoia…</span>
        </div>

        <!-- Valores obtenidos (solo lectura) -->
        <template v-else-if="lecturaLoaded">
          <!-- Tensiones -->
          <div>
            <p class="text-xs font-semibold uppercase mb-2" style="color: #6b5a8a;">Tensiones de fase (V)</p>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="(fase, i) in ['R', 'S', 'T']" :key="'v'+i">
                <label class="text-xs block mb-1 font-medium" :style="{ color: fasColors[i] }">Fase {{ fase }}</label>
                <InputText :modelValue="fmtValor(fasorial['vp'+(i+1)])" readonly class="w-full text-center" />
              </div>
            </div>
          </div>

          <!-- Corrientes -->
          <div>
            <p class="text-xs font-semibold uppercase mb-2" style="color: #6b5a8a;">Corrientes de fase (A)</p>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="(fase, i) in ['R', 'S', 'T']" :key="'c'+i">
                <label class="text-xs block mb-1 font-medium" :style="{ color: fasColorsC[i] }">Fase {{ fase }}</label>
                <InputText :modelValue="fmtValor(fasorial['cp'+(i+1)])" readonly class="w-full text-center" />
              </div>
            </div>
          </div>

          <p v-if="ultimaLectura" class="text-xs" style="color: #9b89b5;">
            <i class="pi pi-clock text-xs mr-1" />Última lectura: {{ fmtFecha(ultimaLectura) }}
          </p>
        </template>

        <!-- Alerta si faltan datos o hay error -->
        <p v-if="fasorialError" class="text-xs rounded-lg px-3 py-2"
           style="background: rgba(214,68,85,0.08); color: #D64455; border: 1px solid rgba(214,68,85,0.2);">
          {{ fasorialError }}
        </p>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="showFasorial = false" />
        <Button icon="pi pi-download" label="Generar y Descargar"
                :loading="generandoFasorial" :disabled="!fasorialReady"
                @click="generarFasorial"
                style="background: #915BD8; border-color: #915BD8;" />
      </template>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog v-model:visible="showEdit" :header="editingFrontera ? 'Editar Frontera' : 'Frontera'"
      modal class="w-full max-w-lg">
      <div v-if="editForm" class="space-y-4 pt-2">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Código frontera</label>
            <InputText v-model="editForm.codigo_frontera" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Nombre</label>
            <InputText v-model="editForm.nombre_frontera" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Estado</label>
            <Dropdown v-model="editForm.estado" :options="estadoOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Estado operacional</label>
            <Dropdown v-model="editForm.estado_operacional" :options="opOptions" optionLabel="label" optionValue="value"
              class="w-full" showClear />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Medidor Quoia ID</label>
            <InputText v-model="editForm.quoia_meter_id" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Operador red</label>
            <InputText v-model="editForm.operador_red" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="showEdit = false" />
        <Button label="Guardar" :loading="saving" @click="saveFrontera" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import api from '@/api/client'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

// ── Fasorial ──────────────────────────────────────────────────────────────────
const fasColors  = ['#E84040', '#2ECC71', '#3B82F6']
const fasColorsC = ['#FF8C8C', '#7EEFC1', '#93C5FD']

const showFasorial      = ref(false)
const generandoFasorial = ref(false)
const fasorialError     = ref('')

// Selector de medidor (Quoia) + lectura automática
const meters          = ref([])
const metersLoading   = ref(false)
const selectedMeterId = ref(null)
const lecturaLoading  = ref(false)
const lecturaLoaded   = ref(false)
const ultimaLectura   = ref(null)

const fasorial = ref({
  titulo: '',
  vp1: null, vp2: null, vp3: null,
  cp1: null, cp2: null, cp3: null,
})

// Listo para generar: hay lectura cargada, los 6 valores son numéricos y no
// negativos, y hay al menos una tensión y una corriente > 0 (evita el diagrama
// degenerado / división por cero en el backend).
const fasorialReady = computed(() => {
  if (!lecturaLoaded.value) return false
  const f = fasorial.value
  const vp = [f.vp1, f.vp2, f.vp3].map(Number)
  const cp = [f.cp1, f.cp2, f.cp3].map(Number)
  const validos = [...vp, ...cp].every(v => Number.isFinite(v) && v >= 0)
  return validos && Math.max(...vp) > 0 && Math.max(...cp) > 0
})

function fmtValor(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('es-CO', { maximumFractionDigits: 3 })
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO')
}

function resetLectura() {
  fasorial.value.vp1 = fasorial.value.vp2 = fasorial.value.vp3 = null
  fasorial.value.cp1 = fasorial.value.cp2 = fasorial.value.cp3 = null
  ultimaLectura.value = null
  lecturaLoaded.value = false
}

async function loadMeters() {
  if (meters.value.length || metersLoading.value) return
  metersLoading.value = true
  try {
    // Nodos/medidores desde Gaia (JWT) — el backend ya los ordena por nombre.
    const { data } = await api.get('/fronteras/fasorial/nodos')
    meters.value = data.nodos || []
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la lista de medidores de Quoia.', life: 4000 })
  } finally {
    metersLoading.value = false
  }
}

async function onMeterChange() {
  fasorialError.value = ''
  resetLectura()
  if (!selectedMeterId.value) { fasorial.value.titulo = ''; return }
  const meter = meters.value.find(m => m.id === selectedMeterId.value)
  fasorial.value.titulo = meter?.name || ''
  lecturaLoading.value = true
  try {
    const { data } = await api.get(`/fronteras/fasorial/lectura/${selectedMeterId.value}`)
    fasorial.value.vp1 = data.vp1; fasorial.value.vp2 = data.vp2; fasorial.value.vp3 = data.vp3
    fasorial.value.cp1 = data.cp1; fasorial.value.cp2 = data.cp2; fasorial.value.cp3 = data.cp3
    ultimaLectura.value = data.last_time
    lecturaLoaded.value = true
    if (!fasorialReady.value) {
      fasorialError.value = 'El medidor no tiene una lectura válida de tensión/corriente para generar el diagrama.'
    }
  } catch (e) {
    fasorialError.value = e.response?.status === 422
      ? 'No fue posible obtener la información del medidor.'
      : 'Error al consultar la información del medidor en Quoia.'
  } finally {
    lecturaLoading.value = false
  }
}

// Al abrir el diálogo: cargar medidores y limpiar cualquier estado previo
watch(showFasorial, (open) => {
  if (!open) return
  loadMeters()
  selectedMeterId.value = null
  fasorial.value.titulo = ''
  fasorialError.value = ''
  resetLectura()
})

async function generarFasorial() {
  fasorialError.value = ''
  const f = fasorial.value
  if (!selectedMeterId.value) { fasorialError.value = 'Selecciona un proyecto / medidor.'; return }
  if (!f.titulo?.trim()) { fasorialError.value = 'El título es obligatorio.'; return }
  if (!fasorialReady.value) {
    fasorialError.value = 'No hay datos válidos del medidor para generar el diagrama.'
    return
  }
  generandoFasorial.value = true
  try {
    const response = await api.post('/fronteras/fasorial/generar', {
      titulo: f.titulo.trim(),
      vp1: Number(f.vp1), vp2: Number(f.vp2), vp3: Number(f.vp3),
      cp1: Number(f.cp1), cp2: Number(f.cp2), cp3: Number(f.cp3),
    }, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const a   = document.createElement('a')
    a.href    = url
    a.download = f.titulo.trim().replace(/\s+/g, '_').replace(/\//g, '-') + '_Fasorial.jpg'
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ severity: 'success', summary: 'Diagrama generado', detail: 'El JPG se descargó correctamente.', life: 3000 })
    showFasorial.value = false
  } catch (e) {
    fasorialError.value = 'No se pudo generar el diagrama. Verifica la conexión con el servidor.'
    toast.add({ severity: 'error', summary: 'Error', detail: fasorialError.value, life: 4000 })
  } finally {
    generandoFasorial.value = false
  }
}

const toast = useToast()
const confirm = useConfirm()

const fronteras = ref([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const estadoFilter = ref(null)
const proyectoFilter = ref(null)
const operadorFilter = ref(null)
const showEdit = ref(false)
const editingFrontera = ref(null)
const editForm = ref(null)

const estadoOptions = [
  { label: 'Activa', value: 'activa' },
  { label: 'En registro', value: 'en_registro' },
  { label: 'En falla', value: 'en_falla' },
  { label: 'Cancelada', value: 'cancelada' },
]

const opOptions = [
  { label: 'Normal', value: 'normal' },
  { label: 'Degradada', value: 'degradada' },
  { label: 'Sin datos', value: 'sin_datos' },
  { label: 'Fuera de servicio', value: 'fuera_servicio' },
]

const proyectoOptions = computed(() => {
  const seen = new Map()
  for (const f of fronteras.value) {
    if (f.proyecto_id != null && !seen.has(f.proyecto_id)) {
      seen.set(f.proyecto_id, f.proyecto_nombre || `#${f.proyecto_id}`)
    }
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const operadorOptions = computed(() => {
  const seen = new Set()
  for (const f of fronteras.value) {
    const nombre = f.operador_comercial || f.operador_red
    if (nombre) seen.add(nombre)
  }
  return [...seen].sort().map(v => ({ label: v, value: v }))
})

const filteredFronteras = computed(() => {
  let list = fronteras.value
  if (estadoFilter.value) list = list.filter(f => f.estado === estadoFilter.value)
  if (proyectoFilter.value) list = list.filter(f => f.proyecto_id === proyectoFilter.value)
  if (operadorFilter.value) list = list.filter(f => (f.operador_comercial || f.operador_red) === operadorFilter.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    list = list.filter(f =>
      (f.codigo_frontera || '').toLowerCase().includes(s) ||
      (f.nombre_frontera || '').toLowerCase().includes(s) ||
      (f.proyecto_nombre || '').toLowerCase().includes(s) ||
      (f.operador_red || '').toLowerCase().includes(s) ||
      (f.operador_comercial || '').toLowerCase().includes(s) ||
      (f.municipio || '').toLowerCase().includes(s) ||
      String(f.quoia_meter_id ?? '').toLowerCase().includes(s)
    )
  }
  return list
})

const stats = computed(() => {
  const all = fronteras.value
  const sinDatos = all.filter(f => f.estado_operacional === 'sin_datos' || (!f.quoia_meter_id && f.estado === 'activa')).length
  return [
    { label: 'Total', value: all.length, color: '#2C2039' },
    { label: 'Activas', value: all.filter(f => f.estado === 'activa').length, color: '#10B981' },
    { label: 'En registro', value: all.filter(f => f.estado === 'en_registro').length, color: '#F0C040' },
    { label: 'Cap. total MW', value: all.reduce((s, f) => s + (Number(f.capacidad_efectiva_mw) || 0), 0).toFixed(1), color: '#915BD8' },
    { label: 'Sin datos', value: sinDatos, color: sinDatos > 0 ? '#D64455' : '#10B981' },
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

function opLabel(v) {
  const map = { normal: 'Normal', degradada: 'Degradada', sin_datos: 'Sin datos', fuera_servicio: 'Fuera de servicio' }
  return map[v] || v
}
function opStyle(v) {
  const map = {
    normal: 'background: rgba(16,185,129,0.12); color: #10B981;',
    degradada: 'background: rgba(240,192,64,0.12); color: #CA8A04;',
    sin_datos: 'background: rgba(214,68,85,0.12); color: #D64455;',
    fuera_servicio: 'background: rgba(156,163,175,0.12); color: #6B7280;',
  }
  return map[v] || 'color: #6b5a8a;'
}

function editFrontera(f) {
  editingFrontera.value = f
  editForm.value = {
    codigo_frontera: f.codigo_frontera,
    nombre_frontera: f.nombre_frontera,
    estado: f.estado,
    estado_operacional: f.estado_operacional || null,
    quoia_meter_id: f.quoia_meter_id || '',
    operador_red: f.operador_red || '',
  }
  showEdit.value = true
}

async function saveFrontera() {
  if (!editingFrontera.value || !editForm.value) return
  saving.value = true
  try {
    await api.patch(`/fronteras/${editingFrontera.value.id}`, editForm.value)
    toast.add({ severity: 'success', summary: 'Frontera actualizada', life: 2000 })
    showEdit.value = false
    await loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'Error al guardar', life: 4000 })
  } finally {
    saving.value = false
  }
}

function deleteFrontera(f) {
  confirm.require({
    message: `¿Eliminar la frontera ${f.codigo_frontera}? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: async () => {
      try {
        await api.delete(`/fronteras/${f.id}`)
        toast.add({ severity: 'success', summary: 'Frontera eliminada', life: 2000 })
        await loadData()
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'Error al eliminar', life: 4000 })
      }
    },
  })
}

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/fronteras')
    fronteras.value = data
  } catch (e) {
    console.error('Error loading fronteras:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
