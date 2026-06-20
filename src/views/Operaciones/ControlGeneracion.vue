<template>
  <div class="cg-page">
    <PageHeader
      title="Control de Generación"
      subtitle="Curvas de Quoia y Fusion por frontera"
    >
      <template #actions>
        <div class="fecha-picker-wrap">
          <DatePicker
            v-model="fechaModel"
            dateFormat="yy-mm-dd"
            showButtonBar
            :maxDate="ayerDate"
            class="w-40"
            size="small"
            @update:modelValue="onFechaChange"
          />
          <span v-if="esAyer" class="tag-ayer">ayer</span>
        </div>
        <Button icon="pi pi-refresh" size="small" text severity="secondary"
          :loading="cargando" @click="cargarDatos"
          v-tooltip.bottom="'Actualizar'" />
      </template>
    </PageHeader>

    <!-- ── Filtros ─────────────────────────────────────────────────── -->
    <div class="filter-bar">

      <!-- Proyecto -->
      <div class="f-group">
        <span class="f-label">Proyecto</span>
        <Select
          v-model="filtroProyecto"
          :options="opcionesProyecto"
          optionLabel="nombre"
          optionValue="frt_code"
          placeholder="Todos los proyectos"
          showClear
          filter
          class="f-select"
          size="small"
        />
      </div>

      <div class="f-sep" />

      <!-- Estado -->
      <div class="f-group">
        <span class="f-label">Estado</span>
        <div class="seg">
          <button
            v-for="opt in ESTADOS"
            :key="opt.key"
            class="seg-btn"
            :class="{ on: filtroEstado === opt.key }"
            @click="filtroEstado = opt.key"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="f-sep" />

      <!-- Discrepancia -->
      <div class="f-group">
        <span class="f-label">Discrepancia</span>
        <div class="disc-row">
          <ToggleSwitch v-model="discActiva" />
          <span class="disc-lbl">Solo con diferencia &gt;</span>
          <InputNumber
            v-model="discUmbral"
            :disabled="!discActiva"
            :min="1" :max="50" :step="1"
            suffix="%"
            class="disc-input"
            size="small"
            showButtons
            buttonLayout="horizontal"
          />
          <span v-if="discActiva && nConDisc > 0" class="disc-count">
            {{ nConDisc }} frontera{{ nConDisc !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <button v-if="hayFiltros" class="f-reset" @click="limpiarFiltros">
        Limpiar filtros
      </button>
    </div>

    <!-- ── Resumen ─────────────────────────────────────────────────── -->
    <div class="strip">
      <div class="stat">
        <div class="stat-val">{{ proyectosFiltrados.length }} <small>frontera{{ proyectosFiltrados.length !== 1 ? 's' : '' }}</small></div>
        <div class="stat-lbl">Mostrando</div>
      </div>
      <div class="stat ok">
        <div class="stat-val">{{ fmt(resumen.total_quoia_kwh) }} <small>kWh</small></div>
        <div class="stat-lbl">Total Quoia (medidores)</div>
      </div>
      <div class="stat ok">
        <div class="stat-val">{{ fmt(resumen.total_solenium_kwh) }} <small>kWh</small></div>
        <div class="stat-lbl">Total Fusion (inversores)</div>
      </div>
      <div class="stat warn">
        <div class="stat-val">{{ resumen.sin_medidas }} <small>frontera{{ resumen.sin_medidas !== 1 ? 's' : '' }}</small></div>
        <div class="stat-lbl">Sin medidas</div>
      </div>
    </div>

    <!-- ── Skeleton ────────────────────────────────────────────────── -->
    <div v-if="cargando" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="sk-hd" />
        <div class="sk-body" />
      </div>
    </div>

    <!-- ── Sin resultados ─────────────────────────────────────────── -->
    <div v-else-if="!cargando && !proyectosFiltrados.length" class="empty-state">
      <i class="pi pi-inbox" style="font-size:2rem;color:#c4b8d4;" />
      <p>No hay datos para los filtros seleccionados.</p>
    </div>

    <!-- ── Cards ─────────────────────────────────────────────────── -->
    <template v-else>
      <div v-for="p in proyectosFiltrados" :key="p.frt_code" class="card">
        <!-- Header -->
        <div class="card-hd">
          <span class="dot" :class="p.estado === 'sin_medidas' ? 'warn' : 'ok'" />
          <span class="cname">{{ p.nombre }}</span>
          <span v-if="p.frontera_codigo" class="frt-badge">{{ p.frontera_codigo?.toUpperCase() }}</span>
          <span v-if="p.potencia_kwp" class="cap">{{ p.potencia_kwp }} kWp</span>
          <span v-if="p.solenium?.inversores?.length" class="cap">· {{ p.solenium.inversores.length }} inversor{{ p.solenium.inversores.length !== 1 ? 'es' : '' }}</span>
          <span v-if="p.discrepancia_pct !== null && p.discrepancia_pct > 5" class="disc-pill">
            ⚠ Diferencia {{ p.discrepancia_pct }}%
          </span>
          <span v-if="!p.en_app" class="unregistered-tag">Sin registrar</span>
          <span v-if="p.estado === 'sin_medidas'" class="err-tag">Sin medidas</span>
        </div>

        <!-- Sin medidas -->
        <div v-if="p.estado === 'sin_medidas'" class="empty-card">
          <i class="pi pi-circle" style="font-size:1.2rem;opacity:.3;" />
          <span>Sin medidas para este día — proyecto apagado o sin comunicación.</span>
        </div>

        <!-- Charts -->
        <div v-else class="chart-cols">
          <!-- Quoia -->
          <div class="chart-pane">
            <div class="pane-hd">
              <span class="pane-lbl">Medidor · Quoia</span>
              <span class="src-badge badge-q">Quoia</span>
            </div>
            <div class="pane-total">
              {{ fmt(p.quoia.total_kwh) }} <small>kWh</small>
            </div>
            <div class="chart-box">
              <Line
                v-if="p.quoia.curva.length"
                :data="quoiaChartData(p)"
                :options="chartOptions"
                :height="96"
                :plugins="[bgPlugin]"
              />
              <div v-else class="no-data">Sin datos Quoia</div>
            </div>
            <div class="legend">
              <div class="leg"><div class="leg-dot" style="background:#38BDF8" />Energía exportada eae (kWh/h)</div>
            </div>
          </div>

          <!-- Solenium -->
          <div class="chart-pane">
            <div class="pane-hd">
              <span class="pane-lbl">Inversores · Fusion</span>
              <span class="src-badge badge-s">Solenium</span>
            </div>
            <div class="pane-total">
              {{ fmt(p.solenium.total_kwh) }} <small>kWh</small>
            </div>
            <div class="chart-box">
              <Line
                v-if="p.solenium.inversores.some(i => i.curva.length)"
                :data="soleniumChartData(p)"
                :options="chartOptions"
                :height="96"
                :plugins="[bgPlugin]"
              />
              <div v-else class="no-data">Sin datos Solenium</div>
            </div>
            <div class="legend">
              <div v-for="(inv, idx) in p.solenium.inversores" :key="inv.id" class="leg">
                <div class="leg-dot" :style="{ background: INV_COLORS[idx % INV_COLORS.length] }" />
                {{ inv.nombre }} — {{ fmt(inv.total_kwh) }} kWh
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Filler, Tooltip, Legend,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import ToggleSwitch from 'primevue/toggleswitch'
import InputNumber from 'primevue/inputnumber'
import Toast from 'primevue/toast'
import PageHeader from '@/components/PageHeader.vue'
import api from '@/api/client'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const toast = useToast()

// ── Paleta inversores ──────────────────────────────────────────────────────────
const INV_COLORS = ['#F6FF72', '#C084FC', '#34D399', '#FB923C', '#38BDF8', '#F472B6']

// ── Plugin dark background ─────────────────────────────────────────────────────
const bgPlugin = {
  id: 'cg-bg',
  beforeDraw(chart) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    ctx.save()
    ctx.fillStyle = '#0D0B17'
    ctx.fillRect(0, 0, chart.width, chart.height)
    ctx.restore()
  },
}

// ── Chart options (compartido) ─────────────────────────────────────────────────
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(13,11,23,0.95)',
      titleColor: 'rgba(255,255,255,0.6)',
      bodyColor: '#fff',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: {
        color: 'rgba(255,255,255,0.35)',
        font: { size: 9, family: 'Sora, sans-serif' },
        maxTicksLimit: 8,
        maxRotation: 0,
      },
      grid: { color: 'rgba(255,255,255,0.06)' },
      border: { color: 'transparent' },
    },
    y: {
      ticks: {
        color: 'rgba(255,255,255,0.35)',
        font: { size: 9, family: 'Sora, sans-serif' },
        maxTicksLimit: 5,
      },
      grid: { color: 'rgba(255,255,255,0.06)' },
      border: { color: 'transparent' },
      beginAtZero: true,
    },
  },
}

