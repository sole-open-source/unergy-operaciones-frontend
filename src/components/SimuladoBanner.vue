<template>
  <!--
    Aviso anti-fabricación: mientras el backend de generación real no exista, la
    sección de Rendimiento se alimenta de datos DEMO deterministas (ver
    rendimientoService.js). Las cifras NO son generación real. Este banner hace
    ese hecho imposible de pasar por alto para que nadie tome una decisión
    operativa/financiera sobre números de ejemplo.
  -->
  <div v-if="activo" class="rounded-lg px-3 py-2 flex items-start gap-2 text-xs"
       style="background:rgba(245,158,11,0.10); color:#B45309; border:1px solid rgba(245,158,11,0.35);"
       role="status" aria-live="polite">
    <i class="pi pi-exclamation-triangle mt-0.5" />
    <span>
      <strong>Datos simulados.</strong> El backend de generación real aún no está
      disponible: las cifras de "Real" mostradas son un ejemplo determinista, no
      generación medida. Activa <em>Datos reales</em> cuando el backend esté listo.
    </span>
  </div>
</template>

<script setup>
// `activo` = la vista está en modo demo/mock. Cuando es false el banner no
// renderiza (datos reales → sin advertencia).
defineProps({
  activo: { type: Boolean, default: false },
})
</script>
