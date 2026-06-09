<template>
  <form @submit.prevent="submit" class="ff-form">

    <!-- ── SECCIÓN: Identificación ──────────────────────────── -->
    <div class="ff-section">
      <div class="ff-section-title"><i class="pi pi-tag" /> Identificación</div>
      <div class="ff-grid">

        <!-- Al crear: MultiSelect (varios proyectos → una falla por cada uno) -->
        <div v-if="!initial" class="ff-field ff-span2">
          <label class="ff-label">
            Proyecto(s) *
            <span class="ff-hint">(selecciona varios para crear una falla por cada uno)</span>
          </label>
          <MultiSelect v-model="form.proyecto_ids" :options="proyectos"
            optionLabel="nombre_comercial" optionValue="id"
            placeholder="Seleccionar proyecto(s)" filter class="w-full"
            :class="{ 'p-invalid': errors.proyecto_ids }"
            display="chip" />
          <small v-if="errors.proyecto_ids" class="ff-error">{{ errors.proyecto_ids }}</small>
        </div>
        <!-- Al editar: Select simple -->
        <div v-else class="ff-field ff-span2">
          <label class="ff-label">Proyecto *</label>
          <Select v-model="form.proyecto_id" :options="proyectos"
            optionLabel="nombre_comercial" optionValue="id"
            placeholder="Seleccionar proyecto" filter class="w-full"
            :class="{ 'p-invalid': errors.proyecto_id }" />
          <small v-if="errors.proyecto_id" class="ff-error">{{ errors.proyecto_id }}</small>
        </div>

        <div class="ff-field">
          <label class="ff-label">Tipo de falla *</label>
          <Select v-model="form.tipo_id" :options="tiposAgrupados"
            optionLabel="etiqueta" optionValue="id"
            optionGroupLabel="categoria" optionGroupChildren="items"
            placeholder="Seleccionar tipo" filter filterPlaceholder="Buscar tipo..."
            showClear class="w-full" :class="{ 'p-invalid': errors.tipo_id }"
            @clear="form.tipo_libre = ''" />
          <div v-if="!form.tipo_id" class="mt-1">
            <InputText v-model="form.tipo_libre" placeholder="O escribe el tipo aquí si no está en la lista..."
              class="w-full" style="font-size:12px" />
          </div>
          <small v-if="errors.tipo_id" class="ff-error">{{ errors.tipo_id }}</small>
        </div>

        <div class="ff-field">
          <label class="ff-label">Prioridad *</label>
          <Select v-model="form.prioridad_id" :options="catalogos.prioridades"
            optionLabel="etiqueta" optionValue="id"
            placeholder="Seleccionar prioridad" class="w-full"
            :class="{ 'p-invalid': errors.prioridad_id }" />
          <small v-if="errors.prioridad_id" class="ff-error">{{ errors.prioridad_id }}</small>
        </div>

        <div class="ff-field">
          <label class="ff-label">Estado *</label>
          <Select v-model="form.estado_id" :options="catalogos.estados"
            optionLabel="etiqueta" optionValue="id"
            placeholder="Seleccionar estado" class="w-full"
            :class="{ 'p-invalid': errors.estado_id }" />
          <small v-if="errors.estado_id" class="ff-error">{{ errors.estado_id }}</small>
        </div>

        <div class="ff-field">
          <label class="ff-label">Fecha identificación *</label>
          <DatePicker v-model="form.fecha_identificacion" dateFormat="yy-mm-dd"
            placeholder="AAAA-MM-DD" class="w-full"
            :class="{ 'p-invalid': errors.fecha_identificacion }" />
          <small v-if="errors.fecha_identificacion" class="ff-error">{{ errors.fecha_identificacion }}</small>
        </div>

        <div class="ff-field">
          <label class="ff-label">
            Fecha y hora ocurrencia
            <span class="ff-hint">(si difiere de la identificación)</span>
          </label>
          <DatePicker v-model="form.fecha_ocurrencia" dateFormat="yy-mm-dd"
            showTime hourFormat="24" class="w-full" showIcon />
        </div>

        <!-- Fecha programada — solo visible cuando el estado es "programado" -->
        <div v-if="esEstadoProgramado" class="ff-field ff-highlight">
          <label class="ff-label">
            <i class="pi pi-calendar" style="color:#3B82F6" />
            Fecha programada *
            <span class="ff-hint">(fecha de intervención planificada)</span>
          </label>
          <DatePicker v-model="form.fecha_programada" dateFormat="yy-mm-dd"
            placeholder="AAAA-MM-DD" class="w-full"
            :class="{ 'p-invalid': errors.fecha_programada }" />
          <small v-if="errors.fecha_programada" class="ff-error">{{ errors.fecha_programada }}</small>
        </div>

      </div>
    </div>

    <!-- ── SECCIÓN: Descripción ─────────────────────────────── -->
    <div class="ff-section">
      <div class="ff-section-title"><i class="pi pi-align-left" /> Descripción del evento</div>
      <div class="ff-grid">

        <div class="ff-field ff-span2">
          <label class="ff-label">Descripción *</label>
          <Textarea v-model="form.descripcion" rows="3" autoResize
            placeholder="Describe la falla, síntomas observados, impacto en la operación..."
            class="w-full" :class="{ 'p-invalid': errors.descripcion }" />
          <small v-if="errors.descripcion" class="ff-error">{{ errors.descripcion }}</small>
        </div>

        <div class="ff-field ff-span2">
          <label class="ff-label">
            Equipo afectado
            <span class="ff-hint">(inversor, string, medidor, transformador…)</span>
          </label>
          <InputText v-model="form.equipo_afectado"
            placeholder="Ej: Inversor 3, String 7, Medidor principal"
            class="w-full" />
        </div>


      </div>
    </div>

    <!-- ── SECCIÓN: Análisis ────────────────────────────────── -->
    <div class="ff-section">
      <div class="ff-section-title"><i class="pi pi-search" /> Análisis</div>
      <div class="ff-grid">

        <div class="ff-field ff-span2">
          <label class="ff-label">Causa raíz</label>
          <Textarea v-model="form.causa_raiz" rows="2" autoResize
            placeholder="Descripción de la causa raíz identificada..."
            class="w-full" />
        </div>

        <div class="ff-field ff-span2">
          <label class="ff-label">Acciones correctivas</label>
          <Textarea v-model="form.acciones_correctivas" rows="2" autoResize
            placeholder="Acciones correctivas tomadas o planeadas..."
            class="w-full" />
        </div>

      </div>
    </div>

    <!-- ── SECCIÓN: Resolución (solo al editar) ─────────────── -->
    <div v-if="initial" class="ff-section ff-section--resolve">
      <div class="ff-section-title"><i class="pi pi-check-circle" style="color:#16a34a" /> Resolución</div>
      <div class="ff-grid">

        <div class="ff-field">
          <label class="ff-label">Fecha de solución</label>
          <DatePicker v-model="form.fecha_resolucion" dateFormat="yy-mm-dd"
            placeholder="AAAA-MM-DD HH:mm" class="w-full" showButtonBar showIcon
            showTime hourFormat="24" />
        </div>

        <div class="ff-field">
          <label class="ff-label">Tipo de solución</label>
          <Select v-model="form.tipo_solucion" :options="TIPOS_SOLUCION"
            placeholder="Seleccionar tipo" showClear class="w-full" />
        </div>

      </div>
    </div>

    <!-- ── SECCIÓN: Nota inicial (solo al crear) ────────────── -->
    <div v-if="!initial" class="ff-section">
      <div class="ff-section-title"><i class="pi pi-comment" /> Nota inicial</div>
      <div class="ff-grid">
        <div class="ff-field ff-span2">
          <label class="ff-label">
            Nota
            <span class="ff-hint">(crea el primer seguimiento automáticamente)</span>
          </label>
          <Textarea v-model="form.nota_inicial" rows="2" autoResize
            placeholder="Ej: Se identificó durante monitoreo remoto..."
            class="w-full" />
        </div>
      </div>
    </div>

    <!-- ── SECCIÓN: Archivos adjuntos ─────── -->
    <div class="ff-section">
      <div class="ff-section-title"><i class="pi pi-paperclip" /> Archivos adjuntos</div>
      <!-- Dropzone -->
      <div class="ff-dropzone"
        :class="{ 'ff-dropzone--over': dropOver }"
        @dragover.prevent="dropOver = true"
        @dragleave.prevent="dropOver = false"
        @drop.prevent="onDrop"
        @click="fileInputRef.click()">
        <i class="pi pi-upload" style="font-size:18px;color:#9b89b5" />
        <span class="ff-dropzone-text">Arrastra archivos aquí o <span class="ff-dropzone-link">haz clic</span></span>
        <span class="ff-dropzone-hint">Imágenes, PDF, Excel, Word, CSV</span>
        <input ref="fileInputRef" type="file" class="ff-hidden-input"
          accept="*" multiple
          @change="onFileInputChange" />
      </div>
      <!-- Lista de archivos staged -->
      <div v-if="archivosStaged.length" class="ff-staged-list">
        <div v-for="(f, i) in archivosStaged" :key="i" class="ff-staged-row">
          <i :class="iconoArchivo(f)" style="font-size:13px;color:#7c3aed" />
          <span class="ff-staged-name">{{ f.name }}</span>
          <span class="ff-staged-size">{{ formatSize(f.size) }}</span>
          <button type="button" class="ff-staged-remove" @click="archivosStaged.splice(i, 1)">
            <i class="pi pi-times" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Notificación por correo ── -->
    <div class="ff-notif-wrap">
      <label class="ff-notif-label">
        <input type="checkbox" v-model="form.notificacion" class="ff-notif-check" />
        <i class="pi pi-send" style="color:#915BD8;font-size:13px" />
        <span>Enviar notificación por correo a los correos operacionales del cliente</span>
      </label>
      <span v-if="form.notificacion" class="ff-notif-hint">
        Se enviará un correo a los destinatarios configurados en Clientes → Correos Operacionales.
      </span>
    </div>

    <div class="ff-footer">
      <Button label="Cancelar" severity="secondary" type="button" @click="$emit('cancel')" />
      <Button :label="initial ? 'Guardar cambios' : 'Registrar falla'"
        type="submit" :loading="saving" icon="pi pi-check" />
    </div>
  </form>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import api from '@/api/client'

