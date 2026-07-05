<template>
  <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-end border" style="border-color:#ECE7F2">
    <div v-for="f in fields" :key="f.key" :class="f.class">
      <label v-if="f.label" class="block text-xs font-medium text-gray-600 mb-1">{{ f.label }}</label>

      <!-- Texto / búsqueda -->
      <IconField v-if="f.type === 'text'">
        <InputIcon v-if="f.icon !== false" :class="f.icon || 'pi pi-search'" />
        <InputText
          :modelValue="model[f.key]"
          :placeholder="f.placeholder"
          :class="f.width || 'w-56'"
          @update:modelValue="onInput(f, $event)"
        />
      </IconField>

      <!-- Select -->
      <Select
        v-else-if="f.type === 'select'"
        :modelValue="model[f.key]"
        :options="f.options"
        :optionLabel="f.optionLabel"
        :optionValue="f.optionValue"
        :placeholder="f.placeholder || 'Todos'"
        :class="f.width || 'w-44'"
        :showClear="f.showClear !== false"
        @update:modelValue="onChange(f, $event)"
      />

      <!-- Fecha -->
      <DatePicker
        v-else-if="f.type === 'date'"
        :modelValue="model[f.key]"
        :placeholder="f.placeholder"
        dateFormat="yy-mm-dd"
        showIcon
        showButtonBar
        :class="f.width || 'w-44'"
        @update:modelValue="onChange(f, $event)"
      />
    </div>

    <slot name="extra" />
  </div>
</template>

<script setup>
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const props = defineProps({
  /**
   * Definición de filtros:
   * { key, type: 'text'|'select'|'date', label?, placeholder?, options?, optionLabel?,
   *   optionValue?, width?(clase css), icon?, showClear?, debounce?(ms) }
   */
  fields: { type: Array, default: () => [] },
  /** Objeto reactivo de filtros (v-model). */
  modelValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'change'])
const model = props.modelValue

function emitChange(key, value) {
  model[key] = value
  emit('update:modelValue', model)
  emit('change', { key, value, filters: model })
}

let debounceTimers = {}
function onInput(f, value) {
  const debounce = f.debounce ?? 350
  clearTimeout(debounceTimers[f.key])
  model[f.key] = value // refleja de inmediato en el input
  debounceTimers[f.key] = setTimeout(() => emitChange(f.key, value), debounce)
}

function onChange(f, value) {
  emitChange(f.key, value)
}
</script>
