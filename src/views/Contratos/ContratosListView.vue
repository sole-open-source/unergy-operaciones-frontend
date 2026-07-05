<template>
  <div class="space-y-5">
    <!-- Header con acción -->
    <PageHeader title="Servicios" subtitle="Gestión de contratos y servicios por tipo">
      <template #actions>
        <Button v-if="servicioActivo === 'ppa'" label="Nuevo contrato PPA" icon="pi pi-plus" size="small"
          class="bg-amber-500 border-amber-500 hover:bg-amber-600" @click="showWizard = true" />
        <Button v-else-if="servicioActivo !== 'ppa' && servicioActivo !== 'representacion'"
          :label="`Nuevo ${servicioInfo?.label}`" icon="pi pi-plus" size="small"
          :style="`background:${servicioInfo?.color}; border-color:${servicioInfo?.color}`"
          @click="showServicioWizard = true" />
      </template>
    </PageHeader>

    <!-- Selector de servicio (tabs compactos) -->
    <div class="flex flex-wrap gap-2">
      <button v-for="srv in SERVICIOS" :key="srv.key" type="button"
        class="svc-tab" :class="{ 'svc-tab--on': servicioActivo === srv.key }"
        :style="servicioActivo === srv.key ? `background:${srv.bg}; border-color:${srv.color}55; color:${srv.color}` : ''"
        @click="seleccionarServicio(srv.key)">
        <i :class="srv.icon" :style="servicioActivo === srv.key ? `color:${srv.color}` : ''" />
        <span>{{ srv.label }}</span>
        <span v-if="conteoServicio(srv.key) > 0" class="svc-tab-count"
          :style="servicioActivo === srv.key ? `background:${srv.color}22; color:${srv.color}` : ''">{{ conteoServicio(srv.key) }}</span>
      </button>
    </div>

    <!-- PPA -->
    <template v-if="servicioActivo === 'ppa'">
      <div class="flex gap-3 items-center">
        <IconField class="flex-1 max-w-sm">
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroQ" placeholder="Buscar por proyecto, nombre, comprador…"
            class="w-full" @input="buscar" />
        </IconField>
      </div>

      <BaseDataTable
        :value="contratosFiltrados"
        :columns="ppaColumns"
        :loading="loading"
        :rows="20"
        sortField="fecha_inicio"
        :sortOrder="1"
        emptyMessage="No hay contratos PPA registrados."
        actionsStyle="width:120px"
      >
        <template #cell-nombre_interno="{ data }">
          <span class="font-medium text-gray-800">{{ data.nombre_interno || '—' }}</span>
        </template>
        <template #cell-tipo_contrato="{ data }">
          <Tag :value="(data.tipo_contrato === 'compra') ? 'Compra' : 'Venta'"
            :style="(data.tipo_contrato === 'compra')
              ? 'background:#915BD8;color:#fff'
              : 'background:#F6FF72;color:#2C2039'" class="text-xs" />
        </template>
        <template #cell-numero_codigo_contrato="{ data }">
          <span class="font-mono text-xs text-gray-500">{{ data.numero_codigo_contrato || '—' }}</span>
        </template>
        <template #cell-comprador="{ data }">{{ data.comprador_nombre || '—' }}</template>
        <template #cell-vendedor="{ data }">{{ data.vendedor_nombre || '—' }}</template>
        <template #cell-dias="{ data }">
          <span v-if="data.dias_restantes != null" class="font-mono text-xs"
            :style="{ color: data.dias_restantes <= 30 ? '#D64455' : data.dias_restantes <= 90 ? '#CA8A04' : '#6b5a8a' }">
            {{ data.dias_restantes }}d
          </span>
          <span v-else class="text-xs" style="color: #9CA3AF;">—</span>
        </template>
        <template #cell-cumplimiento="{ data }">
          <Tag v-if="data.estado_cumplimiento"
            :value="CUMPLIMIENTO_LABELS[data.estado_cumplimiento] || data.estado_cumplimiento"
            :severity="CUMPLIMIENTO_SEVERITY[data.estado_cumplimiento] || 'secondary'" class="text-xs" />
          <span v-else class="text-xs" style="color: #9CA3AF;">—</span>
        </template>
        <template #cell-cobertura="{ data }">
          <div v-if="data.cobertura_actual_pct != null" class="flex items-center gap-1.5">
            <div class="flex-1 h-2 rounded-full overflow-hidden" style="background: #f3f0f7;">
              <div class="h-full rounded-full"
                :style="{
                  width: Math.min(data.cobertura_actual_pct, 100) + '%',
                  backgroundColor: data.cobertura_actual_pct >= 90 ? '#10B981' : data.cobertura_actual_pct >= 70 ? '#F0C040' : '#D64455'
                }" />
            </div>
            <span class="text-[10px] font-mono w-8 text-right" style="color: #6b5a8a;">{{ data.cobertura_actual_pct }}%</span>
          </div>
          <span v-else class="text-xs" style="color: #9CA3AF;">—</span>
        </template>
        <template #actions="{ data }">
          <Button icon="pi pi-copy" text size="small" severity="secondary"
            v-tooltip.top="'Duplicar contrato'"
            @click.stop="duplicarContrato(data)" />
          <Button icon="pi pi-arrow-right" text size="small" severity="secondary"
            @click.stop="irAContrato(data)" v-tooltip="'Ver detalle'" />
          <Button icon="pi pi-trash" text size="small" severity="danger"
            v-tooltip.top="'Eliminar contrato'"
            @click.stop="confirmarEliminar(data)" />
        </template>
      </BaseDataTable>
    </template>

    <!-- REPRESENTACIÓN — Lista de plantas -->
    <template v-else-if="servicioActivo === 'representacion'">
      <div class="flex gap-3 items-center">
        <IconField class="flex-1 max-w-sm">
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroRepresentacion" placeholder="Buscar por planta, representante, comercializador…"
            class="w-full" />
        </IconField>
      </div>

      <BaseDataTable
        :value="plantasRepresentacionFiltradas"
        :columns="representacionColumns"
        :loading="loadingPlantas"
        :rows="20"
        sortField="nombre_comercial"
        :sortOrder="1"
        emptyMessage="No hay plantas con servicio de representación."
        actionsStyle="width:50px"
      >
        <template #cell-nombre_comercial="{ data }">
          <span class="font-medium text-gray-800">{{ data.nombre_comercial }}</span>
        </template>
        <template #cell-potencia_instalada_kwp="{ data }">
          <span class="text-gray-600">{{ data.potencia_instalada_kwp ? Number(data.potencia_instalada_kwp).toLocaleString('es-CO') : '—' }}</span>
        </template>
        <template #cell-estado="{ data }">
          <Tag :value="ESTADO_PROYECTO_LABELS[data.estado] || data.estado"
            :severity="ESTADO_PROYECTO_SEVERITY[data.estado]" />
        </template>
        <template #cell-ubicacion="{ data }">
          <span class="text-gray-600 text-xs">{{ [data.municipio, data.departamento].filter(Boolean).join(', ') || '—' }}</span>
        </template>
        <template #cell-representante="{ data }">
          <span class="text-gray-700">{{ data.servicio_representacion?.nombre_rf || '—' }}</span>
        </template>
        <template #cell-modalidad="{ data }">
          <Tag v-if="data.servicio_representacion?.modalidad_venta"
            :value="MODALIDAD_LABELS[data.servicio_representacion.modalidad_venta] || data.servicio_representacion.modalidad_venta"
            severity="info" />
          <span v-else class="text-gray-300">—</span>
        </template>
        <template #cell-despacho="{ data }">
          <span class="font-mono text-xs text-gray-500">{{ data.servicio_representacion?.codigo_despacho_xm || '—' }}</span>
        </template>
        <template #cell-cgm="{ data }">
          <i v-if="data.srv_cgm" class="pi pi-check-circle text-green-500" v-tooltip="'Tiene CGM'" />
          <i v-else class="pi pi-minus text-gray-300" />
        </template>
        <template #actions="{ data }">
          <Button icon="pi pi-arrow-right" text size="small" severity="secondary"
            @click.stop="irAProyecto(data)" v-tooltip="'Ver planta'" />
        </template>
      </BaseDataTable>
    </template>

    <!-- OPERACIÓN / REC — contratos de servicio -->
    <template v-else>
      <div class="flex gap-3 items-center">
        <IconField class="flex-1 max-w-sm">
          <InputIcon class="pi pi-search" />
          <InputText v-model="filtroServicio" placeholder="Buscar por número, contratante, prestador…"
            class="w-full" @input="buscarServicio" />
        </IconField>
      </div>

      <BaseDataTable
        :value="contratosServicioFiltrados"
        :columns="servicioColumns"
        :loading="loadingServicio"
        :rows="20"
        sortField="fecha_inicio"
        :sortOrder="1"
        :emptyMessage="`No hay contratos de ${servicioInfo?.label} registrados.`"
      >
        <template #cell-numero_contrato="{ data }">
          <span class="font-mono text-xs text-gray-500">{{ data.numero_contrato || '—' }}</span>
        </template>
        <template #cell-contratante="{ data }">{{ data.contratante_nombre || '—' }}</template>
        <template #cell-prestador="{ data }">{{ data.prestador_nombre || '—' }}</template>
        <template #cell-estado="{ data }">
          <Tag :value="ESTADO_LABELS[data.estado] || data.estado" :severity="ESTADO_SEVERITY[data.estado]" />
        </template>
      </BaseDataTable>
    </template>

    <!-- Wizards -->
    <PPAContratoWizard v-if="showWizard" :visible="showWizard"
      :initialData="contratoADuplicar"
      @cerrar="onWizardCerrar" @creado="onContratoCreado" />

    <ContratoServicioWizard
      v-if="showServicioWizard"
      :visible="showServicioWizard"
      :tipo="servicioActivo"
      @cerrar="showServicioWizard = false"
      @creado="onServicioCreado" />

    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import ConfirmDialog from 'primevue/confirmdialog'
