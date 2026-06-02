<template>
  <div class="sl-root">

    <!-- ══ TAB BAR ══ -->
    <div class="sl-tabbar">
      <div class="sl-tabs">
        <button :class="['sl-tab', tab === 'live' && 'sl-tab--active']" @click="tab = 'live'">
          <i class="pi pi-bolt" /> Tiempo Real
        </button>
        <button :class="['sl-tab', tab === 'hist' && 'sl-tab--active']" @click="tab = 'hist'">
          <i class="pi pi-chart-line" /> Histórico
        </button>
      </div>
    </div>

    <!-- ══ LIVE TAB ══ -->
    <div v-if="tab === 'live'" class="sl-page">

    <!-- ══ HEADER ══ -->
    <div class="sl-header">
      <div>
        <h1 class="sl-title">Generación Solar</h1>
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
        <!-- Botón actualizar + auto-refresh -->
        <div class="sl-refresh-wrap">
          <button class="sl-refresh-btn" @click="cargar" :disabled="loading">
            <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
            Actualizar
          </button>
          <div class="sl-auto-wrap">
            <button class="sl-auto-btn" :class="autoInterval && 'sl-auto-btn--on'" @click="toggleAutoMenu" :title="autoInterval ? `Auto: ${autoLabel}` : 'Auto-actualizar'">
              <i class="pi pi-clock" />
              <span v-if="autoInterval" class="sl-auto-label">{{ autoLabel }}</span>
              <i class="pi pi-chevron-down sl-auto-caret" />
            </button>
            <div v-if="autoMenuOpen" class="sl-auto-menu">
              <button class="sl-auto-option" :class="!autoInterval && 'sl-auto-option--active'" @click="setAuto(0)">Desactivado</button>
              <button v-for="opt in autoOptions" :key="opt.ms" class="sl-auto-option" :class="autoInterval === opt.ms && 'sl-auto-option--active'" @click="setAuto(opt.ms)">
                Cada {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
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

    <!-- ══ PROYECTOS (drag & drop) ══ -->
    <draggable
      v-else
      v-model="proyectos"
      item-key="proyecto_id"
      handle=".sl-drag-handle"
      class="sl-grid"
      :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }"
      @end="saveOrder"
    >
      <template #item="{ element: proy }">
        <div class="sl-project-block">

          <!-- Nombre + estado -->
          <div class="sl-project-name">
            <i class="pi pi-bars sl-drag-handle" title="Arrastrar para reorganizar" />
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
            <!-- % diferencia inversores vs medidores (mejor nodo) -->
            <div v-if="getDiffPct(proy.proyecto_id) !== null" class="sl-diff-row">
              <span class="sl-diff-label">Inversores vs Medidor</span>
              <span :class="['sl-diff-badge', Math.abs(getDiffPct(proy.proyecto_id)) > 5 ? 'sl-diff-warn' : 'sl-diff-ok']">
                {{ getDiffPct(proy.proyecto_id) > 0 ? '+' : '' }}{{ getDiffPct(proy.proyecto_id) }}%
              </span>
            </div>

            <!-- Gráficas -->
            <div class="sl-charts-row">

              <!-- Inversores -->
              <div class="sl-chart-card">
                <div class="sl-chart-header">
                  <div class="sl-chart-title">
                    <span class="sl-dot" style="background:#915BD8" />
                    Inversores
                  </div>
                  <span v-if="getInversorAcum(proy.proyecto_id) !== null" class="sl-acum inv">
                    {{ getInversorAcum(proy.proyecto_id).toFixed(1) }} kWh
                  </span>
                </div>
                <div v-if="getInversorData(proy.proyecto_id).labels.length" class="sl-chart-wrap">
                  <Line :data="getInversorData(proy.proyecto_id)" :options="chartOptionsInv"
                    :plugins="[crosshairPlugin]" :key="'inv-' + proy.proyecto_id" />
                </div>
                <div v-else class="sl-no-data">Sin datos</div>
              </div>

              <!-- Medidores (mejor nodo: principal o respaldo) -->
              <div class="sl-chart-card">
                <div class="sl-chart-header">
                  <div class="sl-chart-title">
                    <span class="sl-dot" style="background:#F6FF72" />
                    Medidores
                    <span v-if="getBestMedidorTipo(proy.proyecto_id)" class="sl-med-tipo">
                      {{ getBestMedidorTipo(proy.proyecto_id) }}
                    </span>
                  </div>
                  <span v-if="getMedidorAcum(proy.proyecto_id) !== null" class="sl-acum med">
                    {{ getMedidorAcum(proy.proyecto_id).toFixed(1) }} kWh
                  </span>
                </div>
                <div v-if="getMedidorData(proy.proyecto_id).labels.length" class="sl-chart-wrap">
                  <Line :data="getMedidorData(proy.proyecto_id)" :options="chartOptionsMed"
                    :plugins="[crosshairPlugin]" :key="'med-' + proy.proyecto_id" />
                </div>
                <div v-else class="sl-no-data">Sin datos</div>
              </div>

            </div>
          </template>
        </div>
      </template>
    </draggable>

    </div><!-- /sl-page live -->

    <!-- ══ HISTORIC TAB ══ -->
    <div v-else class="sl-hist">
      <GeneracionView />
    </div>

  </div><!-- /sl-root -->
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import draggable from 'vuedraggable'
import api from '@/api/client'
import GeneracionView from '@/views/Operaciones/GeneracionView.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const STORAGE_KEY = 'solar_project_order'

