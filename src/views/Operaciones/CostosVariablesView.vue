<template>
  <div class="cv-page">

    <!-- ══ HEADER ══════════════════════════════════════════════════════════ -->
    <div class="cv-header">
      <div class="flex items-center gap-2">
        <i class="pi pi-receipt" style="color:#915BD8;font-size:16px" />
        <h2 class="cv-title">Costos Variables</h2>
        <span class="cv-badge">{{ costos.length }}</span>
      </div>
      <div class="flex items-center gap-2">
        <Button icon="pi pi-refresh" outlined size="small" :loading="loading"
          @click="cargar" class="cv-btn-refresh" />
        <Button label="Nuevo costo" icon="pi pi-plus" size="small"
          class="cv-btn-primary" @click="abrirNuevo" />
      </div>
    </div>

    <!-- ══ STATS BAR ════════════════════════════════════════════════════════ -->
    <div class="cv-stats">
      <div class="cv-stat">
        <span class="cv-stat-label">Total registrado</span>
        <span class="cv-stat-value">{{ formatMonto(totalMonto) }}</span>
      </div>
      <div class="cv-stat-div" />
      <div class="cv-stat">
        <span class="cv-stat-label">Compras</span>
        <span class="cv-stat-value" style="color:#1D4ED8">{{ formatMonto(totalPorAccion('compra')) }}</span>
      </div>
      <div class="cv-stat-div" />
      <div class="cv-stat">
        <span class="cv-stat-label">Pólizas</span>
        <span class="cv-stat-value" style="color:#166534">{{ formatMonto(totalPorAccion('poliza')) }}</span>
      </div>
      <div class="cv-stat-div" />
      <div class="cv-stat">
        <span class="cv-stat-label">Servicios</span>
        <span class="cv-stat-value" style="color:#7C3AED">{{ formatMonto(totalPorAccion('servicio_tecnico')) }}</span>
      </div>
      <div class="cv-stat-div" />
      <div class="cv-stat">
        <span class="cv-stat-label">Docs completos</span>
        <span class="cv-stat-value" style="color:#059669">{{ costos.filter(c => c.documentos_completos).length }} / {{ costos.length }}</span>
      </div>
    </div>

    <!-- ══ CONTENIDO PRINCIPAL ══════════════════════════════════════════════ -->
    <div :class="['cv-layout', panelVisible && 'cv-layout--split']">

      <!-- ── LISTA / TABLA ───────────────────────────────────────────────── -->
      <div class="cv-main">

        <!-- Filtros -->
        <div class="cv-filters">
          <div class="cv-search-wrap">
            <i class="pi pi-search cv-search-ico" />
            <input
              v-model="busqueda"
              placeholder="Buscar por proyecto, descripción…"
              class="cv-search"
            />
          </div>
          <Select
            v-model="filtroProyecto"
            :options="proyectos"
            optionLabel="nombre_comercial"
            optionValue="id"
            placeholder="Proyecto"
            showClear filter
            :loading="loadingProyectos"
            class="cv-sel"
            size="small"
            @change="cargar"
          />
          <Select
            v-model="filtroAccion"
            :options="OPCIONES_ACCION"
            optionLabel="label"
            optionValue="value"
            placeholder="Acción"
            showClear
            class="cv-sel"
            size="small"
            @change="cargar"
          />
          <Select
            v-model="filtroEquipo"
            :options="OPCIONES_EQUIPO"
            optionLabel="label"
            optionValue="value"
            placeholder="Equipo / Recurso"
            showClear
            class="cv-sel"
            size="small"
            @change="cargar"
          />
          <button
            v-if="hayFiltros"
            class="cv-clear-btn"
            @click="limpiarFiltros"
            title="Limpiar filtros"
          >
            <i class="pi pi-times text-[10px]" /> Limpiar
          </button>
        </div>

        <!-- Tabla compacta cuando el panel está abierto (lg+) -->
        <div v-if="panelVisible" class="cv-compact hidden lg:flex">
          <div v-if="!filtradas.length" class="cv-compact-empty">
            <i class="pi pi-inbox text-2xl mb-1" style="color:#c4b8d4" />
            <p class="text-xs" style="color:#9b89b5">Sin resultados</p>
          </div>
          <button
            v-for="c in filtradas"
            :key="c.id"
            class="cv-compact-row"
            :class="{ 'cv-compact-row--active': panelCosto?.id === c.id }"
            @click="abrirEditar(c)"
          >
            <span class="cv-compact-stripe" :style="{ background: accionColor(c.tipo_accion) }" />
            <div class="cv-compact-body">
              <div class="cv-compact-top">
                <span class="cv-compact-proyecto">{{ c.proyecto_nombre }}</span>
                <span class="cv-compact-monto">{{ formatMontoCorto(c.monto) }}</span>
              </div>
              <div class="cv-compact-bot">
                <span class="cv-pill-xs" :style="{ background: accionBg(c.tipo_accion), color: accionColor(c.tipo_accion) }">
                  {{ accionLabel(c.tipo_accion) }}
                </span>
                <span class="cv-compact-fecha">{{ formatFecha(c.fecha) }}</span>
              </div>
            </div>
            <div class="cv-compact-docs" :title="c.documentos_completos ? 'Docs completos' : 'Faltan documentos'">
              <i class="pi" :class="c.documentos_completos ? 'pi-check-circle' : 'pi-exclamation-circle'"
                :style="{ color: c.documentos_completos ? '#059669' : '#D97706', fontSize: '13px' }" />
            </div>
          </button>
        </div>

        <!-- Tabla completa -->
        <div :class="['cv-table-card', panelVisible && 'lg:hidden']">
          <div v-if="loading" class="cv-empty">
            <i class="pi pi-spin pi-spinner text-3xl" style="color:#915BD8" />
          </div>
          <div v-else-if="!filtradas.length" class="cv-empty">
            <i class="pi pi-receipt text-4xl mb-3" style="color:#c4b8d4" />
            <p class="text-sm font-semibold" style="color:#4B3F6B">
              {{ hayFiltros ? 'Sin resultados para los filtros aplicados' : 'Aún no hay costos variables' }}
            </p>
            <p class="text-xs mt-1" style="color:#a094b8">
              {{ hayFiltros ? 'Ajusta los filtros o limpia la búsqueda' : 'Presiona "Nuevo costo" para registrar el primero' }}
            </p>
            <button v-if="hayFiltros" class="cv-link-btn mt-3" @click="limpiarFiltros">
              Limpiar filtros
            </button>
          </div>
          <table v-else class="cv-table">
            <thead>
              <tr>
                <th style="width:4px;padding:0" />
                <th>Proyecto</th>
                <th>Acción</th>
                <th>Equipo / Recurso</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Documentos</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in filtradas"
                :key="c.id"
                class="cv-row"
                @click="abrirEditar(c)"
              >
                <td class="p-0">
                  <div class="cv-row-stripe" :style="{ background: accionColor(c.tipo_accion) }" />
                </td>
                <td>
                  <span class="cv-proyecto-name">{{ c.proyecto_nombre }}</span>
                </td>
                <td>
                  <span class="cv-pill" :style="{ background: accionBg(c.tipo_accion), color: accionColor(c.tipo_accion) }">
                    {{ accionLabel(c.tipo_accion) }}
                  </span>
                </td>
                <td class="text-xs text-gray-700">{{ equipoLabel(c.tipo_equipo) }}</td>
                <td>
                  <span class="cv-monto">{{ formatMonto(c.monto) }}</span>
                </td>
                <td class="text-xs text-gray-500">{{ formatFecha(c.fecha) }}</td>
                <td class="cv-desc" :title="c.descripcion">{{ c.descripcion }}</td>
                <td @click.stop>
                  <div class="cv-docs-row">
                    <span
                      v-for="doc in DOCS"
                      :key="doc.key"
                      class="cv-doc-badge"
                      :class="c[doc.url] ? 'cv-doc-badge--ok' : 'cv-doc-badge--miss'"
                      :title="c[doc.url] ? `${doc.label}: ${c[doc.nombre] || 'Adjunto'}` : `Falta: ${doc.label}`"
                    >
                      <a v-if="c[doc.url]" :href="c[doc.url]" target="_blank" class="cv-doc-link">{{ doc.short }}</a>
                      <span v-else>{{ doc.short }}</span>
                    </span>
                  </div>
                </td>
                <td @click.stop>
                  <div class="cv-row-actions">
                    <button class="cv-action-btn" title="Editar" @click="abrirEditar(c)">
                      <i class="pi pi-pencil" />
                    </button>
                    <button class="cv-action-btn cv-action-btn--danger" title="Eliminar" @click="confirmarEliminar(c)">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div><!-- /cv-main -->

      <!-- ── PANEL LATERAL FORMULARIO ──────────────────────────────────── -->
      <transition name="cv-slide">
        <div v-if="panelVisible" class="cv-panel">

          <!-- Panel header -->
          <div class="cv-panel-header">
            <div class="flex items-center gap-2">
              <div class="cv-panel-ico">
                <i class="pi" :class="modoPanel === 'nuevo' ? 'pi-plus' : 'pi-pencil'" />
              </div>
              <div>
                <p class="cv-panel-title">{{ modoPanel === 'nuevo' ? 'Nuevo costo variable' : 'Editar costo' }}</p>
                <p v-if="modoPanel === 'editar'" class="cv-panel-sub">{{ panelCosto?.proyecto_nombre }}</p>
              </div>
            </div>
            <button class="cv-panel-close" @click="cerrarPanel" title="Cerrar">
              <i class="pi pi-times" />
            </button>
          </div>

          <!-- Panel body -->
          <div class="cv-panel-body">

            <!-- ▸ Sección: Proyecto (solo al crear) -->
            <div v-if="modoPanel === 'nuevo'" class="cv-section">
              <div class="cv-section-title">
                <i class="pi pi-bolt" />Proyecto
              </div>
              <Select
                v-model="form.proyecto_id"
                :options="proyectos"
                optionLabel="nombre_comercial"
                optionValue="id"
                placeholder="Selecciona el proyecto…"
                filter showClear
                :loading="loadingProyectos"
                class="w-full"
                size="small"
              />
            </div>

            <!-- ▸ Sección: Tipo de acción -->
            <div class="cv-section">
              <div class="cv-section-title">
                <i class="pi pi-tag" />Tipo de acción
              </div>
              <div class="cv-accion-grid">
                <label
                  v-for="op in OPCIONES_ACCION"
                  :key="op.value"
                  class="cv-accion-card"
                  :class="{ 'cv-accion-card--active': form.tipo_accion === op.value }"
                  :style="form.tipo_accion === op.value ? `border-color:${op.color};background:${op.bg}` : ''"
                >
                  <input type="radio" v-model="form.tipo_accion" :value="op.value" class="hidden" />
                  <i :class="op.icon" :style="{ color: form.tipo_accion === op.value ? op.color : '#9990ad' }" />
                  <span :style="form.tipo_accion === op.value ? { color: op.color, fontWeight: 700 } : {}">
                    {{ op.label }}
                  </span>
                </label>
              </div>
            </div>

            <!-- ▸ Sección: Equipo / Recurso -->
            <div class="cv-section">
              <div class="cv-section-title">
                <i class="pi pi-cog" />Equipo o Recurso
              </div>
              <Select
                v-model="form.tipo_equipo"
                :options="OPCIONES_EQUIPO"
                optionLabel="label"
                optionValue="value"
                placeholder="Selecciona el tipo…"
                class="w-full"
                size="small"
              />
            </div>

            <!-- ▸ Sección: Monto y Fecha -->
            <div class="cv-section">
              <div class="cv-section-title">
                <i class="pi pi-dollar" />Monto y Fecha
              </div>
              <div class="cv-row-2">
                <div class="cv-field">
                  <label class="cv-label">Monto (COP) <span class="cv-req">*</span></label>
                  <InputNumber
                    v-model="form.monto"
                    :min="0"
                    :useGrouping="true"
                    placeholder="0"
                    class="w-full"
                    size="small"
                  />
                </div>
                <div class="cv-field">
                  <label class="cv-label">Fecha <span class="cv-req">*</span></label>
                  <DatePicker
                    v-model="form.fecha"
                    dateFormat="dd/mm/yy"
                    showButtonBar
                    class="w-full"
                    size="small"
                  />
                </div>
              </div>
            </div>

            <!-- ▸ Sección: Descripción y Observaciones -->
            <div class="cv-section">
              <div class="cv-section-title">
                <i class="pi pi-align-left" />Detalles
              </div>
              <div class="cv-field">
                <label class="cv-label">Descripción <span class="cv-req">*</span></label>
                <Textarea
                  v-model="form.descripcion"
                  rows="2"
                  placeholder="Describe brevemente el costo registrado…"
                  class="w-full"
                  autoResize
                  size="small"
                />
              </div>
              <div class="cv-field mt-2">
                <label class="cv-label">
                  Observaciones
                  <span class="cv-opt">(opcional)</span>
                </label>
                <Textarea
                  v-model="form.observaciones"
                  rows="2"
                  placeholder="Notas internas del equipo…"
                  class="w-full"
                  autoResize
                  size="small"
                />
              </div>
            </div>

            <!-- ▸ Aviso documentos (solo al crear) -->
            <div v-if="modoPanel === 'nuevo'" class="cv-docs-hint">
              <i class="pi pi-paperclip text-sm" style="color:#915BD8;flex-shrink:0" />
              <div>
                <p class="font-semibold" style="color:#4B3F6B;font-size:12px">Documentos adjuntos</p>
                <p style="font-size:11px;color:#9b89b5;margin-top:2px">
                  Factura, Cotización, RUT y Certificado bancario estarán disponibles para adjuntar
                  <strong>después de crear el registro</strong>. El panel permanece abierto para que los subas de inmediato.
                </p>
              </div>
            </div>

            <!-- ▸ Sección: Documentos (edición) -->
            <div v-if="modoPanel === 'editar'" class="cv-section">
              <div class="cv-section-title">
                <i class="pi pi-paperclip" />Documentos adjuntos
                <span class="cv-docs-status ml-auto"
                  :class="panelCosto?.documentos_completos ? 'cv-docs-status--ok' : 'cv-docs-status--miss'">
                  <i class="pi" :class="panelCosto?.documentos_completos ? 'pi-check-circle' : 'pi-exclamation-circle'" />
                  {{ panelCosto?.documentos_completos ? 'Completo' : 'Incompleto' }}
                </span>
              </div>
              <div class="cv-docs-grid">
                <div v-for="doc in DOCS" :key="doc.key" class="cv-doc-item">
                  <div class="cv-doc-item-header">
                    <span class="cv-doc-label">{{ doc.label }}</span>
                    <span class="cv-doc-state"
                      :class="panelCosto?.[doc.url] ? 'cv-doc-state--ok' : 'cv-doc-state--miss'">
                      {{ panelCosto?.[doc.url] ? 'Adjunto' : 'Pendiente' }}
                    </span>
                  </div>
                  <div class="cv-doc-actions">
                    <a
                      v-if="panelCosto?.[doc.url]"
                      :href="panelCosto[doc.url]"
                      target="_blank"
                      class="cv-doc-preview"
                      :title="panelCosto[doc.nombre] || 'Ver documento'"
                    >
                      <i class="pi pi-file-pdf text-[10px]" />
                      <span class="truncate max-w-[120px]">{{ panelCosto[doc.nombre] || 'Ver documento' }}</span>
                      <i class="pi pi-external-link text-[9px]" />
                    </a>
                    <label
                      class="cv-doc-upload"
                      :class="{ 'opacity-50 cursor-not-allowed': subiendoDoc[doc.key] }"
                    >
                      <i :class="subiendoDoc[doc.key] ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" />
                      {{ panelCosto?.[doc.url] ? 'Reemplazar' : 'Adjuntar' }}
                      <input
                        type="file"
                        class="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        :disabled="subiendoDoc[doc.key]"
                        @change="subirDoc(doc.key, $event)"
                      />
                    </label>
                    <button
                      v-if="panelCosto?.[doc.url]"
                      class="cv-doc-remove"
                      title="Quitar documento"
                      @click="eliminarDoc(doc.key)"
                    >
                      <i class="pi pi-times" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- /cv-panel-body -->

          <!-- Panel footer -->
          <div class="cv-panel-footer">
            <button class="cv-btn-cancel" @click="cerrarPanel" :disabled="guardando">
              Cancelar
            </button>
            <button
              class="cv-btn-save"
              :disabled="!puedeGuardar || guardando"
              @click="guardar"
            >
              <i :class="guardando ? 'pi pi-spin pi-spinner' : 'pi pi-check'" />
              {{ guardando ? 'Guardando…' : (modoPanel === 'nuevo' ? 'Crear registro' : 'Guardar cambios') }}
            </button>
          </div>

        </div><!-- /cv-panel -->
      </transition>

    </div><!-- /cv-layout -->

    <!-- ══ CONFIRM ════════════════════════════════════════════════════════ -->
    <ConfirmDialog />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import ConfirmDialog from 'primevue/confirmdialog'