import BaseDataTable from '@/components/crud/BaseDataTable.vue'
import PPAContratoWizard from './PPAContratoWizard.vue'
import ContratoServicioWizard from './ContratoServicioWizard.vue'
import api from '@/api/client'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const SERVICIOS = [
  { key: 'ppa',           label: 'PPA',           icon: 'pi pi-bolt',      color: '#f59e0b', bg: '#fffbeb' },
  { key: 'representacion',label: 'Representación', icon: 'pi pi-file-edit', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'operacion',     label: 'Operación',      icon: 'pi pi-chart-bar', color: '#10b981', bg: '#f0fdf4' },
  { key: 'rec',           label: 'REC',            icon: 'pi pi-verified',  color: '#14b8a6', bg: '#f0fdfa' },
]

// ── Definición de columnas para BaseDataTable ────────────────────────────────
// Las celdas con formato/estilo se resuelven vía slots `cell-<field|slot>`.
const ppaColumns = [
  { field: 'nombre_interno', header: 'Nombre interno', sortable: true },
  { field: 'tipo_contrato', header: 'Tipo', sortable: true, style: 'width:90px' },
  { field: 'numero_codigo_contrato', header: 'N° contrato', sortable: true, style: 'width:160px' },
  { header: 'Comprador', slot: 'comprador' },
  { header: 'Vendedor', slot: 'vendedor' },
  { field: 'fecha_inicio', header: 'Inicio', sortable: true, style: 'width:100px', format: (v) => formatFecha(v) },
  { field: 'fecha_fin', header: 'Fin', sortable: true, style: 'width:100px', format: (v) => formatFecha(v) },
  { header: 'Días rest.', slot: 'dias', style: 'width:90px' },
  { header: 'Cumplimiento', slot: 'cumplimiento', style: 'width:120px' },
  { header: 'Cobertura', slot: 'cobertura', style: 'width:120px' },
]

