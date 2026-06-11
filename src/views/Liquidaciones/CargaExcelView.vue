<template>
  <div :class="embedded ? 'p-4 sm:p-5' : 'min-h-screen p-6'" :style="embedded ? '' : 'background: #F7F5FB;'">
    <div class="max-w-3xl mx-auto space-y-5">

      <!-- Header -->
      <div v-if="!embedded">
        <h1 class="text-xl font-bold" style="color: #2C2039;">Cargar Excel de Liquidaciones</h1>
        <p class="text-sm mt-1" style="color: #9b8fb0;">Carga el panel de seguimiento contable mensual desde un archivo .xlsx</p>
      </div>

      <!-- ── Sección 1: Formulario ── -->
      <div class="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <h2 class="text-xs font-bold uppercase tracking-widest" style="color: #915BD8;">Configuración de carga</h2>

        <!-- Selector de tipo -->
        <div>
          <label class="block text-xs font-semibold mb-1.5" style="color: #6b5a8a;">Tipo de liquidación</label>
          <div class="tipo-switch">
            <button
              type="button"
              class="tipo-opt"
              :class="{ 'tipo-opt--on': tipoVenta === 'ppa' }"
              @click="setTipoVenta('ppa')"
            >
              <i class="pi pi-sun" /> Minigranjas/PPA
            </button>
            <button
              type="button"
              class="tipo-opt"
              :class="{ 'tipo-opt--on': tipoVenta === 'autoconsumo' }"
              @click="setTipoVenta('autoconsumo')"
            >
              <i class="pi pi-building" /> Autoconsumo
            </button>
          </div>
          <p v-if="tipoVenta === 'autoconsumo'" class="text-xs mt-2 flex items-center gap-1.5"
            style="color: #915BD8;">
            <i class="pi pi-info-circle" />
            Todos los proyectos se asignan a SUNO
          </p>
        </div>

        <!-- Dropzone -->
        <div
          class="dropzone"
          :class="{ 'dropzone--over': dragOver, 'dropzone--selected': file }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
          @click="$refs.fileInput.click()"
        >
          <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onFileChange" />
          <i class="pi pi-file-excel text-4xl mb-2" style="color: #915BD8;" />
          <p v-if="!file" class="text-sm font-medium" style="color: #5b5470;">
            Arrastra el archivo Excel aquí o <span style="color: #915BD8;">haz clic para seleccionar</span>
          </p>
          <p v-else class="text-sm font-semibold" style="color: #2C2039;">
            <i class="pi pi-check-circle mr-1" style="color: #10B981;" />{{ file.name }}
          </p>
        </div>

        <!-- Hoja y período -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #6b5a8a;">Hoja del Excel</label>
            <select v-model="hoja" class="w-full input-field" :disabled="!hojas.length">
              <option value="" disabled>{{ hojas.length ? 'Seleccionar hoja' : 'Carga un archivo primero' }}</option>
              <option v-for="h in hojas" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #6b5a8a;">Período</label>
            <input
              type="month"
              v-model="periodo"
              class="w-full input-field"
              :max="maxMonth"
            />
          </div>
        </div>

        <!-- Toggle limpiar -->
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <div class="toggle" :class="{ 'toggle--on': limpiar }" @click="limpiar = !limpiar">
            <div class="toggle-thumb" />
          </div>
          <div>
            <span class="text-sm font-medium" style="color: #2C2039;">Limpiar datos existentes antes de cargar</span>
            <p class="text-xs mt-0.5" style="color: #9b8fb0;">Borra mandatos, costos y facturas del período si ya existen</p>
          </div>
        </label>

        <!-- Botón vista previa -->
        <div class="flex gap-3 pt-1">
          <button
            class="btn-primary"
            :disabled="!canPreview || loading"
            @click="runPreview"
          >
            <i class="pi" :class="loading && step === 'preview' ? 'pi-spin pi-spinner' : 'pi-eye'" />
            Vista previa
          </button>
          <p v-if="!canPreview" class="text-xs self-center" style="color: #9b8fb0;">
            Selecciona el archivo, hoja y período para continuar
          </p>
        </div>
      </div>

      <!-- ── Sección 2: Vista previa ── -->
      <transition name="fade">
        <div v-if="previewData" class="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 class="text-xs font-bold uppercase tracking-widest" style="color: #915BD8;">Vista previa</h2>

          <!-- Proyectos encontrados -->
          <div v-if="previewData.proyectos_encontrados.length">
            <p class="text-xs font-semibold mb-2" style="color: #1e5c2e;">
              <i class="pi pi-check-circle mr-1" />
              {{ previewData.proyectos_encontrados.length }} proyecto(s) encontrado(s) en DB
            </p>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              <div
                v-for="p in previewData.proyectos_encontrados"
                :key="p"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                style="background: #f0fdf4; color: #1e5c2e;"
              >
                <i class="pi pi-check text-xs" />{{ p }}
              </div>
            </div>
          </div>

          <!-- Proyectos no encontrados -->
          <div v-if="previewData.proyectos_no_encontrados.length">
            <p class="text-xs font-semibold mb-2" style="color: #b91c1c;">
              <i class="pi pi-times-circle mr-1" />
              {{ previewData.proyectos_no_encontrados.length }} proyecto(s) sin match en DB — serán omitidos
            </p>
            <div class="space-y-1 max-h-36 overflow-y-auto">
              <div
                v-for="p in previewData.proyectos_no_encontrados"
                :key="p"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                style="background: #fef2f2; color: #b91c1c;"
              >
                <i class="pi pi-times text-xs" />{{ p }}
              </div>
            </div>
          </div>

          <div v-if="previewData.proyectos_encontrados.length === 0" class="py-4 text-center">
            <i class="pi pi-exclamation-triangle text-2xl mb-2 block" style="color: #CA8A04;" />
            <p class="text-sm" style="color: #6b5a8a;">Ningún proyecto del Excel coincide con la base de datos.</p>
          </div>

          <!-- Botón confirmar -->
          <div class="flex gap-3 pt-2 border-t" style="border-color: #f0ecf6;">
            <button
              class="btn-confirm"
              :disabled="previewData.proyectos_encontrados.length === 0 || loading"
              @click="runCargar"
            >
              <i class="pi" :class="loading && step === 'cargar' ? 'pi-spin pi-spinner' : 'pi-upload'" />
              Confirmar y cargar
            </button>
            <button class="btn-ghost" @click="resetPreview">
              Volver a configurar
            </button>
          </div>
        </div>
      </transition>

      <!-- ── Sección 3: Resultado ── -->
      <transition name="fade">
        <div v-if="result" class="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background: #f0fdf4;">
              <i class="pi pi-check text-xl" style="color: #10B981;" />
            </div>
            <div>
              <h2 class="text-base font-bold" style="color: #2C2039;">Carga completada</h2>
              <p class="text-xs" style="color: #9b8fb0;">{{ periodoLabel }} — {{ hojaLabel }}</p>
            </div>
          </div>

          <!-- KPI cards -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="kpi-card" style="border-color: #d1fae5; background: #f0fdf4;">
              <p class="kpi-label" style="color: #1e5c2e;">Proyectos</p>
              <p class="kpi-value" style="color: #1e5c2e;">{{ result.stats.proyectos_cargados }}</p>
            </div>
            <div class="kpi-card" style="border-color: #ede9fe; background: #f5f3ff;">
              <p class="kpi-label" style="color: #5b21b6;">Mandatos</p>
              <p class="kpi-value" style="color: #5b21b6;">{{ result.stats.mandatos }}</p>
            </div>
            <div class="kpi-card" style="border-color: #dbeafe; background: #eff6ff;">
              <p class="kpi-label" style="color: #1e40af;">Líneas</p>
              <p class="kpi-value" style="color: #1e40af;">{{ result.stats.lineas }}</p>
            </div>
            <div class="kpi-card" style="border-color: #fce7f3; background: #fdf4ff;">
              <p class="kpi-label" style="color: #86198f;">Facturas</p>
              <p class="kpi-value" style="color: #86198f;">{{ result.stats.facturas }}</p>
            </div>
          </div>

          <!-- Proyectos omitidos / sin match -->
          <div v-if="result.stats.proyectos_sin_match?.length" class="rounded-lg p-3" style="background: #fef3c7;">
            <p class="text-xs font-semibold mb-1" style="color: #92400e;">
              <i class="pi pi-exclamation-triangle mr-1" />
              {{ result.stats.proyectos_sin_match.length }} proyecto(s) sin match (omitidos)
            </p>
            <p v-for="p in result.stats.proyectos_sin_match" :key="p" class="text-xs" style="color: #92400e;">• {{ p }}</p>
          </div>

          <!-- Inversionistas sin match -->
          <div v-if="result.stats.inversionistas_sin_match?.length" class="rounded-lg p-3" style="background: #fff7ed;">
            <p class="text-xs font-semibold mb-1" style="color: #c2410c;">
              <i class="pi pi-exclamation-circle mr-1" />
              {{ result.stats.inversionistas_sin_match.length }} inversionista(s) sin match en DB
            </p>
            <p v-for="i in result.stats.inversionistas_sin_match" :key="i" class="text-xs" style="color: #c2410c;">• {{ i }}</p>
          </div>

          <!-- Errores -->
          <div v-if="result.errores?.length" class="rounded-lg p-3" style="background: #fef2f2;">
            <p class="text-xs font-semibold mb-1" style="color: #b91c1c;">
              <i class="pi pi-times-circle mr-1" />{{ result.errores.length }} error(es)
            </p>
            <p v-for="e in result.errores" :key="e" class="text-xs" style="color: #b91c1c;">• {{ e }}</p>
          </div>

          <button class="btn-ghost w-full" @click="resetAll">
            <i class="pi pi-refresh mr-2" />Cargar otro mes
          </button>
        </div>
      </transition>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import api from '@/api/client'

