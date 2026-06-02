<template>

  <!-- ══ CARGANDO ════════════════════════════════════════════════════════ -->
  <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
    <ProgressSpinner style="width:40px;height:40px" />
    <span class="text-sm text-gray-500">Cargando falla…</span>
  </div>

  <!-- ══ NO ENCONTRADA ═══════════════════════════════════════════════════ -->
  <div v-else-if="notFound" class="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
    <i class="pi pi-exclamation-circle text-4xl text-red-400" />
    <p class="text-sm font-semibold text-gray-700">Falla no encontrada</p>
    <p class="text-xs">El registro solicitado no existe o fue eliminado.</p>
    <Button label="Volver al monitoreo" icon="pi pi-arrow-left" outlined size="small" @click="$router.push('/fallas')" />
  </div>

  <!-- ══ VISTA PRINCIPAL ═════════════════════════════════════════════════ -->
  <div v-else-if="falla" class="space-y-4">

    <!-- ── Header ────────────────────────────────────────────────────── -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div class="flex items-start gap-3">
        <Button icon="pi pi-arrow-left" text rounded @click="$router.push('/fallas')" class="-ml-2 mt-1" />
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <Tag :value="falla.estado?.etiqueta || '—'" :style="pillStyle(falla.estado?.color_hex)" />
            <Tag :value="falla.prioridad?.etiqueta || '—'" :severity="prioSeverity(falla.prioridad?.codigo)" />
            <Tag v-if="falla.tipo?.categoria" :value="falla.tipo.categoria.etiqueta"
              :style="catTagStyle(falla.tipo.categoria.color_hex)" />
          </div>
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2 flex-wrap">
            <code class="text-base font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{{ falla.codigo_interno }}</code>
            <span class="text-gray-400 text-sm">·</span>
            <span class="text-base font-medium text-gray-700">{{ falla.tipo?.etiqueta || '—' }}</span>
          </h2>
          <p class="text-sm text-gray-600 mt-1 max-w-2xl">{{ falla.descripcion }}</p>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            <span v-if="falla.proyecto?.nombre_comercial" class="inline-flex items-center gap-1">
              <i class="pi pi-building" /> {{ falla.proyecto.nombre_comercial }}
            </span>
            <span class="inline-flex items-center gap-1">
              <i class="pi pi-calendar" /> Identificada el {{ fmtDate(falla.fecha_identificacion) }}
            </span>
            <span v-if="falla.registrado_por?.nombre" class="inline-flex items-center gap-1">
              <i class="pi pi-user" /> Registrada por {{ falla.registrado_por.nombre }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <Button v-if="!editMode" label="Editar" icon="pi pi-pencil" outlined size="small"
          @click="editMode = true" />
        <Button v-else label="Cancelar edición" icon="pi pi-times" outlined size="small"
          severity="secondary" @click="editMode = false" />
        <Button icon="pi pi-trash" outlined size="small" severity="danger" @click="confirmDelete"
          v-tooltip.top="'Eliminar falla'" />
      </div>
    </div>

    <!-- ── Modo edición ──────────────────────────────────────────────── -->
    <div v-if="editMode" class="bg-white rounded-xl shadow-sm p-5">
      <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <i class="pi pi-pencil text-sm" style="color:#915BD8" />
        <h3 class="font-semibold text-sm text-gray-700">Editar falla completa</h3>
      </div>
      <FallaForm :initial="falla" :catalogos="catalogos" @save="onUpdate" @cancel="editMode = false" />
    </div>

    <!-- ── Vista normal ──────────────────────────────────────────────── -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- COLUMNA PRINCIPAL -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Información general -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-info-circle text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">Información general</h3>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoField label="Proyecto" :value="falla.proyecto?.nombre_comercial" highlight />
            <InfoField label="Tipo de falla" :value="falla.tipo?.etiqueta" />
            <InfoField label="Registrado por" :value="falla.registrado_por?.nombre" />
            <InfoField label="Asignado a" :value="falla.asignado_a?.nombre || 'Sin asignar'" />
            <InfoField label="Fecha ocurrencia" :value="fmtDatetime(falla.fecha_ocurrencia)" />
            <InfoField label="Fecha identificación" :value="fmtDate(falla.fecha_identificacion)" />
            <div v-if="falla.fecha_resolucion">
              <p class="text-xs text-gray-400 uppercase tracking-wide">Fecha resolución</p>
              <p class="font-semibold mt-0.5 text-emerald-600">{{ fmtDatetime(falla.fecha_resolucion) }}</p>
            </div>
            <InfoField v-if="falla.resolucion" label="Tipo resolución" :value="falla.resolucion?.etiqueta" />
          </div>
        </div>

        <!-- SLA -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-clock text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">SLA</h3>
            <Tag :value="slaTexto" :severity="slaSeverity" class="ml-auto" />
          </div>
          <div v-if="falla.sla_limite_horas">
            <div class="flex items-center gap-3 text-xs mb-2">
              <span class="text-gray-500">Límite</span>
              <span class="font-semibold text-gray-800">{{ falla.sla_limite_horas }}h</span>
              <span class="text-gray-500 ml-auto">Transcurrido</span>
              <span class="font-semibold" :style="{ color: slaColor }">{{ horasTranscurridas }}h</span>
            </div>
            <div class="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="h-full rounded-full transition-all" :style="slaFillStyle" />
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Sin límite SLA configurado</p>
        </div>

        <!-- Análisis -->
        <div v-if="falla.causa_raiz || falla.acciones_correctivas" class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-search text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">Análisis</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="falla.causa_raiz">
              <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Causa raíz</p>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ falla.causa_raiz }}</p>
            </div>
            <div v-if="falla.acciones_correctivas">
              <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Acciones correctivas</p>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ falla.acciones_correctivas }}</p>
            </div>
          </div>
        </div>

        <!-- Adjuntos -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-paperclip text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">Adjuntos ({{ adjuntos.length }})</h3>
            <label class="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-md border transition-colors"
              :class="uploadingFoto ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait'
                                    : 'border-purple-200 text-purple-700 hover:bg-purple-50'">
              <i v-if="uploadingFoto" class="pi pi-spin pi-spinner text-xs" />
              <i v-else class="pi pi-plus text-xs" />
              {{ uploadingFoto ? 'Subiendo...' : 'Subir' }}
              <input type="file" accept="image/*,.pdf" multiple class="hidden"
                @change="uploadFotos" :disabled="uploadingFoto" />
            </label>
          </div>

          <div v-if="adjuntos.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div v-for="(url, idx) in adjuntos" :key="idx"
              class="relative group rounded-lg overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
              <img v-if="isImage(url)" :src="thumbUrl(url)" :alt="filename(url)"
                class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-gray-500">
                <i :class="filename(url).match(/\.pdf$/i) ? 'pi pi-file-pdf text-red-400'
                         : filename(url).match(/\.(xls|xlsx|csv)$/i) ? 'pi pi-file-excel text-green-500'
                         : filename(url).match(/\.(doc|docx)$/i) ? 'pi pi-file-word text-blue-500'
                         : 'pi pi-file text-gray-400'" style="font-size:2rem" />
                <span class="text-[10px] text-center line-clamp-2 w-full px-1">{{ filename(url) }}</span>
              </div>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <a :href="resolveUrl(url)" target="_blank" rel="noopener"
                  class="w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-purple-100 hover:text-purple-700 transition-colors"
                  v-tooltip.top="'Abrir en Drive'">
                  <i class="pi pi-external-link text-xs" />
                </a>
                <button class="w-8 h-8 rounded-full bg-white text-red-600 flex items-center justify-center hover:bg-red-50 transition-colors"
                  v-tooltip.top="'Eliminar'" @click="deleteFoto(url)">
                  <i class="pi pi-trash text-xs" />
                </button>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Sin adjuntos. Sube imágenes o documentos relevantes.</p>
        </div>

        <!-- Seguimientos -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-comments text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">Historial de seguimiento ({{ falla.seguimientos?.length || 0 }})</h3>
          </div>

          <!-- Añadir nota -->
          <div class="bg-gray-50 rounded-lg p-3 mb-4 space-y-3">
            <div class="flex flex-col gap-1">
              <label class="field-label">Cambiar estado (opcional)</label>
              <Select v-model="nuevaNota.estado_id" :options="catalogos.estados" optionLabel="etiqueta"
                optionValue="id" placeholder="Mantener estado actual" showClear class="w-full md:w-72" />
            </div>
            <Textarea v-model="nuevaNota.nota" rows="2" autoResize
              placeholder="Escribe una actualización, novedad o nota técnica…" class="w-full text-sm" />
            <div class="flex justify-end">
              <Button label="Agregar nota" icon="pi pi-send" size="small"
                :disabled="!nuevaNota.nota.trim() && !nuevaNota.estado_id"
                :loading="addingSeg" @click="addSeguimiento" />
            </div>
          </div>

          <!-- Timeline -->
          <div v-if="sortedSeguimientos.length" class="space-y-3">
            <div v-for="seg in sortedSeguimientos" :key="seg.id" class="flex gap-3">
              <div class="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {{ (seg.usuario?.nombre || seg.usuario_nombre || 'S')[0].toUpperCase() }}
              </div>
              <div class="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-sm font-semibold text-gray-800">{{ seg.usuario?.nombre || seg.usuario_nombre || 'Sistema' }}</span>
                  <span class="text-xs text-gray-400">{{ fmtDatetime(seg.created_at) }}</span>
                </div>
                <p v-if="seg.nota" class="text-sm text-gray-700 whitespace-pre-line">{{ seg.nota }}</p>
                <div v-if="seg.estado_nuevo" class="mt-1.5 flex items-center gap-1 text-xs">
                  <i class="pi pi-arrow-right text-[10px] text-gray-400" />
                  <Tag :value="seg.estado_nuevo?.etiqueta || ''" :style="pillStyle(seg.estado_nuevo?.color_hex)" class="text-[10px]" />
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">Aún no hay notas de seguimiento.</p>
        </div>

      </div>

      <!-- COLUMNA SIDEBAR -->
      <div class="space-y-4">

        <!-- Acción sugerida -->
        <div v-if="falla.tipo?.accion_sugerida" class="rounded-xl p-5 shadow-sm"
          style="background: linear-gradient(135deg, #faf7ff 0%, #f3edff 100%); border: 1px solid #e5d9ff;">
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-lightbulb text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm" style="color:#4a3b6b">Acción sugerida</h3>
          </div>
          <p class="text-sm text-gray-700 leading-relaxed">{{ falla.tipo.accion_sugerida }}</p>
        </div>

        <!-- Actualización rápida -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-bolt text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">Actualización rápida</h3>
          </div>
          <div class="space-y-3">
            <div class="flex flex-col gap-1">
              <label class="field-label">Estado</label>
              <Select v-model="quickEdit.estado_id" :options="catalogos.estados" optionLabel="etiqueta"
                optionValue="id" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Prioridad</label>
              <Select v-model="quickEdit.prioridad_id" :options="catalogos.prioridades" optionLabel="etiqueta"
                optionValue="id" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Asignado a</label>
              <Select v-model="quickEdit.asignado_a_id" :options="usuarios" optionLabel="nombre"
                optionValue="id" placeholder="Sin asignar" showClear class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Energía perdida (kWh)</label>
              <InputNumber v-model="quickEdit.energia_perdida_kwh" :minFractionDigits="0" :maxFractionDigits="2"
                :min="0" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Causa raíz</label>
              <Textarea v-model="quickEdit.causa_raiz" rows="2" autoResize
                placeholder="Causa raíz identificada…" class="w-full text-sm" />
            </div>
            <Button label="Guardar cambios" icon="pi pi-check" :loading="savingQuick"
              @click="saveQuickEdit" class="w-full" />
          </div>
        </div>

        <!-- Detalles técnicos -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <i class="pi pi-cog text-sm" style="color:#915BD8" />
            <h3 class="font-semibold text-sm text-gray-700">Detalles técnicos</h3>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">ID interno</span>
              <code class="font-mono text-gray-700">{{ falla.id }}</code>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Código</span>
              <code class="font-mono text-gray-700">{{ falla.codigo_interno }}</code>
            </div>
            <div v-if="falla.energia_perdida_kwh != null" class="flex items-center justify-between">
              <span class="text-gray-500">Energía perdida</span>
              <span class="font-semibold text-red-600">{{ falla.energia_perdida_kwh.toLocaleString('es-CO') }} kWh</span>
            </div>
            <div v-if="falla.sla_cumplido != null" class="flex items-center justify-between">
              <span class="text-gray-500">SLA</span>
              <Tag :value="falla.sla_cumplido ? 'Cumplido' : 'Incumplido'"
                :severity="falla.sla_cumplido ? 'success' : 'danger'" />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import ProgressSpinner from 'primevue/progressspinner'
