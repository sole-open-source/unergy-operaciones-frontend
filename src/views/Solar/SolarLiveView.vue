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
      <i class="pi pi-sun" style="font-size:32px;color:#cbd5e1" />
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

          <!-- Nombre + estado + reconectador -->
          <div class="sl-project-name">
            <i class="pi pi-bars sl-drag-handle" title="Arrastrar para reorganizar" />
            <span class="sl-status-dot" :style="{ background: STATUS_COLORS[proy.status] || '#9ca3af' }" />
            <span class="sl-project-nombre">{{ proy.nombre }}</span>
            <div class="sl-rcn-wrap" @click.stop>
              <span
                v-if="rcnMap[proy.proyecto_id]?.username"
                class="sl-rcn-user"
                :title="`Credenciales: ${rcnMap[proy.proyecto_id].username}`"
                @click="openEditCreds(proy)"
              >
                <i class="pi pi-user" />
              </span>
              <button
                :class="['sl-rcn-toggle', rcnMap[proy.proyecto_id]?.estado === 'ON' && 'sl-rcn-toggle--on']"
                :title="rcnMap[proy.proyecto_id]?.estado === 'ON' ? 'Reconectador ON — click para apagar' : 'Reconectador OFF — click para encender'"
                @click="onToggleRcn(proy)"
              >
                <span class="sl-rcn-thumb" />
              </button>
              <span
                :class="['sl-rcn-label', rcnMap[proy.proyecto_id]?.estado === 'ON' ? 'sl-rcn-label--on' : 'sl-rcn-label--off']"
              >{{ rcnMap[proy.proyecto_id]?.estado === 'ON' ? 'ON' : 'OFF' }}</span>
            </div>
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
                    <span class="sl-dot" style="background:#D4A017" />
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

            <!-- ── Generación de hoy ── -->
            <div class="sl-genhoy">
              <div class="sl-genhoy-head">
                <span class="sl-genhoy-title">
                  <i class="pi pi-sun" style="color:#f59e0b;font-size:11px" />
                  Generación de hoy
                </span>
                <div class="sl-genhoy-vals">
                  <span :style="{
                    color: getGenHoy(proy.proyecto_id).pct === null ? '#6b5a8a'
                         : getGenHoy(proy.proyecto_id).pct >= 100 ? '#4ade80'
                         : getGenHoy(proy.proyecto_id).pct >= 75  ? '#fbbf24'
                         : '#f87171',
                    fontWeight: 700, fontSize: '12px'
                  }">
                    {{ getGenHoy(proy.proyecto_id).real.toLocaleString('es-CO') }} kWh
                  </span>
                  <span style="color:#4a3960;font-size:11px">/</span>
                  <span style="color:#a89fc0;font-size:11px">
                    {{ getGenHoy(proy.proyecto_id).p90.toLocaleString('es-CO') }} kWh P90
                  </span>
                  <span v-if="getGenHoy(proy.proyecto_id).pct !== null"
                    class="sl-genhoy-pct"
                    :style="{
                      color: getGenHoy(proy.proyecto_id).pct >= 100 ? '#4ade80'
                           : getGenHoy(proy.proyecto_id).pct >= 75  ? '#fbbf24'
                           : '#f87171'
                    }">
                    {{ getGenHoy(proy.proyecto_id).pct }}%
                  </span>
                  <span v-if="getGenHoy(proy.proyecto_id).fuente === 'inversor'"
                    class="sl-genhoy-badge" title="Dato de inversores">INV</span>
                  <span v-else-if="getGenHoy(proy.proyecto_id).fuente === 'medidor'"
                    class="sl-genhoy-badge sl-genhoy-badge--med" title="Dato de medidor de frontera">MED</span>
                  <span v-else
                    class="sl-genhoy-badge sl-genhoy-badge--nd" title="Sin dato disponible">S/D</span>
                </div>
              </div>
              <div class="sl-genhoy-track">
                <div class="sl-genhoy-fill" :style="{
                  width: getGenHoy(proy.proyecto_id).p90 > 0
                    ? Math.min(100, getGenHoy(proy.proyecto_id).real / getGenHoy(proy.proyecto_id).p90 * 100) + '%'
                    : '0%',
                  background: getGenHoy(proy.proyecto_id).pct === null ? '#3d2f52'
                    : getGenHoy(proy.proyecto_id).pct >= 100 ? '#16a34a'
                    : getGenHoy(proy.proyecto_id).pct >= 75  ? '#d97706'
                    : getGenHoy(proy.proyecto_id).real > 0   ? '#dc2626'
                    : '#3d2f52'
                }" />
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

  <!-- ══ MODAL RECONECTADOR ══ -->
  <Teleport to="body">
    <div v-if="rcnModal.open" class="sl-modal-backdrop" @click.self="rcnModal.open = false">
      <div class="sl-modal">
        <div class="sl-modal-header">
          <div class="sl-modal-title">
            <span :class="['sl-modal-badge', rcnModal.accion === 'ON' ? 'sl-modal-badge--on' : 'sl-modal-badge--off']">
              {{ rcnModal.accion }}
            </span>
            <span>Reconectador — {{ rcnModal.nombre }}</span>
          </div>
          <button class="sl-modal-close" @click="rcnModal.open = false">
            <i class="pi pi-times" />
          </button>
        </div>

        <p class="sl-modal-desc">
          Ingresa tus credenciales de Solenium para <strong>{{ rcnModal.accion === 'ON' ? 'activar' : 'desactivar' }}</strong> el reconectador.
        </p>

        <div class="sl-modal-form">
          <label class="sl-modal-label">
            Usuario
            <input v-model="rcnModal.username" class="sl-modal-input" type="text"
              placeholder="usuario@solenium.co" autocomplete="username" />
          </label>
          <label class="sl-modal-label">
            Contraseña
            <input v-model="rcnModal.password" class="sl-modal-input" type="password"
              placeholder="••••••••" autocomplete="current-password"
              @keydown.enter="submitRcn" />
          </label>
          <label class="sl-modal-check">
            <input v-model="rcnModal.isInterrogating" type="checkbox" />
            <span>Is interrogating</span>
          </label>
        </div>

        <div v-if="rcnModal.error" class="sl-modal-error">
          <i class="pi pi-exclamation-triangle" />
          {{ rcnModal.error }}
        </div>

        <div class="sl-modal-actions">
          <button class="sl-modal-cancel" @click="rcnModal.open = false" :disabled="rcnModal.loading">
            Cancelar
          </button>
          <button
            :class="['sl-modal-submit', rcnModal.accion === 'ON' ? 'sl-modal-submit--on' : 'sl-modal-submit--off']"
            @click="submitRcn"
            :disabled="rcnModal.loading || !rcnModal.username || !rcnModal.password"
          >
            <i v-if="rcnModal.loading" class="pi pi-spin pi-spinner" />
            <i v-else-if="rcnModal.accion === 'ON'" class="pi pi-power-off" />
            <i v-else class="pi pi-stop-circle" />
            {{ rcnModal.loading ? 'Enviando...' : `Confirmar ${rcnModal.accion}` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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

// ── Generación de hoy ──────────────────────────────────────────────────────
const genHoyMap  = reactive({})   // proyecto_id → { kwh_real, fuente }
const p90List    = ref([])        // proyectos con p90_mensual_kwh

const _todayColStr = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)

function dailyP90(proyectoId) {
  const p   = p90List.value.find(x => x.id === proyectoId)
  const arr = p?.p90_mensual_kwh
  if (!arr?.length) return 0
  const dt           = new Date(_todayColStr + 'T00:00:00')
  const daysInMonth  = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate()
  return +((Number(arr[dt.getMonth()]) || 0) / daysInMonth).toFixed(1)
}

function getGenHoy(id) {
  const g    = genHoyMap[id]
  const real = g ? +Number(g.kwh_real || 0).toFixed(1) : 0
  const p90  = dailyP90(id)
  const fuente = g?.fuente ?? 'sin_dato'
  const pct  = p90 > 0 ? Math.round(real / p90 * 100) : null
  return { real, p90, fuente, pct }
}

async function cargarGenHoy() {
  try {
    const [resHoy, resProy] = await Promise.all([
      api.get('/generacion-solar/generacion-hoy'),
      api.get('/proyectos', { params: { size: 500 } }),
    ])
    p90List.value = resProy.data.items ?? []
    for (const row of resHoy.data.proyectos ?? []) {
      genHoyMap[row.proyecto_id] = { kwh_real: row.kwh_real, fuente: row.fuente }
    }
  } catch { /* silencioso */ }
}

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
    ctx.strokeStyle = 'rgba(28,18,50,0.18)'
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.restore()
  },
}

