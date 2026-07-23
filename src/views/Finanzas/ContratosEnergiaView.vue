<template>
  <div class="space-y-4">
    <PageHeader title="Contratos de energía"
                subtitle="Contratos de energía · minigranjas y GD en operación">
      <template #actions>
        <Button label="Crear nuevo contrato de energía" icon="pi pi-plus" size="small"
                @click="abrirFormulario" />
      </template>
    </PageHeader>

    <!-- Filtro de búsqueda -->
    <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-end border" style="border-color:#ECE7F2">
      <div>
        <label class="field-label">Buscar</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" placeholder="Comercializador, proyecto, código…" class="w-72" />
        </IconField>
      </div>
      <div class="flex-1" />
      <div class="text-xs text-gray-400 self-center">
        {{ filtrados.length }} contrato{{ filtrados.length === 1 ? '' : 's' }}
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden border" style="border-color:#ECE7F2">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th v-for="col in COLUMNAS" :key="col.key"
                  class="px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap"
                  :class="col.center ? 'text-center' : 'text-left'">
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in filtrados" :key="i"
                class="border-t border-gray-100 hover:bg-gray-50/70 transition-colors duration-100">
              <td class="px-4 py-2 whitespace-nowrap">{{ fmtFecha(row.fecha_desde) }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ fmtFecha(row.fecha_hasta) }}</td>
              <td class="px-4 py-2 font-mono text-xs text-gray-500">{{ row.codigo || '—' }}</td>
              <td class="px-4 py-2">{{ row.comercializador || '—' }}</td>
              <td class="px-4 py-2">{{ (row.proyectos || []).join(', ') || '—' }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ LABEL_TIPO_CONTRATO[row.tipo_contrato] || row.tipo_contrato || '—' }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ LABEL_TIPO_TARIFA[row.tipo_tarifa] || row.tipo_tarifa || '—' }}</td>
              <td class="px-4 py-2 text-right font-mono text-xs">{{ row.porcentaje ?? '—' }}</td>
              <td class="px-4 py-2 text-center">
                <i v-if="row.tiene_precio_energia" class="pi pi-check-circle" style="color:#10B981" />
                <i v-else class="pi pi-times-circle" style="color:#D64455" />
              </td>
            </tr>
            <tr v-if="!filtrados.length">
              <td :colspan="COLUMNAS.length" class="px-4 py-12 text-center text-sm text-gray-400">
                <i class="pi pi-file text-2xl mb-2 block text-gray-300" />
                Aún no hay contratos de energía.<br>
                <span class="text-xs">La carga de datos se conectará a la API próximamente.</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Dialog: nuevo contrato de energía -->
    <Dialog v-model:visible="formVisible" header="Nuevo contrato de energía" modal
            class="w-full max-w-3xl" :dismissableMask="false">
      <form @submit.prevent="guardar" class="space-y-5 pt-1">
        <!-- Datos del contrato -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="field-label">Fecha desde *</label>
            <DatePicker v-model="f.fecha_desde" dateFormat="yy-mm-dd" showIcon class="w-full" placeholder="Seleccionar" />
          </div>
          <div>
            <label class="field-label">Fecha hasta *</label>
            <DatePicker v-model="f.fecha_hasta" dateFormat="yy-mm-dd" showIcon showClear class="w-full" placeholder="Seleccionar" />
          </div>

          <div>
            <label class="field-label">Código</label>
            <InputText v-model="f.codigo" class="w-full" placeholder="ej: 90060" />
          </div>
          <div>
            <label class="field-label">Comercializador</label>
            <InputText v-model="f.comercializador" class="w-full" placeholder="ej: UNERGY ENERGIA DIGITAL S.A.S ESP" />
          </div>

          <div>
            <label class="field-label">Tipo de contrato *</label>
            <Select v-model="f.tipo_contrato" :options="TIPOS_CONTRATO" optionLabel="label" optionValue="value"
                    class="w-full" placeholder="Seleccionar" />
          </div>
          <div>
            <label class="field-label">Tipo de tarifa *</label>
            <Select v-model="f.tipo_tarifa" :options="tarifasDisponibles" optionLabel="label" optionValue="value"
                    class="w-full" placeholder="Seleccionar" />
          </div>

          <div>
            <label class="field-label">Porcentaje</label>
            <InputNumber v-model="f.porcentaje" :maxFractionDigits="2" :useGrouping="false" class="w-full" placeholder="ej: 1.0" />
          </div>
        </div>

        <!-- Notas de validación -->
        <div class="rounded-lg px-3 py-2.5 space-y-1" style="background:#FBF7FF; border:1px solid #ECE0FB;">
          <p class="text-xs text-gray-600">
            <i class="pi pi-info-circle mr-1" style="color:#915BD8;" />
            Los contratos <b>'No Contract'</b> solo pueden tener tipo de tarifa <b>'Market'</b>.
          </p>
          <p class="text-xs text-gray-600">
            <i class="pi pi-info-circle mr-1" style="color:#915BD8;" />
            Los contratos <b>PPA</b> deben tener precio de energía definido. Los contratos <b>Market</b> NO deben tener precio de energía.
          </p>
        </div>

        <!-- Proyectos del contrato -->
        <div class="border border-gray-200 rounded-lg p-4 space-y-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyectos del contrato</p>

          <div v-for="(linea, idx) in f.proyectos" :key="idx" class="grid grid-cols-12 gap-2 items-end">
            <div class="col-span-6">
              <label class="field-label">Proyecto</label>
              <Select v-model="linea.proyecto_id" :options="proyectosOptions" optionLabel="label" optionValue="id"
                      class="w-full" placeholder="Seleccionar" filter showClear />
            </div>
            <div class="col-span-5">
              <label class="field-label">Precio de energía</label>
              <Select v-model="linea.precio_energia_id" :options="preciosEnergiaOptions" optionLabel="label" optionValue="id"
                      class="w-full" placeholder="Seleccionar" showClear
                      v-tooltip.bottom="'Se conectará a la API próximamente'" />
            </div>
            <div class="col-span-1 flex justify-center pb-1">
              <Button icon="pi pi-times" text rounded severity="danger" size="small"
                      @click="quitarProyecto(idx)" v-tooltip="'Eliminar'" />
            </div>
          </div>

          <Button label="Agregar proyecto" icon="pi pi-plus" text size="small" @click="agregarProyecto" />
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" label="Cancelar" severity="secondary" @click="formVisible = false" />
          <Button type="submit" label="Guardar" icon="pi pi-check" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import { formatearNombreProyecto } from '@/views/Proyectos/proyectosUi'

