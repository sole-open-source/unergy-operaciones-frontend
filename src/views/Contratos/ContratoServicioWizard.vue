<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal
    :style="{ width: '800px' }" :breakpoints="{ '860px': '95vw' }"
    :header="null" :closable="true" @hide="$emit('cerrar')">

    <!-- Step indicator -->
    <div class="px-6 pt-5 pb-4 border-b border-gray-100">
      <p class="text-sm font-bold mb-4" :style="`color:${tipoColor}`">
        Nuevo contrato · {{ tipoLabel }}
      </p>
      <div class="flex items-start">
        <template v-for="(s, i) in STEPS" :key="i">
          <div class="flex flex-col items-center gap-1.5" style="flex:1">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              :style="step >= i ? `background:${tipoColor}; color:white` : 'background:#f3f4f6; color:#9ca3af'">
              <i v-if="step > i" class="pi pi-check text-xs" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="text-[10px] text-center leading-tight px-0.5 font-medium"
              :style="step === i ? `color:${tipoColor}` : ''"
              :class="step < i ? 'text-gray-300' : step > i ? 'text-gray-500' : ''">
              {{ s.label }}
            </span>
          </div>
          <div v-if="i < STEPS.length - 1" class="h-0.5 mt-3.5 mx-0.5 transition-all" style="flex:1"
            :style="step > i ? `background:${tipoColor}60` : 'background:#f3f4f6'" />
        </template>
      </div>
    </div>

    <!-- Content -->
    <div class="px-6 py-5 min-h-72">

      <!-- PASO 0: Identificación -->
      <template v-if="step === 0">
        <p class="step-title">Identificación del contrato</p>
        <div class="space-y-4">
          <div class="flex flex-col gap-1">
            <label class="field-label">Proyecto asociado <span class="text-gray-400">(opcional)</span></label>
            <Select
              v-model="form.proyecto_id"
              :options="todosProyectos"
              optionLabel="nombre_comercial"
              optionValue="id"
              placeholder="Seleccionar proyecto"
              filter
              filterPlaceholder="Buscar…"
              showClear
              class="w-full"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="field-label">Número de contrato</label>
              <InputText v-model="form.numero_contrato" placeholder="Ej: REP-001-2024" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Estado</label>
              <Select v-model="form.estado" :options="ESTADOS" optionLabel="label" optionValue="value" class="w-full" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="field-label">Fecha firma <span class="text-gray-400">(opcional)</span></label>
              <DatePicker v-model="form.fecha_firma_contrato" dateFormat="yy-mm-dd" class="w-full" showClear />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Estado del pago <span class="text-gray-400">(opcional)</span></label>
              <Select v-model="form.estado_pago" :options="[{label:'Pendiente',value:'pendiente'},{label:'Revisado',value:'revisado'},{label:'Aprobado',value:'aprobado'}]"
                optionLabel="label" optionValue="value" placeholder="Seleccionar" showClear class="w-full" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="field-label">Enlace contrato en Drive <span class="text-gray-400">(opcional)</span></label>
            <InputText v-model="form.enlace_drive" placeholder="https://drive.google.com/…" class="w-full" />
          </div>
        </div>
      </template>

      <!-- PASO 1: Partes -->
      <template v-if="step === 1">
        <p class="step-title">Partes del contrato</p>
        <div class="grid grid-cols-2 gap-1 mb-1 px-1">
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contratante</span>
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prestador</span>
        </div>
        <div class="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
          <!-- Contratante -->
          <div class="space-y-3">
            <div class="flex flex-col gap-1">
              <label class="field-label">Nombre / Razón social</label>
              <div class="flex gap-2">
                <AutoComplete
                  v-model="form.contratante_nombre"
                  :suggestions="contratantesFiltrados"
                  @complete="buscarCliente($event, 'contratante')"
                  @item-select="seleccionarCliente($event, 'contratante')"
                  @clear="limpiarParte('contratante')"
                  placeholder="Buscar cliente existente…"
                  class="flex-1"
                  inputClass="w-full"
                />
                <Button icon="pi pi-plus" severity="secondary" outlined size="small"
                  v-tooltip="'Crear nuevo cliente'" @click="abrirNuevoCliente('contratante')" />
              </div>
              <div v-if="form.contratante_id" class="flex items-center gap-1 text-xs text-green-600">
                <i class="pi pi-link text-xs" /> Cliente vinculado (id {{ form.contratante_id }})
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">NIT</label>
              <InputText v-model="form.contratante_nit" class="w-full" placeholder="Autocompletado" />
            </div>
          </div>
          <!-- Prestador -->
          <div class="space-y-3">
            <div class="flex flex-col gap-1">
              <label class="field-label">Nombre / Razón social</label>
              <div class="flex gap-2">
                <AutoComplete
                  v-model="form.prestador_nombre"
                  :suggestions="prestadoresFiltrados"
                  @complete="buscarCliente($event, 'prestador')"
                  @item-select="seleccionarCliente($event, 'prestador')"
                  @clear="limpiarParte('prestador')"
                  placeholder="Buscar cliente existente…"
                  class="flex-1"
                  inputClass="w-full"
                />
                <Button icon="pi pi-plus" severity="secondary" outlined size="small"
                  v-tooltip="'Crear nuevo cliente'" @click="abrirNuevoCliente('prestador')" />
              </div>
              <div v-if="form.prestador_id" class="flex items-center gap-1 text-xs text-green-600">
                <i class="pi pi-link text-xs" /> Cliente vinculado (id {{ form.prestador_id }})
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">NIT</label>
              <InputText v-model="form.prestador_nit" class="w-full" placeholder="Autocompletado" />
            </div>
          </div>
        </div>

        <!-- Dialog nuevo cliente (dentro del mismo dialog) -->
        <NuevoClienteDialog
          v-model:visible="showNuevoCliente"
          @creado="onClienteCreado"
        />
      </template>

      <!-- PASO 2: Términos económicos -->
      <template v-if="step === 2">
        <p class="step-title">Términos económicos</p>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="field-label">Fecha inicio</label>
              <DatePicker v-model="form.fecha_inicio" dateFormat="yy-mm-dd" showIcon class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Fecha fin</label>
              <DatePicker v-model="form.fecha_fin" dateFormat="yy-mm-dd" showIcon class="w-full" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="field-label">Tarifa base (COP/kWh)</label>
              <InputNumber v-model="form.tarifa_base" :minFractionDigits="2" :maxFractionDigits="4" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Periodicidad de pago</label>
              <Select v-model="form.periodicidad_pago" :options="PERIODICIDADES"
                optionLabel="label" optionValue="value" showClear class="w-full" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <label class="field-label">Índice de indexación</label>
              <InputText v-model="form.indice_indexacion" placeholder="Ej: IPC, IPP" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Cánones / otros (COP)</label>
              <InputNumber v-model="form.canones_otros" :minFractionDigits="2" :maxFractionDigits="4" class="w-full" />
            </div>
          </div>

          <!-- Detalles operacionales y contractuales -->
          <div class="border-t border-gray-100 pt-3">
            <p class="text-xs font-semibold uppercase tracking-wide mb-3" :style="`color:${tipoColor}`">
              Detalles operacionales y contractuales
              <span class="normal-case font-normal text-gray-400">(opcional)</span>
            </p>
            <div class="space-y-4">
              <div class="flex flex-col gap-1">
                <label class="field-label">Alcance del servicio</label>
                <Textarea v-model="form.service_scope" rows="3" autoResize class="w-full"
                  placeholder="Describe el alcance del servicio…" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="field-label">Términos específicos del servicio</label>
                <Textarea v-model="form.specific_service_terms" rows="3" autoResize class="w-full"
                  placeholder="Términos específicos aplicables al servicio…" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="field-label">SLAs (Acuerdos de nivel de servicio)</label>
                <Textarea v-model="form.slas" rows="3" autoResize class="w-full"
                  placeholder="Acuerdos de nivel de servicio, tiempos de respuesta…" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="field-label">Responsabilidades</label>
                <Textarea v-model="form.responsibilities" rows="3" autoResize class="w-full"
                  placeholder="Responsabilidades de las partes…" />
              </div>
            </div>
          </div>

          <!-- REC extra fields at bottom of Términos -->
          <template v-if="tipo === 'rec'">
            <div class="border-t border-gray-100 pt-3">
              <p class="text-xs font-semibold uppercase tracking-wide mb-3" :style="`color:${tipoColor}`">
                Certificados REC
              </p>
              <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="field-label">Cantidad (kWh)</label>
                  <InputNumber v-model="form.rec_cantidad" :minFractionDigits="0" :maxFractionDigits="3" locale="en-US" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Precio unitario (COP/kWh)</label>
                  <InputNumber v-model="form.rec_precio_unitario" :minFractionDigits="2" :maxFractionDigits="4" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Vintage</label>
                  <InputText v-model="form.rec_vintage" placeholder="Ej: 2024" class="w-full" />
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <!-- PASO 3: CGM y Promotor (solo REPRESENTACIÓN) -->
      <template v-if="step === 3 && tipo === 'representacion'">
        <p class="step-title">CGM y Promotor <span class="normal-case font-normal text-gray-400">(opcional)</span></p>
        <div class="space-y-4">
          <!-- CGM -->
          <div class="rounded-lg border border-gray-200 p-4 space-y-3">
            <div class="flex items-center gap-3">
              <ToggleSwitch v-model="form.tiene_cgm" />
              <span class="text-sm font-semibold text-gray-700">Incluye CGM</span>
              <span class="text-xs text-gray-400">(Comercializador Generador Minorista)</span>
            </div>
            <template v-if="form.tiene_cgm">
              <div class="grid grid-cols-3 gap-4 pt-1">
                <div class="flex flex-col gap-1">
                  <label class="field-label">Código SIC</label>
                  <InputText v-model="form.cgm_codigo_sic" placeholder="Ej: CGM-001" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">% FNCER</label>
                  <InputNumber v-model="form.cgm_porcentaje_fncer" suffix="%" :minFractionDigits="1" :maxFractionDigits="2" locale="en-US" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Tipo de asignación</label>
                  <InputText v-model="form.cgm_tipo_asignacion" placeholder="Ej: Proporcional" class="w-full" />
                </div>
              </div>
            </template>
          </div>

          <!-- Promotor -->
          <div class="rounded-lg border border-gray-200 p-4 space-y-3">
            <div class="flex items-center gap-3">
              <ToggleSwitch v-model="form.tiene_promotor" />
              <span class="text-sm font-semibold text-gray-700">Incluye Promotor</span>
            </div>
            <template v-if="form.tiene_promotor">
              <div class="grid grid-cols-2 gap-4 pt-1">
                <div class="flex flex-col gap-1">
                  <label class="field-label">Tarifa promotor (COP/kWh)</label>
                  <InputNumber v-model="form.promotor_tarifa" :minFractionDigits="2" :maxFractionDigits="4" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Condiciones</label>
                  <Textarea v-model="form.promotor_condiciones" rows="3" autoResize class="w-full"
                    placeholder="Describe las condiciones del promotor…" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
      <Button v-if="step > 0" label="Anterior" icon="pi pi-arrow-left" severity="secondary" outlined @click="step--" />
      <span v-else />
      <div class="flex gap-2">
        <Button label="Cancelar" severity="secondary" text @click="$emit('cerrar')" />
        <Button v-if="step < STEPS.length - 1" label="Siguiente" icon="pi pi-arrow-right" iconPos="right"
          :style="`background:${tipoColor}; border-color:${tipoColor}`"
          @click="step++" />
        <Button v-else label="Crear contrato" icon="pi pi-check" :loading="guardando"
          :style="`background:${tipoColor}; border-color:${tipoColor}`"
          @click="guardar" />
      </div>
    </div>

  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import Textarea from 'primevue/textarea'
