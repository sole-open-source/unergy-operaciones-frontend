<template>
  <!-- Mobile overlay -->
  <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="mobileOpen = false" />

  <aside :class="[
    'flex flex-col shrink-0 z-50 transition-transform duration-200 sb-aside',
    'fixed inset-y-0 left-0 w-[264px] lg:relative lg:translate-x-0',
    mobileOpen ? 'translate-x-0' : '-translate-x-full'
  ]">
    <!-- Marca -->
    <div class="sb-brand">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="sb-logo">U</div>
        <div class="min-w-0">
          <div class="sb-brand-name">Unergy</div>
          <div class="sb-brand-sub">Plataforma Operaciones</div>
        </div>
      </div>
      <button class="lg:hidden sb-icon-btn" @click="mobileOpen = false">
        <i class="pi pi-times" />
      </button>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2.5 py-2 overflow-y-auto sb-nav">
      <template v-for="group in navGroups" :key="group.label || '__main__'">
        <div v-if="group.label" class="sb-group">{{ group.label }}</div>

        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="sb-item"
          active-class="sb-item--active"
          @click="mobileOpen = false"
        >
          <i :class="[item.icon, 'sb-item-ico']" />
          <span class="truncate">{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <!-- User footer -->
    <div class="sb-footer">
      <div class="sb-user">
        <div class="sb-avatar">{{ initials }}</div>
        <div class="min-w-0 flex-1">
          <p class="sb-user-name">{{ auth.user?.nombre || auth.user?.email }}</p>
          <p class="sb-user-mail">{{ auth.user?.email }}</p>
        </div>
        <!-- Bell -->
        <div class="relative" ref="bellRef">
          <button @click="toggleNotifications" class="sb-icon-btn relative" title="Notificaciones">
            <i class="pi pi-bell" />
            <span v-if="unreadCount > 0" class="sb-badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>
          <!-- Notification dropdown -->
          <div v-if="showNotifications"
            class="absolute bottom-full mb-2 right-0 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden"
            style="border: 1px solid #e8e0f0;">
            <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: #e8e0f0;">
              <span class="text-sm font-semibold" style="color: #2C2039;">Notificaciones</span>
              <button v-if="unreadCount > 0" @click="markAllRead"
                class="text-xs font-medium hover:underline" style="color: #915BD8;">
                Marcar todas leídas
              </button>
            </div>
            <div class="max-h-80 overflow-y-auto">
              <div v-if="notifications.length === 0" class="py-8 text-center">
                <i class="pi pi-bell-slash text-2xl mb-2 block" style="color: #c4b8d4;" />
                <p class="text-xs" style="color: #6b5a8a;">Sin notificaciones</p>
              </div>
              <div v-for="n in notifications" :key="n.id"
                @click="markAsRead(n)"
                class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 border-b last:border-b-0"
                :style="{ borderColor: '#f3f0f7', backgroundColor: n.leida ? 'transparent' : 'rgba(145,91,216,0.04)' }">
                <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  :style="{ backgroundColor: severityBg(n.severidad), color: severityColor(n.severidad) }">
                  <i :class="severityIcon(n.severidad)" class="text-xs" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm leading-snug" :style="{ color: '#2C2039', fontWeight: n.leida ? '400' : '600' }">{{ n.titulo || n.mensaje }}</p>
                  <p v-if="n.titulo && n.mensaje" class="text-xs mt-0.5" style="color: #6b5a8a;">{{ n.mensaje }}</p>
                  <p class="text-[10px] mt-1" style="color: #9b89b5;">{{ formatTimeAgo(n.created_at) }}</p>
                </div>
                <div v-if="!n.leida" class="w-2 h-2 rounded-full shrink-0 mt-2" style="background-color: #915BD8;" />
              </div>
            </div>
            <RouterLink to="/alertas"
              class="block text-center py-2.5 text-xs font-medium border-t hover:bg-gray-50"
              style="color: #915BD8; border-color: #e8e0f0;"
              @click="showNotifications = false">
              Ver todas las alertas
            </RouterLink>
          </div>
        </div>
        <!-- Logout -->
        <button @click="handleLogout" class="sb-icon-btn" title="Cerrar sesión">
          <i class="pi pi-sign-out" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import api from '@/api/client'

const auth = useAuthStore()
const router = useRouter()
const { mobileOpen } = useSidebar()

const initials = computed(() => {
  const name = (auth.user?.nombre || auth.user?.email || '').trim()
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
})

// ── Notificaciones (movidas desde AppTopbar) ───────────────────────────
const bellRef = ref(null)
const showNotifications = ref(false)
const unreadCount = ref(0)
const notifications = ref([])
let pollInterval = null

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) fetchNotifications()
}

