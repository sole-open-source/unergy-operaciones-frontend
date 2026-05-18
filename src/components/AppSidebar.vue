<template>
  <aside class="w-64 flex flex-col shrink-0" style="background-color: #2C2039;">
    <!-- Logo -->
    <div class="px-6 py-5 flex flex-col items-start border-b" style="border-color: rgba(255,255,255,0.08);">
      <img src="/logos/Logo_avena.png" alt="Unergy" class="h-7 w-auto object-contain" />
      <span class="text-xs mt-1.5" style="color: rgba(253,250,247,0.45);">Plataforma Operaciones</span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-3 py-4 overflow-y-auto">
      <template v-for="group in navGroups" :key="group.label || '__main__'">
        <!-- Separador de sección -->
        <div v-if="group.label" class="px-3 pt-4 pb-1.5">
          <span class="text-[10px] font-bold uppercase tracking-widest" style="color: rgba(145,91,216,0.7);">
            {{ group.label }}
          </span>
        </div>

        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 nav-item"
          active-class="nav-active"
        >
          <i :class="[item.icon, 'text-base w-5 text-center shrink-0']" />
          {{ item.label }}
        </RouterLink>
      </template>
    </nav>

    <!-- User footer -->
    <div class="px-4 py-4 border-t" style="border-color: rgba(255,255,255,0.08);">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
             style="background-color: #915BD8; color: #FDFAF7;">
          {{ initials }}
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium truncate" style="color: #FDFAF7;">{{ auth.user?.nombre || auth.user?.email }}</p>
          <span class="text-[10px] uppercase tracking-wide" style="color: #915BD8;">{{ auth.role }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const initials = computed(() => {
  const name = auth.user?.nombre || auth.user?.email || ''
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
})

const ALL_GROUPS = [
  {
    items: [
      { to: '/clientes',       label: 'Clientes',        icon: 'pi pi-building' },
      { to: '/proyectos',      label: 'Proyectos',       icon: 'pi pi-bolt' },
      { to: '/servicios',      label: 'Servicios',       icon: 'pi pi-file-edit' },
      { to: '/mem/fronteras',  label: 'Fronteras',       icon: 'pi pi-globe' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/fallas', label: 'Monitoreo', icon: 'pi pi-exclamation-triangle', roles: ['admin', 'operaciones', 'monitoreo'] },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/liquidaciones', label: 'Liquidaciones', icon: 'pi pi-dollar', roles: ['admin', 'liquidaciones'] },
      { to: '/liquidaciones/inversionista', label: 'Por Inversionista', icon: 'pi pi-users', roles: ['admin', 'liquidaciones'] },
    ],
  },
  {
    label: 'MEM',
    items: [
      { to: '/mem/gescon',        label: 'GESCON',          icon: 'pi pi-book' },
      { to: '/mem/precio-bolsa',  label: 'Precio de bolsa', icon: 'pi pi-chart-line' },
      { to: '/mem/balance',       label: 'Balance',         icon: 'pi pi-chart-bar' },
      { to: '/mem/cumplimiento',  label: 'Cumplimiento',    icon: 'pi pi-shield' },
    ],
  },
  {
    label: 'Alertas',
    items: [
      { to: '/alertas', label: 'Alertas', icon: 'pi pi-exclamation-circle' },
    ],
  },
]

const navGroups = computed(() =>
  ALL_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => !i.roles || auth.can(...i.roles)),
  })).filter(g => g.items.length > 0)
)
</script>

<style scoped>
.nav-item {
  color: rgba(253, 250, 247, 0.6);
}
.nav-item:hover {
  background-color: rgba(145, 91, 216, 0.12);
  color: #FDFAF7;
}
.nav-active {
  background-color: rgba(145, 91, 216, 0.2) !important;
  color: #FDFAF7 !important;
  border-left: 3px solid #915BD8;
  padding-left: calc(0.75rem - 3px);
  font-weight: 600;
}
.nav-active i {
  color: #915BD8;
}
</style>
