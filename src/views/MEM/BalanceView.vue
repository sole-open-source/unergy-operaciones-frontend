<template>
  <div class="space-y-5">
    <PageHeader title="Balance Energético" subtitle="Generación propia vs. compromisos contractuales">
      <template #actions>
        <div class="flex items-center gap-2">
          <Dropdown v-model="mes" :options="mesOptions" optionLabel="label" optionValue="value" class="w-36" />
          <Dropdown v-model="anio" :options="anioOptions" optionLabel="label" optionValue="value" class="w-28" />
        </div>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl" style="color: #915BD8;" />
    </div>

    <!-- Servicio no disponible / sin datos -->
    <template v-else-if="!items.length">
      <div class="flex flex-col items-center py-16 gap-3" style="color: #6b5a8a;">
        <i class="pi pi-cloud-download text-4xl" style="color: #c4b8d4;" />
        <p class="text-sm font-medium">
          {{ disponible ? 'Sin datos de balance para el período seleccionado' : 'Servicio de balance no disponible' }}
        </p>
        <p class="text-xs">
          {{ disponible
            ? 'Prueba con otro mes o año.'
            : 'El módulo de balance energético aún no está disponible en el backend.' }}
        </p>
      </div>
    </template>

    <template v-else>
      <!-- KPI row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="kpi in kpis" :key="kpi.label"
             class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">{{ kpi.label }}</p>
          <p class="text-2xl font-bold mt-1" :style="{ color: kpi.color }">{{ kpi.value }}</p>
          <p v-if="kpi.sub" class="text-xs mt-0.5" style="color: #6b5a8a;">{{ kpi.sub }}</p>
        </div>
      </div>

      <!-- Gráfico de balance neto -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <div class="px-5 py-3 border-b" style="border-color: #e8e0f0;">
          <h3 class="text-sm font-semibold" style="color: #2C2039;">Generación vs. Compromiso por contrato</h3>
        </div>
        <div class="p-5" style="height: 340px;">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Tabla de impacto financiero -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <div class="px-5 py-3 border-b" style="border-color: #e8e0f0;">
          <h3 class="text-sm font-semibold" style="color: #2C2039;">Impacto Financiero</h3>
        </div>
        <DataTable :value="items" :paginator="items.length > 15" :rows="15"
                   responsiveLayout="scroll" stripedRows class="p-datatable-sm">
          <Column field="contrato" header="Contrato" sortable style="min-width: 140px">
            <template #body="{ data }">
              <span class="font-medium" style="color: #2C2039;">{{ data.contrato || '—' }}</span>
            </template>
          </Column>
          <Column field="proyecto" header="Proyecto" sortable style="min-width: 140px">
            <template #body="{ data }">{{ data.proyecto || '—' }}</template>
          </Column>
          <Column field="generacion_real" header="Generación (MWh)" sortable style="min-width: 140px">
            <template #body="{ data }"><span class="font-mono">{{ fmtMWh(data.generacion_real) }}</span></template>
          </Column>
          <Column field="compromiso" header="Compromiso (MWh)" sortable style="min-width: 140px">
            <template #body="{ data }"><span class="font-mono">{{ fmtMWh(data.compromiso) }}</span></template>
          </Column>
          <Column field="balance_net" header="Balance (MWh)" sortable style="min-width: 130px">
            <template #body="{ data }">
              <span class="font-mono font-semibold" :style="{ color: balanceColor(data.balance_net) }">
                {{ fmtMWh(data.balance_net) }}
              </span>
            </template>
          </Column>
          <Column field="precio_bolsa" header="Precio Bolsa" sortable style="min-width: 120px">
            <template #body="{ data }"><span class="font-mono">${{ fmtNum(data.precio_bolsa, 1) }}</span></template>
          </Column>
          <Column field="impacto_financiero" header="Impacto (COP)" sortable style="min-width: 150px">
            <template #body="{ data }">
              <span class="font-mono font-semibold" :style="{ color: balanceColor(data.impacto_financiero) }">
                {{ fmtCOP(data.impacto_financiero) }}
              </span>
            </template>
          </Column>
          <ColumnGroup type="footer">
            <Row>
              <Column footer="Totales" :colspan="2" footerStyle="text-align:right; font-weight:600;" />
              <Column :footer="fmtMWh(totals.generacion_real)" footerStyle="font-family:monospace;" />
              <Column :footer="fmtMWh(totals.compromiso)" footerStyle="font-family:monospace;" />
              <Column footerStyle="font-family:monospace; font-weight:600;">
                <template #footer>
                  <span :style="{ color: balanceColor(totals.balance_net) }">{{ fmtMWh(totals.balance_net) }}</span>
                </template>
              </Column>
              <Column footer="" />
              <Column footerStyle="font-family:monospace; font-weight:600;">
                <template #footer>
                  <span :style="{ color: balanceColor(totals.impacto_financiero) }">{{ fmtCOP(totals.impacto_financiero) }}</span>
                </template>
              </Column>
            </Row>
          </ColumnGroup>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchBalanceEnergetico } from '@/api/mem'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import Dropdown from 'primevue/dropdown'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// ── Filtros de fecha ──────────────────────────────────────────────────────