async function fetchUnreadCount() {
  try {
    const { data } = await api.get('/notificaciones/count')
    unreadCount.value = data.count ?? data.unread ?? 0
  } catch { /* no crítico */ }
}

async function fetchNotifications() {
  try {
    const { data } = await api.get('/notificaciones', { params: { limit: 20 } })
    notifications.value = Array.isArray(data) ? data : (data.items ?? [])
  } catch { notifications.value = [] }
}

async function markAsRead(n) {
  if (n.leida) return
  try {
    await api.patch(`/notificaciones/${n.id}/leer`)
    n.leida = true
    if (unreadCount.value > 0) unreadCount.value--
  } catch { /* no crítico */ }
}

async function markAllRead() {
  try {
    await api.post('/notificaciones/leer-todas')
    notifications.value.forEach(n => { n.leida = true })
    unreadCount.value = 0
  } catch { /* no crítico */ }
}

function severityBg(sev) {
  const map = { critica: 'rgba(214,68,85,0.12)', alta: 'rgba(234,88,12,0.12)', media: 'rgba(240,192,64,0.12)', baja: 'rgba(16,185,129,0.12)' }
  return map[sev] || 'rgba(145,91,216,0.08)'
}
function severityColor(sev) {
  const map = { critica: '#D64455', alta: '#EA580C', media: '#CA8A04', baja: '#10B981' }
  return map[sev] || '#915BD8'
}
function severityIcon(sev) {
  const map = { critica: 'pi pi-exclamation-triangle', alta: 'pi pi-exclamation-circle', media: 'pi pi-info-circle', baja: 'pi pi-check-circle' }
  return map[sev] || 'pi pi-bell'
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diffMs = Date.now() - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function handleClickOutside(e) {
  if (bellRef.value && !bellRef.value.contains(e.target)) showNotifications.value = false
}

// ── Logout ──────────────────────────────────────────────────────────────
function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, 60000)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', handleClickOutside)
})

const ALL_GROUPS = [
  {
    items: [
      { to: '/dashboard',       label: 'Dashboard',        icon: 'pi pi-home' },
      { to: '/clientes',        label: 'Clientes',         icon: 'pi pi-building' },
      { to: '/proyectos',       label: 'Proyectos',        icon: 'pi pi-bolt' },
      { to: '/servicios',       label: 'Servicios',        icon: 'pi pi-file-edit' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/generacion-solar', label: 'Generación Solar', icon: 'pi pi-sun', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/operaciones/informes-mensuales', label: 'Informes Mensuales', icon: 'pi pi-file-edit', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/operaciones/gestion-fallas', label: 'Gestión de Fallas', icon: 'pi pi-wrench', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/operaciones/generacion', label: 'Generación', icon: 'pi pi-chart-line', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/fallas', label: 'Monitoreo Fallas', icon: 'pi pi-exclamation-triangle', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/alertas/monitoreo', label: 'Alarmas MGS', icon: 'pi pi-bell', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/mem/fronteras',   label: 'Fronteras',        icon: 'pi pi-globe', roles: ['admin', 'operaciones', 'monitoreo'] },
    ],
  },
  {
    label: 'Comercialización',
    items: [
      { to: '/mem/cumplimiento',    label: 'Cumplimiento PPA', icon: 'pi pi-shield' },
      { to: '/mem/descubrimientos', label: 'Descubrimientos',  icon: 'pi pi-bolt' },
      { to: '/garantias',           label: 'Garantías',        icon: 'pi pi-wallet' },
      { to: '/mem/gescon',          label: 'GESCON / ASIC',    icon: 'pi pi-book' },
      { to: '/mem/precio-bolsa',    label: 'Precio de Bolsa',  icon: 'pi pi-chart-line' },
      { to: '/mem/balance',         label: 'Balance Energía',  icon: 'pi pi-chart-bar' },
      { to: '/mem/clima',           label: 'Clima & ENSO',     icon: 'pi pi-cloud' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/liquidaciones', label: 'Liquidaciones', icon: 'pi pi-dollar', roles: ['admin', 'liquidaciones'] },
      { to: '/liquidaciones/inversionista', label: 'Por Inversionista', icon: 'pi pi-users', roles: ['admin', 'liquidaciones'] },
      { to: '/finanzas/costos', label: 'Costos', icon: 'pi pi-credit-card', roles: ['admin', 'liquidaciones'] },
    ],
  },
  {
    label: 'Alertas',
    items: [
      { to: '/alertas', label: 'Centro de Alertas', icon: 'pi pi-exclamation-circle' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios', icon: 'pi pi-users', requireEmail: 'juanjose@unergy.io' },
      { to: '/admin/diagnostico', label: 'Diagnóstico', icon: 'pi pi-link', requireEmail: 'juanjose@unergy.io' },
    ],
  },
]

const navGroups = computed(() =>
  ALL_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i =>
      (!i.roles || auth.can(...i.roles)) &&
      (!i.requireEmail || auth.user?.email === i.requireEmail)
    ),
  })).filter(g => g.items.length > 0)
)
</script>

