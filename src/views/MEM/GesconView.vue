<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold" style="color: #2C2039;">GESCON — Contratos ASIC</h2>
      <div class="flex items-center gap-3">
        <span class="text-sm" style="color: #9b89b5;">{{ total }} registros</span>
        <Button label="Registrar" icon="pi pi-plus" @click="abrirNuevo"
          style="background:#915BD8; border-color:#915BD8;" size="small" />
      </div>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center"
      style="border: 1px solid #e8e0f0;">
      <IconField class="flex-1 min-w-[200px]">
        <InputIcon class="pi pi-search" />
        <InputText v-model="filtroTexto" placeholder="Buscar SIC, contrato, planta…" class="w-full" />
      </IconField>

      <SelectButton v-model="filtroEstado" :options="opcionesEstado" optionLabel="label" optionValue="value"
        :pt="{ button: { style: 'font-size:12px; padding:6px 14px;' } }" />

      <Select v-model="filtroTipo" :options="opcionesTipo" optionLabel="label" optionValue="value"
        placeholder="Tipo" showClear class="min-w-[160px]" />

      <Button v-if="filtroTexto || filtroTipo" label="Limpiar" icon="pi pi-times"
        severity="secondary" size="small" @click="limpiar" />
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl overflow-hidden shadow-sm" style="border: 1px solid #e8e0f0;">
      <DataTable :value="rowsMostrar" :loading="loading" class="text-sm" rowHover
        :rows="50" paginator :rowsPerPageOptions="[25, 50, 100]">
        <template #empty>
          <div class="py-12 text-center text-sm" style="color: #9b89b5;">
            No hay contratos con los filtros actuales.
          </div>
        </template>

        <Column field="codigo_sic_contrato" header="SIC" sortable style="width:100px;">
          <template #body="{ data }">
            <span class="font-mono text-xs" style="color:#5b3fa6;">{{ data.codigo_sic_contrato || '—' }}</span>
          </template>
        </Column>

        <Column field="contrato_interno" header="Contrato" sortable style="min-width:160px;">
          <template #body="{ data }">
            <span class="font-medium text-xs" style="color:#2C2039;">{{ data.contrato_interno || '—' }}</span>
          </template>
        </Column>

        <Column field="nombre_interno" header="Nombre interno" style="min-width:140px;">
          <template #body="{ data }">
            <span class="text-xs" style="color:#6b5a8a;">{{ data.nombre_interno || '—' }}</span>
          </template>
        </Column>

        <Column header="Planta" style="min-width:160px;">
          <template #body="{ data }">
            <span class="text-xs font-medium" style="color:#2C2039;">{{ data.planta_nombre || '—' }}</span>
          </template>
        </Column>

        <Column field="tipo_solicitud" header="Tipo" sortable style="width:130px;">
          <template #body="{ data }">
            <Tag :value="tipoLabel(data.tipo_solicitud)" :severity="tipoSeverity(data.tipo_solicitud)" class="text-xs" />
          </template>
        </Column>

        <Column field="requerimiento_asic" header="Req." style="width:115px;">
          <template #body="{ data }">
            <span class="font-mono text-xs" style="color:#6b5a8a;">{{ data.requerimiento_asic || '—' }}</span>
          </template>
        </Column>

        <Column field="fecha_inicio" header="Inicio" sortable style="width:95px;">
          <template #body="{ data }">
            <span class="text-xs" style="color:#6b5a8a;">{{ fmt(data.fecha_inicio) }}</span>
          </template>
        </Column>

        <Column field="fecha_fin" header="Fin" sortable style="width:95px;">
          <template #body="{ data }">
            <span class="text-xs" :style="{ color: esVencido(data.fecha_fin) ? '#ef4444' : '#6b5a8a' }">
              {{ fmt(data.fecha_fin) }}
            </span>
          </template>
        </Column>

        <Column field="estado_solicitud" header="Estado" sortable style="width:110px;">
          <template #body="{ data }">
            <Tag :value="estadoLabel(data.estado_solicitud)" :severity="estadoSeverity(data.estado_solicitud)" class="text-xs" />
          </template>
        </Column>

        <Column field="porcentaje_despacho" header="Desp." style="width:68px;">
          <template #body="{ data }">
            <span class="text-xs" style="color:#6b5a8a;">
              {{ data.porcentaje_despacho != null ? data.porcentaje_despacho + '%' : '—' }}
            </span>
          </template>
        </Column>

        <Column header="" style="width:72px;">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <button @click="abrirEditar(data)" class="p-1 rounded hover:bg-purple-50 transition-colors"
                title="Editar" style="color: #915BD8;">
                <i class="pi pi-pencil text-xs" />
              </button>
              <a v-if="data.link_archivo" :href="data.link_archivo" target="_blank"
                class="p-1 rounded hover:bg-purple-50 transition-colors text-purple-500 hover:text-purple-700">
                <i class="pi pi-external-link text-xs" />
              </a>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ── Dialog Registro ─────────────────────────────────────── -->
    <Dialog v-model:visible="dialogVisible" :header="editandoId ? 'Editar contrato ASIC' : 'Registrar contrato ASIC'" modal
      :style="{ width: '700px' }" :breakpoints="{ '768px': '95vw' }">
      <form @submit.prevent="guardar" class="space-y-5 pt-1">

        <!-- Fila 1: Tipo + Estado -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Tipo solicitud *</label>
            <Select v-model="form.tipo_solicitud" :options="opcionesTipo"
              optionLabel="label" optionValue="value" placeholder="Seleccionar" class="w-full"
              :class="{ 'p-invalid': errores.tipo_solicitud }" />
            <small v-if="errores.tipo_solicitud" class="text-red-500 text-xs">{{ errores.tipo_solicitud }}</small>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Estado *</label>
            <Select v-model="form.estado_solicitud" :options="opcionesEstadoForm"
              optionLabel="label" optionValue="value" placeholder="Seleccionar" class="w-full"
              :class="{ 'p-invalid': errores.estado_solicitud }" />
            <small v-if="errores.estado_solicitud" class="text-red-500 text-xs">{{ errores.estado_solicitud }}</small>
          </div>
        </div>

        <!-- Fila 2: SIC Contrato + Contrato interno + Nombre interno -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Código SIC contrato</label>
            <InputText v-model="form.codigo_sic_contrato" placeholder="88806" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Contrato interno</label>
            <InputText v-model="form.contrato_interno" placeholder="UNERGY 001-2024" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Nombre interno</label>
            <InputText v-model="form.nombre_interno" placeholder="Terpel 1" class="w-full" />
          </div>
        </div>

        <!-- Fila 3: Vendedor + Comprador + P.S -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">SIC Vendedor</label>
            <InputText v-model="form.codigo_sic_vendedor" placeholder="UNGG" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">SIC Comprador</label>
            <InputText v-model="form.codigo_sic_comprador" placeholder="BIAC" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Prioridad (P.S)</label>
            <InputNumber v-model="form.prioridad_limitacion" :min="0" :max="999"
              placeholder="83" class="w-full" inputClass="w-full" />
          </div>
        </div>

        <!-- Fila 4: Proyecto -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium" style="color:#6b5a8a;">Planta / Proyecto</label>
          <Select v-model="form.proyecto_id" :options="proyectos"
            optionLabel="nombre_comercial" optionValue="id"
            placeholder="Seleccionar proyecto (opcional)" filter showClear class="w-full" />
        </div>

        <!-- Fila 5: Fechas -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Fecha solicitud</label>
            <DatePicker v-model="form.fecha_solicitud" dateFormat="dd/mm/yy"
              placeholder="dd/mm/aa" showIcon class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Fecha inicio</label>
            <DatePicker v-model="form.fecha_inicio" dateFormat="dd/mm/yy"
              placeholder="dd/mm/aa" showIcon class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Fecha fin</label>
            <DatePicker v-model="form.fecha_fin" dateFormat="dd/mm/yy"
              placeholder="dd/mm/aa" showIcon class="w-full" />
          </div>
        </div>

        <!-- Fila 6: Tipo mercado + Tipo asignación + % FNCER + % Despacho -->
        <div class="grid grid-cols-4 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Tipo mercado</label>
            <InputText v-model="form.tipo_mercado" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Tipo asignación</label>
            <InputText v-model="form.tipo_asignacion" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">% FNCER</label>
            <InputNumber v-model="form.porcentaje_fncer" :min="0" :max="100"
              :minFractionDigits="0" :maxFractionDigits="2" suffix="%" class="w-full" inputClass="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">% Despacho</label>
            <InputNumber v-model="form.porcentaje_despacho" :min="0" :max="100"
              :minFractionDigits="0" :maxFractionDigits="2" suffix="%" class="w-full" inputClass="w-full" />
          </div>
        </div>

        <!-- Fila 7: Requerimiento + Contacto -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">N° Requerimiento ASIC</label>
            <InputText v-model="form.requerimiento_asic" placeholder="20260419002" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Nombre contacto solicitante</label>
            <InputText v-model="form.nombre_contacto_solicitante" class="w-full" />
          </div>
        </div>

        <!-- Fila 8: Link archivo -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium" style="color:#6b5a8a;">Link archivo</label>
          <InputText v-model="form.link_archivo" placeholder="https://..." class="w-full" />
        </div>

        <!-- Observaciones -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium" style="color:#6b5a8a;">Observaciones</label>
          <Textarea v-model="form.observaciones" rows="2" class="w-full" autoResize />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" @click="dialogVisible = false" type="button" />
          <Button :label="editandoId ? 'Actualizar' : 'Guardar'" icon="pi pi-check" type="submit" :loading="guardando"
            style="background:#915BD8; border-color:#915BD8;" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '@/api/client.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

