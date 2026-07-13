<template>
  <div class="p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h1 class="text-xl font-semibold">Comercial — Pipeline</h1>
        <p class="text-sm text-gray-500">
          {{ oportunidades.length }} oportunidades
          <span v-if="numAlertas" class="text-red-600 font-medium">· {{ numAlertas }} requieren atención (＞{{ alertaDias }} días sin respuesta)</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <SelectButton v-model="vista" :options="VISTAS" optionLabel="label" optionValue="value" />
        <Button label="Nueva oportunidad" icon="pi pi-plus" @click="showNueva = true" />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <InputText v-model.trim="filtroTexto" placeholder="Buscar cliente / negocio…" class="w-64" />
      <Dropdown v-model="filtroServicio" :options="TIPOS_SERVICIO" optionLabel="label" optionValue="value"
                showClear placeholder="Tipo de servicio" class="w-56" />
      <MultiSelect v-if="vista === 'tabla'" v-model="filtroEstados" :options="ESTADOS" optionLabel="label"
                   optionValue="value" placeholder="Estados" class="w-56" />
      <div class="flex items-center gap-1">
        <Checkbox v-model="soloAlerta" binary inputId="soloAlerta" />
        <label for="soloAlerta" class="text-sm">Solo con alerta</label>
      </div>
    </div>

    <!-- ── Tablero kanban ─────────────────────────────────────────────── -->
    <div v-if="vista === 'tablero'" class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div v-for="col in ESTADOS" :key="col.value"
           class="bg-gray-50 rounded-lg p-2 min-h-[300px]"
           @dragover.prevent @drop="onDrop(col.value)">
        <div class="flex items-center justify-between px-2 py-1 mb-2">
          <span class="text-sm font-semibold uppercase tracking-wide" :class="col.clase">{{ col.label }}</span>
          <span class="text-xs text-gray-500">{{ porEstado(col.value).length }}</span>
        </div>
        <div v-for="op in visiblesEnColumna(col.value)" :key="op.id" draggable="true"
             class="bg-white border rounded-md p-3 mb-2 cursor-pointer shadow-sm hover:shadow"
             @dragstart="dragId = op.id" @click="irADetalle(op)">
          <div class="flex items-start justify-between gap-2">
            <span class="font-medium text-sm">{{ op.nombre }}</span>
            <Tag v-if="op.alerta" severity="danger" :value="`⚠ ${op.dias_sin_respuesta}d`" class="shrink-0" />
          </div>
          <div class="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
            <span v-for="c in chipsResumen(op)" :key="c"
                  class="inline-block bg-gray-100 rounded px-1.5 py-0.5">{{ c }}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            {{ op.num_proyectos }} proy. · {{ fmtKwp(op.capacidad_total_kwp) }}
          </div>
        </div>
        <button v-if="ocultasEnColumna(col.value) > 0" class="text-xs text-primary underline px-2"
                @click="vista = 'tabla'; filtroEstados = [col.value]">
          +{{ ocultasEnColumna(col.value) }} más — ver en tabla
        </button>
      </div>
    </div>

    <!-- ── Tabla ──────────────────────────────────────────────────────── -->
    <DataTable v-else :value="filas" paginator :rows="25" dataKey="id" class="text-sm"
               selectionMode="single" @row-click="irADetalle($event.data)">
      <Column field="nombre" header="Negocio / Cliente" sortable />
      <Column field="cliente_razon_social" header="Razón social" sortable />
      <Column header="Estado" sortable field="estado">
        <template #body="{ data }">
          <Tag :value="labelEstado(data.estado)" :severity="severidadEstado(data.estado)" />
        </template>
      </Column>
      <Column header="Ofertas">
        <template #body="{ data }">
          <span v-for="c in chipsResumen(data)" :key="c"
                class="inline-block bg-gray-100 rounded px-1.5 py-0.5 mr-1 text-xs">{{ c }}</span>
          <span v-if="!chipsResumen(data).length">—</span>
        </template>
      </Column>
      <Column field="num_proyectos" header="Proy." sortable />
      <Column header="Capacidad" field="capacidad_total_kwp" sortable>
        <template #body="{ data }">{{ fmtKwp(data.capacidad_total_kwp) }}</template>
      </Column>
      <Column field="dias_sin_respuesta" header="Días sin resp." sortable />
      <Column header="Alerta">
        <template #body="{ data }">
          <Tag v-if="data.alerta" severity="danger" :value="`⚠ ${data.dias_sin_respuesta}d`" />
        </template>
      </Column>
    </DataTable>

    <NuevaOportunidadDialog v-model:visible="showNueva" @creada="onCreada" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import Checkbox from 'primevue/checkbox'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import NuevaOportunidadDialog from './NuevaOportunidadDialog.vue'

