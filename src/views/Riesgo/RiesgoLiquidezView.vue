<template>
  <div class="space-y-5">
    <PageHeader title="Riesgo Vivo"
                subtitle="Cobertura de garantías frente a la exposición ante XM del período">
      <template #lead>
        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background: rgba(214,68,85,0.12);">
          <i class="pi pi-chart-line text-lg" style="color: #D64455;" />
        </div>
      </template>
      <template #actions>
        <div class="flex items-center gap-2">
          <button class="rl-period-btn" @click="stepMes(-1)" v-tooltip.bottom="'Mes anterior'">
            <i class="pi pi-chevron-left text-xs" />
          </button>
          <span class="text-sm font-bold min-w-20 text-center" style="color: #2C2039;">{{ formatPeriodo(periodo) }}</span>
          <button class="rl-period-btn" :disabled="esMesActual" @click="stepMes(1)" v-tooltip.bottom="'Mes siguiente'">
            <i class="pi pi-chevron-right text-xs" />
          </button>
          <Button icon="pi pi-refresh" text rounded size="small" :loading="loading"
                  v-tooltip.bottom="'Recargar'" @click="cargar(periodo)" />
        </div>
      </template>
    </PageHeader>

    <div v-if="error" class="rounded-xl p-4 text-sm" style="background:#FEF2F2; border:1px solid rgba(214,68,85,0.3); color:#D64455;">
      <i class="pi pi-exclamation-triangle mr-2" />{{ error }}
    </div>

    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <template v-else>
      <!-- Tarjetas de resumen -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Total garantizado</p>
          <p class="text-2xl font-bold mt-1" style="color: #2C2039;">{{ formatCurrencyCompact(totales.total_garantizado_cop) }}</p>
          <p class="text-xs mt-0.5" style="color: #915BD8;">Saldo efectivo vigente</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Total expuesto</p>
          <p class="text-2xl font-bold mt-1" style="color: #2C2039;">{{ formatCurrencyCompact(totales.total_expuesto_cop) }}</p>
          <p class="text-xs mt-0.5" style="color: #6b5a8a;">Comercialización + bolsa</p>
        </div>
        <div class="rounded-xl shadow-sm p-4" :style="coberturaCardStyle">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Cobertura global</p>
          <p class="text-2xl font-bold mt-1" :style="{ color: coberturaColor }">{{ pctText(totales.cobertura_global_pct) }}</p>
          <p class="text-xs mt-0.5" :style="{ color: coberturaColor }">
            {{ totales.cobertura_global_pct == null ? 'Sin exposición en el período' : NIVEL_LABEL[nivelGlobal] }}
          </p>
        </div>
        <div class="rounded-xl shadow-sm p-4" :style="totales.criticos > 0
          ? 'background: #FEF2F2; border: 2px solid rgba(214,68,85,0.3);'
          : 'background: white; border: 1px solid #e8e0f0;'">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Proyectos críticos</p>
          <p class="text-2xl font-bold mt-1" :style="{ color: totales.criticos > 0 ? '#D64455' : '#10B981' }">
            {{ totales.criticos }}
          </p>
          <p class="text-xs mt-0.5" :style="{ color: totales.por_vencer > 0 ? '#CA8A04' : '#6b5a8a' }">
            {{ totales.por_vencer }} garantía(s) por vencer
          </p>
        </div>
      </div>

      <!-- Gráfico comparativo Garantía vs Exposición -->
      <div class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold" style="color: #2C2039;">Garantía vs. Exposición por proyecto</h3>
          <span class="text-[11px]" style="color: #9b8fb0;">
            {{ conExposicion.length }} proyecto(s) con exposición en {{ formatPeriodo(periodo) }}
          </span>
        </div>
        <div v-if="conExposicion.length" style="height: 320px;">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
        <p v-else class="text-center py-10 text-sm" style="color: #9b8fb0;">
          Sin exposición ante XM en este período.
        </p>
      </div>

      <!-- Filtros por estado de alerta -->
      <div class="flex flex-wrap gap-2 items-center">
        <button v-for="f in FILTROS" :key="f.value" @click="filtro = f.value"
          class="px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors"
          :style="filtro === f.value
            ? { backgroundColor: f.color, color: 'white' }
            : { color: '#6b5a8a', border: '1px solid #e8e0f0', background: 'white' }">
          {{ f.label }}
          <span class="ml-1 opacity-80">{{ contarPorFiltro(f.value) }}</span>
        </button>
      </div>

      <!-- Tabla detallada -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <DataTable :value="proyectosFiltrados" class="text-sm" stripedRows
                   :paginator="proyectosFiltrados.length > 15" :rows="15">
          <template #empty>
            <div class="text-center py-12" style="color: #6b5a8a;">
              <i class="pi pi-check-circle text-3xl mb-2 block" style="color: #10B981;" />
              Sin proyectos en este estado
            </div>
          </template>

          <Column field="proyecto_nombre" header="Proyecto" sortable style="min-width: 190px">
            <template #body="{ data: p }">
              <span class="font-semibold" style="color: #2C2039;">{{ p.proyecto_nombre }}</span>
              <p v-if="p.sin_garantia && p.exposicion_cop > 0" class="text-[11px] font-semibold" style="color: #D64455;">
                Sin garantía vigente
              </p>
            </template>
          </Column>

          <Column field="saldo_efectivo_cop" header="Valor garantía" sortable style="min-width: 140px">
            <template #body="{ data: p }">
              <span class="font-semibold tabular-nums" style="color: #2C2039;">{{ formatCurrency(p.saldo_efectivo_cop) }}</span>
              <p v-if="p.valor_garantias_cop > p.saldo_efectivo_cop" class="text-[10px]" style="color: #9b8fb0;"
                 v-tooltip.bottom="'Incluye garantías vencidas o liberadas que ya no respaldan'">
                nominal {{ formatCurrencyCompact(p.valor_garantias_cop) }}
              </p>
            </template>
          </Column>

          <Column field="dias_para_vencimiento" header="Vencimiento" sortable style="min-width: 150px">
            <template #body="{ data: p }">
              <template v-if="p.fecha_vencimiento">
                <span :style="{ color: p.vencimiento_proximo ? '#D64455' : '#2C2039' }">
                  {{ formatFechaVencimiento(p.fecha_vencimiento) }}
                </span>
                <Tag v-if="p.vencimiento_proximo" class="ml-1.5"
                     :severity="p.dias_para_vencimiento <= 7 ? 'danger' : 'warn'"
                     :value="`${p.dias_para_vencimiento}d`" />
              </template>
              <span v-else style="color: #6b5a8a;">—</span>
            </template>
          </Column>

          <Column field="exposicion_cop" header="Exposición XM" sortable style="min-width: 140px">
            <template #body="{ data: p }">
              <span class="font-semibold tabular-nums" style="color: #2C2039;">{{ formatCurrency(p.exposicion_cop) }}</span>
              <p v-if="p.deficit_cop > 0" class="text-[10px] font-semibold" style="color: #D64455;">
                déficit {{ formatCurrencyCompact(p.deficit_cop) }}
              </p>
            </template>
          </Column>

          <Column field="cobertura_pct" header="% Cobertura" sortable style="min-width: 170px">
            <template #body="{ data: p }">
              <div v-if="p.cobertura_pct != null" class="flex items-center gap-2">
                <div class="flex-1 h-2 rounded-full overflow-hidden" style="background: #f0ebf6; min-width: 60px;">
                  <div class="h-full rounded-full transition-all"
                       :style="{ width: barraAncho(p.cobertura_pct), background: NIVEL_COLOR[p.nivel] }" />
                </div>
                <span class="text-xs font-bold tabular-nums w-12 text-right" :style="{ color: NIVEL_COLOR[p.nivel] }">
                  {{ pctText(p.cobertura_pct) }}
                </span>
              </div>
              <span v-else class="text-xs" style="color: #9b8fb0;" v-tooltip.bottom="'Sin exposición ante XM en el período'">n/a</span>
            </template>
          </Column>

          <Column field="nivel" header="Estado" sortable style="min-width: 120px; text-align: center;">
            <template #body="{ data: p }">
              <Tag :value="NIVEL_LABEL[p.nivel]" :severity="nivelSeverity(p.nivel)" />
            </template>
          </Column>

          <Column style="width: 60px; text-align: center;">
            <template #body="{ data: p }">
              <Button icon="pi pi-eye" text rounded size="small"
                      v-tooltip.left="'Ver detalle de riesgo'" @click="abrirDetalle(p)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <RiesgoDetalleDialog v-model:visible="showDetalle" :riesgo="seleccionado" :periodo="periodo" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import RiesgoDetalleDialog from './RiesgoDetalleDialog.vue'
