<template>
  <div class="rounded-xl border" style="border-color: rgba(44,32,57,0.12); background: white;">

    <!-- Header -->
    <div class="px-5 py-4 flex items-center justify-between gap-3" style="border-bottom: 1px solid rgba(44,32,57,0.10);">
      <div class="flex items-center gap-2">
        <i class="pi pi-bolt" style="color: #F0C040;" />
        <div>
          <h2 class="text-base font-bold" style="color: #2C2039;">Proyectos próximos a energizarse</h2>
          <p class="text-xs mt-0.5" style="color: #7a6e8a;">Proyección de generación mensual prorrateada desde la fecha de energización</p>
        </div>
      </div>
      <Button icon="pi pi-plus" label="Agregar Proyecto" size="small" @click="addProject" />
    </div>

    <!-- Aviso de origen de datos (config faltante / fuente caída) -->
    <div v-if="warning" class="mx-3 mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
      style="background: rgba(240,192,64,0.12); border: 1px solid rgba(240,192,64,0.35); color: #8a6d00;">
      <i class="pi pi-exclamation-triangle mt-0.5" />
      <span>{{ warning }}</span>
    </div>

    <!-- Table -->
    <div class="p-3 overflow-x-auto">
      <DataTable
        :value="projects"
        dataKey="id"
        size="small"
        stripedRows
        class="energ-table"
      >
        <template #empty>
          <div class="text-center py-8 text-sm" style="color: rgba(44,32,57,0.45);">
            <template v-if="loading">
              <i class="pi pi-spin pi-spinner" style="font-size:1.2rem; color:#915BD8;" />
              <p class="mt-2">Cargando proyectos del pipeline…</p>
            </template>
            <template v-else-if="warning">
              <i class="pi pi-database" style="font-size:1.4rem; color:#c4b8d4;" />
              <p class="mt-2">No se pudieron cargar los proyectos del pipeline.</p>
              <p class="mt-1 text-xs" style="color: rgba(44,32,57,0.4);">Revisa el aviso de arriba (configuración / fuente de datos).</p>
            </template>
            <template v-else>
              Aún no hay proyectos en el pipeline. Puedes agregar uno manualmente con «Agregar Proyecto».
            </template>
          </div>
        </template>

        <!-- Commercial name (editable) -->
        <Column header="Proyecto" frozen style="min-width: 180px;">
          <template #body="{ data }">
            <InputText v-model="data.commercialName" class="w-full" />
          </template>
        </Column>

        <!-- Origina project code (read-only) -->
        <Column header="Código" style="min-width: 170px;">
          <template #body="{ data }">
            <span class="text-xs font-mono" style="color: rgba(44,32,57,0.5);">{{ data.name || '—' }}</span>
          </template>
        </Column>

        <!-- Status -->
        <Column header="Estado" style="min-width: 170px;">
          <template #body="{ data }">
            <Select v-model="data.status" :options="STATUS_OPTIONS" class="w-full" />
          </template>
        </Column>

        <!-- Energization date -->
        <Column header="Energización" style="min-width: 150px;">
          <template #body="{ data }">
            <DatePicker v-model="data.energizationDate" dateFormat="yy-mm-dd" showIcon class="w-full" />
          </template>
        </Column>

        <!-- Construction progress (Sun Factory) -->
        <Column header="% Obra" style="min-width: 110px;">
          <template #body="{ data }">
            <span v-if="data.avancePct != null" class="text-sm font-mono tabular-nums" style="color: #2C2039;">
              {{ Number(data.avancePct).toFixed(1) }}%
            </span>
            <span v-else class="text-sm" style="color: rgba(44,32,57,0.3);">—</span>
          </template>
        </Column>

        <!-- Assigned contracts -->
        <Column header="Contratos" style="min-width: 200px;">
          <template #body="{ data }">
            <AutoComplete
              v-model="data.contracts"
              multiple
              :typeahead="false"
              :suggestions="[]"
              placeholder="Escribe y Enter"
              class="w-full energ-chips"
            />
          </template>
        </Column>

        <!-- Expected monthly MWh -->
        <Column header="MWh / mes" style="min-width: 130px;">
          <template #body="{ data }">
            <InputNumber v-model="data.monthlyMwh" :maxFractionDigits="2" :min="0" class="w-full" />
          </template>
        </Column>

        <!-- Dynamic month columns -->
        <Column v-for="col in monthColumns" :key="col.field" :header="col.header" style="min-width: 96px; text-align: right;">
          <template #body="{ data }">
            <span
              class="inline-block px-2 py-0.5 rounded font-mono text-sm tabular-nums"
              :class="isProrated(data, col.year, col.month) ? 'bg-yellow-100 font-bold' : ''"
              :style="isProrated(data, col.year, col.month)
                ? 'background: rgba(240,192,64,0.22); color: #9a6700;'
                : calculateGeneration(data, col.year, col.month) > 0 ? 'color: #2C2039;' : 'color: rgba(44,32,57,0.3);'"
              v-tooltip="isProrated(data, col.year, col.month) ? 'Mes parcial — prorrateado desde la energización' : ''"
            >
              {{ calculateGeneration(data, col.year, col.month).toFixed(2) }}
            </span>
          </template>
        </Column>

        <!-- Actions -->
        <Column style="width: 56px; text-align: center;">
          <template #body="{ data }">
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="removeProject(data.id)" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import AutoComplete from 'primevue/autocomplete'
import Select from 'primevue/select'
import { useEnergizationProjects } from '@/composables/useEnergizationProjects'

