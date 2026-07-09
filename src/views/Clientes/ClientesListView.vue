<template>
  <div class="space-y-4">
    <PageHeader title="Clientes" :subtitle="`${filtrados.length} de ${items.length} cliente${items.length === 1 ? '' : 's'} · vista comercial`">
      <template #actions>
        <IconField class="flex-1 sm:flex-none">
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" placeholder="Buscar razón social o NIT..." class="w-full sm:w-64" />
        </IconField>
        <Button label="Nuevo cliente" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <!-- Filtros dinámicos: actualizan la tabla al instante -->
    <div class="flex flex-wrap items-center gap-3">
      <MultiSelect v-model="filtroServicios" :options="opcionesServicio" optionLabel="label" optionValue="value"
        placeholder="Filtrar por servicio" display="chip" class="w-72" showClear />
      <SelectButton v-model="filtroEstado" :options="opcionesEstado" optionLabel="label" optionValue="value"
        :allowEmpty="false" />
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden border" style="border-color:#ECE7F2">
      <DataTable :value="filtrados" :loading="loading" paginator :rows="25"
        :rowsPerPageOptions="[25, 50, 100]" rowHover
        sortField="razon_social_nombre" :sortOrder="1" :rowClass="rowClass"
        @row-click="abrirCliente" class="text-sm clientes-tabla">
        <Column field="razon_social_nombre" header="Razón social" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span class="font-medium" style="color:#2C2039">{{ data.razon_social_nombre }}</span>
              <span v-if="data.alerta_contrato" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                :style="{ color: SEMAFORO[data.alerta_contrato].color, background: SEMAFORO[data.alerta_contrato].bg }">
                {{ SEMAFORO[data.alerta_contrato].label }}
              </span>
            </div>
          </template>
        </Column>
        <Column field="nit_cedula" header="NIT" sortable>
          <template #body="{ data }">{{ fmt(data.nit_cedula) }}</template>
        </Column>
        <Column field="num_plantas" header="Plantas" sortable style="width:90px">
          <template #body="{ data }">
            <span class="font-semibold tabular-nums" style="color:#2C2039">{{ data.num_plantas }}</span>
          </template>
        </Column>
        <Column header="Servicios">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <span v-for="s in data.servicios" :key="s"
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style="background:#f0ebfd;color:#915BD8">{{ servicioLabel(s) }}</span>
              <span v-if="!data.servicios.length" class="text-xs" style="color:#bba8d4">—</span>
            </div>
          </template>
        </Column>
        <Column header="Contacto comercial">
          <template #body="{ data }">
            <div class="leading-tight">
              <p class="text-sm" style="color:#2C2039">
                {{ fmt(data.contacto_comercial_nombre) }}
                <span v-if="data.contactos_comerciales_extra" class="text-[10px]" style="color:#9b89b5">
                  +{{ data.contactos_comerciales_extra }}
                </span>
              </p>
              <p class="text-xs" style="color:#6b5a8a">{{ fmt(data.contacto_comercial_telefono) }}</p>
            </div>
          </template>
        </Column>
        <Column field="contacto_comercial_correo" header="Correo comercial" sortable>
          <template #body="{ data }">{{ fmt(data.contacto_comercial_correo) }}</template>
        </Column>
        <Column header="" style="width:44px">
          <template #body>
            <i class="pi pi-chevron-right text-xs" style="color:#c5b9db" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" header="Nuevo cliente" modal class="w-full max-w-lg">
      <ClienteForm :initial="{}" @save="onSave" @cancel="dialogVisible = false" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import ClienteForm from './ClienteForm.vue'
import { SEMAFORO, servicioLabel, fmt } from './clientesUi'

const router = useRouter()
const toast = useToast()
const items = ref([])
const loading = ref(false)
const dialogVisible = ref(false)

const q = ref('')
const filtroServicios = ref([])
const filtroEstado = ref('todos')
const opcionesEstado = [
  { label: 'Todos', value: 'todos' },
  { label: 'Vigentes', value: 'vigente' },
  { label: 'Por vencer', value: 'por_vencer' },
  { label: 'Vencidos', value: 'vencido' },
]

const opcionesServicio = computed(() => {
  const set = new Set(items.value.flatMap(c => c.servicios))
  return [...set].sort().map(s => ({ label: servicioLabel(s), value: s }))
})

function estadoDe(c) { return c.alerta_contrato || 'vigente' }

// Búsqueda + servicio + estado filtran (ocultan). El resaltado de fila (ámbar/
// rojo) sigue presente para llamar la atención de un vistazo.
const filtrados = computed(() => {
  let rows = items.value
  const term = q.value.trim().toLowerCase()
  if (term) rows = rows.filter(c =>
    (c.razon_social_nombre || '').toLowerCase().includes(term) ||
    (c.nit_cedula || '').toLowerCase().includes(term))
  if (filtroServicios.value.length)
    rows = rows.filter(c => filtroServicios.value.some(s => c.servicios.includes(s)))
  if (filtroEstado.value !== 'todos')
    rows = rows.filter(c => estadoDe(c) === filtroEstado.value)
  return rows
})

function rowClass(data) {
  if (data.alerta_contrato === 'vencido') return 'row-vencido'
  if (data.alerta_contrato === 'por_vencer') return 'row-por-vencer'
  return ''
}

function abrirCliente(event) {
  router.push(`/clientes/${event.data.id}`)
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/clientes/vista-comercial')
    items.value = data
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openNew() {
  dialogVisible.value = true
}

async function onSave(payload) {
  try {
    const { data } = await api.post('/clientes', payload)
    toast.add({ severity: 'success', summary: 'Cliente creado', life: 3000 })
    dialogVisible.value = false
    router.push(`/clientes/${data.id}`)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 4000 })
  }
}
</script>

<style scoped>
:deep(.clientes-tabla tbody tr) { cursor: pointer; }
:deep(.row-vencido) { background: #FEF2F2 !important; }
:deep(.row-por-vencer) { background: #FFFBEB !important; }
</style>
