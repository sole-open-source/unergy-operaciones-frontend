<template>
  <div class="gs-page">

    <!-- ══ HEADER BAR ══════════════════════════════════════════════════════ -->
    <div class="gs-header">
      <div class="gs-header-left">
        <h1 class="gs-title">Generación Solar</h1>
        <p class="gs-subtitle">
          <span v-if="monitoringData">
            {{ monitoringData.fleet.total }} proyectos conectados
          </span>
          <span v-else>Cargando flota...</span>
          <span v-if="lastUpdated" class="gs-last-updated">
            &nbsp;· Actualizado {{ lastUpdated }}
          </span>
        </p>
      </div>
      <div class="gs-header-right">
        <!-- Auto-refresh countdown chip -->
        <div class="gs-countdown-chip" :class="{ 'gs-countdown-chip--urgent': countdown <= 30 }">
          <i class="pi pi-clock" style="font-size:11px" />
          {{ countdownDisplay }}
        </div>
        <!-- Refresh button -->
        <button class="gs-refresh-btn" @click="cargar" :disabled="loading">
          <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- ══ KPI STRIP ════════════════════════════════════════════════════════ -->
    <div v-if="monitoringData" class="gs-kpi-strip">
      <!-- Online -->
      <div class="gs-kpi gs-kpi--online">
        <div class="gs-kpi-icon">
          <span class="gs-status-dot" style="background:#16a34a;width:10px;height:10px;" />
        </div>
        <div class="gs-kpi-body">
          <span class="gs-kpi-value" style="color:#16a34a">{{ monitoringData.fleet.online }}</span>
          <span class="gs-kpi-label">Online</span>
        </div>
      </div>

      <!-- Caídos (hidden if 0) -->
      <div v-if="monitoringData.fleet.caido > 0" class="gs-kpi gs-kpi--caido">
        <div class="gs-kpi-icon">
          <span class="gs-status-dot" style="background:#dc2626;width:10px;height:10px;" />
        </div>
        <div class="gs-kpi-body">
          <span class="gs-kpi-value" style="color:#dc2626">{{ monitoringData.fleet.caido }}</span>
          <span class="gs-kpi-label">Caídos</span>
        </div>
      </div>

      <!-- Sin comunicación (hidden if 0) -->
      <div v-if="monitoringData.fleet.sin_comunicacion > 0" class="gs-kpi gs-kpi--sincom">
        <div class="gs-kpi-icon">
          <span class="gs-status-dot" style="background:#9ca3af;width:10px;height:10px;" />
        </div>
        <div class="gs-kpi-body">
          <span class="gs-kpi-value" style="color:#6b7280">{{ monitoringData.fleet.sin_comunicacion }}</span>
          <span class="gs-kpi-label">Sin comunicación</span>
        </div>
      </div>

      <!-- Degradados (hidden if 0) -->
      <div v-if="monitoringData.fleet.degradado > 0" class="gs-kpi gs-kpi--degradado">
        <div class="gs-kpi-icon">
          <span class="gs-status-dot" style="background:#d97706;width:10px;height:10px;" />
        </div>
        <div class="gs-kpi-body">
          <span class="gs-kpi-value" style="color:#d97706">{{ monitoringData.fleet.degradado }}</span>
          <span class="gs-kpi-label">Degradados</span>
        </div>
      </div>

      <!-- Potencia total -->
      <div class="gs-kpi">
        <div class="gs-kpi-icon">
          <i class="pi pi-bolt" style="color:#915BD8;font-size:14px;" />
        </div>
        <div class="gs-kpi-body">
          <span class="gs-kpi-value" style="color:#915BD8">{{ formatPower(monitoringData.fleet.total_power_kw) }}</span>
          <span class="gs-kpi-label">Potencia total</span>
        </div>
      </div>

      <!-- Utilización -->
      <div class="gs-kpi">
        <div class="gs-kpi-icon">
          <i class="pi pi-chart-bar" style="color:#2C2039;font-size:14px;" />
        </div>
        <div class="gs-kpi-body">
          <div class="gs-kpi-util-row">
            <span class="gs-kpi-value" style="color:#2C2039">{{ monitoringData.fleet.utilization_pct }}%</span>
            <span class="gs-kpi-label">Utilización</span>
          </div>
          <div class="gs-util-bar">
            <div class="gs-util-bar-fill"
              :style="{ width: Math.min(monitoringData.fleet.utilization_pct, 100) + '%',
                        backgroundColor: monitoringData.fleet.utilization_pct >= 50 ? '#16a34a'
                          : monitoringData.fleet.utilization_pct >= 20 ? '#d97706' : '#dc2626' }" />
          </div>
        </div>
      </div>
    </div>

    <!-- KPI skeleton -->
    <div v-else class="gs-kpi-strip">
      <div v-for="i in 5" :key="i" class="gs-kpi gs-kpi--skeleton" />
    </div>

    <!-- ══ FILTER BAR ═══════════════════════════════════════════════════════ -->
    <div class="gs-filter-bar">
      <div class="gs-status-pills">
        <button v-for="pill in STATUS_PILLS" :key="pill.key"
          class="gs-pill" :class="{ 'gs-pill--active': activeFilter === pill.key }"
          :style="activeFilter === pill.key ? { backgroundColor: pill.color, borderColor: pill.color, color: '#fff' } : {}"
          @click="activeFilter = pill.key">
          {{ pill.label }}
        </button>
      </div>
      <div class="gs-search-wrap">
        <i class="pi pi-search gs-search-icon" />
        <input v-model="searchText" type="text" placeholder="Buscar proyecto..." class="gs-search-input" />
      </div>
    </div>

    <!-- ══ DETAIL PANEL (encima de las cards) ═════════════════════════════════ -->
    <!-- Loading placeholder -->
    <Transition name="gs-panel-slide">
      <div v-if="selectedProyId && !detailData && loadingDetail" ref="detailRef" class="gs-detail-panel">
        <div class="gs-detail-loading">
          <i class="pi pi-spin pi-spinner" style="font-size:24px;color:#915BD8" />
          <span style="color:#6b5a8a">Cargando detalle del proyecto...</span>
        </div>
      </div>
    </Transition>

    <!-- Detail con datos -->
    <Transition name="gs-panel-slide">
      <div v-if="selectedProyId && detailData" ref="detailRef" class="gs-detail-panel">

        <!-- Detail header -->
        <div class="gs-detail-header">
          <div class="gs-detail-header-left">
            <h2 class="gs-detail-title">{{ detailData.nombre }}</h2>
            <div class="gs-detail-meta">
              <span class="gs-sol-badge">SOL #{{ detailData.sol_id }}</span>
              <span class="gs-detail-cap">{{ detailData.capacity_kwp }} kWp instalados</span>
              <span class="gs-detail-total">{{ detailData.total_30d_kwh?.toLocaleString('es-CO') }} kWh últimos 30d</span>
            </div>
          </div>
          <div class="gs-detail-header-right">
            <button class="gs-card-falla-btn gs-card-falla-btn--lg"
              @click="openFallaDialog(null)">
              <i class="pi pi-bolt" style="font-size:11px" />
              Crear falla
            </button>
            <button class="gs-close-btn" @click="closeDetail">
              <i class="pi pi-times" />
            </button>
          </div>
        </div>

        <!-- Loading detail (inside panel when refreshing) -->
        <div v-if="loadingDetail" class="gs-detail-loading">
          <i class="pi pi-spin pi-spinner" style="font-size:24px;color:#915BD8" />
          <span style="color:#6b5a8a">Cargando detalle...</span>
        </div>

        <template v-else>

          <!-- ── Inversores ── -->
          <div v-if="detailData.inverters?.length" class="gs-inverters-section">
            <h3 class="gs-section-title">Inversores ({{ detailData.inverters.length }})</h3>
            <div class="gs-inverters-grid">
              <div v-for="inv in detailData.inverters" :key="inv.id"
                class="gs-inv-card"
                :style="{ borderLeftColor: STATUS_CFG[inv.inv_status]?.border || '#e5e7eb' }">
                <div class="gs-inv-top">
                  <span class="gs-inv-name">{{ inv.name }}</span>
                  <span class="gs-status-dot"
                    :style="{ background: STATUS_CFG[inv.inv_status]?.dot || '#9ca3af' }" />
                </div>
                <div class="gs-inv-state" :style="{ color: STATUS_CFG[inv.inv_status]?.color || '#6b7280' }">
                  {{ inv.state }}
                </div>
                <div class="gs-inv-power">
                  <span class="gs-inv-power-val"
                    :style="{ color: inv.power_kw > 0 ? '#16a34a' : '#9ca3af' }">
                    {{ inv.power_kw != null ? inv.power_kw.toFixed(2) : '—' }}
                  </span>
                  <span class="gs-inv-power-unit">kW</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Charts row ── -->
          <div class="gs-charts-row">
            <div class="gs-chart-card">
              <h3 class="gs-section-title">Curva de potencia hoy</h3>
              <div v-if="powerCurveData.labels.length > 0" class="gs-chart-container">
                <Line :data="powerCurveData" :options="powerCurveOptions" />
              </div>
              <div v-else class="gs-chart-empty">
                <i class="pi pi-chart-line" style="font-size:28px;color:#d1d5db" />
                <p>Sin datos de potencia para hoy</p>
              </div>
            </div>
            <div class="gs-chart-card">
              <h3 class="gs-section-title">Generación últimos 30 días</h3>
              <div v-if="generation30dData.labels.length > 0" class="gs-chart-container">
                <Bar :data="generation30dData" :options="generation30dOptions" />
              </div>
              <div v-else class="gs-chart-empty">
                <i class="pi pi-chart-bar" style="font-size:28px;color:#d1d5db" />
                <p>Sin datos de generación en los últimos 30 días</p>
              </div>
            </div>
          </div>

          <!-- ── String behavior chart ── -->
          <div v-if="detailData.has_strings && stringsChartData.labels.length" class="gs-strings-section">
            <div class="gs-section-header">
              <h3 class="gs-section-title">Comportamiento de strings (DC)</h3>
              <div class="gs-toggle-pills">
                <button class="gs-toggle-pill" :class="{ active: stringMetric === 'voltage' }" @click="stringMetric = 'voltage'">Tensión (V)</button>
                <button class="gs-toggle-pill" :class="{ active: stringMetric === 'current' }" @click="stringMetric = 'current'">Corriente (A)</button>
                <button class="gs-toggle-pill" :class="{ active: stringMetric === 'power' }" @click="stringMetric = 'power'">Potencia (kW)</button>
              </div>
            </div>
            <div class="gs-chart-card" style="padding: 14px;">
              <div class="gs-chart-container gs-chart-container--strings">
                <Bar :data="stringsChartData" :options="stringsChartOptions" />
              </div>
            </div>
          </div>

          <!-- ── Medidor eléctrico (Gaia) ── -->
          <div v-if="detailData.gaia_snapshot" class="gs-metrics-section">
            <div class="gs-section-header">
              <h3 class="gs-section-title">Medidor eléctrico — Datos en tiempo real</h3>
              <span v-if="detailData.gaia_snapshot.last_time" class="gs-gaia-ts">
                <i class="pi pi-clock" style="font-size:10px" />
                {{ fmtGaiaTime(detailData.gaia_snapshot.last_time) }}
              </span>
            </div>

            <!-- KPI strip -->
            <div class="gs-gaia-kpis">
              <div class="gs-gaia-kpi">
                <div class="gs-gaia-kpi-label">Potencia activa</div>
                <div class="gs-gaia-kpi-val" style="color:#7c3aed">{{ fmtW(detailData.gaia_snapshot.ap_total) }}</div>
                <div class="gs-gaia-kpi-sub">kW inyectados</div>
              </div>
              <div class="gs-gaia-kpi">
                <div class="gs-gaia-kpi-label">Potencia reactiva</div>
                <div class="gs-gaia-kpi-val" style="color:#0891b2">{{ fmtVAR(detailData.gaia_snapshot.rp_total) }}</div>
                <div class="gs-gaia-kpi-sub">kVAr</div>
              </div>
              <div class="gs-gaia-kpi">
                <div class="gs-gaia-kpi-label">Potencia aparente</div>
                <div class="gs-gaia-kpi-val" style="color:#6366f1">{{ fmtVA(detailData.gaia_snapshot.ap_total, detailData.gaia_snapshot.rp_total) }}</div>
                <div class="gs-gaia-kpi-sub">kVA</div>
              </div>
              <div class="gs-gaia-kpi">
                <div class="gs-gaia-kpi-label">Factor de potencia</div>
                <div class="gs-gaia-kpi-val" :style="{ color: fpColor(detailData.gaia_snapshot.pf_avg) }">{{ fmtPF(detailData.gaia_snapshot.pf_avg) }}</div>
                <div class="gs-gaia-kpi-sub">promedio</div>
              </div>
              <div class="gs-gaia-kpi">
                <div class="gs-gaia-kpi-label">Energía exportada hoy</div>
                <div class="gs-gaia-kpi-val" style="color:#059669">{{ fmtWh(detailData.gaia_snapshot.eae_wh) }}</div>
                <div class="gs-gaia-kpi-sub">kWh medidor</div>
              </div>
              <div v-if="lossPct != null" class="gs-gaia-kpi">
                <div class="gs-gaia-kpi-label">Pérdida sistema</div>
                <div class="gs-gaia-kpi-val" :style="{ color: lossColor(lossPct) }">{{ lossPct }}%</div>
                <div class="gs-gaia-kpi-sub">inv. → medidor</div>
              </div>
            </div>

            <!-- Tabla completa -->
            <div class="gs-metrics-table-wrap">
              <table class="gs-metrics-table">
                <thead>
                  <tr>
                    <th class="gs-mt-inv" style="text-align:left">Variable</th>
                    <th>Fase 1</th>
                    <th>Fase 2</th>
                    <th>Fase 3</th>
                    <th>Total / Prom</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="gs-mt-inv">Tensión (V)</td>
                    <td>{{ fmtV(detailData.gaia_snapshot.vp1) }}</td>
                    <td>{{ fmtV(detailData.gaia_snapshot.vp2) }}</td>
                    <td>{{ fmtV(detailData.gaia_snapshot.vp3) }}</td>
                    <td class="gs-mt-total">{{ fmtV(avgPhases(detailData.gaia_snapshot, 'vp')) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">Corriente (A)</td>
                    <td>{{ fmtA(detailData.gaia_snapshot.cp1) }}</td>
                    <td>{{ fmtA(detailData.gaia_snapshot.cp2) }}</td>
                    <td>{{ fmtA(detailData.gaia_snapshot.cp3) }}</td>
                    <td class="gs-mt-total">{{ fmtA(avgPhases(detailData.gaia_snapshot, 'cp')) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">Potencia activa (kW)</td>
                    <td>{{ fmtW(detailData.gaia_snapshot.ap1) }}</td>
                    <td>{{ fmtW(detailData.gaia_snapshot.ap2) }}</td>
                    <td>{{ fmtW(detailData.gaia_snapshot.ap3) }}</td>
                    <td class="gs-mt-total">{{ fmtW(detailData.gaia_snapshot.ap_total) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">Potencia reactiva (kVAr)</td>
                    <td>{{ fmtVAR(detailData.gaia_snapshot.rp1) }}</td>
                    <td>{{ fmtVAR(detailData.gaia_snapshot.rp2) }}</td>
                    <td>{{ fmtVAR(detailData.gaia_snapshot.rp3) }}</td>
                    <td class="gs-mt-total">{{ fmtVAR(detailData.gaia_snapshot.rp_total) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">Factor de potencia</td>
                    <td :class="fpClass(detailData.gaia_snapshot.pf1)">{{ fmtPF(detailData.gaia_snapshot.pf1) }}</td>
                    <td :class="fpClass(detailData.gaia_snapshot.pf2)">{{ fmtPF(detailData.gaia_snapshot.pf2) }}</td>
                    <td :class="fpClass(detailData.gaia_snapshot.pf3)">{{ fmtPF(detailData.gaia_snapshot.pf3) }}</td>
                    <td class="gs-mt-total" :class="fpClass(detailData.gaia_snapshot.pf_avg)">{{ fmtPF(detailData.gaia_snapshot.pf_avg) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">Desequilibrio de tensión (%)</td>
                    <td colspan="3" style="text-align:center;color:#6b7280">—</td>
                    <td class="gs-mt-total">{{ fmtDesequilibrio(detailData.gaia_snapshot) }}</td>
                  </tr>
                  <tr style="background:#f0fdf4">
                    <td class="gs-mt-inv" style="color:#059669;font-weight:700">Energía exportada (kWh)</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.eae1_wh) }}</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.eae2_wh) }}</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.eae3_wh) }}</td>
                    <td class="gs-mt-total" style="color:#059669;font-weight:700">{{ fmtWh(detailData.gaia_snapshot.eae_wh) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">Energía importada (kWh)</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.iae1_wh) }}</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.iae2_wh) }}</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.iae3_wh) }}</td>
                    <td class="gs-mt-total">{{ fmtWh(detailData.gaia_snapshot.iae_wh) }}</td>
                  </tr>
                  <tr>
                    <td class="gs-mt-inv">En. reactiva export. (kVARh)</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.ere1_wh) }}</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.ere2_wh) }}</td>
                    <td>{{ fmtWh(detailData.gaia_snapshot.ere3_wh) }}</td>
                    <td class="gs-mt-total">{{ fmtWh(detailData.gaia_snapshot.ere_wh) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Sin nodo Gaia -->
          <div v-else-if="detailData.gaia_node_id === null && !loadingDetail" class="gs-gaia-empty">
            <i class="pi pi-info-circle" style="font-size:16px;color:#9ca3af" />
            <span>Medidor eléctrico no registrado en Gaia para este proyecto</span>
          </div>
        </template>

      </div>
    </Transition>

    <!-- ══ PROJECT CARDS GRID ════════════════════════════════════════════════ -->
    <div v-if="monitoringData" class="gs-cards-grid">
      <div v-if="!filteredProjects.length" class="gs-empty">
        <i class="pi pi-search text-3xl mb-2" style="color:#9ca3af" />
        <p style="color:#6b5a8a">Sin proyectos que coincidan con el filtro</p>
      </div>

      <div v-for="proj in filteredProjects" :key="proj.proyecto_id"
        class="gs-card"
        :class="{ 'gs-card--selected': selectedProyId === proj.proyecto_id }"
        :style="{
          borderLeftColor: STATUS_CFG[proj.status]?.border || '#e5e7eb',
          backgroundColor: selectedProyId === proj.proyecto_id ? '#faf7ff' : '#fff',
        }"
        @click="selectProject(proj)">

        <div class="gs-card-badge"
          :style="{ background: STATUS_CFG[proj.status]?.bg, color: STATUS_CFG[proj.status]?.color }">
          <span class="gs-status-dot" :style="{ background: STATUS_CFG[proj.status]?.dot }" />
          {{ STATUS_CFG[proj.status]?.label || proj.status }}
        </div>

        <div class="gs-card-name">{{ proj.nombre }}</div>

        <div class="gs-card-power">
          <span class="gs-card-power-val">{{ proj.power_kw != null ? proj.power_kw.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }}</span>
          <span class="gs-card-power-unit">kW</span>
        </div>

        <div class="gs-card-util">
          <div class="gs-util-bar gs-util-bar--card">
            <div class="gs-util-bar-fill"
              :style="{
                width: Math.min(proj.utilization_pct || 0, 100) + '%',
                backgroundColor: STATUS_CFG[proj.status]?.dot || '#9ca3af',
              }" />
          </div>
          <span class="gs-card-util-pct">{{ proj.utilization_pct != null ? proj.utilization_pct + '%' : '—' }}</span>
        </div>

        <div class="gs-card-stats">
          <div class="gs-card-stat">
            <span class="gs-card-stat-label">kWh hoy</span>
            <span class="gs-card-stat-val">
              {{ proj.energy_today_kwh != null ? proj.energy_today_kwh.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }}
            </span>
          </div>
          <div class="gs-card-stat">
            <span class="gs-card-stat-label">Disponib.</span>
            <span class="gs-card-stat-val">
              {{ proj.availability_pct != null ? proj.availability_pct + '%' : '—' }}
            </span>
          </div>
        </div>

        <button class="gs-card-falla-btn" @click.stop="openFallaDialog(proj)">
          <i class="pi pi-bolt" style="font-size:10px" />
          Crear falla
        </button>
      </div>
    </div>

    <!-- Cards skeleton -->
    <div v-else class="gs-cards-grid">
      <div v-for="i in 8" :key="i" class="gs-card gs-card--skeleton" />
    </div>

    <!-- ══ FALLA DIALOG ══════════════════════════════════════════════════════ -->
    <Dialog v-model:visible="fallaDialogVisible" modal
      header="Nueva falla"
      class="w-full max-w-2xl"
      :closable="!savingFalla">
      <FallaForm
        :key="fallaFormKey"
        :initial="null"
        :catalogos="catalogos"
        :prefillProyectoIds="fallaProyectoIds"
        @save="onSaveFalla"
        @cancel="fallaDialogVisible = false" />
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'vue-chartjs'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import FallaForm from './Fallas/FallaForm.vue'

