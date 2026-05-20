<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: rgba(145,91,216,0.12);">
          <i class="pi pi-file-check text-lg" style="color: #915BD8;" />
        </div>
        <div>
          <h1 class="text-2xl font-bold" style="color: #2C2039;">Informes</h1>
          <p class="text-xs" style="color: #6b5a8a;">Gestiona, aprueba y envía informes operacionales a clientes</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <Select v-model="filterTipo" :options="tipoOptions" optionLabel="label" optionValue="value"
              placeholder="Todos los tipos" showClear class="w-48" />
      <Select v-model="filterEstado" :options="estadoOptions" optionLabel="label" optionValue="value"
              placeholder="Todos los estados" showClear class="w-48" />
      <InputText v-model="searchText" placeholder="Buscar proyecto..." class="w-64" />
      <Button icon="pi pi-refresh" severity="secondary" text @click="load" :loading="loading" />
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="card in summaryCards" :key="card.label"
           class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">{{ card.label }}</p>
        <p class="text-2xl font-bold mt-1" :style="{ color: card.color }">{{ card.count }}</p>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <DataTable :value="filtered" :loading="loading" stripedRows
                 :rows="20" :paginator="filtered.length > 20"
                 sortField="editado_en" :sortOrder="-1"
                 class="p-datatable-sm"
                 rowHover>
        <Column field="proyecto_nombre" header="Proyecto" sortable style="min-width: 200px;">
          <template #body="{ data }">
            <span class="font-semibold" style="color: #2C2039;">{{ data.proyecto_nombre || data.sub_project }}</span>
          </template>
        </Column>
        <Column field="tipo" header="Tipo" sortable style="width: 110px;">
          <template #body="{ data }">
            <Tag :value="tipoLabel[data.tipo] || data.tipo" :severity="tipoSeverity[data.tipo] || 'secondary'" />
          </template>
        </Column>
        <Column field="periodo_display" header="Periodo" sortable style="min-width: 160px;">
          <template #body="{ data }">
            {{ data.periodo_display || `${data.periodo_desde} — ${data.periodo_hasta}` }}
          </template>
        </Column>
        <Column field="estado" header="Estado" sortable style="width: 130px;">
          <template #body="{ data }">
            <Tag :value="estadoLabel[data.estado]" :severity="estadoSeverity[data.estado]" />
          </template>
        </Column>
        <Column field="creado_por_nombre" header="Creado por" style="width: 140px;" />
        <Column field="editado_en" header="Actualizado" sortable style="width: 150px;">
          <template #body="{ data }">
            <span class="text-xs" style="color: #6b5a8a;">{{ fmtDate(data.editado_en || data.creado_en) }}</span>
          </template>
        </Column>
        <Column field="correo_enviado" header="Enviado" style="width: 90px; text-align: center;">
          <template #body="{ data }">
            <i v-if="data.correo_enviado" class="pi pi-check-circle" style="color: #10B981;" />
            <i v-else class="pi pi-minus-circle" style="color: #d1c4e9;" />
          </template>
        </Column>
        <Column header="" style="width: 60px;">
          <template #body="{ data }">
            <Button icon="pi pi-eye" severity="secondary" text rounded
                    @click="$router.push(`/informes/${data.id}`)" />
          </template>
        </Column>
        <template #empty>
          <div class="text-center py-10" style="color: #6b5a8a;">
            <i class="pi pi-inbox text-4xl mb-3 block" style="color: #d1c4e9;" />
            <p>No hay informes guardados</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'

const informes = ref([])
const loading = ref(false)
const filterTipo = ref(null)
const filterEstado = ref(null)
const searchText = ref('')

const tipoOptions = [
  { label: 'Operacional', value: 'op' },
  { label: 'FMO', value: 'fmo' },
  { label: 'Portfolio', value: 'port' },
]
const estadoOptions = [
  { label: 'Borrador', value: 'borrador' },
  { label: 'Revisado', value: 'revisado' },
  { label: 'Aprobado', value: 'aprobado' },
]

const tipoLabel = { op: 'Operacional', fmo: 'FMO', port: 'Portfolio' }
const tipoSeverity = { op: 'info', fmo: 'warn', port: 'secondary' }
const estadoLabel = { borrador: 'Borrador', revisado: 'En revisión', aprobado: 'Aprobado' }
const estadoSeverity = { borrador: 'secondary', revisado: 'warn', aprobado: 'success' }

const filtered = computed(() => {
  let list = informes.value
  if (filterTipo.value) list = list.filter(i => i.tipo === filterTipo.value)
  if (filterEstado.value) list = list.filter(i => i.estado === filterEstado.value)
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(i =>
      (i.proyecto_nombre || '').toLowerCase().includes(q) ||
      (i.sub_project || '').toLowerCase().includes(q)
    )
  }
  return list
})

const summaryCards = computed(() => {
  const all = informes.value
  return [
    { label: 'Total', count: all.length, color: '#2C2039' },
    { label: 'Borradores', count: all.filter(i => i.estado === 'borrador').length, color: '#6b5a8a' },
    { label: 'En revisión', count: all.filter(i => i.estado === 'revisado').length, color: '#CA8A04' },
    { label: 'Aprobados', count: all.filter(i => i.estado === 'aprobado').length, color: '#10B981' },
  ]
})

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/informes', { params: { limit: 200 } })
    informes.value = data
  } catch (e) {
    console.error('Failed to load informes', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
