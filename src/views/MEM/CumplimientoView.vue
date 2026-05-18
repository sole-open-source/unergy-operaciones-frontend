<template>
  <div class="p-6 space-y-6 min-h-screen" style="background: #FDFAF7; color: #2C2039;">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end gap-4 justify-between">
      <div>
        <h1 class="text-2xl font-bold" style="color: #2C2039;">Cumplimiento energético</h1>
        <p class="text-sm mt-0.5" style="color: #7a6e8a;">Balance contractual MWh por período</p>
      </div>
    </div>

    <!-- Tab switcher -->
    <div class="flex gap-2 p-1 rounded-xl w-fit" style="background: rgba(44,32,57,0.08);">
      <button
        @click="switchView('general')"
        :class="['px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150', activeView === 'general' ? 'tab-active' : 'tab-inactive']"
      >
        <i class="pi pi-chart-bar mr-2" />
        Monitoreo general
      </button>
      <button
        @click="switchView('contrato')"
        :class="['px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150', activeView === 'contrato' ? 'tab-active' : 'tab-inactive']"
      >
        <i class="pi pi-file-edit mr-2" />
        Por contrato
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- VISTA GENERAL                                                          -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeView === 'general'">

      <!-- Selectores período -->
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Mes</label>
          <Select v-model="selectedMonth" :options="MESES" optionLabel="label" optionValue="value" class="w-32" @change="loadGeneralData" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="selectedYear" :options="anios" class="w-24" @change="loadGeneralData" />
        </div>
      </div>

      <!-- Cargando -->
      <div v-if="generalLoading" class="flex flex-col items-center justify-center py-24 gap-4">
        <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
        <p class="text-sm" style="color:#7a6e8a;">Consultando generación de todos los contratos…</p>
      </div>

      <!-- Error -->
      <Message v-else-if="generalError" severity="error" :closable="false">{{ generalError }}</Message>

      <!-- Contenido general -->
      <template v-else-if="generalData">

        <!-- Info período -->
        <div class="flex items-center gap-3 text-sm flex-wrap" style="color: #7a6e8a;">
          <span class="font-semibold" style="color:#2C2039;">{{ generalData.contratos.length }} contratos activos</span>
          <span>·</span>
          <span v-if="generalData.periodo.es_mes_actual">
            Día {{ generalData.periodo.dia_actual }} de {{ generalData.periodo.dias_mes }}
          </span>
          <span v-else>Mes completo</span>
          <span v-if="generalData.periodo.dia_min_datos">
            · Datos hasta día {{ generalData.periodo.dia_min_datos }}
          </span>
        </div>

        <!-- Canvas + leyenda -->
        <div class="flex flex-col gap-3">
          <div ref="skyGeneralBox" class="relative rounded-2xl overflow-hidden"
               style="height: 260px; background: #06080f; border: 1px solid rgba(90,110,195,0.28);">
            <canvas ref="cvGeneralRef" class="absolute inset-0 w-full h-full" />
            <!-- Suelo solar -->
            <div class="absolute bottom-0 left-0 right-0 h-9"
                 style="background: #0c1422; border-top: 1px solid rgba(90,110,195,0.35);">
              <div class="flex gap-1.5 absolute left-1/2 -translate-x-1/2 top-1.5">
                <div v-for="i in 9" :key="i" class="w-5 h-3 rounded-sm"
                     style="background: #182040; border: 1px solid rgba(90,110,195,0.42);" />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-5">
            <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
              <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#F0C040" stroke-width="2.5"/></svg>
              Generación total contratos
            </div>
            <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
              <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#D64455" stroke-width="1.5" stroke-dasharray="5,3"/></svg>
              Mínimo agregado
            </div>
            <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
              <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#8870C8" stroke-width="1.5"/></svg>
              Máximo agregado
            </div>
          </div>
        </div>

        <!-- Métricas agregadas -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="metric-card" style="background: rgba(44,32,57,0.06);">
            <div class="metric-label">Generado acum. total</div>
            <div class="metric-value">{{ fmtMwh(generalData.totales.gen_total_mwh) }}</div>
          </div>
          <div v-if="generalData.periodo.es_mes_actual" class="metric-card" :class="generalProjClass">
            <div class="metric-label">Proyección fin de mes</div>
            <div class="metric-value" :class="generalProjValueClass">{{ fmtMwh(generalData.totales.gen_proyectada_mwh) }}</div>
          </div>
          <div class="metric-card" style="background: rgba(224,85,103,0.08); border: 1px solid rgba(224,85,103,0.25);">
            <div class="metric-label" style="color:#c0504d;">Mínimo total contratos</div>
            <div class="metric-value">{{ fmtMwh(generalData.totales.energia_minima_mwh) }}</div>
          </div>
          <div class="metric-card" style="background: rgba(145,91,216,0.08); border: 1px solid rgba(145,91,216,0.3);">
            <div class="metric-label" style="color:#915BD8;">Máximo total contratos</div>
            <div class="metric-value">{{ fmtMwh(generalData.totales.energia_maxima_mwh) }}</div>
          </div>
        </div>

        <!-- Tabla de contratos -->
        <div>
          <h2 class="text-base font-semibold mb-3" style="color:#2C2039;">Resumen por contrato</h2>
          <DataTable :value="generalData.contratos" size="small" stripedRows
            class="border rounded-xl overflow-hidden cursor-pointer" style="border-color: rgba(44,32,57,0.12);"
            @row-click="e => goToContrato(e.data.id)"
            :rowClass="() => 'hover:bg-purple-50 transition-colors duration-100'"
          >
            <Column header="Contrato" style="min-width:180px;">
              <template #body="{ data: row }">
                <div class="font-semibold text-sm" style="color:#2C2039;">{{ row.nombre_interno || row.numero_codigo_contrato }}</div>
                <div class="text-xs mt-0.5" style="color:#7a6e8a;">{{ row.comprador_nombre }}</div>
              </template>
            </Column>
            <Column header="Mínimo" style="width:120px; text-align:right;">
              <template #body="{ data: row }">
                <span class="font-mono text-sm">{{ fmtMwh(row.energia_minima_mwh) }}</span>
              </template>
            </Column>
            <Column header="Máximo" style="width:120px; text-align:right;">
              <template #body="{ data: row }">
                <span class="font-mono text-sm">{{ fmtMwh(row.energia_maxima_mwh) }}</span>
              </template>
            </Column>
            <Column header="Despachado" style="width:130px; text-align:right;">
              <template #body="{ data: row }">
                <span class="font-mono text-sm font-semibold">{{ fmtMwh(row.gen_total_mwh) }}</span>
                <div v-if="row.dia_min_datos" class="text-xs mt-0.5" style="color:#7a6e8a;">hasta día {{ row.dia_min_datos }}</div>
              </template>
            </Column>
            <Column v-if="generalData.periodo.es_mes_actual" header="Proyección" style="width:130px; text-align:right;">
              <template #body="{ data: row }">
                <span class="font-mono text-sm" :class="row.estado === 'deficit' ? 'text-red-700 font-bold' : row.estado === 'excedente' ? 'text-amber-700 font-bold' : ''">
                  {{ fmtMwh(row.gen_proyectada_mwh) }}
                </span>
              </template>
            </Column>
            <Column header="Estado" style="width:200px;">
              <template #body="{ data: row }">
                <span :class="['estado-badge', `estado-${row.estado}`]">
                  {{ estadoLabel(row.estado) }}
                </span>
                <div v-if="row.plantas_sin_datos.length > 0" class="mt-1">
                  <i class="pi pi-exclamation-triangle text-orange-400 text-xs mr-1" />
                  <span class="text-xs" style="color:#b0a0c0;">{{ row.plantas_sin_datos.length }} planta(s) sin datos</span>
                </div>
              </template>
            </Column>
            <Column style="width:40px; text-align:center;">
              <template #body>
                <i class="pi pi-chevron-right text-xs" style="color:#915BD8;" />
              </template>
            </Column>
          </DataTable>
        </div>

      </template>

      <!-- Vacío general -->
      <div v-else-if="!generalLoading" class="text-center py-20" style="color:#7a6e8a;">
        <i class="pi pi-chart-bar text-5xl mb-4 block" style="color:#915BD8;" />
        <p>Selecciona un período para ver el monitoreo general.</p>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- VISTA POR CONTRATO                                                     -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeView === 'contrato'">

      <!-- Selectores -->
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Contrato</label>
          <Select v-model="selectedContratoId" :options="contratos" optionLabel="label" optionValue="id"
            placeholder="Seleccionar contrato" class="w-60" @change="loadData" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Mes</label>
          <Select v-model="selectedMonth" :options="MESES" optionLabel="label" optionValue="value" class="w-32" @change="loadData" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="selectedYear" :options="anios" class="w-24" @change="loadData" />
        </div>
      </div>

      <!-- Cargando -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
        <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
        <p class="text-sm" style="color:#7a6e8a;">Consultando generación desde la API de Unergy…</p>
      </div>

      <!-- Error -->
      <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

      <!-- Sin compromisos -->
      <Message v-else-if="data && !data.compromisos.energia_minima_mwh" severity="warn" :closable="false">
        No hay compromisos de energía definidos para {{ MESES[selectedMonth - 1]?.label }} {{ selectedYear }} en este contrato.
      </Message>

      <!-- Contenido contrato -->
      <template v-else-if="data">

        <!-- Resumen período -->
        <div class="flex items-center gap-3 text-sm flex-wrap" style="color: #7a6e8a;">
          <span class="font-semibold" style="color:#2C2039;">{{ data.contrato.nombre_interno }}</span>
          <span>·</span>
          <span>{{ data.contrato.comprador_nombre }}</span>
          <span>·</span>
          <span v-if="data.periodo.es_mes_actual">
            Día {{ data.periodo.dia_actual }} de {{ data.periodo.dias_mes }}
            <span v-if="data.periodo.dia_min_datos && data.periodo.dia_min_datos < data.periodo.dia_actual" style="color:#915BD8;">
              · Datos hasta día {{ data.periodo.dia_min_datos }}
            </span>
          </span>
          <span v-else>Mes completo</span>
        </div>

        <!-- Grid principal -->
        <div class="grid gap-6" style="grid-template-columns: 1fr 380px;">

          <!-- Canvas -->
          <div class="flex flex-col gap-3">
            <div ref="skyContratoBox" class="relative rounded-2xl overflow-hidden"
                 style="height: 300px; background: #06080f; border: 1px solid rgba(90,110,195,0.28);">
              <canvas ref="cvContratoRef" class="absolute inset-0 w-full h-full" />
              <!-- Suelo solar -->
              <div class="absolute bottom-0 left-0 right-0 h-9"
                   style="background: #0c1422; border-top: 1px solid rgba(90,110,195,0.35);">
                <div class="flex gap-1.5 absolute left-1/2 -translate-x-1/2 top-1.5">
                  <div v-for="i in 9" :key="i" class="w-5 h-3 rounded-sm"
                       style="background: #182040; border: 1px solid rgba(90,110,195,0.42);" />
                </div>
              </div>
            </div>

            <!-- Leyenda -->
            <div class="flex flex-wrap gap-5">
              <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
                <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#F0C040" stroke-width="2.5"/></svg>
                Generación contrato
              </div>
              <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
                <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#D64455" stroke-width="1.5" stroke-dasharray="5,3"/></svg>
                Mínimo take-or-pay
              </div>
              <div class="flex items-center gap-2 text-xs" style="color:#7a6e8a;">
                <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="#8870C8" stroke-width="1.5"/></svg>
                Máximo give-or-take
              </div>
            </div>
          </div>

          <!-- Panel métricas -->
          <div class="flex flex-col gap-4">
            <div :class="['rounded-xl px-4 py-3 text-sm font-semibold text-center tracking-wide', statusClass]">
              {{ statusText }}
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="metric-card" style="background: rgba(44,32,57,0.06);">
                <div class="metric-label">Generado acum.</div>
                <div class="metric-value">{{ fmtMwh(data.generacion.gen_total_mwh) }}</div>
                <div class="metric-sub" v-if="data.periodo.es_mes_actual">Real hasta día {{ data.periodo.dia_actual }}</div>
              </div>

              <div v-if="data.periodo.es_mes_actual" class="metric-card" :class="projCardClass">
                <div class="metric-label">Proy. fin de mes</div>
                <div class="metric-value" :class="projValueClass">{{ fmtMwh(data.generacion.gen_proyectada_mwh) }}</div>
                <div class="metric-sub">Extrap. lineal</div>
              </div>

              <div class="metric-card" style="background: rgba(224,85,103,0.08); border: 1px solid rgba(224,85,103,0.25);">
                <div class="metric-label" style="color:#c0504d;">Mínimo contrato</div>
                <div class="metric-value">{{ fmtMwh(data.compromisos.energia_minima_mwh) }}</div>
              </div>

              <div class="metric-card" style="background: rgba(145,91,216,0.08); border: 1px solid rgba(145,91,216,0.3);">
                <div class="metric-label" style="color:#915BD8;">Máximo contrato</div>
                <div class="metric-value">{{ fmtMwh(data.compromisos.energia_maxima_mwh) }}</div>
              </div>

              <div class="metric-card" :class="data.balance.compras_bolsa_mwh > 0 ? 'danger' : ''">
                <div class="metric-label">Compra en bolsa</div>
                <div class="metric-value" :class="data.balance.compras_bolsa_mwh > 0 ? 'text-red-700 font-bold' : ''">
                  {{ fmtMwh(data.balance.compras_bolsa_mwh) }}
                </div>
                <div class="metric-sub">max(0, mín − gen)</div>
              </div>

              <div class="metric-card" :class="data.balance.excedentes_bolsa_mwh > 0 ? 'warn' : ''">
                <div class="metric-label">Venta en bolsa</div>
                <div class="metric-value" :class="data.balance.excedentes_bolsa_mwh > 0 ? 'text-amber-700 font-bold' : ''">
                  {{ fmtMwh(data.balance.excedentes_bolsa_mwh) }}
                </div>
                <div class="metric-sub">max(0, gen − máx)</div>
              </div>
            </div>

            <div v-if="data.generacion.tarifa_cop_kwh" class="rounded-lg px-4 py-2.5 text-sm flex justify-between items-center" style="background: rgba(44,32,57,0.06);">
              <span style="color:#7a6e8a;">Tarifa contrato</span>
              <span class="font-semibold">{{ data.generacion.tarifa_cop_kwh.toFixed(0) }} COP/kWh</span>
            </div>
            <div class="rounded-lg px-4 py-2.5 text-sm flex justify-between items-center" style="background: rgba(44,32,57,0.06);">
              <span style="color:#7a6e8a;">Plantas activas GESCON</span>
              <span class="font-semibold">{{ data.generacion.n_plantas_activas }}</span>
            </div>
          </div>
        </div>

        <!-- Tabla plantas -->
        <div>
          <h2 class="text-base font-semibold mb-3" style="color:#2C2039;">Desglose por planta</h2>
          <DataTable :value="data.generacion.plantas" size="small" stripedRows
            class="border rounded-xl overflow-hidden" style="border-color: rgba(44,32,57,0.12);">
            <Column field="nombre" header="Planta" sortable style="min-width:200px;" />
            <Column header="% Despacho" style="width:110px; text-align:right;">
              <template #body="{ data: row }">
                <span class="font-mono text-sm">{{ (row.pct_despacho * 100).toFixed(1) }}%</span>
              </template>
            </Column>
            <Column header="Gen. planta" style="width:120px; text-align:right;">
              <template #body="{ data: row }">
                <span v-if="row.gen_planta_mwh !== null" class="font-mono text-sm">{{ fmtMwh(row.gen_planta_mwh) }}</span>
                <Tag v-else-if="row.sin_api_id" value="Sin API ID" severity="warn" />
                <Tag v-else value="Sin datos" severity="danger" />
              </template>
            </Column>
            <Column header="Gen. contrato" style="width:130px; text-align:right;">
              <template #body="{ data: row }">
                <span v-if="row.gen_contrato_mwh !== null" class="font-mono text-sm font-semibold">{{ fmtMwh(row.gen_contrato_mwh) }}</span>
                <span v-else class="text-xs" style="color:#b0a0c0;">—</span>
              </template>
            </Column>
            <Column header="Último dato" style="width:120px; text-align:center;">
              <template #body="{ data: row }">
                <span v-if="row.ultimo_dia" class="text-sm"
                  :style="row.ultimo_dia < data.periodo.dia_actual - 2 ? 'color:#c0504d;font-weight:600;' : 'color:#7a6e8a;'">
                  Día {{ row.ultimo_dia }}
                </span>
                <span v-else class="text-xs" style="color:#b0a0c0;">—</span>
              </template>
            </Column>
            <Column style="width:50px; text-align:center;">
              <template #body="{ data: row }">
                <i v-if="row.sin_api_id" class="pi pi-exclamation-circle text-orange-500"
                   v-tooltip="'Planta sin API ID configurado en proyectos'" />
                <i v-else-if="row.sin_datos" class="pi pi-exclamation-triangle text-red-500"
                   v-tooltip="'Sin datos de generación en la API'" />
                <i v-else-if="row.ultimo_dia && row.ultimo_dia < data.periodo.dia_actual - 2"
                   class="pi pi-clock text-yellow-500"
                   v-tooltip="`Datos atrasados: último registro día ${row.ultimo_dia}`" />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Alertas -->
        <div class="space-y-2">
          <Message v-if="data.generacion.sin_api_id.length > 0" severity="warn" :closable="false">
            <strong>Plantas sin API ID:</strong> {{ data.generacion.sin_api_id.join(', ') }}.
            Configura el campo <code>sub_project</code> en el detalle de cada proyecto.
          </Message>
          <Message v-if="data.generacion.plantas_sin_datos.length > 0" severity="error" :closable="false">
            <strong>Plantas sin datos de generación:</strong> {{ data.generacion.plantas_sin_datos.join(', ') }}.
            La generación acumulada está incompleta.
          </Message>
        </div>

      </template>

      <!-- Vacío contrato -->
      <div v-else-if="!loading" class="text-center py-20" style="color:#7a6e8a;">
        <i class="pi pi-chart-line text-5xl mb-4 block" style="color:#915BD8;" />
        <p>Selecciona un contrato y período para ver el cumplimiento.</p>
      </div>

    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import client from '@/api/client'

// ── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 }, { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 }, { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 },
]

const now   = new Date()
const anios = Array.from({ length: 8 }, (_, i) => 2023 + i)

// ── View state ────────────────────────────────────────────────────────────────

const activeView = ref('general')

// ── Shared period selectors ───────────────────────────────────────────────────

const selectedMonth = ref(now.getMonth() + 1)
const selectedYear  = ref(now.getFullYear())

// ── General view state ────────────────────────────────────────────────────────

const generalData    = ref(null)
const generalLoading = ref(false)
const generalError   = ref(null)
const skyGeneralBox  = ref(null)
const cvGeneralRef   = ref(null)

// ── Per-contract view state ───────────────────────────────────────────────────

const contratos          = ref([])
const selectedContratoId = ref(null)
const data               = ref(null)
const loading            = ref(false)
const error              = ref(null)
const skyContratoBox     = ref(null)
const cvContratoRef      = ref(null)

// ── Computed (per-contract) ───────────────────────────────────────────────────

const statusClass = computed(() => {
  const e = data.value?.balance?.estado
  if (e === 'ok')        return 'status-ok'
  if (e === 'deficit')   return 'status-low'
  if (e === 'excedente') return 'status-high'
  return 'status-neutral'
})

const statusText = computed(() => {
  if (!data.value) return ''
  const { estado, compras_bolsa_mwh, excedentes_bolsa_mwh } = data.value.balance
  const { es_mes_actual } = data.value.periodo
  if (estado === 'ok')
    return es_mes_actual ? 'Proyección OK — dentro de la zona contractual' : 'Cumplimiento — zona contractual'
  if (estado === 'deficit')
    return `${es_mes_actual ? 'Proyección: d' : 'D'}éficit ${fmtMwh(compras_bolsa_mwh)} — compra en bolsa`
  if (estado === 'excedente')
    return `${es_mes_actual ? 'Proyección: e' : 'E'}xcedente ${fmtMwh(excedentes_bolsa_mwh)} — venta en bolsa`
  return 'Sin compromisos para este período'
})

