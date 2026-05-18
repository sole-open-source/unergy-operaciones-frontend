<template>
  <div class="p-6 space-y-6 min-h-screen" style="background: #FDFAF7; color: #2C2039;">

    <!-- Header + Selectores -->
    <div class="flex flex-col md:flex-row md:items-end gap-4 justify-between">
      <div>
        <h1 class="text-2xl font-bold" style="color: #2C2039;">Cumplimiento energético</h1>
        <p class="text-sm mt-0.5" style="color: #7a6e8a;">Balance contractual MWh por período</p>
      </div>
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Contrato</label>
          <Select v-model="selectedContratoId" :options="contratos" optionLabel="label" optionValue="id"
            placeholder="Seleccionar contrato" class="w-60" @change="loadData" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Mes</label>
          <Select v-model="selectedMonth" :options="MESES" optionLabel="label" optionValue="value" class="w-32" @change="loadData" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="selectedYear" :options="anios" class="w-24" @change="loadData" />
        </div>
      </div>
    </div>

    <!-- Cargando -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
      <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
      <p class="text-sm" style="color:#7a6e8a;">Consultando generación desde la API de Unergy…</p>
    </div>

    <!-- Error -->
    <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

    <!-- Sin compromisos -->
    <Message v-else-if="data && !data.compromisos.energia_minima_mwh" severity="warn" :closable="false">
      No hay compromisos de energía definidos para {{ MESES[selectedMonth - 1]?.label }} {{ selectedYear }} en este contrato.
    </Message>

    <!-- Contenido principal -->
    <template v-else-if="data">

      <!-- Resumen período -->
      <div class="flex items-center gap-3 text-sm flex-wrap" style="color: #7a6e8a;">
        <span class="font-semibold" style="color:#2C2039;">{{ data.contrato.nombre_interno }}</span>
        <span>·</span>
        <span>{{ data.contrato.comprador_nombre }}</span>
        <span>·</span>
        <span v-if="data.periodo.es_mes_actual">
          Día {{ data.periodo.dia_actual }} de {{ data.periodo.dias_mes }}
          <span v-if="data.periodo.dia_min_datos && data.periodo.dia_min_datos < data.periodo.dia_actual" style="color:#915BD8;">
            · Datos hasta día {{ data.periodo.dia_min_datos }}
          </span>
        </span>
        <span v-else>Mes completo</span>
      </div>

      <!-- Grid principal -->
      <div class="grid gap-6" style="grid-template-columns: 1fr 380px;">

        <!-- Canvas -->
        <div class="flex flex-col gap-3">
          <div ref="skyBox" class="relative rounded-2xl overflow-hidden"
               style="height: 300px; background: #04020b; border: 1px solid rgba(145,91,216,0.3);">
            <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />
            <!-- Suelo solar -->
            <div class="absolute bottom-0 left-0 right-0 h-9"
                 style="background: #100b1e; border-top: 1px solid rgba(145,91,216,0.45);">
              <div class="flex gap-1.5 absolute left-1/2 -translate-x-1/2 top-1.5">
                <div v-for="i in 9" :key="i" class="w-5 h-3 rounded-sm"
                     style="background: #221440; border: 1px solid rgba(145,91,216,0.5);" />
              </div>
            </div>
          </div>

          <!-- Leyenda -->
          <div class="flex flex-wrap gap-5">
            <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
              <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#F6FF72" stroke-width="2.5"/></svg>
              Generación contrato
            </div>
            <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
              <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#e05567" stroke-width="1.5" stroke-dasharray="5,3"/></svg>
              Mínimo take-or-pay
            </div>
            <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
              <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#a77ee0" stroke-width="1.5"/></svg>
              Máximo give-or-take
            </div>
          </div>
        </div>

        <!-- Panel métricas -->
        <div class="flex flex-col gap-4">
          <div :class="['rounded-xl px-4 py-3 text-sm font-semibold text-center tracking-wide', statusClass]">
            {{ statusText }}
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="metric-card" style="background: rgba(44,32,57,0.06);">
              <div class="metric-label">Generado acum.</div>
              <div class="metric-value">{{ fmtMwh(data.generacion.gen_total_mwh) }}</div>
              <div class="metric-sub" v-if="data.periodo.es_mes_actual">Real hasta día {{ data.periodo.dia_actual }}</div>
            </div>

            <div v-if="data.periodo.es_mes_actual" class="metric-card" :class="projCardClass">
              <div class="metric-label">Proy. fin de mes</div>
              <div class="metric-value" :class="projValueClass">{{ fmtMwh(data.generacion.gen_proyectada_mwh) }}</div>
              <div class="metric-sub">Extrap. lineal</div>
            </div>

            <div class="metric-card" style="background: rgba(224,85,103,0.08); border: 1px solid rgba(224,85,103,0.25);">
              <div class="metric-label" style="color:#c0504d;">Mínimo contrato</div>
              <div class="metric-value">{{ fmtMwh(data.compromisos.energia_minima_mwh) }}</div>
            </div>

            <div class="metric-card" style="background: rgba(145,91,216,0.08); border: 1px solid rgba(145,91,216,0.3);">
              <div class="metric-label" style="color:#915BD8;">Máximo contrato</div>
              <div class="metric-value">{{ fmtMwh(data.compromisos.energia_maxima_mwh) }}</div>
            </div>

            <div class="metric-card" :class="data.balance.compras_bolsa_mwh > 0 ? 'danger' : ''">
              <div class="metric-label">Compra en bolsa</div>
              <div class="metric-value" :class="data.balance.compras_bolsa_mwh > 0 ? 'text-red-700 font-bold' : ''">
                {{ fmtMwh(data.balance.compras_bolsa_mwh) }}
              </div>
              <div class="metric-sub">max(0, mín − gen)</div>
            </div>

            <div class="metric-card" :class="data.balance.excedentes_bolsa_mwh > 0 ? 'warn' : ''">
              <div class="metric-label">Venta en bolsa</div>
              <div class="metric-value" :class="data.balance.excedentes_bolsa_mwh > 0 ? 'text-amber-700 font-bold' : ''">
                {{ fmtMwh(data.balance.excedentes_bolsa_mwh) }}
              </div>
              <div class="metric-sub">max(0, gen − máx)</div>
            </div>
          </div>

          <div v-if="data.generacion.tarifa_cop_kwh" class="rounded-lg px-4 py-2.5 text-sm flex justify-between items-center" style="background: rgba(44,32,57,0.06);">
            <span style="color:#7a6e8a;">Tarifa contrato</span>
            <span class="font-semibold">{{ data.generacion.tarifa_cop_kwh.toFixed(0) }} COP/kWh</span>
          </div>
          <div class="rounded-lg px-4 py-2.5 text-sm flex justify-between items-center" style="background: rgba(44,32,57,0.06);">
            <span style="color:#7a6e8a;">Plantas activas GESCON</span>
            <span class="font-semibold">{{ data.generacion.n_plantas_activas }}</span>
          </div>
        </div>
      </div>

      <!-- Tabla plantas -->
      <div>
        <h2 class="text-base font-semibold mb-3" style="color:#2C2039;">Desglose por planta</h2>
        <DataTable :value="data.generacion.plantas" size="small" stripedRows
          class="border rounded-xl overflow-hidden" style="border-color: rgba(44,32,57,0.12);">
          <Column field="nombre" header="Planta" sortable style="min-width:200px;" />
          <Column header="% Despacho" style="width:110px; text-align:right;">
            <template #body="{ data: row }">
              <span class="font-mono text-sm">{{ (row.pct_despacho * 100).toFixed(1) }}%</span>
            </template>
          </Column>
          <Column header="Gen. planta" style="width:120px; text-align:right;">
            <template #body="{ data: row }">
              <span v-if="row.gen_planta_mwh !== null" class="font-mono text-sm">{{ fmtMwh(row.gen_planta_mwh) }}</span>
              <Tag v-else-if="row.sin_api_id" value="Sin API ID" severity="warn" />
              <Tag v-else value="Sin datos" severity="danger" />
            </template>
          </Column>
          <Column header="Gen. contrato" style="width:130px; text-align:right;">
            <template #body="{ data: row }">
              <span v-if="row.gen_contrato_mwh !== null" class="font-mono text-sm font-semibold">{{ fmtMwh(row.gen_contrato_mwh) }}</span>
              <span v-else class="text-xs" style="color:#b0a0c0;">—</span>
            </template>
          </Column>
          <Column header="Último dato" style="width:120px; text-align:center;">
            <template #body="{ data: row }">
              <span v-if="row.ultimo_dia" class="text-sm"
                :style="row.ultimo_dia < data.periodo.dia_actual - 2 ? 'color:#c0504d;font-weight:600;' : 'color:#7a6e8a;'">
                Día {{ row.ultimo_dia }}
              </span>
              <span v-else class="text-xs" style="color:#b0a0c0;">—</span>
            </template>
          </Column>
          <Column style="width:50px; text-align:center;">
            <template #body="{ data: row }">
              <i v-if="row.sin_api_id" class="pi pi-exclamation-circle text-orange-500"
                 v-tooltip="'Planta sin API ID configurado en proyectos'" />
              <i v-else-if="row.sin_datos" class="pi pi-exclamation-triangle text-red-500"
                 v-tooltip="'Sin datos de generación en la API'" />
              <i v-else-if="row.ultimo_dia && row.ultimo_dia < data.periodo.dia_actual - 2"
                 class="pi pi-clock text-yellow-500"
                 v-tooltip="`Datos atrasados: último registro día ${row.ultimo_dia}`" />
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Alertas datos faltantes -->
      <div class="space-y-2">
        <Message v-if="data.generacion.sin_api_id.length > 0" severity="warn" :closable="false">
          <strong>Plantas sin API ID:</strong> {{ data.generacion.sin_api_id.join(', ') }}.
          Configura el campo <code>sub_project</code> en el detalle de cada proyecto.
        </Message>
        <Message v-if="data.generacion.plantas_sin_datos.length > 0" severity="error" :closable="false">
          <strong>Plantas sin datos de generación:</strong> {{ data.generacion.plantas_sin_datos.join(', ') }}.
          La generación acumulada está incompleta.
        </Message>
      </div>

    </template>

    <!-- Vacío -->
    <div v-else-if="!loading" class="text-center py-20" style="color:#7a6e8a;">
      <i class="pi pi-chart-line text-5xl mb-4 block" style="color:#915BD8;" />
      <p>Selecciona un contrato y período para ver el cumplimiento.</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import client from '@/api/client'

// ── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 }, { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 }, { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 },
]

const now  = new Date()
const anios = Array.from({ length: 8 }, (_, i) => 2023 + i)

// ── State ────────────────────────────────────────────────────────────────────

const contratos          = ref([])
const selectedContratoId = ref(null)
const selectedMonth      = ref(now.getMonth() + 1)
const selectedYear       = ref(now.getFullYear())
const data               = ref(null)
const loading            = ref(false)
const error              = ref(null)

const skyBox    = ref(null)
const canvasRef = ref(null)

// ── Computed ─────────────────────────────────────────────────────────────────

const statusClass = computed(() => {
  const e = data.value?.balance?.estado
  if (e === 'ok')        return 'status-ok'
  if (e === 'deficit')   return 'status-low'
  if (e === 'excedente') return 'status-high'
  return 'status-neutral'
})

const statusText = computed(() => {
  if (!data.value) return ''
  const { estado, compras_bolsa_mwh, excedentes_bolsa_mwh } = data.value.balance
  const { es_mes_actual } = data.value.periodo
  if (estado === 'ok')
    return es_mes_actual ? 'Proyección OK — dentro de la zona contractual' : 'Cumplimiento — zona contractual'
  if (estado === 'deficit')
    return `${es_mes_actual ? 'Proyección: d' : 'D'}éficit ${fmtMwh(compras_bolsa_mwh)} — compra en bolsa`
  if (estado === 'excedente')
    return `${es_mes_actual ? 'Proyección: e' : 'E'}xcedente ${fmtMwh(excedentes_bolsa_mwh)} — venta en bolsa`
  return 'Sin compromisos para este período'
})

