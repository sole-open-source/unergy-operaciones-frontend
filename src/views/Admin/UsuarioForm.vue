<template>
  <form @submit.prevent="submit" class="space-y-4 pt-2">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="field-label">Nombre completo *</label>
        <InputText v-model="f.nombre" class="w-full" required />
      </div>
      <div class="col-span-2">
        <label class="field-label">Correo electrónico *</label>
        <InputText v-model="f.email" type="email" class="w-full" required :disabled="!!props.initial?.id" />
      </div>
      <div>
        <label class="field-label">Rol *</label>
        <Select v-model="f.rol" :options="ROLES" optionLabel="label" optionValue="value" class="w-full" placeholder="Seleccionar" required />
      </div>
      <div>
        <label class="field-label">Estado</label>
        <div class="flex items-center gap-2 mt-2">
          <ToggleSwitch v-model="f.activo" />
          <span class="text-sm" :style="{ color: f.activo ? '#2e7d32' : '#D64455' }">
            {{ f.activo ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
      </div>
      <div class="col-span-2">
        <label class="field-label">{{ props.initial?.id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *' }}</label>
        <Password v-model="f.password" class="w-full" :feedback="false" toggleMask :required="!props.initial?.id" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" label="Cancelar" severity="secondary" @click="$emit('cancel')" />
      <Button type="submit" label="Guardar" :loading="saving" />
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Password from 'primevue/password'
import ToggleSwitch from 'primevue/toggleswitch'

const props = defineProps({ initial: Object })
const emit = defineEmits(['save', 'cancel'])

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Operaciones', value: 'operaciones' },
  { label: 'Monitoreo', value: 'monitoreo' },
  { label: 'Liquidaciones', value: 'liquidaciones' },
  { label: 'CGM', value: 'cgm' },
  { label: 'Solo lectura', value: 'solo_lectura' },
  { label: 'Coordinador', value: 'coordinador' },
  { label: 'Técnico', value: 'tecnico' },
]

const saving = ref(false)
const f = reactive({ nombre: '', email: '', rol: 'operaciones', activo: true, password: '', ...props.initial })
watch(() => props.initial, (v) => Object.assign(f, { nombre: '', email: '', rol: 'operaciones', activo: true, password: '', ...v }), { deep: true })

function submit() {
  const payload = { nombre: f.nombre, email: f.email, rol: f.rol, activo: f.activo }
  if (f.password) payload.password = f.password
  emit('save', payload)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