const TIPOS_SOLUCION = [
  'Reemplazo de componente',
  'Reparación mecánica',
  'Reparación eléctrica',
  'Actualización de firmware',
  'Limpieza y mantenimiento',
  'Reconexión / rearme',
  'Configuración / calibración',
  'Gestión con OR / proveedor',
  'Solución remota',
  'Otro',
]

const props = defineProps({
  initial:            { type: Object, default: null },
  catalogos:          { type: Object, required: true },
  prefillProyectoIds: { type: Array,  default: () => [] },  // pre-seleccionar proyectos al crear
})
const emit = defineEmits(['save', 'cancel'])

const proyectos      = ref([])
const saving         = ref(false)
const errors         = ref({})
const archivosStaged = ref([])  // File[] — solo al crear
const dropOver       = ref(false)
const fileInputRef   = ref(null)

function iconoArchivo(file) {
  const name = file.name || ''
  if (/\.(pdf)$/i.test(name)) return 'pi pi-file-pdf'
  if (/\.(xls|xlsx|csv)$/i.test(name)) return 'pi pi-file-excel'
  if (/\.(doc|docx)$/i.test(name)) return 'pi pi-file-word'
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)) return 'pi pi-image'
  return 'pi pi-file'
}
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function addFiles(files) {
  for (const f of Array.from(files)) {
    if (!archivosStaged.value.find(x => x.name === f.name && x.size === f.size)) {
      archivosStaged.value.push(f)
    }
  }
}
function onDrop(e) {
  dropOver.value = false
  addFiles(e.dataTransfer.files)
}
function onFileInputChange(e) {
  addFiles(e.target.files)
  e.target.value = ''
}

