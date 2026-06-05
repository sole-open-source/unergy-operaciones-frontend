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

      <!-- ── 1. Panel O&M Mensual — contenedor con borde propio ──────────── -->
      <div class="om-panel-card">
        <!-- Header del panel — NO sticky, no hereda mon-tab-bar -->
        <div class="om-panel-header">
          <div class="flex items-center gap-2">
            <i class="pi pi-calculator text-sm" style="color:#915BD8" />
            <span class="text-sm font-semibold" style="color:#2C2039">Panel O&amp;M Mensual</span>
          </div>
          <div class="mon-tab-group">
            <button
              v-for="(tab, i) in SUBTABS_OM"
              :key="i"
              class="mon-tab"
              :class="{ 'mon-tab--active': activeSubTabOM === i }"
              @click="activeSubTabOM = i"
            >
              <i :class="tab.icon" style="font-size:12px" />
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Contenido del panel — tabla queda dentro del card -->
        <div class="om-panel-body">
          <OMAOperaciones v-if="activeSubTabOM === 0" />
          <OMAProveedor   v-if="activeSubTabOM === 1" />
        </div>
      </div>

      <!-- ── 2. Separador ─────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 my-5">
        <div class="h-px flex-1" style="background:#ECE7F2" />
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style="background:#F1EAF9;color:#6D28D9">
          Comparación facturas emitidas vs cobrado a inversionistas
        </span>
        <div class="h-px flex-1" style="background:#ECE7F2" />
      </div>

      <!-- ── 3. Selector de proyecto ────────────────────────────────────── -->
      <div class="costos-selector-bar">
        <i class="pi pi-bolt text-sm flex-shrink-0" style="color:#915BD8" />
        <span class="text-sm font-semibold whitespace-nowrap" style="color:#2C2039">Proyecto</span>
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
          class="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
          style="background:#F1EAF9; color:#6D28D9">
          {{ proyectoNombre }}
        </span>
      </div>

      <!-- ── 4. Contenido del proyecto ─────────────────────────────────── -->
      <div v-if="loadingContrato" class="flex justify-center py-10">
        <i class="pi pi-spin pi-spinner" style="font-size:1.5rem; color:#915BD8;" />
      </div>

      <div v-else-if="proyectoSeleccionado" class="space-y-4 mt-3">

        <!-- Facturas históricas -->
        <FacturasMantenimiento
          :contrato-id="contratoMantenimientoId"
          :proyecto-nombre="proyectoNombre"
        />

        <!-- Cargar factura -->
        <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#ECE7F2">
          <div class="flex items-center justify-between px-4 py-2.5 border-b" style="border-color:#F3F0FA">
            <div class="flex items-center gap-2">
              <i class="pi pi-upload text-xs" style="color:#915BD8" />
              <span class="text-sm font-semibold" style="color:#2C2039">Cargar factura</span>
            </div>
            <button type="button"
              class="text-xs flex items-center gap-1 text-gray-400 hover:text-purple-600 transition-colors"
              @click="showCargarFactura = !showCargarFactura">
              <i class="pi pi-chevron-down text-[10px] transition-transform duration-200"
                :style="showCargarFactura ? 'transform:rotate(180deg)' : ''" />
              {{ showCargarFactura ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>

          <div v-show="showCargarFactura" class="px-4 py-3">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <!-- Tipo (siempre visible, primer campo) -->
              <div class="flex flex-col gap-1 md:col-span-2">
                <label class="text-xs font-medium text-gray-500">Tipo <span class="text-red-400">*</span></label>
                <div class="flex gap-2">
                  <label
                    class="flex-1 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors"
                    :class="facturaForm.tipo === 'solenium'
                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'">
                    <input type="radio" v-model="facturaForm.tipo" value="solenium" class="accent-purple-600" />
                    Proveedor O&amp;M (Solenium)
                  </label>
                  <label
                    class="flex-1 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors"
                    :class="facturaForm.tipo === 'inversionistas'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'">
                    <input type="radio" v-model="facturaForm.tipo" value="inversionistas" class="accent-blue-600" />
                    Cobros a clientes (Inversionistas)
                  </label>
                </div>
              </div>
              <!-- Período -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-500">Mes / Año</label>
                <input
                  type="month"
                  v-model="facturaForm.periodo"
                  class="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <!-- N° Factura -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-500">N° Factura</label>
                <input
                  type="text"
                  v-model="facturaForm.numero"
                  placeholder="Ej: SOFV001"
                  class="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <!-- Monto -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-500">Monto (COP)</label>
                <input
                  type="number"
                  v-model.number="facturaForm.monto"
                  placeholder="0"
                  class="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <!-- Archivo -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-500">Archivo (PDF / imagen)</label>
                <label class="flex items-center gap-2 text-sm border border-dashed border-gray-300 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-purple-400 transition-colors">
                  <i class="pi pi-paperclip text-xs text-gray-400" />
                  <span class="text-xs text-gray-400 truncate">
                    {{ facturaForm.archivo ? facturaForm.archivo.name : 'Seleccionar archivo…' }}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    class="hidden"
                    @change="onArchivoChange"
                  />
                </label>
              </div>
            </div>

            </div><!-- /grid archivo -->

            <!-- Link Drive (alternativa al archivo) -->
            <div class="flex flex-col gap-1 mt-2.5">
              <label class="text-xs font-medium text-gray-500">
                O pega el link de Google Drive / soporte digital
              </label>
              <input
                type="url"
                v-model="facturaForm.enlace"
                placeholder="https://drive.google.com/…"
                class="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <!-- Botón -->
            <div class="flex items-center gap-3 mt-3">
              <button type="button"
                :disabled="!puedeGuardarFactura || guardandoFactura"
                class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                style="background:#915BD8;color:#fff;border:none;cursor:pointer"
                :style="!puedeGuardarFactura || guardandoFactura ? 'cursor:not-allowed' : 'cursor:pointer'"
                @click="guardarFactura">
                <i :class="guardandoFactura ? 'pi pi-spin pi-spinner' : 'pi pi-check'" class="text-xs" />
                {{ guardandoFactura ? 'Guardando…' : 'Guardar factura' }}
              </button>
              <span v-if="facturaOk" class="text-xs text-green-600 flex items-center gap-1">
                <i class="pi pi-check-circle text-xs" />Factura registrada
              </span>
            </div>
          </div>
        </div>

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
import { ref, computed, onMounted } from 'vue'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import FacturasMantenimiento from '@/views/Servicios/FacturasMantenimiento.vue'
import OMAOperaciones from './OMAOperaciones.vue'
import OMAProveedor from './OMAProveedor.vue'

const toast = useToast()

const SUBTABS_OM = [
  { label: 'Operaciones', icon: 'pi pi-users' },
  { label: 'Proveedor',   icon: 'pi pi-truck' },
]
const activeSubTabOM = ref(0)

const TABS = [
  { label: 'Mantenimiento',         icon: 'pi pi-wrench' },
  { label: 'Arriendos',             icon: 'pi pi-building' },
  { label: 'Servicios de Internet', icon: 'pi pi-wifi' },
]
const activeTab = ref(0)

// ── Proyectos ──────────────────────────────────────────────────────────────────
const proyectos            = ref([])
const loadingProyectos     = ref(false)
const proyectoSeleccionado = ref(null)
const proyectoNombre       = ref('')

// ── Contrato de mantenimiento del proyecto seleccionado ────────────────────────
const contratoMantenimientoId = ref(null)
const loadingContrato         = ref(false)

// ── Cargar factura ─────────────────────────────────────────────────────────────
const showCargarFactura = ref(false)
const guardandoFactura  = ref(false)
const facturaOk         = ref(false)
const facturaForm = ref({
  tipo:    'solenium',                             // 'solenium' | 'inversionistas'
  periodo: new Date().toISOString().slice(0, 7),  // "2026-06"
  numero:  '',
  monto:   null,
  archivo: null,
  enlace:  '',
})

const puedeGuardarFactura = computed(() =>
  !!(facturaForm.value.periodo && facturaForm.value.numero)
)

function onArchivoChange(e) {
  facturaForm.value.archivo = e.target.files?.[0] ?? null
}

async function guardarFactura() {
  if (!puedeGuardarFactura.value || !contratoMantenimientoId.value) return
  guardandoFactura.value = true
  facturaOk.value = false
  try {
    const esInversionistas = facturaForm.value.tipo === 'inversionistas'
    const campoActual      = esInversionistas ? 'facturas_inversionistas' : 'facturas_solenium'
    const endpoint         = esInversionistas ? 'facturas-inversionistas' : 'facturas-solenium'

    // Obtener lista actual de facturas del tipo seleccionado
    const { data: contrato } = await api.get(`/contratos-servicio/${contratoMantenimientoId.value}`)
    const facturasActuales = Array.isArray(contrato[campoActual])
      ? contrato[campoActual]
      : []

    const nueva = {
      id:             String(Date.now()),
      fecha:          facturaForm.value.periodo,
      numero_factura: facturaForm.value.numero || null,
      monto:          facturaForm.value.monto  || null,
      enlace_soporte: facturaForm.value.enlace || null,
    }

    await api.patch(
      `/contratos-servicio/${contratoMantenimientoId.value}/${endpoint}`,
      [...facturasActuales, nueva],
    )

    facturaOk.value = true
    // Resetear formulario (conservar tipo seleccionado)
    const tipoActual = facturaForm.value.tipo
    facturaForm.value = {
      tipo:    tipoActual,
      periodo: new Date().toISOString().slice(0, 7),
      numero:  '',
      monto:   null,
      archivo: null,
      enlace:  '',
    }
    setTimeout(() => { facturaOk.value = false }, 4000)
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar la factura', life: 3000 })
  } finally {
    guardandoFactura.value = false
  }
}

// ── Carga inicial ──────────────────────────────────────────────────────────────
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
  facturaOk.value = false

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

/* ── Tab bar ── */
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
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.costos-selector-select {
  min-width: 260px;
  max-width: 380px;
}

/* ── Panel O&M — contenedor aislado, sin sticky ── */
.om-panel-card {
  background: #ffffff;
  border: 1px solid #E5E2EC;
  border-radius: 12px;
  overflow: hidden;          /* tabla no se desborda fuera del card */
  margin-bottom: 0;
}
.om-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 14px;
  background: #FDFCFF;
  border-bottom: 1px solid #ECE7F2;
  /* sin position:sticky — el header queda fijo dentro del card, no de la página */
}
.om-panel-body {
  padding: 0;               /* OMAOperaciones y OMAProveedor manejan su propio padding */
  background: #f9f8fc;
}

/* ── Contenido ── */
.mon-tab-view {
  padding: 16px 20px 32px;
  background: #f5f4f8;
}
.mon-tab-empty {
  text-align: center;
  padding: 80px 20px;
}
.space-y-4 > * + * { margin-top: 1rem; }

@media (max-width: 640px) {
  .mon-tab-view { padding: 12px; }
  .costos-selector-select { min-width: 200px; }
}
</style>
