<template>
  <div class="space-y-4">

    <!-- Banner alertas +7 días -->
    <div v-if="stats.alerta_7_dias > 0"
         class="flex items-center gap-3 px-4 py-3 rounded-xl border"
         style="background:#FFF8F0;border-color:#FDE4C0;">
      <span class="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
      <p class="text-sm flex-1" style="color:#7C3400;">
        <strong class="text-red-600">{{ stats.alerta_7_dias }} falla{{ stats.alerta_7_dias !== 1 ? 's' : '' }}</strong>
        {{ stats.alerta_7_dias !== 1 ? 'superan' : 'supera' }} los 7 días sin resolución.
        Requieren atención inmediata.
      </p>
      <button class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-orange-200
                     text-orange-700 hover:bg-orange-50 transition-colors"
              @click="filters.solo_alerta = true; load()">
        Ver todas
      </button>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold" style="color:#2C2039;">Monitoreo</h2>
        <p class="text-xs mt-0.5" style="color:#9b89b5;">
          Bitácora de eventos operativos
          <span v-if="lastRefresh"> · Actualizado {{ lastRefresh }}</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-2 rounded-lg border text-sm hover:bg-gray-50 transition-colors"
                style="border-color:#e8e0f0;color:#915BD8;"
                @click="loadAll" title="Actualizar">
          <i class="pi pi-refresh" :class="{ 'animate-spin': loading }" />
        </button>
        <Button label="Nueva falla" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div v-for="kpi in kpis" :key="kpi.label"
           class="rounded-xl p-4 border" style="background:#fff;border-color:#e8e0f0;">
        <p class="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style="color:#9b89b5;">
          {{ kpi.label }}
        </p>
        <p class="text-2xl font-bold" :style="{ color: kpi.color || '#2C2039' }">
          {{ kpi.value ?? '—' }}
        </p>
        <p class="text-[11px] mt-1" style="color:#9b89b5;">{{ kpi.sub }}</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="rounded-xl border p-4 flex flex-wrap gap-3 items-end"
         style="background:#fff;border-color:#e8e0f0;">

      <div>
        <label class="field-label">Buscar</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filters.buscar" placeholder="Código, proyecto, descripción…"
                     class="w-60" @input="onSearch" />
        </IconField>
      </div>

      <div>
        <label class="field-label">Proyecto</label>
        <Select v-model="filters.proyecto_id" :options="proyectos" option-value="id"
                option-label="nombre_display" class="w-48" placeholder="Todos" show-clear
                @change="load" />
      </div>

      <div>
        <label class="field-label">Estado</label>
        <Select v-model="filters.estado_codigo" :options="catalogos.estados"
                option-value="codigo" option-label="etiqueta"
                class="w-40" placeholder="Todos" show-clear @change="load" />
      </div>

      <div>
        <label class="field-label">Prioridad</label>
        <Select v-model="filters.prioridad_codigo" :options="catalogos.prioridades"
                option-value="codigo" option-label="etiqueta"
                class="w-36" placeholder="Todas" show-clear @change="load" />
      </div>

      <div>
        <label class="field-label">Tipo</label>
        <Select v-model="filters.tipo_codigo" :options="catalogos.tipos"
                option-value="codigo" option-label="etiqueta"
                class="w-52" placeholder="Todos" show-clear filter @change="load" />
      </div>

      <div class="flex items-end gap-2 ml-auto">
        <!-- Vista cards / lista -->
        <div class="flex rounded-lg border overflow-hidden" style="border-color:#e8e0f0;">
          <button v-for="v in views" :key="v.key"
                  class="px-3 py-2 text-xs font-semibold transition-colors"
                  :style="view === v.key
                    ? 'background:#915BD8;color:#fff;'
                    : 'background:#fff;color:#9b89b5;'"
                  @click="view = v.key">
            <i :class="v.icon" />
          </button>
        </div>
        <button v-if="hasFilters"
                class="text-xs px-3 py-2 rounded-lg border text-red-500 hover:bg-red-50 transition-colors"
                style="border-color:#fecaca;"
                @click="clearFilters">
          <i class="pi pi-times mr-1" /> Limpiar
        </button>
      </div>
    </div>

    <!-- ── CARDS VIEW ── -->
    <div v-if="view === 'cards'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-if="loading && !items.length" v-for="n in 6" :key="n"
           class="rounded-xl border animate-pulse h-52"
           style="background:#f5f0fb;border-color:#e8e0f0;" />

      <div v-for="f in items" :key="f.id"
           class="rounded-xl border overflow-hidden cursor-pointer transition-all duration-150
                  hover:shadow-md group"
           :style="cardStyle(f)"
           @click="openDetail(f)">

        <!-- Head -->
        <div class="px-4 pt-3 pb-2.5 border-b" style="border-color:#f0eaf8;">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide mb-1"
                 style="color:#915BD8;">
                {{ proyectoNombre(f) }} · {{ f.codigo_interno }}
              </p>
              <p class="text-[13px] font-semibold leading-snug line-clamp-2"
                 style="color:#2C2039;">
                {{ f.tipo_falla?.etiqueta || f.descripcion || '(sin descripción)' }}
              </p>
            </div>
            <span class="shrink-0">
              <Tag :value="f.estado?.etiqueta" :style="tagStyle(f.estado)" />
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="px-4 py-3 space-y-2">
          <div class="flex justify-between items-center text-[11px]">
            <span style="color:#9b89b5;">Tipo</span>
            <span class="font-semibold" style="color:#2C2039;">
              {{ f.tipo_falla?.codigo }} · {{ f.tipo_falla?.categoria?.etiqueta?.split(' ').slice(1).join(' ') || '—' }}
            </span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span style="color:#9b89b5;">Días abierta</span>
            <span class="font-bold" :style="{ color: diasColor(f.dias_abierta) }">
              {{ f.dias_abierta ?? '—' }} días
            </span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span style="color:#9b89b5;">Prioridad</span>
            <Tag :value="f.prioridad?.etiqueta" :style="prioTagStyle(f.prioridad)" class="text-[10px]" />
          </div>

          <!-- Barra SLA -->
          <div>
            <div class="flex justify-between text-[10px] mb-1" style="color:#9b89b5;">
              <span>SLA ({{ f.sla_limite_dias ?? '7' }}d)</span>
              <span :style="{ color: slaColor(f) }">
                {{ slaLabel(f) }}
              </span>
            </div>
            <div class="h-1 rounded-full" style="background:#f0eaf8;">
              <div class="h-1 rounded-full transition-all"
                   :style="slaBarStyle(f)" />
            </div>
          </div>
        </div>

        <!-- Fotos mini -->
        <div v-if="f.tiene_fotos" class="px-4 pb-2 flex gap-1.5 items-center">
          <i class="pi pi-image text-[10px]" style="color:#915BD8;" />
          <span class="text-[10px]" style="color:#9b89b5;">Tiene fotos adjuntas</span>
        </div>

        <!-- Foot -->
        <div class="px-4 py-2.5 border-t flex items-center justify-between"
             style="border-color:#f0eaf8;background:#faf8fd;">
          <span class="text-[10px]" style="color:#9b89b5;">
            {{ fmtDate(f.fecha_identificacion || f.fecha_registro) }}
          </span>
          <div class="flex gap-2">
            <button class="text-[10px] font-semibold px-2.5 py-1 rounded-lg border
                           hover:bg-white transition-colors"
                    style="color:#6b5a8a;border-color:#e0d4f5;"
                    @click.stop="openSeguimiento(f)">
              Seguimiento
            </button>
            <button class="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                    style="background:#f0eaf8;color:#915BD8;"
                    @click.stop="openDetail(f)">
              Ver detalle
            </button>
          </div>
        </div>
      </div>

      <div v-if="!loading && !items.length"
           class="col-span-full text-center py-16 text-sm" style="color:#9b89b5;">
        <i class="pi pi-inbox text-4xl block mb-3" style="color:#e0d4f5;" />
        No hay fallas que coincidan con los filtros.
      </div>
    </div>

    <!-- ── TABLE VIEW ── -->
    <div v-else class="rounded-xl border overflow-hidden" style="border-color:#e8e0f0;">
      <DataTable :value="items" lazy :loading="loading" :rows="pageSize"
                 :total-records="total" paginator @page="onPage" row-hover
                 selection-mode="single" @row-select="openDetail($event.data)"
                 class="text-sm">
        <Column field="codigo_interno" header="Código" style="width:110px" />
        <Column header="Proyecto" style="min-width:130px">
          <template #body="{ data }">{{ proyectoNombre(data) }}</template>
        </Column>
        <Column header="Tipo de falla" style="min-width:200px">
          <template #body="{ data }">
            <span class="text-xs">
              <strong>{{ data.tipo_falla?.codigo }}</strong>
              {{ data.tipo_falla?.etiqueta }}
            </span>
          </template>
        </Column>
        <Column header="Estado" style="width:110px">
          <template #body="{ data }">
            <Tag :value="data.estado?.etiqueta" :style="tagStyle(data.estado)" />
          </template>
        </Column>
        <Column header="Prioridad" style="width:90px">
          <template #body="{ data }">
            <Tag :value="data.prioridad?.etiqueta" :style="prioTagStyle(data.prioridad)" />
          </template>
        </Column>
        <Column header="Días" style="width:70px">
          <template #body="{ data }">
            <span :style="{ color: diasColor(data.dias_abierta), fontWeight: 700 }">
              {{ data.dias_abierta ?? '—' }}
            </span>
          </template>
        </Column>
        <Column header="SLA" style="width:90px">
          <template #body="{ data }">
            <span class="text-xs font-bold" :style="{ color: slaColor(data) }">
              {{ slaLabel(data) }}
            </span>
          </template>
        </Column>
        <Column header="Fecha" style="width:100px">
          <template #body="{ data }">
            {{ fmtDate(data.fecha_identificacion || data.fecha_registro) }}
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Paginación para cards -->
    <div v-if="view === 'cards' && total > pageSize"
         class="flex items-center justify-between px-1">
      <p class="text-xs" style="color:#9b89b5;">
        Mostrando {{ items.length }} de {{ total }} fallas
      </p>
      <div class="flex gap-2">
        <button :disabled="page === 1"
                class="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40
                       hover:bg-purple-50 transition-colors"
                style="border-color:#e0d4f5;color:#915BD8;"
                @click="page--; load()">
          ← Anterior
        </button>
        <button :disabled="page * pageSize >= total"
                class="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40
                       hover:bg-purple-50 transition-colors"
                style="border-color:#e0d4f5;color:#915BD8;"
                @click="page++; load()">
          Siguiente →
        </button>
      </div>
    </div>

    <!-- ─── DRAWER DETALLE ─── -->
    <Drawer v-model:visible="drawerVisible" position="right"
            :header="selectedFalla?.codigo_interno || 'Detalle'"
            class="!w-full md:!w-[560px]" style="--p-drawer-header-padding:1.25rem;">
      <FallaDetalle v-if="selectedFalla"
                    :falla="selectedFalla"
                    :catalogos="catalogos"
                    @update="onFallaUpdated"
                    @close="drawerVisible = false" />
    </Drawer>

    <!-- ─── DIALOG NUEVA FALLA ─── -->
    <Dialog v-model:visible="formVisible" header="Registrar nueva falla"
            modal class="w-full max-w-2xl mx-4">
      <FallaForm :catalogos="catalogos" :proyectos="proyectos"
                 @save="onFallaCreated" @cancel="formVisible = false" />
    </Dialog>

    <!-- ─── DIALOG SEGUIMIENTO RÁPIDO ─── -->
    <Dialog v-model:visible="segVisible" header="Agregar seguimiento"
            modal class="w-full max-w-md mx-4">
      <div class="space-y-3 pt-1">
        <p class="text-xs font-semibold" style="color:#915BD8;">
          {{ segFalla?.codigo_interno }} — {{ proyectoNombre(segFalla) }}
        </p>
        <div>
          <label class="field-label">Estado nuevo <span style="color:#9b89b5;">(opcional)</span></label>
          <Select v-model="segEstado" :options="catalogos.estados"
                  option-value="codigo" option-label="etiqueta"
                  class="w-full" placeholder="Sin cambio" show-clear />
        </div>
        <div>
          <label class="field-label">Nota *</label>
          <Textarea v-model="segNota" rows="4" class="w-full"
                    placeholder="Describe la actualización, acción tomada o novedad…" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" text @click="segVisible = false" />
          <Button label="Guardar" icon="pi pi-check" :loading="segLoading"
                  :disabled="!segNota.trim()" @click="saveSeguimiento" />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import FallaDetalle from './FallaDetalle.vue'
