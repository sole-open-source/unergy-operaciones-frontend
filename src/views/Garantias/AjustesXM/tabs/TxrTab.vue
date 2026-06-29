<template>
  <div class="space-y-5">
    <!-- Upload area -->
    <div v-if="!resultado" class="space-y-4">
      <div class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
        :style="dragging ? 'border-color:#915BD8;background:rgba(145,91,216,0.04)' : 'border-color:#c4b8d4;background:#fafafa'"
        @click="fileInput.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onSelect" />
        <i class="pi pi-file-excel text-3xl block mb-2" style="color:#c4b8d4" />
        <p class="text-sm font-medium" style="color:#6b5a8a">Archivo TXR — hoja "Ajuste"</p>
        <p class="text-xs mt-1" style="color:#9ca3af">Arrastra o haz clic para seleccionar</p>
      </div>

      <div v-if="errors.length" class="rounded-lg p-3 space-y-1" style="background:#FEF2F2;border:1px solid rgba(214,68,85,0.2)">
        <p v-for="e in errors" :key="e" class="text-xs" style="color:#D64455">{{ e }}</p>
      </div>

      <div class="flex justify-end">
        <Button label="Procesar" icon="pi pi-bolt" :loading="loading" :disabled="!pendingFile" @click="procesar"
          style="background:#915BD8;border-color:#915BD8" />
      </div>
    </div>

    <!-- Results -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold" style="color:#2C2039">
          Ajuste TXR — {{ resultado.rows.length }} filas (UNGC + UNGG)
        </h3>
        <Button label="Nuevo archivo" icon="pi pi-refresh" text severity="secondary" size="small" @click="reset" />
      </div>

      <!-- Tabla scrollable (columnas dinámicas según el archivo) -->
      <div class="overflow-x-auto rounded-xl shadow-sm" style="border:1px solid #e8e0f0">
        <table class="text-xs whitespace-nowrap">
          <thead>
            <tr class="bg-gray-50 border-b">
              <th v-for="col in resultado.headers" :key="col"
                class="px-3 py-2 text-left font-semibold sticky top-0 bg-gray-50"
                style="color:#6b5a8a">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in resultado.rows" :key="idx"
              class="border-b last:border-b-0 hover:bg-gray-50/50"
              :style="esUNGC(row) ? 'background:#faf8fd' : 'background:white'">
              <td v-for="col in resultado.headers" :key="col" class="px-3 py-1.5 tabular-nums">
                <span v-if="esCodigo(col)" class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :style="esUNGC(row) ? 'background:#f3f0f7;color:#915BD8' : 'background:#dbeafe;color:#1d4ed8'">
                  {{ row[col] }}
                </span>
                <span v-else style="color:#2C2039">{{ fmtCell(row[col]) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mensaje -->
      <div class="bg-white rounded-xl p-5 shadow-sm space-y-4" style="border:1px solid #e8e0f0">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Monto a consignar ($)</label>
            <InputNumber v-model="montoEditable" fluid :max-fraction-digits="0" @update:model-value="generarMensaje" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Fecha vencimiento</label>
            <input :value="fechaVencimiento" readonly
              class="w-full rounded-lg px-3 py-2 text-sm bg-gray-50"
              style="border:1px solid #e8e0f0;color:#6b5a8a" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Contexto adicional</label>
          <Textarea v-model="contexto" rows="2" fluid @input="generarMensaje" placeholder="Notas opcionales..." />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Mensaje</label>
          <Textarea v-model="mensajeEditable" rows="5" fluid class="font-mono text-xs" />
        </div>

        <div class="flex justify-end gap-2">
          <Button label="Exportar Excel" icon="pi pi-file-excel" outlined severity="secondary" size="small" @click="exportar" />
          <Button label="Copiar" icon="pi pi-copy" outlined severity="secondary" @click="copiar" />
          <Button label="Confirmar y guardar" icon="pi pi-check" @click="guardarRegistro" style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { useGarantiasHistorial } from '../composables/useGarantiasHistorial.js'
import workerService from '@/utils/workers/workerService'
import { fmtCOP, fmtISODate } from '../utils/formatters.js'
import { exportTablaExcel } from '../utils/excelExport.js'

const toast = useToast()
const store = useGarantiasHistorial()

const esCodigo = (col) => /^c[oó]digo$/i.test(col)
const esUNGC = (row) => {
  const k = Object.keys(row).find((h) => /^c[oó]digo$/i.test(h))
  return k && String(row[k]).trim().toUpperCase() === 'UNGC'
}
const fmtCell = (v) => (v == null || v === '' ? '—' : (typeof v === 'number' ? fmtCOP(v) : v))

const fileInput = ref(null)
const pendingFile = ref(null)
const dragging = ref(false)
const loading = ref(false)
const errors = ref([])
const resultado = ref(null)

const montoEditable = ref(0)
const contexto = ref('')
const mensajeEditable = ref('')

const fechaVencimiento = computed(() => {
  if (resultado.value?.fechaVencimiento) return resultado.value.fechaVencimiento
  // Respaldo: próximo jueves (día 4)
  const d = new Date()
  const diff = (4 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  return fmtISODate(d)
})

function onSelect(e) {
  pendingFile.value = e.target.files[0] || null
  e.target.value = ''
}

function onDrop(e) {
  dragging.value = false
  pendingFile.value = e.dataTransfer.files[0] || null
}

async function procesar() {
  if (!pendingFile.value) return
  loading.value = true
  errors.value = []
  try {
    const res = await workerService.postMessage('parseTxr', { file: pendingFile.value })
    if (res.errors.length) errors.value = res.errors
    if (res.rows.length || !res.errors.length) {
      resultado.value = res
      montoEditable.value = res.totalAjuste
      generarMensaje()
    }
  } catch (e) {
    errors.value = [`Error inesperado: ${e.message}`]
  } finally {
    loading.value = false
  }
}

function reset() {
  resultado.value = null
  pendingFile.value = null
  errors.value = []
}

function generarMensaje() {
  mensajeEditable.value = `Ajuste TXR — vencimiento ${fechaVencimiento.value}

El monto a consignar es de ${fmtCOP(montoEditable.value)}.${contexto.value ? '\n\n' + contexto.value : ''}`
}

async function copiar() {
  await navigator.clipboard.writeText(mensajeEditable.value)
  toast.add({ severity: 'success', summary: 'Copiado', life: 2000 })
}

function exportar() {
  if (!resultado.value) return
  exportTablaExcel(resultado.value.rows, 'txr.xlsx')
}

async function guardarRegistro() {
  try {
    await store.guardar({
      tipo: 'txr',
      fecha: fmtISODate(new Date()),
      pb: null, restricciones: null, stn: null, trm: null, ptb: null,
      totalUNGC: null, totalUNGG: null, totalConsignar: null,
      disponibleCustodia: null, congelado: null, saldo: null,
      totalAjusteTXR: montoEditable.value,
    })
    toast.add({ severity: 'success', summary: 'Guardado en historial', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el registro', life: 4000 })
  }
}
</script>
