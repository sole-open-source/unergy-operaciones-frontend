<template>
  <div class="space-y-4">
    <PageHeader title="Operadores de Red" :subtitle="`${operadores.length} operadores · catálogo y correos de contacto para el reporte CGM`" />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl" style="color: #915BD8;" />
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <DataTable :value="operadores" rowHover class="text-sm">
        <Column field="nombre_comercial" header="Nombre comercial" sortable>
          <template #body="{ data }">
            <span style="color: #2C2039; font-weight: 600;">{{ data.nombre_comercial || '—' }}</span>
          </template>
        </Column>
        <Column field="nombre_legal" header="Nombre legal" sortable>
          <template #body="{ data }">
            <span style="color: #6b5a8a;">{{ data.nombre_legal }}</span>
          </template>
        </Column>
        <Column header="Correos">
          <template #body="{ data }">
            <span v-if="data.contactos.length" style="color: #6b5a8a;">
              {{ data.contactos.length }} correo{{ data.contactos.length > 1 ? 's' : '' }}
            </span>
            <span v-else class="text-xs italic" style="color: #c4b8d4;">Sin correos</span>
          </template>
        </Column>
        <Column header="Fronteras vinculadas">
          <template #body="{ data }">
            <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
              style="background: rgba(145,91,216,0.1); color: #6E3FB8;">
              {{ data.fronteras_vinculadas }}
            </span>
          </template>
        </Column>
        <Column header="" style="width: 70px">
          <template #body="{ data }">
            <Button icon="pi pi-eye" text rounded size="small" v-tooltip.top="'Ver detalle'"
              @click="$router.push(`/mem/operadores-red/${data.id}`)" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import api from '@/api/client'

const operadores = ref([])
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/operadores-red')
    operadores.value = data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
