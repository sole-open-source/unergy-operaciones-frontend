<template>
  <!--
    Envoltorio accesible sobre PrimeVue DataTable.
    - Nombre accesible de la tabla vía `caption` (aria-label en el root + <caption> sr-only).
    - Anuncia a lectores de pantalla los cambios de orden, página y filtro.
    - Reenvía columnas por el slot por defecto y todos los props/eventos con v-bind/$attrs.
    Uso: idéntico a <DataTable>, añadiendo `caption` (obligatorio) y opcionalmente
    `announceRows` para leer el total de resultados tras filtrar.
  -->
  <div>
    <span class="sr-only">{{ caption }}</span>
    <DataTable
      v-bind="$attrs"
      :value="value"
      :pt="mergedPt"
      @sort="onSort"
      @page="onPage"
      @filter="onFilter"
    >
      <slot />
    </DataTable>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import { announce } from '@/composables/useA11yFocus'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  value: { type: Array, default: () => [] },
  /** Nombre accesible de la tabla (obligatorio para lectores de pantalla). */
  caption: { type: String, required: true },
  /** Anunciar el total de filas al ordenar/filtrar/paginar. */
  announceRows: { type: Boolean, default: true },
  /** pt adicional que se fusiona con el de accesibilidad. */
  pt: { type: Object, default: () => ({}) },
})

// role="table" explícito + aria-label en el elemento <table> de PrimeVue.
const mergedPt = computed(() => ({
  ...props.pt,
  table: {
    role: 'table',
    'aria-label': props.caption,
    ...(props.pt.table || {}),
  },
}))

function rowsSuffix() {
  if (!props.announceRows) return ''
  const n = props.value?.length ?? 0
  return `. ${n} resultado${n === 1 ? '' : 's'}`
}

function onSort(e) {
  const dir = e.sortOrder === 1 ? 'ascendente' : 'descendente'
  announce(`Tabla ordenada por ${e.sortField || 'columna'}, orden ${dir}${rowsSuffix()}`)
}

function onPage(e) {
  announce(`Página ${e.page + 1}${rowsSuffix()}`)
}

function onFilter() {
  announce(`Resultados filtrados${rowsSuffix()}`)
}
</script>
