<template>
  <div class="fmv-wrap">

    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="fmv-header">
      <div class="fmv-header-left">
        <i class="pi pi-map" style="color:#915BD8;font-size:14px" />
        <span class="font-bold text-sm text-gray-800">Mapa de fallas</span>
        <span class="text-xs text-gray-400">· Circuitos OR + ubicación de proyectos</span>
      </div>
      <div class="fmv-controls">
        <select v-model="operadorSel" class="fmv-select" @change="cargarMapa">
          <option value="">Seleccionar operador…</option>
          <option v-for="op in operadores" :key="op.code" :value="op.code">{{ op.name }}</option>
        </select>
        <button class="fmv-btn-icon" @click="cargarMapa" :disabled="!operadorSel || loadingMapa"
          title="Recargar mapa">
          <i :class="loadingMapa ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
        </button>
      </div>
    </div>

    <!-- ── Leyenda rápida ──────────────────────────────────── -->
    <div class="fmv-legend">
      <span class="fmv-legend-item"><span class="fmv-dot" style="background:#16a34a"></span> Sin fallas</span>
      <span class="fmv-legend-item"><span class="fmv-dot" style="background:#d97706"></span> 1–2 fallas</span>
      <span class="fmv-legend-item"><span class="fmv-dot" style="background:#dc2626"></span> 3+ fallas</span>
      <span class="fmv-legend-item"><span class="fmv-dot fmv-dot--line" style="background:#3b82f6"></span> Circuito 66/110 kV</span>
      <span class="fmv-legend-item"><span class="fmv-dot fmv-dot--line" style="background:#f59e0b"></span> Circuito 220 kV</span>
    </div>

    <!-- ── Estado vacío ────────────────────────────────────── -->
    <div v-if="!operadorSel && !loadingMapa" class="fmv-empty">
      <i class="pi pi-map-marker text-4xl" style="color:#d4c8e8"></i>
      <p class="text-sm font-semibold text-gray-500 mt-3">Selecciona un operador de red</p>
      <p class="text-xs text-gray-400">para cargar los circuitos y ubicaciones</p>
    </div>

    <div v-else-if="errorMapa" class="fmv-empty">
      <i class="pi pi-exclamation-circle text-3xl text-red-400"></i>
      <p class="text-sm text-red-500 mt-2">{{ errorMapa }}</p>
      <button class="fmv-retry" @click="cargarMapa">Reintentar</button>
    </div>

    <!-- ── Contenedor del mapa ─────────────────────────────── -->
    <div v-show="operadorSel && !errorMapa" ref="mapContainer" class="fmv-map" />

    <!-- ── Panel lateral (detalle proyecto) ───────────────── -->
    <transition name="fmv-slide">
      <div v-if="proyectoSelec" class="fmv-panel">
        <div class="fmv-panel-header">
          <span class="font-bold text-sm text-gray-800 truncate flex-1">{{ proyectoSelec.name }}</span>
          <button class="fmv-close" @click="proyectoSelec = null">
            <i class="pi pi-times text-xs" />
          </button>
        </div>
        <div class="fmv-panel-body">
          <div class="fmv-stat">
            <span class="fmv-stat-num" :style="{ color: colorPorFallas(fallasPorProyecto[proyectoSelec.name] || 0) }">
              {{ fallasPorProyecto[proyectoSelec.name] || 0 }}
            </span>
            <span class="fmv-stat-lbl">falla{{ (fallasPorProyecto[proyectoSelec.name] || 0) !== 1 ? 's' : '' }} activa{{ (fallasPorProyecto[proyectoSelec.name] || 0) !== 1 ? 's' : '' }}</span>
          </div>
          <div class="text-xs text-gray-500 mt-2" v-if="proyectoSelec.kwp">
            <i class="pi pi-sun" /> {{ Number(proyectoSelec.kwp).toLocaleString('es-CO') }} kWp instalados
          </div>
          <div class="text-xs text-gray-500" v-if="proyectoSelec.circuit_name">
            <i class="pi pi-bolt" /> Circuito: {{ proyectoSelec.circuit_name }}
          </div>

          <!-- Lista de fallas del proyecto -->
          <div v-if="fallasList(proyectoSelec.name).length" class="fmv-fallas-list">
            <div class="fmv-fallas-title">Fallas activas</div>
            <div v-for="f in fallasList(proyectoSelec.name)" :key="f.id" class="fmv-falla-row">
              <span class="fmv-falla-dot" :style="{ background: prioColor(f.prioridad?.codigo) }" />
              <div class="fmv-falla-info">
                <code class="fmv-falla-code">{{ f.codigo_interno }}</code>
                <span class="fmv-falla-tipo">{{ f.tipo?.etiqueta || f.descripcion }}</span>
              </div>
              <span class="fmv-falla-dias" :class="diasClass(f)">{{ f.dias_abierta ?? '?' }}d</span>
            </div>
          </div>
          <p v-else class="text-xs text-green-600 mt-3 font-medium">
            <i class="pi pi-check-circle" /> Sin fallas activas
          </p>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const OR_BASE = '/or-api'

