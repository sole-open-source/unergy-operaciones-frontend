<template>
  <Dialog :visible="visible" modal header="Agregar proyecto" :style="{ width: '480px' }"
          @update:visible="$emit('update:visible', $event)">
    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-sm font-medium mb-1">Nombre del proyecto *</label>
        <InputText v-model.trim="f.nombre_comercial" class="w-full" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Capacidad instalada (kWp)</label>
        <InputNumber v-model="f.potencia_instalada_kwp" class="w-full" :maxFractionDigits="3" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Departamento</label>
          <InputText v-model.trim="f.departamento" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Municipio</label>
          <InputText v-model.trim="f.municipio" class="w-full" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Operador de red *</label>
        <Dropdown v-model="f.operador_red_id" :options="operadores" :optionLabel="nombreOperador"
                  optionValue="id" filter class="w-full" placeholder="Seleccionar del catálogo…" />
        <small class="text-gray-500">Obligatorio — sin operador de red no se puede crear el proyecto.</small>
      </div>
    </div>
    <template #footer>
      <Button label="Cancelar" text @click="$emit('update:visible', false)" />
      <Button label="Crear proyecto" icon="pi pi-check" :loading="guardando"
              :disabled="!f.nombre_comercial || !f.operador_red_id" @click="guardar()" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import api from '@/api/client'

const props = defineProps({ visible: Boolean, oportunidadId: { type: [Number, String], required: true } })
const emit = defineEmits(['update:visible', 'creado'])
const toast = useToast()
const confirm = useConfirm()

const operadores = ref([])
const guardando = ref(false)
const f = reactive({ nombre_comercial: '', potencia_instalada_kwp: null, departamento: '', municipio: '', operador_red_id: null })

function nombreOperador(o) { return o.nombre_comercial || o.nombre_legal }

onMounted(async () => {
  const { data } = await api.get('/operadores-red')
  operadores.value = data.items ?? data
})

async function guardar(forzar = false) {
  guardando.value = true
  try {
    const { data } = await api.post(
      `/comercial/oportunidades/${props.oportunidadId}/proyectos`,
      { ...f, departamento: f.departamento || null, municipio: f.municipio || null },
      { params: forzar ? { forzar: true } : {} },
    )
    emit('creado', data)
    emit('update:visible', false)
    Object.assign(f, { nombre_comercial: '', potencia_instalada_kwp: null, departamento: '', municipio: '', operador_red_id: null })
  } catch (err) {
    const det = err.response?.data?.detail
    if (err.response?.status === 409 && det?.codigo === 'posible_duplicado') {
      confirm.require({
        message: `${det.mensaje}. ¿Crear de todos modos?`,
        header: 'Posible duplicado', icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Crear igual', rejectLabel: 'Cancelar',
        accept: () => guardar(true),
      })
    } else {
      toast.add({ severity: 'error', summary: 'No se pudo crear', detail: typeof det === 'string' ? det : 'Error', life: 5000 })
    }
  } finally {
    guardando.value = false
  }
}
</script>
