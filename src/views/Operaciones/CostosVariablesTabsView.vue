<template>
  <div class="cvt-wrap">
    <div class="cvt-tabs">
      <button :class="['cvt-tab', tab === 'costos' && 'cvt-tab--on']" @click="tab = 'costos'">
        <i class="pi pi-receipt" /> Costos Variables
      </button>
      <button :class="['cvt-tab', tab === 'inicio' && 'cvt-tab--on']" @click="tab = 'inicio'">
        <i class="pi pi-flag" /> Inicio de Operación
      </button>
    </div>

    <div class="cvt-body">
      <CostosVariablesView v-show="tab === 'costos'" />
      <InicioOperacionView v-if="inicioCargado" v-show="tab === 'inicio'" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import CostosVariablesView from '@/views/Operaciones/CostosVariablesView.vue'
import InicioOperacionView from '@/views/Operaciones/InicioOperacionView.vue'

const tab = ref('costos')
// Monta Inicio de Operación solo cuando se entra a su pestaña la primera vez.
const inicioCargado = ref(false)
watch(tab, (t) => { if (t === 'inicio') inicioCargado.value = true }, { immediate: false })
</script>

<style scoped>
.cvt-wrap { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.cvt-tabs { display: flex; gap: 6px; border-bottom: 1px solid #eceaf2; padding: 0 2px; flex-shrink: 0; }
.cvt-tab {
  display: flex; align-items: center; gap: 7px; border: none; background: none;
  font-size: 14px; font-weight: 700; color: #9b8db5; padding: 12px 16px; cursor: pointer;
  border-bottom: 2.5px solid transparent; margin-bottom: -1px;
}
.cvt-tab .pi { font-size: 14px; }
.cvt-tab--on { color: #6E3FB8; border-bottom-color: #915BD8; }
.cvt-body { flex: 1; min-height: 0; padding-top: 14px; display: flex; flex-direction: column; }
.cvt-body > * { flex: 1; min-height: 0; }
</style>
