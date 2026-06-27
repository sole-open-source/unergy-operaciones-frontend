<template>
  <div class="space-y-5">
    <PageHeader title="Centro de Alertas" subtitle="Alertas operacionales unificadas">
      <template #lead>
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background: rgba(214,68,85,0.1);">
          <i class="pi pi-exclamation-circle text-sm" style="color: #D64455;" />
        </div>
      </template>
    </PageHeader>

    <AlertsDisplayComponent :type="alertType" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AlertsDisplayComponent from '@/components/alerts/AlertsDisplayComponent.vue'

const props = defineProps({
  // Puede inyectarse vía props del router; si no, se lee de la query string.
  type: { type: String, default: '' },
})

const route = useRoute()

// El tipo inicial puede venir como prop (definido en el router por la ruta de
// origen) o como ?type= en la query. Por defecto: 'all'.
const alertType = computed(
  () => props.type || route.query.type || 'all',
)
</script>
