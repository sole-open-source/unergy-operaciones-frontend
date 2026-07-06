<template>
  <div class="p-4 sm:p-5 space-y-4">

    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <template v-else>
      <!-- ── Tipo (preliquidación / oficial) + aviso de espejo ──────── -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="liq-tipo-toggle">
          <button class="liq-tipo-btn" :class="{ 'liq-tipo-btn--on': tipo === 'preliquidacion' }"
            @click="tipo = 'preliquidacion'">Preliquidación</button>
          <button class="liq-tipo-btn" :class="{ 'liq-tipo-btn--on': tipo === 'oficial' }"
            @click="tipo = 'oficial'">Oficial</button>
        </div>
        <span class="text-[11px]" style="color:#9b8fb0">
          Espejo de lectura del Panel Contable · los valores se editan en Panel Contable
        </span>
      </div>

      <!-- ── KPIs del período ─────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="kpi in kpis" :key="kpi.label"
          class="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border"
          style="border-color:#e8e0f0">
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-wide font-semibold truncate" style="color:#6b5a8a">{{ kpi.label }}</p>
            <p class="text-xl font-bold mt-1 truncate" style="color:#2C2039">{{ kpi.value }}</p>
          </div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :style="{ backgroundColor: kpi.bg }">
            <i :class="[kpi.icon, 'text-lg']" :style="{ color: kpi.color }" />
          </div>
        </div>
      </div>

      <!-- ── Proyectos del Panel Contable ────────────────────────────── -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
        <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
          <h3 class="text-sm font-bold" style="color:#2C2039">Panel Contable de {{ formatPeriodo(periodo) }}</h3>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:#F1EAF9; color:#6E3FB8">{{ proyectos.length }}</span>
        </div>
        <DataTable :value="proyectos" v-model:expandedRows="expandedRows" dataKey="panel_id" rowHover class="text-sm">
          <template #empty>
            <div class="text-center py-6 text-xs text-gray-400">
              Sin paneles cargados para este período/tipo. Cárgalos en Panel Contable.
            </div>
          </template>
          <Column expander style="width:3rem" />
          <Column field="proyecto" header="Proyecto" sortable />
          <Column header="Estado">
            <template #body="{ data }">
              <Tag :value="data.estado === 'firmado' ? 'Firmado' : 'Pendiente'"
                :severity="data.estado === 'firmado' ? 'success' : 'warn'" class="text-[10px]" />
            </template>
          </Column>
          <Column header="Consec. Ingresos" style="width:120px">
            <template #body="{ data }"><span class="font-mono text-xs">{{ data.consecutivo_ingresos ?? '—' }}</span></template>
          </Column>
          <Column header="Consec. Costos" style="width:120px">
            <template #body="{ data }"><span class="font-mono text-xs">{{ data.consecutivo_costos ?? '—' }}</span></template>
          </Column>
          <Column header="Ingresos" style="width:130px">
            <template #body="{ data }"><span class="font-mono text-xs">{{ fmtCompact(data.ingresos_cop) }}</span></template>
          </Column>
          <Column header="Costos" style="width:120px">
            <template #body="{ data }"><span class="font-mono text-xs text-red-600">{{ fmtCompact(data.costos_cop) }}</span></template>
          </Column>
          <Column header="Valor a pagar" style="width:140px">
            <template #body="{ data }"><span class="font-mono text-xs font-semibold" style="color:#915BD8">{{ fmtCompact(data.valor_a_pagar_total) }}</span></template>
          </Column>
          <template #expansion="{ data }">
            <div class="px-4 py-3" style="background:#FAF8FD">
              <p class="text-[11px] font-semibold mb-2" style="color:#6b5a8a">Por inversionista</p>
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left" style="color:#9b8fb0">
                    <th class="pb-1 font-medium">Inversionista</th>
                    <th class="pb-1 font-medium">%</th>
                    <th class="pb-1 font-medium text-right">Valor a pagar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inv in data.inversionistas" :key="inv.proyecto_inversionista_id || inv.nombre"
                    class="border-t" style="border-color:#f0ebf6">
                    <td class="py-1.5" style="color:#2C2039">{{ inv.nombre || '—' }}</td>
                    <td class="py-1.5 font-mono" style="color:#6b5a8a">{{ inv.porcentaje != null ? inv.porcentaje.toFixed(2) + '%' : '—' }}</td>
                    <td class="py-1.5 font-mono text-right font-semibold" style="color:#915BD8">{{ fmtCompact(inv.valor_a_pagar) }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="!data.inversionistas?.length" class="text-[11px] text-center py-2" style="color:#9b8fb0">Sin inversionistas en este panel.</p>
            </div>
          </template>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import { fmtCompact, formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({ periodo: { type: String, required: true } })

const loading = ref(false)
const tipo = ref('preliquidacion')
const proyectos = ref([])
const expandedRows = ref({})
const resumen = ref({ num_proyectos: 0, valor_a_pagar_total: 0, ingresos_total_cop: 0, costos_total_cop: 0, ingreso_neto_cop: 0 })

const periodoYYYYMM = computed(() => props.periodo.slice(0, 7))

const kpis = computed(() => {
  const tint = (hex) => hex + '1a'
  return [
    { label: 'Ingresos', value: fmtCompact(resumen.value.ingresos_total_cop), icon: 'pi pi-arrow-up-right', color: '#10B981', bg: tint('#10B981') },
    { label: 'Costos', value: fmtCompact(resumen.value.costos_total_cop), icon: 'pi pi-arrow-down-left', color: '#D64455', bg: tint('#D64455') },
    { label: 'Valor a pagar', value: fmtCompact(resumen.value.valor_a_pagar_total), icon: 'pi pi-wallet', color: '#915BD8', bg: tint('#915BD8') },
    { label: 'Proyectos en Panel', value: String(resumen.value.num_proyectos), icon: 'pi pi-folder', color: '#3B82F6', bg: tint('#3B82F6') },
  ]
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/liquidaciones/resumen-panel', {
      params: { periodo: periodoYYYYMM.value, tipo: tipo.value },
    })
    proyectos.value = data.proyectos || []
    resumen.value = data.resumen || resumen.value
  } catch {
    proyectos.value = []
  } finally {
    loading.value = false
  }
}

watch([() => props.periodo, tipo], load)
onMounted(load)
</script>

<style scoped>
.liq-tipo-toggle {
  display: inline-flex;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 2px;
}
.liq-tipo-btn {
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #6B5A8A;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
}
.liq-tipo-btn:hover:not(.liq-tipo-btn--on) { color: #2C2039; background: rgba(145,91,216,.08); }
.liq-tipo-btn--on { background: #915BD8; color: #FDFAF7; box-shadow: 0 1px 4px rgba(145,91,216,.3); }
</style>
