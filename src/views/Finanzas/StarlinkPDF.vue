<template>
  <div class="space-y-5 pt-3">

    <!-- ── Barra superior: navegación + upload + descarga ──────────────────── -->
    <div class="flex items-center justify-between flex-wrap gap-2">

      <!-- Navegación por período (solo si hay datos) -->
      <div class="flex items-center gap-3">
        <template v-if="periodos.length">
          <button type="button" @click="irAnterior" :disabled="periodoIndex <= 0"
            class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <i class="pi pi-chevron-left text-xs text-gray-500" />
          </button>
          <span class="text-sm font-semibold" style="color:#2C2039; min-width:100px; text-align:center">
            {{ periodoLabel }}
          </span>
          <button type="button" @click="irSiguiente" :disabled="periodoIndex >= periodos.length - 1"
            class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
            <i class="pi pi-chevron-right text-xs text-gray-500" />
          </button>
          <Tag :value="periodoActual" severity="secondary" class="text-xs font-mono" />
        </template>
        <span v-else class="text-sm text-gray-400">Sin facturas procesadas</span>
      </div>

      <!-- Acciones -->
      <div class="flex items-center gap-2">
        <input ref="fileInputRef" type="file" accept=".pdf" class="hidden" @change="onFileSelected" />
        <Button label="Subir PDF" icon="pi pi-upload" size="small"
          :loading="procesando"
          @click="fileInputRef.click()"
          style="background:#915BD8;border-color:#915BD8" />
        <Button v-if="facturaActual" label="Descargar Excel" icon="pi pi-download" size="small" outlined
          :loading="descargando"
          @click="descargarExcel"
          style="border-color:#1F4E79;color:#1F4E79" />
      </div>
    </div>

    <!-- ── Estado vacío ─────────────────────────────────────────────────────── -->
    <div v-if="!periodos.length && !procesando" class="mon-tab-empty">
      <i class="pi pi-wifi" style="font-size:2.5rem; color:#c4b8d4;" />
      <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Sin facturas procesadas</p>
      <p class="mt-1 text-xs" style="color:#a094b8; max-width:300px; margin:4px auto 0">
        Haz clic en <strong>Subir PDF</strong> para cargar la primera factura Starlink
        y comenzar a registrar los costos por mes.
      </p>
    </div>

    <!-- ── Spinner de carga ──────────────────────────────────────────────────── -->
    <div v-else-if="cargandoFactura" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner" style="font-size:1.5rem; color:#915BD8" />
    </div>

    <!-- ── Datos del período seleccionado ───────────────────────────────────── -->
    <template v-else-if="facturaActual">

      <!-- Resumen -->
      <div class="flex items-center gap-4 flex-wrap">
        <div class="text-xs text-gray-500">
          <span class="font-semibold" style="color:#2C2039">{{ facturaActual.items.length }}</span> ítems
        </div>
        <div class="text-xs text-gray-500">
          Suma:
          <span class="font-semibold" style="color:#7c3aed">{{ formatCOP(facturaActual.suma_items) }}</span>
        </div>
        <div v-if="facturaActual.cargos_totales" class="text-xs text-gray-500">
          Cargos totales PDF:
          <span class="font-semibold" style="color:#166534">{{ formatCOP(facturaActual.cargos_totales) }}</span>
        </div>
        <div v-if="facturaActual.updated_at" class="text-xs text-gray-400">
          Procesado: {{ fmtFecha(facturaActual.updated_at) }}
        </div>
      </div>

      <!-- Separador Detalle -->
      <div class="flex items-center gap-3">
        <div class="h-px flex-1" style="background:#ECE7F2" />
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style="background:#F1EAF9;color:#6D28D9">Detalle</span>
        <div class="h-px flex-1" style="background:#ECE7F2" />
      </div>

      <!-- Tabla Detalle -->
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse" style="min-width:780px">
            <thead>
              <tr style="background:#1F4E79">
                <th v-for="h in headersDetalle" :key="h.key"
                  class="px-3 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
                  :class="h.right ? 'text-right' : 'text-left'">{{ h.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in facturaActual.items" :key="i"
                :style="i % 2 === 0 ? 'background:#fff' : 'background:#eaf3fb'">
                <td class="px-3 py-2 text-xs">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :style="item.tipo === 'servicio' ? 'background:#ede9fe;color:#6d28d9' : 'background:#dbeafe;color:#1e40af'">
                    {{ item.tipo }}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs font-medium" style="color:#2C2039;white-space:nowrap">{{ item.descripcion }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.precio_unitario) }}</td>
                <td class="px-3 py-2 text-xs text-center text-gray-600">{{ item.cantidad }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.total_impuestos) }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.sin_iva) }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.iva) }}</td>
                <td class="px-3 py-2 text-xs text-right font-semibold tabular-nums" style="color:#7c3aed">{{ formatCOP(item.monto_total) }}</td>
              </tr>
              <tr style="background:#1F4E79">
                <td colspan="2" class="px-3 py-2.5 text-xs font-bold text-white">TOTAL</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white"></td>
                <td class="px-3 py-2.5 text-center text-xs font-bold text-white">{{ totalDetalle.cantidad }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalDetalle.impuestos) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalDetalle.sin_iva) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalDetalle.iva) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalDetalle.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Separador Agrupado -->
      <div class="flex items-center gap-3">
        <div class="h-px flex-1" style="background:#ECE7F2" />
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style="background:#dbeafe;color:#1e40af">Agrupado</span>
        <div class="h-px flex-1" style="background:#ECE7F2" />
      </div>

      <!-- Tabla Agrupado -->
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse" style="min-width:680px">
            <thead>
              <tr style="background:#1F4E79">
                <th v-for="h in headersAgrupado" :key="h.key"
                  class="px-3 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
                  :class="h.right ? 'text-right' : 'text-left'">{{ h.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in facturaActual.agrupado" :key="i"
                :style="i % 2 === 0 ? 'background:#fff' : 'background:#eaf3fb'">
                <td class="px-3 py-2 text-xs font-medium" style="color:#2C2039;white-space:nowrap">{{ item.descripcion }}</td>
                <td class="px-3 py-2 text-xs text-center text-gray-600">{{ item.cantidad_total }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.precio_unitario_promedio) }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.sin_iva) }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">{{ formatCOP(item.iva) }}</td>
                <td class="px-3 py-2 text-xs text-right font-semibold tabular-nums" style="color:#7c3aed">{{ formatCOP(item.monto_total) }}</td>
              </tr>
              <tr style="background:#0D2137">
                <td class="px-3 py-2.5 text-xs font-bold text-white">TOTAL</td>
                <td class="px-3 py-2.5 text-center text-xs font-bold text-white">{{ totalAgrupado.cantidad }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white"></td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalAgrupado.sin_iva) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalAgrupado.iva) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">{{ formatCOP(totalAgrupado.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ── Dialog: confirmar período antes de guardar ────────────────────────── -->
    <Dialog v-model:visible="showGuardarDialog" modal header="Guardar factura procesada"
      :style="{ width: '420px' }" :closable="!guardando">
      <div class="space-y-4 pt-1">

        <!-- Alerta de discrepancia si existe -->
        <div v-if="resultadoPendiente?.advertencia"
          class="rounded-xl border p-3 flex items-start gap-3"
          style="background:#fef3c7;border-color:#f59e0b40">
          <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706" />
          <p class="text-xs" style="color:#92400e">{{ resultadoPendiente.advertencia }}</p>
        </div>

        <!-- Selector de período -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-medium text-gray-600">
            Período de la factura
            <span class="text-gray-400 font-normal">(detectado automáticamente — puedes corregirlo)</span>
          </label>
          <input type="month" v-model="periodoParaGuardar"
            class="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200" />
        </div>

        <!-- Advertencia de sobreescritura -->
        <div v-if="periodoYaExiste"
          class="rounded-lg border p-2.5 flex items-start gap-2"
          style="background:#fef3c7;border-color:#f59e0b60">
          <i class="pi pi-exclamation-triangle text-xs flex-shrink-0 mt-0.5" style="color:#d97706" />
          <p class="text-xs" style="color:#92400e">
            Ya existen datos para <strong>{{ periodoLabelFrom(periodoParaGuardar) }}</strong>.
            Al confirmar se sobreescribirán.
          </p>
        </div>

        <!-- Resumen -->
        <div class="text-xs text-gray-500 space-y-0.5">
          <p>{{ resultadoPendiente?.items?.length }} ítems · Suma: <strong>{{ formatCOP(resultadoPendiente?.suma_items) }}</strong></p>
          <p v-if="resultadoPendiente?.cargos_totales">
            Cargos totales PDF: <strong>{{ formatCOP(resultadoPendiente?.cargos_totales) }}</strong>
            <span :style="resultadoPendiente?.coincide ? 'color:#166534' : 'color:#dc2626'">
              {{ resultadoPendiente?.coincide ? '✓ Coincide' : '✗ No coincide' }}
            </span>
          </p>
        </div>

        <div class="flex gap-2 justify-end pt-1">
          <Button label="Cancelar" size="small" outlined severity="secondary"
            :disabled="guardando" @click="showGuardarDialog = false" />
          <Button label="Guardar" icon="pi pi-check" size="small"
            :loading="guardando" :disabled="!periodoParaGuardar"
            @click="guardarFactura"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const toast = useToast()

// ── Headers ───────────────────────────────────────────────────────────────────
const headersDetalle = [
  { key: 'tipo',            label: 'Tipo',            right: false },
  { key: 'descripcion',     label: 'Descripción',     right: false },
  { key: 'precio_unitario', label: 'Precio unitario', right: true  },
  { key: 'cantidad',        label: 'Cant.',           right: false },
  { key: 'total_impuestos', label: 'Impuestos',       right: true  },
  { key: 'sin_iva',         label: 'Sin IVA',         right: true  },
  { key: 'iva',             label: 'IVA',             right: true  },
  { key: 'monto_total',     label: 'Monto total',     right: true  },
]
const headersAgrupado = [
  { key: 'descripcion',              label: 'Descripción',        right: false },
  { key: 'cantidad_total',           label: 'Cantidad',           right: false },
  { key: 'precio_unitario_promedio', label: 'Precio unit. prom.', right: true  },
  { key: 'sin_iva',                  label: 'Sin IVA',            right: true  },
  { key: 'iva',                      label: 'IVA',                right: true  },
  { key: 'monto_total',              label: 'Monto total',        right: true  },
]

// ── Períodos guardados ────────────────────────────────────────────────────────
const periodos       = ref([])   // ['2026-05', '2026-04', ...] — desc
const periodoIndex   = ref(0)    // índice actual (0 = más reciente)
const facturaActual  = ref(null)
const cargandoFactura = ref(false)

const periodoActual = computed(() => periodos.value[periodoIndex.value] ?? null)
const periodoLabel  = computed(() => periodoLabelFrom(periodoActual.value))

function periodoLabelFrom(periodo) {
  if (!periodo) return ''
  const [yyyy, mm] = periodo.split('-')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${MESES[parseInt(mm) - 1]} ${yyyy}`
}

function irAnterior()  { if (periodoIndex.value > 0) periodoIndex.value-- }
function irSiguiente() { if (periodoIndex.value < periodos.value.length - 1) periodoIndex.value++ }

async function cargarPeriodos() {
  try {
    const { data } = await api.get('/starlink/periodos')
    periodos.value  = data   // ya viene ordenado desc
    periodoIndex.value = 0
  } catch { periodos.value = [] }
}

async function cargarFactura(periodo) {
  if (!periodo) { facturaActual.value = null; return }
  cargandoFactura.value = true
  try {
    const { data } = await api.get(`/starlink/factura/${periodo}`)
    facturaActual.value = data
  } catch { facturaActual.value = null }
  finally { cargandoFactura.value = false }
}

watch(periodoActual, (p) => { if (p) cargarFactura(p) }, { immediate: false })

// ── Totales calculados ────────────────────────────────────────────────────────
const totalDetalle = computed(() => {
  const items = facturaActual.value?.items ?? []
  return {
    cantidad:  items.reduce((s, i) => s + i.cantidad, 0),
    impuestos: items.reduce((s, i) => s + i.total_impuestos, 0),
    sin_iva:   items.reduce((s, i) => s + i.sin_iva, 0),
    iva:       items.reduce((s, i) => s + i.iva, 0),
    total:     items.reduce((s, i) => s + i.monto_total, 0),
  }
})
const totalAgrupado = computed(() => {
  const items = facturaActual.value?.agrupado ?? []
  return {
    cantidad: items.reduce((s, i) => s + i.cantidad_total, 0),
    sin_iva:  items.reduce((s, i) => s + i.sin_iva, 0),
    iva:      items.reduce((s, i) => s + i.iva, 0),
    total:    items.reduce((s, i) => s + i.monto_total, 0),
  }
})

// ── Upload PDF ────────────────────────────────────────────────────────────────
const fileInputRef      = ref(null)
const procesando        = ref(false)
const resultadoPendiente = ref(null)

// Dialog de guardar
const showGuardarDialog  = ref(false)
const periodoParaGuardar = ref('')
const guardando          = ref(false)

const periodoYaExiste = computed(() =>
  !!periodoParaGuardar.value && periodos.value.includes(periodoParaGuardar.value)
)

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  procesando.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/starlink/procesar-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    resultadoPendiente.value = data
    // Preseleccionar el período detectado
    periodoParaGuardar.value = data.periodo || ''
    showGuardarDialog.value  = true
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error al procesar PDF',
      detail: err.response?.data?.detail ?? err.message, life: 6000 })
  } finally {
    procesando.value = false
  }
}

async function guardarFactura() {
  if (!periodoParaGuardar.value || !resultadoPendiente.value) return
  guardando.value = true
  try {
    await api.put(`/starlink/factura/${periodoParaGuardar.value}`, {
      items:          resultadoPendiente.value.items,
      agrupado:       resultadoPendiente.value.agrupado,
      cargos_totales: resultadoPendiente.value.cargos_totales,
      suma_items:     resultadoPendiente.value.suma_items,
    })
    toast.add({ severity: 'success', summary: `Factura guardada — ${periodoLabelFrom(periodoParaGuardar.value)}`, life: 3000 })
    showGuardarDialog.value = false
    resultadoPendiente.value = null

    // Recargar lista de períodos y navegar al nuevo
    await cargarPeriodos()
    const idx = periodos.value.indexOf(periodoParaGuardar.value)
    if (idx >= 0) periodoIndex.value = idx
    await cargarFactura(periodoParaGuardar.value)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error al guardar',
      detail: err.response?.data?.detail ?? err.message, life: 4000 })
  } finally {
    guardando.value = false
  }
}

// ── Descargar Excel ───────────────────────────────────────────────────────────
const descargando = ref(false)

async function descargarExcel() {
  if (!facturaActual.value) return
  descargando.value = true
  try {
    const response = await api.post('/starlink/excel', {
      items:    facturaActual.value.items,
      agrupado: facturaActual.value.agrupado,
    }, { responseType: 'blob' })
    const url  = URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href     = url
    link.download = `starlink_${periodoActual.value}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch {
    toast.add({ severity: 'error', summary: 'Error al generar Excel', life: 4000 })
  } finally {
    descargando.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v)
}

function fmtFecha(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

onMounted(async () => {
  await cargarPeriodos()
  if (periodos.value.length) await cargarFactura(periodos.value[0])
})
</script>

<style scoped>
.mon-tab-empty {
  text-align: center;
  padding: 80px 20px;
}
</style>
