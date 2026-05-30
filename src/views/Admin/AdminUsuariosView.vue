<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold leading-tight" style="color:#2C2039">Gestión de Usuarios</h2>
      <Button label="Nuevo usuario" icon="pi pi-plus" @click="openNew" />
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="p-4 border-b border-gray-100">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" placeholder="Buscar por nombre o correo..." class="w-72" @input="onSearch" />
        </IconField>
      </div>

      <DataTable :value="filtered" :loading="loading" :rows="20" paginator rowHover class="text-sm"
        :globalFilterFields="['nombre', 'email']">
        <Column field="nombre" header="Nombre" sortable />
        <Column field="email" header="Correo" sortable />
        <Column field="rol" header="Rol" sortable style="width: 140px">
          <template #body="{ data }">
            <Tag :value="ROL_LABELS[data.rol] || data.rol" :severity="ROL_SEVERITY[data.rol] || 'secondary'" />
          </template>
        </Column>
        <Column field="activo" header="Estado" style="width: 100px">
          <template #body="{ data }">
            <Tag :value="data.activo ? 'Activo' : 'Inactivo'" :severity="data.activo ? 'success' : 'danger'" />
          </template>
        </Column>
        <Column header="Acciones" style="width: 140px">
          <template #body="{ data }">
            <Button icon="pi pi-key" text rounded size="small" v-tooltip.top="'API Keys'" @click="openApiKeys(data)" />
            <Button icon="pi pi-pencil" text rounded size="small" v-tooltip.top="'Editar'" @click="openEdit(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogVisible" :header="editingId ? 'Editar usuario' : 'Nuevo usuario'"
      modal class="w-full max-w-lg">
      <UsuarioForm :initial="form" @save="onSave" @cancel="dialogVisible = false" />
    </Dialog>

    <ApiKeysDialog v-model:visible="apiKeysVisible" :usuario="apiKeysUser" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import UsuarioForm from './UsuarioForm.vue'
import ApiKeysDialog from './ApiKeysDialog.vue'

const toast = useToast()
const items = ref([])
const loading = ref(false)
const q = ref('')
const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({})
const apiKeysVisible = ref(false)
const apiKeysUser = ref(null)

const ROL_LABELS = {
  admin: 'Admin',
  operaciones: 'Operaciones',
  monitoreo: 'Monitoreo',
  liquidaciones: 'Liquidaciones',
  cgm: 'CGM',
  solo_lectura: 'Solo lectura',
}

const ROL_SEVERITY = {
  admin: 'danger',
  operaciones: 'info',
  monitoreo: 'warn',
  liquidaciones: 'success',
  cgm: 'secondary',
  solo_lectura: 'contrast',
}

const filtered = computed(() => {
  if (!q.value) return items.value
  const term = q.value.toLowerCase()
  return items.value.filter(u =>
    u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
  )
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/usuarios')
    items.value = data.items
  } finally {
    loading.value = false
  }
}

onMounted(load)

let searchTimer
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {}, 350)
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

function openApiKeys(row) {
  apiKeysUser.value = row
  apiKeysVisible.value = true
}

async function onSave(payload) {
  try {
    if (editingId.value) {
      await api.patch(`/usuarios/${editingId.value}`, payload)
      toast.add({ severity: 'success', summary: 'Usuario actualizado', life: 3000 })
    } else {
      await api.post('/usuarios', payload)
      toast.add({ severity: 'success', summary: 'Usuario creado', life: 3000 })
    }
    dialogVisible.value = false
    load()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'Error al guardar', life: 4000 })
  }
}
</script>
