<template>
  <!--
    Campo de formulario accesible: label asociado por id, mensaje de error con
    aria-describedby + aria-invalid, y marca de obligatorio. Envuelve PrimeVue
    InputText (o el control que se pase por el slot `control`, recibiendo los
    atributos ARIA vía v-bind="a11yAttrs").
  -->
  <div class="flex flex-col gap-1">
    <label :for="inputId" class="field-label">
      {{ label }}<span v-if="required" class="field-required" aria-hidden="true"> *</span>
      <span v-if="required" class="sr-only"> (obligatorio)</span>
    </label>

    <slot name="control" :a11yAttrs="a11yAttrs" :inputId="inputId">
      <InputText
        :id="inputId"
        :modelValue="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full"
        v-bind="a11yAttrs"
        @update:modelValue="$emit('update:modelValue', $event)"
      />
    </slot>

    <p v-if="hint && !error" :id="hintId" class="text-xs text-gray-500">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="text-xs" style="color:#b3261e" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import InputText from 'primevue/inputtext'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  id: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const uid = Math.random().toString(36).slice(2, 9)
const inputId = computed(() => props.id || `a11y-input-${uid}`)
const errorId = computed(() => `${inputId.value}-error`)
const hintId = computed(() => `${inputId.value}-hint`)

// Atributos ARIA que enlazan el control con su error/ayuda y su estado.
const a11yAttrs = computed(() => {
  const describedBy = []
  if (props.error) describedBy.push(errorId.value)
  else if (props.hint) describedBy.push(hintId.value)
  return {
    'aria-invalid': props.error ? 'true' : undefined,
    'aria-required': props.required ? 'true' : undefined,
    'aria-describedby': describedBy.length ? describedBy.join(' ') : undefined,
  }
})
</script>
