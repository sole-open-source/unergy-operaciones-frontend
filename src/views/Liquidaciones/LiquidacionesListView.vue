<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Liquidaciones</h2>
      <Button label="Nueva liquidación" icon="pi pi-plus" @click="dialogNueva = true" />
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

    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <TabView v-model:activeIndex="tabActivo">

        <!-- ══ Panel General ══ -->
        <TabPanel header="Panel General">
          <DataTable
            :value="filasGeneral"
            :loading="loadingVista"
            :rows="20"
            paginator
            rowHover
            class="text-sm"
            rowGroupMode="subheader"
            groupRowsBy="proyecto"
            sortField="proyecto"
            :sortOrder="1"
            :expandableRowGroups="true"
            :expandedRowGroups="expandedGroupsGeneral"
            @rowgroup-expand="(e) => onGroupExpand(e, expandedGroupsGeneral)"
            @rowgroup-collapse="(e) => onGroupCollapse(e, expandedGroupsGeneral)"
          >
            <template #empty>
              <div class="text-center py-8 text-sm text-gray-400">No hay liquidaciones para los filtros seleccionados.</div>
            </template>
            <template #groupheader="{ data }">
              <div class="flex items-center gap-2 py-1">
                <span class="font-semibold text-gray-700">{{ data.proyecto }}</span>
                <span
                  v-if="grupoInfoGeneral[data.proyecto]?.tipo_venta"
                  :class="badgeTipoVenta(grupoInfoGeneral[data.proyecto].tipo_venta)"
                >{{ grupoInfoGeneral[data.proyecto].tipo_venta }}</span>
                <span class="text-xs text-gray-400">({{ grupoInfoGeneral[data.proyecto]?.count ?? 0 }})</span>
              </div>
            </template>
            <Column field="periodoLabel" header="Período" />
            <Column header="Estado">
              <template #body="{ data }">
                <Tag :value="data.estado" :severity="estadoSeverity(data.estado)" />
              </template>
            </Column>
            <Column header="Doc" style="width:110px">
              <template #body="{ data }">
                <span :class="badgeDocClass(data.doc)">{{ data.doc }}</span>
              </template>
            </Column>
            <Column header="Tipo venta" style="width:130px">
              <template #body="{ data }">
                <span :class="badgeTipoVenta(data.tipo_venta)">{{ data.tipo_venta || '—' }}</span>
              </template>
            </Column>
            <Column header="Ingreso Neto" bodyStyle="text-align:right">
              <template #body="{ data }">
                <span class="font-mono text-gray-800">{{ data.ingreso_neto != null ? fmt(data.ingreso_neto) : '—' }}</span>
              </template>
            </Column>
            <Column style="width:60px">
              <template #body="{ data }">
                <Button icon="pi pi-eye" text rounded size="small" v-tooltip="'Ver detalle'"
                  @click="router.push(`/liquidaciones/${data.liq_id}`)" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- ══ Ingresos ══ -->
        <TabPanel header="Ingresos">
          <DataTable
            :value="filasIngresosTab"
            :loading="loadingVista"
            :rows="20"
            paginator
            rowHover
            class="text-sm"
            rowGroupMode="subheader"
            groupRowsBy="proyecto"
            sortField="proyecto"
            :sortOrder="1"
            :expandableRowGroups="true"
            :expandedRowGroups="expandedGroupsIngresos"
            @rowgroup-expand="(e) => onGroupExpand(e, expandedGroupsIngresos)"
            @rowgroup-collapse="(e) => onGroupCollapse(e, expandedGroupsIngresos)"
          >
            <template #empty>
              <div class="text-center py-8 text-sm text-gray-400">No hay liquidaciones para los filtros seleccionados.</div>
            </template>
            <template #groupheader="{ data }">
              <div class="flex items-center gap-2 py-1">
                <span class="font-semibold text-gray-700">{{ data.proyecto }}</span>
                <span
                  v-if="grupoInfoIngresos[data.proyecto]?.tipo_venta"
                  :class="badgeTipoVenta(grupoInfoIngresos[data.proyecto].tipo_venta)"
                >{{ grupoInfoIngresos[data.proyecto].tipo_venta }}</span>
                <span class="text-xs text-gray-400">({{ grupoInfoIngresos[data.proyecto]?.count ?? 0 }})</span>
              </div>
            </template>
            <Column field="periodoLabel" header="Período" />
            <Column header="Estado">
              <template #body="{ data }">
                <Tag :value="data.estado" :severity="estadoSeverity(data.estado)" />
              </template>
            </Column>
            <Column header="Tipo venta" style="width:130px">
              <template #body="{ data }">
                <span :class="badgeTipoVenta(data.tipo_venta)">{{ data.tipo_venta || '—' }}</span>
              </template>
            </Column>
            <Column header="Ingreso Neto" bodyStyle="text-align:right">
              <template #body="{ data }">
                <span class="font-mono text-gray-800">{{ data.ingreso_neto != null ? fmt(data.ingreso_neto) : '—' }}</span>
              </template>
            </Column>
            <Column style="width:60px">
              <template #body="{ data }">
                <Button icon="pi pi-eye" text rounded size="small" v-tooltip="'Ver detalle'"
                  @click="router.push(`/liquidaciones/${data.liq_id}`)" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- ══ Costos ══ -->
        <TabPanel header="Costos">
          <DataTable
            :value="filasCostosTab"
            :loading="loadingVista"
            :rows="20"
            paginator
            rowHover
            class="text-sm"
            rowGroupMode="subheader"
            groupRowsBy="proyecto"
            sortField="proyecto"
            :sortOrder="1"
            :expandableRowGroups="true"
            :expandedRowGroups="expandedGroupsCostos"
            @rowgroup-expand="(e) => onGroupExpand(e, expandedGroupsCostos)"
            @rowgroup-collapse="(e) => onGroupCollapse(e, expandedGroupsCostos)"
          >
            <template #empty>
              <div class="text-center py-8 text-sm text-gray-400">No hay liquidaciones para los filtros seleccionados.</div>
            </template>
            <template #groupheader="{ data }">
              <div class="flex items-center gap-2 py-1">
                <span class="font-semibold text-gray-700">{{ data.proyecto }}</span>
                <span
                  v-if="grupoInfoCostos[data.proyecto]?.tipo_venta"
                  :class="badgeTipoVenta(grupoInfoCostos[data.proyecto].tipo_venta)"
                >{{ grupoInfoCostos[data.proyecto].tipo_venta }}</span>
                <span class="text-xs text-gray-400">({{ grupoInfoCostos[data.proyecto]?.count ?? 0 }})</span>
              </div>
            </template>
            <Column field="periodoLabel" header="Período" />
            <Column header="Estado">
              <template #body="{ data }">
                <Tag :value="data.estado" :severity="estadoSeverity(data.estado)" />
              </template>
            </Column>
            <Column header="Doc" style="width:110px">
              <template #body="{ data }">
                <span :class="badgeDocClass(data.doc)">{{ data.doc }}</span>
              </template>
            </Column>
            <Column header="Tipo venta" style="width:130px">
              <template #body="{ data }">
                <span :class="badgeTipoVenta(data.tipo_venta)">{{ data.tipo_venta || '—' }}</span>
              </template>
            </Column>
            <Column header="Importe" bodyStyle="text-align:right">
              <template #body="{ data }">
                <span class="font-mono text-gray-800">{{ data.ingreso_neto != null ? fmt(data.ingreso_neto) : '—' }}</span>
              </template>
            </Column>
            <Column style="width:60px">
              <template #body="{ data }">
                <Button icon="pi pi-eye" text rounded size="small" v-tooltip="'Ver detalle'"
                  @click="router.push(`/liquidaciones/${data.liq_id}`)" />
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabView>
    </div>

    <!-- Dialog nueva liquidación -->
    <Dialog v-model:visible="dialogNueva" header="Nueva liquidación" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div>
          <label class="field-label">Proyecto</label>
          <Select v-model="nueva.proyecto_id" :options="proyectosOpciones"
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
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const toast = useToast()
const router = useRouter()

