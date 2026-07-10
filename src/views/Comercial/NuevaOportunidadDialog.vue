<template>
  <Dialog :visible="visible" modal header="Nueva oportunidad" :style="{ width: '560px' }"
          @update:visible="$emit('update:visible', $event)">
    <div class="flex flex-col gap-4">
      <SelectButton v-model="modo" :options="MODOS" optionLabel="label" optionValue="value" />

      <template v-if="modo === 'existente'">
        <div>
          <label class="block text-sm font-medium mb-1">Cliente *</label>
          <AutoComplete v-model="clienteSel" :suggestions="clientesFiltrados" optionLabel="razon_social_nombre"
                        dropdown class="w-full" @complete="buscarCliente" placeholder="Buscar cliente…" />
        </div>
      </template>

      <template v-else>
        <div>
          <label class="block text-sm font-medium mb-1">Nombre del cliente *</label>
          <InputText v-model="nuevo.razon_social_nombre" class="w-full" placeholder="Razón social" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">NIT / Cédula</label>
          <InputText v-model="nuevo.nit_cedula" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Origen del cliente</label>
            <Dropdown v-model="nuevo.origen_tipo" :options="ORIGENES" optionLabel="label" optionValue="value"
                      showClear class="w-full" placeholder="—" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Quién lo recomendó/consiguió</label>
            <InputText v-model="nuevo.origen_detalle" class="w-full" />
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm font-medium">Contactos * (mínimo 1 con correo)</label>
            <Button label="Agregar" icon="pi pi-plus" text size="small" @click="nuevo.contactos.push({ nombre: '', telefono: '', email: '' })" />
          </div>
          <div v-for="(c, i) in nuevo.contactos" :key="i" class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
            <InputText v-model="c.nombre" placeholder="Nombre" />
            <InputText v-model="c.telefono" placeholder="Teléfono" />
            <InputText v-model="c.email" placeholder="Correo *" />
            <Button icon="pi pi-trash" text severity="danger" :disabled="nuevo.contactos.length === 1"
                    @click="nuevo.contactos.splice(i, 1)" />
          </div>
        </div>
      </template>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">Nombre del negocio (opcional)</label>
          <InputText v-model="form.nombre" class="w-full" placeholder="Ej: Comunidad energética 2027" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Tipo de servicio</label>
          <Dropdown v-model="form.tipo_servicio" :options="TIPOS_SERVICIO" optionLabel="label" optionValue="value"
                    showClear class="w-full" placeholder="—" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Notas</label>
        <Textarea v-model="form.notas" rows="2" class="w-full" autoResize />
      </div>
    </div>

    <template #footer>
      <Button label="Cancelar" text @click="$emit('update:visible', false)" />
      <Button label="Crear en Prospección" icon="pi pi-check" :loading="guardando"
              :disabled="!puedeGuardar" @click="guardar" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import AutoComplete from 'primevue/autocomplete'
import SelectButton from 'primevue/selectbutton'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible', 'creada'])
const toast = useToast()

const MODOS = [
  { label: 'Cliente existente', value: 'existente' },
  { label: 'Cliente nuevo', value: 'nuevo' },
]
const TIPOS_SERVICIO = [
  { label: 'Representación', value: 'representacion' },
  { label: 'Comunidad energética', value: 'comunidad_energetica' },
]
const ORIGENES = [
  { label: 'Prospección propia', value: 'prospeccion_propia' },
  { label: 'Recomendación', value: 'recomendacion' },
  { label: 'Referido', value: 'referido' },
  { label: 'Otro', value: 'otro' },
]

const modo = ref('existente')
const guardando = ref(false)
const todosClientes = ref([])
const clientesFiltrados = ref([])
const clienteSel = ref(null)
const form = reactive({ nombre: '', tipo_servicio: null, notas: '' })
const nuevo = reactive({
  razon_social_nombre: '', nit_cedula: '', origen_tipo: null, origen_detalle: '',
  contactos: [{ nombre: '', telefono: '', email: '' }],
})

watch(() => props.visible, async (v) => {
  if (v && !todosClientes.value.length) {
    const { data } = await api.get('/clientes', { params: { size: 500 } })
    todosClientes.value = data.items ?? data
  }
  if (!v) resetEstado()
})

function resetEstado() {
  modo.value = 'existente'
  clienteSel.value = null
  form.nombre = ''
  form.tipo_servicio = null
  form.notas = ''
  nuevo.razon_social_nombre = ''
  nuevo.nit_cedula = ''
  nuevo.origen_tipo = null
  nuevo.origen_detalle = ''
  nuevo.contactos = [{ nombre: '', telefono: '', email: '' }]
}

function buscarCliente(e) {
  const q = (e.query ?? '').toLowerCase()
  clientesFiltrados.value = todosClientes.value.filter(c => c.razon_social_nombre?.toLowerCase().includes(q))
}

const puedeGuardar = computed(() => {
  if (modo.value === 'existente') return !!clienteSel.value?.id
  return nuevo.razon_social_nombre.trim().length > 0 && nuevo.contactos.some(c => c.email.trim().includes('@'))
})

async function guardar() {
  guardando.value = true
  try {
    const payload = { nombre: form.nombre.trim() || null, tipo_servicio: form.tipo_servicio, notas: form.notas || null }
    if (modo.value === 'existente') {
      payload.cliente_id = clienteSel.value.id
    } else {
      payload.cliente_nuevo = {
        razon_social_nombre: nuevo.razon_social_nombre.trim(),
        nit_cedula: nuevo.nit_cedula.trim() || null,
        origen_tipo: nuevo.origen_tipo,
        origen_detalle: nuevo.origen_detalle.trim() || null,
        contactos: nuevo.contactos
          .filter(c => c.email.trim().includes('@'))
          .map(c => ({ nombre: c.nombre.trim(), telefono: c.telefono.trim(), email: c.email.trim().toLowerCase() })),
      }
    }
    const { data } = await api.post('/comercial/oportunidades', payload)
    emit('creada', data)
    emit('update:visible', false)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.detail ?? 'No se pudo crear', life: 5000 })
  } finally {
    guardando.value = false
  }
}
</script>
