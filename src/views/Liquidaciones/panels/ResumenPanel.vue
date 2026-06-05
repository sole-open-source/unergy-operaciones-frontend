<template>
  <div class="p-4 sm:p-5 space-y-4">

    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <template v-else>
      <!-- ── KPIs del período ─────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div v-for="kpi in kpis" :key="kpi.label"
          class="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border"
          style="border-color:#e8e0f0">
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-wide font-semibold truncate" style="color:#6b5a8a">{{ kpi.label }}</p>
            <p class="text-xl font-bold mt-1 truncate" style="color:#2C2039">{{ kpi.value }}</p>
            <p v-if="kpi.sub" class="text-[11px] mt-0.5" :style="{ color: kpi.subColor || '#915BD8' }">{{ kpi.sub }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :style="{ backgroundColor: kpi.bg }">
            <i :class="[kpi.icon, 'text-lg']" :style="{ color: kpi.color }" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- ── Por tipo de proyecto ───────────────────────────────── -->
        <div class="bg-white rounded-xl shadow-sm p-4 border" style="border-color:#e8e0f0">
          <h3 class="text-sm font-bold mb-3" style="color:#2C2039">Ingresos por tipo de proyecto</h3>
          <div v-if="porTipo.length" class="space-y-2.5">
            <div v-for="t in porTipo" :key="t.tipo">
              <div class="flex justify-between text-xs mb-1" style="color:#2C2039">
                <span class="capitalize font-medium">{{ t.tipo }}</span>
                <span class="font-mono" style="color:#6b5a8a">{{ fmtCompact(t.ingresos) }} · {{ t.count }} liq.</span>
              </div>
              <div class="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full" :style="{ width: barPct(t.ingresos) + '%', background:'#915BD8' }" />
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 py-4 text-center">Sin liquidaciones en el período.</p>
        </div>

        <!-- ── Pipeline de estados ────────────────────────────────── -->
        <div class="bg-white rounded-xl shadow-sm p-4 border" style="border-color:#e8e0f0">
          <h3 class="text-sm font-bold mb-3" style="color:#2C2039">Pipeline del período</h3>
          <div v-if="totalMes" class="space-y-1.5">
            <div class="flex h-3 rounded-full overflow-hidden bg-gray-100">
              <div v-for="s in pipeline" :key="s.estado" class="h-full"
                :style="{ width: (s.count / totalMes * 100) + '%', background: s.color }"
                v-tooltip.top="`${estadoLabel(s.estado)}: ${s.count}`" />
            </div>
            <div class="flex flex-wrap gap-x-4 gap-y-1 pt-2">
              <button v-for="s in pipeline" :key="s.estado"
                class="flex items-center gap-1.5 text-[11px] hover:opacity-70 transition-opacity"
                @click="$emit('go-proyectos', { estado: s.estado })">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: s.color }" />
                <span style="color:#2C2039">{{ estadoLabel(s.estado) }}</span>
                <span class="font-mono font-semibold" style="color:#6b5a8a">{{ s.count }}</span>
              </button>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 py-4 text-center">Sin liquidaciones en el período.</p>
        </div>
      </div>

      <!-- ── Tendencia ───────────────────────────────────────────── -->
      <div class="bg-white rounded-xl shadow-sm p-4 border" style="border-color:#e8e0f0">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold" style="color:#2C2039">Tendencia (últimos 12 meses)</h3>
          <span class="text-[11px]" style="color:#9b8fb0">Ingresos · Costos · Neto</span>
        </div>
        <div style="height: 240px">
          <Line v-if="tieneTendencia" :data="trendData" :options="trendOptions" />
          <p v-else class="text-xs text-gray-400 py-8 text-center">Sin datos históricos suficientes.</p>
        </div>
      </div>

      <!-- ── Proyectos del mes ──────────────────────────────────────── -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
        <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
          <h3 class="text-sm font-bold" style="color:#2C2039">Liquidaciones de {{ formatPeriodo(periodo) }}</h3>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:#F1EAF9; color:#6E3FB8">{{ liqsMes.length }}</span>
          <span v-if="proyectosSinLiquidacion > 0"
            class="ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:#FEF3C7; color:#92400e">{{ proyectosSinLiquidacion }} en operación sin liquidar</span>
        </div>
        <DataTable :value="liqsMes" rowHover class="text-sm" :rows="10" paginator
          :alwaysShowPaginator="false" @row-click="(e) => goDetalle(e.data.liquidacion_id)" selectionMode="single">
          <template #empty>
            <div class="text-center py-6 text-xs text-gray-400">No hay liquidaciones en este período.</div>
          </template>
          <Column field="proyecto_nombre" header="Proyecto" sortable />
          <Column header="Tipo"><template #body="{ data }"><span class="capitalize text-xs">{{ data.tipo_proyecto || '—' }}</span></template></Column>
          <Column header="Estado"><template #body="{ data }"><Tag :value="estadoLabel(data.estado)" :severity="estadoSeverity(data.estado)" class="text-[10px]" /></template></Column>
          <Column header="Ingresos" style="width:130px">
            <template #body="{ data }"><span class="font-mono text-xs">{{ fmtCompact(data._ingresos) }}</span></template>
          </Column>
          <Column header="Costos" style="width:120px">
            <template #body="{ data }"><span class="font-mono text-xs text-red-600">{{ fmtCompact(data._costos) }}</span></template>
          </Column>
          <Column header="Neto" style="width:130px">
            <template #body="{ data }"><span class="font-mono text-xs font-semibold" style="color:#915BD8">{{ fmtCompact(data._neto) }}</span></template>
          </Column>
          <Column header="" style="width:48px">
            <template #body="{ data }">
              <Button icon="pi pi-eye" text rounded size="small" @click.stop="goDetalle(data.liquidacion_id)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import api from '@/api/client'
