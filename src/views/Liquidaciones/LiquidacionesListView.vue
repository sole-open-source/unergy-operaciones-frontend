<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Liquidaciones</h2>
      <Button label="Nueva liquidación" icon="pi pi-plus" @click="dialogNueva = true" />
    </div>

    <!-- Tabs -->
    <div class="flex gap-0 border-b" style="border-color: rgba(44,32,57,0.10);">
      <button
        v-for="(tab, i) in TABS"
        :key="i"
        @click="tabActivo = i"
        class="px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
        :style="tabActivo === i
          ? 'color: #915BD8; border-color: #915BD8;'
          : 'color: #7a6e8a; border-color: transparent;'"
      >{{ tab.label }}</button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="field-label">Buscar</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtros.q" placeholder="Nombre proyecto…" class="w-56" />
        </IconField>
      </div>
      <div>
        <label class="field-label">Desde</label>
        <DatePicker v-model="filtros.desde" view="month" dateFormat="mm/yy" showButtonBar placeholder="Mes inicio" class="w-36" />
      </div>
      <div>
        <label class="field-label">Hasta</label>
        <DatePicker v-model="filtros.hasta" view="month" dateFormat="mm/yy" showButtonBar placeholder="Mes fin" class="w-36" />
      </div>
      <div>
        <label class="field-label">Estado</label>
        <Select v-model="filtros.estado" :options="estadosOpciones" showClear placeholder="Todos" class="w-44" />
      </div>
      <div>
        <label class="field-label">Tipo venta</label>
        <Select v-model="filtros.tipo_venta" :options="tiposVentaOpciones" showClear placeholder="Todos" class="w-36" />
      </div>
      <Button icon="pi pi-search" label="Buscar" @click="recargar" />
      <Button icon="pi pi-times" label="Limpiar" severity="secondary" text @click="limpiarFiltros" />
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <DataTable
        :value="filasResumenFiltradas"
        :loading="loadingVista"
        scrollable
        scrollHeight="calc(100vh - 260px)"
        class="text-sm"
      >
        <template #empty>
          <div class="text-center py-8 text-sm text-gray-400">
            No hay liquidaciones para los filtros seleccionados.
          </div>
        </template>

        <Column style="width:100%; padding:0">
          <template #body="{ data }">

            <!-- PROYECTO -->
            <div v-if="data.tipo === 'proyecto'"
              class="flex items-center gap-2 px-3 py-2 cursor-pointer select-none bg-gray-100 hover:bg-gray-200"
              @click="toggleProy(data.proyKey)">
              <i :class="expandedProyectos.has(data.proyKey)
                ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                class="text-xs text-gray-500" />
              <span class="font-semibold text-gray-800 text-sm">{{ data.proyecto }}</span>
            </div>

            <!-- AÑO -->
            <div v-else-if="data.tipo === 'anio'"
              class="flex items-center gap-2 px-6 py-1.5 cursor-pointer select-none bg-gray-50 hover:bg-gray-100"
              @click="toggleAnio(data.anioKey)">
              <i :class="expandedAnios.has(data.anioKey)
                ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                class="text-xs text-gray-400" />
              <span class="text-sm font-medium text-gray-500">{{ data.anio }}</span>
            </div>

            <!-- MES -->
            <div v-else
              class="flex items-center gap-4 px-10 py-2 cursor-pointer hover:bg-purple-50 border-b border-gray-100"
              @click="router.push(`/liquidaciones/${data.liq_id}`)">
              <span class="w-20 text-gray-700 text-sm">{{ data.periodoLabel }}</span>
              <Tag :value="data.estado" :severity="estadoSeverity(data.estado)" class="text-[10px]" />
              <span :class="badgeTipoVenta(data.tipo_venta)">{{ data.tipo_venta || '—' }}</span>
              <span class="ml-auto font-mono text-gray-800 text-sm">
                {{ data.ingreso_neto != null ? fmt(data.ingreso_neto) : '—' }}
              </span>
              <Button icon="pi pi-eye" text rounded size="small"
                @click.stop="router.push(`/liquidaciones/${data.liq_id}`)" />
            </div>

          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog nueva liquidación -->
    <Dialog v-model:visible="dialogNueva" header="Nueva liquidación" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import { proyectoActivoEnMes } from '@/utils/proyectoActivo'

const TABS = [
  { label: 'Todas',       filter: null },
  { label: 'Minigranjas', filter: 'minigranja' },
  { label: 'Autoconsumo', filter: 'autoconsumo' },
]
const tabActivo = ref(0)

const toast = useToast()
const router = useRouter()

const vistaProyectos = ref([])
const loadingVista = ref(false)
const proyectosOpciones = ref([])

const proyectosOpcionesFiltradas = computed(() => {
  if (!nueva.value.periodo) return proyectosOpciones.value
  const d = new Date(nueva.value.periodo)
  const anio = d.getFullYear()
  const mes = d.getMonth() + 1
  return proyectosOpciones.value.filter(p => proyectoActivoEnMes(p, anio, mes))
})

const filtros = ref({ q: '', desde: null, hasta: null, estado: null, tipo_venta: null })

const estadosOpciones = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]
const tiposVentaOpciones = ['bolsa', 'ppa', 'interno', 'autoconsumo']

const expandedProyectos = ref(new Set())
const expandedAnios = ref(new Set())

const dialogNueva = ref(false)
const creando = ref(false)
const nueva = ref({ proyecto_id: null, periodo: null, tipo_venta: 'bolsa' })

