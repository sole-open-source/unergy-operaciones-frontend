<template>
  <div class="ms-root">
    <!-- ══ TOP BAR ══ -->
    <header class="ms-topbar">
      <button class="ms-icon-btn" @click="menuOpen = !menuOpen" title="Menú"><i class="pi pi-bars" /></button>
      <span class="ms-brand"><i class="pi pi-sun" /> Unergy Solar</span>
      <button class="ms-icon-btn" :disabled="loadingDetail" @click="refrescar" title="Actualizar">
        <i :class="loadingDetail ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
      </button>

      <!-- menú desplegable -->
      <div v-if="menuOpen" class="ms-menu" @click.self="menuOpen = false">
        <div class="ms-menu-card">
          <div class="ms-menu-user">
            <i class="pi pi-user" />
            <div>
              <div class="ms-menu-name">{{ auth.user?.nombre || 'Usuario' }}</div>
              <div class="ms-menu-email">{{ auth.user?.email }}</div>
            </div>
          </div>
          <button class="ms-menu-item" @click="cerrarSesion"><i class="pi pi-sign-out" /> Cerrar sesión</button>
        </div>
      </div>
    </header>

    <!-- ══ SELECTOR DE PROYECTO ══ -->
    <div v-if="proyectos.length" class="ms-selector">
      <button class="ms-nav" :disabled="idx === 0" @click="goPrev"><i class="pi pi-chevron-left" /></button>
      <button class="ms-current" @click="pickerOpen = !pickerOpen">
        <span class="ms-dot" :style="{ background: statusColor(current?.status) }" />
        <span class="ms-name">{{ current?.nombre || '—' }}</span>
        <i class="pi pi-chevron-down ms-caret" />
        <span class="ms-count">{{ idx + 1 }} / {{ proyectos.length }}</span>
      </button>
      <button class="ms-nav" :disabled="idx === proyectos.length - 1" @click="goNext"><i class="pi pi-chevron-right" /></button>

      <!-- lista de proyectos -->
      <div v-if="pickerOpen" class="ms-picker" @click.self="pickerOpen = false">
        <div class="ms-picker-card">
          <div class="ms-picker-head">Proyectos</div>
          <button v-for="(p, i) in proyectos" :key="p.proyecto_id"
            :class="['ms-picker-item', i === idx && 'ms-picker-item--active']"
            @click="selectIdx(i)">
            <span class="ms-dot" :style="{ background: statusColor(p.status) }" />
            <span class="ms-picker-name">{{ p.nombre }}</span>
            <i v-if="rcnMap[p.proyecto_id]" class="pi pi-bolt ms-picker-relay" title="Tiene reconectador" />
          </button>
        </div>
      </div>
    </div>

    <!-- ══ CUERPO ══ -->
    <main class="ms-body"
      @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">

      <!-- Carga inicial -->
      <div v-if="loadingList && !proyectos.length" class="ms-state">
        <i class="pi pi-spin pi-spinner" /> <span>Cargando proyectos…</span>
      </div>

      <!-- Sin proyectos -->
      <div v-else-if="!proyectos.length" class="ms-state">
        <i class="pi pi-sun" style="font-size:34px;color:#cbd5e1" />
        <span>Sin proyectos disponibles</span>
        <button class="ms-retry" @click="cargarLista">Reintentar</button>
      </div>

      <template v-else>
        <!-- Chips "ahora" -->
        <div class="ms-now">
          <div class="ms-now-chip">
            <span class="ms-now-dot" style="background:#915BD8" />
            <span class="ms-now-label">Inversores</span>
            <span class="ms-now-val">{{ fmtKw(latestInv) }}</span>
          </div>
          <div class="ms-now-chip">
            <span class="ms-now-dot" style="background:#14B8A6" />
            <span class="ms-now-label">Medidor</span>
            <span class="ms-now-val">{{ fmtKw(latestMed) }}</span>
          </div>
        </div>

        <!-- Gráfica combinada -->
        <div class="ms-chart">
          <div v-if="loadingDetail && !currentDetail" class="ms-chart-loading">
            <i class="pi pi-spin pi-spinner" /> <span>Cargando datos…</span>
          </div>
          <ProjectLiveChart v-else :detail="currentDetail" />
        </div>

        <!-- Pie: actualizado + reconectar -->
        <div class="ms-footer">
          <span class="ms-updated"><i class="pi pi-clock" /> {{ lastUpdated || '—' }}</span>
          <button v-if="hasRelay" class="ms-reconnect" @click="openSheet">
            <span :class="['ms-relay-badge', relayBadgeClass]">{{ relayBadgeText }}</span>
            <i class="pi pi-power-off" /> Reconectar
          </button>
        </div>

        <!-- hint deslizar -->
        <div class="ms-swipe-hint">‹ desliza para cambiar de proyecto ›</div>
      </template>
    </main>

    <!-- Hoja de reconexión -->
    <ReconnectSheet
      :open="sheetOpen"
      :proyecto-id="current?.proyecto_id"
      :nombre="current?.nombre || ''"
      :active="currentRelay?.active ?? null"
      @close="sheetOpen = false"
      @done="onReconnectDone"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/client'
