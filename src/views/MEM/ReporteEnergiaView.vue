<template>
  <div class="space-y-5">
    <PageHeader title="Reporte de Energía" />

    <div class="ret-tabs">
      <button :class="['ret-tab', tab === 'automatizacion' && 'ret-tab--on']" @click="tab = 'automatizacion'">
        <i class="pi pi-cog" /> Reporte ASIC
      </button>
      <button :class="['ret-tab', tab === 'cgm' && 'ret-tab--on']" @click="tab = 'cgm'">
        <i class="pi pi-envelope" /> Reporte CGM
      </button>
    </div>

    <div class="ret-body">
      <ReporteEnergiaAutomatizacionView v-show="tab === 'automatizacion'" />
      <ReporteCGMView v-show="tab === 'cgm'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ReporteEnergiaAutomatizacionView from '@/views/MEM/ReporteEnergiaAutomatizacionView.vue'
import ReporteCGMView from '@/views/MEM/ReporteCGMView.vue'

const tab = ref('automatizacion')
</script>

<style scoped>
.ret-tabs { display: flex; gap: 6px; border-bottom: 1px solid #eceaf2; padding: 0 2px; }
.ret-tab {
  display: flex; align-items: center; gap: 7px; border: none; background: none;
  font-size: 14px; font-weight: 700; color: #9b8db5; padding: 12px 16px; cursor: pointer;
  border-bottom: 2.5px solid transparent; margin-bottom: -1px;
}
.ret-tab .pi { font-size: 14px; }
.ret-tab--on { color: #6E3FB8; border-bottom-color: #915BD8; }
.ret-body { padding-top: 4px; }
</style>