// ── Fecha ──────────────────────────────────────────────────────────────────────
function colYesterday() {
  const d = new Date(Date.now() - 5 * 3600000 - 86400000)
  return d.toISOString().slice(0, 10)
}
const ayerDate  = new Date(Date.now() - 5 * 3600000 - 86400000)
const fechaStr  = ref(colYesterday())            // "YYYY-MM-DD"
const fechaModel = ref(ayerDate)                 // Date object para DatePicker
const esAyer = computed(() => fechaStr.value === colYesterday())

function onFechaChange(val) {
  if (!val) return
  const d = new Date(val)
  fechaStr.value = d.toISOString().slice(0, 10)
  cargarDatos()
}

// ── Datos ──────────────────────────────────────────────────────────────────────
const cargando   = ref(false)
const proyectos  = ref([])
const resumen    = ref({ total_proyectos: 0, con_datos: 0, sin_medidas: 0, total_quoia_kwh: 0, total_solenium_kwh: 0 })

const opcionesProyecto = ref([])

async function cargarProyectos() {
  try {
    const { data } = await api.get('/control-generacion/proyectos')
    opcionesProyecto.value = data.proyectos || []
  } catch {
    // non-critical
  }
}

async function cargarDatos() {
  cargando.value = true
  try {
    const params = { fecha: fechaStr.value }
    if (filtroProyecto.value) params.frt_code = filtroProyecto.value
    const { data } = await api.get('/control-generacion/datos', { params })
    proyectos.value = data.proyectos || []
    resumen.value   = data.resumen   || resumen.value
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar datos',
      detail: err?.response?.data?.detail || err?.message,
      life: 5000,
    })
  } finally {
    cargando.value = false
  }
}

