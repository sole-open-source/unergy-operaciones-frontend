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
        <SelectButton v-model="vista" :options="VISTAS" optionLabel="label" optionValue="value" :allowEmpty="false" />
        <Button label="Nueva oportunidad" icon="pi pi-plus" @click="showNueva = true" />
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4">
      <InputText v-model.trim="filtroTexto" placeholder="Buscar código / cliente / negocio…" class="w-72" />
      <Dropdown v-model="filtroServicio" :options="TIPOS_SERVICIO" optionLabel="label" optionValue="value"
                showClear placeholder="Tipo de servicio" class="w-56" />
      <MultiSelect v-if="vista === 'tabla'" v-model="filtroEstados" :options="ESTADOS" optionLabel="label"
                   optionValue="value" placeholder="Estados" class="w-56" />
      <SelectButton v-if="vista === 'tabla'" v-model="orden" :options="ORDENES" optionLabel="label" optionValue="value" :allowEmpty="false" />
      <div class="flex items-center gap-1">
        <Checkbox v-model="soloAlerta" binary inputId="soloAlerta" />
        <label for="soloAlerta" class="text-sm">Solo con alerta</label>
      </div>
    </div>

    <!-- ── Tabla de oportunidades (expandible a sus ofertas) ─────────────── -->
    <DataTable v-if="vista === 'tabla'" :value="filas" v-model:expandedRows="expandedRows"
               paginator :rows="25" dataKey="id" class="text-sm" removableSort
               selectionMode="single" @row-click="irADetalle($event.data)" @row-expand="onExpand">
      <Column expander style="width:3rem" />
      <Column field="codigo_seguimiento" header="Código de seguimiento" sortable>
        <template #body="{ data }">
          <span class="font-mono text-xs">{{ data.codigo_seguimiento || '—' }}</span>
          <span v-if="data.num_ofertas > 1" class="text-gray-400 text-xs"> +{{ data.num_ofertas - 1 }}</span>
        </template>
      </Column>
      <Column field="estado" header="Estado" sortable>
        <template #body="{ data }">
          <Tag :value="labelEstado(data.estado)" :severity="severidadEstado(data.estado)" />
        </template>
      </Column>
      <Column field="cliente_razon_social" header="Cliente" sortable />
      <Column field="oferta_principal.planta_nombre" header="Proyecto / Planta" sortable>
        <template #body="{ data }">{{ data.oferta_principal?.planta_nombre || '—' }}</template>
      </Column>
      <Column field="num_ofertas" header="Ofertas" sortable />
      <Column field="updated_at" header="Última actividad" sortable>
        <template #body="{ data }">{{ fmtFecha(data.updated_at) }}</template>
      </Column>
      <Column header="Alerta" style="width:6rem">
        <template #body="{ data }">
          <Tag v-if="data.alerta" severity="danger" :value="`⚠ ${data.dias_sin_respuesta}d`" />
        </template>
      </Column>

      <!-- Detalle expandido: las ofertas de la oportunidad, cada una con su código -->
      <template #expansion="{ data }">
        <div class="p-3 bg-gray-50">
          <div v-if="cargandoOfertas[data.id]" class="text-xs text-gray-400">Cargando ofertas…</div>
          <DataTable v-else :value="ofertasPorOp[data.id] || []" class="text-xs" dataKey="id"
                     selectionMode="single" @row-click="irADetalle(data)">
            <Column header="Código de seguimiento">
              <template #body="{ data: of }"><span class="font-mono">{{ of.codigo_seguimiento || of.numero_oferta || '—' }}</span></template>
            </Column>
            <Column header="Tipo">
              <template #body="{ data: of }">{{ labelTipoOferta(of.tipo) }}</template>
            </Column>
            <Column header="Planta"><template #body="{ data: of }">{{ of.planta_nombre || '—' }}</template></Column>
            <Column header="Resultado">
              <template #body="{ data: of }"><Tag :value="labelResultado(of.resultado)" :severity="sevResultado(of.resultado)" /></template>
            </Column>
            <Column header="Precio"><template #body="{ data: of }">{{ of.precio_detalle || '—' }}</template></Column>
            <template #empty><span class="text-gray-400">Sin ofertas — abre la oportunidad para agregar una.</span></template>
          </DataTable>
        </div>
      </template>
    </DataTable>

    <!-- ── Tablero kanban (6 estados) ────────────────────────────────────── -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <div v-for="col in ESTADOS" :key="col.value"
           class="bg-gray-50 rounded-lg p-2 min-h-[300px]"
           @dragover.prevent @drop="onDrop(col.value)">
        <div class="flex items-center justify-between px-2 py-1 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wide" :class="col.clase">{{ col.label }}</span>
          <span class="text-xs text-gray-500">{{ porEstado(col.value).length }}</span>
        </div>
        <div v-for="op in visiblesEnColumna(col.value)" :key="op.id" draggable="true"
             class="bg-white border rounded-md p-3 mb-2 cursor-pointer shadow-sm hover:shadow"
             @dragstart="dragId = op.id" @click="irADetalle(op)">
          <div class="flex items-start justify-between gap-2">
            <span class="font-medium text-sm">{{ op.nombre }}</span>
            <Tag v-if="op.alerta" severity="danger" :value="`⚠ ${op.dias_sin_respuesta}d`" class="shrink-0" />
          </div>
          <div v-if="op.codigo_seguimiento" class="text-[11px] font-mono text-gray-500 mt-0.5">{{ op.codigo_seguimiento }}</div>
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
// Pipeline de 6 estados a nivel oportunidad (2026-07-15).
const ESTADOS = [
  { label: 'Prospección', value: 'prospeccion', clase: 'text-blue-700' },
  { label: 'Envío de oferta', value: 'envio_oferta', clase: 'text-amber-700' },
  { label: 'Negociación del contrato', value: 'negociacion_contrato', clase: 'text-purple-700' },
  { label: 'Firmado', value: 'firmado', clase: 'text-teal-700' },
  { label: 'Operando', value: 'operando', clase: 'text-green-700' },
  { label: 'Declinado', value: 'declinado', clase: 'text-red-700' },
]
const TIPOS_SERVICIO = [
  { label: 'Servicios operacionales', value: 'servicios_operacionales' },
  { label: 'Compra de energía', value: 'compra_energia' },
  { label: 'Comunidad energética', value: 'comunidad_energetica' },
]
const TIPO_OFERTA_CORTO = {
  servicios_operacionales: 'Servicios',
  compra_energia: 'Energía',
  comunidad_energetica: 'Comunidad',
}
const RESULTADOS = { pendiente: 'Pendiente', aceptado: 'Aceptado', declinado: 'Declinado' }
function chipsResumen(op) {
  const r = op.resumen_ofertas || {}
  return Object.keys(r).map(t => `${TIPO_OFERTA_CORTO[t] || t} ${r[t]}`)
}
const MAX_TARJETAS_COL = 15

