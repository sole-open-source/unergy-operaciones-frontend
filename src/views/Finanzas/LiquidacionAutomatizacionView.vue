<template>
  <div class="liqauto-page">
    <!-- ── Topbar con tabs ─────────────────────────────────────────── -->
    <div class="liqauto-topbar">
      <div class="liqauto-title">
        <i class="pi pi-bolt text-sm" style="color:#915BD8" />
        <h2 class="text-base font-bold text-gray-800 whitespace-nowrap">Liquidaciones Automatizadas</h2>
        <span class="hidden xl:inline text-xs text-gray-500">· Carga de datos XM y contratos ASIC</span>
      </div>
      <div class="liqauto-topbar-spacer" />
      <div class="liqauto-tabs">
        <button v-for="t in TABS" :key="t.key" class="liqauto-tab"
          :class="{ 'liqauto-tab--on': tab === t.key }" @click="tab = t.key">
          <i :class="t.icon" /><span>{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- ══ Tab: Liquidaciones + XM ═══════════════════════════════════ -->
    <div v-show="tab === 'xm'" class="liqauto-body">
      <!-- Lista de liquidaciones -->
      <div class="rounded-xl border bg-white p-4" style="border-color:#ECE7F2">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <i class="pi pi-list text-sm" style="color:#915BD8" />
            <span class="text-sm font-bold" style="color:#2C2039">Liquidaciones</span>
          </div>
          <button class="liqauto-refresh" :disabled="cargando" @click="cargarLiquidaciones"
            v-tooltip.bottom="'Recargar liquidaciones'">
            <i :class="cargando ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" class="text-xs" />
          </button>
        </div>

        <div v-if="error" class="py-6 text-center text-xs text-red-600">
          <i class="pi pi-exclamation-circle mr-1" /> {{ error }}
        </div>

        <DataTable v-else :value="liquidaciones" :loading="cargando" class="text-sm" stripedRows
          paginator :rows="10" selectionMode="single" v-model:selection="seleccionada"
          dataKey="id" scrollable scrollHeight="360px"
          :emptyMessage="'No hay liquidaciones registradas.'">
          <Column field="id" header="ID" style="min-width:70px" />
          <Column field="periodo" header="Período" style="min-width:100px">
            <template #body="{ data }">{{ fmtPeriodo(data) }}</template>
          </Column>
          <Column header="Proyecto" style="min-width:180px">
            <template #body="{ data }">{{ data.proyecto_nombre || data.proyecto || data.nombre_comercial || `#${data.proyecto_id ?? '—'}` }}</template>
          </Column>
          <Column field="tipo" header="Tipo" style="min-width:110px">
            <template #body="{ data }">{{ data.tipo || data.tipo_proyecto || '—' }}</template>
          </Column>
          <Column field="estado" header="Estado" style="min-width:120px">
            <template #body="{ data }">
              <Tag v-if="data.estado" :value="data.estado" severity="secondary" class="text-xs" />
              <span v-else>—</span>
            </template>
          </Column>
          <Column header="Valor a pagar" style="min-width:130px">
            <template #body="{ data }">{{ fmtCOP(data.valor_a_pagar ?? data.valor_a_pagar_total) }}</template>
          </Column>
        </DataTable>
      </div>

      <!-- XM: loader + display de la liquidación seleccionada -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiquidacionXmDataLoader
          :liquidacion-id="seleccionadaId"
          @excel-cargado="refrescarXm"
          @auto-poblado="refrescarXm" />
        <LiquidacionXmDataDisplay
          ref="xmDisplay"
          :liquidacion-id="seleccionadaId" />
      </div>
    </div>

    <!-- ══ Tab: Contratos ASIC ═══════════════════════════════════════ -->
    <div v-show="tab === 'asic'" class="liqauto-body">
      <AsicContractsDisplay />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import api from '@/api/client'
import { fmtCOP, formatPeriodo } from '@/utils/liquidaciones'
import LiquidacionXmDataLoader from '@/components/finanzas/LiquidacionXmDataLoader.vue'
import LiquidacionXmDataDisplay from '@/components/finanzas/LiquidacionXmDataDisplay.vue'
import AsicContractsDisplay from '@/components/finanzas/AsicContractsDisplay.vue'

const TABS = [
  { key: 'xm', label: 'Liquidaciones · XM', icon: 'pi pi-table' },
  { key: 'asic', label: 'Contratos ASIC', icon: 'pi pi-book' },
]
const tab = ref('xm')

const liquidaciones = ref([])
const cargando = ref(false)
const error = ref('')
const seleccionada = ref(null)
const xmDisplay = ref(null)

const seleccionadaId = computed(() => seleccionada.value?.id ?? null)

function fmtPeriodo(row) {
  const p = row.periodo
  if (!p) return '—'
  // El backend puede llavear el período como "YYYY-MM-01" o "YYYY-MM".
  return formatPeriodo(String(p).length === 7 ? `${p}-01` : p)
}

async function cargarLiquidaciones() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/liquidaciones')
    liquidaciones.value = Array.isArray(data) ? data : (data?.items ?? [])
  } catch (e) {
    error.value = e.response?.data?.detail || 'No se pudieron cargar las liquidaciones.'
    liquidaciones.value = []
  } finally {
    cargando.value = false
  }
}

function refrescarXm() {
  xmDisplay.value?.cargar()
}

cargarLiquidaciones()
</script>

<style scoped>
.liqauto-page {
  min-height: 100%;
  background: #FDFAF7;
}
.liqauto-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  min-height: 44px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.liqauto-title { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.liqauto-topbar-spacer { flex: 1; }
.liqauto-tabs {
  display: inline-flex;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 2px;
}
.liqauto-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #6B5A8A;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.liqauto-tab i { font-size: 12px; }
.liqauto-tab:hover:not(.liqauto-tab--on) { color: #2C2039; background: rgba(145,91,216,.08); }
.liqauto-tab--on { background: #915BD8; color: #FDFAF7; box-shadow: 0 1px 4px rgba(145,91,216,.3); }

.liqauto-body {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.liqauto-refresh {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid #E5E2EC; background: #fff; color: #6E3FB8; cursor: pointer;
  transition: all .15s;
}
.liqauto-refresh:hover:not(:disabled) { background: #F4F1FA; }
.liqauto-refresh:disabled { opacity: .4; cursor: not-allowed; }
</style>
