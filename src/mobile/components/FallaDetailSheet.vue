<template>
  <Teleport to="body">
    <Transition name="fdsheet">
      <div v-if="open && fa" class="fd-backdrop" @click.self="close">
        <div class="fd-sheet">
          <div class="fd-grab" />

          <!-- Header -->
          <div class="fd-header">
            <div class="fd-head-text">
              <code class="fd-code">{{ fa.codigo_interno }}</code>
              <span class="fd-type">{{ fa.tipo?.etiqueta || fa.tipo_libre || 'Falla' }}</span>
            </div>
            <span v-if="saving" class="fd-saving"><i class="pi pi-spin pi-spinner" /></span>
            <button class="fd-close" @click="close"><i class="pi pi-times" /></button>
          </div>

          <div class="fd-body">
            <p class="fd-desc">{{ fa.descripcion }}</p>

            <!-- Estado -->
            <div class="fd-field">
              <span class="fd-label">Estado</span>
              <div class="fd-chips">
                <button v-for="e in catalogos.estados" :key="e.id" type="button"
                  :class="['fd-chip', fa.estado?.id === e.id && 'fd-chip--on']"
                  :style="fa.estado?.id === e.id ? chipOn(e.color_hex) : {}"
                  @click="cambiar({ estado_id: e.id })">{{ e.etiqueta }}</button>
              </div>
            </div>

            <!-- Prioridad -->
            <div class="fd-field">
              <span class="fd-label">Prioridad</span>
              <div class="fd-chips">
                <button v-for="p in catalogos.prioridades" :key="p.id" type="button"
                  :class="['fd-chip', fa.prioridad?.id === p.id && 'fd-chip--on']"
                  :style="fa.prioridad?.id === p.id ? chipOn(p.color_hex) : {}"
                  @click="cambiar({ prioridad_id: p.id })">{{ p.etiqueta }}</button>
              </div>
            </div>

            <!-- Asignado -->
            <div class="fd-field">
              <span class="fd-label">Asignado a</span>
              <select class="fd-select" :value="fa.asignado_a?.id ?? ''"
                @change="cambiar({ asignado_a_id: $event.target.value ? Number($event.target.value) : null })">
                <option value="">Sin asignar</option>
                <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nombre }}</option>
              </select>
            </div>

            <!-- Datos -->
            <div class="fd-facts">
              <div class="fd-fact"><span>Proyecto</span><b>{{ fa.proyecto?.nombre_comercial || '—' }}</b></div>
              <div class="fd-fact"><span>Identificada</span><b>{{ fmtFecha(fa.fecha_identificacion) }}</b></div>
              <div class="fd-fact"><span>Registró</span><b>{{ fa.registrado_por?.nombre || '—' }}</b></div>
              <div v-if="fa.fecha_resolucion" class="fd-fact"><span>Resuelta</span><b class="fd-ok">{{ fmtFecha(fa.fecha_resolucion?.slice?.(0,10) || fa.fecha_resolucion) }}</b></div>
              <div v-if="fa.energia_perdida_kwh != null" class="fd-fact"><span>Energía perdida</span><b class="fd-bad">{{ Number(fa.energia_perdida_kwh).toLocaleString('es-CO') }} kWh</b></div>
            </div>

            <!-- Causa raíz / acciones -->
            <div v-if="fa.causa_raiz" class="fd-block"><span class="fd-label">Causa raíz</span><p>{{ fa.causa_raiz }}</p></div>
            <div v-if="fa.acciones_correctivas" class="fd-block"><span class="fd-label">Acciones correctivas</span><p>{{ fa.acciones_correctivas }}</p></div>

            <!-- Seguimientos -->
            <div class="fd-segs">
              <span class="fd-label">Seguimiento ({{ fa.seguimientos?.length || 0 }})</span>
              <div class="fd-add">
                <textarea v-model="nota" rows="2" class="fd-textarea" placeholder="Agregar nota…"></textarea>
                <div class="fd-add-row">
                  <select v-model="notaEstadoId" class="fd-select fd-select--sm">
                    <option :value="null">Sin cambiar estado</option>
                    <option v-for="e in catalogos.estados" :key="e.id" :value="e.id">→ {{ e.etiqueta }}</option>
                  </select>
                  <button class="fd-send" :disabled="addingSeg || (!nota.trim() && !notaEstadoId)" @click="agregarSeg">
                    <i v-if="addingSeg" class="pi pi-spin pi-spinner" /><i v-else class="pi pi-send" />
                  </button>
                </div>
              </div>
              <div v-for="s in (fa.seguimientos || [])" :key="s.id" class="fd-seg">
                <div class="fd-seg-top">
                  <span class="fd-seg-user">{{ s.usuario?.nombre || '—' }}</span>
                  <span class="fd-seg-time">{{ relativeTime(s.created_at) }}</span>
                </div>
                <p v-if="s.nota" class="fd-seg-nota">{{ s.nota }}</p>
                <span v-if="s.estado_nuevo" class="fd-seg-estado" :style="chipOn(s.estado_nuevo.color_hex)">{{ s.estado_nuevo.etiqueta }}</span>
              </div>
            </div>
          </div>

          <!-- Acción principal -->
          <button v-if="!fa.estado?.es_estado_final" class="fd-resolve" :disabled="saving" @click="resolver">
            <i class="pi pi-check-circle" /> Marcar resuelta
          </button>
          <button v-else class="fd-reopen" :disabled="saving" @click="reabrir">
            <i class="pi pi-replay" /> Reabrir falla
          </button>
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
  falla:     { type: Object, default: null },
  catalogos: { type: Object, default: () => ({ estados: [], prioridades: [] }) },
  usuarios:  { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'updated'])

