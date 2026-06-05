<template>
  <div class="space-y-4 p-3 sm:p-4" style="background:#FDFAF7; min-height:100vh">

    <!-- Header -->
    <div class="flex items-center gap-3 flex-wrap">
      <Button icon="pi pi-arrow-left" text @click="$router.back()" />
      <div>
        <h2 class="text-lg font-semibold" style="color:#2C2039">
          {{ liq?.proyecto_nombre }} — {{ formatPeriodo(liq?.periodo) }}
        </h2>
        <Tag v-if="liq" :value="liq.estado" :severity="estadoSeverity(liq.estado)" class="text-xs mt-0.5" />
      </div>
      <div class="ml-auto flex gap-2 flex-wrap items-center">
        <a v-if="liq?.estado_resultados_url" :href="liq.estado_resultados_url" target="_blank"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
          style="background:#F6FF72; color:#2C2039">
          <i class="pi pi-chart-line text-xs" />Estado de Resultados
        </a>
        <Button label="Editar resumen" icon="pi pi-calculator" outlined size="small"
          style="border-color:#915BD8; color:#915BD8" @click="abrirEditResumen" />
        <Button label="Estado" icon="pi pi-pencil" outlined size="small"
          style="border-color:#2C2039; color:#2C2039" @click="dialogEstado = true" />
      </div>
    </div>

    <ProgressSpinner v-if="loading" class="block mx-auto" />

    <template v-if="!loading && liq">

      <!-- Banner filtro por inversionista -->
      <div v-if="invFiltroId && invFiltrado"
        class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm flex-wrap"
        style="background:rgba(145,91,216,0.08); border:1px solid rgba(145,91,216,0.2)">
        <i class="pi pi-user shrink-0" style="color:#915BD8" />
        <span style="color:#2C2039">
          Mostrando datos de:
          <strong>{{ invFiltrado.cliente_nombre }}</strong>
          ({{ pct(invFiltrado.porcentaje_participacion) }})
        </span>
        <button class="ml-auto flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 shrink-0"
          style="color:#915BD8"
          @click="router.push(`/liquidaciones/${route.params.id}`)">
          <i class="pi pi-times-circle text-xs" />
          Ver proyecto completo
        </button>
      </div>

      <!-- Comparación financiera Ingresos vs Costos (waterfall) -->
      <IngresoCostoWaterfall :liq="liq" />

      <!-- Hero: Estado de Resultados + Generación del mes (responsive, simétrico) -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <EstadoResultados :liq="liq" class="h-full" />
        <GeneracionMensualChart class="h-full" :proyecto-id="liq.proyecto_id" :proyecto-nombre="liq.proyecto_nombre" :periodo="liq.periodo" />
      </div>

      <!-- Datos adicionales: comprobante, consecutivos -->
      <div class="bg-white rounded-xl shadow-sm border px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs" style="color:#2C2039;border-color:#e8e0f0">
        <span><span class="text-gray-400">Comprobante:</span>
          <strong class="ml-1">{{ liq.comprobante_contable_ref || '—' }}</strong></span>
        <span><span class="text-gray-400">Consec. Ingresos:</span>
          <strong class="ml-1">{{ liq.consecutivo_inicial_ingresos ?? '—' }}</strong></span>
        <span><span class="text-gray-400">Consec. Costos:</span>
          <strong class="ml-1">{{ liq.consecutivo_inicial_costos ?? '—' }}</strong></span>
        <span><span class="text-gray-400">Tasa cambio:</span>
          <strong class="ml-1">{{ liq.tasa_cambio ?? '—' }}</strong></span>
        <span v-if="liq.observaciones_resultados" class="text-gray-500 italic">
          {{ liq.observaciones_resultados }}</span>
      </div>

      <!-- Las secciones editables (Ingresos/Costos/Servicios) se consolidaron en el
           Estado de Resultados de arriba (con soportes inline). -->
    </template>

    <!-- ─── Dialog: Estado ───────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogEstado" header="Actualizar estado" modal class="w-72">
      <div class="space-y-3 py-2">
        <Select v-model="nuevoEstado" :options="estadosOpciones" class="w-full" />
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogEstado = false" />
          <Button label="Guardar" size="small" :loading="guardando" @click="guardarEstado" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Resumen financiero ──────────────────────────────────── -->
    <Dialog v-model:visible="dialogResumen" header="Editar resumen financiero" modal class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tasa de cambio (USD/COP)</label>
          <InputNumber v-model="resumenForm.tasa_cambio" :maxFractionDigits="4" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Comprobante contable</label>
          <InputText v-model="resumenForm.comprobante_contable_ref" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Consecutivo inicial ingresos</label>
          <InputNumber v-model="resumenForm.consecutivo_inicial_ingresos" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Consecutivo inicial costos</label>
          <InputNumber v-model="resumenForm.consecutivo_inicial_costos" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Fecha inicio proceso</label>
          <DatePicker v-model="resumenForm.fecha_inicio_proceso" dateFormat="yy-mm-dd" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Fecha firma</label>
          <DatePicker v-model="resumenForm.fecha_firma" dateFormat="yy-mm-dd" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">URL estado de resultados</label>
          <InputText v-model="resumenForm.estado_resultados_url" class="w-full" placeholder="https://..." />
        </div>
        <div class="flex flex-col gap-1 col-span-2">
          <label class="text-xs text-gray-600">Observaciones</label>
          <Textarea v-model="resumenForm.observaciones_resultados" rows="2" class="w-full" />
        </div>
        <div class="col-span-2 flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogResumen = false" />
          <Button label="Guardar" size="small" :loading="guardando" @click="guardarResumen" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Costo ───────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogCosto" :header="costoEditId ? 'Editar costo' : 'Agregar costo'" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo de costo</label>
          <Select v-model="costoForm.tipo_costo" :options="tiposCostoOpciones" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Descripción</label>
          <InputText v-model="costoForm.descripcion" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Proveedor</label>
          <InputText v-model="costoForm.proveedor" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">N° Soporte</label>
            <InputText v-model="costoForm.nro_soporte" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">URL Soporte</label>
            <InputText v-model="costoForm.soporte_url" class="w-full" placeholder="https://..." />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Valor (COP)</label>
          <InputNumber v-model="costoForm.valor_cop" :maxFractionDigits="2" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogCosto = false" />
          <Button :label="costoEditId ? 'Actualizar' : 'Agregar'" size="small" :loading="guardando" @click="guardarCosto" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Factura ─────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogFactura" :header="facturaEditId ? 'Editar factura' : 'Agregar factura'" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo de servicio</label>
          <Select v-model="facturaForm.tipo_servicio" :options="tiposServicioOpciones"
            optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">N° Factura</label>
            <InputText v-model="facturaForm.numero_factura" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">N° Soporte</label>
            <InputText v-model="facturaForm.nro_soporte" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">URL Soporte</label>
          <InputText v-model="facturaForm.soporte_url" class="w-full" placeholder="https://..." />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Fecha emisión</label>
            <DatePicker v-model="facturaForm.fecha_emision" dateFormat="yy-mm-dd" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Fecha vencimiento</label>
            <DatePicker v-model="facturaForm.fecha_vencimiento" dateFormat="yy-mm-dd" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Estado</label>
            <Select v-model="facturaForm.estado" :options="['emitida','pagada','vencida']" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Valor (COP)</label>
            <InputNumber v-model="facturaForm.valor_cop" :maxFractionDigits="2" class="w-full" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogFactura = false" />
          <Button :label="facturaEditId ? 'Actualizar' : 'Agregar'" size="small" :loading="guardando" @click="guardarFactura" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Mandato ─────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogMandato"
      :header="(mandatoEditId ? 'Editar' : 'Agregar') + ' mandato de ' + mandatoCtx.tipo + ' — ' + mandatoCtx.invNombre"
      modal class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">N° Mandato / Contrato</label>
          <InputText v-model="mandatoForm.numero_mandato" class="w-full" placeholder="Ej: Terpel 1, NEU I…" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Consecutivo</label>
          <InputNumber v-model="mandatoForm.consecutivo" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Beneficiario</label>
          <InputText v-model="mandatoForm.beneficiario_nombre" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">NIT Beneficiario</label>
          <InputText v-model="mandatoForm.beneficiario_nit" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Categoría contable</label>
          <InputText v-model="mandatoForm.categoria_contable" class="w-full" />
        </div>
        <div class="flex items-center gap-2 pt-4">
          <Checkbox v-model="mandatoForm.pa_aplica" binary inputId="pa_aplica" />
          <label for="pa_aplica" class="text-xs text-gray-600 cursor-pointer">PA aplica</label>
        </div>
        <div class="col-span-2 flex flex-col gap-1">
          <label class="text-xs text-gray-600">Observaciones</label>
          <Textarea v-model="mandatoForm.observaciones" rows="2" class="w-full" />
        </div>
        <div class="col-span-2 flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogMandato = false" />
          <Button :label="mandatoEditId ? 'Actualizar' : 'Crear'" size="small" :loading="guardando" @click="guardarMandato" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Línea de mandato ────────────────────────────────────── -->
    <Dialog v-model:visible="dialogLinea"
      :header="(lineaEditId ? 'Editar' : 'Agregar') + ' línea'"
      modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo de línea</label>
          <Select v-model="lineaForm.tipo_linea" :options="tiposLineaActual"
            optionLabel="label" optionValue="value"
            @change="onTipoLineaChange" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Concepto</label>
          <InputText v-model="lineaForm.concepto" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Valor (COP)</label>
            <InputNumber v-model="lineaForm.valor_cop" :maxFractionDigits="2" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Porcentaje (%)</label>
            <InputNumber v-model="lineaForm.porcentaje" :maxFractionDigits="6" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Referencia factura</label>
            <InputText v-model="lineaForm.referencia_factura" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Orden</label>
            <InputNumber v-model="lineaForm.orden" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">URL Soporte</label>
          <InputText v-model="lineaForm.soporte_url" class="w-full" placeholder="https://..." />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogLinea = false" />
          <Button :label="lineaEditId ? 'Actualizar' : 'Agregar'" size="small" :loading="guardando" @click="guardarLinea" />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import api from '@/api/client'
