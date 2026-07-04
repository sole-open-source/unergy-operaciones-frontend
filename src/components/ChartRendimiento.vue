<template>
  <div class="cr-card">
    <div class="cr-head">
      <i class="pi pi-chart-bar text-sm" style="color:#915BD8" />
      <h3 class="cr-title">{{ title }}</h3>
      <span class="cr-sub">MWh por mes · Real vs. simulado</span>
    </div>

    <div class="cr-body">
      <div v-if="loading" class="cr-empty">
        <i class="pi pi-spin pi-spinner text-2xl mb-2" style="color:#915BD8" />
        <p>Cargando rendimiento…</p>
      </div>

      <template v-else-if="hasData">
        <!-- Leyenda interactiva: click para mostrar/ocultar cada serie -->
        <div class="cr-legend">
          <button v-for="s in seriesMeta" :key="s.key" type="button" class="cr-lg"
                  :class="{ 'cr-off': !visible[s.key] }" @click="visible[s.key] = !visible[s.key]">
            <i class="cr-dot" :class="{ 'cr-dash': s.dashed }" :style="{ '--c': s.color }" />
            {{ s.label }}
          </button>
        </div>

        <div class="cr-chart">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </template>

      <div v-else class="cr-empty">
        <i class="pi pi-chart-bar text-3xl mb-2" style="color:#e0d5f0" />
        <p>{{ emptyMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, LineController, Tooltip, Legend,
} from 'chart.js'
import { formatMWh } from '@/utils/financialCalculations'

// El componente <Bar> registra su propio controlador de barras; los datasets de
// tipo 'line' (P50/P90/P99) necesitan además LineController/LineElement/PointElement.
ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, LineController, Tooltip, Legend,
)

const props = defineProps({
  // [{ label, real_mwh, p50, p90, p99, estado_operacional }]
  series: { type: Array, default: () => [] },
  title: { type: String, default: 'Rendimiento' },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'Sin datos de rendimiento para el período.' },
})

const seriesMeta = [
  { key: 'real', label: 'Real', color: '#915BD8', dashed: false },
  { key: 'p50', label: 'P50', color: '#10B981', dashed: true },
  { key: 'p90', label: 'P90', color: '#F0C040', dashed: true },
  { key: 'p99', label: 'P99', color: '#D64455', dashed: true },
]

const visible = reactive({ real: true, p50: true, p90: true, p99: true })

const hasData = computed(() => props.series.some(
  d => d.real_mwh != null || d.p50 != null || d.p90 != null || d.p99 != null,
))

const labels = computed(() => props.series.map(d => d.label))

const chartData = computed(() => {
  const datasets = []
  if (visible.real) {
    datasets.push({
      type: 'bar',
      label: 'Real',
      data: props.series.map(d => (d.real_mwh == null ? null : Number(d.real_mwh))),
      backgroundColor: '#915BD8',
      borderRadius: 3,
      maxBarThickness: 34,
      order: 5,
    })
  }
  const lineSpec = [
    { key: 'p50', label: 'P50', color: '#10B981' },
    { key: 'p90', label: 'P90', color: '#F0C040' },
    { key: 'p99', label: 'P99', color: '#D64455' },
  ]
  for (const spec of lineSpec) {
    if (!visible[spec.key]) continue
    datasets.push({
      type: 'line',
      label: spec.label,
      data: props.series.map(d => (d[spec.key] == null ? null : Number(d[spec.key]))),
      borderColor: spec.color,
      backgroundColor: spec.color,
      borderDash: [6, 4],
      borderWidth: 1.8,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      spanGaps: true,
      fill: false,
      order: 1,
    })
  }
  return { labels: labels.value, datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false }, // usamos la leyenda interactiva propia
    tooltip: {
      callbacks: {
        label: (c) => `${c.dataset.label}: ${formatMWh(c.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 9 }, color: '#9ca3af', maxTicksLimit: 24 }, grid: { display: false } },
    y: { ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}
</script>

<style scoped>
.cr-card {
  background: #fff;
  border: 1px solid #e8e0f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.05);
  font-family: 'Sora', system-ui, sans-serif;
  display: flex; flex-direction: column; height: 100%;
  overflow: hidden;
}
.cr-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid #f0ebf6;
}
.cr-title { font-size: 13px; font-weight: 700; color: #2C2039; margin: 0; }
.cr-sub { font-size: 10.5px; color: #9b8fb0; margin-left: auto; }
.cr-body { flex: 1; padding: 12px 14px; }
.cr-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.cr-lg {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: #6B5A8A; font-weight: 600;
  background: #F4F1FA; border: 1px solid transparent; border-radius: 999px;
  padding: 3px 10px; cursor: pointer; transition: opacity .15s, background .15s;
}
.cr-lg:hover { background: #ece5f7; }
.cr-off { opacity: 0.4; text-decoration: line-through; }
.cr-dot { width: 12px; height: 4px; border-radius: 2px; display: inline-block; background: var(--c); }
.cr-dot:not(.cr-dash) { height: 10px; width: 10px; border-radius: 3px; }
.cr-dash { background: repeating-linear-gradient(90deg, var(--c) 0 4px, transparent 4px 7px); }
.cr-chart { height: 300px; }
.cr-empty { text-align: center; padding: 40px 0; color: #9b8fb0; font-size: 12px; }
</style>
