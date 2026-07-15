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
        <label class="field-label">Teléfono</label>
        <InputText v-model="f.telefono_contacto" class="w-full" />
      </div>
      <div>
        <label class="field-label">Departamento</label>
        <Select v-model="f.departamento" :options="departamentos" class="w-full" placeholder="Seleccionar" showClear filter />
      </div>
      <div>
        <label class="field-label">Ciudad</label>
        <Select v-model="f.ciudad" :options="ciudadesDisponibles" class="w-full" placeholder="Seleccionar" showClear filter
          :disabled="!f.departamento" />
      </div>
      <div class="col-span-2">
        <label class="field-label">Dirección</label>
        <InputText v-model="f.direccion" class="w-full" />
      </div>
      <div>
        <label class="field-label">Origen del cliente</label>
        <Dropdown v-model="f.origen_tipo" :options="ORIGENES" optionLabel="label" optionValue="value"
                  showClear class="w-full" placeholder="—" />
      </div>
      <div>
        <label class="field-label">Quién lo recomendó/consiguió</label>
        <InputText v-model="f.origen_detalle" class="w-full" />
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

      <!-- ── Contactos y Servicios (solo al crear) ── -->
      <div v-if="esNuevo" class="col-span-2">
        <div class="border-t pt-4 mt-1">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold uppercase tracking-wide" style="color: #915BD8;">Contactos</p>
            <button type="button" @click="agregarContacto"
              class="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style="background:#915BD8;color:#fff;">
              <i class="pi pi-plus text-xs" /> Agregar
            </button>
          </div>
          <div class="rounded-xl p-4 space-y-3" style="background:#f9f7ff;border:1.5px solid #e8e0f0;">
            <div v-if="!f.contactos.length" class="text-xs italic py-1" style="color:#c4b3df;">
              Sin contactos agregados
            </div>

            <div v-for="(c, idx) in f.contactos" :key="idx" class="flex items-center gap-2">
              <InputText v-model="c.nombre" placeholder="Nombre" class="flex-1 min-w-0" size="small" />
              <InputText v-model="c.telefono" placeholder="Teléfono" class="flex-1 min-w-0" size="small" />
              <InputText v-model="c.email" type="email" placeholder="Correo *" class="flex-1 min-w-0" size="small" />
              <Select v-model="c.tipo" :options="TIPOS_CONTACTO" optionLabel="label" optionValue="value"
                class="w-40 shrink-0" size="small" />
              <button type="button" @click="eliminarContacto(idx)" class="p-1.5 rounded-lg hover:bg-red-50 shrink-0">
                <i class="pi pi-trash text-xs" style="color:#ef4444;" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="esNuevo" class="col-span-2">
        <div class="border-t pt-4 mt-1">
          <p class="text-xs font-semibold uppercase tracking-wide mb-3" style="color: #915BD8;">Servicios</p>
          <MultiSelect v-model="serviciosSeleccionados" :options="TIPOS_SERVICIO" optionLabel="label" optionValue="value"
            class="w-full" placeholder="Seleccionar servicios (opcional)" display="chip" />
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" label="Cancelar" severity="secondary" @click="$emit('cancel')" />
      <Button type="submit" label="Guardar" />
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import divipola from '@/data/colombia-divipola.json'

const ORIGENES = [
  { label: 'Prospección propia', value: 'prospeccion_propia' },
  { label: 'Recomendación', value: 'recomendacion' },
  { label: 'Referido', value: 'referido' },
  { label: 'Otro', value: 'otro' },
]

const props = defineProps({ initial: Object })
const emit = defineEmits(['save', 'cancel'])

// Contactos y servicios solo se pueden cargar al CREAR -- al editar, se
// gestionan desde sus propias pestañas en la ficha del cliente (evita mandar
// de vuelta objetos ya existentes con forma distinta a la de creación).
const esNuevo = computed(() => !props.initial?.id)

const TIPOS_CONTACTO = [
  { label: 'Comercial', value: 'comercial' },
  { label: 'Operacional', value: 'operacional' },
  { label: 'CGM', value: 'cgm' },
  { label: 'Liquidación', value: 'liquidacion' },
  { label: 'Contable', value: 'contable' },
]
const TIPOS_SERVICIO = [
  { label: 'Operación', value: 'operacion' },
  { label: 'Representación', value: 'representacion' },
  { label: 'CGM', value: 'cgm' },
  { label: 'Promotor', value: 'promotor' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function emailValido(e) { return !e || EMAIL_RE.test(e.trim()) }

const f = reactive({ origen_tipo: null, origen_detalle: '', ...props.initial, contactos: [] })
const serviciosSeleccionados = ref([])

// Departamento/ciudad -- select en vez de texto libre (DIVIPOLA), mismo
// patrón que ProyectoForm, para evitar variantes de escritura.
const departamentos = Object.keys(divipola).sort()
const ciudadesDisponibles = computed(() => f.departamento ? (divipola[f.departamento] || []) : [])
watch(() => f.departamento, (nuevo, anterior) => {
  if (nuevo !== anterior && f.ciudad && !(divipola[nuevo] || []).includes(f.ciudad)) {
    f.ciudad = null
  }
})
watch(() => props.initial, (v) => { Object.assign(f, v) }, { deep: true })

function agregarContacto()   { f.contactos = [...f.contactos, { nombre: '', telefono: '', email: '', tipo: 'comercial' }] }
function eliminarContacto(idx) { f.contactos = f.contactos.filter((_, i) => i !== idx) }

function submit() {
  const payload = {}
  for (const [k, v] of Object.entries(f)) {
    if (k === 'contactos' || k === 'servicios') continue
    if (v !== null && v !== undefined && v !== '') payload[k] = v
  }
  if (esNuevo.value) {
    payload.contactos = (f.contactos || []).filter(c => c.email && emailValido(c.email))
    payload.servicios = serviciosSeleccionados.value.map(tipo => ({ tipo }))
  }
  emit('save', payload)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
