<template>
  <Dialog :visible="visible" @update:visible="v => emit('update:visible', v)"
    modal header="Agregar Costo — Arriendo" :style="{ width: '520px' }">
    <div class="space-y-4 pt-1">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-gray-500">Proyecto <span class="text-red-400">*</span></label>
        <Select v-model="form.proyecto_id" :options="proyectosDisponibles"
          optionLabel="nombre_comercial" optionValue="id" filter showClear
          placeholder="Selecciona un proyecto…" class="w-full"
          @change="onProyectoChange" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Valor Base (COP)</label>
          <InputNumber v-model="form.valor_base" :maxFractionDigits="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Canon (COP)</label>
          <InputNumber v-model="form.canon_archivo" :maxFractionDigits="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Fecha firma contrato</label>
          <input type="date" v-model="form.fecha_firma_contrato"
            class="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500">Código</label>
          <InputText v-model="form.codigo" class="w-full" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="emit('update:visible', false)" />
      <Button label="Guardar costo" icon="pi pi-check" :loading="guardando"
        :disabled="!form.proyecto_id" style="background:#915BD8;border-color:#915BD8"
        @click="guardar" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
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

function nuevoForm() {
  return {
    proyecto_id: null,
    nombre: '',
    valor_base: null,
    canon_archivo: null,
    fecha_firma_contrato: null,
    codigo: '',
    activo: true,
  }
}
const form = reactive(nuevoForm())

watch(() => props.visible, (v) => { if (v) Object.assign(form, nuevoForm()) })

function onProyectoChange() {
  const p = props.proyectosDisponibles.find(x => x.id === form.proyecto_id)
  form.nombre = p?.nombre_comercial ?? ''
}

async function guardar() {
  if (!form.proyecto_id) return
  guardando.value = true
  try {
    await api.post('/arriendos/proyectos', {
      proyecto_id: form.proyecto_id,
      nombre: form.nombre,
      codigo: form.codigo || null,
      valor_base: form.valor_base,
      canon_archivo: form.canon_archivo,
      fecha_firma_contrato: form.fecha_firma_contrato || null,
      activo: true,
    })
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
