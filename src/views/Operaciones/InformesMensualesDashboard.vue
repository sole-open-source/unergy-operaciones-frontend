<template>
  <div class="imd-wrap">

    <!-- Toast inline (fallback si no hay ToastService global) -->
    <transition name="fade">
      <div v-if="toast.msg" :class="['imd-toast', toast.err ? 'imd-toast--err' : 'imd-toast--ok']">
        {{ toast.msg }}
      </div>
    </transition>

    <!-- ══ Toolbar ═══════════════════════════════════════════════════ -->
    <section class="imd-toolbar">
      <div class="imd-toolbar-title">
        <i class="pi pi-chart-bar" style="color:#915BD8" />
        <div>
          <h2 class="imd-h2">Informes Mensuales · Dashboard</h2>
          <span class="imd-sub">
            <template v-if="!useMock && agg?.meta?.contratoNombre">
              Contrato <b>{{ agg.meta.contratoNombre }}</b> · cumplimiento, bolsa e impacto financiero
            </template>
            <template v-else>Generación, cumplimiento PPA, asignaciones XM e impacto financiero</template>
          </span>
        </div>
      </div>

      <div class="imd-filters">
        <div class="imd-field">
          <label class="imd-label">Proyecto</label>
          <Select v-model="filtro.proyecto" :options="opcionesProyecto" optionLabel="label" optionValue="value"
                  :filter="true" filterPlaceholder="Buscar…" placeholder="Proyecto…"
                  class="imd-select" :loading="loadingProyectos" />
        </div>
        <div class="imd-field imd-field--sm">
          <label class="imd-label">Mes</label>
          <Select v-model="filtro.mes" :options="opcionesMes" optionLabel="label" optionValue="value" class="imd-select" />
        </div>
        <div class="imd-field imd-field--sm">
          <label class="imd-label">Año</label>
          <Select v-model="filtro.anio" :options="opcionesAnio" optionLabel="label" optionValue="value" class="imd-select" />
        </div>

        <!-- Toggle Mock / Real (modo debug) -->
        <div class="imd-field imd-field--toggle">
          <label class="imd-label">Fuente</label>
          <div class="imd-seg">
            <button class="imd-seg-btn" :class="{ 'imd-seg-btn--on': useMock }" @click="setMock(true)">Mock</button>
            <button class="imd-seg-btn" :class="{ 'imd-seg-btn--on': !useMock }" @click="setMock(false)">Real</button>
          </div>
        </div>
      </div>
    </section>

    <!-- No se pudieron cargar los proyectos (solo Real) -->
    <div v-if="!useMock && proyectosError" class="imd-note imd-note--warn">
      <i class="pi pi-exclamation-triangle" /> No se pudieron cargar los proyectos.
      <button class="imd-retry" @click="cargarProyectos">Reintentar</button>
    </div>

    <!-- Estado de carga -->
    <div v-if="loading" class="imd-loading">
      <ProgressSpinner style="width:38px;height:38px" strokeWidth="4" />
      <p>Agregando datos del período…</p>
    </div>

    <template v-else-if="agg">
      <!-- Avisos de datos (solo modo real) -->
      <div v-if="!useMock && agg.meta?.sinContrato" class="imd-note imd-note--warn">
        <i class="pi pi-exclamation-triangle" /> Este proyecto no tiene un contrato PPA asociado, así que no hay cumplimiento ni bolsa/XM que mostrar. Los ingresos y el neto, si existen, salen del Estado de Resultados.
      </div>
      <div v-else-if="!useMock && agg.meta?.sinDatosCumplimiento" class="imd-note imd-note--warn">
        <i class="pi pi-exclamation-triangle" /> Sin datos de cumplimiento para el contrato en este período (la consulta pudo fallar o el contrato no estaba vigente). Los ingresos/neto no dependen de esto.
      </div>

      <!-- ══ KPIs ═══════════════════════════════════════════════════ -->
      <section class="imd-kpis">
        <div class="imd-kpi">
          <span class="imd-kpi-label">Neto mensual</span>
          <span class="imd-kpi-value" :class="agg.financialData.neto < 0 ? 'imd-neg' : 'imd-pos'">
            {{ fmtCompact(agg.financialData.neto) }}
          </span>
          <span class="imd-kpi-foot">{{ fmt(agg.financialData.neto) }}</span>
        </div>
        <div class="imd-kpi">
          <span class="imd-kpi-label">Ingresos PPA</span>
          <span class="imd-kpi-value imd-pos">{{ fmtCompact(agg.financialData.ingresoPPA) }}</span>
          <span class="imd-kpi-foot">
            {{ fmtMWh(agg.technicalData.realTotalMWh) }} generados<span v-if="!useMock && agg.meta?.ingresoEstimado"> · estimado</span>
          </span>
        </div>
        <div class="imd-kpi">
          <span class="imd-kpi-label">Cumplimiento SLA</span>
          <span class="imd-kpi-value" :class="agg.complianceMetrics.breached ? 'imd-warn' : 'imd-pos'">
            {{ agg.complianceMetrics.compliancePct != null ? agg.complianceMetrics.compliancePct.toFixed(1) + '%' : '—' }}
          </span>
          <span class="imd-kpi-foot">umbral {{ agg.complianceMetrics.slaThresholdPct }}%<span v-if="!useMock && agg.complianceMetrics.esContrato"> · contrato</span></span>
        </div>
        <div class="imd-kpi">
          <span class="imd-kpi-label">Multa SLA proyectada</span>
          <span class="imd-kpi-value" :class="agg.financialData.multaSLA > 0 ? 'imd-neg' : 'imd-muted'">
            {{ agg.financialData.multaSLA > 0 ? fmtCompact(agg.financialData.multaSLA) : '$0' }}
          </span>
          <span class="imd-kpi-foot">{{ agg.meta.periodoLabel }}<span v-if="agg.meta.source === 'mock'"> · mock</span></span>
        </div>
      </section>

      <!-- ══ Tabs ═══════════════════════════════════════════════════ -->
      <section class="imd-tabs">
        <button v-for="t in TABS" :key="t.key" class="imd-tab"
                :class="{ 'imd-tab--on': tab === t.key }" @click="tab = t.key">
          <i :class="t.icon" /> {{ t.label }}
        </button>
      </section>

      <section class="imd-panel">
        <!-- PPA vs Generación -->
        <div v-show="tab === 'ppa'" class="imd-grid-2">
          <PPAComplianceChart :serie="agg.technicalData.serie" :periodoLabel="agg.meta.periodoLabel" />
          <SLAFineCalculator :metrics="agg.complianceMetrics" />
        </div>

        <!-- Asignaciones XM -->
        <div v-show="tab === 'xm'">
          <XMAllocationTable :rows="agg.financialData.xm" />
        </div>

        <!-- Impacto financiero -->
        <div v-show="tab === 'fin'" class="imd-grid-2">
          <FinancialImpactCard :data="agg.financialData" />
          <SLAFineCalculator :metrics="agg.complianceMetrics" />
        </div>
      </section>
    </template>

    <!-- Sin datos -->
    <div v-else class="imd-empty">
      <i class="pi pi-inbox text-4xl mb-2" style="color:#e0d5f0" />
      <p>No hay datos para el período seleccionado.</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import Select from 'primevue/select'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import { aggregateMonthlyData } from '@/services/reportAggregatorService'
