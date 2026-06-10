<template>
  <Teleport to="body">
    <Transition name="tsheet">
      <div v-if="open && fa" class="td-backdrop" @click.self="close">
        <div class="td-sheet">
          <div class="td-grab" />

          <!-- Header -->
          <div class="td-header">
            <div class="td-head-text">
              <code class="td-code">{{ fa.codigo_interno }}</code>
              <span class="td-type">{{ fa.tipo?.etiqueta || fa.tipo_libre || 'Falla' }}</span>
            </div>
            <span v-if="saving" class="td-saving"><i class="pi pi-spin pi-spinner" /></span>
            <button class="td-close" @click="close"><i class="pi pi-times" /></button>
          </div>

          <div class="td-body">
            <!-- Info básica -->
            <div class="td-info-row">
              <span class="td-badge-estado" :style="estadoStyle(fa.estado)">{{ fa.estado?.etiqueta }}</span>
              <span class="td-badge-prio" :style="{ color: fa.prioridad?.color_hex }">
                <i class="pi pi-flag-fill" /> {{ fa.prioridad?.etiqueta }}
              </span>
              <span class="td-time">{{ relativeTime(fa.fecha_identificacion) }}</span>
            </div>
            <div class="td-proj"><i class="pi pi-bolt" /> {{ fa.proyecto?.nombre_comercial || '—' }}</div>
            <p class="td-desc">{{ fa.descripcion }}</p>

            <!-- HALLAZGOS Y SOLUCIÓN -->
            <div class="td-section">
              <span class="td-label">Hallazgos en sitio</span>
              <textarea
                v-model="hallazgos"
                rows="4"
                class="td-textarea"
                placeholder="¿Qué encontraste? Describe el problema observado en sitio…"
                @blur="guardarHallazgos"
              />
            </div>

            <div class="td-section">
              <span class="td-label">Solución aplicada</span>
              <textarea
                v-model="solucion"
                rows="3"
                class="td-textarea"
                placeholder="¿Qué hiciste para resolverlo? Acciones correctivas aplicadas…"
                @blur="guardarSolucion"
              />
            </div>

            <!-- FOTOS -->
            <div class="td-section">
              <div class="td-section-head">
                <span class="td-label">Fotos de evidencia</span>
                <span v-if="archivos.length" class="td-foto-count">{{ archivos.length }} foto{{ archivos.length !== 1 ? 's' : '' }}</span>
              </div>

              <!-- Botones de cámara / galería -->
              <div class="td-foto-btns">
                <button class="td-foto-btn td-foto-btn--cam" @click="$refs.inputCamara.click()" :disabled="uploading">
                  <i class="pi pi-camera" />
                  <span>Cámara</span>
                </button>
                <button class="td-foto-btn td-foto-btn--gal" @click="$refs.inputGaleria.click()" :disabled="uploading">
                  <i class="pi pi-images" />
                  <span>Galería</span>
                </button>
              </div>

              <!-- Inputs ocultos -->
              <input ref="inputCamara" type="file" accept="image/*" capture="environment"
                style="display:none" @change="subirFoto($event)" />
              <input ref="inputGaleria" type="file" accept="image/*" multiple
                style="display:none" @change="subirFotos($event)" />

              <!-- Progreso de subida -->
              <div v-if="uploading" class="td-upload-progress">
                <div class="td-upload-bar" :style="{ width: uploadPct + '%' }" />
                <span>Subiendo a Drive… {{ uploadPct }}%</span>
              </div>
              <div v-if="uploadError" class="td-upload-error">
                <i class="pi pi-exclamation-triangle" /> {{ uploadError }}
                <button @click="uploadError = ''">Cerrar</button>
              </div>

              <!-- Grid de fotos -->
              <div v-if="archivos.length" class="td-fotos-grid">
                <div v-for="a in archivos" :key="a.id" class="td-foto-item">
                  <a :href="a.url" target="_blank" rel="noopener" class="td-foto-thumb">
                    <i class="pi pi-image" />
                    <span>{{ truncarNombre(a.nombre) }}</span>
                  </a>
                  <button class="td-foto-del" @click.prevent="eliminarFoto(a)" title="Eliminar">
                    <i class="pi pi-times" />
                  </button>
                </div>
              </div>
              <p v-else-if="!uploading" class="td-fotos-empty">Las fotos se guardan en Google Drive, organizadas por falla.</p>
            </div>

            <!-- Seguimientos -->
            <div class="td-section">
              <span class="td-label">Notas ({{ fa.seguimientos?.length || 0 }})</span>
              <div class="td-nota-add">
                <textarea v-model="nota" rows="2" class="td-textarea td-textarea--sm" placeholder="Agregar nota o actualización…" />
                <button class="td-nota-send" :disabled="addingSeg || !nota.trim()" @click="agregarNota">
                  <i v-if="addingSeg" class="pi pi-spin pi-spinner" /><i v-else class="pi pi-send" />
                </button>
              </div>
              <div v-for="s in (fa.seguimientos || []).slice().reverse()" :key="s.id" class="td-seg">
                <div class="td-seg-top">
                  <span class="td-seg-user">{{ s.usuario?.nombre || '—' }}</span>
                  <span class="td-seg-time">{{ relativeTime2(s.created_at) }}</span>
                </div>
                <p v-if="s.nota" class="td-seg-nota">{{ s.nota }}</p>
              </div>
            </div>
          </div>

          <!-- Botón principal: Cerrar falla -->
          <div class="td-actions">
            <button v-if="!fa.estado?.es_estado_final" class="td-btn-cerrar" :disabled="saving" @click="cerrarFalla">
              <i class="pi pi-check-circle" /> Marcar falla resuelta
            </button>
            <button v-else class="td-btn-reabrir" :disabled="saving" @click="reabrirFalla">
              <i class="pi pi-replay" /> Reabrir falla
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api/client'

