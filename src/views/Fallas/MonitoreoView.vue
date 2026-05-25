<template>
  <div class="fallas-page">

    <!-- ══ Hero ══════════════════════════════════════════════════════ -->
    <div class="fallas-hero">
      <div class="fallas-hero-left">
        <h1 class="fallas-hero-title">Monitoreo de Fallas</h1>
        <p class="fallas-hero-sub">Seguimiento y gestión operacional · Unergy</p>
      </div>
      <div class="fallas-hero-actions">
        <button class="hero-btn hero-btn-secondary" :disabled="loading" @click="cargar" title="Actualizar">
          <span :class="loading ? 'spin-icon' : ''">↻</span> Actualizar
        </button>
        <button class="hero-btn hero-btn-primary" @click="dialogVisible = true">
          <i class="pi pi-plus" /> Registrar falla
        </button>
      </div>
    </div>

    <!-- ══ KPIs ═══════════════════════════════════════════════════════ -->
    <div class="fallas-kpis">
      <button class="kpi-card" :class="['kpi-total', { 'kpi-active': !filtroEstado && !filtroPrioridad }]"
        @click="clearKpiFilter">
        <span class="kpi-num">{{ todosLoaded.length }}</span>
        <span class="kpi-label">Total activas</span>
      </button>
      <button class="kpi-card" :class="['kpi-abierta', { 'kpi-active': filtroEstado === 'abierta' }]"
        @click="setFiltroEstado('abierta')">
        <span class="kpi-num">{{ kpis.abierta }}</span>
        <span class="kpi-label">Abiertas</span>
      </button>
      <button class="kpi-card" :class="['kpi-gestion', { 'kpi-active': filtroEstado === 'en_gestion' }]"
        @click="setFiltroEstado('en_gestion')">
        <span class="kpi-num">{{ kpis.en_gestion }}</span>
        <span class="kpi-label">En gestión</span>
      </button>
      <button class="kpi-card" :class="['kpi-espera', { 'kpi-active': filtroEstado === 'en_espera' }]"
        @click="setFiltroEstado('en_espera')">
        <span class="kpi-num">{{ kpis.en_espera }}</span>
        <span class="kpi-label">En espera</span>
      </button>
      <button class="kpi-card" :class="['kpi-critica', { 'kpi-active': filtroPrioridad === 'critica' }]"
        @click="setFiltroPrioridad('critica')">
        <span class="kpi-num">{{ kpis.critica }}</span>
        <span class="kpi-label">Críticas</span>
      </button>
    </div>

    <!-- ══ Filtros ════════════════════════════════════════════════════ -->
    <div class="fallas-filtros-bar">
      <div class="fallas-filtro-group fallas-filtro-search">
        <label class="fallas-filtro-label">Buscar</label>
        <input
          v-model="filtroQ"
          type="text"
          class="fallas-input"
          placeholder="Código, proyecto, descripción…"
        />
      </div>
      <div class="fallas-filtro-group">
        <label class="fallas-filtro-label">Estado</label>
        <select v-model="filtroEstado" class="fallas-select">
          <option value="">Todos</option>
          <option v-for="e in catalogos.estados" :key="e.id" :value="e.codigo">{{ e.etiqueta }}</option>
        </select>
      </div>
      <div class="fallas-filtro-group">
        <label class="fallas-filtro-label">Prioridad</label>
        <select v-model="filtroPrioridad" class="fallas-select">
          <option value="">Todas</option>
          <option v-for="p in catalogos.prioridades" :key="p.id" :value="p.codigo">{{ p.etiqueta }}</option>
        </select>
      </div>
      <div class="fallas-filtro-group">
        <label class="fallas-filtro-label">Proyecto</label>
        <select v-model="filtroProyecto" class="fallas-select">
          <option value="">Todos</option>
          <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
        </select>
      </div>
      <button v-if="hayFiltros" class="fallas-clear-btn" @click="limpiarFiltros">✕ Limpiar</button>
      <span v-if="!loading" class="fallas-count-label">
        {{ fallasFiltradas.length }} resultado{{ fallasFiltradas.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- ══ Loading ════════════════════════════════════════════════════ -->
    <div v-if="loading" class="fallas-loading">
      <div class="spin-ring" />
      <span>Cargando fallas…</span>
    </div>

    <!-- ══ Error ══════════════════════════════════════════════════════ -->
    <div v-else-if="error" class="fallas-error-box">
      <span>⚠️</span>
      <div>
        <div class="fallas-error-title">Error al cargar fallas</div>
        <div class="fallas-error-msg">{{ error }}</div>
      </div>
      <button class="hero-btn hero-btn-secondary" @click="cargar">Reintentar</button>
    </div>

    <!-- ══ Empty ══════════════════════════════════════════════════════ -->
    <div v-else-if="!fallasFiltradas.length" class="fallas-empty">
      <div class="fallas-empty-icon">⚡</div>
      <div class="fallas-empty-title">
        {{ hayFiltros ? 'Sin resultados para los filtros aplicados' : 'No hay fallas registradas' }}
      </div>
      <div class="fallas-empty-sub">
        {{ hayFiltros ? 'Prueba con otros filtros' : 'El sistema está operando sin incidencias activas' }}
      </div>
      <button v-if="hayFiltros" class="fallas-clear-btn" style="margin-top:14px" @click="limpiarFiltros">
        ✕ Limpiar filtros
      </button>
    </div>

    <!-- ══ Tabla ══════════════════════════════════════════════════════ -->
    <div v-else class="fallas-table-wrapper">
      <table class="fallas-table">
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
          <tr
            v-for="f in fallasFiltradas"
            :key="f.id"
            class="fallas-row"
            @click="irDetalle(f.id)"
          >
            <td class="td-codigo">{{ f.codigo_interno }}</td>
            <td class="td-proyecto">{{ f.proyecto?.nombre_comercial || '—' }}</td>
            <td class="td-tipo">
              <span v-if="f.tipo?.categoria" class="cat-tag"
                :style="{ background: (f.tipo.categoria.color_hex || '#915BD8') + '22', color: f.tipo.categoria.color_hex || '#915BD8' }">
                {{ f.tipo.categoria.etiqueta }}
              </span>
              <div class="tipo-sub">{{ f.tipo?.etiqueta || '—' }}</div>
            </td>
            <td>
              <span class="estado-pill"
                :style="{ background: (f.estado?.color_hex || '#915BD8') + '22', color: f.estado?.color_hex || '#915BD8' }">
                {{ f.estado?.etiqueta || '—' }}
              </span>
            </td>
            <td>
              <span class="prio-pill" :class="'prio-' + (f.prioridad?.nivel || 4)">
                {{ f.prioridad?.etiqueta || '—' }}
              </span>
            </td>
            <td class="td-fecha">{{ formatFecha(f.fecha_identificacion) }}</td>
            <td>
              <span v-if="f.sla_cumplido === true"  class="sla-pill sla-ok">✓ OK</span>
              <span v-else-if="f.sla_cumplido === false" class="sla-pill sla-vencido">Vencido</span>
              <span v-else-if="slaEnRiesgo(f)" class="sla-pill sla-riesgo">En riesgo</span>
              <span v-else class="td-empty">—</span>
            </td>
            <td class="td-asignado">
              <span v-if="f.asignado_a">{{ f.asignado_a.nombre }}</span>
              <span v-else class="td-empty">Sin asignar</span>
            </td>
            <td class="td-accion" @click.stop>
              <button class="action-btn" @click="irDetalle(f.id)" title="Ver detalle">→</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Dialog registrar falla ═════════════════════════════════════ -->
    <Dialog
      v-model:visible="dialogVisible"
      header="Registrar nueva falla"
      modal
      class="w-full max-w-2xl"
      :closable="!saving"
    >
      <FallaForm :catalogos="catalogos" @save="onCreate" @cancel="dialogVisible = false" />
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

// ── Estado ────────────────────────────────────────────────────────
const todosLoaded    = ref([])
const loading        = ref(false)
const error          = ref(null)
const saving         = ref(false)
const dialogVisible  = ref(false)
const catalogos      = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos      = ref([])

// ── Filtros ───────────────────────────────────────────────────────
const filtroQ         = ref('')
const filtroEstado    = ref('')
const filtroPrioridad = ref('')
const filtroProyecto  = ref('')

const hayFiltros = computed(() =>
  filtroQ.value || filtroEstado.value || filtroPrioridad.value || filtroProyecto.value
)

// ── KPIs ──────────────────────────────────────────────────────────
const kpis = computed(() => ({
  abierta:   todosLoaded.value.filter(f => f.estado?.codigo === 'abierta').length,
  en_gestion:todosLoaded.value.filter(f => f.estado?.codigo === 'en_gestion').length,
  en_espera: todosLoaded.value.filter(f => f.estado?.codigo === 'en_espera').length,
  critica:   todosLoaded.value.filter(f => f.prioridad?.codigo === 'critica').length,
}))

// ── Filtrado ──────────────────────────────────────────────────────
const fallasFiltradas = computed(() =>
  todosLoaded.value.filter(f => {
    const q = filtroQ.value.toLowerCase().trim()
    if (q && !(
      (f.codigo_interno || '').toLowerCase().includes(q) ||
      (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q) ||
      (f.descripcion || '').toLowerCase().includes(q) ||
      (f.tipo?.etiqueta || '').toLowerCase().includes(q)
    )) return false
    if (filtroEstado.value && f.estado?.codigo !== filtroEstado.value) return false
    if (filtroPrioridad.value && f.prioridad?.codigo !== filtroPrioridad.value) return false
    if (filtroProyecto.value && f.proyecto?.id !== filtroProyecto.value) return false
    return true
  })
)

// ── Helpers filtros KPI ───────────────────────────────────────────
function setFiltroEstado(val) {
  filtroPrioridad.value = ''
  filtroEstado.value = filtroEstado.value === val ? '' : val
}
function setFiltroPrioridad(val) {
  filtroEstado.value = ''
  filtroPrioridad.value = filtroPrioridad.value === val ? '' : val
}
function clearKpiFilter() {
  filtroEstado.value = ''
  filtroPrioridad.value = ''
}
function limpiarFiltros() {
  filtroQ.value = ''
  filtroEstado.value = ''
  filtroPrioridad.value = ''
  filtroProyecto.value = ''
}

// ── SLA en riesgo ─────────────────────────────────────────────────
function slaEnRiesgo(f) {
  if (!f.sla_limite_horas || f.sla_cumplido !== null) return false
  if (!f.fecha_identificacion) return false
  const inicio   = new Date(f.fecha_identificacion + 'T00:00:00')
  const deadline = new Date(inicio.getTime() + f.sla_limite_horas * 3_600_000)
  const remaining = (deadline - Date.now()) / 3_600_000
  return remaining > 0 && remaining < f.sla_limite_horas * 0.25
}

// ── Formateo ──────────────────────────────────────────────────────
function formatFecha(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Carga de datos ────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  error.value   = null
  try {
    const { data } = await api.get('/fallas', { params: { page: 1, size: 500 } })
    todosLoaded.value = data.items ?? []
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
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

// ── Crear falla ───────────────────────────────────────────────────
async function onCreate(payload) {
  saving.value = true
  try {
    const notaInicial = payload.nota_inicial
    delete payload.nota_inicial
    const { data: nueva } = await api.post('/fallas', payload)
    if (notaInicial) {
      await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
    }
    dialogVisible.value = false
    toast.add({ severity: 'success', summary: 'Falla registrada', life: 3000 })
    await cargar()
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al registrar la falla'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    saving.value = false
  }
}

// ── Navegación ────────────────────────────────────────────────────
function irDetalle(id) {
  router.push(`/fallas/${id}`)
}

onMounted(() => {
  cargarCatalogos()
  cargarProyectos()
  cargar()
})
</script>

<style scoped>
/* ── Página ──────────────────────────────────────────────────────── */
.fallas-page {
  min-height: 100%;
  background: #f8f7fa;
  font-family: 'Sora', system-ui, sans-serif;
}

/* ── Hero ────────────────────────────────────────────────────────── */
.fallas-hero {
  background: linear-gradient(135deg, #2C2039 0%, #3d2b52 60%, #4a2d6e 100%);
  padding: 28px 32px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(145,91,216,.2);
}
.fallas-hero-title {
  font-size: 24px;
  font-weight: 900;
  color: #FDFAF7;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}
.fallas-hero-sub {
  font-size: 13px;
  color: rgba(253,250,247,.55);
  margin: 0;
}
.fallas-hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Botones hero ────────────────────────────────────────────────── */
.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.hero-btn:disabled { opacity: .5; cursor: not-allowed; }
.hero-btn-secondary {
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.22);
  color: #FDFAF7;
}
.hero-btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,.18); }
.hero-btn-primary {
  background: #915BD8;
  border: 1px solid #7c3aed;
  color: #fff;
}
.hero-btn-primary:hover:not(:disabled) { background: #7c3aed; }

/* ── KPIs ────────────────────────────────────────────────────────── */
.fallas-kpis {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  border-bottom: 1px solid #e5e2ec;
}
@media (max-width: 768px) { .fallas-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 480px) { .fallas-kpis { grid-template-columns: repeat(2, 1fr); } }

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  border: none;
  background: #fff;
  cursor: pointer;
  transition: background .15s;
  border-right: 1px solid #e5e2ec;
  position: relative;
  font-family: inherit;
}
.kpi-card:last-child { border-right: none; }
.kpi-card:hover { background: #f4f1fa; }

.kpi-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  opacity: 0;
  transition: opacity .15s;
}
.kpi-card.kpi-active::after { opacity: 1; }
.kpi-card.kpi-active { background: #f9f7ff; }

.kpi-total::after    { background: #915BD8; }
.kpi-abierta::after  { background: #EF4444; }
.kpi-gestion::after  { background: #F97316; }
.kpi-espera::after   { background: #EAB308; }
.kpi-critica::after  { background: #DC2626; }

.kpi-num {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 5px;
}
.kpi-total   .kpi-num { color: #6d28d9; }
.kpi-abierta .kpi-num { color: #DC2626; }
.kpi-gestion .kpi-num { color: #EA580C; }
.kpi-espera  .kpi-num { color: #CA8A04; }
.kpi-critica .kpi-num { color: #DC2626; }
.kpi-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: #9ca3af;
}
.kpi-card.kpi-active .kpi-label { color: #6b7280; }

/* ── Filtros ─────────────────────────────────────────────────────── */
.fallas-filtros-bar {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
  padding: 18px 32px;
  background: #fff;
  border-bottom: 1px solid #e5e2ec;
}
.fallas-filtro-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.fallas-filtro-search { flex: 1; min-width: 200px; }
.fallas-filtro-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #9ca3af;
}
.fallas-input, .fallas-select {
  background: #fff;
  border: 1.5px solid #e5e2ec;
  border-radius: 8px;
  padding: 7px 12px;
  color: #2C2039;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.fallas-input  { min-width: 220px; }
.fallas-select { min-width: 150px; cursor: pointer; }
.fallas-input:focus,
.fallas-select:focus { border-color: #915BD8; }

.fallas-clear-btn {
  background: transparent;
  border: 1.5px solid #e5e2ec;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  align-self: flex-end;
}
.fallas-clear-btn:hover { border-color: #915BD8; color: #6d28d9; }

.fallas-count-label {
  margin-left: auto;
  align-self: flex-end;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 600;
}

/* ── Loading ─────────────────────────────────────────────────────── */
.fallas-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 32px;
  color: #9ca3af;
  font-size: 13px;
}
.spin-ring {
  width: 32px; height: 32px;
  border: 3px solid #e5e2ec;
  border-top-color: #915BD8;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { display: inline-block; animation: spin .8s linear infinite; }

/* ── Error ───────────────────────────────────────────────────────── */
.fallas-error-box {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 24px 32px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 16px 20px;
  font-size: 13px;
}
.fallas-error-title { font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 2px; }
.fallas-error-msg   { font-size: 12px; color: #ef4444; }

/* ── Empty ───────────────────────────────────────────────────────── */
.fallas-empty {
  text-align: center;
  padding: 80px 32px;
}
.fallas-empty-icon  { font-size: 48px; margin-bottom: 14px; opacity: .25; }
.fallas-empty-title { font-size: 16px; font-weight: 700; color: #6b7280; margin-bottom: 6px; }
.fallas-empty-sub   { font-size: 13px; color: #9ca3af; }

/* ── Tabla ───────────────────────────────────────────────────────── */
.fallas-table-wrapper {
  padding: 24px 32px;
  overflow-x: auto;
}
.fallas-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);
}
.fallas-table thead tr {
  background: #f8f7fa;
  border-bottom: 2px solid #e5e2ec;
}
.fallas-table thead th {
  padding: 12px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #9ca3af;
  white-space: nowrap;
}
.fallas-row {
  border-bottom: 1px solid #f0edf7;
  cursor: pointer;
  transition: background .12s;
}
.fallas-row:last-child { border-bottom: none; }
.fallas-row:hover { background: #f9f7ff; }
.fallas-row td {
  padding: 12px 14px;
  vertical-align: middle;
  font-size: 13px;
  color: #1a1025;
}

/* ── Celdas específicas ──────────────────────────────────────────── */
.td-codigo {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #6d28d9;
  white-space: nowrap;
}
.td-proyecto {
  font-weight: 600;
  min-width: 160px;
}
.td-tipo { min-width: 160px; }
.cat-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: .3px;
  text-transform: uppercase;
  margin-bottom: 3px;
}
.tipo-sub {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}
.td-fecha {
  font-size: 12px;
  color: #374151;
  white-space: nowrap;
}
.td-asignado {
  font-size: 12px;
  min-width: 110px;
}
.td-empty { color: #d1d5db; font-style: italic; }

/* Estado pills */
.estado-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: .3px;
  white-space: nowrap;
  text-transform: uppercase;
}

/* Prioridad pills */
.prio-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: .3px;
  white-space: nowrap;
  text-transform: uppercase;
}
.prio-1 { background: rgba(220,38,38,.12);  color: #DC2626; }
.prio-2 { background: rgba(234,88,12,.12);  color: #EA580C; }
.prio-3 { background: rgba(202,138,4,.12);  color: #CA8A04; }
.prio-4 { background: rgba(107,114,128,.1); color: #6B7280; }

/* SLA pills */
.sla-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 20px;
  white-space: nowrap;
}
.sla-ok      { background: rgba(22,163,74,.12);  color: #16A34A; }
.sla-vencido { background: rgba(220,38,38,.12);  color: #DC2626; }
.sla-riesgo  { background: rgba(202,138,4,.12);  color: #CA8A04; }

/* Acción */
.td-accion { width: 50px; }
.action-btn {
  background: transparent;
  border: 1px solid #e5e2ec;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 800;
  color: #6d28d9;
  transition: all .14s;
}
.action-btn:hover { background: #f3f0ff; border-color: #7c3aed; }

@media (max-width: 768px) {
  .fallas-hero, .fallas-filtros-bar, .fallas-table-wrapper { padding-left: 20px; padding-right: 20px; }
}
</style>