// ── Filtros ────────────────────────────────────────────────────────────────────
const ESTADOS = [
  { key: 'todos',  label: 'Todos'       },
  { key: 'datos',  label: 'Con datos'   },
  { key: 'sin',    label: 'Sin medidas' },
]
const filtroProyecto = ref(null)
const filtroEstado   = ref('todos')
const discActiva     = ref(false)
const discUmbral     = ref(5)

const hayFiltros = computed(() =>
  filtroProyecto.value !== null || filtroEstado.value !== 'todos' || discActiva.value
)

const proyectosFiltrados = computed(() => {
  return proyectos.value.filter(p => {
    if (filtroProyecto.value && p.frt_code !== filtroProyecto.value) return false
    if (filtroEstado.value === 'datos' && p.estado !== 'con_datos')   return false
    if (filtroEstado.value === 'sin'   && p.estado !== 'sin_medidas') return false
    if (discActiva.value && (p.discrepancia_pct === null || p.discrepancia_pct < discUmbral.value)) return false
    return true
  })
})

const nConDisc = computed(() =>
  proyectos.value.filter(p => p.discrepancia_pct !== null && p.discrepancia_pct >= discUmbral.value).length
)

function limpiarFiltros() {
  filtroProyecto.value = null
  filtroEstado.value   = 'todos'
  discActiva.value     = false
  discUmbral.value     = 5
}

// ── Chart data builders ────────────────────────────────────────────────────────
function quoiaChartData(p) {
  const labels   = p.quoia.curva.map(pt => pt.hora)
  const values   = p.quoia.curva.map(pt => pt.kwh)
  return {
    labels,
    datasets: [{
      label: 'eae (kWh/h)',
      data: values,
      borderColor: '#38BDF8',
      backgroundColor: 'rgba(56,189,248,0.18)',
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 1.8,
    }],
  }
}

