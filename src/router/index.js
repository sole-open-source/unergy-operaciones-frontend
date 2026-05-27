import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // ── Públicas ─────────────────────────────────────────────────────
  { path: '/login',                   name: 'Login',          component: () => import('@/views/LoginView.vue'),           meta: { public: true } },
  { path: '/forgot-password',         name: 'ForgotPassword', component: () => import('@/views/ForgotPasswordView.vue'),  meta: { public: true } },
  { path: '/reset-password/:token',   name: 'ResetPassword',  component: () => import('@/views/ResetPasswordView.vue'),   meta: { public: true } },

  // ── General ──────────────────────────────────────────────────────
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard',    name: 'Dashboard',    component: () => import('@/views/DashboardView.vue') },
  { path: '/clientes',     name: 'Clientes',     component: () => import('@/views/Clientes/ClientesListView.vue') },
  { path: '/clientes/:id', name: 'ClienteDetalle', component: () => import('@/views/Clientes/ClienteDetailView.vue') },
  { path: '/proyectos',    name: 'Proyectos',    component: () => import('@/views/Proyectos/ProyectosListView.vue') },
  { path: '/proyectos/:id',          name: 'ProyectoDetalle', component: () => import('@/views/Proyectos/ProyectoDetailView.vue') },
  { path: '/proyectos/:id/ppa',      name: 'ProyectoPPA',     component: () => import('@/views/Servicios/PPAView.vue') },
  { path: '/proyectos/:id/operacion',name: 'ProyectoOperacion',component: () => import('@/views/Servicios/OperacionView.vue') },
  { path: '/servicios',    name: 'Servicios',    component: () => import('@/views/Contratos/ContratosListView.vue') },
  { path: '/contratos/:id',name: 'ContratoDetalle', component: () => import('@/views/Contratos/ContratoDetailView.vue') },

  // ── Operaciones ──────────────────────────────────────────────────
  { path: '/informes',     name: 'Informes',     component: () => import('@/views/Operaciones/InformesListView.vue'),  meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/operaciones/informes-mensuales', name: 'InformesMensuales', component: () => import('@/views/Operaciones/InformesMensualesView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/informes/:id', name: 'InformeDetalle', component: () => import('@/views/Operaciones/InformeDetailView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/operaciones/gestion-fallas', name: 'GestionFallas', component: () => import('@/views/Operaciones/GestionFallasView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/operaciones/generacion', name: 'GeneracionOperaciones', component: () => import('@/views/Operaciones/GeneracionView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/fallas',       name: 'Fallas',       component: () => import('@/views/Fallas/MonitoreoView.vue'),   meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/fallas/lista', redirect: '/fallas' },
  { path: '/fallas/:id',   name: 'FallaDetalle', component: () => import('@/views/Fallas/FallaDetailView.vue'), meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/solar',        name: 'Solar',        component: () => import('@/views/Solar/SolarView.vue'),              meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/generacion-solar', name: 'GeneracionSolar', component: () => import('@/views/GeneracionSolarView.vue'),   meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },

  // ── Alertas ──────────────────────────────────────────────────────
  { path: '/alertas',             name: 'Alertas',            component: () => import('@/views/Alertas/AlertasView.vue'),           meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },
  { path: '/alertas/contratos-ppa', name: 'AlertasContratosPPA', component: () => import('@/views/Alertas/AlertasContratosPPAView.vue'), meta: { roles: ['admin', 'operaciones'] } },
  { path: '/alertas/monitoreo',   name: 'AlertasMonitoreo',   component: () => import('@/views/Alertas/AlertasMonitoreoView.vue'),  meta: { roles: ['admin', 'operaciones', 'monitoreo'] } },

  // ── Finanzas ─────────────────────────────────────────────────────
  { path: '/liquidaciones',               name: 'Liquidaciones',              component: () => import('@/views/Liquidaciones/LiquidacionesListView.vue'),           meta: { roles: ['admin', 'liquidaciones'] } },
  { path: '/liquidaciones/inversionista', name: 'LiquidacionesPorInversionista', component: () => import('@/views/Liquidaciones/LiquidacionesPorInversionistaView.vue'), meta: { roles: ['admin', 'liquidaciones'] } },
  { path: '/liquidaciones/minigranjas',   redirect: '/liquidaciones' },
  { path: '/liquidaciones/:id',           name: 'LiquidacionDetalle',         component: () => import('@/views/Liquidaciones/LiquidacionDetailView.vue'),           meta: { roles: ['admin', 'liquidaciones'] } },
  { path: '/garantias',                   name: 'Garantias',                  component: () => import('@/views/Garantias/GarantiasView.vue'),                       meta: { roles: ['admin', 'liquidaciones'] } },

  // ── MEM ──────────────────────────────────────────────────────────
  { path: '/mem/gescon',       name: 'MemGescon',       component: () => import('@/views/MEM/GesconView.vue'),        meta: { roles: ['admin', 'operaciones'] } },
  { path: '/mem/fronteras',    name: 'MemFronteras',    component: () => import('@/views/MEM/FronterasView.vue'),     meta: { roles: ['admin', 'operaciones'] } },
  { path: '/mem/precio-bolsa', name: 'MemPrecioBolsa',  component: () => import('@/views/MEM/PrecioBolsaView.vue') },
  { path: '/mem/balance',      name: 'MemBalance',      component: () => import('@/views/MEM/BalanceView.vue') },
  { path: '/mem/clima',        name: 'MemClima',        component: () => import('@/views/MEM/ClimaView.vue') },
  { path: '/mem/cumplimiento', name: 'MemCumplimiento', component: () => import('@/views/MEM/CumplimientoV2View.vue') },
  { path: '/mem/descubrimientos', name: 'MemDescubrimientos', component: () => import('@/views/MEM/DescubrimientosView.vue') },
  { path: '/mem/cumplimiento-v2', redirect: '/mem/cumplimiento' },

  // ── Admin ────────────────────────────────────────────────────────
  { path: '/admin/usuarios',    name: 'AdminUsuarios',   component: () => import('@/views/Admin/AdminUsuariosView.vue'),     meta: { roles: ['admin'], requireEmail: 'juanjose@unergy.io' } },
  { path: '/admin/diagnostico', name: 'AdminDiagnostico',component: () => import('@/views/Admin/DiagnosticoEnlacesView.vue'), meta: { roles: ['admin'], requireEmail: 'juanjose@unergy.io' } },

  // ── Fallback ─────────────────────────────────────────────────────
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // No autenticado → login
  if (!to.meta.public && !auth.isAuthenticated) return '/login'

  // Ya logueado intentando ir a /login → dashboard
  if (to.path === '/login' && auth.isAuthenticated) return '/dashboard'

  // Autenticado pero sin datos de usuario (localStorage.user borrado mientras
  // el JWT sigue vivo) → forzar re-login para reconstruir el estado
  if (to.meta.roles && auth.isAuthenticated && !auth.user) return '/login'

  // Verificación de rol
  if (to.meta.roles && !auth.can(...to.meta.roles)) return '/dashboard'

  // Verificación de email específico (rutas admin restringidas)
  if (to.meta.requireEmail && auth.user?.email !== to.meta.requireEmail) return '/dashboard'
})

export default router
