<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import { useGarantiasHistorial } from './composables/useGarantiasHistorial.js'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  visible: Boolean,
  ajuste: Object,
})
const emit = defineEmits(['update:visible', 'saved'])

const store = useGarantiasHistorial()
const toast = useToast()

const local = ref({})

watch(
  () => props.ajuste,
  (val) => {
    if (val) local.value = { ...val }
  },
  { immediate: true }
)

const TIPO_LABEL = { semanal: 'Semanal', txr: 'TXR', mensual: 'Mensual' }

async function guardar() {
  try {
    await store.actualizar(props.ajuste.id, local.value)
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Registro actualizado', life: 3000 })
    emit('saved')
    emit('update:visible', false)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 4000 })
  }
}

function cancelar() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Editar registro"
    :modal="true"
    :style="{ width: '600px' }"
  >
    <div class="flex flex-col gap-4">
      <!-- Tipo (read-only) -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-color">Tipo:</span>
        <span class="font-semibold">{{ TIPO_LABEL[ajuste?.tipo] ?? ajuste?.tipo }}</span>
        <span class="text-sm text-muted-color ml-4">Fecha:</span>
        <span class="font-semibold">{{ ajuste?.fecha }}</span>
      </div>

      <!-- Precios -->
      <fieldset class="border border-surface rounded p-3">
        <legend class="text-sm font-semibold px-1">Precios</legend>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs">PB</label>
            <InputNumber v-model="local.pb" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs">Restricciones</label>
            <InputNumber v-model="local.restricciones" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs">STN</label>
            <InputNumber v-model="local.stn" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs">TRM</label>
            <InputNumber v-model="local.trm" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs">PTB</label>
            <InputNumber v-model="local.ptb" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
        </div>
      </fieldset>

      <!-- Totales UNGC / UNGG -->
      <fieldset class="border border-surface rounded p-3">
        <legend class="text-sm font-semibold px-1">Totales</legend>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs">Total UNGC</label>
            <InputNumber v-model="local.totalUNGC" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs">Total UNGG</label>
            <InputNumber v-model="local.totalUNGG" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs">Total a consignar</label>
            <InputNumber v-model="local.totalConsignar" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
        </div>
      </fieldset>

      <!-- Custodia -->
      <fieldset class="border border-surface rounded p-3">
        <legend class="text-sm font-semibold px-1">Custodia</legend>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs">Disponible custodia</label>
            <InputNumber v-model="local.disponibleCustodia" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs">Congelado</label>
            <InputNumber v-model="local.congelado" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs">Saldo</label>
            <InputNumber v-model="local.saldo" :min-fraction-digits="2" :max-fraction-digits="2" />
          </div>
        </div>
      </fieldset>

      <!-- TXR -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold">Total ajuste TXR</label>
        <InputNumber v-model="local.totalAjusteTXR" :min-fraction-digits="2" :max-fraction-digits="2" />
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="cancelar" />
      <Button label="Guardar" @click="guardar" />
    </template>
  </Dialog>
</template>
