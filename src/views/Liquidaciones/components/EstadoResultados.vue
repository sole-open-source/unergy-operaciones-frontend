<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
    <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-chart-line text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Estado de Resultados</h3>
    </div>

    <table class="w-full text-sm">
      <tbody>
        <template v-for="g in grupos" :key="g.key">
          <!-- Encabezado de grupo -->
          <tr class="border-t" style="border-color:#f0ebf6; background:#faf7ff">
            <td class="px-4 py-1.5 font-bold text-[11px] uppercase tracking-wide" style="color:#6E3FB8">{{ g.label }}</td>
            <td class="px-4 py-1.5 text-right font-bold font-mono" :style="{ color: g.sign < 0 ? '#D64455' : '#2C2039' }">
              {{ g.sign < 0 ? '−' : '' }}{{ fmtCOP(Math.abs(g.total)) }}
            </td>
          </tr>
          <!-- Líneas del grupo -->
          <tr v-for="(l, i) in g.lineas" :key="g.key + '_' + i" class="border-t" style="border-color:#f7f3fc">
            <td class="pl-8 pr-4 py-1 text-xs" style="color:#5b5470">{{ l.label }}</td>
            <td class="px-4 py-1 text-right text-xs font-mono" style="color:#6b5a8a">{{ fmtCOP(l.valor) }}</td>
          </tr>
        </template>

        <!-- INGRESO NETO -->
        <tr class="border-t-2" style="border-color:#915BD8; background:rgba(145,91,216,0.07)">
          <td class="px-4 py-2.5 font-extrabold" style="color:#2C2039">INGRESO NETO (Valor a pagar)</td>
          <td class="px-4 py-2.5 text-right font-extrabold font-mono text-base" style="color:#915BD8">{{ fmtCOP(neto) }}</td>
        </tr>
      </tbody>
    </table>

    <p class="px-4 py-2 text-[10px] italic border-t" style="color:#9b8fb0; border-color:#f0ebf6">
      Neto = valor a pagar (mandato de ingresos) − mandato de costos − facturas de servicio (CGM, Representación, Administración).
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtCOP, normTipo } from '@/utils/liquidaciones'
import { ETIQUETAS, TIPOS_INGRESO_BRUTO, TIPOS_COMERCIALIZACION, LABEL_SERVICIO } from '@/constants/liquidaciones'

const props = defineProps({ liq: { type: Object, required: true } })

const num = (v) => Number(v) || 0
const etiqueta = (t) => ETIQUETAS[normTipo(t)] || t

// Mandatos a usar: preferir los "Total" (sin inversionista); si no hay, usar los por-inversionista
function pickMandatos(tipo) {
  const m = props.liq?.mandatos || []
  const total = m.filter(x => x.tipo === tipo && x.inversionista_id == null && !x.inversionista)
  if (total.length) return total
  return m.filter(x => x.tipo === tipo && (x.inversionista || x.inversionista_id != null))
}

const ingresosMandatos = computed(() => pickMandatos('ingresos'))
const costosMandatos = computed(() => pickMandatos('costos'))

// Agrupa las líneas de una lista de mandatos por tipo_linea (sumando valores)
function agruparLineas(mandatos, filtro) {
  const map = {}
  for (const m of mandatos) {
    for (const l of (m.lineas || [])) {
      const t = normTipo(l.tipo_linea)
      if (l.tipo_linea === 'valor_a_pagar' || t === 'valor_a_pagar') continue
      if (filtro && !filtro(t)) continue
      if (!map[t]) map[t] = { label: etiqueta(l.tipo_linea), valor: 0 }
      map[t].valor += num(l.valor_cop)
    }
  }
  return Object.values(map).filter(x => x.valor !== 0)
}

// "Valor a pagar" del mandato de ingresos (ya neto de comercialización/bolsa/ajuste)
const valorAPagar = computed(() => {
  const m = ingresosMandatos.value
  const conNeto = m.filter(x => x.valor_neto_cop != null)
  if (conNeto.length) return conNeto.reduce((s, x) => s + num(x.valor_neto_cop), 0)
  // Respaldo: bruto − comercialización a partir de las líneas
  let bruto = 0, comer = 0
  for (const x of m) for (const l of (x.lineas || [])) {
    const t = normTipo(l.tipo_linea)
    if (TIPOS_INGRESO_BRUTO.has(t)) bruto += num(l.valor_cop)
    if (TIPOS_COMERCIALIZACION.has(t)) comer += Math.abs(num(l.valor_cop))
  }
  return bruto - comer
})

