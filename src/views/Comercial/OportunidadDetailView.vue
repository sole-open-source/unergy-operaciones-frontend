<template>
  <div class="p-4 md:p-6" v-if="op">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text rounded @click="$router.push('/comercial')" />
        <div>
          <h1 class="text-xl font-semibold">{{ op.nombre }}</h1>
          <router-link :to="`/clientes/${op.cliente_id}`" class="text-sm text-primary underline">
            {{ op.cliente_razon_social }}
          </router-link>
        </div>
        <Tag v-if="op.alerta" severity="danger" :value="`⚠ ${op.dias_sin_respuesta} días sin respuesta`" />
      </div>
    </div>

    <!-- Stepper de estado -->
    <div class="flex items-center gap-1 mb-6 flex-wrap">
      <template v-for="(e, i) in ESTADOS" :key="e.value">
        <button
          class="px-3 py-1.5 rounded-full text-sm border transition"
          :class="e.value === op.estado
            ? 'bg-primary text-white border-primary font-semibold'
            : 'bg-white text-gray-600 hover:bg-gray-100'"
          @click="cambiarEstado(e.value)">
          {{ e.label }}
        </button>
        <i v-if="i < ESTADOS.length - 1" class="pi pi-angle-right text-gray-400 text-xs" />
      </template>
      <span class="text-xs text-gray-500 ml-2">en este estado desde {{ fmtFecha(op.estado_desde) }}</span>
    </div>

    <TabView>
      <!-- Seguimiento -->
      <TabPanel header="Seguimiento">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label class="block text-sm font-medium mb-1">Nombre del negocio</label>
            <InputText v-model.trim="seg.nombre" class="w-full" @update:modelValue="autosave" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Tipo de servicio</label>
            <Dropdown v-model="seg.tipo_servicio" :options="TIPOS_SERVICIO" optionLabel="label" optionValue="value"
                      showClear class="w-full" @update:modelValue="autosave" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Nº de oferta (consecutivo manual)</label>
            <InputText v-model.trim="seg.numero_oferta" class="w-full" @update:modelValue="autosave" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Fecha estimada de firma</label>
            <Calendar v-model="seg.fecha_estimada_firma" dateFormat="yy-mm-dd" showIcon class="w-full" @update:modelValue="autosave" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Fecha tentativa inicio — representación</label>
            <Calendar v-model="seg.fecha_tentativa_inicio_representacion" dateFormat="yy-mm-dd" showIcon class="w-full" @update:modelValue="autosave" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Fecha tentativa inicio — compra de energía</label>
            <Calendar v-model="seg.fecha_tentativa_inicio_compra_energia" dateFormat="yy-mm-dd" showIcon class="w-full" @update:modelValue="autosave" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Notas</label>
            <Textarea v-model="seg.notas" rows="3" autoResize class="w-full" @update:modelValue="autosave" />
          </div>
          <small class="text-gray-400 md:col-span-2">{{ estadoGuardado }}</small>
        </div>
      </TabPanel>

      <!-- Cliente y contactos -->
      <TabPanel header="Cliente y contactos">
        <div class="max-w-4xl flex flex-col gap-6">
          <ClienteForm :initial="clienteFull" @save="patchCliente" @cancel="() => {}" />
          <ContactosPanel :cliente-id="op.cliente_id" />
        </div>
      </TabPanel>

      <!-- Oferta -->
      <TabPanel header="Oferta">
        <div class="max-w-3xl">
          <p class="text-sm text-gray-500 mb-3">
            Documentos de la oferta (Nº {{ op.numero_oferta || '—' }}). Se guardan como documentos
            comerciales del cliente, vinculados a esta oportunidad.
          </p>
          <div class="flex flex-col gap-3">
            <div v-for="t in TIPOS_DOC_OFERTA" :key="t.value" class="border rounded-md p-3">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">{{ t.label }}</span>
                  <template v-if="docPorTipo(t.value)">
                    <Tag :value="docPorTipo(t.value).estado" />
                    <span v-if="docPorTipo(t.value).numero" class="text-xs text-gray-500">Nº {{ docPorTipo(t.value).numero }}</span>
                    <a v-if="docPorTipo(t.value).archivo_url" :href="docPorTipo(t.value).archivo_url" target="_blank"
                       class="text-primary text-xs underline">{{ docPorTipo(t.value).archivo_nombre || 'archivo' }}</a>
                  </template>
                  <span v-else class="text-xs text-gray-400">sin registrar</span>
                </div>
                <Button v-if="!docPorTipo(t.value)" label="Registrar" size="small" text icon="pi pi-plus"
                        @click="crearDoc(t.value, t.label)" />
              </div>
            </div>
          </div>
          <small class="text-gray-500 block mt-2">
            La subida de archivos y cambio de estado del documento se hacen en la ficha del cliente
            (tab Documentos) — mismo registro, misma información.
          </small>
        </div>
      </TabPanel>

      <!-- Ofertas (sub-ofertas planta × servicio) -->
      <TabPanel header="Ofertas">
        <OfertasPanel :oportunidad-id="op.id" :ofertas="op.ofertas || []" @changed="recargar" />
      </TabPanel>

      <!-- Proyectos (visible en todos los estados) -->
      <TabPanel header="Proyectos">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-500">{{ op.proyectos.length }} proyecto(s) vinculados</span>
          <Button label="Agregar proyecto" icon="pi pi-plus" size="small" @click="showAgregarProyecto = true" />
        </div>
        <DataTable :value="proyectosFilas" class="text-sm" dataKey="id" selectionMode="single"
                   @row-click="$router.push(`/proyectos/${$event.data.id}`)">
          <Column field="nombre_comercial" header="Nombre" />
          <Column header="Capacidad">
            <template #body="{ data }">{{ data.potencia_instalada_kwp ? `${data.potencia_instalada_kwp} kWp` : '—' }}</template>
          </Column>
          <Column field="municipio" header="Municipio" />
          <Column field="operador_red" header="Operador de red" />
          <Column header="Gen. proyectada (MWh/mes)">
            <template #body="{ data }">{{ data.mwh_mes_estimado ?? '—' }}</template>
          </Column>
          <Column field="fecha_estimada_energizacion" header="Operación estimada" />
          <Column field="fecha_inicio_comercializacion" header="Inicio compra energía" />
        </DataTable>
        <AgregarProyectoDialog v-model:visible="showAgregarProyecto" :oportunidad-id="op.id" @creado="recargar" />
      </TabPanel>

      <!-- Contratos (Negociación) -->
      <TabPanel header="Contratos">
        <div class="flex items-center gap-2 mb-3">
          <Button label="Nuevo contrato PPA" icon="pi pi-plus" size="small" @click="showPpaWizard = true" />
          <Button label="Nuevo contrato de representación" icon="pi pi-plus" size="small" severity="secondary"
                  @click="showRepWizard = true" />
        </div>
        <h3 class="font-semibold text-sm mb-1">Contratos PPA del cliente</h3>
        <DataTable :value="contratosPpaFilas" class="text-sm mb-4" dataKey="id" selectionMode="single"
                   @row-click="$router.push(`/contratos/${$event.data.id}`)">
          <Column field="numero_codigo_contrato" header="Código" />
          <Column field="nombre_interno" header="Nombre interno" />
          <Column field="fecha_inicio" header="Inicio" />
          <Column field="fecha_fin" header="Fin" />
        </DataTable>
        <h3 class="font-semibold text-sm mb-1">Contratos de representación del cliente</h3>
        <DataTable :value="contratosRepFilas" class="text-sm" dataKey="id" selectionMode="single"
                   @row-click="$router.push(`/contratos/${$event.data.id}`)">
          <Column field="numero_contrato" header="Número" />
          <Column field="contratante_nombre" header="Contratante" />
          <Column field="fecha_inicio" header="Inicio" />
          <Column field="fecha_fin" header="Fin" />
        </DataTable>
        <PPAContratoWizard v-model:visible="showPpaWizard" :initialData="ppaInitialData"
                           @creado="recargarContratos" @cerrar="showPpaWizard = false" />
        <!-- ContratoServicioWizard no expone prop de cliente (solo `tipo` y `proyectoIdDefault`):
             el cliente se selecciona dentro del wizard. No se precarga aquí para no modificar el wizard compartido. -->
        <ContratoServicioWizard v-model:visible="showRepWizard" tipo="representacion"
                                @creado="recargarContratos" @cerrar="showRepWizard = false" />
      </TabPanel>

      <!-- Bitácora -->
      <TabPanel header="Bitácora">
        <BitacoraPanel :oportunidad-id="op.id" :gestiones="op.gestiones" :historial="op.historial"
                       @registrada="recargar" />
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import ClienteForm from '@/views/Clientes/ClienteForm.vue'
import ContactosPanel from '@/components/ContactosPanel.vue'
import PPAContratoWizard from '@/views/Contratos/PPAContratoWizard.vue'
import ContratoServicioWizard from '@/views/Contratos/ContratoServicioWizard.vue'
import AgregarProyectoDialog from './AgregarProyectoDialog.vue'
import BitacoraPanel from './BitacoraPanel.vue'
import OfertasPanel from './OfertasPanel.vue'

