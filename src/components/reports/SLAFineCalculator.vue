<template>
  <div class="slc-card" :class="metrics?.breached ? 'slc-card--warn' : 'slc-card--ok'">
    <div class="slc-head">
      <i :class="metrics?.breached ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle'"
         :style="{ color: metrics?.breached ? '#D97706' : '#15803D' }" />
      <h3 class="slc-title">Calculadora de multa SLA</h3>
      <span class="slc-status" :class="metrics?.breached ? 'slc-status--warn' : 'slc-status--ok'">
        {{ metrics?.breached ? 'Umbral incumplido' : 'Dentro del umbral' }}
      </span>
    </div>

    <div class="slc-body">
      <!-- Cumplimiento vs umbral -->
      <div class="slc-row">
        <span class="slc-label">Cumplimiento del mes</span>
        <span class="slc-num" :class="metrics?.breached ? 'slc-neg' : 'slc-pos'">
          {{ pct(metrics?.compliancePct) }}
        </span>
      </div>
      <div class="slc-bar">
        <div class="slc-bar-fill" :class="metrics?.breached ? 'slc-bar-fill--warn' : 'slc-bar-fill--ok'"
             :style="{ width: barWidth }" />
        <div class="slc-bar-threshold" :style="{ left: thresholdLeft }"
             v-tooltip.top="`Umbral SLA: ${metrics?.slaThresholdPct ?? 90}%`" />
      </div>
      <p class="slc-hint">
        Umbral SLA: <b>{{ metrics?.slaThresholdPct ?? 90 }}%</b> ·
        Déficit: <b>{{ mwh(metrics?.underGenerationMWh) }}</b> ·
        Tasa: <b>{{ fmt(metrics?.penaltyRate) }}/MWh</b>
      </p>

      <!-- Caja de multa (solo si incumple) -->
      <div v-if="metrics?.breached" class="slc-fine">
        <div class="slc-fine-item">
          <span class="slc-fine-label">Multa estimada (mes)</span>
          <span class="slc-fine-value">{{ fmt(metrics?.fineEstimated) }}</span>
        </div>
        <div class="slc-fine-item">
          <span class="slc-fine-label">Multa acumulada YTD</span>
          <span class="slc-fine-value">{{ fmt(metrics?.fineYtd) }}</span>
        </div>
      </div>
      <div v-else class="slc-okmsg">
        <i class="pi pi-shield" /> Sin multa proyectada: la generación cumple la obligación contractual.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatMWh } from '@/utils/financialCalculations'

const props = defineProps({
  // complianceMetrics del servicio agregador:
  // { compliancePct, slaThresholdPct, breached, penaltyRate,
  //   underGenerationMWh, fineEstimated, fineYtd }
  metrics: { type: Object, default: () => ({}) },
})

const fmt = (v) => formatCurrency(v)
const mwh = (v) => formatMWh(v)
const pct = (v) => (v == null ? '—' : `${v.toFixed(1)}%`)

const barWidth = computed(() => {
  const v = props.metrics?.compliancePct
  if (v == null) return '0%'
  return `${Math.max(0, Math.min(100, v))}%`
})
const thresholdLeft = computed(() => {
  const t = props.metrics?.slaThresholdPct ?? 90
  return `${Math.max(0, Math.min(100, t))}%`
})
</script>

<style scoped>
.slc-card {
  border-radius: 14px;
  border: 1px solid #e8e0f0;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.05);
  font-family: 'Sora', system-ui, sans-serif;
  overflow: hidden;
  background: #fff;
}
.slc-card--warn { border-color: #FBD9A5; background: #FFFCF6; }
.slc-card--ok { border-color: #C9EBD5; background: #FbFEFB; }

.slc-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid #f0ebf6;
}
.slc-title { font-size: 13px; font-weight: 700; color: #2C2039; margin: 0; }
.slc-status { margin-left: auto; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.slc-status--warn { background: #FEF3C7; color: #B45309; }
.slc-status--ok { background: #DCFCE7; color: #15803D; }

.slc-body { padding: 12px 14px; }
.slc-row { display: flex; align-items: baseline; justify-content: space-between; }
.slc-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: #8a7ba6; font-weight: 600; }
.slc-num { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }
.slc-pos { color: #15803D; }
.slc-neg { color: #D97706; }

.slc-bar {
  position: relative; height: 8px; border-radius: 5px;
  background: #EEE9F5; margin: 8px 0 6px; overflow: visible;
}
.slc-bar-fill { height: 100%; border-radius: 5px; transition: width .3s; }
.slc-bar-fill--ok { background: #22C55E; }
.slc-bar-fill--warn { background: #F59E0B; }
.slc-bar-threshold {
  position: absolute; top: -3px; width: 2px; height: 14px;
  background: #6B5A8A; border-radius: 1px;
}
.slc-hint { font-size: 10.5px; color: #6B5A8A; margin: 2px 0 0; }
.slc-hint b { color: #2C2039; }

.slc-fine {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  margin-top: 12px; padding: 10px 12px;
  background: #FEF3C7; border: 1px solid #FBD9A5; border-radius: 10px;
}
.slc-fine-item { display: flex; flex-direction: column; gap: 3px; }
.slc-fine-label { font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color: #92650B; font-weight: 600; }
.slc-fine-value { font-size: 16px; font-weight: 800; color: #B45309; font-variant-numeric: tabular-nums; }

.slc-okmsg {
  margin-top: 12px; padding: 8px 12px; border-radius: 10px;
  background: #DCFCE7; color: #15803D; font-size: 11.5px; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}

@media (max-width: 640px) {
  .slc-fine { grid-template-columns: 1fr; }
}
</style>
