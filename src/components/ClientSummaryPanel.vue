<template>
  <div class="space-y-2">
    <!-- Aviso de resumen no disponible (la vista sigue usable vía pestañas) -->
    <div v-if="error && !loading"
      class="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
      style="background: rgba(240,192,64,0.12); border: 1px solid rgba(240,192,64,0.35); color: #8a6d00;">
      <i class="pi pi-exclamation-triangle mt-0.5" />
      <span>No se pudo cargar el resumen del cliente. Los indicadores pueden estar incompletos.</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- ── KPI: MWh netos (mes anterior) ── -->
      <div class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center gap-2 mb-1.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
            style="background: #f0ebfd; color: #915BD8;">
            <i class="pi pi-chart-line text-sm" />
          </div>
          <p class="text-xs font-medium" style="color: #6b5a8a;">MWh netos</p>
        </div>
        <template v-if="loading">
          <div class="h-7 w-24 rounded animate-pulse" style="background: #efe9f8;" />
        </template>
        <template v-else>
          <p class="text-2xl font-bold leading-tight tabular-nums" style="color: #2C2039;">
            {{ formattedMwh }}
          </p>
          <p class="text-xs mt-0.5" style="color: #9b89b5;">{{ periodoLabel }}</p>
        </template>
      </div>

      <!-- ── KPI: Proyectos en operación ── -->
      <div class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center gap-2 mb-1.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
            style="background: #e8f5e9; color: #2e7d32;">
            <i class="pi pi-bolt text-sm" />
          </div>
          <p class="text-xs font-medium" style="color: #6b5a8a;">Proyectos en operación</p>
        </div>
        <template v-if="loading">
          <div class="h-7 w-12 rounded animate-pulse" style="background: #efe9f8;" />
        </template>
        <template v-else>
          <p class="text-2xl font-bold leading-tight tabular-nums" style="color: #2C2039;">
            {{ activeServicesCount ?? '—' }}
          </p>
          <p class="text-xs mt-0.5" style="color: #9b89b5;">servicios activos</p>
        </template>
      </div>

      <!-- ── KPI: Cumplimiento PPA (semáforo) ── -->
      <div class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center gap-2 mb-1.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
            style="background: #fff3e0; color: #F57C00;">
            <i class="pi pi-file-edit text-sm" />
          </div>
          <p class="text-xs font-medium" style="color: #6b5a8a;">Cumplimiento PPA</p>
        </div>
        <template v-if="loading">
          <div class="h-7 w-28 rounded animate-pulse" style="background: #efe9f8;" />
        </template>
        <template v-else>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold"
            :style="semaforo.style">
            <span class="w-2 h-2 rounded-full" :style="{ background: semaforo.dot }" />
            {{ semaforo.label }}
          </span>
          <p class="text-xs mt-1" style="color: #9b89b5;">{{ ppaSubLabel }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mwhNetLastMonth: { type: Number, default: null },
  activeServicesCount: { type: Number, default: null },
  ppaComplianceStatus: { type: String, default: 'sin_contratos' },
  periodo: { type: String, default: null },          // 'YYYY-MM'
  ppaContractsCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})

const formattedMwh = computed(() => {
  const v = props.mwhNetLastMonth
  if (v === null || v === undefined) return '—'
  return `${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })} MWh`
})

const periodoLabel = computed(() => {
  if (!props.periodo) return 'mes anterior'
  const [y, m] = props.periodo.split('-').map(Number)
  if (!y || !m) return 'mes anterior'
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${meses[m - 1]} ${y}`
})

const SEMAFOROS = {
  verde:         { label: 'Al día',        dot: '#10B981', style: 'background:rgba(16,185,129,0.12);color:#0f8a5f' },
  amarillo:      { label: 'En alerta',     dot: '#CA8A04', style: 'background:rgba(202,138,4,0.12);color:#a16207' },
  rojo:          { label: 'En riesgo',     dot: '#DC2626', style: 'background:rgba(220,38,38,0.12);color:#b91c1c' },
  sin_contratos: { label: 'Sin contratos', dot: '#9b89b5', style: 'background:#f3f3f3;color:#6b5a8a' },
}

// Estado degradado: cuando el resumen no cargó NO afirmamos "Sin contratos"
// (sería un dato de negocio falso); mostramos un neutro "Sin datos".
const SEMAFORO_SIN_DATOS = { label: 'Sin datos', dot: '#c4b8d4', style: 'background:#f3f3f3;color:#9b89b5' }

const semaforo = computed(() => {
  if (props.error) return SEMAFORO_SIN_DATOS
  return SEMAFOROS[props.ppaComplianceStatus] || SEMAFOROS.sin_contratos
})

const ppaSubLabel = computed(() => {
  if (props.error) return 'no disponible'
  const n = props.ppaContractsCount
  if (!n) return 'sin contratos PPA'
  return `${n} contrato${n === 1 ? '' : 's'} PPA`
})
</script>