// ── Tab ────────────────────────────────────────────────────────────────────
const tab = ref('live')

// ── Estado ─────────────────────────────────────────────────────────────────
const loading     = ref(false)
const proyectos   = ref([])
const detailMap   = reactive({})
const lastUpdated = ref('')
const cols        = ref(1)
let refreshTimer  = null

// ── Auto-refresh ───────────────────────────────────────────────────────────
const AUTO_KEY = 'solar_auto_refresh'
const autoOptions = [
  { ms: 60000,  label: '1 min' },
  { ms: 300000, label: '5 min' },
  { ms: 900000, label: '15 min' },
  { ms: 1800000,label: '30 min' },
]
const autoInterval = ref(parseInt(localStorage.getItem(AUTO_KEY) || '0'))
const autoMenuOpen = ref(false)
const autoLabel    = computed(() => autoOptions.find(o => o.ms === autoInterval.value)?.label ?? '')

function setAuto(ms) {
  autoMenuOpen.value = false
  autoInterval.value = ms
  localStorage.setItem(AUTO_KEY, String(ms))
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = ms ? setInterval(cargar, ms) : null
}

function toggleAutoMenu() { autoMenuOpen.value = !autoMenuOpen.value }

function onClickOutside(e) {
  if (!e.target.closest('.sl-auto-wrap')) autoMenuOpen.value = false
}

const STATUS_COLORS = {
  online: '#16a34a', degradado: '#d97706', caido: '#dc2626',
  sin_comunicacion: '#9ca3af', offline: '#d1d5db',
}

// ── Orden persistido ───────────────────────────────────────────────────────
function saveOrder() {
  const order = proyectos.value.map(p => p.proyecto_id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
}

function applyOrder(list) {
  try {
    const order = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!order.length) return list
    const map = Object.fromEntries(list.map(p => [p.proyecto_id, p]))
    const sorted = order.map(id => map[id]).filter(Boolean)
    const rest = list.filter(p => !order.includes(p.proyecto_id))
    return [...sorted, ...rest]
  } catch { return list }
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

// ── Datos de gráficas ─────────────────────────────────────────────────────
function getInversorData(id) {
  const curve = detailMap[id]?.power_curve ?? []
  if (!curve.length) return { labels: [], datasets: [] }
  const data = mapHours(
    curve,
    pt => { const t = pt.time || ''; return t.includes(' ') ? t.split(' ')[1] : t },
    pt => pt.kw != null ? +pt.kw : null,
  )
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: HOUR_LABELS,
    datasets: [{ label: 'Inversores (kW)', data, borderColor: '#915BD8',
      backgroundColor: 'rgba(145,91,216,0.18)', fill: true, tension: 0.35,
      pointRadius: 0, borderWidth: 2, spanGaps: true }],
  }
}

function getMedidorData(id) {
  const snap = _bestMedidorSnap(id).snap
  const rows = (snap?.time_series?.power ?? []).filter(r => r.kw != null)
  if (!rows.length) return { labels: [], datasets: [] }
  const data = mapHours(rows, r => gaiaTime(r.time), r => +Math.abs(r.kw))
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: HOUR_LABELS,
    datasets: [{ label: 'Medidores (kW)', data, borderColor: '#F6FF72',
      backgroundColor: 'rgba(246,255,114,0.12)', fill: true, tension: 0.35,
      pointRadius: 0, borderWidth: 2, spanGaps: true }],
  }
}