function soleniumChartData(p) {
  const firstCurve = p.solenium.inversores.find(i => i.curva.length)
  const labels = firstCurve ? firstCurve.curva.map(pt => pt.tiempo) : []
  return {
    labels,
    datasets: p.solenium.inversores.map((inv, idx) => ({
      label: inv.nombre,
      data: inv.curva.map(pt => pt.kw),
      borderColor: INV_COLORS[idx % INV_COLORS.length],
      backgroundColor: hexToRgba(INV_COLORS[idx % INV_COLORS.length], 0.12),
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 1.7,
    })),
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

// ── Init ───────────────────────────────────────────────────────────────────────
onMounted(() => {
  cargarProyectos()
  cargarDatos()
})
</script>

<style scoped>
.cg-page { display: flex; flex-direction: column; gap: 0; }

/* Fecha picker */
.fecha-picker-wrap {
  display: flex; align-items: center; gap: 6px;
}
.tag-ayer {
  font-size: 9px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase;
  background: #F6FF72; color: #2C2039; padding: 2px 7px; border-radius: 4px;
}

/* ── Filter bar ───────────────────────────────────────────── */
.filter-bar {
  background: #fff; border: 1px solid #E5E7EB; border-radius: 10px;
  padding: 10px 14px; margin-bottom: 12px;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.f-sep { width: 1px; height: 28px; background: #E5E7EB; flex-shrink: 0; }
.f-group { display: flex; flex-direction: column; gap: 3px; }
.f-label {
  font-size: 9.5px; font-weight: 800; letter-spacing: .08em;
  text-transform: uppercase; color: #A89EC0;
}
.f-select { min-width: 190px; }

.seg { display: flex; border: 1px solid #ECE7F2; border-radius: 7px; overflow: hidden; }
.seg-btn {
  padding: 5px 11px; font-family: inherit; font-size: 12px; font-weight: 600;
  color: #5b5470; border: none; background: transparent; cursor: pointer;
  transition: background .12s, color .12s; white-space: nowrap;
  border-right: 1px solid #ECE7F2;
}
.seg-btn:last-child { border-right: none; }
.seg-btn:hover { background: #F5F2FB; color: #2C2039; }
.seg-btn.on { background: #F1EAF9; color: #2C2039; font-weight: 700; }

.disc-row { display: flex; align-items: center; gap: 8px; }
.disc-lbl { font-size: 12px; font-weight: 600; color: #5b5470; white-space: nowrap; }
.disc-input { width: 90px; }
.disc-count {
  font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 5px;
  background: rgba(220,38,38,.08); color: #DC2626; border: 1px solid rgba(220,38,38,.18);
}

.f-reset {
  margin-left: auto; font-size: 11.5px; font-weight: 600; color: #9b8fb0;
  cursor: pointer; border: none; background: transparent; font-family: inherit;
}
.f-reset:hover { color: #915BD8; }

/* ── Summary strip ────────────────────────────────────────── */
.strip {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 9px; margin-bottom: 12px;
}
.stat {
  background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 14px;
}
.stat-val { font-size: 19px; font-weight: 800; color: #2C2039; letter-spacing: -.5px; line-height: 1.1; }
.stat-val small { font-size: 11px; font-weight: 500; color: #9b8fb0; margin-left: 2px; }
.stat-lbl { font-size: 10.5px; color: #9b8fb0; margin-top: 3px; }
.stat.ok .stat-val { color: #16A34A; }
.stat.warn .stat-val { color: #D97706; }

/* ── Skeleton ─────────────────────────────────────────────── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skeleton-card {
  background: #fff; border: 1px solid #E5E7EB; border-radius: 11px; overflow: hidden;
}
.sk-hd {
  height: 44px; background: linear-gradient(90deg, #f3f4f6 25%, #e9e7f0 50%, #f3f4f6 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.sk-body {
  height: 140px; background: linear-gradient(90deg, #f8f8fb 25%, #f1f0f5 50%, #f8f8fb 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite 0.2s;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Empty state ──────────────────────────────────────────── */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 48px; color: #b0a8c4; font-size: 13px;
}

/* ── Project card ─────────────────────────────────────────── */
.card {
  background: #fff; border: 1px solid #E5E7EB;
  border-radius: 11px; margin-bottom: 10px; overflow: hidden;
}
.card-hd {
  display: flex; align-items: center; gap: 9px; padding: 10px 15px;
  border-bottom: 1px solid #E5E7EB;
}
.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dot.ok   { background: #16A34A; }
.dot.warn { background: #D97706; }
.cname { font-size: 13px; font-weight: 700; color: #2C2039; }
.frt-badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 5px;
  background: #F3F4F6; border: 1px solid #E5E7EB; color: #6b5a8a;
}
.cap { font-size: 11px; color: #9b8fb0; }
.disc-pill {
  font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 5px;
  background: rgba(217,119,6,.1); color: #D97706; border: 1px solid rgba(217,119,6,.25);
}
.err-tag {
  font-size: 10px; font-weight: 700; margin-left: auto;
  background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;
  padding: 2px 9px; border-radius: 5px;
}

.empty-card {
  display: flex; align-items: center; gap: 11px;
  padding: 22px 15px; font-size: 12px; color: #b0a8c4;
}

/* ── Charts ───────────────────────────────────────────────── */
.chart-cols { display: grid; grid-template-columns: 1fr 1fr; }
.chart-pane { padding: 12px 14px; border-right: 1px solid #E5E7EB; }
.chart-pane:last-child { border-right: none; }
.pane-hd {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;
}
.pane-lbl {
  font-size: 9.5px; font-weight: 700; letter-spacing: .6px;
  text-transform: uppercase; color: #9b8fb0;
}
.src-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
.badge-q { background: rgba(56,189,248,.13); color: #0284C7; }
.badge-s { background: rgba(145,91,216,.13); color: #915BD8; }
.pane-total {
  font-size: 18px; font-weight: 800; color: #2C2039;
  letter-spacing: -.4px; margin-bottom: 7px; line-height: 1;
}
.pane-total small { font-size: 11px; font-weight: 500; color: #9b8fb0; }
.chart-box {
  background: #0D0B17; border-radius: 7px; padding: 5px;
  min-height: 100px; position: relative;
}
.no-data {
  display: flex; align-items: center; justify-content: center;
  height: 96px; font-size: 11px; color: rgba(255,255,255,0.25);
}
.legend { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.leg { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #9b8fb0; }
.leg-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.unregistered-tag {
  font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 5px;
  background: rgba(107,90,138,.1); color: #6b5a8a; border: 1px solid rgba(107,90,138,.25);
}
</style>