// ── Labels cada 5 min (00:00–23:55) ──────────────────────────────────────
const TIME_LABELS = Array.from({ length: 288 }, (_, i) => {
  const h = Math.floor(i * 5 / 60)
  const m = (i * 5) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function gaiaTime(t) {
  if (!t) return ''
  const idx = t.indexOf('T')
  return idx >= 0 ? t.slice(idx + 1, idx + 6) : t.slice(0, 5)
}

function mapMinutes(points, getTime, getKw) {
  const buckets = {}
  for (const pt of points) {
    const raw = getTime(pt)
    if (!raw) continue
    const m = raw.match(/(\d{1,2}):(\d{2})/)
    if (!m) continue
    const slot = parseInt(m[1], 10) * 12 + Math.floor(parseInt(m[2], 10) / 5)
    if (!buckets[slot]) buckets[slot] = []
    const v = getKw(pt)
    if (v != null) buckets[slot].push(v)
  }
  return TIME_LABELS.map((_, i) => {
    const arr = buckets[i]
    if (!arr?.length) return null
    return +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3)
  })
}

// ── Datos de gráficas ─────────────────────────────────────────────────────
function getInversorData(id) {
  const curve = detailMap[id]?.power_curve ?? []
  if (!curve.length) return { labels: [], datasets: [] }
  const data = mapMinutes(
    curve,
    pt => { const t = pt.time || ''; return t.includes(' ') ? t.split(' ')[1] : t },
    pt => pt.kw != null ? +pt.kw : null,
  )
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: TIME_LABELS,
    datasets: [{ label: 'Inversores (kW)', data, borderColor: '#915BD8',
      backgroundColor: 'rgba(145,91,216,0.18)', fill: true, tension: 0.35,
      pointRadius: 0, borderWidth: 2, spanGaps: true }],
  }
}

