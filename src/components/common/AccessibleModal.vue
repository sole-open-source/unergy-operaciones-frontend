<template>
  <!--
    Envoltorio accesible sobre PrimeVue Dialog.
    - role="dialog" + aria-modal + aria-labelledby (título) y aria-describedby.
    - Atrapa el foco y lo restaura al cerrar (PrimeVue lo hace, reforzamos).
    - Anuncia apertura/cierre a lectores de pantalla.
    Reenvía props y slots relevantes; el uso es igual al de <Dialog>.
  -->
  <Dialog
    :visible="visible"
    modal
    :closable="closable"
    :dismissableMask="dismissableMask"
    :style="dialogStyle"
    :pt="passthrough"
    :aria-labelledby="titleId"
    :aria-describedby="$slots.description ? descId : undefined"
    :closeButtonProps="{ 'aria-label': 'Cerrar diálogo' }"
    @update:visible="onVisible"
    @show="onShow"
    @hide="onHide"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <h2 :id="titleId" class="text-base font-bold m-0" style="color: #2C2039;">
          <slot name="header">{{ header }}</slot>
        </h2>
      </div>
    </template>

    <p v-if="$slots.description" :id="descId" class="sr-only">
      <slot name="description" />
    </p>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import { announce } from '@/composables/useA11yFocus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  header: { type: String, default: '' },
  closable: { type: Boolean, default: true },
  dismissableMask: { type: Boolean, default: false },
  dialogStyle: { type: Object, default: () => ({ width: '520px' }) },
  /** Texto anunciado al abrir; por defecto usa el header. */
  announceOnOpen: { type: String, default: '' },
})

const emit = defineEmits(['update:visible', 'show', 'hide'])

// IDs estables por instancia para asociar título/descripción.
const uid = Math.random().toString(36).slice(2, 9)
const titleId = `a11y-modal-title-${uid}`
const descId = `a11y-modal-desc-${uid}`

// Refuerza role/aria en el nodo raíz del diálogo de PrimeVue.
const passthrough = {
  root: { role: 'dialog', 'aria-modal': 'true' },
}

const dialogStyle = computed(() => props.dialogStyle)

function onVisible(v) {
  emit('update:visible', v)
}

function onShow() {
  announce(props.announceOnOpen || (props.header ? `Diálogo abierto: ${props.header}` : 'Diálogo abierto'))
  emit('show')
}

function onHide() {
  announce('Diálogo cerrado')
  emit('hide')
}
</script>
