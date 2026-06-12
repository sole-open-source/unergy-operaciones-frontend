<template>
  <div class="space-y-5">
    <!-- Stepper header -->
    <div class="flex items-center gap-0">
      <template v-for="(step, idx) in steps" :key="step.key">
        <div class="flex items-center gap-2">
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
            :style="stepCircleStyle(idx)"
          >{{ idx + 1 }}</div>
          <span class="text-sm font-medium" :style="activeStep >= idx ? 'color:#915BD8' : 'color:#9ca3af'">
            {{ step.label }}
          </span>
        </div>
        <div v-if="idx < steps.length - 1" class="flex-1 mx-3 h-px" style="background:#e8e0f0; min-width:24px" />
      </template>
    </div>

    <!-- Step 1: Cargar -->
    <div v-show="activeStep === 0" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1">
          <p class="text-xs font-semibold" style="color:#6b5a8a">Garantía Semanal Mensual</p>
          <DropZone
            label="Garantía Semanal Mensual"
            :pattern="PATTERNS.garantia"
            @update:file="files.garantia = $event"
          />
        </div>
        <div class="space-y-1">
          <p class="text-xs font-semibold" style="color:#6b5a8a">Saldo Cuenta Custodia</p>
          <DropZone
            label="Saldo Cuenta Custodia"
            :pattern="PATTERNS.saldo"
            @update:file="files.saldo = $event"
          />
        </div>
        <div class="space-y-1">
          <p class="text-xs font-semibold" style="color:#6b5a8a">WEB Garantías</p>
          <DropZone
            label="WEB Garantías"
            :pattern="PATTERNS.web"
            @update:file="files.web = $event"
          />
        </div>
      </div>

      <div class="space-y-1">
        <p class="text-xs font-semibold" style="color:#6b5a8a">Facturas XM (PDF) — opcional</p>
        <label class="border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer text-xs"
          style="border-color:#c4b8d4;background:#fafafa;color:#6b5a8a">
          <i class="pi pi-file-pdf" style="color:#D64455" />
          <span v-if="!files.pdfs.length">Arrastra o haz clic para subir uno o varios PDF</span>
          <span v-else>{{ files.pdfs.length }} PDF(s) seleccionado(s)</span>
          <input type="file" accept=".pdf" multiple class="hidden" @change="onPdfsSelect" />
        </label>
      </div>

      <div v-if="parseErrors.length" class="rounded-lg p-3 space-y-1" style="background:#FEF2F2; border:1px solid rgba(214,68,85,0.2)">
        <p v-for="e in parseErrors" :key="e" class="text-xs" style="color:#D64455">{{ e }}</p>
      </div>

      <div class="flex justify-end">
        <Button
          label="Procesar"
          icon="pi pi-bolt"
          :loading="loading"
          :disabled="!allFilesLoaded"
          @click="procesar"
          style="background:#915BD8;border-color:#915BD8"
        />
      </div>
    </div>

    <!-- Step 2: Revisar -->
    <div v-show="activeStep === 1" class="space-y-5">
      <div v-if="resultado">
        <!-- Chips de precios -->
        <div class="flex flex-wrap gap-2 mb-4">
          <span v-for="(val, key) in resultado.precios" :key="key"
            v-if="val != null"
            class="px-3 py-1 rounded-full text-xs font-semibold"
            style="background:#f3f0f7; color:#915BD8">
            {{ key.toUpperCase() }}: {{ key === 'trm' ? fmtCOP(val) : val.toFixed(2) }}
          </span>
        </div>

        <!-- UNGC + UNGG lado a lado -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BloqueCodigo titulo="UNGC" :rows="resultado.ungc" :total="resultado.totalUNGC" />
          <BloqueCodigo titulo="UNGG" :rows="resultado.ungg" :total="resultado.totalUNGG" />
        </div>

        <!-- Panel custodia -->
        <div v-if="resultado.custodia" class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
            <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Disponible</p>
            <p class="text-lg font-bold" :style="(effectiveDisponible ?? 0) < 0 ? 'color:#D64455' : 'color:#10B981'">{{ fmtCOP(effectiveDisponible) }}</p>
            <p v-if="facturas?.documentos?.length" class="text-[10px] mt-0.5" style="color:#9ca3af">orig: {{ fmtCOP(resultado.custodia.disponible) }}</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
            <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Disponible (Aplic. garantía)</p>
            <p class="text-lg font-bold" style="color:#10B981">{{ fmtCOP(disponibleAplicacion) }}</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
            <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Congelado</p>
            <p class="text-lg font-bold" style="color:#2C2039">{{ fmtCOP(resultado.custodia.congelado) }}</p>
          </div>
          <div class="bg-white rounded-xl p-4 shadow-sm text-center" style="border:1px solid #e8e0f0">
            <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:#6b5a8a">Saldo</p>
            <p class="text-lg font-bold" style="color:#915BD8">{{ fmtCOP(resultado.custodia.saldo) }}</p>
          </div>
        </div>

        <div v-if="facturas?.documentos?.length" class="mt-2">
          <div class="flex items-center gap-2 justify-end mb-1">
            <label class="text-xs font-semibold" style="color:#6b5a8a">Fecha objetivo (viernes):</label>
            <input type="date" v-model="fechaObjetivo" class="rounded px-2 py-1 text-xs" style="border:1px solid #e8e0f0" />
          </div>
          <FacturasDescuento
            :documentos="facturas.documentos"
            :disponible="resultado.custodia?.disponible ?? 0"
            :fechaObjetivo="fechaObjetivo"
            v-model:disponibleAjustado="disponibleAjustado"
            v-model:totalDescontado="totalDescontado"
          />
        </div>

        <div class="flex justify-between mt-4">
          <Button label="Volver" icon="pi pi-arrow-left" text severity="secondary" @click="activeStep = 0" />
          <div class="flex gap-2">
            <Button label="Exportar Excel" icon="pi pi-file-excel" outlined severity="secondary" size="small" @click="exportar" />
            <Button label="Generar mensaje" icon="pi pi-arrow-right" icon-pos="right" @click="generarYAvanzar" style="background:#915BD8;border-color:#915BD8" />
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Mensaje -->
    <div v-show="activeStep === 2" class="space-y-4">
      <div class="bg-white rounded-xl p-5 shadow-sm space-y-4" style="border:1px solid #e8e0f0">
        <!-- Campos editables -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Total a consignar ($)</label>
            <InputNumber v-model="montoEditable" fluid :max-fraction-digits="0" @update:model-value="actualizarMensaje" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">% variación PB</label>
            <InputNumber v-model="variacionPb" fluid :max-fraction-digits="2" suffix="%" @update:model-value="actualizarMensaje" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Menciones</label>
          <input
            v-model="mencionesEditable"
            @input="actualizarMensaje"
            class="w-full rounded-lg px-3 py-2 text-sm"
            style="border:1px solid #e8e0f0; outline:none"
            placeholder="@Juan @María"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Contexto adicional (opcional)</label>
          <Textarea v-model="contexto" rows="2" fluid @input="actualizarMensaje" placeholder="Notas adicionales..." />
        </div>

        <!-- Mensaje generado -->
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Borrador del mensaje</label>
          <Textarea v-model="mensajeEditable" rows="8" fluid class="font-mono text-xs" />
        </div>
      </div>

      <div class="flex justify-between">
        <Button label="Volver" icon="pi pi-arrow-left" text severity="secondary" @click="activeStep = 1" />
        <div class="flex gap-2">
          <Button label="Copiar" icon="pi pi-copy" outlined severity="secondary" @click="copiar" />
          <Button label="Confirmar y guardar" icon="pi pi-check" @click="guardarRegistro" style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import DropZone from '../DropZone.vue'