import NuevoClienteDialog from '@/components/NuevoClienteDialog.vue'
import api from '@/api/client'

const props = defineProps({
  visible: Boolean,
  tipo: { type: String, required: true }, // representacion | operacion | rec
  proyectoIdDefault: { type: Number, default: null },
})
const emit = defineEmits(['update:visible', 'cerrar', 'creado'])

const toast = useToast()
const step = ref(0)
const guardando = ref(false)
const todosProyectos = ref([])
const todosClientes = ref([])
const contratantesFiltrados = ref([])
const prestadoresFiltrados = ref([])
const showNuevoCliente = ref(false)
const nuevoClienteRol = ref('contratante')

const TIPO_CONFIG = {
  representacion: { label: 'Representación', color: '#3b82f6' },
  operacion:      { label: 'Operación',       color: '#10b981' },
  rec:            { label: 'REC',             color: '#14b8a6' },
  mantenimiento:  { label: 'Mantenimiento',   color: '#f59e0b' },
  arriendo:       { label: 'Arriendo',        color: '#8b5cf6' },
  internet:       { label: 'Internet',        color: '#06b6d4' },
}

const tipoColor = computed(() => TIPO_CONFIG[props.tipo]?.color ?? '#6b7280')
const tipoLabel = computed(() => TIPO_CONFIG[props.tipo]?.label ?? props.tipo)