import api from '@/api/client'

const confirm = useConfirm()
const toast   = useToast()

// ── Catálogos ────────────────────────────────────────────────────────────────
const OPCIONES_ACCION = [
  { label: 'Compra',                value: 'compra',              icon: 'pi pi-shopping-cart', color: '#1D4ED8', bg: '#EFF6FF' },
  { label: 'Póliza',               value: 'poliza',              icon: 'pi pi-shield',        color: '#166534', bg: '#F0FDF4' },
  { label: 'Servicio técnico',     value: 'servicio_tecnico',    icon: 'pi pi-wrench',        color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Mantenimiento',        value: 'mantenimiento',       icon: 'pi pi-hammer',        color: '#9A3412', bg: '#FFF7ED' },
  { label: 'Arriendo / Alquiler', value: 'arriendo',            icon: 'pi pi-building',      color: '#0F766E', bg: '#F0FDFA' },
  { label: 'Contratista',         value: 'contratista',         icon: 'pi pi-users',         color: '#9D174D', bg: '#FDF2F8' },
]

const OPCIONES_EQUIPO = [
  { label: 'Transformador de corriente',  value: 'transformador_corriente'  },
  { label: 'Transformador de potencia',   value: 'transformador_potencia'   },
  { label: 'Inversor',                    value: 'inversor'                 },
  { label: 'Panel / Módulo solar',        value: 'panel_solar'              },
  { label: 'Cable KCMIL',                value: 'cable_kcmil'              },
  { label: 'Estructura metálica',         value: 'estructura_metalica'      },
  { label: 'Medidor de energía',          value: 'medidor'                  },
  { label: 'Reconectador',               value: 'reconectador'             },
  { label: 'Batería / Almacenamiento',    value: 'bateria'                  },
  { label: 'Protecciones eléctricas',     value: 'protecciones'             },
  { label: 'Herramienta especializada',   value: 'herramienta'              },
  { label: 'Insumos / Materiales',        value: 'insumos'                  },
  { label: 'Contratación de persona',     value: 'contratacion_persona'     },
  { label: 'Transporte / Logística',      value: 'transporte'               },
  { label: 'Otro',                        value: 'otro'                     },
]

const DOCS = [
  { key: 'factura',             label: 'Factura',              short: 'FAC', url: 'url_factura',             nombre: 'nombre_factura' },
  { key: 'cotizacion',          label: 'Cotización',           short: 'COT', url: 'url_cotizacion',          nombre: 'nombre_cotizacion' },
  { key: 'rut',                 label: 'RUT',                  short: 'RUT', url: 'url_rut',                 nombre: 'nombre_rut' },
  { key: 'certificado_bancario',label: 'Certif. bancario',     short: 'CBA', url: 'url_certificado_bancario', nombre: 'nombre_certificado_bancario' },
]

// ── Estado ───────────────────────────────────────────────────────────────────
const proyectos        = ref([])
const loadingProyectos = ref(false)
const costos           = ref([])
const loading          = ref(false)

const filtroProyecto = ref(null)
const filtroAccion   = ref(null)
const filtroEquipo   = ref(null)
const busqueda       = ref('')

const panelVisible = ref(false)
const modoPanel    = ref('nuevo')   // 'nuevo' | 'editar'
const panelCosto   = ref(null)
const guardando    = ref(false)
const subiendoDoc  = ref({})

const formVacio = () => ({
  proyecto_id:   null,
  tipo_accion:   'compra',
  tipo_equipo:   null,
  monto:         null,
  fecha:         new Date(),
  descripcion:   '',
  observaciones: '',
})
const form = ref(formVacio())

// ── Computed ─────────────────────────────────────────────────────────────────
const hayFiltros = computed(() => !!(filtroProyecto.value || filtroAccion.value || filtroEquipo.value || busqueda.value))

const filtradas = computed(() => {
  let list = costos.value
  if (busqueda.value) {
    const q = busqueda.value.toLowerCase()
    list = list.filter(c =>
      (c.proyecto_nombre || '').toLowerCase().includes(q) ||
      (c.descripcion || '').toLowerCase().includes(q) ||
      (c.observaciones || '').toLowerCase().includes(q)
    )
  }
  return list
})

const puedeGuardar = computed(() => {
  const f = form.value
  return (modoPanel.value === 'editar' || f.proyecto_id) &&
    f.tipo_accion && f.tipo_equipo &&
    f.monto > 0 && f.fecha && f.descripcion?.trim()
})

const totalMonto       = computed(() => costos.value.reduce((s, c) => s + (c.monto || 0), 0))
const totalPorAccion   = (tipo) => costos.value.filter(c => c.tipo_accion === tipo).reduce((s, c) => s + (c.monto || 0), 0)

// ── Helpers UI ───────────────────────────────────────────────────────────────
function accionLabel(v)  { return OPCIONES_ACCION.find(o => o.value === v)?.label ?? v }
function accionColor(v)  { return OPCIONES_ACCION.find(o => o.value === v)?.color ?? '#915BD8' }
function accionBg(v)     { return OPCIONES_ACCION.find(o => o.value === v)?.bg ?? '#F5F2FB' }
function equipoLabel(v)  { return OPCIONES_EQUIPO.find(o => o.value === v)?.label ?? v }

function formatMonto(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)
}
function formatMontoCorto(v) {
  if (!v) return '$0'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}
