<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold" style="color:#2C2039">Liquidaciones por Inversionista</h2>
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
        class="bg-white shadow-xl rounded-lg py-2 px-3 text-xs border border-gray-100 pointer-events-none">
        <div class="font-semibold text-gray-800 mb-0.5 max-w-[180px] truncate">{{ chartTooltip.proy }}</div>
        <div class="font-bold text-sm" style="color:#915BD8">{{ fmt(chartTooltip.val) }}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">{{ chartTooltip.mes }}</div>
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
        <div class="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none"
          style="background:#2C2039"
          @click="toggleCliente(cliente.cliente_id)">
          <i :class="expandidosCliente[cliente.cliente_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            class="text-[10px] text-white" />
          <span class="flex-1 text-sm font-bold text-white uppercase tracking-wide">
            {{ cliente.cliente_nombre }}
          </span>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:rgba(255,255,255,0.15); color:#fff">
            {{ cliente.proyectos.length }} proyectos
          </span>
        </div>

        <template v-if="expandidosCliente[cliente.cliente_id]">

          <!-- ─── Panel resumen financiero ──────────────────────────────── -->
          <div class="bg-white rounded-xl shadow-sm p-4 mx-3 my-2">

            <!-- KPIs -->
            <div class="flex gap-3 mb-4 flex-wrap">
              <div class="flex-1 min-w-[130px] border border-gray-200 rounded-xl p-3">
                <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ingresos totales</div>
                <div class="text-lg font-bold" style="color:#915BD8">
                  {{ fmt(resumenMap[cliente.cliente_id].ingresosTotales) }}
                </div>
              </div>
              <div class="flex-1 min-w-[100px] border border-gray-200 rounded-xl p-3">
                <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Meses activos</div>
                <div class="text-lg font-bold" style="color:#915BD8">
                  {{ resumenMap[cliente.cliente_id].mesesActivos }}
                </div>
              </div>
              <div class="flex-1 min-w-[100px] border border-gray-200 rounded-xl p-3">
                <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Proyectos</div>
                <div class="text-lg font-bold" style="color:#915BD8">
                  {{ resumenMap[cliente.cliente_id].proyectosCnt }}
                </div>
              </div>
            </div>

            <!-- Gráfico de barras apiladas (SVG responsivo) -->
            <div v-if="resumenMap[cliente.cliente_id].meses.length" class="mb-3">
              <svg
                width="100%"
                height="220"
                :viewBox="`0 0 ${resumenMap[cliente.cliente_id].svgW} 220`"
                preserveAspectRatio="xMidYMid meet"
                style="display:block; overflow:visible"
              >
                <!-- Y-axis gridlines -->
                <line
                  v-for="f in [0.25, 0.5, 0.75, 1]" :key="f"
                  x1="0" :x2="resumenMap[cliente.cliente_id].svgW"
                  :y1="8 + (1 - f) * 180" :y2="8 + (1 - f) * 180"
                  stroke="#F1F5F9" stroke-width="1"
                />
                <!-- Baseline -->
                <line
                  x1="0" :x2="resumenMap[cliente.cliente_id].svgW"
                  y1="188" y2="188"
                  stroke="#E2E8F0" stroke-width="1"
                />

                <!-- Barras apiladas + labels del mes -->
                <g v-for="(bar, bi) in resumenMap[cliente.cliente_id].barData" :key="bar.mes">
                  <rect
                    v-for="seg in svgBarSegments(bar, resumenMap[cliente.cliente_id], bi)"
                    :key="seg.proy"
                    :x="seg.x" :y="seg.y" :width="seg.w" :height="seg.h"
                    :fill="CHART_COLORS[seg.colorIdx % CHART_COLORS.length]"
                    rx="2"
                    style="cursor:pointer"
                    @mousemove="(e) => { chartTooltip.visible=true; chartTooltip.x=e.clientX+14; chartTooltip.y=e.clientY-72; chartTooltip.proy=seg.proy; chartTooltip.val=seg.val; chartTooltip.mes=shortMes(bar.mes) }"
                    @mouseleave="chartTooltip.visible = false"
                  />
                  <text
                    :x="svgGroupCenterX(bi, resumenMap[cliente.cliente_id])"
                    y="212"
                    text-anchor="middle"
                    font-size="9.5"
                    fill="#9CA3AF"
                    font-family="ui-sans-serif,system-ui,sans-serif"
                  >{{ shortMes(bar.mes) }}</text>
                </g>
              </svg>
            </div>

            <!-- Leyenda -->
            <div v-if="resumenMap[cliente.cliente_id].proyNames.length > 1"
              class="flex flex-wrap gap-x-4 gap-y-1 mb-3">
              <div v-for="(proy, i) in resumenMap[cliente.cliente_id].proyNames" :key="proy"
                class="flex items-center gap-1.5 text-xs text-gray-600">
                <div class="w-2.5 h-2.5 rounded-sm shrink-0"
                  :style="{ background: CHART_COLORS[i % CHART_COLORS.length] }" />
                <span class="truncate max-w-[150px]" :title="proy">{{ proy }}</span>
              </div>
            </div>

            <!-- Tabla colapsable por proyecto -->
            <div>
              <button class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
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
                        :style="val && val > 0 ? 'color:#2C2039' : 'color:#D1D5DB'">
                        {{ val != null && val !== 0 ? fmtCompact(val) : '—' }}
                      </td>
                      <td class="px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap border-l border-gray-100" style="color:#915BD8">
                        {{ fmtCompact(row.total) }}
                      </td>
                    </tr>
                    <!-- Fila de totales -->
                    <tr class="border-t-2" style="background:rgba(145,91,216,0.05); border-color:rgba(145,91,216,0.25)">
                      <td class="px-2 py-1.5 font-bold sticky left-0 border-r border-purple-100" style="background:rgba(145,91,216,0.08); color:#2C2039">TOTAL</td>
                      <td v-for="(val, mi) in resumenMap[cliente.cliente_id].totalRow.meses" :key="mi"
                        class="px-2 py-1.5 text-right font-mono font-bold whitespace-nowrap" style="color:#915BD8">
                        {{ fmtCompact(val) }}
                      </td>
                      <td class="px-2 py-1.5 text-right font-mono font-bold whitespace-nowrap border-l border-purple-100" style="color:#915BD8">
                        {{ fmtCompact(resumenMap[cliente.cliente_id].totalRow.total) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-for="proy in cliente.proyectos" :key="proy.proyecto_inversionista_id">

            <!-- Nivel 2: Proyecto -->
            <div class="flex items-center gap-2 py-2 px-4 cursor-pointer select-none"
              style="background:rgba(145,91,216,0.1); border-left:3px solid #915BD8; margin-left:1rem"
              @click="toggleProy(proy.proyecto_inversionista_id)">
              <i :class="expandidosProy[proy.proyecto_inversionista_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                class="text-[10px]" style="color:#915BD8" />
              <span class="flex-1 text-sm font-medium" style="color:#2C2039">
                {{ proy.proyecto_nombre }}
              </span>
              <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                style="background:rgba(145,91,216,0.15); color:#915BD8">
                {{ pct(proy.porcentaje_participacion) }}
              </span>
              <span v-if="proy.es_patrimonio_autonomo"
                class="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style="background:#2C2039; color:#FDFAF7">
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
                <span class="flex-1 text-right font-mono" style="color:#2C2039">
                  {{ fmt(liq.ingreso_neto_cop) }}
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

// ─── Resumen financiero por cliente ──────────────────────────────────────────

const CHART_COLORS = [
  '#915BD8', '#22c55e', '#f59e0b', '#3b82f6',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
]
const MAX_PROYECTOS_CHART = 8

// Tooltip reactivo del gráfico
const chartTooltip = ref({ visible: false, x: 0, y: 0, proy: '', val: 0, mes: '' })

function shortMes(ym) {
  const [y, m] = ym.split('-')
  const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${M[parseInt(m) - 1]} ${y.slice(2)}`
}

function fmtCompact(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000)     return sign + '$' + (abs / 1_000).toFixed(0) + 'K'
  return sign + '$' + abs.toFixed(0)
}

const tablasAbiertas = reactive({})
function toggleTabla(id) {
  if (tablasAbiertas[id]) delete tablasAbiertas[id]
  else tablasAbiertas[id] = true
}

// Precomputa datos de resumen para cada cliente al cargar la vista.
// FIX 1: los valores se multiplican por el porcentaje de participación del inversionista.
const resumenMap = computed(() => {
  const map = {}
  for (const cliente of vista.value) {
    const proyMap = {}   // { proyNombre: { 'YYYY-MM': valor } }
    const mesSet = new Set()
    let ingresosTotales = 0

    for (const proy of cliente.proyectos) {
      // porcentaje_participacion viene como decimal (0.77 = 77%)
      const participacion = proy.porcentaje_participacion ?? 1
      for (const liq of proy.liquidaciones) {
        const mes = liq.periodo?.substring(0, 7)
        if (!mes) continue
        mesSet.add(mes)
        const valor = (liq.ingreso_neto_cop || 0) * participacion
        if (!proyMap[proy.proyecto_nombre]) proyMap[proy.proyecto_nombre] = {}
        proyMap[proy.proyecto_nombre][mes] =
          (proyMap[proy.proyecto_nombre][mes] || 0) + valor
        if (valor > 0) ingresosTotales += valor
      }
    }

    const meses = [...mesSet].sort()
    let proyNames = Object.keys(proyMap)

    // Agrupar en "Otros" si hay más de MAX_PROYECTOS_CHART proyectos
    if (proyNames.length > MAX_PROYECTOS_CHART) {
      // Ordenar por total descendente y tomar los top 8
      const totalPorProy = (p) => meses.reduce((acc, m) => acc + (proyMap[p][m] || 0), 0)
      proyNames.sort((a, b) => totalPorProy(b) - totalPorProy(a))
      const rest = proyNames.splice(MAX_PROYECTOS_CHART)
      proyMap['Otros'] = {}
      for (const p of rest) {
        for (const m of meses) {
          proyMap['Otros'][m] = (proyMap['Otros'][m] || 0) + (proyMap[p][m] || 0)
        }
        delete proyMap[p]
      }
      proyNames.push('Otros')
    }

    // Ancho SVG: 72 unidades por mes, mínimo 400
    const svgW = Math.max(meses.length * 72, 400)

    // Datos de barras para el gráfico
    let maxValMes = 0
    const barData = meses.map(mes => {
      const segs = proyNames.map(p => ({
        proy: p,
        val: Math.max(0, proyMap[p]?.[mes] || 0),
      }))
      const total = segs.reduce((a, s) => a + s.val, 0)
      if (total > maxValMes) maxValMes = total
      return { mes, segs }
    })

    // Filas de la tabla
    const tablaRows = proyNames.map(p => ({
      nombre: p,
      meses: meses.map(m => proyMap[p]?.[m] ?? null),
      total: meses.reduce((acc, m) => acc + (proyMap[p]?.[m] || 0), 0),
    }))

    // Fila de totales
    const totalRow = {
      meses: meses.map(m => proyNames.reduce((acc, p) => acc + (proyMap[p]?.[m] || 0), 0)),
      total: ingresosTotales,
    }

    map[cliente.cliente_id] = {
      ingresosTotales,
      mesesActivos: mesSet.size,
      proyectosCnt: cliente.proyectos.length,
      meses,
      proyNames,
      barData,
      maxValMes,
      svgW,
      tablaRows,
      totalRow,
    }
  }
  return map
})

// Calcula los segmentos SVG con coordenadas absolutas (x, y, w, h)
// para una barra del gráfico dado su índice de mes
function svgBarSegments(bar, res, bi) {
  if (res.maxValMes <= 0) return []
  const nMes = res.meses.length
  const gW = res.svgW / nMes          // ancho del grupo de mes
  const bW = Math.min(gW * 0.72, 52)  // ancho de la barra (máx 52px)
  const gX = bi * gW + (gW - bW) / 2  // x centrado en el grupo
  const CHART_H = 180                  // área vertical disponible (y 8..188)

  let cumH = 0
  const segs = []
  for (let i = 0; i < bar.segs.length; i++) {
    const v = bar.segs[i].val
    if (v <= 0) continue
    const h = Math.max((v / res.maxValMes) * CHART_H, 1.5)
    segs.push({
      val:      v,
      proy:     bar.segs[i].proy,
      colorIdx: i,
      x:        gX,
      y:        8 + CHART_H - cumH - h,
      w:        bW,
      h,
    })
    cumH += h
  }
  return segs
}

// Centro X de un grupo de mes para el label del eje X
function svgGroupCenterX(bi, res) {
  const gW = res.svgW / res.meses.length
  return bi * gW + gW / 2
}

onMounted(loadVista)
</script>
