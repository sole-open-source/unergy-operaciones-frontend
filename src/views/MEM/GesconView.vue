<template>
  <div class="space-y-4">
    <PageHeader title="GESCON — Contratos ASIC" :subtitle="`${total} registros`">
      <template #actions>
        <Button label="Descargar Excel" icon="pi pi-file-excel" size="small" outlined
          @click="descargarGesconExcel" :loading="exportando"
          style="color:#915BD8; border-color:#915BD8;" />
        <Button label="Registrar" icon="pi pi-plus" @click="abrirNuevo"
          style="background:#915BD8; border-color:#915BD8;" size="small" />
      </template>
    </PageHeader>

    <!-- Filtros -->
    <div class="bg-white rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center"
      style="border: 1px solid #e8e0f0;">
      <IconField class="flex-1 min-w-[200px]">
        <InputIcon class="pi pi-search" />
        <InputText v-model="filtroTexto" placeholder="Buscar SIC, contrato, planta…" class="w-full" />
      </IconField>

      <SelectButton v-model="filtroEstado" :options="opcionesEstado" optionLabel="label" optionValue="value"
        :pt="{ button: { style: 'font-size:12px; padding:6px 14px;' } }" />

      <Select v-model="filtroTipo" :options="opcionesTipo" optionLabel="label" optionValue="value"
        placeholder="Tipo" showClear class="min-w-[160px]" />

      <Button v-if="filtroTexto || filtroTipo" label="Limpiar" icon="pi pi-times"
        severity="secondary" size="small" @click="limpiar" />
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl overflow-hidden shadow-sm" style="border: 1px solid #e8e0f0;">
      <DataTable :value="rowsMostrar" :loading="loading" class="text-sm" rowHover
        :rows="50" paginator :rowsPerPageOptions="[25, 50, 100]">
        <template #empty>
          <div class="py-12 text-center text-sm" style="color: #9b89b5;">
            No hay contratos con los filtros actuales.
          </div>
        </template>

        <Column field="codigo_sic_contrato" header="SIC" sortable style="width:100px;">
          <template #body="{ data }">
            <span class="font-mono text-xs" style="color:#5b3fa6;">{{ data.codigo_sic_contrato || '—' }}</span>
          </template>
        </Column>

        <Column field="contrato_interno" header="Contrato" sortable style="min-width:160px;">
          <template #body="{ data }">
            <span class="font-medium text-xs" style="color:#2C2039;">{{ data.contrato_interno || '—' }}</span>
          </template>
        </Column>

        <Column field="nombre_interno" header="Nombre interno" style="min-width:140px;">
          <template #body="{ data }">
            <span class="text-xs" style="color:#6b5a8a;">{{ data.nombre_interno || '—' }}</span>
          </template>
        </Column>

        <Column header="Planta" style="min-width:160px;">
          <template #body="{ data }">
            <span class="text-xs font-medium" style="color:#2C2039;">{{ data.planta_nombre || '—' }}</span>
          </template>
        </Column>

        <Column field="tipo_solicitud" header="Tipo" sortable style="width:130px;">
          <template #body="{ data }">
            <Tag :value="tipoLabel(data.tipo_solicitud)" :severity="tipoSeverity(data.tipo_solicitud)" class="text-xs" />
          </template>
        </Column>

        <Column field="requerimiento_asic" header="Req." style="width:115px;">
          <template #body="{ data }">
            <span class="font-mono text-xs" style="color:#6b5a8a;">{{ data.requerimiento_asic || '—' }}</span>
          </template>
        </Column>

        <Column field="fecha_inicio" header="Inicio" sortable style="width:95px;">
          <template #body="{ data }">
            <span class="text-xs" style="color:#6b5a8a;">{{ fmt(data.fecha_inicio) }}</span>
          </template>
        </Column>

        <Column field="fecha_fin" header="Fin" sortable style="width:95px;">
          <template #body="{ data }">
            <span class="text-xs" :style="{ color: esVencido(data.fecha_fin) ? '#ef4444' : '#6b5a8a' }">
              {{ fmt(data.fecha_fin) }}
            </span>
          </template>
        </Column>

        <Column field="estado_solicitud" header="Estado" sortable style="width:110px;">
          <template #body="{ data }">
            <Tag :value="estadoLabel(data.estado_solicitud)" :severity="estadoSeverity(data.estado_solicitud)" class="text-xs" />
          </template>
        </Column>

        <Column field="porcentaje_despacho" header="Desp." style="width:68px;">
          <template #body="{ data }">
            <span class="text-xs" :style="{ color: despachoAnomalo(data.porcentaje_despacho) ? '#D64455' : '#6b5a8a' }"
              v-tooltip.top="despachoAnomalo(data.porcentaje_despacho) ? 'Valor fuera de escala canónica (0-1). Revisar: rompe el cálculo de cumplimiento.' : ''">
              {{ data.porcentaje_despacho != null ? despachoPct(data.porcentaje_despacho) + '%' : '—' }}
            </span>
          </template>
        </Column>

        <Column header="Coex." style="width:50px;">
          <template #body="{ data }">
            <i v-if="!data.reemplaza_anterior" class="pi pi-link text-xs" style="color:#e6a817;"
              v-tooltip.top="'Coexiste con otras plantas en este SIC'" />
          </template>
        </Column>

        <Column header="Dup." style="width:55px;">
          <template #body="{ data }">
            <span v-if="data.es_duplicado" class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style="background: rgba(214,68,85,0.12); color: #D64455;"
              v-tooltip.top="'Duplicado — exposición en bolsa'">Bolsa</span>
          </template>
        </Column>

        <Column header="" style="width:100px;">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <button @click="abrirEditar(data)" class="p-1 rounded hover:bg-purple-50 transition-colors"
                title="Editar" style="color: #915BD8;">
                <i class="pi pi-pencil text-xs" />
              </button>
              <a v-if="data.link_archivo" :href="data.link_archivo" target="_blank"
                class="p-1 rounded hover:bg-purple-50 transition-colors text-purple-500 hover:text-purple-700">
                <i class="pi pi-external-link text-xs" />
              </a>
              <button @click="confirmarEliminar(data)" class="p-1 rounded hover:bg-red-50 transition-colors"
                title="Eliminar" style="color: #ef4444;">
                <i class="pi pi-trash text-xs" />
              </button>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog />

    <!-- ── Dialog Registro ─────────────────────────────────────── -->
    <Dialog v-model:visible="dialogVisible" :header="editandoId ? 'Editar contrato ASIC' : 'Registrar contrato ASIC'" modal
      :style="{ width: '700px' }" :breakpoints="{ '768px': '95vw' }">
      <form @submit.prevent="guardar" class="space-y-5 pt-1">

        <!-- Fila 1: Tipo + Estado -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Tipo solicitud *</label>
            <Select v-model="form.tipo_solicitud" :options="opcionesTipo"
              optionLabel="label" optionValue="value" placeholder="Seleccionar" class="w-full"
              :class="{ 'p-invalid': errores.tipo_solicitud }" />
            <small v-if="errores.tipo_solicitud" class="text-red-500 text-xs">{{ errores.tipo_solicitud }}</small>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Estado *</label>
            <Select v-model="form.estado_solicitud" :options="opcionesEstadoForm"
              optionLabel="label" optionValue="value" placeholder="Seleccionar" class="w-full"
              :class="{ 'p-invalid': errores.estado_solicitud }" />
            <small v-if="errores.estado_solicitud" class="text-red-500 text-xs">{{ errores.estado_solicitud }}</small>
          </div>
        </div>

        <!-- Fila 2: SIC Contrato + Contrato interno + Nombre interno -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Código SIC contrato</label>
            <InputText v-model="form.codigo_sic_contrato" placeholder="88806" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Contrato interno</label>
            <InputText v-model="form.contrato_interno" placeholder="UNERGY 001-2024" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Nombre interno</label>
            <InputText v-model="form.nombre_interno" placeholder="Terpel 1" class="w-full" />
          </div>
        </div>

        <!-- Fila 3: Vendedor + Comprador + P.S -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">SIC Vendedor</label>
            <InputText v-model="form.codigo_sic_vendedor" placeholder="UNGG" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">SIC Comprador</label>
            <InputText v-model="form.codigo_sic_comprador" placeholder="BIAC" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Prioridad (P.S)</label>
            <InputNumber v-model="form.prioridad_limitacion" :min="0" :max="999"
              placeholder="83" class="w-full" inputClass="w-full" />
          </div>
        </div>

        <!-- Fila 4: Proyecto + coexistencia + duplicado -->
        <div class="grid grid-cols-[1fr_auto_auto] gap-4 items-end">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Planta / Proyecto</label>
            <Select v-model="form.proyecto_id" :options="proyectos"
              optionLabel="nombre_comercial" optionValue="id"
              placeholder="Seleccionar proyecto (opcional)" filter showClear class="w-full" />
          </div>
          <div class="flex items-center gap-2 pb-1">
            <Checkbox v-model="form.reemplaza_anterior" :binary="true" inputId="reemplaza" />
            <label for="reemplaza" class="text-xs font-medium cursor-pointer" style="color:#6b5a8a;">
              Reemplaza anterior
            </label>
            <i class="pi pi-info-circle text-xs cursor-help" style="color:#9b89b5;"
              v-tooltip.top="'Activado: esta planta reemplaza la anterior en este SIC. Desactivado: coexiste con las demás plantas del mismo SIC.'" />
          </div>
          <div class="flex items-center gap-2 pb-1">
            <Checkbox v-model="form.es_duplicado" :binary="true" inputId="es_duplicado" />
            <label for="es_duplicado" class="text-xs font-medium cursor-pointer" style="color:#D64455;">
              Duplicado
            </label>
            <i class="pi pi-info-circle text-xs cursor-help" style="color:#9b89b5;"
              v-tooltip.top="'Marcar si esta planta ya está en otro contrato. La generación se contará como exposición en bolsa, no como cumplimiento.'" />
          </div>
        </div>

        <!-- Fila 5: Fechas -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Fecha solicitud</label>
            <DatePicker v-model="form.fecha_solicitud" dateFormat="dd/mm/yy"
              placeholder="dd/mm/aa" showIcon class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Fecha inicio</label>
            <DatePicker v-model="form.fecha_inicio" dateFormat="dd/mm/yy"
              placeholder="dd/mm/aa" showIcon class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Fecha fin</label>
            <DatePicker v-model="form.fecha_fin" dateFormat="dd/mm/yy"
              placeholder="dd/mm/aa" showIcon class="w-full" />
          </div>
        </div>

        <!-- Fila 6: Tipo mercado + Tipo asignación + % FNCER + % Despacho -->
        <div class="grid grid-cols-4 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Tipo mercado</label>
            <InputText v-model="form.tipo_mercado" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Tipo asignación</label>
            <InputText v-model="form.tipo_asignacion" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">% FNCER</label>
            <InputNumber v-model="form.porcentaje_fncer" :min="0" :max="100"
              :minFractionDigits="0" :maxFractionDigits="2" suffix="%" class="w-full" inputClass="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">% Despacho</label>
            <InputNumber v-model="form.porcentaje_despacho" :min="0" :max="100"
              :minFractionDigits="0" :maxFractionDigits="2" suffix="%" class="w-full" inputClass="w-full" />
          </div>
        </div>

        <!-- Fila 7: Requerimiento + Contacto -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">N° Requerimiento ASIC</label>
            <InputText v-model="form.requerimiento_asic" placeholder="20260419002" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium" style="color:#6b5a8a;">Nombre contacto solicitante</label>
            <InputText v-model="form.nombre_contacto_solicitante" class="w-full" />
          </div>
        </div>

        <!-- Fila 8: Link archivo -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium" style="color:#6b5a8a;">Link archivo</label>
          <InputText v-model="form.link_archivo" placeholder="https://..." class="w-full" />
        </div>

        <!-- Observaciones -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium" style="color:#6b5a8a;">Observaciones</label>
          <Textarea v-model="form.observaciones" rows="2" class="w-full" autoResize />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" @click="dialogVisible = false" type="button" />
          <Button :label="editandoId ? 'Actualizar' : 'Guardar'" icon="pi pi-check" type="submit" :loading="guardando"
            style="background:#915BD8; border-color:#915BD8;" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '@/api/client.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

