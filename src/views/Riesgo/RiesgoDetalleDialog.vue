<template>
  <!-- Desglose del riesgo de un proyecto: qué respalda (garantías) vs. qué debe
       (líneas de la liquidación del período). Compartido por Riesgo Vivo y Garantías. -->
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)"
          header="Detalle de riesgo" modal class="w-full max-w-3xl">
    <div v-if="riesgo" class="space-y-5">
      <!-- Encabezado -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-lg font-bold" style="color: #2C2039;">{{ riesgo.proyecto_nombre }}</p>
          <p class="text-xs" style="color: #6b5a8a;">Exposición del período {{ formatPeriodo(periodo) }}</p>
        </div>
        <Tag :value="NIVEL_LABEL[riesgo.nivel]" :severity="nivelSeverity(riesgo.nivel)" />
      </div>

      <!-- Cobertura -->
      <div class="rounded-xl p-4" style="background: #FAF8FD; border: 1px solid #e8e0f0;">
        <div class="flex items-end justify-between mb-2">
          <div>
            <p class="text-xs uppercase font-semibold" style="color: #6b5a8a;">Cobertura</p>
            <p class="text-3xl font-bold" :style="{ color: NIVEL_COLOR[riesgo.nivel] }">
              {{ riesgo.cobertura_pct == null ? 'n/a' : `${riesgo.cobertura_pct.toFixed(0)} %` }}
            </p>
          </div>
          <div v-if="riesgo.deficit_cop > 0" class="text-right">
            <p class="text-xs uppercase font-semibold" style="color: #6b5a8a;">Déficit</p>
            <p class="text-lg font-bold" style="color: #D64455;">{{ formatCurrency(riesgo.deficit_cop) }}</p>
          </div>
        </div>
        <div class="h-2.5 rounded-full overflow-hidden" style="background: #ece4f5;">
          <div class="h-full rounded-full"
               :style="{ width: anchoBarra, background: NIVEL_COLOR[riesgo.nivel] }" />
        </div>
        <div class="flex justify-between mt-2 text-xs">
          <span style="color: #915BD8;">Garantía {{ formatCurrency(riesgo.saldo_efectivo_cop) }}</span>
          <span style="color: #6b5a8a;">Exposición {{ formatCurrency(riesgo.exposicion_cop) }}</span>
        </div>
      </div>

      <!-- Garantías que respaldan -->
      <div>
        <p class="text-xs font-semibold uppercase mb-2" style="color: #6b5a8a;">
          Garantías del proyecto ({{ riesgo.garantias.length }})
        </p>
        <div v-if="riesgo.garantias.length" class="space-y-1.5">
          <div v-for="g in riesgo.garantias" :key="g.id"
               class="flex items-center justify-between text-sm px-3 py-2 rounded-lg"
               :style="respalda(g) ? 'background:#fafafa;' : 'background:#FEF2F2;'">
            <div class="flex items-center gap-2 min-w-0">
              <Tag :value="TIPO_LABELS[g.tipo] || g.tipo" severity="secondary" />
              <span class="truncate" style="color: #6b5a8a;">{{ g.entidad || 'Sin entidad' }}</span>
              <Tag v-if="!respalda(g)" value="No respalda" severity="danger"
                   v-tooltip.top="'Vencida, liberada o aún en proceso: no suma al saldo efectivo'" />
            </div>
            <div class="text-right shrink-0">
              <span class="font-semibold tabular-nums" :style="{ color: respalda(g) ? '#2C2039' : '#9b8fb0' }">
                {{ formatCurrency(g.valor_cop) }}
              </span>
              <p class="text-[11px]" style="color: #6b5a8a;">
                Vence {{ formatFechaVencimiento(g.fecha_vencimiento) }}
              </p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm px-3 py-3 rounded-lg" style="background: #FEF2F2; color: #D64455;">
          Este proyecto no tiene ninguna garantía registrada que respalde su exposición ante XM.
        </p>
      </div>

      <!-- Desglose de la liquidación que genera la exposición -->
      <div>
        <p class="text-xs font-semibold uppercase mb-2" style="color: #6b5a8a;">
          Liquidación que genera la exposición
        </p>
        <div v-if="riesgo.panel" class="rounded-lg overflow-hidden" style="border: 1px solid #e8e0f0;">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left" style="background: #FAF8FD; color: #6b5a8a;">
                <th class="px-3 py-2 text-xs font-semibold">Inversionista</th>
                <th class="px-3 py-2 text-xs font-semibold text-right">Ingresos</th>
                <th class="px-3 py-2 text-xs font-semibold text-right">Comercialización / bolsa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(inv, i) in inversionistas" :key="i" class="border-t" style="border-color: #f0ebf6;">
                <td class="px-3 py-2" style="color: #2C2039;">{{ inv.nombre }}</td>
                <td class="px-3 py-2 text-right tabular-nums" style="color: #6b5a8a;">{{ formatCurrency(inv.ingresos) }}</td>
                <td class="px-3 py-2 text-right tabular-nums font-semibold" style="color: #D64455;">
                  {{ formatCurrency(inv.comercializacion) }}
                </td>
              </tr>
              <tr class="border-t font-bold" style="border-color: #e8e0f0; background: #FAF8FD;">
                <td class="px-3 py-2" style="color: #2C2039;">Exposición ante XM</td>
                <td class="px-3 py-2"></td>
                <td class="px-3 py-2 text-right tabular-nums" style="color: #D64455;">
                  {{ formatCurrency(riesgo.exposicion_cop) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!inversionistas.length" class="px-3 py-2 text-[11px]" style="color: #9b8fb0;">
            El panel no trae desglose por inversionista: la exposición se estima con el total de costos del período.
          </p>
        </div>
        <p v-else class="text-sm px-3 py-3 rounded-lg" style="background: #f3f0f7; color: #6b5a8a;">
          Sin panel contable en {{ formatPeriodo(periodo) }}: no hay exposición registrada para este proyecto.
        </p>
      </div>
    </div>

    <template #footer>
      <Button v-if="riesgo?.liquidacion_id" label="Ver liquidación" icon="pi pi-external-link"
              severity="secondary" @click="irALiquidacion" />
      <Button label="Cerrar" text @click="$emit('update:visible', false)" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { NIVEL_COLOR, NIVEL_LABEL, nivelSeverity, saldoEfectivoGarantia } from '@/utils/riskEngine'
import { formatCurrency, formatFechaVencimiento } from '@/utils/financialCalculations'
import { formatPeriodo } from '@/utils/liquidaciones'

const props = defineProps({
  visible: { type: Boolean, default: false },
  riesgo: { type: Object, default: null },
  periodo: { type: String, default: '' },
})
const emit = defineEmits(['update:visible'])

const router = useRouter()

// Mismas etiquetas que la vista de Garantías (los tipos vienen del enum del backend).
const TIPO_LABELS = {
  cuenta_custodia: 'Cuenta custodia',
  poliza: 'Póliza',
  carta_credito: 'Carta de crédito',
  fiducia: 'Fiducia',
  otro: 'Otro',
}

/** ¿Esta garantía suma al saldo efectivo? (vigente/en renovación y sin vencer) */
const respalda = (g) => saldoEfectivoGarantia(g) > 0

const anchoBarra = computed(() => {
  const pct = props.riesgo?.cobertura_pct
  if (pct == null) return '0%'
  return `${Math.max(0, Math.min(100, pct))}%`
})

const inversionistas = computed(() => {
  const invs = props.riesgo?.panel?.inversionistas || []
  return invs.map(inv => ({
    nombre: inv.cliente_nombre || inv.nombre || '—',
    ingresos: inv.grupos_totales?.ingresos ?? 0,
    comercializacion: Math.abs(inv.grupos_totales?.comercializacion ?? 0),
  }))
})

function irALiquidacion() {
  emit('update:visible', false)
  router.push(`/liquidaciones/${props.riesgo.liquidacion_id}`)
}
</script>