// ── Register Chart.js components ────────────────────────────────────────────
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// ── Toast ────────────────────────────────────────────────────────────────────
const toast = useToast()

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  online:           { label: 'Online',           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  degradado:        { label: 'Degradado',         color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  caido:            { label: 'Caído',             color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#dc2626' },
  sin_comunicacion: { label: 'Sin comunicación',  color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', dot: '#9ca3af' },
  offline:          { label: 'Offline',           color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', dot: '#d1d5db' },
}

const STATUS_PILLS = [
  { key: 'all',     label: 'Todos',       color: '#915BD8' },
  { key: 'alertas', label: '⚠️ Alertas',  color: '#dc2626' },
  { key: 'online',  label: '✅ Online',   color: '#16a34a' },
  { key: 'sincom',  label: '📡 Sin com.', color: '#6b7280' },
]

// ── State ────────────────────────────────────────────────────────────────────
const loading        = ref(false)
const loadingDetail  = ref(false)
const monitoringData = ref(null)
const selectedProyId = ref(null)
const detailData     = ref(null)
const activeFilter   = ref('all')
const searchText     = ref('')
const lastUpdated    = ref('')
const detailRef      = ref(null)

// Auto-refresh countdown (300s)
const REFRESH_INTERVAL = 300
const countdown        = ref(REFRESH_INTERVAL)
let   countdownTimer   = null
let   refreshTimer     = null

const countdownDisplay = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

// ── Falla dialog ─────────────────────────────────────────────────────────────
const fallaDialogVisible = ref(false)
const fallaProyectoIds   = ref([])
const fallaFormKey       = ref(0)
const savingFalla        = ref(false)
const catalogos          = ref({ estados: [], prioridades: [], tipos: [] })

// ── Computed ─────────────────────────────────────────────────────────────────
const filteredProjects = computed(() => {
  if (!monitoringData.value) return []
  let list = monitoringData.value.projects

  if (activeFilter.value === 'alertas') {
    list = list.filter(p => p.status === 'caido' || p.status === 'sin_comunicacion' || p.status === 'degradado')
  } else if (activeFilter.value === 'online') {
    list = list.filter(p => p.status === 'online')
  } else if (activeFilter.value === 'sincom') {
    list = list.filter(p => p.status === 'sin_comunicacion')
  }

  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase()
    list = list.filter(p => p.nombre?.toLowerCase().includes(q))
  }

  return list
})

// ── Chart data ────────────────────────────────────────────────────────────────
const BRAND_PURPLE      = '#915BD8'
const BRAND_PURPLE_DARK = '#6b3aab'

const powerCurveData = computed(() => {
  if (!detailData.value?.power_curve?.length) return { labels: [], datasets: [] }
  const curve = detailData.value.power_curve
  const labels = curve.map(pt => {
    // "2026-05-22 08:00" → "08:00"
    const ts = pt.time || ''
    return ts.includes(' ') ? ts.split(' ')[1].slice(0, 5) : ts.slice(0, 5)
  })
  const values = curve.map(pt => pt.kw)
  return {
    labels,
    datasets: [{
      label: 'Potencia (kW)',
      data: values,
      borderColor: BRAND_PURPLE,
      backgroundColor: 'rgba(145, 91, 216, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: labels.length > 50 ? 0 : 2,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  }
})

const powerCurveOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.parsed.y?.toFixed(2)} kW`,
      },
    },
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 12,
        font: { size: 10 },
        color: '#9ca3af',
      },
      grid: { display: false },
    },
    y: {
      ticks: { font: { size: 10 }, color: '#9ca3af' },
      grid: { color: 'rgba(0,0,0,0.05)' },
      title: { display: true, text: 'kW', font: { size: 10 }, color: '#9ca3af' },
    },
  },
}

const generation30dData = computed(() => {
  if (!detailData.value?.generation_30d?.length) return { labels: [], datasets: [] }
  const gen30 = detailData.value.generation_30d
  const today = new Date().toISOString().split('T')[0]
  const labels = gen30.map(d => {
    const dt = new Date(d.date + 'T12:00:00')
    return dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  })
  const values = gen30.map(d => d.kwh)
  const colors = gen30.map(d => d.date === today ? BRAND_PURPLE : 'rgba(145, 91, 216, 0.65)')
  return {
    labels,
    datasets: [{
      label: 'Generación (kWh)',
      data: values,
      backgroundColor: colors,
      borderRadius: 3,
      borderSkipped: false,
    }],
  }
})

const generation30dOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.parsed.y?.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kWh`,
      },
    },
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 10,
        font: { size: 10 },
        color: '#9ca3af',
      },
      grid: { display: false },
    },
    y: {
      ticks: { font: { size: 10 }, color: '#9ca3af' },
      grid: { color: 'rgba(0,0,0,0.05)' },
      title: { display: true, text: 'kWh', font: { size: 10 }, color: '#9ca3af' },
    },
  },
}

