<template>
  <div v-if="cards.length" class="space-y-3">
    <!-- Encabezado de la capa -->
    <div class="flex items-center gap-2 px-1">
      <i class="pi pi-users text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Estado de Resultados por inversionista</h3>
      <span class="ml-auto text-[10px] uppercase tracking-wide font-semibold" style="color:#bba8d4">
        {{ cards.length }} inversionista{{ cards.length === 1 ? '' : 's' }} · Concepto · Soporte · Valor
      </span>
    </div>

    <!-- Grid simétrico de tarjetas por inversionista -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
      <div v-for="c in cards" :key="c.id"
        class="bg-white rounded-xl shadow-sm border overflow-hidden h-full flex flex-col" style="border-color:#e8e0f0">

        <!-- Header inversionista -->
        <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6; background:#faf7ff">
          <span class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
            style="background:#F1EAF9; color:#6E3FB8">{{ c.iniciales }}</span>
          <h4 class="text-sm font-bold truncate" style="color:#2C2039" :title="c.nombre">{{ c.nombre }}</h4>
          <span v-if="c.es_patrimonio_autonomo"
            class="text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded shrink-0"
            style="background:#EAF4FF; color:#2563EB" title="Patrimonio Autónomo">PA</span>
          <span class="ml-auto text-[11px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-md shrink-0"
            style="background:#F1EAF9; color:#6E3FB8" title="Porcentaje de participación">{{ c.pctLabel }}</span>
        </div>

        <!-- Grupos / líneas -->
        <div class="flex-1">
          <template v-for="g in c.grupos" :key="g.key">
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
                <i class="pi pi-paperclip text-[10px]" />{{ l.referencia || 'Soporte' }}
              </a>
              <span v-else-if="l.referencia" class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
                style="background:#f5f1fa; color:#9b8fb0" :title="l.referencia">
                <i class="pi pi-hashtag text-[10px]" />{{ l.referencia }}
              </span>
              <span v-else-if="l.requiereSoporte" class="text-[10px] italic" style="color:#cdbfe2" title="Sin soporte adjunto">— sin soporte</span>
              <span class="text-xs font-mono tabular-nums whitespace-nowrap" style="color:#6b5a8a">{{ fmtCOP(l.valor) }}</span>
            </div>
          </template>
        </div>

        <!-- Valor a pagar del inversionista -->
        <div class="flex items-center justify-between gap-3 px-4 py-2.5 border-t-2" style="border-color:#915BD8; background:rgba(145,91,216,0.07)">
          <span class="font-extrabold" style="color:#2C2039">Valor a pagar</span>
          <span class="font-extrabold font-mono tabular-nums text-base whitespace-nowrap" style="color:#915BD8">{{ fmtCOP(c.neto) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtCOP, pct, construirEstadoResultados, indiceSoportesProyecto } from '@/utils/liquidaciones'

const props = defineProps({
  liq: { type: Object, required: true },
  // Inversionistas del proyecto (GET /proyectos/:id/inversionistas)
  inversionistas: { type: Array, default: () => [] },
})

function iniciales(nombre) {
  return (nombre || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}

// Mandatos de un inversionista (el backend a veces expone inversionista.id y a
// veces inversionista_id — contemplar ambos).
const esDelInv = (m, piId) => m.inversionista?.id === piId || m.inversionista_id === piId

const cards = computed(() => {
  const mandatos = props.liq?.mandatos || []
  const esAutoconsumo = props.liq?.tipo_venta === 'autoconsumo'
  // Adjuntos a nivel proyecto: el documento de cada concepto es único y se
  // comparte entre inversionistas (ver indiceSoportesProyecto).
  const soportes = indiceSoportesProyecto(props.liq)
  const out = []
  for (const pi of (props.inversionistas || [])) {
    const ingresosMandatos = mandatos.filter(m => m.tipo === 'ingresos' && esDelInv(m, pi.id))
    const costosMandatos = mandatos.filter(m => m.tipo === 'costos' && esDelInv(m, pi.id))
    if (!ingresosMandatos.length && !costosMandatos.length) continue

    // Facturas de servicio (CGM/representación/admin) son a nivel proyecto, no
    // por inversionista → no se pasan aquí.
    const er = construirEstadoResultados({ ingresosMandatos, costosMandatos, esAutoconsumo, soportes })
    if (!er.grupos.length) continue

    out.push({
      id: pi.id,
      nombre: pi.cliente_nombre || 'Inversionista',
      iniciales: iniciales(pi.cliente_nombre),
      es_patrimonio_autonomo: pi.es_patrimonio_autonomo,
      pctLabel: pct(pi.porcentaje_participacion),
      grupos: er.grupos,
      neto: er.neto,
    })
  }
  return out
})
</script>
