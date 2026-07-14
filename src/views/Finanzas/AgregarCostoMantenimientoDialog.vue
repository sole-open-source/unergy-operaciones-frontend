<template>
  <Dialog :visible="visible" @update:visible="v => emit('update:visible', v)"
    modal header="Agregar Costo — Mantenimiento" :style="{ width: '640px' }">
    <div class="space-y-4 pt-1">
      <!-- Proyecto -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500">Proyecto <span class="text-red-400">*</span></label>
        <Select v-model="form.proyecto_id" :options="proyectosDisponibles"
          optionLabel="nombre_comercial" optionValue="id" filter showClear
          placeholder="Selecciona un proyecto…" class="w-full" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Valor Base Anual (COP) <span class="text-red-400">*</span></label>
          <InputNumber v-model="form.tarifa_base" mode="currency" currency="COP" locale="es-CO"
            :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Fecha firma <span class="text-red-400">*</span></label>
          <input type="date" v-model="form.fecha_firma_contrato"
            class="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Fecha inicio O&amp;M</label>
          <input type="date" v-model="form.fecha_inicio_om"
            class="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Estado</label>
          <Select v-model="form.estado" :options="ESTADOS" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">N° contrato</label>
          <InputText v-model="form.numero_contrato" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Periodicidad de pago</label>
          <Select v-model="form.periodicidad_pago" :options="PERIODICIDADES"
            optionLabel="label" optionValue="value" showClear class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Prestador (nombre)</label>
          <InputText v-model="form.prestador_nombre" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Prestador (NIT)</label>
          <InputText v-model="form.prestador_nit" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Contratante (nombre)</label>
          <InputText v-model="form.contratante_nombre" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Contratante (NIT)</label>
          <InputText v-model="form.contratante_nit" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Fecha inicio</label>
          <input type="date" v-model="form.fecha_inicio"
            class="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Fecha fin</label>
          <input type="date" v-model="form.fecha_fin"
            class="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Cánones / otros (COP)</label>
          <InputNumber v-model="form.canones_otros" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Índice de indexación</label>
          <InputText v-model="form.indice_indexacion" placeholder="IPC" class="w-full" />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500">Enlace contrato en Drive</label>
        <InputText v-model="form.enlace_drive" placeholder="https://drive.google.com/…" class="w-full" />
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="emit('update:visible', false)" />
      <Button label="Guardar costo" icon="pi pi-check" :loading="guardando"
        :disabled="!puedeGuardar" style="background:#915BD8;border-color:#915BD8"
        @click="guardar" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({
  visible: { type: Boolean, default: false },
  proyectosDisponibles: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:visible', 'saved'])

const toast = useToast()
const guardando = ref(false)

const ESTADOS = [
  { label: 'Vigente', value: 'vigente' },
  { label: 'Vencido', value: 'vencido' },
  { label: 'Terminado', value: 'terminado' },
  { label: 'En renovación', value: 'en_renovacion' },
]
const PERIODICIDADES = [
  { label: 'Mensual', value: 'mensual' },
  { label: 'Bimestral', value: 'bimestral' },
  { label: 'Trimestral', value: 'trimestral' },
  { label: 'Anual', value: 'anual' },
]

function nuevoForm() {
  return {
    proyecto_id: null,
    tarifa_base: null,
    fecha_firma_contrato: null,
    fecha_inicio_om: null,
    estado: 'vigente',
    numero_contrato: '',
    periodicidad_pago: 'mensual',
    prestador_nombre: '',
    prestador_nit: '',
    contratante_nombre: '',
    contratante_nit: '',
    fecha_inicio: null,
    fecha_fin: null,
    canones_otros: null,
    indice_indexacion: 'IPC',
    enlace_drive: '',
  }
}
const form = reactive(nuevoForm())

// Resetear el formulario cada vez que se abre
watch(() => props.visible, (v) => { if (v) Object.assign(form, nuevoForm()) })

const puedeGuardar = computed(() =>
  !!(form.proyecto_id && form.tarifa_base && form.fecha_firma_contrato)
)

async function guardar() {
  if (!puedeGuardar.value) return
  guardando.value = true
  try {
    const payload = {
      ...form,
      servicio_aplica: 'mantenimiento',
      tarifa_base: form.tarifa_base || null,
      canones_otros: form.canones_otros || null,
      fecha_firma_contrato: form.fecha_firma_contrato || null,
      fecha_inicio_om: form.fecha_inicio_om || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
    }
    await api.post('/contratos-servicio', payload)
    toast.add({ severity: 'success', summary: 'Costo agregado', life: 2500 })
    emit('saved')
    emit('update:visible', false)
  } catch {
    toast.add({ severity: 'error', summary: 'Error al agregar el costo', life: 3000 })
  } finally {
    guardando.value = false
  }
}
</script>
