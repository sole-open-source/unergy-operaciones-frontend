<template>
  <form @submit.prevent="submit" class="space-y-4 pt-2">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="field-label">Razón social / Nombre *</label>
        <InputText v-model="f.razon_social_nombre" class="w-full" required />
      </div>
      <div>
        <label class="field-label">NIT / Cédula</label>
        <InputText v-model="f.nit_cedula" class="w-full" />
      </div>
      <div>
        <label class="field-label">Tipo de persona</label>
        <Select v-model="f.tipo_persona" :options="['natural', 'juridica']" class="w-full" placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label class="field-label">Representante legal</label>
        <InputText v-model="f.representante_legal" class="w-full" />
      </div>
      <div>
        <label class="field-label">Correo</label>
        <InputText v-model="f.correo_electronico" type="email" class="w-full" />
      </div>
      <div>
        <label class="field-label">Teléfono</label>
        <InputText v-model="f.telefono_contacto" class="w-full" />
      </div>
      <div>
        <label class="field-label">Ciudad</label>
        <InputText v-model="f.ciudad" class="w-full" />
      </div>
      <div>
        <label class="field-label">Departamento</label>
        <InputText v-model="f.departamento" class="w-full" />
      </div>
      <div class="col-span-2">
        <label class="field-label">Dirección</label>
        <InputText v-model="f.direccion" class="w-full" />
      </div>

      <!-- Clasificación Unergy -->
      <div>
        <label class="field-label">Tipo de cliente Unergy</label>
        <Select v-model="f.tipo_cliente_unergy" :options="TIPOS_CLIENTE_UNERGY" class="w-full"
          placeholder="Seleccionar" showClear />
      </div>
      <div>
        <label class="field-label">
          Proyectos vinculados
          <span v-if="requiereProyectos" style="color: #dc2626;">*</span>
        </label>
        <MultiSelect v-model="f.proyectos_vinculados" :options="availableProjects"
          optionLabel="nombre_comercial" optionValue="id" display="chip" filter
          :loading="loadingProjects" class="w-full" placeholder="Seleccionar proyectos" showClear />
      </div>
      <div v-if="error" class="col-span-2">
        <small style="color: #dc2626;">{{ error }}</small>
      </div>

      <!-- Información bancaria -->
      <div class="col-span-2">
        <div class="border-t pt-4 mt-1">
          <p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color: #915BD8;">Información bancaria</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="field-label">Banco</label>
              <InputText v-model="f.banco" class="w-full" placeholder="Ej: Bancolombia" />
            </div>
            <div>
              <label class="field-label">Tipo de cuenta</label>
              <Select v-model="f.tipo_cuenta" :options="['ahorros', 'corriente']" class="w-full" placeholder="Seleccionar" showClear />
            </div>
            <div>
              <label class="field-label">Número de cuenta</label>
              <InputText v-model="f.numero_cuenta" class="w-full" />
            </div>
            <div>
              <label class="field-label">Titular de la cuenta</label>
              <InputText v-model="f.titular_cuenta" class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label class="field-label">IVA %</label>
        <InputNumber v-model="f.iva_pct" :maxFractionDigits="2" locale="en-US" class="w-full" />
      </div>
      <div>
        <label class="field-label">Retención %</label>
        <InputNumber v-model="f.retencion_pct" :maxFractionDigits="2" locale="en-US" class="w-full" />
      </div>
      <div>
        <label class="field-label">ReteICA %</label>
        <InputNumber v-model="f.reteica_pct" :maxFractionDigits="4" locale="en-US" class="w-full" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" label="Cancelar" severity="secondary" @click="$emit('cancel')" />
      <Button type="submit" label="Guardar" />
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const props = defineProps({ initial: Object })
const emit = defineEmits(['save', 'cancel'])
const toast = useToast()

// Tipos de cliente Unergy. Inversionista/Prosumidor exigen proyectos vinculados.
const TIPOS_CLIENTE_UNERGY = ['Inversionista', 'Prosumidor', 'Consumidor', 'Generador', 'Otro']
const TIPOS_REQUIEREN_PROYECTOS = ['Inversionista', 'Prosumidor']

const f = reactive({ ...props.initial })
normalize()
watch(() => props.initial, (v) => { Object.assign(f, v); normalize() }, { deep: true })

function normalize() {
  if (!Array.isArray(f.proyectos_vinculados)) f.proyectos_vinculados = []
}

const requiereProyectos = computed(() => TIPOS_REQUIEREN_PROYECTOS.includes(f.tipo_cliente_unergy))
const error = ref('')

// Limpiar el error de validación en cuanto el usuario corrija el tipo o los proyectos.
watch([() => f.tipo_cliente_unergy, () => f.proyectos_vinculados], () => {
  if (error.value && (!requiereProyectos.value || f.proyectos_vinculados.length > 0)) error.value = ''
}, { deep: true })

// Proyectos disponibles para vincular en el multi-select.
const availableProjects = ref([])
const loadingProjects = ref(false)

onMounted(async () => {
  loadingProjects.value = true
  try {
    const { data } = await api.get('/proyectos', { params: { page: 1, size: 500 } })
    availableProjects.value = data.items ?? data ?? []
  } catch {
    toast.add({
      severity: 'warn',
      summary: 'Proyectos no disponibles',
      detail: 'No se pudo cargar la lista de proyectos vinculables.',
      life: 4000,
    })
  } finally {
    loadingProjects.value = false
  }
})

function submit() {
  // Integridad: Inversionista/Prosumidor deben tener al menos un proyecto vinculado.
  if (requiereProyectos.value && f.proyectos_vinculados.length === 0) {
    error.value = 'Debes vincular al menos un proyecto para clientes de tipo Inversionista o Prosumidor.'
    return
  }
  error.value = ''

  const payload = {}
  for (const [k, v] of Object.entries(f)) {
    if (k === 'proyectos_vinculados') { payload[k] = v; continue }
    if (v !== null && v !== undefined && v !== '') payload[k] = v
  }
  emit('save', payload)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
