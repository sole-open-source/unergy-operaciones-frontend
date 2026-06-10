<template>
  <nav class="mtb">
    <RouterLink to="/m/solar" class="mtb-item" active-class="mtb-item--active">
      <i class="pi pi-sun" /><span>Generación</span>
    </RouterLink>
    <RouterLink to="/m/fallas" class="mtb-item" active-class="mtb-item--active">
      <i class="pi pi-wrench" /><span>Fallas</span>
    </RouterLink>
    <RouterLink to="/m/resumen" class="mtb-item" active-class="mtb-item--active">
      <i class="pi pi-chart-bar" /><span>Resumen</span>
    </RouterLink>
  </nav>
</template>

<script setup>
// Barra de navegación inferior de la app móvil. Compartida por las vistas /m/*.
</script>

<style scoped>
.mtb {
  display: flex; flex-shrink: 0;
  background: #fff; border-top: 1px solid #eceaf2;
  padding-bottom: env(safe-area-inset-bottom);
}
.mtb-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 9px 0 7px; text-decoration: none;
  color: #9b8db5; font-size: 11px; font-weight: 600;
}
.mtb-item .pi { font-size: 20px; }
.mtb-item--active { color: #915BD8; }
</style>
