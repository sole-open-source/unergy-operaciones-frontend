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
          <Select
            v-model="selectedContratoId"
            :options="contratos"
            optionLabel="label"
            optionValue="id"
            placeholder="Seleccionar contrato"
            class="w-60"
            @change="loadData"
          />
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

    <!-- Estado cargando -->
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

      <!-- Resumen del período -->
      <div class="flex items-center gap-3 text-sm" style="color: #7a6e8a;">
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

      <!-- Grid principal: canvas + métricas -->
      <div class="grid gap-6" style="grid-template-columns: 1fr 380px;">

        <!-- Canvas sky -->
        <div class="flex flex-col gap-3">
          <div ref="skyBox" class="sky-box relative rounded-2xl overflow-hidden" style="height: 280px; background: #2C2039; border: 1px solid rgba(145,91,216,0.35);">
            <canvas ref="canvasRef" class="absolute inset-0 w-full h-full" />
            <div ref="sunEl" class="sun absolute w-8 h-8 rounded-full pointer-events-none" style="background: #F6FF72; border: 2.5px solid #c8cc3a; transform: translate(-50%,-50%); transition: left .3s, top .3s;" />
            <!-- Suelo con paneles -->
            <div class="absolute bottom-0 left-0 right-0 h-9" style="background: #1e1429; border-top: 2px solid #915BD8;">
              <div class="flex gap-1 absolute left-1/2 -translate-x-1/2 top-1.5">
                <div v-for="i in 8" :key="i" class="w-5 h-3 rounded-sm" style="background: #3d2e52; border: 1px solid #915BD8;" />
              </div>
            </div>
          </div>

          <!-- Leyenda -->
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-1.5 text-xs" style="color:#7a6e8a;">
              <div class="w-6 h-1 rounded" style="background:#F6FF72;"></div>
              Energía generada contrato
            </div>
            <div class="flex items-center gap-1.5 text-xs" style="color:#7a6e8a;">
              <div class="w-6 h-0.5 rounded" style="background:#ff6b6b;"></div>
              Mínimo (take-or-pay)
            </div>
            <div class="flex items-center gap-1.5 text-xs" style="color:#7a6e8a;">
              <div class="w-6 h-0.5 rounded" style="background:#915BD8;"></div>
              Máximo (give-or-take)
            </div>
            <div class="flex items-center gap-1.5 text-xs" style="color:#7a6e8a;">
              <div class="w-6 h-1 rounded" style="background:rgba(246,255,114,0.35);"></div>
              Zona contractual OK
            </div>
          </div>
        </div>

        <!-- Panel derecho: estado + métricas -->
        <div class="flex flex-col gap-4">

          <!-- Status bar -->
          <div :class="['rounded-lg px-4 py-3 text-sm font-semibold text-center', statusClass]">
            {{ statusText }}
          </div>

          <!-- Métricas -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Generado real -->
            <div class="metric-card" style="background: rgba(44,32,57,0.06);">
              <div class="metric-label">Generado acum.</div>
              <div class="metric-value">{{ fmtMwh(data.generacion.gen_total_mwh) }}</div>
              <div class="metric-sub" v-if="data.periodo.es_mes_actual">Real hasta día {{ data.periodo.dia_actual }}</div>
            </div>

            <!-- Proyectado (solo mes actual) -->
            <div v-if="data.periodo.es_mes_actual" class="metric-card" :class="projCardClass">
              <div class="metric-label">Proy. fin de mes</div>
              <div class="metric-value" :class="projValueClass">{{ fmtMwh(data.generacion.gen_proyectada_mwh) }}</div>
              <div class="metric-sub">Extrap. lineal</div>
            </div>

            <!-- Mínimo -->
            <div class="metric-card" style="background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.3);">
              <div class="metric-label" style="color:#c0504d;">Mínimo contrato</div>
              <div class="metric-value">{{ fmtMwh(data.compromisos.energia_minima_mwh) }}</div>
            </div>

            <!-- Máximo -->
            <div class="metric-card" style="background: rgba(145,91,216,0.08); border: 1px solid rgba(145,91,216,0.3);">
              <div class="metric-label" style="color:#915BD8;">Máximo contrato</div>
              <div class="metric-value">{{ fmtMwh(data.compromisos.energia_maxima_mwh) }}</div>
            </div>

            <!-- Compra en bolsa -->
            <div class="metric-card" :class="data.balance.compras_bolsa_mwh > 0 ? 'danger' : ''">
              <div class="metric-label">Compra en bolsa</div>
              <div class="metric-value" :class="data.balance.compras_bolsa_mwh > 0 ? 'text-red-700 font-bold' : ''">
                {{ fmtMwh(data.balance.compras_bolsa_mwh) }}
              </div>
              <div class="metric-sub">max(0, mín − gen)</div>
            </div>

            <!-- Venta en bolsa -->
            <div class="metric-card" :class="data.balance.excedentes_bolsa_mwh > 0 ? 'warn' : ''">
              <div class="metric-label">Venta en bolsa</div>
              <div class="metric-value" :class="data.balance.excedentes_bolsa_mwh > 0 ? 'text-amber-700 font-bold' : ''">
                {{ fmtMwh(data.balance.excedentes_bolsa_mwh) }}
              </div>
              <div class="metric-sub">max(0, gen − máx)</div>
            </div>
          </div>

          <!-- Tarifa -->
          <div v-if="data.generacion.tarifa_cop_kwh" class="rounded-lg px-4 py-2.5 text-sm flex justify-between items-center" style="background: rgba(44,32,57,0.06);">
            <span style="color:#7a6e8a;">Tarifa contrato</span>
            <span class="font-semibold">{{ data.generacion.tarifa_cop_kwh.toFixed(0) }} COP/kWh</span>
          </div>

          <!-- N° plantas activas -->
          <div class="rounded-lg px-4 py-2.5 text-sm flex justify-between items-center" style="background: rgba(44,32,57,0.06);">
            <span style="color:#7a6e8a;">Plantas activas GESCON</span>
            <span class="font-semibold">{{ data.generacion.n_plantas_activas }}</span>
          </div>
        </div>
      </div>

      <!-- Tabla de plantas -->
      <div>
        <h2 class="text-base font-semibold mb-3" style="color:#2C2039;">
          Desglose por planta
        </h2>
        <DataTable
          :value="data.generacion.plantas"
          size="small"
          stripedRows
          class="border rounded-xl overflow-hidden"
          style="border-color: rgba(44,32,57,0.12);"
        >
          <Column field="nombre" header="Planta" sortable style="min-width:200px;" />
          <Column header="% Despacho" style="width:110px; text-align:right;">
            <template #body="{ data: row }">
              <span class="font-mono text-sm">{{ row.pct_despacho.toFixed(1) }}%</span>
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
              <span v-if="row.ultimo_dia" class="text-sm" :style="row.ultimo_dia < data.periodo.dia_actual - 2 ? 'color:#c0504d; font-weight:600;' : 'color:#7a6e8a;'">
                Día {{ row.ultimo_dia }}
              </span>
              <span v-else class="text-xs" style="color:#b0a0c0;">—</span>
            </template>
          </Column>
          <Column style="width:50px; text-align:center;">
            <template #body="{ data: row }">
              <i v-if="row.sin_api_id" class="pi pi-exclamation-circle text-orange-500" v-tooltip="'Planta sin API ID configurado en proyectos'" />
              <i v-else-if="row.sin_datos" class="pi pi-exclamation-triangle text-red-500" v-tooltip="'Sin datos de generación en la API'" />
              <i v-else-if="row.ultimo_dia && row.ultimo_dia < data.periodo.dia_actual - 2" class="pi pi-clock text-yellow-500" v-tooltip="`Datos atrasados: último registro día ${row.ultimo_dia}`" />
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Alertas de datos faltantes -->
      <div class="space-y-2">
        <Message v-if="data.generacion.sin_api_id.length > 0" severity="warn" :closable="false">
          <strong>Plantas sin API ID:</strong> {{ data.generacion.sin_api_id.join(', ') }}.
          Configura el campo <code>sub_project</code> en el detalle de cada proyecto.
        </Message>
        <Message v-if="data.generacion.plantas_sin_datos.length > 0" severity="error" :closable="false">
          <strong>Plantas sin datos de generación:</strong> {{ data.generacion.plantas_sin_datos.join(', ') }}.
          La generación acumulada del contrato está incompleta.
        </Message>
      </div>

    </template>

    <!-- Estado vacío -->
    <div v-else-if="!loading" class="text-center py-20" style="color:#7a6e8a;">
      <i class="pi pi-chart-line text-5xl mb-4 block" style="color:#915BD8;" />
      <p>Selecciona un contrato y período para ver el cumplimiento.</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import client from '@/api/client'