import FallaForm from './FallaForm.vue'

const toast = useToast()

// ── estado ──────────────────────────────────────────────────
const items      = ref([])
const total      = ref(0)
const page       = ref(1)
const pageSize   = ref(21)
const loading    = ref(false)
const lastRefresh= ref('')
const view       = ref('cards')  // 'cards' | 'table'
const views      = [
  { key: 'cards', icon: 'pi pi-th-large' },
  { key: 'table', icon: 'pi pi-list' },
]

const stats = ref({ total_activas: 0, en_revision: 0, resueltas_mes: 0,
                    cumplimiento_sla_pct: null, alerta_7_dias: 0 })

const catalogos = reactive({ categorias: [], tipos: [], estados: [],
                              prioridades: [], resoluciones: [] })
const proyectos = ref([])

const filters = reactive({
  buscar: '', proyecto_id: null, estado_codigo: null,
  prioridad_codigo: null, tipo_codigo: null, solo_alerta: false,
})

// Drawer detalle
const drawerVisible  = ref(false)
const selectedFalla  = ref(null)

// Dialog nueva falla
const formVisible = ref(false)

// Dialog seguimiento rápido
const segVisible  = ref(false)
const segFalla    = ref(null)
const segNota     = ref('')
const segEstado   = ref(null)
const segLoading  = ref(false)

