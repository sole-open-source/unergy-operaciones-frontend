<template>
  <div v-if="contrato" class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <Button icon="pi pi-arrow-left" text @click="$router.back()" class="-ml-2 mb-1" />
        <!-- Modo lectura -->
        <template v-if="!editandoId">
          <h2 class="text-xl font-bold text-gray-800">
            {{ contrato.nombre_interno || contrato.numero_codigo_contrato || 'Contrato PPA' }}
          </h2>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="contrato.numero_codigo_contrato" class="text-xs text-gray-400 font-mono">
              {{ contrato.numero_codigo_contrato }}
            </span>
            <Tag value="PPA" severity="warning" class="text-xs" />
            <span class="text-xs text-gray-400">{{ contrato.proyectos?.length || 0 }} proyectos</span>
          </div>
        </template>
        <!-- Modo edición -->
        <template v-else>
          <div class="flex flex-col gap-2 mt-1">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-gray-500">Nombre interno</label>
              <InputText v-model="formId.nombre_interno" placeholder="Ej: Terpel 1" class="w-72" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-gray-500">Número de contrato</label>
              <InputText v-model="formId.numero_codigo_contrato" placeholder="Ej: UNERGY 001-2023" class="w-72" />
            </div>
          </div>
        </template>
      </div>
      <!-- Botones edición identificación -->
      <div class="flex gap-2 mt-1">
        <template v-if="!editandoId">
          <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
            @click="iniciarEdicionId" />
        </template>
        <template v-else>
          <Button label="Cancelar" size="small" text severity="secondary" @click="cancelarEdicionId" />
          <Button label="Guardar" icon="pi pi-check" size="small" :loading="guardandoId"
            @click="guardarId" />
        </template>
      </div>
    </div>

    <!-- Tabs -->
    <TabView>
      <!-- ══ DATOS ══ -->
      <TabPanel header="Datos">
        <div class="space-y-6 p-2">
          <!-- Partes -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide">Partes del contrato</p>
              <Button v-if="!editandoPartes" icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="iniciarEdicionPartes" />
              <div v-else class="flex gap-2">
                <Button label="Cancelar" size="small" text severity="secondary" @click="cancelarEdicionPartes" />
                <Button label="Guardar" icon="pi pi-check" size="small" :loading="guardandoPartes"
                  @click="guardarPartes" />
              </div>
            </div>
            <!-- Modo lectura -->
            <div v-if="!editandoPartes" class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Comprador" :value="contrato.comprador_nombre" />
              <InfoField label="NIT comprador" :value="contrato.comprador_nit" />
              <div />
              <InfoField label="Vendedor" :value="contrato.vendedor_nombre" />
              <InfoField label="NIT vendedor" :value="contrato.vendedor_nit" />
            </div>
            <!-- Modo edición -->
            <div v-else class="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
              <div class="space-y-3">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comprador</span>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">Nombre / Razón social</label>
                  <InputText v-model="formPartes.comprador_nombre" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">NIT</label>
                  <InputText v-model="formPartes.comprador_nit" class="w-full" />
                </div>
              </div>
              <div class="space-y-3">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vendedor</span>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">Nombre / Razón social</label>
                  <InputText v-model="formPartes.vendedor_nombre" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">NIT</label>
                  <InputText v-model="formPartes.vendedor_nit" class="w-full" />
                </div>
              </div>
            </div>
          </div>

          <Divider />

          <!-- Vigencia -->
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Vigencia</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Fecha inicio" :value="formatFecha(contrato.fecha_inicio)" />
              <InfoField label="Fecha fin" :value="formatFecha(contrato.fecha_fin)" />
              <InfoField label="Duración" :value="duracion" />
            </div>
          </div>

          <Divider />

          <!-- Condiciones comerciales -->
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Condiciones comerciales</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Índice de indexación" :value="contrato.indice_indexacion" />
              <InfoField label="Periodicidad indexación" :value="contrato.periodicidad_indexacion" />
              <InfoField label="Período base indexación" :value="contrato.periodo_indexacion_base" />
              <InfoField label="Valor indexación base" :value="contrato.valor_indexacion_base != null ? String(contrato.valor_indexacion_base) : null" />
              <InfoField label="Periodicidad facturación" :value="contrato.periodicidad_facturacion" />
              <InfoField label="Tiempo de pago (días)" :value="contrato.tiempo_pago != null ? String(contrato.tiempo_pago) : null" />
              <div v-if="contrato.condiciones_pago" class="col-span-2 md:col-span-3 flex flex-col gap-0.5">
                <span class="text-xs font-medium" style="color:#9b89b5">Condiciones de pago</span>
                <span class="text-sm" style="color:#2C2039">{{ contrato.condiciones_pago }}</span>
              </div>
            </div>
          </div>

          <Divider />

          <!-- GESCON / SIC -->
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">GESCON / SIC</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Código SIC" :value="contrato.codigo_sic" />
              <InfoField label="Código GESCON" :value="contrato.gescon_codigo" />
              <InfoField label="GESCON inicio" :value="formatFecha(contrato.gescon_fecha_inicio)" />
              <InfoField label="GESCON fin" :value="formatFecha(contrato.gescon_fecha_fin)" />
              <InfoField label="Precio GESCON" :value="contrato.gescon_precio != null ? `$${Number(contrato.gescon_precio).toFixed(4)}` : null" />
              <InfoField label="Cantidades GESCON (kWh)" :value="contrato.gescon_cantidades_kwh != null ? Number(contrato.gescon_cantidades_kwh).toLocaleString('es-CO') : null" />
            </div>
          </div>

        </div>
      </TabPanel>

      <!-- ══ CANTIDADES ══ -->
      <TabPanel :header="`Cantidades (${contrato.compromisos_energia?.length || 0})`">
        <div class="flex justify-end mb-3">
          <SelectButton v-model="vistaCantidades" :options="VISTAS" optionLabel="label" optionValue="value" />
        </div>
        <DataTable
          :value="vistaCantidades === 'anual' ? cantidadesAnuales : cantidadesMensuales"
          stripedRows
          class="text-sm"
          paginator
          :rows="24"
          :rowsPerPageOptions="[12, 24, 60, 120]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          emptyMessage="Sin compromisos de energía registrados."
        >
          <Column field="año" header="Año" style="width:70px" />
          <Column v-if="vistaCantidades === 'mensual'" header="Mes" style="width:130px">
            <template #body="{ data }">{{ MESES[data.mes - 1] }}</template>
          </Column>
          <Column :header="vistaCantidades === 'anual' ? 'Mín (MWh/año)' : 'Mín (MWh/mes)'">
            <template #body="{ data }">
              {{ data.energia_minima != null ? Number(data.energia_minima).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }}
            </template>
          </Column>
          <Column :header="vistaCantidades === 'anual' ? 'Máx (MWh/año)' : 'Máx (MWh/mes)'">
            <template #body="{ data }">
              {{ data.energia_maxima != null ? Number(data.energia_maxima).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }}
            </template>
          </Column>
          <Column header="Rango">
            <template #body="{ data }">
              <div v-if="data.energia_minima != null && data.energia_maxima != null" class="text-xs text-gray-400">
                {{ ((data.energia_maxima / data.energia_minima - 1) * 100).toFixed(0) }}% flex
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ══ TARIFAS ══ -->
      <TabPanel :header="`Tarifas (${contrato.tarifas?.length || 0})`">
        <div class="flex justify-end mb-3">
          <SelectButton v-model="vistaTarifas" :options="VISTAS" optionLabel="label" optionValue="value" />
        </div>
        <DataTable
          :value="vistaTarifas === 'anual' ? tarifasAnuales : tarifasMensuales"
          stripedRows
          class="text-sm"
          paginator
          :rows="24"
          :rowsPerPageOptions="[12, 24, 60, 120]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          emptyMessage="Sin tarifas registradas."
        >
          <Column field="año" header="Año" style="width:70px" />
          <Column v-if="vistaTarifas === 'mensual'" header="Mes" style="width:130px">
            <template #body="{ data }">{{ MESES[data.mes - 1] }}</template>
          </Column>
          <Column :header="vistaTarifas === 'anual' ? 'Tarifa (COP/kWh)' : 'Tarifa (COP/kWh)'">
            <template #body="{ data }">
              <span class="font-mono font-medium text-amber-700">
                {{ data.tarifa != null ? `$${Number(data.tarifa).toLocaleString('es-CO', { maximumFractionDigits: 2 })}` : '—' }}
              </span>
              <span v-if="vistaTarifas === 'anual' && !data._uniforme" class="text-xs text-gray-400 ml-1">prom.</span>
            </template>
          </Column>
          <Column header="Variación">
            <template #body="{ data, index }">
              <template v-if="index > 0">
                <span
                  v-if="currentTarifas[index - 1]?.tarifa != null && data.tarifa != null"
                  class="text-xs font-medium"
                  :class="data.tarifa < currentTarifas[index-1].tarifa ? 'text-green-600' : data.tarifa > currentTarifas[index-1].tarifa ? 'text-red-500' : 'text-gray-400'"
                >
                  {{ variacion(currentTarifas[index-1].tarifa, data.tarifa) }}
                </span>
              </template>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ══ CONTRATOS ASIC ══ -->
      <TabPanel :header="`Contratos ASIC (${asicFiltrados.length})`">
        <div class="flex justify-between items-center mb-3">
          <span class="text-xs text-gray-400">{{ asicRows.length }} registros totales</span>
          <SelectButton v-model="vistaAsic"
            :options="[{ label: 'Vigentes', value: 'vigentes' }, { label: 'Históricos', value: 'historicos' }]"
            optionLabel="label" optionValue="value" />
        </div>
        <div v-if="loadingAsic" class="flex items-center justify-center py-16 text-gray-400 gap-2">
          <i class="pi pi-spin pi-spinner" />
          <span class="text-sm">Cargando registros ASIC…</span>
        </div>
        <DataTable
          v-else
          :value="asicFiltrados"
          stripedRows
          class="text-sm"
          emptyMessage="Sin registros ASIC para este contrato."
          sortField="fecha_solicitud"
          :sortOrder="-1"
        >
          <Column field="codigo_sic_contrato" header="Código SIC" sortable style="width:110px">
            <template #body="{ data }">
              <span class="font-mono text-xs">{{ data.codigo_sic_contrato || '—' }}</span>
            </template>
          </Column>
          <Column field="planta_nombre" header="Planta" sortable>
            <template #body="{ data }">
              <router-link v-if="data.proyecto_id" :to="`/proyectos/${data.proyecto_id}`"
                class="text-amber-700 hover:underline">
                {{ data.planta_nombre || data.proyecto_id }}
              </router-link>
              <span v-else class="text-gray-400">—</span>
            </template>
          </Column>
          <Column field="tipo_solicitud" header="Tipo" style="width:120px">
            <template #body="{ data }">
              <Tag
                :value="data.tipo_solicitud"
                :severity="{ registro: 'success', modificacion: 'info', terminacion: 'danger', desistimiento: 'secondary' }[data.tipo_solicitud] || 'secondary'"
                class="text-xs capitalize"
              />
            </template>
          </Column>
          <Column field="estado_solicitud" header="Estado" style="width:110px">
            <template #body="{ data }">
              <Tag
                :value="data.estado_solicitud.replace('_', ' ')"
                :severity="{ publicado: 'success', en_proceso: 'warn', rechazado: 'danger', desistido: 'secondary' }[data.estado_solicitud] || 'secondary'"
                class="text-xs capitalize"
              />
            </template>
          </Column>
          <Column field="fecha_inicio" header="Inicio" sortable style="width:100px" />
          <Column field="fecha_fin" header="Fin" sortable style="width:100px" />
          <Column field="porcentaje_despacho" header="% Despacho" style="width:110px">
            <template #body="{ data }">
              <span v-if="data.porcentaje_despacho != null"
                :class="data.porcentaje_despacho > 100 ? 'text-red-600 font-semibold' : ''">
                {{ Number(data.porcentaje_despacho).toFixed(1) }}%
              </span>
              <span v-else class="text-gray-400">—</span>
            </template>
          </Column>
          <Column field="fecha_solicitud" header="F. solicitud" sortable style="width:120px" />
          <Column field="observaciones" header="Observaciones">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.observaciones || '—' }}</span>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ══ PROYECTOS ══ -->
      <TabPanel :header="`Proyectos (${contrato.proyectos?.length || 0})`">
        <div v-if="contrato.proyectos?.length" class="p-2">
          <DataTable :value="contrato.proyectos" stripedRows class="text-sm" rowHover>
            <Column field="id" header="ID" style="width:60px" />
            <Column field="nombre_comercial" header="Nombre comercial" sortable>
              <template #body="{ data }">
                <router-link :to="`/proyectos/${data.id}`"
                  class="font-medium text-amber-700 hover:underline">
                  {{ data.nombre_comercial }}
                </router-link>
              </template>
            </Column>
          </DataTable>
        </div>
        <div v-else class="flex flex-col items-center py-16 gap-2 text-gray-400">
          <i class="pi pi-sitemap text-3xl" />
          <span class="text-sm">Sin proyectos asociados</span>
        </div>
      </TabPanel>
    </TabView>
  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="flex items-center justify-center py-24 text-gray-400 gap-3">
    <i class="pi pi-spin pi-spinner text-xl" />
    <span>Cargando contrato…</span>
  </div>

  <!-- Error -->
  <div v-else class="flex flex-col items-center py-24 text-gray-400 gap-2">
    <i class="pi pi-exclamation-triangle text-3xl text-amber-400" />
    <span class="text-sm">No se encontró el contrato</span>
    <Button label="Volver" text @click="$router.back()" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import InfoField from '@/components/InfoField.vue'
