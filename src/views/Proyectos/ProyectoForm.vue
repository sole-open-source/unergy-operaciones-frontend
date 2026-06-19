<template>
  <form @submit.prevent="submit" class="space-y-4 pt-2">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="field-label">Nombre comercial *</label>
        <InputText v-model="f.nombre_comercial" class="w-full" required />
      </div>
      <div>
        <label class="field-label">Tipo de proyecto</label>
        <Select v-model="f.tipo_proyecto" :options="tipos" class="w-full" placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label class="field-label">Estado</label>
        <Select v-model="f.estado" :options="estados" class="w-full" />
      </div>
      <div>
        <label class="field-label">Potencia instalada (kWp)</label>
        <InputNumber v-model="f.potencia_instalada_kwp" :maxFractionDigits="2" class="w-full" />
      </div>
      <div>
        <label class="field-label">Tipo tecnología</label>
        <Select v-model="f.tipo_tecnologia" :options="tecnologias" class="w-full" placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label class="field-label">Departamento</label>
        <InputText v-model="f.departamento" class="w-full" />
      </div>
      <div>
        <label class="field-label">Municipio</label>
        <InputText v-model="f.municipio" class="w-full" />
      </div>
      <div>
        <label class="field-label">Operador de red</label>
        <InputText v-model="f.operador_red" class="w-full" />
      </div>
      <div>
        <label class="field-label">Clasificación regulatoria</label>
        <Select v-model="f.clasificacion_regulatoria" :options="clasificaciones" class="w-full" placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label class="field-label">Carpeta Drive (código)</label>
        <InputText v-model="f.carpeta_drive_codigo" class="w-full" />
      </div>
      <div>
        <label class="field-label">Código base (topic)</label>
        <InputText v-model="f.sub_project" class="w-full" placeholder="ej: perija, vallenata" />
      </div>
      <div>
        <label class="field-label">Código TSF</label>
        <InputText v-model="f.codigo_tsf" class="w-full" placeholder="ej: COLCEST58P2" />
      </div>
    </div>

    <!-- Simulación P50 / P90 -->
    <div class="border border-gray-200 rounded-lg p-4 space-y-4">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Generación simulada mensual (kWh)</p>

      <!-- P90 -->
      <div>
        <p class="text-xs font-medium text-gray-600 mb-2">P90</p>
        <div class="grid grid-cols-6 gap-2">
          <div v-for="(mes, i) in MESES" :key="'p90-' + i">
            <label class="block text-[10px] text-gray-400 mb-0.5 text-center">{{ mes }}</label>
            <InputNumber
              v-model="p90Array[i]"
              :maxFractionDigits="1"
              class="w-full"
              inputClass="text-center text-xs px-1 py-1"
              :placeholder="'—'"
            />
          </div>
        </div>
      </div>

      <!-- P50 -->
      <div>
        <p class="text-xs font-medium text-gray-600 mb-2">P50</p>
        <div class="grid grid-cols-6 gap-2">
          <div v-for="(mes, i) in MESES" :key="'p50-' + i">
            <label class="block text-[10px] text-gray-400 mb-0.5 text-center">{{ mes }}</label>
            <InputNumber
              v-model="p50Array[i]"
              :maxFractionDigits="1"
              class="w-full"
              inputClass="text-center text-xs px-1 py-1"
              :placeholder="'—'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Inversionistas (solo modo edición) -->
    <div v-if="proyectoId" class="border border-gray-200 rounded-lg p-4 space-y-3">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inversionistas</p>

      <DataTable :value="inversionistas" class="text-xs" stripedRows>
        <Column field="cliente_nombre" header="Inversionista" />
        <Column header="Participación (%)">
          <template #body="{ data }">
            {{ data.porcentaje_participacion != null ? (data.porcentaje_participacion * 100).toFixed(2) + '%' : '—' }}
          </template>
        </Column>
        <Column header="Pat. autónomo">
          <template #body="{ data }">
            <Tag :value="data.es_patrimonio_autonomo ? 'Sí' : 'No'"
              :severity="data.es_patrimonio_autonomo ? 'info' : 'secondary'" />
          </template>
        </Column>
        <Column header="" style="width:50px">
          <template #body="{ data }">
            <Button icon="pi pi-trash" text severity="danger" size="small"
              @click="eliminarInversionista(data.id)" />
          </template>
        </Column>
        <template #empty>
          <p class="text-center text-gray-400 py-2 text-xs">Sin inversionistas registrados.</p>
        </template>
      </DataTable>

      <Divider />
      <p class="text-xs font-medium text-gray-600">Agregar inversionista</p>
      <div class="grid grid-cols-2 gap-2">
        <div class="col-span-2">
          <label class="field-label">Cliente</label>
          <Select v-model="nuevoInv.cliente_id" :options="clientes" optionLabel="razon_social_nombre"
            optionValue="id" class="w-full" placeholder="Seleccionar" filter />
        </div>
        <div>
          <label class="field-label">% Participación</label>
          <InputNumber v-model="nuevoInv.porcentaje_pct" :min="0" :max="100" :maxFractionDigits="2"
            suffix="%" class="w-full" />
        </div>
        <div>
          <label class="field-label">Patrimonio autónomo</label>
          <div class="flex items-center gap-2 h-10">
            <ToggleSwitch v-model="nuevoInv.es_patrimonio_autonomo" />
            <span class="text-xs text-gray-600">{{ nuevoInv.es_patrimonio_autonomo ? 'Sí' : 'No' }}</span>
          </div>
        </div>
      </div>
      <Button label="Agregar" icon="pi pi-plus" size="small" :loading="guardandoInv"
        :disabled="!nuevoInv.cliente_id" @click="agregarInversionista" />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" label="Cancelar" severity="secondary" @click="$emit('cancel')" />
      <Button type="submit" :label="editMode ? 'Guardar cambios' : 'Crear proyecto'" />
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ToggleSwitch from 'primevue/toggleswitch'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import { useSecureInput } from '@/composables/useSecureInput'

