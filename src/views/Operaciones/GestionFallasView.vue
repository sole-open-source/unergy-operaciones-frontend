<template>
  <div class="space-y-4">

    <!-- ══ HEADER (siempre full width) ═══════════════════════════════════ -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center" style="background: rgba(145,91,216,0.12)">
          <i class="pi pi-bolt text-base" style="color:#915BD8" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-800">Gestión de Fallas</h2>
          <p class="text-xs text-gray-500">Operación diaria · registro, asignación y resolución de incidencias</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button label="Actualizar" icon="pi pi-refresh" outlined size="small"
          :loading="loading" @click="cargar" />
        <Button label="Nueva falla" icon="pi pi-plus" size="small" @click="abrirCrear" />
      </div>
    </div>

  <div :class="['gf-layout', drawerVisible && 'gf-layout--split']">

  <div class="gf-main space-y-4 min-w-0">

    <!-- ══ BUCKETS / KPIs ═══════════════════════════════════════════════ -->
    <div class="gf-buckets grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button v-for="b in BUCKETS" :key="b.key"
        class="bucket-card" :class="{ 'bucket-card--active': bucket === b.key }"
        :style="bucketActiveStyle(b.color, bucket === b.key)"
        @click="bucket = b.key">
        <div class="bucket-icon" :style="{ background: b.color + '20', color: b.color }">
          <i :class="b.icon" />
        </div>
        <div class="flex-1 text-left">
          <div class="bucket-count" :style="{ color: b.color }">{{ counts[b.key] }}</div>
          <div class="bucket-label">{{ b.label }}</div>
        </div>
        <div class="bucket-bar" :style="{ background: b.color }" />
      </button>
    </div>

    <!-- ══ TOOLBAR ═══════════════════════════════════════════════════════ -->
    <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap items-center gap-2">
      <IconField class="flex-1 min-w-[240px] max-w-md">
        <InputIcon class="pi pi-search" />
        <InputText ref="searchInputRef" v-model="search"
          placeholder="Buscar por código, descripción, proyecto, tipo..."
          class="w-full" />
      </IconField>
      <Select v-model="filtroProyecto" :options="proyectos" optionLabel="nombre_comercial"
        optionValue="id" placeholder="Proyecto" showClear filter class="w-44" />
      <Select v-model="filtroPrioridad" :options="catalogos.prioridades"
        optionLabel="etiqueta" optionValue="codigo" placeholder="Prioridad" showClear class="w-36" />
      <Select v-model="filtroAsignado" :options="opcionesAsignado"
        optionLabel="label" optionValue="value" placeholder="Responsable" showClear filter class="w-44" />
      <Select v-model="filtroEstado" :options="catalogos.estados"
        optionLabel="etiqueta" optionValue="codigo" placeholder="Estado" showClear class="w-36" />
      <DatePicker v-model="filtroFechaDesde" placeholder="Desde" dateFormat="yy-mm-dd"
        showButtonBar class="w-32" />
      <DatePicker v-model="filtroFechaHasta" placeholder="Hasta" dateFormat="yy-mm-dd"
        showButtonBar class="w-32" />
      <Button v-if="hayFiltros" label="Limpiar" icon="pi pi-times" text size="small"
        severity="secondary" @click="limpiarFiltros" />
      <div class="ml-auto text-xs text-gray-500" v-if="!loading">
        {{ filtradas.length }} de {{ porBucket.length }}
      </div>
    </div>

    <!-- ══ TABLA ═══════════════════════════════════════════════════════════ -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div v-if="error" class="p-6 flex items-center gap-3 text-red-600">
        <i class="pi pi-exclamation-circle text-xl" />
        <div class="flex-1">
          <div class="font-semibold">Error al cargar</div>
          <div class="text-sm text-gray-500">{{ error }}</div>
        </div>
        <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargar" />
      </div>
      <DataTable v-else :value="filtradas" :loading="loading" rowHover stripedRows
        class="gf-table text-sm" :rows="25" paginator
        :rowsPerPageOptions="[15, 25, 50, 100]" :alwaysShowPaginator="false"
        @row-click="(e) => abrirDrawer(e.data)" selectionMode="single"
        :rowClass="rowClass" scrollable>
        <template #empty>
          <div class="flex flex-col items-center py-14 gap-2 text-gray-400">
            <i :class="bucketActual.icon + ' text-4xl'" :style="{ color: bucketActual.color }" />
            <p class="text-sm font-semibold text-gray-700">{{ emptyTitulo }}</p>
            <p class="text-xs">{{ emptySubtitulo }}</p>
            <Button v-if="bucket === 'activas' && !hayFiltros" label="Registrar primera falla"
              icon="pi pi-plus" outlined size="small" class="mt-2" @click="abrirCrear" />
            <Button v-else-if="hayFiltros" label="Limpiar filtros" icon="pi pi-times" text size="small"
              class="mt-2" @click="limpiarFiltros" />
          </div>
        </template>

        <Column header="" style="width:6px;padding:0" :pt="{ headerCell: { style: 'padding:0; border:none' } }">
          <template #body="{ data }">
            <div class="prio-stripe" :style="{ background: prioColor(data.prioridad?.codigo) }" />
          </template>
        </Column>

        <Column field="codigo_interno" header="Código" style="width:110px" sortable>
          <template #body="{ data }">
            <code class="font-mono text-xs text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">{{ data.codigo_interno }}</code>
          </template>
        </Column>

        <Column header="Falla" style="min-width:280px">
          <template #body="{ data }">
            <div class="flex items-start gap-2">
              <span class="cat-dot mt-1.5 flex-shrink-0"
                :style="{ background: data.tipo?.categoria?.color_hex || '#915BD8' }"
                v-tooltip.top="data.tipo?.categoria?.etiqueta || ''" />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-800 truncate">{{ data.tipo?.etiqueta || 'Sin tipo' }}</div>
                <div class="text-xs text-gray-500 line-clamp-1">{{ data.descripcion }}</div>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Proyecto" style="min-width:130px">
          <template #body="{ data }">
            <span class="text-sm text-gray-700">{{ data.proyecto?.nombre_comercial || '—' }}</span>
          </template>
        </Column>

        <Column header="Asignado" style="width:160px">
          <template #body="{ data }">
            <div v-if="data.asignado_a" class="flex items-center gap-2">
              <div class="avatar-sm" :style="avatarStyle(data.asignado_a)">
                {{ initials(data.asignado_a.nombre) }}
              </div>
              <span class="text-xs text-gray-700 truncate flex-1">{{ data.asignado_a.nombre }}</span>
            </div>
            <div v-else class="flex items-center gap-2 text-gray-400">
              <div class="avatar-sm avatar-sm--empty"><i class="pi pi-user text-[10px]" /></div>
              <span class="text-xs">Sin asignar</span>
            </div>
          </template>
        </Column>

        <Column header="Prioridad" style="width:100px">
          <template #body="{ data }">
            <span class="prio-pill" :style="prioPillStyle(data.prioridad?.codigo)">
              {{ data.prioridad?.etiqueta || '—' }}
            </span>
          </template>
        </Column>

        <Column header="Estado" style="width:130px">
          <template #body="{ data }">
            <Tag :value="data.estado?.etiqueta || '—'" :style="estadoPillStyle(data.estado?.color_hex)" />
          </template>
        </Column>

        <Column header="SLA" style="width:100px">
          <template #body="{ data }">
            <div v-if="data.sla_limite_horas" class="sla-mini">
              <div class="sla-mini-bar">
                <div class="sla-mini-fill" :style="slaFillStyle(data)" />
              </div>
              <span class="sla-mini-text" :style="{ color: slaTextColor(data) }">{{ slaText(data) }}</span>
            </div>
            <span v-else class="text-xs text-gray-300">—</span>
          </template>
        </Column>

        <Column header="Fecha" style="width:100px" field="fecha_identificacion" sortable>
          <template #body="{ data }">
            <div class="text-xs">
              <div class="text-gray-700">{{ fmtFecha(data.fecha_identificacion) }}</div>
              <div class="text-gray-400">{{ relativeTime(data.fecha_identificacion) }}</div>
            </div>
          </template>
        </Column>

        <Column header="" style="width:120px">
          <template #body="{ data }">
            <div class="row-actions" @click.stop>
              <Button v-if="!data.estado?.es_estado_final" icon="pi pi-check-circle"
                text rounded size="small" severity="success"
                @click="quickResolve(data)" v-tooltip.left="'Marcar resuelta'" />
              <Button icon="pi pi-pencil" text rounded size="small" severity="info"
                @click="abrirEditar(data)" v-tooltip.left="'Editar'" />
              <Button icon="pi pi-arrow-right" text rounded size="small" severity="secondary"
                @click="abrirDrawer(data)" v-tooltip.left="'Ver detalle'" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

  </div><!-- /gf-main -->

    <!-- ══ PANEL DETALLE ════════════════════════════════════════════════ -->
    <aside v-if="drawerVisible && drawerFalla" class="gf-aside" @keydown.left.stop="navegar(-1)" @keydown.right.stop="navegar(1)">
      <!-- Backdrop solo en móvil -->
      <div class="gf-aside-backdrop" @click="drawerVisible = false" />
      <div class="gf-aside-panel">
        <!-- Header panel -->
        <div class="gf-drawer-header">
          <Button icon="pi pi-times" text rounded size="small" @click="drawerVisible = false" v-tooltip.bottom="'Cerrar (Esc)'" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="font-mono text-sm text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{{ drawerFalla.codigo_interno }}</code>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-sm font-medium text-gray-700 truncate">{{ drawerFalla.tipo?.etiqueta }}</span>
              <span v-if="navIndex >= 0" class="text-[10px] text-gray-400 ml-auto whitespace-nowrap">
                {{ navIndex + 1 }} / {{ filtradas.length }}
              </span>
            </div>
          </div>
          <Button icon="pi pi-chevron-left" text rounded size="small" severity="secondary"
            :disabled="navIndex <= 0" @click="navegar(-1)" v-tooltip.bottom="'Anterior (←)'" />
          <Button icon="pi pi-chevron-right" text rounded size="small" severity="secondary"
            :disabled="navIndex < 0 || navIndex >= filtradas.length - 1" @click="navegar(1)" v-tooltip.bottom="'Siguiente (→)'" />
          <Button icon="pi pi-external-link" text rounded size="small" severity="secondary"
            @click="$router.push(`/fallas/${drawerFalla.id}`)" v-tooltip.bottom="'Abrir página completa'" />
          <Button icon="pi pi-trash" text rounded size="small" severity="danger"
            @click="confirmDelete(drawerFalla)" v-tooltip.bottom="'Eliminar'" />
        </div>

        <!-- Body drawer -->
        <div class="gf-drawer-body">

          <!-- Badges + meta -->
          <div class="space-y-2">
            <div class="flex flex-wrap gap-1.5">
              <Tag :value="drawerFalla.estado?.etiqueta" :style="estadoPillStyle(drawerFalla.estado?.color_hex)" />
              <span class="prio-pill" :style="prioPillStyle(drawerFalla.prioridad?.codigo)">
                {{ drawerFalla.prioridad?.etiqueta }}
              </span>
              <Tag v-if="drawerFalla.tipo?.categoria" :value="drawerFalla.tipo.categoria.etiqueta"
                :style="catTagStyle(drawerFalla.tipo.categoria.color_hex)" />
            </div>
            <div class="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              <span v-if="drawerFalla.proyecto" class="inline-flex items-center gap-1">
                <i class="pi pi-building" /> {{ drawerFalla.proyecto.nombre_comercial }}
              </span>
              <span class="inline-flex items-center gap-1">
                <i class="pi pi-calendar" /> Identificada {{ relativeTime(drawerFalla.fecha_identificacion) }}
              </span>
              <span v-if="drawerFalla.registrado_por" class="inline-flex items-center gap-1">
                <i class="pi pi-user" /> {{ drawerFalla.registrado_por.nombre }}
              </span>
            </div>
          </div>

          <!-- Quick actions con autosave -->
          <div class="bg-gray-50 rounded-lg p-3 space-y-2.5">
            <div class="flex items-center gap-2">
              <i class="pi pi-bolt text-xs" style="color:#915BD8" />
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Acciones rápidas</span>
              <span v-if="savingQuick" class="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
                <i class="pi pi-spin pi-spinner text-[10px]" /> Guardando...
              </span>
              <span v-else-if="savedFlash" class="ml-auto text-[10px] text-emerald-600 flex items-center gap-1">
                <i class="pi pi-check text-[10px]" /> Guardado
              </span>
            </div>
            <div class="grid grid-cols-1 gap-2">
              <div class="flex items-center gap-2">
                <label class="qa-label">Estado</label>
                <Select v-model="quickEdit.estado_id" :options="catalogos.estados"
                  optionLabel="etiqueta" optionValue="id" class="flex-1"
                  @change="autosaveQuick()" />
              </div>
              <div class="flex items-center gap-2">
                <label class="qa-label">Prioridad</label>
                <Select v-model="quickEdit.prioridad_id" :options="catalogos.prioridades"
                  optionLabel="etiqueta" optionValue="id" class="flex-1"
                  @change="autosaveQuick()" />
              </div>
              <div class="flex items-center gap-2">
                <label class="qa-label">Asignado</label>
                <Select v-model="quickEdit.asignado_a_id" :options="usuarios"
                  optionLabel="nombre" optionValue="id" placeholder="Sin asignar" showClear filter
                  class="flex-1" @change="autosaveQuick()" />
              </div>
            </div>
          </div>

          <!-- SLA -->
          <div v-if="drawerFalla.sla_limite_horas">
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-clock text-xs" style="color:#915BD8" />
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">SLA</span>
              <Tag class="ml-auto" :value="slaText(drawerFalla)" :severity="slaSeverity(drawerFalla)" />
            </div>
            <div class="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="h-full rounded-full transition-all" :style="slaFillStyle(drawerFalla)" />
            </div>
            <div class="flex justify-between text-[11px] text-gray-500 mt-1">
              <span>{{ horasTranscurridas(drawerFalla) }}h transcurridas</span>
              <span>Límite: {{ drawerFalla.sla_limite_horas }}h</span>
            </div>
          </div>

          <!-- Descripción -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-align-left text-xs" style="color:#915BD8" />
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Descripción</span>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ drawerFalla.descripcion }}</p>
          </div>

          <!-- Análisis (causa raíz / acciones correctivas) -->
          <div v-if="drawerFalla.causa_raiz || drawerFalla.acciones_correctivas">
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-search text-xs" style="color:#915BD8" />
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">Análisis</span>
            </div>
            <div class="space-y-2">
              <div v-if="drawerFalla.causa_raiz">
                <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Causa raíz</p>
                <p class="text-sm text-gray-700 whitespace-pre-line">{{ drawerFalla.causa_raiz }}</p>
              </div>
              <div v-if="drawerFalla.acciones_correctivas">
                <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Acciones correctivas</p>
                <p class="text-sm text-gray-700 whitespace-pre-line">{{ drawerFalla.acciones_correctivas }}</p>
              </div>
            </div>
          </div>

          <!-- Acción sugerida -->
          <div v-if="drawerFalla.tipo?.accion_sugerida"
            class="rounded-lg p-3" style="background: linear-gradient(135deg, #faf7ff 0%, #f3edff 100%); border:1px solid #e5d9ff">
            <div class="flex items-center gap-2 mb-1.5">
              <i class="pi pi-lightbulb text-xs" style="color:#915BD8" />
              <span class="text-xs font-semibold uppercase tracking-wide" style="color:#4a3b6b">Acción sugerida</span>
            </div>
            <p class="text-sm text-gray-700">{{ drawerFalla.tipo.accion_sugerida }}</p>
          </div>

          <!-- Seguimientos -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-comments text-xs" style="color:#915BD8" />
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Seguimientos ({{ drawerFalla.seguimientos?.length || 0 }})
              </span>
            </div>

            <!-- Add note -->
            <div class="bg-gray-50 rounded-lg p-2.5 space-y-2 mb-3">
              <Textarea v-model="nuevaNota.nota" rows="2" autoResize
                placeholder="Agregar nota o actualización..." class="w-full text-sm" />
              <div class="flex items-center gap-2">
                <Select v-model="nuevaNota.estado_id" :options="catalogos.estados"
                  optionLabel="etiqueta" optionValue="id" placeholder="Cambiar estado (opcional)"
                  showClear class="flex-1" />
                <Button label="Agregar" icon="pi pi-send" size="small"
                  :disabled="!nuevaNota.nota.trim() && !nuevaNota.estado_id"
                  :loading="addingSeg" @click="agregarSeguimiento" />
              </div>
            </div>

            <!-- Timeline -->
            <div v-if="sortedSeguimientos.length" class="space-y-2">
              <div v-for="seg in sortedSeguimientos" :key="seg.id" class="flex gap-2.5">
                <div class="avatar-sm flex-shrink-0" :style="avatarStyle(seg.usuario)">
                  {{ initials(seg.usuario?.nombre) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-xs font-semibold text-gray-800">{{ seg.usuario?.nombre || 'Sistema' }}</span>
                    <span class="text-[10px] text-gray-400">{{ relativeTime(seg.created_at, true) }}</span>
                  </div>
                  <p v-if="seg.nota" class="text-sm text-gray-700 whitespace-pre-line">{{ seg.nota }}</p>
                  <div v-if="seg.estado_nuevo" class="mt-1">
                    <Tag :value="seg.estado_nuevo?.etiqueta" :style="estadoPillStyle(seg.estado_nuevo?.color_hex)" class="text-[10px]" />
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">Aún no hay seguimientos.</p>
          </div>

        </div>

        <!-- Footer drawer: acción principal -->
        <div class="gf-drawer-footer">
          <Button label="Editar completa" icon="pi pi-pencil" outlined class="flex-1"
            @click="editarDesdeDrawer" />
          <Button v-if="!drawerFalla.estado?.es_estado_final" label="Marcar resuelta"
            icon="pi pi-check" severity="success" class="flex-1"
            :loading="resolvingFalla" @click="quickResolve(drawerFalla)" />
          <Button v-else label="Reabrir" icon="pi pi-replay" severity="warn" outlined
            class="flex-1" @click="reabrirFalla" />
        </div>
      </div><!-- /gf-aside-panel -->
    </aside>

  </div><!-- /gf-layout -->

    <!-- ══ DIALOG CREAR / EDITAR ══════════════════════════════════════════ -->
    <Dialog v-model:visible="formDialogVisible" modal class="w-full max-w-2xl"
      :header="editingFalla ? `Editar falla ${editingFalla.codigo_interno}` : 'Nueva falla'"
      :closable="!savingForm">
      <FallaForm :initial="editingFalla" :catalogos="catalogos"
        @save="onSaveForm" @cancel="formDialogVisible = false" />
    </Dialog>

  </div><!-- /outer space-y-4 -->
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import FallaForm from '@/views/Fallas/FallaForm.vue'
import api from '@/api/client'

const router = useRouter()
const toast = useToast()
const confirmService = useConfirm()

// ── Constantes ──────────────────────────────────────────────────────────
const BUCKETS = [
  { key: 'activas',     label: 'Activas',     icon: 'pi pi-bolt',          color: '#dc2626' },
  { key: 'programadas', label: 'Programadas', icon: 'pi pi-calendar-clock',color: '#2563eb' },
  { key: 'resueltas',   label: 'Resueltas',   icon: 'pi pi-check-circle',  color: '#16a34a' },
  { key: 'todas',       label: 'Todas',       icon: 'pi pi-list',          color: '#915BD8' },
]

const PRIO_COLORS = {
  critica: '#dc2626',
  alta:    '#ea580c',
  media:   '#d97706',
  baja:    '#6b7280',
}

const AVATAR_PALETTE = ['#915BD8', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777']

// ── Estado base ──────────────────────────────────────────────────────────
const allFallas = ref([])
const proyectos = ref([])
const usuarios = ref([])
const catalogos = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })

const loading = ref(false)
const error = ref(null)

const bucket = ref('activas')
const search = ref('')
const filtroProyecto = ref(null)
const filtroPrioridad = ref(null)
const filtroAsignado = ref(null)
const filtroEstado = ref(null)
const filtroFechaDesde = ref(null)
const filtroFechaHasta = ref(null)

const searchInputRef = ref(null)

// ── Drawer / detalle ─────────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerFalla = ref(null)
const quickEdit = reactive({
  estado_id: null,
  prioridad_id: null,
  asignado_a_id: null,
})
const savingQuick = ref(false)
const savedFlash = ref(false)
const resolvingFalla = ref(false)
const addingSeg = ref(false)
const nuevaNota = reactive({ nota: '', estado_id: null })

// ── Dialog formulario ────────────────────────────────────────────────────
const formDialogVisible = ref(false)
const editingFalla = ref(null)
const savingForm = ref(false)

// ── Computed ─────────────────────────────────────────────────────────────
const opcionesAsignado = computed(() => [
  { value: '__none__', label: 'Sin asignar' },
  ...usuarios.value.map(u => ({ value: u.id, label: u.nombre })),
])

const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

function bucketDeFalla(f) {
  if (f.estado?.es_estado_final) return 'resueltas'
  const fid = f.fecha_identificacion ? new Date(f.fecha_identificacion + 'T00:00:00') : null
  if (fid && fid.getTime() > hoy.getTime()) return 'programadas'
  return 'activas'
}

const counts = computed(() => {
  const c = { activas: 0, programadas: 0, resueltas: 0, todas: allFallas.value.length }
  for (const f of allFallas.value) c[bucketDeFalla(f)]++
  return c
})

const porBucket = computed(() => {
  if (bucket.value === 'todas') return allFallas.value
  return allFallas.value.filter(f => bucketDeFalla(f) === bucket.value)
})

const filtradas = computed(() => {
  let arr = porBucket.value
  const q = search.value.trim().toLowerCase()
  if (q) {
    arr = arr.filter(f =>
      (f.codigo_interno || '').toLowerCase().includes(q) ||
      (f.descripcion || '').toLowerCase().includes(q) ||
      (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q) ||
      (f.tipo?.etiqueta || '').toLowerCase().includes(q) ||
      (f.tipo?.categoria?.etiqueta || '').toLowerCase().includes(q)
    )
  }
  if (filtroProyecto.value) arr = arr.filter(f => f.proyecto?.id === filtroProyecto.value)
  if (filtroPrioridad.value) arr = arr.filter(f => f.prioridad?.codigo === filtroPrioridad.value)
  if (filtroEstado.value) arr = arr.filter(f => f.estado?.codigo === filtroEstado.value)
  if (filtroAsignado.value === '__none__') arr = arr.filter(f => !f.asignado_a)
  else if (filtroAsignado.value) arr = arr.filter(f => f.asignado_a?.id === filtroAsignado.value)
  if (filtroFechaDesde.value) {
    const desde = startOfDay(filtroFechaDesde.value)
    arr = arr.filter(f => f.fecha_identificacion && new Date(f.fecha_identificacion + 'T00:00:00') >= desde)
  }
  if (filtroFechaHasta.value) {
    const hasta = startOfDay(filtroFechaHasta.value); hasta.setHours(23, 59, 59, 999)
    arr = arr.filter(f => f.fecha_identificacion && new Date(f.fecha_identificacion + 'T00:00:00') <= hasta)
  }
  return arr
})

const hayFiltros = computed(() =>
  search.value || filtroProyecto.value || filtroPrioridad.value || filtroAsignado.value ||
  filtroEstado.value || filtroFechaDesde.value || filtroFechaHasta.value
)

const bucketActual = computed(() => BUCKETS.find(b => b.key === bucket.value) || BUCKETS[0])

const emptyTitulo = computed(() => {
  if (hayFiltros.value) return 'Sin resultados con los filtros aplicados'
  return {
    activas: 'No hay fallas activas',
    programadas: 'Sin fallas programadas',
    resueltas: 'Sin fallas resueltas',
    todas: 'No hay fallas registradas',
  }[bucket.value]
})

const emptySubtitulo = computed(() => {
  if (hayFiltros.value) return 'Prueba con otros filtros o limpia la búsqueda'
  return {
    activas: 'Todas las incidencias están bajo control',
    programadas: 'No hay intervenciones planificadas a futuro',
    resueltas: 'Aún no se han cerrado fallas',
    todas: 'Registra la primera para empezar',
  }[bucket.value]
})

const sortedSeguimientos = computed(() =>
  [...(drawerFalla.value?.seguimientos ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

// Índice de la falla actual del panel en la lista filtrada (para navegación)
const navIndex = computed(() => {
  if (!drawerFalla.value) return -1
  return filtradas.value.findIndex(f => f.id === drawerFalla.value.id)
})

function navegar(delta) {
  if (!filtradas.value.length) return
  const cur = navIndex.value
  if (cur < 0) return
  const next = Math.max(0, Math.min(filtradas.value.length - 1, cur + delta))
  if (next === cur) return
  abrirDrawer(filtradas.value[next])
}

// ── Carga ────────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  error.value = null
  try {
    const { data: primera } = await api.get('/fallas', { params: { page: 1, size: 200 } })
    const total = primera.total ?? 0
    const items = [...(primera.items ?? [])]
    if (total > 200) {
      const totalPages = Math.ceil(total / 200)
      const rest = await Promise.allSettled(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/fallas', { params: { page: i + 2, size: 200 } })
        )
      )
      for (const r of rest) {
        if (r.status === 'fulfilled') items.push(...(r.value.data.items ?? []))
      }
    }
    allFallas.value = items
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    loading.value = false
  }
}

async function cargarCatalogos() {
  try {
    const { data } = await api.get('/fallas/catalogos')
    catalogos.value = data
  } catch { /* no crítico */ }
}

async function cargarProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = data.items ?? []
  } catch { /* no crítico */ }
}

