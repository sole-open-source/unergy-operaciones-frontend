<template>
  <div class="p-4 md:p-6">
    <div class="mb-4">
      <h1 class="text-xl font-bold" style="color: #2C2039;">Proyectos próximos a energizarse</h1>
      <p class="text-sm mt-1" style="color: #7a6e8a;">
        Pipeline de TSF/Solenium sincronizado en la base de operaciones: proyectos en construcción
        cuya fecha de energización aún no ha llegado. Los datos vienen tal cual de la fuente;
        filtra por frontera asignada.
      </p>
    </div>
    <ProyectosProximosEnergizar />
  </div>
</template>

<script setup>
import ProyectosProximosEnergizar from '@/components/ProyectosProximosEnergizar.vue'
</script>
