<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm text-gray-500">{{ ofertas.length }} oferta(s) — una por planta × servicio</span>
      <Button label="Agregar oferta" icon="pi pi-plus" size="small" @click="abrirNueva" />
    </div>

    <DataTable :value="ofertas" dataKey="id" class="text-sm" responsiveLayout="scroll">
      <Column field="planta_nombre" header="Planta">
        <template #body="{ data }">{{ data.planta_nombre || '—' }}</template>
      </Column>
      <Column header="Tipo">
        <template #body="{ data }">{{ labelTipo(data.tipo) }}</template>
      </Column>
      <Column field="numero_oferta" header="Nº oferta">
        <template #body="{ data }">{{ data.numero_oferta || '—' }}</template>
      </Column>
      <Column field="precio_detalle" header="Precio">
        <template #body="{ data }">{{ data.precio_detalle || '—' }}</template>
      </Column>
      <Column header="Resultado">
        <template #body="{ data }">
          <Tag :value="labelResultado(data.resultado)" :severity="sevResultado(data.resultado)" />
        </template>
      </Column>
      <Column header="" style="width:6rem">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" text rounded size="small" @click="abrirEditar(data)" />
          <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="borrar(data)" />
        </template>
      </Column>
      <template #empty><span class="text-gray-400 text-sm">Sin ofertas todavía.</span></template>
    </DataTable>

    <Dialog v-model:visible="showDialog" :header="editId ? 'Editar oferta' : 'Nueva oferta'" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Tipo de servicio</label>
          <Dropdown v-model="form.tipo" :options="TIPOS_OFERTA" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Planta</label>
          <InputText v-model.trim="form.planta_nombre" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Nº oferta (consecutivo)</label>
            <InputText v-model.trim="form.numero_oferta" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Resultado</label>
            <Dropdown v-model="form.resultado" :options="RESULTADOS" optionLabel="label" optionValue="value" class="w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Precio (detalle)</label>
          <InputText v-model.trim="form.precio_detalle" class="w-full" placeholder="p. ej. REP: 6 · CGM: 6" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Fecha de oferta</label>
            <Calendar v-model="form.fecha_oferta" dateFormat="yy-mm-dd" showIcon class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Fecha tentativa inicio</label>
            <Calendar v-model="form.fecha_tentativa_inicio" dateFormat="yy-mm-dd" showIcon class="w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Contrato firmado</label>
          <InputText v-model.trim="form.contrato_firmado" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" text @click="showDialog = false" />
        <Button label="Guardar" icon="pi pi-check" :disabled="!form.tipo || guardando" @click="guardar" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({
  oportunidadId: { type: [Number, String], required: true },
  ofertas: { type: Array, default: () => [] },
})
const emit = defineEmits(['changed'])
const toast = useToast()

const TIPOS_OFERTA = [
  { label: 'Servicios operacionales', value: 'servicios_operacionales' },
  { label: 'Compra de energía', value: 'compra_energia' },
  { label: 'Comunidad energética', value: 'comunidad_energetica' },
]
const RESULTADOS = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Aceptado', value: 'aceptado' },
  { label: 'Declinado', value: 'declinado' },
]

const showDialog = ref(false)
const editId = ref(null)
const guardando = ref(false)
const form = reactive({
  tipo: null, planta_nombre: '', numero_oferta: '', resultado: 'pendiente',
  precio_detalle: '', fecha_oferta: null, fecha_tentativa_inicio: null, contrato_firmado: '',
})

function labelTipo(v) { return TIPOS_OFERTA.find(t => t.value === v)?.label ?? v }
function labelResultado(v) { return RESULTADOS.find(r => r.value === v)?.label ?? v }
function sevResultado(v) { return { aceptado: 'success', declinado: 'danger', pendiente: 'warn' }[v] ?? 'secondary' }

function aFecha(s) { return s ? new Date(`${String(s).slice(0, 10)}T00:00:00`) : null }
function aFechaStr(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function reset() {
  Object.assign(form, {
    tipo: null, planta_nombre: '', numero_oferta: '', resultado: 'pendiente',
    precio_detalle: '', fecha_oferta: null, fecha_tentativa_inicio: null, contrato_firmado: '',
  })
}
function abrirNueva() { editId.value = null; reset(); showDialog.value = true }
function abrirEditar(o) {
  editId.value = o.id
  Object.assign(form, {
    tipo: o.tipo, planta_nombre: o.planta_nombre || '', numero_oferta: o.numero_oferta || '',
    resultado: o.resultado || 'pendiente', precio_detalle: o.precio_detalle || '',
    fecha_oferta: aFecha(o.fecha_oferta), fecha_tentativa_inicio: aFecha(o.fecha_tentativa_inicio),
    contrato_firmado: o.contrato_firmado || '',
  })
  showDialog.value = true
}

async function guardar() {
  guardando.value = true
  const payload = {
    tipo: form.tipo,
    planta_nombre: form.planta_nombre || null,
    numero_oferta: form.numero_oferta || null,
    resultado: form.resultado,
    precio_detalle: form.precio_detalle || null,
    fecha_oferta: aFechaStr(form.fecha_oferta),
    fecha_tentativa_inicio: aFechaStr(form.fecha_tentativa_inicio),
    contrato_firmado: form.contrato_firmado || null,
  }
  try {
    if (editId.value) {
      await api.patch(`/comercial/ofertas/${editId.value}`, payload)
    } else {
      await api.post(`/comercial/oportunidades/${props.oportunidadId}/ofertas`, payload)
    }
    showDialog.value = false
    emit('changed')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo guardar la oferta', detail: err.response?.data?.detail ?? '', life: 5000 })
  } finally {
    guardando.value = false
  }
}

async function borrar(o) {
  try {
    await api.delete(`/comercial/ofertas/${o.id}`)
    emit('changed')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo eliminar', detail: err.response?.data?.detail ?? '', life: 5000 })
  }
}
</script>
