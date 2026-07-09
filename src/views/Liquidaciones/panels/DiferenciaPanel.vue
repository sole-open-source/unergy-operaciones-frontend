<template>
  <div class="p-4 sm:p-5 space-y-4">
    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <template v-else>
      <div class="flex items-center justify-end">
        <span class="text-[11px]" style="color:#9b8fb0">
          Preliquidación vs Oficial · del Panel Contable de {{ formatPeriodo(periodo) }}
        </span>
      </div>

      <div v-if="!diff.tiene_oficial" class="rounded-lg px-3 py-2 text-xs"
        style="background:#faf7ff; border:1px solid #e3d5f5; color:#6b5a8a">
        Este período aún no tiene panel <b>oficial</b> cargado; se muestra solo la preliquidación.
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div v-for="k in kpis" :key="k.label"
          class="bg-white rounded-xl shadow-sm p-4 border" style="border-color:#e8e0f0">
          <p class="text-[11px] uppercase tracking-wide font-semibold" style="color:#6b5a8a">{{ k.label }}</p>
          <p class="text-xl font-bold mt-1" :style="{ color: k.color }">{{ fmtCompact(k.value) }}</p>
        </div>
      </div>

      <!-- Tabla por proyecto -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden" style="border-color:#e8e0f0">
        <div class="px-4 py-2.5 flex items-center gap-2 border-b" style="border-color:#f0ebf6">
          <h3 class="text-sm font-bold" style="color:#2C2039">Diferencia por proyecto</h3>
          <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style="background:#F1EAF9; color:#6E3FB8">{{ (diff.proyectos || []).length }}</span>
        </div>
        <DataTable :value="diff.proyectos || []" v-model:expandedRows="expandedRows" dataKey="proyecto_id"
          rowHover class="text-sm" :rows="25" paginator :alwaysShowPaginator="false">
          <template #empty>
            <div class="text-center py-8 text-sm text-gray-400">Sin datos de diferencia para este período.</div>
          </template>
          <Column expander style="width:3rem" />
          <Column field="proyecto_nombre" header="Proyecto" sortable />
          <Column header="Preliquidación" style="width:150px">
            <template #body="{ data }"><span class="font-mono text-xs">{{ fmtCompact(data.utilidad_pre) }}</span></template>
          </Column>
          <Column header="Oficial" style="width:150px">
            <template #body="{ data }"><span class="font-mono text-xs">{{ data.tiene_oficial ? fmtCompact(data.utilidad_oficial) : '—' }}</span></template>
          </Column>
          <Column header="Diferencia" style="width:150px">
            <template #body="{ data }">
              <span class="font-mono text-xs font-semibold" :style="{ color: colorDif(data.utilidad_dif) }">
                {{ data.utilidad_dif != null ? flecha(data.utilidad_dif) + fmtCompact(data.utilidad_dif) : '—' }}
              </span>
            </template>
          </Column>
          <template #expansion="{ data }">
            <div class="px-4 py-3" style="background:#FAF8FD">
              <p class="text-[11px] font-semibold mb-2" style="color:#6b5a8a">Por inversionista</p>
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-left" style="color:#9b8fb0">
                    <th class="pb-1 font-medium">Inversionista</th>
                    <th class="pb-1 font-medium text-right">Preliq.</th>
                    <th class="pb-1 font-medium text-right">Oficial</th>
                    <th class="pb-1 font-medium text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inv in data.inversionistas" :key="inv.proyecto_inversionista_id || inv.nombre"
                    class="border-t" style="border-color:#f0ebf6">
                    <td class="py-1.5" style="color:#2C2039">{{ inv.nombre || '—' }}</td>
                    <td class="py-1.5 font-mono text-right" style="color:#6b5a8a">{{ fmtCompact(inv.utilidad_pre) }}</td>
                    <td class="py-1.5 font-mono text-right" style="color:#6b5a8a">{{ fmtCompact(inv.utilidad_oficial) }}</td>
                    <td class="py-1.5 font-mono text-right font-semibold" :style="{ color: colorDif(inv.utilidad_dif) }">
                      {{ fmtCompact(inv.utilidad_dif) }}
                    </td>
                  </tr>
                </tbody>
              </table>
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
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import { fmtCompact, formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({ periodo: { type: String, required: true } })

const loading = ref(false)
const diff = ref({ proyectos: [], resumen: {}, tiene_oficial: false })
const expandedRows = ref({})

// Helpers (evitan '<' en el template, que el compilador de Vue interpreta como etiqueta)
const flecha = (v) => (v > 0 ? '▲ ' : (v ? '▼ ' : ''))
const colorDif = (v) => (!v ? '#6b5a8a' : (v > 0 ? '#10B981' : '#D64455'))

const kpis = computed(() => {
  const r = diff.value.resumen || {}
  return [
    { label: 'Utilidad estimada (preliq.)', value: r.utilidad_estimada || 0, color: '#2C2039' },
    { label: 'Utilidad real (oficial)', value: r.utilidad_real || 0, color: '#2C2039' },
    { label: 'Diferencia', value: r.diferencia || 0, color: (r.diferencia || 0) >= 0 ? '#10B981' : '#D64455' },
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