// ── Acumulados ────────────────────────────────────────────────────────────
// Fecha de hoy en hora Colombia (UTC-5) para coincidir con el backend
const _todayStr = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)

function getInversorAcum(id) {
  // Fuente primaria: generación real del día desde Solenium
  const gen30 = detailMap[id]?.generation_30d ?? []
  const hoy = gen30.find(d => d.date === _todayStr)
  if (hoy?.kwh > 0) return hoy.kwh
  // Fallback: integración trapezoidal de la curva de potencia
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

// ── Selección del mejor snapshot de medidor ───────────────────────────────
function _bestMedidorSnap(id) {
  const d = detailMap[id]
  if (!d) return { snap: null, tipo: null }
  const sp = d.gaia_snapshot_principal
  const sr = d.gaia_snapshot_respaldo
  const ep = sp?.eae_wh ?? 0
  const er = sr?.eae_wh ?? 0
  if (!sp && !sr) return { snap: null, tipo: null }
  if (!sp) return { snap: sr, tipo: 'R' }
  if (!sr) return { snap: sp, tipo: 'P' }
  return ep >= er ? { snap: sp, tipo: 'P' } : { snap: sr, tipo: 'R' }
}

function getBestMedidorTipo(id) {
  const d = detailMap[id]
  if (!d?.gaia_snapshot_respaldo) return null   // solo hay uno, no hace falta etiqueta
  return _bestMedidorSnap(id).tipo
}

function getMedidorAcum(id) {
  const eae = _bestMedidorSnap(id).snap?.eae_wh
  return (eae != null && eae > 0) ? eae : null
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

// ── % diferencia ─────────────────────────────────────────────────────────
function getDiffPct(id) {
  const inv = getInversorAcum(id)
  const med = getMedidorAcum(id)
  if (inv == null || med == null || med === 0) return null
  return +((inv - med) / med * 100).toFixed(1)
}

// ── Chart options ─────────────────────────────────────────────────────────
function makeOptions(color) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1128', titleColor: '#FDFAF7', bodyColor: color,
        callbacks: { label: ctx => `${ctx.parsed.y != null ? ctx.parsed.y.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'} kW` },
      },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, color: '#a89fc0', maxTicksLimit: 13 }, grid: { color: 'rgba(255,255,255,0.06)' } },
      y: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#a89fc0' }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'kW', font: { size: 9 }, color: '#a89fc0' } },
    },
  }
}

const chartOptionsInv = makeOptions('#915BD8')
const chartOptionsMed = makeOptions('#F6FF72')

// ── Carga ─────────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  try {
    const res = await api.get('/generacion-solar/monitoring')
    proyectos.value = applyOrder(res.data.projects ?? [])
    lastUpdated.value = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch { /* silencioso */ } finally {
    loading.value = false
  }
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
  if (autoInterval.value) refreshTimer = setInterval(cargar, autoInterval.value)
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
/* ── Root (full height shell) ── */
.sl-root {
  display: flex; flex-direction: column; height: 100%; overflow: hidden;
  font-family: 'Sora', system-ui, sans-serif; background: #2C2039;
}

