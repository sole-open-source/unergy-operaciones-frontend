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
        Espejo del Panel Contable · {{ formatPeriodo(periodo) }}
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
          <!-- KPIs del período -->
          <div class="bg-white rounded-xl shadow-sm p-4 mx-3 my-2">
            <div class="flex gap-3 mb-4 flex-wrap">
              <div v-for="k in kpiCards(cli)" :key="k.label"
                class="flex-1 min-w-[140px] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">{{ k.label }}</span>
                  <i :class="k.icon" class="text-gray-300 text-[11px]" />
                </div>
                <div class="text-xl font-bold" :style="{ color: k.color }">{{ fmtCompact(k.value) }}</div>
              </div>
            </div>

            <!-- Detalle por proyecto -->
            <div class="overflow-x-auto">
              <table class="text-xs w-full min-w-max">
                <thead>
                  <tr style="background:#f8f8f8">
                    <th class="px-2 py-1.5 text-left text-gray-600 font-medium">Proyecto</th>
                    <th class="px-2 py-1.5 text-right text-gray-500 font-normal">%</th>
                    <th class="px-2 py-1.5 text-right text-gray-700 font-semibold">Valor a pagar</th>
                    <th class="px-2 py-1.5 text-right font-normal" style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="proy in cli.proyectos" :key="proy.proyecto_id"
                    class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[220px] truncate" :title="proy.proyecto">
                      {{ proy.proyecto }}
                    </td>
                    <td class="px-2 py-1.5 text-right font-mono text-gray-500">
                      {{ proy.porcentaje != null ? proy.porcentaje.toFixed(2) + '%' : '—' }}
                    </td>
                    <td class="px-2 py-1.5 text-right font-mono font-semibold text-gray-900">
                      {{ fmtCompact(proy.valor_a_pagar) }}
                    </td>
                    <td class="px-2 py-1.5 text-right">
                      <button v-if="proy.liquidacion_id"
                        class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                        title="Ver detalle operativo"
                        @click="router.push(`/liquidaciones/${proy.liquidacion_id}`)">
                        <i class="pi pi-eye text-gray-500 text-xs" />
                      </button>
                    </td>
                  </tr>
                  <tr class="border-t-2 border-gray-300">
                    <td class="px-2 py-1.5 font-bold text-gray-700">TOTAL</td>
                    <td></td>
                    <td class="px-2 py-1.5 text-right font-mono font-bold text-gray-900">
                      {{ fmtCompact(cli.kpis.ingresoNeto) }}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
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
import { fmtCompact, formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  periodo: { type: String, default: null },   // "YYYY-MM-01"
  tipo: { type: String, default: 'preliquidacion' },
})

const router = useRouter()

const periodoYYYYMM = computed(() => (props.periodo || '').slice(0, 7))

const loading = ref(false)
const proyectosPanel = ref([])

const TABS_TIPO = [
  { key: 'todas', label: 'Todas' },
  { key: 'minigranja', label: 'Minigranjas' },
  { key: 'autoconsumo', label: 'Autoconsumo' },
]
const tabTipo = ref('todas')

const expandidos = reactive({})
function toggleCliente(key) {
  if (expandidos[key]) delete expandidos[key]
  else expandidos[key] = true
}

// Pivota los proyectos del Panel por cliente (inversionista)
const clientes = computed(() => {
  const map = {}
  for (const proy of proyectosPanel.value) {
    if (tabTipo.value !== 'todas' && proy.tipo_proyecto !== tabTipo.value) continue
    for (const inv of (proy.inversionistas || [])) {
      const key = inv.cliente_id != null ? `c${inv.cliente_id}` : `n${inv.cliente_nombre || inv.nombre}`
      if (!map[key]) {
        map[key] = {
          key,
          cliente_id: inv.cliente_id,
          cliente_nombre: inv.cliente_nombre || inv.nombre || '—',
          proyectos: [],
          kpis: { ingresoBruto: 0, comercializacion: 0, costosOperativos: 0, serviciosUnergy: 0, ingresoNeto: 0 },
        }
      }
      const g = inv.grupos_totales || {}
      map[key].kpis.ingresoBruto += g.ingresos || 0
      map[key].kpis.comercializacion += g.comercializacion || 0
      map[key].kpis.costosOperativos += g.costos || 0
      map[key].kpis.serviciosUnergy += g.facturas || 0
      map[key].kpis.ingresoNeto += inv.valor_a_pagar || 0
      map[key].proyectos.push({
        proyecto_id: proy.proyecto_id,
        proyecto: proy.proyecto,
        tipo_proyecto: proy.tipo_proyecto,
        liquidacion_id: proy.liquidacion_id,
        porcentaje: inv.porcentaje,
        valor_a_pagar: inv.valor_a_pagar || 0,
      })
    }
  }
  return Object.values(map).sort((a, b) => b.kpis.ingresoNeto - a.kpis.ingresoNeto)
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

async function load() {
  if (!periodoYYYYMM.value) return
  loading.value = true
  try {
    const { data } = await api.get('/liquidaciones/resumen-panel', {
      params: { periodo: periodoYYYYMM.value, tipo: props.tipo },
    })
    proyectosPanel.value = data.proyectos || []
  } catch {
    proyectosPanel.value = []
  } finally {
    loading.value = false
  }
}

watch([() => props.periodo, () => props.tipo], load)
onMounted(load)
</script>