const { beforeSubmit } = useSecureInput()

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const props = defineProps({
  clientes: Array,
  proyecto: { type: Object, default: null },
  proyectoId: { type: Number, default: null },
})
const emit = defineEmits(['save', 'cancel'])

const editMode = computed(() => !!props.proyecto)

const estados = ['en_desarrollo', 'en_operacion', 'suspendido', 'cancelado']
const tipos = ['minigranja', 'autoconsumo', 'gd', 'movilidad_electrica', 'otro']
const tecnologias = ['solar', 'eolica', 'hidraulica', 'biomasa', 'otra']
const clasificaciones = ['AGP', 'AGPE', 'AGGE', 'GD', 'DER', 'otra']

const f = reactive({
  nombre_comercial: '',
  estado: 'en_desarrollo',
  tipo_proyecto: null,
  potencia_instalada_kwp: null,
  tipo_tecnologia: null,
  departamento: null,
  municipio: null,
  operador_red: null,
  clasificacion_regulatoria: null,
  carpeta_drive_codigo: null,
  sub_project: null,
  codigo_tsf: null,
})

function parseMonthArray(jsonStr) {
  if (!jsonStr) return Array(12).fill(null)
  try {
    const arr = JSON.parse(jsonStr)
    if (!Array.isArray(arr)) return Array(12).fill(null)
    return arr.map(v => (v === null || v === undefined ? null : Number(v)))
  } catch {
    return Array(12).fill(null)
  }
}

const p90Array = ref(Array(12).fill(null))
const p50Array = ref(Array(12).fill(null))

watch(() => props.proyecto, (p) => {
  if (p) {
    Object.keys(f).forEach(k => { if (k in p) f[k] = p[k] })
    p90Array.value = parseMonthArray(p.p90_mensual_kwh)
    p50Array.value = parseMonthArray(p.p50_mensual_kwh)
  }
}, { immediate: true })

const toast = useToast()
const inversionistas = ref([])
const guardandoInv = ref(false)
const nuevoInv = reactive({ cliente_id: null, porcentaje_pct: null, es_patrimonio_autonomo: false })

watch(() => props.proyectoId, async (id) => {
  if (id) {
    const { data } = await api.get(`/proyectos/${id}/inversionistas`)
    inversionistas.value = data
  }
}, { immediate: true })

async function agregarInversionista() {
  if (!nuevoInv.cliente_id) return
  guardandoInv.value = true
  try {
    await api.post(`/proyectos/${props.proyectoId}/inversionistas`, {
      cliente_id: nuevoInv.cliente_id,
      porcentaje_participacion: nuevoInv.porcentaje_pct != null ? nuevoInv.porcentaje_pct / 100 : null,
      es_patrimonio_autonomo: nuevoInv.es_patrimonio_autonomo,
    })
    const { data } = await api.get(`/proyectos/${props.proyectoId}/inversionistas`)
    inversionistas.value = data
    nuevoInv.cliente_id = null
    nuevoInv.porcentaje_pct = null
    nuevoInv.es_patrimonio_autonomo = false
    toast.add({ severity: 'success', summary: 'Inversionista agregado', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al agregar', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    guardandoInv.value = false
  }
}

async function eliminarInversionista(invId) {
  if (!confirm('¿Estás seguro de que deseas eliminar este inversionista?')) return
  try {
    await api.delete(`/proyectos/${props.proyectoId}/inversionistas/${invId}`)
    inversionistas.value = inversionistas.value.filter(i => i.id !== invId)
    toast.add({ severity: 'success', summary: 'Inversionista eliminado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

function serializeMonthArray(arr) {
  if (arr.every(v => v === null || v === undefined)) return null
  return JSON.stringify(arr.map(v => (v === null || v === undefined ? null : v)))
}

function submit() {
  const payload = {}
  for (const [k, v] of Object.entries(f)) {
    if (v !== null && v !== undefined && v !== '') payload[k] = v
  }
  const p90json = serializeMonthArray(p90Array.value)
  const p50json = serializeMonthArray(p50Array.value)
  if (p90json !== null) payload.p90_mensual_kwh = p90json
  if (p50json !== null) payload.p50_mensual_kwh = p50json
  // Saneamiento anti-XSS de descripciones/especificaciones antes de enviar.
  // Los campos numéricos (potencia, P50/P90) ya están tipados por InputNumber.
  emit('save', beforeSubmit(payload))
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