function formatFecha(v) {
  if (!v) return '—'
  const d = new Date(v + 'T00:00:00')
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── API ───────────────────────────────────────────────────────────────────────
async function cargarProyectos() {
  loadingProyectos.value = true
  try {
    // Intenta primero el endpoint específico de operación
    const { data } = await api.get('/costos-variables/proyectos-operacion')
    if (Array.isArray(data) && data.length) {
      proyectos.value = data
      return
    }
  } catch { /* fallback abajo */ }

  // Fallback: todos los proyectos activos
  try {
    const [r1, r2] = await Promise.allSettled([
      api.get('/proyectos', { params: { limit: 500 } }),
      api.get('/proyectos', { params: { limit: 500, tipo_proyecto: 'minigranja' } }),
    ])
    const lista1 = r1.status === 'fulfilled' ? (Array.isArray(r1.value.data) ? r1.value.data : (r1.value.data.items ?? [])) : []
    const lista2 = r2.status === 'fulfilled' ? (Array.isArray(r2.value.data) ? r2.value.data : (r2.value.data.items ?? [])) : []
    const ids = new Set()
    proyectos.value = [...lista1, ...lista2]
      .filter(p => { if (ids.has(p.id)) return false; ids.add(p.id); return true })
      .sort((a, b) => a.nombre_comercial.localeCompare(b.nombre_comercial))
  } catch {
    proyectos.value = []
  } finally {
    loadingProyectos.value = false
  }
}

async function cargar() {
  loading.value = true
  try {
    const params = {}
    if (filtroProyecto.value) params.proyecto_id = filtroProyecto.value
    if (filtroAccion.value)   params.tipo_accion  = filtroAccion.value
    if (filtroEquipo.value)   params.tipo_equipo  = filtroEquipo.value
    const { data } = await api.get('/costos-variables', { params })
    costos.value = data
  } catch {
    costos.value = []
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtroProyecto.value = null
  filtroAccion.value   = null
  filtroEquipo.value   = null
  busqueda.value       = ''
  cargar()
}

onMounted(() => { cargarProyectos(); cargar() })

// ── Panel ─────────────────────────────────────────────────────────────────────
function abrirNuevo() {
  modoPanel.value    = 'nuevo'
  panelCosto.value   = null
  form.value         = formVacio()
  panelVisible.value = true
}

function abrirEditar(c) {
  modoPanel.value  = 'editar'
  panelCosto.value = { ...c }
  form.value = {
    proyecto_id:   c.proyecto_id,
    tipo_accion:   c.tipo_accion,
    tipo_equipo:   c.tipo_equipo,
    monto:         c.monto,
    fecha:         c.fecha ? new Date(c.fecha + 'T00:00:00') : new Date(),
    descripcion:   c.descripcion,
    observaciones: c.observaciones ?? '',
  }
  panelVisible.value = true
}

function cerrarPanel() {
  if (guardando.value) return
  panelVisible.value = false
}

async function guardar() {
  if (!puedeGuardar.value) return
  guardando.value = true
  try {
    const payload = {
      tipo_accion:   form.value.tipo_accion,
      tipo_equipo:   form.value.tipo_equipo,
      monto:         form.value.monto,
      fecha:         form.value.fecha instanceof Date
        ? form.value.fecha.toISOString().slice(0, 10)
        : form.value.fecha,
      descripcion:   form.value.descripcion.trim(),
      observaciones: form.value.observaciones?.trim() || null,
    }

    if (modoPanel.value === 'editar') {
      const { data } = await api.patch(`/costos-variables/${panelCosto.value.id}`, payload)
      panelCosto.value = data
      const idx = costos.value.findIndex(c => c.id === data.id)
      if (idx !== -1) costos.value[idx] = data
    } else {
      payload.proyecto_id = form.value.proyecto_id
      const { data } = await api.post('/costos-variables', payload)
      costos.value.unshift(data)
      panelCosto.value   = data
      modoPanel.value    = 'editar'
    }
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Costo registrado correctamente', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el costo', life: 3000 })
  } finally {
    guardando.value = false
  }
}

