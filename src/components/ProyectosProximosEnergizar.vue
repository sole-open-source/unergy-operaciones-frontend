<template>
  <div class="rounded-xl border" style="border-color: rgba(44,32,57,0.12); background: white;">

    <!-- Header -->
    <div class="px-5 py-4 flex items-center justify-between gap-3" style="border-bottom: 1px solid rgba(44,32,57,0.10);">
      <div class="flex items-center gap-2">
        <i class="pi pi-bolt" style="color: #F0C040;" />
        <div>
          <h2 class="text-base font-bold" style="color: #2C2039;">Proyectos próximos a energizarse</h2>
          <p class="text-xs mt-0.5" style="color: #7a6e8a;">
            Sincronizado desde TSF/Solenium · proyección mensual prorrateada desde la fecha de energización
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="lastSync" class="text-xs" style="color: rgba(44,32,57,0.45);">
          Última sync: {{ lastSync.toLocaleTimeString() }}
        </span>
        <Button
          icon="pi pi-sync"
          label="Sincronizar ahora"
          size="small"
          outlined
          :loading="syncing"
          @click="onSync(false)"
        />
        <Button
          icon="pi pi-replay"
          label="Re-sincronizar (sobrescribir mis cambios)"
          size="small"
          severity="warn"
          :loading="syncing"
          @click="onSync(true)"
        />
      </div>
    </div>

    <!-- Aviso de origen de datos (config faltante / fuente caída) -->
    <div v-if="warning" class="mx-3 mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
      style="background: rgba(240,192,64,0.12); border: 1px solid rgba(240,192,64,0.35); color: #8a6d00;">
      <i class="pi pi-exclamation-triangle mt-0.5" />
      <span>{{ warning }}</span>
    </div>

    <!-- Sugerencias de vínculo pendientes (el sync no encontró match exacto, pero
         un proyecto existente se parece — necesitan confirmación humana) -->
    <div v-if="sugerencias.length" class="mx-3 mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
      style="background: rgba(145,91,216,0.10); border: 1px solid rgba(145,91,216,0.30); color: #6b3fa0;">
      <i class="pi pi-info-circle mt-0.5" />
      <span>
        {{ sugerencias.length }} posible{{ sugerencias.length !== 1 ? 's' : '' }} vínculo{{ sugerencias.length !== 1 ? 's' : '' }} con Sun Factory por confirmar.
        <button type="button" class="underline font-semibold" @click="sugerenciasVisible = true">Revisar</button>
      </span>
    </div>

    <!-- Table -->
    <div class="p-3 overflow-x-auto">
      <DataTable
        :value="projects"
        dataKey="id"
        size="small"
        stripedRows
        class="energ-table"
      >
        <template #empty>
          <div class="text-center py-8 text-sm" style="color: rgba(44,32,57,0.45);">
            <template v-if="loading">
              <i class="pi pi-spin pi-spinner" style="font-size:1.2rem; color:#915BD8;" />
              <p class="mt-2">Cargando proyectos del pipeline…</p>
            </template>
            <template v-else-if="warning">
              <i class="pi pi-database" style="font-size:1.4rem; color:#c4b8d4;" />
              <p class="mt-2">No se pudieron cargar los proyectos.</p>
              <p class="mt-1 text-xs" style="color: rgba(44,32,57,0.4);">Revisa el aviso de arriba (configuración / fuente de datos).</p>
            </template>
            <template v-else>
              Aún no hay proyectos en el pipeline. Revisa «Proyectos pendientes» en la pestaña Proyectos para traer nuevos desde TSF/Solenium.
            </template>
          </div>
        </template>

        <!-- Commercial name (editable) -->
        <Column header="Proyecto" frozen style="min-width: 180px;">
          <template #body="{ data }">
            <InputText
              :model-value="data.commercialName"
              @update:model-value="v => persistField(data, 'commercialName', v)"
              class="w-full"
            />
          </template>
        </Column>

        <!-- Origina project code (read-only) -->
        <Column header="Código" style="min-width: 170px;">
          <template #body="{ data }">
            <span class="text-xs font-mono" style="color: rgba(44,32,57,0.5);">{{ data.name || '—' }}</span>
          </template>
        </Column>

        <!-- Status (editable) -->
        <Column header="Estado" style="min-width: 170px;">
          <template #body="{ data }">
            <Select
              :model-value="data.status"
              @update:model-value="v => persistField(data, 'status', v)"
              :options="STATUS_OPTIONS"
              class="w-full"
            />
          </template>
        </Column>

        <!-- Energization date (editable → marca fecha como manual) -->
        <Column header="Energización" style="min-width: 160px;">
          <template #body="{ data }">
            <div class="flex items-center gap-1">
              <DatePicker
                :model-value="data.energizationDate"
                @update:model-value="v => persistField(data, 'energizationDate', v)"
                dateFormat="yy-mm-dd"
                showIcon
                class="w-full"
              />
              <i
                v-if="data.editadaManual"
                class="pi pi-pencil"
                style="color:#915BD8; font-size:0.7rem;"
                v-tooltip="'Fecha editada manualmente — el sync no la sobrescribe (usa Re-sincronizar para forzar)'"
              />
            </div>
          </template>
        </Column>

        <!-- Construction progress (Sun Factory, read-only) -->
        <Column header="% Obra" style="min-width: 110px;">
          <template #body="{ data }">
            <span v-if="data.avancePct != null" class="text-sm font-mono tabular-nums" style="color: #2C2039;">
              {{ Number(data.avancePct).toFixed(1) }}%
            </span>
            <span v-else class="text-sm" style="color: rgba(44,32,57,0.3);">—</span>
          </template>
        </Column>

        <!-- Linked PPA contracts (read-only — se gestionan en el flujo PPA) -->
        <Column header="Contratos" style="min-width: 200px;">
          <template #body="{ data }">
            <div v-if="data.contracts && data.contracts.length" class="flex flex-wrap gap-1">
              <span
                v-for="c in data.contracts" :key="c"
                class="inline-block px-2 py-0.5 rounded text-xs"
                style="background: rgba(145,91,216,0.12); color:#6b3fa0;"
              >{{ c }}</span>
            </div>
            <span v-else class="text-xs" style="color: rgba(44,32,57,0.3);">Sin contratos</span>
          </template>
        </Column>

        <!-- Expected monthly MWh (editable) -->
        <Column header="MWh / mes" style="min-width: 130px;">
          <template #body="{ data }">
            <InputNumber
              :model-value="data.monthlyMwh"
              @update:model-value="v => persistField(data, 'monthlyMwh', v)"
              :maxFractionDigits="2" :min="0" locale="en-US" class="w-full"
            />
          </template>
        </Column>

        <!-- Dynamic month columns -->
        <Column v-for="col in monthColumns" :key="col.field" :header="col.header" style="min-width: 96px; text-align: right;">
          <template #body="{ data }">
            <span
              class="inline-block px-2 py-0.5 rounded font-mono text-sm tabular-nums"
              :class="isProrated(data, col.year, col.month) ? 'bg-yellow-100 font-bold' : ''"
              :style="isProrated(data, col.year, col.month)
                ? 'background: rgba(240,192,64,0.22); color: #9a6700;'
                : calculateGeneration(data, col.year, col.month) > 0 ? 'color: #2C2039;' : 'color: rgba(44,32,57,0.3);'"
              v-tooltip="isProrated(data, col.year, col.month) ? 'Mes parcial — prorrateado desde la energización' : ''"
            >
              {{ calculateGeneration(data, col.year, col.month).toFixed(2) }}
            </span>
          </template>
        </Column>

        <!-- Actions -->
        <Column style="width: 56px; text-align: center;">
          <template #body="{ data }">
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmRemove(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialog: sugerencias de vínculo con Sun Factory -->
    <Dialog v-model:visible="sugerenciasVisible" header="Posibles vínculos con Sun Factory" modal class="w-full max-w-2xl">
      <p class="text-sm text-gray-600 mb-3">
        El sync no encontró un match exacto para estos proyectos de Sun Factory, pero encontró un
        proyecto existente con un nombre parecido. Para cada uno, responde: <b>¿es el mismo proyecto?</b>
        Si confirmas que sí, queda vinculado permanentemente y el sync ya no lo vuelve a duplicar.
      </p>
      <div v-if="!sugerencias.length" class="text-sm text-gray-400 py-6 text-center">
        No quedan sugerencias pendientes.
      </div>
      <div v-else class="space-y-3">
        <div v-for="sug in sugerencias" :key="sug.sunfactory_project_id + '-' + sug.candidato_id"
          class="flex items-center justify-between gap-3 p-3 rounded-lg border" style="border-color:#ECE7F2;">
          <div class="text-sm">
            <div><span class="text-gray-400">Sun Factory:</span> <b>{{ sug.sunfactory_nombre }}</b>
              <span v-if="sug.sunfactory_municipio" class="text-gray-400"> · {{ sug.sunfactory_municipio }}</span>
            </div>
            <div class="mt-0.5"><span class="text-gray-400">Proyecto existente:</span>
              <b>{{ sug.candidato_nombre }}</b> (ID {{ sug.candidato_id }})
              <span v-if="sug.candidato_municipio" class="text-gray-400"> · {{ sug.candidato_municipio }}</span>
            </div>
            <div v-if="sug.candidato_sunfactory_id_previo != null" class="mt-1 text-xs" style="color:#b45309;">
              <i class="pi pi-exclamation-triangle" style="font-size:0.7rem;" />
              Este proyecto ya había quedado confirmado antes como el ID {{ sug.candidato_sunfactory_id_previo }}
              de Sun Factory. Si confirmas que también es el {{ sug.sunfactory_project_id }}, ese ID anterior
              se reemplaza por este — puede ser que Sun Factory tenga el mismo proyecto duplicado con dos IDs.
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <Button label="No es el mismo" text severity="secondary" size="small"
              :disabled="vinculandoId === sug.candidato_id" @click="descartarSugerencia(sug)" />
            <Button label="Sí, es el mismo" size="small" :loading="vinculandoId === sug.candidato_id"
              @click="vincular(sug)" />
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import { useEnergizationProjects } from '@/composables/useEnergizationProjects'

const {
  projects, loading, warning, syncing, lastSync,
  loadProjects, persistField, removeProject, syncNow,
} = useEnergizationProjects()

const toast = useToast()
const sugerencias = ref([])
const sugerenciasVisible = ref(false)
const vinculandoId = ref(null)

const STATUS_OPTIONS = ['En construcción', 'Pruebas', 'Próximo a energizar', 'Energizado']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

onMounted(loadProjects)

async function onSync(force) {
  if (force && !window.confirm('Esto sobrescribirá las fechas que hayas editado manualmente con la información de Solenium. ¿Continuar?')) {
    return
  }
  const r = await syncNow(force)
  if (r) {
    const partes = [
      `Actualizados: ${r.actualizados ?? 0}`,
      r.sin_match ? `Sin vínculo (revisar en Proyectos › Proyectos pendientes): ${r.sin_match}` : null,
      r.errores ? `Errores: ${r.errores}` : null,
      `Fuente: ${r.fuente ?? 'sunfactory'}`,
    ].filter(Boolean)
    let msg = `Sincronización completa.\n${partes.join(' · ')}`
    if (Array.isArray(r.warnings) && r.warnings.length) {
      msg += `\n\nAvisos:\n- ${r.warnings.join('\n- ')}`
    }
    window.alert(msg)

    if (Array.isArray(r.sugerencias_vinculo) && r.sugerencias_vinculo.length) {
      sugerencias.value = r.sugerencias_vinculo
      sugerenciasVisible.value = true
    }
  }
}

async function vincular(sug) {
  if (sug.candidato_sunfactory_id_previo != null) {
    const ok = window.confirm(
      `"${sug.candidato_nombre}" ya había quedado confirmado antes como el ID ${sug.candidato_sunfactory_id_previo} de Sun Factory. ` +
      `¿Confirmas que también es el ID ${sug.sunfactory_project_id} (se reemplaza el anterior)?`
    )
    if (!ok) return
  }
  vinculandoId.value = sug.candidato_id
  try {
    await api.post(`/proyectos/${sug.candidato_id}/vincular-sunfactory/${sug.sunfactory_project_id}`)
    sugerencias.value = sugerencias.value.filter(s => s !== sug)
    toast.add({ severity: 'success', summary: 'Vinculado', detail: `${sug.candidato_nombre} vinculado a Sun Factory`, life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'No se pudo vincular', detail: e.response?.data?.detail || e.message, life: 5000 })
  } finally {
    vinculandoId.value = null
  }
}

function descartarSugerencia(sug) {
  // Solo la quita de esta lista local (no persiste "descartado"): si de verdad
  // es un proyecto distinto, el sync la va a volver a sugerir la próxima vez
  // que corra, hasta que alguien la vincule o cree el proyecto correcto a mano.
  sugerencias.value = sugerencias.value.filter(s => s !== sug)
}

function confirmRemove(project) {
  if (window.confirm(`¿Quitar "${project.commercialName}" de la lista? (se marcará como eliminado)`)) {
    removeProject(project.id)
  }
}

// Next 12 months starting from the current month.
const monthColumns = computed(() => {
  const cols = []
  const start = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1 // 1-based
    cols.push({
      field: `${year}-${String(month).padStart(2, '0')}`,
      header: `${MESES_CORTOS[month - 1]} ${year}`,
      year,
      month,
    })
  }
  return cols
})

