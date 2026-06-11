<template>
  <div class="space-y-5 pt-3">

    <!-- ── Upload ──────────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 flex-wrap">
      <input ref="fileInputRef" type="file" accept=".pdf" class="hidden" @change="onFileSelected" />
      <Button label="Subir PDF" icon="pi pi-upload" size="small"
        :loading="procesando"
        @click="fileInputRef.click()"
        style="background:#915BD8;border-color:#915BD8" />
      <span v-if="nombreArchivo" class="text-xs text-gray-500 flex items-center gap-1">
        <i class="pi pi-file-pdf text-xs" style="color:#915BD8" />
        {{ nombreArchivo }}
      </span>
      <Button v-if="resultado" label="Descargar Excel" icon="pi pi-download" size="small" outlined
        :loading="descargando"
        @click="descargarExcel"
        style="border-color:#1F4E79;color:#1F4E79" />
    </div>

    <!-- ── Alerta de discrepancia ───────────────────────────────────────────── -->
    <div v-if="resultado?.advertencia"
      class="rounded-xl border p-3 flex items-start gap-3"
      style="background:#fef3c7;border-color:#f59e0b40">
      <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706" />
      <div class="flex-1 text-xs" style="color:#92400e">
        <p class="font-semibold mb-0.5">Diferencia detectada en totales</p>
        <p>{{ resultado.advertencia }}</p>
      </div>
    </div>

    <!-- ── Resumen ──────────────────────────────────────────────────────────── -->
    <div v-if="resultado" class="flex items-center gap-4 flex-wrap">
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="font-semibold" style="color:#2C2039">{{ resultado.items.length }}</span> ítems
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-500">
        Suma total:
        <span class="font-semibold" style="color:#7c3aed">{{ formatCOP(resultado.suma_items) }}</span>
      </div>
      <div v-if="resultado.cargos_totales" class="flex items-center gap-2 text-xs text-gray-500">
        Cargos totales PDF:
        <span class="font-semibold" :style="resultado.coincide ? 'color:#166534' : 'color:#dc2626'">
          {{ formatCOP(resultado.cargos_totales) }}
          <i :class="resultado.coincide ? 'pi pi-check-circle' : 'pi pi-times-circle'" class="ml-1 text-xs" />
        </span>
      </div>
    </div>

    <!-- ── Tabla Detalle ────────────────────────────────────────────────────── -->
    <template v-if="resultado?.items.length">
      <div class="flex items-center gap-3 mb-2">
        <div class="h-px flex-1" style="background:#ECE7F2" />
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style="background:#F1EAF9;color:#6D28D9">Detalle</span>
        <div class="h-px flex-1" style="background:#ECE7F2" />
      </div>
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse" style="min-width:780px">
            <thead>
              <tr style="background:#1F4E79">
                <th v-for="h in headersDetalle" :key="h.key"
                  class="px-3 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
                  :class="h.right ? 'text-right' : 'text-left'">
                  {{ h.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in resultado.items" :key="i"
                :style="i % 2 === 0 ? 'background:#fff' : 'background:#BDD7EE22'">
                <td class="px-3 py-2 text-xs">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :style="item.tipo === 'servicio'
                      ? 'background:#ede9fe;color:#6d28d9'
                      : 'background:#dbeafe;color:#1e40af'">
                    {{ item.tipo }}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs font-medium" style="color:#2C2039;white-space:nowrap">
                  {{ item.descripcion }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.precio_unitario) }}
                </td>
                <td class="px-3 py-2 text-xs text-center text-gray-600">{{ item.cantidad }}</td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.total_impuestos) }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.sin_iva) }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.iva) }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-semibold tabular-nums"
                  style="color:#7c3aed">
                  {{ formatCOP(item.monto_total) }}
                </td>
              </tr>
              <!-- Total detalle -->
              <tr style="background:#1F4E79">
                <td colspan="2" class="px-3 py-2.5 text-xs font-bold text-white">TOTAL</td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white"></td>
                <td class="px-3 py-2.5 text-center text-xs font-bold text-white">
                  {{ totalDetalle.cantidad }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalDetalle.impuestos) }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalDetalle.sin_iva) }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalDetalle.iva) }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalDetalle.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Tabla Agrupado ─────────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 mb-2">
        <div class="h-px flex-1" style="background:#ECE7F2" />
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style="background:#dbeafe;color:#1e40af">Agrupado</span>
        <div class="h-px flex-1" style="background:#ECE7F2" />
      </div>
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse" style="min-width:680px">
            <thead>
              <tr style="background:#1F4E79">
                <th v-for="h in headersAgrupado" :key="h.key"
                  class="px-3 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
                  :class="h.right ? 'text-right' : 'text-left'">
                  {{ h.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in resultado.agrupado" :key="i"
                :style="i % 2 === 0 ? 'background:#fff' : 'background:#BDD7EE22'">
                <td class="px-3 py-2 text-xs font-medium" style="color:#2C2039;white-space:nowrap">
                  {{ item.descripcion }}
                </td>
                <td class="px-3 py-2 text-xs text-center text-gray-600">
                  {{ item.cantidad_total }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.precio_unitario_promedio) }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.sin_iva) }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-gray-600">
                  {{ formatCOP(item.iva) }}
                </td>
                <td class="px-3 py-2 text-xs text-right font-semibold tabular-nums"
                  style="color:#7c3aed">
                  {{ formatCOP(item.monto_total) }}
                </td>
              </tr>
              <!-- Total agrupado -->
              <tr style="background:#0D2137">
                <td class="px-3 py-2.5 text-xs font-bold text-white">TOTAL</td>
                <td class="px-3 py-2.5 text-center text-xs font-bold text-white">
                  {{ totalAgrupado.cantidad }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white"></td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalAgrupado.sin_iva) }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalAgrupado.iva) }}
                </td>
                <td class="px-3 py-2.5 text-right text-xs font-bold font-mono text-white">
                  {{ formatCOP(totalAgrupado.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const toast = useToast()

const fileInputRef  = ref(null)
const procesando    = ref(false)
const descargando   = ref(false)
const resultado     = ref(null)
const nombreArchivo = ref('')

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
  { key: 'descripcion',              label: 'Descripción',          right: false },
  { key: 'cantidad_total',           label: 'Cantidad',             right: false },
  { key: 'precio_unitario_promedio', label: 'Precio unit. prom.',   right: true  },
  { key: 'sin_iva',                  label: 'Sin IVA',              right: true  },
  { key: 'iva',                      label: 'IVA',                  right: true  },
  { key: 'monto_total',              label: 'Monto total',          right: true  },
]

// ── Totales ───────────────────────────────────────────────────────────────────
const totalDetalle = computed(() => {
  const items = resultado.value?.items ?? []
  return {
    cantidad:  items.reduce((s, i) => s + i.cantidad, 0),
    impuestos: items.reduce((s, i) => s + i.total_impuestos, 0),
    sin_iva:   items.reduce((s, i) => s + i.sin_iva, 0),
    iva:       items.reduce((s, i) => s + i.iva, 0),
    total:     items.reduce((s, i) => s + i.monto_total, 0),
  }
})
const totalAgrupado = computed(() => {
  const items = resultado.value?.agrupado ?? []
  return {
    cantidad: items.reduce((s, i) => s + i.cantidad_total, 0),
    sin_iva:  items.reduce((s, i) => s + i.sin_iva, 0),
    iva:      items.reduce((s, i) => s + i.iva, 0),
    total:    items.reduce((s, i) => s + i.monto_total, 0),
  }
})

// ── Formato COP ───────────────────────────────────────────────────────────────
function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v)
}

// ── Upload ────────────────────────────────────────────────────────────────────
async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  procesando.value = true
  resultado.value  = null
  nombreArchivo.value = file.name

  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/starlink/procesar-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    resultado.value = data
    if (data.advertencia) {
      toast.add({ severity: 'warn', summary: 'Diferencia en totales', detail: data.advertencia, life: 8000 })
    } else {
      toast.add({ severity: 'success', summary: `${data.items.length} ítems extraídos`, life: 3000 })
    }
  } catch (err) {
    const msg = err.response?.data?.detail ?? err.message
    toast.add({ severity: 'error', summary: 'Error al procesar PDF', detail: msg, life: 6000 })
    nombreArchivo.value = ''
  } finally {
    procesando.value = false
  }
}

// ── Descargar Excel ───────────────────────────────────────────────────────────
async function descargarExcel() {
  if (!resultado.value) return
  descargando.value = true
  try {
    const response = await api.post('/starlink/excel', {
      items:    resultado.value.items,
      agrupado: resultado.value.agrupado,
    }, { responseType: 'blob' })

    const url  = URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href     = url
    link.download = `starlink_${nombreArchivo.value.replace('.pdf', '')}.xlsx`
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
</script>
