<template>
  <div class="space-y-4" v-if="operador">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button @click="$router.push('/mem/operadores-red')"
        class="text-sm flex items-center gap-1 hover:underline" style="color: #915BD8;">
        <i class="pi pi-arrow-left text-xs" /> Operadores de Red
      </button>
      <span style="color: #c5b9db;">/</span>
      <span class="text-sm font-semibold" style="color: #2C2039;">{{ operador.nombre_comercial || operador.nombre_legal }}</span>
    </div>

    <div>
      <h1 class="text-lg font-bold" style="color: #2C2039;">{{ operador.nombre_comercial || operador.nombre_legal }}</h1>
      <p class="text-xs mt-0.5" style="color: #9b89b5;">
        {{ operador.nombre_legal }} · {{ operador.fronteras_vinculadas }} frontera{{ operador.fronteras_vinculadas === 1 ? '' : 's' }} vinculada{{ operador.fronteras_vinculadas === 1 ? '' : 's' }}
      </p>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <div class="flex border-b" style="border-color: #e8e0f0;">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          class="px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
          :style="activeTab === tab.key
            ? 'border-color: #915BD8; color: #915BD8;'
            : 'border-color: transparent; color: #6b5a8a;'">
          <i :class="tab.icon + ' mr-1.5 text-xs'" />{{ tab.label }}
        </button>
      </div>

      <div class="p-6">
        <!-- ── Tab: Contactos ── -->
        <div v-if="activeTab === 'contactos'" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm" style="color: #6b5a8a;">Correos que reciben el reporte CGM de las fronteras de este operador.</p>
            <button v-if="!nuevo" type="button" @click="nuevo = { email: '', nombre: '' }"
              class="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style="background:#915BD8;color:#fff;">
              <i class="pi pi-plus text-xs" /> Agregar contacto
            </button>
          </div>

          <div v-if="!operador.contactos.length && !nuevo" class="text-sm text-center py-8 italic" style="color: #c4b3df;">
            Sin correos configurados
          </div>

          <div v-for="c in operador.contactos" :key="c.id" class="flex items-center gap-2">
            <div class="flex-1 relative">
              <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #9b89b5;" />
              <input v-model="c.email" type="email" placeholder="correo@empresa.com"
                @blur="guardarContacto(c)"
                class="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
                :style="emailValido(c.email) ? 'border:1.5px solid #e8e0f0;background:#fff;' : 'border:1.5px solid #fca5a5;background:#fff5f5;'" />
            </div>
            <input v-model="c.nombre" type="text" placeholder="Nombre (opcional)"
              @blur="guardarContacto(c)"
              class="w-40 px-3 py-2 text-sm rounded-lg outline-none"
              style="border:1.5px solid #e8e0f0;background:#fff;" />
            <button type="button" @click="eliminarContacto(c)"
              class="p-1.5 rounded-lg transition-colors hover:bg-red-50">
              <i class="pi pi-trash text-xs" style="color: #ef4444;" />
            </button>
          </div>

          <div v-if="nuevo" class="flex items-center gap-2">
            <div class="flex-1 relative">
              <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #9b89b5;" />
              <input v-model="nuevo.email" type="email" placeholder="correo@empresa.com" autofocus
                @blur="crearContacto"
                class="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
                style="border:1.5px solid #e8e0f0;background:#fff;" />
            </div>
            <input v-model="nuevo.nombre" type="text" placeholder="Nombre (opcional)"
              @blur="crearContacto"
              class="w-40 px-3 py-2 text-sm rounded-lg outline-none"
              style="border:1.5px solid #e8e0f0;background:#fff;" />
            <button type="button" @click="nuevo = null" class="p-1.5 rounded-lg hover:bg-gray-50">
              <i class="pi pi-times text-xs" style="color: #9b89b5;" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center py-20">
    <i class="pi pi-spin pi-spinner text-2xl" style="color: #915BD8;" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const route = useRoute()
const toast = useToast()
const operador = ref(null)
const activeTab = ref('contactos')
const nuevo = ref(null)

// Solo hay una pestaña hoy (Contactos) -- se deja como arreglo para agregar
// más información del operador (zonas, SLAs, documentos...) sin rehacer la vista.
const tabs = [
  { key: 'contactos', label: 'Contactos', icon: 'pi pi-envelope' },
]

function emailValido(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')
}

async function cargar() {
  const { data } = await api.get(`/operadores-red/${route.params.id}`)
  operador.value = data
}

async function crearContacto() {
  if (!nuevo.value || !emailValido(nuevo.value.email)) return
  try {
    const { data } = await api.post(`/operadores-red/${operador.value.id}/contactos`, {
      email: nuevo.value.email.trim().toLowerCase(),
      nombre: nuevo.value.nombre?.trim() || null,
    })
    operador.value.contactos.push(data)
    nuevo.value = null
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo agregar el contacto', life: 4000 })
  }
}

async function guardarContacto(contacto) {
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

async function eliminarContacto(contacto) {
  try {
    await api.delete(`/operadores-red/contactos/${contacto.id}`)
    operador.value.contactos = operador.value.contactos.filter(c => c.id !== contacto.id)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el contacto', life: 4000 })
  }
}

onMounted(cargar)
</script>