const toast = useToast()

// ── Catálogos (estáticos por ahora; el guardado irá a otra API) ────────────────
const TIPOS_CONTRATO = [
  { value: 'plg', label: 'Plg' },
  { value: 'plc', label: 'Plc' },
  { value: 'no_contract', label: 'No Contract' },
]
const TIPOS_TARIFA = [
  { value: 'ppa', label: 'Ppa' },
  { value: 'market', label: 'Market' },
  { value: 'market_plus_benefits', label: 'Market Plus Benefits' },
]
const LABEL_TIPO_CONTRATO = Object.fromEntries(TIPOS_CONTRATO.map(t => [t.value, t.label]))
const LABEL_TIPO_TARIFA = Object.fromEntries(TIPOS_TARIFA.map(t => [t.value, t.label]))

const COLUMNAS = [
  { key: 'fecha_desde',        label: 'Fecha desde' },
  { key: 'fecha_hasta',        label: 'Fecha hasta' },
  { key: 'codigo',             label: 'Código' },
  { key: 'comercializador',    label: 'Comercializador' },
  { key: 'proyectos',          label: 'Proyectos' },
  { key: 'tipo_contrato',      label: 'Tipo de contrato' },
  { key: 'tipo_tarifa',        label: 'Tipo de tarifa' },
  { key: 'porcentaje',         label: 'Porcentaje' },
  { key: 'tiene_precio',       label: 'Tiene precio de energía', center: true },
]

// Filtro compartido con IDs proyectos: GD + minigranja, solo operativas.
const TIPOS_INCLUIDOS = ['gd', 'minigranja']
const ESTADO_OPERATIVA = 'en_operacion'

// ── Estado ─────────────────────────────────────────────────────────────────────
const q = ref('')
const contratos = ref([])          // se llenará con la API más adelante
const proyectos = ref([])
const preciosEnergiaOptions = ref([])  // se llenará con la API más adelante

const proyectosOptions = computed(() =>
  proyectos.value
    .filter(p => TIPOS_INCLUIDOS.includes(p.tipo_proyecto) && p.estado === ESTADO_OPERATIVA)
    .map(p => ({ id: p.id, label: formatearNombreProyecto(p.nombre_comercial) }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

const filtrados = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return contratos.value
  return contratos.value.filter(c =>
    [c.comercializador, c.codigo, ...(c.proyectos || [])]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(term))
  )
})

function fmtFecha(v) {
  if (!v) return '—'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

// ── Formulario ───────────────────────────────────────────────────────────────
const formVisible = ref(false)
const f = reactive({
  fecha_desde: null,
  fecha_hasta: null,
  codigo: '',
  comercializador: '',
  tipo_contrato: null,
  tipo_tarifa: null,
  porcentaje: null,
  proyectos: [{ proyecto_id: null, precio_energia_id: null }],
})

// 'No Contract' solo admite tarifa 'Market'.
const tarifasDisponibles = computed(() =>
  f.tipo_contrato === 'no_contract'
    ? TIPOS_TARIFA.filter(t => t.value === 'market')
    : TIPOS_TARIFA
)
watch(() => f.tipo_contrato, (nuevo) => {
  if (nuevo === 'no_contract') f.tipo_tarifa = 'market'
})

function abrirFormulario() {
  Object.assign(f, {
    fecha_desde: null, fecha_hasta: null, codigo: '', comercializador: '',
    tipo_contrato: null, tipo_tarifa: null, porcentaje: null,
    proyectos: [{ proyecto_id: null, precio_energia_id: null }],
  })
  formVisible.value = true
}
function agregarProyecto() {
  f.proyectos.push({ proyecto_id: null, precio_energia_id: null })
}
function quitarProyecto(idx) {
  f.proyectos.splice(idx, 1)
  if (!f.proyectos.length) agregarProyecto()
}

function guardar() {
  // La persistencia se conectará a otra API. Por ahora solo valida en cliente.
  if (!f.fecha_desde || !f.tipo_contrato || !f.tipo_tarifa) {
    toast.add({ severity: 'warn', summary: 'Faltan campos', detail: 'Completa fecha desde, tipo de contrato y tipo de tarifa.', life: 4000 })
    return
  }
  toast.add({
    severity: 'info',
    summary: 'Formulario listo',
    detail: 'El guardado se conectará a la API de contratos de energía próximamente.',
    life: 4500,
  })
  formVisible.value = false
}

// ── Carga ──────────────────────────────────────────────────────────────────────
async function load() {
  try {
    const { data } = await api.get('/proyectos', { params: { page: 1, size: 500 } })
    proyectos.value = data.items ?? data
  } catch { /* graceful degrade */ }
}
onMounted(load)
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
