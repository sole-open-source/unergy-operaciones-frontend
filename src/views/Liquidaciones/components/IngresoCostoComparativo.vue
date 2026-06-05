<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
    <div class="px-3 py-2 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-chart-bar text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Este mes vs promedio del proyecto</h3>
      <span v-if="mesesHist" class="ml-auto text-[10px]" style="color:#9b8fb0">promedio de {{ mesesHist }} mes(es) anteriores</span>
    </div>

    <ProgressSpinner v-if="loading" style="width:32px;height:32px" class="block mx-auto my-6" />

    <div v-else-if="actual" class="p-3">
      <!-- KPIs del mes actual + variación vs promedio -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" :class="showChart ? 'mb-3' : ''">
        <div v-for="k in kpis" :key="k.label" class="rounded-lg p-2" :style="{ background: k.bg }">
          <p class="text-[10px] uppercase tracking-wide font-semibold" :style="{ color: k.color }">{{ k.label }}</p>
          <p class="text-sm font-bold tabular-nums" :style="{ color: k.color }">{{ k.pct ? k.value.toFixed(1) + '%' : fmtCompact(k.value) }}</p>
          <p v-if="k.delta != null" class="text-[10px] font-medium" :style="{ color: k.delta >= 0 ? '#10B981' : '#D64455' }">
            {{ k.delta >= 0 ? '▲' : '▼' }} {{ Math.abs(k.delta).toFixed(0) }}% vs prom.
          </p>
        </div>
      </div>

      <div v-if="showChart" style="height: 240px">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div v-else class="text-center py-10">
      <i class="pi pi-chart-bar text-3xl mb-2" style="color:#e0d5f0" />
      <p class="text-xs" style="color:#9b8fb0">Aún no hay cifras para este proyecto.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import { fmtCompact, fmtCOP } from '@/utils/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({
  proyectoId: { type: [Number, String], required: true },
  periodo: { type: String, required: true },   // YYYY-MM-01
  showChart: { type: Boolean, default: true },  // false → solo KPIs (indicador vs promedio)
})

const loading = ref(false)
const liqs = ref([])   // todas las liquidaciones del proyecto (vista por-proyecto)

const sum = (arr, k) => (arr || []).reduce((s, x) => s + (Number(x?.[k]) || 0), 0)

// Ítems consistentes (misma fórmula que el neto oficial) a partir de la vista por-proyecto
function itemsDe(liq) {
  const ingresos = sum(liq.mandatos_total_ingresos, 'valor_neto_cop')
  const costosOp = sum(liq.mandatos_total_costos, 'valor_neto_cop')
  const facturas = sum(liq.facturas_servicio, 'valor_cop')
  // respaldo al resumen del backend si no hay mandatos "Total"
  const ing = ingresos || Number(liq.resumen?.total_ingresos_cop) || 0
  const cos = costosOp || Number(liq.resumen?.total_costos_cop) || 0
  const fac = facturas || Number(liq.resumen?.total_facturas_cop) || 0
  return { ingresos: ing, costosOp: cos, facturas: fac, neto: ing - cos - fac }
}

const conValores = (it) => it.ingresos !== 0 || it.costosOp !== 0 || it.facturas !== 0

const actual = computed(() => {
  const l = liqs.value.find(x => x.periodo === props.periodo)
  return l ? itemsDe(l) : null
})

const historico = computed(() =>
  liqs.value
    .filter(x => x.periodo < props.periodo)
    .sort((a, b) => b.periodo.localeCompare(a.periodo))   // más recientes primero
    .slice(0, 3)                                           // promedio de los 3 meses anteriores
    .map(itemsDe)
    .filter(conValores)
)
const mesesHist = computed(() => historico.value.length)

const promedio = computed(() => {
  const h = historico.value
  if (!h.length) return null
  const avg = (k) => h.reduce((s, it) => s + it[k], 0) / h.length
  return { ingresos: avg('ingresos'), costosOp: avg('costosOp'), facturas: avg('facturas'), neto: avg('neto') }
})

const ITEMS = [
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'costosOp', label: 'Costos op.' },
  { key: 'facturas', label: 'Facturas' },
  { key: 'neto', label: 'Neto' },
]

const kpis = computed(() => {
  const a = actual.value, p = promedio.value
  const costosTot = a.costosOp + a.facturas
  const costosTotProm = p ? p.costosOp + p.facturas : null
  const delta = (cur, prev) => (prev ? (cur - prev) / Math.abs(prev) * 100 : null)
  return [
    { label: 'Ingresos', value: a.ingresos, delta: delta(a.ingresos, p?.ingresos), color: '#15803d', bg: '#ecfdf3' },
    { label: 'Costos totales', value: costosTot, delta: delta(costosTot, costosTotProm), color: '#b3324a', bg: '#fef2f3' },
    { label: 'Ingreso neto', value: a.neto, delta: delta(a.neto, p?.neto), color: '#915BD8', bg: '#faf7ff' },
    { label: 'Margen', value: a.ingresos ? a.neto / a.ingresos * 100 : 0, delta: null, color: '#6E3FB8', bg: '#faf7ff', pct: true },
  ]
})

const chartData = computed(() => {
  const a = actual.value, p = promedio.value
  const ds = [{
    label: 'Este mes', data: ITEMS.map(i => a[i.key]),
    backgroundColor: '#915BD8', borderRadius: 4, maxBarThickness: 46,
  }]
  if (p) ds.push({
    label: 'Promedio proyecto', data: ITEMS.map(i => p[i.key]),
    backgroundColor: '#D7C9EC', borderRadius: 4, maxBarThickness: 46,
  })
  return { labels: ITEMS.map(i => i.label), datasets: ds }
})

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: true, labels: { font: { size: 11 }, color: '#6b5a8a', boxWidth: 12, usePointStyle: true } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtCOP(c.parsed.y)}` } },
  },
  scales: {
    x: { ticks: { font: { size: 11 }, color: '#6b5a8a' }, grid: { display: false } },
    y: { ticks: { font: { size: 9 }, color: '#9ca3af', callback: (v) => fmtCompact(v) }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}

async function load() {
  if (!props.proyectoId) return
  loading.value = true
  try {
    const { data } = await api.get('/liquidaciones/vistas/por-proyecto', { params: { proyecto_id: props.proyectoId } })
    const proy = Array.isArray(data) ? data.find(p => String(p.proyecto_id) === String(props.proyectoId)) || data[0] : null
    liqs.value = proy?.liquidaciones || []
  } catch {
    liqs.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.proyectoId, props.periodo], load)
onMounted(load)
</script>