const props = defineProps({
  open:      { type: Boolean, default: false },
  falla:     { type: Object,  default: null },
  catalogos: { type: Object,  default: () => ({ estados: [], prioridades: [] }) },
})
const emit = defineEmits(['close', 'updated'])

const fa        = ref(null)
const saving    = ref(false)
const addingSeg = ref(false)
const nota      = ref('')
const hallazgos = ref('')
const solucion  = ref('')
const archivos  = ref([])
const uploading = ref(false)
const uploadPct = ref(0)
const uploadError = ref('')

const inputCamara  = ref(null)
const inputGaleria = ref(null)

watch(() => props.open, async (o) => {
  if (o && props.falla) {
    fa.value = props.falla
    nota.value = ''
    hallazgos.value = fa.value.causa_raiz || ''
    solucion.value  = fa.value.acciones_correctivas || ''
    uploadError.value = ''
    await Promise.all([refrescar(), cargarArchivos()])
  }
})

function estadoStyle(estado) {
  const c = estado?.color_hex || '#915BD8'
  return { background: c + '22', color: c }
}
function relativeTime(s) {
  if (!s) return ''
  const dias = Math.floor((Date.now() - new Date(s + 'T00:00:00').getTime()) / 86400000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} d`
  return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}
function relativeTime2(s) {
  if (!s) return ''
  const min = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}
function truncarNombre(nombre) {
  if (!nombre) return 'archivo'
  return nombre.length > 22 ? nombre.slice(0, 10) + '…' + nombre.slice(-8) : nombre
}
function close() { emit('close') }

async function refrescar() {
  if (!fa.value) return
  try {
    const { data } = await api.get(`/fallas/${fa.value.id}`)
    fa.value = data
    hallazgos.value = data.causa_raiz || ''
    solucion.value  = data.acciones_correctivas || ''
    emit('updated', data)
  } catch { /* mantiene datos actuales */ }
}

async function cargarArchivos() {
  if (!fa.value) return
  try {
    const { data } = await api.get(`/fallas/${fa.value.id}/archivos`)
    archivos.value = Array.isArray(data) ? data : []
  } catch { archivos.value = [] }
}

async function patch(payload) {
  if (!fa.value) return
  saving.value = true
  try {
    const { data } = await api.patch(`/fallas/${fa.value.id}`, payload)
    fa.value = data
    emit('updated', data)
  } catch (e) {
    window.__primeToast?.({ severity: 'error', summary: 'No se pudo guardar', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    saving.value = false
  }
}

async function guardarHallazgos() {
  if (!fa.value || hallazgos.value === (fa.value.causa_raiz || '')) return
  await patch({ causa_raiz: hallazgos.value.trim() || null })
}
async function guardarSolucion() {
  if (!fa.value || solucion.value === (fa.value.acciones_correctivas || '')) return
  await patch({ acciones_correctivas: solucion.value.trim() || null })
}

async function agregarNota() {
  if (!fa.value || !nota.value.trim()) return
  addingSeg.value = true
  try {
    await api.post(`/fallas/${fa.value.id}/seguimientos`, { nota: nota.value.trim() })
    nota.value = ''
    await refrescar()
    window.__primeToast?.({ severity: 'success', summary: 'Nota agregada', life: 2000 })
  } catch (e) {
    window.__primeToast?.({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    addingSeg.value = false
  }
}

async function subirFoto(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await _subirArchivo(file)
}

async function subirFotos(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return
  for (let i = 0; i < files.length; i++) {
    uploadPct.value = Math.round((i / files.length) * 100)
    await _subirArchivo(files[i])
  }
  uploadPct.value = 0
}

async function _subirArchivo(file) {
  if (!fa.value) return
  uploading.value = true
  uploadError.value = ''
  uploadPct.value = 10
  try {
    const form = new FormData()
    form.append('archivo', file, file.name)
    uploadPct.value = 40
    const { data } = await api.post(`/fallas/${fa.value.id}/archivos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total) uploadPct.value = Math.round(10 + (e.loaded / e.total) * 80)
      },
    })
    uploadPct.value = 100
    archivos.value.push(data)
    window.__primeToast?.({ severity: 'success', summary: 'Foto guardada en Drive', life: 2000 })
  } catch (e) {
    const msg = e.response?.data?.detail || 'Error al subir la foto. Verifica tu conexión.'
    uploadError.value = msg
    window.__primeToast?.({ severity: 'error', summary: 'Error al subir foto', detail: msg, life: 4000 })
  } finally {
    uploading.value = false
    uploadPct.value = 0
  }
}