// ── Eliminar ──────────────────────────────────────────────────────────────────
function confirmarEliminar(c) {
  confirm.require({
    header:      'Eliminar costo variable',
    message:     `¿Eliminar el costo de ${formatMonto(c.monto)} — ${c.proyecto_nombre}? Esta acción no se puede deshacer.`,
    icon:        'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, eliminar',
    rejectLabel: 'Cancelar',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await api.delete(`/costos-variables/${c.id}`)
        costos.value = costos.value.filter(x => x.id !== c.id)
        if (panelCosto.value?.id === c.id) panelVisible.value = false
        toast.add({ severity: 'success', summary: 'Eliminado', life: 2500 })
      } catch {
        toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
      }
    },
  })
}

// ── Documentos ────────────────────────────────────────────────────────────────
async function subirDoc(tipoDoc, event) {
  const file = event.target.files?.[0]
  if (!file || !panelCosto.value) return
  subiendoDoc.value = { ...subiendoDoc.value, [tipoDoc]: true }
  const fd = new FormData()
  fd.append('archivo', file)
  try {
    const { data } = await api.post(
      `/costos-variables/${panelCosto.value.id}/documentos/${tipoDoc}`,
      fd,
    )
    panelCosto.value = data
    const idx = costos.value.findIndex(c => c.id === data.id)
    if (idx !== -1) costos.value[idx] = data
    toast.add({ severity: 'success', summary: 'Documento adjunto', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al subir documento', life: 3000 })
  } finally {
    subiendoDoc.value = { ...subiendoDoc.value, [tipoDoc]: false }
    event.target.value = ''
  }
}

async function eliminarDoc(tipoDoc) {
  if (!panelCosto.value) return
  try {
    const { data } = await api.delete(
      `/costos-variables/${panelCosto.value.id}/documentos/${tipoDoc}`,
    )
    panelCosto.value = data
    const idx = costos.value.findIndex(c => c.id === data.id)
    if (idx !== -1) costos.value[idx] = data
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar documento', life: 3000 })
  }
}
</script>

<style scoped>
/* ══ PAGE ══════════════════════════════════════════════════════════════════ */
.cv-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #F5F4F8;
  font-family: 'Sora', system-ui, sans-serif;
}

/* ══ HEADER ════════════════════════════════════════════════════════════════ */
.cv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 18px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 4px rgba(28,18,50,.05);
  position: sticky;
  top: 0;
  z-index: 30;
  flex-shrink: 0;
}
.cv-title {
  font-size: 15px;
  font-weight: 800;
  color: #2C2039;
}
.cv-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #F1EAF9;
  color: #6D28D9;
  font-size: 10px;
  font-weight: 800;
}

