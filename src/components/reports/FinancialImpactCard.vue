<template>
  <div class="fic-card">
    <div class="fic-head">
      <i class="pi pi-wallet text-sm" style="color:#915BD8" />
      <h3 class="fic-title">Impacto financiero</h3>
      <i class="pi pi-info-circle fic-info"
         v-tooltip.top="data?.liquidada
           ? 'Estado de Resultados (espejo del Panel Contable del período). Ingreso neto = Ingresos − Costos totales.'
           : 'Neto = Ingresos PPA + Liquidaciones XM − Multas SLA (proyectadas). Las liquidaciones XM pueden ser positivas (spot > PPA) o negativas.'" />
    </div>

    <!-- Desglose del Estado de Resultados (espejo del Panel Contable) -->
    <div v-if="data?.liquidada" class="fic-grid">
      <div class="fic-item">
        <span class="fic-label">Ingresos de energía (PPA)</span>
        <span class="fic-value fic-pos">{{ fmt(data?.ingresoPPA) }}</span>
      </div>
      <div class="fic-item">
        <span class="fic-label">Costos totales</span>
        <span class="fic-value" :class="(data?.costosTotales || 0) > 0 ? 'fic-neg' : 'fic-muted'">
          {{ (data?.costosTotales || 0) > 0 ? '−' + fmt(data.costosTotales) : fmt(0) }}
        </span>
      </div>
      <div class="fic-item">
        <span class="fic-label">Margen</span>
        <span class="fic-value fic-pos">{{ margenPct }}</span>
      </div>
      <div class="fic-item fic-item--net">
        <span class="fic-label">Ingreso neto (Estado de Resultados)</span>
        <span class="fic-value fic-value--net" :class="signCls(data?.neto)">{{ fmt(data?.neto) }}</span>
      </div>
    </div>

    <!-- Desglose estimado (mock, o real sin liquidación cargada) -->
    <div v-else class="fic-grid">
      <!-- Ingresos PPA -->
      <div class="fic-item">
        <span class="fic-label">Total Ingresos PPA</span>
        <span class="fic-value fic-pos">{{ fmt(data?.ingresoPPA) }}</span>
      </div>

      <!-- Liquidaciones XM (puede ser + o −) -->
      <div class="fic-item">
        <span class="fic-label">Liquidaciones XM</span>
        <span class="fic-value" :class="signCls(data?.liquidacionXM)">{{ fmt(data?.liquidacionXM) }}</span>
      </div>

      <!-- Multas SLA (siempre resta) -->
      <div class="fic-item">
        <span class="fic-label">Multas SLA (proyectadas)</span>
        <span class="fic-value" :class="(data?.multaSLA || 0) > 0 ? 'fic-neg' : 'fic-muted'">
          {{ (data?.multaSLA || 0) > 0 ? '−' + fmt(data.multaSLA) : fmt(0) }}
        </span>
      </div>

      <!-- Neto mensual -->
      <div class="fic-item fic-item--net">
        <span class="fic-label">Neto mensual</span>
        <span class="fic-value fic-value--net" :class="signCls(data?.neto)">{{ fmt(data?.neto) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/financialCalculations'

const props = defineProps({
  // Mock: { ingresoPPA, liquidacionXM, multaSLA, neto }
  // Real (Panel Contable): { ingresoPPA, costosTotales, neto, liquidada }
  data: { type: Object, default: () => ({}) },
})

const fmt = (v) => formatCurrency(v ?? 0)
const signCls = (v) => (Number(v) < 0 ? 'fic-neg' : 'fic-pos')

// Margen = neto / ingresos (Estado de Resultados). '—' si no hay ingreso.
const margenPct = computed(() => {
  const ing = Number(props.data?.ingresoPPA) || 0
  if (ing <= 0) return '—'
  return `${((Number(props.data?.neto) || 0) / ing * 100).toFixed(1)}%`
})
</script>

<style scoped>
.fic-card {
  background: #fff;
  border: 1px solid #e8e0f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.05);
  font-family: 'Sora', system-ui, sans-serif;
  overflow: hidden;
}
.fic-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid #f0ebf6;
}
.fic-title { font-size: 13px; font-weight: 700; color: #2C2039; margin: 0; }
.fic-info { font-size: 12px; color: #b9add0; margin-left: auto; cursor: help; }

.fic-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #f0ebf6;
}
.fic-item {
  background: #fff;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 4px;
}
.fic-item--net { grid-column: 1 / -1; background: #FBF9FE; }
.fic-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: #8a7ba6; font-weight: 600; }
.fic-value { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
.fic-value--net { font-size: 22px; }
.fic-pos { color: #15803D; }
.fic-neg { color: #DC2626; }
.fic-muted { color: #9ca3af; }

@media (max-width: 640px) {
  .fic-grid { grid-template-columns: 1fr; }
  .fic-item--net { grid-column: auto; }
}
</style>
