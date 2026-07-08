<template>
  <div class="space-y-4" :class="{ 'p-4 sm:p-5': embedded }">
    <PageHeader v-if="!embedded" title="Liquidaciones por Inversionista" />

    <!-- Tabs tipo proyecto + aviso de espejo -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-0 border-b border-gray-200">
        <button v-for="t in TABS_TIPO" :key="t.key"
          class="px-4 py-2 text-xs font-medium transition-colors relative"
          :class="tabTipo === t.key
            ? 'text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-800'
            : 'text-gray-400 hover:text-gray-600'"
          @click="tabTipo = t.key">
          {{ t.label }}
        </button>
      </div>
      <span class="text-[11px] ml-auto" style="color:#9b8fb0">
        Espejo del Panel Contable · ventana 12 meses a {{ formatPeriodo(periodo) }}
      </span>
    </div>

    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <div v-else-if="!clientes.length" class="text-center py-8 text-sm text-gray-400">
      Sin paneles para este período/tipo. Cárgalos en Panel Contable.
    </div>

    <div v-else class="rounded-xl overflow-hidden shadow-sm" style="background:#FDFAF7">
      <div v-for="cli in clientes" :key="cli.key">

        <!-- Nivel 1: Inversionista -->
        <div class="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none bg-gray-100 hover:bg-gray-200 transition-colors"
          @click="toggleCliente(cli.key)">
          <i :class="expandidos[cli.key] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
            class="text-[10px] text-gray-400" />
          <span class="flex-1 text-sm font-bold text-gray-800 uppercase tracking-wide">
            {{ cli.cliente_nombre }}
          </span>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold" style="background:#E5E7EB; color:#6B7280">
            {{ cli.proyectos.length }} proyectos
          </span>
          <span class="text-[11px] font-mono font-bold ml-2" style="color:#915BD8">
            {{ fmtCompact(cli.kpis.ingresoNeto) }}
          </span>
        </div>

        <template v-if="expandidos[cli.key]">
          <div class="bg-white rounded-xl shadow-sm p-4 mx-3 my-2">
            <!-- KPI cards -->
            <div class="flex gap-3 mb-5 flex-wrap">
              <div v-for="k in kpiCards(cli)" :key="k.label"
                class="flex-1 min-w-[140px] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">{{ k.label }}</span>
                  <i :class="k.icon" class="text-gray-300 text-[11px]" />
                </div>
                <div class="text-xl font-bold" :style="{ color: k.color }">{{ fmtCompact(k.value) }}</div>
              </div>
            </div>

            <!-- Gráfico: valor a pagar por mes -->
            <div v-if="cli.barData.length" class="mb-4">
              <div class="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                Valor a pagar por mes
              </div>
              <NetoMensualBar :bars="cli.barData.map(b => ({ label: shortMes(b.mes), neto: b.neto }))" />
            </div>

            <!-- Tabla colapsable por proyecto × mes -->
            <div>
              <button class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2"
                @click="toggleTabla(cli.key)">
                <i :class="tablasAbiertas[cli.key] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-[9px]" />
                Detalle por proyecto
              </button>
              <div v-show="tablasAbiertas[cli.key]" class="overflow-x-auto">
                <table class="text-xs w-full min-w-max">
                  <thead>
                    <tr style="background:#f8f8f8">
                      <th class="px-2 py-1.5 text-left text-gray-600 sticky left-0 bg-gray-100 font-medium border-r border-gray-200">Proyecto</th>
                      <th v-for="mes in cli.meses" :key="mes"
                        class="px-2 py-1.5 text-right text-gray-500 whitespace-nowrap font-normal">{{ shortMes(mes) }}</th>
                      <th class="px-2 py-1.5 text-right text-gray-700 whitespace-nowrap font-semibold border-l border-gray-200">Total</th>
                      <th class="px-2 py-1.5" style="width:36px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in cli.tablaRows" :key="row.nombre"
                      class="border-b border-gray-100 hover:bg-gray-50">
                      <td class="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[160px] truncate sticky left-0 bg-white border-r border-gray-100" :title="row.nombre">{{ row.nombre }}</td>
                      <td v-for="(val, mi) in row.meses" :key="mi"
                        class="px-2 py-1.5 text-right font-mono whitespace-nowrap"
                        :style="val ? 'color:#111827' : 'color:#D1D5DB'">
                        {{ val ? fmtCompact(val) : '—' }}
                      </td>
                      <td class="px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap border-l border-gray-100 text-gray-900">{{ fmtCompact(row.total) }}</td>
                      <td class="px-2 py-1.5 text-right">
                        <button v-if="row.liquidacion_id"
                          class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                          title="Ver detalle operativo" @click="router.push(`/liquidaciones/${row.liquidacion_id}`)">
                          <i class="pi pi-eye text-gray-500 text-xs" />
                        </button>
                      </td>
                    </tr>
                    <tr class="border-t-2 border-gray-300">
                      <td class="px-2 py-1.5 font-bold text-gray-700 sticky left-0 bg-gray-50 border-r border-gray-200">TOTAL</td>
                      <td v-for="(val, mi) in cli.totalRow.meses" :key="mi"
                        class="px-2 py-1.5 text-right font-mono font-bold whitespace-nowrap text-gray-900">{{ fmtCompact(val) }}</td>
                      <td class="px-2 py-1.5 text-right font-mono font-bold whitespace-nowrap border-l border-gray-200 text-gray-900">{{ fmtCompact(cli.totalRow.total) }}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import NetoMensualBar from './components/NetoMensualBar.vue'
