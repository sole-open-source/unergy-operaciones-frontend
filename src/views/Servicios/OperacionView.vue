<template>
  <div class="space-y-5">

    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="flex items-center gap-2">
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.back()" class="-ml-1" />
      <div>
        <p class="text-xs leading-none mb-0.5" style="color:#9b89b5">
          <span class="cursor-pointer hover:underline"
            @click="$router.push(`/proyectos/${route.params.id}`)">
            {{ proyectoNombre || '…' }}
          </span>
          <span class="mx-1.5">›</span>
          <span>Servicios</span>
          <span class="mx-1.5">›</span>
          <span class="font-medium" style="color:#2C2039">Operación</span>
        </p>
        <h2 class="text-lg font-bold" style="color:#2C2039">Operación</h2>
      </div>
    </div>

    <!-- ── Loading ───────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- ── Tabs ──────────────────────────────────────────────────────────────── -->
    <TabView v-else @tab-change="onTabChange">

      <!-- ══════════ MANTENIMIENTO ══════════ -->
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-1.5 px-1">
            <i class="pi pi-wrench text-xs" />
            <span>Mantenimiento</span>
          </div>
        </template>
        <div class="space-y-5 pt-3">

          <!-- Info card -->
          <template v-if="contratos.mantenimiento">
            <div class="rounded-xl border bg-white p-5" style="border-color:#f59e0b40">
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:#fef3c7">
                    <i class="pi pi-wrench text-sm" style="color:#f59e0b" />
                  </div>
                  <span class="text-sm font-semibold" style="color:#2C2039">Contrato de Mantenimiento</span>
                  <Tag :value="CONTRATO_LABELS[contratos.mantenimiento.estado]"
                       :severity="CONTRATO_SEVERITY[contratos.mantenimiento.estado]" class="text-xs" />
                </div>
                <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                  @click="openEditContrato('mantenimiento')" />
                <Button icon="pi pi-plus" label="Nuevo contrato" size="small" outlined
                  style="border-color:#f59e0b;color:#f59e0b"
                  @click="openWizard('mantenimiento')" />
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                <InfoIcon icon="pi pi-user" color="#f59e0b" label="Contratante"
                  :value="contratos.mantenimiento.contratante_nombre" />
                <InfoIcon icon="pi pi-briefcase" color="#f59e0b" label="Prestador"
                  :value="contratos.mantenimiento.prestador_nombre" />
                <InfoIcon icon="pi pi-calendar" color="#f59e0b" label="Fecha de inicio O&M"
                  :value="formatFecha(contratos.mantenimiento.fecha_inicio)" />
                <InfoIcon icon="pi pi-dollar" color="#f59e0b" label="Valor O&M Anual (BASE)"
                  :value="formatCOP(contratos.mantenimiento.tarifa_base)" />
                <InfoIcon icon="pi pi-calculator" color="#f59e0b" label="Valor mensual"
                  :value="formatCOP(contratos.mantenimiento.tarifa_base != null ? contratos.mantenimiento.tarifa_base / 12 : null)" />
                <InfoLink color="#f59e0b" label="Enlace del contrato en Drive"
                  :href="contratos.mantenimiento.enlace_drive" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-10 text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style="background:#fef3c7">
                <i class="pi pi-wrench text-xl" style="color:#f59e0b" />
              </div>
              <p class="text-sm font-medium text-gray-600 mb-1">Sin contrato de mantenimiento</p>
              <p class="text-xs text-gray-400 mb-4">Registra el contrato para iniciar el seguimiento de pagos</p>
              <Button label="Crear contrato" icon="pi pi-plus" size="small"
                style="background:#f59e0b;border-color:#f59e0b"
                @click="openWizard('mantenimiento')" />
            </div>
          </template>

          <!-- Payments section -->
          <PagosTabla
            tipo="mantenimiento"
            color="#f59e0b"
            :contrato-id="contratos.mantenimiento?.id ?? null"
            :pagos="pagos.mantenimiento"
            :loading-pagos="loadingPagos.mantenimiento"
            :filtros="filtros.mantenimiento"
            @open-pago="openNuevoPago('mantenimiento')"
            @eliminar="(id) => eliminarPago('mantenimiento', id)"
          />
        </div>
      </TabPanel>

      <!-- ══════════ ARRIENDOS ══════════ -->
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-1.5 px-1">
            <i class="pi pi-home text-xs" />
            <span>Arriendos</span>
          </div>
        </template>
        <div class="space-y-5 pt-3">

          <template v-if="contratos.arriendo">
            <div class="rounded-xl border bg-white p-5" style="border-color:#8b5cf640">
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:#f5f3ff">
                    <i class="pi pi-home text-sm" style="color:#8b5cf6" />
                  </div>
                  <span class="text-sm font-semibold" style="color:#2C2039">Contrato de Arriendo</span>
                  <Tag :value="CONTRATO_LABELS[contratos.arriendo.estado]"
                       :severity="CONTRATO_SEVERITY[contratos.arriendo.estado]" class="text-xs" />
                </div>
                <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                  @click="openEditContrato('arriendo')" />
                <Button icon="pi pi-plus" label="Nuevo contrato" size="small" outlined
                  style="border-color:#8b5cf6;color:#8b5cf6"
                  @click="openWizard('arriendo')" />
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                <InfoIcon icon="pi pi-user" color="#8b5cf6" label="Contratante"
                  :value="contratos.arriendo.contratante_nombre" />
                <InfoIcon icon="pi pi-briefcase" color="#8b5cf6" label="Prestador"
                  :value="contratos.arriendo.prestador_nombre" />
                <InfoIcon icon="pi pi-calendar-plus" color="#8b5cf6" label="Fecha firma contrato"
                  :value="formatFecha(contratos.arriendo.fecha_firma_contrato)" />
                <InfoIcon icon="pi pi-dollar" color="#8b5cf6" label="Valor anual (BASE)"
                  :value="formatCOP(contratos.arriendo.tarifa_base)" />
                <InfoIcon icon="pi pi-calculator" color="#8b5cf6" label="Valor arriendo mensual"
                  :value="formatCOP(contratos.arriendo.tarifa_base != null ? contratos.arriendo.tarifa_base / 12 : null)" />
                <InfoLink color="#8b5cf6" label="Enlace del contrato en Drive"
                  :href="contratos.arriendo.enlace_drive" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style="background:#f5f3ff">
                <i class="pi pi-home text-xl" style="color:#8b5cf6" />
              </div>
              <p class="text-sm font-medium text-gray-600 mb-1">Sin contrato de arriendo</p>
              <p class="text-xs text-gray-400 mb-4">Registra el contrato para iniciar el seguimiento de pagos</p>
              <Button label="Crear contrato" icon="pi pi-plus" size="small"
                style="background:#8b5cf6;border-color:#8b5cf6"
                @click="openWizard('arriendo')" />
            </div>
          </template>

          <PagosTabla
            tipo="arriendo"
            color="#8b5cf6"
            :contrato-id="contratos.arriendo?.id ?? null"
            :pagos="pagos.arriendo"
            :loading-pagos="loadingPagos.arriendo"
            :filtros="filtros.arriendo"
            @open-pago="openNuevoPago('arriendo')"
            @eliminar="(id) => eliminarPago('arriendo', id)"
          />
        </div>
      </TabPanel>

      <!-- ══════════ INTERNET ══════════ -->
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-1.5 px-1">
            <i class="pi pi-wifi text-xs" />
            <span>Internet</span>
          </div>
        </template>
        <div class="space-y-5 pt-3">

          <template v-if="contratos.internet">
            <div class="rounded-xl border bg-white p-5" style="border-color:#06b6d440">
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:#ecfeff">
                    <i class="pi pi-wifi text-sm" style="color:#06b6d4" />
                  </div>
                  <span class="text-sm font-semibold" style="color:#2C2039">Servicio de Internet</span>
                  <Tag :value="CONTRATO_LABELS[contratos.internet.estado]"
                       :severity="CONTRATO_SEVERITY[contratos.internet.estado]" class="text-xs" />
                </div>
                <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                  @click="openEditContrato('internet')" />
                <Button icon="pi pi-plus" label="Nuevo servicio" size="small" outlined
                  style="border-color:#06b6d4;color:#06b6d4"
                  @click="openWizard('internet')" />
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
                <InfoIcon icon="pi pi-building" color="#06b6d4" label="Proveedor"
                  :value="contratos.internet.prestador_nombre" />
                <InfoIcon icon="pi pi-dollar" color="#06b6d4" label="Valor facturado"
                  :value="formatCOP(contratos.internet.tarifa_base)" />
                <InfoBadge color="#06b6d4" label="Estado del pago"
                  :estado="contratos.internet.estado_pago" />
                <InfoLink color="#06b6d4" label="Factura / Contrato en Drive"
                  :href="contratos.internet.enlace_drive" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/40 p-10 text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style="background:#ecfeff">
                <i class="pi pi-wifi text-xl" style="color:#06b6d4" />
              </div>
              <p class="text-sm font-medium text-gray-600 mb-1">Sin servicio de internet registrado</p>
              <p class="text-xs text-gray-400 mb-4">Registra el proveedor para iniciar el seguimiento de pagos</p>
              <Button label="Registrar servicio" icon="pi pi-plus" size="small"
                style="background:#06b6d4;border-color:#06b6d4"
                @click="openWizard('internet')" />
            </div>
          </template>

          <PagosTabla
            tipo="internet"
            color="#06b6d4"
            :contrato-id="contratos.internet?.id ?? null"
            :pagos="pagos.internet"
            :loading-pagos="loadingPagos.internet"
            :filtros="filtros.internet"
            @open-pago="openNuevoPago('internet')"
            @eliminar="(id) => eliminarPago('internet', id)"
          />
        </div>
      </TabPanel>

    </TabView>

    <!-- ── Wizard nuevo contrato ──────────────────────────────────────────────── -->
    <ContratoServicioWizard
      v-if="wizardVisible"
      :visible="wizardVisible"
      :tipo="wizardTipo"
      :proyecto-id-default="Number(route.params.id)"
      @cerrar="wizardVisible = false"
      @creado="onContratoCreado"
    />

    <!-- ── Dialog editar contrato ───────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogEdit.visible" modal :style="{ width: '480px' }"
      :breakpoints="{ '520px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-pencil text-sm" :style="`color:${DIALOG_EDIT_COLOR[dialogEdit.tipo]}`" />
          <span class="font-semibold text-sm" style="color:#2C2039">
            Editar — {{ DIALOG_EDIT_LABEL[dialogEdit.tipo] }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div v-if="dialogEdit.tipo === 'mantenimiento'" class="col-span-2 md:col-span-1 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha de inicio O&amp;M</label>
            <DatePicker v-model="dialogEdit.form.fecha_inicio"
              dateFormat="yy-mm-dd" class="w-full" showClear placeholder="aaaa-mm-dd" />
          </div>
          <div v-else-if="dialogEdit.tipo === 'arriendo'" class="col-span-2 md:col-span-1 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha firma contrato</label>
            <DatePicker v-model="dialogEdit.form.fecha_firma_contrato"
              dateFormat="yy-mm-dd" class="w-full" showClear placeholder="aaaa-mm-dd" />
          </div>
          <div class="flex flex-col gap-1" :class="dialogEdit.tipo === 'internet' ? 'col-span-2 md:col-span-1' : ''">
            <label class="text-xs font-medium text-gray-600">
              {{ dialogEdit.tipo === 'mantenimiento' ? 'Valor O&M Anual BASE (COP)' : dialogEdit.tipo === 'arriendo' ? 'Valor anual BASE (COP)' : 'Valor facturado (COP)' }}
            </label>
            <InputNumber v-model="dialogEdit.form.tarifa_base"
              mode="currency" currency="COP" locale="es-CO" :maxFractionDigits="0"
              class="w-full" placeholder="$ 0" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Estado del pago</label>
          <Select v-model="dialogEdit.form.estado_pago" :options="ESTADO_PAGO_OPCIONES"
            optionLabel="label" optionValue="value" placeholder="Sin definir" showClear class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Enlace en Drive</label>
          <InputText v-model="dialogEdit.form.enlace_drive"
            placeholder="https://drive.google.com/…" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogEdit.visible = false" />
        <Button label="Guardar cambios" icon="pi pi-check" :loading="guardandoContrato"
          @click="saveContrato"
          :style="`background:${DIALOG_EDIT_COLOR[dialogEdit.tipo]};border-color:${DIALOG_EDIT_COLOR[dialogEdit.tipo]}`" />
      </template>
    </Dialog>

    <!-- ── Dialog nuevo pago ─────────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogPago.visible" modal header="Registrar pago" :style="{ width: '420px' }"
      :breakpoints="{ '500px': '95vw' }">
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Mes</label>
            <Select v-model="dialogPago.form.mes" :options="MESES_OPCIONES"
              optionLabel="label" optionValue="value" placeholder="Mes" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Año</label>
            <InputNumber v-model="dialogPago.form.año" :useGrouping="false"
              :min="2020" :max="2099" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Valor pagado (COP)</label>
          <InputNumber v-model="dialogPago.form.valor_pagado" mode="currency" currency="COP"
            locale="es-CO" :maxFractionDigits="0" class="w-full" placeholder="$ 0" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Estado</label>
          <Select v-model="dialogPago.form.estado" :options="ESTADO_PAGO_OPCIONES"
            optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Enlace de factura (Drive)</label>
          <InputText v-model="dialogPago.form.enlace_factura" placeholder="https://drive.google.com/…" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogPago.visible = false" />
        <Button label="Registrar" icon="pi pi-check" :loading="guardandoPago" @click="guardarPago" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import ContratoServicioWizard from '@/views/Contratos/ContratoServicioWizard.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// ── Constantes ────────────────────────────────────────────────────────────────
const MESES_NOMBRES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const MESES_OPCIONES = MESES_NOMBRES.slice(1).map((m, i) => ({ label: m, value: i + 1 }))

const ESTADO_PAGO_OPCIONES = [
  { label: 'Pendiente',  value: 'pendiente' },
  { label: 'Revisado',   value: 'revisado' },
  { label: 'Aprobado',   value: 'aprobado' },
]

const ESTADO_PAGO_LABELS    = { pendiente: 'Pendiente', revisado: 'Revisado', aprobado: 'Aprobado' }
const ESTADO_PAGO_SEVERITY  = { pendiente: 'danger', revisado: 'warn', aprobado: 'success' }

const CONTRATO_LABELS   = { vigente: 'Vigente', vencido: 'Vencido', terminado: 'Terminado', en_renovacion: 'En renovación' }
const CONTRATO_SEVERITY = { vigente: 'success', vencido: 'danger', terminado: 'secondary', en_renovacion: 'warn' }

const TABS_TIPOS = ['mantenimiento', 'arriendo', 'internet']

const DIALOG_EDIT_COLOR = { mantenimiento: '#f59e0b', arriendo: '#8b5cf6', internet: '#06b6d4' }
const DIALOG_EDIT_LABEL = { mantenimiento: 'Mantenimiento', arriendo: 'Arriendo', internet: 'Internet' }

// ── Estado reactivo ───────────────────────────────────────────────────────────
const loading          = ref(true)
const proyectoNombre   = ref('')
const guardandoPago    = ref(false)
const guardandoContrato = ref(false)

const contratos = reactive({ mantenimiento: null, arriendo: null, internet: null })
const pagos     = reactive({ mantenimiento: [],   arriendo: [],   internet: [] })
const loadingPagos = reactive({ mantenimiento: false, arriendo: false, internet: false })

const filtros = reactive({
  mantenimiento: { año: null, mes: null },
  arriendo:      { año: null, mes: null },
  internet:      { año: null, mes: null },
})

const wizardVisible = ref(false)
const wizardTipo    = ref('mantenimiento')

const dialogEdit = reactive({
  visible: false,
  tipo: 'mantenimiento',
  form: { tarifa_base: null, fecha_firma_contrato: null, fecha_inicio: null, enlace_drive: '', estado_pago: null },
})

const dialogPago = reactive({
  visible: false,
  tipo: 'mantenimiento',
  form: { mes: null, año: new Date().getFullYear(), valor_pagado: null, estado: 'pendiente', enlace_factura: '' },
})

// ── Carga inicial ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const proyId = route.params.id
  try {
    const [proyRes, mantRes, arrRes, netRes] = await Promise.allSettled([
      api.get(`/proyectos/${proyId}`),
      api.get('/contratos-servicio', { params: { tipo: 'mantenimiento', proyecto_id: proyId } }),
      api.get('/contratos-servicio', { params: { tipo: 'arriendo',      proyecto_id: proyId } }),
      api.get('/contratos-servicio', { params: { tipo: 'internet',      proyecto_id: proyId } }),
    ])

    if (proyRes.status === 'fulfilled') proyectoNombre.value = proyRes.value.data.nombre_comercial

    contratos.mantenimiento = mantRes.status === 'fulfilled' && mantRes.value.data.length ? mantRes.value.data[0] : null
    contratos.arriendo      = arrRes.status  === 'fulfilled' && arrRes.value.data.length  ? arrRes.value.data[0]  : null
    contratos.internet      = netRes.status  === 'fulfilled' && netRes.value.data.length  ? netRes.value.data[0]  : null

    await loadPagos('mantenimiento')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: e.message, life: 4000 })
  } finally {
    loading.value = false
  }
})

