<template>
  <div class="p-6 space-y-6 min-h-screen" style="background: #FDFAF7; color: #2C2039;">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold" style="color: #2C2039;">Cumplimiento v2</h1>
      <p class="text-sm mt-0.5" style="color: #7a6e8a;">Vista anual de cumplimiento contractual</p>
    </div>

    <!-- Selectors -->
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
        <Select v-model="selectedYear" :options="years" class="w-24" @change="onYearChange" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Contrato</label>
        <Select
          v-model="selectedContratoId"
          :options="contratos"
          optionLabel="label"
          optionValue="id"
          placeholder="Seleccionar contrato"
          class="w-72"
          @change="loadAnnualData"
        />
      </div>
    </div>

    <!-- Chart loading -->
    <div v-if="chartLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
      <p class="text-sm" style="color: #7a6e8a;">Consultando generación para 12 meses…</p>
    </div>

    <!-- Chart error -->
    <Message v-else-if="chartError" severity="error" :closable="false">{{ chartError }}</Message>

    <!-- Chart -->
    <template v-else-if="anualData">

      <!-- Contract subheader -->
      <div class="flex items-center gap-2 text-sm flex-wrap" style="color: #7a6e8a;">
        <span class="font-semibold text-base" style="color: #2C2039;">
          {{ anualData.contrato.nombre_interno || anualData.contrato.numero_codigo_contrato }}
        </span>
        <span>·</span>
        <span>{{ anualData.contrato.comprador_nombre }}</span>
        <span>·</span>
        <span>{{ anualData.year }}</span>
      </div>

      <!-- Chart card -->
      <div class="rounded-xl border p-4" style="background: white; border-color: rgba(44,32,57,0.12);">
        <div ref="chartBox" class="relative select-none" style="width: 100%; height: 360px;">

          <svg
            :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
            preserveAspectRatio="xMidYMid meet"
            style="width: 100%; height: 100%;"
            @mousemove="onSvgMousemove"
            @mouseleave="hovered = null"
          >
            <!-- Y-axis grid + labels -->
            <g v-for="gl in yGridLines" :key="gl.val">
              <line
                :x1="PAD_L" :y1="gl.y"
                :x2="SVG_W - PAD_R" :y2="gl.y"
                stroke="rgba(44,32,57,0.07)" stroke-width="1"
              />
              <text :x="PAD_L - 7" :y="gl.y + 4"
                text-anchor="end" font-size="10" fill="#7a6e8a">
                {{ fmtShort(gl.val) }}
              </text>
            </g>

            <!-- Per-month groups -->
            <g v-for="(mes, i) in anualData.meses" :key="i">

              <!-- Current month column highlight -->
              <rect
                v-if="isCurrentMonth(mes)"
                :x="slotX(i)" y="0"
                :width="slotW" :height="SVG_H - PAD_B + 2"
                fill="rgba(145,91,216,0.04)"
              />

              <!-- Compliance band (green: min → max) -->
              <rect
                v-if="mes.min_mwh !== null && mes.max_mwh !== null"
                :x="slotX(i)"
                :y="toY(mes.max_mwh)"
                :width="slotW"
                :height="toY(mes.min_mwh) - toY(mes.max_mwh)"
                fill="rgba(46,125,50,0.10)"
                stroke="none"
              />

              <!-- Generation bar -->
              <rect
                v-if="genVal(mes) > 0"
                :x="barX(i)"
                :y="toY(genVal(mes))"
                :width="barW"
                :height="toY(0) - toY(genVal(mes))"
                fill="#915BD8"
                :opacity="mes.tipo_datos === 'proyeccion_historica' ? 0.55 : 1"
              />

              <!-- Dashed border for future months -->
              <rect
                v-if="genVal(mes) > 0 && mes.tipo_datos === 'proyeccion_historica'"
                :x="barX(i)"
                :y="toY(genVal(mes))"
                :width="barW"
                :height="toY(0) - toY(genVal(mes))"
                fill="none"
                stroke="#915BD8"
                stroke-width="1"
                stroke-dasharray="3,2"
              />

              <!-- Deficit gap (red — from gen top to min line) -->
              <rect
                v-if="mes.estado === 'deficit' && mes.min_mwh !== null && genVal(mes) > 0 && genVal(mes) < mes.min_mwh"
                :x="barX(i)"
                :y="toY(mes.min_mwh)"
                :width="barW"
                :height="toY(genVal(mes)) - toY(mes.min_mwh)"
                fill="rgba(214,68,85,0.32)"
              />

              <!-- Excess zone (amber — bar portion above max) -->
              <rect
                v-if="mes.estado === 'excedente' && mes.max_mwh !== null && genVal(mes) > mes.max_mwh"
                :x="barX(i)"
                :y="toY(genVal(mes))"
                :width="barW"
                :height="toY(mes.max_mwh) - toY(genVal(mes))"
                fill="rgba(240,192,64,0.55)"
              />

              <!-- Min line segment -->
              <line
                v-if="mes.min_mwh !== null"
                :x1="slotX(i)" :y1="toY(mes.min_mwh)"
                :x2="slotX(i) + slotW" :y2="toY(mes.min_mwh)"
                stroke="rgba(214,68,85,0.50)" stroke-width="1"
              />
              <!-- Max line segment -->
              <line
                v-if="mes.max_mwh !== null"
                :x1="slotX(i)" :y1="toY(mes.max_mwh)"
                :x2="slotX(i) + slotW" :y2="toY(mes.max_mwh)"
                stroke="rgba(145,91,216,0.50)" stroke-width="1"
              />

              <!-- Hover highlight -->
              <rect
                v-if="hovered === i"
                :x="slotX(i)" :y="PAD_T"
                :width="slotW" :height="PLOT_H"
                fill="rgba(145,91,216,0.07)"
              />

              <!-- Month label -->
              <text
                :x="barX(i) + barW / 2" :y="SVG_H - PAD_B + 17"
                text-anchor="middle" font-size="11"
                :fill="isCurrentMonth(mes) ? '#2C2039' : '#7a6e8a'"
                :font-weight="isCurrentMonth(mes) ? '700' : '400'"
              >{{ MESES_CORTOS[i] }}</text>

              <!-- Hover area (transparent) -->
              <rect
                :x="slotX(i)" :y="PAD_T"
                :width="slotW" :height="PLOT_H"
                fill="transparent" style="cursor: pointer;"
              />
            </g>

            <!-- Axes -->
            <line :x1="PAD_L" :y1="PAD_T" :x2="PAD_L" :y2="PAD_T + PLOT_H"
              stroke="rgba(44,32,57,0.18)" stroke-width="1" />
            <line :x1="PAD_L" :y1="PAD_T + PLOT_H" :x2="SVG_W - PAD_R" :y2="PAD_T + PLOT_H"
              stroke="rgba(44,32,57,0.18)" stroke-width="1" />
          </svg>

          <!-- Tooltip -->
          <div
            v-if="hovered !== null && anualData.meses[hovered]"
            class="absolute pointer-events-none z-10 rounded-xl shadow-lg text-sm"
            style="background: #2C2039; color: #FDFAF7; padding: 10px 14px; min-width: 200px;"
            :style="{ left: tooltipX + 'px', top: tooltipY + 'px', transform: 'translateY(-100%) translateX(0)' }"
          >
            <div class="font-bold mb-2" style="color: #F0C040;">
              {{ MESES[hovered] }} {{ selectedYear }}
              <span
                v-if="anualData.meses[hovered].tipo_datos !== 'real'"
                class="ml-1 text-xs font-normal"
                style="color: rgba(253,250,247,0.55);"
              >proyección</span>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between gap-6">
                <span style="color: rgba(253,250,247,0.65);">Generación</span>
                <span class="font-mono font-semibold">{{ fmtMwh(genVal(anualData.meses[hovered])) }}</span>
              </div>
              <div v-if="anualData.meses[hovered].min_mwh !== null" class="flex justify-between gap-6">
                <span style="color: rgba(253,250,247,0.65);">Mínimo</span>
                <span class="font-mono">{{ fmtMwh(anualData.meses[hovered].min_mwh) }}</span>
              </div>
              <div v-if="anualData.meses[hovered].max_mwh !== null" class="flex justify-between gap-6">
                <span style="color: rgba(253,250,247,0.65);">Máximo</span>
                <span class="font-mono">{{ fmtMwh(anualData.meses[hovered].max_mwh) }}</span>
              </div>
              <div
                v-if="anualData.meses[hovered].estado === 'deficit'"
                class="flex justify-between gap-6 mt-2 pt-2"
                style="border-top: 1px solid rgba(255,255,255,0.1);"
              >
                <span style="color: #D64455;">Déficit</span>
                <span class="font-mono font-bold" style="color: #D64455;">
                  {{ fmtMwh(anualData.meses[hovered].compras_bolsa_mwh) }}
                </span>
              </div>
              <div
                v-if="anualData.meses[hovered].estado === 'excedente'"
                class="flex justify-between gap-6 mt-2 pt-2"
                style="border-top: 1px solid rgba(255,255,255,0.1);"
              >
                <span style="color: #F0C040;">Excedente</span>
                <span class="font-mono font-bold" style="color: #F0C040;">
                  {{ fmtMwh(anualData.meses[hovered].excedentes_bolsa_mwh) }}
                </span>
              </div>
            </div>
            <div class="mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.1);">
              <span :class="['text-xs font-bold px-2 py-0.5 rounded-full', estadoBadge(anualData.meses[hovered].estado)]">
                {{ estadoLabel(anualData.meses[hovered].estado) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap gap-5 mt-3 pl-1">
          <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;">
            <div class="w-4 h-4 rounded-sm" style="background: rgba(46,125,50,0.18); border: 1px solid rgba(46,125,50,0.45);"></div>
            Zona de cumplimiento
          </div>
          <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;">
            <div class="w-4 h-4 rounded-sm" style="background: #915BD8;"></div>
            Generación real
          </div>
          <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;">
            <div class="w-4 h-4 rounded-sm" style="background: rgba(214,68,85,0.38);"></div>
            Brecha de déficit
          </div>
          <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;">
            <div class="w-4 h-4 rounded-sm" style="background: rgba(240,192,64,0.6);"></div>
            Excedente contractual
          </div>
          <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;">
            <div class="w-4 h-4 rounded-sm" style="background: rgba(145,91,216,0.45); border: 1px dashed #915BD8;"></div>
            Proyección
          </div>
        </div>
      </div>

    </template>

    <!-- Empty chart state -->
    <div v-else-if="!chartLoading && !chartError" class="text-center py-16 rounded-xl border" style="color: #7a6e8a; border-color: rgba(44,32,57,0.10);">
      <i class="pi pi-chart-bar text-4xl mb-3 block" style="color: #915BD8;" />
      <p>Selecciona un año y un contrato para ver el cumplimiento anual.</p>
    </div>

    <!-- Summary table (permanent) -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold" style="color: #2C2039;">Resumen anual por contrato — {{ selectedYear }}</h2>
        <span v-if="tableLoading" class="text-xs" style="color: #7a6e8a;">Cargando…</span>
      </div>

      <DataTable
        :value="tableData"
        size="small"
        stripedRows
        class="border rounded-xl overflow-hidden cursor-pointer"
        style="border-color: rgba(44,32,57,0.12);"
        @row-click="e => selectContrato(e.data.id)"
        :rowClass="row => row.id === selectedContratoId ? 'row-selected' : ''"
      >
        <Column header="Contrato" style="min-width: 200px;">
          <template #body="{ data: row }">
            <div class="font-semibold text-sm" style="color: #2C2039;">
              {{ row.nombre_interno || row.numero_codigo_contrato }}
            </div>
            <div class="text-xs mt-0.5" style="color: #7a6e8a;">{{ row.comprador_nombre }}</div>
          </template>
        </Column>
        <Column header="Vigencia" style="width: 190px;">
          <template #body="{ data: row }">
            <span class="text-xs" style="color: #7a6e8a;">
              {{ fmtFecha(row.fecha_inicio) }} – {{ fmtFecha(row.fecha_fin) }}
            </span>
          </template>
        </Column>
        <Column header="Mín anual" style="width: 130px; text-align: right;">
          <template #body="{ data: row }">
            <span v-if="row.total_min_mwh !== null" class="font-mono text-sm">{{ fmtMwh(row.total_min_mwh) }}</span>
            <span v-else class="text-xs" style="color: #b0a0c0;">—</span>
          </template>
        </Column>
        <Column header="Máx anual" style="width: 130px; text-align: right;">
          <template #body="{ data: row }">
            <span v-if="row.total_max_mwh !== null" class="font-mono text-sm">{{ fmtMwh(row.total_max_mwh) }}</span>
            <span v-else class="text-xs" style="color: #b0a0c0;">—</span>
          </template>
        </Column>
        <Column header="Meses" style="width: 90px; text-align: center;">
          <template #body="{ data: row }">
            <span class="font-mono text-sm">{{ row.meses_con_compromisos }}
              <span class="text-xs" style="color: #7a6e8a;">/12</span>
            </span>
          </template>
        </Column>
        <Column style="width: 44px; text-align: center;">
          <template #body="{ data: row }">
            <i
              :class="row.id === selectedContratoId ? 'pi pi-chart-bar' : 'pi pi-chevron-right'"
              class="text-xs"
              style="color: #915BD8;"
            />
          </template>
        </Column>
      </DataTable>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import client from '@/api/client'

// ── Chart layout ──────────────────────────────────────────────────────────────
const SVG_W  = 820
const SVG_H  = 340
const PAD_L  = 62
const PAD_R  = 22
const PAD_T  = 18
const PAD_B  = 42
const PLOT_W = SVG_W - PAD_L - PAD_R
const PLOT_H = SVG_H - PAD_T - PAD_B
const N      = 12
const slotW  = PLOT_W / N
const barW   = slotW * 0.54

// ── Labels ────────────────────────────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── State ─────────────────────────────────────────────────────────────────────
const now    = new Date()
const years  = Array.from({ length: 18 }, (_, i) => 2024 + i)
const contratos         = ref([])
const selectedYear      = ref(now.getFullYear())
const selectedContratoId = ref(null)

const anualData   = ref(null)
const chartLoading = ref(false)
const chartError  = ref(null)

const tableData   = ref([])
const tableLoading = ref(false)

const hovered  = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)
const chartBox = ref(null)

// ── Chart math ────────────────────────────────────────────────────────────────
const yMaxVal = computed(() => {
  if (!anualData.value) return 1000
  let m = 0
  for (const mes of anualData.value.meses) {
    m = Math.max(m, mes.max_mwh || 0, genVal(mes))
  }
  return m > 0 ? m * 1.18 : 1000
})

const yGridLines = computed(() => {
  const step = niceStep(yMaxVal.value)
  const lines = []
  for (let v = 0; v <= yMaxVal.value; v += step) {
    lines.push({ val: v, y: toY(v) })
  }
  return lines
})

function niceStep(max) {
  const rough = max / 5
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)))
  const mult = rough / mag
  if (mult < 1.5) return mag
  if (mult < 3.5) return 2 * mag
  if (mult < 7.5) return 5 * mag
  return 10 * mag
}

