<template>
  <div class="p-4 md:p-6">
    <div class="mb-4">
      <h1 class="text-xl font-bold" style="color: #2C2039;">Proyectos próximos a energizarse</h1>
      <p class="text-sm mt-1" style="color: #7a6e8a;">
        Pipeline de TSF/Solenium sincronizado en la base de operaciones, más proyectos registrados
        cuya fecha de inicio aún no ha llegado. Ajusta fechas y relaciónalos con contratos PPA.
      </p>
    </div>
    <ProyectosProximosEnergizar />
  </div>
</template>

<script setup>
import ProyectosProximosEnergizar from '@/components/ProyectosProximosEnergizar.vue'
</script>
