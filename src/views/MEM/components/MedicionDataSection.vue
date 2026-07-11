<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-2xl" style="color:#915BD8" />
    </div>

    <!-- Error de carga (distinto de "sin datos") -->
    <div v-else-if="error" class="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
         style="background: rgba(214,68,85,0.06); border: 1.5px solid rgba(214,68,85,0.25);">
      <span class="text-sm font-medium" style="color:#D64455;">
        <i class="pi pi-exclamation-triangle text-xs mr-1.5" />{{ error }}
      </span>
      <Button label="Reintentar" size="small" text style="color:#D64455;" @click="cargar" />
    </div>

    <!-- Estado vacío: XM aún no ha liquidado (LiquidacionXMDato vacía) -->
    <div v-else-if="!datos.disponible"
         class="bg-white rounded-xl shadow-sm border text-center py-10 px-6" style="border-color:#e8e0f0">
      <i class="pi pi-database text-3xl mb-3" style="color:#e0d5f0" />
      <p class="text-sm font-semibold" style="color:#2C2039">Sin datos de medición</p>
      <p class="text-xs mt-1 mb-4" style="color:#9b8fb0">
        Esta frontera todavía no tiene mediciones registradas. Sincroniza con XM para traer la última liquidación disponible.
      </p>
      <Button icon="pi pi-sync" label="Sincronizar con XM" size="small"
              :loading="sincronizando" @click="sincronizar"
              style="background:#915BD8; border-color:#915BD8;" />
    </div>

    <template v-else>
      <!-- Card resumen: último valor / fecha / fuente -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl shadow-sm p-4" style="border:1px solid #e8e0f0;">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color:#6b5a8a;">Último valor</p>
          <p class="text-2xl font-bold mt-1" style="color:#915BD8;">{{ fmtValor(datos.ultima.valorMwh) }}</p>
          <p class="text-xs mt-0.5" style="color:#9b89b5;">{{ datos.ultima.tipoLabel }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4" style="border:1px solid #e8e0f0;">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color:#6b5a8a;">Fecha</p>
          <p class="text-base font-semibold mt-2" style="color:#2C2039;">{{ fmtFecha(datos.ultima.fecha) }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4" style="border:1px solid #e8e0f0;">
          <p class="text-xs uppercase tracking-wide font-semibold" style="color:#6b5a8a;">Fuente</p>
          <div class="mt-2">
            <Tag :value="datos.ultima.fuenteLabel" :severity="datos.ultima.fuenteSeverity" />
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <Button icon="pi pi-sync" label="Sincronizar con XM" size="small" text
                :loading="sincronizando" @click="sincronizar" style="color:#915BD8;" />
      </div>

      <!-- Tabla de mediciones recientes -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border:1px solid #e8e0f0;">
        <div class="px-4 py-3 border-b" style="border-color:#f0ebf6">
          <h3 class="text-sm font-bold" style="color:#2C2039">Mediciones recientes</h3>
        </div>
        <DataTable v-if="datos.recientes.length" :value="datos.recientes" :rows="10" :paginator="datos.recientes.length > 10"
                   responsiveLayout="scroll" stripedRows class="p-datatable-sm">
          <Column field="fecha" header="Fecha" style="min-width:160px">
            <template #body="{ data }">{{ fmtFecha(data.fecha) }}</template>
          </Column>
          <Column field="tipoLabel" header="Tipo" style="min-width:120px" />
          <Column field="valorMwh" header="Valor" style="min-width:120px">
            <template #body="{ data }">
              <span class="font-semibold" style="color:#2C2039">{{ fmtValor(data.valorMwh) }}</span>
            </template>
          </Column>
          <Column field="fuenteLabel" header="Fuente" style="min-width:110px">
            <template #body="{ data }">
              <Tag :value="data.fuenteLabel" :severity="data.fuenteSeverity" />
            </template>
          </Column>
        </DataTable>
        <p v-else class="text-center py-8 text-sm" style="color:#9b89b5;">
          No hay mediciones recientes adicionales.
        </p>
      </div>

      <!-- Gráfico histórico -->
      <MeasurementHistoryChart :generation-data="historico.generacion" :consumption-data="historico.consumo" />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import MeasurementHistoryChart from './MeasurementHistoryChart.vue'
import {
  getFronteraMeasurements, getMeasurementHistory, triggerXMIngestion,
  formatMedicionValor, formatMedicionFecha,
} from '@/services/fronterasService'

const props = defineProps({
  fronteraId: { type: [Number, String], required: true },
})

const toast = useToast()
const loading = ref(true)
const sincronizando = ref(false)
const error = ref('')
const datos = reactive({ disponible: false, ultima: null, recientes: [] })
const historico = reactive({ generacion: [], consumo: [] })

const fmtValor = formatMedicionValor
const fmtFecha = formatMedicionFecha

async function cargar() {
  if (props.fronteraId == null) return
  loading.value = true
  error.value = ''
  try {
    const res = await getFronteraMeasurements(props.fronteraId)
    datos.disponible = res.disponible
    datos.ultima = res.ultima
    datos.recientes = res.recientes
    if (res.disponible) await cargarHistorico()
  } catch (e) {
    // 404 = el backend aún no expone el endpoint → se trata como "sin datos".
    if (e?.response?.status === 404) {
      datos.disponible = false
      datos.ultima = null
      datos.recientes = []
    } else {
      error.value = e?.response?.data?.detail || 'No se pudieron cargar los datos de medición.'
    }
  } finally {
    loading.value = false
  }
}

async function cargarHistorico() {
  try {
    const h = await getMeasurementHistory(props.fronteraId)
    historico.generacion = h.generacion
    historico.consumo = h.consumo
  } catch {
    // El histórico es complementario: si falla, el resumen sigue visible.
    historico.generacion = []
    historico.consumo = []
  }
}

async function sincronizar() {
  sincronizando.value = true
  try {
    await triggerXMIngestion(props.fronteraId)
    toast.add({ severity: 'success', summary: 'Sincronización iniciada',
      detail: 'Se solicitó la ingesta de datos de XM. Los valores aparecerán en breve.', life: 3500 })
    await cargar()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error',
      detail: e?.response?.data?.detail || 'No se pudo iniciar la sincronización con XM.', life: 4000 })
  } finally {
    sincronizando.value = false
  }
}

watch(() => props.fronteraId, cargar)
onMounted(cargar)
</script>