import { fmtCompact, formatPeriodo, estadoSeverity, estadoLabel, netoFromVista, valorAPagarFromVista, costosFromVista } from '@/utils/liquidaciones'
import { ESTADOS_LIQUIDACION, ESTADO_COLOR } from '@/constants/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({ periodo: { type: String, required: true } })
defineEmits(['go-proyectos'])
const router = useRouter()

const loading = ref(false)
const vistaProyectos = ref([])           // GET /vistas/por-proyecto (ventana 12 meses)
const proyectosSinLiquidacion = ref(0)   // GET /resumen (mes actual)

// Ventana de 12 meses terminando en `periodo`
const ventana = computed(() => {
  const [y, m] = props.periodo.split('-').map(Number)
  const fin = new Date(y, m - 1, 1)
  const ini = new Date(y, m - 12, 1)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  return { desde: iso(ini), hasta: iso(fin) }
})

// Lista plana de todas las liquidaciones de la ventana, con tipo de proyecto y montos calculados
const liqsVentana = computed(() => {
  const out = []
  for (const p of vistaProyectos.value) {
    for (const liq of (p.liquidaciones || [])) {
      out.push({
        ...liq,
        proyecto_id: p.proyecto_id,
        proyecto_nombre: p.proyecto_nombre,
        tipo_proyecto: p.tipo_proyecto,
        _ingresos: valorAPagarFromVista(liq),
        _costos: costosFromVista(liq),
        _neto: netoFromVista(liq),
      })
    }
  }
  return out
})

