<template>
  <div class="tf-root">
    <!-- TOP BAR -->
    <header class="tf-topbar">
      <div class="tf-topbar-left">
        <span class="tf-role-badge">Técnico</span>
        <span class="tf-brand"><i class="pi pi-wrench" /> Mis Fallas</span>
      </div>
      <button class="tf-icon-btn tf-bell" @click="notifOpen = true" title="Notificaciones">
        <i class="pi pi-bell" />
        <span v-if="unreadCount > 0" class="tf-bell-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>
    </header>

    <!-- FILTROS -->
    <div class="tf-filters">
      <div class="tf-chips">
        <button :class="['tf-fchip', filtro === 'activas' && 'tf-fchip--on']" @click="filtro = 'activas'">
          <i class="pi pi-bolt" /> Activas
        </button>
        <button :class="['tf-fchip', filtro === 'programadas' && 'tf-fchip--on']" @click="filtro = 'programadas'">
          Programadas
        </button>
        <button :class="['tf-fchip', filtro === null && 'tf-fchip--on']" @click="filtro = null">Todas</button>
      </div>
    </div>

    <!-- CONTADOR -->
    <div class="tf-header-info" v-if="!loading">
      <span class="tf-count-label">{{ filtradas.length }} falla{{ filtradas.length !== 1 ? 's' : '' }} asignada{{ filtradas.length !== 1 ? 's' : '' }}</span>
    </div>

    <!-- LISTA -->
    <main class="tf-list">
      <div v-if="loading" class="tf-state"><i class="pi pi-spin pi-spinner" /> Cargando tus fallas…</div>
      <div v-else-if="!misFallas.length" class="tf-state">
        <i class="pi pi-check-circle" style="font-size:38px;color:#22c55e" />
        <span>No tienes fallas asignadas</span>
        <span style="font-size:13px;color:#9b8db5">El coordinador te asignará fallas cuando haya trabajo pendiente</span>
      </div>
      <div v-else-if="!filtradas.length" class="tf-state">
        <i class="pi pi-filter-slash" style="font-size:28px;color:#9b8db5" />
        <span>Sin fallas con este filtro</span>
        <button class="tf-filter-clear" @click="filtro = null">Ver todas</button>
      </div>
      <template v-else>
        <button v-for="f in filtradas" :key="f.id" class="tf-card" @click="openDetail(f)">
          <span class="tf-stripe" :style="{ background: f.prioridad?.color_hex || '#9ca3af' }" />
          <div class="tf-card-main">
            <div class="tf-card-top">
              <code class="tf-card-code">{{ f.codigo_interno }}</code>
              <span class="tf-card-estado" :style="estadoStyle(f.estado)">{{ f.estado?.etiqueta }}</span>
            </div>
            <div class="tf-card-tipo">{{ f.tipo?.etiqueta || f.tipo_libre || 'Falla' }}</div>
            <div class="tf-card-proj"><i class="pi pi-bolt" /> {{ f.proyecto?.nombre_comercial || '—' }}</div>
            <div class="tf-card-foot">
              <span class="tf-prio" :style="{ color: f.prioridad?.color_hex || '#6b5a8a' }">
                <i class="pi pi-flag-fill" style="font-size:10px" /> {{ f.prioridad?.etiqueta }}
              </span>
              <span class="tf-time">{{ relativeTime(f.fecha_identificacion) }}</span>
              <span v-if="f.fotos_urls?.length" class="tf-fotos-badge">
                <i class="pi pi-image" /> {{ f.fotos_urls.length }}
              </span>
              <i class="pi pi-chevron-right tf-chevron" />
            </div>
          </div>
        </button>
      </template>
    </main>

    <MobileTabBar />

    <TecnicoFallaDetailSheet
      :open="detailOpen"
      :falla="detailFalla"
      :catalogos="catalogos"
      @close="detailOpen = false"
      @updated="onUpdated"
    />
    <NotificationsSheet :open="notifOpen" @close="notifOpen = false" @changed="fetchUnread" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import MobileTabBar from '@/mobile/components/MobileTabBar.vue'
import TecnicoFallaDetailSheet from '@/mobile/components/TecnicoFallaDetailSheet.vue'
import NotificationsSheet from '@/mobile/components/NotificationsSheet.vue'

