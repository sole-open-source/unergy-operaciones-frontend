<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm" style="color: #6b5a8a;">
        Correos de esta razón social, por área. Aplican a todos sus proyectos salvo que uno apunte a otro cliente para ese tipo.
      </p>
      <button v-if="!nuevo" type="button" @click="nuevo = { tipo: 'operacional', email: '', nombre: '' }"
        class="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        style="background:#915BD8;color:#fff;">
        <i class="pi pi-plus text-xs" /> Agregar contacto
      </button>
    </div>

    <div v-if="!contactos.length && !nuevo" class="text-sm text-center py-8 italic" style="color: #c4b3df;">
      Sin contactos configurados
    </div>

    <div v-for="c in contactos" :key="c.id" class="flex items-center gap-2">
      <Select v-model="c.tipo" :options="TIPOS" optionLabel="label" optionValue="value"
        class="w-40" @change="guardarContacto(c)" />
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
      <button type="button" @click="enviarPrueba(c.email)" :disabled="!emailValido(c.email)"
        title="Enviar correo de prueba"
        class="p-1.5 rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-40">
        <i class="pi pi-send text-xs" style="color: #915BD8;" />
      </button>
      <button type="button" @click="eliminarContacto(c)"
        class="p-1.5 rounded-lg transition-colors hover:bg-red-50">
        <i class="pi pi-trash text-xs" style="color: #ef4444;" />
      </button>
    </div>

    <div v-if="nuevo" class="flex items-center gap-2">
      <Select v-model="nuevo.tipo" :options="TIPOS" optionLabel="label" optionValue="value" class="w-40" />
      <div class="flex-1 relative">
        <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-xs" style="color: #9b89b5;" />
        <input v-model="nuevo.email" type="email" placeholder="correo@empresa.com" autofocus
          @keyup.enter="crearContacto"
          class="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none transition-colors"
          style="border:1.5px solid #e8e0f0;background:#fff;" />
      </div>
      <input v-model="nuevo.nombre" type="text" placeholder="Nombre (opcional)"
        @keyup.enter="crearContacto"
        class="w-40 px-3 py-2 text-sm rounded-lg outline-none"
        style="border:1.5px solid #e8e0f0;background:#fff;" />
      <button type="button" @click="crearContacto" class="p-1.5 rounded-lg hover:bg-green-50">
        <i class="pi pi-check text-xs" style="color: #16a34a;" />
      </button>
      <button type="button" @click="nuevo = null" class="p-1.5 rounded-lg hover:bg-gray-50">
        <i class="pi pi-times text-xs" style="color: #9b89b5;" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({ clienteId: { type: [Number, String], required: true } })
const toast = useToast()
const contactos = ref([])
const nuevo = ref(null)

const TIPOS = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'cgm', label: 'CGM' },
  { value: 'liquidacion', label: 'Liquidación' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'monitoreo', label: 'Monitoreo' },
]

function emailValido(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')
}

async function cargar() {
  if (!props.clienteId) return
  const { data } = await api.get(`/clientes/${props.clienteId}/contactos`)
  contactos.value = data
}

async function crearContacto() {
  if (!nuevo.value || !emailValido(nuevo.value.email)) return
  try {
    const { data } = await api.post(`/clientes/${props.clienteId}/contactos`, {
      tipo: nuevo.value.tipo,
      email: nuevo.value.email.trim().toLowerCase(),
      nombre: nuevo.value.nombre?.trim() || null,
    })
    contactos.value.push(data)
    nuevo.value = null
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo agregar el contacto', life: 4000 })
  }
}

async function guardarContacto(contacto) {
  if (!emailValido(contacto.email)) return
  try {
    await api.patch(`/clientes/${props.clienteId}/contactos/${contacto.id}`, {
      tipo: contacto.tipo,
      email: contacto.email.trim().toLowerCase(),
      nombre: contacto.nombre?.trim() || null,
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo guardar el contacto', life: 4000 })
    cargar()
  }
}

async function eliminarContacto(contacto) {
  try {
    await api.delete(`/clientes/${props.clienteId}/contactos/${contacto.id}`)
    contactos.value = contactos.value.filter(c => c.id !== contacto.id)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el contacto', life: 4000 })
  }
}

async function enviarPrueba(email) {
  if (!emailValido(email)) return
  try {
    await api.post(`/clientes/${props.clienteId}/test-correo`, { email })
    toast.add({ severity: 'success', summary: 'Correo de prueba enviado', detail: `✓ Enviado a ${email}`, life: 4000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al enviar', detail: e.response?.data?.detail || e.message, life: 5000 })
  }
}

watch(() => props.clienteId, cargar, { immediate: true })
</script>