const liqsMes = computed(() => liqsVentana.value.filter(l => l.periodo === props.periodo))
const liqsMesPrev = computed(() => {
  const [y, m] = props.periodo.split('-').map(Number)
  const prev = new Date(y, m - 2, 1)
  const iso = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`
  return liqsVentana.value.filter(l => l.periodo === iso)
})

const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0)

const totalMes = computed(() => liqsMes.value.length)

const kpis = computed(() => {
  const ing = sum(liqsMes.value, '_ingresos')
  const cos = sum(liqsMes.value, '_costos')
  const net = sum(liqsMes.value, '_neto')
  const margen = ing ? (net / ing * 100) : 0
  const ingPrev = sum(liqsMesPrev.value, '_ingresos')
  const cosPrev = sum(liqsMesPrev.value, '_costos')
  const delta = (cur, prev) => {
    if (!prev) return null
    const d = (cur - prev) / Math.abs(prev) * 100
    return `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}% vs mes ant.`
  }
  const tint = (hex) => hex + '1a'
  return [
    { label: 'Ingresos', value: fmtCompact(ing), sub: delta(ing, ingPrev), subColor: ing >= ingPrev ? '#10B981' : '#D64455', icon: 'pi pi-arrow-up-right', color: '#10B981', bg: tint('#10B981') },
    { label: 'Costos', value: fmtCompact(cos), sub: delta(cos, cosPrev), subColor: cos <= cosPrev ? '#10B981' : '#D64455', icon: 'pi pi-arrow-down-left', color: '#D64455', bg: tint('#D64455') },
    { label: 'Ingreso neto', value: fmtCompact(net), icon: 'pi pi-wallet', color: '#915BD8', bg: tint('#915BD8') },
    { label: 'Margen', value: `${margen.toFixed(0)}%`, icon: 'pi pi-percentage', color: '#6E3FB8', bg: tint('#6E3FB8') },
    { label: 'Liquidados', value: String(totalMes.value), icon: 'pi pi-check-circle', color: '#3B82F6', bg: tint('#3B82F6') },
    { label: 'Sin liquidar', value: String(proyectosSinLiquidacion.value), sub: 'proyectos en operación', subColor: '#92400e', icon: 'pi pi-exclamation-triangle', color: '#CA8A04', bg: tint('#CA8A04') },
  ]
})

const porTipo = computed(() => {
  const map = {}
  for (const l of liqsMes.value) {
    const t = l.tipo_proyecto || 'sin tipo'
    if (!map[t]) map[t] = { tipo: t, ingresos: 0, count: 0 }
    map[t].ingresos += l._ingresos
    map[t].count += 1
  }
  return Object.values(map).sort((a, b) => b.ingresos - a.ingresos)
})
const maxTipoIngreso = computed(() => Math.max(1, ...porTipo.value.map(t => t.ingresos)))
const barPct = (v) => Math.round(v / maxTipoIngreso.value * 100)

const pipeline = computed(() => {
  const counts = {}
  for (const l of liqsMes.value) counts[l.estado] = (counts[l.estado] || 0) + 1
  return ESTADOS_LIQUIDACION
    .filter(e => counts[e])
    .map(e => ({ estado: e, count: counts[e], color: ESTADO_COLOR[e] || '#9b8fb0' }))
})

// ── Tendencia ────────────────────────────────────────────────────────────────
const mesesVentana = computed(() => {
  const [y, m] = props.periodo.split('-').map(Number)
  const out = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }
  return out
})
const tieneTendencia = computed(() => liqsVentana.value.length > 0)
const trendData = computed(() => {
  const byMes = {}
  for (const p of mesesVentana.value) byMes[p] = { ing: 0, cos: 0, net: 0 }
  for (const l of liqsVentana.value) {
    if (byMes[l.periodo]) {
      byMes[l.periodo].ing += l._ingresos
      byMes[l.periodo].cos += l._costos
      byMes[l.periodo].net += l._neto
    }
  }
  return {
    labels: mesesVentana.value.map(formatPeriodo),
    datasets: [
      { label: 'Ingresos', data: mesesVentana.value.map(p => byMes[p].ing), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', tension: 0.3, fill: true },
      { label: 'Costos', data: mesesVentana.value.map(p => byMes[p].cos), borderColor: '#D64455', backgroundColor: 'rgba(214,68,85,0.06)', tension: 0.3, fill: false },
      { label: 'Neto', data: mesesVentana.value.map(p => byMes[p].net), borderColor: '#915BD8', backgroundColor: 'rgba(145,91,216,0.10)', tension: 0.3, fill: true },
    ],
  }
})
const trendOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: true, labels: { font: { size: 11 }, color: '#6b5a8a', boxWidth: 12 } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtCompact(c.parsed.y)}` } },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, color: '#9ca3af', maxTicksLimit: 12 }, grid: { display: false } },
    y: { ticks: { font: { size: 10 }, color: '#9ca3af', callback: (v) => fmtCompact(v) }, grid: { color: 'rgba(0,0,0,0.05)' } },
  },
}

// ── Carga ─────────────────────────────────────────────────────────────────────
function goDetalle(id) { router.push(`/liquidaciones/${id}`) }

async function load() {
  loading.value = true
  try {
    const [y, m] = props.periodo.split('-').map(Number)
    const [vista, resumen] = await Promise.allSettled([
      api.get('/liquidaciones/vistas/por-proyecto', { params: { periodo_desde: ventana.value.desde, periodo_hasta: ventana.value.hasta } }),
      api.get('/liquidaciones/resumen', { params: { year: y, month: m } }),
    ])
    vistaProyectos.value = vista.status === 'fulfilled' ? (vista.value.data || []) : []
    proyectosSinLiquidacion.value = resumen.status === 'fulfilled' ? Math.max(0, resumen.value.data?.proyectos_sin_liquidacion ?? 0) : 0
  } finally {
    loading.value = false
  }
}

watch(() => props.periodo, load)
onMounted(load)
</script>
