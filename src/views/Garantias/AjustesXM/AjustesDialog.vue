<template>
  <Dialog :visible="visible" modal header="Ajustes" style="width:420px" @update:visible="$emit('close')">
    <p class="text-sm" style="color:#6b5a8a">Configuración — próximamente</p>
    <template #footer>
      <Button label="Cerrar" text @click="$emit('close')" />
    </template>
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
defineProps({ visible: Boolean })
defineEmits(['close'])
</script>
