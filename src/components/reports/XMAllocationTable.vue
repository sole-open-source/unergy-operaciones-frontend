<template>
  <div class="xat-card">
    <div class="xat-head">
      <i class="pi pi-sitemap text-sm" style="color:#915BD8" />
      <h3 class="xat-title">Asignaciones XM</h3>
      <span class="xat-sub">Exposición al mercado spot · {{ rows.length }} registro{{ rows.length !== 1 ? 's' : '' }}</span>
    </div>

    <DataTable
      :value="rows"
      :rowClass="rowClass"
      sortField="fecha" :sortOrder="1"
      removableSort
      paginator :rows="10" :rowsPerPageOptions="[10, 20, 50]"
      dataKey="fecha"
      class="xat-table" size="small" stripedRows
    >
      <template #empty>
        <div class="xat-empty">Sin asignaciones XM para este período.</div>
      </template>

      <Column field="fecha" header="Fecha" sortable style="min-width:8rem" />

      <Column field="mwhAsignados" header="MWh Asignados" sortable style="min-width:8rem">
        <template #body="{ data }">{{ fmtMWhNum(data.mwhAsignados) }}</template>
      </Column>

      <Column field="precioSpot" header="Precio Spot Prom." sortable style="min-width:9rem">
        <template #body="{ data }">
          <span :class="deviates(data) ? 'xat-warn-text' : ''">{{ fmt(data.precioSpot) }}</span>
          <i v-if="deviates(data)" class="pi pi-exclamation-triangle xat-warn-ico"
             v-tooltip.top="`Desvío ${devPct(data)}% frente al PPA (${fmt(data.precioPpa)})`" />
        </template>
      </Column>

      <Column field="impacto" header="Impacto Financiero" sortable style="min-width:9rem">
        <template #body="{ data }">
          <span :class="Number(data.impacto) < 0 ? 'xat-neg' : 'xat-pos'">{{ fmt(data.impacto) }}</span>
        </template>
      </Column>

      <Column field="estado" header="Estado" sortable style="min-width:8rem">
        <template #body="{ data }">
          <span class="xat-badge" :class="data.estado === 'Favorable' ? 'xat-badge--ok' : 'xat-badge--bad'">
            {{ data.estado }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { formatCurrency } from '@/utils/financialCalculations'

const props = defineProps({
  // [{ fecha, mwhAsignados, precioSpot, precioPpa, impacto, estado }]
  rows: { type: Array, default: () => [] },
  // Umbral de desvío (fracción) para resaltar filas: 0.15 = 15%.
  deviationThreshold: { type: Number, default: 0.15 },
})

const fmt = (v) => formatCurrency(v)
const fmtMWhNum = (v) => (v == null ? '—' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 }))

function devFraction(row) {
  const ppa = Number(row?.precioPpa) || 0
  if (ppa <= 0) return 0
  return Math.abs((Number(row?.precioSpot) || 0) - ppa) / ppa
}
function deviates(row) {
  return devFraction(row) >= props.deviationThreshold
}
function devPct(row) {
  return Math.round(devFraction(row) * 100)
}
function rowClass(row) {
  return deviates(row) ? 'xat-row-warn' : ''
}
</script>

<style scoped>
.xat-card {
  background: #fff;
  border: 1px solid #e8e0f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.05);
  font-family: 'Sora', system-ui, sans-serif;
  overflow: hidden;
}
.xat-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid #f0ebf6;
}
.xat-title { font-size: 13px; font-weight: 700; color: #2C2039; margin: 0; }
.xat-sub { font-size: 10.5px; color: #9b8fb0; margin-left: auto; }

.xat-table { font-size: 12px; }
.xat-empty { text-align: center; padding: 24px 0; color: #9b8fb0; font-size: 12px; }

.xat-pos { color: #15803D; font-weight: 700; font-variant-numeric: tabular-nums; }
.xat-neg { color: #DC2626; font-weight: 700; font-variant-numeric: tabular-nums; }
.xat-warn-text { color: #B45309; font-weight: 700; }
.xat-warn-ico { color: #D97706; font-size: 11px; margin-left: 5px; cursor: help; }

.xat-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.xat-badge--ok { background: #DCFCE7; color: #15803D; }
.xat-badge--bad { background: #FEE2E2; color: #B91C1C; }

/* Fila con desvío significativo del spot vs PPA */
:deep(.xat-row-warn) { background: #FEF9F0 !important; }
:deep(.xat-row-warn:hover) { background: #FDF3E0 !important; }
</style>