// Prorated generation for a given column (year, 1-based month).
function calculateGeneration(project, year, month) {
  const ed = project.energizationDate instanceof Date
    ? project.energizationDate
    : new Date(project.energizationDate)
  if (!project.energizationDate || isNaN(ed.getTime())) return 0

  const eYear = ed.getFullYear()
  const eMonth = ed.getMonth() + 1 // 1-based
  const mwh = Number(project.monthlyMwh) || 0

  // Column month is before the energization month → not yet generating.
  if (year < eYear || (year === eYear && month < eMonth)) return 0

  // Same month as energization → prorate by operational days.
  if (year === eYear && month === eMonth) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const operationalDays = daysInMonth - ed.getDate() + 1
    return Math.round((operationalDays / daysInMonth) * mwh * 100) / 100
  }

  // After the energization month → full month.
  return mwh
}

// A value is prorated when it is the first (partial) month of operation.
function isProrated(project, year, month) {
  const ed = project.energizationDate instanceof Date
    ? project.energizationDate
    : new Date(project.energizationDate)
  if (!project.energizationDate || isNaN(ed.getTime())) return false
  return year === ed.getFullYear() && month === (ed.getMonth() + 1) && ed.getDate() > 1
}
</script>

<style scoped>
:deep(.energ-table .p-datatable-thead th) {
  background: rgba(44,32,57,0.05);
  color: #7a6e8a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 10px;
  white-space: nowrap;
}
:deep(.energ-table .p-datatable-tbody td) {
  padding: 6px 10px;
  font-size: 13px;
  color: #2C2039;
  vertical-align: middle;
}
</style>