// ── String chart ─────────────────────────────────────────────────────────────
const stringMetric = ref('voltage')   // 'voltage' | 'current' | 'power'

const stringsChartData = computed(() => {
  const inverters = detailData.value?.inverters || []
  if (!inverters.some(inv => inv.strings?.length)) return { labels: [], datasets: [] }

  const labels  = []
  const values  = []
  const bgColors = []

  // Distinct colors per inverter (cycle through a palette)
  const PALETTE = [
    'rgba(145, 91, 216, 0.8)',   // purple
    'rgba(22, 163, 74, 0.8)',    // green
    'rgba(217, 119, 6, 0.8)',    // amber
    'rgba(14, 165, 233, 0.8)',   // sky
    'rgba(220, 38, 38, 0.8)',    // red
    'rgba(20, 184, 166, 0.8)',   // teal
    'rgba(168, 85, 247, 0.8)',   // violet
    'rgba(245, 158, 11, 0.8)',   // yellow
  ]

  let invIdx = 0
  for (const inv of inverters) {
    if (!inv.strings?.length) continue
    const baseColor = PALETTE[invIdx % PALETTE.length]

    // Compute per-inverter average for anomaly detection
    const vAvg = inv.strings.reduce((s, x) => s + (x.voltage_v ?? 0), 0) / inv.strings.length

    for (const s of inv.strings) {
      labels.push(`${inv.name} · ${s.label}`)

      let val = 0
      if (stringMetric.value === 'voltage') val = s.voltage_v ?? 0
      else if (stringMetric.value === 'current') val = s.current_a ?? 0
      else val = s.power_kw ?? 0

      values.push(val)

      // Anomaly coloring (voltage only)
      if (stringMetric.value === 'voltage' && s.voltage_v != null) {
        if (s.voltage_v === 0) bgColors.push('rgba(220, 38, 38, 0.85)')
        else if (vAvg > 50 && s.voltage_v < vAvg * 0.8) bgColors.push('rgba(217, 119, 6, 0.85)')
        else bgColors.push(baseColor)
      } else {
        bgColors.push(val === 0 ? 'rgba(220, 38, 38, 0.7)' : baseColor)
      }
    }
    invIdx++
  }

  const metricLabel = stringMetric.value === 'voltage' ? 'Tensión (V)'
    : stringMetric.value === 'current' ? 'Corriente (A)' : 'Potencia (kW)'

  return {
    labels,
    datasets: [{
      label: metricLabel,
      data: values,
      backgroundColor: bgColors,
      borderRadius: 3,
      borderSkipped: false,
    }],
  }
})