import FallaForm from './FallaForm.vue'
import api from '@/api/client'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirmService = useConfirm()

// ── Estado ──────────────────────────────────────────────────────────────
const falla = ref(null)
const loading = ref(true)
const notFound = ref(false)
const editMode = ref(false)
const addingSeg = ref(false)
const savingQuick = ref(false)
const uploadingFoto = ref(false)

const catalogos = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const usuarios = ref([])

const nuevaNota = reactive({ nota: '', estado_id: '' })
const quickEdit = reactive({
  estado_id: null,
  prioridad_id: null,
  asignado_a_id: '',
  energia_perdida_kwh: null,
  causa_raiz: '',
})

// ── Computed ────────────────────────────────────────────────────────────
const sortedSeguimientos = computed(() =>
  [...(falla.value?.seguimientos ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

// Backend retorna `fotos_lista: list[str]` (URLs). Soportar también legados.
const adjuntos = computed(() => {
  const v = falla.value
  if (!v) return []
  if (Array.isArray(v.fotos_lista)) return v.fotos_lista
  if (Array.isArray(v.attachments)) return v.attachments.map(a => a.url || a.archivo_url || a).filter(Boolean)
  if (Array.isArray(v.fotos)) return v.fotos.map(a => a.url || a.archivo_url || a).filter(Boolean)
  return []
})

const horasTranscurridas = computed(() => {
  if (!falla.value?.fecha_identificacion) return 0
  const desde = new Date(falla.value.fecha_ocurrencia || falla.value.fecha_identificacion + 'T00:00:00')
  const hasta = falla.value.fecha_resolucion ? new Date(falla.value.fecha_resolucion) : new Date()
  return Math.round((hasta - desde) / 3_600_000)
})

const slaPct = computed(() => {
  const h = falla.value?.sla_limite_horas
  if (!h) return null
  return Math.min(Math.round((horasTranscurridas.value / h) * 100), 110)
})

const slaColor = computed(() => {
  const p = slaPct.value
  if (p == null) return '#a094b8'
  if (p >= 100) return '#dc2626'
  if (p >= 70) return '#d97706'
  return '#16a34a'
})

const slaSeverity = computed(() => {
  if (falla.value?.sla_cumplido === true) return 'success'
  if (falla.value?.sla_cumplido === false) return 'danger'
  const p = slaPct.value
  if (p == null) return 'secondary'
  if (p >= 100) return 'danger'
  if (p >= 70) return 'warn'
  return 'success'
})

const slaTexto = computed(() => {
  if (falla.value?.sla_cumplido === true) return 'Cumplido'
  if (falla.value?.sla_cumplido === false) return 'Excedido'
  const p = slaPct.value
  if (p == null) return 'Sin SLA'
  if (p >= 100) return `Excedido ${p}%`
  return `${p}% del límite`
})

const slaFillStyle = computed(() => {
  const p = Math.min(slaPct.value ?? 0, 100)
  return { width: `${p}%`, background: slaColor.value }
})

// ── Helpers ─────────────────────────────────────────────────────────────
function pillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}33` }
}
function catTagStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '18', color: c, border: `1px solid ${c}33` }
}
function prioSeverity(codigo) {
  return { critica: 'danger', alta: 'warn', media: 'info', baja: 'secondary' }[codigo] || 'secondary'
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO',
    { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDatetime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO',
    { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function driveFileId(url) {
  const m = (url || '').match(/\/file\/d\/([^/?#]+)/)
  return m ? m[1] : null
}
function filename(url) {
  if (!url) return 'archivo'
  // Fragment after # contains original filename for Drive URLs
  const hash = url.includes('#') ? url.split('#').pop() : null
  if (hash) return decodeURIComponent(hash)
  return decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'archivo')
}
function isImage(url) {
  const name = filename(url)
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
}
function resolveUrl(url) {
  if (!url) return ''
  // Strip fragment for the actual link
  return url.split('#')[0]
}
function thumbUrl(url) {
  const id = driveFileId(url)
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w400`
  return resolveUrl(url)
}

// ── Carga ───────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/fallas/${route.params.id}`)
    falla.value = data
    quickEdit.estado_id = data.estado?.id ?? null
    quickEdit.prioridad_id = data.prioridad?.id ?? null
    quickEdit.asignado_a_id = data.asignado_a?.id ?? ''
    quickEdit.energia_perdida_kwh = data.energia_perdida_kwh ?? null
    quickEdit.causa_raiz = data.causa_raiz ?? ''
  } catch (err) {
    if (err?.response?.status === 404) notFound.value = true
  } finally {
    loading.value = false
  }
}