const route = useRoute()
const toast = useToast()

const ESTADOS = [
  { label: 'Prospección', value: 'prospeccion' },
  { label: 'Envío de oferta', value: 'envio_oferta' },
  { label: 'Negociación del contrato', value: 'negociacion_contrato' },
  { label: 'Firmado', value: 'firmado' },
  { label: 'Operando', value: 'operando' },
  { label: 'Declinado', value: 'declinado' },
]
const TIPOS_SERVICIO = [
  { label: 'Servicios operacionales', value: 'servicios_operacionales' },
  { label: 'Compra de energía', value: 'compra_energia' },
  { label: 'Comunidad energética', value: 'comunidad_energetica' },
]
const TIPOS_DOC_OFERTA = [
  { label: 'Oferta', value: 'oferta' },
  { label: 'Cámara de Comercio', value: 'camara_comercio' },
  { label: 'RUT', value: 'rut' },
]

const op = ref(null)
const clienteFull = ref({})
const seg = ref({})
const proyectosFilas = ref([])
const contratosPpaFilas = ref([])
const contratosRepFilas = ref([])
const showAgregarProyecto = ref(false)
const showPpaWizard = ref(false)
const showRepWizard = ref(false)
const estadoGuardado = ref('')
let saveTimer = null

// Precarga del PPA wizard: el cliente de la oportunidad entra como comprador.
// El wizard puebla su form con initialData[k] ?? null usando estas llaves
// (comprador_id/nombre/nit); no están excluidas en modo creación.
const ppaInitialData = computed(() => op.value ? {
  comprador_id: op.value.cliente_id,
  comprador_nombre: op.value.cliente_razon_social,
  comprador_nit: op.value.cliente_nit ?? null,
} : null)