import EstadoResultados from './components/EstadoResultados.vue'
import GeneracionMensualChart from './components/GeneracionMensualChart.vue'
import IngresoCostoWaterfall from './components/IngresoCostoWaterfall.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const liq = ref(null)
const proyectoInversionistas = ref([])
const loading = ref(false)
const guardando = ref(false)

// Secciones de edición colapsadas por defecto: el resumen lo da el Estado de Resultados arriba
const seccionesAbiertas = ref(new Set())
function toggleSeccion(key) {
  if (seccionesAbiertas.value.has(key)) seccionesAbiertas.value.delete(key)
  else seccionesAbiertas.value.add(key)
  seccionesAbiertas.value = new Set(seccionesAbiertas.value)
}

// ─── Catálogos ────────────────────────────────────────────────────────────────
const estadosOpciones = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]

const tiposCostoOpciones = [
  'mantenimiento', 'arriendo', 'servicio_internet', 'poliza_cumplimiento',
  'servicios_publicos_consumo', 'cambio_equipos_medida', 'seguro', 'otro_costo',
]

const tiposServicioOpciones = [
  { label: 'Representación', value: 'representacion' },
  { label: 'CGM', value: 'cgm' },
  { label: 'Administración Operación', value: 'administracion_operacion' },
  { label: 'Otro', value: 'otro' },
]

