<template>
  <div class="space-y-4">
    <!-- Header -->
    <PageHeader title="Proyectos" subtitle="Portafolio de plantas y servicios">
      <template #actions>
        <Button label="Inversores minigranja" icon="pi pi-bolt" size="small" severity="secondary" outlined
                :loading="invBackfillLoading" @click="previewInversoresBackfill"
                v-tooltip.bottom="'Crear los 5 inversores típicos (3×300 + 50 + 40 kW) en minigranjas que aún no los tienen'" />
        <Button v-has-permission="PERMISSIONS.PROJECTS_CREATE" label="Nuevo proyecto" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <!-- Filtros -->
    <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-end border" style="border-color:#ECE7F2">
      <div>
        <label class="field-label">Buscar</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="filters.q" placeholder="Nombre comercial…" class="w-56" />
        </IconField>
      </div>
      <div>
        <label class="field-label">Estado</label>
        <Select v-model="filters.estado" :options="ESTADOS" class="w-40" placeholder="Todos" showClear />
      </div>
      <div>
        <label class="field-label">Tipo</label>
        <Select v-model="filters.tipo_proyecto" :options="TIPOS_PROYECTO" class="w-44" placeholder="Todos" showClear />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl shadow-sm p-10 flex justify-center">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400" />
    </div>

    <!-- Sections by tipo -->
    <template v-else>
      <div v-if="!sectionList.length"
           class="bg-white rounded-xl shadow-sm p-10 text-center text-sm text-gray-400">
        No se encontraron proyectos con los filtros aplicados.
      </div>

      <div v-for="section in sectionList" :key="section.tipo"
           class="bg-white rounded-xl shadow-sm overflow-hidden border" style="border-color:#ECE7F2">

        <!-- Section header (toggle) -->
        <button
          class="w-full flex items-center gap-3 px-4 py-2.5 text-left select-none
                 hover:bg-gray-50 transition-colors duration-150"
          @click="toggleSection(section.tipo)">
          <!-- color dot -->
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ background: TIPO_DOT[section.tipo] || '#9CA3AF' }" />
          <!-- label -->
          <span class="font-semibold text-gray-800 text-sm flex-1">
            {{ TIPO_LABELS[section.tipo] || section.tipo }}
          </span>
          <!-- count -->
          <span class="text-xs text-gray-400 font-medium">
            ({{ section.items.length }})
          </span>
          <!-- chevron -->
          <i class="pi pi-chevron-down text-gray-400 text-xs ml-2 chevron-icon transition-transform duration-200"
             :class="{ 'rotate-180': openSections.has(section.tipo) }" />
        </button>

        <!-- Collapsible table -->
        <div class="section-collapse" :class="{ open: openSections.has(section.tipo) }">
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50 border-t border-gray-100">
                  <!-- Sticky: Nombre + TSF -->
                  <th class="sticky-col text-left px-4 py-2.5 font-medium text-gray-500 text-xs
                              uppercase tracking-wide" style="min-width:220px">
                    <span class="block text-[10px] text-gray-400 font-normal normal-case tracking-normal">
                      Cód. TSF
                    </span>
                    <span>Nombre comercial</span>
                  </th>
                  <th class="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide
                              whitespace-nowrap">Estado</th>
                  <th class="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide
                              whitespace-nowrap">Tipo</th>
                  <th class="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide
                              whitespace-nowrap">Capacidad instalada (kWp)</th>
                  <th class="text-right px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide
                              whitespace-nowrap">Potencia AC (kW)</th>
                  <th class="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide
                              whitespace-nowrap" style="min-width:140px">Servicios</th>
                  <th class="text-left px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide
                              whitespace-nowrap" style="min-width:110px">Inversionistas</th>
                  <th class="px-4 py-2.5" style="width:116px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in section.items" :key="row.id"
                    class="border-t border-gray-100 hover:bg-gray-50/70 transition-colors duration-100 row-hover">

                  <!-- Nombre + TSF (sticky) -->
                  <td class="sticky-col px-4 py-2" style="min-width:220px">
                    <span class="block text-[11px] leading-tight"
                          :class="row.codigo_tsf ? 'text-gray-400' : 'text-gray-300'">
                      {{ row.codigo_tsf || '—' }}
                    </span>
                    <span class="block text-sm text-gray-800 font-medium leading-snug mt-0.5">
                      {{ row.nombre_comercial }}
                    </span>
                  </td>

                  <!-- Estado -->
                  <td class="px-4 py-2 whitespace-nowrap">
                    <span class="estado-badge inline-flex items-center gap-1.5"
                          :class="ESTADO_CLASS[row.estado] || 'estado-default'">
                      <span v-if="row.estado === 'en_operacion'" class="pulse-dot" />
                      {{ ESTADO_LABELS[row.estado] || row.estado || '—' }}
                    </span>
                  </td>

                  <!-- Tipo -->
                  <td class="px-4 py-2 whitespace-nowrap">
                    <span class="tipo-badge"
                          :class="TIPO_BADGE_CLASS[row.tipo_proyecto] || 'badge-otro'">
                      {{ TIPO_LABELS[row.tipo_proyecto] || row.tipo_proyecto || '—' }}
                    </span>
                  </td>

                  <!-- Capacidad instalada (pestaña Técnico) -->
                  <td class="px-4 py-2 text-right font-mono text-xs text-gray-500">
                    {{ row.info_tecnica?.capacidad_instalada_kwp ?? '—' }}
                  </td>

                  <!-- Potencia AC (pestaña Técnico) -->
                  <td class="px-4 py-2 text-right font-mono text-xs text-gray-500">
                    {{ row.info_tecnica?.potencia_ac_kw ?? '—' }}
                  </td>

                  <!-- Servicios -->
                  <td class="px-4 py-2">
                    <div class="flex gap-1 flex-wrap">
                      <template v-for="srv in SERVICIOS_BADGES" :key="srv.key">
                        <span v-if="row[srv.key]"
                              class="srv-badge"
                              :class="{ 'tip': srv.tooltip }"
                              :data-tip="srv.tooltip || undefined">
                          {{ srv.badge }}
                        </span>
                      </template>
                    </div>
                  </td>

                  <!-- Inversionistas (avatares) -->
                  <td class="px-4 py-2">
                    <div v-if="row.inversionistas?.length"
                         class="avatar-stack"
                         :style="{ width: avatarStackWidth(Math.min(row.inversionistas.length, 4)) }">
                      <span v-for="(inv, idx) in row.inversionistas.slice(0, 3)" :key="inv.id"
                            class="avatar-circle tip"
                            :style="{ ...avatarColor(inv.cliente_nombre), left: (idx * 20) + 'px', zIndex: 10 - idx }"
                            :data-tip="inv.cliente_nombre">
                        {{ getInitials(inv.cliente_nombre) }}
                      </span>
                      <span v-if="row.inversionistas.length > 3"
                            class="avatar-circle avatar-more"
                            :style="{ left: '60px', zIndex: 7 }">
                        +{{ row.inversionistas.length - 3 }}
                      </span>
                    </div>
                    <span v-else class="text-gray-300 text-xs">—</span>
                  </td>

                  <!-- Acciones -->
                  <td class="px-4 py-2">
                    <div class="flex gap-0.5 justify-end">
                      <Button icon="pi pi-eye" text size="small"
                              @click="goDetail(row)" v-tooltip="'Ver detalle'" />
                      <Button v-has-permission="PERMISSIONS.PROJECTS_EDIT" icon="pi pi-pencil" text size="small" severity="info"
                              @click="goEdit(row)" v-tooltip="'Editar'" />
                      <Button v-has-permission="PERMISSIONS.PROJECTS_DELETE" icon="pi pi-trash" text size="small" severity="danger"
                              @click="confirmDelete(row)" v-tooltip="'Eliminar'" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Dialog: Nuevo proyecto -->
    <Dialog v-model:visible="dialogVisible" header="Nuevo proyecto" modal class="w-full max-w-xl">
      <ProyectoForm @save="onCreate" @cancel="dialogVisible = false" />
    </Dialog>

    <!-- Dialog: Confirmar eliminación -->
    <Dialog v-model:visible="deleteVisible" header="Eliminar proyecto" modal class="w-full max-w-sm">
      <p class="text-sm text-gray-700 mb-4">
        ¿Estás seguro de que deseas eliminar
        <strong>{{ deleteProyecto?.nombre_comercial }}</strong>?
        Esta acción no se puede deshacer.
      </p>
      <div class="flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" @click="deleteVisible = false" />
        <Button label="Eliminar" severity="danger" :loading="deleting" @click="doDelete" />
      </div>
    </Dialog>

    <!-- Dialog: sembrar inversores típicos de minigranja -->
    <Dialog v-model:visible="invBackfillVisible" header="Inversores típicos de minigranja" modal class="w-full max-w-2xl">
      <div v-if="invBackfillReport" class="space-y-3 text-sm">
        <p class="text-gray-700">
          Se crearán los inversores típicos en cada proyecto que aún <b>no tiene ninguno</b>
          (nunca duplica): <b>Inversor 1, 2, 3</b> de 300 kW, <b>Inversor 4</b> de 50 kW y
          <b>Inversor 5</b> de 40 kW. Los números identifican cada inversor al reportar fallas.
        </p>

        <label class="flex items-center gap-2 text-gray-700 select-none cursor-pointer">
          <input type="checkbox" v-model="invBackfillSoloMini" @change="previewInversoresBackfill" />
          Solo proyectos con tipo <b>minigranja</b>
          <span class="text-xs text-gray-400">(desmarca para incluir cualquier proyecto sin inversores)</span>
        </label>

        <div class="flex flex-wrap gap-4 p-3 rounded-lg" style="background:#F6F3FB;">
          <span style="color:#16a34a;"><b>{{ invBackfillReport.a_sembrar }}</b> se sembrarán</span>
          <span style="color:#7a6e8a;"><b>{{ invBackfillReport.ya_tienen_inversores }}</b> ya tienen inversores</span>
          <span class="text-gray-400">{{ invBackfillReport.total_candidatos }} candidatos en total</span>
        </div>

        <div v-if="invBackfillReport.sembrados.length" class="max-h-60 overflow-y-auto border rounded-lg" style="border-color:#eee;">
          <table class="w-full text-xs">
            <tbody>
              <tr v-for="r in invBackfillReport.sembrados" :key="r.id" class="border-t" style="border-color:#f0f0f0;">
                <td class="px-3 py-1.5 text-gray-400">ID {{ r.id }}</td>
                <td class="px-3 py-1.5">{{ r.nombre }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-xs" style="color:#7a6e8a;">No hay proyectos pendientes de sembrar.</p>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="invBackfillVisible = false" :disabled="invBackfillExecuting" />
        <Button label="Sembrar" icon="pi pi-check" :loading="invBackfillExecuting"
                :disabled="!invBackfillReport || !invBackfillReport.a_sembrar" @click="applyInversoresBackfill" />
      </template>
    </Dialog>

    <!-- Dialog: Nombre parecido a uno existente -->
    <Dialog v-model:visible="duplicadoVisible" header="Proyecto parecido ya existe" modal class="w-full max-w-sm">
      <p class="text-sm text-gray-700 mb-4">
        Ya existe un proyecto con un nombre muy parecido:
        <strong>{{ duplicadoInfo?.candidato_nombre }}</strong>
        (ID {{ duplicadoInfo?.candidato_id }}).
        Si de verdad es un proyecto distinto, puedes crearlo igual.
      </p>
      <div class="flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" @click="duplicadoVisible = false" />
        <Button label="Crear de todos modos" :loading="forzando" @click="crearForzado" />
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import ProyectoForm from './ProyectoForm.vue'
import { PERMISSIONS } from '@/utils/permissionDefinitions'

const router = useRouter()
const toast  = useToast()

// ── Backfill inversores típicos de minigranja ────────────────────────────────
const invBackfillVisible   = ref(false)
const invBackfillReport    = ref(null)
const invBackfillLoading   = ref(false)
const invBackfillExecuting = ref(false)
const invBackfillSoloMini  = ref(true)

async function previewInversoresBackfill() {
  invBackfillLoading.value = true
  try {
    const { data } = await api.post('/proyectos/inversores/backfill-minigranja', null,
      { params: { dry_run: true, solo_minigranja: invBackfillSoloMini.value } })
    invBackfillReport.value = data
    invBackfillVisible.value = true
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo previsualizar',
      detail: e.response?.data?.detail || e.message, life: 5000 })
  } finally {
    invBackfillLoading.value = false
  }
}

