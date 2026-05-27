<template>
  <div class="gen-page">

    <!-- ══ STICKY HEADER ═══════════════════════════════════════════════ -->
    <div class="gen-sticky-header">

      <!-- Title row -->
      <div class="gen-titlebar">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: rgba(145,91,216,0.12)">
            <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
          </div>
          <h2 class="text-base font-bold text-gray-800">Generación</h2>
          <span class="text-xs text-gray-500 hidden sm:inline">· Compara la energía generada por proyecto</span>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <Button label="Excel" icon="pi pi-file-excel" size="small" severity="success" outlined
            :disabled="!datasets.length" @click="exportarExcel" />
          <Button icon="pi pi-refresh" size="small" outlined :loading="loading" @click="cargar"
            v-tooltip.bottom="'Actualizar'" />
        </div>
      </div>

      <!-- Filter row -->
      <div class="gen-filterbar">
        <!-- Granularity selector -->
        <div class="gen-segmented">
          <button v-for="g in GRANULARIDADES" :key="g.key"
            class="gen-seg-btn"
            :class="{ 'gen-seg-btn--active': granularidad === g.key, 'gen-seg-btn--disabled': g.disabled }"
            :disabled="g.disabled"
            :title="g.tooltip || ''"
            @click="cambiarGranularidad(g.key)">
            <i :class="g.icon" />
            <span>{{ g.label }}</span>
          </button>
        </div>

        <!-- Date range -->
        <div class="flex items-center gap-1.5">
          <DatePicker v-model="fechaDesde" placeholder="Desde" dateFormat="dd/mm/yy"
            :showIcon="true" size="small" class="w-36" :maxDate="hoy"
            @date-select="onCambioFechas" />
          <span class="text-xs text-gray-400">→</span>
          <DatePicker v-model="fechaHasta" placeholder="Hasta" dateFormat="dd/mm/yy"
            :showIcon="true" size="small" class="w-36" :maxDate="hoy"
            @date-select="onCambioFechas" />
        </div>

        <!-- Quick range chips -->
        <div class="gen-chips">
          <button v-for="q in atajosFecha" :key="q.label" class="gen-chip" @click="aplicarRangoRapido(q)">
            {{ q.label }}
          </button>
        </div>

        <!-- Validation message -->
        <span v-if="rangoError" class="gen-err">
          <i class="pi pi-exclamation-circle" /> {{ rangoError }}
        </span>

        <!-- Project multi-select -->
        <div class="gen-project-picker">
          <MultiSelect v-model="proyectosSel" :options="proyectos" optionLabel="nombre_comercial"
            optionValue="id" :filter="true" :showToggleAll="false"
            display="chip" placeholder="Selecciona proyectos…"
            :maxSelectedLabels="3" :selectedItemsLabel="`{0} proyectos seleccionados`"
            class="w-full" size="small" @change="onProyectosChange" />
        </div>

        <!-- Consultar (dispara la query del intervalo seleccionado) -->
        <Button label="Consultar" icon="pi pi-search" size="small"
          class="gen-consultar" :class="{ 'gen-consultar--pendiente': pendiente && proyectosSel.length && !rangoError }"
          :disabled="!proyectosSel.length || !!rangoError" :loading="loading"
          @click="cargar"
          v-tooltip.bottom="!proyectosSel.length ? 'Selecciona al menos un proyecto' : (rangoError ? 'Corrige el rango de fechas' : 'Consultar generación')" />
      </div>

    </div><!-- /sticky-header -->

    <!-- ══ EMPTY STATE / GUIDE ════════════════════════════════════════ -->
    <div v-if="!proyectosSel.length" class="gen-empty">
      <i class="pi pi-info-circle text-3xl mb-3" style="color:#915BD8" />
      <p class="text-base font-semibold text-gray-700">Selecciona uno o más proyectos para comenzar</p>
      <p class="text-sm text-gray-500 mt-1">Elige proyectos y un rango, luego presiona <strong>Consultar</strong>.</p>
    </div>

    <!-- ══ LOADING ════════════════════════════════════════════════════ -->
    <div v-else-if="loading" class="gen-loading">
      <ProgressSpinner style="width:40px;height:40px" />
      <p class="text-sm text-gray-500 mt-3">Cargando datos de generación…</p>
    </div>

    <!-- ══ ERROR ═════════════════════════════════════════════════════ -->
    <div v-else-if="error" class="gen-error">
      <i class="pi pi-exclamation-circle text-2xl text-red-500" />
      <div class="flex-1">
        <p class="font-semibold text-red-700">No se pudo consultar la generación</p>
        <p class="text-sm text-gray-600 mt-0.5">{{ error }}</p>
      </div>
      <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargar" />
    </div>

    <!-- ══ READY TO QUERY (proyectos elegidos, aún sin consultar) ═════ -->
    <div v-else-if="!hasQueried" class="gen-empty">
      <i class="pi pi-search text-3xl mb-3" style="color:#915BD8" />
      <p class="text-base font-semibold text-gray-700">Listo para consultar</p>
      <p class="text-sm text-gray-500 mt-1">Ajusta el rango y la granularidad, luego presiona Consultar.</p>
      <Button label="Consultar" icon="pi pi-search" size="small" class="mt-3"
        :disabled="!!rangoError" :loading="loading" @click="cargar" />
    </div>

    <!-- ══ NO DATA ═══════════════════════════════════════════════════ -->
    <div v-else-if="!datasets.length || datasets.every(d => !d.points.length)" class="gen-empty">
      <i class="pi pi-database text-3xl mb-3 text-gray-300" />
      <p class="text-base font-semibold text-gray-700">Sin datos para el rango seleccionado</p>
      <p class="text-sm text-gray-500 mt-1">Los proyectos seleccionados no tienen generación registrada en este intervalo. Prueba con un rango más amplio o fechas anteriores.</p>
      <Button label="Probar último año" icon="pi pi-calendar" outlined size="small" class="mt-3" @click="aplicarUltimoAnio" />
    </div>

    <!-- ══ MAIN CONTENT ══════════════════════════════════════════════ -->
    <template v-else>

      <!-- KPI cards -->
      <div class="gen-kpis">
        <div class="gen-kpi">
          <div class="gen-kpi-icon" style="background:rgba(212,160,23,0.12); color:#D4A017"><i class="pi pi-bolt" /></div>
          <div>
            <div class="gen-kpi-val">{{ totalKwh.toLocaleString('es-CO', { maximumFractionDigits: 0 }) }}</div>
            <div class="gen-kpi-lbl">kWh totales</div>
          </div>
        </div>
        <div class="gen-kpi">
          <div class="gen-kpi-icon" style="background:rgba(145,91,216,0.12); color:#915BD8"><i class="pi pi-chart-bar" /></div>
          <div>
            <div class="gen-kpi-val">{{ (totalKwh / Math.max(1, datasets.length) / Math.max(1, periodos.length)).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }}</div>
            <div class="gen-kpi-lbl">Promedio kWh / {{ unidadPeriodo }}</div>
          </div>
        </div>
        <div class="gen-kpi">
          <div class="gen-kpi-icon" style="background:rgba(16,185,129,0.12); color:#10b981"><i class="pi pi-trophy" /></div>
          <div>
            <div class="gen-kpi-val text-sm">{{ topProyecto?.nombre || '—' }}</div>
            <div class="gen-kpi-lbl">Mayor generación</div>
          </div>
        </div>
        <div class="gen-kpi">
          <div class="gen-kpi-icon" style="background:rgba(59,130,246,0.12); color:#3b82f6"><i class="pi pi-calendar" /></div>
          <div>
            <div class="gen-kpi-val text-sm">{{ periodos.length }} {{ unidadPeriodoPlural }}</div>
            <div class="gen-kpi-lbl">Período cubierto</div>
          </div>
        </div>
      </div>

      <!-- Chart card -->
      <section class="gen-card">
        <header class="gen-card-head">
          <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
          <h3 class="gen-card-title">{{ tituloGrafico }}</h3>
          <div class="flex items-center gap-2 ml-auto">
            <button v-for="t in ['line', 'bar']" :key="t"
              class="gen-toggle-btn" :class="{ 'gen-toggle-btn--active': tipoGrafico === t }"
              @click="tipoGrafico = t">
              <i :class="t === 'line' ? 'pi pi-chart-line' : 'pi pi-chart-bar'" />
            </button>
          </div>
        </header>

        <!-- Legend -->
        <div class="gen-legend">
          <button v-for="(ds, idx) in datasets" :key="ds.proyectoId"
            class="gen-legend-item" :class="{ 'gen-legend-item--off': ds.hidden }"
            @click="ds.hidden = !ds.hidden">
            <span class="gen-legend-dot" :style="{ background: ds.color }" />
            <span class="gen-legend-name">{{ ds.nombre }}</span>
            <span class="gen-legend-total">{{ ds.total.toLocaleString('es-CO', { maximumFractionDigits: 0 }) }} kWh</span>
          </button>
        </div>

        <!-- SVG chart -->
        <div class="gen-chart-wrap" ref="chartWrapRef">
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="none" class="gen-chart-svg">
            <!-- Y grid lines + labels -->
            <g class="gen-grid">
              <template v-for="(y, i) in yTicks" :key="'y' + i">
                <line :x1="paddingL" :x2="chartW - paddingR" :y1="yToPx(y)" :y2="yToPx(y)" />
                <text :x="paddingL - 6" :y="yToPx(y) + 3.5">{{ fmtYTick(y) }}</text>
              </template>
            </g>
            <!-- X labels -->
            <g class="gen-xlabels">
              <text v-for="(p, i) in xLabels" :key="'x' + i"
                :x="xToPx(p.idx)" :y="chartH - paddingB / 2 + 4"
                :text-anchor="i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'">
                {{ p.label }}
              </text>
            </g>
            <!-- Line series -->
            <template v-if="tipoGrafico === 'line'">
              <g v-for="ds in datasets.filter(d => !d.hidden)" :key="ds.proyectoId">
                <polyline
                  :points="lineaPoints(ds)" fill="none"
                  :stroke="ds.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                <circle v-for="(pt, i) in ds.points" :key="i"
                  :cx="xToPx(i)" :cy="yToPx(pt.kwh)" r="2.5" :fill="ds.color" />
              </g>
            </template>
            <!-- Bar series -->
            <template v-else>
              <g v-for="(p, i) in periodos" :key="'b' + i">
                <rect v-for="(ds, j) in datasets.filter(d => !d.hidden)" :key="ds.proyectoId"
                  :x="barX(i, j, datasets.filter(d => !d.hidden).length)"
                  :y="yToPx(ds.points[i]?.kwh ?? 0)"
                  :width="barW(datasets.filter(d => !d.hidden).length)"
                  :height="Math.max(0, chartH - paddingB - yToPx(ds.points[i]?.kwh ?? 0))"
                  :fill="ds.color"
                  rx="1.5" />
              </g>
            </template>
          </svg>
        </div>
      </section>

      <!-- Data table -->
      <section class="gen-card">
        <header class="gen-card-head">
          <i class="pi pi-table text-sm" style="color:#915BD8" />
          <h3 class="gen-card-title">Detalle por {{ unidadPeriodo }}</h3>
          <span class="ml-auto text-xs text-gray-500">{{ periodos.length }} {{ unidadPeriodoPlural }} · {{ datasets.length }} proyectos</span>
        </header>
        <div class="overflow-x-auto">
          <DataTable :value="tablaFilas" stripedRows class="text-sm gen-table"
            :rows="20" paginator :rowsPerPageOptions="[10, 20, 50, 100]" :alwaysShowPaginator="periodos.length > 20">
            <Column field="periodo" :header="unidadPeriodo" frozen style="min-width:120px">
              <template #body="{ data }">
                <span class="font-medium text-gray-800">{{ data.periodo }}</span>
              </template>
            </Column>
            <Column v-for="ds in datasets" :key="ds.proyectoId" :field="ds.proyectoId.toString()"
              :header="ds.nombre" style="min-width:120px">
              <template #body="{ data }">
                <span v-if="data[ds.proyectoId] != null" class="font-mono">
                  {{ data[ds.proyectoId].toLocaleString('es-CO', { maximumFractionDigits: 2 }) }}
                </span>
                <span v-else class="text-gray-300">—</span>
              </template>
            </Column>
            <Column header="Total" style="min-width:120px">
              <template #body="{ data }">
                <span class="font-mono font-bold text-purple-700">
                  {{ data.total.toLocaleString('es-CO', { maximumFractionDigits: 2 }) }}
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import * as XLSX from 'xlsx'
import api from '@/api/client'