async function eliminarFoto(archivo) {
  if (!fa.value) return
  try {
    await api.delete(`/fallas/${fa.value.id}/archivos/${archivo.id}`)
    archivos.value = archivos.value.filter((a) => a.id !== archivo.id)
    window.__primeToast?.({ severity: 'info', summary: 'Foto eliminada', life: 2000 })
  } catch (e) {
    window.__primeToast?.({ severity: 'error', summary: 'No se pudo eliminar', detail: e.response?.data?.detail, life: 3000 })
  }
}

async function cerrarFalla() {
  const final = (props.catalogos.estados || []).find((e) => e.es_estado_final)
  if (!final) {
    window.__primeToast?.({ severity: 'warn', summary: 'Sin estado final configurado', life: 3000 })
    return
  }
  await patch({ estado_id: final.id, fecha_resolucion: new Date().toISOString() })
  window.__primeToast?.({ severity: 'success', summary: '¡Falla resuelta!', life: 2500 })
}

async function reabrirFalla() {
  const abierta = (props.catalogos.estados || []).find((e) => e.codigo === 'abierta')
    || (props.catalogos.estados || []).find((e) => !e.es_estado_final)
  if (!abierta) return
  await patch({ estado_id: abierta.id, fecha_resolucion: null })
}
</script>