// ── Constantes ─────────────────────────────────────────────────────────────

const MESES = [
  { label: 'Enero',      value: 1  },
  { label: 'Febrero',    value: 2  },
  { label: 'Marzo',      value: 3  },
  { label: 'Abril',      value: 4  },
  { label: 'Mayo',       value: 5  },
  { label: 'Junio',      value: 6  },
  { label: 'Julio',      value: 7  },
  { label: 'Agosto',     value: 8  },
  { label: 'Septiembre', value: 9  },
  { label: 'Octubre',    value: 10 },
  { label: 'Noviembre',  value: 11 },
  { label: 'Diciembre',  value: 12 },
]

const now = new Date()
const anios = Array.from({ length: 8 }, (_, i) => 2023 + i)

// ── Estado ──────────────────────────────────────────────────────────────────

const contratos       = ref([])
const selectedContratoId = ref(null)
const selectedMonth   = ref(now.getMonth() + 1)
const selectedYear    = ref(now.getFullYear())
const data            = ref(null)
const loading         = ref(false)
const error           = ref(null)

const skyBox   = ref(null)
const canvasRef = ref(null)
const sunEl    = ref(null)

// ── Computed ────────────────────────────────────────────────────────────────

const statusClass = computed(() => {
  if (!data.value) return ''
  const est = data.value.balance.estado
  if (est === 'ok')         return 'status-ok'
  if (est === 'deficit')    return 'status-low'
  if (est === 'excedente')  return 'status-high'
  return 'status-neutral'
})

