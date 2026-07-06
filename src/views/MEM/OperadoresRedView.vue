<template>
  <div class="space-y-5">
    <PageHeader title="Operadores de Red" subtitle="Catálogo de OR y sus correos de contacto para el reporte CGM" />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl" style="color: #915BD8;" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="op in operadores" :key="op.id"
        class="bg-white rounded-xl shadow-sm p-4" style="border: 1px solid #e8e0f0;">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-sm font-bold" style="color: #2C2039;">{{ op.nombre_comercial || op.nombre_legal }}</p>
            <p class="text-xs mt-0.5" style="color: #9b89b5;">{{ op.nombre_legal }}</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
            style="background: rgba(145,91,216,0.1); color: #6E3FB8;">
            {{ op.fronteras_vinculadas }} {{ op.fronteras_vinculadas === 1 ? 'frontera' : 'fronteras' }}
          </span>
        </div>

        <div class="space-y-2">
          <div v-if="!op.contactos.length && !op._nuevo" class="text-xs italic py-1" style="color: #c4b3df;">
            Sin correos configurados
          </div>

          <div v-for="c in op.contactos" :key="c.id" class="flex items-center gap-2">
            <div class="flex-1 relative">
              <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #9b89b5;" />
              <input v-model="c.email" type="email" placeholder="correo@empresa.com"
                @blur="guardarContacto(op, c)"
                class="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
                :style="emailValido(c.email) ? 'border:1.5px solid #e8e0f0;background:#fff;' : 'border:1.5px solid #fca5a5;background:#fff5f5;'" />
            </div>
            <input v-model="c.nombre" type="text" placeholder="Nombre (opcional)"
              @blur="guardarContacto(op, c)"
              class="w-32 px-3 py-2 text-sm rounded-lg outline-none"
              style="border:1.5px solid #e8e0f0;background:#fff;" />
            <button type="button" @click="eliminarContacto(op, c)"
              class="p-1.5 rounded-lg transition-colors hover:bg-red-50">
              <i class="pi pi-trash text-xs" style="color: #ef4444;" />
            </button>
          </div>

          <div v-if="op._nuevo" class="flex items-center gap-2">
            <div class="flex-1 relative">
              <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #9b89b5;" />
              <input v-model="op._nuevo.email" type="email" placeholder="correo@empresa.com" autofocus
                @blur="crearContacto(op)"
                class="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
                style="border:1.5px solid #e8e0f0;background:#fff;" />
            </div>
            <input v-model="op._nuevo.nombre" type="text" placeholder="Nombre (opcional)"
              @blur="crearContacto(op)"
              class="w-32 px-3 py-2 text-sm rounded-lg outline-none"
              style="border:1.5px solid #e8e0f0;background:#fff;" />
            <button type="button" @click="op._nuevo = null" class="p-1.5 rounded-lg hover:bg-gray-50">
              <i class="pi pi-times text-xs" style="color: #9b89b5;" />
            </button>
          </div>
        </div>

        <button v-if="!op._nuevo" type="button" @click="op._nuevo = { email: '', nombre: '' }"
          class="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-3"
          style="background:#915BD8;color:#fff;">
          <i class="pi pi-plus text-xs" /> Agregar contacto
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const toast = useToast()
const operadores = ref([])
const loading = ref(true)

function emailValido(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')
}

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/operadores-red')
    operadores.value = data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los operadores de red', life: 4000 })
  } finally {
    loading.value = false
  }
}

async function crearContacto(op) {
  const nuevo = op._nuevo
  if (!nuevo || !emailValido(nuevo.email)) return
  try {
    const { data } = await api.post(`/operadores-red/${op.id}/contactos`, {
      email: nuevo.email.trim().toLowerCase(),
      nombre: nuevo.nombre?.trim() || null,
    })
    op.contactos.push(data)
    op._nuevo = null
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo agregar el contacto', life: 4000 })
  }
}

async function guardarContacto(op, contacto) {
  if (!emailValido(contacto.email)) return
  try {
    await api.patch(`/operadores-red/contactos/${contacto.id}`, {
      email: contacto.email.trim().toLowerCase(),
      nombre: contacto.nombre?.trim() || null,
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo guardar el contacto', life: 4000 })
  }
}

async function eliminarContacto(op, contacto) {
  try {
    await api.delete(`/operadores-red/contactos/${contacto.id}`)
    op.contactos = op.contactos.filter(c => c.id !== contacto.id)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el contacto', life: 4000 })
  }
}

onMounted(loadData)
</script>
