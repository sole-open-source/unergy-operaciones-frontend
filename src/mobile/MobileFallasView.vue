<template>
  <div class="mf-root">
    <!-- TOP BAR -->
    <header class="mf-topbar">
      <span class="mf-brand"><i class="pi pi-wrench" /> Fallas</span>
      <button class="mf-icon-btn mf-bell" @click="notifOpen = true" title="Notificaciones">
        <i class="pi pi-bell" />
        <span v-if="unreadCount > 0" class="mf-bell-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>
      <button class="mf-icon-btn mf-add" @click="createOpen = true" title="Registrar falla"><i class="pi pi-plus" /></button>
    </header>

    <!-- FILTROS -->
    <div class="mf-filters">
      <div class="mf-search">
        <i class="pi pi-search" />
        <input v-model="search" placeholder="Buscar código, descripción, proyecto…" />
        <i v-if="search" class="pi pi-times mf-clear" @click="search = ''" />
      </div>
      <div class="mf-chips">
        <button :class="['mf-fchip', filtroEstado === null && 'mf-fchip--on']" @click="filtroEstado = null">Todas</button>
        <button v-for="e in catalogos.estados" :key="e.id"
          :class="['mf-fchip', filtroEstado === e.id && 'mf-fchip--on']"
          :style="filtroEstado === e.id ? { background: e.color_hex || '#915BD8', borderColor: e.color_hex || '#915BD8', color: '#fff' } : {}"
          @click="filtroEstado = e.id">{{ e.etiqueta }}</button>
      </div>
    </div>

    <!-- LISTA -->
    <main class="mf-list">
      <div v-if="loading" class="mf-state"><i class="pi pi-spin pi-spinner" /> Cargando fallas…</div>
      <div v-else-if="!filtradas.length" class="mf-state">
        <i class="pi pi-check-circle" style="font-size:34px;color:#22c55e" />
        <span>{{ fallas.length ? 'Sin resultados con estos filtros' : 'No hay fallas registradas' }}</span>
        <button class="mf-empty-add" @click="createOpen = true"><i class="pi pi-plus" /> Registrar falla</button>
      </div>
      <template v-else>
        <button v-for="f in filtradas" :key="f.id" class="mf-card" @click="openDetail(f)">
          <span class="mf-stripe" :style="{ background: f.prioridad?.color_hex || '#9ca3af' }" />
          <div class="mf-card-main">
            <div class="mf-card-top">
              <code class="mf-card-code">{{ f.codigo_interno }}</code>
              <span class="mf-card-estado" :style="{ background: (f.estado?.color_hex || '#915BD8') + '22', color: f.estado?.color_hex || '#915BD8' }">{{ f.estado?.etiqueta }}</span>
            </div>
            <div class="mf-card-tipo">{{ f.tipo?.etiqueta || f.tipo_libre || 'Falla' }}</div>
            <div class="mf-card-proj"><i class="pi pi-bolt" /> {{ f.proyecto?.nombre_comercial || '—' }}</div>
            <div class="mf-card-foot">
              <span class="mf-prio" :style="{ color: f.prioridad?.color_hex || '#6b5a8a' }">{{ f.prioridad?.etiqueta }}</span>
              <span class="mf-time">{{ relativeTime(f.fecha_identificacion) }}</span>
              <span v-if="f.asignado_a" class="mf-assignee" :title="f.asignado_a.nombre">{{ initials(f.asignado_a.nombre) }}</span>
            </div>
          </div>
        </button>
      </template>
    </main>

    <MobileTabBar />

    <FallaDetailSheet :open="detailOpen" :falla="detailFalla" :catalogos="catalogos" :usuarios="usuarios"
      @close="detailOpen = false" @updated="onUpdated" />
    <FallaCreateSheet :open="createOpen" :catalogos="catalogos" :proyectos="proyectos"
      @close="createOpen = false" @created="onCreated" />
    <NotificationsSheet :open="notifOpen" @close="notifOpen = false" @changed="fetchUnread" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/client'
import MobileTabBar from '@/mobile/components/MobileTabBar.vue'
import FallaDetailSheet from '@/mobile/components/FallaDetailSheet.vue'
import FallaCreateSheet from '@/mobile/components/FallaCreateSheet.vue'
import NotificationsSheet from '@/mobile/components/NotificationsSheet.vue'

