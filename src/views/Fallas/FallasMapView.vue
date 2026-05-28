<template>
  <div class="fmv-wrap">

    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="fmv-header">
      <div class="fmv-header-left">
        <i class="pi pi-map" style="color:#915BD8;font-size:14px" />
        <span class="font-bold text-sm text-gray-800">Mapa de fallas</span>
        <span class="text-xs text-gray-400 hidden sm:inline">· Proyectos con fallas activas</span>
      </div>
      <div class="fmv-controls">
        <button class="fmv-btn-icon" @click="cargar" :disabled="loading" title="Recargar">
          <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
        </button>
      </div>
    </div>

    <!-- ── Leyenda ─────────────────────────────────────────── -->
    <div class="fmv-legend">
      <span class="fmv-legend-item"><span class="fmv-dot" style="background:#16a34a"></span> Sin fallas activas</span>
      <span class="fmv-legend-item"><span class="fmv-dot" style="background:#d97706"></span> 1–2 fallas</span>
      <span class="fmv-legend-item"><span class="fmv-dot" style="background:#dc2626"></span> 3+ fallas</span>
      <span class="fmv-legend-item fmv-legend-item--muted" v-if="sinCoordenadas > 0">
        <i class="pi pi-exclamation-triangle text-yellow-500" style="font-size:10px"/>
        {{ sinCoordenadas }} proyecto{{ sinCoordenadas !== 1 ? 's' : '' }} sin coordenadas
      </span>
    </div>

    <!-- ── Error ───────────────────────────────────────────── -->
    <div v-if="error" class="fmv-empty">
      <i class="pi pi-exclamation-circle text-3xl text-red-400"></i>
      <p class="text-sm text-red-500 mt-2">{{ error }}</p>
      <button class="fmv-retry" @click="cargar">Reintentar</button>
    </div>

    <!-- ── Loading inicial ─────────────────────────────────── -->
    <div v-else-if="loading && !mapListo" class="fmv-empty">
      <i class="pi pi-spin pi-spinner text-3xl" style="color:#915BD8"></i>
      <p class="text-sm text-gray-500 mt-3">Cargando mapa…</p>
    </div>

    <!-- ── Contenedor del mapa ─────────────────────────────── -->
    <div v-show="!error" ref="mapContainer" class="fmv-map" />

    <!-- ── Panel lateral ──────────────────────────────────── -->
    <transition name="fmv-slide">
      <div v-if="proyectoSel" class="fmv-panel">
        <div class="fmv-panel-header">
          <span class="font-bold text-sm text-gray-800 truncate flex-1">{{ proyectoSel.nombre_comercial }}</span>
          <button class="fmv-close" @click="proyectoSel = null"><i class="pi pi-times text-xs" /></button>
        </div>
        <div class="fmv-panel-body">

          <!-- KPI -->
          <div class="fmv-stat">
            <span class="fmv-stat-num" :style="{ color: colorPorN(fallasPorId[proyectoSel.id] || 0) }">
              {{ fallasPorId[proyectoSel.id] || 0 }}
            </span>
            <span class="fmv-stat-lbl">falla{{ (fallasPorId[proyectoSel.id] || 0) !== 1 ? 's' : '' }} activa{{ (fallasPorId[proyectoSel.id] || 0) !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Info proyecto -->
          <div class="fmv-info-row" v-if="proyectoSel.municipio">
            <i class="pi pi-map-marker" /> {{ proyectoSel.municipio }}{{ proyectoSel.departamento ? ', ' + proyectoSel.departamento : '' }}
          </div>
          <div class="fmv-info-row" v-if="proyectoSel.potencia_instalada_kwp">
            <i class="pi pi-sun" /> {{ Number(proyectoSel.potencia_instalada_kwp).toLocaleString('es-CO') }} kWp
          </div>
          <div class="fmv-info-row" v-if="proyectoSel.operador_red">
            <i class="pi pi-bolt" /> OR: {{ proyectoSel.operador_red }}
          </div>

          <!-- Lista fallas activas -->
          <template v-if="fallasDel(proyectoSel.id).length">
            <div class="fmv-fallas-title">Fallas activas</div>
            <div v-for="f in fallasDel(proyectoSel.id)" :key="f.id" class="fmv-falla-row">
              <span class="fmv-falla-dot" :style="{ background: prioColor(f.prioridad?.codigo) }" />
              <div class="fmv-falla-info">
                <code class="fmv-falla-code">{{ f.codigo_interno }}</code>
                <span class="fmv-falla-tipo">{{ f.tipo?.etiqueta || f.descripcion }}</span>
              </div>
              <span class="fmv-falla-dias" :class="diasClass(f)">{{ f.dias_abierta ?? '?' }}d</span>
            </div>
          </template>
          <p v-else class="fmv-ok"><i class="pi pi-check-circle" /> Sin fallas activas</p>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import api from '@/api/client'

const props = defineProps({
  fallas: { type: Array, default: () => [] },
})

const mapContainer = ref(null)
const proyectos    = ref([])
const loading      = ref(false)
const error        = ref(null)
const mapListo     = ref(false)
const proyectoSel  = ref(null)

let map     = null
let markers = []

// ── Fallas activas agrupadas por proyecto ───────────────────
const fallasPorId = computed(() => {
  const m = {}
  for (const f of props.fallas) {
    if (f.estado?.es_estado_final) continue
    const id = f.proyecto?.id
    if (!id) continue
    m[id] = (m[id] || 0) + 1
  }
  return m
})

const sinCoordenadas = computed(() =>
  proyectos.value.filter(p => !p.latitud || !p.longitud).length
)

function fallasDel(id) {
  return props.fallas.filter(f => !f.estado?.es_estado_final && f.proyecto?.id === id)
}

// ── Helpers visuales ────────────────────────────────────────
function colorPorN(n) {
  if (n === 0) return '#16a34a'
  if (n <= 2)  return '#d97706'
  return '#dc2626'
}

const PRIO = { critica: '#dc2626', alta: '#ea580c', media: '#d97706', baja: '#6b7280' }
function prioColor(c) { return PRIO[c] || '#9ca3af' }
function diasClass(f) {
  const d = f.dias_abierta ?? 0
  if (d >= 7) return 'dias-red'
  if (d >= 3) return 'dias-yellow'
  return 'dias-green'
}

// ── Carga proyectos y renderiza ─────────────────────────────
async function cargar() {
  loading.value = true
  error.value   = null
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = (data.items ?? []).filter(p => p.latitud && p.longitud)
    await nextTick()
    renderMapa()
  } catch (e) {
    error.value = 'Error al cargar proyectos: ' + (e.message || 'Sin conexión')
  } finally {
    loading.value = false
  }
}

function renderMapa() {
  if (!mapContainer.value) return

  // Destruir mapa previo si existe
  if (map) { map.remove(); map = null }
  markers.forEach(m => m.remove()); markers = []

  const conCoords = proyectos.value
  if (!conCoords.length) {
    // Mostrar Colombia centrada, sin marcadores
    iniciarMapa(-74.297, 4.571)
    return
  }

  const avgLng = conCoords.reduce((s, p) => s + Number(p.longitud), 0) / conCoords.length
  const avgLat = conCoords.reduce((s, p) => s + Number(p.latitud),  0) / conCoords.length
  iniciarMapa(avgLng, avgLat)
}

function iniciarMapa(lng, lat) {
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: [lng, lat],
    zoom: proyectos.value.length ? 8 : 5,
  })

  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

  map.on('load', () => {
    mapListo.value = true
    agregarMarcadores()
  })
}

