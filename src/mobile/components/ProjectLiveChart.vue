<template>
  <div class="plc-wrap">
    <Line v-if="hasData" :data="chartData" :options="chartOptions" :plugins="[nowLinePlugin]" />
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

// ── Línea amarilla "ahora" ──────────────────────────────────────────────────
// Marca la hora actual de Colombia (UTC-5) con una vertical amarilla + etiqueta.
// Sirve para verificar de un vistazo que los datos llegan hasta este momento.
function colombiaSlot() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const col = new Date(utcMs - 5 * 3600000)
  const slot = col.getHours() * 12 + Math.floor(col.getMinutes() / 5)
  const label = `${String(col.getHours()).padStart(2, '0')}:${String(col.getMinutes()).padStart(2, '0')}`
  return { slot: Math.max(0, Math.min(287, slot)), label }
}

const nowLinePlugin = {
  id: 'nowLine',
  afterDatasetsDraw(chart) {
    const xScale = chart.scales.x
    if (!xScale) return
    const { slot, label } = colombiaSlot()
    const px = xScale.getPixelForValue(slot)
    if (px == null || isNaN(px)) return
    const { ctx, chartArea: { top, bottom } } = chart

    ctx.save()
    // línea vertical
    ctx.beginPath()
    ctx.moveTo(px, top)
    ctx.lineTo(px, bottom)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#EAB308' // amarillo, visible sobre el fondo blanco
    ctx.stroke()

    // etiqueta "ahora HH:MM" arriba, clamp dentro del área
    const text = `ahora ${label}`
    ctx.font = '700 11px system-ui, sans-serif'
    const tw = ctx.measureText(text).width + 14
    let bx = px - tw / 2
    bx = Math.max(xScale.left, Math.min(bx, xScale.right - tw))
    const by = top + 2
    ctx.fillStyle = '#EAB308'
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, tw, 18, 6); ctx.fill() }
    else ctx.fillRect(bx, by, tw, 18)
    ctx.fillStyle = '#2C2039'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text, bx + tw / 2, by + 9)
    ctx.restore()
  },
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  layout: { padding: { top: 22 } }, // espacio para la etiqueta "ahora"
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'start',
      labels: {
        boxWidth: 12, boxHeight: 12, usePointStyle: true, pointStyle: 'circle',
        font: { size: 14, weight: '600' }, color: '#2C2039', padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#ffffff', titleColor: '#374151', bodyColor: '#4b5563',
      borderColor: '#e5e7eb', borderWidth: 1, padding: 12, displayColors: true,
      titleFont: { size: 13 }, bodyFont: { size: 13 },
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y != null
          ? ctx.parsed.y.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : '—'} kW`,
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 12 }, color: '#6b7280', maxTicksLimit: 7, autoSkip: true },
      grid: { color: 'rgba(28,18,50,0.05)' } },
    y: { beginAtZero: true, ticks: { font: { size: 12 }, color: '#6b7280' },
      grid: { color: 'rgba(28,18,50,0.05)' } },
  },
}
</script>

<style scoped>
.plc-wrap { position: relative; width: 100%; height: 100%; }
.plc-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; height: 100%; color: #9ca3af; font-size: 14px;
}
.plc-empty .pi { font-size: 32px; color: #d1d5db; }
</style>