async function cargarUsuarios() {
  try {
    const { data } = await api.get('/usuarios', { params: { size: 200 } })
    usuarios.value = data.items ?? []
  } catch { /* /usuarios puede no existir */ }
}

// ── Acciones ─────────────────────────────────────────────────────────────
function limpiarFiltros() {
  search.value = ''
  filtroProyecto.value = null
  filtroPrioridad.value = null
  filtroAsignado.value = null
  filtroEstado.value = null
  filtroFechaDesde.value = null
  filtroFechaHasta.value = null
}

function abrirDrawer(falla) {
  drawerFalla.value = falla
  quickEdit.estado_id = falla.estado?.id ?? null
  quickEdit.prioridad_id = falla.prioridad?.id ?? null
  quickEdit.asignado_a_id = falla.asignado_a?.id ?? null
  nuevaNota.nota = ''
  nuevaNota.estado_id = null
  drawerVisible.value = true
}

function abrirCrear() {
  editingFalla.value = null
  formDialogVisible.value = true
}

function abrirEditar(falla) {
  editingFalla.value = falla
  formDialogVisible.value = true
}

function editarDesdeDrawer() {
  if (!drawerFalla.value) return
  editingFalla.value = drawerFalla.value
  formDialogVisible.value = true
}

async function onSaveForm(payload) {
  savingForm.value = true
  try {
    if (editingFalla.value) {
      const notaInicial = payload.nota_inicial
      delete payload.nota_inicial
      await api.patch(`/fallas/${editingFalla.value.id}`, payload)
      if (notaInicial) await api.post(`/fallas/${editingFalla.value.id}/seguimientos`, { nota: notaInicial })
      toast.add({ severity: 'success', summary: 'Falla actualizada', life: 2500 })
    } else {
      const notaInicial = payload.nota_inicial
      delete payload.nota_inicial
      const { data: nueva } = await api.post('/fallas', payload)
      if (notaInicial) await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
      toast.add({ severity: 'success', summary: 'Falla registrada', life: 2500 })
    }
    formDialogVisible.value = false
    await cargar()
    // Si el drawer estaba abierto, refrescar su contenido
    if (drawerFalla.value && editingFalla.value) {
      const refreshed = allFallas.value.find(f => f.id === editingFalla.value.id)
      if (refreshed) abrirDrawer(refreshed)
    }
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al guardar'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    savingForm.value = false
  }
}

