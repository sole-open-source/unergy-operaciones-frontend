import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/clientes', name: 'Clientes', component: () => import('@/views/Clientes/ClientesListView.vue') },
  { path: '/clientes/:id', name: 'ClienteDetalle', component: () => import('@/views/Clientes/ClienteDetailView.vue') },
  { path: '/proyectos', name: 'Proyectos', component: () => import('@/views/Proyectos/ProyectosListView.vue') },
  { path: '/proyectos/:id', name: 'ProyectoDetalle', component: () => import('@/views/Proyectos/ProyectoDetailView.vue') },
  { path: '/proyectos/:id/ppa', name: 'ProyectoPPA', component: () => import('@/views/Servicios/PPAView.vue') },
  { path: '/servicios', name: 'Servicios', component: () => import('@/views/Contratos/ContratosListView.vue') },
  { path: '/contratos/:id', name: 'ContratoDetalle', component: () => import('@/views/Contratos/ContratoDetailView.vue') },
  { path: '/fallas', name: 'Fallas', component: () => import('@/views/Fallas/MonitoreoView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/fallas/:id', name: 'FallaDetalle', component: () => import('@/views/Fallas/FallaDetailView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/liquidaciones', name: 'Liquidaciones', component: () => import('@/views/Liquidaciones/LiquidacionesListView.vue'), meta: { roles: ['admin', 'liquidaciones'] } },
  { path: '/liquidaciones/inversionista', name: 'LiquidacionesPorInversionista', component: () => import('@/views/Liquidaciones/LiquidacionesPorInversionistaView.vue'), meta: { roles: ['admin', 'liquidaciones'] } },
  { path: '/liquidaciones/:id', name: 'LiquidacionDetalle', component: () => import('@/views/Liquidaciones/LiquidacionDetailView.vue'), meta: { roles: ['admin', 'liquidaciones'] } },
  { path: '/alertas',                name: 'Alertas',             component: () => import('@/views/Alertas/AlertasView.vue') },
  { path: '/alertas/contratos-ppa',  name: 'AlertasContratosPPA', component: () => import('@/views/Alertas/AlertasContratosPPAView.vue') },
  { path: '/alertas/monitoreo',      name: 'AlertasMonitoreo',    component: () => import('@/views/Alertas/AlertasMonitoreoView.vue') },
  { path: '/generacion-solar',  name: 'GeneracionSolar',  component: () => import('@/views/GeneracionSolarView.vue') },
  { path: '/mem/gescon',       name: 'MemGescon',        component: () => import('@/views/MEM/GesconView.vue') },
  { path: '/mem/fronteras',    name: 'MemFronteras',     component: () => import('@/views/MEM/FronterasView.vue') },
  { path: '/mem/precio-bolsa', name: 'MemPrecioBolsa',   component: () => import('@/views/MEM/PrecioBolsaView.vue') },
  { path: '/mem/balance',      name: 'MemBalance',       component: () => import('@/views/MEM/BalanceView.vue') },
  { path: '/mem/clima',        name: 'MemClima',         component: () => import('@/views/MEM/ClimaView.vue') },
  { path: '/mem/cumplimiento', name: 'MemCumplimiento',  component: () => import('@/views/MEM/CumplimientoView.vue') },
  { path: '/mem/cumplimiento-v2', name: 'MemCumplimientoV2', component: () => import('@/views/MEM/CumplimientoV2View.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return '/login'
  if (to.meta.roles && !auth.can(...to.meta.roles)) return '/dashboard'
})

export default router
