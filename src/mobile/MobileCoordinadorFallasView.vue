<template>
  <div class="cf-root">
    <!-- TOP BAR -->
    <header class="cf-topbar">
      <div class="cf-topbar-left">
        <span class="cf-role-badge">Coordinador</span>
        <span class="cf-brand"><i class="pi pi-wrench" /> Fallas</span>
      </div>
      <button class="cf-icon-btn cf-bell" @click="notifOpen = true" title="Notificaciones">
        <i class="pi pi-bell" />
        <span v-if="unreadCount > 0" class="cf-bell-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>
      <button class="cf-icon-btn cf-add" @click="createOpen = true" title="Registrar falla">
        <i class="pi pi-plus" />
      </button>
    </header>

    <!-- FILTROS -->
    <div class="cf-filters">
      <div class="cf-search">
        <i class="pi pi-search" />
        <input v-model="search" placeholder="Código, descripción, proyecto…" />
        <i v-if="search" class="pi pi-times cf-clear" @click="search = ''" />
      </div>
      <div class="cf-chips">
        <button :class="['cf-fchip', filtro === 'sin_asignar' && 'cf-fchip--on cf-fchip--warn']" @click="filtro = 'sin_asignar'">
          <i class="pi pi-user-plus" /> Sin asignar
        </button>
        <button :class="['cf-fchip', filtro === 'activas' && 'cf-fchip--on']" @click="filtro = 'activas'">Activas</button>
        <button :class="['cf-fchip', filtro === null && 'cf-fchip--on']" @click="filtro = null">Todas</button>
        <button v-for="e in catalogos.estados" :key="e.id"
          :class="['cf-fchip', filtro === e.id && 'cf-fchip--on']"
          :style="filtro === e.id ? chipStyle(e.color_hex) : {}"
          @click="filtro = e.id">{{ e.etiqueta }}</button>
      </div>
    </div>

    <!-- CONTADORES -->
    <div class="cf-stats">
      <div class="cf-stat">
        <span class="cf-stat-n">{{ sinAsignar }}</span>
        <span class="cf-stat-l">Sin asignar</span>
      </div>
      <div class="cf-stat">
        <span class="cf-stat-n">{{ activas }}</span>
        <span class="cf-stat-l">Activas</span>
      </div>
      <div class="cf-stat cf-stat--ok">
        <span class="cf-stat-n">{{ resueltas }}</span>
        <span class="cf-stat-l">Resueltas</span>
      </div>
    </div>

    <!-- LISTA -->
    <main class="cf-list">
      <div v-if="loading" class="cf-state"><i class="pi pi-spin pi-spinner" /> Cargando…</div>
      <div v-else-if="!filtradas.length" class="cf-state">
        <i class="pi pi-check-circle" style="font-size:32px;color:#22c55e" />
        <span>{{ fallas.length ? 'Sin resultados con estos filtros' : 'No hay fallas registradas' }}</span>
        <button class="cf-empty-add" @click="createOpen = true"><i class="pi pi-plus" /> Registrar falla</button>
      </div>
      <template v-else>
        <button v-for="f in filtradas" :key="f.id" class="cf-card" @click="openDetail(f)">
          <span class="cf-stripe" :style="{ background: f.prioridad?.color_hex || '#9ca3af' }" />
          <div class="cf-card-main">
            <div class="cf-card-top">
              <code class="cf-card-code">{{ f.codigo_interno }}</code>
              <span class="cf-card-estado" :style="estadoStyle(f.estado)">{{ f.estado?.etiqueta }}</span>
            </div>
            <div class="cf-card-tipo">{{ f.tipo?.etiqueta || f.tipo_libre || 'Falla' }}</div>
            <div class="cf-card-proj"><i class="pi pi-bolt" /> {{ f.proyecto?.nombre_comercial || '—' }}</div>
            <div class="cf-card-foot">
              <span class="cf-prio" :style="{ color: f.prioridad?.color_hex || '#6b5a8a' }">{{ f.prioridad?.etiqueta }}</span>
              <span class="cf-time">{{ relativeTime(f.fecha_identificacion) }}</span>
              <!-- Asignado / sin asignar -->
              <span v-if="f.asignado_a" class="cf-assignee cf-assignee--set" :title="f.asignado_a.nombre">
                {{ initials(f.asignado_a.nombre) }}
              </span>
              <span v-else class="cf-assignee cf-assignee--empty" title="Sin asignar">
                <i class="pi pi-user-plus" />
              </span>
            </div>
          </div>
        </button>
      </template>
    </main>

    <MobileTabBar />

    <FallaDetailSheet
      :open="detailOpen"
      :falla="detailFalla"
      :catalogos="catalogos"
      :usuarios="tecnicos"
      @close="detailOpen = false"
      @updated="onUpdated"
    />
    <FallaCreateSheet
      :open="createOpen"
      :catalogos="catalogos"
      :proyectos="proyectos"
      @close="createOpen = false"
      @created="onCreated"
    />
    <NotificationsSheet :open="notifOpen" @close="notifOpen = false" @changed="fetchUnread" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import MobileTabBar from '@/mobile/components/MobileTabBar.vue'
