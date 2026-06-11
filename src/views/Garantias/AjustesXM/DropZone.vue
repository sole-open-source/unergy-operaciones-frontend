<template>
  <div
    class="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
    :style="dropStyle"
    @click="fileInput.click()"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls"
      class="hidden"
      @change="onSelect"
    />

    <div v-if="!file && !error" class="space-y-1">
      <i class="pi pi-file-excel text-2xl block" style="color:#c4b8d4" />
      <p class="text-sm font-medium" style="color:#6b5a8a">{{ label }}</p>
      <p class="text-xs" style="color:#9ca3af">Arrastra o haz clic</p>
    </div>

    <div v-else-if="error" class="space-y-1">
      <i class="pi pi-times-circle text-2xl block" style="color:#D64455" />
      <p class="text-sm font-medium" style="color:#D64455">{{ error }}</p>
      <p class="text-xs" style="color:#9ca3af">Haz clic para intentar de nuevo</p>
    </div>

    <div v-else class="space-y-1">
      <i class="pi pi-check-circle text-2xl block" style="color:#10B981" />
      <p class="text-sm font-medium truncate max-w-xs mx-auto" style="color:#2C2039">{{ file.name }}</p>
      <p class="text-xs" style="color:#10B981">Archivo cargado</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  label: { type: String, default: 'Subir archivo' },
  pattern: { type: RegExp, default: null },
})

const emit = defineEmits(['update:file', 'error'])

const fileInput = ref(null)
const file = ref(null)
const error = ref('')
const dragging = ref(false)

const dropStyle = computed(() => {
  if (error.value) return 'border-color:#D64455; background:#FEF2F2'
  if (file.value) return 'border-color:#10B981; background:#F0FDF4'
  if (dragging.value) return 'border-color:#915BD8; background:rgba(145,91,216,0.05)'
  return 'border-color:#c4b8d4; background:#fafafa'
})

function validate(f) {
  if (!f) return false
  if (props.pattern && !props.pattern.test(f.name)) {
    error.value = `Nombre no coincide: "${f.name}"`
    file.value = null
    emit('update:file', null)
    emit('error', error.value)
    return false
  }
  error.value = ''
  file.value = f
  emit('update:file', f)
  return true
}

function onSelect(e) {
  validate(e.target.files[0])
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  validate(e.dataTransfer.files[0])
}

function reset() {
  file.value = null
  error.value = ''
  emit('update:file', null)
}

defineExpose({ reset })
</script>
