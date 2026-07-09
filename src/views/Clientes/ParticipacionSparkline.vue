<template>
  <svg v-if="coords.length >= 2" :width="W" :height="H" class="shrink-0" aria-hidden="true">
    <polyline :points="coords.map(c => `${c.x},${c.y}`).join(' ')"
      fill="none" stroke="#915BD8" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    <circle :cx="coords[coords.length - 1].x" :cy="coords[coords.length - 1].y" r="2.5" fill="#915BD8" />
  </svg>
  <span v-else class="text-xs" style="color:#bba8d4;">—</span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ puntos: { type: Array, default: () => [] } })
const W = 120, H = 28, PAD = 3

const coords = computed(() => {
  const pts = props.puntos.filter(p => p.porcentaje !== null && p.porcentaje !== undefined)
  if (pts.length < 2) return []
  const vals = pts.map(p => p.porcentaje)
  const min = Math.min(...vals), max = Math.max(...vals)
  const rango = max - min || 1
  return pts.map((p, i) => ({
    x: PAD + (i * (W - 2 * PAD)) / (pts.length - 1),
    y: H - PAD - ((p.porcentaje - min) / rango) * (H - 2 * PAD),
  }))
})
</script>
