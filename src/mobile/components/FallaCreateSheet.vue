<template>
  <Teleport to="body">
    <Transition name="fsheet">
      <div v-if="open" class="fc-backdrop" @click.self="close">
        <div class="fc-sheet">
          <div class="fc-grab" />
          <div class="fc-header">
            <span class="fc-title"><i class="pi pi-plus-circle" /> Registrar falla</span>
            <button class="fc-close" @click="close"><i class="pi pi-times" /></button>
          </div>

          <div class="fc-body">
            <!-- Proyecto -->
            <label class="fc-label">Proyecto <span class="fc-req">*</span>
              <select v-model="f.proyecto_id" class="fc-select" :class="{ 'fc-invalid': err.proyecto_id }">
                <option :value="null" disabled>Selecciona un proyecto…</option>
                <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
              </select>
            </label>

            <!-- Tipo -->
            <label class="fc-label">Tipo de falla <span class="fc-req">*</span>
              <select v-model="f.tipo_id" class="fc-select">
                <option :value="null">— Escribir tipo manualmente —</option>
                <optgroup v-for="g in tiposAgrupados" :key="g.categoria" :label="g.categoria">
                  <option v-for="t in g.items" :key="t.id" :value="t.id">{{ t.etiqueta }}</option>
                </optgroup>
              </select>
            </label>
            <input v-if="!f.tipo_id" v-model="f.tipo_libre" class="fc-input" :class="{ 'fc-invalid': err.tipo }"
              placeholder="Escribe el tipo de falla…" />

            <!-- Prioridad -->
            <div class="fc-field">
              <span class="fc-label-txt">Prioridad <span class="fc-req">*</span></span>
              <div class="fc-chips">
                <button v-for="p in catalogos.prioridades" :key="p.id" type="button"
                  :class="['fc-chip', f.prioridad_id === p.id && 'fc-chip--on']"
                  :style="f.prioridad_id === p.id ? chipOn(p.color_hex) : {}"
                  @click="f.prioridad_id = p.id">{{ p.etiqueta }}</button>
              </div>
            </div>

            <!-- Estado -->
            <div class="fc-field">
              <span class="fc-label-txt">Estado <span class="fc-req">*</span></span>
              <div class="fc-chips">
                <button v-for="e in catalogos.estados" :key="e.id" type="button"
                  :class="['fc-chip', f.estado_id === e.id && 'fc-chip--on']"
                  :style="f.estado_id === e.id ? chipOn(e.color_hex) : {}"
                  @click="f.estado_id = e.id">{{ e.etiqueta }}</button>
              </div>
            </div>

            <!-- Descripción -->
            <label class="fc-label">Descripción <span class="fc-req">*</span>
              <textarea v-model="f.descripcion" rows="3" class="fc-textarea" :class="{ 'fc-invalid': err.descripcion }"
                placeholder="¿Qué está pasando?"></textarea>
            </label>

            <!-- Fecha -->
            <label class="fc-label">Fecha de identificación <span class="fc-req">*</span>
              <input v-model="f.fecha_identificacion" type="date" class="fc-input" />
            </label>

            <!-- Nota opcional -->
            <label class="fc-label">Nota inicial (opcional)
              <textarea v-model="f.nota" rows="2" class="fc-textarea" placeholder="Detalle / observación…"></textarea>
            </label>

            <div v-if="error" class="fc-error"><i class="pi pi-exclamation-triangle" /> {{ error }}</div>
          </div>

          <button class="fc-submit" :disabled="saving" @click="submit">
            <i v-if="saving" class="pi pi-spin pi-spinner" /><i v-else class="pi pi-check" />
            {{ saving ? 'Registrando…' : 'Registrar falla' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import api from '@/api/client'

const props = defineProps({
  open:            { type: Boolean, default: false },
  catalogos:       { type: Object, default: () => ({ estados: [], prioridades: [], tipos: [] }) },
  proyectos:       { type: Array, default: () => [] },
  prefillProyectoId: { type: [Number, String], default: null },
})
const emit = defineEmits(['close', 'created'])

const f = reactive({
  proyecto_id: null, tipo_id: null, tipo_libre: '',
  prioridad_id: null, estado_id: null, descripcion: '',
  fecha_identificacion: '', nota: '',
})
const err = reactive({})
const error = ref('')
const saving = ref(false)

const tiposAgrupados = computed(() => {
  const groups = {}
  for (const t of props.catalogos.tipos ?? []) {
    const cat = t.categoria?.etiqueta ?? 'General'
    if (!groups[cat]) groups[cat] = { categoria: cat, items: [] }
    groups[cat].items.push(t)
  }
  return Object.values(groups)
})

function chipOn(color) {
  const c = color || '#915BD8'
  return { background: c, borderColor: c, color: '#fff' }
}

// Al abrir, default estado = no final (abierta) y limpia
watch(() => props.open, (o) => {
  if (!o) return
  const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)
  Object.assign(f, { proyecto_id: props.prefillProyectoId ?? null, tipo_id: null, tipo_libre: '', prioridad_id: null,
    estado_id: null, descripcion: '', fecha_identificacion: today, nota: '' })
  Object.keys(err).forEach((k) => delete err[k])
  error.value = ''
  const abierta = (props.catalogos.estados || []).find((e) => e.codigo === 'abierta')
    || (props.catalogos.estados || []).find((e) => !e.es_estado_final)
  if (abierta) f.estado_id = abierta.id
  // prioridad media por defecto si existe
  const media = (props.catalogos.prioridades || []).find((p) => p.codigo === 'media')
  if (media) f.prioridad_id = media.id
})

function validate() {
  Object.keys(err).forEach((k) => delete err[k])
  if (!f.proyecto_id) err.proyecto_id = true
  if (!f.tipo_id && !f.tipo_libre.trim()) err.tipo = true
  if (!f.prioridad_id) err.prioridad = true
  if (!f.estado_id) err.estado = true
  if (!f.descripcion.trim()) err.descripcion = true
  return Object.keys(err).length === 0
}

function close() { emit('close') }

async function submit() {
  error.value = ''
  if (!validate()) { error.value = 'Completa los campos obligatorios (*)'; return }
  saving.value = true
  try {
    const payload = {
      proyecto_id: f.proyecto_id,
      estado_id: f.estado_id,
      prioridad_id: f.prioridad_id,
      descripcion: f.descripcion.trim(),
      fecha_identificacion: f.fecha_identificacion,
      notificacion: false,
    }
    if (f.tipo_id) payload.tipo_id = f.tipo_id
    else if (f.tipo_libre.trim()) payload.tipo_libre = f.tipo_libre.trim()

    const { data: nueva } = await api.post('/fallas', payload)
    if (f.nota.trim()) {
      try { await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: f.nota.trim() }) } catch { /* no crítico */ }
    }
    emit('created', nueva)
    emit('close')
  } catch (e) {
    error.value = e.response?.data?.detail || 'No se pudo registrar la falla'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fc-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(28,18,50,0.45); display: flex; align-items: flex-end; }