const statusText = computed(() => {
  if (!data.value) return ''
  const { estado, compras_bolsa_mwh, excedentes_bolsa_mwh } = data.value.balance
  const { es_mes_actual } = data.value.periodo
  if (estado === 'ok')
    return es_mes_actual ? 'Proyección OK — en la zona contractual' : 'Zona contractual — cumplimiento total'
  if (estado === 'deficit')
    return `${es_mes_actual ? 'Proyección: d' : 'D'}éficit ${fmtMwh(compras_bolsa_mwh)} — compra en bolsa`
  if (estado === 'excedente')
    return `${es_mes_actual ? 'Proyección: e' : 'E'}xcedente ${fmtMwh(excedentes_bolsa_mwh)} — venta en bolsa`
  return 'Sin compromisos definidos para este período'
})

const projCardClass = computed(() => {
  if (!data.value) return ''
  const e = data.value.balance.estado
  if (e === 'deficit')   return 'danger'
  if (e === 'excedente') return 'warn'
  if (e === 'ok')        return 'ok-dark'
  return ''
})

const projValueClass = computed(() => {
  if (!data.value) return ''
  const e = data.value.balance.estado
  if (e === 'deficit')   return 'text-red-700 font-bold'
  if (e === 'excedente') return 'text-amber-700 font-bold'
  return ''
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtMwh(val) {
  if (val === null || val === undefined) return '—'
  return val.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MWh'
}

// ── Canvas ───────────────────────────────────────────────────────────────────

function drawCanvas(des, minV, maxV, fracMes) {
  const canvas = canvasRef.value
  const box    = skyBox.value
  const sun    = sunEl.value
  if (!canvas || !box) return

  const W = box.offsetWidth
  const H = box.offsetHeight - 36  // restar el suelo (36px)
  canvas.width  = W
  canvas.height = H + 36
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, canvas.height)

  const groundY  = H
  const totalMax = Math.max(maxV * 1.35, des * 1.15, 900)
  const N        = 120

  const cx    = t => 30 + t * (W - 60)
  const arcY  = (t, val) => groundY - Math.sin(t * Math.PI) * (groundY - 28) * (val / totalMax) / 0.85
  const desYf = t => arcY(t, des)

  const minYh = groundY - (minV / totalMax) * (groundY - 28) / 0.85
  const maxYh = groundY - (maxV / totalMax) * (groundY - 28) / 0.85
  const enZona = des >= minV && des <= maxV

  // Indicador de día actual (línea vertical punteada)
  if (fracMes > 0 && fracMes < 1) {
    const x = cx(fracMes)
    ctx.save()
    ctx.strokeStyle = 'rgba(253,250,247,0.2)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 5])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, groundY)
    ctx.stroke()
    ctx.restore()
  }

  // Aura zona OK
  if (enZona) {
    const bandH = minYh - maxYh
    ctx.beginPath()
    ctx.rect(0, maxYh, W, bandH)
    ctx.fillStyle = 'rgba(246,255,114,0.07)'
    ctx.fill()
    for (let layer = 0; layer < 6; layer++) {
      const spread = layer * 3, h = bandH - spread * 2
      if (h > 0) {
        ctx.beginPath()
        ctx.rect(0, maxYh + spread, W, h)
        ctx.fillStyle = `rgba(246,255,114,${0.042 - layer * 0.005})`
        ctx.fill()
      }
    }
    ctx.setLineDash([])
    ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(0, minYh); ctx.lineTo(W, minYh)
    ctx.strokeStyle = 'rgba(246,255,114,0.20)'; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, maxYh); ctx.lineTo(W, maxYh)
    ctx.strokeStyle = 'rgba(246,255,114,0.15)'; ctx.stroke()
  }

  // Lluvia (déficit)
  if (des < minV) {
    for (let r = 0; r < 32; r++) {
      const t  = 0.05 + (r / 32) * 0.9
      const rx = cx(t) + Math.sin(r * 5) * 6
      const ty = minYh, by = desYf(t)
      if (by > ty + 6) {
        ctx.save()
        ctx.strokeStyle = 'rgba(253,250,247,0.38)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 6])
        ctx.beginPath(); ctx.moveTo(rx, ty + 2); ctx.lineTo(rx + 2, by - 3); ctx.stroke()
        ctx.restore()
        ctx.beginPath()
        ctx.ellipse(rx + 2, by + 3, 2, 3, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(253,250,247,0.42)'; ctx.fill()
      }
    }
  }

  // Flechas excedente
  if (des > maxV) {
    for (let a = 0; a < 12; a++) {
      const t = 0.1 + (a / 12) * 0.8
      const x = cx(t), top = desYf(t), bot = maxYh
      if (bot > top + 10) {
        ctx.save()
        ctx.strokeStyle = 'rgba(246,255,114,0.60)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4])
        ctx.beginPath(); ctx.moveTo(x, bot - 3); ctx.lineTo(x, top + 8); ctx.stroke()
        ctx.restore()
        ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x - 4, top + 12); ctx.lineTo(x, top + 5); ctx.lineTo(x + 4, top + 12)
        ctx.strokeStyle = 'rgba(246,255,114,0.75)'; ctx.lineWidth = 1.5; ctx.stroke()
      }
    }
  }

  // Curva solar con halo
  const traceDes = () => {
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const t = i / N
      i === 0 ? ctx.moveTo(cx(t), desYf(t)) : ctx.lineTo(cx(t), desYf(t))
    }
  }
  traceDes(); ctx.strokeStyle = 'rgba(246,255,114,0.15)'; ctx.lineWidth = 10; ctx.setLineDash([]); ctx.stroke()
  traceDes(); ctx.strokeStyle = '#F6FF72'; ctx.lineWidth = 2.5; ctx.stroke()

  // Línea mínimo
  ctx.beginPath(); ctx.moveTo(0, minYh); ctx.lineTo(W, minYh)
  ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.stroke()

  // Línea máximo
  ctx.beginPath(); ctx.moveTo(0, maxYh); ctx.lineTo(W, maxYh)
  ctx.strokeStyle = '#915BD8'; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke()

  // Labels
  ctx.font = '500 11px system-ui, sans-serif'
  ctx.fillStyle = '#ff8888'; ctx.fillText(`mín ${Math.round(minV)} MWh`, W - 115, minYh - 6)
  ctx.fillStyle = '#b794e8'; ctx.fillText(`máx ${Math.round(maxV)} MWh`, W - 115, maxYh - 6)

  // Posición del sol (pico del arco)
  const sunX = cx(0.5) * box.offsetWidth / W
  const sunY = arcY(0.5, des) * box.offsetHeight / (H + 36)
  if (sun) {
    sun.style.left = sunX + 'px'
    sun.style.top  = sunY + 'px'
  }
}