const representacionColumns = [
  { field: 'nombre_comercial', header: 'Planta', sortable: true },
  { field: 'potencia_instalada_kwp', header: 'Potencia (kWp)', sortable: true, style: 'width:130px' },
  { field: 'estado', header: 'Estado', sortable: true, style: 'width:130px' },
  { header: 'Ubicación', slot: 'ubicacion', style: 'width:180px' },
  { header: 'Representante', slot: 'representante', style: 'width:180px' },
  { header: 'Modalidad venta', slot: 'modalidad', style: 'width:160px' },
  { header: 'Cód. despacho XM', slot: 'despacho', style: 'width:140px' },
  { header: 'CGM', slot: 'cgm', style: 'width:60px' },
]

const servicioColumns = [
  { field: 'numero_contrato', header: 'N° contrato', sortable: true, style: 'width:160px' },
  { header: 'Contratante', slot: 'contratante' },
  { header: 'Prestador', slot: 'prestador' },
  { field: 'fecha_inicio', header: 'Inicio', sortable: true, style: 'width:100px', format: (v) => formatFecha(v) },
  { field: 'fecha_fin', header: 'Fin', sortable: true, style: 'width:100px', format: (v) => formatFecha(v) },
  { header: 'Estado', slot: 'estado', style: 'width:120px' },
]