const props = defineProps({
  fallas: { type: Array, default: () => [] },
})

const mapContainer  = ref(null)
const operadores    = ref([])
const operadorSel   = ref('')
const loadingMapa   = ref(false)
const errorMapa     = ref(null)
const proyectoSelec = ref(null)

let map     = null
let markers = []

// ── Cálculos sobre fallas ───────────────────────────────────
const fallasPorProyecto = computed(() => {
  const m = {}
  for (const f of props.fallas) {
    if (f.estado?.es_estado_final) continue
    const nombre = f.proyecto?.nombre_comercial
    if (!nombre) continue
    m[nombre] = (m[nombre] || 0) + 1
  }
  return m
})

function fallasList(nombre) {
  return props.fallas.filter(f => !f.estado?.es_estado_final && f.proyecto?.nombre_comercial === nombre)
}

function colorPorFallas(n) {
  if (n === 0) return '#16a34a'
  if (n <= 2)  return '#d97706'
  return '#dc2626'
}

const PRIO_COLORS = { critica: '#dc2626', alta: '#ea580c', media: '#d97706', baja: '#6b7280' }
function prioColor(c) { return PRIO_COLORS[c] || '#9ca3af' }
function diasClass(f) {
  const d = f.dias_abierta ?? 0
  if (d >= 7) return 'dias-red'
  if (d >= 3) return 'dias-yellow'
  return 'dias-green'
}

// ── Carga operadores ────────────────────────────────────────
async function cargarOperadores() {
  try {
    const r = await fetch(`${OR_BASE}/operators`)
    operadores.value = await r.json()
    if (operadores.value.length) {
      operadorSel.value = operadores.value[0].code
      await cargarMapa()
    }
  } catch {
    errorMapa.value = 'No se pudo conectar al backend OR. Verifica que esté corriendo en localhost:3002.'
  }
}

// ── Carga datos del mapa y renderiza ───────────────────────
async function cargarMapa() {
  if (!operadorSel.value) return
  loadingMapa.value = true
  errorMapa.value   = null
  try {
    const r    = await fetch(`${OR_BASE}/map?operator=${encodeURIComponent(operadorSel.value)}`)
    const data = await r.json()
    await nextTick()
    renderMapa(data)
  } catch (e) {
    errorMapa.value = 'Error al cargar datos del mapa: ' + e.message
  } finally {
    loadingMapa.value = false
  }
}