async function applyInversoresBackfill() {
  invBackfillExecuting.value = true
  try {
    const { data } = await api.post('/proyectos/inversores/backfill-minigranja', null,
      { params: { dry_run: false, solo_minigranja: invBackfillSoloMini.value } })
    toast.add({ severity: 'success', summary: 'Inversores sembrados',
      detail: `${data.a_sembrar} proyectos ahora tienen sus 5 inversores`, life: 5000 })
    invBackfillVisible.value = false
    invBackfillReport.value = null
    await load()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'El backfill falló',
      detail: e.response?.data?.detail || e.message, life: 6000 })
  } finally {
    invBackfillExecuting.value = false
  }
}

// ── Catálogos ──────────────────────────────────────────────────────────────────
const ESTADOS       = ['en_desarrollo', 'en_operacion', 'suspendido', 'cancelado']
const TIPOS_PROYECTO = ['minigranja', 'autoconsumo', 'gd', 'movilidad_electrica', 'otro']

const SERVICIOS_BADGES = [
  { key: 'srv_operacion',    badge: 'OP',   tooltip: null },
  { key: 'srv_representacion', badge: 'REP', tooltip: 'Reporte de energía producida' },
  { key: 'srv_cgm',          badge: 'CGM',  tooltip: 'Control y gestión de medición' },
  { key: 'srv_ppa',          badge: 'PPA',  tooltip: null },
  { key: 'srv_promotor',     badge: 'PROM', tooltip: null },
  { key: 'srv_rec',          badge: 'REC',  tooltip: null },
]