async function loadCatalogos() {
  try {
    const { data } = await api.get('/fallas/catalogos')
    catalogos.value = data
  } catch { /* no crítico */ }
}

async function loadUsuarios() {
  try {
    const { data } = await api.get('/usuarios', { params: { size: 200 } })
    usuarios.value = data.items ?? []
  } catch { /* /usuarios puede no existir */ }
}

// ── Acciones ────────────────────────────────────────────────────────────
async function onUpdate(payload) {
  try {
    await api.patch(`/fallas/${falla.value.id}`, payload)
    toast.add({ severity: 'success', summary: 'Falla actualizada', life: 3000 })
    editMode.value = false
    await load()
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al actualizar'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  }
}

async function saveQuickEdit() {
  savingQuick.value = true
  try {
    const payload = {}
    if (quickEdit.estado_id) payload.estado_id = quickEdit.estado_id
    if (quickEdit.prioridad_id) payload.prioridad_id = quickEdit.prioridad_id
    if (quickEdit.asignado_a_id) payload.asignado_a_id = quickEdit.asignado_a_id
    if (quickEdit.causa_raiz?.trim()) payload.causa_raiz = quickEdit.causa_raiz.trim()
    if (quickEdit.energia_perdida_kwh != null) payload.energia_perdida_kwh = quickEdit.energia_perdida_kwh
    await api.patch(`/fallas/${falla.value.id}`, payload)
    toast.add({ severity: 'success', summary: 'Cambios guardados', life: 2500 })
    await load()
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al guardar'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    savingQuick.value = false
  }
}

async function addSeguimiento() {
  if (!nuevaNota.nota.trim() && !nuevaNota.estado_id) return
  addingSeg.value = true
  try {
    const payload = {}
    if (nuevaNota.nota.trim()) payload.nota = nuevaNota.nota.trim()
    if (nuevaNota.estado_id) payload.estado_nuevo_id = nuevaNota.estado_id
    await api.post(`/fallas/${falla.value.id}/seguimientos`, payload)
    nuevaNota.nota = ''
    nuevaNota.estado_id = ''
    toast.add({ severity: 'success', summary: 'Seguimiento agregado', life: 2500 })
    await load()
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al agregar'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    addingSeg.value = false
  }
}

async function uploadFotos(event) {
  const files = Array.from(event.target.files)
  if (!files.length) return
  uploadingFoto.value = true
  let okCount = 0
  try {
    for (const file of files) {
      const form = new FormData()
      // El backend espera el campo `archivo` (no `file`).
      form.append('archivo', file)
      try {
        await api.post(`/fallas/${falla.value.id}/attachments`, form,
          { headers: { 'Content-Type': 'multipart/form-data' } })
        okCount++
      } catch (err) {
        const msg = err?.response?.data?.detail ?? `No se pudo subir ${file.name}`
        toast.add({ severity: 'warn', summary: 'Archivo rechazado', detail: msg, life: 4000 })
      }
    }
    if (okCount) {
      await load()
      toast.add({ severity: 'success', summary: `${okCount} archivo(s) subido(s)`, life: 2500 })
    }
  } finally {
    uploadingFoto.value = false
    event.target.value = ''
  }
}

function deleteFoto(url) {
  confirmService.require({
    message: '¿Eliminar este adjunto? Esta acción no se puede deshacer.',
    header: 'Eliminar adjunto',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: async () => {
      try {
        // No hay endpoint DELETE en backend. Actualizamos fotos_urls vía PATCH excluyendo la URL.
        const nuevaLista = adjuntos.value.filter(u => u !== url)
        await api.patch(`/fallas/${falla.value.id}`, { fotos_urls: nuevaLista })
        await load()
        toast.add({ severity: 'success', summary: 'Adjunto eliminado', life: 2500 })
      } catch (err) {
        const msg = err?.response?.data?.detail ?? 'No se pudo eliminar'
        toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 3000 })
      }
    },
  })
}

function confirmDelete() {
  confirmService.require({
    message: `¿Eliminar la falla ${falla.value.codigo_interno}? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: async () => {
      try {
        await api.delete(`/fallas/${falla.value.id}`)
        toast.add({ severity: 'success', summary: 'Falla eliminada', life: 3000 })
        router.push('/fallas')
      } catch {
        toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
      }
    },
  })
}

onMounted(() => {
  loadCatalogos()
  loadUsuarios()
  load()
})
</script>

<script>
const InfoField = {
  props: { label: String, value: [String, Number, Boolean], highlight: Boolean },
  template: `<div>
    <p class="text-xs text-gray-400 uppercase tracking-wide">{{ label }}</p>
    <p class="mt-0.5" :class="highlight ? 'font-bold text-gray-800' : 'font-medium text-gray-700'">{{ value || '—' }}</p>
  </div>`,
}
export default { components: { InfoField } }
</script>

<style scoped>
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b5a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>
