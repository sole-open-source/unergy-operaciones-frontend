<template>
  <div class="ppc-card">
    <div class="ppc-head">
      <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
      <h3 class="ppc-title">Generación real vs. contratada</h3>
      <span class="ppc-sub">MWh por día · {{ periodoLabel }}</span>
    </div>

    <div class="ppc-body">
      <template v-if="serie.length">
        <div class="ppc-chart">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div class="ppc-legend">
          <span class="ppc-lg"><i class="ppc-dot" style="background:#915BD8" /> Generación real</span>
          <span class="ppc-lg"><i class="ppc-dot" style="background:#94a3b8" /> Generación contratada</span>
          <span class="ppc-lg"><i class="ppc-dot" style="background:rgba(220,38,38,.35)" /> Déficit (dispara SLA)</span>
        </div>
      </template>

      <div v-else class="ppc-empty">
        <i class="pi pi-chart-line text-3xl mb-2" style="color:#e0d5f0" />
        <p>Sin datos de generación para este período.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { formatMWh } from '@/utils/financialCalculations'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({
  // [{ fecha:'YYYY-MM-DD', real:Number, contratada:Number }]
  serie: { type: Array, default: () => [] },
  periodoLabel: { type: String, default: '' },
})

const labels = computed(() => props.serie.map(d => Number(String(d.fecha).split('-')[2])))

// Serie "déficit": cuando la real cae por debajo de la contratada, se pinta el
// área roja entre ambas para señalar visualmente lo que dispara la multa SLA.
const deficitFill = computed(() =>
  props.serie.map(d => {
    const real = Number(d.real) || 0
    const cont = Number(d.contratada) || 0
    return real < cont ? cont : real   // techo del área = mayor de las dos
  })
)

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    // Banda de déficit (debajo, se rellena hacia la línea real).
    {
      label: 'Déficit',
      data: deficitFill.value,
      borderColor: 'transparent',
      backgroundColor: 'rgba(220,38,38,0.14)',
      pointRadius: 0,
      fill: '-1',            // rellena hacia el dataset anterior (real)
      order: 3,
      tension: 0.3,
      spanGaps: true,
    },
    // Generación real.
    {
      label: 'Generación real',
      data: props.serie.map(d => (d.real == null ? null : Number(d.real))),
      borderColor: '#915BD8',
      backgroundColor: 'rgba(145,91,216,0.10)',
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      fill: false,
      order: 1,
      tension: 0.3,
      spanGaps: true,
    },
    // Generación contratada (referencia punteada).
    {
      label: 'Generación contratada',
      data: props.serie.map(d => (d.contratada == null ? null : Number(d.contratada))),
      borderColor: '#94a3b8',
      borderDash: [5, 4],
      pointRadius: 0,
      borderWidth: 1.5,
      fill: false,
      order: 2,
      tension: 0.3,
      spanGaps: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      filter: (item) => item.dataset.label !== 'Déficit',
      callbacks: {
        title: (items) => `Día ${items[0].label}`,
        label: (c) => `${c.dataset.label}: ${formatMWh(c.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 9 }, color: '#9ca3af', maxTicksLimit: 16 }, grid: { display: false } },
    y: { ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}
</script>

<style scoped>
.ppc-card {
  background: #fff;
  border: 1px solid #e8e0f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.05);
  font-family: 'Sora', system-ui, sans-serif;
  display: flex; flex-direction: column; height: 100%;
  overflow: hidden;
}
.ppc-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid #f0ebf6;
}
.ppc-title { font-size: 13px; font-weight: 700; color: #2C2039; margin: 0; }
.ppc-sub { font-size: 10.5px; color: #9b8fb0; margin-left: auto; }
.ppc-body { flex: 1; padding: 12px 14px; }
.ppc-chart { height: 220px; }
.ppc-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; }
.ppc-lg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: #6B5A8A; font-weight: 600; }
.ppc-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.ppc-empty { text-align: center; padding: 32px 0; color: #9b8fb0; font-size: 12px; }
</style>