function getMedidorData(id) {
  const snap = _bestMedidorSnap(id).snap
  const rows = (snap?.time_series?.power ?? []).filter(r => r.kw != null)
  if (!rows.length) return { labels: [], datasets: [] }
  const data = mapMinutes(rows, r => gaiaTime(r.time), r => +Math.abs(r.kw))
  if (data.every(v => v == null)) return { labels: [], datasets: [] }
  return {
    labels: TIME_LABELS,
    datasets: [{ label: 'Medidores (kW)', data, borderColor: '#D4A017',
      backgroundColor: 'rgba(212,160,23,0.15)', fill: true, tension: 0.35,
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
        backgroundColor: '#ffffff', titleColor: '#374151', bodyColor: '#4b5563',
        borderColor: '#e5e7eb', borderWidth: 1, padding: 10, displayColors: true,
        callbacks: { label: ctx => `${ctx.parsed.y != null ? ctx.parsed.y.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'} kW` },
      },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, color: '#9ca3af', maxTicksLimit: 9 }, grid: { color: 'rgba(28,18,50,0.06)' } },
      y: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#9ca3af' }, grid: { color: 'rgba(28,18,50,0.06)' }, title: { display: true, text: 'kW', font: { size: 9 }, color: '#9ca3af' } },
    },
  }
}

const chartOptionsInv = makeOptions('#915BD8')
const chartOptionsMed = makeOptions('#D4A017')

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
  // Cargar gen-hoy y detalles en paralelo
  cargarGenHoy()
  const ids = proyectos.value.map(p => p.proyecto_id)
  const BATCH = 10
  for (let i = 0; i < ids.length; i += BATCH) {
    await Promise.all(ids.slice(i, i + BATCH).map(id => loadDetail(id)))
  }
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

