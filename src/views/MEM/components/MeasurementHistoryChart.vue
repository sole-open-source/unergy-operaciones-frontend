<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col" style="border-color:#e8e0f0">
    <div class="px-4 py-3 flex items-center justify-between gap-2 border-b" style="border-color:#f0ebf6">
      <div class="flex items-center gap-2">
        <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
        <h3 class="text-sm font-bold" style="color:#2C2039">Histórico de medición</h3>
      </div>
      <!-- Toggle Generación / Consumo -->
      <div class="inline-flex rounded-lg overflow-hidden" style="border:1.5px solid #e8e0f0">
        <button v-for="opt in vistas" :key="opt.value"
          @click="vista = opt.value"
          class="px-3 py-1 text-xs font-semibold transition-colors"
          :style="vista === opt.value
            ? 'background:#915BD8;color:#fff;'
            : 'background:#fff;color:#6b5a8a;'">
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 p-4">
      <template v-if="tieneDatos">
        <div style="height: 260px">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </template>
      <div v-else class="text-center py-10">
        <i class="pi pi-chart-line text-3xl mb-2" style="color:#e0d5f0" />
        <p class="text-xs" style="color:#9b8fb0">
          Sin histórico de {{ vista === 'generacion' ? 'generación' : 'consumo' }} para mostrar.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { formatMedicionValor } from '@/services/fronterasService'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({
  // Series [{ fecha, valorMwh }] tal como las produce parseHistorico().
  generationData: { type: Array, default: () => [] },
  consumptionData: { type: Array, default: () => [] },
})

const vistas = [
  { label: 'Generación', value: 'generacion' },
  { label: 'Consumo', value: 'consumo' },
]
const vista = ref('generacion')

const serieActual = computed(() =>
  vista.value === 'generacion' ? props.generationData : props.consumptionData
)
const tieneDatos = computed(() => serieActual.value.length > 0)

const colorActual = computed(() => (vista.value === 'generacion' ? '#10B981' : '#3B82F6'))

function fmtFechaCorta(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const chartData = computed(() => ({
  labels: serieActual.value.map((p) => fmtFechaCorta(p.fecha)),
  datasets: [{
    label: vista.value === 'generacion' ? 'Generación (MWh)' : 'Consumo (MWh)',
    data: serieActual.value.map((p) => p.valorMwh),
    borderColor: colorActual.value,
    backgroundColor: colorActual.value + '22',
    borderWidth: 2,
    pointRadius: 2,
    pointHoverRadius: 4,
    tension: 0.3,
    fill: true,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (c) => formatMedicionValor(c.parsed.y),
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 9 }, color: '#9ca3af', maxTicksLimit: 12 }, grid: { display: false } },
    y: { ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}))
</script>