const STEPS = computed(() => {
  const base = [
    { label: 'Identificación' },
    { label: 'Partes' },
    { label: 'Términos' },
  ]
  if (props.tipo === 'representacion') return [...base, { label: 'CGM y Promotor' }]
  return base
})

const ESTADOS = [
  { label: 'Vigente',       value: 'vigente' },
  { label: 'Vencido',       value: 'vencido' },
  { label: 'Terminado',     value: 'terminado' },
  { label: 'En renovación', value: 'en_renovacion' },
]

const PERIODICIDADES = [
  { label: 'Mensual',    value: 'mensual' },
  { label: 'Bimestral',  value: 'bimestral' },
  { label: 'Trimestral', value: 'trimestral' },
  { label: 'Anual',      value: 'anual' },
]

const form = reactive({
  proyecto_id: null,
  numero_contrato: '',
  estado: 'vigente',
  contratante_id: null,
  contratante_nombre: null,
  contratante_nit: '',
  prestador_id: null,
  prestador_nombre: null,
  prestador_nit: '',
  fecha_inicio: null,
  fecha_fin: null,
  tarifa_base: null,
  periodicidad_pago: null,
  indice_indexacion: '',
  canones_otros: null,
  fecha_firma_contrato: null,
  enlace_drive: '',
  estado_pago: null,
  tiene_cgm: false,
  cgm_codigo_sic: '',
  cgm_porcentaje_fncer: null,
  cgm_tipo_asignacion: '',
  tiene_promotor: false,
  promotor_tarifa: null,
  promotor_condiciones: '',
  rec_cantidad: null,
  rec_precio_unitario: null,
  rec_vintage: '',
  service_scope: '',
  specific_service_terms: '',
  slas: '',
  responsibilities: '',
})

