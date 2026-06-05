<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden h-full flex flex-col" style="border-color:#e8e0f0">
    <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Estado de Resultados</h3>
      <span class="ml-auto text-[10px] uppercase tracking-wide font-semibold" style="color:#bba8d4">Concepto · Soporte · Valor</span>
    </div>

    <div class="flex-1">
      <template v-for="g in grupos" :key="g.key">
        <!-- Encabezado de grupo -->
        <div class="flex items-center justify-between gap-3 px-4 py-1.5 border-t" style="border-color:#f0ebf6; background:#faf7ff">
          <span class="font-bold text-[11px] uppercase tracking-wide" style="color:#6E3FB8">{{ g.label }}</span>
          <span class="font-bold font-mono tabular-nums whitespace-nowrap" :style="{ color: g.sign < 0 ? '#D64455' : '#2C2039' }">
            {{ g.sign < 0 ? '−' : '' }}{{ fmtCOP(Math.abs(g.total)) }}
          </span>
        </div>
        <!-- Líneas del grupo -->
        <div v-for="(l, i) in g.lineas" :key="g.key + '_' + i"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 border-t" style="border-color:#f7f3fc">
          <span class="flex-1 min-w-[120px] pl-3 text-xs" style="color:#5b5470">{{ l.label }}</span>
          <a v-if="l.soporte_url" :href="l.soporte_url" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
            style="background:#F1EAF9; color:#6E3FB8" :title="l.referencia || 'Ver soporte'">
            <i class="pi pi-paperclip text-[10px]" />{{ l.refCodigo || 'Soporte' }}
          </a>
          <span v-else-if="l.refCodigo" class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
            style="background:#f5f1fa; color:#9b8fb0" :title="l.referencia">
            <i class="pi pi-hashtag text-[10px]" />{{ l.refCodigo }}
          </span>
          <span v-else-if="l.requiereSoporte" class="text-[10px] italic" style="color:#cdbfe2" title="Sin soporte adjunto">— sin soporte</span>
          <span class="text-xs font-mono tabular-nums whitespace-nowrap" style="color:#6b5a8a">{{ fmtCOP(l.valor) }}</span>
        </div>
      </template>
    </div>

    <!-- INGRESO NETO -->
    <div class="flex items-center justify-between gap-3 px-4 py-2.5 border-t-2" style="border-color:#915BD8; background:rgba(145,91,216,0.07)">
      <span class="font-extrabold" style="color:#2C2039">INGRESO NETO (Valor a pagar)</span>
      <span class="font-extrabold font-mono tabular-nums text-base whitespace-nowrap" style="color:#915BD8">{{ fmtCOP(neto) }}</span>
    </div>

    <p class="px-4 py-2 text-[10px] italic border-t" style="color:#9b8fb0; border-color:#f0ebf6">
      Neto = valor a pagar (mandato de ingresos) − mandato de costos − facturas de servicio (CGM, Representación, Administración).
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtCOP, construirEstadoResultados, indiceSoportesProyecto } from '@/utils/liquidaciones'

const props = defineProps({ liq: { type: Object, required: true } })

// Mandatos del "Total" (sin inversionista) para el nivel proyecto; si no hay,
// caer a los mandatos por inversionista.
function pickMandatos(tipo) {
  const m = props.liq?.mandatos || []
  const total = m.filter(x => x.tipo === tipo && x.inversionista_id == null && !x.inversionista)
  if (total.length) return total
  return m.filter(x => x.tipo === tipo && (x.inversionista || x.inversionista_id != null))
}

const er = computed(() => construirEstadoResultados({
  ingresosMandatos: pickMandatos('ingresos'),
  costosMandatos: pickMandatos('costos'),
  costos: props.liq?.costos || [],
  facturas: props.liq?.facturas || [],
  esAutoconsumo: props.liq?.tipo_venta === 'autoconsumo',
  soportes: indiceSoportesProyecto(props.liq),
}))

const grupos = computed(() => er.value.grupos)
const neto = computed(() => er.value.neto)

defineExpose({ neto })
</script>
