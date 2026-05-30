<template>
  <div class="space-y-4">
    <PageHeader title="Liquidaciones por Inversionista" />

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

    <!-- FIX 2: Tabs tipo proyecto -->
    <div class="flex gap-0 border-b border-gray-200 bg-white rounded-t-xl px-2">
      <button
        v-for="tab in TABS_TIPO"
        :key="tab.key"
        class="px-4 py-2 text-xs font-medium transition-colors relative"
        :class="tabTipo === tab.key
          ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-800'
          : 'text-gray-400 hover:text-gray-600'"
        @click="tabTipo = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- Vista -->
    <ProgressSpinner v-if="loading" class="block mx-auto my-8" />
    <div v-else-if="!vistaFiltrada.length" class="text-center py-8 text-sm text-gray-400">
      No hay datos para los filtros seleccionados.
    </div>
    <div v-else class="rounded-xl overflow-hidden shadow-sm" style="background:#FDFAF7">

      <div v-for="cliente in vistaFiltrada" :key="cliente.cliente_id">

        <!-- FIX 1: Nivel 1: Inversionista — gris claro -->
        <div class="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none bg-gray-100 hover:bg-gray-200 transition-colors"
          @click="toggleCliente(cliente.cliente_id)">
          <i :class="expandidosCliente[cliente.cliente_id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            class="text-[10px] text-gray-400" />
          <span class="flex-1 text-sm font-bold text-gray-800 uppercase tracking-wide">
            {{ cliente.cliente_nombre }}
          </span>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:#E5E7EB; color:#6B7280">
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
                  :style="resumenMap[cliente.cliente_id].ingresoNeto >= 0 ? 'color:#915BD8' : 'color:#ef4444'">
                  {{ fmtCompact(resumenMap[cliente.cliente_id].ingresoNeto) }}
                </div>
              </div>
            </div>

            <!-- FIX 3: Gráfico barras horizontales — Ingreso Neto por mes -->
            <div v-if="resumenMap[cliente.cliente_id].meses.length" class="mb-4">
              <div class="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                Ingreso neto por mes
              </div>
              <div class="space-y-2">
                <div v-for="bar in resumenMap[cliente.cliente_id].barData" :key="bar.mes"
                  class="flex items-center gap-2">
                  <span class="w-11 text-right shrink-0 text-[11px] text-gray-500">
                    {{ shortMes(bar.mes) }}
                  </span>
                  <div class="flex-1 h-4 relative">
                    <div class="absolute inset-0 rounded-r-sm bg-gray-100" />
                    <div class="absolute inset-y-0 left-0 rounded-r-sm"
                      :style="{
                        width: resumenMap[cliente.cliente_id].maxAbsNeto > 0
                          ? `${Math.max(2, Math.abs(bar.neto) / resumenMap[cliente.cliente_id].maxAbsNeto * 100)}%`
                          : '0%',
                        background: bar.neto >= 0 ? '#915BD8' : '#ef4444'
                      }" />
                  </div>
                  <span class="w-16 shrink-0 text-[11px] font-mono"
                    :style="bar.neto >= 0 ? 'color:#374151' : 'color:#ef4444'">
                    {{ fmtCompact(bar.neto) }}
                  </span>
                </div>
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

            <!-- Nivel 2: Proyecto -->
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
                  {{ fmt((liq.ingreso_neto_cop || 0) * (proy.porcentaje_participacion > 1 ? proy.porcentaje_participacion / 100 : proy.porcentaje_participacion || 1)) }}
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

// FIX 2: tabs tipo proyecto
const TABS_TIPO = [
  { key: 'todas',       label: 'Todas'       },
  { key: 'minigranjas', label: 'Minigranjas' },
  { key: 'autoconsumo', label: 'Autoconsumo' },
]
const tabTipo = ref('todas')

const vistaFiltrada = computed(() => {
  if (tabTipo.value === 'todas') return vista.value
  return vista.value.map(cliente => ({
    ...cliente,
    proyectos: cliente.proyectos.filter(p =>
      tabTipo.value === 'minigranjas'
        ? p.tipo_proyecto === 'minigranja'
        : p.tipo_proyecto === 'autoconsumo'
    ),
  })).filter(c => c.proyectos.length > 0)
})

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
  const p = v > 1 ? v : v * 100
  return p.toFixed(4) + '%'
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

// ─── resumenMap — basado en vistaFiltrada ────────────────────────────────────
const resumenMap = computed(() => {
  const map = {}
  for (const cliente of vistaFiltrada.value) {
    const proyMap  = {}  // { proyNombre: { 'YYYY-MM': ingreso_neto_proporcional } }
    const monthKPI = {}  // { 'YYYY-MM': { bruto, costos, facturas } }
    const mesSet   = new Set()

    for (const proy of cliente.proyectos) {
      const raw = proy.porcentaje_participacion
      const ptj = raw > 1 ? raw / 100 : (raw || 1)
      for (const liq of proy.liquidaciones) {
        const mes = liq.periodo?.substring(0, 7)
        if (!mes) continue
        mesSet.add(mes)

        if (!monthKPI[mes]) monthKPI[mes] = { bruto: 0, costos: 0, facturas: 0 }
        monthKPI[mes].bruto    += (liq.total_ingresos_cop || 0) * ptj
        monthKPI[mes].costos   += (liq.total_costos_cop   || 0) * ptj
        monthKPI[mes].facturas += (liq.total_facturas_cop || 0) * ptj

        const valorTabla = (liq.ingreso_neto_cop || 0) * ptj
        if (!proyMap[proy.proyecto_nombre]) proyMap[proy.proyecto_nombre] = {}
        proyMap[proy.proyecto_nombre][mes] =
          (proyMap[proy.proyecto_nombre][mes] || 0) + valorTabla
      }
    }

    const meses     = [...mesSet].sort()
    const proyNames = Object.keys(proyMap)

    // KPIs totales
    let ingresoBruto     = 0
    let costosOperativos = 0
    let serviciosUnergy  = 0
    for (const k of Object.values(monthKPI)) {
      ingresoBruto     += k.bruto
      costosOperativos += k.costos
      serviciosUnergy  += k.facturas
    }
    const ingresoNeto = ingresoBruto - costosOperativos - serviciosUnergy

    // FIX 3: barData para barras horizontales (solo neto)
    const barData = meses.map(mes => {
      const k = monthKPI[mes] || { bruto: 0, costos: 0, facturas: 0 }
      return {
        mes,
        bruto:  k.bruto,
        costos: k.costos + k.facturas,
        neto:   k.bruto - k.costos - k.facturas,
      }
    })
    const maxAbsNeto = Math.max(1, ...barData.map(b => Math.abs(b.neto)))

    // Tabla
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
      meses, proyNames, barData, maxAbsNeto,
      tablaRows, totalRow,
    }
  }
  return map
})

onMounted(loadVista)
</script>
