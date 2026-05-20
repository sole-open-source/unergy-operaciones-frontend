<template>
  <div class="inf-list-wrapper">
    <!-- Header -->
    <div class="inf-list-header">
      <div>
        <div class="inf-list-title">📁 Informes guardados</div>
        <div class="inf-list-sub">Informes operacionales y FMO generados por el equipo Unergy</div>
      </div>
      <div class="inf-list-actions">
        <select v-model="filtroEstado" class="inf-select" @change="cargar">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="revisado">Revisado</option>
          <option value="aprobado">Aprobado</option>
        </select>
        <button class="inf-btn inf-btn-ghost" :disabled="loading" @click="cargar">↻ Actualizar</button>
      </div>
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
    <div v-else-if="!informes.length" class="inf-estado-empty">
      <div class="inf-empty-icon">📄</div>
      <div class="inf-empty-title">No hay informes guardados</div>
      <div class="inf-empty-sub">
        {{ filtroEstado ? `No hay informes con estado "${filtroEstado}"` : 'Genera un informe desde la sección Monitoreo Fallas' }}
      </div>
    </div>

    <!-- Lista -->
    <div v-else class="inf-cards-list">
      <div
        v-for="inf in informes"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client'

const router = useRouter()

const informes = ref([])
const loading = ref(false)
const error = ref(null)
const filtroEstado = ref('')

async function cargar() {
  loading.value = true
  error.value = null
  try {
    const params = { limit: 100 }
    if (filtroEstado.value) params.estado = filtroEstado.value
    const { data } = await api.get('/informes', { params })
    informes.value = data
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

function abrirInforme(id) {
  router.push(`/informes/${id}`)
}

async function eliminarInforme(inf) {
  const nombre = `${inf.proyecto_nombre || inf.sub_project} · ${inf.periodo_display || inf.periodo_desde || ''}`
  if (!confirm(`¿Eliminar el informe "${nombre}"?\nEsta acción no se puede deshacer.`)) return
  try {
    await api.delete(`/informes/${inf.id}`)
    informes.value = informes.value.filter(i => i.id !== inf.id)
  } catch (e) {
    const msg = e.response?.data?.detail || e.message
    alert('⚠️ ' + (e.response?.status === 400 ? 'No se puede eliminar un informe aprobado' : msg))
  }
}

function estadoClass(estado) {
  return {
    borrador: 'badge-borrador',
    revisado: 'badge-revisado',
    aprobado: 'badge-aprobado',
  }[estado] || ''
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
  max-width: 1000px;
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
  margin-bottom: 24px;
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
.inf-list-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
.inf-btn-delete {
  background: transparent;
  color: #FF5757;
  border: 1px solid #FF575730;
  padding: 5px 10px;
  font-size: 13px;
}
.inf-btn-delete:hover { background: #FF575718; border-color: #FF5757; }

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