function agregarMarcadores() {
  markers.forEach(m => m.remove()); markers = []

  for (const p of proyectos.value) {
    const n     = fallasPorId.value[p.id] || 0
    const color = colorPorN(n)
    const size  = n > 0 ? 22 : 14

    const el = document.createElement('div')
    el.style.cssText = `
      width:${size}px; height:${size}px;
      background:${color};
      border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:9px; font-weight:900; color:#fff;
      transition:transform .12s, box-shadow .12s;
    `
    if (n > 0) el.textContent = n

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([Number(p.longitud), Number(p.latitud)])
      .addTo(map)

    el.addEventListener('click', () => {
      proyectoSel.value = p
      map.flyTo({ center: [Number(p.longitud), Number(p.latitud)], zoom: 12, duration: 800 })
    })
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.3)'
      el.style.boxShadow = '0 4px 14px rgba(0,0,0,.4)'
    })
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)'
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,.3)'
    })

    markers.push(marker)
  }
}

onMounted(cargar)
onBeforeUnmount(() => {
  if (map) map.remove()
  markers.forEach(m => m.remove())
})
</script>

<style scoped>
.fmv-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #f8f7fa;
  position: relative;
}

/* Header */
.fmv-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  flex-shrink: 0;
}
.fmv-header-left { display: flex; align-items: center; gap: 8px; flex: 1; }
.fmv-controls    { display: flex; align-items: center; gap: 6px; }