// ── Tabla ─────────────────────────────────────────────────────────
const loading = ref(false)
const rows = ref([])
const rowsMostrar = ref([])
const total = ref(0)
const filtroTexto = ref('')
const filtroEstado = ref('vigentes')
const filtroTipo = ref(null)
const hoy = new Date().toISOString().slice(0, 10)

const opcionesEstado = [
  { label: 'Vigentes', value: 'vigentes' },
  { label: 'Todos', value: 'todos' },
]
const opcionesTipo = [
  { label: 'Registro', value: 'registro' },
  { label: 'Modificación', value: 'modificacion' },
  { label: 'Terminación', value: 'terminacion' },
  { label: 'Desistimiento', value: 'desistimiento' },
]

function filtrar() {
  let r = rows.value.slice()
  if (filtroEstado.value === 'vigentes')
    r = r.filter(x => x.fecha_fin && x.fecha_fin >= hoy)
  if (filtroTipo.value)
    r = r.filter(x => x.tipo_solicitud === filtroTipo.value)
  const q = filtroTexto.value.trim().toLowerCase()
  if (q) r = r.filter(x =>
    (x.codigo_sic_contrato || '').toLowerCase().includes(q) ||
    (x.contrato_interno || '').toLowerCase().includes(q) ||
    (x.nombre_interno || '').toLowerCase().includes(q) ||
    (x.planta_nombre || '').toLowerCase().includes(q) ||
    (x.requerimiento_asic || '').toLowerCase().includes(q)
  )
  rowsMostrar.value = r
  total.value = r.length
}
watch([rows, filtroEstado, filtroTipo, filtroTexto], filtrar)