const stringsChartOptions = computed(() => {
  const yLabel = stringMetric.value === 'voltage' ? 'V'
    : stringMetric.value === 'current' ? 'A' : 'kW'
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.y?.toFixed(1)} ${yLabel}`,
          title: ctx => ctx[0]?.label || '',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: { size: 9 },
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 30,
        },
        grid: { display: false },
      },
      y: {
        ticks: { font: { size: 10 }, color: '#9ca3af' },
        grid: { color: 'rgba(0,0,0,0.04)' },
        title: { display: true, text: yLabel, font: { size: 10 }, color: '#9ca3af' },
        beginAtZero: true,
      },
    },
  }
})

// ── AC metrics helpers ───────────────────────────────────────────────────────
function fmtAC(v) {
  if (v == null) return '—'
  return v.toLocaleString('es-CO', { maximumFractionDigits: 2 })
}
function fpClass(v) {
  if (v == null) return ''
  return Math.abs(v) < 0.85 ? 'gs-mt-warn' : Math.abs(v) >= 0.95 ? 'gs-mt-good' : ''
}
function effClass(v) {
  if (v == null) return ''
  return v < 90 ? 'gs-mt-warn' : v >= 97 ? 'gs-mt-good' : ''
}

// ── Gaia electrical helpers ──────────────────────────────────────────────────
function fmtV(v)   { return v == null ? '—' : v.toFixed(1) + ' V' }
function fmtA(v)   { return v == null ? '—' : v.toFixed(1) + ' A' }
function fmtW(v)   { if (v == null) return '—'; return (v / 1000).toFixed(2) + ' kW' }
function fmtVAR(v) { if (v == null) return '—'; return (v / 1000).toFixed(2) + ' kVAr' }
function fmtPF(v)  { return v == null ? '—' : (Math.abs(v) > 1 ? v.toFixed(0) : v.toFixed(3)) }
function fmtWh(v)  { if (v == null) return '—'; return (v / 1000).toFixed(2) + ' kWh' }
function fmtGaiaTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
function fmtVA(p, q) {
  if (p == null && q == null) return '—'
  const s = Math.sqrt((p ?? 0) ** 2 + (q ?? 0) ** 2)
  return (s / 1000).toFixed(2) + ' kVA'
}
function fmtDesequilibrio(snap) {
  const vs = [snap.vp1, snap.vp2, snap.vp3].filter(v => v != null)
  if (vs.length < 3) return '—'
  const avg = vs.reduce((s, v) => s + v, 0) / 3
  if (!avg) return '—'
  const dev = Math.max(...vs.map(v => Math.abs(v - avg)))
  return (dev / avg * 100).toFixed(2) + ' %'
}
function avgPhases(snap, prefix) {
  const vals = [snap[prefix + '1'], snap[prefix + '2'], snap[prefix + '3']].filter(v => v != null)
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
}
function fpColor(v) {
  if (v == null) return '#9ca3af'
  return Math.abs(v) < 0.85 ? '#dc2626' : Math.abs(v) >= 0.95 ? '#16a34a' : '#d97706'
}
function lossColor(pct) {
  if (pct == null) return '#9ca3af'
  return pct < 2 ? '#16a34a' : pct < 5 ? '#d97706' : '#dc2626'
}

// Pérdida estimada: (kWh inversores - kWh medidor) / kWh inversores × 100
const lossPct = computed(() => {
  const snap = detailData.value?.gaia_snapshot
  if (!snap) return null
  const meterKwh = (snap.eae_wh ?? 0) / 1000
  if (!meterKwh) return null
  // Sum today's inverter generation from the power curve (5-min intervals → kWh)
  const curve = detailData.value?.power_curve ?? []
  if (!curve.length) return null
  const invKwh = curve.reduce((s, pt) => s + (pt.kw ?? 0) * (5 / 60), 0)
  if (invKwh <= 0) return null
  return +((invKwh - meterKwh) / invKwh * 100).toFixed(1)
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPower(kw) {
  if (kw == null) return '—'
  if (kw >= 1000) return (kw / 1000).toFixed(1) + ' MW'
  return kw.toFixed(1) + ' kW'
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  resetCountdown()
  try {
    const res = await api.get('/generacion-solar/monitoring')
    monitoringData.value = res.data
    const now = new Date()
    lastUpdated.value = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error al cargar monitoreo', detail: err?.message, life: 4000 })
  } finally {
    loading.value = false
  }
}

async function loadDetail(proyectoId) {
  loadingDetail.value = true
  detailData.value = null
  // Scroll al panel inmediatamente (aparece el spinner)
  await nextTick()
  detailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  try {
    const res = await api.get(`/generacion-solar/monitoring/${proyectoId}`)
    detailData.value = res.data
  } catch (err) {
    toast.add({ severity: 'warn', summary: 'Sin detalle', detail: 'No se pudo cargar el detalle del proyecto', life: 3000 })
    detailData.value = null
  } finally {
    loadingDetail.value = false
  }
}

async function loadCatalogos() {
  try {
    const res = await api.get('/fallas/catalogos')
    catalogos.value = res.data
  } catch { /* no crítico */ }
}

// ── Project selection ─────────────────────────────────────────────────────────
function selectProject(proj) {
  if (selectedProyId.value === proj.proyecto_id) {
    closeDetail()
    return
  }
  selectedProyId.value = proj.proyecto_id
  loadDetail(proj.proyecto_id)
}

function closeDetail() {
  selectedProyId.value = null
  detailData.value = null
}

// ── Falla dialog ──────────────────────────────────────────────────────────────
function openFallaDialog(proj) {
  if (proj) {
    fallaProyectoIds.value = [proj.proyecto_id]
  } else if (selectedProyId.value) {
    fallaProyectoIds.value = [selectedProyId.value]
  } else {
    fallaProyectoIds.value = []
  }
  fallaFormKey.value++     // reset form
  fallaDialogVisible.value = true
}

async function onSaveFalla(payload) {
  savingFalla.value = true
  try {
    const { proyecto_ids, nota_inicial, _archivos, ...base } = payload
    const ids = proyecto_ids ?? []
    const archivos = _archivos ?? []

    if (!ids.length) {
      toast.add({ severity: 'warn', summary: 'Sin proyecto', detail: 'Selecciona un proyecto para la falla', life: 3000 })
      return
    }

    // Create one falla per project in parallel
    const nuevas = await Promise.all(
      ids.map(pid => api.post('/fallas', { ...base, proyecto_id: pid }).then(r => r.data))
    )

    // Nota inicial
    if (nota_inicial) {
      await Promise.all(
        nuevas.map(f => api.post(`/fallas/${f.id}/seguimientos`, { nota: nota_inicial }))
      )
    }

    // File attachments
    if (archivos.length) {
      await Promise.all(
        nuevas.flatMap(f =>
          archivos.map(file => {
            const fd = new FormData()
            fd.append('archivo', file)
            return api.post(`/fallas/${f.id}/archivos`, fd)
          })
        )
      )
    }

    const n = nuevas.length
    toast.add({
      severity: 'success',
      summary: n === 1 ? 'Falla registrada' : `${n} fallas registradas`,
      life: 3000,
    })
    fallaDialogVisible.value = false
    // Reload monitoring data to reflect any status changes
    cargar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error al guardar', detail: err?.response?.data?.detail || err?.message, life: 4000 })
  } finally {
    savingFalla.value = false
  }
}

// ── Auto-refresh countdown ────────────────────────────────────────────────────
function resetCountdown() {
  countdown.value = REFRESH_INTERVAL
}

function startTimers() {
  // Countdown ticks every second
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    }
  }, 1000)

  // Auto-refresh every 300s
  refreshTimer = setInterval(() => {
    cargar()
  }, REFRESH_INTERVAL * 1000)
}

function stopTimers() {
  if (countdownTimer) clearInterval(countdownTimer)
  if (refreshTimer)   clearInterval(refreshTimer)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  cargar()
  loadCatalogos()
  startTimers()
})

onUnmounted(() => {
  stopTimers()
})
</script>

<style scoped>
.gs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Sora', system-ui, sans-serif;
}

/* ── Header ── */
.gs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.gs-title {
  font-size: 20px;
  font-weight: 800;
  color: #2C2039;
  margin: 0;
}

.gs-subtitle {
  font-size: 12px;
  color: #6b5a8a;
  margin: 2px 0 0;
}

.gs-last-updated {
  color: #9ca3af;
}

.gs-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gs-countdown-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f0f9;
  color: #6b5a8a;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  border: 1px solid #e8e0f0;
  transition: all 0.3s;
}

.gs-countdown-chip--urgent {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.gs-refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  background: #915BD8;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;
}

.gs-refresh-btn:disabled {
  background: #a78bcc;
  cursor: not-allowed;
}

.gs-refresh-btn:not(:disabled):hover {
  background: #7a3fc0;
}

/* ── KPI strip ── */
.gs-kpi-strip {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.gs-kpi {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #e8e0f0;
  border-radius: 12px;
  padding: 12px 16px;
  flex: 1;
  min-width: 130px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.gs-kpi--skeleton {
  min-height: 60px;
  background: linear-gradient(90deg, #f3f0f9 25%, #ece8f5 50%, #f3f0f9 75%);
  background-size: 200% 100%;
  animation: gs-shimmer 1.4s infinite;
}

@keyframes gs-shimmer {
  0%   { background-position: 200% 0 }
  100% { background-position: -200% 0 }
}

.gs-kpi-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  flex-shrink: 0;
}

.gs-kpi-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.gs-kpi-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
  color: #2C2039;
}

.gs-kpi-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ca3af;
}

.gs-kpi-util-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.gs-util-bar {
  height: 5px;
  background: #f3f0f9;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 4px;
  min-width: 80px;
}

.gs-util-bar--card {
  width: 100%;
  min-width: 0;
}

.gs-util-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

/* ── Status dot ── */
.gs-status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Filter bar ── */
.gs-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.gs-status-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gs-pill {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid #e8e0f0;
  background: white;
  font-size: 12px;
  font-weight: 600;
  color: #6b5a8a;
  cursor: pointer;
  transition: all 0.15s;
}

.gs-pill:hover {
  border-color: #915BD8;
  color: #915BD8;
}

.gs-pill--active {
  border-color: transparent;
  color: white !important;
}

.gs-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 320px;
}

.gs-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 12px;
}

.gs-search-input {
  width: 100%;
  padding: 7px 12px 7px 32px;
  border: 1px solid #e8e0f0;
  border-radius: 8px;
  font-size: 13px;
  color: #2C2039;
  background: white;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.gs-search-input:focus {
  border-color: #915BD8;
}

.gs-search-input::placeholder {
  color: #c4b5e0;
}

/* ── Cards grid ── */
.gs-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

@media (min-width: 1280px) {
  .gs-cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.gs-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  gap: 8px;
}

/* ── Project card ── */
.gs-card {
  position: relative;
  background: white;
  border: 1px solid #e8e0f0;
  border-left-width: 4px;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.gs-card:hover {
  box-shadow: 0 4px 12px rgba(145,91,216,0.15);
  transform: translateY(-1px);
}

.gs-card--selected {
  outline: 2px solid #915BD8;
  outline-offset: 1px;
}

.gs-card--skeleton {
  min-height: 160px;
  background: linear-gradient(90deg, #f9f7fc 25%, #f0ecf8 50%, #f9f7fc 75%);
  background-size: 200% 100%;
  animation: gs-shimmer 1.4s infinite;
  cursor: default;
}

.gs-card-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.gs-card-name {
  font-size: 13px;
  font-weight: 700;
  color: #2C2039;
  padding-right: 80px;
  line-height: 1.3;
}

.gs-card-power {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.gs-card-power-val {
  font-size: 26px;
  font-weight: 800;
  color: #2C2039;
  line-height: 1;
}

.gs-card-power-unit {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 600;
}

.gs-card-util {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gs-card-util-pct {
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
  white-space: nowrap;
  min-width: 34px;
  text-align: right;
}

.gs-card-stats {
  display: flex;
  gap: 8px;
}

.gs-card-stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}

.gs-card-stat-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #9ca3af;
}

.gs-card-stat-val {
  font-size: 13px;
  font-weight: 700;
  color: #2C2039;
}

.gs-card-falla-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #e8e0f0;
  background: white;
  color: #915BD8;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  align-self: flex-start;
}

.gs-card-falla-btn:hover {
  background: rgba(145,91,216,0.08);
  border-color: #915BD8;
}

.gs-card-falla-btn--lg {
  font-size: 12px;
  padding: 7px 14px;
}

/* ── Detail panel ── */
.gs-detail-panel {
  background: white;
  border: 1px solid #e8e0f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(145,91,216,0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.gs-panel-slide-enter-active,
.gs-panel-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.gs-panel-slide-enter-from,
.gs-panel-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.gs-detail-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  font-size: 14px;
}

.gs-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.gs-detail-header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gs-detail-title {
  font-size: 18px;
  font-weight: 800;
  color: #2C2039;
  margin: 0;
}

.gs-detail-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.gs-sol-badge {
  background: rgba(145,91,216,0.1);
  color: #915BD8;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.gs-detail-cap,
.gs-detail-total {
  font-size: 12px;
  color: #6b5a8a;
}

.gs-detail-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gs-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e8e0f0;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.15s;
}

.gs-close-btn:hover {
  background: #f9f7fc;
  border-color: #915BD8;
  color: #915BD8;
}

.gs-section-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b5a8a;
  margin: 0 0 12px;
}

/* ── Inverters ── */
.gs-inverters-section {
  display: flex;
  flex-direction: column;
}

.gs-inverters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.gs-inv-card {
  background: #faf8ff;
  border: 1px solid #f0eaf8;
  border-left-width: 3px;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gs-inv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.gs-inv-name {
  font-size: 11px;
  font-weight: 700;
  color: #2C2039;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gs-inv-state {
  font-size: 10px;
  font-weight: 600;
  min-height: 14px;
}

.gs-inv-power {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-top: 2px;
}

.gs-inv-power-val {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.gs-inv-power-unit {
  font-size: 10px;
  color: #9ca3af;
  font-weight: 600;
}

/* ── Charts ── */
.gs-charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .gs-charts-row {
    grid-template-columns: 1fr;
  }
}

.gs-chart-card {
  background: #faf8ff;
  border: 1px solid #f0eaf8;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.gs-chart-container {
  height: 220px;
  position: relative;
}

.gs-chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 220px;
  gap: 8px;
  color: #9ca3af;
  font-size: 12px;
}

/* ── Strings section ── */
.gs-strings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gs-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.gs-toggle-pills {
  display: flex;
  gap: 4px;
}

.gs-toggle-pill {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid #e8e0f0;
  background: white;
  color: #6b5a8a;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.gs-toggle-pill.active {
  background: #915BD8;
  border-color: #915BD8;
  color: white;
}

.gs-chart-container--strings {
  height: 240px;
}

/* ── Metrics table section ── */
.gs-metrics-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gs-metrics-table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #f0eaf8;
}

.gs-metrics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 780px;
}

.gs-metrics-table thead tr {
  background: #f5f3fc;
}

.gs-metrics-table th {
  padding: 7px 10px;
  text-align: right;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #6b5a8a;
  white-space: nowrap;
  border-bottom: 1px solid #ede8f8;
}

.gs-metrics-table th.gs-mt-inv {
  text-align: left;
  padding-left: 12px;
}

.gs-metrics-table tbody tr {
  border-bottom: 1px solid #f3f0f9;
  transition: background 0.1s;
}

.gs-metrics-table tbody tr:last-child {
  border-bottom: none;
}

.gs-metrics-table tbody tr:hover {
  background: #faf8ff;
}

.gs-metrics-table td {
  padding: 8px 10px;
  text-align: right;
  color: #374151;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gs-metrics-table td.gs-mt-inv {
  text-align: left;
  font-weight: 700;
  color: #2C2039;
  padding-left: 12px;
}

.gs-mt-inv-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gs-mt-good {
  color: #16a34a !important;
  font-weight: 700;
}

.gs-mt-warn {
  color: #dc2626 !important;
  font-weight: 700;
}

.gs-mt-total {
  font-weight: 700;
  background: #faf8ff;
  border-left: 1px solid #ede8f8;
}

/* ── Gaia electrical section ── */
.gs-gaia-kpis {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.gs-gaia-kpi {
  flex: 1;
  min-width: 120px;
  background: #faf8ff;
  border: 1px solid #ede8f8;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gs-gaia-kpi-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #9ca3af;
}

.gs-gaia-kpi-val {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.gs-gaia-kpi-sub {
  font-size: 9px;
  color: #9ca3af;
}

.gs-gaia-ts {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9ca3af;
}

.gs-gaia-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f9f9f9;
  border: 1px dashed #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
}
</style>