import FallaDetailSheet from '@/mobile/components/FallaDetailSheet.vue'
import FallaCreateSheet from '@/mobile/components/FallaCreateSheet.vue'
import NotificationsSheet from '@/mobile/components/NotificationsSheet.vue'

const auth = useAuthStore()
const fallas = ref([])
const catalogos = reactive({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos = ref([])
const tecnicos = ref([])   // solo usuarios con rol tecnico
const loading = ref(false)

const search = ref('')
const filtro = ref('activas')

const detailOpen = ref(false)
const detailFalla = ref(null)
const createOpen = ref(false)
const notifOpen = ref(false)
const unreadCount = ref(0)

const sinAsignar = computed(() => fallas.value.filter((f) => !f.asignado_a && !f.estado?.es_estado_final).length)
const activas    = computed(() => fallas.value.filter((f) => !f.estado?.es_estado_final).length)
const resueltas  = computed(() => fallas.value.filter((f) =>  f.estado?.es_estado_final).length)

const filtradas = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = fallas.value
  if (filtro.value === 'sin_asignar') {
    list = list.filter((f) => !f.asignado_a && !f.estado?.es_estado_final)
  } else if (filtro.value === 'activas') {
    list = list.filter((f) => !f.estado?.es_estado_final)
  } else if (typeof filtro.value === 'number') {
    list = list.filter((f) => f.estado?.id === filtro.value)
  }
  if (q) {
    list = list.filter((f) =>
      (f.codigo_interno || '').toLowerCase().includes(q)
      || (f.descripcion || '').toLowerCase().includes(q)
      || (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q))
  }
  return [...list].sort((a, b) => {
    const af = a.estado?.es_estado_final ? 1 : 0
    const bf = b.estado?.es_estado_final ? 1 : 0
    if (af !== bf) return af - bf
    const aa = a.asignado_a ? 1 : 0
    const ba = b.asignado_a ? 1 : 0
    if (aa !== ba) return aa - ba
    return (b.fecha_identificacion || '').localeCompare(a.fecha_identificacion || '')
  })
})

function chipStyle(color) {
  const c = color || '#915BD8'
  return { background: c, borderColor: c, color: '#fff' }
}
function estadoStyle(estado) {
  const c = estado?.color_hex || '#915BD8'
  return { background: c + '22', color: c }
}
function initials(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
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
    const [cat, proy, usr] = await Promise.all([
      api.get('/fallas/catalogos'),
      api.get('/proyectos', { params: { size: 500 } }),
      api.get('/usuarios', { params: { size: 200 } }).catch(() => ({ data: { items: [] } })),
    ])
    Object.assign(catalogos, cat.data)
    proyectos.value = proy.data.items ?? []
    const todos = usr.data.items ?? []
    tecnicos.value = todos.filter((u) => u.rol === 'tecnico')
    await cargarFallas()
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
}
function onCreated() { cargarFallas() }

async function fetchUnread() {
  try { const { data } = await api.get('/notificaciones/count'); unreadCount.value = data.no_leidas ?? data.count ?? 0 }
  catch { /* silencioso */ }
}

onMounted(() => { cargar(); fetchUnread() })
</script>

<style scoped>
.cf-root {
  display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden;
  background: #f3f4f6; color: #2C2039; font-family: system-ui, -apple-system, sans-serif;
}