async function cargar() {
  loading.value = true
  try {
    const { data } = await api.get('/asic')
    rows.value = data
  } finally {
    loading.value = false
  }
}
function limpiar() { filtroTexto.value = ''; filtroTipo.value = null }

// ── Exportar a Excel (identidad de marca Unergy) ──────────────────
const exportando = ref(false)
async function descargarGesconExcel() {
  if (exportando.value) return
  if (!rows.value.length) {
    toast.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay registros GESCON para exportar.', life: 3000 })
    return
  }
  exportando.value = true
  try {
    const XLSX = await import('xlsx-js-style')

    // Paleta de marca Unergy
    const C = { morado: '915BD8', oscuro: '2C2039', lila: 'F4F1FA', blanco: 'FFFFFF', gris: '6B5A8A', borde: 'ECE4F5', rojo: 'D64455', rojoBg: 'FBE9EC' }
    const bf = { style: 'thin', color: { rgb: C.borde } }
    const bAll = { top: bf, bottom: bf, left: bf, right: bf }
    const siNo = v => (v ? 'Sí' : 'No')
    const fechaFmt = d => {
      if (!d) return ''
      const [y, m, day] = String(d).slice(0, 10).split('-')
      return `${day}/${m}/${y}`
    }

    // Definición de columnas (todos los campos GESCON)
    const COLS = [
      { h: 'SIC contrato', w: 12, get: r => r.codigo_sic_contrato || '' },
      { h: 'Contrato interno', w: 18, get: r => r.contrato_interno || '' },
      { h: 'Nombre interno', w: 18, get: r => r.nombre_interno || '' },
      { h: 'Planta', w: 24, get: r => r.planta_nombre || '' },
      { h: 'Tipo solicitud', w: 14, get: r => tipoLabel(r.tipo_solicitud) },
      { h: 'Estado', w: 12, get: r => estadoLabel(r.estado_solicitud) },
      { h: 'SIC vendedor', w: 12, get: r => r.codigo_sic_vendedor || '' },
      { h: 'SIC comprador', w: 13, get: r => r.codigo_sic_comprador || '' },
      { h: 'Prioridad (P.S)', w: 13, get: r => r.prioridad_limitacion, num: true, align: 'center' },
      { h: 'Fecha solicitud', w: 13, get: r => fechaFmt(r.fecha_solicitud), align: 'center' },
      { h: 'Fecha inicio', w: 12, get: r => fechaFmt(r.fecha_inicio), align: 'center' },
      { h: 'Fecha fin', w: 12, get: r => fechaFmt(r.fecha_fin), align: 'center', venc: true },
      { h: 'Tipo mercado', w: 14, get: r => r.tipo_mercado || '' },
      { h: 'Tipo asignación', w: 15, get: r => r.tipo_asignacion || '' },
      { h: '% FNCER', w: 10, get: r => r.porcentaje_fncer, num: true, pct: true, align: 'right' },
      { h: '% Despacho', w: 11, get: r => despachoPct(r.porcentaje_despacho), num: true, pct: true, align: 'right' },
      { h: 'Req. ASIC', w: 15, get: r => r.requerimiento_asic || '' },
      { h: 'Contacto solicitante', w: 22, get: r => r.nombre_contacto_solicitante || '' },
      { h: 'Coexiste', w: 9, get: r => siNo(!r.reemplaza_anterior), align: 'center' },
      { h: 'Duplicado', w: 10, get: r => siNo(r.es_duplicado), align: 'center', dup: true },
      { h: 'Link archivo', w: 32, get: r => r.link_archivo || '' },
      { h: 'Observaciones', w: 40, get: r => r.observaciones || '' },
    ]
    const ncols = COLS.length
    const data = rows.value
    const fechaExport = new Date().toLocaleString('es-CO')

    // Filas: 0 título · 1 subtítulo · 2 vacía · 3 encabezados · 4+ datos
    const HEADER_ROW = 3
    const FIRST_DATA = 4
    const aoa = [
      ['UNERGY — GESCON · Contratos ASIC'],
      [`${data.length} registros · Exportado: ${fechaExport}`],
      [],
      COLS.map(c => c.h),
      ...data.map(r => COLS.map(c => {
        const v = c.get(r)
        if (c.num) return (v == null || v === '') ? null : Number(v)
        return v
      })),
    ]

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const enc = (r, c) => XLSX.utils.encode_cell({ r, c })
    const setStyle = (r, c, s) => { const ref = enc(r, c); if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].s = s }

    // Banner + subtítulo
    setStyle(0, 0, { font: { bold: true, sz: 14, color: { rgb: C.blanco } }, fill: { fgColor: { rgb: C.oscuro } }, alignment: { vertical: 'center' } })
    setStyle(1, 0, { font: { sz: 10, color: { rgb: C.gris } } })

    // Encabezados
    COLS.forEach((c, ci) => setStyle(HEADER_ROW, ci, {
      font: { bold: true, sz: 10, color: { rgb: C.blanco } },
      fill: { fgColor: { rgb: C.morado } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: bAll,
    }))

    // Datos (zebra + resaltados semánticos)
    data.forEach((r, ri) => {
      const rowIdx = FIRST_DATA + ri
      const zebra = ri % 2 === 1
      COLS.forEach((c, ci) => {
        const style = {
          font: { sz: 10, color: { rgb: C.oscuro } },
          alignment: { horizontal: c.align || (c.num ? 'right' : 'left'), vertical: 'center', wrapText: c.h === 'Observaciones' },
          border: bAll,
        }
        if (zebra) style.fill = { fgColor: { rgb: C.lila } }
        if (c.pct) style.numFmt = '0.##"%"'
        if (c.venc && r.fecha_fin && String(r.fecha_fin).slice(0, 10) < hoy)
          style.font = { sz: 10, bold: true, color: { rgb: C.rojo } }
        if (c.dup && r.es_duplicado) {
          style.font = { sz: 10, bold: true, color: { rgb: C.rojo } }
          style.fill = { fgColor: { rgb: C.rojoBg } }
        }
        setStyle(rowIdx, ci, style)
      })
    })

    // Merges, anchos, alturas, autofiltro
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } },
    ]
    ws['!cols'] = COLS.map(c => ({ wch: c.w }))
    ws['!rows'] = [{ hpt: 26 }, { hpt: 16 }, { hpt: 6 }, { hpt: 30 }]
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: HEADER_ROW, c: 0 }, e: { r: FIRST_DATA + data.length - 1, c: ncols - 1 } }) }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'GESCON')
    XLSX.writeFile(wb, `GESCON_Contratos_ASIC_${hoy}.xlsx`)
    toast.add({ severity: 'success', summary: 'Excel descargado', detail: `${data.length} registros exportados`, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo generar el Excel', detail: e?.message, life: 4000 })
  } finally {
    exportando.value = false
  }
}