// Autosave quick-edit con debounce
let _autosaveTimer = null
function autosaveQuick() {
  if (_autosaveTimer) clearTimeout(_autosaveTimer)
  _autosaveTimer = setTimeout(() => guardarQuickEdit(), 350)
}

async function guardarQuickEdit() {
  if (!drawerFalla.value) return
  const payload = {}
  if (quickEdit.estado_id !== drawerFalla.value.estado?.id) payload.estado_id = quickEdit.estado_id
  if (quickEdit.prioridad_id !== drawerFalla.value.prioridad?.id) payload.prioridad_id = quickEdit.prioridad_id
  if ((quickEdit.asignado_a_id ?? null) !== (drawerFalla.value.asignado_a?.id ?? null)) {
    payload.asignado_a_id = quickEdit.asignado_a_id
  }
  if (!Object.keys(payload).length) return

  savingQuick.value = true
  try {
    const { data } = await api.patch(`/fallas/${drawerFalla.value.id}`, payload)
    drawerFalla.value = data
    const idx = allFallas.value.findIndex(f => f.id === data.id)
    if (idx >= 0) allFallas.value[idx] = data
    savedFlash.value = true
    setTimeout(() => { savedFlash.value = false }, 1500)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo guardar', detail: err?.response?.data?.detail, life: 3000 })
    // Revertir UI
    quickEdit.estado_id = drawerFalla.value.estado?.id ?? null
    quickEdit.prioridad_id = drawerFalla.value.prioridad?.id ?? null
    quickEdit.asignado_a_id = drawerFalla.value.asignado_a?.id ?? null
  } finally {
    savingQuick.value = false
  }
}