import { fmtCompact, formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  periodo: { type: String, default: null },   // "YYYY-MM-01"
  tipo: { type: String, default: 'preliquidacion' },
})

const router = useRouter()

const periodoYYYYMM = computed(() => (props.periodo || '').slice(0, 7))
const ventana = computed(() => {
  const [y, m] = (props.periodo || '').split('-').map(Number)
  const ini = new Date(y, m - 12, 1)
  return { desde: `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}`, hasta: periodoYYYYMM.value }
})

const loading = ref(false)
const periodosData = ref([])   // [{periodo, resumen, proyectos}]

const TABS_TIPO = [
  { key: 'todas', label: 'Todas' },
  { key: 'minigranja', label: 'Minigranjas' },
  { key: 'autoconsumo', label: 'Autoconsumo' },
]
const tabTipo = ref('todas')

const expandidos = reactive({})
const tablasAbiertas = reactive({})
function toggleCliente(k) { expandidos[k] ? delete expandidos[k] : (expandidos[k] = true) }
function toggleTabla(k) { tablasAbiertas[k] ? delete tablasAbiertas[k] : (tablasAbiertas[k] = true) }

// Pivota el Panel (rango) por cliente, con series multi-mes.
const clientes = computed(() => {
  const map = {}
  for (const entry of periodosData.value) {
    const mes = entry.periodo
    for (const proy of (entry.proyectos || [])) {
      if (tabTipo.value !== 'todas' && proy.tipo_proyecto !== tabTipo.value) continue
      for (const inv of (proy.inversionistas || [])) {
        const key = inv.cliente_id != null ? `c${inv.cliente_id}` : `n${inv.cliente_nombre || inv.nombre}`
        if (!map[key]) {
          map[key] = {
            key, cliente_id: inv.cliente_id,
            cliente_nombre: inv.cliente_nombre || inv.nombre || '—',
            _proy: {},        // { proyNombre: { proyecto_id, liquidacion_id, porcentaje, meses:{mes:valor} } }
            _monthKPI: {},    // { mes: {bruto, comercializacion, costos, facturas} }
            _mesSet: new Set(),
          }
        }
        const c = map[key]
        c._mesSet.add(mes)
        const g = inv.grupos_totales || {}
        if (!c._monthKPI[mes]) c._monthKPI[mes] = { bruto: 0, comercializacion: 0, costos: 0, facturas: 0 }
        c._monthKPI[mes].bruto += g.ingresos || 0
        c._monthKPI[mes].comercializacion += g.comercializacion || 0
        c._monthKPI[mes].costos += g.costos || 0
        c._monthKPI[mes].facturas += g.facturas || 0

        const nom = proy.proyecto
        if (!c._proy[nom]) c._proy[nom] = { proyecto_id: proy.proyecto_id, liquidacion_id: proy.liquidacion_id, porcentaje: inv.porcentaje, meses: {} }
        if (proy.liquidacion_id) c._proy[nom].liquidacion_id = proy.liquidacion_id
        c._proy[nom].meses[mes] = (c._proy[nom].meses[mes] || 0) + (inv.valor_a_pagar || 0)
      }
    }
  }

  return Object.values(map).map(c => {
    const meses = [...c._mesSet].sort()
    const proyNames = Object.keys(c._proy)

    let ingresoBruto = 0, comercializacion = 0, costosOperativos = 0, serviciosUnergy = 0, ingresoNeto = 0
    for (const k of Object.values(c._monthKPI)) {
      ingresoBruto += k.bruto; comercializacion += k.comercializacion
      costosOperativos += k.costos; serviciosUnergy += k.facturas
    }
    const barData = meses.map(mes => {
      let neto = 0
      for (const nom of proyNames) neto += c._proy[nom].meses[mes] || 0
      return { mes, neto }
    })
    ingresoNeto = barData.reduce((s, b) => s + b.neto, 0)

    const tablaRows = proyNames.map(nom => ({
      nombre: nom,
      liquidacion_id: c._proy[nom].liquidacion_id,
      meses: meses.map(m => c._proy[nom].meses[m] ?? null),
      total: meses.reduce((a, m) => a + (c._proy[nom].meses[m] || 0), 0),
    })).sort((a, b) => b.total - a.total)
    const totalRow = {
      meses: meses.map(m => proyNames.reduce((a, nom) => a + (c._proy[nom].meses[m] || 0), 0)),
      total: tablaRows.reduce((s, r) => s + r.total, 0),
    }

    return {
      key: c.key, cliente_id: c.cliente_id, cliente_nombre: c.cliente_nombre,
      proyectos: proyNames,
      kpis: { ingresoBruto, comercializacion, costosOperativos, serviciosUnergy, ingresoNeto },
      meses, barData, tablaRows, totalRow,
    }
  }).sort((a, b) => b.kpis.ingresoNeto - a.kpis.ingresoNeto)
})

