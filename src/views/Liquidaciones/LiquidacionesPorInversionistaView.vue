<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Liquidaciones por Inversionista</h2>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Desde</label>
        <DatePicker v-model="filtros.desde" view="month" dateFormat="mm/yy" showButtonBar placeholder="Mes inicio" class="w-36" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Hasta</label>
        <DatePicker v-model="filtros.hasta" view="month" dateFormat="mm/yy" showButtonBar placeholder="Mes fin" class="w-36" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Estado</label>
        <Select v-model="filtros.estado" :options="estadosOpciones" showClear placeholder="Todos" class="w-44" />
      </div>
      <Button icon="pi pi-search" label="Buscar" size="small" @click="recargar" />
      <Button icon="pi pi-times" severity="secondary" text size="small" @click="limpiarFiltros" />
    </div>

    <!-- Tooltip global del gráfico -->
    <Teleport to="body">
      <div v-if="chartTooltip.visible"
        :style="{ position:'fixed', left: chartTooltip.x + 'px', top: chartTooltip.y + 'px', zIndex: 9999 }"
        class="bg-white shadow-xl rounded-lg py-2 px-3 text-xs border border-gray-100 pointer-events-none min-w-[168px]">
        <div class="font-semibold text-gray-800 mb-1.5">{{ chartTooltip.mes }}</div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-sm shrink-0" style="background:#22c55e"></span>
              <span class="text-gray-500">Ingreso</span>
            </div>
            <span class="font-mono font-semibold text-gray-900">{{ fmtCompact(chartTooltip.bruto) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-sm shrink-0" style="background:#ef4444"></span>
              <span class="text-gray-500">Costos</span>
            </div>
            <span class="font-mono font-semibold text-gray-900">{{ fmtCompact(chartTooltip.costos) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-sm shrink-0" style="background:#915BD8"></span>
              <span class="text-gray-500">Neto</span>
            </div>
            <span class="font-mono font-semibold"
              :style="chartTooltip.neto >= 0 ? 'color:#22c55e' : 'color:#ef4444'">
              {{ fmtCompact(chartTooltip.neto) }}
            </span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Vista -->
    <ProgressSpinner v-if="loading" class="block mx-auto my-8" />
    <div v-else-if="!vista.length" class="text-center py-8 text-sm text-gray-400">
      No hay datos para los filtros seleccionados.
    </div>
    <div v-else class="rounded-xl overflow-hidden shadow-sm" style="background:#FDFAF7">

      <div v-for="cliente in vista" :key="cliente.cliente_id">

        <!-- Nivel 1: Inversionista -->
        <div class="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none bg-gray-900"
          @click="toggleCliente(cliente.cliente_id)">
          <i :class="expandidosCliente[cliente.cliente_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            class="text-[10px] text-white/60" />
          <span class="flex-1 text-sm font-bold text-white uppercase tracking-wide">
            {{ cliente.cliente_nombre }}
          </span>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.7)">
            {{ cliente.proyectos.length }} proyectos
          </span>
        </div>

        <template v-if="expandidosCliente[cliente.cliente_id]">

          <!-- Panel resumen financiero -->
          <div class="bg-white rounded-xl shadow-sm p-4 mx-3 my-2">

            <!-- 4 KPI cards -->
            <div class="flex gap-3 mb-5 flex-wrap">
              <div class="flex-1 min-w-[140px] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Ingreso Bruto</span>
                  <i class="pi pi-trending-up text-gray-300 text-[11px]" />
                </div>
                <div class="text-xl font-bold text-gray-900">
                  {{ fmtCompact(resumenMap[cliente.cliente_id].ingresoBruto) }}
                </div>
              </div>
              <div class="flex-1 min-w-[140px] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Costos Operativos</span>
                  <i class="pi pi-minus text-gray-300 text-[11px]" />
                </div>
                <div class="text-xl font-bold text-gray-900">
                  {{ fmtCompact(resumenMap[cliente.cliente_id].costosOperativos) }}
                </div>
              </div>
              <div class="flex-1 min-w-[140px] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Servicios Unergy</span>
                  <i class="pi pi-bolt text-gray-300 text-[11px]" />
                </div>
                <div class="text-xl font-bold text-gray-900">
                  {{ fmtCompact(resumenMap[cliente.cliente_id].serviciosUnergy) }}
                </div>
              </div>
              <div class="flex-1 min-w-[140px] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Ingreso Neto</span>
                  <i class="pi pi-wallet text-gray-300 text-[11px]" />
                </div>
                <div class="text-xl font-bold"
                  :style="resumenMap[cliente.cliente_id].ingresoNeto >= 0 ? 'color:#22c55e' : 'color:#ef4444'">
                  {{ fmtCompact(resumenMap[cliente.cliente_id].ingresoNeto) }}
                </div>
              </div>
            </div>

            <!-- Gráfico: barras agrupadas por mes -->
            <div v-if="resumenMap[cliente.cliente_id].meses.length" class="overflow-x-auto mb-3">
              <svg
                :width="resumenMap[cliente.cliente_id].svgW"
                height="280"
                :viewBox="`0 0 ${resumenMap[cliente.cliente_id].svgW} 280`"
                style="display:block"
              >
                <!-- Gridlines horizontales -->
                <line v-for="f in [0.25, 0.5, 0.75, 1]" :key="f"
                  x1="0" :x2="resumenMap[cliente.cliente_id].svgW"
                  :y1="8 + (1 - f) * 248" :y2="8 + (1 - f) * 248"
                  stroke="#F1F5F9" stroke-width="1" />
                <!-- Línea de base -->
                <line x1="0" :x2="resumenMap[cliente.cliente_id].svgW"
                  :y1="resumenMap[cliente.cliente_id].baselineY"
                  :y2="resumenMap[cliente.cliente_id].baselineY"
                  stroke="#E2E8F0" stroke-width="1.5" />

                <!-- Grupo de 3 barras por mes -->
                <g v-for="(bar, bi) in resumenMap[cliente.cliente_id].barData" :key="bar.mes"
                  style="cursor:pointer"
                  @mousemove="(e) => showGroupTooltip(e, bar)"
                  @mouseleave="chartTooltip.visible = false">

                  <template v-for="(seg, si) in svgGroupedSegs(bar, resumenMap[cliente.cliente_id], bi)" :key="si">
                    <!-- Barra positiva: esquinas redondeadas arriba -->
                    <path v-if="seg.h > 0"
                      :d="roundedTopPath(seg.x, seg.y, seg.w, seg.h, 2)"
                      :fill="seg.fill" />
                    <!-- Barra negativa: esquinas redondeadas abajo -->
                    <path v-if="seg.hn > 0"
                      :d="roundedBottomPath(seg.x, resumenMap[cliente.cliente_id].baselineY, seg.w, seg.hn, 2)"
                      :fill="seg.fill" />
                  </template>

                  <!-- Label eje X -->
                  <text
                    :x="svgGroupCenterX(bi, resumenMap[cliente.cliente_id])"
                    y="272"
                    text-anchor="middle"
                    font-size="9.5"
                    fill="#9CA3AF"
                    font-family="ui-sans-serif,system-ui,sans-serif"
                  >{{ shortMes(bar.mes) }}</text>
                </g>
              </svg>
            </div>

            <!-- Leyenda fija de 3 categorías -->
            <div class="flex flex-wrap gap-x-4 gap-y-1 mb-4">
              <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <div class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:#22c55e" />
                <span>Ingreso Bruto</span>
              </div>
              <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <div class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:#ef4444" />
                <span>Costos + Servicios</span>
              </div>
              <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <div class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:#915BD8" />
                <span>Ingreso Neto</span>
              </div>
            </div>

            <!-- Tabla colapsable por proyecto -->
            <div>
              <button class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2"
                @click="toggleTabla(cliente.cliente_id)">
                <i :class="tablasAbiertas[cliente.cliente_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                  class="text-[9px]" />
                Detalle por proyecto
              </button>
              <div v-show="tablasAbiertas[cliente.cliente_id]" class="overflow-x-auto">
                <table class="text-xs w-full min-w-max">
                  <thead>
                    <tr style="background:#f8f8f8">
                      <th class="px-2 py-1.5 text-left text-gray-600 sticky left-0 bg-gray-100 font-medium border-r border-gray-200">Proyecto</th>
                      <th v-for="mes in resumenMap[cliente.cliente_id].meses" :key="mes"
                        class="px-2 py-1.5 text-right text-gray-500 whitespace-nowrap font-normal">
                        {{ shortMes(mes) }}
                      </th>
                      <th class="px-2 py-1.5 text-right text-gray-700 whitespace-nowrap font-semibold border-l border-gray-200">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in resumenMap[cliente.cliente_id].tablaRows" :key="row.nombre"
                      class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[160px] truncate sticky left-0 bg-white border-r border-gray-100"
                        :title="row.nombre">{{ row.nombre }}</td>
                      <td v-for="(val, mi) in row.meses" :key="mi"
                        class="px-2 py-1.5 text-right font-mono whitespace-nowrap"
                        :style="val && val > 0 ? 'color:#111827' : 'color:#D1D5DB'">
                        {{ val != null && val !== 0 ? fmtCompact(val) : '—' }}
                      </td>
                      <td class="px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap border-l border-gray-100 text-gray-900">
                        {{ fmtCompact(row.total) }}
                      </td>
                    </tr>
                    <tr class="border-t-2 border-gray-300">
                      <td class="px-2 py-1.5 font-bold text-gray-700 sticky left-0 bg-gray-50 border-r border-gray-200">TOTAL</td>
                      <td v-for="(val, mi) in resumenMap[cliente.cliente_id].totalRow.meses" :key="mi"
                        class="px-2 py-1.5 text-right font-mono font-bold whitespace-nowrap text-gray-900">
                        {{ fmtCompact(val) }}
                      </td>
                      <td class="px-2 py-1.5 text-right font-mono font-bold whitespace-nowrap border-l border-gray-200 text-gray-900">
                        {{ fmtCompact(resumenMap[cliente.cliente_id].totalRow.total) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-for="proy in cliente.proyectos" :key="proy.proyecto_inversionista_id">

            <!-- Nivel 2: Proyecto (sin morado) -->
            <div class="flex items-center gap-2 py-2 px-4 cursor-pointer select-none"
              style="background:#F8F9FA; border-left:3px solid #D1D5DB; margin-left:1rem"
              @click="toggleProy(proy.proyecto_inversionista_id)">
              <i :class="expandidosProy[proy.proyecto_inversionista_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                class="text-[10px] text-gray-400" />
              <span class="flex-1 text-sm font-medium text-gray-700">
                {{ proy.proyecto_nombre }}
              </span>
              <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                style="background:#E5E7EB; color:#6B7280">
                {{ pct(proy.porcentaje_participacion) }}
              </span>
              <span v-if="proy.es_patrimonio_autonomo"
                class="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style="background:#374151; color:#F9FAFB">
                PA
              </span>
            </div>

            <!-- Nivel 3: Liquidaciones -->
            <template v-if="expandidosProy[proy.proyecto_inversionista_id]">
              <div v-for="liq in proy.liquidaciones" :key="liq.liquidacion_id"
                class="flex items-center gap-4 py-1.5 px-4 border-b text-xs"
                style="margin-left:2rem; border-color:rgba(44,32,57,0.07); background:#FDFAF7">
                <span class="w-20 shrink-0 text-gray-600">{{ formatPeriodo(liq.periodo) }}</span>
                <Tag :value="liq.estado" :severity="estadoSeverity(liq.estado)" class="text-[10px] shrink-0" />
                <span class="flex-1 text-right font-mono text-gray-800">
                  {{ fmt((liq.ingreso_neto_cop || 0) * (proy.porcentaje_participacion || 1)) }}
                </span>
                <button
                  class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors shrink-0"
                  title="Ver detalle"
                  @click="router.push(`/liquidaciones/${liq.liquidacion_id}?inv=${proy.proyecto_inversionista_id}`)">
                  <i class="pi pi-eye text-gray-500 text-xs" />
                </button>
              </div>
            </template>

          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import api from '@/api/client'

const router = useRouter()

const vista = ref([])
const loading = ref(false)

const filtros = ref({ desde: null, hasta: null, estado: null })
const estadosOpciones = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]

const expandidosCliente = reactive({})
const expandidosProy = reactive({})

function toggleCliente(id) {
  if (expandidosCliente[id]) delete expandidosCliente[id]
  else expandidosCliente[id] = true
}

function toggleProy(id) {
  if (expandidosProy[id]) delete expandidosProy[id]
  else expandidosProy[id] = true
}

function buildParams() {
  const p = {}
  if (filtros.value.desde) p.periodo_desde = toISOMonth(filtros.value.desde)
  if (filtros.value.hasta) p.periodo_hasta = toISOMonth(filtros.value.hasta)
  if (filtros.value.estado) p.estado = filtros.value.estado
  return p
}

function toISOMonth(d) {
  if (!d) return null
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
}

async function loadVista() {
  loading.value = true
  try {
    const { data } = await api.get('/liquidaciones/vistas/por-inversionista', { params: buildParams() })
    vista.value = data
  } catch (e) {
    console.error('Vista por inversionista:', e)
    vista.value = []
  } finally {
    loading.value = false
  }
}

function recargar() { loadVista() }

function limpiarFiltros() {
  filtros.value = { desde: null, hasta: null, estado: null }
  loadVista()
}

function fmt(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(v)
}

function pct(v) {
  if (v == null) return '—'
  return (v * 100).toFixed(4) + '%'
}

function formatPeriodo(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}

function estadoSeverity(e) {
  return {
    iniciada: 'secondary', costos_registrados: 'info', xm_procesado: 'info',
    mandatos_emitidos: 'warn', en_contabilidad: 'warn', en_revisoria: 'warn',
    facturado: 'success', entregado: 'contrast',
  }[e] || 'secondary'
}

// ─── Tooltip del gráfico ──────────────────────────────────────────────────────

const chartTooltip = ref({ visible: false, x: 0, y: 0, mes: '', bruto: 0, costos: 0, neto: 0 })

function showGroupTooltip(e, bar) {
  chartTooltip.value = {
    visible: true,
    x: e.clientX + 14,
    y: e.clientY - 110,
    mes:    shortMes(bar.mes),
    bruto:  bar.bruto,
    costos: bar.costos,
    neto:   bar.neto,
  }
}

function shortMes(ym) {
  const [y, m] = ym.split('-')
  const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${M[parseInt(m) - 1]} ${y.slice(2)}`
}

function fmtCompact(v) {
  if (v == null || v === 0) return v === 0 ? '$0' : '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return sign + '$' + (abs / 1_000_000_000).toFixed(1) + 'B'
  if (abs >= 1_000_000)     return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000)         return sign + '$' + (abs / 1_000).toFixed(0) + 'K'
  return sign + '$' + abs.toFixed(0)
}

const tablasAbiertas = reactive({})
function toggleTabla(id) {
  if (tablasAbiertas[id]) delete tablasAbiertas[id]
  else tablasAbiertas[id] = true
}

// ─── resumenMap ───────────────────────────────────────────────────────────────
const resumenMap = computed(() => {
  const map = {}
  for (const cliente of vista.value) {
    const proyMap  = {}  // { proyNombre: { 'YYYY-MM': ingreso_neto_proporcional } } — para tabla
    const monthKPI = {}  // { 'YYYY-MM': { bruto, costos, facturas } } — para chart y KPIs
    const mesSet   = new Set()

    for (const proy of cliente.proyectos) {
      const ptj = proy.porcentaje_participacion || 1
      for (const liq of proy.liquidaciones) {
        const mes = liq.periodo?.substring(0, 7)
        if (!mes) continue
        mesSet.add(mes)

        // Acumular KPI financiero por mes (proporcional al %)
        if (!monthKPI[mes]) monthKPI[mes] = { bruto: 0, costos: 0, facturas: 0 }
        monthKPI[mes].bruto    += (liq.total_ingresos_cop || 0) * ptj
        monthKPI[mes].costos   += (liq.total_costos_cop   || 0) * ptj
        monthKPI[mes].facturas += (liq.total_facturas_cop || 0) * ptj

        // Tabla de detalle: sigue usando ingreso_neto_cop proporcional
        const valorTabla = (liq.ingreso_neto_cop || 0) * ptj
        if (!proyMap[proy.proyecto_nombre]) proyMap[proy.proyecto_nombre] = {}
        proyMap[proy.proyecto_nombre][mes] =
          (proyMap[proy.proyecto_nombre][mes] || 0) + valorTabla
      }
    }

    const meses     = [...mesSet].sort()
    const proyNames = Object.keys(proyMap)
    const svgW      = Math.max(meses.length * 90, 500)

    // KPIs totales del período
    let ingresoBruto     = 0
    let costosOperativos = 0
    let serviciosUnergy  = 0
    for (const k of Object.values(monthKPI)) {
      ingresoBruto     += k.bruto
      costosOperativos += k.costos
      serviciosUnergy  += k.facturas
    }
    const ingresoNeto = ingresoBruto - costosOperativos - serviciosUnergy

    // Datos para el gráfico agrupado (3 barras por mes)
    const barData = meses.map(mes => {
      const k = monthKPI[mes] || { bruto: 0, costos: 0, facturas: 0 }
      return {
        mes,
        bruto:  k.bruto,
        costos: k.costos + k.facturas,
        neto:   k.bruto - k.costos - k.facturas,
      }
    })

    // Escala del gráfico (neto puede ser negativo)
    const maxVal     = Math.max(1, ...barData.map(b => Math.max(b.bruto, b.costos, b.neto)))
    const minVal     = Math.min(0, ...barData.map(b => b.neto))
    const totalRange = maxVal - minVal
    const baselineY  = 8 + (maxVal / totalRange) * 248  // y=8..256

    // Filas de la tabla (ingreso_neto por proyecto por mes)
    const tablaRows = proyNames.map(p => ({
      nombre: p,
      meses:  meses.map(m => proyMap[p]?.[m] ?? null),
      total:  meses.reduce((acc, m) => acc + (proyMap[p]?.[m] || 0), 0),
    }))

    const totalRow = {
      meses: meses.map(m => proyNames.reduce((acc, p) => acc + (proyMap[p]?.[m] || 0), 0)),
      total: meses.reduce((s, m) => s + proyNames.reduce((a, p) => a + (proyMap[p]?.[m] || 0), 0), 0),
    }

    map[cliente.cliente_id] = {
      ingresoBruto, costosOperativos, serviciosUnergy, ingresoNeto,
      meses, proyNames, barData,
      maxVal, minVal, totalRange, baselineY,
      svgW, tablaRows, totalRow,
    }
  }
  return map
})

// ─── Helpers del gráfico SVG ──────────────────────────────────────────────────

function svgGroupedSegs(bar, res, bi) {
  if (res.totalRange <= 0) return []
  const nMes   = res.meses.length
  const gW     = res.svgW / nMes
  const barW   = Math.min(gW * 0.2, 18)
  const gap    = Math.min(gW * 0.03, 5)
  const totalW = 3 * barW + 2 * gap
  const startX = bi * gW + (gW - totalW) / 2
  const scale  = 248 / res.totalRange

  return [
    { val: bar.bruto,  fill: '#22c55e' },
    { val: bar.costos, fill: '#ef4444' },
    { val: bar.neto,   fill: '#915BD8' },
  ].map((c, i) => {
    const x    = startX + i * (barW + gap)
    const absH = Math.max(Math.abs(c.val) * scale, c.val !== 0 ? 1.5 : 0)
    return {
      x, w: barW, fill: c.fill,
      y:  c.val >= 0 ? res.baselineY - absH : res.baselineY,
      h:  c.val >= 0 ? absH : 0,
      hn: c.val <  0 ? absH : 0,
    }
  })
}

// Rectángulo con esquinas superiores redondeadas
function roundedTopPath(x, y, w, h, r = 3) {
  if (h <= r * 2) return `M${x} ${y} H${x + w} V${y + h} H${x} Z`
  return `M${x} ${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} H${x} Z`
}

// Rectángulo con esquinas inferiores redondeadas (barras negativas hacia abajo)
function roundedBottomPath(x, y, w, h, r = 2) {
  if (h <= r * 2) return `M${x} ${y} H${x + w} V${y + h} H${x} Z`
  return `M${x} ${y} H${x + w} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} Z`
}

function svgGroupCenterX(bi, res) {
  const gW = res.svgW / res.meses.length
  return bi * gW + gW / 2
}

onMounted(loadVista)
</script>
