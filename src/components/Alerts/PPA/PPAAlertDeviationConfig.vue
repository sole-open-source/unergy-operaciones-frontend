<template>
  <div class="space-y-5">
    <!-- Aviso: backend aún no disponible -->
    <div v-if="esMock" class="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <i class="pi pi-info-circle text-blue-500 mt-0.5" />
      <p class="text-xs text-blue-700">
        Los endpoints de reglas de desviación aún no están disponibles en el backend.
        Esta configuración opera en <b>modo de demostración</b>: las reglas se guardan
        temporalmente en memoria para validar la interfaz.
      </p>
    </div>

    <!-- Formulario de nueva/edición de regla -->
    <fieldset class="border border-gray-100 rounded-lg p-4 space-y-4">
      <legend class="text-xs font-semibold text-amber-600 uppercase tracking-wide px-1">
        {{ editando ? 'Editar regla' : 'Nueva regla de desviación' }}
      </legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="field-label">Contrato PPA <span class="text-red-400">*</span></label>
          <Select v-model="form.ppa_id" :options="ppasConLabel" optionLabel="_label" optionValue="id"
            placeholder="Seleccionar contrato PPA" class="w-full" filter showClear
            @change="onSelectPpa" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="field-label">Proyecto <span class="text-red-400">*</span></label>
          <Select v-model="form.proyecto_id" :options="proyectosFiltrados" optionLabel="nombre_comercial"
            optionValue="id" placeholder="Seleccionar proyecto" class="w-full" filter showClear
            :disabled="!form.ppa_id && proyectosFiltrados.length === 0" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="field-label">Umbral de desviación (%) <span class="text-red-400">*</span></label>
          <InputNumber v-model="form.umbral_desviacion_pct" :min="0" :max="100" suffix=" %"
            placeholder="Ej: 10" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="field-label">Período de comparación (horas) <span class="text-red-400">*</span></label>
          <InputNumber v-model="form.periodo_comparacion_horas" :min="1" :max="168" :useGrouping="false"
            suffix=" h" placeholder="Ej: 4" class="w-full" />
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <Button v-if="editando" label="Cancelar" severity="secondary" outlined size="small"
          @click="resetForm" />
        <Button :label="editando ? 'Guardar cambios' : 'Guardar regla'" icon="pi pi-check"
          size="small" :loading="guardando" @click="guardar" />
      </div>
    </fieldset>

    <!-- Reglas configuradas -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <i class="pi pi-sliders-h text-gray-500" />
        <h4 class="font-semibold text-gray-700 text-sm">Reglas configuradas</h4>
        <Tag :value="`${reglas.length}`" severity="secondary" class="text-xs" />
      </div>

      <div v-if="cargandoReglas" class="flex justify-center py-8"><ProgressSpinner style="width:36px;height:36px" /></div>

      <div v-else-if="reglas.length === 0" class="flex flex-col items-center py-8 gap-2 text-gray-400">
        <i class="pi pi-inbox text-3xl text-gray-300" />
        <p class="text-sm">No hay reglas de desviación configuradas.</p>
      </div>

      <DataTable v-else :value="reglas" size="small" stripedRows :rowHover="true" class="text-sm">
        <Column header="Contrato PPA" style="min-width:180px">
          <template #body="{ data }">{{ data.ppa_nombre || '—' }}</template>
        </Column>
        <Column header="Proyecto" style="min-width:160px">
          <template #body="{ data }">{{ data.proyecto_nombre || '—' }}</template>
        </Column>
        <Column header="Umbral" style="min-width:90px">
          <template #body="{ data }">{{ data.umbral_desviacion_pct }} %</template>
        </Column>
        <Column header="Período" style="min-width:90px">
          <template #body="{ data }">{{ data.periodo_comparacion_horas }} h</template>
        </Column>
        <Column header="" style="width:100px">
          <template #body="{ data }">
            <div class="flex justify-end">
              <Button icon="pi pi-pencil" text size="small" severity="secondary"
                v-tooltip.top="'Editar'" @click="abrirEditar(data)" />
              <Button icon="pi pi-trash" text size="small" severity="danger"
                v-tooltip.top="'Eliminar'" @click="confirmarEliminar(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ConfirmDialog group="deviation-rules" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import ConfirmDialog from 'primevue/confirmdialog'
import {
  getDeviationRules, createDeviationRule, updateDeviationRule, deleteDeviationRule, isMock,
} from '@/services/alertDeviationService'

const props = defineProps({
  ppas: { type: Array, default: () => [] },
  proyectos: { type: Array, default: () => [] },
})
// Notifica al padre (lista de alertas) que las reglas cambiaron, por si quiere refrescar.
const emit = defineEmits(['rules-changed'])

const toast = useToast()
const confirm = useConfirm()
const esMock = isMock()