const router = useRouter()
const toast = useToast()

const VISTAS = [
  { label: 'Tablero', value: 'tablero' },
  { label: 'Tabla', value: 'tabla' },
]
const ESTADOS = [
  { label: 'Prospección', value: 'prospeccion', clase: 'text-blue-700' },
  { label: 'Oferta', value: 'oferta', clase: 'text-amber-700' },
  { label: 'Negociación', value: 'negociacion', clase: 'text-purple-700' },
  { label: 'Servicio operativo', value: 'servicio_operativo', clase: 'text-green-700' },
]
const TIPOS_SERVICIO = [
  { label: 'Servicios operacionales', value: 'servicios_operacionales' },
  { label: 'Compra de energía', value: 'compra_energia' },
  { label: 'Comunidad energética', value: 'comunidad_energetica' },
]
// Etiquetas cortas para los chips-resumen de oferta en la tarjeta.
const TIPO_OFERTA_CORTO = {
  servicios_operacionales: 'Servicios',
  compra_energia: 'Energía',
  comunidad_energetica: 'Comunidad',
}
function chipsResumen(op) {
  const r = op.resumen_ofertas || {}
  return Object.keys(r).map(t => `${TIPO_OFERTA_CORTO[t] || t} ${r[t]}`)
}
// Tarjetas visibles por columna antes del "+N más" (solo afecta a Fin en la práctica).
const MAX_TARJETAS_COL = 15

const vista = ref('tablero')
const oportunidades = ref([])
const filas = ref([])           // ref plano para DataTable (convención PV4 del repo)
const alertaDias = ref(null)    // viene de /comercial/config — nunca asumir 5
const filtroTexto = ref('')
const filtroServicio = ref(null)
const filtroEstados = ref([])
const soloAlerta = ref(false)
const showNueva = ref(false)
const dragId = ref(null)

const numAlertas = computed(() => oportunidades.value.filter(o => o.alerta).length)

function filtradas() {
  const q = filtroTexto.value.toLowerCase()
  return oportunidades.value.filter(o => {
    if (q && !(`${o.nombre} ${o.cliente_razon_social}`.toLowerCase().includes(q))) return false
    if (filtroServicio.value && !(o.resumen_ofertas && o.resumen_ofertas[filtroServicio.value])) return false
    if (soloAlerta.value && !o.alerta) return false
    return true
  })
}
function porEstado(estado) { return filtradas().filter(o => o.estado === estado) }
function visiblesEnColumna(estado) { return porEstado(estado).slice(0, MAX_TARJETAS_COL) }
function ocultasEnColumna(estado) { return Math.max(0, porEstado(estado).length - MAX_TARJETAS_COL) }

watch([oportunidades, filtroTexto, filtroServicio, filtroEstados, soloAlerta], () => {
  let r = filtradas()
  if (filtroEstados.value.length) r = r.filter(o => filtroEstados.value.includes(o.estado))
  filas.value = r
}, { deep: true })

function labelEstado(v) { return ESTADOS.find(e => e.value === v)?.label ?? v }
function severidadEstado(v) {
  return { prospeccion: 'info', oferta: 'warn', negociacion: 'secondary', servicio_operativo: 'success' }[v] ?? 'info'
}
function labelServicio(v) { return TIPOS_SERVICIO.find(t => t.value === v)?.label }
function fmtKwp(v) { return v ? `${Number(v).toLocaleString('es-CO')} kWp` : '0 kWp' }
function irADetalle(op) { router.push(`/comercial/oportunidades/${op.id}`) }

async function cargar() {
  const [{ data: ops }, { data: cfg }] = await Promise.all([
    api.get('/comercial/oportunidades'),
    api.get('/comercial/config'),
  ])
  oportunidades.value = ops
  alertaDias.value = cfg.alerta_dias
}

async function onDrop(estadoDestino) {
  const op = oportunidades.value.find(o => o.id === dragId.value)
  dragId.value = null
  if (!op || op.estado === estadoDestino) return
  const estadoAnterior = op.estado
  op.estado = estadoDestino                       // optimista
  try {
    await api.post(`/comercial/oportunidades/${op.id}/estado`, { estado: estadoDestino })
    await cargar()                                // refresca días/alerta desde el server
  } catch (err) {
    op.estado = estadoAnterior                    // rollback visual
    toast.add({ severity: 'error', summary: 'No se pudo cambiar el estado', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}

function onCreada(op) { router.push(`/comercial/oportunidades/${op.id}`) }

onMounted(cargar)
</script>