// ── computed ─────────────────────────────────────────────────
const hasFilters = computed(() =>
  filters.buscar || filters.proyecto_id || filters.estado_codigo ||
  filters.prioridad_codigo || filters.tipo_codigo || filters.solo_alerta
)

const kpis = computed(() => [
  { label: 'Fallas activas',     value: stats.value.total_activas,     color: '#EF4444', sub: `${stats.value.alerta_7_dias ?? 0} con +7 días` },
  { label: 'En revisión',        value: stats.value.en_revision,       color: '#F59E0B', sub: 'Técnico asignado' },
  { label: 'Resueltas este mes', value: stats.value.resueltas_mes,     color: '#10B981', sub: 'Mes en curso' },
  { label: 'Cumplimiento SLA',
    value: stats.value.cumplimiento_sla_pct != null
           ? `${stats.value.cumplimiento_sla_pct}%` : '—',
    color: stats.value.cumplimiento_sla_pct >= 90 ? '#10B981' : '#F59E0B',
    sub: 'Últimos 30 días' },
])

// ── helpers visuales ─────────────────────────────────────────
const proyectoNombre = (f) => {
  if (!f) return '—'
  return f.proyecto?.nombre_display || f.proyecto?.nombre_clientes || f.proyecto_nombre_raw || '—'
}

