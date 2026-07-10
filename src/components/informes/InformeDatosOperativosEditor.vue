<!--
  InformeDatosOperativosEditor.vue
  Editor estructurado del campo `datos_operativos` de un informe.

  Uso:
    <InformeDatosOperativosEditor
      v-model="reportData"
      @update:valid="datosValidos = $event" />

  El componente trabaja sobre una copia local y emite el objeto completo por
  `update:modelValue` en cada cambio. Además emite `update:valid` (boolean) con
  el resultado de la validación básica en cliente.
-->
<template>
  <section class="doe">
    <!-- ── Generación ── -->
    <div class="doe-block">
      <h4 class="doe-title">⚡ Generación</h4>
      <div class="doe-grid">
        <label class="doe-field">
          <span class="doe-lbl">Generación real (MWh) *</span>
          <InputNumber
            v-model="local.generacion.real_mwh"
            :min="0"
            :maxFractionDigits="3"
            :class="{ 'p-invalid': hasError('Generación real') }"
            @update:modelValue="emitChange"
          />
        </label>
        <label class="doe-field">
          <span class="doe-lbl">Generación esperada (MWh) *</span>
          <InputNumber
            v-model="local.generacion.esperada_mwh"
            :min="0"
            :maxFractionDigits="3"
            :class="{ 'p-invalid': hasError('Generación esperada') }"
            @update:modelValue="emitChange"
          />
        </label>
        <label class="doe-field">
          <span class="doe-lbl">PR (%)</span>
          <InputNumber
            v-model="local.generacion.pr_pct"
            :min="0"
            :max="100"
            suffix=" %"
            :maxFractionDigits="2"
            :class="{ 'p-invalid': hasError('PR') }"
            @update:modelValue="emitChange"
          />
        </label>
        <label class="doe-field">
          <span class="doe-lbl">Disponibilidad (%)</span>
          <InputNumber
            v-model="local.generacion.disponibilidad_pct"
            :min="0"
            :max="100"
            suffix=" %"
            :maxFractionDigits="2"
            :class="{ 'p-invalid': hasError('Disponibilidad') }"
            @update:modelValue="emitChange"
          />
        </label>
      </div>
    </div>

    <!-- ── Precios ── -->
    <div class="doe-block">
      <h4 class="doe-title">💲 Precios e ingresos</h4>
      <div class="doe-grid">
        <label class="doe-field">
          <span class="doe-lbl">Precio de energía</span>
          <InputNumber
            v-model="local.precios.precio_energia"
            :min="0"
            :maxFractionDigits="2"
            :class="{ 'p-invalid': hasError('Precio de energía') }"
            @update:modelValue="emitChange"
          />
        </label>
        <label class="doe-field">
          <span class="doe-lbl">Moneda</span>
          <Select
            v-model="local.precios.moneda"
            :options="monedas"
            optionLabel="label"
            optionValue="value"
            @update:modelValue="emitChange"
          />
        </label>
        <label class="doe-field">
          <span class="doe-lbl">Ingreso estimado</span>
          <InputNumber
            v-model="local.precios.ingreso_estimado"
            :min="0"
            :maxFractionDigits="2"
            @update:modelValue="emitChange"
          />
        </label>
      </div>
    </div>

    <!-- ── Cumplimiento ── -->
    <div class="doe-block">
      <div class="doe-title-row">
        <h4 class="doe-title">✅ Métricas de cumplimiento</h4>
        <Button
          label="Añadir métrica"
          icon="pi pi-plus"
          size="small"
          text
          @click="addCumplimiento"
        />
      </div>

      <DataTable :value="local.cumplimiento" class="doe-table" size="small">
        <template #empty>
          <span class="doe-empty">Sin métricas de cumplimiento. Usa «Añadir métrica».</span>
        </template>

        <Column header="Métrica" style="min-width: 200px">
          <template #body="{ index }">
            <InputText
              v-model="local.cumplimiento[index].metrica"
              placeholder="Ej. HUNA, disponibilidad…"
              :class="{ 'p-invalid': !local.cumplimiento[index].metrica }"
              @update:modelValue="emitChange"
            />
          </template>
        </Column>

        <Column header="Objetivo" style="width: 140px">
          <template #body="{ index }">
            <InputNumber
              v-model="local.cumplimiento[index].objetivo"
              :maxFractionDigits="3"
              @update:modelValue="emitChange"
            />
          </template>
        </Column>

        <Column header="Real" style="width: 140px">
          <template #body="{ index }">
            <InputNumber
              v-model="local.cumplimiento[index].real"
              :maxFractionDigits="3"
              @update:modelValue="emitChange"
            />
          </template>
        </Column>

        <Column header="Unidad" style="width: 130px">
          <template #body="{ index }">
            <Select
              v-model="local.cumplimiento[index].unidad"
              :options="unidades"
              editable
              @update:modelValue="emitChange"
            />
          </template>
        </Column>

        <Column style="width: 52px">
          <template #body="{ index }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              @click="removeCumplimiento(index)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ── Observaciones ── -->
    <div class="doe-block">
      <h4 class="doe-title">📝 Observaciones operativas</h4>
      <Textarea
        v-model="local.observaciones"
        rows="3"
        autoResize
        class="doe-textarea"
        placeholder="Notas sobre la operación del periodo…"
        @update:modelValue="emitChange"
      />
    </div>
  </section>
