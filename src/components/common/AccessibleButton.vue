<template>
  <!--
    Envoltorio accesible sobre PrimeVue Button.
    - Exige un nombre accesible: label visible O `ariaLabel` (obligatorio para
      botones de solo ícono).
    - Refuerza aria-label, aria-pressed (toggles) y aria-busy (cargando).
    - Advierte en desarrollo si un botón de solo ícono no tiene nombre.
  -->
  <Button
    :label="label"
    :icon="icon"
    :severity="severity"
    :disabled="disabled || loading"
    :aria-label="resolvedAriaLabel"
    :aria-pressed="pressed === null ? undefined : String(pressed)"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="disabled || loading ? 'true' : undefined"
    :class="{ 'a11y-touch-target': iconOnly }"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <slot />
    <span v-if="loading" class="sr-only">Cargando…</span>
  </Button>
</template>

<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  label: { type: String, default: undefined },
  icon: { type: String, default: undefined },
  severity: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** Nombre accesible; obligatorio si no hay label ni texto visible. */
  ariaLabel: { type: String, default: '' },
  /** Estado de toggle: true/false lo expone como aria-pressed; null lo omite. */
  pressed: { type: [Boolean, null], default: null },
})

defineEmits(['click'])

const iconOnly = computed(() => !!props.icon && !props.label)

const resolvedAriaLabel = computed(() => props.ariaLabel || props.label || undefined)

if (import.meta.env.DEV) {
  if (iconOnly.value && !props.ariaLabel) {
    // eslint-disable-next-line no-console
    console.warn('[a11y] AccessibleButton de solo ícono sin `ariaLabel`: el botón no tendrá nombre accesible.')
  }
}
</script>