import { useRiesgoVivo } from '@/composables/useRiesgoVivo'
import { NIVEL, NIVEL_COLOR, NIVEL_LABEL, nivelSeverity, nivelPorCobertura } from '@/utils/riskEngine'
import { formatCurrency, formatCurrencyCompact, formatFechaVencimiento } from '@/utils/financialCalculations'
import { formatPeriodo, mesActualISO } from '@/utils/liquidaciones'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const route = useRoute()
const { periodo, loading, error, proyectos, totales, cargar } = useRiesgoVivo()

// ── Filtros por estado de alerta ─────────────────────────────────────────────
const FILTROS = [
  { value: 'todos', label: 'Todos', color: '#915BD8' },
  { value: NIVEL.CRITICO, label: 'Críticos', color: NIVEL_COLOR.CRITICO },
  { value: NIVEL.ADVERTENCIA, label: 'Advertencia', color: NIVEL_COLOR.ADVERTENCIA },
  { value: 'por_vencer', label: 'Por vencer', color: '#CA8A04' },
]
const filtro = ref('todos')

function cumpleFiltro(p, f) {
  if (f === 'todos') return true
  if (f === 'por_vencer') return p.vencimiento_proximo
  return p.nivel === f
}
const contarPorFiltro = (f) => proyectos.value.filter(p => cumpleFiltro(p, f)).length
const proyectosFiltrados = computed(() => proyectos.value.filter(p => cumpleFiltro(p, filtro.value)))