defineProps({ embedded: { type: Boolean, default: false } })

// ── Estado ──────────────────────────────────────────────────────────────────
const file = ref(null)
const hojas = ref([])
const hoja = ref('')
const periodo = ref('')
const limpiar = ref(false)
const tipoVenta = ref('ppa')   // 'ppa' | 'autoconsumo'
const dragOver = ref(false)
const loading = ref(false)
const step = ref('')         // 'preview' | 'cargar'
const previewData = ref(null)
const result = ref(null)
const hojaLabel = ref('')
const periodoLabel = ref('')

const maxMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

const canPreview = computed(() => file.value && hoja.value && periodo.value)

// ── Archivo ──────────────────────────────────────────────────────────────────
function readSheetNames(f) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary', bookSheets: true })
      hojas.value = wb.SheetNames
      if (hojas.value.length) hoja.value = hojas.value[0]
    } catch {
      hojas.value = []
    }
  }
  reader.readAsBinaryString(f)
}

function onFileChange(e) {
  const f = e.target.files[0]
  if (!f) return
  file.value = f
  previewData.value = null
  result.value = null
  readSheetNames(f)
}

function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer.files[0]
  if (!f) return
  file.value = f
  previewData.value = null
  result.value = null
  readSheetNames(f)
}

// ── API calls ────────────────────────────────────────────────────────────────
function buildFormData(dry) {
  const fd = new FormData()
  fd.append('file', file.value)
  fd.append('hoja', hoja.value)
  fd.append('periodo', periodo.value)
  fd.append('limpiar', limpiar.value ? 'true' : 'false')
  fd.append('dry_run', dry ? 'true' : 'false')
  fd.append('tipo_venta', tipoVenta.value)
  return fd
}

