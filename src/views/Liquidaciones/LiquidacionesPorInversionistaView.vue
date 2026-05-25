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
            <div class="flex gap-3 mb-3 flex-wrap">
              <div class="bg-gray-50 rounded-lg px-3 py-2 min-w-[130px]">
                <div class="text-xs text-gray-500">Ingresos totales</div>
                <div class="text-sm font-bold mt-0.5" style="color:#915BD8">
                  {{ fmt(resumenMap[cliente.cliente_id].ingresosTotales) }}
                </div>
              </div>
              <div class="bg-gray-50 rounded-lg px-3 py-2 min-w-[110px]">
                <div class="text-xs text-gray-500">Meses activos</div>
                <div class="text-sm font-bold mt-0.5" style="color:#915BD8">
                  {{ resumenMap[cliente.cliente_id].mesesActivos }}
                </div>
              </div>
            </div>

            <!-- Gráfico de barras apiladas -->
            <div v-if="resumenMap[cliente.cliente_id].meses.length" class="overflow-x-auto mb-3">
              <svg
                :width="Math.max(resumenMap[cliente.cliente_id].meses.length * 32 + 8, 280)"
                height="188"
                style="display:block"
              >
                <g v-for="(bar, bi) in resumenMap[cliente.cliente_id].barData" :key="bar.mes">
                  <rect
                    v-for="seg in svgSegments(bar, resumenMap[cliente.cliente_id].maxValMes)"
                    :key="seg.proy"
                    :x="bi * 32 + 4"
                    :y="seg.y"
                    :width="24"
                    :height="seg.h"
                    :fill="CHART_COLORS[seg.colorIdx % CHART_COLORS.length]"
                    rx="1"
                  ><title>{{ seg.proy }}: {{ fmt(seg.val) }}</title></rect>
                  <text
                    :x="bi * 32 + 16"
                    y="182"
                    text-anchor="middle"
                    font-size="9"
                    fill="#9CA3AF"
                  >{{ shortMes(bar.mes) }}</text>
                </g>
              </svg>
            </div>

            <!-- Tabla colapsable por proyecto -->
            <div>
              <button class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1.5"
                @click="toggleTabla(cliente.cliente_id)">
                <i :class="tablasAbiertas[cliente.cliente_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                  class="text-[9px]" />
                Detalle por proyecto
              </button>
              <div v-if="tablasAbiertas[cliente.cliente_id]" class="overflow-x-auto">
                <table class="text-xs w-full min-w-max">
                  <thead>
                    <tr style="background:#f8f8f8">
                      <th class="px-2 py-1 text-left text-gray-600 sticky left-0 bg-gray-100">Proyecto</th>
                      <th v-for="mes in resumenMap[cliente.cliente_id].meses" :key="mes"
                        class="px-2 py-1 text-right text-gray-500 whitespace-nowrap font-normal">
                        {{ shortMes(mes) }}
                      </th>
                      <th class="px-2 py-1 text-right text-gray-700 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in resumenMap[cliente.cliente_id].tablaRows" :key="row.nombre"
                      class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="px-2 py-1 text-gray-700 whitespace-nowrap max-w-[160px] truncate sticky left-0 bg-white"
                        :title="row.nombre">{{ row.nombre }}</td>
                      <td v-for="(val, mi) in row.meses" :key="mi"
                        class="px-2 py-1 text-right font-mono whitespace-nowrap"
                        :style="val && val > 0 ? 'color:#2C2039' : 'color:#D1D5DB'">
                        {{ val != null && val !== 0 ? fmtCompact(val) : '—' }}
                      </td>
                      <td class="px-2 py-1 text-right font-mono font-semibold whitespace-nowrap" style="color:#915BD8">
                        {{ fmtCompact(row.total) }}
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
  '#915BD8','#22c55e','#f59e0b','#ef4444','#3b82f6',
  '#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4',
]

function shortMes(ym) {
  const [y, m] = ym.split('-')
  const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
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

// Pre-calcula datos de resumen para todos los clientes cuando cambia la vista
const resumenMap = computed(() => {
  const map = {}
  for (const cliente of vista.value) {
    const proyMap = {}   // { proyNombre: { 'YYYY-MM': valor } }
    const mesSet = new Set()
    let ingresosTotales = 0

    for (const proy of cliente.proyectos) {
      for (const liq of proy.liquidaciones) {
        const mes = liq.periodo?.substring(0, 7)
        if (!mes) continue
        mesSet.add(mes)
        if (!proyMap[proy.proyecto_nombre]) proyMap[proy.proyecto_nombre] = {}
        proyMap[proy.proyecto_nombre][mes] =
          (proyMap[proy.proyecto_nombre][mes] || 0) + (liq.ingreso_neto_cop || 0)
        if ((liq.ingreso_neto_cop || 0) > 0) ingresosTotales += liq.ingreso_neto_cop
      }
    }

    const meses = [...mesSet].sort()
    const proyNames = Object.keys(proyMap)

    // Datos para el gráfico SVG
    let maxValMes = 0
    const barData = meses.map(mes => {
      const segs = proyNames.map(p => ({
        proy: p,
        val: Math.max(0, proyMap[p][mes] || 0),
      }))
      const total = segs.reduce((a, s) => a + s.val, 0)
      if (total > maxValMes) maxValMes = total
      return { mes, segs }
    })

    // Filas para la tabla
    const tablaRows = proyNames.map(p => ({
      nombre: p,
      meses: meses.map(m => proyMap[p][m] ?? null),
      total: meses.reduce((acc, m) => acc + (proyMap[p][m] || 0), 0),
    }))

    map[cliente.cliente_id] = { ingresosTotales, mesesActivos: mesSet.size, meses, proyNames, barData, maxValMes, tablaRows }
  }
  return map
})

// Calcula los segmentos SVG (y, h) para una barra dado el máximo del eje
function svgSegments(bar, maxVal) {
  if (maxVal <= 0) return []
  const CHART_H = 160
  let cumH = 0
  const segs = []
  for (let i = 0; i < bar.segs.length; i++) {
    const v = bar.segs[i].val
    if (v <= 0) continue
    const h = Math.max((v / maxVal) * CHART_H, 1)
    segs.push({ val: v, proy: bar.segs[i].proy, colorIdx: i, y: CHART_H - cumH - h, h })
    cumH += h
  }
  return segs
}

onMounted(loadVista)
</script>