const vistaProyectos = ref([])
const loadingVista = ref(false)
const proyectosOpciones = ref([])
const tabActivo = ref(0)

const filtros = ref({ q: '', desde: null, hasta: null, estado: null, tipo_venta: null })

const estadosOpciones = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]
const tiposVentaOpciones = ['bolsa', 'ppa', 'interno', 'autoconsumo']

// ─── RowGroup state — vacío = todos colapsados por defecto ────────────────────
const expandedGroupsGeneral  = ref([])
const expandedGroupsIngresos = ref([])
const expandedGroupsCostos   = ref([])

function onGroupExpand(event, groups) {
  groups.push(event.data)
}

function onGroupCollapse(event, groups) {
  const idx = groups.indexOf(event.data)
  if (idx !== -1) groups.splice(idx, 1)
}

const dialogNueva = ref(false)
const creando = ref(false)
const nueva = ref({ proyecto_id: null, periodo: null, tipo_venta: 'bolsa' })

// ─── Resumen por liquidación ──────────────────────────────────────────────────
const filasResumen = computed(() => {
  const filas = []
  for (const proy of vistaProyectos.value) {
    for (const liq of proy.liquidaciones) {
      const base = {
        proyecto_id:  proy.proyecto_id,
        proyecto:     proy.proyecto_nombre,
        liq_id:       liq.liquidacion_id,
        periodo:      liq.periodo,
        periodoLabel: formatPeriodo(liq.periodo),
        estado:       liq.estado,
        tipo_venta:   liq.tipo_venta,
        er_url:       liq.estado_resultados_url,
      }

      // Fila Mandato (ingresos) — siempre presente
      const mandatoTotal = (liq.mandatos_total_ingresos || [])[0]
      filas.push({ ...base, doc: 'Mandato', ingreso_neto: mandatoTotal?.valor_neto_cop ?? null })

      // Fila Costos — si algún inversionista tiene mandatos de costos
      const hasCostos = (liq.inversionistas || []).some(inv => (inv.mandatos_costos || []).length > 0)
      if (hasCostos) {
        filas.push({ ...base, doc: 'Costos', ingreso_neto: null })
      }

      // Una fila por cada factura de servicio
      for (const f of (liq.facturas_servicio || [])) {
        filas.push({ ...base, doc: 'Factura', ingreso_neto: f.valor_cop ?? null })
      }
    }
  }
  return filas
})