import { formatCurrency, formatCurrencyCompact, formatMWh } from '@/utils/financialCalculations'
import FinancialImpactCard from '@/components/reports/FinancialImpactCard.vue'
import PPAComplianceChart from '@/components/reports/PPAComplianceChart.vue'
import XMAllocationTable from '@/components/reports/XMAllocationTable.vue'
import SLAFineCalculator from '@/components/reports/SLAFineCalculator.vue'

const fmt = (v) => formatCurrency(v)
const fmtCompact = (v) => formatCurrencyCompact(v)
const fmtMWh = (v) => formatMWh(v)

const TABS = [
  { key: 'ppa', label: 'PPA vs Generación', icon: 'pi pi-chart-line' },
  { key: 'xm',  label: 'Asignaciones XM',   icon: 'pi pi-sitemap' },
  { key: 'fin', label: 'Impacto financiero', icon: 'pi pi-wallet' },
]
const tab = ref('ppa')

// ── Estado ─────────────────────────────────────────────────────────
const now = new Date()
const filtro = reactive({
  proyecto: null,
  mes: now.getMonth() + 1,
  anio: now.getFullYear(),
})
const useMock = ref(false)   // por defecto datos reales; el toggle deja ver el mock de demo
const loading = ref(false)
const loadingProyectos = ref(false)
const agg = ref(null)
const toast = reactive({ msg: '', err: false })

