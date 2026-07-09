<template>
  <div class="space-y-4" :class="{ 'p-4 sm:p-5': embedded }">
    <PageHeader v-if="!embedded" title="Liquidaciones">
      <template #actions>
        <Button label="Nueva liquidación" icon="pi pi-plus" size="small" @click="dialogNueva = true" />
      </template>
    </PageHeader>

    <!-- Barra: filtro por tipo (vía ?tipo=), búsqueda, aviso de espejo, acción -->
    <div class="flex items-center gap-3 flex-wrap">
      <span v-if="tipoLabel" class="text-sm font-semibold" style="color:#915BD8;">{{ tipoLabel }}</span>
      <RouterLink v-if="tipoLabel" to="/liquidaciones?tab=proyectos"
        class="text-xs hover:underline" style="color:#9b8fb0;">Ver todos</RouterLink>
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText v-model="q" placeholder="Buscar proyecto…" class="w-56" />
      </IconField>
      <Select v-model="estadoFiltro" :options="ESTADO_OPCIONES" optionLabel="label" optionValue="value"
        showClear placeholder="Estado" class="w-40" />
      <span class="text-[11px] ml-auto" style="color:#9b8fb0">
        Espejo del Panel Contable · edición en Panel Contable
      </span>
      <Button label="Nueva liquidación" icon="pi pi-plus" size="small" @click="dialogNueva = true" />
    </div>

    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <div v-else class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
      <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
        <h3 class="text-sm font-bold" style="color:#2C2039">Proyectos · {{ formatPeriodo(periodo) }}</h3>
        <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
          style="background:#F1EAF9; color:#6E3FB8">{{ proyectosFiltrados.length }}</span>
      </div>
      <DataTable :value="proyectosFiltrados" v-model:expandedRows="expandedRows" dataKey="panel_id"
        rowHover class="text-sm" :rows="25" paginator :alwaysShowPaginator="false">
        <template #empty>
          <div class="text-center py-8 text-sm text-gray-400">
            Sin paneles para este período/tipo. Cárgalos en Panel Contable.
          </div>
        </template>
        <Column expander style="width:3rem" />
        <Column field="proyecto" header="Proyecto" sortable />
        <Column header="Estado" style="width:110px">
          <template #body="{ data }">
            <Tag :value="data.estado === 'firmado' ? 'Firmado' : 'Pendiente'"
              :severity="data.estado === 'firmado' ? 'success' : 'warn'" class="text-[10px]" />
          </template>
        </Column>
        <Column header="Consec. Ing." style="width:100px">
          <template #body="{ data }"><span class="font-mono text-xs">{{ data.consecutivo_ingresos ?? '—' }}</span></template>
        </Column>
        <Column header="Consec. Cos." style="width:100px">
          <template #body="{ data }"><span class="font-mono text-xs">{{ data.consecutivo_costos ?? '—' }}</span></template>
        </Column>
        <Column header="Ingresos" style="width:120px">
          <template #body="{ data }"><span class="font-mono text-xs">{{ fmtCompact(data.ingresos_cop) }}</span></template>
        </Column>
        <Column header="Costos" style="width:110px">
          <template #body="{ data }"><span class="font-mono text-xs text-red-600">{{ fmtCompact(data.costos_cop) }}</span></template>
        </Column>
        <Column header="Valor a pagar" style="width:130px">
          <template #body="{ data }"><span class="font-mono text-xs font-semibold" style="color:#915BD8">{{ fmtCompact(data.valor_a_pagar_total) }}</span></template>
        </Column>
        <Column header="" style="width:56px">
          <template #body="{ data }">
            <Button v-if="data.liquidacion_id" icon="pi pi-eye" text rounded size="small"
              v-tooltip.left="'Ver detalle operativo'"
              @click="router.push(`/liquidaciones/${data.liquidacion_id}`)" />
            <Button v-else icon="pi pi-plus" text rounded size="small"
              v-tooltip.left="'Crear detalle operativo'" :loading="creandoDesde === data.proyecto_id"
              @click="crearDesdeProyecto(data)" />
          </template>
        </Column>
        <template #expansion="{ data }">
          <div class="px-4 py-3" style="background:#FAF8FD">
            <p class="text-[11px] font-semibold mb-2" style="color:#6b5a8a">Por inversionista</p>
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left" style="color:#9b8fb0">
                  <th class="pb-1 font-medium">Inversionista</th>
                  <th class="pb-1 font-medium">%</th>
                  <th class="pb-1 font-medium text-right">Valor a pagar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in data.inversionistas" :key="inv.proyecto_inversionista_id || inv.nombre"
                  class="border-t" style="border-color:#f0ebf6">
                  <td class="py-1.5" style="color:#2C2039">{{ inv.cliente_nombre || inv.nombre || '—' }}</td>
                  <td class="py-1.5 font-mono" style="color:#6b5a8a">{{ inv.porcentaje != null ? inv.porcentaje.toFixed(2) + '%' : '—' }}</td>
                  <td class="py-1.5 font-mono text-right font-semibold" style="color:#915BD8">{{ fmtCompact(inv.valor_a_pagar) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!data.inversionistas?.length" class="text-[11px] text-center py-2" style="color:#9b8fb0">Sin inversionistas en este panel.</p>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Dialog nueva liquidación (detalle operativo) -->
    <Dialog v-model:visible="dialogNueva" header="Nueva liquidación (detalle operativo)" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <p class="text-xs" style="color:#9b8fb0">
          Crea el registro operativo (mandatos/facturas/XM). Los valores contables viven en el Panel Contable.
        </p>
        <div>
          <label class="field-label">Proyecto</label>
          <Select v-model="nueva.proyecto_id" :options="proyectosOpcionesFiltradas"
            optionLabel="nombre_comercial" optionValue="id"
            placeholder="Seleccionar proyecto" filter class="w-full" />
        </div>
        <div>
          <label class="field-label">Período</label>
          <DatePicker v-model="nueva.periodo" view="month" dateFormat="yy-mm-dd" class="w-full" />
        </div>
        <div>
          <label class="field-label">Tipo venta</label>
          <Select v-model="nueva.tipo_venta" :options="tiposVentaOpciones" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogNueva = false" />
          <Button label="Crear" size="small" :loading="creando" @click="crearLiquidacion" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import { proyectoActivoEnMes } from '@/utils/proyectoActivo'
import { fmtCompact, formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  periodo: { type: String, default: null },   // "YYYY-MM-01" (del contenedor)
  tipo: { type: String, default: 'preliquidacion' },
})

const toast = useToast()
const router = useRouter()
const route = useRoute()

// Filtro por tipo de proyecto vía query ?tipo= (minigranja | autoconsumo | null)
const tipoFilter = computed(() => {
  const t = route.query.tipo
  return (t === 'minigranja' || t === 'autoconsumo') ? t : null
})
const tipoLabel = computed(() =>
  ({ minigranja: 'Minigranjas', autoconsumo: 'Autoconsumo' }[tipoFilter.value] || '')
)

const periodoYYYYMM = computed(() => (props.periodo || '').slice(0, 7))

const loading = ref(false)
const proyectos = ref([])
const expandedRows = ref({})
const q = ref('')
const estadoFiltro = ref(null)
const ESTADO_OPCIONES = [
  { label: 'Firmado', value: 'firmado' },
  { label: 'Pendiente', value: 'pendiente' },
]

const proyectosFiltrados = computed(() => {
  const term = q.value.toLowerCase().trim()
  const tf = tipoFilter.value
  const ef = estadoFiltro.value
  return proyectos.value.filter(p =>
    (!term || (p.proyecto || '').toLowerCase().includes(term)) &&
    (!tf || p.tipo_proyecto === tf) &&
    (!ef || p.estado === ef)
  )
})

async function load() {
  if (!periodoYYYYMM.value) return
  loading.value = true
  try {
    const { data } = await api.get('/liquidaciones/resumen-panel', {
      params: { periodo: periodoYYYYMM.value, tipo: props.tipo },
    })
    proyectos.value = data.proyectos || []
  } catch {
    proyectos.value = []
  } finally {
    loading.value = false
  }
}

watch([() => props.periodo, () => props.tipo], load)

// ─── Nueva liquidación (detalle operativo) ────────────────────────────────────
const dialogNueva = ref(false)
const creando = ref(false)
const nueva = ref({ proyecto_id: null, periodo: null, tipo_venta: 'bolsa' })
const proyectosOpciones = ref([])
const creandoDesde = ref(null)

const tiposVentaOpciones = ['bolsa', 'ppa', 'interno', 'autoconsumo']

const proyectosOpcionesFiltradas = computed(() => {
  if (!nueva.value.periodo) return proyectosOpciones.value
  const d = new Date(nueva.value.periodo)
  return proyectosOpciones.value.filter(p => proyectoActivoEnMes(p, d.getFullYear(), d.getMonth() + 1))
})

function toISOMonth(d) {
  if (!d) return null
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
}

async function loadProyectosOpciones() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectosOpciones.value = data.items || []
  } catch {
    proyectosOpciones.value = []
  }
}

