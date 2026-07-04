<template>
  <div class="space-y-4">
    <!-- Encabezado + acción masiva -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-bold" style="color:#2C2039">Sincronización de fronteras</h3>
        <p class="text-xs" style="color:#9b8fb0">
          {{ fronteras.length }} fronteras · {{ conProblemas.length }} requieren atención
        </p>
      </div>
      <Button icon="pi pi-sync" label="Sincronizar Todas" size="small" :loading="syncing"
              :disabled="!fronteras.length || useMock"
              style="background:#915BD8; border-color:#915BD8;"
              @click="sincronizarTodas" />
    </div>

    <SimuladoBanner :activo="useMock">
      <strong>Modo demo.</strong> El backend de sincronización aún no existe: la
      sincronización está deshabilitada y los estados operacionales y medidores
      mostrados son datos de ejemplo, no lecturas reales de Quoia.
    </SimuladoBanner>

    <!-- Aviso de fronteras con problemas -->
    <div v-if="conProblemas.length" class="rounded-lg px-3 py-2 text-xs"
         style="background:rgba(214,68,85,0.08); color:#D64455; border:1px solid rgba(214,68,85,0.2);">
      <i class="pi pi-exclamation-triangle mr-1" />
      {{ conProblemas.length }} frontera(s) sin datos de generación o sin medidor Quoia asociado.
      La sincronización puede no traer datos hasta corregir su configuración.
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border:1px solid #e8e0f0;">
      <DataTable :value="fronteras" :paginator="fronteras.length > 15" :rows="15"
                 responsiveLayout="scroll" stripedRows class="p-datatable-sm">
        <Column header="Frontera" style="min-width:200px">
          <template #body="{ data }">
            <div>
              <p class="text-sm font-semibold" style="color:#2C2039">{{ data.nombre_frontera || '—' }}</p>
              <p class="font-mono text-[11px]" style="color:#915BD8">{{ data.codigo_frontera || '—' }}</p>
            </div>
          </template>
        </Column>
        <Column header="Estado operacional" style="min-width:150px">
          <template #body="{ data }">
            <span v-if="data.estado_operacional" class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :style="opStyle(data.estado_operacional)">
              {{ opLabel(data.estado_operacional) }}
            </span>
            <span v-else class="text-xs px-2 py-0.5 rounded-full font-semibold" :style="opStyle('sin_datos')">
              Sin datos
            </span>
          </template>
        </Column>
        <Column header="Medidor Quoia" style="min-width:150px">
          <template #body="{ data }">
            <span v-if="data.quoia_meter_id" class="font-mono text-xs" style="color:#6b5a8a;">
              {{ data.quoia_meter_id }}
            </span>
            <span v-else class="text-xs font-semibold" style="color:#D64455;">
              <i class="pi pi-times-circle mr-1" />Sin medidor
            </span>
          </template>
        </Column>
        <Column header="Último sync" style="min-width:150px">
          <template #body="{ data }">
            <span class="text-xs" style="color:#6b5a8a;">{{ fmtSync(lastSync[data.id] || data.sincronizado_en) }}</span>
          </template>
        </Column>
        <Column header="" style="width:120px">
          <template #body="{ data }">
            <Button icon="pi pi-sync" label="Sync" size="small" text
                    :loading="rowSyncing === data.id" :disabled="useMock" @click="sincronizarUna(data)" />
          </template>
        </Column>
        <template #empty>
          <p class="text-center text-gray-400 py-4 text-xs">Sin fronteras para sincronizar.</p>
        </template>
      </DataTable>
    </div>

    <!-- Modal de progreso de sincronización masiva -->
    <Dialog v-model:visible="showProgress" modal :closable="false" :draggable="false"
            header="Sincronizando fronteras" class="w-full max-w-md">
      <div class="space-y-3 pt-2">
        <ProgressBar :value="progresoPct" />
        <p class="text-sm text-center" style="color:#6b5a8a;">
          {{ progreso.done }} / {{ progreso.total }} fronteras procesadas
        </p>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ProgressBar from 'primevue/progressbar'
import SimuladoBanner from '@/components/SimuladoBanner.vue'
import { syncFronteras } from '@/services/rendimientoService'

const props = defineProps({
  fronteras: { type: Array, default: () => [] },
  useMock: { type: Boolean, default: true },
})
const emit = defineEmits(['synced'])

const toast = useToast()
const syncing = ref(false)
const rowSyncing = ref(null)
const showProgress = ref(false)
const lastSync = reactive({})
const progreso = reactive({ done: 0, total: 0 })

const progresoPct = computed(() =>
  progreso.total ? Math.round((progreso.done / progreso.total) * 100) : 0,
)

const conProblemas = computed(() =>
  props.fronteras.filter(f => f.estado_operacional === 'sin_datos' || !f.quoia_meter_id),
)

function opLabel(v) {
  const map = { normal: 'Normal', degradada: 'Degradada', sin_datos: 'Sin datos', fuera_servicio: 'Fuera de servicio' }
  return map[v] || v
}
function opStyle(v) {
  const map = {
    normal: 'background: rgba(16,185,129,0.12); color: #10B981;',
    degradada: 'background: rgba(240,192,64,0.12); color: #CA8A04;',
    sin_datos: 'background: rgba(214,68,85,0.12); color: #D64455;',
    fuera_servicio: 'background: rgba(156,163,175,0.12); color: #6B7280;',
  }
  return map[v] || 'color:#6b5a8a;'
}

function fmtSync(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(v).slice(0, 16).replace('T', ' ')
  }
}

async function sincronizarTodas() {
  // Anti-fabricación: en modo demo no hay backend que sincronizar, así que no
  // emitimos un éxito falso ni estampamos un "Último sync" real. El botón ya
  // está deshabilitado; esto es el cinturón de seguridad.
  if (!props.fronteras.length || props.useMock) return
  syncing.value = true
  showProgress.value = true
  progreso.total = props.fronteras.length
  progreso.done = 0
  try {
    // Se procesa en bloque, pero animamos el progreso para dar retroalimentación.
    const ids = props.fronteras.map(f => f.id)
    const paso = Math.max(1, Math.round(ids.length / 10))
    const timer = setInterval(() => {
      progreso.done = Math.min(progreso.total, progreso.done + paso)
    }, 80)
    const res = await syncFronteras(ids, { useMock: props.useMock })
    clearInterval(timer)
    progreso.done = progreso.total
    const stamp = res.sincronizado_en
    for (const id of ids) lastSync[id] = stamp
    toast.add({
      severity: res.errores?.length ? 'warn' : 'success',
      summary: 'Sincronización completada',
      detail: `${res.sincronizadas} fronteras sincronizadas${res.errores?.length ? `, ${res.errores.length} con errores` : ''}.`,
      life: 3500,
    })
    emit('synced', res)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error de sincronización', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    syncing.value = false
    showProgress.value = false
  }
}

async function sincronizarUna(frontera) {
  if (props.useMock) return  // demo: sin backend real, no fabricar sync
  rowSyncing.value = frontera.id
  try {
    const res = await syncFronteras([frontera.id], { useMock: props.useMock })
    lastSync[frontera.id] = res.sincronizado_en
    toast.add({ severity: 'success', summary: 'Frontera sincronizada', detail: frontera.nombre_frontera, life: 2500 })
    emit('synced', res)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    rowSyncing.value = null
  }
}
</script>
