<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
    <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-chart-bar text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Ingresos vs Costos — del bruto al neto</h3>
    </div>

    <div v-if="hayDatos" class="p-4">
      <!-- KPIs de comparación -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div class="rounded-lg p-2.5" style="background:#ecfdf3">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#15803d">Ingreso bruto</p>
          <p class="text-base font-bold tabular-nums" style="color:#15803d">{{ fmtCompact(bruto) }}</p>
        </div>
        <div class="rounded-lg p-2.5" style="background:#fef2f3">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#b3324a">Costos totales</p>
          <p class="text-base font-bold tabular-nums" style="color:#b3324a">{{ fmtCompact(costosTotales) }}</p>
        </div>
        <div class="rounded-lg p-2.5" style="background:#faf7ff">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#6E3FB8">Ingreso neto</p>
          <p class="text-base font-bold tabular-nums" style="color:#915BD8">{{ fmtCompact(neto) }}</p>
        </div>
        <div class="rounded-lg p-2.5" style="background:#faf7ff">
          <p class="text-[10px] uppercase tracking-wide font-semibold" style="color:#9b8fb0">Margen neto</p>
          <p class="text-base font-bold tabular-nums" :style="{ color: margen >= 0 ? '#10B981' : '#D64455' }">
            {{ margen != null ? margen.toFixed(1) + '%' : '—' }}
          </p>
        </div>
      </div>

      <div style="height: 240px">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div v-else class="text-center py-10">
      <i class="pi pi-chart-bar text-3xl mb-2" style="color:#e0d5f0" />
      <p class="text-xs" style="color:#9b8fb0">Aún no hay cifras para construir el estado de resultados.</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { fmtCompact, fmtCOP, normTipo } from '@/utils/liquidaciones'
import { TIPOS_INGRESO_BRUTO } from '@/constants/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const props = defineProps({ liq: { type: Object, required: true } })

const num = (v) => Number(v) || 0

function pickMandatos(tipo) {
  const m = props.liq?.mandatos || []
  const total = m.filter(x => x.tipo === tipo && x.inversionista_id == null && !x.inversionista)
  if (total.length) return total
  return m.filter(x => x.tipo === tipo && (x.inversionista || x.inversionista_id != null))
}
const ingresosMandatos = computed(() => pickMandatos('ingresos'))
const costosMandatos = computed(() => pickMandatos('costos'))

const bruto = computed(() => {
  let s = 0
  for (const m of ingresosMandatos.value) for (const l of (m.lineas || [])) {
    if (TIPOS_INGRESO_BRUTO.has(normTipo(l.tipo_linea))) s += num(l.valor_cop)
  }
  return s
})

const valorAPagar = computed(() => {
  const m = ingresosMandatos.value
  const conNeto = m.filter(x => x.valor_neto_cop != null)
  if (conNeto.length) return conNeto.reduce((s, x) => s + num(x.valor_neto_cop), 0)
  return bruto.value
})

const costosOperativos = computed(() => {
  const m = costosMandatos.value
  const conNeto = m.filter(x => x.valor_neto_cop != null)
  if (conNeto.length) return conNeto.reduce((s, x) => s + num(x.valor_neto_cop), 0)
  if (m.length) return m.reduce((s, x) => s + (x.lineas || []).reduce((a, l) => a + num(l.valor_cop), 0), 0)
  return (props.liq?.costos || []).reduce((s, c) => s + num(c.valor_cop), 0)
})

const facturasTotal = computed(() => (props.liq?.facturas || []).reduce((s, f) => s + num(f.valor_cop), 0))
const neto = computed(() => valorAPagar.value - costosOperativos.value - facturasTotal.value)
const costosTotales = computed(() => Math.max(0, bruto.value - neto.value))
const margen = computed(() => (bruto.value ? (neto.value / bruto.value * 100) : null))
const hayDatos = computed(() => bruto.value !== 0 || valorAPagar.value !== 0 || neto.value !== 0)

// ── Construcción del waterfall ────────────────────────────────────────────────
const pasos = computed(() => {
  const out = []
  if (bruto.value > 0) {
    out.push({ label: 'Ingreso bruto', delta: bruto.value, dir: 'up' })
    const comer = valorAPagar.value - bruto.value   // negativo: comercialización / bolsa / ajustes
    if (Math.round(comer) !== 0) out.push({ label: 'Comercialización / Bolsa', delta: comer, dir: 'down' })
  } else {
    out.push({ label: 'Valor a pagar', delta: valorAPagar.value, dir: 'up' })
  }
  if (Math.round(costosOperativos.value) !== 0) out.push({ label: 'Costos operativos', delta: -costosOperativos.value, dir: 'down' })
  if (Math.round(facturasTotal.value) !== 0) out.push({ label: 'Facturas servicio', delta: -facturasTotal.value, dir: 'down' })
  out.push({ label: 'Ingreso neto', total: true })
  return out
})

const VERDE = '#10B981', ROJO = '#D64455', MORADO = '#915BD8'

const chartData = computed(() => {
  const labels = [], base = [], visible = [], colores = [], signed = []
  let running = 0
  for (const p of pasos.value) {
    labels.push(p.label)
    if (p.total) {
      base.push(0); visible.push(neto.value); colores.push(MORADO); signed.push(neto.value)
    } else {
      const prev = running
      running += p.delta
      base.push(Math.min(prev, running))
      visible.push(Math.abs(p.delta))
      colores.push(p.delta >= 0 ? VERDE : ROJO)
      signed.push(p.delta)
    }
  }
  return {
    labels,
    datasets: [
      { label: 'base', data: base, backgroundColor: 'transparent', stack: 'w', grouped: true },
      { label: 'valor', data: visible, backgroundColor: colores, stack: 'w', borderRadius: 3, maxBarThickness: 60, _signed: signed },
    ],
  }
})

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      filter: (item) => item.datasetIndex === 1,
      callbacks: {
        label: (c) => {
          const s = c.dataset._signed?.[c.dataIndex]
          return `${s < 0 ? '−' : ''}${fmtCOP(Math.abs(s))}`
        },
      },
    },
  },
  scales: {
    x: { stacked: true, ticks: { font: { size: 10 }, color: '#6b5a8a', maxRotation: 0, autoSkip: false }, grid: { display: false } },
    y: { stacked: true, ticks: { font: { size: 9 }, color: '#9ca3af', callback: (v) => fmtCompact(v) }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
}
</script>
