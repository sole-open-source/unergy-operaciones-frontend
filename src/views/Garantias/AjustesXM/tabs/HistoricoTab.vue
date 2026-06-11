<template>
  <div class="space-y-5">
    <!-- Controles de respaldo -->
    <div class="flex flex-wrap gap-2 justify-end">
      <Button label="Exportar a Excel" icon="pi pi-file-excel" severity="secondary" outlined size="small"
        @click="exportarExcel" />
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-4">Cargando...</div>

    <!-- Tabla resumen -->
    <div v-if="store.historial.length" class="bg-white rounded-xl shadow-sm overflow-hidden"
      style="border:1px solid #e8e0f0">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:#6b5a8a">Fecha</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:#6b5a8a">Tipo</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">PB</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">UNGC</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">UNGG</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Total</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Disponible</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Saldo</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:#6b5a8a">—</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.historial" :key="r.id"
            class="border-b last:border-b-0 hover:bg-gray-50/50">
            <td class="px-3 py-2 tabular-nums" style="color:#2C2039">{{ r.fecha }}</td>
            <td class="px-3 py-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :style="tipoBadge(r.tipo)">
                {{ r.tipo }}
              </span>
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs" style="color:#6b5a8a">
              {{ r.pb != null ? fmtCOP(r.pb) : '—' }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.totalUNGC != null ? fmtCOP(r.totalUNGC) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.totalUNGG != null ? fmtCOP(r.totalUNGG) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold" style="color:#2C2039">
              {{ r.totalConsignar != null ? fmtCOP(r.totalConsignar) : (r.totalAjusteTXR != null ? fmtCOP(r.totalAjusteTXR) : '—') }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.disponibleCustodia != null ? fmtCOP(r.disponibleCustodia) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.saldo != null ? fmtCOP(r.saldo) : '—' }}</td>
            <td class="px-3 py-2 text-center">
              <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" @click="abrirEditar(r)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                @click="store.eliminar(r.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!store.loading" class="py-12 text-center" style="color:#6b5a8a">
      <i class="pi pi-inbox text-3xl mb-2 block" style="color:#c4b8d4" />
      No hay registros en el historial. Confirma un reporte desde Semanales, TXR o Mensuales.
    </div>

    <!-- Gráfica de tendencia -->
    <div v-if="filteredHistorial.length > 1" class="bg-white rounded-xl shadow-sm p-4 space-y-3"
      style="border:1px solid #e8e0f0">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-semibold" style="color:#2C2039">Tendencia histórica</h3>
        <div class="flex gap-1">
          <button v-for="r in rangos" :key="r.key"
            @click="rangoActivo = r.key"
            class="px-3 py-1 text-xs rounded-lg font-medium transition-colors"
            :style="rangoActivo === r.key
              ? 'background:#915BD8;color:white'
              : 'color:#6b5a8a;border:1px solid #e8e0f0'">
            {{ r.label }}
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-3">
        <label v-for="serie in seriesConfig" :key="serie.key"
          class="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input type="checkbox" v-model="seriesVisible[serie.key]"
            class="accent-purple-600" />
          <span :style="{ color: serie.color }">●</span>
          <span style="color:#374151">{{ serie.label }}</span>
        </label>
      </div>
      <div style="height:280px;position:relative">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <EditAjusteDialog
      v-model:visible="editVisible"
      :ajuste="editAjuste"
      @saved="store.cargar()"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { useGarantiasHistorial } from '../composables/useGarantiasHistorial.js'
import { fmtCOP } from '../utils/formatters.js'
import { exportHistorialExcel } from '../utils/excelExport.js'
import Button from 'primevue/button'
import EditAjusteDialog from '../EditAjusteDialog.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const store = useGarantiasHistorial()

onMounted(() => store.cargar())

const editVisible = ref(false)
const editAjuste = ref(null)

function abrirEditar(ajuste) {
  editAjuste.value = ajuste
  editVisible.value = true
}

const rangoActivo = ref('4w')
const seriesVisible = ref({
  totalConsignar: true,
  pb: true,
  disponible: true,
  ajusteTxr: false,
})

const rangos = [
  { key: '4w',  label: 'Últimas 4 semanas' },
  { key: '3m',  label: 'Últimos 3 meses' },
  { key: 'all', label: 'Todo' },
]

const seriesConfig = [
  { key: 'totalConsignar', label: 'Total consignar', color: '#10B981' },
  { key: 'disponible',     label: 'Disponible custodia', color: '#3B82F6' },
  { key: 'ajusteTxr',      label: 'Ajuste TXR',    color: '#F59E0B' },
  { key: 'pb',             label: 'PB',             color: '#915BD8' },
]

const filteredHistorial = computed(() => {
  const all = [...store.historial.value]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (rangoActivo.value === 'all') return all
  const cutoff = new Date()
  if (rangoActivo.value === '4w') cutoff.setDate(cutoff.getDate() - 28)
  else cutoff.setMonth(cutoff.getMonth() - 3)
  const cutStr = cutoff.toISOString().slice(0, 10)
  return all.filter(r => r.fecha >= cutStr)
})

const chartData = computed(() => {
  const labels = filteredHistorial.value.map(r => r.fecha)
  const datasets = []
  if (seriesVisible.value.totalConsignar) datasets.push({
    label: 'Total consignar',
    data: filteredHistorial.value.map(r => r.totalConsignar ?? r.totalAjusteTXR ?? null),
    borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)',
    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
  })
  if (seriesVisible.value.disponible) datasets.push({
    label: 'Disponible custodia',
    data: filteredHistorial.value.map(r => r.disponibleCustodia ?? null),
    borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)',
    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
  })
  if (seriesVisible.value.ajusteTxr) datasets.push({
    label: 'Ajuste TXR',
    data: filteredHistorial.value.map(r => r.totalAjusteTXR ?? null),
    borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)',
    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
  })
  if (seriesVisible.value.pb) datasets.push({
    label: 'PB ($)',
    data: filteredHistorial.value.map(r => r.pb ?? null),
    borderColor: '#915BD8', backgroundColor: 'rgba(145,91,216,0.08)',
    fill: false, tension: 0.4, pointRadius: 4, yAxisID: 'y2',
  })
  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed.y
          if (v == null) return null
          return ` ${ctx.dataset.label}: ${Math.abs(v) >= 1e6
            ? '$' + (v / 1e6).toFixed(1) + 'M'
            : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)}`
        },
      },
    },
  },
  scales: {
    y: {
      position: 'left',
      ticks: {
        callback: (v) => Math.abs(v) >= 1e9 ? '$' + (v/1e9).toFixed(1)+'B'
          : Math.abs(v) >= 1e6 ? '$' + (v/1e6).toFixed(1)+'M'
          : '$' + (v/1e3).toFixed(0)+'k',
      },
    },
    y2: {
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { callback: (v) => '$' + v.toFixed(0) },
    },
  },
}))

function tipoBadge(tipo) {
  const map = {
    semanal: 'background:#f3f0f7;color:#915BD8',
    txr:     'background:#dbeafe;color:#1d4ed8',
    mensual: 'background:#d1fae5;color:#065f46',
  }
  return map[tipo] || 'background:#f3f4f6;color:#6b7280'
}

function exportarExcel() {
  exportHistorialExcel(store.historial.value)
}
</script>