// ── Tabla ─────────────────────────────────────────────────────────
const loading = ref(false)
const rows = ref([])
const rowsMostrar = ref([])
const total = ref(0)
const filtroTexto = ref('')
const filtroEstado = ref('vigentes')
const filtroTipo = ref(null)
const hoy = new Date().toISOString().slice(0, 10)

const opcionesEstado = [
  { label: 'Vigentes', value: 'vigentes' },
  { label: 'Todos', value: 'todos' },
]
const opcionesTipo = [
  { label: 'Registro', value: 'registro' },
  { label: 'Modificación', value: 'modificacion' },
  { label: 'Terminación', value: 'terminacion' },
  { label: 'Desistimiento', value: 'desistimiento' },
]

function filtrar() {
  let r = rows.value.slice()
  if (filtroEstado.value === 'vigentes')
    r = r.filter(x => x.fecha_fin && x.fecha_fin >= hoy)
  if (filtroTipo.value)
    r = r.filter(x => x.tipo_solicitud === filtroTipo.value)
  const q = filtroTexto.value.trim().toLowerCase()
  if (q) r = r.filter(x =>
    (x.codigo_sic_contrato || '').toLowerCase().includes(q) ||
    (x.contrato_interno || '').toLowerCase().includes(q) ||
    (x.nombre_interno || '').toLowerCase().includes(q) ||
    (x.planta_nombre || '').toLowerCase().includes(q) ||
    (x.requerimiento_asic || '').toLowerCase().includes(q)
  )
  rowsMostrar.value = r
  total.value = r.length
}
watch([rows, filtroEstado, filtroTipo, filtroTexto], filtrar)

