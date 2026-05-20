<template>
  <header class="h-14 bg-white border-b flex items-center justify-between px-4 sm:px-6 shrink-0" style="border-color: #e8e0f0;">
    <div class="flex items-center gap-3">
      <button class="lg:hidden p-1 -ml-1" @click="toggle" style="color: #2C2039;">
        <i class="pi pi-bars text-lg" />
      </button>
      <h1 class="text-sm font-semibold" style="color: #2C2039;">{{ pageTitle }}</h1>
    </div>

    <div class="flex items-center gap-3">
      <!-- Notification Bell -->
      <div class="relative" ref="bellRef">
        <button @click="toggleNotifications" class="relative p-1.5 rounded-lg transition-colors hover:bg-gray-100">
          <i class="pi pi-bell text-lg" style="color: #6b5a8a;" />
          <span v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style="background-color: #D64455;">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>

        <!-- Notification Dropdown -->
        <div v-if="showNotifications"
          class="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden"
          style="border: 1px solid #e8e0f0;">
          <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: #e8e0f0;">
            <span class="text-sm font-semibold" style="color: #2C2039;">Notificaciones</span>
            <button v-if="unreadCount > 0" @click="markAllRead"
              class="text-xs font-medium transition-colors hover:underline" style="color: #915BD8;">
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
            class="block text-center py-2.5 text-xs font-medium border-t transition-colors hover:bg-gray-50"
            style="color: #915BD8; border-color: #e8e0f0;"
            @click="showNotifications = false">
            Ver todas las alertas
          </RouterLink>
        </div>
      </div>

      <!-- User info -->
      <div class="hidden sm:flex items-center gap-2">
        <div class="text-right">
          <p class="text-xs font-medium leading-tight" style="color: #2C2039;">{{ auth.user?.nombre || auth.user?.email }}</p>
          <p class="text-[10px] uppercase tracking-wide" style="color: #915BD8;">{{ auth.role }}</p>
        </div>
      </div>

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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import api from '@/api/client'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { toggle } = useSidebar()

const bellRef = ref(null)
const showNotifications = ref(false)
const unreadCount = ref(0)
const notifications = ref([])
let pollInterval = null

const titles = {
  Dashboard:       'Panel principal',
  Clientes:        'Clientes',
  ClienteDetalle:  'Detalle de cliente',
  Proyectos:       'Proyectos',
  ProyectoDetalle: 'Detalle de proyecto',
  GeneracionSolar: 'Generacion Solar',
  Fallas:          'Monitoreo de fallas',
  FallasLista:     'Gestión de fallas',
  FallaDetalle:    'Detalle de falla',
  Liquidaciones:   'Liquidaciones',
  LiquidacionDetalle: 'Detalle de liquidacion',
  LiquidacionesPorInversionista: 'Liquidaciones por inversionista',
  MemPrecioBolsa:  'Precio de bolsa',
  MemFronteras:    'Fronteras',
  MemBalance:      'Balance energetico',
  MemClima:        'Inteligencia Climatica',
  MemGescon:       'GESCON',
  MemCumplimiento: 'Cumplimiento',
  MemCumplimientoV2: 'Cumplimiento v2',
  Alertas:         'Alertas',
  AlertasContratosPPA: 'Alertas de contratos PPA',
  AlertasMonitoreo: 'Alarmas de monitoreo',
  Servicios:       'Contratos de servicio',
  Notificaciones:  'Notificaciones',
  ResetPassword:   'Restablecer contrasena',
}

const pageTitle = computed(() => titles[route.name] || route.name || 'Operaciones')

function handleLogout() {
  auth.logout()
  router.push('/login')
}

// Notification helpers
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
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} dias`
}

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    fetchNotifications()
  }
}

async function fetchUnreadCount() {
  try {
    const { data } = await api.get('/notificaciones/count')
    unreadCount.value = data.count ?? data.unread ?? 0
  } catch {
    // non-critical
  }
}

async function fetchNotifications() {
  try {
    const { data } = await api.get('/notificaciones', { params: { limit: 20 } })
    notifications.value = Array.isArray(data) ? data : (data.items ?? [])
  } catch {
    notifications.value = []
  }
}

async function markAsRead(n) {
  if (n.leida) return
  try {
    await api.patch(`/notificaciones/${n.id}/leer`)
    n.leida = true
    if (unreadCount.value > 0) unreadCount.value--
  } catch {
    // non-critical
  }
}

async function markAllRead() {
  try {
    await api.post('/notificaciones/leer-todas')
    notifications.value.forEach(n => { n.leida = true })
    unreadCount.value = 0
  } catch {
    // non-critical
  }
}

// Close dropdown on outside click
function handleClickOutside(e) {
  if (bellRef.value && !bellRef.value.contains(e.target)) {
    showNotifications.value = false
  }
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
</script>
