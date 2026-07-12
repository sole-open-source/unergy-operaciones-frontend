<template>
  <div class="rounded-xl border bg-white p-4" style="border-color:#ECE7F2">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-table text-sm" style="color:#915BD8" />
        <span class="text-sm font-bold" style="color:#2C2039">Datos XM de la liquidación</span>
        <span v-if="liquidacionId" class="text-xs text-gray-400 font-mono">#{{ liquidacionId }}</span>
      </div>
      <button class="xm-refresh" :disabled="cargando || !liquidacionId" @click="cargar"
        v-tooltip.bottom="'Recargar datos XM'">
        <i :class="cargando ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" class="text-xs" />
      </button>
    </div>

    <div v-if="!liquidacionId" class="py-8 text-center text-xs text-gray-400">
      Selecciona una liquidación para ver sus datos XM.
    </div>

    <div v-else-if="cargando" class="py-8 text-center text-xs text-gray-400">
      <i class="pi pi-spin pi-spinner mr-2" style="color:#915BD8" /> Cargando…
    </div>

    <div v-else-if="error" class="py-6 text-center text-xs text-red-600">
      <i class="pi pi-exclamation-circle mr-1" /> {{ error }}
    </div>

    <DataTable v-else :value="xmDatos" class="text-sm" stripedRows scrollable scrollHeight="360px"
      :emptyMessage="'Esta liquidación no tiene datos XM cargados aún.'">
      <Column field="frontera_id" header="Frontera" style="min-width:90px">
        <template #body="{ data }">{{ data.frontera_id ?? '—' }}</template>
      </Column>
      <Column field="tipo_venta" header="Tipo venta" style="min-width:110px">
        <template #body="{ data }">{{ data.tipo_venta || '—' }}</template>
      </Column>
      <Column field="energia_kwh" header="Energía (kWh)" style="min-width:120px">
        <template #body="{ data }">{{ fmtNum(data.energia_kwh) }}</template>
      </Column>
      <Column field="tarifa_aplicada_kwh" header="Tarifa/kWh" style="min-width:110px">
        <template #body="{ data }">{{ fmtCOP(data.tarifa_aplicada_kwh) }}</template>
      </Column>
      <Column field="valor_bruto_cop" header="Valor bruto" style="min-width:130px">
        <template #body="{ data }">{{ fmtCOP(data.valor_bruto_cop) }}</template>
      </Column>
      <Column field="referencia_factura_xm" header="Ref. factura XM" style="min-width:140px">
        <template #body="{ data }">{{ data.referencia_factura_xm || '—' }}</template>
      </Column>
      <Column field="fecha_factura_xm" header="Fecha factura" style="min-width:110px">
        <template #body="{ data }">{{ fmtFecha(data.fecha_factura_xm) }}</template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import api from '@/api/client'
import { fmtCOP } from '@/utils/liquidaciones'

const props = defineProps({
  liquidacionId: { type: [Number, String], default: null },
})

const xmDatos = ref([])
const cargando = ref(false)
const error = ref('')

function fmtNum(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(v)
}

function fmtFecha(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? v : d.toLocaleDateString('es-CO')
}

async function cargar() {
  if (!props.liquidacionId) { xmDatos.value = []; return }
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/liquidaciones/${props.liquidacionId}`)
    xmDatos.value = Array.isArray(data?.xm_datos) ? data.xm_datos : []
  } catch (e) {
    error.value = e.response?.data?.detail || 'No se pudieron cargar los datos XM.'
    xmDatos.value = []
  } finally {
    cargando.value = false
  }
}

watch(() => props.liquidacionId, cargar, { immediate: true })

defineExpose({ cargar })
</script>

<style scoped>
.xm-refresh {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid #E5E2EC; background: #fff; color: #6E3FB8; cursor: pointer;
  transition: all .15s;
}
.xm-refresh:hover:not(:disabled) { background: #F4F1FA; }
.xm-refresh:disabled { opacity: .4; cursor: not-allowed; }
</style>