import BloqueCodigo from '../BloqueCodigo.vue'
import FacturasDescuento from '../FacturasDescuento.vue'
import { parseFacturas, viernesDeEstaSemana } from '../composables/useFacturasPDF.js'
import { parseSemanales } from '../composables/useGarantiasParser.js'
import { useGarantiasHistorial } from '../composables/useGarantiasHistorial.js'
import { fmtCOP, fmtISODate } from '../utils/formatters.js'
import { exportHojaMadreExcel } from '../utils/excelExport.js'

const toast = useToast()
const store = useGarantiasHistorial()

const PATTERNS = {
  garantia: /garanti[aá]\s*semanal\s*mensual/i,
  saldo: /saldo\s*cuenta\s*custodia/i,
  web: /web[\s_-]*garant(i[ea]s?)/i,
}

const steps = [
  { key: 'cargar', label: 'Cargar' },
  { key: 'revisar', label: 'Revisar' },
  { key: 'mensaje', label: 'Mensaje' },
]

const activeStep = ref(0)
const loading = ref(false)
const parseErrors = ref([])
const resultado = ref(null)

const facturas = ref(null)
const fechaObjetivo = ref(fmtISODate(viernesDeEstaSemana()))
const disponibleAjustado = ref(null)
const totalDescontado = ref(0)

const files = ref({ garantia: null, saldo: null, web: null, pdfs: [] })

const allFilesLoaded = computed(
  () => files.value.garantia && files.value.saldo && files.value.web,
)

const effectiveDisponible = computed(() => {
  const orig = resultado.value?.custodia?.disponible
  if (facturas.value?.documentos?.length && disponibleAjustado.value != null) return disponibleAjustado.value
  return orig ?? null
})

const disponibleAplicacion = computed(() => {
  const base = effectiveDisponible.value
  if (base == null) return 0
  // F10 − C24: Disponible menos el TOTAL A PAGAR (UNGG+UNGC). Ese total suele ser
  // negativo, por lo que restarlo aumenta el disponible.
  return base - ((resultado.value?.totalUNGG ?? 0) + (resultado.value?.totalUNGC ?? 0))
})

