<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden mt-4" style="border:1px solid #e8e0f0">
    <div class="px-4 py-2 flex items-center justify-between" style="background:#f3f0f7">
      <span class="text-xs font-bold tracking-widest uppercase" style="color:#915BD8">Descuento de facturas</span>
      <span class="text-xs" style="color:#6b5a8a">{{ filas.length }} documento(s)</span>
    </div>

    <div class="overflow-x-auto">
      <table class="text-xs" style="table-layout:fixed; width:100%; min-width:880px">
        <colgroup>
          <col style="width:44px" />
          <col style="width:112px" />
          <col style="width:110px" />
          <col style="width:150px" />
          <col style="width:168px" />
          <col style="width:158px" />
          <col style="width:48px" />
          <col style="width:90px" />
        </colgroup>
        <thead>
          <tr class="bg-gray-50 border-b">
            <th class="px-3 py-2 text-center font-semibold" style="color:#6b5a8a">✓</th>
            <th class="px-3 py-2 text-left font-semibold" style="color:#6b5a8a">Número</th>
            <th class="px-3 py-2 text-left font-semibold" style="color:#6b5a8a">Tipo</th>
            <th class="px-3 py-2 text-left font-semibold" style="color:#6b5a8a">Concepto</th>
            <th class="px-3 py-2 text-right font-semibold" style="color:#6b5a8a">Valor Total</th>
            <th class="px-3 py-2 text-left font-semibold" style="color:#6b5a8a">Vencimiento</th>
            <th class="px-3 py-2 text-center font-semibold" style="color:#6b5a8a">Pág.</th>
            <th class="px-3 py-2 text-left font-semibold" style="color:#6b5a8a"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(f, idx) in filas" :key="idx" class="border-b last:border-b-0 hover:bg-gray-50/50">
            <td class="px-3 py-1.5 text-center">
              <Checkbox v-model="f.marcado" :binary="true" />
            </td>
            <td class="px-3 py-1.5 truncate" style="color:#2C2039" :title="f.numero ?? ''">{{ f.numero ?? '—' }}</td>
            <td class="px-3 py-1.5 truncate">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :style="f.descuenta ? 'background:#fde8ea;color:#D64455' : 'background:#dbeafe;color:#1d4ed8'">
                {{ f.tipo }}
              </span>
            </td>
            <td class="px-3 py-1.5 truncate" style="color:#6b5a8a" :title="f.concepto">{{ f.concepto }}</td>
            <td class="px-3 py-1.5">
              <div class="flex items-center gap-1">
                <span v-if="f.signo !== 0" class="text-xs font-bold shrink-0" :style="f.signo < 0 ? 'color:#10B981' : 'color:#D64455'">{{ f.signo < 0 ? '−' : '+' }}</span>
                <InputNumber v-model="f.valorTotal" :max-fraction-digits="2" :min-fraction-digits="0"
                  fluid inputClass="text-right text-xs" class="flex-1 min-w-0" />
              </div>
            </td>
            <td class="px-3 py-1.5">
              <input type="date" v-model="f.vencimiento"
                class="rounded px-2 py-1 text-xs w-full" style="border:1px solid #e8e0f0; box-sizing:border-box" />
            </td>
            <td class="px-3 py-1.5 text-center" style="color:#9ca3af">{{ f.pagina }}</td>
            <td class="px-3 py-1.5 truncate">
              <span v-if="f.warnings && f.warnings.length"
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style="background:#FEF3C7;color:#92400E"
                :title="warnText(f)">⚠ revisar</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pie -->
    <div class="px-4 py-3 grid grid-cols-3 gap-3 border-t" style="background:#f9f7fd">
      <div class="text-center">
        <p class="text-[10px] font-semibold uppercase tracking-wide" style="color:#6b5a8a">Disponible original</p>
        <p class="text-sm font-bold" style="color:#2C2039">{{ fmtCOP(disponible) }}</p>
      </div>
      <div class="text-center">
        <p class="text-[10px] font-semibold uppercase tracking-wide" style="color:#6b5a8a">Total a descontar (neto)</p>
        <p class="text-sm font-bold" style="color:#D64455">{{ fmtCOP(totalDescontado) }}</p>
        <p class="text-[9px]" style="color:#9ca3af">débitos suman · crédito/favor restan</p>
      </div>
      <div class="text-center">
        <p class="text-[10px] font-semibold uppercase tracking-wide" style="color:#6b5a8a">Disponible ajustado</p>
        <p class="text-sm font-bold" :style="disponibleAjustado < 0 ? 'color:#D64455' : 'color:#10B981'">{{ fmtCOP(disponibleAjustado) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import { fmtCOP } from './utils/formatters.js'
import { createDecimal, add, multiply, subtract, toNumber } from '@/utils/financialCalculations.js'

const props = defineProps({
  documentos: { type: Array, default: () => [] },
  disponible: { type: Number, default: 0 },
  fechaObjetivo: { type: String, default: '' },
})
const emit = defineEmits(['update:disponibleAjustado', 'update:totalDescontado'])

const WARN_MSG = {
  multiple_valor: 'Más de un "Valor Total" en la página — revisar',
  sin_valor: 'No se halló "Valor Total" — ingresar manual',
  sin_vencimiento: 'Sin fecha de vencimiento — ingresar manual',
  escaneada: 'Página escaneada (sin texto) — ingresar manual',
}

const filas = ref([])

function initFilas() {
  filas.value = props.documentos.map((d) => ({
    ...d,
    // Por defecto se marcan solo los DÉBITO (facturas) cuyo vencimiento sea exactamente la fecha objetivo.
    marcado: !!(d.descuenta && d.vencimiento && props.fechaObjetivo && d.vencimiento === props.fechaObjetivo),
  }))
}
watch(() => props.documentos, initFilas, { immediate: true })
watch(() => props.fechaObjetivo, initFilas)

// Total NETO: débitos/cargos suman (+), notas crédito y ajustes a favor restan (−).
// Aritmética con precisión decimal (decimal.js) para no acumular error al sumar.
const totalDescontado = computed(() =>
  toNumber(filas.value.filter((f) => f.marcado).reduce(
    (s, f) => add(s, multiply(f.valorTotal, f.signo ?? 1)), createDecimal(0))),
)
const disponibleAjustado = computed(() => toNumber(subtract(props.disponible, totalDescontado.value)))

watch([totalDescontado, disponibleAjustado], () => {
  emit('update:totalDescontado', totalDescontado.value)
  emit('update:disponibleAjustado', disponibleAjustado.value)
}, { immediate: true })

function warnText(f) {
  return (f.warnings || []).map((w) => WARN_MSG[w] || w).join(' · ')
}
</script>
