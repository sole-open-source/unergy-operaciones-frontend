<template>
  <Paginator
    :first="first"
    :rows="rows"
    :totalRecords="totalRecords"
    :rowsPerPageOptions="rowsPerPageOptions"
    :template="template"
    @page="onPage"
  />
</template>

<script setup>
import { computed } from 'vue'
import Paginator from 'primevue/paginator'

const props = defineProps({
  /** Página actual, base 1 (coherente con el backend `page`). */
  page: { type: Number, default: 1 },
  rows: { type: Number, default: 20 },
  totalRecords: { type: Number, default: 0 },
  rowsPerPageOptions: { type: Array, default: () => [10, 20, 50] },
  template: {
    type: String,
    default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
  },
})

const emit = defineEmits(['update:page', 'update:rows', 'page'])

// PrimeVue Paginator usa `first` (índice del primer registro, base 0).
const first = computed(() => (props.page - 1) * props.rows)

function onPage(e) {
  emit('update:page', e.page + 1)
  emit('update:rows', e.rows)
  emit('page', { page: e.page + 1, rows: e.rows })
}
</script>