const TIPOS_LINEA_INGRESOS = [
  'ingreso_bruto', 'ajuste_xm', 'ajuste_unergy', 'ajuste_comercializacion',
  'intereses', 'otro_ingreso', 'despacho', 'ventas_en_bolsa',
  'compras_en_bolsa', 'redistribucion_ingresos', 'valor_a_pagar',
]
const TIPOS_LINEA_COSTOS = [
  'mantenimiento', 'arriendo', 'servicio_internet', 'poliza_cumplimiento',
  'servicios_publicos_consumo', 'cambio_equipos_medida', 'seguro', 'otro_costo',
  'comercializacion', 'representacion', 'cgm', 'administracion',
  'iva', 'retencion_fuente', 'reteica', 'ica_opex', 'otro_impuesto',
]

const ETIQUETAS = {
  ingreso_bruto: 'Ingreso Bruto', ajuste_xm: 'Ajuste Xm',
  ajuste_unergy: 'Ajuste Unergy', ajuste_comercializacion: 'Comercialización',
  intereses: 'Intereses', otro_ingreso: 'Otro Ingreso', despacho: 'Despacho',
  ventas_en_bolsa: 'Ventas en Bolsa', compras_en_bolsa: 'Compras en Bolsa',
  redistribucion_ingresos: 'Redistribución de Ingresos de acuerdo al Protocolo',
  mantenimiento: 'Mantenimiento', arriendo: 'Arriendo',
  servicio_internet: 'Servicio de Internet', poliza_cumplimiento: 'Póliza de Cumplimiento',
  servicios_publicos_consumo: 'Servicios Públicos Consumo de energía',
  cambio_equipos_medida: 'Cambio Equipos de Medida', seguro: 'Seguro',
  otro_costo: 'Otro Costo', comercializacion: 'Comercialización',
  representacion: 'Representación', cgm: 'CGM', administracion: 'Administración',
  iva: 'IVA', retencion_fuente: 'Retención en la Fuente', reteica: 'Reteica',
  ica_opex: 'ICA OPEX', otro_impuesto: 'Otro Impuesto', valor_a_pagar: 'Valor a Pagar',
}

