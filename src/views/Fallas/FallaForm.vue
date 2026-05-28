<template>
  <form @submit.prevent="submit" class="ff-form">

    <!-- ── SECCIÓN: Identificación ──────────────────────────── -->
    <div class="ff-section">
      <div class="ff-section-title"><i class="pi pi-tag" /> Identificación</div>
      <div class="ff-grid">

        <div class="ff-field ff-span2">
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
            placeholder="Seleccionar tipo" class="w-full"
            :class="{ 'p-invalid': errors.tipo_id }" />
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

        <div class="ff-field">
          <label class="ff-label">SLA límite (horas)</label>
          <InputNumber v-model="form.sla_limite_horas" placeholder="Ej: 24"
            class="w-full" :min="1" />
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

        <div class="ff-field">
          <label class="ff-label">Energía perdida (kWh)</label>
          <InputNumber v-model="form.energia_perdida_kwh" placeholder="Ej: 150.5"
            class="w-full" :min="0" :maxFractionDigits="2" />
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
            placeholder="AAAA-MM-DD" class="w-full" showButtonBar showIcon />
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

    <div class="ff-footer">
      <Button label="Cancelar" severity="secondary" type="button" @click="$emit('cancel')" />
      <Button :label="initial ? 'Guardar cambios' : 'Registrar falla'"
        type="submit" :loading="saving" icon="pi pi-check" />
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Select from 'primevue/select'
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
  initial: { type: Object, default: null },
  catalogos: { type: Object, required: true },
})
const emit = defineEmits(['save', 'cancel'])

const proyectos = ref([])
const saving    = ref(false)
const errors    = ref({})

const form = ref({
  proyecto_id:          props.initial?.proyecto?.id ?? props.initial?.proyecto_id ?? null,
  tipo_id:              props.initial?.tipo?.id ?? null,
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
  if (!form.value.proyecto_id)          e.proyecto_id = 'Requerido'
  if (!form.value.tipo_id)              e.tipo_id = 'Requerido'
  if (!form.value.estado_id)            e.estado_id = 'Requerido'
  if (!form.value.prioridad_id)         e.prioridad_id = 'Requerido'
  if (!form.value.descripcion?.trim())  e.descripcion = 'Requerido'
  if (!form.value.fecha_identificacion) e.fecha_identificacion = 'Requerido'
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
    const payload = {
      proyecto_id:          form.value.proyecto_id,
      tipo_id:              form.value.tipo_id,
      estado_id:            form.value.estado_id,
      prioridad_id:         form.value.prioridad_id,
      descripcion:          form.value.descripcion,
      fecha_identificacion: formatDate(form.value.fecha_identificacion),
    }
    if (form.value.sla_limite_horas)              payload.sla_limite_horas     = form.value.sla_limite_horas
    if (form.value.fecha_ocurrencia)              payload.fecha_ocurrencia     = form.value.fecha_ocurrencia.toISOString()
    if (form.value.fecha_resolucion)              payload.fecha_resolucion     = formatDate(form.value.fecha_resolucion)
    if (form.value.tipo_solucion)                 payload.tipo_solucion        = form.value.tipo_solucion
    if (form.value.causa_raiz?.trim())            payload.causa_raiz           = form.value.causa_raiz.trim()
    if (form.value.acciones_correctivas?.trim())  payload.acciones_correctivas = form.value.acciones_correctivas.trim()
    if (form.value.equipo_afectado?.trim())       payload.equipo_afectado      = form.value.equipo_afectado.trim()
    if (form.value.energia_perdida_kwh != null)   payload.energia_perdida_kwh  = form.value.energia_perdida_kwh
    if (form.value.nota_inicial?.trim())          payload.nota_inicial         = form.value.nota_inicial.trim()
    emit('save', payload)
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

.ff-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0eaf8;
  margin-top: 4px;
}
</style>
