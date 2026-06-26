<template>
  <button
    v-if="doc != null"
    type="button"
    class="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-purple-100"
    style="color:#7c3aed"
    :title="tooltip || doc.nombre_archivo || 'Ver documento'"
    @click="$emit('click', doc)">
    <i class="pi pi-file-pdf" style="font-size:14px" />
  </button>
  <span
    v-else
    class="inline-flex items-center justify-center w-7 h-7 cursor-default"
    style="color:#d1d5db"
    title="Sin documento">
    <i class="pi pi-file-pdf" style="font-size:14px" />
  </span>
</template>

<script setup>
defineProps({
  doc:     { type: Object, default: null },   // null → estado vacío
  tooltip: { type: String, default: null },
})
defineEmits(['click'])
</script>
