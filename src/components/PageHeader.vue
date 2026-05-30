<template>
  <div class="ph-header">
    <div class="ph-lead">
      <slot name="lead" />
      <div class="min-w-0">
        <h1 class="ph-title">{{ title }}</h1>
        <p v-if="subtitle || $slots.subtitle" class="ph-subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="ph-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.ph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  flex-wrap: wrap;
}
.ph-lead {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.ph-title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.15;
  color: #2C2039;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ph-subtitle {
  font-size: 12px;
  color: #9b8fb0;
  margin-top: 1px;
}
.ph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
/* En pantallas chicas, las acciones ocupan todo el ancho y se alinean a la izquierda */
@media (max-width: 640px) {
  .ph-title { font-size: 16px; white-space: normal; }
  .ph-actions { width: 100%; }
}
</style>