function buscarCliente(event, rol) {
  const q = (event.query ?? '').toLowerCase()
  const resultado = todosClientes.value
    .filter(c => c.razon_social_nombre?.toLowerCase().includes(q))
    .map(c => c.razon_social_nombre)
  if (rol === 'contratante') contratantesFiltrados.value = resultado
  else prestadoresFiltrados.value = resultado
}

function seleccionarCliente(event, rol) {
  const found = todosClientes.value.find(c => c.razon_social_nombre === event.value)
  if (!found) return
  if (rol === 'contratante') {
    form.contratante_id = found.id
    form.contratante_nombre = found.razon_social_nombre
    form.contratante_nit = found.nit_cedula ?? ''
  } else {
    form.prestador_id = found.id
    form.prestador_nombre = found.razon_social_nombre
    form.prestador_nit = found.nit_cedula ?? ''
  }
}

function limpiarParte(rol) {
  if (rol === 'contratante') { form.contratante_id = null; form.contratante_nit = '' }
  else { form.prestador_id = null; form.prestador_nit = '' }
}

function abrirNuevoCliente(rol) {
  nuevoClienteRol.value = rol
  showNuevoCliente.value = true
}

function onClienteCreado(cliente) {
  todosClientes.value.push(cliente)
  seleccionarCliente({ value: cliente.razon_social_nombre }, nuevoClienteRol.value)
}