const LABEL_SERVICIO = {
  representacion: 'Representación', cgm: 'CGM',
  administracion_operacion: 'Administración', otro: 'Otro',
}

// ─── Dialogs estado ───────────────────────────────────────────────────────────
const dialogEstado = ref(false)
const nuevoEstado = ref('')

// ─── Dialog resumen ───────────────────────────────────────────────────────────
const dialogResumen = ref(false)
const resumenForm = reactive({
  tasa_cambio: null,
  comprobante_contable_ref: '', consecutivo_inicial_ingresos: null,
  consecutivo_inicial_costos: null, fecha_inicio_proceso: null,
  fecha_firma: null, estado_resultados_url: '', observaciones_resultados: '',
})

function abrirEditResumen() {
  Object.assign(resumenForm, {
    tasa_cambio: liq.value.tasa_cambio ?? null,
    comprobante_contable_ref: liq.value.comprobante_contable_ref ?? '',
    consecutivo_inicial_ingresos: liq.value.consecutivo_inicial_ingresos ?? null,
    consecutivo_inicial_costos: liq.value.consecutivo_inicial_costos ?? null,
    fecha_inicio_proceso: liq.value.fecha_inicio_proceso ?? null,
    fecha_firma: liq.value.fecha_firma ?? null,
    estado_resultados_url: liq.value.estado_resultados_url ?? '',
    observaciones_resultados: liq.value.observaciones_resultados ?? '',
  })
  dialogResumen.value = true
}

// ─── Dialog costos ────────────────────────────────────────────────────────────
const dialogCosto = ref(false)
const costoEditId = ref(null)
const costoForm = reactive({
  tipo_costo: null, descripcion: '', proveedor: '',
  nro_soporte: '', soporte_url: '', valor_cop: null,
})

function abrirDialogCosto(c = null) {
  costoEditId.value = c?.id ?? null
  Object.assign(costoForm, {
    tipo_costo: c?.tipo_costo ?? null,
    descripcion: c?.descripcion ?? '',
    proveedor: c?.proveedor ?? '',
    nro_soporte: c?.nro_soporte ?? '',
    soporte_url: c?.soporte_url ?? '',
    valor_cop: c?.valor_cop ?? null,
  })
  dialogCosto.value = true
}

// ─── Dialog facturas ──────────────────────────────────────────────────────────
const dialogFactura = ref(false)
const facturaEditId = ref(null)
const facturaForm = reactive({
  tipo_servicio: null, numero_factura: '', nro_soporte: '',
  soporte_url: '', fecha_emision: null, fecha_vencimiento: null,
  estado: 'emitida', valor_cop: null,
})