function renderMapa(data) {
  const { minigranjas = [], circuitLines = [], substations = [] } = data

  // Centro: centroid de minigranjas o Colombia por defecto
  let centerLng = -74.297, centerLat = 4.571
  if (minigranjas.length) {
    centerLng = minigranjas.reduce((s, m) => s + Number(m.lng), 0) / minigranjas.length
    centerLat = minigranjas.reduce((s, m) => s + Number(m.lat), 0) / minigranjas.length
  }

  // Destruir mapa previo
  if (map) { map.remove(); map = null }
  markers.forEach(m => m.remove()); markers = []

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: [centerLng, centerLat],
    zoom: 9,
  })

  map.addControl(new maplibregl.NavigationControl(), 'top-right')

  map.on('load', () => {
    // ── Circuit lines ──
    if (circuitLines.length) {
      const features = circuitLines
        .filter(c => c.geojson)
        .map(c => ({
          type: 'Feature',
          properties: {
            name: c.circuit_name,
            tension: c.tension_level,
          },
          geometry: JSON.parse(c.geojson),
        }))

      map.addSource('circuits', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      })

      map.addLayer({
        id: 'circuits-high',
        type: 'line',
        source: 'circuits',
        filter: ['>=', ['to-number', ['get', 'tension']], 200],
        paint: { 'line-color': '#f59e0b', 'line-width': 2, 'line-opacity': 0.8 },
      })
      map.addLayer({
        id: 'circuits-low',
        type: 'line',
        source: 'circuits',
        filter: ['<', ['to-number', ['get', 'tension']], 200],
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.7 },
      })
    }

    // ── Minigranjas / proyectos ──
    for (const mg of minigranjas) {
      const n     = fallasPorProyecto.value[mg.name] || 0
      const color = colorPorFallas(n)

      const el = document.createElement('div')
      el.className = 'fmv-marker'
      el.style.cssText = `
        width:${n > 0 ? 20 : 14}px;
        height:${n > 0 ? 20 : 14}px;
        background:${color};
        border:2.5px solid #fff;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
        cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        font-size:9px;font-weight:900;color:#fff;
        transition:transform .12s;
      `
      if (n > 0) el.textContent = n

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(mg.lng), Number(mg.lat)])
        .addTo(map)

      el.addEventListener('click', () => {
        proyectoSelec.value = mg
        map.flyTo({ center: [Number(mg.lng), Number(mg.lat)], zoom: 12 })
      })
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      markers.push(marker)
    }

    // ── Substations ──
    for (const sub of substations) {
      if (!sub.lat || !sub.lng) continue
      const el = document.createElement('div')
      el.style.cssText = `
        width:10px;height:10px;
        background:#7c3aed;
        border:2px solid #fff;
        border-radius:2px;
        box-shadow:0 1px 4px rgba(0,0,0,.3);
        cursor:default;
      `
      new maplibregl.Marker({ element: el })
        .setLngLat([Number(sub.lng), Number(sub.lat)])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(
          `<div style="font-size:12px;font-weight:700">${sub.name}</div>
           <div style="font-size:11px;color:#6b7280">${sub.circuit_count} circuito(s)</div>`
        ))
        .addTo(map)
    }
  })
}

onMounted(cargarOperadores)
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

/* ── Header ── */
.fmv-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.fmv-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.fmv-controls { display: flex; align-items: center; gap: 6px; }

.fmv-select {
  background: #f9f7fd;
  border: 1.5px solid #e5e0f0;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  color: #2C2039;
  font-family: inherit;
  outline: none;
  min-width: 180px;
  cursor: pointer;
}
.fmv-select:focus { border-color: #915BD8; }

.fmv-btn-icon {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: #f4f1fa;
  border: 1px solid #e5e0f0;
  border-radius: 8px;
  cursor: pointer;
  color: #6b5a8a;
  font-size: 13px;
  transition: background .12s;
}
.fmv-btn-icon:hover:not(:disabled) { background: #e9e0f5; }
.fmv-btn-icon:disabled { opacity: .4; cursor: not-allowed; }

/* ── Leyenda ── */
.fmv-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 5px 16px;
  background: #fff;
  border-bottom: 1px solid #f0eaf8;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.fmv-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6b5a8a;
}
.fmv-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.fmv-dot--line {
  border-radius: 2px;
  height: 3px;
  width: 14px;
}

/* ── Mapa ── */
.fmv-map {
  flex: 1;
  min-height: 400px;
}

/* ── Estado vacío ── */
.fmv-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}
.fmv-retry {
  margin-top: 10px;
  padding: 6px 14px;
  background: #915BD8;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}

/* ── Panel lateral ── */
.fmv-panel {
  position: absolute;
  top: 110px;
  right: 12px;
  width: 240px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ece8f4;
  box-shadow: 0 8px 24px rgba(28,18,50,.14);
  z-index: 10;
  overflow: hidden;
}
.fmv-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0eaf8;
  background: #faf7ff;
}
.fmv-close {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: #f0eaf8;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b5a8a;
  flex-shrink: 0;
}
.fmv-panel-body { padding: 12px; }

.fmv-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.fmv-stat-num  { font-size: 32px; font-weight: 900; line-height: 1; }
.fmv-stat-lbl  { font-size: 12px; color: #6b5a8a; }

/* ── Lista de fallas del panel ── */
.fmv-fallas-list { margin-top: 12px; }
.fmv-fallas-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #a094b8;
  margin-bottom: 6px;
}
.fmv-falla-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  border-bottom: 1px solid #f0eaf8;
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

/* ── Transición panel ── */
.fmv-slide-enter-active, .fmv-slide-leave-active { transition: all .2s; }
.fmv-slide-enter-from, .fmv-slide-leave-to { opacity: 0; transform: translateX(20px); }
</style>