const { projects, loading, warning, addProject, removeProject } = useEnergizationProjects()

const STATUS_OPTIONS = ['En construcción', 'Pruebas', 'Próximo a energizar', 'Energizado']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Next 12 months starting from the current month.
const monthColumns = computed(() => {
  const cols = []
  const start = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1 // 1-based
    cols.push({
      field: `${year}-${String(month).padStart(2, '0')}`,
      header: `${MESES_CORTOS[month - 1]} ${year}`,
      year,
      month,
    })
  }
  return cols
})

// Prorated generation for a given column (year, 1-based month).
function calculateGeneration(project, year, month) {
  const ed = project.energizationDate instanceof Date
    ? project.energizationDate
    : new Date(project.energizationDate)
  if (isNaN(ed.getTime())) return 0

  const eYear = ed.getFullYear()
  const eMonth = ed.getMonth() + 1 // 1-based
  const mwh = Number(project.monthlyMwh) || 0

  // Column month is before the energization month → not yet generating.
  if (year < eYear || (year === eYear && month < eMonth)) return 0

  // Same month as energization → prorate by operational days.
  if (year === eYear && month === eMonth) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const operationalDays = daysInMonth - ed.getDate() + 1
    return Math.round((operationalDays / daysInMonth) * mwh * 100) / 100
  }

  // After the energization month → full month.
  return mwh
}

// A value is prorated when it is the first (partial) month of operation.
function isProrated(project, year, month) {
  const ed = project.energizationDate instanceof Date
    ? project.energizationDate
    : new Date(project.energizationDate)
  if (isNaN(ed.getTime())) return false
  return year === ed.getFullYear() && month === (ed.getMonth() + 1) && ed.getDate() > 1
}
</script>

<style scoped>
:deep(.energ-table .p-datatable-thead th) {
  background: rgba(44,32,57,0.05);
  color: #7a6e8a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 10px;
  white-space: nowrap;
}
:deep(.energ-table .p-datatable-tbody td) {
  padding: 6px 10px;
  font-size: 13px;
  color: #2C2039;
  vertical-align: middle;
}
:deep(.energ-chips .p-autocomplete-input-multiple) {
  width: 100%;
}
</style>
