<template>
  <form class="space-y-4 pt-2" @submit.prevent="onSubmit">
    <slot name="header" />

    <div class="grid grid-cols-2 gap-4">
      <div v-for="field in fields" :key="field.key" :class="colClass(field)">
        <label v-if="field.label" class="field-label">
          {{ field.label }}<span v-if="field.required" class="text-red-500"> *</span>
        </label>

        <InputText
          v-if="!field.type || field.type === 'text' || field.type === 'email'"
          :modelValue="model[field.key]"
          :type="field.type === 'email' ? 'email' : 'text'"
          :placeholder="field.placeholder"
          :invalid="!!errors[field.key]"
          class="w-full"
          @update:modelValue="update(field.key, $event)"
        />

        <InputNumber
          v-else-if="field.type === 'number'"
          :modelValue="model[field.key]"
          :maxFractionDigits="field.maxFractionDigits ?? 2"
          :min="field.min"
          :max="field.max"
          :suffix="field.suffix"
          :invalid="!!errors[field.key]"
          class="w-full"
          @update:modelValue="update(field.key, $event)"
        />

        <Select
          v-else-if="field.type === 'select'"
          :modelValue="model[field.key]"
          :options="field.options"
          :optionLabel="field.optionLabel"
          :optionValue="field.optionValue"
          :placeholder="field.placeholder || 'Seleccionar'"
          :showClear="field.showClear !== false"
          :filter="field.filter"
          :invalid="!!errors[field.key]"
          class="w-full"
          @update:modelValue="update(field.key, $event)"
        />

        <Textarea
          v-else-if="field.type === 'textarea'"
          :modelValue="model[field.key]"
          :rows="field.rows || 3"
          :placeholder="field.placeholder"
          :invalid="!!errors[field.key]"
          class="w-full"
          @update:modelValue="update(field.key, $event)"
        />

        <small v-if="errors[field.key]" class="text-red-500 text-xs mt-1 block">{{ errors[field.key] }}</small>
      </div>
    </div>

    <slot name="extra" />

    <div v-if="!inline" class="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
      <Button type="button" :label="cancelLabel" severity="secondary" @click="$emit('cancel')" />
      <Button type="submit" :label="submitLabel" :loading="loading" />
    </div>
    <slot v-else name="footer" />
  </form>
</template>

<script setup>
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const props = defineProps({
  /**
   * Definición de campos:
   * { key, label, type: 'text'|'email'|'number'|'select'|'textarea',
   *   placeholder?, options?, optionLabel?, optionValue?, colSpan?(1|2), required?, ... }
   */
  fields: { type: Array, default: () => [] },
  /** Objeto de datos del formulario (v-model). */
  modelValue: { type: Object, default: () => ({}) },
  /** Mapa de errores por campo (p. ej. de useFormValidation). */
  errors: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Guardar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  /** true → oculta el footer (para uso embebido/inline). */
  inline: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit', 'cancel'])
const model = props.modelValue

function colClass(field) {
  return field.colSpan === 1 ? '' : 'col-span-2'
}

function update(key, value) {
  model[key] = value
  emit('update:modelValue', model)
}

function onSubmit() {
  emit('submit', model)
}
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }
</style>