function toY(val) {
  return PAD_T + PLOT_H * (1 - (val || 0) / yMaxVal.value)
}

function slotX(i) {
  return PAD_L + i * slotW
}

function barX(i) {
  return PAD_L + i * slotW + (slotW - barW) / 2
}

function genVal(mes) {
  return mes.gen_proyectada_mwh ?? mes.gen_mwh ?? 0
}

function isCurrentMonth(mes) {
  return selectedYear.value === now.getFullYear() && mes.month === (now.getMonth() + 1)
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function onSvgMousemove(event) {
  const svgEl = event.currentTarget
  const rect  = svgEl.getBoundingClientRect()
  const svgX  = (event.clientX - rect.left) * (SVG_W / rect.width)
  const idx   = Math.floor((svgX - PAD_L) / slotW)

  if (idx >= 0 && idx < N && svgX >= PAD_L) {
    hovered.value = idx
    const containerRect = chartBox.value.getBoundingClientRect()
    tooltipX.value = Math.min(event.clientX - containerRect.left + 12, containerRect.width - 225)
    tooltipY.value = event.clientY - containerRect.top - 10
  } else {
    hovered.value = null
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtMwh(val) {
  if (val === null || val === undefined) return '—'
  return val.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MWh'
}

function fmtShort(val) {
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return Math.round(val).toString()
}

function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  return `${MESES_CORTOS[parseInt(m) - 1]} ${y}`
}

function estadoLabel(estado) {
  return { ok: 'Cumplimiento', deficit: 'Déficit', excedente: 'Excedente', sin_compromisos: 'Sin compromisos' }[estado] || estado
}

function estadoBadge(estado) {
  if (estado === 'ok')        return 'estado-ok'
  if (estado === 'deficit')   return 'estado-deficit'
  if (estado === 'excedente') return 'estado-excedente'
  return 'estado-neutral'
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadContratos() {
  try {
    const res = await client.get('/cumplimiento/ppa')
    contratos.value = res.data.map(c => ({
      ...c,
      label: c.nombre_interno || c.numero_codigo_contrato || `Contrato ${c.id}`,
    }))
    if (contratos.value.length > 0) {
      const terpel = contratos.value.find(c => c.nombre_interno === 'Terpel 1')
      selectedContratoId.value = terpel?.id || contratos.value[0]?.id
    }
  } catch (e) {
    console.error('Error loading contratos', e)
  }
}

async function loadAnnualData() {
  if (!selectedContratoId.value) return
  chartLoading.value = true
  chartError.value   = null
  anualData.value    = null
  hovered.value      = null
  try {
    const res = await client.get(`/cumplimiento/ppa/${selectedContratoId.value}/anual`, {
      params: { year: selectedYear.value },
    })
    anualData.value = res.data
  } catch (e) {
    chartError.value = e.response?.data?.detail || 'Error al cargar los datos anuales.'
  } finally {
    chartLoading.value = false
  }
}

async function loadTableData() {
  tableLoading.value = true
  try {
    const res = await client.get('/cumplimiento/ppa/resumen-anual', {
      params: { year: selectedYear.value },
    })
    tableData.value = res.data
  } catch (e) {
    console.error('Error loading table data', e)
  } finally {
    tableLoading.value = false
  }
}

function onYearChange() {
  loadAnnualData()
  loadTableData()
}

function selectContrato(id) {
  selectedContratoId.value = id
  loadAnnualData()
}

onMounted(async () => {
  await loadContratos()
  await Promise.all([loadAnnualData(), loadTableData()])
})
</script>

<style scoped>
:deep(.p-datatable .p-datatable-thead th) {
  background: rgba(44,32,57,0.05);
  color: #7a6e8a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px;
}
:deep(.p-datatable .p-datatable-tbody td) {
  padding: 8px 12px;
  font-size: 13px;
  color: #2C2039;
}
:deep(.p-datatable .p-datatable-tbody tr:hover td) {
  background: rgba(145,91,216,0.05) !important;
}
:deep(.p-datatable .row-selected td) {
  background: rgba(145,91,216,0.09) !important;
}

.estado-ok      { background: #1B5E20; color: #C8E6C9; padding: 2px 8px; border-radius: 999px; }
.estado-deficit { background: #7F0E0E; color: #FFCDD2; padding: 2px 8px; border-radius: 999px; }
.estado-excedente { background: #5D3A00; color: #FFE0B2; padding: 2px 8px; border-radius: 999px; }
.estado-neutral { background: rgba(122,110,138,0.3); color: #FDFAF7; padding: 2px 8px; border-radius: 999px; }
</style>