// Filtrado client-side por búsqueda y tipo_venta (estado/periodo vienen del API)
const filasResumenFiltradas = computed(() => {
  let rows = filasResumen.value
  const q = (filtros.value.q || '').toLowerCase().trim()
  if (q) rows = rows.filter(r => r.proyecto.toLowerCase().includes(q))
  if (filtros.value.tipo_venta) rows = rows.filter(r => r.tipo_venta === filtros.value.tipo_venta)
  return rows
})

const filasGeneral     = computed(() => filasResumenFiltradas.value)
const filasIngresosTab = computed(() => filasResumenFiltradas.value.filter(f => f.doc === 'Mandato'))
const filasCostosTab   = computed(() => filasResumenFiltradas.value.filter(f => f.doc === 'Costos' || f.doc === 'Factura'))

// ─── Info por grupo (count + tipo_venta único si aplica) ─────────────────────
function buildGrupoInfo(rows) {
  const map = {}
  for (const r of rows) {
    if (!map[r.proyecto]) map[r.proyecto] = { count: 0, tipos: new Set() }
    map[r.proyecto].count++
    if (r.tipo_venta) map[r.proyecto].tipos.add(r.tipo_venta)
  }
  const result = {}
  for (const [k, v] of Object.entries(map)) {
    result[k] = { count: v.count, tipo_venta: v.tipos.size === 1 ? [...v.tipos][0] : null }
  }
  return result
}

const grupoInfoGeneral  = computed(() => buildGrupoInfo(filasGeneral.value))
const grupoInfoIngresos = computed(() => buildGrupoInfo(filasIngresosTab.value))
const grupoInfoCostos   = computed(() => buildGrupoInfo(filasCostosTab.value))

// ─── Helpers de estilo ────────────────────────────────────────────────────────
function badgeDocClass(doc) {
  return { Mandato: 'badge-mandato', Costos: 'badge-costos', Factura: 'badge-factura' }[doc] || 'badge-mandato'
}

function badgeTipoVenta(tv) {
  return { ppa: 'badge-ppa', autoconsumo: 'badge-auto' }[tv] || 'badge-bolsa'
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
.field-label   { @apply block text-xs font-medium text-gray-600 mb-1; }
.badge-mandato { @apply bg-blue-100 text-blue-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-costos  { @apply bg-orange-100 text-orange-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-factura { @apply bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-ppa     { @apply bg-purple-100 text-purple-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-auto    { @apply bg-green-100 text-green-800 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
.badge-bolsa   { @apply bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded; }
</style>