<style scoped>
.sb-aside {
  background: #fff;
  border-right: 1px solid #ECE7F2;
  font-family: 'Sora', system-ui, sans-serif;
}

/* Marca */
.sb-brand {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #F0ECF6; flex-shrink: 0;
}
.sb-logo {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #915BD8, #6D28D9);
  color: #fff; font-weight: 800; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
}
.sb-brand-name { font-size: 15px; font-weight: 800; color: #2C2039; line-height: 1.1; }
.sb-brand-sub  { font-size: 10.5px; color: #9b8fb0; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Nav */
.sb-nav::-webkit-scrollbar { width: 6px; }
.sb-nav::-webkit-scrollbar-thumb { background: #E5DEF0; border-radius: 3px; }
.sb-nav::-webkit-scrollbar-track { background: transparent; }
.sb-group {
  font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  color: #A89EC0; padding: 14px 12px 4px;
}
.sb-item {
  display: flex; align-items: center; gap: 11px; padding: 8px 10px; margin-bottom: 1px;
  border-radius: 9px; font-size: 13.5px; font-weight: 600; color: #5b5470;
  transition: background .12s, color .12s; cursor: pointer;
}
.sb-item:hover { background: #F5F2FB; color: #2C2039; }
.sb-item-ico { font-size: 15px; width: 18px; text-align: center; color: #9990ad; flex-shrink: 0; transition: color .12s; }
.sb-item:hover .sb-item-ico { color: #6D28D9; }
.sb-item--active { background: #F1EAF9 !important; color: #2C2039 !important; font-weight: 700; }
.sb-item--active .sb-item-ico { color: #6D28D9; }

/* Footer usuario */
.sb-footer { border-top: 1px solid #F0ECF6; padding: 10px 12px; flex-shrink: 0; }
.sb-user { display: flex; align-items: center; gap: 9px; }
.sb-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #915BD8, #6D28D9); color: #fff;
  font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center;
}
.sb-user-name { font-size: 12.5px; font-weight: 700; color: #2C2039; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-user-mail { font-size: 10.5px; color: #9b8fb0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-icon-btn {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #8a7fa3; background: transparent; border: none; cursor: pointer;
  transition: background .12s, color .12s;
}
.sb-icon-btn:hover { background: #F1ECF8; color: #6D28D9; }
.sb-icon-btn .pi { font-size: 14px; }
.sb-badge {
  position: absolute; top: -2px; right: -2px; min-width: 15px; height: 15px;
  display: flex; align-items: center; justify-content: center; padding: 0 3px;
  border-radius: 999px; background: #DC2626; color: #fff; font-size: 9px; font-weight: 800;
}
</style>
