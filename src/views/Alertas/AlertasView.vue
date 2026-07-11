<template>
  <div class="space-y-5">
    <PageHeader title="Centro de Alertas" subtitle="Estado operacional de la plataforma">
      <template #lead>
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background: rgba(214,68,85,0.1);">
          <i class="pi pi-exclamation-circle text-sm" style="color: #D64455;" />
        </div>
      </template>
    </PageHeader>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="stat in summaryStats" :key="stat.label"
           class="rounded-xl p-4" :style="{ border: `1px solid ${stat.borderColor}`, background: stat.bg }">
        <p class="text-3xl font-bold" :style="{ color: stat.valueColor }">{{ stat.value ?? '—' }}</p>
        <p class="text-xs font-semibold mt-1" :style="{ color: stat.labelColor }">{{ stat.label }}</p>
      </div>
    </div>

    <!-- Datos XM de liquidación ausentes / retrasados (LiquidacionXMDato) -->
    <div
      v-if="xmDataMissingCount > 0 || xmDataAlerts.length"
      class="rounded-2xl bg-white shadow-sm p-5 space-y-4"
      style="border: 2px solid rgba(214,68,85,0.25);"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-database" style="color:#D64455" />
          <span class="font-semibold" style="color:#2C2039">Datos XM de liquidación</span>
        </div>
        <Tag :value="`Datos XM Ausentes: ${xmDataMissingCount}`" severity="danger" />
      </div>

      <div v-if="xmDataAlerts.length" class="space-y-2">
        <button
          v-for="alert in xmDataAlerts"
          :key="alert.id ?? alert.period"
          type="button"
          class="w-full text-left rounded-xl border p-3 flex items-start gap-3 transition-all hover:shadow-md"
          :style="`border-color:${alert.type === 'liquidacion_xm_data_delayed' ? 'rgba(234,88,12,0.3)' : 'rgba(214,68,85,0.3)'}`"
          @click="abrirEstadoXM(alert)"
        >
          <i
            class="pi mt-0.5"
            :class="alert.type === 'liquidacion_xm_data_delayed' ? 'pi-clock' : 'pi-exclamation-circle'"
            :style="`color:${alert.type === 'liquidacion_xm_data_delayed' ? '#EA580C' : '#D64455'}`"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium truncate" style="color:#2C2039">{{ alert.title || 'Datos XM pendientes' }}</p>
              <Tag
                v-if="formatPeriod(alert.period)"
                :value="formatPeriod(alert.period)"
                :severity="alert.type === 'liquidacion_xm_data_delayed' ? 'warn' : 'danger'"
              />
            </div>
            <p v-if="alert.description" class="text-xs mt-1" style="color:#6b5a8a">{{ alert.description }}</p>
          </div>
          <i class="pi pi-chevron-right text-xs mt-1" style="color:#b9a8d4" />
        </button>
      </div>
      <p v-else class="text-xs" style="color:#6b5a8a">
        No hay detalle de periodos disponible por el momento.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <RouterLink
        v-for="mod in MODULOS"
        :key="mod.to"
        :to="mod.to"
        class="flex flex-col items-center gap-4 rounded-2xl p-8 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 select-none text-center bg-white shadow-sm"
        :style="`border: 2px solid ${mod.count > 0 ? mod.color + '40' : '#e8e0f0'};`"
      >
        <div class="w-16 h-16 rounded-full flex items-center justify-center relative"
          :style="`background: ${mod.color}18`">
          <i :class="mod.icon" class="text-3xl" :style="`color: ${mod.color}`" />
          <span v-if="mod.count > 0"
                class="absolute -top-1 -right-1 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                :style="`background: ${mod.color};`">
            {{ mod.count > 99 ? '99+' : mod.count }}
          </span>
        </div>
        <div>
          <p class="font-semibold" style="color: #2C2039;">{{ mod.label }}</p>
          <p class="text-xs mt-1" style="color: #6b5a8a;">{{ mod.desc }}</p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import api from '@/api/client'

const router = useRouter()

const kpis = ref({})
const ppaAlerts = ref({ huerfanos: [], duplicados: [] })
const alertsSummary = ref({})
const xmDataAlerts = ref([])

const xmDataMissingCount = computed(
  () => alertsSummary.value.liquidaciones_xm_data_missing_count ?? 0
)

// El backend puede devolver el periodo como 'YYYY-MM', 'YYYY-MM-DD' o una
// fecha ISO; siempre navegamos con el formato 'YYYY-MM' que espera la vista
// de descarga.
function formatPeriod(period) {
  if (!period) return ''
  const m = String(period).match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : String(period)
}

