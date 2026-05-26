<template>

  <!-- ══ CARGANDO ══════════════════════════════════════════════════════════ -->
  <div v-if="loading" class="fd-center">
    <div class="fd-spinner" />
    <span class="fd-loading-text">Cargando falla…</span>
  </div>

  <!-- ══ NO ENCONTRADA ═════════════════════════════════════════════════════ -->
  <div v-else-if="notFound" class="fd-center">
    <div class="fd-empty-icon">⚡</div>
    <p class="fd-empty-title">Falla no encontrada</p>
    <p class="fd-empty-sub">El registro solicitado no existe o fue eliminado.</p>
    <button class="fd-btn fd-btn-primary" style="margin-top:16px" @click="$router.push('/fallas')">
      ← Volver al monitoreo
    </button>
  </div>

  <!-- ══ VISTA PRINCIPAL ═══════════════════════════════════════════════════ -->
  <div v-else-if="falla" class="fd-page">

    <!-- ── Hero ───────────────────────────────────────────────────────────── -->
    <div class="fd-hero">
      <div class="fd-hero-top">
        <button class="fd-back" @click="$router.push('/fallas')">
          ← Monitoreo de Fallas
        </button>
        <div class="fd-hero-actions">
          <button v-if="!editMode" class="fd-btn fd-btn-ghost" @click="editMode = true">
            ✎&nbsp; Editar
          </button>
          <button v-else class="fd-btn fd-btn-ghost" @click="editMode = false">
            ✕&nbsp; Cancelar edición
          </button>
          <button class="fd-btn fd-btn-danger-ghost" @click="confirmDelete">
            🗑
          </button>
        </div>
      </div>

      <div class="fd-hero-body">
        <div class="fd-hero-pills">
          <span class="fd-estado-pill" :style="pillStyle(falla.estado?.color_hex)">
            {{ falla.estado?.etiqueta || '—' }}
          </span>
          <span class="fd-prio-pill" :class="'prio-' + (falla.prioridad?.nivel || 4)">
            {{ falla.prioridad?.etiqueta || '—' }}
          </span>
          <span v-if="falla.tipo?.categoria" class="fd-cat-pill"
                :style="catPillStyle(falla.tipo.categoria.color_hex)">
            {{ falla.tipo.categoria.etiqueta }}
          </span>
        </div>

        <div class="fd-hero-title-row">
          <code class="fd-code">{{ falla.codigo_interno }}</code>
          <span class="fd-dot">·</span>
          <span class="fd-tipo-text">{{ falla.tipo?.etiqueta || '—' }}</span>
        </div>

        <p class="fd-desc">{{ falla.descripcion }}</p>

        <div class="fd-hero-meta-row">
          <span v-if="falla.proyecto?.nombre_comercial">
            🏗 {{ falla.proyecto.nombre_comercial }}
          </span>
          <span>📅 Identificada el {{ fmtDate(falla.fecha_identificacion) }}</span>
          <span v-if="falla.registrado_por?.nombre">
            👤 Registrada por {{ falla.registrado_por.nombre }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Modo edición ────────────────────────────────────────────────────── -->
    <div v-if="editMode" class="fd-layout-single">
      <div class="fd-card">
        <div class="fd-section-head">
          <span class="fd-section-icon">✎</span>
          <span>Editar falla completa</span>
        </div>
        <FallaForm :initial="falla" :catalogos="catalogos" @save="onUpdate" @cancel="editMode = false" />
      </div>
    </div>

    <!-- ── Vista normal ────────────────────────────────────────────────────── -->
    <div v-else class="fd-layout">

      <!-- COLUMNA PRINCIPAL -->
      <div class="fd-main">

        <!-- Información general -->
        <div class="fd-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">📋</span>
            <span>Información general</span>
          </div>
          <div class="fd-info-grid">
            <div class="fd-field">
              <div class="fd-label">Proyecto</div>
              <div class="fd-value fd-bold">{{ falla.proyecto?.nombre_comercial || '—' }}</div>
            </div>
            <div class="fd-field">
              <div class="fd-label">Tipo de falla</div>
              <div class="fd-value">{{ falla.tipo?.etiqueta || '—' }}</div>
            </div>
            <div class="fd-field">
              <div class="fd-label">Registrado por</div>
              <div class="fd-value">{{ falla.registrado_por?.nombre || '—' }}</div>
            </div>
            <div class="fd-field">
              <div class="fd-label">Asignado a</div>
              <div class="fd-value">{{ falla.asignado_a?.nombre || 'Sin asignar' }}</div>
            </div>
            <div class="fd-field">
              <div class="fd-label">Fecha ocurrencia</div>
              <div class="fd-value">{{ fmtDatetime(falla.fecha_ocurrencia) }}</div>
            </div>
            <div class="fd-field">
              <div class="fd-label">Fecha identificación</div>
              <div class="fd-value">{{ fmtDate(falla.fecha_identificacion) }}</div>
            </div>
            <div v-if="falla.fecha_resolucion" class="fd-field">
              <div class="fd-label">Fecha resolución</div>
              <div class="fd-value" style="color:#16a34a; font-weight:600;">
                {{ fmtDatetime(falla.fecha_resolucion) }}
              </div>
            </div>
            <div v-if="falla.resolucion" class="fd-field">
              <div class="fd-label">Tipo resolución</div>
              <div class="fd-value">{{ falla.resolucion?.etiqueta }}</div>
            </div>
          </div>
        </div>

        <!-- SLA -->
        <div class="fd-card fd-sla-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">⏱</span>
            <span>SLA</span>
            <span class="fd-sla-badge" :class="slaBadgeClass">{{ slaTexto }}</span>
          </div>
          <div v-if="falla.sla_limite_horas" class="fd-sla-body">
            <div class="fd-sla-row">
              <span class="fd-label">Límite</span>
              <span class="fd-value">{{ falla.sla_limite_horas }}h</span>
              <span class="fd-label" style="margin-left:auto;">Transcurrido</span>
              <span class="fd-value" :style="{ color: slaColor }">{{ horasTranscurridas }}h</span>
            </div>
            <div class="fd-sla-track">
              <div class="fd-sla-fill" :style="slaFillStyle" />
            </div>
          </div>
          <p v-else class="fd-no-sla">Sin límite SLA configurado</p>
        </div>

        <!-- Causa raíz y acciones correctivas -->
        <div v-if="falla.causa_raiz || falla.acciones_correctivas" class="fd-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">🔍</span>
            <span>Análisis</span>
          </div>
          <div class="fd-analysis-grid">
            <div v-if="falla.causa_raiz" class="fd-analysis-block">
              <div class="fd-analysis-label">Causa raíz</div>
              <p class="fd-analysis-text">{{ falla.causa_raiz }}</p>
            </div>
            <div v-if="falla.acciones_correctivas" class="fd-analysis-block">
              <div class="fd-analysis-label">Acciones correctivas</div>
              <p class="fd-analysis-text">{{ falla.acciones_correctivas }}</p>
            </div>
          </div>
        </div>

        <!-- Adjuntos / Fotos -->
        <div class="fd-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">📎</span>
            <span>Adjuntos ({{ (falla.attachments ?? falla.fotos ?? []).length }})</span>
            <label class="fd-upload-btn" :class="{ 'fd-upload-btn--loading': uploadingFoto }">
              <span v-if="!uploadingFoto">+ Subir</span>
              <span v-else class="fd-mini-spinner" />
              <input type="file" accept="image/*,.pdf,.xlsx,.docx" multiple
                     class="fd-hidden-input" @change="uploadFotos" :disabled="uploadingFoto" />
            </label>
          </div>

          <div v-if="adjuntos.length" class="fd-fotos-grid">
            <div v-for="a in adjuntos" :key="a.id" class="fd-foto-card">
              <img v-if="isImage(a.url || a.archivo_url)" :src="a.url || a.archivo_url"
                   :alt="a.nombre_archivo || a.nombre" class="fd-foto-img" />
              <div v-else class="fd-foto-doc">
                <span class="fd-foto-doc-icon">📄</span>
                <span class="fd-foto-doc-name">{{ a.nombre_archivo || a.nombre || 'Archivo' }}</span>
              </div>
              <div class="fd-foto-overlay">
                <a :href="a.url || a.archivo_url" target="_blank" class="fd-foto-action" title="Ver">👁</a>
                <button class="fd-foto-action fd-foto-del" @click="deleteFoto(a)" title="Eliminar">🗑</button>
              </div>
            </div>
          </div>
          <p v-else class="fd-no-content">Sin adjuntos. Sube imágenes o documentos relevantes.</p>
        </div>

        <!-- Seguimientos -->
        <div class="fd-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">💬</span>
            <span>Historial de seguimiento ({{ falla.seguimientos?.length || 0 }})</span>
          </div>

          <!-- Añadir nota -->
          <div class="fd-seg-add">
            <div class="fd-seg-add-row">
              <div class="fd-field-col">
                <label class="fd-label">Cambiar estado <span style="color:#c5b9db;">(opcional)</span></label>
                <select v-model="nuevaNota.estado_id" class="fd-select">
                  <option value="">Mantener estado actual</option>
                  <option v-for="e in catalogos.estados" :key="e.id" :value="e.id">
                    {{ e.etiqueta }}
                  </option>
                </select>
              </div>
            </div>
            <textarea v-model="nuevaNota.nota" class="fd-textarea"
                      rows="2" placeholder="Escribe una actualización, novedad o nota técnica…" />
            <div class="fd-seg-add-footer">
              <button class="fd-btn fd-btn-primary"
                      :disabled="!nuevaNota.nota.trim() && !nuevaNota.estado_id || addingSeg"
                      @click="addSeguimiento">
                <span v-if="addingSeg" class="fd-mini-spinner" />
                <span v-else>↗ Agregar nota</span>
              </button>
            </div>
          </div>

          <!-- Timeline -->
          <div v-if="sortedSeguimientos.length" class="fd-timeline">
            <div v-for="seg in sortedSeguimientos" :key="seg.id" class="fd-timeline-item">
              <div class="fd-timeline-dot">
                {{ (seg.usuario?.nombre || seg.usuario_nombre || 'S')[0].toUpperCase() }}
              </div>
              <div class="fd-timeline-body">
                <div class="fd-timeline-header">
                  <span class="fd-timeline-user">
                    {{ seg.usuario?.nombre || seg.usuario_nombre || 'Sistema' }}
                  </span>
                  <span class="fd-timeline-time">{{ fmtDatetime(seg.created_at) }}</span>
                </div>
                <p v-if="seg.nota" class="fd-timeline-nota">{{ seg.nota }}</p>
                <div v-if="seg.estado_nuevo" class="fd-timeline-estado">
                  <span>→</span>
                  <span class="fd-estado-pill fd-estado-pill--sm"
                        :style="pillStyle(seg.estado_nuevo?.color_hex)">
                    {{ seg.estado_nuevo?.etiqueta || seg.estado_nuevo }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="fd-no-content" style="margin-top:8px;">Aún no hay notas de seguimiento.</p>
        </div>

      </div><!-- /fd-main -->

      <!-- COLUMNA DERECHA (sidebar) -->
      <div class="fd-sidebar">

        <!-- Acción sugerida -->
        <div v-if="falla.tipo?.accion_sugerida" class="fd-card fd-card-accent">
          <div class="fd-section-head">
            <span class="fd-section-icon">💡</span>
            <span>Acción sugerida</span>
          </div>
          <p class="fd-accion-text">{{ falla.tipo.accion_sugerida }}</p>
        </div>

        <!-- Actualización rápida -->
        <div class="fd-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">⚡</span>
            <span>Actualización rápida</span>
          </div>
          <div class="fd-quick-form">
            <div class="fd-field-col">
              <label class="fd-label">Estado</label>
              <select v-model="quickEdit.estado_id" class="fd-select">
                <option v-for="e in catalogos.estados" :key="e.id" :value="e.id">
                  {{ e.etiqueta }}
                </option>
              </select>
            </div>
            <div class="fd-field-col">
              <label class="fd-label">Prioridad</label>
              <select v-model="quickEdit.prioridad_id" class="fd-select">
                <option v-for="p in catalogos.prioridades" :key="p.id" :value="p.id">
                  {{ p.etiqueta }}
                </option>
              </select>
            </div>
            <div class="fd-field-col">
              <label class="fd-label">Asignado a</label>
              <select v-model="quickEdit.asignado_a_id" class="fd-select">
                <option value="">Sin asignar</option>
                <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
              </select>
            </div>
            <div class="fd-field-col">
              <label class="fd-label">Energía perdida (kWh)</label>
              <input v-model.number="quickEdit.energia_perdida_kwh" type="number"
                     class="fd-input" placeholder="Ej: 250.5" min="0" step="0.1" />
            </div>
            <div class="fd-field-col">
              <label class="fd-label">Causa raíz</label>
              <textarea v-model="quickEdit.causa_raiz" class="fd-textarea fd-textarea--sm"
                        rows="2" placeholder="Causa raíz identificada…" />
            </div>
            <button class="fd-btn fd-btn-primary fd-btn-full"
                    :disabled="savingQuick" @click="saveQuickEdit">
              <span v-if="savingQuick" class="fd-mini-spinner" />
              <span v-else>Guardar cambios</span>
            </button>
          </div>
        </div>

        <!-- Metadatos extra -->
        <div class="fd-card fd-meta-card">
          <div class="fd-section-head">
            <span class="fd-section-icon">🗂</span>
            <span>Detalles técnicos</span>
          </div>
          <div class="fd-meta-list">
            <div class="fd-meta-row">
              <span class="fd-label">ID interno</span>
              <code class="fd-mono">{{ falla.id }}</code>
            </div>
            <div class="fd-meta-row">
              <span class="fd-label">Código</span>
              <code class="fd-mono">{{ falla.codigo_interno }}</code>
            </div>
            <div v-if="falla.energia_perdida_kwh != null" class="fd-meta-row">
              <span class="fd-label">Energía perdida</span>
              <span class="fd-value fd-value-danger">
                {{ falla.energia_perdida_kwh.toLocaleString('es-CO') }} kWh
              </span>
            </div>
            <div v-if="falla.sla_cumplido !== null && falla.sla_cumplido !== undefined" class="fd-meta-row">
              <span class="fd-label">SLA</span>
              <span :class="falla.sla_cumplido ? 'fd-badge-ok' : 'fd-badge-fail'">
                {{ falla.sla_cumplido ? '✓ Cumplido' : '✗ Incumplido' }}
              </span>
            </div>
          </div>
        </div>

      </div><!-- /fd-sidebar -->

    </div><!-- /fd-layout -->
  </div><!-- /fd-page -->

</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import FallaForm from './FallaForm.vue'
import api from '@/api/client'

const route   = useRoute()
const router  = useRouter()
const toast   = useToast()
const confirm = useConfirm()

// ── Estado ───────────────────────────────────────────────────────────────
const falla     = ref(null)
const loading   = ref(true)
const notFound  = ref(false)
const editMode  = ref(false)
const addingSeg = ref(false)
const savingQuick  = ref(false)
const uploadingFoto = ref(false)

const catalogos = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const usuarios  = ref([])

const nuevaNota = reactive({ nota: '', estado_id: '' })
const quickEdit = reactive({
  estado_id:          null,
  prioridad_id:       null,
  asignado_a_id:      '',
  energia_perdida_kwh: null,
  causa_raiz:         '',
})

// ── Computed ─────────────────────────────────────────────────────────────
const sortedSeguimientos = computed(() =>
  [...(falla.value?.seguimientos ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

const adjuntos = computed(() => falla.value?.attachments ?? falla.value?.fotos ?? [])

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
  if (p >= 70)  return '#d97706'
  return '#16a34a'
})

const slaBadgeClass = computed(() => {
  if (falla.value?.sla_cumplido === true)  return 'fd-sla-ok'
  if (falla.value?.sla_cumplido === false) return 'fd-sla-fail'
  const p = slaPct.value
  if (p == null) return ''
  if (p >= 100) return 'fd-sla-fail'
  if (p >= 70)  return 'fd-sla-warn'
  return 'fd-sla-ok'
})

const slaTexto = computed(() => {
  if (falla.value?.sla_cumplido === true)  return '✓ Cumplido'
  if (falla.value?.sla_cumplido === false) return '✗ Excedido'
  const p = slaPct.value
  if (p == null) return 'Sin SLA'
  if (p >= 100) return `Excedido ${p}%`
  return `${p}% del límite`
})

const slaFillStyle = computed(() => {
  const p = Math.min(slaPct.value ?? 0, 100)
  return { width: `${p}%`, background: slaColor.value }
})

// ── Helpers visuales ─────────────────────────────────────────────────────
function pillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}33` }
}

function catPillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '18', color: c }
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

function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url || '')
}

// ── Carga ─────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/fallas/${route.params.id}`)
    falla.value = data
    // Sincronizar quickEdit
    quickEdit.estado_id          = data.estado?.id      ?? null
    quickEdit.prioridad_id       = data.prioridad?.id   ?? null
    quickEdit.asignado_a_id      = data.asignado_a?.id  ?? ''
    quickEdit.energia_perdida_kwh = data.energia_perdida_kwh ?? null
    quickEdit.causa_raiz         = data.causa_raiz      ?? ''
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

// ── Acciones ──────────────────────────────────────────────────────────────
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
    if (quickEdit.estado_id)          payload.estado_id          = quickEdit.estado_id
    if (quickEdit.prioridad_id)       payload.prioridad_id       = quickEdit.prioridad_id
    if (quickEdit.asignado_a_id)      payload.asignado_a_id      = quickEdit.asignado_a_id
    if (quickEdit.causa_raiz?.trim()) payload.causa_raiz         = quickEdit.causa_raiz.trim()
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
    if (nuevaNota.nota.trim())  payload.nota           = nuevaNota.nota.trim()
    if (nuevaNota.estado_id)    payload.estado_nuevo_id = nuevaNota.estado_id
    await api.post(`/fallas/${falla.value.id}/seguimientos`, payload)
    nuevaNota.nota      = ''
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
  try {
    for (const file of files) {
      const form = new FormData()
      form.append('file', file)
      form.append('etapa', 'proceso')
      try {
        await api.post(`/fallas/${falla.value.id}/attachments`, form,
          { headers: { 'Content-Type': 'multipart/form-data' } })
      } catch {
        toast.add({ severity: 'warn', summary: `No se pudo subir ${file.name}`, life: 3000 })
      }
    }
    await load()
    toast.add({ severity: 'success', summary: `${files.length} archivo(s) subido(s)`, life: 2500 })
  } finally {
    uploadingFoto.value = false
    event.target.value = ''
  }
}