const vista = ref('tabla')
const orden = ref('reciente')
const oportunidades = ref([])
const filas = ref([])
const alertaDias = ref(null)
const filtroTexto = ref('')
const filtroServicio = ref(null)
const filtroEstados = ref([])
const soloAlerta = ref(false)
const showNueva = ref(false)
const dragId = ref(null)
const expandedRows = ref([])
const ofertasPorOp = ref({})
const cargandoOfertas = ref({})

const numAlertas = computed(() => oportunidades.value.filter(o => o.alerta).length)

function filtradas() {
  const q = filtroTexto.value.toLowerCase()
  return oportunidades.value.filter(o => {
    if (q && !(`${o.nombre} ${o.cliente_razon_social} ${o.codigo_seguimiento || ''}`.toLowerCase().includes(q))) return false
    if (filtroServicio.value && !(o.resumen_ofertas && o.resumen_ofertas[filtroServicio.value])) return false
    if (soloAlerta.value && !o.alerta) return false
    return true
  })
}
function porEstado(estado) { return filtradas().filter(o => o.estado === estado) }
function visiblesEnColumna(estado) { return porEstado(estado).slice(0, MAX_TARJETAS_COL) }
function ocultasEnColumna(estado) { return Math.max(0, porEstado(estado).length - MAX_TARJETAS_COL) }

function fmtTs(v) { return v ? new Date(v).getTime() : 0 }
watch([oportunidades, filtroTexto, filtroServicio, filtroEstados, soloAlerta, orden], () => {
  let r = filtradas()
  if (filtroEstados.value.length) r = r.filter(o => filtroEstados.value.includes(o.estado))
  r = [...r].sort((a, b) => orden.value === 'reciente'
    ? fmtTs(b.updated_at) - fmtTs(a.updated_at)
    : fmtTs(a.updated_at) - fmtTs(b.updated_at))
  filas.value = r
}, { deep: true })

function labelEstado(v) { return ESTADOS.find(e => e.value === v)?.label ?? v }
function severidadEstado(v) {
  return {
    prospeccion: 'info', envio_oferta: 'warn', negociacion_contrato: 'secondary',
    firmado: 'contrast', operando: 'success', declinado: 'danger',
  }[v] ?? 'info'
}
function labelTipoOferta(v) { return TIPOS_SERVICIO.find(t => t.value === v)?.label ?? v }
function labelResultado(v) { return RESULTADOS[v] ?? v }
function sevResultado(v) { return { aceptado: 'success', declinado: 'danger', pendiente: 'warn' }[v] ?? 'secondary' }
function fmtKwp(v) { return v ? `${Number(v).toLocaleString('es-CO')} kWp` : '0 kWp' }
function fmtFecha(v) { return v ? new Date(v).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—' }
function irADetalle(op) { router.push(`/comercial/oportunidades/${op.id}`) }

async function onExpand(event) {
  const id = event.data.id
  if (ofertasPorOp.value[id]) return
  cargandoOfertas.value = { ...cargandoOfertas.value, [id]: true }
  try {
    const { data } = await api.get(`/comercial/oportunidades/${id}/ofertas`)
    ofertasPorOp.value = { ...ofertasPorOp.value, [id]: data }
  } catch {
    ofertasPorOp.value = { ...ofertasPorOp.value, [id]: [] }
  } finally {
    cargandoOfertas.value = { ...cargandoOfertas.value, [id]: false }
  }
}

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
  op.estado = estadoDestino
  try {
    await api.post(`/comercial/oportunidades/${op.id}/estado`, { estado: estadoDestino })
    await cargar()
  } catch (err) {
    op.estado = estadoAnterior
    toast.add({ severity: 'error', summary: 'No se pudo cambiar el estado', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}

function onCreada(op) { router.push(`/comercial/oportunidades/${op.id}`) }

cargar()
</script>
