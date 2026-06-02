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
      <button class="sl-refresh-btn" @click="cargar" :disabled="loading">
        <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
        Actualizar
      </button>
    </div>

    <!-- ══ LOADING ══ -->
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
    <div v-else class="sl-grid">
      <div v-for="proy in proyectos" :key="proy.proyecto_id" class="sl-project-block">

        <!-- Nombre del proyecto -->
        <div class="sl-project-name">
          <span class="sl-status-dot"
            :style="{ background: STATUS_COLORS[proy.status] || '#9ca3af' }" />
          {{ proy.nombre }}
          <span class="sl-power-badge">{{ fmtKw(proy.power_kw) }}</span>
        </div>

        <!-- Dos gráficas lado a lado -->
        <div class="sl-charts-row">

          <!-- Inversores (FusionSolar) -->
          <div class="sl-chart-card">
            <div class="sl-chart-title">
              <span class="sl-dot" style="background:#915BD8" />
              Inversores
            </div>
            <div v-if="getInversorData(proy.proyecto_id).labels.length"
              class="sl-chart-wrap">
              <Line
                :data="getInversorData(proy.proyecto_id)"
                :options="chartOptions"
                :key="'inv-' + proy.proyecto_id" />
            </div>
            <div v-else class="sl-no-data">Sin datos</div>
          </div>

          <!-- Medidores (Quoia) -->
          <div class="sl-chart-card">
            <div class="sl-chart-title">
              <span class="sl-dot" style="background:#F6FF72" />
              Medidores
            </div>
            <div v-if="getMedidorData(proy.proyecto_id).labels.length"
              class="sl-chart-wrap">
              <Line
                :data="getMedidorData(proy.proyecto_id)"
                :options="chartOptions"
                :key="'med-' + proy.proyecto_id" />
            </div>
            <div v-else class="sl-no-data">Sin datos</div>
          </div>

        </div>
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
const detailMap   = reactive({})   // { proyecto_id: detailData } — reactive para que los charts detecten cambios
const lastUpdated = ref('')
let refreshTimer  = null

const STATUS_COLORS = {
  online: '#16a34a', degradado: '#d97706', caido: '#dc2626',
  sin_comunicacion: '#9ca3af', offline: '#d1d5db',
}

// ── Labels 0h–24h ─────────────────────────────────────────────────────────
const HOUR_LABELS = Array.from({ length: 25 }, (_, i) => `${i}h`)

function gaiaTime(t) {
  if (!t) return ''
  const idx = t.indexOf('T')
  return idx >= 0 ? t.slice(idx + 1, idx + 6) : t.slice(0, 5)
}

function mapHours(points, getTime, getW) {
  const buckets = {}
  for (const pt of points) {
    const raw = getTime(pt)
    if (!raw) continue
    const m = raw.match(/(\d{1,2}):\d{2}/)
    if (!m) continue
    const h = parseInt(m[1], 10)
    if (!buckets[h]) buckets[h] = []
    const v = getW(pt)
    if (v != null) buckets[h].push(v)
  }
  return HOUR_LABELS.map((_, i) => {
    const arr = buckets[i]
    if (!arr?.length) return null
    return +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)
  })
}

function getInversorData(id) {
  const d = detailMap[id]
  const curve = d?.power_curve ?? []
  if (!curve.length) return { labels: [], datasets: [] }
  const data = mapHours(
    curve,
    pt => { const t = pt.time || ''; return t.includes(' ') ? t.split(' ')[1] : t },
    pt => pt.kw != null ? +(pt.kw * 1000).toFixed(1) : null,
  )
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: HOUR_LABELS,
    datasets: [{
      label: 'Inversores (W)',
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
    r => +Math.abs(r.kw * 1000).toFixed(1),
  )
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: HOUR_LABELS,
    datasets: [{
      label: 'Medidores (W)',
      data,
      borderColor: '#F6FF72',
      backgroundColor: 'rgba(246,255,114,0.12)',
      fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2, spanGaps: true,
    }],
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1128',
      titleColor: '#FDFAF7',
      bodyColor: '#FDFAF7',
      callbacks: { label: ctx => `${ctx.parsed.y?.toLocaleString('es-CO')} W` },
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
      title: { display: true, text: 'W', font: { size: 9 }, color: '#a89fc0' },
    },
  },
}

// ── Carga ──────────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  try {
    const res = await api.get('/generacion-solar/monitoring')
    proyectos.value = res.data.projects ?? []
    lastUpdated.value = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    // Cargar detalles en paralelo (curvas + medidor)
    await Promise.allSettled(
      proyectos.value.map(p => loadDetail(p.proyecto_id))
    )
  } catch { /* silencioso */ } finally {
    loading.value = false
  }
}

async function loadDetail(id) {
  try {
    const res = await api.get(`/generacion-solar/monitoring/${id}`)
    detailMap[id] = res.data
  } catch { /* sin datos para este proyecto */ }
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

.sl-title {
  font-size: 20px;
  font-weight: 800;
  color: #FDFAF7;
  margin: 0;
}

.sl-subtitle {
  font-size: 12px;
  color: #a89fc0;
  margin: 3px 0 0;
}

.sl-ts { color: #6b5a8a; }

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
.sl-loading,
.sl-empty {
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
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Bloque de proyecto ── */
.sl-project-block {
  background: #2C2039;
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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

/* ── Fila de gráficas ── */
.sl-charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 640px) {
  .sl-charts-row { grid-template-columns: 1fr; }
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