const ESTADO_LABELS = {
  vigente:      'Vigente',
  vencido:      'Vencido',
  terminado:    'Terminado',
  en_renovacion:'En renovación',
}
const ESTADO_SEVERITY = {
  vigente:      'success',
  vencido:      'danger',
  terminado:    'secondary',
  en_renovacion:'warn',
}

const ESTADO_PROYECTO_LABELS = {
  en_desarrollo: 'En desarrollo',
  en_operacion:  'En operación',
  suspendido:    'Suspendido',
  cancelado:     'Cancelado',
}
const ESTADO_PROYECTO_SEVERITY = {
  en_desarrollo: 'warn',
  en_operacion:  'success',
  suspendido:    'danger',
  cancelado:     'secondary',
}

const MODALIDAD_LABELS = {
  bolsa_directa:        'Bolsa directa',
  bolsa_comercializador:'Bolsa comercializador',
  ppa:                  'PPA',
  interna:              'Interna',
}

const CUMPLIMIENTO_LABELS = {
  on_track: 'Al día',
  at_risk: 'En riesgo',
  deficit: 'Déficit',
}
const CUMPLIMIENTO_SEVERITY = {
  on_track: 'success',
  at_risk: 'warn',
  deficit: 'danger',
}

const servicioActivo = ref('ppa')
const showWizard = ref(false)
const showServicioWizard = ref(false)
const contratoADuplicar = ref(null)

function duplicarContrato(contrato) {
  contratoADuplicar.value = contrato
  showWizard.value = true
}