async function crearLiquidacion() {
  if (!nueva.value.proyecto_id || !nueva.value.periodo) return
  creando.value = true
  try {
    const { data } = await api.post('/liquidaciones', {
      proyecto_id: nueva.value.proyecto_id,
      periodo: toISOMonth(nueva.value.periodo),
      tipo_venta: nueva.value.tipo_venta,
    })
    dialogNueva.value = false
    toast.add({ severity: 'success', summary: 'Creada', life: 2000 })
    router.push(`/liquidaciones/${data.id}`)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear', life: 3000 })
  } finally {
    creando.value = false
  }
}

// Crear el detalle operativo directamente desde una fila del Panel
async function crearDesdeProyecto(row) {
  if (!props.periodo) return
  creandoDesde.value = row.proyecto_id
  try {
    const { data } = await api.post('/liquidaciones', {
      proyecto_id: row.proyecto_id,
      periodo: props.periodo,
      tipo_venta: 'bolsa',
    })
    router.push(`/liquidaciones/${data.id}`)
  } catch (e) {
    // 409 = ya existe: recargar para traer el liquidacion_id y navegar
    const existente = e?.response?.status === 409
    toast.add({
      severity: existente ? 'info' : 'error',
      summary: existente ? 'Ya existe' : 'Error',
      detail: existente ? 'Recargando…' : 'No se pudo crear el detalle',
      life: 2500,
    })
    if (existente) await load()
  } finally {
    creandoDesde.value = null
  }
}

onMounted(() => {
  load()
  loadProyectosOpciones()
})
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