function confirmarEliminar(row) {
  const label = row.codigo_sic_contrato || row.contrato_interno || `ID ${row.id}`
  const planta = row.planta_nombre ? ` (${row.planta_nombre})` : ''
  confirm.require({
    message: `¿Eliminar el registro GESCON "${label}"${planta}? Esta acción no se puede deshacer.`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await api.delete(`/asic/${row.id}`)
        rows.value = rows.value.filter(r => r.id !== row.id)
        toast.add({ severity: 'success', summary: 'Registro eliminado', life: 2000 })
      } catch (e) {
        const detail = e.response?.data?.detail
        toast.add({
          severity: 'error',
          summary: 'No se puede eliminar',
          detail: detail || 'Error al eliminar el registro GESCON.',
          life: 6000,
        })
      }
    },
  })
}

// ── Proyectos ─────────────────────────────────────────────────────
const proyectos = ref([])
async function cargarProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 300 } })
    proyectos.value = (data.items ?? data).sort((a, b) =>
      a.nombre_comercial.localeCompare(b.nombre_comercial))
  } catch { /* silencioso */ }
}

// ── Formulario ────────────────────────────────────────────────────
const dialogVisible = ref(false)
const guardando = ref(false)
const errores = ref({})
const editandoId = ref(null)

const FORM_INICIAL = () => ({
  tipo_solicitud: null,
  estado_solicitud: 'en_proceso',
  codigo_sic_contrato: '',
  contrato_interno: '',
  nombre_interno: '',
  codigo_sic_vendedor: 'UNGG',
  codigo_sic_comprador: '',
  prioridad_limitacion: null,
  proyecto_id: null,
  fecha_solicitud: null,
  fecha_inicio: null,
  fecha_fin: null,
  tipo_mercado: 'No regulado',
  tipo_asignacion: '',
  porcentaje_fncer: 100,
  porcentaje_despacho: null,
  requerimiento_asic: '',
  nombre_contacto_solicitante: '',
  link_archivo: '',
  observaciones: '',
  reemplaza_anterior: true,
  es_duplicado: false,
})
const form = ref(FORM_INICIAL())

