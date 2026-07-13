<template>
  <div class="rounded-xl border border-gray-100 bg-white p-4">
    <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
      <h3 class="font-semibold text-gray-700 text-sm">Precio de bolsa vs generación Unergy</h3>
      <span v-if="fecha" class="text-xs text-gray-400">{{ fecha }}</span>
    </div>

    <div v-if="!tieneDatos" class="flex flex-col items-center py-12 gap-2 text-gray-400">
      <i class="pi pi-chart-line text-3xl" />
      <p class="text-sm">Sin datos para esta fecha.</p>
      <p class="text-xs">No hay precios horarios de XM ni generación de la flota registrados.</p>
    </div>

    <template v-else>
      <div style="height: 320px">
        <Line :data="chartData" :options="chartOptions" :plugins="[bandaPicoPlugin]" />
      </div>
      <p class="text-[11px] text-gray-400 mt-2">
        El área sombreada marca las horas pico de generación (≥ 50 % del máximo del día).
        El tooltip muestra el ingreso instantáneo: precio × generación.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend,
} from 'chart.js'
import { fmtCOP, fmtCompact } from '@/utils/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend)

const COLOR_PRECIO = '#E8833A'
const COLOR_GEN = '#3B82F6'

const props = defineProps({
  // [{ hour, hora_label, price_cop, generation_kwh, marginal }]
  rows: { type: Array, default: () => [] },
  fecha: { type: String, default: '' },
})

const tieneDatos = computed(() =>
  props.rows.some(r => r.price_cop > 0 || r.generation_kwh > 0),
)

const picoKwh = computed(() =>
  props.rows.reduce((mx, r) => Math.max(mx, r.generation_kwh || 0), 0),
)

/** Horas con generación ≥ 50 % del pico: la franja donde el precio realmente pesa en el P&L. */
const horasPico = computed(() => {
  if (picoKwh.value <= 0) return []
  return props.rows
    .filter(r => r.generation_kwh >= picoKwh.value * 0.5)
    .map(r => r.hour)
})

const chartData = computed(() => ({
  labels: props.rows.map(r => r.hora_label),
  datasets: [
    {
      label: 'Precio bolsa (COP/kWh)',
      data: props.rows.map(r => r.price_cop),
      borderColor: COLOR_PRECIO,
      backgroundColor: COLOR_PRECIO,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      yAxisID: 'y',
      order: 1,
    },
    {
      label: 'Generación Unergy (kWh)',
      data: props.rows.map(r => r.generation_kwh),
      borderColor: COLOR_GEN,
      backgroundColor: 'rgba(59,130,246,0.12)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: true,
      yAxisID: 'y1',
      order: 2,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      labels: { font: { size: 11 }, color: '#6b5a8a', boxWidth: 12, usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        title: (items) => `Hora ${items[0]?.label ?? ''}`,
        label: (c) => {
          const r = props.rows[c.dataIndex]
          if (c.dataset.yAxisID === 'y') return `Precio: $${(r.price_cop || 0).toFixed(2)} /kWh`
          return `Generación: ${(r.generation_kwh || 0).toFixed(1)} kWh`
        },
        // Ingreso instantáneo de esa hora. De noche la generación es 0 y el ingreso también:
        // se muestra igual para que la curva de precio no se lea como ingreso.
        afterBody: (items) => {
          const r = props.rows[items[0]?.dataIndex]
          if (!r) return []
          const ingreso = (r.price_cop || 0) * (r.generation_kwh || 0)
          const out = [`Ingreso: ${fmtCOP(Math.round(ingreso))}`]
          if (r.marginal) out.push(`Marginal: ${r.marginal}`)
          return out
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { font: { size: 9 }, color: '#9ca3af', maxRotation: 0, autoSkipPadding: 12 },
      grid: { display: false },
    },
    y: {
      position: 'left',
      title: { display: true, text: 'Precio (COP/kWh)', font: { size: 10 }, color: COLOR_PRECIO },
      ticks: { font: { size: 9 }, color: '#9ca3af', callback: (v) => `$${v}` },
      grid: { color: 'rgba(0,0,0,0.05)' },
      beginAtZero: true,
    },
    y1: {
      position: 'right',
      title: { display: true, text: 'Generación (kWh)', font: { size: 10 }, color: COLOR_GEN },
      ticks: { font: { size: 9 }, color: '#9ca3af', callback: (v) => fmtCompact(v).replace('$', '') },
      grid: { display: false },
      beginAtZero: true,
    },
  },
}))

// Pinta la banda de horas pico por detrás de las series.
const bandaPicoPlugin = {
  id: 'bandaPico',
  beforeDatasetsDraw(chart) {
    const horas = horasPico.value
    if (!horas.length) return
    const { ctx, chartArea, scales } = chart
    if (!chartArea || !scales.x) return
    ctx.save()
    ctx.fillStyle = 'rgba(240,192,64,0.14)'
    for (const h of horas) {
      const x = scales.x.getPixelForValue(h)
      const ancho = (chartArea.width / 24)
      ctx.fillRect(x - ancho / 2, chartArea.top, ancho, chartArea.bottom - chartArea.top)
    }
    ctx.restore()
  },
}
</script>
