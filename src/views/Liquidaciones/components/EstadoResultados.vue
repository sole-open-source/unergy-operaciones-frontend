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
            <i class="pi pi-paperclip text-[10px]" />{{ l.referencia || 'Soporte' }}
          </a>
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
import { fmtCOP, normTipo } from '@/utils/liquidaciones'
import { ETIQUETAS, TIPOS_INGRESO_BRUTO, TIPOS_COMERCIALIZACION, LABEL_SERVICIO } from '@/constants/liquidaciones'

const props = defineProps({ liq: { type: Object, required: true } })

const num = (v) => Number(v) || 0
const etiqueta = (t) => ETIQUETAS[normTipo(t)] || t

// Líneas que no requieren documento soporte (impuestos / totales)
const SIN_SOPORTE = new Set(['iva', 'reteica', 'retencion_fuente', 'ica_opex', 'otro_impuesto', 'valor_a_pagar'])

function pickMandatos(tipo) {
  const m = props.liq?.mandatos || []
  const total = m.filter(x => x.tipo === tipo && x.inversionista_id == null && !x.inversionista)
  if (total.length) return total
  return m.filter(x => x.tipo === tipo && (x.inversionista || x.inversionista_id != null))
}
const ingresosMandatos = computed(() => pickMandatos('ingresos'))
const costosMandatos = computed(() => pickMandatos('costos'))

// Líneas individuales (con su soporte) de una lista de mandatos
function lineasDe(mandatos, filtro, { abs = false } = {}) {
  const out = []
  for (const m of mandatos) {
    for (const l of (m.lineas || [])) {
      const t = normTipo(l.tipo_linea)
      if (t === 'valor_a_pagar') continue
      if (filtro && !filtro(t)) continue
      const valor = num(l.valor_cop)
      if (valor === 0) continue
      out.push({
        label: etiqueta(l.tipo_linea),
        valor: abs ? Math.abs(valor) : valor,
        soporte_url: l.soporte_url || null,
        referencia: l.referencia_factura || null,
        requiereSoporte: !SIN_SOPORTE.has(t),
      })
    }
  }
  return out
}

const valorAPagar = computed(() => {
  const m = ingresosMandatos.value
  const conNeto = m.filter(x => x.valor_neto_cop != null)
  if (conNeto.length) return conNeto.reduce((s, x) => s + num(x.valor_neto_cop), 0)
  let bruto = 0, comer = 0
  for (const x of m) for (const l of (x.lineas || [])) {
    const t = normTipo(l.tipo_linea)
    if (TIPOS_INGRESO_BRUTO.has(t)) bruto += num(l.valor_cop)
    if (TIPOS_COMERCIALIZACION.has(t)) comer += Math.abs(num(l.valor_cop))
  }
  return bruto - comer
})

const costosOperativos = computed(() => {
  const m = costosMandatos.value
  const conNeto = m.filter(x => x.valor_neto_cop != null)
  if (conNeto.length) return conNeto.reduce((s, x) => s + num(x.valor_neto_cop), 0)
  if (m.length) return m.reduce((s, x) => s + (x.lineas || []).reduce((a, l) => a + num(l.valor_cop), 0), 0)
  return (props.liq?.costos || []).reduce((s, c) => s + num(c.valor_cop), 0)
})

const facturasTotal = computed(() => (props.liq?.facturas || []).reduce((s, f) => s + num(f.valor_cop), 0))
const neto = computed(() => valorAPagar.value - costosOperativos.value - facturasTotal.value)

const grupos = computed(() => {
  const out = []
  const esAutoconsumo = props.liq?.tipo_venta === 'autoconsumo'

  const ing = lineasDe(ingresosMandatos.value, t => TIPOS_INGRESO_BRUTO.has(t))
  if (ing.length) out.push({ key: 'ingresos', label: 'Ingresos', lineas: ing, total: ing.reduce((s, l) => s + l.valor, 0), sign: 1 })

  if (!esAutoconsumo) {
    const com = lineasDe(ingresosMandatos.value, t => TIPOS_COMERCIALIZACION.has(t), { abs: true })
    if (com.length) out.push({ key: 'comercializacion', label: 'Comercialización / Bolsa', lineas: com, total: com.reduce((s, l) => s + l.valor, 0), sign: -1 })
  }

  const aj = lineasDe(ingresosMandatos.value, t => !TIPOS_INGRESO_BRUTO.has(t) && !TIPOS_COMERCIALIZACION.has(t))
  if (aj.length) {
    const t = aj.reduce((s, l) => s + l.valor, 0)
    out.push({ key: 'ajustes', label: 'Ajustes', lineas: aj, total: t, sign: t < 0 ? -1 : 1 })
  }

  let cos = lineasDe(costosMandatos.value)
  if (!cos.length) {
    cos = (props.liq?.costos || []).filter(c => num(c.valor_cop) !== 0).map(c => ({
      label: ETIQUETAS[c.tipo_costo] || c.descripcion || c.tipo_costo,
      valor: num(c.valor_cop), soporte_url: c.soporte_url || null,
      referencia: c.nro_soporte || null, requiereSoporte: true,
    }))
  }
  if (cos.length) out.push({ key: 'costos', label: 'Costos operativos (OPEX)', lineas: cos, total: costosOperativos.value, sign: -1 })

  const fac = (props.liq?.facturas || []).filter(f => num(f.valor_cop) !== 0).map(f => ({
    label: LABEL_SERVICIO[f.tipo_servicio] || f.tipo_servicio,
    valor: num(f.valor_cop), soporte_url: f.soporte_url || null,
    referencia: f.nro_soporte || f.numero_factura || null, requiereSoporte: true,
  }))
  if (fac.length) out.push({ key: 'facturas', label: 'Facturas de servicio', lineas: fac, total: facturasTotal.value, sign: -1 })

  return out
})

defineExpose({ neto })
</script>