/* ══ STATS ═════════════════════════════════════════════════════════════════ */
.cv-stats {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 18px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
}
.cv-stat { display: flex; flex-direction: column; gap: 1px; padding: 0 12px; }
.cv-stat:first-child { padding-left: 0; }
.cv-stat-label { font-size: 10px; font-weight: 600; color: #9b89b5; text-transform: uppercase; letter-spacing: .05em; }
.cv-stat-value { font-size: 14px; font-weight: 800; color: #2C2039; }
.cv-stat-div   { width: 1px; height: 28px; background: #ECE7F2; flex-shrink: 0; }

/* ══ LAYOUT ════════════════════════════════════════════════════════════════ */
.cv-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.cv-layout--split .cv-main { flex: 1; min-width: 0; }
.cv-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 14px 18px 32px;
  gap: 12px;
}

/* ══ FILTROS ═══════════════════════════════════════════════════════════════ */
.cv-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cv-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 280px;
}
.cv-search-ico {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #9990ad;
  pointer-events: none;
}
.cv-search {
  width: 100%;
  padding: 6px 10px 6px 28px;
  font-size: 12.5px;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  background: #FDFCFF;
  color: #2C2039;
  outline: none;
  transition: border .12s;
  font-family: inherit;
}
.cv-search:focus { border-color: #915BD8; box-shadow: 0 0 0 2px rgba(145,91,216,.12); }
.cv-sel { min-width: 160px; max-width: 220px; }
.cv-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: #6B5A8A;
  background: transparent;
  border: 1px solid #E5E2EC;
  border-radius: 7px;
  cursor: pointer;
  transition: all .12s;
  font-family: inherit;
}
.cv-clear-btn:hover { background: #F5F2FB; color: #2C2039; border-color: #C9B8E8; }

/* ══ TABLA COMPLETA ════════════════════════════════════════════════════════ */
.cv-table-card {
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 12px;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(28,18,50,.04);
}
.cv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}
.cv-link-btn {
  background: none;
  border: none;
  color: #915BD8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
}
.cv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.cv-table thead tr {
  background: #FDFCFF;
  border-bottom: 1px solid #ECE7F2;
}
.cv-table th {
  padding: 9px 12px;
  text-align: left;
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #9b89b5;
  white-space: nowrap;
}
.cv-row {
  border-bottom: 1px solid #F5F2FB;
  cursor: pointer;
  transition: background .1s;
}
.cv-row:last-child { border-bottom: none; }
.cv-row:hover { background: #FDFCFF; }
.cv-table td { padding: 10px 12px; vertical-align: middle; }
.cv-row-stripe { width: 4px; height: 100%; min-height: 36px; border-radius: 2px; }
.cv-proyecto-name { font-size: 12.5px; font-weight: 700; color: #2C2039; }
.cv-monto { font-size: 13px; font-weight: 800; color: #2C2039; }
.cv-desc {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #5b5470;
  font-size: 12px;
}

/* Pills */
.cv-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.cv-pill-xs {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

/* Documentos en tabla */
.cv-docs-row { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.cv-doc-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 800;
}
.cv-doc-badge--ok   { background: #D1FAE5; color: #065F46; }
.cv-doc-badge--miss { background: #FEF3C7; color: #92400E; }
.cv-doc-link { color: inherit; text-decoration: none; }

/* Acciones en tabla */
.cv-row-actions { display: flex; align-items: center; justify-content: center; gap: 4px; }
.cv-action-btn {
  width: 28px; height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  color: #8a7fa3;
  cursor: pointer;
  transition: background .12s, color .12s;
  font-size: 12px;
}
.cv-action-btn:hover { background: #F1EAF9; color: #6D28D9; }
.cv-action-btn--danger:hover { background: #FEE2E2; color: #DC2626; }

/* ══ COMPACT LIST (panel abierto) ══════════════════════════════════════════ */
.cv-compact {
  flex-direction: column;
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(28,18,50,.04);
}
.cv-compact-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 16px; color: #9b89b5;
}
.cv-compact-row {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #F5F2FB;
  cursor: pointer;
  text-align: left;
  transition: background .1s;
  padding: 0;
  font-family: inherit;
}
.cv-compact-row:last-child { border-bottom: none; }
.cv-compact-row:hover { background: #FDFCFF; }
.cv-compact-row--active { background: #F5F0FD !important; }
.cv-compact-stripe { width: 4px; align-self: stretch; flex-shrink: 0; }
.cv-compact-body { flex: 1; padding: 9px 10px; min-width: 0; }
.cv-compact-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}
.cv-compact-proyecto { font-size: 12px; font-weight: 700; color: #2C2039; truncate: true; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-compact-monto    { font-size: 12px; font-weight: 800; color: #2C2039; white-space: nowrap; flex-shrink: 0; }
.cv-compact-bot { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.cv-compact-fecha { font-size: 10px; color: #9990ad; flex-shrink: 0; }
.cv-compact-docs { padding: 0 10px; flex-shrink: 0; }

/* ══ PANEL LATERAL ══════════════════════════════════════════════════════════ */
.cv-panel {
  width: 420px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #ECE7F2;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.cv-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #ECE7F2;
  background: #FDFCFF;
  flex-shrink: 0;
}
.cv-panel-ico {
  width: 32px; height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, #915BD8, #6D28D9);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-size: 13px;
  flex-shrink: 0;
}
.cv-panel-title { font-size: 13.5px; font-weight: 800; color: #2C2039; }
.cv-panel-sub   { font-size: 11px; color: #9b89b5; margin-top: 1px; }
.cv-panel-close {
  width: 28px; height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  color: #9990ad;
  cursor: pointer;
  font-size: 13px;
  transition: background .12s, color .12s;
}
.cv-panel-close:hover { background: #F5F2FB; color: #DC2626; }

.cv-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scrollbar-width: thin;
  scrollbar-color: #C9B8E8 transparent;
}

/* Secciones del formulario */
.cv-section {
  background: #FDFCFF;
  border: 1px solid #ECE7F2;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cv-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: #6D28D9;
}
.cv-section-title .pi { font-size: 11px; }

.cv-field { display: flex; flex-direction: column; gap: 4px; }
.cv-label { font-size: 11.5px; font-weight: 700; color: #4B3F6B; }
.cv-req   { color: #DC2626; }
.cv-opt   { font-weight: 400; color: #9b89b5; font-size: 10.5px; }
.cv-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Radio cards de tipo de acción */
.cv-accion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.cv-accion-card {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1.5px solid #E5E2EC;
  background: #FDFCFF;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #6B5A8A;
  transition: all .15s;
}
.cv-accion-card:hover { border-color: #C9B8E8; background: #F9F6FE; }
.cv-accion-card--active { box-shadow: 0 0 0 1px currentColor inset; }
.cv-accion-card .pi { font-size: 13px; flex-shrink: 0; }

/* Documentos en el panel */
.cv-docs-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}
.cv-docs-status--ok   { background: #D1FAE5; color: #065F46; }
.cv-docs-status--miss { background: #FEF3C7; color: #92400E; }

.cv-docs-grid { display: flex; flex-direction: column; gap: 8px; }
.cv-doc-item {
  border: 1px solid #ECE7F2;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.cv-doc-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cv-doc-label { font-size: 11.5px; font-weight: 700; color: #4B3F6B; }
.cv-doc-state {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}
.cv-doc-state--ok   { background: #D1FAE5; color: #065F46; }
.cv-doc-state--miss { background: #F3F4F6; color: #6B7280; }
.cv-doc-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cv-doc-preview {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #6D28D9;
  text-decoration: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.cv-doc-preview:hover { text-decoration: underline; }
.cv-doc-upload {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 6px;
  background: #F1EAF9;
  color: #6D28D9;
  cursor: pointer;
  transition: background .12s;
  white-space: nowrap;
}
.cv-doc-upload:hover { background: #E5D8F8; }
.cv-doc-remove {
  width: 24px; height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  color: #9CA3AF;
  cursor: pointer;
  font-size: 11px;
  transition: all .12s;
  flex-shrink: 0;
}
.cv-doc-remove:hover { background: #FEE2E2; color: #DC2626; }

/* Panel footer */
.cv-panel-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #ECE7F2;
  background: #FDFCFF;
  flex-shrink: 0;
}
/* Aviso documentos al crear */
.cv-docs-hint {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #F5F0FD;
  border: 1px dashed #C9B8E8;
  border-radius: 10px;
}

.cv-btn-cancel {
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 700;
  color: #6B5A8A;
  background: transparent;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  cursor: pointer;
  transition: all .12s;
  font-family: inherit;
}
.cv-btn-cancel:hover:not(:disabled) { background: #F5F2FB; }
.cv-btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
.cv-btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 12.5px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #915BD8, #6D28D9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity .12s, transform .1s;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(109,40,217,.3);
}
.cv-btn-save:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.cv-btn-save:disabled { opacity: .45; cursor: not-allowed; transform: none; }

/* Botones del header */
.cv-btn-primary {
  background: linear-gradient(135deg, #915BD8, #6D28D9) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(109,40,217,.25) !important;
  font-weight: 700 !important;
}
.cv-btn-refresh { color: #915BD8 !important; border-color: #C9B8E8 !important; }

/* ══ TRANSICIÓN PANEL ═══════════════════════════════════════════════════════ */
.cv-slide-enter-active,
.cv-slide-leave-active { transition: width .2s ease, opacity .18s ease; overflow: hidden; }
.cv-slide-enter-from,
.cv-slide-leave-to { width: 0 !important; opacity: 0; }
.cv-slide-enter-to,
.cv-slide-leave-from { width: 420px; opacity: 1; }

/* ══ RESPONSIVE ══════════════════════════════════════════════════════════════ */
@media (max-width: 1023px) {
  .cv-panel {
    position: fixed;
    right: 0; top: 0; bottom: 0;
    width: min(420px, 100vw) !important;
    z-index: 50;
    box-shadow: -4px 0 24px rgba(28,18,50,.12);
  }
}
@media (max-width: 640px) {
  .cv-main  { padding: 10px 12px 24px; }
  .cv-stats { padding: 6px 12px; }
  .cv-header { padding: 8px 12px; }
  .cv-row-2 { grid-template-columns: 1fr; }
  .cv-accion-grid { grid-template-columns: 1fr 1fr; }
  .cv-sel   { min-width: 130px; }
}
</style>
