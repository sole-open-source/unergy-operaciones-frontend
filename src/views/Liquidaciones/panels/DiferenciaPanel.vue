<template>
  <div class="p-4 sm:p-5 space-y-4">
    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <template v-else>
      <div class="flex items-center justify-between flex-wrap gap-2">
        <span class="text-sm font-bold" style="color:#2C2039">Preliquidación vs Oficial · {{ formatPeriodo(periodo) }}</span>
        <span class="text-[11px]" style="color:#9b8fb0">La diferencia (oficial − preliquidación) es lo que se liquida oficialmente</span>
      </div>

      <div v-if="!diff.tiene_oficial" class="rounded-lg px-3 py-3 text-xs text-center"
        style="background:#faf7ff; border:1px solid #e3d5f5; color:#6b5a8a">
        <i class="pi pi-clock" style="font-size:20px; display:block; margin-bottom:6px; color:#915BD8" />
        Aún no hay liquidación <b>oficial</b> para comparar en {{ formatPeriodo(periodo) }}.<br />
        Carga el ER oficial en Panel Contable (pestaña Oficial).
      </div>

      <template v-else>
        <!-- Resumen global -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-for="k in kpis" :key="k.label" class="bg-white rounded-xl shadow-sm p-4 border" style="border-color:#e8e0f0">
            <p class="text-[11px] uppercase tracking-wide font-semibold" style="color:#6b5a8a">{{ k.label }}</p>
            <p class="text-xl font-bold mt-1" :style="{ color: k.color }">{{ arrow(k.arrowVal) }}{{ fmtCOP(k.value) }}</p>
          </div>
        </div>

        <!-- Por proyecto -->
        <div v-for="proy in diff.proyectos" :key="proy.proyecto_id" class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
          <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
            <h3 class="text-sm font-bold" style="color:#2C2039">{{ proy.proyecto_nombre }}</h3>
            <span class="ml-auto text-xs font-mono">
              <span style="color:#9b8fb0">Preliq</span> {{ fmtCompact(proy.utilidad_pre) }}
              <span style="color:#9b8fb0" class="ml-2">Oficial</span> {{ proy.tiene_oficial ? fmtCompact(proy.utilidad_oficial) : '—' }}
              <span class="ml-2 font-semibold" :style="{ color: colorDif(proy.utilidad_dif) }">{{ arrow(proy.utilidad_dif) }}{{ fmtCompact(proy.utilidad_dif) }}</span>
            </span>
          </div>

          <div v-for="inv in proy.inversionistas" :key="inv.proyecto_inversionista_id || inv.nombre" class="px-3 py-2">
            <p class="text-[11px] font-semibold mb-1" style="color:#6b5a8a">
              {{ inv.nombre }} · {{ (inv.porcentaje ?? 0).toFixed(2) }}%
            </p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left" style="color:#9b8fb0; background:#faf7ff">
                    <th class="px-2 py-1 font-medium">Concepto</th>
                    <th class="px-2 py-1 font-medium text-right">Preliquidación</th>
                    <th class="px-2 py-1 font-medium text-right">Oficial</th>
                    <th class="px-2 py-1 font-medium text-right">Diferencia</th>
                    <th class="px-2 py-1 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="g in GRUPOS" :key="g.key">
                    <template v-if="lineasGrupo(inv, g).length">
                      <tr><td colspan="5" class="px-2 pt-2 pb-0.5 font-bold uppercase tracking-wide text-[10px]" style="color:#6E3FB8">{{ g.label }}</td></tr>
                      <tr v-for="(ln, i) in lineasGrupo(inv, g)" :key="g.key + i" class="border-t" style="border-color:#f7f3fc">
                        <td class="px-2 py-1" style="color:#5b5470">{{ ln.concepto }}</td>
                        <td class="px-2 py-1 text-right font-mono" style="color:#6b5a8a">{{ fmtCOP(ln.preliquidacion) }}</td>
                        <td class="px-2 py-1 text-right font-mono" style="color:#6b5a8a">{{ ln.oficial != null ? fmtCOP(ln.oficial) : '—' }}</td>
                        <td class="px-2 py-1 text-right font-mono font-semibold" :style="{ color: colorDif(ln.diferencia) }">{{ arrow(ln.diferencia) }}{{ ln.diferencia != null ? fmtCOP(ln.diferencia) : '—' }}</td>
                        <td class="px-2 py-1 text-right font-mono" :style="{ color: colorDif(ln.diferencia) }">{{ ln.pct_variacion != null ? ln.pct_variacion.toFixed(1) + '%' : '—' }}</td>
                      </tr>
                    </template>
                  </template>
                  <tr class="border-t-2" style="border-color:#915BD8; background:rgba(145,91,216,0.06)">
                    <td class="px-2 py-1.5 font-extrabold" style="color:#2C2039">Valor a pagar (utilidad)</td>
                    <td class="px-2 py-1.5 text-right font-mono font-bold" style="color:#2C2039">{{ fmtCOP(inv.utilidad_pre) }}</td>
                    <td class="px-2 py-1.5 text-right font-mono font-bold" style="color:#2C2039">{{ inv.utilidad_oficial != null ? fmtCOP(inv.utilidad_oficial) : '—' }}</td>
                    <td class="px-2 py-1.5 text-right font-mono font-extrabold" :style="{ color: colorDif(inv.utilidad_dif) }">{{ arrow(inv.utilidad_dif) }}{{ inv.utilidad_dif != null ? fmtCOP(inv.utilidad_dif) : '—' }}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import { fmtCOP, fmtCompact, formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({ periodo: { type: String, required: true } })

const loading = ref(false)
const diff = ref({ proyectos: [], resumen: {}, tiene_oficial: false })

// Grupos del detalle (costos operativos = costos + facturas de servicio).
const GRUPOS = [
  { key: 'ingresos', keys: ['ingresos'], label: 'Ingresos' },
  { key: 'comercializacion', keys: ['comercializacion'], label: 'Comercialización XM' },
  { key: 'costos', keys: ['costos', 'facturas'], label: 'Costos operativos' },
]
const lineasGrupo = (inv, g) => (inv.lineas || []).filter(l => g.keys.includes(l.grupo))

// Helpers (sin '<' en el template: Vue lo tomaría como etiqueta).
const arrow = (v) => (v == null || v === 0 ? '' : (v > 0 ? '▲ ' : '▼ '))
const colorDif = (v) => (!v ? '#6b5a8a' : (v > 0 ? '#10B981' : '#D64455'))

const kpis = computed(() => {
  const r = diff.value.resumen || {}
  return [
    { label: 'Utilidad estimada (preliq.)', value: r.utilidad_estimada || 0, color: '#2C2039', arrowVal: 0 },
    { label: 'Utilidad real (oficial)', value: r.utilidad_real || 0, color: '#2C2039', arrowVal: 0 },
    { label: 'Diferencia (se liquida)', value: r.diferencia || 0, color: colorDif(r.diferencia || 0), arrowVal: r.diferencia || 0 },
  ]
})

async function load() {
  const per = (props.periodo || '').slice(0, 7)
  if (!per) return
  loading.value = true
  try {
    const { data } = await api.get('/panel-contable/diferencia', { params: { periodo: per } })
    diff.value = data || { proyectos: [], resumen: {}, tiene_oficial: false }
  } catch {
    diff.value = { proyectos: [], resumen: {}, tiene_oficial: false }
  } finally {
    loading.value = false
  }
}

watch(() => props.periodo, load)
onMounted(load)
</script>