.fc-sheet {
  width: 100%; max-height: 92vh; display: flex; flex-direction: column; background: #fff;
  border-radius: 22px 22px 0 0; padding: 10px 18px calc(14px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0,0,0,0.2);
}
.fc-grab { width: 40px; height: 4px; border-radius: 2px; background: #e5e7eb; margin: 4px auto 12px; }
.fc-header { display: flex; align-items: center; margin-bottom: 12px; }
.fc-title { flex: 1; font-size: 16px; font-weight: 700; color: #2C2039; }
.fc-title .pi { color: #915BD8; margin-right: 6px; }
.fc-close { background: none; border: none; color: #9ca3af; font-size: 16px; padding: 4px; }

.fc-body { overflow-y: auto; flex: 1; }
.fc-label { display: block; font-size: 12.5px; font-weight: 600; color: #6b5a8a; margin-bottom: 14px; }
.fc-label-txt { font-size: 12.5px; font-weight: 600; color: #6b5a8a; }
.fc-req { color: #dc2626; }
.fc-field { margin-bottom: 14px; }
.fc-select, .fc-input, .fc-textarea {
  width: 100%; margin-top: 6px; padding: 13px 14px; font-size: 16px;
  border: 1.5px solid #e8e0f0; border-radius: 12px; color: #2C2039; background: #fff;
  font-family: inherit;
}
.fc-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L2 4h8z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
.fc-textarea { resize: none; }
.fc-input:focus, .fc-select:focus, .fc-textarea:focus { outline: none; border-color: #915BD8; }
.fc-invalid { border-color: #dc2626 !important; }

.fc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.fc-chip {
  padding: 9px 14px; border-radius: 11px; border: 1.5px solid #e5e7eb; background: #fff;
  font-size: 14px; font-weight: 600; color: #6b5a8a;
}

.fc-error { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #b91c1c; background: #fef2f2; border-radius: 10px; padding: 10px 12px; margin: 4px 0; }
.fc-submit {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 15px; border: none; border-radius: 14px; font-size: 16px; font-weight: 700;
  color: #fff; background: #915BD8; margin-top: 10px; flex-shrink: 0;
}
.fc-submit:disabled { opacity: .5; }

.fsheet-enter-active, .fsheet-leave-active { transition: opacity .2s ease; }
.fsheet-enter-active .fc-sheet, .fsheet-leave-active .fc-sheet { transition: transform .25s ease; }
.fsheet-enter-from, .fsheet-leave-to { opacity: 0; }
.fsheet-enter-from .fc-sheet, .fsheet-leave-to .fc-sheet { transform: translateY(100%); }
</style>