/* ── Tab bar ── */
.sl-tabbar {
  display: flex; align-items: center; padding: 10px 20px 0;
  background: #2C2039; border-bottom: 1px solid #3d2f52; flex-shrink: 0;
}
.sl-tabs { display: flex; gap: 2px; }
.sl-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px 9px; border: none; background: transparent; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #6b5a8a; border-radius: 6px 6px 0 0;
  font-family: inherit; transition: color 0.15s; border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sl-tab:hover { color: #c4b3df; }
.sl-tab--active { color: #FDFAF7; border-bottom-color: #915BD8; }
.sl-tab i { font-size: 12px; }

/* ── Live tab content ── */
.sl-page {
  flex: 1; display: flex; flex-direction: column; gap: 20px;
  overflow-y: auto; padding: 24px; box-sizing: border-box;
}

/* ── Historic tab content ── */
.sl-hist {
  flex: 1; overflow-y: auto; background: #f3f4f6;
  padding: 0 24px 24px; box-sizing: border-box;
}

/* ── Header ── */
.sl-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sl-header-right { display: flex; align-items: center; gap: 10px; }
.sl-title { font-size: 20px; font-weight: 800; color: #FDFAF7; margin: 0; }
.sl-subtitle { font-size: 12px; color: #a89fc0; margin: 3px 0 0; }
.sl-ts { color: #6b5a8a; }

/* ── Column toggle ── */
.sl-cols-toggle { display: flex; gap: 4px; background: #1f1530; border: 1px solid #3d2f52; border-radius: 8px; padding: 3px; }
.sl-col-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 26px; border-radius: 6px; border: none; background: transparent; cursor: pointer; transition: background 0.15s; }
.sl-col-btn:hover { background: rgba(145,91,216,0.2); }
.sl-col-btn--active { background: #915BD8; }
.sl-col-icon { display: flex; gap: 2px; align-items: center; }
.sl-col-bar { display: block; width: 4px; height: 14px; border-radius: 2px; background: #a89fc0; }
.sl-col-btn--active .sl-col-bar { background: #fff; }

/* ── Refresh ── */
.sl-refresh-wrap { display: flex; align-items: center; gap: 6px; }
.sl-refresh-btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; background: #915BD8; color: #FDFAF7; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s; }
.sl-refresh-btn:hover:not(:disabled) { background: #7a3fc0; }
.sl-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Auto-refresh dropdown ── */
.sl-auto-wrap { position: relative; }
.sl-auto-btn { display: flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 8px; background: #3d2f52; color: #c4b3df; border: 1px solid #4e3a6a; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s; white-space: nowrap; }
.sl-auto-btn:hover { background: #4e3a6a; }
.sl-auto-btn--on { background: #4e3a6a; color: #d4a8ff; border-color: #915BD8; }
.sl-auto-label { font-size: 11px; }
.sl-auto-caret { font-size: 10px; }
.sl-auto-menu { position: absolute; right: 0; top: calc(100% + 6px); background: #2C2039; border: 1px solid #4e3a6a; border-radius: 10px; min-width: 140px; overflow: hidden; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.sl-auto-option { display: block; width: 100%; padding: 9px 14px; background: none; border: none; color: #c4b3df; font-size: 13px; text-align: left; cursor: pointer; transition: background 0.15s; }
.sl-auto-option:hover { background: #3d2f52; }
.sl-auto-option--active { background: #4e3a6a; color: #d4a8ff; font-weight: 600; }

/* ── Estados ── */
.sl-loading, .sl-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 0; color: #6b5a8a; font-size: 14px; }

/* ── Grid ── */
.sl-grid { display: grid; gap: 20px; }

/* ── Bloque proyecto ── */
.sl-project-block { background: #2C2039; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border: 1px solid #3d2f52; }

/* ── Drag handle ── */
.sl-drag-handle { font-size: 13px; color: #4a3960; cursor: grab; flex-shrink: 0; transition: color 0.15s; }
.sl-drag-handle:hover { color: #915BD8; }
.sl-drag-handle:active { cursor: grabbing; }

.sl-project-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #FDFAF7; }
.sl-status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sl-power-badge { margin-left: auto; font-size: 12px; font-weight: 700; color: #915BD8; background: rgba(145,91,216,0.15); padding: 2px 10px; border-radius: 999px; }

/* ── Loading detalle ── */
.sl-detail-loading { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b5a8a; padding: 8px 0; }

/* ── % Diferencia ── */
.sl-diff-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.sl-diff-label { color: #7b6a9a; }
.sl-diff-badge { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
.sl-diff-ok   { background: rgba(22,163,74,0.18);  color: #4ade80; }
.sl-diff-warn { background: rgba(217,119,6,0.18);   color: #fbbf24; }

/* ── Fila gráficas ── */
.sl-charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }

/* ── Tarjeta gráfica ── */
.sl-chart-card { background: #1f1530; border-radius: 10px; border: 1px solid #3d2f52; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.sl-chart-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sl-chart-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #a89fc0; }
.sl-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ── Acumulado ── */
.sl-acum { font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 999px; }
.sl-acum.inv { background: rgba(145,91,216,0.18); color: #c4a1f7; }
.sl-acum.med { background: rgba(246,255,114,0.12); color: #e8f060; }
.sl-med-tipo { font-size: 9px; font-weight: 700; color: #6b5a8a; background: #3d2f52; border-radius: 4px; padding: 1px 5px; margin-left: 4px; }

/* ── Wrap gráfica ── */
.sl-chart-wrap { height: 180px; position: relative; }
.sl-no-data { height: 180px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #4a3960; }
</style>
