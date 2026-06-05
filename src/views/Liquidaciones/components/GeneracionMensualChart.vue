<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col" style="border-color:#e8e0f0">
    <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-sun text-sm" style="color:#F0C040" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Generación del mes</h3>
      <span class="text-[11px]" style="color:#9b8fb0">kWh por día · datos en vivo</span>
    </div>

    <div class="flex-1 p-4">
      <ProgressSpinner v-if="loading" style="width:36px;height:36px" class="block mx-auto my-8" />

      <template v-else-if="dias.length">
        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-lg p-2.5" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Generado</p>
            <p class="text-base font-bold" style="color:#2C2039">{{ fmtKwh(totalReal) }}</p>
          </div>
          <div class="rounded-lg p-2.5" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Días</p>
            <p class="text-base font-bold" style="color:#6b5a8a">{{ dias.length }}</p>
          </div>
          <div class="rounded-lg p-2.5" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Promedio/día</p>
            <p class="text-base font-bold" style="color:#915BD8">{{ fmtKwh(totalReal / dias.length) }}</p>
          </div>
        </div>
        <div style="height: 180px">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <p class="text-[10px] mt-2" style="color:#9b8fb0">Fuente: API de monitoreo Unergy (en vivo)</p>
      </template>

      <div v-else class="text-center py-10">
        <i class="pi pi-chart-bar text-3xl mb-2" style="color:#e0d5f0" />
        <p class="text-xs" style="color:#9b8fb0">{{ mensaje || 'Sin generación registrada para este período.' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import api from '@/api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({
  proyectoId: { type: [Number, String], default: null },
  proyectoNombre: { type: String, default: '' },
  periodo: { type: String, required: true },   // YYYY-MM-01
})

const loading = ref(false)
const dias = ref([])      // [{ date, kwh }]
const mensaje = ref('')

function fmtKwh(v) {
  if (v == null) return '—'
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} MWh`
  return `${v.toFixed(0)} kWh`
}

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

const totalReal = computed(() => dias.value.reduce((s, d) => s + (d.kwh || 0), 0))

const chartData = computed(() => ({
  labels: dias.value.map(d => Number(d.date.split('-')[2])),
  datasets: [{
    label: 'Generación', data: dias.value.map(d => d.kwh),
    backgroundColor: '#915BD8', borderRadius: 3, maxBarThickness: 16,
  }],
}))

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => fmtKwh(c.parsed.y), title: (items) => `Día ${items[0].label}` } },
  },
  scales: {
    x: { ticks: { font: { size: 9 }, color: '#9ca3af', maxTicksLimit: 16 }, grid: { display: false } },
    y: { ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}

function ultimoDiaMes(periodo) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Resuelve el sub_project (ID de la API Unergy) del proyecto de la liquidación.
async function resolverSub() {
  const { data } = await api.get('/monitoreo/_legacy', { params: { action: 'getProjects' } })
  const projects = data?.projects ?? []
  const pid = props.proyectoId != null ? String(props.proyectoId) : null
  const nombre = norm(props.proyectoNombre)
  // 1) por id interno  2) por nombre exacto  3) por nombre contenido
  let match = pid && projects.find(p => String(p.id ?? p.proyecto_id) === pid && p.sub_project)
  if (!match && nombre) match = projects.find(p => norm(p.nombre_comercial) === nombre && p.sub_project)
  if (!match && nombre) match = projects.find(p => p.sub_project && (norm(p.nombre_comercial).includes(nombre) || nombre.includes(norm(p.nombre_comercial))))
  return match?.sub_project ?? null
}

async function load() {
  if (!props.periodo) return
  loading.value = true
  mensaje.value = ''
  dias.value = []
  try {
    const sub = await resolverSub()
    if (!sub) { mensaje.value = 'Este proyecto no tiene monitoreo en la API de Unergy.'; return }

    const { data } = await api.get('/monitoreo/_legacy', {
      params: {
        action: 'getGeneration', sub_project: sub,
        date_from: props.periodo, date_to: ultimoDiaMes(props.periodo),
      },
    })
    if (data && data.ok === false) { mensaje.value = data.error || 'La API de Unergy no devolvió datos.'; return }

    // Suma deltas por día
    const porDia = new Map()
    for (const it of (Array.isArray(data?.data) ? data.data : [])) {
      if (!it || it.kwh == null || !it.date) continue
      porDia.set(it.date, (porDia.get(it.date) || 0) + Number(it.kwh))
    }
    dias.value = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, kwh]) => ({ date, kwh }))
  } catch (e) {
    mensaje.value = e?.response?.data?.detail || 'No se pudo consultar la generación.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.proyectoId, props.periodo], load)
onMounted(load)
</script>
