<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="pi pi-exclamation-triangle text-red-500" />
        <h4 class="font-semibold text-gray-700 text-sm">Alertas de desviación activas</h4>
        <Tag :value="`${alertasActivas.length}`" severity="danger" class="text-xs" />
      </div>
      <Button icon="pi pi-refresh" text size="small" severity="secondary" :loading="cargando"
        v-tooltip.top="'Actualizar'" @click="cargar" />
    </div>

    <div v-if="cargando" class="flex justify-center py-10"><ProgressSpinner style="width:40px;height:40px" /></div>

    <div v-else-if="alertasActivas.length === 0" class="flex flex-col items-center py-10 gap-2 text-gray-400">
      <i class="pi pi-check-circle text-green-400 text-3xl" />
      <p class="text-sm">No hay alertas de desviación activas.</p>
    </div>

    <DataTable v-else :value="alertasActivas" size="small" stripedRows :rowHover="true"
      :paginator="alertasActivas.length > 15" :rows="15" class="text-sm">
      <Column header="Contrato PPA" style="min-width:170px">
        <template #body="{ data }">{{ data.ppa_nombre || '—' }}</template>
      </Column>
      <Column header="Proyecto" style="min-width:150px">
        <template #body="{ data }">{{ data.proyecto_nombre || '—' }}</template>
      </Column>
      <Column header="Desviación" style="min-width:110px">
        <template #body="{ data }">
          <span :class="data.desviacion_pct < 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'">
            {{ formatPct(data.desviacion_pct) }}
          </span>
        </template>
      </Column>
      <Column header="Gen. real (kWh)" style="min-width:120px">
        <template #body="{ data }">{{ formatKwh(data.generacion_real_kwh) }}</template>
      </Column>
      <Column header="Gen. comprometida (kWh)" style="min-width:150px">
        <template #body="{ data }">{{ formatKwh(data.generacion_comprometida_kwh) }}</template>
      </Column>
      <Column header="Período" style="min-width:220px">
        <template #body="{ data }">
          <span class="text-xs text-gray-600">
            {{ formatFechaHora(data.periodo_inicio) }} → {{ formatFechaHora(data.periodo_fin) }}
          </span>
        </template>
      </Column>
      <Column header="Estado" style="min-width:100px">
        <template #body="{ data }">
          <Tag :value="estadoLabel(data.estado)" :severity="estadoSev(data.estado)" class="text-xs" />
        </template>
      </Column>
      <Column header="" style="width:120px">
        <template #body="{ data }">
          <Button v-if="esActiva(data)" label="Resolver" icon="pi pi-check" size="small" outlined
            severity="success" :loading="resolviendoId === data.id" @click="confirmarResolver(data)" />
        </template>
      </Column>
    </DataTable>

    <ConfirmDialog group="deviation-alerts" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import { getActiveDeviationAlerts, resolveDeviationAlert } from '@/services/alertDeviationService'

const toast = useToast()
const confirm = useConfirm()

const alertas = ref([])
const cargando = ref(true)
const resolviendoId = ref(null)

// Solo mostramos las que siguen activas (sin resolver).
const alertasActivas = computed(() => alertas.value.filter((a) => esActiva(a)))

function esActiva(a) {
  return !['resuelta', 'resolved'].includes(String(a.estado || '').toLowerCase())
}

function estadoLabel(e) {
  return { activa: 'Activa', active: 'Activa', resuelta: 'Resuelta', resolved: 'Resuelta' }[String(e || '').toLowerCase()] || (e || '—')
}

function estadoSev(e) {
  return esActiva({ estado: e }) ? 'danger' : 'success'
}

function formatPct(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  const n = Number(v)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)} %`
}

function formatKwh(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('en-US')
}

function formatFechaHora(f) {
  if (!f) return '—'
  const d = new Date(f)
  if (Number.isNaN(d.getTime())) return String(f)
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function confirmarResolver(alerta) {
  confirm.require({
    group: 'deviation-alerts',
    message: `¿Marcar como resuelta la alerta de "${alerta.proyecto_nombre || alerta.ppa_nombre || 'este proyecto'}"?`,
    header: 'Resolver alerta',
    icon: 'pi pi-check-circle',
    acceptSeverity: 'success',
    acceptLabel: 'Resolver',
    rejectLabel: 'Cancelar',
    accept: () => resolver(alerta),
  })
}

async function resolver(alerta) {
  resolviendoId.value = alerta.id
  try {
    await resolveDeviationAlert(alerta.id)
    // La quitamos de la vista (queda fuera del filtro de activas).
    alertas.value = alertas.value.map((a) => (a.id === alerta.id ? { ...a, estado: 'resuelta' } : a))
    toast.add({ severity: 'success', summary: 'Alerta resuelta', life: 2500 })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo resolver',
      detail: e.response?.data?.detail || e.message,
      life: 5000,
    })
  } finally {
    resolviendoId.value = null
  }
}

async function cargar() {
  cargando.value = true
  try {
    alertas.value = await getActiveDeviationAlerts()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar alertas',
      detail: e.response?.data?.detail || e.message,
      life: 5000,
    })
    alertas.value = []
  } finally {
    cargando.value = false
  }
}

// Expuesto para que el padre pueda pedir un refresco al cambiar reglas.
defineExpose({ cargar })

onMounted(cargar)
</script>