// ── Reconectadores ────────────────────────────────────────────────────────────
// rcnMap: { [proyecto_id]: { estado: 'ON'|'OFF', username: string } }
// El estado y username se persisten en localStorage; la contraseña NUNCA se guarda.
const RCN_KEY  = 'sl_reconectadores_v1'
const rcnMap   = reactive(JSON.parse(localStorage.getItem(RCN_KEY) || '{}'))

function _saveRcn() {
  localStorage.setItem(RCN_KEY, JSON.stringify(rcnMap))
}

// Estado del modal
const rcnModal = reactive({
  open:           false,
  proyectoId:     null,
  nombre:         '',
  accion:         'ON',      // 'ON' | 'OFF'
  username:       '',
  password:       '',
  isInterrogating: true,
  loading:        false,
  error:          '',
})

function onToggleRcn(proy) {
  const current = rcnMap[proy.proyecto_id]?.estado ?? 'OFF'
  const nextAccion = current === 'ON' ? 'OFF' : 'ON'
  rcnModal.proyectoId    = proy.proyecto_id
  rcnModal.nombre        = proy.nombre
  rcnModal.accion        = nextAccion
  rcnModal.username      = rcnMap[proy.proyecto_id]?.username ?? ''
  rcnModal.password      = ''
  rcnModal.isInterrogating = true
  rcnModal.error         = ''
  rcnModal.loading       = false
  rcnModal.open          = true
}

function openEditCreds(proy) {
  rcnModal.proyectoId    = proy.proyecto_id
  rcnModal.nombre        = proy.nombre
  rcnModal.accion        = rcnMap[proy.proyecto_id]?.estado ?? 'OFF'
  rcnModal.username      = rcnMap[proy.proyecto_id]?.username ?? ''
  rcnModal.password      = ''
  rcnModal.isInterrogating = true
  rcnModal.error         = ''
  rcnModal.loading       = false
  rcnModal.open          = true
}

async function submitRcn() {
  if (!rcnModal.username || !rcnModal.password) return
  rcnModal.loading = true
  rcnModal.error   = ''
  try {
    await api.post(`/reconectadores/${rcnModal.proyectoId}/comando`, {
      username:         rcnModal.username,
      password:         rcnModal.password,
      accion:           rcnModal.accion,
      is_interrogating: rcnModal.isInterrogating,
    })
    // Persistir estado y username (nunca la contraseña)
    rcnMap[rcnModal.proyectoId] = {
      estado:   rcnModal.accion,
      username: rcnModal.username,
    }
    _saveRcn()
    rcnModal.open = false
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Error desconocido'
    rcnModal.error = msg
  } finally {
    rcnModal.loading = false
  }
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
  font-family: 'Sora', system-ui, sans-serif; background: #f3f4f6;
}