async function quickResolve(falla) {
  const estadoFinal = catalogos.value.estados.find(e => e.es_estado_final)
  if (!estadoFinal) {
    toast.add({ severity: 'warn', summary: 'Sin estado final configurado', life: 3000 })
    return
  }
  confirmService.require({
    message: `¿Marcar la falla ${falla.codigo_interno} como ${estadoFinal.etiqueta.toLowerCase()}?`,
    header: 'Resolver falla',
    icon: 'pi pi-check-circle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Marcar resuelta', severity: 'success' },
    accept: async () => {
      resolvingFalla.value = true
      try {
        const { data } = await api.patch(`/fallas/${falla.id}`, {
          estado_id: estadoFinal.id,
          fecha_resolucion: new Date().toISOString(),
          sla_cumplido: !slaVencido(falla),
        })
        const idx = allFallas.value.findIndex(f => f.id === data.id)
        if (idx >= 0) allFallas.value[idx] = data
        if (drawerFalla.value?.id === data.id) drawerFalla.value = data
        toast.add({ severity: 'success', summary: 'Falla resuelta', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
      } finally {
        resolvingFalla.value = false
      }
    },
  })
}

async function reabrirFalla() {
  const abierta = catalogos.value.estados.find(e => e.codigo === 'abierta')
    || catalogos.value.estados.find(e => !e.es_estado_final)
  if (!abierta) {
    toast.add({ severity: 'warn', summary: 'Sin estado abierto configurado', life: 3000 })
    return
  }
  try {
    const { data } = await api.patch(`/fallas/${drawerFalla.value.id}`, {
      estado_id: abierta.id,
      fecha_resolucion: null,
    })
    drawerFalla.value = data
    const idx = allFallas.value.findIndex(f => f.id === data.id)
    if (idx >= 0) allFallas.value[idx] = data
    quickEdit.estado_id = data.estado?.id ?? null
    toast.add({ severity: 'success', summary: 'Falla reabierta', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
  }
}

async function agregarSeguimiento() {
  if (!nuevaNota.nota.trim() && !nuevaNota.estado_id) return
  addingSeg.value = true
  try {
    const payload = {}
    if (nuevaNota.nota.trim()) payload.nota = nuevaNota.nota.trim()
    if (nuevaNota.estado_id) payload.estado_nuevo_id = nuevaNota.estado_id
    await api.post(`/fallas/${drawerFalla.value.id}/seguimientos`, payload)
    nuevaNota.nota = ''
    nuevaNota.estado_id = null
    // Refrescar la falla del drawer
    const { data } = await api.get(`/fallas/${drawerFalla.value.id}`)
    drawerFalla.value = data
    const idx = allFallas.value.findIndex(f => f.id === data.id)
    if (idx >= 0) allFallas.value[idx] = data
    quickEdit.estado_id = data.estado?.id ?? null
    toast.add({ severity: 'success', summary: 'Seguimiento agregado', life: 2000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
  } finally {
    addingSeg.value = false
  }
}

function confirmDelete(falla) {
  confirmService.require({
    message: `¿Eliminar la falla ${falla.codigo_interno}? Esta acción no se puede deshacer.`,
    header: 'Eliminar falla',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: async () => {
      try {
        await api.delete(`/fallas/${falla.id}`)
        allFallas.value = allFallas.value.filter(f => f.id !== falla.id)
        drawerVisible.value = false
        toast.add({ severity: 'success', summary: 'Falla eliminada', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
      }
    },
  })
}

// ── Helpers visuales ─────────────────────────────────────────────────────
function prioColor(codigo) { return PRIO_COLORS[codigo] || '#9ca3af' }
function prioPillStyle(codigo) {
  const c = prioColor(codigo)
  return { background: c + '18', color: c, border: `1px solid ${c}40` }
}
function estadoPillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}40` }
}
function catTagStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '18', color: c, border: `1px solid ${c}33` }
}
function bucketActiveStyle(color, active) {
  if (!active) return {}
  return { boxShadow: `inset 0 0 0 2px ${color}` }
}

function rowClass(data) {
  return drawerFalla.value?.id === data.id ? 'gf-row-active' : ''
}

function initials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(/\s+/)
  return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

function avatarStyle(user) {
  if (!user) return { background: '#9ca3af' }
  const id = user.id ?? hashCode(user.nombre || '')
  const color = AVATAR_PALETTE[Math.abs(id) % AVATAR_PALETTE.length]
  return { background: color }
}

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return h
}

function horasTranscurridas(falla) {
  if (!falla?.fecha_identificacion) return 0
  const desde = new Date(falla.fecha_ocurrencia || (falla.fecha_identificacion + 'T00:00:00'))
  const hasta = falla.fecha_resolucion ? new Date(falla.fecha_resolucion) : new Date()
  return Math.max(0, Math.round((hasta - desde) / 3_600_000))
}

function slaPct(falla) {
  if (!falla?.sla_limite_horas) return null
  return Math.min(Math.round((horasTranscurridas(falla) / falla.sla_limite_horas) * 100), 110)
}

function slaVencido(falla) {
  const p = slaPct(falla)
  return p != null && p >= 100
}

function slaFillStyle(falla) {
  const p = Math.min(slaPct(falla) ?? 0, 100)
  return { width: `${p}%`, background: slaTextColor(falla) }
}

function slaTextColor(falla) {
  if (falla?.sla_cumplido === true) return '#16a34a'
  if (falla?.sla_cumplido === false) return '#dc2626'
  const p = slaPct(falla)
  if (p == null) return '#9ca3af'
  if (p >= 100) return '#dc2626'
  if (p >= 70) return '#d97706'
  return '#16a34a'
}

function slaText(falla) {
  if (falla?.sla_cumplido === true) return 'OK'
  if (falla?.sla_cumplido === false) return 'Vencido'
  const p = slaPct(falla)
  if (p == null) return '—'
  if (p >= 100) return 'Vencido'
  return `${p}%`
}

function slaSeverity(falla) {
  const c = slaTextColor(falla)
  if (c === '#16a34a') return 'success'
  if (c === '#dc2626') return 'danger'
  if (c === '#d97706') return 'warn'
  return 'secondary'
}

function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO',
    { day: '2-digit', month: 'short', year: 'numeric' })
}

function relativeTime(d, includeAbsolute = false) {
  if (!d) return ''
  const date = typeof d === 'string' && d.length === 10
    ? new Date(d + 'T00:00:00')
    : new Date(d)
  const diff = (Date.now() - date.getTime()) / 1000
  let rel
  if (diff < 60) rel = 'ahora'
  else if (diff < 3600) rel = `hace ${Math.floor(diff / 60)}min`
  else if (diff < 86400) rel = `hace ${Math.floor(diff / 3600)}h`
  else if (diff < 86400 * 30) rel = `hace ${Math.floor(diff / 86400)}d`
  else if (diff < 86400 * 365) rel = `hace ${Math.floor(diff / (86400 * 30))}m`
  else rel = `hace ${Math.floor(diff / (86400 * 365))}a`
  if (diff < 0) {
    const future = Math.abs(diff)
    if (future < 86400) rel = `en ${Math.floor(future / 3600)}h`
    else rel = `en ${Math.floor(future / 86400)}d`
  }
  if (!includeAbsolute) return rel
  return rel
}

function startOfDay(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

// ── Mounted + keyboard ──────────────────────────────────────────────────
function onKeydown(e) {
  // Ignorar si está escribiendo en un input/textarea
  const t = e.target.tagName
  if (t === 'INPUT' || t === 'TEXTAREA' || e.target.isContentEditable) return
  if (e.key === '/') {
    e.preventDefault()
    nextTick(() => searchInputRef.value?.$el?.querySelector('input')?.focus())
  } else if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    abrirCrear()
  } else if (e.key === 'Escape' && drawerVisible.value) {
    drawerVisible.value = false
  } else if (drawerVisible.value && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault()
    navegar(e.key === 'ArrowLeft' ? -1 : 1)
  }
}

onMounted(() => {
  cargar()
  cargarCatalogos()
  cargarProyectos()
  cargarUsuarios()
  window.addEventListener('keydown', onKeydown)
})

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

// Limpiar drawer al cerrar
watch(drawerVisible, (val) => {
  if (!val) {
    setTimeout(() => { drawerFalla.value = null }, 200)
  }
})
</script>

<style scoped>
/* ── Bucket cards ──────────────────────────────────────────────────────── */
.bucket-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ece8f4;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  overflow: hidden;
  text-align: left;
}
.bucket-card:hover { background: #faf9fc; transform: translateY(-1px); }
.bucket-card--active { background: #faf7ff; }

.bucket-icon {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 10px; font-size: 16px;
  flex-shrink: 0;
}
.bucket-count {
  font-size: 24px; font-weight: 800; line-height: 1;
}
.bucket-label {
  font-size: 12px; font-weight: 600; color: #6b5a8a;
  text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px;
}
.bucket-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px; opacity: 0.65;
}

/* ── Prio stripe + pill ────────────────────────────────────────────────── */
.prio-stripe {
  width: 4px; height: 32px; border-radius: 2px; margin: 0 auto;
}
.prio-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

/* ── Category dot ──────────────────────────────────────────────────────── */
.cat-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 0 2px #fff;
}

/* ── Avatar ────────────────────────────────────────────────────────────── */
.avatar-sm {
  width: 24px; height: 24px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 10px; font-weight: 700;
  flex-shrink: 0;
}
.avatar-sm--empty {
  background: #e5e7eb !important; color: #9ca3af !important;
}

/* ── SLA mini ──────────────────────────────────────────────────────────── */
.sla-mini {
  display: flex; flex-direction: column; gap: 2px;
}
.sla-mini-bar {
  width: 100%; height: 4px;
  background: #f3f4f6; border-radius: 2px; overflow: hidden;
}
.sla-mini-fill {
  height: 100%; border-radius: 2px; transition: width 0.3s;
}
.sla-mini-text {
  font-size: 10px; font-weight: 600; line-height: 1;
}

/* ── Row actions ──────────────────────────────────────────────────────── */
.row-actions {
  display: flex; gap: 2px; opacity: 0.4;
  transition: opacity 0.15s;
}
:deep(tr:hover) .row-actions { opacity: 1; }

/* ── Quick action label ───────────────────────────────────────────────── */
.qa-label {
  width: 78px;
  font-size: 11px;
  font-weight: 600;
  color: #6b5a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* ── Push layout (lista + panel lateral) ──────────────────────────────── */
.gf-layout {
  /* Sin split: la lista ocupa todo el ancho */
  display: block;
}
.gf-main { min-width: 0; }

/* En lg+, cuando hay panel abierto, layout grid de dos columnas */
@media (min-width: 1024px) {
  .gf-layout--split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(480px, 50%);
    gap: 16px;
    align-items: start;
  }
}

/* Aside: en móvil = overlay full-screen; en desktop = panel en flujo */
.gf-aside {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  justify-content: flex-end;
}
.gf-aside-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(28, 18, 50, 0.35);
  backdrop-filter: blur(2px);
}
.gf-aside-panel {
  position: relative;
  width: 100%;
  max-width: 540px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(28, 18, 50, 0.12);
  overflow: hidden;
}

@media (min-width: 1024px) {
  .gf-aside {
    position: sticky;
    top: 0;
    z-index: 5;
    height: auto;
    max-height: calc(100vh - 3rem);
    display: block;
  }
  .gf-aside-backdrop { display: none; }
  .gf-aside-panel {
    max-width: none;
    height: calc(100vh - 3rem);
    border-radius: 12px;
    border: 1px solid #ece8f4;
    box-shadow: 0 4px 12px rgba(28, 18, 50, 0.06);
  }
}

/* Header / body / footer del panel */
.gf-drawer-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid #ece8f4;
  background: #fff; z-index: 10;
  flex-shrink: 0;
}
.gf-drawer-body {
  padding: 18px 18px 18px;
  display: flex; flex-direction: column; gap: 18px;
  overflow-y: auto;
  flex: 1;
}
.gf-drawer-footer {
  background: #fff;
  padding: 12px 14px;
  border-top: 1px solid #ece8f4;
  display: flex; gap: 8px;
  flex-shrink: 0;
}

/* ── DataTable density tweaks ─────────────────────────────────────────── */
:deep(.gf-table .p-datatable-tbody > tr) { cursor: pointer; transition: background 0.12s; }
:deep(.gf-table .p-datatable-tbody > tr > td) {
  padding: 10px 12px;
  vertical-align: middle;
}
:deep(.gf-table .p-datatable-thead > tr > th) {
  background: #faf9fc;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #6b5a8a;
  padding: 10px 12px;
}
:deep(.gf-table .p-datatable-tbody > tr.gf-row-active) {
  background: #faf5ff !important;
  box-shadow: inset 3px 0 0 #915BD8;
}
:deep(.gf-table .p-datatable-tbody > tr.gf-row-active > td) {
  border-color: #e9ddff;
}
:deep(.gf-table .p-datatable-wrapper) {
  overflow-x: auto;
}

/* En split-mode comprimimos buckets y headers para ahorrar espacio */
@media (min-width: 1024px) {
  .gf-layout--split .gf-main { /* hint para hijos */ }
  .gf-layout--split .gf-buckets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Line clamp utility */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
</style>