// ── Resumen ──────────────────────────────────────────────────────────────────
const nivelGlobal = computed(() => nivelPorCobertura(totales.value.cobertura_global_pct))
const coberturaColor = computed(() => NIVEL_COLOR[nivelGlobal.value])
const coberturaCardStyle = computed(() => nivelGlobal.value === NIVEL.SALUDABLE
  ? 'background: white; border: 1px solid #e8e0f0;'
  : `background: ${nivelGlobal.value === NIVEL.CRITICO ? '#FEF2F2' : '#FFFBEB'}; border: 2px solid ${coberturaColor.value}4D;`)

function pctText(v) {
  if (v == null) return 'n/a'
  return `${v.toFixed(0)} %`
}

// La barra se satura al 100 %: pasado ese punto ya está cubierto y lo único que
// importa visualmente es el faltante.
function barraAncho(pct) {
  return `${Math.max(0, Math.min(100, pct))}%`
}

// ── Gráfico ──────────────────────────────────────────────────────────────────
// Solo proyectos con exposición: los demás no tienen nada que comparar y
// llenarían el eje de barras vacías.
const conExposicion = computed(() => proyectos.value.filter(p => p.exposicion_cop > 0))

const chartData = computed(() => ({
  labels: conExposicion.value.map(p => p.proyecto_nombre),
  datasets: [
    {
      label: 'Garantía (saldo efectivo)',
      data: conExposicion.value.map(p => p.saldo_efectivo_cop),
      backgroundColor: '#915BD8',
      borderRadius: 4,
    },
    {
      label: 'Exposición XM',
      data: conExposicion.value.map(p => p.exposicion_cop),
      // La barra de exposición toma el color del nivel: en rojo se lee de un
      // vistazo cuál proyecto está descubierto.
      backgroundColor: conExposicion.value.map(p => NIVEL_COLOR[p.nivel]),
      borderRadius: 4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 }, grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { font: { size: 10 }, callback: (v) => formatCurrencyCompact(v) },
      grid: { color: '#f0ebf6' },
    },
  },
}

// ── Detalle ──────────────────────────────────────────────────────────────────
const showDetalle = ref(false)
const seleccionado = ref(null)
function abrirDetalle(p) {
  seleccionado.value = p
  showDetalle.value = true
}

// ── Período ──────────────────────────────────────────────────────────────────
const esMesActual = computed(() => periodo.value === mesActualISO())
function stepMes(delta) {
  const [y, m] = periodo.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  if (delta > 0 && next > mesActualISO()) return
  cargar(next)
}

// Enlace directo desde el Centro de Alertas: /riesgo?proyecto_id=12 abre su detalle.
function abrirDesdeQuery() {
  const pid = Number(route.query.proyecto_id)
  if (!pid) return
  const p = proyectos.value.find(x => x.proyecto_id === pid)
  if (p) abrirDetalle(p)
}
watch(proyectos, abrirDesdeQuery)

onMounted(() => cargar(periodo.value))
</script>

<style scoped>
.rl-period-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px;
  border: 1px solid #E5E2EC; background: #fff; color: #6E3FB8; cursor: pointer;
  transition: all .15s;
}
.rl-period-btn:hover:not(:disabled) { background: #F4F1FA; }
.rl-period-btn:disabled { opacity: .4; cursor: not-allowed; }
</style>