// Costos operativos (mandato de costos "Total"; respaldo: liq.costos)
const costosOperativos = computed(() => {
  const m = costosMandatos.value
  const conNeto = m.filter(x => x.valor_neto_cop != null)
  if (conNeto.length) return conNeto.reduce((s, x) => s + num(x.valor_neto_cop), 0)
  if (m.length) return m.reduce((s, x) => s + (x.lineas || []).reduce((a, l) => a + num(l.valor_cop), 0), 0)
  return (props.liq?.costos || []).reduce((s, c) => s + num(c.valor_cop), 0)
})

const facturasTotal = computed(() =>
  (props.liq?.facturas || []).reduce((s, f) => s + num(f.valor_cop), 0)
)

const neto = computed(() => valorAPagar.value - costosOperativos.value - facturasTotal.value)

// ── Grupos de la cascada ──────────────────────────────────────────────────────
const grupos = computed(() => {
  const out = []
  const esAutoconsumo = props.liq?.tipo_venta === 'autoconsumo'

  // INGRESOS (bruto)
  const ingLineas = agruparLineas(ingresosMandatos.value, t => TIPOS_INGRESO_BRUTO.has(t))
  const ingTotal = ingLineas.reduce((s, l) => s + l.valor, 0)
  if (ingLineas.length) out.push({ key: 'ingresos', label: 'Ingresos', lineas: ingLineas, total: ingTotal, sign: 1 })

  // COMERCIALIZACIÓN / BOLSA (se resta) — oculto en autoconsumo
  if (!esAutoconsumo) {
    const comLineas = agruparLineas(ingresosMandatos.value, t => TIPOS_COMERCIALIZACION.has(t))
    const comTotal = comLineas.reduce((s, l) => s + Math.abs(l.valor), 0)
    if (comLineas.length) out.push({ key: 'comercializacion', label: 'Comercialización / Bolsa', lineas: comLineas.map(l => ({ ...l, valor: Math.abs(l.valor) })), total: comTotal, sign: -1 })
  }

  // AJUSTES (xm, unergy, intereses, otros) — informativo
  const ajLineas = agruparLineas(ingresosMandatos.value, t =>
    !TIPOS_INGRESO_BRUTO.has(t) && !TIPOS_COMERCIALIZACION.has(t))
  if (ajLineas.length) {
    const ajTotal = ajLineas.reduce((s, l) => s + l.valor, 0)
    out.push({ key: 'ajustes', label: 'Ajustes', lineas: ajLineas, total: ajTotal, sign: ajTotal < 0 ? -1 : 1 })
  }

  // COSTOS OPERATIVOS (se resta)
  let cosLineas = agruparLineas(costosMandatos.value)
  if (!cosLineas.length) {
    cosLineas = (props.liq?.costos || []).filter(c => num(c.valor_cop) !== 0)
      .map(c => ({ label: ETIQUETAS[c.tipo_costo] || c.descripcion || c.tipo_costo, valor: num(c.valor_cop) }))
  }
  if (cosLineas.length) {
    out.push({ key: 'costos', label: 'Costos operativos (OPEX)', lineas: cosLineas, total: costosOperativos.value, sign: -1 })
  }

  // FACTURAS DE SERVICIO (se resta): CGM, Representación, Administración
  const facLineas = (props.liq?.facturas || []).filter(f => num(f.valor_cop) !== 0)
    .map(f => ({ label: LABEL_SERVICIO[f.tipo_servicio] || f.tipo_servicio, valor: num(f.valor_cop) }))
  if (facLineas.length) {
    out.push({ key: 'facturas', label: 'Facturas de servicio', lineas: facLineas, total: facturasTotal.value, sign: -1 })
  }

  return out
})

defineExpose({ neto })
</script>