const form = ref({
  proyecto_id:          props.initial?.proyecto?.id ?? props.initial?.proyecto_id ?? null,
  proyecto_ids:         [...(props.prefillProyectoIds ?? [])],  // pre-seleccionados al crear
  tipo_id:              props.initial?.tipo?.id ?? null,
  tipo_libre:           props.initial?.tipo_libre ?? '',
  estado_id:            props.initial?.estado?.id ?? null,
  prioridad_id:         props.initial?.prioridad?.id ?? null,
  descripcion:          props.initial?.descripcion ?? '',
  fecha_identificacion: props.initial?.fecha_identificacion ? new Date(props.initial.fecha_identificacion) : null,
  fecha_ocurrencia:     props.initial?.fecha_ocurrencia ? new Date(props.initial.fecha_ocurrencia) : null,
  fecha_resolucion:     props.initial?.fecha_resolucion ? new Date(props.initial.fecha_resolucion.slice(0, 10)) : null,
  tipo_solucion:        props.initial?.tipo_solucion ?? null,
  sla_limite_horas:     props.initial?.sla_limite_horas ?? null,
  causa_raiz:           props.initial?.causa_raiz ?? '',
  acciones_correctivas: props.initial?.acciones_correctivas ?? '',
  equipo_afectado:      props.initial?.equipo_afectado ?? '',
  energia_perdida_kwh:  props.initial?.energia_perdida_kwh ?? null,
  nota_inicial:         '',
  fecha_programada:     props.initial?.fecha_programada ? new Date(props.initial.fecha_programada) : null,
  notificacion:         false,   // siempre OFF por defecto — el usuario lo activa explícitamente
})