const projCardClass = computed(() => {
  const e = data.value?.balance?.estado
  if (e === 'deficit')   return 'danger'
  if (e === 'excedente') return 'warn'
  if (e === 'ok')        return 'ok-dark'
  return ''
})

const projValueClass = computed(() => {
  const e = data.value?.balance?.estado
  if (e === 'deficit')   return 'text-red-700 font-bold'
  if (e === 'excedente') return 'text-amber-700 font-bold'
  return ''
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMwh(val) {
  if (val === null || val === undefined) return '—'
  return val.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MWh'
}

// ── Animation ────────────────────────────────────────────────────────────────

let animFrame = null
let _stars  = []
let _drops  = []   // lluvia (deficit)
let _sparks = []   // energía al cielo (excedente)
let _dust   = []   // partículas flotantes (ok)

function rnd() { return Math.random() }

function initParticles(estado, W, H, minYh, maxYh) {
  _stars = Array.from({ length: 55 }, () => ({
    x: rnd() * W,
    y: rnd() * H * 0.72,
    r: 0.3 + rnd() * 1.0,
    phase: rnd() * Math.PI * 2,
    freq:  0.3 + rnd() * 0.8,
  }))

  _drops = []; _sparks = []; _dust = []

  if (estado === 'deficit') {
    for (let i = 0; i < 60; i++) {
      const x = 20 + rnd() * (W - 40)
      _drops.push({
        x,
        y: -rnd() * H * 0.9,
        speed: 75 + rnd() * 90,
        len:   9 + rnd() * 13,
        alpha: 0.35 + rnd() * 0.45,
        slant: 0.10 + rnd() * 0.12,
        baseX: x,
      })
    }
  } else if (estado === 'excedente') {
    for (let i = 0; i < 55; i++) {
      const x = 20 + rnd() * (W - 40)
      _sparks.push({
        x, y: maxYh + rnd() * 12,
        vy: 25 + rnd() * 70,
        vx: (rnd() - 0.5) * 14,
        life:  rnd() * 1.5,
        total: 1.5 + rnd() * 1.8,
        size:  1.5 + rnd() * 2.5,
        baseX: x, baseY: maxYh,
      })
    }
  } else if (estado === 'ok') {
    const zoneH = Math.max(minYh - maxYh, 1)
    for (let i = 0; i < 32; i++) {
      const y = maxYh + rnd() * zoneH
      _dust.push({
        x: 20 + rnd() * (W - 40),
        y,
        vy: 6 + rnd() * 20,
        life:  rnd() * 4,
        total: 4 + rnd() * 5,
        size:  0.9 + rnd() * 1.8,
        baseY: maxYh, zoneH,
      })
    }
  }
}

function startAnimation() {
  stopAnimation()
  if (!data.value?.compromisos?.energia_minima_mwh) return
  const canvas = canvasRef.value
  const box    = skyBox.value
  if (!canvas || !box) return

  const GROUND = 36
  const W = box.offsetWidth
  const H = box.offsetHeight - GROUND
  canvas.width  = W
  canvas.height = H + GROUND

  const { gen_total_mwh, gen_proyectada_mwh } = data.value.generacion
  const { energia_minima_mwh: minV, energia_maxima_mwh: maxV } = data.value.compromisos
  const { es_mes_actual, dia_actual, dias_mes } = data.value.periodo
  const des     = es_mes_actual ? gen_proyectada_mwh : gen_total_mwh
  const fracMes = es_mes_actual ? dia_actual / dias_mes : 1
  const estado  = data.value.balance.estado

  const totalMax = Math.max(maxV * 1.35, des * 1.15, 900)
  const toY  = v  => H - (v / totalMax) * (H - 28) / 0.85
  const minYh = toY(minV)
  const maxYh = toY(maxV)

  initParticles(estado, W, H, minYh, maxYh)

  let lastTs = null
  const tick = (ts) => {
    const dt = lastTs === null ? 0.016 : Math.min((ts - lastTs) / 1000, 0.05)
    lastTs = ts
    render(ts / 1000, dt, W, H, des, gen_total_mwh, dias_mes, minV, maxV, fracMes, estado, totalMax, minYh, maxYh)
    animFrame = requestAnimationFrame(tick)
  }
  animFrame = requestAnimationFrame(tick)
}

function stopAnimation() {
  if (animFrame !== null) { cancelAnimationFrame(animFrame); animFrame = null }
}

function render(t, dt, W, H, des, genTotal, diasMes, minV, maxV, fracMes, estado, totalMax, minYh, maxYh) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx   = canvas.getContext('2d')
  const GROUND = 36
  const N      = 120
  const cxf    = f => 30 + f * (W - 60)
  const arcY   = (f, v) => H - Math.sin(f * Math.PI) * (H - 28) * (v / totalMax) / 0.85

  ctx.clearRect(0, 0, W, H + GROUND)

  // ── Sky ──────────────────────────────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0,    '#04020b')
  sky.addColorStop(0.45, '#0d0919')
  sky.addColorStop(1,    '#19102a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // ── Stars ─────────────────────────────────────────────────────────────
  for (const s of _stars) {
    const a = 0.15 + 0.80 * ((Math.sin(t * s.freq + s.phase) + 1) * 0.5)
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(253,250,247,${a.toFixed(2)})`
    ctx.fill()
  }

  // ── Zone band (min–max) ─────────────────────────────────────────────────
  const band = ctx.createLinearGradient(0, maxYh, 0, minYh)
  band.addColorStop(0,   'rgba(145,91,216,0.14)')
  band.addColorStop(0.5, 'rgba(246,255,114,0.06)')
  band.addColorStop(1,   'rgba(145,91,216,0.14)')
  ctx.fillStyle = band
  ctx.fillRect(0, maxYh, W, minYh - maxYh)

  // ── Tinte de estado ─────────────────────────────────────────────────────
  if (estado === 'deficit') {
    const fog = ctx.createLinearGradient(0, minYh, 0, H)
    fog.addColorStop(0, 'rgba(100,160,255,0.10)')
    fog.addColorStop(1, 'rgba(80,120,200,0.04)')
    ctx.fillStyle = fog
    ctx.fillRect(0, minYh, W, H - minYh)
  } else if (estado === 'excedente') {
    const glow = ctx.createLinearGradient(0, 0, 0, maxYh)
    glow.addColorStop(0, 'rgba(246,255,114,0.06)')
    glow.addColorStop(1, 'rgba(246,255,114,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, maxYh)
  }

  // ── Animaciones de estado ────────────────────────────────────────────────
  if (estado === 'deficit')        _animRain(ctx, dt, H)
  else if (estado === 'excedente') _animSparks(ctx, t, dt, W, maxYh)
  else if (estado === 'ok')        _animWave(ctx, t, dt, W, minYh, maxYh)

  // ── Arc: capas de halo (arco completo) ──────────────────────────────────
  const traceArc = (from = 0, to = 1) => {
    ctx.beginPath()
    const steps = Math.ceil(N * (to - from))
    for (let i = 0; i <= steps; i++) {
      const f = from + (i / steps) * (to - from)
      i === 0 ? ctx.moveTo(cxf(f), arcY(f, des)) : ctx.lineTo(cxf(f), arcY(f, des))
    }
  }
  ctx.setLineDash([])
  traceArc(); ctx.strokeStyle = 'rgba(246,255,114,0.04)'; ctx.lineWidth = 22; ctx.stroke()
  traceArc(); ctx.strokeStyle = 'rgba(246,255,114,0.10)'; ctx.lineWidth = 12; ctx.stroke()
  traceArc(); ctx.strokeStyle = 'rgba(246,255,114,0.18)'; ctx.lineWidth = 5;  ctx.stroke()

  // Tramo pasado (sólido) y tramo futuro (punteado) ─────────────────────
  const arcW = estado === 'ok' ? 2.0 + Math.sin(t * 1.4) * 0.6 : 2.5
  if (fracMes > 0 && fracMes < 1) {
    traceArc(0, fracMes)
    ctx.strokeStyle = '#F6FF72'; ctx.lineWidth = arcW; ctx.setLineDash([]); ctx.stroke()
    traceArc(fracMes, 1)
    ctx.strokeStyle = 'rgba(246,255,114,0.32)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke()
    ctx.setLineDash([])
  } else {
    traceArc(); ctx.strokeStyle = '#F6FF72'; ctx.lineWidth = arcW; ctx.setLineDash([]); ctx.stroke()
  }

  // ── Línea mínimo ──────────────────────────────────────────────────────────
  ctx.beginPath(); ctx.moveTo(0, minYh); ctx.lineTo(W, minYh)
  ctx.strokeStyle = '#e05567'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.stroke()
  ctx.setLineDash([])

  // ── Línea máximo ──────────────────────────────────────────────────────────
  ctx.beginPath(); ctx.moveTo(0, maxYh); ctx.lineTo(W, maxYh)
  ctx.strokeStyle = '#a77ee0'; ctx.lineWidth = 1.5; ctx.stroke()

  // ── Labels ────────────────────────────────────────────────────────────────
  ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right'
  ctx.fillStyle = '#e8798a'
  ctx.fillText(`mín ${Math.round(minV).toLocaleString('es-CO')} MWh`, W - 7, minYh - 5)
  ctx.fillStyle = '#b794e8'
  ctx.fillText(`máx ${Math.round(maxV).toLocaleString('es-CO')} MWh`, W - 7, maxYh - 5)
  ctx.textAlign = 'left'

  // ── Sol ───────────────────────────────────────────────────────────────────
  _drawSun(ctx, t, cxf(0.5), arcY(0.5, des))

  // ── Anotaciones de período ────────────────────────────────────────────────
  const _fmt = v => (v ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MWh'
  const _pill = (text, cx2, cy2, bg, fg, border) => {
    ctx.font = '600 11px system-ui, sans-serif'
    const tw = ctx.measureText(text).width + 18, ph = 22
    const px = Math.min(Math.max(cx2 - tw / 2, 4), W - tw - 4)
    const py = Math.min(Math.max(cy2, 4), H - ph - 4)
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(px, py, tw, ph, 5) : ctx.rect(px, py, tw, ph)
    ctx.fill()
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke() }
    ctx.fillStyle = fg; ctx.textAlign = 'left'
    ctx.fillText(text, px + 9, py + 15)
    return { px, tw, py, ph }
  }

  if (fracMes > 0 && fracMes < 1) {
    const dayX   = cxf(fracMes)
    const dotY   = arcY(fracMes, des)
    const diaNum = Math.round(fracMes * diasMes)
    const resta  = diasMes - diaNum

    // Línea del día (halo + línea blanca)
    ctx.save(); ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(dayX, 14); ctx.lineTo(dayX, H - 4); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.52)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(dayX, 14); ctx.lineTo(dayX, H - 4); ctx.stroke()
    ctx.restore()

    // Badge "Hoy · día X" en la parte superior de la línea
    ctx.font = '600 10px system-ui, sans-serif'
    const hoyTxt = `Hoy · día ${diaNum}`
    const hw = ctx.measureText(hoyTxt).width + 14
    const hx = Math.min(Math.max(dayX - hw / 2, 4), W - hw - 4)
    ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(hx, 5, hw, 18, 4) : ctx.rect(hx, 5, hw, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(hoyTxt, hx + 7, 18)

    // Dot brillante en el arco
    const dg = ctx.createRadialGradient(dayX, dotY, 0, dayX, dotY, 16)
    dg.addColorStop(0, 'rgba(255,255,255,0.42)'); dg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath(); ctx.arc(dayX, dotY, 16, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill()
    ctx.beginPath(); ctx.arc(dayX, dotY, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#F6FF72'; ctx.lineWidth = 2; ctx.setLineDash([])
    ctx.fill(); ctx.stroke()

    // Pill con MWh generados (al lado del dot)
    const genTxt = _fmt(genTotal)
    ctx.font = '600 11px system-ui, sans-serif'
    const gtw = ctx.measureText(genTxt).width + 18
    const onRight = dayX + gtw + 20 < W
    const gx = onRight ? dayX + 14 : dayX - gtw - 14
    const { py: gy } = _pill(genTxt, gx + gtw / 2, dotY - 11,
      'rgba(44,32,57,0.82)', '#F6FF72', 'rgba(246,255,114,0.50)')

    // "X días restantes" en el tramo futuro
    if (resta > 0 && fracMes < 0.86) {
      const midF = fracMes + (1 - fracMes) * 0.46
      const ry   = Math.min(arcY(midF, des) + 22, H - 10)
      ctx.font = '400 10px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(253,250,247,0.36)'
      ctx.fillText(`${resta} días restantes`, cxf(midF), ry)
      ctx.textAlign = 'left'
    }

    // Badge "Cierre est. X MWh" — esquina superior derecha
    const ciTxt = `Cierre est. ${_fmt(des)}`
    ctx.font = '500 10px system-ui, sans-serif'
    const cw2 = ctx.measureText(ciTxt).width + 16
    const cx3 = W - cw2 - 6
    ctx.fillStyle = 'rgba(246,255,114,0.10)'; ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(cx3, 6, cw2, 20, 4) : ctx.rect(cx3, 6, cw2, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(246,255,114,0.28)'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke()
    ctx.fillStyle = 'rgba(246,255,114,0.88)'; ctx.fillText(ciTxt, cx3 + 8, 20)

  } else if (fracMes >= 1 && genTotal > 0) {
    // Mes pasado: label con el total en la cresta del arco
    const peakY = arcY(0.5, des)
    _pill(_fmt(genTotal), cxf(0.5), peakY + 20,
      'rgba(44,32,57,0.72)', '#F6FF72', 'rgba(246,255,114,0.38)')
  }

  // ── Gradiente de suelo ────────────────────────────────────────────────────
  const gnd = ctx.createLinearGradient(0, H - 8, 0, H + GROUND)
  gnd.addColorStop(0, 'rgba(16,11,30,0)')
  gnd.addColorStop(1, '#100b1e')
  ctx.fillStyle = gnd
  ctx.fillRect(0, H - 8, W, GROUND + 8)
}

function _drawSun(ctx, t, x, y) {
  const pulse = 1 + Math.sin(t * 1.8) * 0.10

  const r1  = 32 * pulse
  const cg1 = ctx.createRadialGradient(x, y, 0, x, y, r1)
  cg1.addColorStop(0,   'rgba(246,255,114,0.24)')
  cg1.addColorStop(0.5, 'rgba(240,190,50,0.10)')
  cg1.addColorStop(1,   'rgba(246,255,114,0)')
  ctx.beginPath(); ctx.arc(x, y, r1, 0, Math.PI * 2)
  ctx.fillStyle = cg1; ctx.fill()

  const r2  = 16 * pulse
  const cg2 = ctx.createRadialGradient(x, y, 0, x, y, r2)
  cg2.addColorStop(0,   'rgba(255,255,245,0.95)')
  cg2.addColorStop(0.5, 'rgba(246,255,114,0.75)')
  cg2.addColorStop(1,   'rgba(246,200,60,0)')
  ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2)
  ctx.fillStyle = cg2; ctx.fill()

  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFCE8'; ctx.fill()
}

function _animRain(ctx, dt, H) {
  ctx.save()
  for (const d of _drops) {
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x + d.len * d.slant, d.y + d.len)
    ctx.strokeStyle = `rgba(160,205,255,${d.alpha})`
    ctx.lineWidth = 1.2
    ctx.stroke()

    d.y += d.speed * dt
    d.x += d.speed * d.slant * dt
    if (d.y > H + d.len) {
      d.y = -d.len - rnd() * 80
      d.x = d.baseX + (rnd() - 0.5) * 30
    }
  }
  ctx.restore()
}

function _animSparks(ctx, t, dt, W, maxYh) {
  ctx.save()
  for (const s of _sparks) {
    const progress = s.life / s.total
    const alpha    = Math.max(0, Math.sin(progress * Math.PI))
    const r        = s.size * (1 - progress * 0.45)

    if (r > 0.2 && alpha > 0.02) {
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3.5)
      grd.addColorStop(0,   `rgba(255,255,220,${alpha.toFixed(2)})`)
      grd.addColorStop(0.4, `rgba(246,255,114,${(alpha * 0.8).toFixed(2)})`)
      grd.addColorStop(1,   'rgba(246,255,114,0)')
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()

      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,220,${alpha.toFixed(2)})`; ctx.fill()
    }

    s.life += dt
    s.x   += s.vx * dt
    s.y   -= s.vy * dt

    if (s.life >= s.total || s.y < -20) {
      s.x    = s.baseX + (rnd() - 0.5) * 30
      s.y    = s.baseY + rnd() * 8
      s.vy   = 25 + rnd() * 70
      s.vx   = (rnd() - 0.5) * 14
      s.life = rnd() * 0.5
      s.size = 1.5 + rnd() * 2.5
    }
  }
  ctx.restore()
}

function _animWave(ctx, t, dt, W, minYh, maxYh) {
  const bandH = minYh - maxYh
  const midY  = maxYh + bandH * 0.5

  ctx.save()

  // Onda 1 — dorada, lenta
  ctx.beginPath()
  for (let px = 0; px <= W; px += 3) {
    const y = midY + Math.sin((px / W) * Math.PI * 6 + t * 0.9) * (bandH * 0.18)
    px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
  }
  ctx.strokeStyle = 'rgba(246,255,114,0.15)'
  ctx.lineWidth = 16; ctx.lineJoin = 'round'
  ctx.stroke()

  // Onda 2 — púrpura, contra-fase
  ctx.beginPath()
  for (let px = 0; px <= W; px += 3) {
    const y = midY + Math.sin((px / W) * Math.PI * 4 - t * 0.6 + 1.6) * (bandH * 0.12)
    px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
  }
  ctx.strokeStyle = 'rgba(145,91,216,0.10)'
  ctx.lineWidth = 11
  ctx.stroke()

  ctx.restore()

  // Partículas flotantes en la zona
  ctx.save()
  for (const d of _dust) {
    const a = Math.max(0, Math.sin(d.life / d.total * Math.PI) * 0.70)
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(246,255,114,${a.toFixed(2)})`
    ctx.fill()

    d.life += dt
    d.y    -= d.vy * dt
    if (d.life >= d.total || d.y < maxYh) {
      d.y    = d.baseY + d.zoneH * (0.7 + rnd() * 0.3)
      d.x    = 20 + rnd() * (W - 40)
      d.life = rnd() * 1.5
      d.vy   = 6 + rnd() * 20
    }
  }
  ctx.restore()
}

// ── Data loading ─────────────────────────────────────────────────────────────

async function loadData() {
  if (!selectedContratoId.value) return
  loading.value = true
  error.value   = null
  data.value    = null
  stopAnimation()
  try {
    const res = await client.get(`/cumplimiento/ppa/${selectedContratoId.value}`, {
      params: { year: selectedYear.value, month: selectedMonth.value },
    })
    data.value = res.data
    await nextTick()
    startAnimation()
  } catch (e) {
    error.value = e.response?.data?.detail || 'Error consultando el cumplimiento. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const res = await client.get('/cumplimiento/ppa')
    contratos.value = res.data.map(c => ({
      ...c,
      label: c.nombre_interno || c.numero_codigo_contrato || `Contrato ${c.id}`,
    }))
    const terpel = contratos.value.find(c => c.nombre_interno === 'Terpel 1')
    selectedContratoId.value = terpel?.id || contratos.value[0]?.id
    if (selectedContratoId.value) await loadData()
  } catch (e) {
    error.value = 'No se pudieron cargar los contratos PPA.'
  }
})

onUnmounted(() => stopAnimation())

let resizeObserver = null
watch(skyBox, (el) => {
  if (!el) return
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => startAnimation())
  resizeObserver.observe(el)
})
</script>

<style scoped>
.metric-card {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(44, 32, 57, 0.06);
}
.metric-label {
  font-size: 11px;
  color: #7a6e8a;
  margin-bottom: 3px;
}
.metric-value {
  font-size: 17px;
  font-weight: 600;
  color: #2C2039;
  font-variant-numeric: tabular-nums;
}
.metric-sub {
  font-size: 10px;
  color: #b0a0c0;
  margin-top: 2px;
}
.metric-card.ok-dark {
  background: #2C2039;
  border: 1px solid #915BD8;
}
.metric-card.ok-dark .metric-label { color: #915BD8; }
.metric-card.ok-dark .metric-value { color: #F6FF72; }
.metric-card.danger { background: #FAECE7; }
.metric-card.warn   { background: #FAEEDA; }

.status-ok      { background: #2C2039; color: #F6FF72; border: 1px solid #915BD8; }
.status-low     { background: #FAECE7; color: #791F1F; }
.status-high    { background: #FAEEDA; color: #633806; }
.status-neutral { background: rgba(44,32,57,0.08); color: #7a6e8a; }

:deep(.p-datatable .p-datatable-thead th) {
  background: rgba(44, 32, 57, 0.05);
  color: #7a6e8a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px;
}
:deep(.p-datatable .p-datatable-tbody td) {
  padding: 8px 12px;
  font-size: 13px;
  color: #2C2039;
}
</style>