</template>

<script setup>
import { reactive, watch } from 'vue'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import {
  normalizeDatosOperativos,
  emptyCumplimientoRow,
  validateDatosOperativosLocal,
} from './datosOperativos'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'update:valid'])

const monedas = [
  { label: 'COP', value: 'COP' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
]
const unidades = ['%', 'MWh', 'kWh', 'horas', 'días', 'número']

// Copia local reactiva (normalizada) sobre la que se edita.
const local = reactive(normalizeDatosOperativos(props.modelValue))

// Errores de validación en cliente, indexados para resaltar campos.
let currentErrors = []
function hasError(field) {
  return currentErrors.some((m) => m.field === field && m.severity === 'error')
}

function runValidation() {
  const { valid, messages } = validateDatosOperativosLocal(local)
  currentErrors = messages
  emit('update:valid', valid)
}

function emitChange() {
  runValidation()
  // Se emite una copia plana para desacoplar de la reactividad interna.
  emit('update:modelValue', JSON.parse(JSON.stringify(local)))
}

function addCumplimiento() {
  local.cumplimiento.push(emptyCumplimientoRow())
  emitChange()
}

function removeCumplimiento(index) {
  local.cumplimiento.splice(index, 1)
  emitChange()
}

// Si el padre reemplaza el objeto completo (p. ej. al cargar otro informe),
// re-sincronizamos la copia local.
watch(
  () => props.modelValue,
  (val) => {
    const next = normalizeDatosOperativos(val)
    local.generacion = next.generacion
    local.precios = next.precios
    local.cumplimiento = next.cumplimiento
    local.observaciones = next.observaciones
    runValidation()
  }
)

// Validación inicial.
runValidation()
</script>

<style scoped>
.doe {
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: 'Sora', sans-serif;
}
.doe-block {
  background: #362848;
  border: 1px solid #4a3560;
  border-radius: 12px;
  padding: 14px 16px;
}
.doe-title {
  font-size: 13px;
  font-weight: 800;
  color: #fdfaf7;
  margin: 0 0 12px;
  padding-left: 9px;
  border-left: 3px solid #915bd8;
}
.doe-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.doe-title-row .doe-title {
  margin-bottom: 0;
}
.doe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.doe-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.doe-lbl {
  font-size: 10px;
  font-weight: 700;
  color: #a89ec0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.doe-empty {
  font-size: 12px;
  color: #a89ec0;
}
.doe-textarea {
  width: 100%;
}
/* Los inputs PrimeVue ocupan todo el ancho de su celda/campo. */
.doe :deep(.p-inputnumber),
.doe :deep(.p-inputtext),
.doe :deep(.p-select) {
  width: 100%;
}
</style>
