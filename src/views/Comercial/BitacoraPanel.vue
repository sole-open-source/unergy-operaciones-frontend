<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <h3 class="font-semibold mb-2">Registrar gestión</h3>
      <div class="flex flex-col gap-2 mb-4">
        <Dropdown v-model="nueva.tipo" :options="TIPOS" optionLabel="label" optionValue="value"
                  placeholder="Tipo *" class="w-56" />
        <Textarea v-model.trim="nueva.descripcion" rows="2" autoResize class="w-full"
                  placeholder="Qué se habló / acordó *" />
        <div class="flex items-center gap-2">
          <Button label="Registrar" icon="pi pi-send" size="small" :loading="guardando"
                  :disabled="!nueva.tipo || !nueva.descripcion" @click="registrar" />
          <small class="text-gray-500">Registrar una gestión reinicia el contador de alerta.</small>
        </div>
      </div>
      <h3 class="font-semibold mb-2">Gestiones</h3>
      <p v-if="!gestiones.length" class="text-sm text-gray-500">Sin gestiones registradas.</p>
      <ul class="flex flex-col gap-2">
        <li v-for="g in gestiones" :key="g.id" class="border rounded-md p-2 text-sm">
          <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Tag :value="labelTipo(g.tipo)" severity="info" />
            <span>{{ fmtFecha(g.fecha) }}</span>
          </div>
          {{ g.descripcion }}
        </li>
      </ul>
    </div>
    <div>
      <h3 class="font-semibold mb-2">Historial de estados</h3>
      <ul class="flex flex-col gap-1 text-sm">
        <li v-for="h in historial" :key="h.id" class="flex items-center gap-2">
          <i class="pi pi-arrow-right text-xs text-gray-400" />
          <span v-if="h.estado_anterior">{{ h.estado_anterior }} → <b>{{ h.estado_nuevo }}</b></span>
          <span v-else>Creada en <b>{{ h.estado_nuevo }}</b></span>
          <span class="text-xs text-gray-500">{{ fmtFecha(h.fecha) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({
  oportunidadId: { type: [Number, String], required: true },
  gestiones: { type: Array, default: () => [] },
  historial: { type: Array, default: () => [] },
})
const emit = defineEmits(['registrada'])
const toast = useToast()

const TIPOS = [
  { label: 'Llamada', value: 'llamada' },
  { label: 'Correo', value: 'correo' },
  { label: 'Reunión', value: 'reunion' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Nota', value: 'nota' },
]
const nueva = reactive({ tipo: null, descripcion: '' })
const guardando = ref(false)

function labelTipo(v) { return TIPOS.find(t => t.value === v)?.label ?? v }
function fmtFecha(v) { return v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '' }

async function registrar() {
  guardando.value = true
  try {
    await api.post(`/comercial/oportunidades/${props.oportunidadId}/gestiones`,
      { tipo: nueva.tipo, descripcion: nueva.descripcion })
    nueva.tipo = null; nueva.descripcion = ''
    emit('registrada')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar', detail: err.response?.data?.detail ?? '', life: 5000 })
  } finally {
    guardando.value = false
  }
}
</script>