const FORM_EMPTY = {
  ppa_id: null, proyecto_id: null, umbral_desviacion_pct: 10, periodo_comparacion_horas: 4,
}
const form = reactive({ ...FORM_EMPTY })
const editando = ref(null)
const guardando = ref(false)

const reglas = ref([])
const cargandoReglas = ref(true)

// PrimeVue Select espera un nombre de campo en optionLabel (no una función),
// así que precomputamos "_label" como hace GesconView con sus contratos.
const ppasConLabel = computed(() => props.ppas.map((p) => ({
  ...p,
  _label: `${p.numero_codigo_contrato || '(sin código)'} — ${p.nombre_interno || '(sin nombre)'}`,
})))

// Proyectos filtrados por el PPA seleccionado (un PPA pertenece a un proyecto).
// Si el PPA no trae proyecto_id, se muestran todos los proyectos.
const proyectosFiltrados = computed(() => {
  const ppa = props.ppas.find((p) => p.id === form.ppa_id)
  if (ppa && ppa.proyecto_id != null) {
    return props.proyectos.filter((pr) => pr.id === ppa.proyecto_id)
  }
  return props.proyectos
})

function onSelectPpa() {
  const ppa = props.ppas.find((p) => p.id === form.ppa_id)
  // Autoselecciona el proyecto del PPA cuando lo trae.
  if (ppa && ppa.proyecto_id != null) form.proyecto_id = ppa.proyecto_id
}

function resetForm() {
  Object.assign(form, FORM_EMPTY)
  editando.value = null
}

function abrirEditar(regla) {
  editando.value = regla.id
  form.ppa_id = regla.ppa_id ?? null
  form.proyecto_id = regla.proyecto_id ?? null
  form.umbral_desviacion_pct = regla.umbral_desviacion_pct ?? null
  form.periodo_comparacion_horas = regla.periodo_comparacion_horas ?? null
}

function validar() {
  if (!form.ppa_id) return 'Selecciona un contrato PPA.'
  if (!form.proyecto_id) return 'Selecciona un proyecto.'
  if (!(form.umbral_desviacion_pct > 0)) return 'El umbral de desviación debe ser mayor a 0.'
  if (!(form.periodo_comparacion_horas > 0)) return 'El período de comparación debe ser mayor a 0.'
  return null
}

async function guardar() {
  const error = validar()
  if (error) {
    toast.add({ severity: 'warn', summary: 'Datos incompletos', detail: error, life: 4000 })
    return
  }
  guardando.value = true
  try {
    const ppa = props.ppas.find((p) => p.id === form.ppa_id)
    const proyecto = props.proyectos.find((pr) => pr.id === form.proyecto_id)
    const payload = {
      ppa_id: form.ppa_id,
      ppa_nombre: ppa ? (ppa.nombre_interno || ppa.numero_codigo_contrato) : null,
      proyecto_id: form.proyecto_id,
      proyecto_nombre: proyecto ? proyecto.nombre_comercial : null,
      umbral_desviacion_pct: form.umbral_desviacion_pct,
      periodo_comparacion_horas: form.periodo_comparacion_horas,
    }

    if (editando.value) {
      await updateDeviationRule(editando.value, payload)
      toast.add({ severity: 'success', summary: 'Regla actualizada', life: 3000 })
    } else {
      await createDeviationRule(payload)
      toast.add({ severity: 'success', summary: 'Regla creada', life: 3000 })
    }
    resetForm()
    await cargarReglas()
    emit('rules-changed')
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al guardar la regla',
      detail: e.response?.data?.detail || e.message,
      life: 5000,
    })
  } finally {
    guardando.value = false
  }
}

function confirmarEliminar(regla) {
  confirm.require({
    group: 'deviation-rules',
    message: `¿Eliminar la regla del contrato "${regla.ppa_nombre || 'sin nombre'}"?`,
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptSeverity: 'danger',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    accept: async () => {
      try {
        await deleteDeviationRule(regla.id)
        reglas.value = reglas.value.filter((r) => r.id !== regla.id)
        if (editando.value === regla.id) resetForm()
        toast.add({ severity: 'success', summary: 'Regla eliminada', life: 2000 })
        emit('rules-changed')
      } catch (e) {
        toast.add({
          severity: 'error',
          summary: 'No se pudo eliminar',
          detail: e.response?.data?.detail || e.message,
          life: 5000,
        })
      }
    },
  })
}

async function cargarReglas() {
  cargandoReglas.value = true
  try {
    reglas.value = await getDeviationRules()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error al cargar reglas',
      detail: e.response?.data?.detail || e.message,
      life: 5000,
    })
    reglas.value = []
  } finally {
    cargandoReglas.value = false
  }
}

onMounted(cargarReglas)
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600; }
</style>
