<template>
  <div class="plc-wrap">
    <Line v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="plc-empty">
      <i class="pi pi-chart-line" />
      <span>Sin datos de potencia hoy</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { TIME_LABELS, inverterSeries, meterSeries } from '@/mobile/solarSeries'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  detail: { type: Object, default: null },
})

const inv = computed(() => inverterSeries(props.detail))
const med = computed(() => meterSeries(props.detail))
const hasData = computed(() => !!(inv.value || med.value))

const chartData = computed(() => {
  const datasets = []
  if (inv.value) {
    datasets.push({
      label: 'Inversores',
      data: inv.value,
      borderColor: '#915BD8',
      backgroundColor: 'rgba(145,91,216,0.15)',
      fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5, spanGaps: true,
    })
  }
  if (med.value) {
    datasets.push({
      label: 'Medidor',
      data: med.value,
      borderColor: '#14B8A6',
      backgroundColor: 'rgba(20,184,166,0.12)',
      fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5, spanGaps: true,
    })
  }
  return { labels: TIME_LABELS, datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'circle',
        font: { size: 12 }, color: '#2C2039', padding: 14 },
    },
    tooltip: {
      backgroundColor: '#ffffff', titleColor: '#374151', bodyColor: '#4b5563',
      borderColor: '#e5e7eb', borderWidth: 1, padding: 10, displayColors: true,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y != null
          ? ctx.parsed.y.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '—'} kW`,
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, color: '#9ca3af', maxTicksLimit: 7, autoSkip: true },
      grid: { color: 'rgba(28,18,50,0.05)' } },
    y: { beginAtZero: true, ticks: { font: { size: 10 }, color: '#9ca3af' },
      grid: { color: 'rgba(28,18,50,0.05)' } },
  },
}
</script>

<style scoped>
.plc-wrap { position: relative; width: 100%; height: 100%; }
.plc-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; height: 100%; color: #9ca3af; font-size: 13px;
}
.plc-empty .pi { font-size: 30px; color: #d1d5db; }
</style>
