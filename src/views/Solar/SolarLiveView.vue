<template>
  <div class="sl-page">

    <!-- ══ HEADER ══ -->
    <div class="sl-header">
      <div>
        <h1 class="sl-title">Solar</h1>
        <p class="sl-subtitle">
          Potencia en tiempo real por proyecto
          <span v-if="lastUpdated" class="sl-ts">· {{ lastUpdated }}</span>
        </p>
      </div>
      <div class="sl-header-right">
        <!-- Toggle columnas -->
        <div class="sl-cols-toggle">
          <button v-for="c in [1,2,4]" :key="c"
            :class="['sl-col-btn', cols === c && 'sl-col-btn--active']"
            @click="cols = c" :title="`${c} columna${c > 1 ? 's' : ''}`">
            <span class="sl-col-icon">
              <span v-for="n in c" :key="n" class="sl-col-bar" />
            </span>
          </button>
        </div>
        <button class="sl-refresh-btn" @click="cargar" :disabled="loading">
          <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- ══ LOADING inicial ══ -->
    <div v-if="loading && !proyectos.length" class="sl-loading">
      <i class="pi pi-spin pi-spinner" style="font-size:28px;color:#915BD8" />
      <span>Cargando proyectos...</span>
    </div>

    <!-- ══ EMPTY ══ -->
    <div v-else-if="!loading && !proyectos.length" class="sl-empty">
      <i class="pi pi-sun" style="font-size:32px;color:#3d2f52" />
      <p>Sin proyectos disponibles</p>
    </div>

    <!-- ══ PROYECTOS ══ -->
    <div v-else class="sl-grid" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }">
      <div v-for="proy in proyectos" :key="proy.proyecto_id" class="sl-project-block">

        <!-- Nombre + estado -->
        <div class="sl-project-name">
          <span class="sl-status-dot" :style="{ background: STATUS_COLORS[proy.status] || '#9ca3af' }" />
          {{ proy.nombre }}
          <span class="sl-power-badge">{{ fmtKw(proy.power_kw) }}</span>
        </div>

        <!-- Cargando detalle -->
        <div v-if="!detailMap[proy.proyecto_id]" class="sl-detail-loading">
          <i class="pi pi-spin pi-spinner" style="font-size:14px;color:#6b5a8a" />
          <span>Cargando datos...</span>
        </div>

        <template v-else>

          <!-- % diferencia inversores vs medidores -->
          <div v-if="getDiffPct(proy.proyecto_id) !== null" class="sl-diff-row">
            <span class="sl-diff-label">Inversores vs Medidores</span>
            <span :class="['sl-diff-badge', Math.abs(getDiffPct(proy.proyecto_id)) > 5 ? 'sl-diff-warn' : 'sl-diff-ok']">
              {{ getDiffPct(proy.proyecto_id) > 0 ? '+' : '' }}{{ getDiffPct(proy.proyecto_id) }}%
            </span>
          </div>

          <!-- Dos gráficas -->
          <div class="sl-charts-row">

            <!-- Inversores -->
            <div class="sl-chart-card">
              <div class="sl-chart-header">
                <div class="sl-chart-title">
                  <span class="sl-dot" style="background:#915BD8" />
                  Inversores
                </div>
                <span v-if="getInversorAcum(proy.proyecto_id) !== null"
                  class="sl-acum inv">
                  {{ getInversorAcum(proy.proyecto_id).toFixed(1) }} kWh
                </span>
              </div>
              <div v-if="getInversorData(proy.proyecto_id).labels.length" class="sl-chart-wrap">
                <Line
                  :data="getInversorData(proy.proyecto_id)"
                  :options="chartOptionsInv"
                  :plugins="[crosshairPlugin]"
                  :key="'inv-' + proy.proyecto_id" />
              </div>
              <div v-else class="sl-no-data">Sin datos</div>
            </div>

            <!-- Medidores -->
            <div class="sl-chart-card">
              <div class="sl-chart-header">
                <div class="sl-chart-title">
                  <span class="sl-dot" style="background:#F6FF72" />
                  Medidores
                </div>
                <span v-if="getMedidorAcum(proy.proyecto_id) !== null"
                  class="sl-acum med">
                  {{ getMedidorAcum(proy.proyecto_id).toFixed(1) }} kWh
                </span>
              </div>
              <div v-if="getMedidorData(proy.proyecto_id).labels.length" class="sl-chart-wrap">
                <Line
                  :data="getMedidorData(proy.proyecto_id)"
                  :options="chartOptionsMed"
                  :plugins="[crosshairPlugin]"
                  :key="'med-' + proy.proyecto_id" />
              </div>
              <div v-else class="sl-no-data">Sin datos</div>
            </div>

          </div>
        </template>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import api from '@/api/client'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