// Detectar si el estado seleccionado es "programado"
const esEstadoProgramado = computed(() => {
  if (!form.value.estado_id) return false
  const estado = props.catalogos.estados?.find(e => e.id === form.value.estado_id)
  return estado?.codigo === 'programado'
})

// Auto-populate description when tipo changes (only if description is empty or matches a previous auto-fill)
let lastAutoDesc = ''
watch(() => form.value.tipo_id, (newId) => {
  if (!newId) return
  const allTipos = props.catalogos.tipos ?? []
  const tipo = allTipos.find(t => t.id === newId)
  if (!tipo?.descripcion) return
  // Only auto-fill if description is empty or was previously auto-filled
  const current = form.value.descripcion?.trim() ?? ''
  if (!current || current === lastAutoDesc) {
    form.value.descripcion = tipo.descripcion
    lastAutoDesc = tipo.descripcion
  }
})

const tiposAgrupados = computed(() => {
  const groups = {}
  for (const t of props.catalogos.tipos ?? []) {
    const cat = t.categoria?.etiqueta ?? 'General'
    if (!groups[cat]) groups[cat] = { categoria: cat, items: [] }
    groups[cat].items.push(t)
  }
  return Object.values(groups)
})

function validate() {
  const e = {}
  if (props.initial) {
    if (!form.value.proyecto_id) e.proyecto_id = 'Requerido'
  } else {
    if (!form.value.proyecto_ids?.length) e.proyecto_ids = 'Selecciona al menos un proyecto'
  }
  if (!form.value.tipo_id && !form.value.tipo_libre?.trim()) e.tipo_id = 'Requerido'
  if (!form.value.estado_id)            e.estado_id = 'Requerido'
  if (!form.value.prioridad_id)         e.prioridad_id = 'Requerido'
  if (!form.value.descripcion?.trim())  e.descripcion = 'Requerido'
  if (!form.value.fecha_identificacion) e.fecha_identificacion = 'Requerido'
  if (esEstadoProgramado.value && !form.value.fecha_programada) e.fecha_programada = 'Requerido cuando el estado es Programado'
  errors.value = e
  return Object.keys(e).length === 0
}