const opcionesEstadoForm = [
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Publicado', value: 'publicado' },
  { label: 'Rechazado', value: 'rechazado' },
  { label: 'Desistido', value: 'desistido' },
]

function abrirNuevo() {
  editandoId.value = null
  form.value = FORM_INICIAL()
  errores.value = {}
  dialogVisible.value = true
}

function parseDateField(v) {
  if (!v) return null
  return new Date(v + 'T12:00:00')
}

function abrirEditar(row) {
  editandoId.value = row.id
  form.value = {
    tipo_solicitud: row.tipo_solicitud,
    estado_solicitud: row.estado_solicitud,
    codigo_sic_contrato: row.codigo_sic_contrato || '',
    contrato_interno: row.contrato_interno || '',
    nombre_interno: row.nombre_interno || '',
    codigo_sic_vendedor: row.codigo_sic_vendedor || '',
    codigo_sic_comprador: row.codigo_sic_comprador || '',
    prioridad_limitacion: row.prioridad_limitacion,
    proyecto_id: row.proyecto_id,
    fecha_solicitud: parseDateField(row.fecha_solicitud),
    fecha_inicio: parseDateField(row.fecha_inicio),
    fecha_fin: parseDateField(row.fecha_fin),
    tipo_mercado: row.tipo_mercado || '',
    tipo_asignacion: row.tipo_asignacion || '',
    porcentaje_fncer: row.porcentaje_fncer,
    // despacho se almacena como fracción 0-1; el form lo edita en escala 0-100
    porcentaje_despacho: row.porcentaje_despacho != null ? Number((row.porcentaje_despacho * 100).toFixed(2)) : null,
    requerimiento_asic: row.requerimiento_asic || '',
    nombre_contacto_solicitante: row.nombre_contacto_solicitante || '',
    link_archivo: row.link_archivo || '',
    observaciones: row.observaciones || '',
    reemplaza_anterior: row.reemplaza_anterior ?? true,
    es_duplicado: row.es_duplicado ?? false,
  }
  errores.value = {}
  dialogVisible.value = true
}