import api from '@/api/client'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const VISTAS = [{ label: 'Mensual', value: 'mensual' }, { label: 'Anual', value: 'anual' }]

const route = useRoute()
const toast = useToast()
const contrato = ref(null)
const loading = ref(true)

// Edición inline de identificación
const editandoId = ref(false)
const guardandoId = ref(false)
const formId = reactive({ nombre_interno: null, numero_codigo_contrato: null })

function iniciarEdicionId() {
  formId.nombre_interno = contrato.value.nombre_interno
  formId.numero_codigo_contrato = contrato.value.numero_codigo_contrato
  editandoId.value = true
}

function cancelarEdicionId() {
  editandoId.value = false
}

async function guardarId() {
  guardandoId.value = true
  try {
    const { data } = await api.patch(`/ppa/${contrato.value.id}`, {
      nombre_interno: formId.nombre_interno || null,
      numero_codigo_contrato: formId.numero_codigo_contrato || null,
    })
    contrato.value = { ...contrato.value, ...data }
    editandoId.value = false
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Identificación actualizada', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoId.value = false
  }
}

// Edición inline de partes
const editandoPartes = ref(false)
const guardandoPartes = ref(false)
const formPartes = reactive({ comprador_nombre: null, comprador_nit: null, vendedor_nombre: null, vendedor_nit: null })

