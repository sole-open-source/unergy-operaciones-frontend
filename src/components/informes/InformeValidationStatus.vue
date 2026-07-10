<!--
  InformeValidationStatus.vue
  Muestra el resultado de validar los datos operativos de un informe.

  Props:
    - status:   'valid' | 'invalid' | 'warning' | null
    - messages: Array<string | { text: string, severity?: 'error'|'warn'|'info'|'success', field?: string }>

  Diseñado para consumir directamente la respuesta de
  `validateInforme(id, datosOperativos)` de @/api/client, que devuelve
  { status, messages }.
-->
<template>
  <div v-if="status" class="ivs-wrapper">
    <!-- Resumen -->
    <Message :severity="summarySeverity" :closable="false" class="ivs-summary">
      {{ summaryText }}
    </Message>

    <!-- Detalle de mensajes -->
    <div v-if="normalizedMessages.length" class="ivs-list">
      <Message
        v-for="(m, i) in normalizedMessages"
        :key="i"
        :severity="m.severity"
        :closable="false"
        class="ivs-item"
      >
        <span v-if="m.field" class="ivs-field">{{ m.field }}:</span>
        {{ m.text }}
      </Message>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Message from 'primevue/message'

const props = defineProps({
  status: {
    type: String,
    default: null,
    validator: (v) => v === null || ['valid', 'invalid', 'warning'].includes(v),
  },
  messages: {
    type: Array,
    default: () => [],
  },
})

const summarySeverity = computed(() =>
  ({ valid: 'success', warning: 'warn', invalid: 'error' }[props.status] || 'info')
)

const summaryText = computed(
  () =>
    ({
      valid: '✅ Datos operativos válidos',
      warning: '⚠️ Validación con advertencias',
      invalid: '⛔ Datos operativos con errores',
    }[props.status] || 'Sin validar')
)

// Acepta strings simples u objetos { text, severity, field }.
const normalizedMessages = computed(() =>
  (props.messages || [])
    .filter((m) => m != null)
    .map((m) => {
      if (typeof m === 'string') {
        return { text: m, severity: props.status === 'invalid' ? 'error' : 'warn' }
      }
      return {
        text: m.text ?? m.message ?? String(m),
        severity: m.severity || (m.level === 'error' ? 'error' : m.level) || 'warn',
        field: m.field || m.campo || null,
      }
    })
)
</script>

<style scoped>
.ivs-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.ivs-summary :deep(.p-message-text) {
  font-weight: 700;
}
.ivs-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ivs-field {
  font-weight: 700;
  margin-right: 4px;
}
</style>