const TIPO_LABELS = {
  minigranja:        'Minigranja',
  autoconsumo:       'Autoconsumo',
  gd:                'GD',
  movilidad_electrica: 'Movilidad',
  otro:              'Otro',
}

// Dot color for section header
const TIPO_DOT = {
  minigranja:        '#10B981',
  autoconsumo:       '#6366F1',
  gd:                '#3B82F6',
  movilidad_electrica: '#8B5CF6',
  otro:              '#9CA3AF',
}

// CSS class for tipo pill
const TIPO_BADGE_CLASS = {
  minigranja:        'badge-minigranja',
  autoconsumo:       'badge-autoconsumo',
  gd:                'badge-gd',
  movilidad_electrica: 'badge-movilidad',
  otro:              'badge-otro',
}

// CSS class for estado pill
const ESTADO_CLASS = {
  en_operacion:   'estado-operacion',
  suspendido:     'estado-suspendido',
  en_construccion:'estado-construccion',
  en_desarrollo:  'estado-default',
  cancelado:      'estado-default',
}

const ESTADO_LABELS = {
  en_operacion:    'En operación',
  en_desarrollo:   'En desarrollo',
  suspendido:      'Suspendido',
  cancelado:       'Cancelado',
  en_construccion: 'En construcción',
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#FBEAF0', fg: '#72243E' },
]

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function avatarColor(name) {
  const c = AVATAR_PALETTE[hashStr(name || '') % AVATAR_PALETTE.length]
  return { background: c.bg, color: c.fg }
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// Container width for N avatars (28px diameter, 20px step, 2px border overlap)
function avatarStackWidth(n) {
  return (28 + Math.max(0, n - 1) * 20) + 'px'
}

// ── Estado ─────────────────────────────────────────────────────────────────────
const allItems    = ref([])
const loading     = ref(false)
const dialogVisible = ref(false)
const deleteVisible = ref(false)
const deleteProyecto = ref(null)
const deleting    = ref(false)
const duplicadoVisible = ref(false)
const duplicadoInfo = ref(null)   // { mensaje, candidato_id, candidato_nombre }
const pendingPayload = ref(null)  // payload a reintentar con forzar=true
const forzando = ref(false)
const openSections = ref(new Set())    // reactive Set via full replacement

const filters  = reactive({ q: '', estado: null, tipo_proyecto: null })

// ── Filtrado + agrupación ──────────────────────────────────────────────────────
const filteredItems = computed(() => {
  let list = allItems.value
  if (filters.q) {
    const q = filters.q.toLowerCase()
    list = list.filter(p => p.nombre_comercial?.toLowerCase().includes(q))
  }
  if (filters.estado)        list = list.filter(p => p.estado === filters.estado)
  if (filters.tipo_proyecto) list = list.filter(p => p.tipo_proyecto === filters.tipo_proyecto)
  return list
})

const TIPO_ORDER = ['minigranja', 'autoconsumo', 'gd', 'movilidad_electrica', 'otro']

const sectionList = computed(() => {
  const groups = {}
  for (const item of filteredItems.value) {
    const t = item.tipo_proyecto || 'otro'
    if (!groups[t]) groups[t] = []
    groups[t].push(item)
  }
  return TIPO_ORDER
    .filter(t => groups[t]?.length)
    .map(t => ({ tipo: t, items: groups[t] }))
})

// ── Secciones colapsables ──────────────────────────────────────────────────────
function toggleSection(tipo) {
  const s = new Set(openSections.value)
  if (s.has(tipo)) s.delete(tipo)
  else s.add(tipo)
  openSections.value = s
}

// ── Carga de datos ─────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/proyectos', { params: { page: 1, size: 200 } })
    allItems.value = data.items ?? data
    // Abrir la primera sección automáticamente en la carga inicial
    if (openSections.value.size === 0) {
      const first = sectionList.value[0]?.tipo
      if (first) openSections.value = new Set([first])
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
})

