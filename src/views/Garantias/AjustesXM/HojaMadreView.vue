<template>
  <div v-if="data" class="space-y-4">
    <!-- Encabezado opcional -->
    <div v-if="data.fechaNombre || data.variacionPb != null" class="flex flex-wrap items-center gap-2">
      <span v-if="data.fechaNombre" class="text-xs font-semibold" style="color:#6b5a8a">{{ data.fechaNombre }}</span>
      <span v-if="data.variacionPb != null"
        class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        :style="data.variacionPb >= 0 ? 'background:#fde8ea;color:#D64455' : 'background:#d1fae5;color:#065f46'">
        PB {{ data.variacionPb > 0 ? '+' : '' }}{{ data.variacionPb }}% vs sem. anterior
      </span>
    </div>

    <!-- Chips de precios -->
    <div v-if="preciosList.length" class="flex flex-wrap gap-2">
      <span v-for="p in preciosList" :key="p.key"
        class="px-3 py-1 rounded-full text-xs font-semibold" style="background:#f3f0f7; color:#915BD8">
        {{ p.key.toUpperCase() }}: {{ p.key === 'trm' ? fmtCOP(p.val) : Number(p.val).toFixed(2) }}
      </span>
    </div>

    <!-- Bloques UNGC / UNGG -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BloqueCodigo titulo="UNGC" :rows="data.ungc || []" :total="data.totalUNGC" />
      <BloqueCodigo titulo="UNGG" :rows="data.ungg || []" :total="data.totalUNGG" />
    </div>

    <!-- Total combinado -->
    <div class="rounded-xl px-4 py-2 flex justify-between items-center" style="background:#7030A0;color:white">
      <span class="text-xs font-bold tracking-wide uppercase">UNGG y UNGC — Total a pagar</span>
      <span class="text-sm font-bold">{{ fmtCOP(data.totalConsignar) }}</span>
    </div>

    <!-- Panel custodia (desglose auditable) -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
        <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Disponible (crudo)</p>
        <p class="text-base font-bold" style="color:#2C2039">{{ fmtCOP(data.disponibleCrudo) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
        <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">(−) Facturas descontadas</p>
        <p class="text-base font-bold" style="color:#D64455">{{ fmtCOP(data.facturasDescontadas) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
        <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Disponible neto</p>
        <p class="text-base font-bold" :style="(data.disponibleNeto ?? 0) < 0 ? 'color:#D64455' : 'color:#10B981'">{{ fmtCOP(data.disponibleNeto) }}</p>
      </div>
      <div class="rounded-xl p-4 shadow-sm text-center" style="border:1px solid #a7e8c4; background:#ECFDF3">
        <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#047857">Disponible (Aplic. garantía)</p>
        <p class="text-base font-bold" style="color:#047857">{{ fmtCOP(data.disponibleAplicacion) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
        <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Congelado</p>
        <p class="text-base font-bold" style="color:#2C2039">{{ fmtCOP(data.congelado) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
        <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Saldo</p>
        <p class="text-base font-bold" style="color:#915BD8">{{ fmtCOP(data.saldo) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BloqueCodigo from './BloqueCodigo.vue'
import { fmtCOP } from './utils/formatters.js'

const props = defineProps({ data: { type: Object, default: null } })

const preciosList = computed(() => {
  const p = props.data?.precios
  if (!p) return []
  return Object.entries(p)
    .filter(([, v]) => v != null)
    .map(([key, val]) => ({ key, val }))
})
</script>
