<template>
  <div class="space-y-3">
    <p class="text-sm" style="color: #6b5a8a;">
      Por defecto cada área usa los contactos de los inversionistas vigentes de este proyecto
      <template v-if="inversionistasConId.length">:
        <template v-for="(inv, idx) in inversionistasConId" :key="inv.cliente_id">
          <RouterLink :to="`/clientes/${inv.cliente_id}?tab=contactos`" class="font-semibold underline" style="color:#915BD8;">{{ inv.cliente_nombre }}</RouterLink>{{ idx < inversionistasConId.length - 1 ? ', ' : '' }}
        </template>
      </template>
      <template v-else> — este proyecto aún no tiene inversionistas registrados, así que ningún tipo tendrá contacto por defecto</template>.
      Si para este proyecto la comunicación de alguna área la lleva otro cliente en particular, apúntala aquí.
    </p>

    <div v-for="tipo in TIPOS" :key="tipo.value" class="flex items-center gap-2 py-1.5">
      <span class="w-32 text-sm font-medium" style="color: #2C2039;">{{ tipo.label }}</span>

      <template v-if="overrides[tipo.value] && editando !== tipo.value">
        <span class="text-sm flex-1" style="color: #6b5a8a;">
          <i class="pi pi-arrow-right-arrow-left text-xs mr-1" style="color:#915BD8;" />
          <RouterLink :to="`/clientes/${overrides[tipo.value].cliente_id}?tab=contactos`" class="underline" style="color:#915BD8;">
            {{ overrides[tipo.value].cliente_nombre }}
          </RouterLink>
        </span>
        <button type="button" @click="editando = tipo.value"
          class="text-xs px-2 py-1 rounded hover:bg-gray-50" style="color:#915BD8;">Cambiar</button>
        <button type="button" @click="quitarOverride(tipo.value)"
          class="p-1.5 rounded-lg transition-colors hover:bg-red-50">
          <i class="pi pi-trash text-xs" style="color: #ef4444;" />
        </button>
      </template>

      <template v-else-if="editando === tipo.value">
        <Select v-model="clienteSeleccionado" :options="clientesOptions" optionLabel="razon_social_nombre"
          optionValue="id" class="flex-1" filter showClear placeholder="Buscar cliente..." />
        <button type="button" @click="guardarOverride(tipo.value)" :disabled="!clienteSeleccionado"
          class="p-1.5 rounded-lg hover:bg-green-50 disabled:opacity-40">
          <i class="pi pi-check text-xs" style="color: #16a34a;" />
        </button>
        <button type="button" @click="editando = null" class="p-1.5 rounded-lg hover:bg-gray-50">
          <i class="pi pi-times text-xs" style="color: #9b89b5;" />
        </button>
      </template>

      <template v-else>
        <span class="flex-1"></span>
        <button type="button" @click="editando = tipo.value; clienteSeleccionado = null"
          class="text-xs px-2 py-1 rounded hover:bg-gray-50" style="color:#915BD8;">Usar otro cliente</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({
  proyectoId: { type: [Number, String], required: true },
  inversionistas: { type: Array, default: () => [] },
  clientesOptions: { type: Array, default: () => [] },
})
const toast = useToast()

const inversionistasConId = computed(() => {
  const hoy = new Date().toISOString().slice(0, 10)
  return (props.inversionistas || []).filter(inv =>
    inv.cliente_id && inv.cliente_nombre && (!inv.fecha_fin || inv.fecha_fin >= hoy)
  )
})

const TIPOS = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'cgm', label: 'CGM' },
  { value: 'liquidacion', label: 'Liquidación' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'monitoreo', label: 'Monitoreo' },
]

const overrides = ref({})
const editando = ref(null)
const clienteSeleccionado = ref(null)

async function cargar() {
  if (!props.proyectoId) return
  const { data } = await api.get(`/proyectos/${props.proyectoId}/area-contactos`)
  overrides.value = Object.fromEntries(data.map(a => [a.tipo, a]))
}

async function guardarOverride(tipo) {
  if (!clienteSeleccionado.value) return
  try {
    const { data } = await api.put(`/proyectos/${props.proyectoId}/area-contactos/${tipo}`, {
      cliente_id: clienteSeleccionado.value,
    })
    overrides.value = { ...overrides.value, [tipo]: data }
    editando.value = null
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'No se pudo guardar', life: 4000 })
  }
}

async function quitarOverride(tipo) {
  try {
    await api.delete(`/proyectos/${props.proyectoId}/area-contactos/${tipo}`)
    const rest = { ...overrides.value }
    delete rest[tipo]
    overrides.value = rest
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo quitar el puntero', life: 4000 })
  }
}

watch(() => props.proyectoId, cargar, { immediate: true })
</script>
