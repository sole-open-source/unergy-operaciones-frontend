<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal
    header="Nuevo cliente" :style="{ width: '520px' }" :closable="true">
    <div class="space-y-4 py-2">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2 flex flex-col gap-1">
          <label class="field-label">Nombre / Razón social <span class="text-red-400">*</span></label>
          <InputText v-model="form.razon_social_nombre" class="w-full" placeholder="Ej: Terpel Energía S.A.S." />
          <p v-if="errores.nombre" class="text-xs text-red-400">{{ errores.nombre }}</p>
        </div>
        <div class="flex flex-col gap-1">
          <label class="field-label">NIT / Cédula <span class="text-red-400">*</span></label>
          <InputText v-model="form.nit_cedula" class="w-full" placeholder="Ej: 900123456-7" />
          <p v-if="errores.nit" class="text-xs text-red-400">{{ errores.nit }}</p>
        </div>
        <div class="flex flex-col gap-1">
          <label class="field-label">Tipo persona</label>
          <Select v-model="form.tipo_persona"
            :options="[{ label: 'Jurídica', value: 'juridica' }, { label: 'Natural', value: 'natural' }]"
            optionLabel="label" optionValue="value" placeholder="Seleccionar" showClear class="w-full" />
        </div>
      </div>

      <div class="border-t border-gray-100 pt-3">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Documentos <span class="normal-case font-normal">(links de Google Drive)</span>
        </p>
        <div class="space-y-3">
          <div class="flex flex-col gap-1">
            <label class="field-label">RUT</label>
            <InputText v-model="form.rut_url" class="w-full" placeholder="https://drive.google.com/…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="field-label">Cámara de comercio</label>
            <InputText v-model="cc_url" class="w-full" placeholder="https://drive.google.com/…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="field-label">Certificación bancaria</label>
            <InputText v-model="cert_url" class="w-full" placeholder="https://drive.google.com/…" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="$emit('update:visible', false)" />
      <Button label="Crear cliente" icon="pi pi-check" :loading="guardando" @click="guardar" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import api from '@/api/client'

defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible', 'creado'])

const guardando = ref(false)
const errores = reactive({})
const cc_url = ref('')
const cert_url = ref('')

const form = reactive({
  razon_social_nombre: '',
  nit_cedula: '',
  tipo_persona: null,
  rut_url: '',
})

async function guardar() {
  errores.nombre = form.razon_social_nombre.trim() ? null : 'Campo obligatorio'
  errores.nit = form.nit_cedula.trim() ? null : 'Campo obligatorio'
  if (errores.nombre || errores.nit) return

  guardando.value = true
  try {
    const { data: cliente } = await api.post('/clientes', {
      razon_social_nombre: form.razon_social_nombre.trim(),
      nit_cedula: form.nit_cedula.trim(),
      tipo_persona: form.tipo_persona,
      rut_url: form.rut_url.trim() || null,
    })

    const docs = [
      { tipo: 'camara_comercio', url: cc_url.value.trim(), nombre: 'Cámara de comercio' },
      { tipo: 'certificado_bancario', url: cert_url.value.trim(), nombre: 'Certificación bancaria' },
    ].filter(d => d.url)

    for (const d of docs) {
      await api.post(`/clientes/${cliente.id}/documentos`, {
        tipo: d.tipo,
        nombre: d.nombre,
        archivo_url: d.url,
        estado: 'aceptado',
      })
    }

    emit('creado', cliente)
    emit('update:visible', false)
  } catch (e) {
    errores.nombre = e.response?.data?.detail || e.message
  } finally {
    guardando.value = false
  }
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
