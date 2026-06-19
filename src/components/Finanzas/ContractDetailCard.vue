<template>
  <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#ECE7F2">

    <!-- ── Loading ─────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-8 text-gray-400 text-xs">
      <i class="pi pi-spin pi-spinner" />Cargando detalle del contrato…
    </div>

    <!-- ── Sin contrato asociado ───────────────────────────────────────────── -->
    <div v-else-if="!contratoId" class="flex flex-col items-center gap-2 py-8 px-4 text-center">
      <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background:#F1EAF9">
        <i class="pi pi-file-excel text-lg" style="color:#915BD8" />
      </div>
      <p class="text-sm font-medium text-gray-500">Sin contrato de mantenimiento asociado</p>
      <p class="text-xs text-gray-400">Este proyecto aún no tiene un contrato de mantenimiento registrado.</p>
    </div>

    <!-- ── Error de carga ──────────────────────────────────────────────────── -->
    <div v-else-if="error" class="flex flex-col items-center gap-2 py-8 px-4 text-center">
      <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background:#FEF2F2">
        <i class="pi pi-exclamation-triangle text-lg" style="color:#ef4444" />
      </div>
      <p class="text-sm font-medium text-gray-500">{{ error }}</p>
      <button type="button"
        class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        style="background:#915BD8;color:#fff;border:none;cursor:pointer"
        @click="load">
        <i class="pi pi-refresh text-xs mr-1" />Reintentar
      </button>
    </div>

    <!-- ── Detalle del contrato ────────────────────────────────────────────── -->
    <div v-else-if="contrato">
      <!-- Encabezado: proveedor + estado -->
      <div class="flex items-center justify-between gap-3 px-4 py-3 border-b" style="border-color:#F3F0FA; background:#FDFCFF">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#F1EAF9">
            <i class="pi pi-briefcase text-sm" style="color:#915BD8" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-gray-400 leading-none mb-0.5">Proveedor</p>
            <span class="text-sm font-semibold truncate block" style="color:#2C2039">
              {{ contrato.prestador_nombre || '—' }}
            </span>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1 leading-none flex-shrink-0"
          :style="estadoStyle">
          <i class="pi pi-circle-fill text-[7px]" />{{ estadoLabel }}
        </span>
      </div>

      <!-- Grilla de metadatos -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 px-4 py-4">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">N° contrato</span>
          <span class="text-sm font-medium" style="color:#2C2039">{{ contrato.numero_contrato || '—' }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">NIT proveedor</span>
          <span class="text-sm font-medium" style="color:#2C2039">{{ contrato.prestador_nit || '—' }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Periodicidad de pago</span>
          <span class="text-sm font-medium capitalize" style="color:#2C2039">{{ contrato.periodicidad_pago || '—' }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Fecha de inicio</span>
          <span class="text-sm font-medium font-mono" style="color:#2C2039">{{ formatFecha(contrato.fecha_inicio) }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Fecha de fin</span>
          <span class="text-sm font-medium font-mono" style="color:#2C2039">{{ formatFecha(contrato.fecha_fin) }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Fecha de firma</span>
          <span class="text-sm font-medium font-mono" style="color:#2C2039">{{ formatFecha(contrato.fecha_firma_contrato) }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Tarifa base</span>
          <span class="text-sm font-semibold tabular-nums" style="color:#6D28D9">{{ formatCOP(contrato.tarifa_base) }}</span>
        </div>
        <div v-if="contrato.valor_base_anual != null" class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Valor base anual</span>
          <span class="text-sm font-semibold tabular-nums" style="color:#6D28D9">{{ formatCOP(contrato.valor_base_anual) }}</span>
        </div>
        <div v-if="contrato.valor_anual_indexado != null" class="flex flex-col gap-0.5">
          <span class="text-xs text-gray-400">Valor anual indexado</span>
          <span class="text-sm font-semibold tabular-nums" style="color:#6D28D9">{{ formatCOP(contrato.valor_anual_indexado) }}</span>
        </div>
      </div>

      <!-- Pie: enlaces -->
      <div class="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t" style="border-color:#F3F0FA; background:#FAFAFC">
        <a v-if="contrato.enlace_drive"
          :href="contrato.enlace_drive" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs font-medium hover:underline" style="color:#915BD8">
          <i class="pi pi-external-link text-xs" />Soporte en Drive
        </a>
        <router-link :to="{ name: 'ContratoDetalle', params: { id: contratoId } }"
          class="inline-flex items-center gap-1 text-xs font-medium hover:underline" style="color:#915BD8">
          <i class="pi pi-arrow-up-right text-xs" />Ver contrato completo
        </router-link>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/api/client'

const props = defineProps({
  contratoId: { type: Number, default: null },
})

const contrato = ref(null)
const loading  = ref(false)
const error    = ref('')

const ESTADO_MAP = {
  vigente:    { label: 'Vigente',    style: 'background:#dcfce7;color:#15803d' },
  pendiente:  { label: 'Pendiente',  style: 'background:#fef3c7;color:#d97706' },
  terminado:  { label: 'Terminado',  style: 'background:#f3f4f6;color:#6b7280' },
  archivado:  { label: 'Archivado',  style: 'background:#f3f4f6;color:#6b7280' },
  cancelado:  { label: 'Cancelado',  style: 'background:#FEF2F2;color:#ef4444' },
}
const estadoLabel = computed(() => {
  const e = (contrato.value?.estado || '').toLowerCase()
  return ESTADO_MAP[e]?.label ?? (contrato.value?.estado || 'Sin estado')
})
const estadoStyle = computed(() => {
  const e = (contrato.value?.estado || '').toLowerCase()
  return ESTADO_MAP[e]?.style ?? 'background:#f3f4f6;color:#6b7280'
})

async function load() {
  contrato.value = null
  error.value = ''
  if (!props.contratoId) return
  loading.value = true
  try {
    const { data } = await api.get(`/contratos-servicio/${props.contratoId}`)
    if (!data || !data.id) {
      error.value = 'Contrato no encontrado'
    } else {
      contrato.value = data
    }
  } catch (e) {
    error.value = e.response?.status === 404
      ? 'Contrato no encontrado'
      : 'Error al cargar los datos del contrato'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.contratoId, load)

function formatFecha(v) {
  if (!v) return '—'
  return String(v).slice(0, 10)
}

function formatCOP(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(val)
}
</script>
