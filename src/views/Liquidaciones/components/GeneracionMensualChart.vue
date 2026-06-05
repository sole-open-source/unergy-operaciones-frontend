<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col" style="border-color:#e8e0f0">
    <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-sun text-sm" style="color:#F0C040" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Generación del mes</h3>
      <span class="text-[11px]" style="color:#9b8fb0">kWh por día</span>
    </div>

    <div class="flex-1 p-4">
      <ProgressSpinner v-if="loading" style="width:36px;height:36px" class="block mx-auto my-8" />

      <template v-else-if="dias.length">
        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-lg p-2.5" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Generado</p>
            <p class="text-base font-bold" style="color:#2C2039">{{ fmtKwh(totalReal) }}</p>
          </div>
          <div class="rounded-lg p-2.5" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Esperado P90</p>
            <p class="text-base font-bold" style="color:#6b5a8a">{{ totalP90 ? fmtKwh(totalP90) : '—' }}</p>
          </div>
          <div class="rounded-lg p-2.5" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Cumplimiento</p>
            <p class="text-base font-bold" :style="{ color: cumplimiento >= 100 ? '#10B981' : cumplimiento >= 90 ? '#CA8A04' : '#D64455' }">
              {{ cumplimiento != null ? cumplimiento.toFixed(0) + '%' : '—' }}
            </p>
          </div>
        </div>
        <div style="height: 180px">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <p class="text-[10px] mt-2" style="color:#9b8fb0">{{ dias.length }} días con registro · fuente: generación diaria de operaciones</p>
      </template>

      <div v-else class="text-center py-10">
        <i class="pi pi-chart-bar text-3xl mb-2" style="color:#e0d5f0" />
        <p class="text-xs" style="color:#9b8fb0">Sin generación registrada para este período.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, LineController, BarController, Tooltip, Legend,
} from 'chart.js'
import api from '@/api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, LineController, BarController, Tooltip, Legend)

const props = defineProps({
  proyectoId: { type: [Number, String], required: true },
  periodo: { type: String, required: true },   // YYYY-MM-01
})

const loading = ref(false)
const dias = ref([])   // [{ fecha, kwh_real, kwh_p90 }]

const num = (v) => (v == null ? null : Number(v))

function fmtKwh(v) {
  if (v == null) return '—'
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} MWh`
  return `${v.toFixed(0)} kWh`
}

const totalReal = computed(() => dias.value.reduce((s, d) => s + (num(d.kwh_real) || 0), 0))
const totalP90 = computed(() => dias.value.reduce((s, d) => s + (num(d.kwh_p90) || 0), 0))
const cumplimiento = computed(() => (totalP90.value ? (totalReal.value / totalP90.value * 100) : null))

const chartData = computed(() => ({
  labels: dias.value.map(d => Number(d.fecha.split('-')[2])),
  datasets: [
    {
      type: 'bar', label: 'Real',
      data: dias.value.map(d => num(d.kwh_real)),
      backgroundColor: '#915BD8', borderRadius: 3, maxBarThickness: 16, order: 2,
    },
    ...(totalP90.value ? [{
      type: 'line', label: 'P90',
      data: dias.value.map(d => num(d.kwh_p90)),
      borderColor: '#F0C040', borderDash: [4, 3], borderWidth: 1.5,
      pointRadius: 0, tension: 0.3, order: 1,
    }] : []),
  ],
}))

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: true, labels: { font: { size: 10 }, color: '#6b5a8a', boxWidth: 10, usePointStyle: true } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtKwh(c.parsed.y)}` } },
  },
  scales: {
    x: { ticks: { font: { size: 9 }, color: '#9ca3af', maxTicksLimit: 16 }, grid: { display: false }, title: { display: false } },
    y: { ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}

function ultimoDiaMes(periodo) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m, 0)   // día 0 del mes siguiente = último del mes
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function load() {
  if (!props.proyectoId || !props.periodo) return
  loading.value = true
  try {
    const { data } = await api.get('/generacion', {
      params: {
        proyecto_id: props.proyectoId,
        fecha_inicio: props.periodo,
        fecha_fin: ultimoDiaMes(props.periodo),
        size: 40,
      },
    })
    const items = (data?.items || []).slice()
    items.sort((a, b) => a.fecha.localeCompare(b.fecha))
    dias.value = items
  } catch {
    dias.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.proyectoId, props.periodo], load)
onMounted(load)
</script>