// ── Pagos ─────────────────────────────────────────────────────────────────────
async function loadPagos(tipo) {
  if (!contratos[tipo]) { pagos[tipo] = []; return }
  loadingPagos[tipo] = true
  try {
    const { data } = await api.get(`/contratos-servicio/${contratos[tipo].id}/pagos`)
    pagos[tipo] = data
  } catch {
    pagos[tipo] = []
  } finally {
    loadingPagos[tipo] = false
  }
}

function onTabChange(e) {
  const tipo = TABS_TIPOS[e.index]
  if (tipo) loadPagos(tipo)
}

function openNuevoPago(tipo) {
  dialogPago.tipo = tipo
  dialogPago.form = { mes: null, año: new Date().getFullYear(), valor_pagado: null, estado: 'pendiente', enlace_factura: '' }
  dialogPago.visible = true
}

async function guardarPago() {
  const tipo = dialogPago.tipo
  if (!contratos[tipo]) return
  if (!dialogPago.form.mes || !dialogPago.form.año) {
    toast.add({ severity: 'warn', summary: 'Completa mes y año', life: 2500 })
    return
  }
  guardandoPago.value = true
  try {
    await api.post(`/contratos-servicio/${contratos[tipo].id}/pagos`, {
      mes:          dialogPago.form.mes,
      año:          dialogPago.form.año,
      valor_pagado: dialogPago.form.valor_pagado,
      estado:       dialogPago.form.estado,
      enlace_factura: dialogPago.form.enlace_factura || null,
    })
    await loadPagos(tipo)
    dialogPago.visible = false
    toast.add({ severity: 'success', summary: 'Pago registrado', life: 2500 })
  } catch (e) {
    const msg = e.response?.data?.detail
    const isDup = typeof msg === 'string' && msg.includes('uq_pago_servicio')
    toast.add({
      severity: 'error',
      summary: isDup ? 'Ya existe un pago para ese período' : 'Error al registrar',
      detail: isDup ? undefined : String(msg ?? ''),
      life: 4000,
    })
  } finally {
    guardandoPago.value = false
  }
}

