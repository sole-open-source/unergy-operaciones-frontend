<template>
  <BaseListView
    ref="listRef"
    api-endpoint="/clientes"
    title="Clientes"
    :initial-rows="20"
    search-placeholder="Buscar..."
    empty-message="No se encontraron clientes."
  >
    <template #subtitle="{ total }">
      {{ total }} cliente{{ total === 1 ? '' : 's' }} · directorio e inversionistas
    </template>

    <template #header>
      <Button label="Nuevo cliente" icon="pi pi-plus" size="small" @click="openNew" />
    </template>

    <Column field="razon_social_nombre" header="Razón social / Nombre" sortable />
    <Column field="nit_cedula" header="NIT / Cédula" />
    <Column field="tipo_persona" header="Tipo" />
    <Column field="ciudad" header="Ciudad" />
    <Column field="correo_electronico" header="Correo" />
    <Column header="Acciones" style="width: 120px">
      <template #body="{ data }">
        <Button icon="pi pi-eye" text rounded size="small" v-tooltip.top="'Ver detalle'" @click="$router.push(`/clientes/${data.id}`)" />
        <Button icon="pi pi-pencil" text rounded size="small" v-tooltip.top="'Editar'" @click="openEdit(data)" />
      </template>
    </Column>

  </BaseListView>

  <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Editar cliente' : 'Nuevo cliente'"
    modal class="w-full max-w-lg">
    <ClienteForm :initial="form" @save="onSave" @cancel="dialogVisible = false" />
  </Dialog>
</template>

<script setup>
import { ref } from 'vue'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import BaseListView from '@/components/BaseListView.vue'
import ClienteForm from './ClienteForm.vue'

const toast = useToast()
const listRef = ref(null)
const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({})

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
      await api.patch(`/clientes/${editingId.value}`, payload)
      toast.add({ severity: 'success', summary: 'Cliente actualizado', life: 3000 })
    } else {
      await api.post('/clientes', payload)
      toast.add({ severity: 'success', summary: 'Cliente creado', life: 3000 })
    }
    dialogVisible.value = false
    listRef.value?.refreshData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 4000 })
  }
}
</script>