function abrirDialogFactura(f = null) {
  facturaEditId.value = f?.id ?? null
  Object.assign(facturaForm, {
    tipo_servicio: f?.tipo_servicio ?? null,
    numero_factura: f?.numero_factura ?? '',
    nro_soporte: f?.nro_soporte ?? '',
    soporte_url: f?.soporte_url ?? '',
    fecha_emision: f?.fecha_emision ?? null,
    fecha_vencimiento: f?.fecha_vencimiento ?? null,
    estado: f?.estado ?? 'emitida',
    valor_cop: f?.valor_cop ?? null,
  })
  dialogFactura.value = true
}

// ─── Dialog mandatos ──────────────────────────────────────────────────────────
const dialogMandato = ref(false)
const mandatoEditId = ref(null)
const mandatoCtx = reactive({ tipo: '', piId: null, invNombre: '' })
const mandatoForm = reactive({
  numero_mandato: '', consecutivo: null, beneficiario_nombre: '',
  beneficiario_nit: '', pa_aplica: false, categoria_contable: '', observaciones: '',
})

function abrirDialogMandato(tipo, piId, invNombre, m = null) {
  mandatoEditId.value = m?.id ?? null
  Object.assign(mandatoCtx, { tipo, piId, invNombre })
  Object.assign(mandatoForm, {
    numero_mandato: m?.numero_mandato ?? '',
    consecutivo: m?.consecutivo ?? null,
    beneficiario_nombre: m?.beneficiario_nombre ?? '',
    beneficiario_nit: m?.beneficiario_nit ?? '',
    pa_aplica: m?.pa_aplica ?? false,
    categoria_contable: m?.categoria_contable ?? '',
    observaciones: m?.observaciones ?? '',
  })
  dialogMandato.value = true
}

// ─── Dialog líneas ────────────────────────────────────────────────────────────
const dialogLinea = ref(false)
const lineaEditId = ref(null)
const lineaCtx = reactive({ mandatoId: null, mandatoTipo: '' })
const lineaForm = reactive({
  tipo_linea: null, concepto: '', valor_cop: null,
  porcentaje: null, referencia_factura: '', soporte_url: '', orden: 0,
})

const tiposLineaActual = computed(() => {
  const lista = lineaCtx.mandatoTipo === 'ingresos' ? TIPOS_LINEA_INGRESOS : TIPOS_LINEA_COSTOS
  return lista.map(v => ({ label: ETIQUETAS[v] || v, value: v }))
})

function onTipoLineaChange() {
  if (lineaForm.tipo_linea) {
    lineaForm.concepto = ETIQUETAS[lineaForm.tipo_linea] || lineaForm.tipo_linea
  }
}

function abrirDialogLinea(mandatoId, mandatoTipo, l = null) {
  lineaEditId.value = l?.id ?? null
  Object.assign(lineaCtx, { mandatoId, mandatoTipo })
  Object.assign(lineaForm, {
    tipo_linea: l?.tipo_linea ?? null,
    concepto: l?.concepto ?? '',
    valor_cop: l?.valor_cop ?? null,
    porcentaje: l?.porcentaje ?? null,
    referencia_factura: l?.referencia_factura ?? '',
    soporte_url: l?.soporte_url ?? '',
    orden: l?.orden ?? 0,
  })
  dialogLinea.value = true
}

// ─── Computed ─────────────────────────────────────────────────────────────────

// Filtro de inversionista desde query param ?inv=<proyecto_inversionista_id>
const invFiltroId = computed(() => route.query.inv ? Number(route.query.inv) : null)
const invFiltrado = computed(() =>
  invFiltroId.value != null
    ? (proyectoInversionistas.value.find(pi => pi.id === invFiltroId.value) ?? null)
    : null
)

const TIPOS_INGRESO_BRUTO = new Set(['ingreso_bruto', 'despacho', 'ventas_en_bolsa', 'redistribucion_ingresos'])
const TIPOS_COMERCIALIZACION = new Set(['ajuste_comercializacion', 'comercializacion', 'compras_en_bolsa'])

// El backend serializa enums como "TipoLineaMandatoEnum.foo" — normalizar a "foo"
const normTipo = t => (t || '').replace(/^TipoLineaMandatoEnum\./, '')

