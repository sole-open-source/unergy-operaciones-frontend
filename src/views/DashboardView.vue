<template>
  <div class="space-y-6">
    <!-- KPI Cards Row 1 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in topKpis" :key="kpi.label"
           class="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between"
           style="border: 1px solid #e8e0f0;">
        <div>
          <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">{{ kpi.label }}</p>
          <p class="text-3xl font-bold mt-1" style="color: #2C2039;">{{ kpi.value ?? '—' }}</p>
          <p v-if="kpi.sub" class="text-xs mt-0.5" style="color: #915BD8;">{{ kpi.sub }}</p>
        </div>
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" :style="{ backgroundColor: kpi.bg }">
          <i :class="[kpi.icon, 'text-xl']" :style="{ color: kpi.color }" />
        </div>
      </div>
    </div>

    <!-- Row 2: Fleet Power + Precio Bolsa + MGS Alarms -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold" style="color: #2C2039;">Generación Flota</h3>
          <RouterLink to="/generacion-solar" class="text-xs font-medium" style="color: #915BD8;">Ver detalle →</RouterLink>
        </div>
        <div v-if="data.fleet_power_kw != null" class="flex items-baseline gap-2">
          <span class="text-4xl font-bold" :style="{ color: data.fleet_power_kw > 0 ? '#10B981' : '#6b5a8a' }">
            {{ data.fleet_power_kw > 1000 ? (data.fleet_power_kw / 1000).toFixed(1) : data.fleet_power_kw }}
          </span>
          <span class="text-sm" style="color: #6b5a8a;">{{ data.fleet_power_kw > 1000 ? 'MW' : 'kW' }}</span>
          <span v-if="data.fleet_online != null" class="text-xs ml-2 px-2 py-0.5 rounded-full"
                style="background: rgba(16,185,129,0.1); color: #10B981;">
            {{ data.fleet_online }} online
          </span>
        </div>
        <p v-else class="text-sm" style="color: #6b5a8a;">Solenium no disponible</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold" style="color: #2C2039;">Precio de Bolsa</h3>
          <RouterLink to="/mem/precio-bolsa" class="text-xs font-medium" style="color: #915BD8;">Ver detalle →</RouterLink>
        </div>
        <div v-if="data.precio_bolsa_cop_kwh" class="flex items-baseline gap-2">
          <span class="text-4xl font-bold" style="color: #2C2039;">${{ data.precio_bolsa_cop_kwh }}</span>
          <span class="text-sm" style="color: #6b5a8a;">COP/kWh</span>
        </div>
        <p v-else class="text-sm" style="color: #6b5a8a;">Sin datos de precio disponibles</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold" style="color: #2C2039;">Alarmas MGS</h3>
          <RouterLink to="/alertas/monitoreo" class="text-xs font-medium" style="color: #915BD8;">Ver alertas →</RouterLink>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-4xl font-bold" :style="{ color: data.alarmas_mgs > 0 ? '#D64455' : '#10B981' }">
            {{ data.alarmas_mgs ?? 0 }}
          </span>
          <span class="text-sm" style="color: #6b5a8a;">{{ data.alarmas_mgs === 1 ? 'alarma activa' : 'alarmas activas' }}</span>
        </div>
      </div>
    </div>

    <!-- Pipeline overview -->
    <div v-if="pipeline.stages?.length" class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold" style="color: #2C2039;">Pipeline Origina ({{ pipeline.total_projects }} proyectos)</h3>
        <RouterLink to="/proyectos" class="text-xs font-medium" style="color: #915BD8;">Ver proyectos →</RouterLink>
      </div>
      <div class="flex flex-wrap gap-2">
        <div v-for="stage in pipelineStages" :key="stage.stage"
             class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
             :style="{ background: stage.bg }">
          <span class="font-bold" :style="{ color: stage.color }">{{ stage.count }}</span>
          <span class="text-xs" style="color: #6b5a8a;">{{ stage.label }}</span>
        </div>
      </div>
    </div>

    <!-- Quick links -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <RouterLink v-for="link in quickLinks" :key="link.to" :to="link.to"
                  class="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 transition-all duration-150 hover:shadow-md"
                  style="border: 1px solid #e8e0f0;">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="{ backgroundColor: link.bg }">
          <i :class="[link.icon, 'text-base']" :style="{ color: link.color }" />
        </div>
        <span class="text-sm font-medium" style="color: #2C2039;">{{ link.label }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client'

const data = ref({})
const pipeline = ref({})

const STAGE_CONFIG = {
  operation:     { label: 'Operación',     color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  construction:  { label: 'Construcción',  color: '#F0C040', bg: 'rgba(240,192,64,0.1)' },
  deploy:        { label: 'Deploy',        color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  signed:        { label: 'Firmado',       color: '#915BD8', bg: 'rgba(145,91,216,0.1)' },
  portfolio:     { label: 'Portafolio',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  due_diligence: { label: 'Due Diligence', color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  negociation:   { label: 'Negociación',   color: '#14B8A6', bg: 'rgba(20,184,166,0.1)' },
  prospect:      { label: 'Prospecto',     color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  paused:        { label: 'Pausado',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  dead:          { label: 'Muerto',        color: '#9CA3AF', bg: 'rgba(156,163,175,0.05)' },
}

const pipelineStages = computed(() => {
  if (!pipeline.value.stages) return []
  return pipeline.value.stages
    .filter(s => s.stage !== 'dead')
    .map(s => ({
      ...s,
      label: STAGE_CONFIG[s.stage]?.label || s.stage,
      color: STAGE_CONFIG[s.stage]?.color || '#6b5a8a',
      bg: STAGE_CONFIG[s.stage]?.bg || 'rgba(107,90,138,0.08)',
    }))
})

const topKpis = computed(() => [
  {
    label: 'Proyectos',
    value: data.value.proyectos_total,
    sub: data.value.proyectos_operacion ? `${data.value.proyectos_operacion} en operación` : null,
    icon: 'pi pi-bolt',
    bg: 'rgba(145,91,216,0.1)',
    color: '#915BD8',
  },
  {
    label: 'Clientes',
    value: data.value.clientes_total,
    icon: 'pi pi-building',
    bg: 'rgba(44,32,57,0.08)',
    color: '#2C2039',
  },
  {
    label: 'Fallas abiertas',
    value: data.value.fallas_abiertas,
    icon: 'pi pi-exclamation-triangle',
    bg: data.value.fallas_abiertas > 0 ? 'rgba(214,68,85,0.1)' : 'rgba(16,185,129,0.1)',
    color: data.value.fallas_abiertas > 0 ? '#D64455' : '#10B981',
  },
  {
    label: 'Generación mes',
    value: data.value.mwh_mes ? `${data.value.mwh_mes}` : '—',
    sub: 'MWh',
    icon: 'pi pi-sun',
    bg: 'rgba(240,192,64,0.15)',
    color: '#D4A017',
  },
])

const quickLinks = [
  { to: '/generacion-solar', label: 'Generación Solar', icon: 'pi pi-sun', bg: 'rgba(240,192,64,0.15)', color: '#D4A017' },
  { to: '/mem/precio-bolsa', label: 'Precio de Bolsa', icon: 'pi pi-chart-line', bg: 'rgba(145,91,216,0.1)', color: '#915BD8' },
  { to: '/fallas', label: 'Monitoreo Fallas', icon: 'pi pi-eye', bg: 'rgba(214,68,85,0.1)', color: '#D64455' },
  { to: '/mem/fronteras', label: 'Fronteras', icon: 'pi pi-globe', bg: 'rgba(44,32,57,0.08)', color: '#2C2039' },
]

onMounted(async () => {
  try {
    const [kpiRes, pipeRes] = await Promise.all([
      api.get('/dashboard/kpis').catch(() => null),
      api.get('/correlation/pipeline').catch(() => null),
    ])
    if (kpiRes?.data) data.value = kpiRes.data
    if (pipeRes?.data?.available) pipeline.value = pipeRes.data
  } catch {
    // degrade gracefully
  }
})
</script>
