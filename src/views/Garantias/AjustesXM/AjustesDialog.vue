<template>
  <Dialog
    :visible="visible"
    modal
    header="⚙ Ajustes"
    style="width: 440px"
    @update:visible="$emit('close')"
  >
    <div class="space-y-4 py-2">
      <!-- PB anterior -->
      <div class="space-y-1">
        <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">
          PB semana anterior ($)
        </label>
        <InputNumber
          v-model="pbLocal"
          :min="0"
          :max-fraction-digits="2"
          class="w-full"
          placeholder="Ej: 547.88"
          fluid
        />
        <p class="text-xs" style="color:#9ca3af">
          Usado para calcular la variación % en el mensaje semanal.
        </p>
      </div>

      <!-- Menciones -->
      <div class="space-y-1">
        <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">
          Menciones en el mensaje
        </label>
        <Textarea
          v-model="mencionesLocal"
          rows="3"
          class="w-full"
          placeholder="@Juan @María @Pedro"
          fluid
        />
        <p class="text-xs" style="color:#9ca3af">
          Se insertan al final del mensaje generado.
        </p>
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="$emit('close')" />
      <Button label="Guardar" icon="pi pi-check" @click="guardar" style="background:#915BD8;border-color:#915BD8" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import { useGarantiasHistorial } from './composables/useGarantiasHistorial.js'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const store = useGarantiasHistorial()

const pbLocal = ref(null)
const mencionesLocal = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) {
      pbLocal.value = store.getPbAnterior()
      mencionesLocal.value = store.getMenciones()
    }
  },
)

function guardar() {
  store.setPbAnterior(pbLocal.value)
  store.setMenciones(mencionesLocal.value)
  emit('close')
}
</script>