const projCardClass = computed(() => {
  const e = data.value?.balance?.estado
  if (e === 'deficit')   return 'danger'
  if (e === 'excedente') return 'warn'
  if (e === 'ok')        return 'ok-dark'
  return ''
})

const projValueClass = computed(() => {
  const e = data.value?.balance?.estado
  if (e === 'deficit')   return 'text-red-700 font-bold'
  if (e === 'excedente') return 'text-amber-700 font-bold'
  return ''
})

// ── Computed (general view) ───────────────────────────────────────────────────

const generalProjClass = computed(() => {
  const e = generalData.value?.totales?.estado
  if (e === 'deficit')   return 'danger'
  if (e === 'excedente') return 'warn'
  if (e === 'ok')        return 'ok-dark'
  return ''
})

const generalProjValueClass = computed(() => {
  const e = generalData.value?.totales?.estado
  if (e === 'deficit')   return 'text-red-700 font-bold'
  if (e === 'excedente') return 'text-amber-700 font-bold'
  return ''
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMwh(val) {
  if (val === null || val === undefined) return '—'
  return val.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MWh'
}

function estadoLabel(estado) {
  if (estado === 'deficit')          return 'Peligro de incumplimiento'
  if (estado === 'ok')               return 'Cumplimiento'
  if (estado === 'excedente')        return 'Excedente contractual'
  if (estado === 'sin_compromisos')  return 'Sin compromisos'
  return estado
}

// ── Animation (shared, parameterized) ────────────────────────────────────────

let animFrame = null
let _stars  = []
let _drops  = []
let _sparks = []
let _dust   = []

function rnd() { return Math.random() }

function initParticles(estado, W, H, minYh, maxYh) {
  _stars = Array.from({ length: 35 }, () => ({
    x: rnd() * W,
    y: rnd() * H * 0.68,
    r: 0.3 + rnd() * 0.9,
    phase: rnd() * Math.PI * 2,
    freq:  0.25 + rnd() * 0.7,
  }))

  _drops = []; _sparks = []; _dust = []

  if (estado === 'deficit') {
    for (let i = 0; i < 40; i++) {
      const x = 20 + rnd() * (W - 40)
      _drops.push({ x, y: -rnd() * H * 0.9, speed: 70 + rnd() * 85, len: 8 + rnd() * 11, alpha: 0.20 + rnd() * 0.28, slant: 0.08 + rnd() * 0.12, baseX: x })
    }
  } else if (estado === 'excedente') {
    for (let i = 0; i < 35; i++) {
      const x = 20 + rnd() * (W - 40)
      _sparks.push({ x, y: maxYh + rnd() * 12, vy: 22 + rnd() * 60, vx: (rnd() - 0.5) * 12, life: rnd() * 1.5, total: 1.5 + rnd() * 1.8, size: 1.3 + rnd() * 2.2, baseX: x, baseY: maxYh })
    }
  } else if (estado === 'ok') {
    const zoneH = Math.max(minYh - maxYh, 1)
    for (let i = 0; i < 20; i++) {
      const y = maxYh + rnd() * zoneH
      _dust.push({ x: 20 + rnd() * (W - 40), y, vy: 5 + rnd() * 18, life: rnd() * 4, total: 4 + rnd() * 5, size: 0.8 + rnd() * 1.6, baseY: maxYh, zoneH })
    }
  }
}

function startCanvasAnimation(canvas, box, params) {
  stopAnimation()
  if (!canvas || !box) return
  const { minV, maxV } = params
  if (!minV || !maxV) return

  const GROUND = 36
  const W = box.offsetWidth
  const H = box.offsetHeight - GROUND
  canvas.width  = W
  canvas.height = H + GROUND

  const { genTotal, desVal, fracMes, estado, diasMes } = params
  const totalMax = Math.max(maxV * 1.35, desVal * 1.15, 900)
  const toY  = v => H - (v / totalMax) * (H - 28) / 0.85
  const minYh = toY(minV)
  const maxYh = toY(maxV)

  initParticles(estado, W, H, minYh, maxYh)

  let lastTs = null
  const tick = (ts) => {
    const dt = lastTs === null ? 0.016 : Math.min((ts - lastTs) / 1000, 0.05)
    lastTs = ts
    render(canvas, ts / 1000, dt, W, H, desVal, genTotal, diasMes, minV, maxV, fracMes, estado, totalMax, minYh, maxYh)
    animFrame = requestAnimationFrame(tick)
  }
  animFrame = requestAnimationFrame(tick)
}

function stopAnimation() {
  if (animFrame !== null) { cancelAnimationFrame(animFrame); animFrame = null }
}

function startContratoAnimation() {
  if (!data.value?.compromisos?.energia_minima_mwh) return
  const { gen_total_mwh, gen_proyectada_mwh } = data.value.generacion
  const { energia_minima_mwh: minV, energia_maxima_mwh: maxV } = data.value.compromisos
  const { es_mes_actual, dia_actual, dias_mes } = data.value.periodo
  startCanvasAnimation(cvContratoRef.value, skyContratoBox.value, {
    genTotal: gen_total_mwh,
    desVal:   es_mes_actual ? gen_proyectada_mwh : gen_total_mwh,
    minV, maxV,
    fracMes:  es_mes_actual ? dia_actual / dias_mes : 1,
    estado:   data.value.balance.estado,
    diasMes:  dias_mes,
  })
}

function startGeneralAnimation() {
  const t = generalData.value?.totales
  const p = generalData.value?.periodo
  if (!t?.energia_minima_mwh) return
  startCanvasAnimation(cvGeneralRef.value, skyGeneralBox.value, {
    genTotal: t.gen_total_mwh,
    desVal:   p.es_mes_actual ? t.gen_proyectada_mwh : t.gen_total_mwh,
    minV:     t.energia_minima_mwh,
    maxV:     t.energia_maxima_mwh,
    fracMes:  p.es_mes_actual ? p.dia_actual / p.dias_mes : 1,
    estado:   t.estado,
    diasMes:  p.dias_mes,
  })
}

function render(canvas, t, dt, W, H, des, genTotal, diasMes, minV, maxV, fracMes, estado, totalMax, minYh, maxYh) {
  if (!canvas) return
  const ctx    = canvas.getContext('2d')
  const GROUND = 36
  const N      = 120
  const cxf    = f => 30 + f * (W - 60)
  const arcY   = (f, v) => H - Math.sin(f * Math.PI) * (H - 28) * (v / totalMax) / 0.85

  ctx.clearRect(0, 0, W, H + GROUND)

  // Sky — deep slate navy
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0,    '#06080f')
  sky.addColorStop(0.45, '#0c1422')
  sky.addColorStop(1,    '#141e30')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Stars — fewer, cooler white
  for (const s of _stars) {
    const a = 0.12 + 0.52 * ((Math.sin(t * s.freq + s.phase) + 1) * 0.5)
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(210,220,240,${a.toFixed(2)})`; ctx.fill()
  }

  // Zone band — subtle indigo
  const band = ctx.createLinearGradient(0, maxYh, 0, minYh)
  band.addColorStop(0,   'rgba(90,110,195,0.12)')
  band.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  band.addColorStop(1,   'rgba(90,110,195,0.12)')
  ctx.fillStyle = band
  ctx.fillRect(0, maxYh, W, minYh - maxYh)

  // Estado tint — muted
  if (estado === 'deficit') {
    const fog = ctx.createLinearGradient(0, minYh, 0, H)
    fog.addColorStop(0, 'rgba(70,130,215,0.07)')
    fog.addColorStop(1, 'rgba(50,95,175,0.03)')
    ctx.fillStyle = fog; ctx.fillRect(0, minYh, W, H - minYh)
  } else if (estado === 'excedente') {
    const glow = ctx.createLinearGradient(0, 0, 0, maxYh)
    glow.addColorStop(0, 'rgba(240,192,64,0.05)')
    glow.addColorStop(1, 'rgba(240,192,64,0)')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, maxYh)
  }

  // Particle animations
  if (estado === 'deficit')        _animRain(ctx, dt, H)
  else if (estado === 'excedente') _animSparks(ctx, t, dt, W, maxYh)
  else if (estado === 'ok')        _animWave(ctx, t, dt, W, minYh, maxYh)

  // Arc — single soft halo + uniform warm-gold line
  const traceArc = (from = 0, to = 1) => {
    ctx.beginPath()
    const steps = Math.ceil(N * (to - from))
    for (let i = 0; i <= steps; i++) {
      const f = from + (i / steps) * (to - from)
      i === 0 ? ctx.moveTo(cxf(f), arcY(f, des)) : ctx.lineTo(cxf(f), arcY(f, des))
    }
  }
  ctx.setLineDash([])
  traceArc(); ctx.strokeStyle = 'rgba(240,192,64,0.07)'; ctx.lineWidth = 18; ctx.stroke()
  traceArc(); ctx.strokeStyle = 'rgba(240,192,64,0.13)'; ctx.lineWidth = 6;  ctx.stroke()
  traceArc(); ctx.strokeStyle = '#F0C040';                ctx.lineWidth = 2.5; ctx.stroke()

  // Min/Max reference lines
  ctx.beginPath(); ctx.moveTo(0, minYh); ctx.lineTo(W, minYh)
  ctx.strokeStyle = '#D64455'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(0, maxYh); ctx.lineTo(W, maxYh)
  ctx.strokeStyle = '#8870C8'; ctx.lineWidth = 1.5; ctx.stroke()

  // Y-axis pills — gen always shown
  const _toY  = v => H - (v / totalMax) * (H - 28) / 0.85
  const genYh = Math.max(10, Math.min(_toY(genTotal), H - 10))
  const _fmtN = v => Math.round(v).toLocaleString('es-CO')

  const _axPill = (y, prefix, numStr, pillBg, pillFg, tickColor) => {
    ctx.font = '600 11px system-ui, sans-serif'
    const label = `${prefix}  ${numStr}`
    const tw    = ctx.measureText(label).width
    const bw    = tw + 14, bh = 20
    const bx    = W - bw - 18
    const by    = y - bh / 2
    ctx.fillStyle = pillBg
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 4) : ctx.rect(bx, by, bw, bh)
    ctx.fill()
    ctx.fillStyle = pillFg; ctx.textAlign = 'left'
    ctx.fillText(label, bx + 7, by + 14)
    ctx.strokeStyle = tickColor; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(W - 16, y); ctx.lineTo(W - 2, y); ctx.stroke()
  }

  ctx.setLineDash([])
  _axPill(maxYh, 'máx', _fmtN(maxV), 'rgba(18,10,36,0.88)', 'rgba(190,165,240,0.95)', '#8870C8')
  _axPill(minYh, 'mín', _fmtN(minV), 'rgba(26,6,12,0.88)',  'rgba(238,120,135,0.95)', '#D64455')
  if (genTotal > 0) {
    _axPill(genYh, 'gen', _fmtN(genTotal), 'rgba(18,16,5,0.90)', '#F0C040', 'rgba(240,192,64,0.85)')
  }
  ctx.textAlign = 'left'

  // Sun at arc peak
  _drawSun(ctx, t, cxf(0.5), arcY(0.5, des))

  // Gen mark at current day — dot + value label on arc
  if (fracMes > 0 && fracMes < 1 && genTotal > 0) {
    const mx = cxf(fracMes)
    const my = arcY(fracMes, des)
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 11)
    mg.addColorStop(0, 'rgba(255,255,255,0.20)'); mg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2); ctx.fillStyle = mg; ctx.fill()
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#F0C040'; ctx.lineWidth = 2; ctx.setLineDash([])
    ctx.fill(); ctx.stroke()
    const genLbl = `${_fmtN(genTotal)} MWh`
    ctx.font = '600 11px system-ui, sans-serif'
    const lw = ctx.measureText(genLbl).width + 14
    const lx = mx + 12 + lw < W - 20 ? mx + 12 : mx - 12 - lw
    const ly = my - 10
    ctx.fillStyle = 'rgba(8,12,22,0.92)'
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(lx, ly, lw, 20, 4) : ctx.rect(lx, ly, lw, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(240,192,64,0.45)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = '#F0C040'; ctx.textAlign = 'left'
    ctx.fillText(genLbl, lx + 7, ly + 14)
    ctx.textAlign = 'left'
  }

  // Progress bar
  const barY  = H - 12
  const barX0 = 30, barX1 = W - 30
  const progX  = barX0 + Math.min(fracMes, 1) * (barX1 - barX0)
  ctx.beginPath(); ctx.moveTo(barX0, barY); ctx.lineTo(barX1, barY)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke()
  if (fracMes > 0) {
    ctx.beginPath(); ctx.moveTo(barX0, barY); ctx.lineTo(progX, barY)
    ctx.strokeStyle = 'rgba(240,192,64,0.60)'; ctx.lineWidth = 2; ctx.stroke()
  }
  if (fracMes < 1) {
    ctx.beginPath(); ctx.arc(progX, barY, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = '#F0C040'; ctx.setLineDash([]); ctx.fill()
  }

  // Ground — drawn BEFORE day pill so the pill floats above
  const gnd = ctx.createLinearGradient(0, H - 10, 0, H + GROUND)
  gnd.addColorStop(0, 'rgba(12,20,34,0)')
  gnd.addColorStop(1, '#0c1422')
  ctx.fillStyle = gnd
  ctx.fillRect(0, H - 10, W, GROUND + 10)

  // Day labels + pill — drawn on top of ground
  const diaNum = fracMes < 1 ? Math.round(fracMes * diasMes) : diasMes
  ctx.textAlign = 'center'
  ctx.font = '400 9px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(190,205,230,0.28)'; ctx.fillText('1', barX0, barY + 13)
  ctx.fillStyle = fracMes >= 1 ? '#F0C040' : 'rgba(190,205,230,0.28)'
  ctx.fillText(String(diasMes), barX1, barY + 13)
  if (fracMes < 1) {
    const dayLbl = `día ${diaNum}`
    ctx.font = '700 11px system-ui, sans-serif'
    const dlw = ctx.measureText(dayLbl).width + 14
    const dlx = Math.min(Math.max(progX - dlw / 2, barX0), barX1 - dlw)
    ctx.fillStyle = 'rgba(8,12,22,0.92)'
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(dlx, barY + 4, dlw, 18, 4) : ctx.rect(dlx, barY + 4, dlw, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(240,192,64,0.40)'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke()
    ctx.fillStyle = '#F0C040'; ctx.fillText(dayLbl, progX, barY + 16)
  }
  ctx.textAlign = 'left'
}

function _drawSun(ctx, t, x, y) {
  const pulse = 1 + Math.sin(t * 1.8) * 0.08
  const r1 = 26 * pulse
  const cg1 = ctx.createRadialGradient(x, y, 0, x, y, r1)
  cg1.addColorStop(0,   'rgba(240,192,64,0.18)')
  cg1.addColorStop(0.5, 'rgba(220,170,40,0.07)')
  cg1.addColorStop(1,   'rgba(240,192,64,0)')
  ctx.beginPath(); ctx.arc(x, y, r1, 0, Math.PI * 2); ctx.fillStyle = cg1; ctx.fill()
  const r2 = 13 * pulse
  const cg2 = ctx.createRadialGradient(x, y, 0, x, y, r2)
  cg2.addColorStop(0,   'rgba(255,245,215,0.92)')
  cg2.addColorStop(0.5, 'rgba(240,192,64,0.68)')
  cg2.addColorStop(1,   'rgba(225,170,35,0)')
  ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fillStyle = cg2; ctx.fill()
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#FFF8E0'; ctx.fill()
}

function _animRain(ctx, dt, H) {
  ctx.save()
  for (const d of _drops) {
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.len * d.slant, d.y + d.len)
    ctx.strokeStyle = `rgba(110,160,215,${d.alpha})`; ctx.lineWidth = 1.1; ctx.stroke()
    d.y += d.speed * dt; d.x += d.speed * d.slant * dt
    if (d.y > H + d.len) { d.y = -d.len - rnd() * 80; d.x = d.baseX + (rnd() - 0.5) * 30 }
  }
  ctx.restore()
}

function _animSparks(ctx, t, dt, W, maxYh) {
  ctx.save()
  for (const s of _sparks) {
    const progress = s.life / s.total
    const alpha    = Math.max(0, Math.sin(progress * Math.PI))
    const r        = s.size * (1 - progress * 0.45)
    if (r > 0.2 && alpha > 0.02) {
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3.5)
      grd.addColorStop(0,   `rgba(255,228,120,${alpha.toFixed(2)})`)
      grd.addColorStop(0.4, `rgba(240,192,64,${(alpha * 0.8).toFixed(2)})`)
      grd.addColorStop(1,   'rgba(240,192,64,0)')
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 3.5, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,225,110,${alpha.toFixed(2)})`; ctx.fill()
    }
    s.life += dt; s.x += s.vx * dt; s.y -= s.vy * dt
    if (s.life >= s.total || s.y < -20) {
      s.x = s.baseX + (rnd() - 0.5) * 30; s.y = s.baseY + rnd() * 8
      s.vy = 25 + rnd() * 70; s.vx = (rnd() - 0.5) * 14
      s.life = rnd() * 0.5; s.size = 1.5 + rnd() * 2.5
    }
  }
  ctx.restore()
}

