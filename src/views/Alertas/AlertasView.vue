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
import { RouterLink } from 'vue-router'
import api from '@/api/client'

const kpis = ref({})
const ppaAlerts = ref({ huerfanos: [], duplicados: [] })

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
    const [kpiRes, ppaRes] = await Promise.all([
      api.get('/dashboard/kpis').catch(() => null),
      api.get('/alertas/contratos-ppa').catch(() => null),
    ])
    if (kpiRes?.data) kpis.value = kpiRes.data
    if (ppaRes?.data) ppaAlerts.value = ppaRes.data
  } catch {
    // degrade gracefully
  }
})
</script>
