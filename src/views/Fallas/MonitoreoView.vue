<template>
  <div class="mon-page">

    <!-- ══ HERO ══════════════════════════════════════════════════════════ -->
    <div class="mon-hero">
      <div>
        <h1 class="mon-hero-title">Monitoreo de Fallas</h1>
        <p class="mon-hero-sub">Seguimiento operacional en tiempo real · Unergy</p>
      </div>
      <div class="mon-hero-actions">
        <button class="mon-btn mon-btn-ghost" :disabled="loadingStats || loadingFallas" @click="recargar">
          <span :class="(loadingStats || loadingFallas) ? 'spin' : ''">↻</span>
          Actualizar
        </button>
        <button class="mon-btn mon-btn-primary" @click="showDialog = true">
          <i class="pi pi-plus" /> Registrar falla
        </button>
      </div>
    </div>

    <!-- ══ KPI CARDS ══════════════════════════════════════════════════════ -->
    <div class="mon-kpis">
      <div class="kpi" :class="filtroEstadoCodigo === '' && filtroPrioridadCodigo === '' && !filtroAlerta ? 'kpi--active kpi--purple' : ''">
        <div class="kpi-val">{{ stats?.total_activas ?? '—' }}</div>
        <div class="kpi-label">Activas</div>
        <div class="kpi-bar kpi-bar--purple" />
      </div>
      <div class="kpi" :class="filtroEstadoCodigo === 'en_gestion' ? 'kpi--active kpi--orange' : ''"
           @click="toggleEstado('en_gestion')" style="cursor:pointer">
        <div class="kpi-val">{{ stats?.en_revision ?? '—' }}</div>
        <div class="kpi-label">En gestión</div>
        <div class="kpi-bar kpi-bar--orange" />
      </div>
      <div class="kpi" :class="filtroAlerta ? 'kpi--active kpi--red' : ''"
           @click="toggleAlerta" style="cursor:pointer">
        <div class="kpi-val">{{ stats?.alerta_7_dias ?? '—' }}</div>
        <div class="kpi-label">Alertas &gt;7 días</div>
        <div class="kpi-bar kpi-bar--red" />
      </div>
      <div class="kpi">
        <div class="kpi-val">{{ stats?.resueltas_mes ?? '—' }}</div>
        <div class="kpi-label">Resueltas este mes</div>
        <div class="kpi-bar kpi-bar--green" />
      </div>
      <div class="kpi">
        <div class="kpi-val">
          <span v-if="stats?.cumplimiento_sla_pct != null">{{ stats.cumplimiento_sla_pct }}<span class="kpi-unit">%</span></span>
          <span v-else>—</span>
        </div>
        <div class="kpi-label">Cumplimiento SLA</div>
        <div class="kpi-bar" :class="slaBarClass" />
      </div>
    </div>

    <!-- ══ BANDA SLA ═══════════════════════════════════════════════════════ -->
    <div v-if="sla && (sla.fallas_sla_vencido > 0 || sla.fallas_en_riesgo_sla > 0)" class="mon-sla-band">
      <div class="sla-chip sla-chip--red" @click="toggleEstadoCodigo('abierta')">
        <i class="pi pi-exclamation-triangle" />
        <span><b>{{ sla.fallas_sla_vencido }}</b> SLA vencido</span>
      </div>
      <div class="sla-chip sla-chip--yellow">
        <i class="pi pi-clock" />
        <span><b>{{ sla.fallas_en_riesgo_sla }}</b> en riesgo</span>
      </div>
      <div v-if="sla.promedio_tiempo_resolucion_horas != null" class="sla-chip sla-chip--neutral">
        <i class="pi pi-history" />
        <span>Tiempo promedio resolución: <b>{{ sla.promedio_tiempo_resolucion_horas }}h</b></span>
      </div>
    </div>

    <!-- ══ FILTROS ════════════════════════════════════════════════════════ -->
    <div class="mon-filters">
      <div class="mon-filter-field mon-filter-search">
        <label class="mon-filter-label">Buscar</label>
        <input v-model="buscar" type="text" class="mon-input"
               placeholder="Código, descripción…"
               @input="onBuscarInput" />
      </div>
      <div class="mon-filter-field">
        <label class="mon-filter-label">Estado</label>
        <select v-model="filtroEstadoId" class="mon-select" @change="onFilterChange">
          <option value="">Todos</option>
          <option v-for="e in catalogos.estados" :key="e.id" :value="e.id">{{ e.etiqueta }}</option>
        </select>
      </div>
      <div class="mon-filter-field">
        <label class="mon-filter-label">Prioridad</label>
        <select v-model="filtroPrioridadId" class="mon-select" @change="onFilterChange">
          <option value="">Todas</option>
          <option v-for="p in catalogos.prioridades" :key="p.id" :value="p.id">{{ p.etiqueta }}</option>
        </select>
      </div>
      <div class="mon-filter-field">
        <label class="mon-filter-label">Proyecto</label>
        <select v-model="filtroProyectoId" class="mon-select" @change="onFilterChange">
          <option value="">Todos</option>
          <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
        </select>
      </div>
      <div class="mon-filter-actions">
        <button v-if="hayFiltros" class="mon-btn-clear" @click="limpiarFiltros">✕ Limpiar</button>
        <span v-if="!loadingFallas" class="mon-count">{{ total }} falla{{ total !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- ══ TABLA ══════════════════════════════════════════════════════════ -->
    <div class="mon-table-area">

      <!-- Loading overlay -->
      <div v-if="loadingFallas" class="mon-loading">
        <div class="mon-spinner" />
        <span>Cargando fallas…</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="mon-error">
        <span>⚠️</span>
        <div>
          <div class="mon-error-title">Error al cargar</div>
          <div class="mon-error-msg">{{ error }}</div>
        </div>
        <button class="mon-btn mon-btn-ghost-dark" @click="recargar">Reintentar</button>
      </div>

      <!-- Vacío -->
      <div v-else-if="!fallas.length" class="mon-empty">
        <div class="mon-empty-icon">⚡</div>
        <p class="mon-empty-title">{{ hayFiltros ? 'Sin resultados' : 'Sin fallas registradas' }}</p>
        <p class="mon-empty-sub">{{ hayFiltros ? 'Intenta con otros filtros' : 'El sistema opera sin incidencias activas' }}</p>
        <button v-if="hayFiltros" class="mon-btn-clear" style="margin-top:12px" @click="limpiarFiltros">✕ Limpiar filtros</button>
      </div>

      <!-- Tabla -->
      <table v-else class="mon-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Proyecto</th>
            <th>Categoría / Tipo</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Identificada</th>
            <th>SLA</th>
            <th>Asignado a</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in fallas" :key="f.id" class="mon-row" @click="irDetalle(f.id)">

            <td class="td-codigo">{{ f.codigo_interno }}</td>

            <td class="td-proyecto">{{ f.proyecto?.nombre_comercial || '—' }}</td>

            <td class="td-tipo">
              <span v-if="f.tipo?.categoria" class="cat-tag"
                :style="catStyle(f.tipo.categoria.color_hex)">
                {{ f.tipo.categoria.etiqueta }}
              </span>
              <div class="tipo-sub">{{ f.tipo?.etiqueta || '—' }}</div>
            </td>

            <td>
              <span class="estado-pill"
                :style="pillStyle(f.estado?.color_hex)">
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
              <span v-if="f.sla_cumplido === true"   class="sla sla-ok">✓ OK</span>
              <span v-else-if="f.sla_cumplido === false" class="sla sla-fail">Vencido</span>
              <span v-else-if="slaRisk(f)"           class="sla sla-warn">En riesgo</span>
              <span v-else class="td-dash">—</span>
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

      <!-- Paginación -->
      <div v-if="totalPages > 1 && !loadingFallas && fallas.length" class="mon-pagination">
        <button class="pag-btn" :disabled="page === 1" @click="goPage(1)">«</button>
        <button class="pag-btn" :disabled="page === 1" @click="goPage(page - 1)">‹</button>

        <span class="pag-info">
          Página <strong>{{ page }}</strong> de <strong>{{ totalPages }}</strong>
          &nbsp;·&nbsp; {{ total }} resultado{{ total !== 1 ? 's' : '' }}
        </span>

        <button class="pag-btn" :disabled="page === totalPages" @click="goPage(page + 1)">›</button>
        <button class="pag-btn" :disabled="page === totalPages" @click="goPage(totalPages)">»</button>
      </div>
    </div>

    <!-- ══ DIALOG NUEVA FALLA ═══════════════════════════════════════════ -->
    <Dialog v-model:visible="showDialog" header="Registrar nueva falla" modal
            class="w-full max-w-2xl" :closable="!saving">
      <FallaForm :catalogos="catalogos" @save="onCreate" @cancel="showDialog = false" />
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import FallaForm from './FallaForm.vue'
import api from '@/api/client'

const router = useRouter()
const toast  = useToast()

// ── Estado principal ──────────────────────────────────────────────────
const fallas       = ref([])
const total        = ref(0)
const page         = ref(1)
const pageSize     = 20
const loadingFallas = ref(false)
const loadingStats  = ref(false)
const error        = ref(null)
const stats        = ref(null)
const sla          = ref(null)
const catalogos    = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos    = ref([])
const showDialog   = ref(false)
const saving       = ref(false)

// ── Filtros ───────────────────────────────────────────────────────────
const buscar             = ref('')
const filtroEstadoId     = ref('')
const filtroPrioridadId  = ref('')
const filtroProyectoId   = ref('')
const filtroAlerta       = ref(false)

// Código del estado seleccionado (para KPI toggle)
const filtroEstadoCodigo = computed(() => {
  if (!filtroEstadoId.value) return ''
  return catalogos.value.estados.find(e => e.id === filtroEstadoId.value)?.codigo || ''
})
const filtroPrioridadCodigo = computed(() => {
  if (!filtroPrioridadId.value) return ''
  return catalogos.value.prioridades.find(p => p.id === filtroPrioridadId.value)?.codigo || ''
})

const hayFiltros = computed(() =>
  buscar.value || filtroEstadoId.value || filtroPrioridadId.value ||
  filtroProyectoId.value || filtroAlerta.value
)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const slaBarClass = computed(() => {
  const pct = stats.value?.cumplimiento_sla_pct
  if (pct == null) return 'kpi-bar--neutral'
  if (pct >= 80) return 'kpi-bar--green'
  if (pct >= 50) return 'kpi-bar--yellow'
  return 'kpi-bar--red'
})

// ── Carga fallas (paginada, server-side) ──────────────────────────────
async function cargarFallas() {
  loadingFallas.value = true
  error.value = null
  try {
    const params = { page: page.value, size: pageSize }
    if (buscar.value.trim()) params.q = buscar.value.trim()
    if (filtroEstadoId.value)    params.estado_id    = filtroEstadoId.value
    if (filtroPrioridadId.value) params.prioridad_id = filtroPrioridadId.value
    if (filtroProyectoId.value)  params.proyecto_id  = filtroProyectoId.value
    if (filtroAlerta.value)      params.solo_alerta  = true

    const { data } = await api.get('/fallas', { params })
    fallas.value = data.items ?? []
    total.value  = data.total ?? 0
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
  } finally {
    loadingFallas.value = false
  }
}

// ── Carga stats y SLA ─────────────────────────────────────────────────
async function cargarStats() {
  loadingStats.value = true
  try {
    const [resStats, resSla] = await Promise.allSettled([
      api.get('/fallas/stats/resumen'),
      api.get('/fallas/sla-dashboard'),
    ])
    if (resStats.status === 'fulfilled') stats.value = resStats.value.data
    if (resSla.status   === 'fulfilled') sla.value   = resSla.value.data
  } finally {
    loadingStats.value = false
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

async function recargar() {
  page.value = 1
  await Promise.all([cargarFallas(), cargarStats()])
}

// ── Navegación ────────────────────────────────────────────────────────
function irDetalle(id) { router.push(`/fallas/${id}`) }
function goPage(p)     { page.value = p; cargarFallas() }

// ── Filtros ───────────────────────────────────────────────────────────
let debounceTimer = null
function onBuscarInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; cargarFallas() }, 380)
}
function onFilterChange() { page.value = 1; cargarFallas() }

function toggleEstado(codigo) {
  const estado = catalogos.value.estados.find(e => e.codigo === codigo)
  if (!estado) return
  filtroEstadoId.value = filtroEstadoId.value === estado.id ? '' : estado.id
  filtroAlerta.value = false
  onFilterChange()
}
function toggleAlerta() {
  filtroAlerta.value = !filtroAlerta.value
  filtroEstadoId.value = ''
  page.value = 1
  cargarFallas()
}

function limpiarFiltros() {
  buscar.value = ''
  filtroEstadoId.value = ''
  filtroPrioridadId.value = ''
  filtroProyectoId.value = ''
  filtroAlerta.value = false
  page.value = 1
  cargarFallas()
}

// ── Helpers visuales ──────────────────────────────────────────────────
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
  const inicio = new Date(f.fecha_identificacion + 'T00:00:00')
  const deadline = new Date(inicio.getTime() + f.sla_limite_horas * 3_600_000)
  const remaining = (deadline - Date.now()) / 3_600_000
  return remaining > 0 && remaining < f.sla_limite_horas * 0.2
}
function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Crear falla ───────────────────────────────────────────────────────
async function onCreate(payload) {
  saving.value = true
  try {
    const notaInicial = payload.nota_inicial
    delete payload.nota_inicial
    const { data: nueva } = await api.post('/fallas', payload)
    if (notaInicial) {
      await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
    }
    showDialog.value = false
    toast.add({ severity: 'success', summary: 'Falla registrada', life: 3000 })
    await recargar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail ?? 'Error al registrar', life: 4000 })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  cargarCatalogos()
  cargarProyectos()
  cargarStats()
  cargarFallas()
})
</script>

