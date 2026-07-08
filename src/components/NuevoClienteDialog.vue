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
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Documentos
        </p>
        <p class="text-xs text-gray-400 mb-3">
          Sube los archivos de forma segura a la nube de Unergy (PDF, JPG, PNG o WEBP · máx. {{ maxSizeMb }} MB).
        </p>
        <div class="space-y-3">
          <div v-for="doc in documentos" :key="doc.tipo" class="flex flex-col gap-1">
            <label class="field-label">{{ doc.label }}</label>
            <div class="flex items-center gap-2">
              <label class="doc-btn">
                <i class="pi pi-upload text-xs" />
                {{ doc.file ? 'Cambiar' : 'Seleccionar archivo' }}
                <input type="file" :accept="accept" class="hidden"
                  @change="onSelect(doc, $event)" />
              </label>
              <template v-if="doc.file">
                <span class="text-sm truncate max-w-[220px]" style="color: #2C2039;">{{ doc.file.name }}</span>
                <button type="button" class="text-red-400 hover:text-red-600 shrink-0"
                  @click="quitarArchivo(doc)" aria-label="Quitar archivo">
                  <i class="pi pi-times text-xs" />
                </button>
              </template>
              <span v-else class="text-sm" style="color: #bba8d4;">Sin archivo</span>
            </div>
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
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import {
  uploadClienteDocumento,
  validarArchivo,
  DOCUMENTO_ACCEPT,
  DOCUMENTO_MAX_SIZE,
} from '@/services/documentService'

defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible', 'creado'])

const toast = useToast()
const accept = DOCUMENTO_ACCEPT
const maxSizeMb = DOCUMENTO_MAX_SIZE / 1024 / 1024

const guardando = ref(false)
const errores = reactive({})

const form = reactive({
  razon_social_nombre: '',
  nit_cedula: '',
  tipo_persona: null,
})

// Documentos de identificación. Cada uno conserva su `tipo` porque el backend
// requiere categorizar el documento (rut / camara_comercio / certificado_bancario).
const documentos = reactive([
  { tipo: 'rut', nombre: 'RUT', label: 'RUT', file: null },
  { tipo: 'camara_comercio', nombre: 'Cámara de comercio', label: 'Cámara de comercio', file: null },
  { tipo: 'certificado_bancario', nombre: 'Certificación bancaria', label: 'Certificación bancaria', file: null },
])

function onSelect(doc, e) {
  const file = e.target.files?.[0] || null
  // Permite reseleccionar el mismo archivo más tarde.
  e.target.value = ''
  if (!file) return

  const error = validarArchivo(file)
  if (error) {
    toast.add({ severity: 'warn', summary: 'Archivo no válido', detail: `${doc.label}: ${error}`, life: 5000 })
    return
  }
  doc.file = file
}

function quitarArchivo(doc) {
  doc.file = null
}

function resetForm() {
  form.razon_social_nombre = ''
  form.nit_cedula = ''
  form.tipo_persona = null
  documentos.forEach(d => { d.file = null })
  errores.nombre = null
  errores.nit = null
}

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
    })

    // Subir los archivos seleccionados al almacenamiento seguro de Unergy.
    const pendientes = documentos.filter(d => d.file)
    const fallidos = []
    for (const doc of pendientes) {
      try {
        await uploadClienteDocumento(cliente.id, {
          tipo: doc.tipo,
          nombre: doc.nombre,
          file: doc.file,
        })
      } catch (err) {
        fallidos.push(doc.label)
      }
    }

    if (fallidos.length) {
      toast.add({
        severity: 'warn',
        summary: 'Cliente creado con advertencias',
        detail: `No se pudo subir: ${fallidos.join(', ')}. Puedes reintentarlo desde la ficha del cliente.`,
        life: 6000,
      })
    } else {
      toast.add({ severity: 'success', summary: 'Cliente creado', life: 3000 })
    }

    emit('creado', cliente)
    emit('update:visible', false)
    resetForm()
  } catch (e) {
    errores.nombre = e.response?.data?.detail || e.message
  } finally {
    guardando.value = false
  }
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
.doc-btn {
  @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
    text-gray-700 bg-gray-50 border border-gray-200 cursor-pointer whitespace-nowrap
    hover:bg-gray-100 transition-colors shrink-0;
}
</style>
