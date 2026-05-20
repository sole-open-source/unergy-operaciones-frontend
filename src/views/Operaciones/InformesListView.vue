<template>
  <div class="inf-list-wrapper">

    <!-- Header -->
    <div class="inf-list-header">
      <div>
        <div class="inf-list-title">📁 Informes guardados</div>
        <div class="inf-list-sub">Informes operacionales y FMO generados por el equipo Unergy</div>
      </div>
      <button class="inf-btn inf-btn-ghost" :disabled="loading" @click="cargar">↻ Actualizar</button>
    </div>

    <!-- KPIs -->
    <div class="inf-kpis">
      <div class="inf-kpi inf-kpi-total" @click="filtroEstado = ''" :class="{ active: filtroEstado === '' }">
        <div class="inf-kpi-num">{{ todosLoaded.length }}</div>
        <div class="inf-kpi-label">Total</div>
      </div>
      <div class="inf-kpi inf-kpi-borrador" @click="filtroEstado = 'borrador'" :class="{ active: filtroEstado === 'borrador' }">
        <div class="inf-kpi-num">{{ kpis.borrador }}</div>
        <div class="inf-kpi-label">Borrador</div>
      </div>
      <div class="inf-kpi inf-kpi-revisado" @click="filtroEstado = 'revisado'" :class="{ active: filtroEstado === 'revisado' }">
        <div class="inf-kpi-num">{{ kpis.revisado }}</div>
        <div class="inf-kpi-label">Revisado</div>
      </div>
      <div class="inf-kpi inf-kpi-aprobado" @click="filtroEstado = 'aprobado'" :class="{ active: filtroEstado === 'aprobado' }">
        <div class="inf-kpi-num">{{ kpis.aprobado }}</div>
        <div class="inf-kpi-label">Aprobado</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="inf-filtros">
      <select v-model="filtroAnio" class="inf-select">
        <option value="">Todos los años</option>
        <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
      </select>
      <select v-model="filtroMes" class="inf-select">
        <option value="">Todos los meses</option>
        <option v-for="m in meses" :key="m.v" :value="m.v">{{ m.label }}</option>
      </select>
      <select v-model="filtroEstado" class="inf-select">
        <option value="">Todos los estados</option>
        <option value="borrador">Borrador</option>
        <option value="revisado">Revisado</option>
        <option value="aprobado">Aprobado</option>
      </select>
      <button v-if="filtroAnio || filtroMes || filtroEstado" class="inf-btn inf-btn-clear" @click="limpiarFiltros">
        ✕ Limpiar
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="inf-estado-carga">
      <div class="spin-ring" />
      <span>Cargando informes…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="inf-estado-error">
      ⚠️ {{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="!informesFiltrados.length" class="inf-estado-empty">
      <div class="inf-empty-icon">📄</div>
      <div class="inf-empty-title">No hay informes</div>
      <div class="inf-empty-sub">
        {{ (filtroEstado || filtroAnio || filtroMes) ? 'No hay informes con los filtros seleccionados' : 'Genera un informe desde la sección Monitoreo Fallas' }}
      </div>
    </div>

    <!-- Contador resultados -->
    <div v-else-if="(filtroAnio || filtroMes || filtroEstado)" class="inf-resultados-label">
      {{ informesFiltrados.length }} informe{{ informesFiltrados.length !== 1 ? 's' : '' }} encontrado{{ informesFiltrados.length !== 1 ? 's' : '' }}
    </div>

    <!-- Lista -->
    <div v-if="!loading && !error && informesFiltrados.length" class="inf-cards-list">
      <div
        v-for="inf in informesFiltrados"
        :key="inf.id"
        class="inf-card"
      >
        <!-- Estado badge -->
        <span :class="['inf-estado-badge', estadoClass(inf.estado)]">
          {{ estadoLabel(inf.estado) }}
        </span>

        <!-- Info -->
        <div class="inf-card-info">
          <div class="inf-card-nombre">
            {{ inf.proyecto_nombre || inf.sub_project }}
            <span v-if="inf.tipo" class="inf-tipo-tag">{{ inf.tipo === 'fmo' ? 'FMO' : 'Oper.' }}</span>
            <span v-if="inf.correo_enviado" class="inf-enviado-tag">📧 enviado</span>
          </div>
          <div class="inf-card-meta">
            <span v-if="inf.periodo_display || inf.periodo_desde">
              📅 {{ inf.periodo_display || inf.periodo_desde }}
            </span>
            <span v-if="inf.editado_en">
              · {{ formatFecha(inf.editado_en) }}
            </span>
            <span v-if="inf.editado_por_nombre">
              · ✏️ {{ inf.editado_por_nombre }}
            </span>
            <span v-if="inf.aprobado_por_nombre">
              · ✅ {{ inf.aprobado_por_nombre }}
            </span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="inf-card-btns">
          <button class="inf-btn inf-btn-ghost" @click="abrirInforme(inf.id)">
            Abrir →
          </button>
          <button
            v-if="inf.estado !== 'aprobado'"
            class="inf-btn inf-btn-delete"
            :title="`Eliminar informe ${inf.proyecto_nombre || inf.sub_project}`"
            @click="eliminarInforme(inf)"
          >
            🗑
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const BACKEND = 'https://backend-production-63d8.up.railway.app'
function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const todosLoaded = ref([])   // todos los informes sin filtro (para KPIs)
const loading     = ref(false)
const error       = ref(null)

const filtroEstado = ref('')
const filtroAnio   = ref('')
const filtroMes    = ref('')

const meses = [
  { v: '01', label: 'Enero' },   { v: '02', label: 'Febrero' },
  { v: '03', label: 'Marzo' },   { v: '04', label: 'Abril' },
  { v: '05', label: 'Mayo' },    { v: '06', label: 'Junio' },
  { v: '07', label: 'Julio' },   { v: '08', label: 'Agosto' },
  { v: '09', label: 'Septiembre' }, { v: '10', label: 'Octubre' },
  { v: '11', label: 'Noviembre' }, { v: '12', label: 'Diciembre' },
]

// KPIs calculados sobre TODOS los informes (sin filtro de año/mes/estado)
const kpis = computed(() => ({
  borrador: todosLoaded.value.filter(i => i.estado === 'borrador').length,
  revisado: todosLoaded.value.filter(i => i.estado === 'revisado').length,
  aprobado: todosLoaded.value.filter(i => i.estado === 'aprobado').length,
}))

// Años disponibles extraídos de periodo_desde (YYYY-MM-DD)
const aniosDisponibles = computed(() => {
  const set = new Set()
  todosLoaded.value.forEach(i => {
    if (i.periodo_desde) set.add(i.periodo_desde.slice(0, 4))
  })
  return [...set].sort((a, b) => b - a)
})

// Lista filtrada (cliente)
const informesFiltrados = computed(() => {
  return todosLoaded.value.filter(i => {
    if (filtroEstado.value && i.estado !== filtroEstado.value) return false
    if (filtroAnio.value && (!i.periodo_desde || !i.periodo_desde.startsWith(filtroAnio.value))) return false
    if (filtroMes.value && (!i.periodo_desde || i.periodo_desde.slice(5, 7) !== filtroMes.value)) return false
    return true
  })
})

async function cargar() {
  loading.value = true
  error.value = null
  try {
    const { data } = await axios.get(`${BACKEND}/api/v1/informes/`, {
      params: { limit: 200 },
      headers: authHeaders(),
    })
    todosLoaded.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return
    }
    error.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtroEstado.value = ''
  filtroAnio.value   = ''
  filtroMes.value    = ''
}

function abrirInforme(id) {
  router.push(`/informes/${id}`)
}

async function eliminarInforme(inf) {
  const nombre = `${inf.proyecto_nombre || inf.sub_project} · ${inf.periodo_display || inf.periodo_desde || ''}`
  if (!confirm(`¿Eliminar el informe "${nombre}"?\nEsta acción no se puede deshacer.`)) return
  try {
    await axios.delete(`${BACKEND}/api/v1/informes/${inf.id}`, { headers: authHeaders() })
    todosLoaded.value = todosLoaded.value.filter(i => i.id !== inf.id)
  } catch (e) {
    const msg = e.response?.data?.detail || e.message
    alert('⚠️ ' + (e.response?.status === 400 ? 'No se puede eliminar un informe aprobado' : msg))
  }
}

function estadoClass(estado) {
  return { borrador: 'badge-borrador', revisado: 'badge-revisado', aprobado: 'badge-aprobado' }[estado] || ''
}
function estadoLabel(estado) {
  return { borrador: 'Borrador', revisado: 'Revisado', aprobado: '✅ Aprobado' }[estado] || estado
}
function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(cargar)
</script>

<style scoped>
.inf-list-wrapper {
  max-width: 1060px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  font-family: 'Sora', sans-serif;
  color: #FDFAF7;
}

/* Header */
.inf-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.inf-list-title {
  font-size: 20px;
  font-weight: 800;
  color: #FDFAF7;
  margin-bottom: 4px;
}
.inf-list-sub {
  font-size: 12px;
  color: #6B5F80;
}

/* ── KPIs ──────────────────────────────────────────────────────── */
.inf-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}
@media (max-width: 600px) {
  .inf-kpis { grid-template-columns: repeat(2, 1fr); }
}
.inf-kpi {
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid #4A3560;
  cursor: pointer;
  transition: border-color 0.18s, transform 0.12s;
  user-select: none;
}
.inf-kpi:hover { transform: translateY(-1px); }
.inf-kpi.active { border-width: 2px; }

.inf-kpi-total  { background: #2C2039; }
.inf-kpi-total.active  { border-color: #915BD8; }
.inf-kpi-total:not(.active):hover { border-color: rgba(145,91,216,.5); }

.inf-kpi-borrador { background: rgba(246,255,114,.06); }
.inf-kpi-borrador.active  { border-color: #B8A800; }
.inf-kpi-borrador:not(.active):hover { border-color: rgba(184,168,0,.5); }

.inf-kpi-revisado { background: rgba(37,99,235,.07); }
.inf-kpi-revisado.active  { border-color: #2563EB; }
.inf-kpi-revisado:not(.active):hover { border-color: rgba(37,99,235,.5); }

.inf-kpi-aprobado { background: rgba(74,222,128,.07); }
.inf-kpi-aprobado.active  { border-color: #2D8A4E; }
.inf-kpi-aprobado:not(.active):hover { border-color: rgba(45,138,78,.5); }

.inf-kpi-num {
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 5px;
}
.inf-kpi-total  .inf-kpi-num  { color: #915BD8; }
.inf-kpi-borrador .inf-kpi-num { color: #B8A800; }
.inf-kpi-revisado .inf-kpi-num { color: #2563EB; }
.inf-kpi-aprobado .inf-kpi-num { color: #2D8A4E; }

.inf-kpi-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  color: #6B5F80;
}

/* ── Filtros ────────────────────────────────────────────────────── */
.inf-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

/* Select */
.inf-select {
  background: #1a1025;
  border: 1px solid #4A3560;
  border-radius: 8px;
  padding: 7px 12px;
  color: #FDFAF7;
  font-size: 12px;
  font-family: 'Sora', sans-serif;
  outline: none;
  cursor: pointer;
}
.inf-select:focus { border-color: #915BD8; }

/* Buttons */
.inf-btn {
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Sora', sans-serif;
}
.inf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.inf-btn-ghost {
  background: #422D57;
  color: #FDFAF7;
  border: 1px solid #5B4272;
}
.inf-btn-ghost:hover:not(:disabled) { border-color: #915BD8; }
.inf-btn-clear {
  background: transparent;
  color: #A89EC0;
  border: 1px solid #4A3560;
  font-size: 11px;
  padding: 6px 10px;
}
.inf-btn-clear:hover { color: #FDFAF7; border-color: #915BD8; }
.inf-btn-delete {
  background: transparent;
  color: #FF5757;
  border: 1px solid #FF575730;
  padding: 5px 10px;
  font-size: 13px;
}
.inf-btn-delete:hover { background: #FF575718; border-color: #FF5757; }

/* Contador resultados */
.inf-resultados-label {
  font-size: 11px;
  color: #6B5F80;
  margin-bottom: 10px;
}

/* Estados de carga */
.inf-estado-carga {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  color: #A89EC0;
  font-size: 13px;
}
.inf-estado-error {
  text-align: center;
  padding: 60px 20px;
  color: #FF5757;
  font-size: 13px;
}
.inf-estado-empty {
  text-align: center;
  padding: 80px 20px;
}
.inf-empty-icon { font-size: 44px; margin-bottom: 14px; opacity: 0.4; }
.inf-empty-title { font-size: 16px; font-weight: 700; color: #A89EC0; margin-bottom: 8px; }
.inf-empty-sub { font-size: 12px; color: #6B5F80; }

/* Cards */
.inf-cards-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.inf-card {
  background: #362848;
  border: 1px solid #4A3560;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  transition: border-color 0.2s;
}
.inf-card:hover { border-color: rgba(145, 91, 216, 0.4); }

.inf-card-info {
  flex: 1;
  min-width: 0;
}
.inf-card-nombre {
  font-size: 13px;
  font-weight: 700;
  color: #FDFAF7;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.inf-tipo-tag {
  font-size: 10px;
  font-weight: 700;
  background: rgba(145, 91, 216, 0.2);
  color: #915BD8;
  border: 1px solid rgba(145, 91, 216, 0.3);
  border-radius: 4px;
  padding: 1px 6px;
}
.inf-enviado-tag {
  font-size: 10px;
  color: #2D8A4E;
}
.inf-card-meta {
  font-size: 11px;
  color: #6B5F80;
  margin-top: 3px;
}
.inf-card-btns {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

/* Estado badges */
.inf-estado-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-borrador {
  background: rgba(246, 255, 114, 0.12);
  color: #B8A800;
  border: 1px solid rgba(246, 255, 114, 0.25);
}
.badge-revisado {
  background: rgba(37, 99, 235, 0.12);
  color: #2563EB;
  border: 1px solid rgba(37, 99, 235, 0.25);
}
.badge-aprobado {
  background: rgba(74, 222, 128, 0.12);
  color: #2D8A4E;
  border: 1px solid rgba(74, 222, 128, 0.25);
}

/* Spinner */
.spin-ring {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(145, 91, 216, 0.2);
  border-top-color: #915BD8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
