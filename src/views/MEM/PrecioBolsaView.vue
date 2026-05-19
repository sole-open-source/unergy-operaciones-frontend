<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <Button icon="pi pi-arrow-left" text @click="$router.back()" class="-ml-2" />
      <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:#915BD822">
        <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
      </div>
      <div>
        <h2 class="text-xl font-bold text-gray-800">Mercado de Energía</h2>
        <p class="text-xs text-gray-400 mt-0.5">Precios de bolsa XM + Pronóstico Clima</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <button v-for="(tab, i) in TABS" :key="i"
        @click="activeTab = i"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors -mb-px',
          activeTab === i
            ? 'border-b-2 text-gray-800' : 'text-gray-400 hover:text-gray-600'
        ]"
        :style="activeTab === i ? 'border-color:#915BD8' : ''">
        {{ tab }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- ═══ TAB 0: Precios de Bolsa ═══ -->
    <template v-if="!loading && activeTab === 0">
      <div v-if="!spot" class="flex flex-col items-center py-12 gap-2 text-gray-400">
        <i class="pi pi-cloud-download text-3xl" />
        <p class="text-sm">Sin datos de predespacho disponibles.</p>
      </div>

      <template v-else>
        <!-- KPI cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div v-for="kpi in spotKpis" :key="kpi.label"
            class="rounded-xl border p-3" :style="`border-color:${kpi.color}33; background:${kpi.color}08`">
            <p class="text-2xl font-bold" :style="`color:${kpi.color}`">{{ kpi.value }}</p>
            <p class="text-xs font-medium mt-0.5" :style="`color:${kpi.color}cc`">{{ kpi.label }}</p>
          </div>
        </div>

        <!-- Price chart (SVG) -->
        <div class="rounded-xl border border-gray-100 bg-white p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-700 text-sm">Precio Bolsa por hora ($/kWh)</h3>
            <span class="text-xs text-gray-400">{{ spot.date }}</span>
          </div>
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full" style="max-height:260px"
            @mousemove="onChartMove" @mouseleave="hoverBar = null">
            <!-- Grid lines -->
            <line v-for="y in gridY" :key="'g'+y.val"
              :x1="padL" :x2="chartW - padR" :y1="y.py" :y2="y.py"
              stroke="#e5e7eb" stroke-width="0.5" />
            <text v-for="y in gridY" :key="'t'+y.val"
              :x="padL - 4" :y="y.py + 3" text-anchor="end"
              fill="#9ca3af" font-size="9">{{ y.label }}</text>

            <!-- Bars -->
            <rect v-for="(bar, i) in priceBars" :key="i"
              :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h"
              :fill="bar.peak ? '#F6FF72' : '#915BD8'" :opacity="hoverBar?.hour === bar.hour ? 1 : 0.85"
              rx="2" />

            <!-- Scarcity line -->
            <line v-if="spot.scarcity_price"
              :x1="padL" :x2="chartW - padR"
              :y1="priceToY(spot.scarcity_price)" :y2="priceToY(spot.scarcity_price)"
              stroke="#D64455" stroke-width="1" stroke-dasharray="4,3" />
            <text v-if="spot.scarcity_price"
              :x="chartW - padR + 2" :y="priceToY(spot.scarcity_price) + 3"
              fill="#D64455" font-size="8">P.Esc ${{ Math.round(spot.scarcity_price) }}</text>

            <!-- Hour labels -->
            <text v-for="h in 24" :key="'h'+h"
              :x="padL + (h - 0.5) * barStep" :y="chartH - 2"
              text-anchor="middle" fill="#9ca3af" font-size="8">{{ h }}</text>
          </svg>

          <!-- Tooltip -->
          <div v-if="hoverBar"
            class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none"
            :style="{ left: tooltipLeft + 'px', top: tooltipTop + 'px' }">
            <p class="font-semibold text-gray-800">Hora {{ hoverBar.hour }}</p>
            <p style="color:#915BD8">${{ hoverBar.price.toFixed(2) }} /kWh</p>
            <p class="text-gray-400">{{ hoverBar.marginal }}</p>
          </div>
        </div>

        <!-- Generation table -->
        <div class="rounded-xl border border-gray-100 bg-white p-4">
          <h3 class="font-semibold text-gray-700 mb-3 text-sm">Generación por hora (MWh)</h3>
          <DataTable :value="genRows" size="small" stripedRows scrollable scrollHeight="400px"
            :paginator="false" class="text-sm">
            <Column field="hour" header="Hora" style="width:60px">
              <template #body="{ data }">
                <span class="font-mono text-xs font-semibold text-gray-700">{{ data.hour }}</span>
              </template>
            </Column>
            <Column header="Hidráulica" style="min-width:100px">
              <template #body="{ data }">
                <span class="text-blue-600 font-mono text-xs">{{ data.hidro.toLocaleString() }}</span>
              </template>
            </Column>
            <Column header="Térmica" style="min-width:100px">
              <template #body="{ data }">
                <span class="text-orange-600 font-mono text-xs">{{ data.termica.toLocaleString() }}</span>
              </template>
            </Column>
            <Column header="Renovable" style="min-width:100px">
              <template #body="{ data }">
                <span class="text-green-600 font-mono text-xs">{{ data.renovable.toLocaleString() }}</span>
              </template>
            </Column>
            <Column header="Menores" style="min-width:100px">
              <template #body="{ data }">
                <span class="font-mono text-xs" style="color:#915BD8">{{ data.menor.toLocaleString() }}</span>
              </template>
            </Column>
            <Column header="Precio" style="min-width:90px">
              <template #body="{ data }">
                <span class="font-mono text-xs font-semibold" :class="data.price >= 900 ? 'text-red-600' : 'text-gray-700'">
                  ${{ data.price.toFixed(0) }}
                </span>
              </template>
            </Column>
            <Column header="Marginal" style="min-width:120px">
              <template #body="{ data }">
                <span class="text-xs text-gray-500">{{ data.marginal }}</span>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </template>

    <!-- ═══ TAB 1: Clima / Pronóstico ═══ -->
    <template v-if="!loading && activeTab === 1">
      <div v-if="!clima || !clima.models_available" class="flex flex-col items-center py-12 gap-2 text-gray-400">
        <i class="pi pi-cloud text-3xl" />
        <p class="text-sm">Modelos de pronóstico no disponibles.</p>
        <p class="text-xs">Los endpoints están activos — ejecute el pipeline de entrenamiento.</p>
      </div>

      <template v-else>
        <!-- ENSO classification -->
        <div class="rounded-xl border border-gray-100 bg-white p-4" v-if="clima.enso">
          <h3 class="font-semibold text-gray-700 mb-2 text-sm">Clasificación ENSO</h3>
          <div class="flex items-center gap-4">
            <span class="text-lg font-bold" :class="ensoColor">{{ clima.enso.current_state || (Array.isArray(clima.enso.classification) ? clima.enso.classification[0] : clima.enso.classification) }}</span>
            <span class="text-sm text-gray-500">ONI: {{ clima.enso.latest_oni?.toFixed(2) ?? (Array.isArray(clima.enso.nino34_predicted) ? clima.enso.nino34_predicted[0]?.toFixed(2) : clima.enso.nino34_predicted?.toFixed(2)) }}</span>
          </div>
          <div v-if="clima.enso.probabilities" class="flex gap-3 mt-2">
            <span v-for="(prob, label) in clima.enso.probabilities" :key="label"
              class="text-xs text-gray-500">{{ label.replace('p_','') }}: {{ ((Array.isArray(prob) ? prob[0] : prob) * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- Trading signals -->
        <div class="rounded-xl border border-gray-100 bg-white p-4" v-if="clima.trading_signals?.length">
          <h3 class="font-semibold text-gray-700 mb-3 text-sm">Señales de Trading</h3>
          <DataTable :value="clima.trading_signals" size="small" stripedRows class="text-sm">
            <Column field="month" header="Mes" style="min-width:80px" />
            <Column header="Precio" style="min-width:100px">
              <template #body="{ data }">
                <span class="font-mono text-xs font-semibold">${{ data.price?.toFixed(0) }}</span>
              </template>
            </Column>
            <Column header="Dirección" style="min-width:110px">
              <template #body="{ data }">
                <span :class="[
                  'inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5',
                  data.direction?.includes('COMPRAR') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                ]">
                  <i :class="data.direction?.includes('COMPRAR') ? 'pi pi-arrow-down' : 'pi pi-arrow-up'" class="text-[10px]" />
                  {{ data.direction }}
                </span>
              </template>
            </Column>
            <Column header="Riesgo" style="min-width:90px">
              <template #body="{ data }">
                <span :class="[
                  'text-xs font-medium rounded-full px-2 py-0.5',
                  data.risk_level === 'ALTO' ? 'bg-red-100 text-red-600' :
                  data.risk_level === 'MEDIO' ? 'bg-orange-100 text-orange-600' :
                  'bg-green-100 text-green-600'
                ]">
                  {{ data.risk_level }}
                </span>
              </template>
            </Column>
            <Column header="Régimen" style="min-width:100px">
              <template #body="{ data }">
                <span class="text-xs text-gray-500">{{ data.regime }} ({{ (data.regime_prob * 100).toFixed(0) }}%)</span>
              </template>
            </Column>
            <Column header="Margen" style="min-width:80px">
              <template #body="{ data }">
                <span class="font-mono text-xs" :class="data.margin > 0 ? 'text-green-600' : 'text-red-600'">
                  {{ data.margin > 0 ? '+' : '' }}${{ data.margin?.toFixed(0) }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import api from '@/api/client'

const TABS = ['Precios de Bolsa', 'Clima / Pronóstico']
const activeTab = ref(0)
const loading = ref(true)
const spot = ref(null)
const clima = ref(null)
const hoverBar = ref(null)
const tooltipLeft = ref(0)
const tooltipTop = ref(0)

const chartW = 700
const chartH = 200
const padL = 50
const padR = 60
const padT = 10
const padB = 20

onMounted(async () => {
  try {
    const [spotRes, climaRes] = await Promise.all([
      api.get('/evo/dailyspot/latest').catch(() => null),
      api.get('/evo/clima/forecast').catch(() => null),
    ])
    if (spotRes?.data) spot.value = spotRes.data
    if (climaRes?.data) clima.value = climaRes.data
  } catch (e) {
    console.error('Error cargando datos MEM:', e)
  } finally {
    loading.value = false
  }
})

const spotKpis = computed(() => {
  if (!spot.value?.summary) return []
  const s = spot.value.summary
  return [
    { label: 'Precio promedio', value: `$${s.price_avg?.toFixed(0)}`, color: '#915BD8' },
    { label: 'Precio máximo', value: `$${s.price_max?.toFixed(0)}`, color: '#D64455' },
    { label: 'Spread', value: `$${s.spread?.toFixed(0)}`, color: '#F0C040' },
    { label: 'Demanda', value: `${s.total_gwh?.toFixed(1)} GWh`, color: '#3B82F6' },
    { label: 'Hidráulica', value: `${s.hydro_pct}%`, color: '#10B981' },
  ]
})

const prices = computed(() => {
  if (!spot.value?.prices) return []
  return Object.entries(spot.value.prices)
    .map(([h, p]) => ({ hour: parseInt(h), price: p }))
    .sort((a, b) => a.hour - b.hour)
})

const priceMin = computed(() => prices.value.length ? Math.min(...prices.value.map(p => p.price)) * 0.9 : 0)
const priceMax = computed(() => {
  if (!prices.value.length) return 1000
  let mx = Math.max(...prices.value.map(p => p.price))
  if (spot.value?.scarcity_price) mx = Math.max(mx, spot.value.scarcity_price)
  return mx * 1.05
})

const barStep = computed(() => (chartW - padL - padR) / 24)

function priceToY(price) {
  const range = priceMax.value - priceMin.value
  if (range === 0) return padT
  return padT + (chartH - padT - padB) * (1 - (price - priceMin.value) / range)
}

const peakHour = computed(() => spot.value?.summary?.peak_hour || 20)

const priceBars = computed(() => {
  return prices.value.map((p, i) => ({
    x: padL + i * barStep.value + 2,
    y: priceToY(p.price),
    w: barStep.value - 4,
    h: Math.max(0, chartH - padB - priceToY(p.price)),
    hour: p.hour,
    price: p.price,
    peak: p.hour === peakHour.value,
    marginal: spot.value?.marginal_plants?.[String(p.hour)] || '',
  }))
})

const gridY = computed(() => {
  const steps = 5
  const range = priceMax.value - priceMin.value
  if (range === 0) return []
  return Array.from({ length: steps + 1 }, (_, i) => {
    const val = priceMin.value + (range * i) / steps
    return { val, py: priceToY(val), label: `$${Math.round(val)}` }
  })
})

function onChartMove(e) {
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  const scaleX = chartW / rect.width
  const mouseX = (e.clientX - rect.left) * scaleX
  const idx = Math.floor((mouseX - padL) / barStep.value)
  if (idx >= 0 && idx < priceBars.value.length) {
    hoverBar.value = priceBars.value[idx]
    tooltipLeft.value = e.clientX + 12
    tooltipTop.value = e.clientY - 40
  } else {
    hoverBar.value = null
  }
}

const genRows = computed(() => {
  if (!spot.value?.generation) return []
  return Object.entries(spot.value.generation)
    .map(([h, gen]) => ({
      hour: parseInt(h),
      hidro: Math.round(gen.Hidraulica || gen.hidraulica || 0),
      termica: Math.round(gen.Termica || gen.termica || 0),
      renovable: Math.round(gen.Renovables || gen.renovables || 0),
      menor: Math.round(gen.Menores || gen.menores || 0),
      price: spot.value.prices?.[h] || 0,
      marginal: spot.value.marginal_plants?.[h] || '',
    }))
    .sort((a, b) => a.hour - b.hour)
})

const ensoColor = computed(() => {
  const enso = clima.value?.enso
  const c = enso?.current_state || (Array.isArray(enso?.classification) ? enso.classification[0] : enso?.classification) || ''
  if (c.includes('Niño')) return 'text-red-600'
  if (c.includes('Niña')) return 'text-blue-600'
  return 'text-gray-600'
})
</script>

<style scoped>
:deep(.p-datatable .p-datatable-thead th) {
  background: #faf9fb;
  color: #6b7280;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.5rem 0.75rem;
}
:deep(.p-datatable .p-datatable-tbody td) {
  padding: 0.4rem 0.75rem;
}
</style>