function formatDate(d) {
  if (!d) return null
  if (typeof d === 'string') return d
  return d.toISOString().split('T')[0]
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const base = {
      tipo_id:              form.value.tipo_id,
      estado_id:            form.value.estado_id,
      prioridad_id:         form.value.prioridad_id,
      descripcion:          form.value.descripcion,
      fecha_identificacion: formatDate(form.value.fecha_identificacion),
    }
    if (form.value.tipo_libre?.trim())             base.tipo_libre           = form.value.tipo_libre.trim()
    if (form.value.sla_limite_horas)              base.sla_limite_horas     = form.value.sla_limite_horas
    if (form.value.fecha_ocurrencia)              base.fecha_ocurrencia     = form.value.fecha_ocurrencia.toISOString()
    if (form.value.fecha_resolucion)              base.fecha_resolucion     = form.value.fecha_resolucion instanceof Date ? form.value.fecha_resolucion.toISOString() : form.value.fecha_resolucion
    if (form.value.tipo_solucion)                 base.tipo_solucion        = form.value.tipo_solucion
    if (form.value.causa_raiz?.trim())            base.causa_raiz           = form.value.causa_raiz.trim()
    if (form.value.acciones_correctivas?.trim())  base.acciones_correctivas = form.value.acciones_correctivas.trim()
    if (form.value.equipo_afectado?.trim())       base.equipo_afectado      = form.value.equipo_afectado.trim()
    if (form.value.energia_perdida_kwh != null)   base.energia_perdida_kwh  = form.value.energia_perdida_kwh
    if (form.value.nota_inicial?.trim())          base.nota_inicial         = form.value.nota_inicial.trim()
    if (form.value.fecha_programada)             base.fecha_programada     = formatDate(form.value.fecha_programada)
    base.notificacion = !!form.value.notificacion

    if (props.initial) {
      emit('save', { ...base, proyecto_id: form.value.proyecto_id, _archivos: archivosStaged.value })
    } else {
      emit('save', { ...base, proyecto_ids: form.value.proyecto_ids, _archivos: archivosStaged.value })
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = data.items ?? []
  } catch { /* no crítico */ }
})
</script>

<style scoped>
.ff-form {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: 'Sora', system-ui, sans-serif;
}

.ff-section {
  padding: 14px 0 10px;
  border-bottom: 1px solid #f0eaf8;
}
.ff-section:last-of-type { border-bottom: none; }

.ff-section--resolve {
  background: #f0fdf4;
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid #bbf7d0;
  margin-bottom: 4px;
}

.ff-section-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #6b5a8a;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.ff-section-title i { font-size: 11px; }

.ff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
}

.ff-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ff-span2 { grid-column: span 2; }

.ff-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #4a3b6b;
}
.ff-hint {
  font-weight: 400;
  color: #9b89b5;
  margin-left: 4px;
}
.ff-error {
  color: #dc2626;
  font-size: 11px;
}
.ff-highlight {
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: 8px;
  padding: 10px 12px;
}

/* ── Dropzone ── */
.ff-dropzone {
  border: 1.5px dashed #c4b5e0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  background: #faf8ff;
}
.ff-dropzone:hover, .ff-dropzone--over {
  border-color: #7c3aed;
  background: #f5f0ff;
}
.ff-dropzone-text { font-size: 12px; color: #4a3b6b; }
.ff-dropzone-link { color: #7c3aed; font-weight: 600; }
.ff-dropzone-hint { font-size: 10.5px; color: #9b89b5; }
.ff-hidden-input  { display: none; }

/* ── Staged files ── */
.ff-staged-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ff-staged-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  background: #f5f0ff;
  border-radius: 6px;
  font-size: 11.5px;
}
.ff-staged-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #3b1f6b;
}
.ff-staged-size { color: #9b89b5; white-space: nowrap; }
.ff-staged-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #dc2626;
  padding: 0 2px;
  font-size: 10px;
  opacity: .7;
}
.ff-staged-remove:hover { opacity: 1; }

.ff-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0eaf8;
  margin-top: 4px;
}

/* ── Notificación por correo ── */
.ff-notif-wrap {
  display: flex; flex-direction: column; gap: 4px;
  background: #faf8ff; border: 1.5px solid #e8e0f0; border-radius: 10px;
  padding: 10px 14px;
}
.ff-notif-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 600; color: #2C2039; cursor: pointer;
}
.ff-notif-check {
  width: 16px; height: 16px; accent-color: #915BD8; cursor: pointer; flex-shrink: 0;
}
.ff-notif-hint {
  font-size: 11px; color: #915BD8; margin-left: 24px; line-height: 1.4;
}
</style>
