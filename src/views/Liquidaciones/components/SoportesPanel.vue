<template>
  <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
    <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
      <i class="pi pi-folder-open text-sm" style="color:#915BD8" />
      <h3 class="text-sm font-bold" style="color:#2C2039">Soportes y documentos</h3>
      <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
        style="background:#F1EAF9; color:#6E3FB8">{{ totalDocs }}</span>
    </div>

    <div v-if="totalDocs" class="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div v-for="g in grupos" :key="g.key" v-show="g.docs.length"
        class="rounded-lg border p-2.5" style="border-color:#f0ebf6; background:#faf9fc">
        <div class="flex items-center gap-1.5 mb-2">
          <i :class="g.icon" class="text-xs" :style="{ color: g.color }" />
          <span class="text-[11px] font-bold uppercase tracking-wide" style="color:#6b5a8a">{{ g.label }}</span>
          <span class="text-[10px] ml-auto" style="color:#bba8d4">{{ g.docs.length }}</span>
        </div>
        <ul class="space-y-1">
          <li v-for="(d, i) in g.docs" :key="g.key + '_' + i">
            <a :href="d.url" target="_blank" rel="noopener"
              class="flex items-center gap-1.5 text-xs hover:underline truncate" style="color:#915BD8"
              :title="d.label">
              <i :class="iconFor(d.url)" class="text-[11px] shrink-0" />
              <span class="truncate">{{ d.label }}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <p v-else class="px-4 py-4 text-xs text-center italic" style="color:#9b8fb0">
      Sin soportes adjuntos en esta liquidación.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { normTipo } from '@/utils/liquidaciones'
import { ETIQUETAS, LABEL_SERVICIO } from '@/constants/liquidaciones'

const props = defineProps({ liq: { type: Object, required: true } })

const etiqueta = (t) => ETIQUETAS[normTipo(t)] || t

function iconFor(url) {
  const u = (url || '').toLowerCase()
  if (u.includes('spreadsheets') || u.endsWith('.xlsx') || u.endsWith('.xls')) return 'pi pi-file-excel'
  if (u.endsWith('.pdf')) return 'pi pi-file-pdf'
  if (u.includes('drive.google')) return 'pi pi-google'
  return 'pi pi-external-link'
}

const grupos = computed(() => {
  const m = props.liq?.mandatos || []
  const lineasDe = (tipo) => m.filter(x => x.tipo === tipo)
    .flatMap(x => (x.lineas || []))
    .filter(l => l.soporte_url)
    .map(l => ({ url: l.soporte_url, label: l.referencia_factura || etiqueta(l.tipo_linea) || 'Soporte' }))

  const estado = props.liq?.estado_resultados_url
    ? [{ url: props.liq.estado_resultados_url, label: 'Estado de Resultados (Hoja)' }]
    : []

  const ingresos = lineasDe('ingresos')
  const costosMandato = lineasDe('costos')
  const costosProyecto = (props.liq?.costos || []).filter(c => c.soporte_url)
    .map(c => ({ url: c.soporte_url, label: c.nro_soporte || c.descripcion || 'Costo' }))
  const facturas = (props.liq?.facturas || []).filter(f => f.soporte_url)
    .map(f => ({ url: f.soporte_url, label: f.numero_factura || LABEL_SERVICIO[f.tipo_servicio] || 'Factura' }))

  return [
    { key: 'estado', label: 'Estado de Resultados', icon: 'pi pi-chart-line', color: '#915BD8', docs: estado },
    { key: 'ingresos', label: 'Ingresos', icon: 'pi pi-arrow-up-right', color: '#10B981', docs: ingresos },
    { key: 'costos', label: 'Costos', icon: 'pi pi-arrow-down-left', color: '#D64455', docs: [...costosMandato, ...costosProyecto] },
    { key: 'facturas', label: 'Facturas', icon: 'pi pi-receipt', color: '#CA8A04', docs: facturas },
  ]
})

const totalDocs = computed(() => grupos.value.reduce((s, g) => s + g.docs.length, 0))
</script>
