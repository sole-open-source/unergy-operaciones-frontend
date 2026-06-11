<template>
  <div class="space-y-0">
    <!-- Sub-nav: Registros | Ajustes XM -->
    <div class="flex gap-0 border-b mb-5" style="border-color: rgba(44,32,57,0.12);">
      <button
        v-for="tab in subNavTabs"
        :key="tab.key"
        @click="activeSection = tab.key"
        class="px-5 py-2.5 text-sm font-medium transition-colors relative"
        :style="activeSection === tab.key
          ? 'color:#915BD8; border-bottom:2px solid #915BD8; margin-bottom:-1px'
          : 'color:#6b5a8a'"
      >
        {{ tab.label }}
      </button>
    </div>

    <GarantiasRegistrosView v-if="activeSection === 'registros'" />
    <AjustesXMView v-else-if="activeSection === 'ajustes'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GarantiasRegistrosView from './GarantiasRegistrosView.vue'
import AjustesXMView from './AjustesXM/AjustesXMView.vue'

const subNavTabs = [
  { key: 'registros', label: 'Registros' },
  { key: 'ajustes',   label: 'Ajustes XM' },
]

const activeSection = ref('registros')
</script>