function toIso(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return null
}

async function guardar() {
  errores.value = {}
  if (!form.value.tipo_solicitud) { errores.value.tipo_solicitud = 'Requerido'; return }
  if (!form.value.estado_solicitud) { errores.value.estado_solicitud = 'Requerido'; return }

  guardando.value = true
  try {
    const payload = {
      ...form.value,
      codigo_sic_contrato: form.value.codigo_sic_contrato || null,
      codigo_sic_vendedor: form.value.codigo_sic_vendedor || null,
      codigo_sic_comprador: form.value.codigo_sic_comprador || null,
      contrato_interno: form.value.contrato_interno || null,
      nombre_interno: form.value.nombre_interno || null,
      requerimiento_asic: form.value.requerimiento_asic || null,
      nombre_contacto_solicitante: form.value.nombre_contacto_solicitante || null,
      tipo_asignacion: form.value.tipo_asignacion || null,
      link_archivo: form.value.link_archivo || null,
      observaciones: form.value.observaciones || null,
      fecha_solicitud: toIso(form.value.fecha_solicitud),
      fecha_inicio: toIso(form.value.fecha_inicio),
      fecha_fin: toIso(form.value.fecha_fin),
      // despacho: el form usa escala 0-100 pero la BD/cumplimiento usa fracción 0-1
      porcentaje_despacho: form.value.porcentaje_despacho != null
        ? Number((form.value.porcentaje_despacho / 100).toFixed(4)) : null,
    }

    if (editandoId.value) {
      const { data } = await api.patch(`/asic/${editandoId.value}`, payload)
      const idx = rows.value.findIndex(r => r.id === editandoId.value)
      if (idx !== -1) rows.value.splice(idx, 1, data)
      else rows.value = [data, ...rows.value]
      rows.value = [...rows.value]
      toast.add({ severity: 'success', summary: 'Actualizado', detail: 'Contrato ASIC actualizado', life: 3000 })
    } else {
      const { data } = await api.post('/asic', payload)
      rows.value = [data, ...rows.value]
      toast.add({ severity: 'success', summary: 'Guardado', detail: 'Contrato ASIC registrado', life: 3000 })
    }
    dialogVisible.value = false
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'Error al guardar', life: 4000 })
  } finally {
    guardando.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}