async function deleteFoto(adjunto) {
  if (!confirm('¿Eliminar este adjunto?')) return
  try {
    await api.delete(`/fallas/${falla.value.id}/attachments/${adjunto.id}`)
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'No se pudo eliminar', life: 3000 })
  }
}

function confirmDelete() {
  confirm.require({
    message: `¿Eliminar la falla ${falla.value.codigo_interno}? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    rejectProps:  { label: 'Cancelar',  severity: 'secondary' },
    acceptProps:  { label: 'Eliminar',  severity: 'danger' },
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

<style scoped>
/* ── Base ──────────────────────────────────────────────────────────────── */
.fd-page {
  min-height: 100%;
  background: #f5f4f8;
  font-family: 'Sora', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ── Centro (loading / not found) ─────────────────────────────────────── */
.fd-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  text-align: center;
  padding: 40px 20px;
}
.fd-spinner {
  width: 36px; height: 36px;
  border: 3px solid #ece8f4;
  border-top-color: #915BD8;
  border-radius: 50%;
  animation: fd-spin .75s linear infinite;
}
@keyframes fd-spin { to { transform: rotate(360deg); } }
.fd-loading-text { font-size: 13px; color: #a094b8; }
.fd-empty-icon   { font-size: 40px; opacity: .2; }
.fd-empty-title  { font-size: 16px; font-weight: 700; color: #4a3b6b; margin: 0; }
.fd-empty-sub    { font-size: 13px; color: #a094b8; margin: 0; }

/* ── Hero ──────────────────────────────────────────────────────────────── */
.fd-hero {
  background: linear-gradient(135deg, #1e1530 0%, #2C2039 55%, #3a2653 100%);
  padding: 20px 32px 24px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(145,91,216,.18);
}
.fd-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.fd-back {
  background: none;
  border: none;
  color: rgba(245,240,255,.5);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
  transition: color .15s;
}
.fd-back:hover { color: rgba(245,240,255,.9); }
.fd-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.fd-hero-body { display: flex; flex-direction: column; gap: 10px; }

.fd-hero-pills {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.fd-estado-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .3px;
}
.fd-estado-pill--sm { font-size: 10.5px; padding: 2px 8px; }
.fd-prio-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
}
.fd-cat-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
/* Prioridad colors */
.prio-1 { background: #fef2f2; color: #dc2626; }
.prio-2 { background: #fff7ed; color: #c2410c; }
.prio-3 { background: #eff6ff; color: #1d4ed8; }
.prio-4 { background: #f9fafb; color: #6b7280; }

.fd-hero-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.fd-code {
  font-size: 17px;
  font-weight: 900;
  color: #c4a8ff;
  font-family: 'Courier New', monospace;
  letter-spacing: .5px;
}
.fd-dot { color: rgba(245,240,255,.25); font-size: 15px; }
.fd-tipo-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(245,240,255,.65);
}
.fd-desc {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(245,240,255,.88);
  margin: 0;
  max-width: 680px;
}
.fd-hero-meta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: rgba(245,240,255,.4);
}

/* ── Botones ───────────────────────────────────────────────────────────── */
.fd-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .14s;
  border: none;
  white-space: nowrap;
}
.fd-btn:disabled { opacity: .45; cursor: not-allowed; }
.fd-btn-primary {
  background: #7c3aed;
  color: #fff;
  border: 1px solid #6d28d9 !important;
}
.fd-btn-primary:hover:not(:disabled) { background: #6d28d9; }
.fd-btn-ghost {
  background: rgba(255,255,255,.09);
  color: rgba(245,240,255,.85);
  border: 1px solid rgba(255,255,255,.18) !important;
}
.fd-btn-ghost:hover { background: rgba(255,255,255,.15); }
.fd-btn-danger-ghost {
  background: rgba(239,68,68,.1);
  color: #fca5a5;
  border: 1px solid rgba(239,68,68,.2) !important;
}
.fd-btn-danger-ghost:hover { background: rgba(239,68,68,.2); }
.fd-btn-full { width: 100%; justify-content: center; }

/* ── Layout ────────────────────────────────────────────────────────────── */
.fd-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  padding: 20px 32px 40px;
  flex: 1;
  min-height: 0;
}
.fd-layout-single {
  padding: 20px 32px 40px;
}
@media (max-width: 1024px) {
  .fd-layout { grid-template-columns: 1fr; }
  .fd-sidebar { order: -1; }
}
@media (max-width: 640px) {
  .fd-hero, .fd-layout, .fd-layout-single { padding-left: 16px; padding-right: 16px; }
}

.fd-main    { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.fd-sidebar { display: flex; flex-direction: column; gap: 14px; }

/* ── Cards ─────────────────────────────────────────────────────────────── */
.fd-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ece8f4;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(44,32,57,.04);
}
.fd-card-accent {
  border-left: 3px solid #915BD8;
  background: #fdf9ff;
}

.fd-section-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: #4a3b6b;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 14px;
}
.fd-section-icon { font-size: 14px; }

/* ── Info grid ─────────────────────────────────────────────────────────── */
.fd-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px 20px;
}
.fd-field  { display: flex; flex-direction: column; gap: 2px; }
.fd-label  {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #a094b8;
}
.fd-value  { font-size: 13px; color: #2C2039; }
.fd-bold   { font-weight: 700; }
.fd-value-danger { font-weight: 700; color: #dc2626; }

/* ── SLA ───────────────────────────────────────────────────────────────── */
.fd-sla-card { }
.fd-sla-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0;
}
.fd-sla-ok   { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.fd-sla-fail { background: #fff1f2; color: #dc2626; border: 1px solid #fecaca; }
.fd-sla-warn { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }

.fd-sla-body { display: flex; flex-direction: column; gap: 8px; }
.fd-sla-row  {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.fd-sla-track {
  height: 6px;
  background: #f0eaf8;
  border-radius: 4px;
  overflow: hidden;
}
.fd-sla-fill {
  height: 100%;
  border-radius: 4px;
  transition: width .5s ease;
}
.fd-no-sla { font-size: 12.5px; color: #a094b8; }

/* ── Análisis ──────────────────────────────────────────────────────────── */
.fd-analysis-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 640px) { .fd-analysis-grid { grid-template-columns: 1fr; } }
.fd-analysis-block { display: flex; flex-direction: column; gap: 5px; }
.fd-analysis-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #7c3aed;
}
.fd-analysis-text { font-size: 13px; color: #2C2039; line-height: 1.55; margin: 0; }

/* ── Fotos ─────────────────────────────────────────────────────────────── */
.fd-upload-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f0eaf8;
  color: #7c3aed;
  border: 1px solid #ddd6fe;
  border-radius: 7px;
  padding: 4px 11px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background .13s;
  font-family: inherit;
}
.fd-upload-btn:hover { background: #e9dffc; }
.fd-upload-btn--loading { opacity: .6; cursor: wait; }
.fd-hidden-input { display: none; }

.fd-fotos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
  margin-top: 4px;
}
.fd-foto-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ece8f4;
  aspect-ratio: 1;
  background: #f8f6fc;
}
.fd-foto-img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.fd-foto-doc {
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
}
.fd-foto-doc-icon { font-size: 24px; }
.fd-foto-doc-name {
  font-size: 9px;
  color: #9b89b5;
  text-align: center;
  word-break: break-all;
  line-clamp: 2;
  overflow: hidden;
}
.fd-foto-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity .15s;
}
.fd-foto-card:hover .fd-foto-overlay { opacity: 1; }
.fd-foto-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  background: rgba(255,255,255,.9);
  border-radius: 6px;
  font-size: 13px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background .12s;
}
.fd-foto-action:hover { background: #fff; }
.fd-foto-del  { background: rgba(239,68,68,.85); }
.fd-foto-del:hover { background: #ef4444; }

/* ── Seguimientos ──────────────────────────────────────────────────────── */
.fd-seg-add {
  background: #faf8fd;
  border: 1px solid #ece8f4;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fd-seg-add-row  { display: flex; gap: 10px; flex-wrap: wrap; }
.fd-seg-add-footer { display: flex; justify-content: flex-end; }
.fd-field-col  { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }

.fd-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 28px;
}
.fd-timeline::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: #ece8f4;
}
.fd-timeline-item {
  position: relative;
  display: flex;
  gap: 0;
  margin-bottom: 14px;
}
.fd-timeline-item:last-child { margin-bottom: 0; }
.fd-timeline-dot {
  position: absolute;
  left: -28px;
  top: 2px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #7c3aed;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}
.fd-timeline-body {
  background: #faf8fd;
  border: 1px solid #ece8f4;
  border-radius: 9px;
  padding: 10px 13px;
  flex: 1;
  min-width: 0;
}
.fd-timeline-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 5px;
}
.fd-timeline-user {
  font-size: 12px;
  font-weight: 700;
  color: #2C2039;
}
.fd-timeline-time {
  font-size: 10.5px;
  color: #a094b8;
}
.fd-timeline-nota {
  font-size: 12.5px;
  line-height: 1.5;
  color: #4a3b6b;
  margin: 0;
}
.fd-timeline-estado {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #7c3aed;
  margin-top: 6px;
}
.fd-no-content {
  font-size: 12.5px;
  color: #a094b8;
  text-align: center;
  padding: 16px 0 4px;
  margin: 0;
}

/* ── Quick form (sidebar) ──────────────────────────────────────────────── */
.fd-quick-form { display: flex; flex-direction: column; gap: 12px; }

.fd-select, .fd-input {
  background: #faf9fc;
  border: 1.5px solid #e5e0f0;
  border-radius: 7px;
  padding: 7px 10px;
  color: #2C2039;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color .14s;
  width: 100%;
}
.fd-select:focus, .fd-input:focus { border-color: #915BD8; }
.fd-select { cursor: pointer; }

.fd-textarea {
  background: #faf9fc;
  border: 1.5px solid #e5e0f0;
  border-radius: 7px;
  padding: 7px 10px;
  color: #2C2039;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color .14s;
  width: 100%;
  resize: vertical;
}
.fd-textarea:focus { border-color: #915BD8; }
.fd-textarea--sm { min-height: 56px; }

/* ── Meta card ─────────────────────────────────────────────────────────── */
.fd-meta-card { }
.fd-meta-list { display: flex; flex-direction: column; gap: 10px; }
.fd-meta-row  {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.fd-mono {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #7c3aed;
  background: #f5f0ff;
  padding: 1px 6px;
  border-radius: 4px;
}
.fd-badge-ok   { font-size: 11px; font-weight: 700; color: #16a34a; }
.fd-badge-fail { font-size: 11px; font-weight: 700; color: #dc2626; }

/* ── Acción sugerida ───────────────────────────────────────────────────── */
.fd-accion-text {
  font-size: 12.5px;
  line-height: 1.55;
  color: #4a3b6b;
  margin: 0;
}

/* ── Mini spinner (inline) ─────────────────────────────────────────────── */
.fd-mini-spinner {
  display: inline-block;
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: fd-spin .6s linear infinite;
  vertical-align: middle;
}
</style>
