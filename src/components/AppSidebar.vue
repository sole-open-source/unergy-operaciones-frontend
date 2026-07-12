<template>
  <!-- Mobile overlay -->
  <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="mobileOpen = false" />

  <aside :class="[
    'flex flex-col shrink-0 z-50 transition-transform duration-200 sb-aside',
    'fixed inset-y-0 left-0 w-[216px] lg:relative lg:translate-x-0',
    mobileOpen ? 'translate-x-0' : '-translate-x-full',
    collapsed ? 'lg:hidden' : ''
  ]">
    <!-- Marca -->
    <div class="sb-brand">
      <RouterLink to="/dashboard" class="sb-brand-link" @click="mobileOpen = false">
        <img src="/logos/Icono_purpura_energico.png" alt="Unergy" class="sb-brand-logo" />
        <span class="sb-brand-sub">Plataforma Operaciones</span>
      </RouterLink>
      <div class="flex items-center shrink-0">
        <!-- Ocultar barra (escritorio) -->
        <button class="hidden lg:flex sb-icon-btn" @click="toggleCollapsed" title="Ocultar barra lateral">
          <i class="pi pi-angle-double-left" />
        </button>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2.5 py-2 overflow-y-auto sb-nav">
      <template v-for="group in navGroups" :key="group.label || '__main__'">
        <button
          v-if="group.label"
          type="button"
          class="sb-group"
          :class="{ 'sb-group--collapsed': isGroupCollapsed(group.label) }"
          @click="toggleGroup(group.label)"
        >
          <span class="truncate">{{ group.label }}</span>
          <i class="pi pi-chevron-down sb-group-chev" />
        </button>

        <transition name="sb-collapse">
          <div v-show="!group.label || !isGroupCollapsed(group.label)">
            <template v-for="item in group.items" :key="item.to || item.label">
              <!-- Item con submenú expandible -->
              <template v-if="item.children">
                <button
                  type="button"
                  class="sb-item sb-item--parent"
                  @click="toggleItem(item.label)"
                >
                  <i :class="[item.icon, 'sb-item-ico']" />
                  <span class="truncate flex-1 text-left">{{ item.label }}</span>
                  <i class="pi pi-chevron-down sb-item-chev"
                    :class="{ 'sb-item-chev--open': isItemExpanded(item.label) }" />
                </button>
                <transition name="sb-collapse">
                  <div v-show="isItemExpanded(item.label)" class="sb-subitems">
                    <RouterLink
                      v-for="child in item.children"
                      :key="child.to"
                      :to="child.to"
                      class="sb-item sb-subitem"
                      active-class="sb-item--active"
                      @click="mobileOpen = false"
                    >
                      <span class="truncate">{{ child.label }}</span>
                    </RouterLink>
                  </div>
                </transition>
              </template>

              <!-- Item simple -->
              <RouterLink
                v-else
                :to="item.to"
                class="sb-item"
                active-class="sb-item--active"
                @click="mobileOpen = false"
              >
                <i :class="[item.icon, 'sb-item-ico']" />
                <span class="truncate">{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>
        </transition>
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
const { mobileOpen, collapsed, toggleCollapsed, isGroupCollapsed, toggleGroup } = useSidebar()

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
    label: 'General',
    items: [
      { to: '/dashboard',       label: 'Dashboard',        icon: 'pi pi-home' },
      { to: '/clientes',        label: 'Clientes',         icon: 'pi pi-building' },
      { to: '/proyectos',       label: 'Proyectos',        icon: 'pi pi-bolt' },
      { to: '/general/proximos-energizar', label: 'Próximos a energizar', icon: 'pi pi-clock' },
      { to: '/servicios',       label: 'Servicios',        icon: 'pi pi-file-edit' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/comercial', label: 'Pipeline', icon: 'pi pi-briefcase', roles: ['admin', 'comercial'] },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/solar-live', label: 'Generación Solar', icon: 'pi pi-sun', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/operaciones/informes-mensuales', label: 'Informes Mensuales', icon: 'pi pi-file-edit', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/operaciones/informes-mensuales/dashboard', label: 'Informes · Dashboard', icon: 'pi pi-chart-bar', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/fallas', label: 'Gestión de Fallas', icon: 'pi pi-wrench', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/alertas/monitoreo', label: 'Alarmas MGS', icon: 'pi pi-bell', roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/operaciones/costos-variables', label: 'Costos Variables', icon: 'pi pi-receipt', roles: ['admin', 'operaciones'] },
    ],
  },
  {
    label: 'Fronteras Comerciales',
    items: [
      { to: '/mem/fronteras',         label: 'General',            icon: 'pi pi-globe',      roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/mem/reporte-energia',   label: 'Reporte de Energía', icon: 'pi pi-file-edit',  roles: ['admin', 'operaciones', 'monitoreo'] },
      { to: '/mem/operadores-red',    label: 'Operadores de Red',  icon: 'pi pi-sitemap',    roles: ['admin', 'operaciones', 'monitoreo'] },
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
      {
        label: 'Liquidaciones', icon: 'pi pi-dollar', roles: ['admin', 'liquidaciones'],
        children: [
          { to: '/liquidaciones?tipo=minigranja', label: 'Minigranjas' },
          { to: '/liquidaciones?tipo=autoconsumo', label: 'Autoconsumo' },
        ],
      },
      { to: '/liquidaciones/inversionista', label: 'Por Inversionista', icon: 'pi pi-users', roles: ['admin', 'liquidaciones'] },
      { to: '/panel-contable', label: 'Panel Contable', icon: 'pi pi-calculator', roles: ['admin', 'liquidaciones'] },
      { to: '/finanzas/costos', label: 'Costos', icon: 'pi pi-credit-card', roles: ['admin', 'liquidaciones'] },
      { to: '/validador-mandatos', label: 'Validador de Mandatos', icon: 'pi pi-file-check', roles: ['admin', 'liquidaciones'] },
      { to: '/finanzas/descarga-xm', label: 'Descarga de XM', icon: 'pi pi-cloud-download', roles: ['admin', 'liquidaciones'] },
      { to: '/finanzas/liquidaciones-automatizadas', label: 'Liquidaciones Automatizadas', icon: 'pi pi-bolt', roles: ['admin', 'liquidaciones'] },
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

// Submenús expandibles dentro de un grupo (ej. Liquidaciones)
const expandedItems = ref(new Set(['Liquidaciones']))
function isItemExpanded(label) { return expandedItems.value.has(label) }
function toggleItem(label) {
  expandedItems.value.has(label)
    ? expandedItems.value.delete(label)
    : expandedItems.value.add(label)
  expandedItems.value = new Set(expandedItems.value)
}

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
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 14px 16px; border-bottom: 1px solid #F0ECF6; flex-shrink: 0;
}
.sb-brand-link {
  display: flex; flex-direction: column; gap: 3px; min-width: 0;
  text-decoration: none;
}
.sb-brand-logo {
  height: 30px; width: auto; object-fit: contain; align-self: flex-start;
  display: block;
}
.sb-brand-sub  { font-size: 10.5px; color: #9b8fb0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Nav — scrollbar morado oscuro */
.sb-nav { scrollbar-width: thin; scrollbar-color: #4C1D95 transparent; }
.sb-nav::-webkit-scrollbar { width: 8px; }
.sb-nav::-webkit-scrollbar-thumb { background: #4C1D95; border-radius: 4px; }
.sb-nav::-webkit-scrollbar-thumb:hover { background: #3B1278; }
.sb-nav::-webkit-scrollbar-track { background: transparent; }

/* Grupos plegables */
.sb-group {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  color: #A89EC0; padding: 14px 10px 4px; background: transparent; border: none;
  cursor: pointer; text-align: left; transition: color .12s;
}
.sb-group:hover { color: #6D28D9; }
.sb-group-chev {
  font-size: 10px; transition: transform .18s ease; color: inherit; flex-shrink: 0;
}
.sb-group--collapsed .sb-group-chev { transform: rotate(-90deg); }

/* Transición plegar/desplegar */
.sb-collapse-enter-active, .sb-collapse-leave-active { transition: opacity .15s ease; }
.sb-collapse-enter-from, .sb-collapse-leave-to { opacity: 0; }
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

/* Item padre con submenú */
.sb-item--parent { width: 100%; background: transparent; border: none; cursor: pointer; }
.sb-item-chev { font-size: 10px; color: #9990ad; flex-shrink: 0; transition: transform .18s ease; }
.sb-item-chev--open { transform: rotate(180deg); }
.sb-subitems { padding-left: 18px; }
.sb-subitem { font-size: 12.5px; font-weight: 600; padding: 6px 10px; }
.sb-subitem::before {
  content: ''; width: 4px; height: 4px; border-radius: 50%;
  background: #c4b8d4; margin-right: 9px; flex-shrink: 0;
}
.sb-subitem.sb-item--active::before { background: #6D28D9; }

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