async function cargar() {
  loading.value = true
  try {
    const { data } = await api.get('/asic')
    rows.value = data
  } finally {
    loading.value = false
  }
}
function limpiar() { filtroTexto.value = ''; filtroTipo.value = null }

// ── Proyectos ─────────────────────────────────────────────────────
const proyectos = ref([])
async function cargarProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 300 } })
    proyectos.value = (data.items ?? data).sort((a, b) =>
      a.nombre_comercial.localeCompare(b.nombre_comercial))
  } catch { /* silencioso */ }
}

// ── Formulario ────────────────────────────────────────────────────
const dialogVisible = ref(false)
const guardando = ref(false)
const errores = ref({})
const editandoId = ref(null)

const FORM_INICIAL = () => ({
  tipo_solicitud: null,
  estado_solicitud: 'en_proceso',
  codigo_sic_contrato: '',
  contrato_interno: '',
  nombre_interno: '',
  codigo_sic_vendedor: 'UNGG',
  codigo_sic_comprador: '',
  prioridad_limitacion: null,
  proyecto_id: null,
  fecha_solicitud: null,
  fecha_inicio: null,
  fecha_fin: null,
  tipo_mercado: 'No regulado',
  tipo_asignacion: '',
  porcentaje_fncer: 100,
  porcentaje_despacho: null,
  requerimiento_asic: '',
  nombre_contacto_solicitante: '',
  link_archivo: '',
  observaciones: '',
})
const form = ref(FORM_INICIAL())

const opcionesEstadoForm = [
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Publicado', value: 'publicado' },
  { label: 'Rechazado', value: 'rechazado' },
  { label: 'Desistido', value: 'desistido' },
]

function abrirNuevo() {
  editandoId.value = null
  form.value = FORM_INICIAL()
  errores.value = {}
  dialogVisible.value = true
}

