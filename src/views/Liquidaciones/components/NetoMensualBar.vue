<template>
  <div style="height: 200px">
    <Bar :data="data" :options="options" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { fmtCompact } from '@/utils/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps({ bars: { type: Array, default: () => [] } })

const data = computed(() => ({
  labels: props.bars.map(b => b.label),
  datasets: [{
    data: props.bars.map(b => b.neto),
    backgroundColor: props.bars.map(b => (b.neto >= 0 ? '#915BD8' : '#ef4444')),
    borderRadius: 4,
    maxBarThickness: 28,
  }],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => fmtCompact(c.parsed.y) } },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { display: false } },
    y: { ticks: { font: { size: 10 }, color: '#9ca3af', callback: (v) => fmtCompact(v) }, grid: { color: 'rgba(0,0,0,0.05)' } },
  },
}
</script>