function formatFecha(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

async function guardar() {
  guardando.value = true
  try {
    const payload = {
      servicio_aplica: props.tipo,
      proyecto_id: form.proyecto_id ?? null,
      numero_contrato: form.numero_contrato?.trim() || null,
      estado: form.estado ?? 'vigente',
      contratante_id: form.contratante_id ?? null,
      contratante_nombre: form.contratante_nombre || null,
      contratante_nit: form.contratante_nit?.trim() || null,
      prestador_id: form.prestador_id ?? null,
      prestador_nombre: form.prestador_nombre || null,
      prestador_nit: form.prestador_nit?.trim() || null,
      fecha_firma_contrato: formatFecha(form.fecha_firma_contrato),
      enlace_drive: form.enlace_drive?.trim() || null,
      estado_pago: form.estado_pago ?? null,
      fecha_inicio: formatFecha(form.fecha_inicio),
      fecha_fin: formatFecha(form.fecha_fin),
      tarifa_base: form.tarifa_base ?? null,
      periodicidad_pago: form.periodicidad_pago ?? null,
      indice_indexacion: form.indice_indexacion?.trim() || null,
      canones_otros: form.canones_otros ?? null,
      tiene_cgm: form.tiene_cgm,
      cgm_codigo_sic: form.tiene_cgm ? (form.cgm_codigo_sic?.trim() || null) : null,
      cgm_porcentaje_fncer: form.tiene_cgm ? (form.cgm_porcentaje_fncer ?? null) : null,
      cgm_tipo_asignacion: form.tiene_cgm ? (form.cgm_tipo_asignacion?.trim() || null) : null,
      tiene_promotor: form.tiene_promotor,
      promotor_tarifa: form.tiene_promotor ? (form.promotor_tarifa ?? null) : null,
      promotor_condiciones: form.tiene_promotor ? (form.promotor_condiciones?.trim() || null) : null,
      rec_cantidad: form.rec_cantidad ?? null,
      rec_precio_unitario: form.rec_precio_unitario ?? null,
      rec_vintage: form.rec_vintage?.trim() || null,
      service_scope: form.service_scope?.trim() || null,
      specific_service_terms: form.specific_service_terms?.trim() || null,
      slas: form.slas?.trim() || null,
      responsibilities: form.responsibilities?.trim() || null,
    }
    await api.post('/contratos-servicio', payload)
    toast.add({ severity: 'success', summary: 'Contrato creado', life: 2500 })
    emit('creado')
    emit('cerrar')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail ?? e.message, life: 4000 })
  } finally {
    guardando.value = false
  }
}

onMounted(async () => {
  const [{ data: proyectos }, { data: clientes }] = await Promise.all([
    api.get('/proyectos', { params: { size: 500 } }),
    api.get('/clientes', { params: { size: 500 } }),
  ])
  todosProyectos.value = proyectos
  todosClientes.value = clientes
  if (props.proyectoIdDefault) form.proyecto_id = props.proyectoIdDefault
})
</script>

<style scoped>
.step-title { @apply text-sm font-semibold text-gray-700 mb-4; }
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