.fmv-btn-icon {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: #f4f1fa; border: 1px solid #e5e0f0;
  border-radius: 8px; cursor: pointer; color: #6b5a8a;
  font-size: 13px; transition: background .12s;
}
.fmv-btn-icon:hover:not(:disabled) { background: #e9e0f5; }
.fmv-btn-icon:disabled { opacity: .4; cursor: not-allowed; }

/* Leyenda */
.fmv-legend {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 5px 16px; background: #fff;
  border-bottom: 1px solid #f0eaf8; flex-shrink: 0;
}
.fmv-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6b5a8a; }
.fmv-legend-item--muted { color: #9ca3af; }
.fmv-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

/* Mapa */
.fmv-map { flex: 1; min-height: 0; }

/* Estado vacío / loading */
.fmv-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 60px 20px;
}
.fmv-retry {
  margin-top: 12px; padding: 6px 16px;
  background: #915BD8; color: #fff; border: none;
  border-radius: 8px; font-size: 12px; cursor: pointer;
}

/* Panel lateral */
.fmv-panel {
  position: absolute; top: 108px; right: 12px;
  width: 250px; background: #fff; border-radius: 12px;
  border: 1px solid #ece8f4;
  box-shadow: 0 8px 24px rgba(28,18,50,.14); z-index: 10; overflow: hidden;
}
.fmv-panel-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid #f0eaf8; background: #faf7ff;
}
.fmv-close {
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  background: #f0eaf8; border: none; border-radius: 6px;
  cursor: pointer; color: #6b5a8a; flex-shrink: 0;
}
.fmv-panel-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; }

.fmv-stat { display: flex; align-items: baseline; gap: 6px; }
.fmv-stat-num { font-size: 32px; font-weight: 900; line-height: 1; }
.fmv-stat-lbl { font-size: 12px; color: #6b5a8a; }

.fmv-info-row { font-size: 11.5px; color: #6b5a8a; display: flex; align-items: center; gap: 5px; }
.fmv-info-row i { font-size: 10px; }

.fmv-fallas-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #a094b8; margin-top: 8px; margin-bottom: 4px;
}
.fmv-falla-row {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 0; border-bottom: 1px solid #f0eaf8;
}
.fmv-falla-row:last-child { border-bottom: none; }
.fmv-falla-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fmv-falla-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.fmv-falla-code { font-size: 10px; font-weight: 700; color: #6b5a8a; }
.fmv-falla-tipo { font-size: 11px; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fmv-falla-dias { font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 4px; flex-shrink: 0; }
.dias-green  { background: #f0fdf4; color: #16a34a; }
.dias-yellow { background: #fefce8; color: #a16207; }
.dias-red    { background: #fef2f2; color: #dc2626; }

.fmv-ok { font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 8px; }

/* Transición panel */
.fmv-slide-enter-active, .fmv-slide-leave-active { transition: all .2s; }
.fmv-slide-enter-from, .fmv-slide-leave-to { opacity: 0; transform: translateX(20px); }
</style>