const resumenCalculado = computed(() => {
  const mandatos = liq.value?.mandatos || []
  const costos = liq.value?.costos || []

  // Preferir mandatos del "Total" (sin inversionista) para el nivel proyecto
  const ingTotal = mandatos.filter(m =>
    m.tipo === 'ingresos' &&
    !m.inversionista &&
    m.inversionista_id == null
  )
  const ingInv = mandatos.filter(m =>
    m.tipo === 'ingresos' &&
    (m.inversionista || m.inversionista_id != null)
  )
  const ingMandatos = ingTotal.length ? ingTotal : ingInv

  let ingresos_brutos = 0
  let comercializacion = 0
  let neto = 0

  for (const m of ingMandatos) {
    for (const l of m.lineas) {
      const t = normTipo(l.tipo_linea)
      if (TIPOS_INGRESO_BRUTO.has(t))    ingresos_brutos += l.valor_cop
      if (TIPOS_COMERCIALIZACION.has(t)) comercializacion += Math.abs(l.valor_cop)
    }
  }

  // Costos operativos fijos = LiquidacionCosto a nivel proyecto
  const costos_op = costos.reduce((acc, c) => acc + c.valor_cop, 0)

  const facturas = (liq.value?.facturas || [])
    .reduce((s, f) => s + (f.valor_cop || 0), 0)

  // Autoconsumo: neto = ingresos_brutos − retenciones (sin comercialización XM)
  if (liq.value?.tipo_venta === 'autoconsumo') {
    const retenciones = ingMandatos
      .flatMap(m => m.lineas || [])
      .filter(l => ['retencion_fuente', 'ica_opex'].includes(normTipo(l.tipo_linea)))
      .reduce((acc, l) => acc + Math.abs(l.valor_cop), 0)
    return { ingresos_brutos, comercializacion: 0, costos_op, facturas, neto: ingresos_brutos - retenciones - facturas }
  }

  // Si no hay datos en mandatos, caer al campo almacenado manualmente
  if (!ingresos_brutos && !comercializacion) {
    return {
      ingresos_brutos: liq.value?.ingresos_energia_cop,
      comercializacion: liq.value?.costos_comercializacion_xm_cop,
      costos_op: costos_op || liq.value?.costos_operativos_cop,
      facturas,
      neto: liq.value?.ingreso_neto_cop,
    }
  }

  neto = ingresos_brutos - comercializacion - costos_op - facturas
  return { ingresos_brutos, comercializacion, costos_op, facturas, neto }
})

const mandatosTotal = computed(() =>
  (liq.value?.mandatos || []).filter(m =>
    m.inversionista_id == null && m.tipo === 'ingresos'
    && !m.beneficiario_nombre
  )
)

const mandatosTotalCostos = computed(() =>
  (liq.value?.mandatos || []).filter(m =>
    m.inversionista_id == null && m.tipo === 'costos'
    && !m.beneficiario_nombre
  )
)

