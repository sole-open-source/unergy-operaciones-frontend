<template>
  <div class="gf-page">
    <div class="mon-tab-bar">
      <i class="pi pi-cloud-upload text-sm" style="color:#915BD8" />
      <span class="text-base font-bold text-gray-800 whitespace-nowrap mr-2">Carga Contratos ASIC XM</span>
    </div>

    <div class="max-w-4xl mx-auto w-full mt-4 space-y-4 px-4 pb-8">
      <!-- Ayuda -->
      <div class="rounded-xl border p-3 flex items-start gap-2" style="background:#F1EAF9;border-color:#E0D3F5">
        <i class="pi pi-info-circle text-sm flex-shrink-0 mt-0.5" style="color:#6D28D9" />
        <p class="text-xs" style="color:#4C1D95">
          Sube el archivo de contratos que exporta el <strong>ASIC de XM</strong> (Excel o CSV). La plataforma
          lo procesa, valida cada fila y registra los contratos. Si hay errores de validación se listan abajo
          indicando la fila y la columna afectada.
        </p>
      </div>

      <!-- Selector + carga -->
      <Card>
        <template #title>
          <span class="text-sm font-semibold" style="color:#2C2039">Archivo ASIC</span>
        </template>
        <template #content>
          <XMASICFileUpload
            ref="fileUpload"
            :loading="loading"
            @file-selected="onFileSelected"
            @upload-initiated="onUploadInitiated"
            @cleared="onCleared"
          />

          <div v-if="loading" class="flex items-center gap-2 mt-3 text-sm text-gray-600">
            <i class="pi pi-spin pi-spinner" style="color:#915BD8" />
            Procesando archivo… esto puede tardar unos segundos.
          </div>
        </template>
      </Card>

      <!-- Éxito -->
      <Message v-if="result && !error" severity="success" :closable="false">
        <div class="space-y-1">
          <div class="font-semibold">Archivo procesado correctamente.</div>
          <div v-if="processedCount != null" class="text-xs">
            {{ processedCount }} contrato(s) ingresado(s).
          </div>
          <ul v-if="warnings.length" class="text-xs list-disc pl-4 mt-1">
            <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
          </ul>
        </div>
      </Message>

      <!-- Error general -->
      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>

      <!-- Errores de validación (fila/columna) -->
      <Card v-if="validationErrors.length">
        <template #title>
          <span class="text-sm font-semibold text-red-600">
            Errores de validación ({{ validationErrors.length }})
          </span>
        </template>
        <template #content>
          <DataTable :value="validationErrors" size="small" scrollable scrollHeight="320px" class="text-xs">
            <Column field="fila" header="Fila" style="width:90px">
              <template #body="{ data }">{{ data.fila ?? '—' }}</template>
            </Column>
            <Column field="columna" header="Columna">
              <template #body="{ data }">{{ data.columna ?? '—' }}</template>
            </Column>
            <Column field="msg" header="Detalle" />
          </DataTable>
        </template>
      </Card>

      <!-- Contratos procesados -->
      <Card v-if="contracts.length">
        <template #title>
          <span class="text-sm font-semibold" style="color:#2C2039">
            Contratos procesados ({{ contracts.length }})
          </span>
        </template>
        <template #content>
          <DataTable :value="contracts" size="small" paginator :rows="10" scrollable class="text-xs">
            <Column v-for="col in contractColumns" :key="col" :field="col" :header="col" />
          </DataTable>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Message from 'primevue/message'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import XMASICFileUpload from '@/components/integrations/XMASICFileUpload.vue'
import { uploadASICContracts, parseUploadError } from '@/services/integrations/xmAsicService'

const toast = useToast()
const fileUpload = ref(null)

const loading = ref(false)
const result = ref(null)
const error = ref('')
const validationErrors = ref([])

// El archivo actualmente seleccionado (aún no cargado).
const selectedFile = ref(null)

const contracts = computed(() => Array.isArray(result.value?.contratos) ? result.value.contratos : [])
const warnings = computed(() => Array.isArray(result.value?.advertencias) ? result.value.advertencias : [])
const processedCount = computed(() => {
  const c = result.value?.procesados ?? result.value?.filas
  return typeof c === 'number' ? c : (contracts.value.length || null)
})

// Columnas derivadas del primer contrato (el backend define la forma exacta).
const contractColumns = computed(() =>
  contracts.value.length ? Object.keys(contracts.value[0]) : []
)

function resetFeedback() {
  result.value = null
  error.value = ''
  validationErrors.value = []
}

function onFileSelected(file) {
  selectedFile.value = file
  resetFeedback()
}

function onCleared() {
  selectedFile.value = null
  resetFeedback()
}

async function onUploadInitiated(file) {
  const toUpload = file || selectedFile.value
  if (!toUpload) return

  loading.value = true
  resetFeedback()

  try {
    const data = await uploadASICContracts(toUpload)
    result.value = data ?? {}
    toast.add({
      severity: 'success',
      summary: 'Carga exitosa',
      detail: 'El archivo ASIC se procesó correctamente.',
      life: 4000,
    })
    fileUpload.value?.clear?.()
    selectedFile.value = null
  } catch (e) {
    const { message, validationErrors: errs } = parseUploadError(e)
    error.value = message
    validationErrors.value = errs
    toast.add({
      severity: 'error',
      summary: 'No se pudo procesar',
      detail: message,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.gf-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f5f4f8;
}
.mon-tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 25;
}
</style>
