<template>
  <form @submit.prevent="submit" class="space-y-4 pt-2">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="field-label">Razón social / Nombre *</label>
        <InputText v-model="f.razon_social_nombre" class="w-full" required />
      </div>
      <div>
        <label class="field-label">NIT / Cédula</label>
        <InputText v-model="f.nit_cedula" class="w-full" />
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
        <InputNumber v-model="f.iva_pct" :maxFractionDigits="2" class="w-full" />
      </div>
      <div>
        <label class="field-label">Retención %</label>
        <InputNumber v-model="f.retencion_pct" :maxFractionDigits="2" class="w-full" />
      </div>
      <div>
        <label class="field-label">ReteICA %</label>
        <InputNumber v-model="f.reteica_pct" :maxFractionDigits="4" class="w-full" />
      </div>

      <!-- ── Correos de contacto ── -->
      <div class="col-span-2">
        <div class="border-t pt-4 mt-1">
          <p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color: #915BD8;">✉️ Correos de contacto</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="field-label">Correo Liquidación</label>
              <InputText v-model="f.correo_liquidacion" type="email" class="w-full" placeholder="liquidacion@empresa.com" />
            </div>
            <div>
              <label class="field-label">Correo Monitoreo</label>
              <InputText v-model="f.correo_monitoreo" type="email" class="w-full" placeholder="monitoreo@empresa.com" />
            </div>
            <div class="col-span-2">
              <label class="field-label">Correo Soporte / Atención</label>
              <InputText v-model="f.correo_soporte" type="email" class="w-full" placeholder="soporte@empresa.com" />
            </div>

            <!-- ── Correos Operacionales (múltiples) ── -->
            <div class="col-span-2">
              <div class="rounded-xl p-4 space-y-3" style="background:#f9f7ff;border:1.5px solid #e8e0f0;">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wide" style="color:#915BD8;">
                      <i class="pi pi-send text-xs mr-1" />
                      Correos Operacionales para notificaciones
                    </p>
                    <p class="text-xs mt-0.5" style="color:#9b89b5;">Se enviarán aquí las notificaciones de fallas.</p>
                  </div>
                  <button type="button" @click="agregarCorreo"
                    class="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style="background:#915BD8;color:#fff;">
                    <i class="pi pi-plus text-xs" /> Agregar
                  </button>
                </div>

                <div v-if="!f.correos_operacionales?.length" class="text-xs italic py-1" style="color:#c4b3df;">
                  Sin correos operacionales configurados
                </div>

                <div v-for="(email, idx) in f.correos_operacionales" :key="idx"
                  class="flex items-center gap-2">
                  <div class="flex-1 relative">
                    <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color:#9b89b5;" />
                    <input
                      :value="email"
                      @input="actualizarCorreo(idx, $event.target.value)"
                      type="email"
                      :placeholder="`correo${idx+1}@empresa.com`"
                      class="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
                      :style="emailValido(email) ? 'border:1.5px solid #e8e0f0;background:#fff;' : 'border:1.5px solid #fca5a5;background:#fff5f5;'"
                    />
                  </div>
                  <span v-if="!emailValido(email) && email" class="text-xs" style="color:#ef4444;white-space:nowrap;">Inválido</span>
                  <button type="button" @click="eliminarCorreo(idx)"
                    class="p-1.5 rounded-lg transition-colors hover:bg-red-50">
                    <i class="pi pi-trash text-xs" style="color:#ef4444;" />
                  </button>
                </div>

                <div v-if="f.correos_operacionales?.length" class="flex items-center gap-2 pt-1">
                  <button type="button" @click="$emit('test-correo', f.correos_operacionales[0])"
                    :disabled="!emailValido(f.correos_operacionales[0])"
                    class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    style="border:1px solid #915BD8;color:#915BD8;background:transparent;">
                    <i class="pi pi-send text-xs" /> Enviar correo de prueba
                  </button>
                  <span class="text-xs" style="color:#9b89b5;">al primer correo de la lista</span>
                </div>
              </div>
            </div>

          </div>
        </div>
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
import Button from 'primevue/button'

const props = defineProps({ initial: Object })
const emit = defineEmits(['save', 'cancel', 'test-correo'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function emailValido(e) { return !e || EMAIL_RE.test(e.trim()) }

const f = reactive({
  ...props.initial,
  correos_operacionales: Array.isArray(props.initial?.correos_operacionales)
    ? [...props.initial.correos_operacionales]
    : [],
})
watch(() => props.initial, (v) => {
  Object.assign(f, v)
  if (Array.isArray(v?.correos_operacionales)) {
    f.correos_operacionales = [...v.correos_operacionales]
  }
}, { deep: true })

function agregarCorreo()               { f.correos_operacionales = [...(f.correos_operacionales || []), ''] }
function eliminarCorreo(idx)           { f.correos_operacionales = f.correos_operacionales.filter((_, i) => i !== idx) }
function actualizarCorreo(idx, val)    { f.correos_operacionales = f.correos_operacionales.map((e, i) => i === idx ? val : e) }

function submit() {
  const payload = {}
  for (const [k, v] of Object.entries(f)) {
    if (v !== null && v !== undefined && v !== '') payload[k] = v
  }
  // Limpiar correos vacíos o inválidos antes de guardar
  payload.correos_operacionales = (f.correos_operacionales || [])
    .map(e => e.trim().toLowerCase())
    .filter(e => e && emailValido(e))
  emit('save', payload)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
