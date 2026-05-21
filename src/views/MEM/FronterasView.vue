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
        <Button icon="pi pi-chart-scatter" label="Diagrama Fasorial"
                @click="showFasorial = true"
                style="background: #915BD8; border-color: #915BD8;"
                class="whitespace-nowrap" />
      </div>
    </div>

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
        <Column field="quoia_meter_id" header="Medidor Quoia" style="min-width: 120px">
          <template #body="{ data }">
            <span v-if="data.quoia_meter_id" class="font-mono text-xs" style="color: #6b5a8a;">{{ data.quoia_meter_id }}</span>
            <span v-else class="text-xs" style="color: #c4b8d4;">—</span>
          </template>
        </Column>
        <Column field="operador_red" header="Operador" sortable style="min-width: 120px" />
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

        <!-- Título -->
        <div>
          <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Título / Identificación</label>
          <InputText v-model="fasorial.titulo" class="w-full" placeholder="Ej: GD Agustín 2 Principal" />
        </div>

        <!-- Tensiones -->
        <div>
          <p class="text-xs font-semibold uppercase mb-2" style="color: #6b5a8a;">Tensiones de fase (V)</p>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="(fase, i) in ['R', 'S', 'T']" :key="'v'+i">
              <label class="text-xs block mb-1 font-medium" :style="{ color: fasColors[i] }">Fase {{ fase }}</label>
              <InputText v-model.number="fasorial['vp'+(i+1)]" type="number" step="0.01" class="w-full" :placeholder="'V' + (i+1)" />
            </div>
          </div>
        </div>

        <!-- Corrientes -->
        <div>
          <p class="text-xs font-semibold uppercase mb-2" style="color: #6b5a8a;">Corrientes de fase (A)</p>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="(fase, i) in ['R', 'S', 'T']" :key="'c'+i">
              <label class="text-xs block mb-1 font-medium" :style="{ color: fasColorsC[i] }">Fase {{ fase }}</label>
              <InputText v-model.number="fasorial['cp'+(i+1)]" type="number" step="0.001" class="w-full" :placeholder="'I' + (i+1)" />
            </div>
          </div>
        </div>

        <!-- Alerta si faltan datos -->
        <p v-if="fasorialError" class="text-xs rounded-lg px-3 py-2"
           style="background: rgba(214,68,85,0.08); color: #D64455; border: 1px solid rgba(214,68,85,0.2);">
          {{ fasorialError }}
        </p>
      </div>

      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="showFasorial = false" />
        <Button icon="pi pi-download" label="Generar y Descargar"
                :loading="generandoFasorial" @click="generarFasorial"
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
import { ref, computed, onMounted } from 'vue'
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

const fasorial = ref({
  titulo: '',
  vp1: null, vp2: null, vp3: null,
  cp1: null, cp2: null, cp3: null,
})

async function generarFasorial() {
  fasorialError.value = ''
  const f = fasorial.value
  if (!f.titulo?.trim()) { fasorialError.value = 'El título es obligatorio.'; return }
  const nums = [f.vp1, f.vp2, f.vp3, f.cp1, f.cp2, f.cp3]
  if (nums.some(v => v === null || v === '' || isNaN(Number(v)) || Number(v) <= 0)) {
    fasorialError.value = 'Todos los valores de tensión y corriente deben ser mayores a 0.'
    return
  }
  generandoFasorial.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/v1/fronteras/fasorial/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        titulo: f.titulo.trim(),
        vp1: Number(f.vp1), vp2: Number(f.vp2), vp3: Number(f.vp3),
        cp1: Number(f.cp1), cp2: Number(f.cp2), cp3: Number(f.cp3),
      }),
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
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
      (f.municipio || '').toLowerCase().includes(s) ||
      (f.quoia_meter_id || '').toLowerCase().includes(s)
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