const hoy = new Date()
const mes = ref(hoy.getMonth() + 1)
const anio = ref(hoy.getFullYear())

const mesOptions = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((label, i) => ({ label, value: i + 1 }))

const anioOptions = Array.from({ length: 6 }, (_, i) => {
  const y = hoy.getFullYear() - i
  return { label: String(y), value: y }
})

// ── Estado ────────────────────────────────────────────────────────────────
const rawItems = ref([])
const precioBolsaPromedio = ref(0)
const disponible = ref(true)
const loading = ref(true)

// ── Carga de datos ──────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true
  try {
    const res = await fetchBalanceEnergetico(mes.value, anio.value)
    rawItems.value = res.items || []
    precioBolsaPromedio.value = res.precio_bolsa_promedio || 0
    disponible.value = res.disponible !== false
  } catch (e) {
    console.error('Error loading balance energético:', e)
    rawItems.value = []
    disponible.value = false
  } finally {
    loading.value = false
  }
}

watch([mes, anio], loadData)
onMounted(loadData)

// ── Cálculo y enriquecimiento ────────────────────────────────────────────────
// Balance neto = Generación real − Compromiso (lo calculamos si el backend no
// lo devuelve). Impacto financiero = balance neto × precio de bolsa.
const items = computed(() =>
  rawItems.value.map((r) => {
    const generacion_real = Number(r.generacion_real ?? r.generacion ?? 0)
    const compromiso = Number(r.compromiso ?? r.compromiso_promedio ?? r.compromiso_min ?? 0)
    const balance_net = r.balance_net != null ? Number(r.balance_net) : generacion_real - compromiso
    const precio_bolsa = Number(r.precio_bolsa ?? precioBolsaPromedio.value) || 0
    const impacto_financiero =
      r.impacto_financiero != null ? Number(r.impacto_financiero) : balance_net * precio_bolsa
    return {
      contrato: r.contrato ?? r.contrato_nombre ?? r.nombre ?? '',
      proyecto: r.proyecto ?? r.proyecto_nombre ?? '',
      generacion_real,
      compromiso,
      balance_net,
      precio_bolsa,
      impacto_financiero,
    }
  })
)

const totals = computed(() =>
  items.value.reduce(
    (acc, r) => ({
      generacion_real: acc.generacion_real + r.generacion_real,
      compromiso: acc.compromiso + r.compromiso,
      balance_net: acc.balance_net + r.balance_net,
      impacto_financiero: acc.impacto_financiero + r.impacto_financiero,
    }),
    { generacion_real: 0, compromiso: 0, balance_net: 0, impacto_financiero: 0 }
  )
)

const kpis = computed(() => [
  { label: 'Generación real', value: fmtMWh(totals.value.generacion_real), color: '#10B981', sub: 'MWh' },
  { label: 'Compromiso total', value: fmtMWh(totals.value.compromiso), color: '#915BD8', sub: 'MWh' },
  {
    label: 'Balance neto',
    value: fmtMWh(totals.value.balance_net),
    color: balanceColor(totals.value.balance_net),
    sub: 'MWh',
  },
  {
    label: 'Impacto financiero',
    value: fmtCOP(totals.value.impacto_financiero),
    color: balanceColor(totals.value.impacto_financiero),
    sub: 'COP estimado',
  },
])

// ── Gráfico ──────────────────────────────────────────────────────────────────
const chartData = computed(() => ({
  labels: items.value.map((r) => r.contrato || '—'),
  datasets: [
    {
      label: 'Generación Real',
      data: items.value.map((r) => r.generacion_real),
      backgroundColor: '#10B981',
      borderRadius: 4,
      maxBarThickness: 28,
    },
    {
      label: 'Compromiso',
      data: items.value.map((r) => r.compromiso),
      backgroundColor: '#915BD8',
      borderRadius: 4,
      maxBarThickness: 28,
    },
    {
      label: 'Balance Neto',
      data: items.value.map((r) => r.balance_net),
      backgroundColor: items.value.map((r) => (r.balance_net >= 0 ? '#10B981' : '#D64455')),
      borderRadius: 4,
      maxBarThickness: 28,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6b5a8a', usePointStyle: true } },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${fmtMWh(ctx.parsed.y)} MWh`,
        // En la serie de balance añadimos el impacto financiero estimado.
        afterLabel: (ctx) => {
          if (ctx.dataset.label !== 'Balance Neto') return ''
          const row = items.value[ctx.dataIndex]
          return row ? `Impacto: ${fmtCOP(row.impacto_financiero)}` : ''
        },
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { display: false } },
    y: {
      ticks: { font: { size: 10 }, color: '#9ca3af', callback: (v) => fmtMWh(v) },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
  },
}

// ── Formateo ──────────────────────────────────────────────────────────────────
function balanceColor(v) {
  if (v > 0) return '#10B981'
  if (v < 0) return '#D64455'
  return '#2C2039'
}

function fmtNum(v, decimals = 0) {
  if (v == null || isNaN(v)) return '—'
  return Number(v).toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtMWh(v) {
  return fmtNum(v, 1)
}

function fmtCOP(v) {
  if (v == null || isNaN(v)) return '—'
  return '$' + Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })
}
</script>