function goDetail(row) { router.push(`/proyectos/${row.id}`) }
function goEdit(row)   { router.push(`/proyectos/${row.id}?edit=true`) }
function openNew()     { dialogVisible.value = true }

function confirmDelete(row) {
  deleteProyecto.value = row
  deleteVisible.value  = true
}

async function onCreate(payload) {
  try {
    await api.post('/proyectos', payload)
    toast.add({ severity: 'success', summary: 'Proyecto creado', life: 3000 })
    dialogVisible.value = false
    load()
  } catch (e) {
    const detail = e.response?.data?.detail
    // Aviso de nombre parecido (409 estructurado): se puede confirmar y crear
    // igual. Distinto de un choque real de columna única (detail es un string).
    if (e.response?.status === 409 && detail?.duplicado_nombre) {
      duplicadoInfo.value = detail
      pendingPayload.value = payload
      duplicadoVisible.value = true
      return
    }
    toast.add({ severity: 'error', summary: 'Error', detail: typeof detail === 'string' ? detail : 'Error al guardar', life: 4000 })
  }
}

async function crearForzado() {
  forzando.value = true
  try {
    await api.post('/proyectos', pendingPayload.value, { params: { forzar: true } })
    toast.add({ severity: 'success', summary: 'Proyecto creado', life: 3000 })
    duplicadoVisible.value = false
    dialogVisible.value = false
    load()
  } catch (e) {
    const detail = e.response?.data?.detail
    toast.add({ severity: 'error', summary: 'Error', detail: typeof detail === 'string' ? detail : 'Error al guardar', life: 4000 })
  } finally {
    forzando.value = false
  }
}

