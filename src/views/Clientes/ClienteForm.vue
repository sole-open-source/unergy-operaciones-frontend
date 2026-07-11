<template>
  <form @submit.prevent="submit" class="space-y-4 pt-2" aria-label="Formulario de cliente">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label for="cf-razon" class="field-label">Razón social / Nombre <span class="field-required" aria-hidden="true">*</span><span class="sr-only"> (obligatorio)</span></label>
        <InputText id="cf-razon" v-model="f.razon_social_nombre" class="w-full" required aria-required="true" />
      </div>
      <div>
        <label for="cf-nit" class="field-label">NIT / Cédula</label>
        <InputText id="cf-nit" v-model="f.nit_cedula" class="w-full" />
      </div>
      <div>
        <label for="cf-tipo-persona" class="field-label">Tipo de persona</label>
        <Select inputId="cf-tipo-persona" v-model="f.tipo_persona" :options="['natural', 'juridica']" class="w-full" placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label for="cf-rep-legal" class="field-label">Representante legal</label>
        <InputText id="cf-rep-legal" v-model="f.representante_legal" class="w-full" />
      </div>
      <div>
        <label for="cf-correo" class="field-label">Correo</label>
        <InputText id="cf-correo" v-model="f.correo_electronico" type="email" class="w-full" />
      </div>
      <div>
        <label for="cf-telefono" class="field-label">Teléfono</label>
        <InputText id="cf-telefono" v-model="f.telefono_contacto" class="w-full" />
      </div>
      <div>
        <label for="cf-ciudad" class="field-label">Ciudad</label>
        <InputText id="cf-ciudad" v-model="f.ciudad" class="w-full" />
      </div>
      <div>
        <label for="cf-depto" class="field-label">Departamento</label>
        <InputText id="cf-depto" v-model="f.departamento" class="w-full" />
      </div>
      <div class="col-span-2">
        <label for="cf-direccion" class="field-label">Dirección</label>
        <InputText id="cf-direccion" v-model="f.direccion" class="w-full" />
      </div>
      <div>
        <label for="cf-origen" class="field-label">Origen del cliente</label>
        <Dropdown inputId="cf-origen" v-model="f.origen_tipo" :options="ORIGENES" optionLabel="label" optionValue="value"
                  showClear class="w-full" placeholder="—" />
      </div>
      <div>
        <label for="cf-origen-detalle" class="field-label">Quién lo recomendó/consiguió</label>
        <InputText id="cf-origen-detalle" v-model="f.origen_detalle" class="w-full" />
      </div>

      <!-- Información bancaria -->
      <div class="col-span-2">
        <fieldset class="border-t pt-4 mt-1">
          <legend class="text-xs font-semibold uppercase tracking-wide mb-3" style="color: #6E3FB8;">Información bancaria</legend>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="cf-banco" class="field-label">Banco</label>
              <InputText id="cf-banco" v-model="f.banco" class="w-full" placeholder="Ej: Bancolombia" />
            </div>
            <div>
              <label for="cf-tipo-cuenta" class="field-label">Tipo de cuenta</label>
              <Select inputId="cf-tipo-cuenta" v-model="f.tipo_cuenta" :options="['ahorros', 'corriente']" class="w-full" placeholder="Seleccionar" showClear />
            </div>
            <div>
              <label for="cf-num-cuenta" class="field-label">Número de cuenta</label>
              <InputText id="cf-num-cuenta" v-model="f.numero_cuenta" class="w-full" />
            </div>
            <div>
              <label for="cf-titular" class="field-label">Titular de la cuenta</label>
              <InputText id="cf-titular" v-model="f.titular_cuenta" class="w-full" />
            </div>
          </div>
        </fieldset>
      </div>

      <div>
        <label for="cf-iva" class="field-label">IVA %</label>
        <InputNumber inputId="cf-iva" v-model="f.iva_pct" :maxFractionDigits="2" locale="en-US" class="w-full" />
      </div>
      <div>
        <label for="cf-retencion" class="field-label">Retención %</label>
        <InputNumber inputId="cf-retencion" v-model="f.retencion_pct" :maxFractionDigits="2" locale="en-US" class="w-full" />
      </div>
      <div>
        <label for="cf-reteica" class="field-label">ReteICA %</label>
        <InputNumber inputId="cf-reteica" v-model="f.reteica_pct" :maxFractionDigits="4" locale="en-US" class="w-full" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" label="Cancelar" severity="secondary" @click="$emit('cancel')" />
      <Button type="submit" label="Guardar" />
    </div>
  </form>
</template>

<script setup>
import { reactive, watch } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

const ORIGENES = [
  { label: 'Prospección propia', value: 'prospeccion_propia' },
  { label: 'Recomendación', value: 'recomendacion' },
  { label: 'Referido', value: 'referido' },
  { label: 'Otro', value: 'otro' },
]

const props = defineProps({ initial: Object })
const emit = defineEmits(['save', 'cancel'])

const f = reactive({ origen_tipo: null, origen_detalle: '', ...props.initial })
watch(() => props.initial, (v) => { Object.assign(f, v) }, { deep: true })

function submit() {
  const payload = {}
  for (const [k, v] of Object.entries(f)) {
    if (v !== null && v !== undefined && v !== '') payload[k] = v
  }
  emit('save', payload)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
