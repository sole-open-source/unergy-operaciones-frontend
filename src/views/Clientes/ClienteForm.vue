<template>
  <form @submit.prevent="submit" class="space-y-4 pt-2">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="field-label">Razón social / Nombre *</label>
        <InputText v-model="f.razon_social_nombre" class="w-full" :invalid="!!errores.razon_social_nombre" required />
        <small v-if="errores.razon_social_nombre" class="text-red-500 text-xs">{{ errores.razon_social_nombre }}</small>
      </div>
      <div>
        <label class="field-label">NIT / Cédula</label>
        <InputText v-model="f.nit_cedula" class="w-full" :invalid="!!errores.nit_cedula" />
        <small v-if="errores.nit_cedula" class="text-red-500 text-xs">{{ errores.nit_cedula }}</small>
      </div>
      <div>
        <label class="field-label">Tipo de persona</label>
        <Select v-model="f.tipo_persona" :options="['natural', 'juridica']" class="w-full" placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label class="field-label">Representante legal</label>
        <InputText v-model="f.representante_legal" class="w-full" />
      </div>
      <div>
        <label class="field-label">Correo</label>
        <InputText v-model="f.correo_electronico" type="email" class="w-full" :invalid="!!errores.correo_electronico" />
        <small v-if="errores.correo_electronico" class="text-red-500 text-xs">{{ errores.correo_electronico }}</small>
      </div>
      <div>
        <label class="field-label">Teléfono</label>
        <InputText v-model="f.telefono_contacto" class="w-full" />
      </div>
      <div>
        <label class="field-label">Ciudad</label>
        <InputText v-model="f.ciudad" class="w-full" />
      </div>
      <div>
        <label class="field-label">Departamento</label>
        <InputText v-model="f.departamento" class="w-full" />
      </div>
      <div class="col-span-2">
        <label class="field-label">Dirección</label>
        <InputText v-model="f.direccion" class="w-full" />
      </div>
      <div>
        <label class="field-label">Origen del cliente</label>
        <Dropdown v-model="f.origen_tipo" :options="ORIGENES" optionLabel="label" optionValue="value"
                  showClear class="w-full" placeholder="—" />
      </div>
      <div>
        <label class="field-label">Quién lo recomendó/consiguió</label>
        <InputText v-model="f.origen_detalle" class="w-full" />
      </div>

      <!-- Información bancaria -->
      <div class="col-span-2">
        <div class="border-t pt-4 mt-1">
          <p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color: #915BD8;">Información bancaria</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="field-label">Banco</label>
              <InputText v-model="f.banco" class="w-full" placeholder="Ej: Bancolombia" />
            </div>
            <div>
              <label class="field-label">Tipo de cuenta</label>
              <Select v-model="f.tipo_cuenta" :options="['ahorros', 'corriente']" class="w-full" placeholder="Seleccionar" showClear />
            </div>
            <div>
              <label class="field-label">Número de cuenta</label>
              <InputText v-model="f.numero_cuenta" class="w-full" />
            </div>
            <div>
              <label class="field-label">Titular de la cuenta</label>
              <InputText v-model="f.titular_cuenta" class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label class="field-label">IVA %</label>
        <InputNumber v-model="f.iva_pct" :maxFractionDigits="2" locale="en-US" class="w-full" />
      </div>
      <div>
        <label class="field-label">Retención %</label>
        <InputNumber v-model="f.retencion_pct" :maxFractionDigits="2" locale="en-US" class="w-full" />
      </div>
      <div>
        <label class="field-label">ReteICA %</label>
        <InputNumber v-model="f.reteica_pct" :maxFractionDigits="4" locale="en-US" class="w-full" />
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
import { useToast } from 'primevue/usetoast'
import { sanitizeObject } from '@/utils/sanitizer'
import { clienteSchema } from '@/utils/schemas/clientSchemas'
import { zodErrorsByField, showZodError } from '@/utils/schemas/validationError'

const toast = useToast()

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

// Errores de validación por campo (se pintan bajo cada Input).
const errores = reactive({})

function submit() {
  // 1) Armar payload omitiendo vacíos (comportamiento previo).
  const payload = {}
  for (const [k, v] of Object.entries(f)) {
    if (v !== null && v !== undefined && v !== '') payload[k] = v
  }
  // 2) Limpieza NO destructiva (solo caracteres de control + trim): este texto
  //    se persiste tal cual; mutilarlo en silencio corrompe datos del cliente.
  const limpio = sanitizeObject(payload, { stripMarkup: false })
  // 3) Validar contra el esquema de cliente.
  const result = clienteSchema.safeParse(limpio)
  Object.keys(errores).forEach((k) => delete errores[k])
  if (!result.success) {
    Object.assign(errores, zodErrorsByField(result.error))
    showZodError(toast, result.error, 'Revisa los datos del cliente')
    return
  }
  // 4) Emitir los datos ya saneados y validados.
  emit('save', result.data)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
