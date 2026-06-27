<template>
  <div class="space-y-4">
    <!-- Controles: filtro por tipo, búsqueda, solo no atendidas -->
    <div class="flex flex-wrap items-center gap-3">
      <Select
        :modelValue="currentFilters.type"
        :options="TYPE_OPTIONS"
        optionLabel="label"
        optionValue="value"
        class="w-44 text-sm"
        aria-label="Filtrar por tipo de alerta"
        @update:modelValue="updateFilter('type', $event)"
      />
      <IconField class="flex-1 min-w-[200px]">
        <InputIcon class="pi pi-search" />
        <InputText
          :modelValue="currentFilters.search"
          placeholder="Buscar en alertas…"
          class="w-full text-sm"
          aria-label="Buscar en alertas"
          @update:modelValue="updateFilter('search', $event)"
        />
      </IconField>
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <Checkbox
          :modelValue="currentFilters.onlyUnread"
          binary
          @update:modelValue="updateFilter('onlyUnread', $event)"
        />
        Solo sin atender
      </label>
      <Tag :value="`${unreadCount} sin atender`" severity="danger" class="text-xs" />
    </div>

    <!-- Aviso de degradación: alguna fuente no respondió → lista incompleta -->
    <div
      v-if="!loading && degradedSources.length"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
      style="background: rgba(234,88,12,0.08); color: #C2410C; border: 1px solid rgba(234,88,12,0.2);"
    >
      <i class="pi pi-exclamation-triangle" />
      <span>
        No se pudieron cargar
        {{ degradedSources.map(typeLabel).join(', ') }} — la lista puede estar incompleta.
      </span>
    </div>

    <!-- Estados -->
    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <div
      v-else-if="error"
      class="flex flex-col items-center py-12 gap-2 text-gray-400"
    >
      <i class="pi pi-exclamation-triangle text-red-400 text-3xl" />
      <p class="text-sm">{{ error }}</p>
    </div>

    <div
      v-else-if="filteredCount === 0"
      class="flex flex-col items-center py-12 gap-2 text-gray-400"
    >
      <i class="pi pi-check-circle text-green-400 text-3xl" />
      <p class="text-sm">No hay alertas que coincidan.</p>
    </div>

    <template v-else>
      <DataTable :value="alerts" size="small" stripedRows :rowHover="true" class="text-sm">
        <Column header="Severidad" style="width:120px">
          <template #body="{ data }">
            <span
              class="text-xs font-semibold rounded-full px-2 py-0.5"
              :class="severityClass(data.severity)"
            >
              {{ severityLabel(data.severity) }}
            </span>
          </template>
        </Column>

        <Column header="Tipo" style="width:120px">
          <template #body="{ data }">
            <Tag :value="typeLabel(data.type)" severity="secondary" class="text-xs" />
          </template>
        </Column>

        <Column header="Alerta" style="min-width:260px">
          <template #body="{ data }">
            <p class="text-xs font-medium text-gray-800" :class="{ 'line-through opacity-60': data.isRead }">
              {{ data.message }}
            </p>
            <p v-if="data.details?.text || data.details?.descripcion"
               class="text-xs text-gray-500 line-clamp-2">
              {{ data.details.text || data.details.descripcion }}
            </p>
          </template>
        </Column>

        <Column header="Fecha" style="width:150px">
          <template #body="{ data }">
            <span class="font-mono text-xs text-gray-500">
              {{ data.timestamp ? new Date(data.timestamp).toLocaleString('es-CO') : '—' }}
            </span>
          </template>
        </Column>

        <Column header="" style="width:140px">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1">
              <RouterLink v-if="data.details?.link" :to="data.details.link">
                <Button icon="pi pi-arrow-right" text size="small" severity="secondary"
                  v-tooltip="'Ver detalle'" />
              </RouterLink>
              <Button
                v-if="!data.isRead"
                icon="pi pi-check"
                size="small"
                severity="success"
                text
                v-tooltip="data.details?.canResolve ? 'Resolver' : 'Marcar atendida'"
                @click="toggleAlertReadStatus(data.id)"
              />
              <i v-else class="pi pi-check-circle text-green-500 text-sm" v-tooltip="'Atendida'" />
            </div>
          </template>
        </Column>
      </DataTable>

      <Paginator
        v-if="filteredCount > pagination.pageSize"
        :rows="pagination.pageSize"
        :totalRecords="filteredCount"
        :first="(pagination.page - 1) * pagination.pageSize"
        :rowsPerPageOptions="[10, 20, 50]"
        @page="onPage"
      />
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { RouterLink } from 'vue-router'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Checkbox from 'primevue/checkbox'
import Paginator from 'primevue/paginator'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { useAlerts } from '@/composables/useAlerts'

const props = defineProps({
  // Tipo inicial de alertas a mostrar: 'all' | 'monitoreo' | 'ppa' | 'general'
  type: { type: String, default: 'all' },
})

const {
  alerts,
  loading,
  error,
  unreadCount,
  filteredCount,
  degradedSources,
  currentFilters,
  pagination,
  loadAlerts,
  updateFilter,
  toggleAlertReadStatus,
  goToPage,
  setPageSize,
} = useAlerts()

const TYPE_OPTIONS = [
  { label: 'Todas', value: 'all' },
  { label: 'Monitoreo', value: 'monitoreo' },
  { label: 'Contratos PPA', value: 'ppa' },
  { label: 'General', value: 'general' },
]

function severityClass(s) {
  return {
    critical: 'bg-red-100 text-red-600',
    warning: 'bg-orange-100 text-orange-600',
    info: 'bg-blue-100 text-blue-600',
  }[s] || 'bg-gray-100 text-gray-500'
}

function severityLabel(s) {
  return { critical: 'Crítica', warning: 'Advertencia', info: 'Informativa' }[s] || s
}

function typeLabel(t) {
  return { monitoreo: 'Monitoreo', ppa: 'Contratos PPA', general: 'General' }[t] || t
}

function onPage(e) {
  // PrimeVue Paginator: e.page es 0-based; e.rows es el pageSize seleccionado.
  if (e.rows !== pagination.value.pageSize) {
    setPageSize(e.rows)
  } else {
    goToPage(e.page + 1)
  }
}

// Carga inicial + recarga cuando cambia el tipo provisto por la vista contenedora.
watch(
  () => props.type,
  (t) => {
    updateFilter('type', t === 'general' || t === 'monitoreo' || t === 'ppa' ? t : 'all')
    loadAlerts(t || 'all')
  },
  { immediate: true },
)
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:deep(.p-datatable .p-datatable-thead th) {
  background: #faf9fb;
  color: #6b7280;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.5rem 0.75rem;
}
:deep(.p-datatable .p-datatable-tbody td) {
  padding: 0.4rem 0.75rem;
}
</style>
