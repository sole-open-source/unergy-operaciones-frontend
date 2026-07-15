<template>
  <div class="p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h1 class="text-xl font-semibold">Comercial — Ofertas</h1>
        <p class="text-sm text-gray-500">
          {{ ofertas.length }} ofertas
          <span v-if="numAlertas" class="text-red-600 font-medium">· {{ numAlertas }} requieren atención (＞{{ alertaDias }} días sin respuesta)</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <SelectButton v-model="vista" :options="VISTAS" optionLabel="label" optionValue="value" :allowEmpty="false" />
        <Button label="Nueva oportunidad" icon="pi pi-plus" @click="showNueva = true" />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <InputText v-model.trim="filtroTexto" placeholder="Buscar código / cliente / planta…" class="w-72" />
      <Dropdown v-model="filtroTipo" :options="TIPOS_OFERTA" optionLabel="label" optionValue="value"
                showClear placeholder="Tipo de oferta" class="w-52" />
      <MultiSelect v-if="vista === 'tabla'" v-model="filtroEstados" :options="ESTADOS" optionLabel="label"
                   optionValue="value" placeholder="Estado del pipeline" class="w-56" />
      <Dropdown v-model="filtroResultado" :options="RESULTADOS_OPT" optionLabel="label" optionValue="value"
                showClear placeholder="Resultado" class="w-44" />
      <SelectButton v-if="vista === 'tabla'" v-model="orden" :options="ORDENES" optionLabel="label" optionValue="value" :allowEmpty="false" />
      <div class="flex items-center gap-1">
        <Checkbox v-model="soloAlerta" binary inputId="soloAlerta" />
        <label for="soloAlerta" class="text-sm">Solo con alerta</label>
      </div>
    </div>

    <!-- ── Tabla plana de ofertas (la oferta es la unidad) ───────────────── -->
    <DataTable v-if="vista === 'tabla'" :value="filas" paginator :rows="30" dataKey="id" class="text-sm"
               removableSort selectionMode="single" @row-click="irADetalle($event.data)">
      <Column field="codigo_seguimiento" header="Código de seguimiento" sortable>
        <template #body="{ data }"><span class="font-mono text-xs">{{ data.codigo_seguimiento || data.numero_oferta || '—' }}</span></template>
      </Column>
      <Column field="estado" header="Estado" sortable>
        <template #body="{ data }"><Tag :value="labelEstado(data.estado)" :severity="severidadEstado(data.estado)" /></template>
      </Column>
      <Column field="tipo" header="Tipo" sortable>
        <template #body="{ data }">{{ labelTipoOferta(data.tipo) }}</template>
      </Column>
      <Column field="planta_nombre" header="Proyecto / Planta" sortable>
        <template #body="{ data }">{{ data.planta_nombre || '—' }}</template>
      </Column>
      <Column field="cliente_razon_social" header="Cliente" sortable />
      <Column field="resultado" header="Resultado" sortable>
        <template #body="{ data }"><Tag :value="labelResultado(data.resultado)" :severity="sevResultado(data.resultado)" /></template>
      </Column>
      <Column field="precio_detalle" header="Precio">
        <template #body="{ data }">{{ data.precio_detalle || '—' }}</template>
      </Column>
      <Column field="updated_at" header="Última actividad" sortable>
        <template #body="{ data }">{{ fmtFecha(data.updated_at) }}</template>
      </Column>
      <Column header="Alerta" style="width:5rem">
        <template #body="{ data }"><Tag v-if="data.alerta" severity="danger" :value="`⚠ ${data.dias_sin_respuesta}d`" /></template>
      </Column>
      <template #empty><span class="text-gray-400">No hay ofertas con esos filtros.</span></template>
    </DataTable>

    <!-- ── Tablero kanban por etapa (tarjetas = ofertas) ─────────────────── -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <div v-for="col in ESTADOS" :key="col.value"
           class="bg-gray-50 rounded-lg p-2 min-h-[300px]"
           @dragover.prevent @drop="onDrop(col.value)">
        <div class="flex items-center justify-between px-2 py-1 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wide" :class="col.clase">{{ col.label }}</span>
          <span class="text-xs text-gray-500">{{ porEstado(col.value).length }}</span>
        </div>
        <div v-for="of in visiblesEnColumna(col.value)" :key="of.id" draggable="true"
             class="bg-white border rounded-md p-3 mb-2 cursor-pointer shadow-sm hover:shadow"
             @dragstart="dragOpId = of.oportunidad_id" @click="irADetalle(of)">
          <div class="flex items-start justify-between gap-2">
            <span class="font-mono text-[11px] text-gray-600">{{ of.codigo_seguimiento || of.numero_oferta || '—' }}</span>
            <Tag v-if="of.alerta" severity="danger" :value="`⚠ ${of.dias_sin_respuesta}d`" class="shrink-0" />
          </div>
          <div class="font-medium text-sm mt-1">{{ of.planta_nombre || of.cliente_razon_social }}</div>
          <div class="text-xs text-gray-500">{{ of.cliente_razon_social }}</div>
          <div class="mt-1 flex items-center gap-1">
            <span class="text-[11px] bg-gray-100 rounded px-1.5 py-0.5">{{ labelTipoOferta(of.tipo) }}</span>
            <Tag :value="labelResultado(of.resultado)" :severity="sevResultado(of.resultado)" class="scale-90" />
          </div>
        </div>
        <button v-if="ocultasEnColumna(col.value) > 0" class="text-xs text-primary underline px-2"
                @click="vista = 'tabla'; filtroEstados = [col.value]">
          +{{ ocultasEnColumna(col.value) }} más — ver en tabla
        </button>
      </div>
    </div>

    <NuevaOportunidadDialog v-model:visible="showNueva" @creada="onCreada" />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
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
  { label: 'Tabla', value: 'tabla' },
  { label: 'Tablero', value: 'tablero' },
]
const ORDENES = [
  { label: 'Más reciente', value: 'reciente' },
  { label: 'Más antiguo', value: 'antiguo' },
]
// Pipeline de 6 estados (vive en la oportunidad; la oferta lo hereda para mostrarlo).
const ESTADOS = [
  { label: 'Prospección', value: 'prospeccion', clase: 'text-blue-700' },
  { label: 'Envío de oferta', value: 'envio_oferta', clase: 'text-amber-700' },
  { label: 'Negociación del contrato', value: 'negociacion_contrato', clase: 'text-purple-700' },
  { label: 'Firmado', value: 'firmado', clase: 'text-teal-700' },
  { label: 'Operando', value: 'operando', clase: 'text-green-700' },
  { label: 'Declinado', value: 'declinado', clase: 'text-red-700' },
]
const TIPOS_OFERTA = [
  { label: 'Servicios operacionales', value: 'servicios_operacionales' },
  { label: 'Compra de energía', value: 'compra_energia' },
  { label: 'Comunidad energética', value: 'comunidad_energetica' },
]
const RESULTADOS = { pendiente: 'Pendiente', aceptado: 'Aceptado', declinado: 'Declinado' }
const RESULTADOS_OPT = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Aceptado', value: 'aceptado' },
  { label: 'Declinado', value: 'declinado' },
]
const MAX_TARJETAS_COL = 20

