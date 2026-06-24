<template>
  <!-- Popover de desglose del cálculo IPC. Mismo formato visual que Mantenimiento. -->
  <Popover ref="pop">
    <div class="text-xs" style="min-width:280px; color:#2C2039">
      <p class="font-semibold mb-2 flex items-center gap-1.5" style="color:#7c3aed">
        <i class="pi pi-chart-bar text-[11px]" /> Cálculo del Valor a Facturar
      </p>
      <div class="space-y-1 font-mono">
        <div class="flex justify-between gap-6">
          <span class="text-gray-500">Valor Base Anual</span>
          <span>{{ fmt(valorBaseAnual) }}</span>
        </div>
        <div class="flex justify-between gap-6">
          <span class="text-gray-500">÷ 12 meses</span>
          <span>{{ fmt(valorBaseAnual != null ? valorBaseAnual / 12 : null) }}</span>
        </div>
        <div class="flex justify-between gap-6">
          <span class="text-gray-500">Índice IPC aplicado</span>
          <span>× {{ factor != null ? factor.toFixed(5) : '—' }}</span>
        </div>
        <div class="flex justify-between gap-6">
          <span class="text-gray-500">IPC acumulado período</span>
          <span>{{ factor != null ? ((factor - 1) * 100).toFixed(3) : '—' }}%</span>
        </div>
      </div>
      <div class="border-t mt-2 pt-2">
        <div class="flex justify-between gap-6 font-semibold">
          <span>Valor a Facturar</span>
          <span style="color:#7c3aed">{{ fmt(valorAFacturar) }}</span>
        </div>
      </div>
    </div>
  </Popover>
</template>

<script setup>
import { ref } from 'vue'
import Popover from 'primevue/popover'

defineProps({
  valorBaseAnual: { type: Number, default: null },
  factor:         { type: Number, default: null },
  valorAFacturar: { type: Number, default: null },
})

const pop = ref(null)

function fmt(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

// Reexpone los métodos del Popover de PrimeVue al padre.
function show(ev) { pop.value?.show(ev) }
function hide()   { pop.value?.hide() }
defineExpose({ show, hide })
</script>