<style scoped>
/* ── Reset & base ───────────────────────────────────────────────── */
.mon-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: #f5f4f8;
  font-family: 'Sora', system-ui, sans-serif;
}

/* ── Hero ────────────────────────────────────────────────────────── */
.mon-hero {
  background: linear-gradient(135deg, #1e1530 0%, #2C2039 55%, #3a2653 100%);
  padding: 24px 32px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(145,91,216,.18);
  flex-shrink: 0;
}
.mon-hero-title {
  font-size: 22px;
  font-weight: 800;
  color: #f5f0ff;
  margin: 0 0 3px;
  letter-spacing: -0.3px;
}
.mon-hero-sub {
  font-size: 12.5px;
  color: rgba(245,240,255,.45);
  margin: 0;
}
.mon-hero-actions { display: flex; gap: 9px; flex-wrap: wrap; }

/* ── Botones ─────────────────────────────────────────────────────── */
.mon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
  border: none;
}
.mon-btn:disabled { opacity: .45; cursor: not-allowed; }
.mon-btn-ghost {
  background: rgba(255,255,255,.09);
  border: 1px solid rgba(255,255,255,.18) !important;
  color: rgba(245,240,255,.85);
}
.mon-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.15); }
.mon-btn-primary {
  background: #7c3aed;
  border: 1px solid #6d28d9 !important;
  color: #fff;
}
.mon-btn-primary:hover:not(:disabled) { background: #6d28d9; }
.mon-btn-ghost-dark {
  background: #f5f0ff;
  border: 1px solid #ddd6fe !important;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

/* ── KPIs ────────────────────────────────────────────────────────── */
.mon-kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: #fff;
  border-bottom: 1px solid #ece8f4;
  flex-shrink: 0;
}
@media (max-width: 900px) { .mon-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 540px) { .mon-kpis { grid-template-columns: repeat(2, 1fr); } }

.kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 10px 14px;
  border-right: 1px solid #ece8f4;
  position: relative;
  transition: background .13s;
  overflow: hidden;
  user-select: none;
}
.kpi:last-child { border-right: none; }
.kpi--active { background: #faf8ff; }

.kpi-val {
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  color: #2C2039;
  margin-bottom: 4px;
}
.kpi-unit { font-size: 16px; font-weight: 700; }
.kpi-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .55px;
  color: #a094b8;
}
.kpi--active .kpi-label { color: #6d5a8e; }

.kpi-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  opacity: 0;
  border-radius: 2px 2px 0 0;
  transition: opacity .15s;
}
.kpi--active .kpi-bar { opacity: 1; }
.kpi-bar--purple  { background: #915BD8; }
.kpi-bar--orange  { background: #f97316; }
.kpi-bar--red     { background: #ef4444; }
.kpi-bar--green   { background: #22c55e; }
.kpi-bar--yellow  { background: #eab308; }
.kpi-bar--neutral { background: #a094b8; }

.kpi--purple .kpi-val { color: #7c3aed; }
.kpi--orange .kpi-val { color: #ea580c; }
.kpi--red    .kpi-val { color: #dc2626; }

/* ── Banda SLA ───────────────────────────────────────────────────── */
.mon-sla-band {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 32px;
  background: #fffbf5;
  border-bottom: 1px solid #fde9c8;
  flex-shrink: 0;
}
.sla-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  cursor: default;
}
.sla-chip--red    { background: #fff1f2; color: #dc2626; border: 1px solid #fecaca; cursor:pointer; }
.sla-chip--yellow { background: #fefce8; color: #b45309; border: 1px solid #fde68a; }
.sla-chip--neutral{ background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }

/* ── Filtros ─────────────────────────────────────────────────────── */
.mon-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 32px;
  background: #fff;
  border-bottom: 1px solid #ece8f4;
  flex-shrink: 0;
}
.mon-filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mon-filter-search { flex: 1; min-width: 200px; }
.mon-filter-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #a094b8;
}
.mon-input, .mon-select {
  background: #faf9fc;
  border: 1.5px solid #e5e0f0;
  border-radius: 8px;
  padding: 7px 11px;
  color: #2C2039;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color .14s;
}
.mon-input  { width: 100%; }
.mon-select { min-width: 148px; cursor: pointer; }
.mon-input:focus, .mon-select:focus { border-color: #915BD8; }

.mon-filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  align-self: flex-end;
  padding-bottom: 1px;
}
.mon-btn-clear {
  background: transparent;
  border: 1.5px solid #e5e0f0;
  border-radius: 8px;
  padding: 7px 13px;
  font-size: 12px;
  font-weight: 700;
  color: #7d7190;
  cursor: pointer;
  font-family: inherit;
  transition: all .14s;
}
.mon-btn-clear:hover { border-color: #915BD8; color: #6d28d9; }
.mon-count {
  font-size: 12px;
  color: #a094b8;
  font-weight: 600;
  white-space: nowrap;
}

/* ── Área tabla ──────────────────────────────────────────────────── */
.mon-table-area {
  flex: 1;
  padding: 20px 32px 28px;
  min-height: 0;
}

/* Loading */
.mon-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  color: #a094b8;
  font-size: 13px;
}
.mon-spinner {
  width: 32px; height: 32px;
  border: 3px solid #ece8f4;
  border-top-color: #915BD8;
  border-radius: 50%;
  animation: spin .75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .75s linear infinite; }

/* Error */
.mon-error {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 16px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 16px 20px;
  font-size: 13px;
}
.mon-error-title { font-weight: 700; color: #dc2626; font-size: 13px; }
.mon-error-msg   { font-size: 12px; color: #ef4444; }

/* Vacío */
.mon-empty {
  text-align: center;
  padding: 70px 20px;
}
.mon-empty-icon  { font-size: 40px; opacity: .2; margin-bottom: 12px; }
.mon-empty-title { font-size: 15px; font-weight: 700; color: #6b7280; margin-bottom: 5px; }
.mon-empty-sub   { font-size: 12.5px; color: #9ca3af; }

/* Tabla */
.mon-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(44,32,57,.07), 0 0 0 1px rgba(44,32,57,.05);
}
.mon-table thead tr {
  background: #faf8fc;
}
.mon-table thead th {
  padding: 11px 14px;
  text-align: left;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #a094b8;
  white-space: nowrap;
  border-bottom: 1px solid #ece8f4;
}
.mon-row {
  transition: background .1s;
  cursor: pointer;
}
.mon-row:not(:last-child) td { border-bottom: 1px solid #f3f0f8; }
.mon-row:hover td { background: #faf7ff; }
.mon-row td {
  padding: 11px 14px;
  vertical-align: middle;
  font-size: 13px;
  color: #2C2039;
}

/* Celdas */
.td-codigo {
  font-family: 'Courier New', monospace;
  font-size: 11.5px;
  font-weight: 700;
  color: #7c3aed;
  white-space: nowrap;
}
.td-proyecto { font-weight: 600; min-width: 140px; }
.td-tipo     { min-width: 150px; }
.cat-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: .25px;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.tipo-sub { font-size: 11px; color: #8b7fa8; margin-top: 2px; }
.td-fecha { font-size: 12px; color: #4b3b72; white-space: nowrap; }
.td-asig  { font-size: 12px; min-width: 110px; color: #4b3b72; }
.td-dash  { color: #c9c0d8; font-style: italic; font-size: 12px; }

/* Pills */
.estado-pill, .prio-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: .25px;
  white-space: nowrap;
  text-transform: uppercase;
}
.prio-1 { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.prio-2 { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.prio-3 { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.prio-4 { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }

/* SLA */
.sla {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 20px;
  white-space: nowrap;
}
.sla-ok   { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.sla-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.sla-warn { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }

/* Acción */
.td-arrow { width: 44px; }
.arrow-btn {
  background: transparent;
  border: 1px solid #e5e0f0;
  border-radius: 7px;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 700;
  color: #7c3aed;
  cursor: pointer;
  transition: all .12s;
}
.arrow-btn:hover { background: #f5f0ff; border-color: #7c3aed; }

/* Paginación */
.mon-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 4px;
}
.pag-btn {
  background: #fff;
  border: 1.5px solid #e5e0f0;
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #6d28d9;
  cursor: pointer;
  transition: all .12s;
  font-family: inherit;
}
.pag-btn:hover:not(:disabled) { background: #f5f0ff; border-color: #915BD8; }
.pag-btn:disabled { opacity: .35; cursor: not-allowed; }
.pag-info {
  font-size: 12.5px;
  color: #7d7190;
  padding: 0 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .mon-hero, .mon-filters, .mon-table-area, .mon-sla-band { padding-left: 16px; padding-right: 16px; }
}
</style>
