<template>
  <div class="space-y-4">
    <!-- Encabezado: título + búsqueda global + acciones -->
    <PageHeader v-if="title || $slots.header || $slots.subtitle || showSearch"
      :title="title" :subtitle="subtitle">
      <template v-if="$slots.subtitle" #subtitle>
        <slot name="subtitle" :total="totalRecords" :loading="loading" />
      </template>
      <template #actions>
        <IconField v-if="showSearch" class="flex-1 sm:flex-none">
          <InputIcon class="pi pi-search" />
          <InputText :model-value="filters.global" :placeholder="searchPlaceholder"
            class="w-full sm:w-64" @update:model-value="setGlobalFilter" />
        </IconField>
        <slot name="header" :refresh="refreshData" :total="totalRecords" :loading="loading" />
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error"
      class="bg-white rounded-xl shadow-sm p-6 border flex items-start gap-3"
      style="border-color:#F3D0D0">
      <i class="pi pi-exclamation-triangle text-lg" style="color:#D64455" />
      <div class="text-sm">
        <p class="font-medium text-gray-800">No se pudieron cargar los datos.</p>
        <p class="text-gray-500 mt-0.5">{{ error }}</p>
        <Button label="Reintentar" icon="pi pi-refresh" text size="small"
          class="mt-2 -ml-2" @click="refreshData" />
      </div>
    </div>

    <!-- Tabla -->
    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden border" style="border-color:#ECE7F2">
      <DataTable
        :value="data"
        :loading="loading"
        lazy
        paginator
        :rows="pagination.rows"
        :first="pagination.first"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="rowsPerPageOptions"
        :sortField="sort.field"
        :sortOrder="sort.order"
        :globalFilterFields="globalFilterFields"
        rowHover
        stripedRows
        class="text-sm"
        @page="onPage"
        @sort="onSort"
      >
        <!-- Columnas: slot por defecto, o autogeneradas desde la prop `columns` -->
        <slot>
          <Column v-for="col in columns" :key="col.field"
            :field="col.field" :header="col.header"
            :sortable="col.sortable" :style="col.style" />
        </slot>

        <!-- Estado vacío -->
        <template #empty>
          <slot name="empty">
            <div class="py-8 text-center text-sm text-gray-400">
              {{ emptyMessage }}
            </div>
          </slot>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useListManager } from '@/composables/useListManager'

const props = defineProps({
  apiEndpoint: { type: String, required: true },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  // Definiciones de columna para autogenerar el DataTable cuando no se usa el
  // slot por defecto: { field, header, sortable, style }
  columns: { type: Array, default: () => [] },
  globalFilterFields: { type: Array, default: () => [] },
  defaultSortField: { type: String, default: null },
  defaultSortOrder: { type: Number, default: null },
  rowsPerPageOptions: { type: Array, default: () => [10, 20, 50] },
  initialRows: { type: Number, default: 10 },
  customParamsBuilder: { type: Function, default: null },
  showSearch: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: 'Buscar...' },
  emptyMessage: { type: String, default: 'No hay registros para mostrar.' },
})

// Se desestructura para exponer refs de nivel superior al template: así Vue
// las des-referencia automáticamente en cualquier binding (v-if, :prop, etc.),
// no solo en interpolaciones de texto.
const {
  data, loading, error, totalRecords,
  pagination, sort, filters,
  fetchData, refreshData, onPage, onSort, setGlobalFilter,
} = useListManager(props.apiEndpoint, {
  initialRows: props.initialRows,
  defaultSortField: props.defaultSortField,
  defaultSortOrder: props.defaultSortOrder,
  customParamsBuilder: props.customParamsBuilder,
})

// Se expone para que la vista consumidora refresque tras crear/editar/eliminar.
defineExpose({ refreshData, fetchData, data, totalRecords, loading })
</script>
