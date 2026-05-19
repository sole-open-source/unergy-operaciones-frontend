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

    <!-- Row 2: Precio Bolsa + MGS Alarms -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Precio de Bolsa -->
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

      <!-- MGS Alarmas -->
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
  { to: '/mem/precio-bolsa', label: 'Precio de Bolsa', icon: 'pi pi-chart-line', bg: 'rgba(145,91,216,0.1)', color: '#915BD8' },
  { to: '/fallas', label: 'Monitoreo', icon: 'pi pi-eye', bg: 'rgba(214,68,85,0.1)', color: '#D64455' },
  { to: '/mem/fronteras', label: 'Fronteras', icon: 'pi pi-globe', bg: 'rgba(44,32,57,0.08)', color: '#2C2039' },
  { to: '/liquidaciones', label: 'Liquidaciones', icon: 'pi pi-dollar', bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
]

onMounted(async () => {
  try {
    const { data: d } = await api.get('/dashboard/kpis')
    data.value = d
  } catch {
    // degrade gracefully
  }
})
</script>