const fallas = ref([])
const catalogos = reactive({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos = ref([])
const usuarios = ref([])
const loading = ref(false)

const search = ref('')
const filtroEstado = ref(null)

const detailOpen = ref(false)
const detailFalla = ref(null)
const createOpen = ref(false)
const notifOpen = ref(false)
const unreadCount = ref(0)

const filtradas = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = fallas.value
  if (filtroEstado.value !== null) list = list.filter((f) => f.estado?.id === filtroEstado.value)
  if (q) {
    list = list.filter((f) =>
      (f.codigo_interno || '').toLowerCase().includes(q)
      || (f.descripcion || '').toLowerCase().includes(q)
      || (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q)
      || (f.tipo?.etiqueta || '').toLowerCase().includes(q))
  }
  // abiertas primero, luego por fecha desc
  return [...list].sort((a, b) => {
    const af = a.estado?.es_estado_final ? 1 : 0
    const bf = b.estado?.es_estado_final ? 1 : 0
    if (af !== bf) return af - bf
    return (b.fecha_identificacion || '').localeCompare(a.fecha_identificacion || '')
  })
})

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
    usuarios.value = usr.data.items ?? []
    await cargarFallas()
  } catch (e) {
    window.__primeToast?.({ severity: 'error', summary: 'Error al cargar', detail: e.response?.data?.detail, life: 3000 })
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
  try { const { data } = await api.get('/notificaciones/count'); unreadCount.value = data.count ?? data.unread ?? 0 }
  catch { /* silencioso */ }
}

onMounted(() => { cargar(); fetchUnread() })
</script>

<style scoped>
.mf-root {
  display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden;
  background: #f3f4f6; color: #2C2039; font-family: system-ui, -apple-system, sans-serif;
}

/* Top bar */
.mf-topbar {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  background: #2C2039; color: #fff;
}
.mf-brand { flex: 1; font-size: clamp(16px, 4.6vw, 20px); font-weight: 700; }
.mf-brand .pi { color: #F6FF72; margin-right: 6px; }
.mf-icon-btn { width: 40px; height: 40px; border-radius: 11px; border: none; background: rgba(255,255,255,0.1); color: #fff; font-size: 17px; position: relative; }
.mf-add { background: #915BD8; }
.mf-bell-badge {
  position: absolute; top: 1px; right: 1px; min-width: 17px; height: 17px; padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  background: #dc2626; color: #fff; font-size: 10px; font-weight: 800; border-radius: 9px; border: 2px solid #2C2039;
}

/* Filtros */
.mf-filters { flex-shrink: 0; background: #fff; padding: 12px 14px; border-bottom: 1px solid #eceaf2; }
.mf-search { display: flex; align-items: center; gap: 9px; background: #f5f3fa; border-radius: 12px; padding: 11px 14px; }
.mf-search .pi-search { color: #9ca3af; font-size: 15px; }
.mf-search input { flex: 1; border: none; background: none; outline: none; font-size: 16px; color: #2C2039; }
.mf-clear { color: #9ca3af; }
.mf-chips { display: flex; gap: 8px; margin-top: 11px; overflow-x: auto; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
.mf-fchip { white-space: nowrap; padding: 7px 14px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 13.5px; font-weight: 600; color: #6b5a8a; flex-shrink: 0; }
.mf-fchip--on { background: #2C2039; border-color: #2C2039; color: #fff; }

/* Lista */
.mf-list { flex: 1; overflow-y: auto; padding: 12px 14px; -webkit-overflow-scrolling: touch; }
.mf-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: #6b5a8a; font-size: 15px; text-align: center; }
.mf-state .pi-spinner { font-size: 26px; color: #915BD8; }
.mf-empty-add { margin-top: 6px; display: flex; align-items: center; gap: 8px; padding: 11px 20px; border: none; border-radius: 12px; background: #915BD8; color: #fff; font-weight: 700; font-size: 15px; }

.mf-card {
  width: 100%; display: flex; gap: 0; text-align: left; margin-bottom: 11px;
  background: #fff; border: 1px solid #eceaf2; border-radius: 15px; overflow: hidden;
}
.mf-stripe { width: 5px; flex-shrink: 0; }
.mf-card-main { flex: 1; min-width: 0; padding: 13px 15px; }
.mf-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.mf-card-code { font-family: ui-monospace, monospace; font-size: 12px; color: #6E3FB8; background: #f3edfb; padding: 1px 7px; border-radius: 6px; }
.mf-card-estado { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 7px; }
.mf-card-tipo { font-size: 15.5px; font-weight: 700; color: #2C2039; line-height: 1.25; }
.mf-card-proj { font-size: 13px; color: #6b5a8a; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.mf-card-proj .pi { font-size: 11px; color: #915BD8; }
.mf-card-foot { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.mf-prio { font-size: 12.5px; font-weight: 700; }
.mf-time { font-size: 12px; color: #9ca3af; }
.mf-assignee { margin-left: auto; width: 26px; height: 26px; border-radius: 50%; background: #915BD8; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
</style>