function esVencido(d) { return d && d < hoy }

// porcentaje_despacho se almacena como fracción 0-1 (1 = 100%); el backend de
// cumplimiento lo usa como multiplicador directo (gen × pct_despacho). Para mostrar
// se multiplica ×100, igual que en CumplimientoV2View.
function despachoPct(v) {
  if (v == null || v === '') return null
  const n = Number(v) * 100
  if (Number.isNaN(n)) return null
  return Number.isInteger(n) ? n : Number(n.toFixed(2))
}
// Valor fuera de la escala canónica 0-1 (p.ej. un 100 guardado por el formulario
// antiguo). Se resalta para que se corrija: rompe el cálculo de cumplimiento.
function despachoAnomalo(v) { return v != null && v !== '' && Number(v) > 1 }

const TIPO_LABELS = { registro: 'Registro', modificacion: 'Modificación', terminacion: 'Terminación', desistimiento: 'Desistimiento' }
const TIPO_SEV = { registro: 'success', modificacion: 'info', terminacion: 'warn', desistimiento: 'secondary' }
function tipoLabel(v) { return TIPO_LABELS[v] || v }
function tipoSeverity(v) { return TIPO_SEV[v] || 'secondary' }

const ESTADO_LABELS = { publicado: 'Publicado', en_proceso: 'En proceso', rechazado: 'Rechazado', desistido: 'Desistido' }
const ESTADO_SEV = { publicado: 'success', en_proceso: 'info', rechazado: 'danger', desistido: 'secondary' }
function estadoLabel(v) { return ESTADO_LABELS[v] || v }
function estadoSeverity(v) { return ESTADO_SEV[v] || 'secondary' }

onMounted(() => { cargar(); cargarProyectos() })
</script>