watch(op, (v) => { proyectosFilas.value = v?.proyectos ?? [] })

function fmtFecha(v) { return v ? new Date(v).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '' }
function docPorTipo(tipo) { return (op.value?.documentos ?? []).find(d => d.tipo === tipo) }
function aFechaStr(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// PrimeVue Calendar espera un Date, no el string ISO del API — sin esto las
// fechas guardadas se ven vacías al cargar. aFechaStr() las vuelve a string al guardar.
function aFecha(s) { return s ? new Date(`${s}T00:00:00`) : null }

async function recargar() {
  const { data } = await api.get(`/comercial/oportunidades/${route.params.id}`)
  op.value = data
  seg.value = {
    nombre: data.nombre === data.cliente_razon_social ? '' : data.nombre,
    tipo_servicio: data.tipo_servicio,
    numero_oferta: data.numero_oferta,
    fecha_estimada_firma: aFecha(data.fecha_estimada_firma),
    fecha_tentativa_inicio_representacion: aFecha(data.fecha_tentativa_inicio_representacion),
    fecha_tentativa_inicio_compra_energia: aFecha(data.fecha_tentativa_inicio_compra_energia),
    notas: data.notas,
  }
}

async function cargarCliente() {
  const { data } = await api.get(`/clientes/${op.value.cliente_id}`)
  clienteFull.value = data
}

async function recargarContratos() {
  showPpaWizard.value = false
  showRepWizard.value = false
  const cid = op.value.cliente_id
  const [{ data: ppa }, { data: rep }] = await Promise.all([
    api.get(`/clientes/${cid}/contratos-ppa`),
    api.get('/contratos-servicio', { params: { tipo: 'representacion' } }),
  ])
  contratosPpaFilas.value = ppa.items ?? ppa
  const repArr = rep.items ?? rep
  contratosRepFilas.value = repArr.filter(c => c.contratante_id === cid || c.prestador_id === cid)
}

function autosave() {
  estadoGuardado.value = 'Guardando…'
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await api.patch(`/comercial/oportunidades/${op.value.id}`, {
        nombre: seg.value.nombre || null,
        tipo_servicio: seg.value.tipo_servicio,
        numero_oferta: seg.value.numero_oferta || null,
        fecha_estimada_firma: aFechaStr(seg.value.fecha_estimada_firma),
        fecha_tentativa_inicio_representacion: aFechaStr(seg.value.fecha_tentativa_inicio_representacion),
        fecha_tentativa_inicio_compra_energia: aFechaStr(seg.value.fecha_tentativa_inicio_compra_energia),
        notas: seg.value.notas || null,
      })
      estadoGuardado.value = 'Guardado ✓'
    } catch {
      estadoGuardado.value = 'Error al guardar — revisa e intenta de nuevo'
    }
  }, 800)
}

async function cambiarEstado(estado) {
  if (estado === op.value.estado) return
  try {
    await api.post(`/comercial/oportunidades/${op.value.id}/estado`, { estado })
    await recargar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo cambiar el estado', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}

async function patchCliente(payload) {
  try {
    await api.patch(`/clientes/${op.value.cliente_id}`, payload)
    toast.add({ severity: 'success', summary: 'Cliente actualizado', life: 2500 })
    await cargarCliente()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error al guardar cliente', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}

async function crearDoc(tipo, label) {
  try {
    await api.post(`/clientes/${op.value.cliente_id}/documentos`, {
      tipo, nombre: label,
      numero: tipo === 'oferta' ? (seg.value.numero_oferta || op.value.numero_oferta || null) : null,
      oportunidad_id: op.value.id,
    })
    await recargar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar el documento', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}

onMounted(async () => {
  await recargar()
  await Promise.all([cargarCliente(), recargarContratos()])
})

// Evita que un PATCH de autosave pendiente dispare tras desmontar la vista.
onBeforeUnmount(() => clearTimeout(saveTimer))
</script>