const montoEditable = ref(0)
const variacionPb = ref(null)
const mencionesEditable = ref('')
const contexto = ref('')
const mensajeEditable = ref('')

function stepCircleStyle(idx) {
  if (activeStep.value > idx)
    return 'background:#10B981; color:white'
  if (activeStep.value === idx)
    return 'background:#915BD8; color:white'
  return 'background:#e8e0f0; color:#9ca3af'
}

function onPdfsSelect(e) {
  files.value.pdfs = Array.from(e.target.files || [])
  e.target.value = ''
}

async function procesar() {
  loading.value = true
  parseErrors.value = []
  try {
    const res = await parseSemanales(files.value.garantia, files.value.saldo, files.value.web)
    if (res.errors.length) {
      parseErrors.value = res.errors
    }
    resultado.value = res
    if (files.value.pdfs.length) {
      try {
        const f = await parseFacturas(files.value.pdfs)
        facturas.value = f
        if (f.errors.length) parseErrors.value = [...parseErrors.value, ...f.errors]
      } catch (e) {
        parseErrors.value = [...parseErrors.value, `Error leyendo PDFs: ${e.message}`]
      }
    } else {
      facturas.value = null
    }
    activeStep.value = 1
  } catch (e) {
    parseErrors.value = [`Error inesperado: ${e.message}`]
  } finally {
    loading.value = false
  }
}

function generarYAvanzar() {
  if (!resultado.value) return
  montoEditable.value = resultado.value.totalConsignar
  const pbAnterior = store.getPbAnterior()
  const pbActual = resultado.value.precios?.pb
  if (pbAnterior != null && pbActual != null && pbAnterior !== 0) {
    variacionPb.value = parseFloat(((pbActual - pbAnterior) / pbAnterior * 100).toFixed(2))
  } else {
    variacionPb.value = null
  }
  mencionesEditable.value = store.getMenciones()
  contexto.value = ''
  actualizarMensaje()
  activeStep.value = 2
}

function actualizarMensaje() {
  if (!resultado.value) return
  const p = resultado.value.precios
  const variStr = variacionPb.value != null
    ? `(${variacionPb.value > 0 ? '+' : ''}${variacionPb.value}% vs semana anterior)`
    : ''
  mensajeEditable.value = `Garantías Semanales — ${resultado.value.fechaNombre}

UNGC: ${fmtCOP(resultado.value.totalUNGC)}
UNGG: ${fmtCOP(resultado.value.totalUNGG)}
Total a consignar: ${fmtCOP(montoEditable.value)}

Disponible custodia: ${fmtCOP(effectiveDisponible.value)}${totalDescontado.value > 0 ? `\nDescontado facturas: ${fmtCOP(totalDescontado.value)}` : ''}
Congelado: ${fmtCOP(resultado.value.custodia?.congelado)}
Saldo custodia: ${fmtCOP(resultado.value.custodia?.saldo)}${p ? `

PB: $${p.pb?.toFixed(2) ?? '—'} ${variStr}
Restricciones: $${p.restricciones?.toFixed(2) ?? '—'}
STN: $${p.stn?.toFixed(2) ?? '—'}
TRM: ${fmtCOP(p.trm)}
PTB: $${p.ptb?.toFixed(2) ?? '—'}` : ''}${contexto.value ? '\n\n' + contexto.value : ''}${mencionesEditable.value ? '\n\n' + mencionesEditable.value : ''}`
}

async function copiar() {
  await navigator.clipboard.writeText(mensajeEditable.value)
  toast.add({ severity: 'success', summary: 'Mensaje copiado', life: 2000 })
}

function exportar() {
  if (!resultado.value) return
  exportHojaMadreExcel({
    ungc: resultado.value.ungc,
    ungg: resultado.value.ungg,
    totalConsignar: resultado.value.totalConsignar,
    custodia: resultado.value.custodia,
    disponibleAplicacion: disponibleAplicacion.value,
  }, `garantias_semanal_${resultado.value.fechaNombre || 'resultado'}.xlsx`)
}

async function guardarRegistro() {
  if (!resultado.value) return
  const p = resultado.value.precios
  try {
    await store.guardar({
      tipo: 'semanal',
      fecha: fmtISODate(new Date()),
      pb: p?.pb ?? null,
      restricciones: p?.restricciones ?? null,
      stn: p?.stn ?? null,
      trm: p?.trm ?? null,
      ptb: p?.ptb ?? null,
      totalUNGC: resultado.value.totalUNGC,
      totalUNGG: resultado.value.totalUNGG,
      totalConsignar: montoEditable.value,
      disponibleCustodia: resultado.value.custodia?.disponible ?? null,
      congelado: resultado.value.custodia?.congelado ?? null,
      saldo: resultado.value.custodia?.saldo ?? null,
      totalAjusteTXR: null,
    })
    if (p?.pb != null) store.setPbAnterior(p.pb)
    toast.add({ severity: 'success', summary: 'Guardado en historial', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el registro', life: 4000 })
  }
}
</script>