const toast = useToast()

// ── Constantes ────────────────────────────────────────────────────────
const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const PALETTE = ['#915BD8', '#2563eb', '#10b981', '#D4A017', '#dc2626', '#0891b2', '#7c3aed', '#db2777', '#65a30d', '#0d9488']

const GRANULARIDADES = [
  { key: 'mensual', label: 'Mensual', icon: 'pi pi-calendar', maxDias: 365 * 5 },
  { key: 'diaria',  label: 'Diaria',  icon: 'pi pi-list',     maxDias: 365 },
  { key: 'horaria', label: 'Horaria', icon: 'pi pi-clock',    maxDias: 7,
    disabled: false,
    tooltip: 'Vista horaria: máximo 1 semana. Por ahora utiliza datos diarios distribuidos.' },
]

const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

// ── Estado ───────────────────────────────────────────────────────────
const loading = ref(false)
const error = ref(null)
const proyectos = ref([])
const proyectosSel = ref([])

const granularidad = ref('diaria')
const fechaDesde = ref(diasAtras(30))
const fechaHasta = ref(new Date())

const datasets = ref([])
const tipoGrafico = ref('line')
const chartWrapRef = ref(null)
const chartContainerWidth = ref(900)

// Consulta manual: hasQueried distingue "aún no consultado" de "sin datos";
// pendiente resalta el botón Consultar cuando hay cambios sin aplicar.
const hasQueried = ref(false)
const pendiente = ref(false)

