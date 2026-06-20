<!--
  VirtualTable — envoltura reutilizable sobre PrimeVue DataTable con scroll
  virtual integrado.

  PrimeVue 4 incluye virtualización nativa en DataTable (scrollable +
  virtualScrollerOptions), que sólo monta en el DOM las filas visibles. Este
  wrapper la habilita por defecto y conserva toda la flexibilidad del DataTable:

    • `columns`  → definición declarativa de columnas simples (opcional).
    • slot por defecto → permite pasar <Column> con plantillas ricas, igual que
      un DataTable normal. Ambos enfoques pueden combinarse.
    • `v-bind="$attrs"` reenvía props y *listeners* (onPage, onSort, onFilter,
      onRowClick…) directamente al DataTable, por lo que los eventos estándar
      quedan expuestos al padre sin re-emisión manual.

  Para columnas declaradas vía `columns`, se puede personalizar la celda con un
  slot llamado `body-<field>` que recibe `{ data }`.

  Nota sobre rendimiento: el scroll virtual requiere altura de fila fija
  (`itemSize`). Para tablas con filas de altura variable (p. ej. árboles
  colapsables) deja `virtualScroll` en false y usa scroll nativo.
-->
<template>
  <DataTable
    :value="value"
    :scrollable="scrollable"
    :scrollHeight="scrollHeight"
    :virtualScrollerOptions="resolvedVirtualScrollerOptions"
    v-bind="$attrs"
  >
    <!-- Columnas declarativas (prop `columns`) + slot por defecto con <Column>
         propios; ambos van al slot por defecto del DataTable. -->
    <Column
      v-for="col in columns"
      :key="col.field || col.header"
      :field="col.field"
      :header="col.header"
      :sortable="col.sortable"
      :style="col.style"
      :class="col.class"
    >
      <template v-if="$slots[`body-${col.field}`]" #body="slotProps">
        <slot :name="`body-${col.field}`" v-bind="slotProps" />
      </template>
    </Column>
    <slot />

    <!-- Reenvío del resto de slots nombrados del DataTable (empty, header,
         footer, loading, paginatorstart…). -->
    <template
      v-for="name in forwardedSlots"
      #[name]="slotProps"
      :key="name"
    >
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </DataTable>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const slots = useSlots()

// No queremos que props como `class`/`style`/listeners se apliquen al raíz:
// se reenvían explícitamente al DataTable mediante v-bind="$attrs".
defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** Array de datos a renderizar. */
  value: { type: Array, default: () => [] },
  /** Definición declarativa de columnas simples (opcional). */
  columns: { type: Array, default: () => [] },
  /** Habilita el scroll virtual (sólo filas visibles en el DOM). */
  virtualScroll: { type: Boolean, default: true },
  /** Altura fija de cada fila en px (requerida por el scroll virtual). */
  itemSize: { type: Number, default: 48 },
  /** Altura del área de scroll. PrimeVue acepta px, calc() o 'flex'. */
  scrollHeight: { type: String, default: 'calc(100vh - 300px)' },
  /**
   * Opciones adicionales para el VirtualScroller interno (se fusionan con
   * itemSize). Útil para `lazy`, `numToleratedItems`, etc.
   */
  virtualScrollerOptions: { type: Object, default: null },
})

// El scroll virtual exige `scrollable`; cuando se desactiva, el DataTable se
// comporta como uno normal (útil para filas de altura variable / paginación).
const scrollable = computed(() => props.virtualScroll)

// Slots nombrados a reenviar al DataTable, excluyendo el default (que se
// maneja directamente arriba) y los slots `body-<field>` que consume la prop
// `columns`.
const forwardedSlots = computed(() =>
  Object.keys(slots).filter(
    (name) => name !== 'default' && !name.startsWith('body-'),
  ),
)

const resolvedVirtualScrollerOptions = computed(() => {
  if (!props.virtualScroll) return undefined
  return {
    itemSize: props.itemSize,
    ...(props.virtualScrollerOptions || {}),
  }
})
</script>