function confirmarEliminar(contrato) {
  confirm.require({
    message: `¿Seguro que deseas eliminar el contrato "${contrato.nombre_interno || contrato.numero_codigo_contrato || 'sin nombre'}"? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await api.delete(`/ppa/${contrato.id}`)
        contratos.value = contratos.value.filter(c => c.id !== contrato.id)
        toast.add({ severity: 'success', summary: 'Contrato eliminado', life: 2000 })
      } catch (e) {
        const detail = e.response?.data?.detail
        toast.add({
          severity: 'error',
          summary: 'No se puede eliminar',
          detail: detail || 'Error al eliminar el contrato.',
          life: 6000,
        })
      }
    },
  })
}

function onWizardCerrar() {
  showWizard.value = false
  contratoADuplicar.value = null
}

const servicioInfo = computed(() => SERVICIOS.find(s => s.key === servicioActivo.value))

// PPA
const contratos = ref([])
const loading = ref(false)
const filtroQ = ref('')

const contratosFiltrados = computed(() => {
  const q = filtroQ.value.toLowerCase()
  if (!q) return contratos.value
  return contratos.value.filter(c =>
    (c.nombre_interno ?? '').toLowerCase().includes(q) ||
    (c.numero_codigo_contrato ?? '').toLowerCase().includes(q) ||
    (c.comprador_nombre ?? '').toLowerCase().includes(q) ||
    (c.proyectos ?? []).some(p => (p.nombre_comercial ?? '').toLowerCase().includes(q))
  )
})

// Plantas con representación
const plantasRepresentacion = ref([])
const loadingPlantas = ref(false)
const filtroRepresentacion = ref('')

const plantasRepresentacionFiltradas = computed(() => {
  const q = filtroRepresentacion.value.toLowerCase()
  if (!q) return plantasRepresentacion.value
  return plantasRepresentacion.value.filter(p =>
    (p.nombre_comercial ?? '').toLowerCase().includes(q) ||
    (p.servicio_representacion?.nombre_rf ?? '').toLowerCase().includes(q) ||
    (p.servicio_representacion?.nombre_comercializador ?? '').toLowerCase().includes(q) ||
    (p.departamento ?? '').toLowerCase().includes(q) ||
    (p.municipio ?? '').toLowerCase().includes(q)
  )
})

// Otros servicios (operación, rec)
const contratosServicio = ref([])
const loadingServicio = ref(false)
const filtroServicio = ref('')

const contratosServicioFiltrados = computed(() => {
  const q = filtroServicio.value.toLowerCase()
  if (!q) return contratosServicio.value
  return contratosServicio.value.filter(c =>
    (c.numero_contrato ?? '').toLowerCase().includes(q) ||
    (c.contratante_nombre ?? '').toLowerCase().includes(q) ||
    (c.prestador_nombre ?? '').toLowerCase().includes(q)
  )
})

function conteoServicio(key) {
  if (key === 'ppa') return contratos.value.length
  if (key === 'representacion' && servicioActivo.value === 'representacion') return plantasRepresentacion.value.length
  if (key === servicioActivo.value) return contratosServicio.value.length
  return 0
}

function seleccionarServicio(key) {
  servicioActivo.value = key
  filtroServicio.value = ''
  filtroRepresentacion.value = ''
  if (key === 'ppa') cargar()
  else if (key === 'representacion') cargarPlantasRepresentacion()
  else cargarServicio(key)
}

function formatFecha(f) {
  if (!f) return '—'
  return String(f).slice(0, 10)
}

function irAContrato(data) {
  router.push(`/contratos/${data.id}`)
}

function irAProyecto(data) {
  router.push(`/proyectos/${data.id}`)
}

let buscarTimeout = null
function buscar() {
  clearTimeout(buscarTimeout)
  buscarTimeout = setTimeout(cargar, 350)
}

let buscarServicioTimeout = null
function buscarServicio() {
  clearTimeout(buscarServicioTimeout)
}

function onContratoCreado() {
  cargar()
}

function onServicioCreado() {
  cargarServicio(servicioActivo.value)
}

async function cargar() {
  loading.value = true
  try {
    const params = {}
    if (filtroQ.value) params.q = filtroQ.value
    const { data } = await api.get('/ppa', { params })
    contratos.value = data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar contratos', detail: e.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

async function cargarPlantasRepresentacion() {
  loadingPlantas.value = true
  try {
    const { data } = await api.get('/proyectos', { params: { servicio: 'representacion', size: 500 } })
    plantasRepresentacion.value = data.items
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar plantas', detail: e.message, life: 3000 })
  } finally {
    loadingPlantas.value = false
  }
}

async function cargarServicio(tipo) {
  loadingServicio.value = true
  try {
    const { data } = await api.get('/contratos-servicio', { params: { tipo } })
    contratosServicio.value = data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar contratos', detail: e.message, life: 3000 })
  } finally {
    loadingServicio.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.svc-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px; border: 1px solid #E5E2EC; border-radius: 9px;
  background: #fff; font-size: 13px; font-weight: 700; color: #6b7280;
  cursor: pointer; transition: border-color .12s, color .12s, background .12s; user-select: none;
}
.svc-tab:hover { border-color: #cbb8e8; color: #2C2039; }
.svc-tab i { font-size: 14px; color: #9ca3af; }
.svc-tab--on { box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.svc-tab-count {
  background: #EEF0F2; color: #6b7280; border-radius: 999px;
  font-size: 11px; font-weight: 800; padding: 0 7px; min-width: 20px; text-align: center;
}
</style>