const inversionistasConDetalle = computed(() => {
  if (!proyectoInversionistas.value.length) return []
  const mandatos = liq.value?.mandatos || []
  const all = proyectoInversionistas.value.map(pi => ({
    id: pi.id,
    nombre: pi.cliente_nombre,
    porcentaje: pi.porcentaje_participacion,
    es_patrimonio_autonomo: pi.es_patrimonio_autonomo,
    mandatosIngresos: mandatos.filter(m => m.inversionista?.id === pi.id && m.tipo === 'ingresos'),
    mandatosCostos: mandatos.filter(m => m.inversionista?.id === pi.id && m.tipo === 'costos'),
  }))
  if (invFiltroId.value != null) return all.filter(inv => inv.id === invFiltroId.value)
  return all
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const etiqueta = t => ETIQUETAS[normTipo(t)] || ETIQUETAS[t] || t

// Líneas que NO requieren documento soporte (impuestos, totales)
const TIPOS_SIN_SOPORTE = new Set(['iva', 'reteica', 'retencion_fuente', 'ica_opex', 'otro_impuesto', 'valor_a_pagar'])
const requiereSoporte = l => !TIPOS_SIN_SOPORTE.has(normTipo(l?.tipo_linea))

function fmt(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(v)
}
function pct(v) {
  if (v == null) return '—'
  return (v * 100).toFixed(4) + '%'
}
function formatPeriodo(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}
function estadoSeverity(e) {
  return {
    iniciada: 'secondary', costos_registrados: 'info', xm_procesado: 'info',
    mandatos_emitidos: 'warn', en_contabilidad: 'warn', en_revisoria: 'warn',
    facturado: 'success', entregado: 'contrast',
  }[e] || 'secondary'
}
function facturaEstadoSeverity(e) {
  return { emitida: 'info', pagada: 'success', vencida: 'danger' }[e] || 'secondary'
}
function isoDate(v) {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Carga ────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/liquidaciones/${route.params.id}`)
    liq.value = data
    nuevoEstado.value = data.estado
  } catch (e) {
    console.error('[LiquidacionDetail] Error:', e?.response?.status, e?.response?.data ?? e)
    toast.add({
      severity: 'error',
      summary: `Error ${e?.response?.status || 'red'} — liq ${route.params.id}`,
      detail: JSON.stringify(e?.response?.data ?? e?.message ?? 'sin detalle').slice(0, 300),
      life: 10000
    })
  } finally {
    loading.value = false
  }

  if (liq.value?.proyecto_id) {
    try {
      const r = await api.get(`/proyectos/${liq.value.proyecto_id}/inversionistas`)
      const raw = r.data
      proyectoInversionistas.value = Array.isArray(raw) ? raw : (raw.items ?? [])
    } catch (e) {
      console.error('[LiquidacionDetail] Error cargando inversionistas:', e?.response?.status, e?.response?.data ?? e)
    }
  }
}

// ─── Guardar estado ───────────────────────────────────────────────────────────
async function guardarEstado() {
  guardando.value = true
  try {
    await api.patch(`/liquidaciones/${route.params.id}`, { estado: nuevoEstado.value })
    liq.value.estado = nuevoEstado.value
    dialogEstado.value = false
    toast.add({ severity: 'success', summary: 'Estado actualizado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

// ─── Guardar resumen ──────────────────────────────────────────────────────────
async function guardarResumen() {
  guardando.value = true
  try {
    const payload = {}
    const keys = Object.keys(resumenForm)
    for (const k of keys) {
      const v = resumenForm[k]
      // Incluir números (incluso 0), strings no vacíos, booleans, fechas
      if (v !== null && v !== undefined) {
        if (typeof v === 'string') {
          payload[k] = v || null  // convertir string vacío a null
        } else if (v instanceof Date) {
          payload[k] = isoDate(v)
        } else {
          payload[k] = v
        }
      }
    }
    await api.patch(`/liquidaciones/${route.params.id}`, payload)
    // Recargar para asegurar consistencia con el servidor
    await load()
    dialogResumen.value = false
    toast.add({ severity: 'success', summary: 'Resumen actualizado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

// ─── Costos ───────────────────────────────────────────────────────────────────
async function guardarCosto() {
  if (!costoForm.tipo_costo || costoForm.valor_cop == null) {
    toast.add({ severity: 'warn', summary: 'Completa tipo y valor', life: 2000 }); return
  }
  guardando.value = true
  try {
    const payload = { ...costoForm }
    if (costoEditId.value) {
      const { data } = await api.patch(`/liquidaciones/${route.params.id}/costos/${costoEditId.value}`, payload)
      const idx = liq.value.costos.findIndex(c => c.id === costoEditId.value)
      if (idx >= 0) liq.value.costos[idx] = data
    } else {
      const { data } = await api.post(`/liquidaciones/${route.params.id}/costos`, payload)
      liq.value.costos = [...(liq.value.costos || []), data]
    }
    dialogCosto.value = false
    toast.add({ severity: 'success', summary: costoEditId.value ? 'Costo actualizado' : 'Costo agregado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el costo', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarCosto(id) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/costos/${id}`)
    liq.value.costos = liq.value.costos.filter(c => c.id !== id)
    toast.add({ severity: 'success', summary: 'Costo eliminado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Facturas ─────────────────────────────────────────────────────────────────
async function guardarFactura() {
  if (!facturaForm.tipo_servicio || facturaForm.valor_cop == null) {
    toast.add({ severity: 'warn', summary: 'Completa tipo y valor', life: 2000 }); return
  }
  guardando.value = true
  try {
    const payload = {
      ...facturaForm,
      fecha_emision: isoDate(facturaForm.fecha_emision),
      fecha_vencimiento: isoDate(facturaForm.fecha_vencimiento),
    }
    if (facturaEditId.value) {
      const { data } = await api.patch(`/liquidaciones/${route.params.id}/facturas/${facturaEditId.value}`, payload)
      const idx = liq.value.facturas.findIndex(f => f.id === facturaEditId.value)
      if (idx >= 0) liq.value.facturas[idx] = data
    } else {
      const { data } = await api.post(`/liquidaciones/${route.params.id}/facturas`, payload)
      liq.value.facturas = [...(liq.value.facturas || []), data]
    }
    dialogFactura.value = false
    toast.add({ severity: 'success', summary: facturaEditId.value ? 'Factura actualizada' : 'Factura agregada', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarFactura(id) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/facturas/${id}`)
    liq.value.facturas = liq.value.facturas.filter(f => f.id !== id)
    toast.add({ severity: 'success', summary: 'Factura eliminada', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Mandatos ─────────────────────────────────────────────────────────────────
async function guardarMandato() {
  guardando.value = true
  try {
    const payload = {
      tipo: mandatoCtx.tipo,
      inversionista_id: mandatoCtx.piId,
      numero_mandato: mandatoForm.numero_mandato || null,
      consecutivo: mandatoForm.consecutivo ?? null,
      beneficiario_nombre: mandatoForm.beneficiario_nombre || null,
      beneficiario_nit: mandatoForm.beneficiario_nit || null,
      pa_aplica: mandatoForm.pa_aplica,
      categoria_contable: mandatoForm.categoria_contable || null,
      observaciones: mandatoForm.observaciones || null,
    }
    if (mandatoEditId.value) {
      await api.patch(`/liquidaciones/${route.params.id}/mandatos/${mandatoEditId.value}`, payload)
    } else {
      await api.post(`/liquidaciones/${route.params.id}/mandatos`, payload)
    }
    dialogMandato.value = false
    toast.add({ severity: 'success', summary: mandatoEditId.value ? 'Mandato actualizado' : 'Mandato creado', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el mandato', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarMandato(id) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/mandatos/${id}`)
    toast.add({ severity: 'success', summary: 'Mandato eliminado', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Líneas ───────────────────────────────────────────────────────────────────
async function guardarLinea() {
  if (!lineaForm.tipo_linea || lineaForm.valor_cop == null) {
    toast.add({ severity: 'warn', summary: 'Completa tipo y valor', life: 2000 }); return
  }
  guardando.value = true
  try {
    const payload = {
      tipo_linea: lineaForm.tipo_linea,
      concepto: lineaForm.concepto || ETIQUETAS[lineaForm.tipo_linea] || lineaForm.tipo_linea,
      valor_cop: lineaForm.valor_cop,
      porcentaje: lineaForm.porcentaje ?? null,
      referencia_factura: lineaForm.referencia_factura || null,
      soporte_url: lineaForm.soporte_url || null,
      orden: lineaForm.orden ?? 0,
    }
    const liqId = route.params.id
    const mId = lineaCtx.mandatoId
    if (lineaEditId.value) {
      await api.patch(`/liquidaciones/${liqId}/mandatos/${mId}/lineas/${lineaEditId.value}`, payload)
    } else {
      await api.post(`/liquidaciones/${liqId}/mandatos/${mId}/lineas`, payload)
    }
    dialogLinea.value = false
    toast.add({ severity: 'success', summary: lineaEditId.value ? 'Línea actualizada' : 'Línea agregada', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la línea', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarLinea(mandatoId, lineaId) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/mandatos/${mandatoId}/lineas/${lineaId}`)
    toast.add({ severity: 'success', summary: 'Línea eliminada', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

onMounted(load)
</script>
