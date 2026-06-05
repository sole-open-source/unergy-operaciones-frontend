<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full" style="border-color:#e8e0f0">
    <div class="px-3 py-2 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-sun text-sm" style="color:#F0C040" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Generación del mes</h3>
      <span class="text-[10px]" style="color:#9b8fb0">kWh por día · datos en vivo</span>
    </div>

    <div class="flex-1 p-3">
      <ProgressSpinner v-if="loading" style="width:32px;height:32px" class="block mx-auto my-6" />

      <template v-else-if="dias.length">
        <div class="grid grid-cols-3 gap-2 mb-2">
          <div class="rounded-lg p-2" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Generado</p>
            <p class="text-sm font-bold" style="color:#2C2039">{{ fmtKwh(totalReal) }}</p>
          </div>
          <div class="rounded-lg p-2" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Días</p>
            <p class="text-sm font-bold" style="color:#6b5a8a">{{ dias.length }}</p>
          </div>
          <div class="rounded-lg p-2" style="background:#faf7ff">
            <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Promedio/día</p>
            <p class="text-sm font-bold" style="color:#915BD8">{{ fmtKwh(totalReal / dias.length) }}</p>
          </div>
        </div>
        <div style="height: 150px">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <p class="text-[10px] mt-1.5" style="color:#9b8fb0">Fuente: API de monitoreo Unergy (en vivo)</p>
      </template>

      <div v-else class="text-center py-6">
        <i class="pi pi-chart-bar text-3xl mb-2" style="color:#e0d5f0" />
        <p class="text-xs" style="color:#9b8fb0">{{ mensaje || 'Sin generación registrada para este período.' }}</p>
      </div>
    </div>

    <!-- Tarifas de servicio del cliente para ese mes -->
    <div class="border-t px-3 py-2" style="border-color:#f0ebf6; background:#fcfbfe">
      <p class="text-[10px] uppercase tracking-wide font-semibold mb-1.5" style="color:#9b8fb0">
        Tarifas de servicio · {{ periodoLabel }} <span class="normal-case font-normal">($/kWh)</span>
      </p>
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg px-2 py-1.5 text-center" style="background:#F4F1FA">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#6E3FB8">Representación</p>
          <p class="text-sm font-bold tabular-nums" style="color:#2C2039">{{ fmtTarifa(tarifas.representacion) }}</p>
        </div>
        <div class="rounded-lg px-2 py-1.5 text-center" style="background:#F4F1FA">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#6E3FB8">CGM</p>
          <p class="text-sm font-bold tabular-nums" style="color:#2C2039">{{ fmtTarifa(tarifas.cgm) }}</p>
        </div>
        <div class="rounded-lg px-2 py-1.5 text-center" style="background:#F4F1FA">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#6E3FB8">Administración</p>
          <p class="text-sm font-bold tabular-nums" style="color:#2C2039">{{ fmtTarifa(tarifas.admin) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import api from '@/api/client'
import { formatPeriodo } from '@/utils/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({
  proyectoId: { type: [Number, String], default: null },
  proyectoNombre: { type: String, default: '' },
  periodo: { type: String, required: true },   // YYYY-MM-01
})

const loading = ref(false)
const dias = ref([])
const mensaje = ref('')
const tarifas = reactive({ representacion: null, cgm: null, admin: null })

const periodoLabel = computed(() => formatPeriodo(props.periodo))

function fmtKwh(v) {
  if (v == null) return '—'
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} MWh`
  return `${v.toFixed(0)} kWh`
}

const _cop2 = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
function fmtTarifa(v) {
  if (v == null) return '—'
  return _cop2.format(v)
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

// ── Generación (API de monitoreo en vivo) ─────────────────────────────────────
async function resolverSub() {
  const { data } = await api.get('/monitoreo/_legacy', { params: { action: 'getProjects' } })
  const projects = data?.projects ?? []
  const pid = props.proyectoId != null ? String(props.proyectoId) : null
  const nombre = norm(props.proyectoNombre)
  let match = pid && projects.find(p => String(p.id ?? p.proyecto_id) === pid && p.sub_project)
  if (!match && nombre) match = projects.find(p => norm(p.nombre_comercial) === nombre && p.sub_project)
  if (!match && nombre) match = projects.find(p => p.sub_project && (norm(p.nombre_comercial).includes(nombre) || nombre.includes(norm(p.nombre_comercial))))
  return match?.sub_project ?? null
}

async function cargarGeneracion() {
  if (!props.periodo) return
  loading.value = true
  mensaje.value = ''
  dias.value = []
  try {
    const sub = await resolverSub()
    if (!sub) { mensaje.value = 'Este proyecto no tiene monitoreo en la API de Unergy.'; return }
    const { data } = await api.get('/monitoreo/_legacy', {
      params: { action: 'getGeneration', sub_project: sub, date_from: props.periodo, date_to: ultimoDiaMes(props.periodo) },
    })
    if (data && data.ok === false) { mensaje.value = data.error || 'La API de Unergy no devolvió datos.'; return }
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

// ── Tarifas de servicio (contratos del proyecto, indexadas por año) ───────────
// indexacion_* = [{ año, valor }]. Se toma el valor del año del período; si no hay,
// el del último año <= período; si no, la tarifa base del contrato.
function tarifaDelAnio(indexacion, base, anio) {
  const arr = Array.isArray(indexacion) ? indexacion.filter(r => r && r.valor != null) : []
  if (arr.length) {
    const exacta = arr.find(r => Number(r.año ?? r.anio) === anio)
    if (exacta) return Number(exacta.valor)
    const previas = arr.filter(r => Number(r.año ?? r.anio) <= anio).sort((a, b) => Number(b.año ?? b.anio) - Number(a.año ?? a.anio))
    if (previas.length) return Number(previas[0].valor)
  }
  return base != null ? Number(base) : null
}

async function cargarTarifas() {
  tarifas.representacion = null; tarifas.cgm = null; tarifas.admin = null
  if (!props.proyectoId) return
  try {
    const { data } = await api.get('/contratos-servicio', { params: { proyecto_id: props.proyectoId } })
    const contratos = Array.isArray(data) ? data : []
    const anio = Number(props.periodo.split('-')[0])
    for (const c of contratos) {
      if (tarifas.representacion == null && (c.indexacion_representacion?.length || c.tarifa_representacion != null))
        tarifas.representacion = tarifaDelAnio(c.indexacion_representacion, c.tarifa_representacion, anio)
      if (tarifas.cgm == null && (c.indexacion_cgm?.length || c.tarifa_cgm != null))
        tarifas.cgm = tarifaDelAnio(c.indexacion_cgm, c.tarifa_cgm, anio)
      if (tarifas.admin == null && c.tarifa_admin != null)
        tarifas.admin = Number(c.tarifa_admin)
    }
  } catch { /* tarifas opcionales */ }
}

function cargar() { cargarGeneracion(); cargarTarifas() }

watch(() => [props.proyectoId, props.periodo], cargar)
onMounted(cargar)
</script>