<style scoped>
.td-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(4,30,20,0.5); display: flex; align-items: flex-end; }
.td-sheet {
  width: 100%; max-height: 94vh; display: flex; flex-direction: column; background: #fff;
  border-radius: 22px 22px 0 0; padding: 10px 18px 0;
  box-shadow: 0 -8px 30px rgba(0,0,0,0.25);
}
.td-grab { width: 40px; height: 4px; border-radius: 2px; background: #e5e7eb; margin: 4px auto 12px; flex-shrink: 0; }
.td-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-shrink: 0; }
.td-head-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.td-code { font-family: ui-monospace, monospace; font-size: 12px; color: #065f46; background: #ecfdf5; padding: 1px 7px; border-radius: 6px; align-self: flex-start; }
.td-type { font-size: 15px; font-weight: 700; color: #2C2039; }
.td-saving { color: #059669; font-size: 14px; }
.td-close { background: none; border: none; color: #9ca3af; font-size: 16px; padding: 6px; }

.td-body { overflow-y: auto; flex: 1; padding-bottom: 8px; }

.td-info-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.td-badge-estado { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px; }
.td-badge-prio { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.td-time { font-size: 12px; color: #9ca3af; margin-left: auto; }
.td-proj { font-size: 13px; color: #6b5a8a; display: flex; align-items: center; gap: 5px; margin-bottom: 8px; }
.td-proj .pi { color: #059669; font-size: 11px; }
.td-desc { font-size: 14px; color: #374151; line-height: 1.5; margin: 0 0 16px; padding: 12px; background: #f9fafb; border-radius: 10px; }

.td-section { margin-bottom: 18px; }
.td-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.td-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #9b8db5; display: block; margin-bottom: 8px; }
.td-foto-count { font-size: 11px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 8px; }

.td-textarea {
  width: 100%; padding: 13px 14px; font-size: 16px; line-height: 1.5;
  border: 1.5px solid #e8e0f0; border-radius: 12px; resize: none;
  font-family: inherit; color: #2C2039; background: #fff;
}
.td-textarea:focus { outline: none; border-color: #059669; }
.td-textarea--sm { font-size: 15px; }

/* Fotos */
.td-foto-btns { display: flex; gap: 10px; margin-bottom: 12px; }
.td-foto-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 10px; border: 2px dashed #d1d5db; border-radius: 14px;
  background: #f9fafb; font-size: 13px; font-weight: 600; color: #374151;
}
.td-foto-btn .pi { font-size: 22px; }
.td-foto-btn--cam { border-color: #059669; color: #065f46; background: #f0fdf4; }
.td-foto-btn--cam .pi { color: #059669; }
.td-foto-btn--gal { border-color: #2563eb; color: #1e40af; background: #eff6ff; }
.td-foto-btn--gal .pi { color: #2563eb; }
.td-foto-btn:disabled { opacity: .5; }

.td-upload-progress {
  margin-bottom: 10px; padding: 10px 12px; background: #f0fdf4; border-radius: 10px;
  font-size: 13px; color: #065f46; font-weight: 600;
}
.td-upload-bar {
  height: 4px; border-radius: 2px; background: #059669; margin-bottom: 6px; transition: width .3s ease;
}
.td-upload-error {
  display: flex; align-items: center; gap: 8px; font-size: 13px; color: #b91c1c;
  background: #fef2f2; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;
}
.td-upload-error button { margin-left: auto; background: none; border: none; color: #b91c1c; font-size: 12px; font-weight: 700; }

.td-fotos-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.td-foto-item { position: relative; }
.td-foto-thumb {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  width: 80px; height: 80px; border-radius: 10px; border: 1.5px solid #d1fae5;
  background: #f0fdf4; text-decoration: none; color: #065f46; font-size: 10px; text-align: center;
  padding: 10px 4px; overflow: hidden;
}
.td-foto-thumb .pi { font-size: 24px; color: #059669; }
.td-foto-del {
  position: absolute; top: -5px; right: -5px; width: 20px; height: 20px;
  border-radius: 50%; border: none; background: #dc2626; color: #fff; font-size: 9px;
  display: flex; align-items: center; justify-content: center;
}
.td-fotos-empty { font-size: 12px; color: #9ca3af; text-align: center; padding: 8px 0; }

/* Seguimientos */
.td-nota-add { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 12px; }
.td-nota-add .td-textarea { flex: 1; }
.td-nota-send {
  width: 48px; height: 48px; flex-shrink: 0; border: none; border-radius: 12px;
  background: #059669; color: #fff; font-size: 16px; align-self: flex-end;
}
.td-nota-send:disabled { opacity: .4; }
.td-seg { border-left: 2px solid #d1fae5; padding: 4px 0 10px 12px; margin-bottom: 6px; }
.td-seg-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
.td-seg-user { font-weight: 700; color: #2C2039; }
.td-seg-time { color: #9ca3af; }
.td-seg-nota { font-size: 14px; color: #4b5563; line-height: 1.4; margin: 0; }

/* Botones de acción */
.td-actions {
  flex-shrink: 0; padding: 12px 0 calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid #f0fdf4;
}
.td-btn-cerrar {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 17px; border: none; border-radius: 16px; font-size: 17px; font-weight: 800;
  background: #16a34a; color: #fff; letter-spacing: .2px;
}
.td-btn-reabrir {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 17px; border: none; border-radius: 16px; font-size: 16px; font-weight: 700;
  background: #f0fdf4; color: #065f46;
}
.td-btn-cerrar:disabled, .td-btn-reabrir:disabled { opacity: .5; }

.tsheet-enter-active, .tsheet-leave-active { transition: opacity .2s ease; }
.tsheet-enter-active .td-sheet, .tsheet-leave-active .td-sheet { transition: transform .25s ease; }
.tsheet-enter-from, .tsheet-leave-to { opacity: 0; }
.tsheet-enter-from .td-sheet, .tsheet-leave-to .td-sheet { transform: translateY(100%); }
</style>
