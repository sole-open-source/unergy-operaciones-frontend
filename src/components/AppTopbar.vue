<template>
  <header class="h-14 bg-white border-b flex items-center justify-between px-4 sm:px-6 shrink-0" style="border-color: #e8e0f0;">
    <div class="flex items-center gap-3">
      <button class="lg:hidden p-1 -ml-1" @click="toggle" style="color: #2C2039;">
        <i class="pi pi-bars text-lg" />
      </button>
      <h1 class="text-sm font-semibold" style="color: #2C2039;">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-3">
      <span class="text-xs hidden sm:block" style="color: #6b5a8a;">{{ auth.user?.email }}</span>
      <button
        @click="handleLogout"
        class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
        style="color: #915BD8; border: 1px solid #915BD8;"
        onmouseover="this.style.backgroundColor='#915BD8';this.style.color='#FDFAF7'"
        onmouseout="this.style.backgroundColor='transparent';this.style.color='#915BD8'"
        title="Cerrar sesión"
      >
        <i class="pi pi-sign-out text-xs" />
        <span class="hidden sm:inline">Salir</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { toggle } = useSidebar()

const titles = {
  Dashboard:       'Panel principal',
  Clientes:        'Clientes',
  ClienteDetalle:  'Detalle de cliente',
  Proyectos:       'Proyectos',
  ProyectoDetalle: 'Detalle de proyecto',
  Fallas:          'Monitoreo de fallas',
  FallaDetalle:    'Detalle de falla',
  Liquidaciones:   'Liquidaciones',
  LiquidacionDetalle: 'Detalle de liquidación',
  PrecioBolsa:     'Precio de bolsa',
  Fronteras:       'Fronteras',
  Balance:         'Balance energético',
  GESCON:          'GESCON',
  Cumplimiento:    'Cumplimiento',
  AlertasMonitoreo: 'Alarmas de monitoreo',
}

const pageTitle = computed(() => titles[route.name] || route.name || 'Operaciones')

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