const vista = ref('tabla')
const orden = ref('reciente')
const ofertas = ref([])
const filas = ref([])
const alertaDias = ref(null)
const filtroTexto = ref('')
const filtroTipo = ref(null)
const filtroEstados = ref([])
const filtroResultado = ref(null)
const soloAlerta = ref(false)
const showNueva = ref(false)
const dragOpId = ref(null)

// Alertas contadas por oportunidad (varias ofertas comparten la alerta del deal).
const numAlertas = computed(() =>
  new Set(ofertas.value.filter(o => o.alerta).map(o => o.oportunidad_id)).size)

function filtradas() {
  const q = filtroTexto.value.toLowerCase()
  return ofertas.value.filter(o => {
    if (q && !(`${o.codigo_seguimiento || ''} ${o.numero_oferta || ''} ${o.cliente_razon_social || ''} ${o.planta_nombre || ''} ${o.oportunidad_nombre || ''}`.toLowerCase().includes(q))) return false
    if (filtroTipo.value && o.tipo !== filtroTipo.value) return false
    if (filtroResultado.value && o.resultado !== filtroResultado.value) return false
    if (soloAlerta.value && !o.alerta) return false
    return true
  })
}
function porEstado(estado) { return filtradas().filter(o => o.estado === estado) }
function visiblesEnColumna(estado) { return porEstado(estado).slice(0, MAX_TARJETAS_COL) }
function ocultasEnColumna(estado) { return Math.max(0, porEstado(estado).length - MAX_TARJETAS_COL) }

function ts(v) { return v ? new Date(v).getTime() : 0 }
watch([ofertas, filtroTexto, filtroTipo, filtroEstados, filtroResultado, soloAlerta, orden], () => {
  let r = filtradas()
  if (filtroEstados.value.length) r = r.filter(o => filtroEstados.value.includes(o.estado))
  r = [...r].sort((a, b) => orden.value === 'reciente'
    ? ts(b.updated_at) - ts(a.updated_at)
    : ts(a.updated_at) - ts(b.updated_at))
  filas.value = r
}, { deep: true })

function labelEstado(v) { return ESTADOS.find(e => e.value === v)?.label ?? v }
function severidadEstado(v) {
  return {
    prospeccion: 'info', envio_oferta: 'warn', negociacion_contrato: 'secondary',
    firmado: 'contrast', operando: 'success', declinado: 'danger',
  }[v] ?? 'info'
}
function labelTipoOferta(v) { return TIPOS_OFERTA.find(t => t.value === v)?.label ?? v }
function labelResultado(v) { return RESULTADOS[v] ?? v }
function sevResultado(v) { return { aceptado: 'success', declinado: 'danger', pendiente: 'warn' }[v] ?? 'secondary' }
function fmtFecha(v) { return v ? new Date(v).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—' }
// La oferta se gestiona dentro de su oportunidad (pestaña Ofertas del detalle).
function irADetalle(of) { router.push(`/comercial/oportunidades/${of.oportunidad_id}`) }

async function cargar() {
  const [{ data: ofs }, { data: cfg }] = await Promise.all([
    api.get('/comercial/ofertas'),
    api.get('/comercial/config'),
  ])
  ofertas.value = ofs
  alertaDias.value = cfg.alerta_dias
}

async function onDrop(estadoDestino) {
  const opId = dragOpId.value
  dragOpId.value = null
  if (!opId) return
  const afectadas = ofertas.value.filter(o => o.oportunidad_id === opId)
  if (!afectadas.length || afectadas[0].estado === estadoDestino) return
  const previo = afectadas.map(o => [o, o.estado])
  afectadas.forEach(o => { o.estado = estadoDestino })   // optimista (toda la oportunidad)
  try {
    await api.post(`/comercial/oportunidades/${opId}/estado`, { estado: estadoDestino })
    await cargar()
  } catch (err) {
    previo.forEach(([o, e]) => { o.estado = e })
    toast.add({ severity: 'error', summary: 'No se pudo cambiar el estado', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}

function onCreada(op) { router.push(`/comercial/oportunidades/${op.id}`) }

cargar()
</script>
