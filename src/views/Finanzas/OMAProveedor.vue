<template>
  <div class="space-y-4 pt-3">

    <div class="flex items-center gap-3">
      <button type="button" @click="cambiarMes(-1)"
        class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
        <i class="pi pi-chevron-left text-xs text-gray-500" />
      </button>
      <span class="text-sm font-semibold" style="color:#2C2039; min-width:100px; text-align:center">
        {{ periodoLabel }}
      </span>
      <button type="button" @click="cambiarMes(1)"
        class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
        <i class="pi pi-chevron-right text-xs text-gray-500" />
      </button>
      <Tag :value="periodoActual" severity="secondary" class="text-xs font-mono" />
    </div>

    <div v-if="loading" class="flex justify-center py-10"><ProgressSpinner /></div>
    <div v-else-if="!filas.length"
      class="rounded-xl border border-dashed p-8 text-center" style="border-color:#915BD840">
      <i class="pi pi-inbox text-2xl mb-2 block" style="color:#c4b5fd"/>
      <p class="text-sm text-gray-500">No hay proyectos guardados para este período.</p>
      <p class="text-xs text-gray-400 mt-1">Operaciones aún no guardó la selección del mes.</p>
    </div>
    <div v-else class="rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse" style="min-width:700px">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Mes / Año</th>
              <th class="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Valor a Facturar</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Indexación aplicada</th>
              <th class="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in filas" :key="fila.contrato_id"
              class="border-b border-gray-50 hover:bg-gray-50/50">
              <td class="px-4 py-2.5 font-medium" style="color:#2C2039">{{ fila.nombre_proyecto }}</td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ fila.mes_año }}</td>
              <td class="px-4 py-2.5 text-right font-semibold tabular-nums" style="color:#7c3aed">
                {{ formatCOP(fila.valor_a_facturar) }}
              </td>
              <td class="px-4 py-2.5 text-xs text-gray-400"
                style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                :title="fila.historial_indexaciones">
                {{ fila.historial_indexaciones }}
              </td>
              <td class="px-4 py-2.5 text-center">
                <button v-if="!fila.facturado" type="button"
                  class="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors hover:bg-green-50"
                  style="border-color:#15803d;color:#15803d"
                  :disabled="toggling[fila.contrato_id]"
                  @click="toggleFacturado(fila)">
                  Marcar facturado
                </button>
                <span v-else
                  class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80"
                  style="background:#dcfce7;color:#166534"
                  @click="toggleFacturado(fila)">
                  <i class="pi pi-check text-[10px]"/>FACTURADO
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Factura consolidada del mes ───────────────────────────────── -->
    <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#E5E2EC">
      <div class="flex items-center justify-between px-4 py-2.5 border-b" style="border-color:#F3F0FA;background:#FDFCFF">
        <div class="flex items-center gap-2">
          <i class="pi pi-file-pdf text-xs" style="color:#915BD8" />
          <span class="text-sm font-semibold" style="color:#2C2039">Factura consolidada del mes</span>
          <Tag :value="periodoLabel" severity="secondary" class="text-xs font-mono" />
        </div>
        <!-- indicador de estado -->
        <span v-if="factura.nombre_archivo"
          class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style="background:#dcfce7;color:#166534">
          <i class="pi pi-check text-[10px]"/>Subida
        </span>
        <span v-else class="text-xs text-gray-400">Pendiente</span>
      </div>

      <div class="px-4 py-3 space-y-3">
        <!-- Si ya existe factura: mostrar y opción de reemplazar -->
        <div v-if="factura.nombre_archivo"
          class="flex items-center gap-3 p-2.5 rounded-lg" style="background:#f0fdf4;border:1px solid #bbf7d0">
          <i class="pi pi-file-pdf text-sm flex-shrink-0" style="color:#16a34a"/>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold truncate" style="color:#15803d">{{ factura.nombre_archivo }}</p>
            <p v-if="factura.subido_en" class="text-[10px] text-gray-400 mt-0.5">
              Subida: {{ fmtFecha(factura.subido_en) }}
            </p>
          </div>
          <!-- Descargar si es archivo local -->
          <a v-if="factura.tiene_archivo"
            :href="`${apiBase}/om/factura/${periodoActual}/file`"
            target="_blank" rel="noopener"
            class="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0"
            style="color:#15803d">
            <i class="pi pi-download text-xs"/>Descargar
          </a>
          <!-- Abrir link externo -->
          <a v-else-if="factura.enlace_pdf"
            :href="factura.enlace_pdf" target="_blank" rel="noopener"
            class="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0"
            style="color:#915BD8">
            <i class="pi pi-external-link text-xs"/>Ver
          </a>
        </div>

        <!-- Formulario de subida -->
        <div class="space-y-2">
          <p class="text-xs text-gray-500">
            {{ factura.nombre_archivo ? 'Reemplazar factura:' : 'Subir archivo PDF:' }}
          </p>

          <!-- Opción A: subir archivo -->
          <label class="flex items-center gap-2 text-xs border border-dashed rounded-lg px-3 py-2 cursor-pointer hover:border-purple-400 transition-colors"
            :class="archivoSeleccionado ? 'border-purple-400 bg-purple-50' : 'border-gray-300'">
            <i class="pi pi-paperclip text-xs" :style="archivoSeleccionado ? 'color:#915BD8' : 'color:#9ca3af'"/>
            <span :style="archivoSeleccionado ? 'color:#7c3aed' : 'color:#9ca3af'" class="truncate">
              {{ archivoSeleccionado ? archivoSeleccionado.name : 'Seleccionar PDF…' }}
            </span>
            <input type="file" accept=".pdf,.PDF" class="hidden" @change="onFacturaChange" />
          </label>

          <!-- Opción B: link externo -->
          <div class="flex items-center gap-1.5">
            <div class="h-px flex-1" style="background:#e5e7eb"/>
            <span class="text-[10px] text-gray-400">o pega un link</span>
            <div class="h-px flex-1" style="background:#e5e7eb"/>
          </div>
          <input type="url" v-model="linkExterno"
            placeholder="https://drive.google.com/…"
            class="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200"/>

          <button type="button"
            :disabled="!puedeSubir || subiendoFactura"
            class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style="background:#915BD8;color:#fff;border:none"
            :style="!puedeSubir || subiendoFactura ? 'opacity:0.4;cursor:not-allowed' : 'cursor:pointer'"
            @click="subirFactura">
            <i :class="subiendoFactura ? 'pi pi-spin pi-spinner' : 'pi pi-cloud-upload'" class="text-xs"/>
            {{ subiendoFactura ? 'Subiendo…' : (factura.nombre_archivo ? 'Reemplazar' : 'Subir factura') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import Tag             from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast }    from 'primevue/usetoast'
import api             from '@/api/client'

const toast = useToast()

const hoy = new Date()
const periodoOffset = ref(0)

const periodoActual = computed(() => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + periodoOffset.value, 1)
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
})