// ─── Estructura 3 niveles: proyecto → año → mes ───────────────────────────────
const filasResumen = computed(() => {
  const filas = []
  for (const proy of vistaProyectos.value) {
    const proyKey = String(proy.proyecto_id)
    filas.push({ tipo: 'proyecto', proyKey, proyecto: proy.proyecto_nombre })

    const porAnio = {}
    for (const liq of proy.liquidaciones) {
      const anio = liq.periodo?.split('-')[0] || '?'
      if (!porAnio[anio]) porAnio[anio] = []
      porAnio[anio].push(liq)
    }
    for (const anio of Object.keys(porAnio).sort().reverse()) {
      const anioKey = `${proyKey}_${anio}`
      filas.push({ tipo: 'anio', proyKey, anioKey, anio })
      for (const liq of porAnio[anio]) {
        const mandatoTotal = (liq.mandatos_total_ingresos || [])[0]
        filas.push({
          tipo:         'mes',
          proyKey,
          anioKey,
          liq_id:       liq.liquidacion_id,
          proyecto:     proy.proyecto_nombre,
          periodo:      liq.periodo,
          periodoLabel: formatPeriodo(liq.periodo),
          estado:       liq.estado,
          tipo_venta:   liq.tipo_venta,
          ingreso_neto: mandatoTotal?.valor_neto_cop ?? null,
        })
      }
    }
  }
  return filas
})

// ─── Filtrado + visibilidad según expansión ───────────────────────────────────
const filasResumenFiltradas = computed(() => {
  const q = (filtros.value.q || '').toLowerCase().trim()
  const tv = filtros.value.tipo_venta
  const tabFilter = TABS[tabActivo.value].filter

  const proyTipo = {}
  for (const p of vistaProyectos.value) proyTipo[String(p.proyecto_id)] = p.tipo_proyecto

  const proyMatching = new Set(
    filasResumen.value
      .filter(f => f.tipo === 'mes'
        && (!q || f.proyecto.toLowerCase().includes(q))
        && (!tv || f.tipo_venta === tv)
        && (!tabFilter || proyTipo[f.proyKey] === tabFilter))
      .map(f => f.proyKey)
  )

  return filasResumen.value.filter(f => {
    if (!proyMatching.has(f.proyKey)) return false
    if (f.tipo === 'proyecto') return true
    if (f.tipo === 'anio') return expandedProyectos.value.has(f.proyKey)
    if (f.tipo === 'mes')  return expandedProyectos.value.has(f.proyKey)
                               && expandedAnios.value.has(f.anioKey)
    return false
  })
})

// ─── Toggle expansión ─────────────────────────────────────────────────────────
function toggleProy(key) {
  expandedProyectos.value.has(key)
    ? expandedProyectos.value.delete(key)
    : expandedProyectos.value.add(key)
  expandedProyectos.value = new Set(expandedProyectos.value)
}

function toggleAnio(key) {
  expandedAnios.value.has(key)
    ? expandedAnios.value.delete(key)
    : expandedAnios.value.add(key)
  expandedAnios.value = new Set(expandedAnios.value)
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────
function badgeTipoVenta(tv) {
  return { ppa: 'badge-ppa', autoconsumo: 'badge-auto', bolsa: 'badge-bolsa' }[tv] || 'badge-bolsa'
}

function estadoSeverity(e) {
  return {
    iniciada: 'secondary', costos_registrados: 'info', xm_procesado: 'info',
    mandatos_emitidos: 'warn', en_contabilidad: 'warn', en_revisoria: 'warn',
    facturado: 'success', entregado: 'contrast',
  }[e] || 'secondary'
}

// ─── Carga de datos ───────────────────────────────────────────────────────────
function buildParams() {
  const p = {}
  if (filtros.value.desde) p.periodo_desde = toISOMonth(filtros.value.desde)
  if (filtros.value.hasta) p.periodo_hasta = toISOMonth(filtros.value.hasta)
  if (filtros.value.estado) p.estado = filtros.value.estado
  return p
}

function toISOMonth(d) {
  if (!d) return null
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
}

async function loadVistas() {
  loadingVista.value = true
  try {
    const { data } = await api.get('/liquidaciones/vistas/por-proyecto', { params: buildParams() })
    vistaProyectos.value = data
  } catch (e) {
    console.error('Vista por proyecto:', e)
    vistaProyectos.value = []
  } finally {
    loadingVista.value = false
  }
}

async function loadProyectosOpciones() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 200 } })
    proyectosOpciones.value = data.items || []
  } catch {
    proyectosOpciones.value = []
  }
}

function recargar() { loadVistas() }

function limpiarFiltros() {
  filtros.value = { q: '', desde: null, hasta: null, estado: null, tipo_venta: null }
  loadVistas()
}

// ─── Nueva liquidación ────────────────────────────────────────────────────────
async function crearLiquidacion() {
  if (!nueva.value.proyecto_id || !nueva.value.periodo) return
  creando.value = true
  try {
    const { data } = await api.post('/liquidaciones', {
      proyecto_id: nueva.value.proyecto_id,
      periodo:     toISOMonth(nueva.value.periodo),
      tipo_venta:  nueva.value.tipo_venta,
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

// ─── Formato ──────────────────────────────────────────────────────────────────
function fmt(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(v)
}

function formatPeriodo(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}

onMounted(() => {
  loadVistas()
  loadProyectosOpciones()
})
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
.badge-ppa   { @apply bg-purple-100 text-purple-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-auto  { @apply bg-green-100 text-green-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-bolsa { @apply bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
</style>