function setTipoVenta(t) {
  tipoVenta.value = t
  // El cambio de estructura invalida la vista previa generada
  previewData.value = null
  result.value = null
}

async function runPreview() {
  loading.value = true
  step.value = 'preview'
  previewData.value = null
  result.value = null
  try {
    const { data } = await api.post('/liquidaciones/cargar-excel', buildFormData(true), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    previewData.value = data
    hojaLabel.value = hoja.value
    periodoLabel.value = periodo.value
  } catch (err) {
    const msg = err.response?.data?.detail || 'Error al generar vista previa'
    alert(msg)
  } finally {
    loading.value = false
    step.value = ''
  }
}

async function runCargar() {
  loading.value = true
  step.value = 'cargar'
  try {
    const { data } = await api.post('/liquidaciones/cargar-excel', buildFormData(false), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    result.value = data
    previewData.value = null
  } catch (err) {
    const msg = err.response?.data?.detail || 'Error al cargar el archivo'
    alert(msg)
  } finally {
    loading.value = false
    step.value = ''
  }
}

function resetPreview() {
  previewData.value = null
}

function resetAll() {
  file.value = null
  hojas.value = []
  hoja.value = ''
  periodo.value = ''
  limpiar.value = false
  tipoVenta.value = 'ppa'
  previewData.value = null
  result.value = null
  if (document.querySelector('input[type=file]')) {
    document.querySelector('input[type=file]').value = ''
  }
}
</script>

<style scoped>
.dropzone {
  border: 2px dashed #d1c4e9;
  border-radius: 12px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  background: #faf8fd;
  min-height: 120px;
  text-align: center;
}
.dropzone:hover,
.dropzone--over {
  border-color: #915BD8;
  background: #f3edfb;
}
.dropzone--selected {
  border-color: #10B981;
  background: #f0fdf4;
}

/* Selector tipo de liquidación */
.tipo-switch {
  display: inline-flex;
  gap: 4px;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 10px;
  padding: 3px;
}
.tipo-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #6B5A8A;
  background: transparent;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  transition: all .15s;
  font-family: 'Sora', system-ui, sans-serif;
}
.tipo-opt:hover:not(.tipo-opt--on) { color: #2C2039; background: rgba(145,91,216,.08); }
.tipo-opt--on { background: #915BD8; color: #FDFAF7; box-shadow: 0 1px 4px rgba(145,91,216,.3); }
.tipo-opt i { font-size: 13px; }

.input-field {
  border: 1px solid #e0d7ee;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #2C2039;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
  font-family: 'Sora', system-ui, sans-serif;
}
.input-field:focus {
  border-color: #915BD8;
}
.input-field:disabled {
  background: #f7f4fb;
  color: #b0a8c4;
}

/* Toggle */
.toggle {
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: #d1c4e9;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.toggle--on {
  background: #915BD8;
}
.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle--on .toggle-thumb {
  transform: translateX(18px);
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  background: #915BD8;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-family: 'Sora', system-ui, sans-serif;
}
.btn-primary:hover:not(:disabled) {
  background: #7c3aed;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 700;
  color: #fff;
  background: #2C2039;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  font-family: 'Sora', system-ui, sans-serif;
}
.btn-confirm:hover:not(:disabled) {
  background: #1a1225;
}
.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #6b5a8a;
  background: transparent;
  border: 1px solid #e0d7ee;
  cursor: pointer;
  transition: background 0.15s;
  font-family: 'Sora', system-ui, sans-serif;
}
.btn-ghost:hover {
  background: #f5f2fb;
}

/* KPI cards */
.kpi-card {
  border: 1px solid;
  border-radius: 10px;
  padding: 14px 16px;
}
.kpi-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.kpi-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

/* Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