// ── Atajos ────────────────────────────────────────────────────────────
const atajosFecha = computed(() => {
  if (granularidad.value === 'mensual') {
    return [
      { label: '6m',  meses: 6 },
      { label: '1a',  meses: 12 },
      { label: '2a',  meses: 24 },
    ]
  }
  if (granularidad.value === 'diaria') {
    return [
      { label: '7d',  dias: 7 },
      { label: '30d', dias: 30 },
      { label: '90d', dias: 90 },
      { label: '6m',  dias: 180 },
      { label: '1a',  dias: 365 },
    ]
  }
  return [
    { label: 'Hoy',  dias: 1 },
    { label: '3d',   dias: 3 },
    { label: '7d',   dias: 7 },
  ]
})

function diasAtras(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

function aplicarRangoRapido(q) {
  fechaHasta.value = new Date(hoy)
  if (q.dias != null) {
    fechaDesde.value = diasAtras(q.dias - 1)
  } else if (q.meses != null) {
    const d = new Date(hoy)
    d.setMonth(d.getMonth() - q.meses + 1)
    d.setDate(1)
    fechaDesde.value = d
  }
  marcarPendiente()
}

// Cambia a granularidad diaria + último año y consulta directamente
// (atajo desde el estado "sin datos" para encontrar datos históricos).
function aplicarUltimoAnio() {
  granularidad.value = 'diaria'
  fechaHasta.value = new Date(hoy)
  fechaDesde.value = diasAtras(364)
  cargar()
}

// Marca que hay filtros sin aplicar (resalta el botón Consultar).
function marcarPendiente() {
  pendiente.value = true
}

// Cambio en la selección de proyectos: si se vacía, limpia resultados.
function onProyectosChange() {
  pendiente.value = true
  if (!proyectosSel.value.length) {
    datasets.value = []
    hasQueried.value = false
    error.value = null
  }
}

// ── Validación del rango ─────────────────────────────────────────────
const rangoDias = computed(() => {
  if (!fechaDesde.value || !fechaHasta.value) return 0
  const diff = (fechaHasta.value.getTime() - fechaDesde.value.getTime()) / 86400000
  return Math.max(0, Math.ceil(diff) + 1)
})

const rangoError = computed(() => {
  if (!fechaDesde.value || !fechaHasta.value) return null
  if (fechaHasta.value < fechaDesde.value) return 'La fecha final debe ser posterior a la inicial'
  const g = GRANULARIDADES.find(g => g.key === granularidad.value)
  if (g && rangoDias.value > g.maxDias) {
    return `${g.label}: máximo ${g.maxDias === 365 ? '1 año' : g.maxDias === 7 ? '1 semana' : g.maxDias + ' días'} (actual: ${rangoDias.value} días)`
  }
  return null
})

function cambiarGranularidad(g) {
  if (g === granularidad.value) return
  granularidad.value = g
  // Ajusta el rango al máximo permitido si es necesario
  const max = GRANULARIDADES.find(gg => gg.key === g).maxDias
  if (rangoDias.value > max) {
    fechaHasta.value = new Date(hoy)
    fechaDesde.value = diasAtras(max - 1)
  }
  marcarPendiente()
}

function onCambioFechas() {
  marcarPendiente()
}

// ── Período label helper ─────────────────────────────────────────────
const unidadPeriodo = computed(() => ({ mensual: 'mes', diaria: 'día', horaria: 'hora' }[granularidad.value]))
const unidadPeriodoPlural = computed(() => ({ mensual: 'meses', diaria: 'días', horaria: 'horas' }[granularidad.value]))

// ── Carga ────────────────────────────────────────────────────────────
async function cargar() {
  if (!proyectosSel.value.length || rangoError.value) return
  loading.value = true
  error.value = null
  pendiente.value = false
  hasQueried.value = true
  try {
    const fInicio = isoDate(fechaDesde.value)
    const fFin = isoDate(fechaHasta.value)

    // Fetch raw daily generation per project from /api/v1/generacion
    const results = await Promise.allSettled(
      proyectosSel.value.map(pid =>
        api.get('/generacion', { params: {
          proyecto_id: pid,
          fecha_inicio: fInicio,
          fecha_fin: fFin,
          size: 1000,
          page: 1,
        }}).then(r => ({ pid, items: r.data.items ?? [] }))
      )
    )

    const ds = []
    const errores = []
    results.forEach((r, idx) => {
      const pid = proyectosSel.value[idx]
      const proyecto = proyectos.value.find(p => p.id === pid)
      const nombre = proyecto?.nombre_comercial || `Proyecto ${pid}`
      if (r.status !== 'fulfilled') {
        const reason = r.reason
        const msg = reason?.response?.data?.detail || reason?.message || 'error de conexión'
        errores.push(`${nombre}: ${msg}`)
        return
      }
      const points = agruparSegunGranularidad(r.value.items)
      const total = points.reduce((s, p) => s + (p.kwh || 0), 0)
      ds.push({
        proyectoId: pid,
        nombre,
        color: PALETTE[idx % PALETTE.length],
        points,
        total,
        hidden: false,
      })
    })

    // Si TODAS las consultas fallaron, es un fallo real de la API: mostrarlo
    // (antes se tragaba el error y parecía simplemente "sin datos").
    if (!ds.length && errores.length) {
      error.value = errores.length === 1
        ? errores[0]
        : `No se pudo consultar ningún proyecto. ${errores[0]}`
      datasets.value = []
      return
    }
    // Fallos parciales: mostrar los que sí cargaron + avisar de los que no.
    if (errores.length) {
      toast.add({
        severity: 'warn',
        summary: 'Algunos proyectos no cargaron',
        detail: errores.join(' · '),
        life: 6000,
      })
    }

    // Sort by total desc for legend
    ds.sort((a, b) => b.total - a.total)
    datasets.value = ds
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    loading.value = false
  }
}

// ── Agrupación por granularidad ──────────────────────────────────────
function agruparSegunGranularidad(items) {
  // items: [{ fecha: 'YYYY-MM-DD', kwh_real, kwh_p90, ... }]
  if (!items.length) return []
  if (granularidad.value === 'diaria') {
    // Ordenar y rellenar días faltantes con 0
    return rellenarDias(items)
  }
  if (granularidad.value === 'mensual') {
    const map = new Map()
    items.forEach(it => {
      if (!it.fecha || it.kwh_real == null) return
      const k = it.fecha.slice(0, 7)
      map.set(k, (map.get(k) || 0) + Number(it.kwh_real))
    })
    return [...map.entries()].sort().map(([k, v]) => ({ key: k, kwh: v, label: mesLabel(k) }))
  }
  // horaria: distribuye el total diario en 24 horas con curva solar aproximada (placeholder)
  // — en una próxima iteración se conectará con Solenium para datos horarios reales.
  const result = []
  const curva = [0, 0, 0, 0, 0, 0.01, 0.03, 0.06, 0.09, 0.11, 0.12, 0.12, 0.12, 0.11, 0.09, 0.07, 0.04, 0.02, 0.01, 0, 0, 0, 0, 0]
  items.forEach(it => {
    if (!it.fecha || it.kwh_real == null) return
    const totalDia = Number(it.kwh_real)
    for (let h = 0; h < 24; h++) {
      const k = `${it.fecha} ${String(h).padStart(2, '0')}:00`
      result.push({ key: k, kwh: totalDia * curva[h], label: `${it.fecha.slice(5)} ${String(h).padStart(2, '0')}h` })
    }
  })
  return result
}

function rellenarDias(items) {
  if (!fechaDesde.value || !fechaHasta.value) return []
  const map = new Map(items.map(i => [i.fecha, Number(i.kwh_real || 0)]))
  const out = []
  const cur = new Date(fechaDesde.value)
  while (cur <= fechaHasta.value) {
    const k = isoDate(cur)
    out.push({ key: k, kwh: map.get(k) ?? 0, label: diaLabel(k) })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function mesLabel(yyyymm) {
  const [y, m] = yyyymm.split('-')
  return `${MESES_ES[+m - 1]} ${y.slice(2)}`
}

function diaLabel(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-')
  return `${d}/${m}`
}

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Período + chart data ─────────────────────────────────────────────
const periodos = computed(() => datasets.value[0]?.points || [])

const totalKwh = computed(() =>
  datasets.value.reduce((s, d) => s + (d.hidden ? 0 : d.total), 0)
)

const topProyecto = computed(() => {
  const sorted = [...datasets.value].filter(d => !d.hidden).sort((a, b) => b.total - a.total)
  return sorted[0] || null
})

const tituloGrafico = computed(() => {
  if (!datasets.value.length) return 'Sin datos'
  const d1 = isoDate(fechaDesde.value)
  const d2 = isoDate(fechaHasta.value)
  return `Generación ${granularidad.value === 'mensual' ? 'mensual' : granularidad.value === 'diaria' ? 'diaria' : 'horaria'} · ${d1} → ${d2}`
})

// ── Chart geometry (SVG) ─────────────────────────────────────────────
const paddingL = 50
const paddingR = 20
const paddingT = 16
const paddingB = 30
const chartH = 280
const chartW = computed(() => chartContainerWidth.value)

const maxY = computed(() => {
  let max = 0
  datasets.value.forEach(d => {
    if (d.hidden) return
    d.points.forEach(p => { if (p.kwh > max) max = p.kwh })
  })
  return max > 0 ? max * 1.08 : 10
})

const yTicks = computed(() => {
  const max = maxY.value
  const step = max / 4
  return [0, step, step * 2, step * 3, max]
})

function yToPx(y) {
  if (maxY.value === 0) return chartH - paddingB
  return paddingT + (1 - y / maxY.value) * (chartH - paddingT - paddingB)
}

function xToPx(idx) {
  const n = periodos.value.length
  if (n <= 1) return paddingL
  return paddingL + (idx / (n - 1)) * (chartW.value - paddingL - paddingR)
}

function lineaPoints(ds) {
  return ds.points.map((p, i) => `${xToPx(i)},${yToPx(p.kwh)}`).join(' ')
}

function barX(periodIdx, dsIdx, dsCount) {
  const slotW = (chartW.value - paddingL - paddingR) / Math.max(1, periodos.value.length)
  const innerW = slotW * 0.7
  const barWidth = innerW / Math.max(1, dsCount)
  return paddingL + slotW * periodIdx + (slotW - innerW) / 2 + barWidth * dsIdx
}
function barW(dsCount) {
  const slotW = (chartW.value - paddingL - paddingR) / Math.max(1, periodos.value.length)
  return (slotW * 0.7) / Math.max(1, dsCount)
}

const xLabels = computed(() => {
  const n = periodos.value.length
  if (n === 0) return []
  // Show max ~8 labels evenly distributed
  const stride = Math.max(1, Math.ceil(n / 8))
  const labels = []
  for (let i = 0; i < n; i += stride) {
    labels.push({ idx: i, label: periodos.value[i].label })
  }
  // Always show the last one
  if (labels[labels.length - 1]?.idx !== n - 1) {
    labels.push({ idx: n - 1, label: periodos.value[n - 1].label })
  }
  return labels
})

function fmtYTick(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return v.toFixed(0)
}

// ── Tabla ────────────────────────────────────────────────────────────
const tablaFilas = computed(() => {
  return periodos.value.map((p, i) => {
    const row = { periodo: p.label, total: 0 }
    datasets.value.forEach(ds => {
      const v = ds.points[i]?.kwh
      if (v != null) {
        row[ds.proyectoId] = v
        row.total += v
      }
    })
    return row
  })
})

// ── Export Excel ─────────────────────────────────────────────────────
function exportarExcel() {
  try {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumen = [
      ['Reporte de Generación'],
      [`Generado: ${new Date().toLocaleString('es-CO')}`],
      [`Granularidad: ${unidadPeriodo.value}`],
      [`Período: ${isoDate(fechaDesde.value)} → ${isoDate(fechaHasta.value)}`],
      [`Proyectos: ${datasets.value.map(d => d.nombre).join(', ')}`],
      [],
      ['Proyecto', 'Total kWh', `Promedio kWh/${unidadPeriodo.value}`],
      ...datasets.value.map(d => [
        d.nombre,
        Number(d.total.toFixed(2)),
        Number((d.total / Math.max(1, d.points.length)).toFixed(2)),
      ]),
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(resumen)
    ws1['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

    // Hoja 2: Detalle
    const headers = [unidadPeriodo.value, ...datasets.value.map(d => d.nombre), 'Total']
    const rows = tablaFilas.value.map(r => {
      const arr = [r.periodo]
      datasets.value.forEach(ds => arr.push(r[ds.proyectoId] != null ? Number(r[ds.proyectoId].toFixed(2)) : null))
      arr.push(Number(r.total.toFixed(2)))
      return arr
    })
    const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws2['!cols'] = [{ wch: 14 }, ...datasets.value.map(() => ({ wch: 18 })), { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle')

    const filename = `generacion_${granularidad.value}_${isoDate(fechaDesde.value)}_${isoDate(fechaHasta.value)}.xlsx`
    XLSX.writeFile(wb, filename)
    toast.add({ severity: 'success', summary: 'Excel descargado', detail: filename, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al exportar', detail: e?.message, life: 4000 })
  }
}

// ── Carga inicial ────────────────────────────────────────────────────
async function cargarProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = (data.items ?? []).sort((a, b) => (a.nombre_comercial || '').localeCompare(b.nombre_comercial || ''))
  } catch (e) {
    error.value = 'No se pudieron cargar los proyectos'
  }
}

// ── ResizeObserver para chart responsive ─────────────────────────────
let resizeObserver
onMounted(async () => {
  await cargarProyectos()
  await nextTick()
  if (chartWrapRef.value) {
    const upd = () => { chartContainerWidth.value = chartWrapRef.value?.clientWidth || 900 }
    upd()
    resizeObserver = new ResizeObserver(upd)
    resizeObserver.observe(chartWrapRef.value)
  }
})

watch(chartWrapRef, (el) => {
  if (el && resizeObserver) resizeObserver.observe(el)
})
</script>

<style scoped>
.gen-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Sticky header (title + filters) ───────────────────────────────── */
.gen-sticky-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #f3f4f6;
  padding-top: 4px;
  padding-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* Tapa la franja superior (padding 24px del <main>) por la que el contenido
   se asomaría al hacer scroll. Mismo patrón que Gestión de Fallas. */
.gen-sticky-header::before {
  content: "";
  position: absolute;
  left: -24px;
  right: -24px;
  bottom: 100%;
  height: 28px;
  background: #f3f4f6;
  pointer-events: none;
}

.gen-titlebar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 6px 12px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ece8f4;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  min-height: 42px;
}

.gen-filterbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ece8f4;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
}

/* Segmented control (granularity) */
.gen-segmented {
  display: inline-flex;
  background: #f3f1f8;
  border-radius: 8px;
  padding: 2px;
}
.gen-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #6b5a8a;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}
.gen-seg-btn:hover:not(:disabled) { color: #2C2039; }
.gen-seg-btn--active {
  background: #fff;
  color: #915BD8;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.1);
}
.gen-seg-btn--disabled { opacity: 0.5; cursor: not-allowed; }

/* Quick range chips */
.gen-chips {
  display: inline-flex;
  gap: 3px;
}
.gen-chip {
  padding: 4px 10px;
  background: #f3f1f8;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: #6b5a8a;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}
.gen-chip:hover { background: #ece4ff; color: #4a3b6b; }

/* Validation error */
.gen-err {
  font-size: 11.5px;
  color: #dc2626;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Project picker */
.gen-project-picker { flex: 1; min-width: 240px; }
.gen-project-picker :deep(.p-multiselect) { width: 100%; }

/* Botón Consultar */
.gen-consultar { flex-shrink: 0; }
/* Resalta cuando hay filtros sin aplicar (pendiente de consultar) */
.gen-consultar--pendiente :deep(.p-button),
.gen-consultar--pendiente.p-button {
  animation: gen-pulse 1.6s ease-in-out infinite;
}
@keyframes gen-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(145, 91, 216, 0.45); }
  50%      { box-shadow: 0 0 0 4px rgba(145, 91, 216, 0.18); }
}

/* Empty / loading / error states */
.gen-empty, .gen-loading, .gen-error {
  background: #fff;
  border: 1px solid #ece8f4;
  border-radius: 12px;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.gen-error {
  flex-direction: row;
  align-items: flex-start;
  text-align: left;
  padding: 18px;
  gap: 14px;
}

/* KPIs */
.gen-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (min-width: 768px) {
  .gen-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.gen-kpi {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ece8f4;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
}
.gen-kpi-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.gen-kpi-val { font-size: 20px; font-weight: 800; line-height: 1.1; color: #2C2039; }
.gen-kpi-lbl { font-size: 11.5px; font-weight: 600; color: #6b5a8a; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px; }

/* Card */
.gen-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ece8f4;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  overflow: hidden;
}
.gen-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #ece8f4;
  background: #faf9fc;
}
.gen-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #2C2039;
  margin: 0;
}

/* Chart toggle */
.gen-toggle-btn {
  width: 30px; height: 30px;
  border: 1px solid #ece8f4;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: #6b5a8a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.gen-toggle-btn--active { background: #915BD8; color: #fff; border-color: #915BD8; }
.gen-toggle-btn i { font-size: 12px; }

/* Legend */
.gen-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid #ece8f4;
}
.gen-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #faf9fc;
  border: 1px solid #ece8f4;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
}
.gen-legend-item:hover { background: #f3f1f8; }
.gen-legend-item--off { opacity: 0.4; }
.gen-legend-dot { width: 9px; height: 9px; border-radius: 50%; }
.gen-legend-name { font-weight: 600; color: #2C2039; }
.gen-legend-total { color: #6b5a8a; font-weight: 500; }

/* Chart SVG */
.gen-chart-wrap {
  width: 100%;
  padding: 12px 16px 4px;
}
.gen-chart-svg {
  width: 100%;
  height: 280px;
  display: block;
}
.gen-chart-svg .gen-grid line {
  stroke: #ece8f4;
  stroke-width: 1;
  stroke-dasharray: 3 3;
}
.gen-chart-svg .gen-grid text {
  font-size: 9px;
  fill: #6b5a8a;
  text-anchor: end;
  font-family: inherit;
}
.gen-chart-svg .gen-xlabels text {
  font-size: 9px;
  fill: #6b5a8a;
  font-family: inherit;
}

/* Table */
.gen-table :deep(.p-datatable-thead > tr > th) {
  background: #faf9fc;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #6b5a8a;
}
.gen-table :deep(.p-datatable-tbody > tr > td) {
  padding: 8px 12px;
  vertical-align: middle;
}
</style>