async function doDelete() {
  deleting.value = true
  try {
    await api.delete(`/proyectos/${deleteProyecto.value.id}`)
    toast.add({ severity: 'success', summary: 'Proyecto eliminado', life: 3000 })
    deleteVisible.value = false
    load()
  } catch (e) {
    const detail = e.response?.data?.detail || 'Error al eliminar'
    toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail, life: 5000 })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* ── Misc ────────────────────────────────────────────────────────────────────── */
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }

/* ── Sticky primera columna ──────────────────────────────────────────────────── */
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #ffffff;
  border-right: 1px solid #E5E7EB;
  transition: background 0.1s;
}
thead .sticky-col {
  background: #F9FAFB;
  z-index: 3;
}
.row-hover:hover .sticky-col {
  background: #F8FAFC;
}

/* ── Collapsible sections ────────────────────────────────────────────────────── */
.section-collapse {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s ease-out;
}
.section-collapse.open {
  max-height: 4000px;
  transition: max-height 0.45s ease-in;
}

.chevron-icon {
  display: inline-block;
}

/* ── Estado badges ───────────────────────────────────────────────────────────── */
.estado-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.estado-operacion   { background: #D1FAE5; color: #065F46; }
.estado-suspendido  { background: #FEF3C7; color: #92400E; }
.estado-construccion{ background: #DBEAFE; color: #1E40AF; }
.estado-default     { background: #F3F4F6; color: #374151; }

/* ── Pulse dot (en_operacion) ────────────────────────────────────────────────── */
.pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10B981;
  flex-shrink: 0;
  animation: pulse-dot 1.5s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1);   opacity: 1;   }
  50%       { transform: scale(1.4); opacity: 0.65; }
}

/* ── Tipo badges ─────────────────────────────────────────────────────────────── */
.tipo-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.badge-minigranja  { background: #D1FAE5; color: #065F46; }
.badge-gd          { background: #DBEAFE; color: #1E40AF; }
.badge-autoconsumo { background: #E1F5EE; color: #085041; }
.badge-movilidad   { background: #EEEDFE; color: #3C3489; }
.badge-otro        { background: #F3F4F6; color: #374151; }

/* ── Service badges ──────────────────────────────────────────────────────────── */
.srv-badge {
  @apply bg-green-100 text-green-800 text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-default;
}

/* ── Avatar stack ────────────────────────────────────────────────────────────── */
.avatar-stack {
  position: relative;
  height: 28px;
  flex-shrink: 0;
}
.avatar-circle {
  position: absolute;
  top: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  cursor: default;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.avatar-circle:hover {
  transform: translateY(-2px) scale(1.1);
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  z-index: 30 !important;
}
.avatar-more {
  background: #F3F4F6;
  color: #6B7280;
  font-size: 9px;
}

/* ── Tooltip CSS puro (srv-badge y avatar-circle) ────────────────────────────── */
.tip {
  position: relative;
}
/* caja oscura */
.tip::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #1a1a1a;
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 200;
}
/* flecha */
.tip::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 1px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  border: 5px solid transparent;
  border-top-color: #1a1a1a;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 200;
}
.tip:hover::after,
.tip:hover::before {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