const fa = ref(null)
const saving = ref(false)
const addingSeg = ref(false)
const nota = ref('')
const notaEstadoId = ref(null)

watch(() => props.open, (o) => {
  if (o && props.falla) {
    fa.value = props.falla
    nota.value = ''
    notaEstadoId.value = null
    refrescar()
  }
})

function chipOn(color) {
  const c = color || '#915BD8'
  return { background: c, borderColor: c, color: '#fff' }
}
function fmtFecha(d) {
  if (!d) return '—'
  try { return new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function relativeTime(s) {
  if (!s) return ''
  const min = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

function close() { emit('close') }

async function refrescar() {
  if (!fa.value) return
  try {
    const { data } = await api.get(`/fallas/${fa.value.id}`)
    fa.value = data
  } catch { /* mantiene la copia del listado */ }
}

async function cambiar(payload) {
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

async function agregarSeg() {
  if (!fa.value || (!nota.value.trim() && !notaEstadoId.value)) return
  addingSeg.value = true
  try {
    const payload = {}
    if (nota.value.trim()) payload.nota = nota.value.trim()
    if (notaEstadoId.value) payload.estado_nuevo_id = notaEstadoId.value
    await api.post(`/fallas/${fa.value.id}/seguimientos`, payload)
    nota.value = ''
    notaEstadoId.value = null
    await refrescar()
    emit('updated', fa.value)
    window.__primeToast?.({ severity: 'success', summary: 'Seguimiento agregado', life: 2000 })
  } catch (e) {
    window.__primeToast?.({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    addingSeg.value = false
  }
}

async function resolver() {
  const final = (props.catalogos.estados || []).find((e) => e.es_estado_final)
  if (!final) { window.__primeToast?.({ severity: 'warn', summary: 'Sin estado final configurado', life: 3000 }); return }
  await cambiar({ estado_id: final.id, fecha_resolucion: new Date().toISOString() })
  window.__primeToast?.({ severity: 'success', summary: 'Falla resuelta', life: 2500 })
}

async function reabrir() {
  const abierta = (props.catalogos.estados || []).find((e) => e.codigo === 'abierta')
    || (props.catalogos.estados || []).find((e) => !e.es_estado_final)
  if (!abierta) return
  await cambiar({ estado_id: abierta.id, fecha_resolucion: null })
}
</script>

<style scoped>
.fd-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(28,18,50,0.45); display: flex; align-items: flex-end; }
.fd-sheet {
  width: 100%; max-height: 92vh; display: flex; flex-direction: column; background: #fff;
  border-radius: 22px 22px 0 0; padding: 10px 18px calc(14px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0,0,0,0.2);
}
.fd-grab { width: 40px; height: 4px; border-radius: 2px; background: #e5e7eb; margin: 4px auto 12px; }
.fd-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.fd-head-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fd-code { font-family: ui-monospace, monospace; font-size: 12px; color: #6E3FB8; background: #f3edfb; padding: 1px 7px; border-radius: 6px; align-self: flex-start; }
.fd-type { font-size: 15px; font-weight: 700; color: #2C2039; }
.fd-saving { color: #915BD8; font-size: 14px; }
.fd-close { background: none; border: none; color: #9ca3af; font-size: 16px; padding: 4px; }

.fd-body { overflow-y: auto; flex: 1; }
.fd-desc { font-size: 15px; color: #2C2039; line-height: 1.45; margin: 0 0 16px; }
.fd-field { margin-bottom: 16px; }
.fd-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #9b8db5; }
.fd-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.fd-chip { padding: 9px 14px; border-radius: 11px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 14px; font-weight: 600; color: #6b5a8a; }

.fd-select {
  width: 100%; margin-top: 8px; padding: 12px 14px; font-size: 16px;
  border: 1.5px solid #e8e0f0; border-radius: 12px; color: #2C2039; background: #fff; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
}
.fd-select:focus { outline: none; border-color: #915BD8; }
.fd-select--sm { margin-top: 0; flex: 1; font-size: 14px; padding: 10px 12px; }

.fd-facts { display: flex; flex-direction: column; gap: 0; border: 1px solid #f0eaf8; border-radius: 12px; padding: 4px 12px; margin-bottom: 16px; }
.fd-fact { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f1fa; font-size: 14px; }
.fd-fact:last-child { border-bottom: none; }
.fd-fact span { color: #9b8db5; }
.fd-fact b { color: #2C2039; text-align: right; }
.fd-ok { color: #15803d; }
.fd-bad { color: #b91c1c; }

.fd-block { margin-bottom: 16px; }
.fd-block p { font-size: 14px; color: #4b5563; line-height: 1.45; margin: 6px 0 0; }

.fd-segs { margin-bottom: 8px; }
.fd-add { margin: 8px 0 14px; }
.fd-textarea { width: 100%; padding: 12px 14px; font-size: 16px; border: 1.5px solid #e8e0f0; border-radius: 12px; resize: none; font-family: inherit; color: #2C2039; }
.fd-textarea:focus { outline: none; border-color: #915BD8; }
.fd-add-row { display: flex; gap: 8px; margin-top: 8px; align-items: stretch; }
.fd-send { width: 48px; border: none; border-radius: 11px; background: #915BD8; color: #fff; font-size: 16px; flex-shrink: 0; }
.fd-send:disabled { opacity: .4; }

.fd-seg { border-left: 2px solid #e8e0f0; padding: 4px 0 10px 12px; margin-bottom: 4px; }
.fd-seg-top { display: flex; justify-content: space-between; font-size: 12px; }
.fd-seg-user { font-weight: 700; color: #2C2039; }
.fd-seg-time { color: #9ca3af; }
.fd-seg-nota { font-size: 14px; color: #4b5563; margin: 4px 0 0; line-height: 1.4; }
.fd-seg-estado { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }

.fd-resolve, .fd-reopen {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 15px; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; margin-top: 10px; flex-shrink: 0;
}
.fd-resolve { background: #16a34a; color: #fff; }
.fd-reopen { background: #f3edfb; color: #6E3FB8; }
.fd-resolve:disabled, .fd-reopen:disabled { opacity: .5; }

.fdsheet-enter-active, .fdsheet-leave-active { transition: opacity .2s ease; }
.fdsheet-enter-active .fd-sheet, .fdsheet-leave-active .fd-sheet { transition: transform .25s ease; }
.fdsheet-enter-from, .fdsheet-leave-to { opacity: 0; }
.fdsheet-enter-from .fd-sheet, .fdsheet-leave-to .fd-sheet { transform: translateY(100%); }
</style>
