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

watch(periodoActual, cargarDatos)
onMounted(cargarDatos)
</script>
