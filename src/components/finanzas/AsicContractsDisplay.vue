<template>
  <div class="rounded-xl border bg-white p-4" style="border-color:#ECE7F2">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="pi pi-book text-sm" style="color:#915BD8" />
        <span class="text-sm font-bold" style="color:#2C2039">Contratos ASIC</span>
      </div>
      <button class="asic-refresh" :disabled="cargando" @click="cargar"
        v-tooltip.bottom="'Recargar contratos ASIC'">
        <i :class="cargando ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" class="text-xs" />
      </button>
    </div>

    <div v-if="cargando" class="py-8 text-center text-xs text-gray-400">
      <i class="pi pi-spin pi-spinner mr-2" style="color:#915BD8" /> Cargando…
    </div>

    <div v-else-if="error" class="py-6 text-center text-xs text-red-600">
      <i class="pi pi-exclamation-circle mr-1" /> {{ error }}
    </div>

    <DataTable v-else :value="contratos" class="text-sm" stripedRows paginator :rows="10"
      scrollable scrollHeight="420px" :emptyMessage="'No hay solicitudes ASIC registradas.'">
      <Column field="codigo_sic_contrato" header="Código SIC" style="min-width:120px">
        <template #body="{ data }">{{ data.codigo_sic_contrato || '—' }}</template>
      </Column>
      <Column field="contrato_interno" header="Contrato interno" style="min-width:130px">
        <template #body="{ data }">{{ data.contrato_interno || '—' }}</template>
      </Column>
      <Column field="nombre_interno" header="Nombre interno" style="min-width:160px">
        <template #body="{ data }">{{ data.nombre_interno || '—' }}</template>
      </Column>
      <Column field="proyecto_id" header="Proyecto" style="min-width:90px">
        <template #body="{ data }">{{ data.proyecto_id ?? '—' }}</template>
      </Column>
      <Column field="fecha_inicio" header="Inicio" style="min-width:100px">
        <template #body="{ data }">{{ fmtFecha(data.fecha_inicio) }}</template>
      </Column>
      <Column field="fecha_fin" header="Fin" style="min-width:100px">
        <template #body="{ data }">{{ fmtFecha(data.fecha_fin) }}</template>
      </Column>
      <Column field="estado_solicitud" header="Estado" style="min-width:120px">
        <template #body="{ data }">
          <Tag v-if="data.estado_solicitud" :value="data.estado_solicitud" severity="secondary" class="text-xs" />
          <span v-else>—</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import api from '@/api/client'

const contratos = ref([])
const cargando = ref(false)
const error = ref('')

function fmtFecha(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d) ? v : d.toLocaleDateString('es-CO')
}

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/asic')
    contratos.value = Array.isArray(data) ? data : (data?.items ?? [])
  } catch (e) {
    error.value = e.response?.data?.detail || 'No se pudieron cargar los contratos ASIC.'
    contratos.value = []
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)

defineExpose({ cargar })
</script>

<style scoped>
.asic-refresh {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid #E5E2EC; background: #fff; color: #6E3FB8; cursor: pointer;
  transition: all .15s;
}
.asic-refresh:hover:not(:disabled) { background: #F4F1FA; }
.asic-refresh:disabled { opacity: .4; cursor: not-allowed; }
</style>