import { usePwa } from '@/mobile/usePwa'
import { inverterSeries, meterSeries, latest, fmtKw } from '@/mobile/solarSeries'
import ProjectLiveChart from '@/mobile/components/ProjectLiveChart.vue'
import ReconnectSheet from '@/mobile/components/ReconnectSheet.vue'

const router = useRouter()
const auth = useAuthStore()
const { register } = usePwa()

const STATUS_COLORS = {
  online: '#16a34a', degradado: '#d97706', caido: '#dc2626',
  sin_comunicacion: '#9ca3af', offline: '#d1d5db',
}
function statusColor(s) { return STATUS_COLORS[s] || '#9ca3af' }

// ── Estado ──────────────────────────────────────────────────────────────────
const proyectos    = ref([])
const idx          = ref(0)
const detailMap    = reactive({})         // proyecto_id → detalle
const rcnMap        = reactive({})        // proyecto_id → { active }
const loadingList  = ref(false)
const loadingDetail = ref(false)
const lastUpdated  = ref('')
const menuOpen     = ref(false)
const pickerOpen   = ref(false)
const sheetOpen    = ref(false)
let refreshTimer   = null

const current        = computed(() => proyectos.value[idx.value] || null)
const currentDetail  = computed(() => (current.value ? detailMap[current.value.proyecto_id] : null) || null)
const currentRelay   = computed(() => (current.value ? rcnMap[current.value.proyecto_id] : null) || null)
const hasRelay       = computed(() => !!current.value && !!rcnMap[current.value.proyecto_id])

const latestInv = computed(() => latest(inverterSeries(currentDetail.value)))
const latestMed = computed(() => latest(meterSeries(currentDetail.value)))

const relayBadgeText  = computed(() => currentRelay.value?.active === true ? 'ON'
  : currentRelay.value?.active === false ? 'OFF' : '—')
const relayBadgeClass = computed(() => currentRelay.value?.active === true ? 'ms-relay-badge--on'
  : currentRelay.value?.active === false ? 'ms-relay-badge--off' : 'ms-relay-badge--unk')

// ── Carga ───────────────────────────────────────────────────────────────────
async function cargarLista() {
  loadingList.value = true
  try {
    const res = await api.get('/generacion-solar/monitoring')
    proyectos.value = res.data.projects ?? []
    if (idx.value >= proyectos.value.length) idx.value = 0
  } catch { /* el estado vacío maneja el error */ } finally {
    loadingList.value = false
  }
  cargarEstados()
  if (current.value) loadDetail(current.value.proyecto_id, true)
}

async function cargarEstados() {
  try {
    const { data } = await api.get('/reconectadores/estados')
    for (const r of data) rcnMap[r.proyecto_id] = { active: r.active }
  } catch { /* silencioso — si falla, simplemente no se muestra el botón */ }
}

async function loadDetail(id, force = false) {
  if (!id) return
  if (detailMap[id] && !force) return
  loadingDetail.value = true
  try {
    const res = await api.get(`/generacion-solar/monitoring/${id}`)
    detailMap[id] = res.data
    lastUpdated.value = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch { if (!detailMap[id]) detailMap[id] = {} } finally {
    loadingDetail.value = false
  }
}

function refrescar() {
  if (current.value) loadDetail(current.value.proyecto_id, true)
  cargarEstados()
}

// ── Navegación entre proyectos ────────────────────────────────────────────────
function selectIdx(i) {
  idx.value = i
  pickerOpen.value = false
}
function goPrev() { if (idx.value > 0) idx.value-- }
function goNext() { if (idx.value < proyectos.value.length - 1) idx.value++ }

// carga perezosa al cambiar de proyecto (+ prefetch del vecino siguiente)
watch(idx, () => {
  if (current.value) loadDetail(current.value.proyecto_id)
  const next = proyectos.value[idx.value + 1]
  if (next) loadDetail(next.proyecto_id)
})

// ── Swipe ──────────────────────────────────────────────────────────────────
let touchX = 0, touchY = 0
function onTouchStart(e) { touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY }
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchX
  const dy = e.changedTouches[0].clientY - touchY
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) goNext(); else goPrev()
  }
}

// ── Reconexión ───────────────────────────────────────────────────────────────
function openSheet() { sheetOpen.value = true }
function onReconnectDone({ active }) {
  if (current.value) {
    rcnMap[current.value.proyecto_id] = { active }
    window.__primeToast?.({ severity: 'success', summary: 'Comando enviado',
      detail: `${current.value.nombre}: ${active ? 'ON' : 'OFF'}`, life: 3500 })
    // refrescar estado real tras unos segundos
    cargarEstados()
  }
}