// ── Estado ─────────────────────────────────────────────────────────────────
const loading     = ref(false)
const proyectos   = ref([])
const detailMap   = reactive({})
const lastUpdated = ref('')
const cols        = ref(1)
let refreshTimer  = null

const STATUS_COLORS = {
  online: '#16a34a', degradado: '#d97706', caido: '#dc2626',
  sin_comunicacion: '#9ca3af', offline: '#d1d5db',
}

// ── Crosshair plugin ───────────────────────────────────────────────────────
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart.tooltip?._active?.length) return
    const x = chart.tooltip._active[0].element.x
    const { ctx, chartArea: { top, bottom } } = chart
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.restore()
  },
}

// ── Labels 0h–24h ─────────────────────────────────────────────────────────
const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => `${i}h`)

function gaiaTime(t) {
  if (!t) return ''
  const idx = t.indexOf('T')
  return idx >= 0 ? t.slice(idx + 1, idx + 6) : t.slice(0, 5)
}

function mapHours(points, getTime, getKw) {
  const buckets = {}
  for (const pt of points) {
    const raw = getTime(pt)
    if (!raw) continue
    const m = raw.match(/(\d{1,2}):\d{2}/)
    if (!m) continue
    const h = parseInt(m[1], 10)
    if (!buckets[h]) buckets[h] = []
    const v = getKw(pt)
    if (v != null) buckets[h].push(v)
  }
  return HOUR_LABELS.map((_, i) => {
    const arr = buckets[i]
    if (!arr?.length) return null
    return +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3)
  })
}

// ── Datos de gráficas (en kW) ──────────────────────────────────────────────
function getInversorData(id) {
  const d = detailMap[id]
  const curve = d?.power_curve ?? []
  if (!curve.length) return { labels: [], datasets: [] }
  const data = mapHours(
    curve,
    pt => { const t = pt.time || ''; return t.includes(' ') ? t.split(' ')[1] : t },
    pt => pt.kw != null ? +pt.kw : null,
  )
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: HOUR_LABELS,
    datasets: [{
      label: 'Inversores (kW)',
      data,
      borderColor: '#915BD8',
      backgroundColor: 'rgba(145,91,216,0.18)',
      fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2, spanGaps: true,
    }],
  }
}

function getMedidorData(id) {
  const d = detailMap[id]
  const rows = (d?.gaia_snapshot?.time_series?.power ?? []).filter(r => r.kw != null)
  if (!rows.length) return { labels: [], datasets: [] }
  const data = mapHours(
    rows,
    r => gaiaTime(r.time),
    r => +Math.abs(r.kw * 1000),
  )
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: HOUR_LABELS,
    datasets: [{
      label: 'Medidores (kW)',
      data,
      borderColor: '#F6FF72',
      backgroundColor: 'rgba(246,255,114,0.12)',
      fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2, spanGaps: true,
    }],
  }
}

// ── Acumulados del día ─────────────────────────────────────────────────────
function getInversorAcum(id) {
  const curve = detailMap[id]?.power_curve ?? []
  if (curve.length < 2) return null
  let kwh = 0
  for (let i = 1; i < curve.length; i++) {
    const dtH = _timeDiffH(curve[i - 1].time, curve[i].time)
    const avgKw = ((+(curve[i - 1].kw || 0)) + (+(curve[i].kw || 0))) / 2
    kwh += avgKw * dtH
  }
  return kwh > 0 ? kwh : null
}

function getMedidorAcum(id) {
  const eae = detailMap[id]?.gaia_snapshot?.eae_wh
  return (eae != null && eae > 0) ? eae / 1000 : null
}

function _timeDiffH(t1, t2) {
  if (!t1 || !t2) return 0
  try {
    const toMins = t => {
      const s = t.replace('T', ' ').split(' ').pop()
      const [h, m] = s.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    return Math.abs(toMins(t2) - toMins(t1)) / 60
  } catch { return 0 }
}

// ── % diferencia ──────────────────────────────────────────────────────────
function getDiffPct(id) {
  const inv = getInversorAcum(id)
  const med = getMedidorAcum(id)
  if (inv == null || med == null || med === 0) return null
  return +((inv - med) / med * 100).toFixed(1)
}

// ── Chart options ──────────────────────────────────────────────────────────
function makeOptions(color) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1128',
        titleColor: '#FDFAF7',
        bodyColor: color,
        callbacks: {
          label: ctx => `${ctx.parsed.y != null ? ctx.parsed.y.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'} kW`,
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 9 }, color: '#a89fc0', maxTicksLimit: 13 },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 9 }, color: '#a89fc0' },
        grid: { color: 'rgba(255,255,255,0.06)' },
        title: { display: true, text: 'kW', font: { size: 9 }, color: '#a89fc0' },
      },
    },
  }
}

