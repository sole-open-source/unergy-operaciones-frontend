<template>
  <div class="space-y-4">
    <!-- Header row with tab nav and settings button -->
    <div class="flex items-center justify-between">
      <div class="flex gap-0 border-b flex-1" style="border-color: rgba(44,32,57,0.10);">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          :style="activeTab === tab.key
            ? 'color:#915BD8; border-bottom:2px solid #915BD8; margin-bottom:-1px'
            : 'color:#6b5a8a'"
        >
          {{ tab.label }}
        </button>
      </div>
      <button
        @click="showAjustes = true"
        class="ml-3 p-2 rounded-lg transition-colors hover:bg-gray-100"
        title="Configuración"
        style="color:#6b5a8a"
      >
        <i class="pi pi-cog text-base" />
      </button>
    </div>

    <SemanalesTab v-if="activeTab === 'semanales'" />
    <TxrTab v-else-if="activeTab === 'txr'" />
    <MensualesTab v-else-if="activeTab === 'mensuales'" />
    <TxfTab v-else-if="activeTab === 'txf'" />
    <HistoricoTab v-else-if="activeTab === 'historico'" />

    <AjustesDialog :visible="showAjustes" @close="showAjustes = false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SemanalesTab from './tabs/SemanalesTab.vue'
import TxrTab from './tabs/TxrTab.vue'
import MensualesTab from './tabs/MensualesTab.vue'
import TxfTab from './tabs/TxfTab.vue'
import HistoricoTab from './tabs/HistoricoTab.vue'
import AjustesDialog from './AjustesDialog.vue'

const tabs = [
  { key: 'semanales',  label: 'Semanales' },
  { key: 'txr',        label: 'TXR' },
  { key: 'mensuales',  label: 'Mensuales' },
  { key: 'txf',        label: 'TXF' },
  { key: 'historico',  label: 'Histórico' },
]

const activeTab = ref('semanales')
const showAjustes = ref(false)
</script>