const auth = useAuthStore()
const fallas = ref([])
const catalogos = reactive({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const loading = ref(false)
const filtro = ref('activas')
const detailOpen = ref(false)
const detailFalla = ref(null)
const notifOpen = ref(false)
const unreadCount = ref(0)

const miId = computed(() => Number(auth.user?.id))

const misFallas = computed(() =>
  fallas.value.filter((f) => f.asignado_a && Number(f.asignado_a.id) === miId.value)
)

function esProgramado(f) {
  return (f.estado?.codigo || '').toLowerCase() === 'programado'
    || (f.estado?.etiqueta || '').toLowerCase().startsWith('program')
}

const filtradas = computed(() => {
  let list = misFallas.value
  if (filtro.value === 'activas') {
    list = list.filter((f) => !f.estado?.es_estado_final && !esProgramado(f))
  } else if (filtro.value === 'programadas') {
    list = list.filter((f) => esProgramado(f))
  }
  return [...list].sort((a, b) => {
    const af = a.estado?.es_estado_final ? 1 : 0
    const bf = b.estado?.es_estado_final ? 1 : 0
    if (af !== bf) return af - bf
    return (b.fecha_identificacion || '').localeCompare(a.fecha_identificacion || '')
  })
})

function estadoStyle(estado) {
  const c = estado?.color_hex || '#915BD8'
  return { background: c + '22', color: c }
}
function relativeTime(s) {
  if (!s) return ''
  const dias = Math.floor((Date.now() - new Date(s + 'T00:00:00').getTime()) / 86400000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} d`
  return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

async function cargar() {
  loading.value = true
  try {
    const [cat, fallasRes] = await Promise.all([
      api.get('/fallas/catalogos'),
      cargarFallas(),
    ])
    Object.assign(catalogos, cat.data)
  } finally {
    loading.value = false
  }
}

async function cargarFallas() {
  const primera = await api.get('/fallas', { params: { page: 1, size: 500 } })
  let items = primera.data.items ?? []
  const total = primera.data.total ?? items.length
  const pages = Math.ceil(total / 500)
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => api.get('/fallas', { params: { page: i + 2, size: 500 } })))
    for (const r of rest) items = items.concat(r.data.items ?? [])
  }
  fallas.value = items
}

function openDetail(f) { detailFalla.value = f; detailOpen.value = true }
function onUpdated(falla) {
  const idx = fallas.value.findIndex((x) => x.id === falla.id)
  if (idx >= 0) fallas.value[idx] = falla
  detailFalla.value = falla
}

async function fetchUnread() {
  try { const { data } = await api.get('/notificaciones/count'); unreadCount.value = data.no_leidas ?? data.count ?? 0 }
  catch { /* silencioso */ }
}

onMounted(() => { cargar(); fetchUnread() })
</script>

<style scoped>
.tf-root {
  display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden;
  background: #f3f4f6; color: #2C2039; font-family: system-ui, -apple-system, sans-serif;
}

.tf-topbar {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  background: #064e3b; color: #fff;
}
.tf-topbar-left { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.tf-role-badge {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px;
  color: #6ee7b7; background: rgba(110,231,183,.15); padding: 1px 7px; border-radius: 5px;
  align-self: flex-start;
}
.tf-brand { font-size: clamp(14px, 4vw, 16px); font-weight: 700; }
.tf-brand .pi { color: #fbbf24; margin-right: 5px; }
.tf-icon-btn {
  width: 38px; height: 38px; border-radius: 10px; border: none;
  background: rgba(255,255,255,0.12); color: #fff; font-size: 15px; position: relative;
}
.tf-bell-badge {
  position: absolute; top: 1px; right: 1px; min-width: 17px; height: 17px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  background: #dc2626; color: #fff; font-size: 10px; font-weight: 800; border-radius: 9px; border: 2px solid #064e3b;
}

.tf-filters { flex-shrink: 0; background: #fff; padding: 12px 14px 10px; border-bottom: 1px solid #eceaf2; }
.tf-chips { display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.tf-fchip {
  white-space: nowrap; padding: 9px 16px; border-radius: 20px; border: 1.5px solid #e5e7eb;
  background: #fff; font-size: 13.5px; font-weight: 600; color: #374151; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.tf-fchip--on { background: #064e3b; border-color: #064e3b; color: #fff; }

.tf-header-info {
  flex-shrink: 0; padding: 8px 14px; background: #fff; border-bottom: 1px solid #eceaf2;
}
.tf-count-label { font-size: 12px; color: #9b8db5; font-weight: 600; }

.tf-list { flex: 1; overflow-y: auto; padding: 12px 14px; -webkit-overflow-scrolling: touch; }
.tf-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 20px; color: #6b5a8a; font-size: 15px; text-align: center;
}
.tf-state .pi-spinner { font-size: 26px; color: #064e3b; }
.tf-filter-clear { padding: 9px 18px; border: none; border-radius: 10px; background: #f0fdf4; color: #16a34a; font-weight: 700; font-size: 14px; }

.tf-card {
  width: 100%; display: flex; text-align: left; margin-bottom: 11px;
  background: #fff; border: 1px solid #eceaf2; border-radius: 15px; overflow: hidden;
}
.tf-stripe { width: 5px; flex-shrink: 0; }
.tf-card-main { flex: 1; min-width: 0; padding: 13px 15px; }
.tf-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.tf-card-code { font-family: ui-monospace, monospace; font-size: 12px; color: #065f46; background: #ecfdf5; padding: 1px 7px; border-radius: 6px; }
.tf-card-estado { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 7px; }
.tf-card-tipo { font-size: 14px; font-weight: 700; color: #2C2039; line-height: 1.25; }
.tf-card-proj { font-size: 12.5px; color: #6b5a8a; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.tf-card-proj .pi { font-size: 11px; color: #059669; }
.tf-card-foot { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.tf-prio { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 3px; }
.tf-time { font-size: 12px; color: #9ca3af; }
.tf-fotos-badge {
  display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700;
  color: #2563eb; background: #eff6ff; padding: 2px 7px; border-radius: 8px;
}
.tf-chevron { margin-left: auto; color: #d1d5db; font-size: 12px; }
</style>
