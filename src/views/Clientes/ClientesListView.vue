<template>
  <div class="space-y-4">
    <PageHeader title="Clientes" :subtitle="`${total} cliente${total === 1 ? '' : 's'} · directorio e inversionistas`">
      <template #actions>
        <IconField class="flex-1 sm:flex-none">
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" placeholder="Buscar..." class="w-full sm:w-64" @input="onSearch" />
        </IconField>
        <Button label="Nuevo cliente" icon="pi pi-plus" size="small" @click="openNew" />
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden border" style="border-color:#ECE7F2">
      <BaseDataTable
        :value="items"
        :columns="columns"
        :loading="loading"
        lazy
        :rows="pagination.size"
        :total-records="total"
        @page="onPage"
      >
        <template #actions="{ data }">
          <Button icon="pi pi-eye" text rounded size="small" v-tooltip.top="'Ver detalle'" @click="$router.push(`/clientes/${data.id}`)" />
          <Button icon="pi pi-pencil" text rounded size="small" v-tooltip.top="'Editar'" @click="openEdit(data)" />
        </template>
      </BaseDataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Editar cliente' : 'Nuevo cliente'"
      modal class="w-full max-w-lg">
      <ClienteForm :initial="form" @save="onSave" @cancel="dialogVisible = false" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import BaseDataTable from '@/components/crud/BaseDataTable.vue'
import { useCrudManager } from '@/composables/useCrudManager'
import { clientesConfig } from '@/utils/crudConfig'
import ClienteForm from './ClienteForm.vue'

const toast = useToast()

const {
  items, total, loading, pagination,
  fetchData, setFilter, setPage, createItem, updateItem,
} = useCrudManager({ endpoint: clientesConfig.endpoint, lazy: true, pageSize: clientesConfig.pageSize })

const columns = clientesConfig.columns

const q = ref('')
const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({})

onMounted(fetchData)

function onSearch() {
  setFilter('q', q.value || undefined, { debounce: 350 })
}

function onPage(e) {
  setPage(e.page + 1, e.rows)
}

function openNew() {
  editingId.value = null
  form.value = {}
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = { ...row }
  dialogVisible.value = true
}

async function onSave(payload) {
  try {
    if (editingId.value) {
      await updateItem(editingId.value, payload)
      toast.add({ severity: 'success', summary: 'Cliente actualizado', life: 3000 })
    } else {
      await createItem(payload)
      toast.add({ severity: 'success', summary: 'Cliente creado', life: 3000 })
    }
    dialogVisible.value = false
    fetchData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 4000 })
  }
}
</script>
