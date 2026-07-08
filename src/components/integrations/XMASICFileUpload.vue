<template>
  <!--
    Selector de archivo ASIC (Excel/CSV). Modo manual: el usuario elige el
    archivo y luego pulsa "Cargar". No llama al servicio — solo emite el File
    hacia el padre, que decide qué hacer con él.
  -->
  <FileUpload
    ref="uploader"
    name="file"
    mode="advanced"
    :auto="false"
    customUpload
    :multiple="false"
    :accept="accept"
    :maxFileSize="maxFileSize"
    :disabled="loading"
    chooseLabel="Elegir archivo"
    uploadLabel="Cargar"
    cancelLabel="Quitar"
    :showUploadButton="true"
    :showCancelButton="true"
    @select="onSelect"
    @uploader="onUpload"
    @clear="onClear"
    @remove="onRemove"
    @error="onError"
  >
    <template #empty>
      <div class="flex flex-col items-center justify-center py-6 text-center">
        <i class="pi pi-file-excel text-2xl mb-2" style="color:#915BD8" />
        <p class="text-sm text-gray-600">
          Arrastra aquí el archivo ASIC de XM o pulsa <strong>Elegir archivo</strong>.
        </p>
        <p class="text-xs text-gray-400 mt-1">Formatos: Excel (.xlsx, .xls) o CSV.</p>
      </div>
    </template>
  </FileUpload>
</template>

<script setup>
import { ref } from 'vue'
import FileUpload from 'primevue/fileupload'

const props = defineProps({
  // Deshabilita la selección/carga mientras el padre procesa la subida.
  loading: { type: Boolean, default: false },
  // Extensiones aceptadas (por defecto Excel/CSV del ASIC de XM).
  accept: { type: String, default: '.xlsx,.xls,.csv' },
  // Tamaño máximo permitido (bytes). Por defecto 10 MB.
  maxFileSize: { type: Number, default: 10 * 1024 * 1024 },
})

const emit = defineEmits(['file-selected', 'upload-initiated', 'cleared', 'error'])

const uploader = ref(null)

// El usuario seleccionó un archivo (o lo arrastró). Emitimos el primero.
function onSelect(event) {
  const file = event.files?.[0] || null
  if (file) emit('file-selected', file)
}

// customUpload → al pulsar "Cargar" recibimos el/los File aquí en vez de que
// PrimeVue haga la petición HTTP. Emitimos el File para que el padre lo suba.
function onUpload(event) {
  const file = event.files?.[0] || null
  if (file) emit('upload-initiated', file)
}

function onClear() {
  emit('cleared')
}

function onRemove(event) {
  // Si se quitó el último archivo, avisamos como "cleared".
  if (!event.files || event.files.length === 0) emit('cleared')
}

function onError(event) {
  emit('error', event)
}

// Permite al padre limpiar el selector tras una carga exitosa.
function clear() {
  uploader.value?.clear?.()
}

defineExpose({ clear })
</script>