/* ── Tab bar ── */
.sl-tabbar {
  display: flex; align-items: center; padding: 10px 24px 0;
  background: #f3f4f6; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.sl-tabs { display: flex; gap: 2px; }
.sl-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px 9px; border: none; background: transparent; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #6b5a8a; border-radius: 6px 6px 0 0;
  font-family: inherit; transition: color 0.15s; border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sl-tab:hover { color: #2C2039; }
.sl-tab--active { color: #915BD8; border-bottom-color: #915BD8; }
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
.sl-title { font-size: 20px; font-weight: 800; color: #2C2039; margin: 0; }
.sl-subtitle { font-size: 12px; color: #6b5a8a; margin: 3px 0 0; }
.sl-ts { color: #9ca3af; }

/* ── Column toggle ── */
.sl-cols-toggle { display: flex; gap: 4px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 3px; }
.sl-col-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 26px; border-radius: 6px; border: none; background: transparent; cursor: pointer; transition: background 0.15s; }
.sl-col-btn:hover { background: rgba(145,91,216,0.12); }
.sl-col-btn--active { background: #915BD8; }
.sl-col-icon { display: flex; gap: 2px; align-items: center; }
.sl-col-bar { display: block; width: 4px; height: 14px; border-radius: 2px; background: #9ca3af; }
.sl-col-btn--active .sl-col-bar { background: #fff; }

/* ── Refresh ── */
.sl-refresh-wrap { display: flex; align-items: center; gap: 6px; }
.sl-refresh-btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; background: #915BD8; color: #fff; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s; }
.sl-refresh-btn:hover:not(:disabled) { background: #7a3fc0; }
.sl-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Auto-refresh dropdown ── */
.sl-auto-wrap { position: relative; }
.sl-auto-btn { display: flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 8px; background: #fff; color: #6b5a8a; border: 1px solid #e5e7eb; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
.sl-auto-btn:hover { background: #f3f1f8; color: #2C2039; }
.sl-auto-btn--on { background: rgba(145,91,216,0.1); color: #7c3aed; border-color: #915BD8; }
.sl-auto-label { font-size: 11px; }
.sl-auto-caret { font-size: 10px; }
.sl-auto-menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; min-width: 140px; overflow: hidden; z-index: 50; box-shadow: 0 8px 24px rgba(28,18,50,0.12); }
.sl-auto-option { display: block; width: 100%; padding: 9px 14px; background: none; border: none; color: #4a3b6b; font-size: 13px; text-align: left; cursor: pointer; transition: background 0.15s; }
.sl-auto-option:hover { background: #f3f1f8; }
.sl-auto-option--active { background: rgba(145,91,216,0.1); color: #7c3aed; font-weight: 600; }

/* ── Estados ── */
.sl-loading, .sl-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 0; color: #6b5a8a; font-size: 14px; }

/* ── Grid ── */
.sl-grid { display: grid; gap: 20px; }

/* ── Bloque proyecto ── */
.sl-project-block { background: #fff; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; border: 1px solid #ece8f4; box-shadow: 0 1px 3px rgba(28,18,50,0.04); }

/* ── Drag handle ── */
.sl-drag-handle { font-size: 13px; color: #cbd5e1; cursor: grab; flex-shrink: 0; transition: color 0.15s; }
.sl-drag-handle:hover { color: #915BD8; }
.sl-drag-handle:active { cursor: grabbing; }

.sl-project-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #2C2039; }
.sl-status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sl-power-badge { margin-left: auto; font-size: 12px; font-weight: 700; color: #915BD8; background: rgba(145,91,216,0.12); padding: 2px 10px; border-radius: 999px; }

/* ── Loading detalle ── */
.sl-detail-loading { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #9ca3af; padding: 8px 0; }

/* ── % Diferencia ── */
.sl-diff-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.sl-diff-label { color: #6b5a8a; }
.sl-diff-badge { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
.sl-diff-ok   { background: rgba(22,163,74,0.1);  color: #16a34a; }
.sl-diff-warn { background: rgba(217,119,6,0.12);   color: #d97706; }

/* ── Fila gráficas ── */
.sl-charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }

/* ── Tarjeta gráfica ── */
.sl-chart-card { background: #f9fafb; border-radius: 10px; border: 1px solid #eef0f4; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.sl-chart-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sl-chart-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b5a8a; }
.sl-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ── Acumulado ── */
.sl-acum { font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 999px; }
.sl-acum.inv { background: rgba(145,91,216,0.12); color: #7c3aed; }
.sl-acum.med { background: rgba(212,160,23,0.14); color: #a16207; }
.sl-med-tipo { font-size: 9px; font-weight: 700; color: #6b5a8a; background: #f3f1f8; border-radius: 4px; padding: 1px 5px; margin-left: 4px; }

/* ── Wrap gráfica ── */
.sl-chart-wrap { height: 180px; position: relative; }
.sl-no-data { height: 180px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #cbd5e1; }

/* ── Generación de hoy ── */
.sl-genhoy { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; border-top: 1px solid #ece8f4; }
.sl-genhoy-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.sl-genhoy-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #915BD8; }
.sl-genhoy-vals { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sl-genhoy-pct { font-size: 11px; font-weight: 700; }
.sl-genhoy-badge { font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 4px; background: rgba(145,91,216,0.12); color: #7c3aed; letter-spacing: 0.3px; }
.sl-genhoy-badge--med { background: rgba(212,160,23,0.14); color: #a16207; }
.sl-genhoy-badge--nd  { background: #f1f0f5; color: #9ca3af; }
.sl-genhoy-track { height: 5px; background: #e9e6f5; border-radius: 999px; overflow: hidden; }
.sl-genhoy-fill  { height: 100%; border-radius: 999px; transition: width 0.6s ease, background 0.3s; }

/* ── Project name row ── */
.sl-project-nombre { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Reconectador toggle ── */
.sl-rcn-wrap { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.sl-rcn-user {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; background: #f0edf8;
  color: #915BD8; font-size: 10px; cursor: pointer; transition: background 0.15s;
}
.sl-rcn-user:hover { background: #e4dbf5; }
.sl-rcn-toggle {
  position: relative; width: 36px; height: 20px; border-radius: 999px;
  background: #d1d5db; border: none; cursor: pointer; padding: 0;
  transition: background 0.25s; flex-shrink: 0;
}
.sl-rcn-toggle--on  { background: #16a34a; }
.sl-rcn-toggle:hover:not(.sl-rcn-toggle--on)  { background: #b8bcc4; }
.sl-rcn-toggle--on:hover  { background: #15803d; }
.sl-rcn-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 14px; height: 14px; border-radius: 50%; background: #fff;
  transition: transform 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.sl-rcn-toggle--on .sl-rcn-thumb { transform: translateX(16px); }
.sl-rcn-label { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; min-width: 22px; }
.sl-rcn-label--on  { color: #16a34a; }
.sl-rcn-label--off { color: #9ca3af; }

/* ── Modal backdrop ── */
.sl-modal-backdrop {
  position: fixed; inset: 0; background: rgba(44,32,57,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; backdrop-filter: blur(2px);
}

/* ── Modal card ── */
.sl-modal {
  background: #fff; border-radius: 16px; padding: 28px 32px;
  width: 100%; max-width: 420px; box-shadow: 0 24px 48px rgba(0,0,0,0.18);
  display: flex; flex-direction: column; gap: 18px;
  font-family: 'Sora', system-ui, sans-serif;
}
.sl-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sl-modal-title  { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 800; color: #2C2039; }
.sl-modal-close  { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 14px; padding: 4px; border-radius: 6px; transition: color 0.15s; }
.sl-modal-close:hover { color: #6b7280; }

.sl-modal-badge {
  font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px;
  letter-spacing: 1px;
}
.sl-modal-badge--on  { background: rgba(22,163,74,0.12); color: #16a34a; }
.sl-modal-badge--off { background: rgba(220,38,38,0.1);  color: #dc2626; }

.sl-modal-desc { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; }

.sl-modal-form  { display: flex; flex-direction: column; gap: 14px; }
.sl-modal-label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 700; color: #4b5563; }
.sl-modal-input {
  border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 9px 12px;
  font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s;
  color: #111827;
}
.sl-modal-input:focus { border-color: #915BD8; }

.sl-modal-check { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; }
.sl-modal-check input { accent-color: #915BD8; width: 14px; height: 14px; cursor: pointer; }

.sl-modal-error {
  display: flex; align-items: flex-start; gap: 8px;
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
  padding: 10px 14px; font-size: 13px; color: #dc2626; line-height: 1.4;
}

.sl-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }
.sl-modal-cancel {
  padding: 9px 18px; border-radius: 8px; border: 1.5px solid #e5e7eb;
  background: #fff; color: #6b7280; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: border-color 0.15s, color 0.15s;
}
.sl-modal-cancel:hover:not(:disabled) { border-color: #d1d5db; color: #374151; }
.sl-modal-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.sl-modal-submit {
  display: flex; align-items: center; gap: 7px;
  padding: 9px 20px; border-radius: 8px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: opacity 0.15s;
  color: #fff;
}
.sl-modal-submit--on  { background: #16a34a; }
.sl-modal-submit--on:hover:not(:disabled)  { background: #15803d; }
.sl-modal-submit--off { background: #dc2626; }
.sl-modal-submit--off:hover:not(:disabled) { background: #b91c1c; }
.sl-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