function kpiCards(cli) {
  const k = cli.kpis
  return [
    { label: 'Ingreso Bruto', value: k.ingresoBruto, icon: 'pi pi-arrow-up-right', color: '#111827' },
    { label: 'Comercialización', value: k.comercializacion, icon: 'pi pi-chart-bar', color: '#D64455' },
    { label: 'Costos Operativos', value: k.costosOperativos, icon: 'pi pi-minus', color: '#D64455' },
    { label: 'Servicios Unergy', value: k.serviciosUnergy, icon: 'pi pi-bolt', color: '#111827' },
    { label: 'Valor a pagar', value: k.ingresoNeto, icon: 'pi pi-wallet', color: k.ingresoNeto >= 0 ? '#915BD8' : '#ef4444' },
  ]
}

function shortMes(ym) {
  const [y, m] = ym.split('-')
  const M = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${M[parseInt(m) - 1]} ${y.slice(2)}`
}

async function load() {
  if (!periodoYYYYMM.value) return
  loading.value = true
  try {
    const { data } = await api.get('/liquidaciones/resumen-panel-rango', {
      params: { periodo_desde: ventana.value.desde, periodo_hasta: ventana.value.hasta, tipo: props.tipo },
    })
    periodosData.value = data.periodos || []
  } catch {
    periodosData.value = []
  } finally {
    loading.value = false
  }
}

watch([() => props.periodo, () => props.tipo], load)
onMounted(load)
</script>