// ── Opciones de filtros ────────────────────────────────────────────
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const opcionesMes = MESES.map((label, i) => ({ label, value: i + 1 }))
const opcionesAnio = computed(() => {
  const y = now.getFullYear()
  return [y - 2, y - 1, y].map(v => ({ label: String(v), value: v }))
})

// Proyectos demo: SOLO para el modo Mock (demo). En modo Real nunca se muestran,
// para no confundir con proyectos que no existen.
const proyectosDemo = [
  { label: 'Minigranja Solar La Reserva', value: 101 },
  { label: 'Granja Solar El Paso', value: 102 },
  { label: 'Autogeneración Norte', value: 103 },
]
const proyectosReales = ref([])
const proyectosError = ref(false)
const opcionesProyecto = computed(() => {
  if (proyectosReales.value.length) return proyectosReales.value
  return useMock.value ? proyectosDemo : []
})

async function cargarProyectos() {
  loadingProyectos.value = true
  proyectosError.value = false
  // /proyectos devuelve el proyecto_id de NUESTRA BD (el que esperan /generacion,
  // /ppa y el resumen de cumplimiento). Mismo patrón que el resto de la app: sin
  // filtro de estado y size=500. Es pesado (varios selectinload): timeout amplio y
  // un reintento para que un pico de latencia no deje el selector vacío.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const { data } = await api.get('/proyectos', { params: { size: 500 }, timeout: 60000 })
      // Solo minigranjas y GD (generación distribuida); se excluyen autoconsumo,
      // movilidad eléctrica, etc.
      const TIPOS_PERMITIDOS = new Set(['minigranja', 'gd'])
      const projs = (data?.items || []).filter(
        p => TIPOS_PERMITIDOS.has(String(p.tipo_proyecto || '').toLowerCase()),
      )
      proyectosReales.value = projs
        .map(p => ({ label: p.nombre_comercial || `Proyecto ${p.id}`, value: p.id }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'))
      break
    } catch {
      if (intento === 2) {
        proyectosReales.value = []
        proyectosError.value = true   // en Real se muestra aviso + Reintentar (sin demos)
      }
    }
  }
  loadingProyectos.value = false
  if (filtro.proyecto == null) filtro.proyecto = opcionesProyecto.value[0]?.value ?? null
}

// ── Carga agregada ─────────────────────────────────────────────────
function showToast(msg, err = false) {
  // Preferir el toast global de PrimeVue si está montado (ver api/client.js).
  if (typeof window.__primeToast === 'function') {
    window.__primeToast({ severity: err ? 'error' : 'success', summary: err ? 'Error' : 'Listo', detail: msg, life: 4000 })
  }
  toast.msg = msg
  toast.err = err
  setTimeout(() => { toast.msg = '' }, 4000)
}

async function cargar() {
  if (filtro.proyecto == null) return
  loading.value = true
  agg.value = null
  try {
    agg.value = await aggregateMonthlyData(filtro.proyecto, filtro.mes, filtro.anio, { useMock: useMock.value })
  } catch (e) {
    const detalle = e?.response?.data?.detail || e?.message || 'No se pudieron cargar los datos del período.'
    showToast(useMock.value ? detalle : `Backend no disponible (${detalle}). Usa "Mock".`, true)
    agg.value = null
  } finally {
    loading.value = false
  }
}

function setMock(v) {
  if (useMock.value === v) return
  useMock.value = v
  cargar()
}

watch(() => [filtro.proyecto, filtro.mes, filtro.anio], cargar)

onMounted(async () => {
  await cargarProyectos()
  cargar()
})
</script>

