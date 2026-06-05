<template>
  <div v-if="columnas.length && grupos.length" class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
    <div class="px-3 py-2 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-users text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Estado de Resultados por inversionista</h3>
      <span class="ml-auto text-[10px] uppercase tracking-wide font-semibold" style="color:#bba8d4">
        Concepto · Soporte · Total / inversionista
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <!-- Encabezado: Concepto | Total | Inv1 | Inv2 … -->
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
                  <span v-if="c.es_pa" class="text-[8px] uppercase font-semibold px-1 py-0.5 rounded ml-0.5"
                    style="background:#EAF4FF; color:#2563EB" title="Patrimonio Autónomo">PA</span>
                </span>
                <span class="text-[10px] font-mono tabular-nums" style="color:#bba8d4">{{ c.pct }}</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="g in grupos" :key="g.key">
            <!-- Subtotal del grupo -->
            <tr style="background:#fcfaff">
              <td class="px-3 py-1 font-bold uppercase tracking-wide text-[11px] sticky left-0 z-10"
                style="color:#6E3FB8; background:#fcfaff">{{ g.label }}</td>
              <td v-for="c in columnas" :key="c.id"
                class="px-3 py-1 text-right font-bold font-mono tabular-nums whitespace-nowrap"
                :style="{ color: subtotal(g, c.id) == null ? '#d8cce8' : (g.sign < 0 ? '#D64455' : '#2C2039'),
                          background: c.es_total ? 'rgba(145,91,216,0.06)' : 'transparent' }">
                <template v-if="subtotal(g, c.id) != null">
                  {{ g.sign < 0 ? '−' : '' }}{{ fmtCOP(Math.abs(subtotal(g, c.id))) }}
                </template>
                <template v-else>—</template>
              </td>
            </tr>
            <!-- Líneas del grupo -->
            <tr v-for="l in g.lineas" :key="g.key + '_' + l.key" class="border-t" style="border-color:#f7f3fc">
              <td class="px-3 py-1 sticky left-0 z-10 bg-white">
                <span class="pl-3 block" style="color:#5b5470">{{ l.label }}</span>
              </td>
              <td v-for="c in columnas" :key="c.id"
                class="px-3 py-1 text-right whitespace-nowrap align-top"
                :style="{ background: c.es_total ? 'rgba(145,91,216,0.04)' : 'transparent' }">
                <div class="flex flex-col items-end gap-0.5">
                  <span class="font-mono tabular-nums" style="color:#6b5a8a">
                    {{ celda(l, c.id) ? fmtCOP(celda(l, c.id).valor) : '—' }}
                  </span>
                  <a v-if="celda(l, c.id)?.soporte_url" :href="celda(l, c.id).soporte_url" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style="background:#F1EAF9; color:#6E3FB8" :title="celda(l, c.id).referencia || 'Ver soporte'">
                    <i class="pi pi-paperclip text-[9px]" />{{ celda(l, c.id).refCodigo || 'Soporte' }}
                  </a>
                  <span v-else-if="celda(l, c.id)?.refCodigo" class="text-[10px]" style="color:#bba8d4"
                    :title="celda(l, c.id).referencia">{{ celda(l, c.id).refCodigo }}</span>
                </div>
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
              {{ fmtCOP(c.neto) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtCOP, pct, normPct, construirEstadoResultados, indiceSoportesProyecto } from '@/utils/liquidaciones'

const props = defineProps({
  liq: { type: Object, required: true },
  inversionistas: { type: Array, default: () => [] },
})

// Orden y etiqueta de grupos en la tabla (incluye facturas, que solo aplican al Total)
const GRUPOS = [
  { key: 'ingresos', label: 'Ingresos', sign: 1 },
  { key: 'comercializacion', label: 'Comercialización / Bolsa', sign: -1 },
  { key: 'ajustes', label: 'Ajustes', sign: 1 },
  { key: 'costos', label: 'Costos operativos (OPEX)', sign: -1 },
  { key: 'facturas', label: 'Facturas de servicio', sign: -1 },
]

const esDelInv = (m, piId) => m.inversionista?.id === piId || m.inversionista_id === piId

// Mandatos del "Total" (sin inversionista); si no hay, todos los por inversionista.
function pickTotal(tipo) {
  const m = props.liq?.mandatos || []
  const total = m.filter(x => x.tipo === tipo && x.inversionista_id == null && !x.inversionista)
  if (total.length) return total
  return m.filter(x => x.tipo === tipo && (x.inversionista || x.inversionista_id != null))
}

const columnas = computed(() => {
  const liq = props.liq || {}
  const esAutoconsumo = liq.tipo_venta === 'autoconsumo'
  const soportes = indiceSoportesProyecto(liq)
  const mandatos = liq.mandatos || []

  const cols = [{
    id: 'total', nombre: 'Total', pct: '100%', es_total: true,
    er: construirEstadoResultados({
      ingresosMandatos: pickTotal('ingresos'),
      costosMandatos: pickTotal('costos'),
      costos: liq.costos || [],
      facturas: liq.facturas || [],
      esAutoconsumo, soportes,
    }),
  }]

  for (const pi of (props.inversionistas || [])) {
    const ingresosMandatos = mandatos.filter(m => m.tipo === 'ingresos' && esDelInv(m, pi.id))
    const costosMandatos = mandatos.filter(m => m.tipo === 'costos' && esDelInv(m, pi.id))
    if (!ingresosMandatos.length && !costosMandatos.length) continue
    // Facturas de servicio (rep/CGM/admin) son a nivel proyecto → se prorratean por
    // participación para que aparezca la parte de cada inversionista (columna propia).
    const frac = normPct(pi.porcentaje_participacion)
    const facturas = (liq.facturas || []).map(f => ({ ...f, valor_cop: (Number(f.valor_cop) || 0) * frac }))
    const er = construirEstadoResultados({ ingresosMandatos, costosMandatos, facturas, esAutoconsumo, soportes })
    if (!er.grupos.length) continue
    cols.push({
      id: 'inv' + pi.id,
      nombre: pi.cliente_nombre || 'Inversionista',
      pct: pct(pi.porcentaje_participacion),
      es_pa: pi.es_patrimonio_autonomo,
      neto: er.neto,
      er,
    })
  }
  // neto del total
  cols[0].neto = cols[0].er.neto
  return cols
})

// Matriz: grupos → líneas (unión de conceptos entre columnas). Cada celda guarda
// su valor y su soporte (el documento es a nivel proyecto, pero cada inversionista
// puede traer su propio código de referencia).
const grupos = computed(() => {
  const cols = columnas.value
  const out = []
  for (const g of GRUPOS) {
    const lineMap = new Map()
    for (const c of cols) {
      const grupo = c.er.grupos.find(x => x.key === g.key)
      if (!grupo) continue
      for (const l of grupo.lineas) {
        const key = l.tipo || l.label
        if (!lineMap.has(key)) lineMap.set(key, { key, label: l.label, celdas: {} })
        const row = lineMap.get(key)
        const cel = row.celdas[c.id] || { valor: 0, soporte_url: null, refCodigo: null, referencia: null }
        cel.valor += l.valor
        if (!cel.soporte_url && l.soporte_url) { cel.soporte_url = l.soporte_url; cel.refCodigo = l.refCodigo; cel.referencia = l.referencia }
        if (!cel.refCodigo && l.refCodigo) { cel.refCodigo = l.refCodigo; cel.referencia = l.referencia }
        row.celdas[c.id] = cel
      }
    }
    if (!lineMap.size) continue
    out.push({ key: g.key, label: g.label, sign: g.sign, lineas: [...lineMap.values()] })
  }
  return out
})

const celda = (linea, colId) => linea.celdas[colId] || null

// Subtotal de un grupo para una columna (null si esa columna no tiene ese grupo)
function subtotal(grupo, colId) {
  const c = columnas.value.find(x => x.id === colId)
  const gr = c?.er.grupos.find(x => x.key === grupo.key)
  return gr ? gr.total : null
}
</script>