function redrawFromData() {
  if (!data.value || !data.value.compromisos.energia_minima_mwh) return
  const { gen_total_mwh, gen_proyectada_mwh } = data.value.generacion
  const { energia_minima_mwh: minV, energia_maxima_mwh: maxV } = data.value.compromisos
  const { es_mes_actual, dia_actual, dias_mes } = data.value.periodo
  // Arc shows the value used for status assessment
  const des = es_mes_actual ? gen_proyectada_mwh : gen_total_mwh
  const fracMes = es_mes_actual ? dia_actual / dias_mes : 1
  drawCanvas(des, minV, maxV, fracMes)
}

// ── Data loading ─────────────────────────────────────────────────────────────

async function loadData() {
  if (!selectedContratoId.value) return
  loading.value = true
  error.value = null
  data.value = null
  try {
    const res = await client.get(`/cumplimiento/ppa/${selectedContratoId.value}`, {
      params: { year: selectedYear.value, month: selectedMonth.value },
    })
    data.value = res.data
    await nextTick()
    redrawFromData()
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
    // Default: Terpel 1
    const terpel = contratos.value.find(c => c.nombre_interno === 'Terpel 1')
    selectedContratoId.value = terpel?.id || contratos.value[0]?.id
    if (selectedContratoId.value) await loadData()
  } catch (e) {
    error.value = 'No se pudieron cargar los contratos PPA.'
  }
})

// Redraw on resize
let resizeObserver = null
watch(skyBox, (el) => {
  if (!el) return
  resizeObserver?.disconnect()
  resizeObserver = new ResizeObserver(() => redrawFromData())
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
.metric-card.danger {
  background: #FAECE7;
}
.metric-card.warn {
  background: #FAEEDA;
}

.status-ok     { background: #2C2039; color: #F6FF72; border: 1px solid #915BD8; }
.status-low    { background: #FAECE7; color: #791F1F; }
.status-high   { background: #FAEEDA; color: #633806; }
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