function parseDateField(v) {
  if (!v) return null
  return new Date(v + 'T12:00:00')
}

function abrirEditar(row) {
  editandoId.value = row.id
  form.value = {
    tipo_solicitud: row.tipo_solicitud,
    estado_solicitud: row.estado_solicitud,
    codigo_sic_contrato: row.codigo_sic_contrato || '',
    contrato_interno: row.contrato_interno || '',
    nombre_interno: row.nombre_interno || '',
    codigo_sic_vendedor: row.codigo_sic_vendedor || '',
    codigo_sic_comprador: row.codigo_sic_comprador || '',
    prioridad_limitacion: row.prioridad_limitacion,
    proyecto_id: row.proyecto_id,
    fecha_solicitud: parseDateField(row.fecha_solicitud),
    fecha_inicio: parseDateField(row.fecha_inicio),
    fecha_fin: parseDateField(row.fecha_fin),
    tipo_mercado: row.tipo_mercado || '',
    tipo_asignacion: row.tipo_asignacion || '',
    porcentaje_fncer: row.porcentaje_fncer,
    porcentaje_despacho: row.porcentaje_despacho,
    requerimiento_asic: row.requerimiento_asic || '',
    nombre_contacto_solicitante: row.nombre_contacto_solicitante || '',
    link_archivo: row.link_archivo || '',
    observaciones: row.observaciones || '',
  }
  errores.value = {}
  dialogVisible.value = true
}

function toIso(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return null
}

async function guardar() {
  errores.value = {}
  if (!form.value.tipo_solicitud) { errores.value.tipo_solicitud = 'Requerido'; return }
  if (!form.value.estado_solicitud) { errores.value.estado_solicitud = 'Requerido'; return }

  guardando.value = true
  try {
    const payload = {
      ...form.value,
      codigo_sic_contrato: form.value.codigo_sic_contrato || null,
      codigo_sic_vendedor: form.value.codigo_sic_vendedor || null,
      codigo_sic_comprador: form.value.codigo_sic_comprador || null,
      contrato_interno: form.value.contrato_interno || null,
      nombre_interno: form.value.nombre_interno || null,
      requerimiento_asic: form.value.requerimiento_asic || null,
      nombre_contacto_solicitante: form.value.nombre_contacto_solicitante || null,
      tipo_asignacion: form.value.tipo_asignacion || null,
      link_archivo: form.value.link_archivo || null,
      observaciones: form.value.observaciones || null,
      fecha_solicitud: toIso(form.value.fecha_solicitud),
      fecha_inicio: toIso(form.value.fecha_inicio),
      fecha_fin: toIso(form.value.fecha_fin),
    }

    if (editandoId.value) {
      const { data } = await api.patch(`/asic/${editandoId.value}`, payload)
      const idx = rows.value.findIndex(r => r.id === editandoId.value)
      if (idx !== -1) rows.value.splice(idx, 1, data)
      else rows.value = [data, ...rows.value]
      rows.value = [...rows.value]
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Contrato ASIC actualizado', life: 3000 })
    } else {
      const { data } = await api.post('/asic', payload)
      rows.value = [data, ...rows.value]
      toast.add({ severity: 'success', summary: 'Guardado', detail: 'Contrato ASIC registrado', life: 3000 })
    }
    dialogVisible.value = false
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'Error al guardar', life: 4000 })
  } finally {
    guardando.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}
function esVencido(d) { return d && d < hoy }

const TIPO_LABELS = { registro: 'Registro', modificacion: 'Modificación', terminacion: 'Terminación', desistimiento: 'Desistimiento' }
const TIPO_SEV = { registro: 'success', modificacion: 'info', terminacion: 'warn', desistimiento: 'secondary' }
function tipoLabel(v) { return TIPO_LABELS[v] || v }
function tipoSeverity(v) { return TIPO_SEV[v] || 'secondary' }

const ESTADO_LABELS = { publicado: 'Publicado', en_proceso: 'En proceso', rechazado: 'Rechazado', desistido: 'Desistido' }
const ESTADO_SEV = { publicado: 'success', en_proceso: 'info', rechazado: 'danger', desistido: 'secondary' }
function estadoLabel(v) { return ESTADO_LABELS[v] || v }
function estadoSeverity(v) { return ESTADO_SEV[v] || 'secondary' }

onMounted(() => { cargar(); cargarProyectos() })
</script>
