<template>
  <div v-if="columnas.length && grupos.length" class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
    <div class="px-3 py-2 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-users text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Estado de Resultados por inversionista</h3>
      <span class="ml-auto text-[10px] uppercase tracking-wide font-semibold" style="color:#bba8d4">
        Espejo del Panel Contable
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr style="background:#faf7ff">
            <th class="text-left font-bold uppercase tracking-wide text-[10px] px-3 py-1.5 sticky left-0 z-10"
              style="color:#6E3FB8; background:#faf7ff; min-width:160px">Concepto</th>
            <th v-for="c in columnas" :key="c.id"
              class="text-right px-3 py-1.5 align-bottom whitespace-nowrap"
              :style="{ minWidth: '108px', background: c.es_total ? 'rgba(145,91,216,0.06)' : '#faf7ff' }">
              <div class="flex flex-col items-end gap-0.5">
                <span class="font-bold truncate max-w-[160px]" :style="{ color: c.es_total ? '#6E3FB8' : '#2C2039' }" :title="c.nombre">
                  {{ c.nombre }}
                </span>
                <span class="text-[10px] font-mono tabular-nums" style="color:#bba8d4">{{ c.pct }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="g in grupos" :key="g.key">
            <tr style="background:#fcfaff">
              <td class="px-3 py-1 font-bold uppercase tracking-wide text-[11px] sticky left-0 z-10"
                style="color:#6E3FB8; background:#fcfaff">{{ g.label }}</td>
              <td v-for="c in columnas" :key="c.id"
                class="px-3 py-1 text-right font-bold font-mono tabular-nums whitespace-nowrap"
                :style="{ color: g.sub[c.id] == null ? '#d8cce8' : (g.sub[c.id] < 0 ? '#D64455' : '#2C2039'),
                          background: c.es_total ? 'rgba(145,91,216,0.06)' : 'transparent' }">
                <template v-if="g.sub[c.id] != null">{{ fmtCOP(g.sub[c.id]) }}</template>
                <template v-else>—</template>
              </td>
            </tr>
            <tr v-for="l in g.lineas" :key="g.key + '_' + l.concepto" class="border-t" style="border-color:#f7f3fc">
              <td class="px-3 py-1 sticky left-0 z-10 bg-white">
                <span class="pl-3 block" style="color:#5b5470">{{ l.concepto }}</span>
              </td>
              <td v-for="c in columnas" :key="c.id"
                class="px-3 py-1 text-right whitespace-nowrap align-top font-mono tabular-nums"
                :style="{ color: '#6b5a8a', background: c.es_total ? 'rgba(145,91,216,0.04)' : 'transparent' }">
                {{ l.celdas[c.id] != null ? fmtCOP(l.celdas[c.id]) : '—' }}
              </td>
            </tr>
          </template>
        </tbody>

        <tfoot>
          <tr class="border-t-2" style="border-color:#915BD8; background:rgba(145,91,216,0.07)">
            <td class="px-3 py-2 font-extrabold sticky left-0 z-10"
              style="color:#2C2039; background:#f4eefb">Valor a pagar</td>
            <td v-for="c in columnas" :key="c.id"
              class="px-3 py-2 text-right font-extrabold font-mono tabular-nums whitespace-nowrap"
              style="color:#915BD8; background:rgba(145,91,216,0.07)">
              {{ fmtCOP(c.valor_a_pagar) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtCOP } from '@/utils/liquidaciones'

// `panel` = entrada de proyecto de /liquidaciones/resumen-panel (fuente única: el
// Panel Contable). filtroPiId opcional: mostrar solo ese inversionista (nav ?inv=).
const props = defineProps({
  panel: { type: Object, default: null },
  filtroPiId: { type: Number, default: null },
})

const GRUPOS = [
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'comercializacion', label: 'Comercialización / Bolsa' },
  { key: 'costos', label: 'Costos operativos (OPEX)' },
  { key: 'facturas', label: 'Facturas de servicio' },
]

// Todos los inversionistas del panel (para el Total = 100%) y los que se muestran.
const todos = computed(() => props.panel?.inversionistas || [])
const mostrados = computed(() =>
  props.filtroPiId != null
    ? todos.value.filter(i => i.proyecto_inversionista_id === props.filtroPiId)
    : todos.value
)

const colId = (inv) => 'inv' + (inv.proyecto_inversionista_id ?? inv.cliente_id ?? inv.nombre)

const columnas = computed(() => {
  if (!props.panel) return []
  const cols = [{ id: 'total', nombre: 'Total', pct: '100%', es_total: true,
                  valor_a_pagar: props.panel.valor_a_pagar_total }]
  for (const inv of mostrados.value) {
    cols.push({
      id: colId(inv),
      nombre: inv.cliente_nombre || inv.nombre || 'Inversionista',
      pct: inv.porcentaje != null ? inv.porcentaje.toFixed(2) + '%' : '—',
      valor_a_pagar: inv.valor_a_pagar,
      _inv: inv,
    })
  }
  return cols
})

const grupos = computed(() => {
  if (!props.panel) return []
  const out = []
  for (const g of GRUPOS) {
    // Unión de conceptos del grupo, en orden de aparición (sobre todos los inv).
    const order = []
    const seen = new Set()
    for (const inv of todos.value)
      for (const c of (inv.conceptos || []))
        if (c.grupo === g.key && !seen.has(c.concepto)) { seen.add(c.concepto); order.push(c.concepto) }
    if (!order.length) continue

    const sumConcepto = (invs, concepto) =>
      invs.reduce((s, inv) => s + (inv.conceptos || [])
        .filter(c => c.grupo === g.key && c.concepto === concepto)
        .reduce((a, x) => a + (x.valor_cop || 0), 0), 0)

    const lineas = order.map(concepto => {
      const celdas = { total: sumConcepto(todos.value, concepto) }   // Total = 100% (todos)
      for (const inv of mostrados.value) celdas[colId(inv)] = sumConcepto([inv], concepto)
      return { concepto, celdas }
    })

    // Subtotales por columna (Total sobre todos; cada inv desde grupos_totales).
    const sub = { total: todos.value.reduce((s, inv) => s + ((inv.grupos_totales || {})[g.key] || 0), 0) }
    for (const inv of mostrados.value) sub[colId(inv)] = (inv.grupos_totales || {})[g.key] ?? null

    out.push({ key: g.key, label: g.label, lineas, sub })
  }
  return out
})
</script>
