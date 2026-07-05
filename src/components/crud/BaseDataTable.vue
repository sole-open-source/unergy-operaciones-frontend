<template>
  <DataTable
    :value="value"
    :loading="loading"
    :lazy="lazy"
    :paginator="paginator"
    :rows="rows"
    :totalRecords="lazy ? totalRecords : undefined"
    :rowsPerPageOptions="rowsPerPageOptions"
    :paginatorTemplate="paginatorTemplate"
    :sortField="sortField"
    :sortOrder="sortOrder"
    :emptyMessage="emptyMessage"
    :stripedRows="stripedRows"
    :rowHover="rowHover"
    class="text-sm"
    @page="$emit('page', $event)"
    @sort="$emit('sort', $event)"
    @row-click="$emit('row-click', $event)"
  >
    <Column
      v-for="col in columns"
      :key="col.field || col.header"
      :field="col.field"
      :header="col.header"
      :sortable="col.sortable"
      :style="col.style"
      :class="col.class"
    >
      <!-- Celda personalizada vía slot `cell-<field|slot>` del padre -->
      <template v-if="cellSlotName(col)" #body="{ data }">
        <slot :name="`cell-${cellSlotName(col)}`" :data="data" :value="col.field ? data[col.field] : undefined">
          {{ formatCell(col, data) }}
        </slot>
      </template>
      <!-- Celda con formateador declarativo (`col.format`) -->
      <template v-else-if="col.format" #body="{ data }">
        {{ formatCell(col, data) }}
      </template>
      <!-- Sin slot ni format: PrimeVue renderiza `data[field]` por defecto -->
    </Column>

    <Column v-if="$slots.actions" :header="actionsHeader" :style="actionsStyle">
      <template #body="{ data }">
        <slot name="actions" :data="data" />
      </template>
    </Column>

    <template #empty>
      <slot name="empty">
        <div class="text-center text-sm text-gray-400 py-6">{{ emptyMessage }}</div>
      </slot>
    </template>

    <template v-if="$slots.loading" #loading>
      <slot name="loading" />
    </template>
  </DataTable>
</template>

<script setup>
import { useSlots } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps({
  /** Filas a renderizar. */
  value: { type: Array, default: () => [] },
  /**
   * Definición de columnas:
   * { field, header, sortable, style, class, format?(value, row), slot? }
   * Si el padre declara un slot `cell-<field>`, se usa ese slot.
   */
  columns: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /** true → paginación en servidor (usa totalRecords y emite @page). */
  lazy: { type: Boolean, default: false },
  paginator: { type: Boolean, default: true },
  rows: { type: Number, default: 20 },
  totalRecords: { type: Number, default: 0 },
  rowsPerPageOptions: { type: Array, default: () => [10, 20, 50] },
  paginatorTemplate: {
    type: String,
    default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
  },
  sortField: { type: String, default: null },
  sortOrder: { type: Number, default: null },
  emptyMessage: { type: String, default: 'No hay registros.' },
  stripedRows: { type: Boolean, default: true },
  rowHover: { type: Boolean, default: true },
  actionsHeader: { type: String, default: '' },
  actionsStyle: { type: String, default: 'width:120px' },
})

defineEmits(['page', 'sort', 'row-click'])

const slots = useSlots()

/**
 * Nombre del slot de celda a usar para una columna, o null si no hay.
 * Se resuelve por `col.slot` (string explícito) o por `col.field`, siempre que
 * el padre haya declarado el slot `cell-<nombre>`.
 */
function cellSlotName(col) {
  const explicit = typeof col.slot === 'string' ? col.slot : null
  const name = explicit || col.field
  return name && slots[`cell-${name}`] ? name : null
}

function formatCell(col, data) {
  const value = col.field ? data[col.field] : undefined
  if (typeof col.format === 'function') return col.format(value, data)
  return value ?? '—'
}
</script>