function iniciarEdicionPartes() {
  formPartes.comprador_nombre = contrato.value.comprador_nombre
  formPartes.comprador_nit = contrato.value.comprador_nit
  formPartes.vendedor_nombre = contrato.value.vendedor_nombre
  formPartes.vendedor_nit = contrato.value.vendedor_nit
  editandoPartes.value = true
}

function cancelarEdicionPartes() {
  editandoPartes.value = false
}

async function guardarPartes() {
  guardandoPartes.value = true
  try {
    const { data } = await api.patch(`/ppa/${contrato.value.id}`, formPartes)
    contrato.value = { ...contrato.value, ...data }
    editandoPartes.value = false
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Partes del contrato actualizadas', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoPartes.value = false
  }
}
const vistaCantidades = ref('mensual')
const vistaTarifas = ref('mensual')
const asicRows = ref([])
const loadingAsic = ref(false)
const vistaAsic = ref('vigentes')

const asicFiltrados = computed(() => {
  if (vistaAsic.value === 'historicos') return asicRows.value
  const hoy = new Date().toISOString().slice(0, 10)
  return asicRows.value.filter(r => r.fecha_fin && r.fecha_fin >= hoy)
})

const duracion = computed(() => {
  if (!contrato.value?.fecha_inicio || !contrato.value?.fecha_fin) return null
  const a = new Date(contrato.value.fecha_inicio)
  const b = new Date(contrato.value.fecha_fin)
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  const años = Math.floor(meses / 12)
  const resto = meses % 12
  return años > 0
    ? `${años} año${años !== 1 ? 's' : ''}${resto > 0 ? ` ${resto} mes${resto !== 1 ? 'es' : ''}` : ''}`
    : `${meses} mes${meses !== 1 ? 'es' : ''}`
})