const periodoLabel = computed(() => {
  const [yyyy, mm] = periodoActual.value.split('-')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${MESES[parseInt(mm) - 1]} ${yyyy}`
})

function cambiarMes(delta) { periodoOffset.value += delta }

const loading  = ref(false)
const filas    = ref([])
const toggling = reactive({})

// ── Factura consolidada ───────────────────────────────────────────────────────
const factura          = ref({ nombre_archivo: null, enlace_pdf: null, tiene_archivo: false, subido_en: null })
const archivoSeleccionado = ref(null)
const linkExterno      = ref('')
const subiendoFactura  = ref(false)
const apiBase          = import.meta.env.VITE_API_URL?.replace(/\/$/, '') + '/api/v1'

const puedeSubir = computed(() => !!(archivoSeleccionado.value || linkExterno.value.startsWith('http')))

function onFacturaChange(e) {
  archivoSeleccionado.value = e.target.files?.[0] ?? null
  if (archivoSeleccionado.value) linkExterno.value = ''
}

function fmtFecha(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return '' }
}

async function cargarFactura() {
  try {
    const { data } = await api.get(`/om/factura/${periodoActual.value}`)
    factura.value = data
  } catch { /* silencioso — no hay factura aún */ }
}

async function subirFactura() {
  if (!puedeSubir.value) return
  subiendoFactura.value = true
  try {
    if (archivoSeleccionado.value) {
      const form = new FormData()
      form.append('file', archivoSeleccionado.value)
      await api.post(`/om/factura/${periodoActual.value}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } else {
      await api.put(`/om/factura/${periodoActual.value}/enlace`, {
        enlace_pdf: linkExterno.value,
        nombre_archivo: linkExterno.value,
      })
    }
    archivoSeleccionado.value = null
    linkExterno.value = ''
    await cargarFactura()
    toast.add({ severity: 'success', summary: 'Factura subida correctamente', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al subir la factura', life: 3000 })
  } finally {
    subiendoFactura.value = false
  }
}

function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

async function cargarDatos() {
  loading.value = true
  try {
    const res = await api.get(`/om/calculo/${periodoActual.value}`)
    filas.value = res.data.filas.filter(f => f.incluido && f.habilitado)
  } catch {
    toast.add({ severity: 'error', summary: 'Error al cargar', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function toggleFacturado(fila) {
  toggling[fila.contrato_id] = true
  try {
    await api.patch(`/om/seleccion/${periodoActual.value}/${fila.contrato_id}/facturado`)
    fila.facturado = !fila.facturado
  } catch {
    toast.add({ severity: 'error', summary: 'Error al actualizar estado', life: 3000 })
  } finally {
    toggling[fila.contrato_id] = false
  }
}

watch(periodoActual, () => { cargarDatos(); cargarFactura() })
onMounted(() => { cargarDatos(); cargarFactura() })
</script>