const cardStyle = (f) => {
  const border = f.estado?.es_terminal
    ? 'border-left:3px solid #10B981'
    : f.dias_abierta >= 7 ? 'border-left:3px solid #EF4444'
    : f.dias_abierta >= 4 ? 'border-left:3px solid #F59E0B'
    : 'border-left:3px solid #10B981'
  return `background:#fff;border-color:#e8e0f0;${border}`
}

const tagStyle = (estado) => {
  if (!estado) return 'background:#f3f4f6;color:#6b7280;border:none'
  const m = {
    activa:      'background:#FEF2F2;color:#EF4444;border:1px solid #FECACA',
    en_revision: 'background:#FFFBEB;color:#B45309;border:1px solid #FDE68A',
    programada:  'background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE',
    terminada:   'background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0',
  }
  return m[estado.codigo] || 'background:#f3f4f6;color:#6b7280;border:none'
}

const prioTagStyle = (p) => {
  if (!p) return 'background:#f3f4f6;color:#6b7280;border:none'
  const m = {
    critica: 'background:#FEF2F2;color:#DC2626;border:1px solid #FECACA',
    alta:    'background:#FFFBEB;color:#B45309;border:1px solid #FDE68A',
    media:   'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
    baja:    'background:#F9FAFB;color:#6B7280;border:1px solid #E5E7EB',
  }
  return m[p.codigo] || 'background:#f3f4f6;color:#6b7280;border:none'
}