async function eliminarPago(tipo, pagoId) {
  if (!contratos[tipo]) return
  if (!confirm('¿Eliminar este pago?')) return
  try {
    await api.delete(`/contratos-servicio/${contratos[tipo].id}/pagos/${pagoId}`)
    pagos[tipo] = pagos[tipo].filter(p => p.id !== pagoId)
    toast.add({ severity: 'success', summary: 'Pago eliminado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ── Edición de contrato ───────────────────────────────────────────────────────
function openEditContrato(tipo) {
  const c = contratos[tipo]
  if (!c) return
  dialogEdit.tipo = tipo
  dialogEdit.form.tarifa_base = c.tarifa_base
  dialogEdit.form.fecha_firma_contrato = c.fecha_firma_contrato ? new Date(c.fecha_firma_contrato) : null
  dialogEdit.form.fecha_inicio = c.fecha_inicio ? new Date(c.fecha_inicio) : null
  dialogEdit.form.enlace_drive = c.enlace_drive || ''
  dialogEdit.form.estado_pago = c.estado_pago || null
  dialogEdit.visible = true
}

async function saveContrato() {
  const tipo = dialogEdit.tipo
  if (!contratos[tipo]) return
  guardandoContrato.value = true
  try {
    const toISO = d => d instanceof Date ? d.toISOString().slice(0, 10) : (d || null)
    const payload = {
      tarifa_base: dialogEdit.form.tarifa_base,
      enlace_drive: dialogEdit.form.enlace_drive?.trim() || null,
      estado_pago: dialogEdit.form.estado_pago || null,
    }
    if (tipo === 'mantenimiento') {
      payload.fecha_inicio = toISO(dialogEdit.form.fecha_inicio)
    } else {
      payload.fecha_firma_contrato = toISO(dialogEdit.form.fecha_firma_contrato)
    }
    const { data } = await api.patch(`/contratos-servicio/${contratos[tipo].id}`, payload)
    contratos[tipo] = { ...contratos[tipo], ...data }
    dialogEdit.visible = false
    toast.add({ severity: 'success', summary: 'Contrato actualizado', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al guardar', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    guardandoContrato.value = false
  }
}

// ── Wizard ────────────────────────────────────────────────────────────────────
function openWizard(tipo) {
  wizardTipo.value = tipo
  wizardVisible.value = true
}

async function onContratoCreado() {
  const tipo = wizardTipo.value
  const proyId = route.params.id
  try {
    const { data } = await api.get('/contratos-servicio', { params: { tipo, proyecto_id: proyId } })
    contratos[tipo] = data.length ? data[0] : null
    await loadPagos(tipo)
  } catch { /* ignore */ }
}

// ── Helpers de formato ────────────────────────────────────────────────────────
function formatCOP(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

function formatFecha(f) {
  if (!f) return '—'
  return String(f).slice(0, 10)
}
</script>

<!-- ── Componentes inline ─────────────────────────────────────────────────────── -->
<script>
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'

const MESES_NOMBRES_STATIC = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const MESES_OPCIONES_STATIC = MESES_NOMBRES_STATIC.slice(1).map((m, i) => ({ label: m, value: i + 1 }))

const ESTADO_PAGO_LABELS_S   = { pendiente: 'Pendiente', revisado: 'Revisado', aprobado: 'Aprobado' }
const ESTADO_PAGO_SEVERITY_S = { pendiente: 'danger', revisado: 'warn', aprobado: 'success' }

const AÑOS_STATIC = (() => {
  const cur = new Date().getFullYear()
  return Array.from({ length: cur - 2020 + 2 }, (_, i) => 2020 + i)
})()

// Campo con ícono + etiqueta + valor
const InfoIcon = {
  props: {
    icon: String, color: String,
    label: String, value: [String, Number],
  },
  template: `
    <div class="flex items-start gap-2.5 min-w-0">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        :style="'background:' + color + '18'">
        <i :class="icon + ' text-xs'" :style="'color:' + color" />
      </div>
      <div class="min-w-0">
        <p class="text-xs font-medium leading-none mb-0.5" style="color:#9b89b5">{{ label }}</p>
        <p class="text-sm font-medium truncate" style="color:#2C2039">{{ value ?? '—' }}</p>
      </div>
    </div>
  `,
}

// Badge de estado de pago con etiqueta
const InfoBadge = {
  components: { Tag },
  props: { color: String, label: String, estado: String },
  data() {
    return { ESTADO_PAGO_LABELS_S, ESTADO_PAGO_SEVERITY_S }
  },
  template: `
    <div class="flex items-start gap-2.5">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        :style="'background:' + color + '18'">
        <i class="pi pi-credit-card text-xs" :style="'color:' + color" />
      </div>
      <div>
        <p class="text-xs font-medium leading-none mb-1" style="color:#9b89b5">{{ label }}</p>
        <Tag v-if="estado" :value="ESTADO_PAGO_LABELS_S[estado]" :severity="ESTADO_PAGO_SEVERITY_S[estado]" />
        <span v-else class="text-sm" style="color:#9ca3af">—</span>
      </div>
    </div>
  `,
}

// Enlace a Drive con ícono clicable
const InfoLink = {
  props: { color: String, label: String, href: String },
  template: `
    <div class="flex items-start gap-2.5">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        :style="'background:' + color + '18'">
        <i class="pi pi-link text-xs" :style="'color:' + color" />
      </div>
      <div>
        <p class="text-xs font-medium leading-none mb-0.5" style="color:#9b89b5">{{ label }}</p>
        <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer"
          class="text-sm font-medium hover:underline inline-flex items-center gap-1"
          style="color:#915BD8">
          <i class="pi pi-external-link text-xs" />
          Ver en Drive
        </a>
        <span v-else class="text-sm" style="color:#9ca3af">—</span>
      </div>
    </div>
  `,
}

// Tabla de pagos mensuales reutilizable
const PagosTabla = {
  components: { Tag, Button, DataTable, Column, Select },
  emits: ['open-pago', 'eliminar'],
  props: {
    tipo: String,
    color: String,
    contratoId: { type: Number, default: null },
    pagos: { type: Array, default: () => [] },
    loadingPagos: Boolean,
    filtros: { type: Object, default: () => ({ año: null, mes: null }) },
  },
  data() {
    return {
      MESES_NOMBRES_STATIC,
      MESES_OPCIONES_STATIC,
      ESTADO_PAGO_LABELS_S,
      ESTADO_PAGO_SEVERITY_S,
      AÑOS_STATIC,
    }
  },
  computed: {
    pagosFiltrados() {
      let result = this.pagos || []
      if (this.filtros.año) result = result.filter(p => p.año === this.filtros.año)
      if (this.filtros.mes) result = result.filter(p => p.mes === this.filtros.mes)
      return result
    },
    hayFiltros() {
      return this.filtros.año || this.filtros.mes
    },
  },
  methods: {
    limpiar() {
      this.filtros.año = null
      this.filtros.mes = null
    },
    formatCOPLocal(val) {
      if (val == null) return '—'
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    },
  },
  template: `
    <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#e5e7eb">
      <!-- Header de la tabla -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <i class="pi pi-table text-sm" :style="'color:' + color" />
          <span class="text-sm font-semibold" style="color:#2C2039">Historial de pagos</span>
        </div>
        <Button v-if="contratoId" label="Registrar pago" icon="pi pi-plus" size="small"
          :style="'background:' + color + ';border-color:' + color"
          @click="$emit('open-pago')" />
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50/60">
        <div class="flex items-center gap-1.5">
          <i class="pi pi-filter text-xs text-gray-400" />
          <span class="text-xs text-gray-400 font-medium">Filtrar por:</span>
        </div>
        <Select v-model="filtros.año" :options="AÑOS_STATIC" placeholder="Año"
          showClear class="text-sm" style="height:32px;min-width:90px" />
        <Select v-model="filtros.mes" :options="MESES_OPCIONES_STATIC"
          optionLabel="label" optionValue="value" placeholder="Mes"
          showClear class="text-sm" style="height:32px;min-width:110px" />
        <Button v-if="hayFiltros" label="Limpiar" text severity="secondary" size="small"
          icon="pi pi-times" @click="limpiar" />
        <span v-if="hayFiltros" class="text-xs text-gray-400 ml-auto">
          {{ pagosFiltrados.length }} resultado{{ pagosFiltrados.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Tabla -->
      <DataTable :value="pagosFiltrados" :loading="loadingPagos" stripedRows
        class="text-sm" rowHover
        emptyMessage="Sin pagos registrados para este período.">
        <Column header="Mes" style="width:120px">
          <template #body="{ data }">
            <span class="font-medium" style="color:#2C2039">{{ MESES_NOMBRES_STATIC[data.mes] }}</span>
          </template>
        </Column>
        <Column field="año" header="Año" style="width:80px">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ data.año }}</span>
          </template>
        </Column>
        <Column header="Valor pagado" style="width:150px">
          <template #body="{ data }">
            <span class="font-semibold tabular-nums" style="color:#2C2039">
              {{ formatCOPLocal(data.valor_pagado) }}
            </span>
          </template>
        </Column>
        <Column header="Estado" style="width:130px">
          <template #body="{ data }">
            <Tag :value="ESTADO_PAGO_LABELS_S[data.estado]"
                 :severity="ESTADO_PAGO_SEVERITY_S[data.estado]" />
          </template>
        </Column>
        <Column header="Factura" style="width:90px" bodyClass="text-center">
          <template #body="{ data }">
            <a v-if="data.enlace_factura" :href="data.enlace_factura"
              target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style="color:#915BD8">
              <i class="pi pi-external-link" />
              Ver
            </a>
            <span v-else class="text-gray-300 text-sm">—</span>
          </template>
        </Column>
        <Column style="width:50px" bodyClass="text-right">
          <template #body="{ data }">
            <Button icon="pi pi-trash" text severity="danger" size="small"
              @click="$emit('eliminar', data.id)" v-tooltip.left="'Eliminar'" />
          </template>
        </Column>
      </DataTable>
    </div>
  `,
}

export default {
  components: { InfoIcon, InfoBadge, InfoLink, PagosTabla },
}
</script>
