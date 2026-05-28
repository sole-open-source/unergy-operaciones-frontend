<template>
  <div class="mon-page">

    <!-- ══ HERO ══════════════════════════════════════════════════════════ -->
    <div class="mon-hero">
      <div>
        <h1 class="mon-hero-title">Monitoreo de Fallas</h1>
        <p class="mon-hero-sub">Seguimiento operacional en tiempo real · Unergy</p>
      </div>
      <div class="mon-hero-actions">
        <template v-if="activeTab === 0">
          <button class="mon-btn mon-btn-ghost" :disabled="loading" @click="cargar">
            <span :class="loading ? 'spin' : ''">↻</span> Actualizar
          </button>
          <button class="mon-btn mon-btn-primary" @click="showDialog = true">
            + Registrar falla
          </button>
        </template>
      </div>
    </div>

    <!-- ══ TAB BAR ═══════════════════════════════════════════════════════ -->
    <div class="mon-tabs">
      <button v-for="(tab, i) in TABS" :key="i"
              class="mon-tab" :class="{ 'mon-tab--active': activeTab === i }"
              @click="activeTab = i">
        <span class="mon-tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 0 — FALLAS                                                    -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 0">

      <!-- KPIs -->
      <div class="mon-kpis">
        <button class="kpi" :class="!filtroEstado && !filtroPrioridad ? 'kpi--active kpi--purple' : ''"
                @click="limpiarFiltros">
          <div class="kpi-val">{{ todasLasFallas.length }}</div>
          <div class="kpi-label">Total</div>
          <div class="kpi-bar kpi-bar--purple" />
        </button>
        <button class="kpi" :class="filtroEstado === 'abierta' ? 'kpi--active kpi--red' : ''"
                @click="setFiltroEstado('abierta')">
          <div class="kpi-val">{{ kpis.abierta }}</div>
          <div class="kpi-label">Abiertas</div>
          <div class="kpi-bar kpi-bar--red" />
        </button>
        <button class="kpi" :class="filtroEstado === 'en_gestion' ? 'kpi--active kpi--orange' : ''"
                @click="setFiltroEstado('en_gestion')">
          <div class="kpi-val">{{ kpis.en_gestion }}</div>
          <div class="kpi-label">En gestión</div>
          <div class="kpi-bar kpi-bar--orange" />
        </button>
        <button class="kpi" :class="filtroEstado === 'en_espera' ? 'kpi--active kpi--blue' : ''"
                @click="setFiltroEstado('en_espera')">
          <div class="kpi-val">{{ kpis.en_espera }}</div>
          <div class="kpi-label">En espera</div>
          <div class="kpi-bar kpi-bar--blue" />
        </button>
        <button class="kpi" :class="filtroEstado === 'cerrada' ? 'kpi--active kpi--green' : ''"
                @click="setFiltroEstado('cerrada')">
          <div class="kpi-val">{{ kpis.cerrada }}</div>
          <div class="kpi-label">Cerradas</div>
          <div class="kpi-bar kpi-bar--green" />
        </button>
        <button class="kpi" :class="filtroPrioridad === 'critica' ? 'kpi--active kpi--red' : ''"
                @click="setFiltroPrioridad('critica')">
          <div class="kpi-val kpi-val--red">{{ kpis.critica }}</div>
          <div class="kpi-label">Críticas</div>
          <div class="kpi-bar kpi-bar--red" />
        </button>
      </div>

      <!-- Filtros -->
      <div class="mon-filters">
        <div class="mon-filter-field mon-filter-search">
          <label class="mon-filter-label">Buscar</label>
          <input v-model="buscar" type="text" class="mon-input"
                 placeholder="Código, proyecto, descripción…" />
        </div>
        <div class="mon-filter-field">
          <label class="mon-filter-label">Estado</label>
          <select v-model="filtroEstado" class="mon-select">
            <option value="">Todos</option>
            <option v-for="e in catalogos.estados" :key="e.id" :value="e.codigo">{{ e.etiqueta }}</option>
          </select>
        </div>
        <div class="mon-filter-field">
          <label class="mon-filter-label">Prioridad</label>
          <select v-model="filtroPrioridad" class="mon-select">
            <option value="">Todas</option>
            <option v-for="p in catalogos.prioridades" :key="p.id" :value="p.codigo">{{ p.etiqueta }}</option>
          </select>
        </div>
        <div class="mon-filter-field">
          <label class="mon-filter-label">Proyecto</label>
          <select v-model="filtroProyecto" class="mon-select">
            <option value="">Todos</option>
            <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
          </select>
        </div>
        <div class="mon-filter-actions">
          <button v-if="hayFiltros" class="mon-btn-clear" @click="limpiarFiltros">✕ Limpiar</button>
          <span v-if="!loading" class="mon-count">
            {{ fallasFiltradas.length }} falla{{ fallasFiltradas.length !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- Tabla -->
      <div class="mon-table-area">
        <div v-if="loading" class="mon-loading">
          <div class="mon-spinner" /><span>Cargando fallas…</span>
        </div>
        <div v-else-if="error" class="mon-error">
          <span>⚠️</span>
          <div>
            <div class="mon-error-title">Error al cargar</div>
            <div class="mon-error-msg">{{ error }}</div>
          </div>
          <button class="mon-btn-outline" @click="cargar">Reintentar</button>
        </div>
        <div v-else-if="!fallasFiltradas.length" class="mon-empty">
          <div class="mon-empty-icon">⚡</div>
          <p class="mon-empty-title">{{ hayFiltros ? 'Sin resultados' : 'Sin fallas registradas' }}</p>
          <p class="mon-empty-sub">{{ hayFiltros ? 'Intenta con otros filtros' : 'El sistema opera sin incidencias activas' }}</p>
          <button v-if="hayFiltros" class="mon-btn-clear" style="margin-top:12px" @click="limpiarFiltros">
            ✕ Limpiar filtros
          </button>
        </div>
        <table v-else class="mon-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Proyecto</th>
              <th>Categoría / Tipo</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Identificada</th>
              <th>Días</th>
              <th>SLA</th>
              <th>Asignado a</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in fallasFiltradas" :key="f.id"
                class="mon-row"
                :class="{ 'mon-row--cerrada': f.estado?.codigo === 'cerrada' }"
                @click="irDetalle(f.id)">
              <td class="td-codigo">{{ f.codigo_interno }}</td>
              <td class="td-proyecto">{{ f.proyecto?.nombre_comercial || '—' }}</td>
              <td class="td-tipo">
                <span v-if="f.tipo?.categoria" class="cat-tag" :style="catStyle(f.tipo.categoria.color_hex)">
                  {{ f.tipo.categoria.etiqueta }}
                </span>
                <div class="tipo-sub">{{ f.tipo?.etiqueta || '—' }}</div>
              </td>
              <td>
                <span class="estado-pill" :style="pillStyle(f.estado?.color_hex)">
                  {{ f.estado?.etiqueta || '—' }}
                </span>
              </td>
              <td>
                <span class="prio-pill" :class="'prio-' + (f.prioridad?.nivel || 4)">
                  {{ f.prioridad?.etiqueta || '—' }}
                </span>
              </td>
              <td class="td-fecha">{{ fmtFecha(f.fecha_identificacion) }}</td>
              <td>
                <span v-if="f.dias_abierta != null"
                      class="dias-badge"
                      :class="diasClass(f)">
                  {{ f.dias_abierta }}d
                </span>
                <span v-else class="td-dash">—</span>
              </td>
              <td>
                <span v-if="f.sla_cumplido === true"       class="sla sla-ok">✓ OK</span>
                <span v-else-if="f.sla_cumplido === false" class="sla sla-fail">Vencido</span>
                <span v-else-if="slaRisk(f)"               class="sla sla-warn">En riesgo</span>
                <span v-else                               class="td-dash">—</span>
              </td>
              <td class="td-asig">
                <span v-if="f.asignado_a">{{ f.asignado_a.nombre }}</span>
                <span v-else class="td-dash">Sin asignar</span>
              </td>
              <td class="td-arrow" @click.stop>
                <button class="arrow-btn" @click="irDetalle(f.id)">→</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Dialog nueva falla -->
      <Dialog v-model:visible="showDialog" header="Registrar nueva falla" modal
              class="w-full max-w-2xl" :closable="!saving">
        <FallaForm :catalogos="catalogos" @save="onCreate" @cancel="showDialog = false" />
      </Dialog>

    </template><!-- /TAB 0 -->

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1 — GRÁFICOS                                                  -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 1" class="mon-tab-view">
      <div v-if="loading" class="mon-tab-loading">
        <div class="mon-spinner" /><span>Cargando datos…</span>
      </div>
      <div v-else-if="!todasLasFallas.length" class="mon-tab-empty">
        <div class="mon-empty-icon">📊</div>
        <p class="mon-empty-title">Sin datos de fallas</p>
        <p class="mon-empty-sub">No hay registros para generar gráficos</p>
      </div>
      <div v-else>

        <!-- Filtro y KPIs -->
        <div class="chart-filters">
          <div class="mon-filter-field">
            <label class="mon-filter-label">Filtrar por proyecto</label>
            <select v-model="filtroGraficosProyecto" class="mon-select">
              <option value="">Todos los proyectos</option>
              <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
            </select>
          </div>
          <div class="chart-total-badge">
            <span class="chart-total-num">{{ fallasFiltGraficos.length }}</span>
            <span class="chart-total-lbl">fallas analizadas</span>
          </div>
          <div class="chart-kpi-mini">
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#dc2626">{{ grafKpis.criticas }}</div>
              <div class="chart-kpi-mini-lbl">Críticas</div>
            </div>
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#2563eb">{{ grafKpis.resueltas }}</div>
              <div class="chart-kpi-mini-lbl">Resueltas</div>
            </div>
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#16a34a">{{ grafKpis.tasaResolucion }}%</div>
              <div class="chart-kpi-mini-lbl">Tasa resolución</div>
            </div>
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#7c3aed">{{ grafKpis.avgDias }}</div>
              <div class="chart-kpi-mini-lbl">Días prom.</div>
            </div>
          </div>
        </div>

        <!-- Proyecto con más fallas -->
        <div v-if="!filtroGraficosProyecto && topProyecto" class="top-proyecto-card">
          <div class="top-proy-icon">🏆</div>
          <div class="top-proy-body">
            <div class="top-proy-label">Proyecto con más fallas</div>
            <div class="top-proy-name">{{ topProyecto.label }}</div>
          </div>
          <div class="top-proy-count">
            <div class="top-proy-num">{{ topProyecto.count }}</div>
            <div class="top-proy-sub">fallas registradas</div>
          </div>
        </div>

        <div class="charts-grid">

          <!-- Donut: por estado -->
          <div class="chart-card">
            <div class="chart-title">Distribución por estado</div>
            <div class="donut-wrap">
              <svg viewBox="0 0 42 42" class="donut-svg">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0eaf8" stroke-width="4"/>
                <circle v-for="(seg, i) in donutEstado" :key="i"
                  cx="21" cy="21" r="15.9" fill="none"
                  :stroke="seg.color" stroke-width="4"
                  :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                  :stroke-dashoffset="seg.offset"
                  stroke-linecap="round"
                  transform="rotate(-90 21 21)" />
              </svg>
              <div class="donut-total">
                <div class="donut-total-num">{{ fallasFiltGraficos.length }}</div>
                <div class="donut-total-lbl">total</div>
              </div>
              <div class="donut-legend">
                <div v-for="seg in donutEstado" :key="seg.label" class="legend-row">
                  <span class="legend-dot" :style="{ background: seg.color }"></span>
                  <span class="legend-label">{{ seg.label }}</span>
                  <span class="legend-val">{{ seg.count }}</span>
                  <span class="legend-pct">{{ Math.round(seg.pct) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Donut: por prioridad -->
          <div class="chart-card">
            <div class="chart-title">Distribución por prioridad</div>
            <div class="donut-wrap">
              <svg viewBox="0 0 42 42" class="donut-svg">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0eaf8" stroke-width="4"/>
                <circle v-for="(seg, i) in donutPrioridad" :key="i"
                  cx="21" cy="21" r="15.9" fill="none"
                  :stroke="seg.color" stroke-width="4"
                  :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                  :stroke-dashoffset="seg.offset"
                  stroke-linecap="round"
                  transform="rotate(-90 21 21)" />
              </svg>
              <div class="donut-total">
                <div class="donut-total-num">{{ fallasFiltGraficos.length }}</div>
                <div class="donut-total-lbl">total</div>
              </div>
              <div class="donut-legend">
                <div v-for="seg in donutPrioridad" :key="seg.label" class="legend-row">
                  <span class="legend-dot" :style="{ background: seg.color }"></span>
                  <span class="legend-label">{{ seg.label }}</span>
                  <span class="legend-val">{{ seg.count }}</span>
                  <span class="legend-pct">{{ Math.round(seg.pct) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Barras: por categoría -->
          <div class="chart-card" v-if="fallasPorCategoria.length">
            <div class="chart-title">Fallas por categoría</div>
            <div class="bar-chart">
              <div v-for="g in fallasPorCategoria" :key="g.label" class="bar-row">
                <div class="bar-label">{{ g.label }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (g.count / barMax * 100) + '%', background: g.color || '#915BD8' }" />
                </div>
                <div class="bar-val">{{ g.count }}</div>
              </div>
            </div>
          </div>

          <!-- Timeline: fallas por mes -->
          <div class="chart-card chart-card--wide" v-if="fallasPorMes.length > 1">
            <div class="chart-card-header">
              <div class="chart-title" style="margin-bottom:0">Evolución mensual de fallas</div>
              <div class="chart-subtitle">Últimos 12 meses</div>
            </div>
            <div class="timeline-chart">
              <div class="timeline-bars">
                <div v-for="m in fallasPorMes" :key="m.key" class="tl-col">
                  <div class="tl-bar-wrap">
                    <div class="tl-bar"
                         :style="{ height: (m.count / timelineMax * 100) + '%' }"
                         :title="`${m.label}: ${m.count} fallas`">
                      <span class="tl-bar-val" v-if="m.count > 0">{{ m.count }}</span>
                    </div>
                  </div>
                  <div class="tl-label">{{ m.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top proyectos -->
          <div class="chart-card chart-card--wide" v-if="!filtroGraficosProyecto && fallasPorProyecto.length">
            <div class="chart-title">Top proyectos con más fallas</div>
            <div class="bar-chart">
              <div v-for="g in fallasPorProyecto.slice(0, 10)" :key="g.label" class="bar-row">
                <div class="bar-label">{{ g.label }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (g.count / fallasPorProyecto[0].count * 100) + '%', background: '#915BD8' }" />
                </div>
                <div class="bar-val">{{ g.count }}</div>
              </div>
            </div>
          </div>

          <!-- Top tipos de falla -->
          <div class="chart-card chart-card--wide" v-if="fallasPorTipo.length">
            <div class="chart-title">Top tipos de falla</div>
            <div class="bar-chart">
              <div v-for="g in fallasPorTipo.slice(0, 8)" :key="g.label" class="bar-row">
                <div class="bar-label">{{ g.label }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (g.count / fallasPorTipo[0].count * 100) + '%', background: '#3b82f6' }" />
                </div>
                <div class="bar-val">{{ g.count }}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div><!-- /TAB 1 -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import FallaForm from './FallaForm.vue'
import api from '@/api/client'

// ── Tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { label: 'Fallas',   icon: '⚡' },
  { label: 'Gráficos', icon: '📊' },
]
const activeTab = ref(0)
const router    = useRouter()
const toast     = useToast()

// ════════════════════════════════════════════════════════════
// TAB 0 — FALLAS
// ════════════════════════════════════════════════════════════
const todasLasFallas = ref([])
const loading         = ref(false)
const error           = ref(null)
const saving          = ref(false)
const showDialog      = ref(false)
const catalogos       = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos       = ref([])

const buscar          = ref('')
const filtroEstado    = ref('')
const filtroPrioridad = ref('')
const filtroProyecto  = ref('')

const hayFiltros = computed(() =>
  buscar.value || filtroEstado.value || filtroPrioridad.value || filtroProyecto.value
)

const kpis = computed(() => ({
  abierta:    todasLasFallas.value.filter(f => f.estado?.codigo === 'abierta').length,
  en_gestion: todasLasFallas.value.filter(f => f.estado?.codigo === 'en_gestion').length,
  en_espera:  todasLasFallas.value.filter(f => f.estado?.codigo === 'en_espera').length,
  cerrada:    todasLasFallas.value.filter(f => f.estado?.codigo === 'cerrada').length,
  critica:    todasLasFallas.value.filter(f => f.prioridad?.codigo === 'critica').length,
}))

const fallasFiltradas = computed(() =>
  todasLasFallas.value.filter(f => {
    const q = buscar.value.toLowerCase().trim()
    if (q && !(
      (f.codigo_interno || '').toLowerCase().includes(q) ||
      (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q) ||
      (f.descripcion || '').toLowerCase().includes(q) ||
      (f.tipo?.etiqueta || '').toLowerCase().includes(q)
    )) return false
    if (filtroEstado.value    && f.estado?.codigo    !== filtroEstado.value)    return false
    if (filtroPrioridad.value && f.prioridad?.codigo !== filtroPrioridad.value) return false
    if (filtroProyecto.value  && f.proyecto?.id      !== filtroProyecto.value)  return false
    return true
  })
)

// Carga TODAS las fallas (incluidas cerradas), sin filtros implícitos
async function cargar() {
  loading.value = true
  error.value   = null
  try {
    const { data: primera } = await api.get('/fallas', { params: { page: 1, size: 500 } })
    const total = primera.total ?? 0
    const items = [...(primera.items ?? [])]
    if (total > 500) {
      const totalPages = Math.ceil(total / 500)
      const rest = await Promise.allSettled(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/fallas', { params: { page: i + 2, size: 500 } })
        )
      )
      for (const r of rest) {
        if (r.status === 'fulfilled') items.push(...(r.value.data.items ?? []))
      }
    }
    todasLasFallas.value = items
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    loading.value = false
  }
}

async function cargarCatalogos() {
  try {
    const { data } = await api.get('/fallas/catalogos')
    catalogos.value = data
  } catch { /* no crítico */ }
}

async function cargarProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = data.items ?? []
  } catch { /* no crítico */ }
}

function irDetalle(id) { router.push(`/fallas/${id}`) }

function setFiltroEstado(val) {
  filtroPrioridad.value = ''
  filtroEstado.value = filtroEstado.value === val ? '' : val
}
function setFiltroPrioridad(val) {
  filtroEstado.value = ''
  filtroPrioridad.value = filtroPrioridad.value === val ? '' : val
}
function limpiarFiltros() {
  buscar.value = ''; filtroEstado.value = ''; filtroPrioridad.value = ''; filtroProyecto.value = ''
}

async function onCreate(payload) {
  saving.value = true
  try {
    const notaInicial = payload.nota_inicial
    delete payload.nota_inicial
    const { data: nueva } = await api.post('/fallas', payload)
    if (notaInicial) await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
    showDialog.value = false
    toast.add({ severity: 'success', summary: 'Falla registrada', life: 3000 })
    await cargar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail ?? 'Error al registrar', life: 4000 })
  } finally {
    saving.value = false
  }
}

// ════════════════════════════════════════════════════════════
// TAB 1 — GRÁFICOS
// ════════════════════════════════════════════════════════════
const filtroGraficosProyecto = ref('')

const fallasFiltGraficos = computed(() => {
  if (!filtroGraficosProyecto.value) return todasLasFallas.value
  return todasLasFallas.value.filter(f => f.proyecto?.id === filtroGraficosProyecto.value)
})

function groupBy(arr, keyFn, colorFn, labelFn) {
  const g = {}
  for (const f of arr) {
    const k = keyFn(f) || 'Sin dato'
    if (!g[k]) g[k] = { label: labelFn ? labelFn(f) : k, color: colorFn ? colorFn(f) : '#915BD8', count: 0 }
    g[k].count++
  }
  return Object.values(g).sort((a, b) => b.count - a.count)
}

const fallasPorCategoria = computed(() =>
  groupBy(fallasFiltGraficos.value,
    f => f.tipo?.categoria?.etiqueta,
    f => f.tipo?.categoria?.color_hex || '#915BD8')
)
const fallasPorProyecto = computed(() =>
  groupBy(todasLasFallas.value, f => f.proyecto?.nombre_comercial)
)
const fallasPorTipo = computed(() =>
  groupBy(fallasFiltGraficos.value, f => f.tipo?.etiqueta)
)
const topProyecto = computed(() => fallasPorProyecto.value[0] || null)
const barMax      = computed(() => Math.max(...fallasPorCategoria.value.map(g => g.count), 1))

const grafKpis = computed(() => {
  const arr = fallasFiltGraficos.value
  const resueltas = arr.filter(f => f.sla_cumplido === true || f.estado?.codigo === 'cerrada').length
  const criticas  = arr.filter(f => f.prioridad?.codigo === 'critica').length
  const tasa      = arr.length ? Math.round(resueltas / arr.length * 100) : 0
  const conDias   = arr.filter(f => f.dias_abierta != null)
  const avg       = conDias.length ? Math.round(conDias.reduce((s, f) => s + f.dias_abierta, 0) / conDias.length) : 0
  return { criticas, resueltas, tasaResolucion: tasa, avgDias: avg }
})

const PRIO_COLORS = { critica: '#dc2626', alta: '#ea580c', media: '#d97706', baja: '#6b7280' }

function buildDonut(arr, keyFn, colorFn) {
  const segments = groupBy(arr, keyFn, colorFn)
  const total = segments.reduce((s, g) => s + g.count, 0)
  if (!total) return []
  let offset = 25
  return segments.map(seg => {
    const pct = (seg.count / total) * 100
    const out = { ...seg, pct, offset: 100 - offset }
    offset += pct
    return out
  })
}

const donutEstado = computed(() =>
  buildDonut(fallasFiltGraficos.value, f => f.estado?.etiqueta, f => f.estado?.color_hex || '#915BD8')
)
const donutPrioridad = computed(() =>
  buildDonut(fallasFiltGraficos.value, f => f.prioridad?.etiqueta, f => PRIO_COLORS[f.prioridad?.codigo] || '#915BD8')
)

const fallasPorMes = computed(() => {
  const g = {}
  for (const f of fallasFiltGraficos.value) {
    if (!f.fecha_identificacion) continue
    const key = f.fecha_identificacion.slice(0, 7)
    g[key] = (g[key] || 0) + 1
  }
  return Object.entries(g)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([key, count]) => ({
      key, count,
      label: new Date(key + '-15').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    }))
})
const timelineMax = computed(() => Math.max(...fallasPorMes.value.map(m => m.count), 1))

// ════════════════════════════════════════════════════════════
// HELPERS VISUALES
// ════════════════════════════════════════════════════════════
function pillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}40` }
}
function catStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '18', color: c }
}
function slaRisk(f) {
  if (!f.sla_limite_horas || f.sla_cumplido !== null) return false
  if (!f.fecha_identificacion) return false
  const inicio   = new Date(f.fecha_identificacion + 'T00:00:00')
  const deadline = new Date(inicio.getTime() + f.sla_limite_horas * 3_600_000)
  const rem      = (deadline - Date.now()) / 3_600_000
  return rem > 0 && rem < f.sla_limite_horas * 0.2
}
function diasClass(f) {
  if (f.estado?.codigo === 'cerrada') return 'dias-cerrada'
  const d = f.dias_abierta ?? 0
  if (d >= 7) return 'dias-red'
  if (d >= 3) return 'dias-yellow'
  return 'dias-green'
}
function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(() => {
  cargarProyectos()
  cargarCatalogos()
  cargar()
})
</script>

<style scoped>
/* ── Base ─────────────────────────────────────────────────────────── */
.mon-page {
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto;
  background: #f5f4f8; font-family: 'Sora', system-ui, sans-serif;
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.mon-hero {
  background: linear-gradient(135deg, #1e1530 0%, #2C2039 55%, #3a2653 100%);
  padding: 24px 32px 22px; display: flex; align-items: center;
  justify-content: space-between; gap: 16px; flex-wrap: wrap;
  border-bottom: 1px solid rgba(145,91,216,.18); flex-shrink: 0;
}
.mon-hero-title { font-size: 22px; font-weight: 800; color: #f5f0ff; margin: 0 0 3px; letter-spacing: -0.3px; }
.mon-hero-sub   { font-size: 12.5px; color: rgba(245,240,255,.45); margin: 0; }
.mon-hero-actions { display: flex; gap: 9px; flex-wrap: wrap; }

/* ── Botones ──────────────────────────────────────────────────────── */
.mon-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 8px; padding: 8px 16px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all .15s; white-space: nowrap; border: none;
}
.mon-btn:disabled { opacity: .45; cursor: not-allowed; }
.mon-btn-ghost { background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.18) !important; color: rgba(245,240,255,.85); }
.mon-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.15); }
.mon-btn-primary { background: #7c3aed; border: 1px solid #6d28d9 !important; color: #fff; }
.mon-btn-primary:hover:not(:disabled) { background: #6d28d9; }
.mon-btn-outline {
  background: transparent; border: 1.5px solid #e5e0f0; border-radius: 8px;
  padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: #6d5a8e;
  cursor: pointer; font-family: inherit; transition: all .14s;
}
.mon-btn-outline:hover { border-color: #915BD8; color: #6d28d9; background: #f5f0ff; }

/* ── Tab bar ──────────────────────────────────────────────────────── */
.mon-tabs {
  display: flex; background: #1e1530;
  padding: 0 32px; border-bottom: 1px solid rgba(145,91,216,.22);
  flex-shrink: 0; overflow-x: auto;
}
.mon-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; font-size: 13px; font-weight: 600; font-family: inherit;
  color: rgba(245,240,255,.42); background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap;
  transition: color .14s, border-color .14s; margin-bottom: -1px;
}
.mon-tab:hover:not(.mon-tab--active) { color: rgba(245,240,255,.72); }
.mon-tab--active { color: #f5f0ff; border-bottom-color: #915BD8; }
.mon-tab-icon { font-size: 14px; }

/* ── KPIs ─────────────────────────────────────────────────────────── */
.mon-kpis {
  display: grid; grid-template-columns: repeat(6, 1fr);
  background: #fff; border-bottom: 1px solid #ece8f4; flex-shrink: 0;
}
@media (max-width: 1000px) { .mon-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 540px)  { .mon-kpis { grid-template-columns: repeat(2, 1fr); } }
.kpi {
  display: flex; flex-direction: column; align-items: center;
  padding: 18px 10px 14px; border-right: 1px solid #ece8f4;
  position: relative; transition: background .13s; overflow: hidden;
  background: none; cursor: pointer; font-family: inherit;
}
.kpi:last-child { border-right: none; }
.kpi--active { background: #faf8ff; }
.kpi-val { font-size: 28px; font-weight: 900; line-height: 1; color: #2C2039; margin-bottom: 4px; }
.kpi-val--red { color: #dc2626; }
.kpi-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .55px; color: #a094b8; }
.kpi--active .kpi-label { color: #6d5a8e; }
.kpi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; opacity: 0; transition: opacity .15s; }
.kpi--active .kpi-bar { opacity: 1; }
.kpi-bar--purple { background: #915BD8; }
.kpi-bar--orange { background: #f97316; }
.kpi-bar--red    { background: #ef4444; }
.kpi-bar--blue   { background: #3b82f6; }
.kpi-bar--green  { background: #22c55e; }
.kpi--purple .kpi-val { color: #7c3aed; }
.kpi--orange .kpi-val { color: #ea580c; }
.kpi--red    .kpi-val { color: #dc2626; }
.kpi--blue   .kpi-val { color: #2563eb; }
.kpi--green  .kpi-val { color: #16a34a; }

/* ── Filtros ──────────────────────────────────────────────────────── */
.mon-filters {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 14px 32px; background: #fff;
  border-bottom: 1px solid #ece8f4; flex-shrink: 0;
}
.mon-filter-field { display: flex; flex-direction: column; gap: 4px; }
.mon-filter-search { flex: 1; min-width: 200px; }
.mon-filter-label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #a094b8;
}
.mon-input, .mon-select {
  background: #faf9fc; border: 1.5px solid #e5e0f0; border-radius: 8px;
  padding: 7px 11px; color: #2C2039; font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .14s;
}
.mon-input  { width: 100%; }
.mon-select { min-width: 148px; cursor: pointer; }
.mon-input:focus, .mon-select:focus { border-color: #915BD8; }
.mon-filter-actions {
  display: flex; align-items: center; gap: 10px;
  margin-left: auto; align-self: flex-end; padding-bottom: 1px;
}
.mon-btn-clear {
  background: transparent; border: 1.5px solid #e5e0f0; border-radius: 8px;
  padding: 7px 13px; font-size: 12px; font-weight: 700; color: #7d7190;
  cursor: pointer; font-family: inherit; transition: all .14s;
}
.mon-btn-clear:hover { border-color: #915BD8; color: #6d28d9; }
.mon-count { font-size: 12px; color: #a094b8; font-weight: 600; white-space: nowrap; }

/* ── Tabla ────────────────────────────────────────────────────────── */
.mon-table-area { flex: 1; padding: 20px 32px 28px; min-height: 0; }
.mon-loading {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 80px 20px; color: #a094b8; font-size: 13px;
}
.mon-spinner {
  width: 32px; height: 32px; border: 3px solid #ece8f4;
  border-top-color: #915BD8; border-radius: 50%;
  animation: spin .75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .75s linear infinite; }
.mon-error {
  display: flex; align-items: center; gap: 14px;
  background: #fff5f5; border: 1px solid #fecaca; border-radius: 10px;
  padding: 16px 20px; font-size: 13px; margin-bottom: 16px;
}
.mon-error-title { font-weight: 700; color: #dc2626; font-size: 13px; }
.mon-error-msg   { font-size: 12px; color: #ef4444; }
.mon-empty { text-align: center; padding: 70px 20px; }
.mon-empty-icon  { font-size: 40px; opacity: .2; margin-bottom: 12px; }
.mon-empty-title { font-size: 15px; font-weight: 700; color: #6b7280; margin-bottom: 5px; }
.mon-empty-sub   { font-size: 12.5px; color: #9ca3af; }

.mon-table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(44,32,57,.07), 0 0 0 1px rgba(44,32,57,.05);
}
.mon-table thead tr { background: #faf8fc; }
.mon-table thead th {
  padding: 11px 14px; text-align: left; font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; color: #a094b8;
  white-space: nowrap; border-bottom: 1px solid #ece8f4;
}
.mon-row { transition: background .1s; cursor: pointer; }
.mon-row:not(:last-child) td { border-bottom: 1px solid #f3f0f8; }
.mon-row:hover td { background: #faf7ff; }
.mon-row td { padding: 11px 14px; vertical-align: middle; font-size: 13px; color: #2C2039; }
/* Fallas cerradas: atenuadas */
.mon-row--cerrada td { opacity: .55; }
.mon-row--cerrada:hover td { opacity: .75; }

.td-codigo   { font-family: 'Courier New', monospace; font-size: 11.5px; font-weight: 700; color: #7c3aed; white-space: nowrap; }
.td-proyecto { font-weight: 600; min-width: 140px; }
.td-tipo     { min-width: 150px; }
.cat-tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: .25px; text-transform: uppercase; margin-bottom: 3px; }
.tipo-sub  { font-size: 11px; color: #8b7fa8; margin-top: 2px; }
.td-fecha  { font-size: 12px; color: #4b3b72; white-space: nowrap; }
.td-asig   { font-size: 12px; min-width: 110px; color: #4b3b72; }
.td-dash   { color: #c9c0d8; font-style: italic; font-size: 12px; }
.td-arrow  { width: 44px; }

.estado-pill, .prio-pill {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: 20px; letter-spacing: .25px;
  white-space: nowrap; text-transform: uppercase;
}
.prio-1 { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.prio-2 { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.prio-3 { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.prio-4 { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }

/* Días con color */
.dias-badge {
  display: inline-block; font-size: 10px; font-weight: 800;
  padding: 3px 8px; border-radius: 20px; white-space: nowrap;
}
.dias-green  { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.dias-yellow { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.dias-red    { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.dias-cerrada { background: #f3f4f6; color: #9ca3af; border: 1px solid #e5e7eb; }

.sla { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
.sla-ok   { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.sla-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.sla-warn { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }

.arrow-btn {
  background: transparent; border: 1px solid #e5e0f0; border-radius: 7px;
  padding: 4px 10px; font-size: 14px; font-weight: 700; color: #7c3aed;
  cursor: pointer; transition: all .12s;
}
.arrow-btn:hover { background: #f5f0ff; border-color: #7c3aed; }

/* ── Tab panel gráficos ───────────────────────────────────────────── */
.mon-tab-view { flex: 1; overflow-y: auto; padding: 24px 32px 40px; background: #f5f4f8; }
.mon-tab-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 80px 20px; color: #a094b8; font-size: 13px; }
.mon-tab-empty { text-align: center; padding: 80px 20px; }

.chart-filters { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.chart-total-badge {
  display: flex; flex-direction: column; align-items: center;
  background: #fff; border: 1px solid #ece8f4; border-radius: 10px; padding: 8px 16px;
}
.chart-total-num { font-size: 22px; font-weight: 900; color: #7c3aed; line-height: 1; }
.chart-total-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #a094b8; }
.chart-kpi-mini { display: flex; gap: 12px; flex-wrap: wrap; }
.chart-kpi-mini-item {
  background: #fff; border: 1px solid #ece8f4; border-radius: 10px;
  padding: 8px 14px; text-align: center; min-width: 70px;
}
.chart-kpi-mini-val { font-size: 20px; font-weight: 900; line-height: 1; }
.chart-kpi-mini-lbl { font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #a094b8; letter-spacing: .4px; margin-top: 2px; }

.top-proyecto-card {
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
  border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; color: #fff;
}
.top-proy-icon  { font-size: 28px; flex-shrink: 0; }
.top-proy-body  { flex: 1; }
.top-proy-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .7; margin-bottom: 3px; }
.top-proy-name  { font-size: 17px; font-weight: 800; }
.top-proy-count { text-align: right; flex-shrink: 0; }
.top-proy-num   { font-size: 36px; font-weight: 900; line-height: 1; }
.top-proy-sub   { font-size: 11px; opacity: .7; font-weight: 600; }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.chart-card {
  background: #fff; border-radius: 12px; border: 1px solid #ece8f4;
  padding: 20px 22px; box-shadow: 0 1px 3px rgba(44,32,57,.04);
}
.chart-card--wide { grid-column: 1 / -1; }
.chart-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.chart-title    { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .55px; color: #a094b8; margin-bottom: 16px; }
.chart-subtitle { font-size: 10.5px; color: #c0b8d4; }

/* Donuts */
.donut-wrap { display: flex; align-items: center; gap: 20px; margin-bottom: 8px; }
.donut-svg  { width: 100px; height: 100px; flex-shrink: 0; }
.donut-total { position: absolute; left: 32px; top: 50%; transform: translate(-50%, -50%); text-align: center; }
.donut-wrap { position: relative; }
.donut-total-num { font-size: 20px; font-weight: 900; color: #2C2039; line-height: 1; }
.donut-total-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #a094b8; letter-spacing: .4px; }
.donut-legend { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.legend-row   { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-label { flex: 1; color: #4b3b72; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-val   { font-weight: 700; color: #2C2039; }
.legend-pct   { font-size: 10.5px; color: #a094b8; min-width: 28px; text-align: right; }

/* Barras */
.bar-chart { display: flex; flex-direction: column; gap: 10px; }
.bar-row   { display: grid; grid-template-columns: 140px 1fr 32px; align-items: center; gap: 8px; }
.bar-label { font-size: 11.5px; font-weight: 600; color: #4a3b6b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 10px; background: #f0eaf8; border-radius: 5px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 5px; transition: width .6s ease; min-width: 4px; }
.bar-val   { font-size: 12px; font-weight: 700; color: #6d28d9; text-align: right; }

/* Timeline */
.timeline-chart { padding: 8px 0; }
.timeline-bars  { display: flex; align-items: flex-end; gap: 4px; height: 130px; padding: 0 4px; }
.tl-col { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
.tl-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.tl-bar {
  width: 100%; min-height: 4px; border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #a78bfa, #7c3aed);
  transition: height .6s ease; position: relative;
  display: flex; align-items: flex-start; justify-content: center;
}
.tl-bar-val { font-size: 9px; font-weight: 700; color: #fff; padding: 2px 0; }
.tl-label   { font-size: 9px; font-weight: 600; color: #a094b8; text-align: center; white-space: nowrap; }

/* Responsive */
@media (max-width: 768px) {
  .mon-hero, .mon-filters, .mon-table-area { padding-left: 16px; padding-right: 16px; }
  .mon-tabs { padding-left: 12px; }
  .mon-tab  { padding: 10px 14px; }
  .mon-tab-view { padding: 16px; }
  .bar-row  { grid-template-columns: 100px 1fr 28px; }
}
</style>
