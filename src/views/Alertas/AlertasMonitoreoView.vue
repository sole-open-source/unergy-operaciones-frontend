<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <Button icon="pi pi-arrow-left" text @click="$router.back()" class="-ml-2" />
      <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
        <i class="pi pi-exclamation-triangle text-red-500 text-sm" />
      </div>
      <div>
        <h2 class="text-xl font-bold text-gray-800">Alertas — Monitoreo</h2>
        <p class="text-xs text-gray-400 mt-0.5">Fallas activas + Minigranjas en tiempo real</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <button v-for="(tab, i) in TABS" :key="i"
        @click="activeTab = i"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors -mb-px',
          activeTab === i
            ? 'border-b-2 text-gray-800' : 'text-gray-400 hover:text-gray-600'
        ]"
        :style="activeTab === i ? 'border-color:#D64455' : ''">
        {{ tab }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- ═══ TAB 0: Fallas ═══ -->
    <template v-if="!loading && activeTab === 0">
      <!-- Resumen -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-xl border border-red-100 bg-red-50 p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <i class="pi pi-exclamation-circle text-red-500" />
          </div>
          <div>
            <p class="text-2xl font-bold text-red-600">{{ stats.total_activas ?? '—' }}</p>
            <p class="text-xs font-medium text-red-500">Fallas activas</p>
          </div>
        </div>
        <div class="rounded-xl border border-orange-100 bg-orange-50 p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <i class="pi pi-clock text-orange-500" />
          </div>
          <div>
            <p class="text-2xl font-bold text-orange-600">{{ stats.alerta_7_dias ?? '—' }}</p>
            <p class="text-xs font-medium text-orange-500">Más de 7 días abiertas</p>
          </div>
        </div>
        <div class="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <i class="pi pi-check-circle text-blue-500" />
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">
              {{ stats.cumplimiento_sla_pct != null ? `${stats.cumplimiento_sla_pct}%` : '—' }}
            </p>
            <p class="text-xs font-medium text-blue-500">Cumplimiento SLA (30 días)</p>
          </div>
        </div>
      </div>

      <!-- Tabla de fallas activas -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-gray-700">Fallas sin resolver</h3>
          <Tag :value="`${fallas.length}`" severity="danger" class="text-xs" />
          <span class="text-xs text-gray-400 ml-1">ordenadas por antigüedad</span>
        </div>

        <div v-if="fallas.length === 0"
          class="flex flex-col items-center py-12 gap-2 text-gray-400">
          <i class="pi pi-check-circle text-green-400 text-3xl" />
          <p class="text-sm">No hay fallas activas.</p>
        </div>

        <DataTable v-else :value="fallas" size="small" stripedRows :rowHover="true"
          :paginator="fallas.length > 20" :rows="20" class="text-sm"
          scrollable scrollHeight="520px">

          <Column field="codigo_interno" header="Código" style="min-width:100px">
            <template #body="{ data }">
              <RouterLink :to="`/fallas/${data.id}`"
                class="text-blue-600 hover:underline font-mono text-xs font-semibold">
                {{ data.codigo_interno }}
              </RouterLink>
            </template>
          </Column>

          <Column header="Proyecto" style="min-width:180px">
            <template #body="{ data }">
              <RouterLink :to="`/proyectos/${data.proyecto_id}`"
                class="text-gray-700 hover:text-blue-600 text-xs">
                {{ data.proyecto?.nombre_comercial || '—' }}
              </RouterLink>
            </template>
          </Column>

          <Column header="Estado" style="min-width:110px">
            <template #body="{ data }">
              <span class="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5"
                :style="data.estado.color_hex
                  ? `background:${data.estado.color_hex}22; color:${data.estado.color_hex}`
                  : 'background:#f3f4f6; color:#6b7280'">
                {{ data.estado.nombre }}
              </span>
            </template>
          </Column>

          <Column header="Prioridad" style="min-width:100px">
            <template #body="{ data }">
              <span class="inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5"
                :style="data.prioridad.color_hex
                  ? `background:${data.prioridad.color_hex}22; color:${data.prioridad.color_hex}`
                  : 'background:#f3f4f6; color:#6b7280'">
                {{ data.prioridad.nombre }}
              </span>
            </template>
          </Column>

          <Column header="Descripción" style="min-width:220px">
            <template #body="{ data }">
              <span class="text-xs text-gray-600 line-clamp-2">{{ data.descripcion }}</span>
            </template>
          </Column>

          <Column header="Días abierta" style="min-width:100px" sortable field="dias_abierta">
            <template #body="{ data }">
              <span :class="[
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                data.dias_abierta >= 30 ? 'bg-red-100 text-red-600' :
                data.dias_abierta >= 7  ? 'bg-orange-100 text-orange-600' :
                'bg-gray-100 text-gray-600'
              ]">
                {{ data.dias_abierta ?? 0 }} días
              </span>
            </template>
          </Column>

          <Column header="" style="width:50px">
            <template #body="{ data }">
              <RouterLink :to="`/fallas/${data.id}`">
                <Button icon="pi pi-arrow-right" text size="small" severity="secondary" />
              </RouterLink>
            </template>
          </Column>

        </DataTable>
      </div>
    </template>

    <!-- ═══ TAB 1: MGS Minigranjas ═══ -->
    <template v-if="!loading && activeTab === 1">
      <!-- MGS Status cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3" v-if="mgsStatus?.summary?.status_counts">
        <div v-for="card in mgsCards" :key="card.label"
          class="rounded-xl border p-3" :style="`border-color:${card.color}33; background:${card.color}08`">
          <p class="text-2xl font-bold" :style="`color:${card.color}`">{{ card.value }}</p>
          <p class="text-xs font-medium mt-0.5" :style="`color:${card.color}cc`">{{ card.label }}</p>
        </div>
      </div>

      <div v-if="!mgsStatus" class="flex flex-col items-center py-12 gap-2 text-gray-400">
        <i class="pi pi-server text-3xl" />
        <p class="text-sm">MGS no disponible. Verifique la configuración de Quoia.</p>
      </div>

      <template v-else>
        <!-- Last poll info + force poll -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">
            Último poll: {{ mgsStatus.last_poll ? new Date(mgsStatus.last_poll).toLocaleString('es-CO') : 'nunca' }}
          </span>
          <Button label="Forzar Poll" icon="pi pi-refresh" size="small" severity="secondary"
            :loading="polling" @click="forcePoll" />
        </div>

        <!-- Active alarms -->
        <div v-if="mgsStatus.active_alarms?.length" class="space-y-3">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-700">Alarmas activas</h3>
            <Tag :value="`${mgsStatus.active_alarms.length}`" severity="danger" class="text-xs" />
          </div>

          <div v-for="alarm in mgsStatus.active_alarms" :key="alarm.timestamp"
            class="rounded-lg border p-3 flex items-start gap-3"
            :class="alarm.severity === 'CRITICAL' ? 'border-red-200 bg-red-50' :
                    alarm.severity === 'WARNING' ? 'border-orange-200 bg-orange-50' :
                    'border-blue-200 bg-blue-50'">
            <i :class="[
              'pi text-sm mt-0.5',
              alarm.severity === 'CRITICAL' ? 'pi-times-circle text-red-500' :
              alarm.severity === 'WARNING' ? 'pi-exclamation-triangle text-orange-500' :
              'pi-info-circle text-blue-500'
            ]" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-800">{{ alarm.node_name }}</span>
                <span :class="[
                  'text-[10px] font-semibold rounded-full px-1.5 py-0.5',
                  alarm.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                  alarm.severity === 'WARNING' ? 'bg-orange-100 text-orange-600' :
                  'bg-blue-100 text-blue-600'
                ]">{{ alarm.alarm_type.replace('_', ' ') }}</span>
              </div>
              <p class="text-xs text-gray-600 mt-0.5">{{ alarm.details }}</p>
            </div>
          </div>
        </div>

        <!-- Plants table -->
        <div class="space-y-3">
          <h3 class="font-semibold text-gray-700">Plantas monitoreadas</h3>

          <DataTable :value="mgsPlants" size="small" stripedRows :rowHover="true"
            :paginator="mgsPlants.length > 30" :rows="30" class="text-sm"
            scrollable scrollHeight="520px">

            <Column header="Estado" style="width:50px">
              <template #body="{ data }">
                <span class="inline-block w-3 h-3 rounded-full"
                  :style="`background:${statusColor(data.status)}`" />
              </template>
            </Column>

            <Column field="name" header="Proyecto" style="min-width:180px">
              <template #body="{ data }">
                <span class="text-xs font-medium text-gray-800">{{ data.name }}</span>
              </template>
            </Column>

            <Column field="status" header="Estado" style="min-width:90px">
              <template #body="{ data }">
                <span :class="[
                  'text-xs font-semibold rounded-full px-2 py-0.5',
                  data.status === 'OK' ? 'bg-green-100 text-green-700' :
                  data.status === 'WARNING' ? 'bg-orange-100 text-orange-600' :
                  data.status === 'ERROR' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-500'
                ]">{{ data.status }}</span>
              </template>
            </Column>

            <Column field="kwh" header="kWh" style="min-width:80px">
              <template #body="{ data }">
                <span class="font-mono text-xs" :class="data.kwh > 0 ? 'text-green-600' : 'text-gray-400'">
                  {{ data.kwh?.toLocaleString() ?? 0 }}
                </span>
              </template>
            </Column>

            <Column header="Inversores" style="min-width:160px">
              <template #body="{ data }">
                <span v-if="data.inverter_obs" class="text-xs text-orange-600 font-medium">
                  {{ data.inverter_obs }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </template>
            </Column>

          </DataTable>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import api from '@/api/client'

const TABS = ['Fallas', 'MGS Minigranjas']
const activeTab = ref(0)
const loading = ref(true)
const polling = ref(false)

const stats = ref({})
const fallas = ref([])
const mgsStatus = ref(null)
const mgsPlants = ref([])

onMounted(async () => {
  try {
    const [statsRes, fallasRes, mgsRes, plantsRes] = await Promise.all([
      api.get('/fallas/stats/resumen'),
      api.get('/fallas', { params: { size: 500 } }),
      api.get('/mgs/status').catch(() => null),
      api.get('/mgs/plants').catch(() => null),
    ])
    stats.value = statsRes.data

    const items = fallasRes.data.items ?? fallasRes.data
    fallas.value = items
      .filter(f => !f.estado?.es_estado_final)
      .sort((a, b) => (b.dias_abierta ?? 0) - (a.dias_abierta ?? 0))

    if (mgsRes?.data) mgsStatus.value = mgsRes.data
    if (plantsRes?.data) mgsPlants.value = plantsRes.data
  } catch (e) {
    console.error('Error cargando alertas de monitoreo:', e)
  } finally {
    loading.value = false
  }
})

async function forcePoll() {
  polling.value = true
  try {
    await api.post('/mgs/poll')
    const [mgsRes, plantsRes] = await Promise.all([
      api.get('/mgs/status'),
      api.get('/mgs/plants'),
    ])
    mgsStatus.value = mgsRes.data
    mgsPlants.value = plantsRes.data
  } catch (e) {
    console.error('Error en poll MGS:', e)
  } finally {
    polling.value = false
  }
}

const mgsCards = computed(() => {
  const c = mgsStatus.value?.summary?.status_counts
  if (!c) return []
  return [
    { label: 'Operando', value: c.OK ?? 0, color: '#10B981' },
    { label: 'Advertencia', value: c.WARNING ?? 0, color: '#F59E0B' },
    { label: 'Sin datos', value: c.NO_DATA ?? 0, color: '#6B7280' },
    { label: 'Error', value: c.ERROR ?? 0, color: '#EF4444' },
  ]
})

function statusColor(status) {
  return { OK: '#10B981', WARNING: '#F59E0B', ERROR: '#EF4444', NO_DATA: '#9CA3AF' }[status] || '#D1D5DB'
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:deep(.p-datatable .p-datatable-thead th) {
  background: #faf9fb;
  color: #6b7280;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.5rem 0.75rem;
}
:deep(.p-datatable .p-datatable-tbody td) {
  padding: 0.4rem 0.75rem;
}
</style>