// ── Sesión ─────────────────────────────────────────────────────────────────
function cerrarSesion() {
  auth.logout()
  router.replace('/m/login')
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────
onMounted(() => {
  register()
  cargarLista()
  refreshTimer = setInterval(refrescar, 60000)
})
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<style scoped>
.ms-root {
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh; overflow: hidden;
  background: #f3f4f6; color: #2C2039;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Top bar */
.ms-topbar {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  background: #2C2039; color: #fff; position: relative;
}
.ms-brand { flex: 1; text-align: center; font-size: 15px; font-weight: 700; letter-spacing: .3px; }
.ms-brand .pi { color: #F6FF72; margin-right: 5px; }
.ms-icon-btn {
  width: 38px; height: 38px; border-radius: 10px; border: none;
  background: rgba(255,255,255,0.1); color: #fff; font-size: 16px; flex-shrink: 0;
}
.ms-icon-btn:disabled { opacity: .5; }

.ms-menu { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.2); }
.ms-menu-card {
  position: absolute; top: calc(54px + env(safe-area-inset-top)); left: 12px;
  background: #fff; border-radius: 14px; padding: 8px; min-width: 220px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.25);
}
.ms-menu-user { display: flex; align-items: center; gap: 10px; padding: 10px 10px 12px; border-bottom: 1px solid #f0ebf7; }
.ms-menu-user .pi { font-size: 20px; color: #915BD8; }
.ms-menu-name { font-size: 14px; font-weight: 700; color: #2C2039; }
.ms-menu-email { font-size: 12px; color: #9ca3af; }
.ms-menu-item {
  display: flex; align-items: center; gap: 9px; width: 100%; margin-top: 6px;
  padding: 11px 10px; border: none; background: none; border-radius: 9px;
  font-size: 14px; color: #b91c1c; font-weight: 600; text-align: left;
}
.ms-menu-item:hover { background: #fef2f2; }

/* Selector */
.ms-selector {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  padding: 12px 14px; background: #fff; border-bottom: 1px solid #eceaf2; position: relative;
}
.ms-nav {
  width: 38px; height: 44px; border-radius: 11px; border: 1px solid #eceaf2;
  background: #faf8fd; color: #915BD8; font-size: 15px; flex-shrink: 0;
}
.ms-nav:disabled { opacity: .35; }
.ms-current {
  flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0;
  padding: 8px 12px; border: 1px solid #eceaf2; border-radius: 11px; background: #fff;
}
.ms-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.ms-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 700; text-align: left;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-caret { font-size: 11px; color: #9ca3af; }
.ms-count { font-size: 11px; color: #9ca3af; font-weight: 600; flex-shrink: 0; }

.ms-picker { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.25); }
.ms-picker-card {
  position: absolute; top: 0; left: 0; right: 0; max-height: 75vh; overflow-y: auto;
  background: #fff; border-radius: 0 0 18px 18px; padding: 8px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.25);
}
.ms-picker-head { font-size: 12px; font-weight: 700; color: #9ca3af; padding: 12px 12px 8px; text-transform: uppercase; letter-spacing: .5px; }
.ms-picker-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 13px 12px; border: none; background: none; border-radius: 10px;
  font-size: 14.5px; color: #2C2039; text-align: left;
}
.ms-picker-item--active { background: #f3edfb; font-weight: 700; }
.ms-picker-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-picker-relay { color: #F6B100; font-size: 13px; }

/* Body */
.ms-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 14px; }
.ms-state {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: #6b5a8a; font-size: 14px;
}
.ms-state .pi-spinner { font-size: 26px; color: #915BD8; }
.ms-retry { margin-top: 4px; padding: 9px 18px; border: none; border-radius: 10px; background: #915BD8; color: #fff; font-weight: 600; }

.ms-now { display: flex; gap: 10px; margin-bottom: 12px; flex-shrink: 0; }
.ms-now-chip {
  flex: 1; display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid #eceaf2; border-radius: 13px; padding: 11px 13px;
}
.ms-now-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ms-now-label { font-size: 12px; color: #6b5a8a; flex: 1; }
.ms-now-val { font-size: 16px; font-weight: 800; color: #2C2039; }

.ms-chart {
  flex: 1; min-height: 0; position: relative;
  background: #fff; border: 1px solid #eceaf2; border-radius: 16px; padding: 12px 10px 6px;
}
.ms-chart-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  gap: 10px; color: #6b5a8a; font-size: 13px;
}
.ms-chart-loading .pi-spinner { font-size: 22px; color: #915BD8; }

.ms-footer { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-shrink: 0; }
.ms-updated { font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 6px; }
.ms-reconnect {
  margin-left: auto; display: flex; align-items: center; gap: 8px;
  padding: 12px 18px; border: none; border-radius: 13px;
  background: #915BD8; color: #fff; font-size: 14px; font-weight: 700;
  box-shadow: 0 6px 16px rgba(145,91,216,0.35);
}
.ms-relay-badge { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 5px; }
.ms-relay-badge--on  { background: #dcfce7; color: #15803d; }
.ms-relay-badge--off { background: #fee2e2; color: #b91c1c; }
.ms-relay-badge--unk { background: rgba(255,255,255,0.2); color: #fff; }

.ms-swipe-hint { text-align: center; font-size: 11px; color: #c4b8d8; margin-top: 10px; flex-shrink: 0; }
</style>