const chartOptionsInv = makeOptions('#915BD8')
const chartOptionsMed = makeOptions('#F6FF72')

// ── Carga ──────────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  try {
    const res = await api.get('/generacion-solar/monitoring')
    proyectos.value = res.data.projects ?? []
    lastUpdated.value = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch { /* silencioso */ } finally {
    loading.value = false
  }
  // Carga detalles en background: los gráficos aparecen conforme llegan
  proyectos.value.forEach(p => loadDetail(p.proyecto_id))
}

async function loadDetail(id) {
  try {
    const res = await api.get(`/generacion-solar/monitoring/${id}`)
    detailMap[id] = res.data
  } catch { detailMap[id] = {} }
}

function fmtKw(kw) {
  if (kw == null) return '—'
  if (kw >= 1000) return (kw / 1000).toFixed(1) + ' MW'
  return kw.toFixed(1) + ' kW'
}

onMounted(() => {
  cargar()
  refreshTimer = setInterval(cargar, 300000)
})
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.sl-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: 'Sora', system-ui, sans-serif;
  background: #2C2039;
  min-height: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  box-sizing: border-box;
}

/* ── Header ── */
.sl-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.sl-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sl-title { font-size: 20px; font-weight: 800; color: #FDFAF7; margin: 0; }
.sl-subtitle { font-size: 12px; color: #a89fc0; margin: 3px 0 0; }
.sl-ts { color: #6b5a8a; }

/* ── Column toggle ── */
.sl-cols-toggle {
  display: flex;
  gap: 4px;
  background: #1f1530;
  border: 1px solid #3d2f52;
  border-radius: 8px;
  padding: 3px;
}
.sl-col-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}
.sl-col-btn:hover { background: rgba(145,91,216,0.2); }
.sl-col-btn--active { background: #915BD8; }
.sl-col-icon {
  display: flex;
  gap: 2px;
  align-items: center;
}
.sl-col-bar {
  display: block;
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: #a89fc0;
}
.sl-col-btn--active .sl-col-bar { background: #fff; }

/* ── Refresh ── */
.sl-refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  background: #915BD8;
  color: #FDFAF7;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;
}
.sl-refresh-btn:hover:not(:disabled) { background: #7a3fc0; }
.sl-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Estados ── */
.sl-loading, .sl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #6b5a8a;
  font-size: 14px;
}

/* ── Grid de proyectos ── */
.sl-grid {
  display: grid;
  gap: 20px;
}

/* ── Bloque de proyecto ── */
.sl-project-block {
  background: #2C2039;
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #3d2f52;
}

.sl-project-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: #FDFAF7;
}
.sl-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sl-power-badge {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: #915BD8;
  background: rgba(145,91,216,0.15);
  padding: 2px 10px;
  border-radius: 999px;
}

/* ── Loading detalle ── */
.sl-detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b5a8a;
  padding: 8px 0;
}

/* ── % Diferencia ── */
.sl-diff-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.sl-diff-label { color: #7b6a9a; }
.sl-diff-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
}
.sl-diff-ok  { background: rgba(22,163,74,0.18);  color: #4ade80; }
.sl-diff-warn { background: rgba(217,119,6,0.18);  color: #fbbf24; }

/* ── Fila de gráficas — se adapta al espacio disponible ── */
.sl-charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

/* ── Tarjeta de gráfica ── */
.sl-chart-card {
  background: #1f1530;
  border-radius: 10px;
  border: 1px solid #3d2f52;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sl-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sl-chart-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a89fc0;
}
.sl-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Acumulado badge ── */
.sl-acum {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 9px;
  border-radius: 999px;
}
.sl-acum.inv { background: rgba(145,91,216,0.18); color: #c4a1f7; }
.sl-acum.med { background: rgba(246,255,114,0.12); color: #e8f060; }

/* ── Gráfica ── */
.sl-chart-wrap {
  height: 180px;
  position: relative;
}
.sl-no-data {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #4a3960;
}
</style>