/* Top bar */
.cf-topbar {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  background: #1e3a5f; color: #fff;
}
.cf-topbar-left { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.cf-role-badge {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px;
  color: #93c5fd; background: rgba(147,197,253,.15); padding: 1px 7px; border-radius: 5px;
  align-self: flex-start;
}
.cf-brand { font-size: clamp(14px, 4vw, 16px); font-weight: 700; }
.cf-brand .pi { color: #fbbf24; margin-right: 5px; }
.cf-icon-btn {
  width: 38px; height: 38px; border-radius: 10px; border: none;
  background: rgba(255,255,255,0.12); color: #fff; font-size: 15px; position: relative;
}
.cf-add { background: #2563eb; }
.cf-bell-badge {
  position: absolute; top: 1px; right: 1px; min-width: 17px; height: 17px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  background: #dc2626; color: #fff; font-size: 10px; font-weight: 800; border-radius: 9px; border: 2px solid #1e3a5f;
}

/* Filtros */
.cf-filters { flex-shrink: 0; background: #fff; padding: 12px 14px; border-bottom: 1px solid #eceaf2; }
.cf-search { display: flex; align-items: center; gap: 9px; background: #f1f5f9; border-radius: 12px; padding: 11px 14px; }
.cf-search .pi-search { color: #9ca3af; font-size: 15px; }
.cf-search input { flex: 1; border: none; background: none; outline: none; font-size: 16px; color: #2C2039; }
.cf-clear { color: #9ca3af; }
.cf-chips { display: flex; gap: 8px; margin-top: 11px; overflow-x: auto; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
.cf-fchip {
  white-space: nowrap; padding: 7px 14px; border-radius: 20px; border: 1.5px solid #e5e7eb;
  background: #fff; font-size: 13px; font-weight: 600; color: #374151; flex-shrink: 0;
  display: flex; align-items: center; gap: 5px;
}
.cf-fchip--on { background: #1e3a5f; border-color: #1e3a5f; color: #fff; }
.cf-fchip--warn { border-color: #f59e0b; color: #92400e; }
.cf-fchip--on.cf-fchip--warn { background: #f59e0b; border-color: #f59e0b; color: #fff; }

/* Stats */
.cf-stats {
  display: flex; flex-shrink: 0; background: #fff; border-bottom: 1px solid #eceaf2;
  padding: 10px 14px; gap: 0;
}
.cf-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px;
  border-right: 1px solid #eceaf2;
}
.cf-stat:last-child { border-right: none; }
.cf-stat-n { font-size: 22px; font-weight: 800; color: #1e3a5f; }
.cf-stat--ok .cf-stat-n { color: #16a34a; }
.cf-stat-l { font-size: 11px; color: #9b8db5; font-weight: 600; }

/* Lista */
.cf-list { flex: 1; overflow-y: auto; padding: 12px 14px; -webkit-overflow-scrolling: touch; }
.cf-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: #6b5a8a; font-size: 15px; text-align: center; }
.cf-state .pi-spinner { font-size: 26px; color: #2563eb; }
.cf-empty-add { margin-top: 6px; display: flex; align-items: center; gap: 8px; padding: 11px 20px; border: none; border-radius: 12px; background: #2563eb; color: #fff; font-weight: 700; font-size: 15px; }

.cf-card {
  width: 100%; display: flex; text-align: left; margin-bottom: 11px;
  background: #fff; border: 1px solid #eceaf2; border-radius: 15px; overflow: hidden;
}
.cf-stripe { width: 5px; flex-shrink: 0; }
.cf-card-main { flex: 1; min-width: 0; padding: 13px 15px; }
.cf-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.cf-card-code { font-family: ui-monospace, monospace; font-size: 12px; color: #1e40af; background: #eff6ff; padding: 1px 7px; border-radius: 6px; }
.cf-card-estado { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 7px; }
.cf-card-tipo { font-size: 14px; font-weight: 700; color: #2C2039; line-height: 1.25; }
.cf-card-proj { font-size: 12.5px; color: #6b5a8a; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.cf-card-proj .pi { font-size: 11px; color: #2563eb; }
.cf-card-foot { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.cf-prio { font-size: 12.5px; font-weight: 700; }
.cf-time { font-size: 12px; color: #9ca3af; }
.cf-assignee {
  margin-left: auto; width: 28px; height: 28px; border-radius: 50%;
  font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;
}
.cf-assignee--set { background: #1e3a5f; color: #fff; }
.cf-assignee--empty { background: #fef3c7; color: #92400e; border: 1.5px dashed #f59e0b; font-size: 13px; }
</style>