function formatFecha(f) {
  if (!f) return null
  return String(f).slice(0, 10)
}

function variacion(prev, curr) {
  const pct = ((curr - prev) / prev) * 100
  if (pct === 0) return '—'
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function agregarPorAño(rows, campos, modo) {
  const byYear = {}
  for (const r of rows) {
    ;(byYear[r.año] = byYear[r.año] || []).push(r)
  }
  return Object.keys(byYear).sort((a, b) => a - b).map(año => {
    const filas = byYear[año]
    const uniforme = campos.every(c => filas.every(f => f[c] === filas[0][c]))
    const entry = { año: Number(año), _uniforme: uniforme }
    for (const c of campos) {
      const sum = filas.reduce((acc, f) => acc + (f[c] ?? 0), 0)
      entry[c] = modo === 'suma' ? sum : sum / filas.length
    }
    return entry
  })
}

const tarifasMensuales = computed(() => {
  if (!contrato.value?.tarifas) return []
  return [...contrato.value.tarifas].sort((a, b) => a.año - b.año || a.mes - b.mes)
})

const tarifasAnuales = computed(() => {
  if (!contrato.value?.tarifas) return []
  return agregarPorAño(tarifasMensuales.value, ['tarifa'], 'promedio')
})

const currentTarifas = computed(() =>
  vistaTarifas.value === 'anual' ? tarifasAnuales.value : tarifasMensuales.value
)

const cantidadesMensuales = computed(() => {
  if (!contrato.value?.compromisos_energia) return []
  return [...contrato.value.compromisos_energia].sort((a, b) => a.año - b.año || a.mes - b.mes)
})

const cantidadesAnuales = computed(() => {
  if (!contrato.value?.compromisos_energia) return []
  return agregarPorAño(cantidadesMensuales.value, ['energia_minima', 'energia_maxima'], 'suma')
})

async function cargar() {
  loading.value = true
  try {
    const { data } = await api.get(`/ppa/${route.params.id}`)
    contrato.value = data
    if (data.numero_codigo_contrato || data.codigo_sic) cargarAsic(data)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

async function cargarAsic(c) {
  loadingAsic.value = true
  try {
    // Primero intenta por numero_codigo_contrato (un contrato PPA agrupa varios SIC)
    // y si tiene codigo_sic lo usa como filtro adicional de respaldo
    const params = c.numero_codigo_contrato
      ? { contrato_interno: c.numero_codigo_contrato }
      : { codigo_sic_contrato: c.codigo_sic }
    const { data } = await api.get('/asic', { params })
    asicRows.value = data
  } catch (e) {
    toast.add({ severity: 'warn', summary: 'ASIC', detail: 'No se pudieron cargar registros ASIC', life: 3000 })
  } finally {
    loadingAsic.value = false
  }
}

onMounted(cargar)
</script>