<style scoped>
.imd-wrap {
  min-height: 100%;
  background: #f8f7fa;
  font-family: 'Sora', system-ui, sans-serif;
  padding: 14px;
}

/* Toolbar */
.imd-toolbar {
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 14px;
  padding: 12px 16px;
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
}
.imd-toolbar-title { display: flex; align-items: center; gap: 10px; }
.imd-toolbar-title > i { font-size: 20px; }
.imd-h2 { font-size: 15px; font-weight: 800; color: #2C2039; margin: 0; }
.imd-sub { font-size: 11px; color: #8a7ba6; }

.imd-filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.imd-field { display: flex; flex-direction: column; gap: 3px; }
.imd-label { font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color: #8a7ba6; font-weight: 600; }
.imd-select { min-width: 180px; }
.imd-field--sm .imd-select { min-width: 120px; }

.imd-seg { display: inline-flex; background: #F4F1FA; border: 1px solid #E5E2EC; border-radius: 8px; padding: 2px; }
.imd-seg-btn {
  border: none; background: transparent; font-family: inherit; font-size: 11px; font-weight: 700;
  color: #6B5A8A; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all .15s;
}
.imd-seg-btn--on { background: #915BD8; color: #FDFAF7; box-shadow: 0 1px 4px rgba(145,91,216,.3); }

/* KPIs */
.imd-kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px;
}
.imd-kpi {
  background: #fff; border: 1px solid #e8e0f0; border-radius: 14px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
}
.imd-kpi-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .03em; color: #8a7ba6; font-weight: 600; }
.imd-kpi-value { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
.imd-kpi-foot { font-size: 10.5px; color: #9b8fb0; }
.imd-pos { color: #15803D; }
.imd-neg { color: #DC2626; }
.imd-warn { color: #D97706; }
.imd-muted { color: #9ca3af; }

/* Tabs */
.imd-tabs {
  display: inline-flex; gap: 0; margin: 16px 0 12px;
  background: #F4F1FA; border: 1px solid #E5E2EC; border-radius: 10px; padding: 3px;
}
.imd-tab {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; background: transparent; font-family: inherit; font-size: 12px; font-weight: 700;
  color: #6B5A8A; padding: 7px 14px; border-radius: 7px; cursor: pointer; transition: all .15s;
}
.imd-tab:hover:not(.imd-tab--on) { color: #2C2039; background: rgba(145,91,216,.08); }
.imd-tab--on { background: #915BD8; color: #FDFAF7; box-shadow: 0 1px 4px rgba(145,91,216,.3); }

.imd-panel { min-height: 260px; }
.imd-grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; align-items: start; }

/* Avisos */
.imd-note {
  margin-top: 12px; padding: 9px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;
}
.imd-note--warn { background: #FEF3C7; color: #92650B; border: 1px solid #FBD9A5; }
.imd-retry {
  margin-left: auto; border: 1px solid #E0B44A; background: #fff; color: #92650B;
  font-family: inherit; font-size: 11px; font-weight: 700; padding: 4px 12px;
  border-radius: 7px; cursor: pointer;
}
.imd-retry:hover { background: #FDF6E3; }

/* Estados */
.imd-loading, .imd-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 60px 0; color: #8a7ba6; font-size: 13px;
}

/* Toast */
.imd-toast {
  position: fixed; top: 18px; right: 18px; z-index: 100;
  padding: 10px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 600;
  box-shadow: 0 6px 20px rgba(28,18,50,.18);
}
.imd-toast--ok { background: #15803D; color: #fff; }
.imd-toast--err { background: #DC2626; color: #fff; }
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Responsive: tablet y móvil */
@media (max-width: 1024px) {
  .imd-kpis { grid-template-columns: repeat(2, 1fr); }
  .imd-grid-2 { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .imd-kpis { grid-template-columns: 1fr; }
  .imd-toolbar { flex-direction: column; align-items: stretch; }
  .imd-select, .imd-field--sm .imd-select { min-width: 0; width: 100%; }
  .imd-field { flex: 1; }
  .imd-tabs { width: 100%; overflow-x: auto; }
}
</style>
