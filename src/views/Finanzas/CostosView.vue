<template>
  <div class="gf-page">

    <!-- ══ TAB BAR ══════════════════════════════════════════════════════════ -->
    <div class="mon-tab-bar">
      <i class="pi pi-credit-card text-sm" style="color:#915BD8" />
      <span class="text-base font-bold text-gray-800 whitespace-nowrap mr-2">Costos</span>
      <div class="mon-tab-group">
        <button
          v-for="(tab, i) in TABS"
          :key="i"
          class="mon-tab"
          :class="{ 'mon-tab--active': activeTab === i }"
          @click="activeTab = i"
        >
          <i :class="tab.icon" style="font-size:12px" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ══ TAB 0 — MANTENIMIENTO ══════════════════════════════════════════ -->
    <div v-if="activeTab === 0" class="mon-tab-view">

      <!-- Selector de proyecto -->
      <div class="costos-selector-bar">
        <i class="pi pi-bolt text-sm" style="color:#915BD8" />
        <span class="text-sm font-semibold" style="color:#2C2039">Proyecto</span>
        <Select
          v-model="proyectoSeleccionado"
          :options="proyectos"
          optionLabel="nombre_comercial"
          optionValue="id"
          placeholder="Selecciona un proyecto…"
          filter
          showClear
          :loading="loadingProyectos"
          class="costos-selector-select"
          @change="onProyectoChange"
        />
        <span v-if="proyectoSeleccionado && proyectoNombre"
          class="text-xs font-medium px-2.5 py-1 rounded-full"
          style="background:#F1EAF9; color:#6D28D9">
          {{ proyectoNombre }}
        </span>
      </div>

      <!-- Sin proyecto seleccionado -->
      <div v-if="!proyectoSeleccionado" class="mon-tab-empty">
        <i class="pi pi-arrow-up" style="font-size:1.8rem; color:#c4b8d4;" />
        <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Selecciona un proyecto</p>
        <p class="mt-1 text-xs" style="color:#a094b8;">Elige un proyecto arriba para ver sus facturas de mantenimiento</p>
      </div>

      <!-- Cargando contrato -->
      <div v-else-if="loadingContrato" class="mon-tab-empty">
        <i class="pi pi-spin pi-spinner" style="font-size:1.8rem; color:#915BD8;" />
        <p class="mt-3 text-xs" style="color:#a094b8;">Cargando…</p>
      </div>

      <!-- Componente de facturas -->
      <div v-else class="space-y-4">
        <FacturasMantenimiento
          :contrato-id="contratoMantenimientoId"
          :proyecto-nombre="proyectoNombre"
        />
      </div>

    </div>

    <!-- ══ TAB 1 — ARRIENDOS ══════════════════════════════════════════════ -->
    <div v-if="activeTab === 1" class="mon-tab-view">
      <div class="mon-tab-empty">
        <i class="pi pi-building" style="font-size:2.5rem; color:#c4b8d4;" />
        <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Arriendos</p>
        <p class="mt-1 text-xs" style="color:#a094b8;">Próximamente — registros de costos de arriendos</p>
      </div>
    </div>

    <!-- ══ TAB 2 — SERVICIOS DE INTERNET ══════════════════════════════════ -->
    <div v-if="activeTab === 2" class="mon-tab-view">
      <div class="mon-tab-empty">
        <i class="pi pi-wifi" style="font-size:2.5rem; color:#c4b8d4;" />
        <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Servicios de Internet</p>
        <p class="mt-1 text-xs" style="color:#a094b8;">Próximamente — registros de costos de servicios de internet</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import api from '@/api/client'
import FacturasMantenimiento from '@/views/Servicios/FacturasMantenimiento.vue'

const TABS = [
  { label: 'Mantenimiento',         icon: 'pi pi-wrench' },
  { label: 'Arriendos',             icon: 'pi pi-building' },
  { label: 'Servicios de Internet', icon: 'pi pi-wifi' },
]

const activeTab = ref(0)

// ── Proyectos ──────────────────────────────────────────────────────────────────
const proyectos           = ref([])
const loadingProyectos    = ref(false)
const proyectoSeleccionado = ref(null)
const proyectoNombre      = ref('')

// ── Contrato de mantenimiento del proyecto seleccionado ────────────────────────
const contratoMantenimientoId = ref(null)
const loadingContrato         = ref(false)

onMounted(async () => {
  loadingProyectos.value = true
  try {
    const [r1, r2] = await Promise.allSettled([
      api.get('/proyectos', { params: { limit: 500 } }),
      api.get('/proyectos', { params: { limit: 500, tipo_proyecto: 'minigranja' } }),
    ])
    const lista1 = r1.status === 'fulfilled' ? (Array.isArray(r1.value.data) ? r1.value.data : (r1.value.data.items ?? [])) : []
    const lista2 = r2.status === 'fulfilled' ? (Array.isArray(r2.value.data) ? r2.value.data : (r2.value.data.items ?? [])) : []
    const ids = new Set()
    const todos = [...lista1, ...lista2].filter(p => {
      if (ids.has(p.id)) return false
      ids.add(p.id)
      return true
    })
    proyectos.value = todos.sort((a, b) => a.nombre_comercial.localeCompare(b.nombre_comercial))
  } catch {
    proyectos.value = []
  } finally {
    loadingProyectos.value = false
  }
})

async function onProyectoChange() {
  contratoMantenimientoId.value = null
  proyectoNombre.value = ''

  if (!proyectoSeleccionado.value) return

  const proy = proyectos.value.find(p => p.id === proyectoSeleccionado.value)
  proyectoNombre.value = proy?.nombre_comercial ?? ''

  loadingContrato.value = true
  try {
    const { data } = await api.get('/contratos-servicio', {
      params: { tipo: 'mantenimiento', proyecto_id: proyectoSeleccionado.value },
    })
    contratoMantenimientoId.value = data.length ? data[0].id : null
  } catch {
    contratoMantenimientoId.value = null
  } finally {
    loadingContrato.value = false
  }
}
</script>

<style scoped>
.gf-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f5f4f8;
}

/* ── Tab bar (idéntico a MonitoreoView) ── */
.mon-tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 25;
}
.mon-tab-group {
  display: inline-flex;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 2px;
  gap: 0;
}
.mon-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: #6B5A8A;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.mon-tab i { font-size: 12px; }
.mon-tab:hover:not(.mon-tab--active) { color: #2C2039; background: rgba(145,91,216,.08); }
.mon-tab--active {
  background: #915BD8;
  color: #FDFAF7;
  box-shadow: 0 1px 4px rgba(145,91,216,.3);
}
.mon-tab--active:hover { color: #FDFAF7; }

/* ── Selector de proyecto ── */
.costos-selector-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  flex-wrap: wrap;
}
.costos-selector-select {
  min-width: 280px;
  max-width: 400px;
}

/* ── Contenido ── */
.mon-tab-view {
  padding: 24px 24px 40px;
  background: #f5f4f8;
}
.mon-tab-empty {
  text-align: center;
  padding: 80px 20px;
}
.space-y-4 > * + * { margin-top: 1rem; }

@media (max-width: 640px) {
  .mon-tab-view { padding: 16px; }
  .costos-selector-select { min-width: 200px; }
}
</style>
