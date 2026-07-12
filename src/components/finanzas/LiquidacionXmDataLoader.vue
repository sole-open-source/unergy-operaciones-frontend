<template>
  <div class="rounded-xl border bg-white p-4 space-y-4" style="border-color:#ECE7F2">
    <div class="flex items-center gap-2">
      <i class="pi pi-cloud-upload text-sm" style="color:#915BD8" />
      <span class="text-sm font-bold" style="color:#2C2039">Cargar datos XM</span>
    </div>

    <!-- ── Carga de Excel ─────────────────────────────────────────── -->
    <div class="space-y-2">
      <label class="text-xs font-medium text-gray-500">Período</label>
      <input v-model="periodo" type="month" class="xm-input" />

      <div class="flex items-center gap-2 mt-1">
        <input ref="fileInput" type="file" class="hidden"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          @change="onFileChange" />
        <Button label="Elegir Excel" icon="pi pi-file-excel" size="small" outlined
          style="border-color:#915BD8;color:#915BD8" @click="fileInput?.click()" />
        <span v-if="archivo" class="text-xs text-gray-600 truncate" :title="archivo.name">
          {{ archivo.name }}
        </span>
        <span v-else class="text-xs text-gray-400">Ningún archivo seleccionado</span>
      </div>

      <Button label="Subir Excel XM" icon="pi pi-upload" size="small"
        class="mt-1"
        :loading="subiendo"
        :disabled="!archivo || !periodo || subiendo"
        style="background:#915BD8;border-color:#915BD8"
        @click="subirExcel" />
    </div>

    <!-- ── Auto-población para una liquidación seleccionada ──────────── -->
    <div class="border-t pt-3" style="border-color:#F0ECF6">
      <p class="text-xs text-gray-500 mb-2">
        Autocompletar los datos XM de la liquidación seleccionada a partir de lo cargado.
      </p>
      <Button
        :label="liquidacionId ? `Autocompletar liquidación #${liquidacionId}` : 'Selecciona una liquidación'"
        icon="pi pi-bolt" size="small" outlined
        :loading="autopoblando"
        :disabled="!liquidacionId || autopoblando"
        style="border-color:#6D28D9;color:#6D28D9"
        @click="autoPopular" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import { mesActualISO } from '@/utils/liquidaciones'

const props = defineProps({
  liquidacionId: { type: [Number, String], default: null },
})
const emit = defineEmits(['excel-cargado', 'auto-poblado'])

const toast = useToast()

// El backend llavea el período como "YYYY-MM-01"; el <input type=month> usa "YYYY-MM".
const periodo = ref(mesActualISO().slice(0, 7))

const fileInput = ref(null)
const archivo = ref(null)
const subiendo = ref(false)
const autopoblando = ref(false)

function onFileChange(e) {
  archivo.value = e.target.files?.[0] || null
}

async function subirExcel() {
  if (!archivo.value || !periodo.value) return
  subiendo.value = true
  try {
    const formData = new FormData()
    formData.append('file', archivo.value)
    formData.append('periodo', `${periodo.value}-01`)
    // El cliente axios elimina el Content-Type cuando el body es FormData,
    // dejando que el navegador ponga el boundary correcto (ver api/client.js).
    await api.post('/liquidaciones/cargar-excel', formData)
    toast.add({ severity: 'success', summary: 'Excel cargado', detail: 'Los datos XM se subieron correctamente.', life: 3000 })
    archivo.value = null
    if (fileInput.value) fileInput.value.value = ''
    emit('excel-cargado')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: e.response?.data?.detail || 'No se pudo subir el Excel.', life: 4000 })
  } finally {
    subiendo.value = false
  }
}

async function autoPopular() {
  if (!props.liquidacionId) return
  autopoblando.value = true
  try {
    await api.post(`/liquidaciones/${props.liquidacionId}/xm-datos/auto-populate`)
    toast.add({ severity: 'success', summary: 'Autocompletado', detail: `Datos XM aplicados a la liquidación #${props.liquidacionId}.`, life: 3000 })
    emit('auto-poblado')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo autocompletar la liquidación.', life: 4000 })
  } finally {
    autopoblando.value = false
  }
}
</script>

<style scoped>
.xm-input {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  width: 100%;
}
.xm-input:focus {
  outline: none;
  border-color: #915bd8;
  box-shadow: 0 0 0 2px rgba(145, 91, 216, 0.15);
}
</style>