function abrirEstadoXM(alert) {
  router.push({
    name: 'DescargaXM',
    query: { tab: 'xm_data_status', period: formatPeriod(alert.period) },
  })
}

const summaryStats = computed(() => {
  const fp = kpis.value.fallas_por_prioridad || {}
  return [
    {
      label: 'Fallas activas',
      value: kpis.value.fallas_abiertas,
      bg: kpis.value.fallas_abiertas > 0 ? 'rgba(214,68,85,0.05)' : 'rgba(16,185,129,0.05)',
      borderColor: kpis.value.fallas_abiertas > 0 ? 'rgba(214,68,85,0.2)' : 'rgba(16,185,129,0.2)',
      valueColor: kpis.value.fallas_abiertas > 0 ? '#D64455' : '#10B981',
      labelColor: '#6b5a8a',
    },
    {
      label: 'Fallas críticas',
      value: fp.critica || 0,
      bg: fp.critica > 0 ? 'rgba(220,38,38,0.05)' : 'rgba(16,185,129,0.05)',
      borderColor: fp.critica > 0 ? 'rgba(220,38,38,0.2)' : 'rgba(16,185,129,0.2)',
      valueColor: fp.critica > 0 ? '#DC2626' : '#10B981',
      labelColor: '#6b5a8a',
    },
    {
      label: 'Alarmas MGS',
      value: kpis.value.alarmas_mgs ?? 0,
      bg: kpis.value.alarmas_mgs > 0 ? 'rgba(234,88,12,0.05)' : 'rgba(16,185,129,0.05)',
      borderColor: kpis.value.alarmas_mgs > 0 ? 'rgba(234,88,12,0.2)' : 'rgba(16,185,129,0.2)',
      valueColor: kpis.value.alarmas_mgs > 0 ? '#EA580C' : '#10B981',
      labelColor: '#6b5a8a',
    },
    {
      label: 'Alertas PPA',
      value: (ppaAlerts.value.huerfanos?.length || 0) + (ppaAlerts.value.duplicados?.length || 0),
      bg: 'rgba(240,192,64,0.08)',
      borderColor: 'rgba(240,192,64,0.25)',
      valueColor: '#CA8A04',
      labelColor: '#6b5a8a',
    },
  ]
})

const MODULOS = computed(() => [
  {
    to: '/alertas/contratos-ppa',
    label: 'Contratos PPA',
    desc: 'Proyectos huérfanos y duplicados en GESCON',
    icon: 'pi pi-bolt',
    color: '#f59e0b',
    count: (ppaAlerts.value.huerfanos?.length || 0) + (ppaAlerts.value.duplicados?.length || 0),
  },
  {
    to: '/alertas/monitoreo',
    label: 'Alarmas MGS',
    desc: 'Alarmas de generación en tiempo real',
    icon: 'pi pi-exclamation-triangle',
    color: '#ef4444',
    count: kpis.value.alarmas_mgs || 0,
  },
  {
    to: '/fallas',
    label: 'Fallas Operativas',
    desc: 'Fallas activas por prioridad y estado',
    icon: 'pi pi-wrench',
    color: '#915BD8',
    count: kpis.value.fallas_abiertas || 0,
  },
  {
    to: '/garantias?expiring_days=30',
    label: 'Garantías por Vencer',
    desc: 'Garantías que vencen en los próximos 30 días',
    icon: 'pi pi-wallet',
    color: '#CA8A04',
    count: kpis.value.garantias_por_vencer || 0,
  },
])

onMounted(async () => {
  try {
    const [kpiRes, ppaRes, summaryRes, xmRes] = await Promise.all([
      api.get('/dashboard/kpis').catch(() => null),
      api.get('/alertas/contratos-ppa').catch(() => null),
      api.get('/alerts/summary').catch(() => null),
      api.get('/alerts', { params: { type: 'liquidacion_xm_data' } }).catch(() => null),
    ])
    if (kpiRes?.data) kpis.value = kpiRes.data
    if (ppaRes?.data) ppaAlerts.value = ppaRes.data
    if (summaryRes?.data) alertsSummary.value = summaryRes.data
    // El endpoint puede responder con un arreglo directo o { items: [...] }.
    const xm = xmRes?.data
    if (Array.isArray(xm)) xmDataAlerts.value = xm
    else if (Array.isArray(xm?.items)) xmDataAlerts.value = xm.items
  } catch {
    // degrade gracefully
  }
})
</script>