function _animWave(ctx, t, dt, W, minYh, maxYh) {
  ctx.save()
  for (const d of _dust) {
    const a = Math.max(0, Math.sin(d.life / d.total * Math.PI) * 0.38)
    ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(240,192,64,${a.toFixed(2)})`; ctx.fill()
    d.life += dt; d.y -= d.vy * dt
    if (d.life >= d.total || d.y < maxYh) {
      d.y = d.baseY + d.zoneH * (0.7 + rnd() * 0.3)
      d.x = 20 + rnd() * (W - 40); d.life = rnd() * 1.5; d.vy = 6 + rnd() * 20
    }
  }
  ctx.restore()
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadGeneralData() {
  generalLoading.value = true
  generalError.value   = null
  generalData.value    = null
  stopAnimation()
  try {
    const res = await client.get('/cumplimiento/ppa/resumen', {
      params: { year: selectedYear.value, month: selectedMonth.value },
    })
    generalData.value = res.data
    await nextTick()
    startGeneralAnimation()
  } catch (e) {
    generalError.value = e.response?.data?.detail || 'Error consultando el resumen general. Intenta de nuevo.'
  } finally {
    generalLoading.value = false
  }
}

async function loadData() {
  if (!selectedContratoId.value) return
  loading.value = true
  error.value   = null
  data.value    = null
  stopAnimation()
  try {
    const res = await client.get(`/cumplimiento/ppa/${selectedContratoId.value}`, {
      params: { year: selectedYear.value, month: selectedMonth.value },
    })
    data.value = res.data
    await nextTick()
    startContratoAnimation()
  } catch (e) {
    error.value = e.response?.data?.detail || 'Error consultando el cumplimiento. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────

async function goToContrato(id) {
  activeView.value = 'contrato'
  selectedContratoId.value = id
  await nextTick()
  await loadData()
}

async function switchView(view) {
  stopAnimation()
  activeView.value = view
  await nextTick()
  if (view === 'general') {
    if (generalData.value) startGeneralAnimation()
    else await loadGeneralData()
  } else {
    if (data.value) startContratoAnimation()
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const res = await client.get('/cumplimiento/ppa')
    contratos.value = res.data.map(c => ({
      ...c,
      label: c.nombre_interno || c.numero_codigo_contrato || `Contrato ${c.id}`,
    }))
    const terpel = contratos.value.find(c => c.nombre_interno === 'Terpel 1')
    selectedContratoId.value = terpel?.id || contratos.value[0]?.id
  } catch (e) {
    generalError.value = 'No se pudieron cargar los contratos PPA.'
  }
  await loadGeneralData()
})

onUnmounted(() => stopAnimation())

// ResizeObservers for both canvases
let resizeGeneral  = null
let resizeContrato = null

watch(skyGeneralBox, (el) => {
  resizeGeneral?.disconnect()
  if (!el) return
  resizeGeneral = new ResizeObserver(() => { if (generalData.value) startGeneralAnimation() })
  resizeGeneral.observe(el)
})

watch(skyContratoBox, (el) => {
  resizeContrato?.disconnect()
  if (!el) return
  resizeContrato = new ResizeObserver(() => { if (data.value) startContratoAnimation() })
  resizeContrato.observe(el)
})
</script>

<style scoped>
/* Tab switcher */
.tab-active {
  background: #2C2039;
  color: #F6FF72;
  border: 1px solid #915BD8;
}
.tab-inactive {
  background: transparent;
  color: #7a6e8a;
}
.tab-inactive:hover {
  background: rgba(44,32,57,0.12);
  color: #2C2039;
}

/* Estado badges (tabla general) */
.estado-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.estado-deficit   { background: #FAECE7; color: #791F1F; }
.estado-ok        { background: #E8F5E9; color: #1B5E20; }
.estado-excedente { background: #FAEEDA; color: #633806; }
.estado-sin_compromisos { background: rgba(44,32,57,0.08); color: #7a6e8a; }

/* Metric cards */
.metric-card {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(44, 32, 57, 0.06);
}
.metric-label {
  font-size: 11px;
  color: #7a6e8a;
  margin-bottom: 3px;
}
.metric-value {
  font-size: 17px;
  font-weight: 600;
  color: #2C2039;
  font-variant-numeric: tabular-nums;
}
.metric-sub {
  font-size: 10px;
  color: #b0a0c0;
  margin-top: 2px;
}
.metric-card.ok-dark           { background: #2C2039; border: 1px solid #915BD8; }
.metric-card.ok-dark .metric-label { color: #915BD8; }
.metric-card.ok-dark .metric-value { color: #F6FF72; }
.metric-card.danger { background: #FAECE7; }
.metric-card.warn   { background: #FAEEDA; }

/* Status banner (per-contract) */
.status-ok      { background: #2C2039; color: #F6FF72; border: 1px solid #915BD8; }
.status-low     { background: #FAECE7; color: #791F1F; }
.status-high    { background: #FAEEDA; color: #633806; }
.status-neutral { background: rgba(44,32,57,0.08); color: #7a6e8a; }

:deep(.p-datatable .p-datatable-thead th) {
  background: rgba(44, 32, 57, 0.05);
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
  background: rgba(145, 91, 216, 0.05) !important;
}
</style>