const diasColor = (d) => !d ? '#9b89b5' : d >= 7 ? '#EF4444' : d >= 4 ? '#F59E0B' : '#10B981'

const slaLabel = (f) => {
  if (!f.sla_limite_dias || f.dias_abierta == null) return '—'
  const pct = Math.round(f.dias_abierta / f.sla_limite_dias * 100)
  if (f.estado?.es_terminal) return f.sla_cumplido ? '✅ Cumplido' : '❌ Excedió'
  return pct > 100 ? `❌ ${pct}%` : `${pct}%`
}

const slaColor = (f) => {
  if (!f.sla_limite_dias || f.dias_abierta == null) return '#9b89b5'
  const pct = f.dias_abierta / f.sla_limite_dias * 100
  return pct >= 100 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981'
}

const slaBarStyle = (f) => {
  if (!f.sla_limite_dias || f.dias_abierta == null) return 'width:0%'
  const pct = Math.min(f.dias_abierta / f.sla_limite_dias * 100, 100)
  const bg = pct >= 100 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981'
  return `width:${pct}%;background:${bg}`
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })
}

// ── carga de datos ───────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize.value }
    if (filters.buscar)          params.buscar           = filters.buscar
    if (filters.proyecto_id)     params.proyecto_id      = filters.proyecto_id
    if (filters.estado_codigo)   params.estado_codigo    = filters.estado_codigo
    if (filters.prioridad_codigo)params.prioridad_codigo = filters.prioridad_codigo
    if (filters.tipo_codigo)     params.tipo_codigo      = filters.tipo_codigo
    if (filters.solo_alerta)     params.solo_alerta      = true

    const { data } = await api.get('/fallas', { params })
    items.value = data.items
    total.value = data.total
    lastRefresh.value = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al cargar fallas', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const { data } = await api.get('/fallas/stats/resumen')
    Object.assign(stats.value, data)
  } catch { /* silencioso */ }
}

async function loadCatalogos() {
  try {
    const { data } = await api.get('/fallas/catalogos')
    Object.assign(catalogos, data)
  } catch { /* silencioso */ }
}

async function loadProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 300 } })
    proyectos.value = data.items || data
  } catch { /* silencioso */ }
}

async function loadAll() {
  await Promise.all([load(), loadStats()])
}

onMounted(async () => {
  await Promise.all([loadCatalogos(), loadProyectos()])
  await loadAll()
})

// ── acciones ─────────────────────────────────────────────────
let searchTimer
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
}

function onPage(e) { page.value = e.page + 1; load() }

function clearFilters() {
  Object.assign(filters, { buscar: '', proyecto_id: null, estado_codigo: null,
                            prioridad_codigo: null, tipo_codigo: null, solo_alerta: false })
  page.value = 1
  load()
}

function openNew() { formVisible.value = true }

async function openDetail(falla) {
  try {
    const { data } = await api.get(`/fallas/${falla.id}`)
    selectedFalla.value = data
    drawerVisible.value  = true
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo cargar el detalle', life: 3000 })
  }
}

function openSeguimiento(falla) {
  segFalla.value  = falla
  segNota.value   = ''
  segEstado.value = null
  segVisible.value = true
}

async function saveSeguimiento() {
  if (!segNota.value.trim() || !segFalla.value) return
  segLoading.value = true
  try {
    await api.post(`/fallas/${segFalla.value.id}/seguimientos`, {
      nota:         segNota.value.trim(),
      estado_nuevo: segEstado.value || null,
    })
    toast.add({ severity: 'success', summary: 'Seguimiento guardado', life: 2500 })
    segVisible.value = false
    loadAll()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    segLoading.value = false
  }
}

async function onFallaCreated() {
  formVisible.value = false
  toast.add({ severity: 'success', summary: 'Falla registrada', life: 2500 })
  await loadAll()
}

async function onFallaUpdated(updated) {
  selectedFalla.value = updated
  await loadAll()
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium mb-1; color: #6b5a8a; }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
