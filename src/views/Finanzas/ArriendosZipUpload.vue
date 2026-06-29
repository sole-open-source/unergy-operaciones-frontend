<template>
  <!-- Botón trigger -->
  <div class="inline-block">
    <input ref="zipInputRef" type="file" accept=".zip" class="hidden" @change="onZipSelected" />
    <Button label="Cargar ZIP" icon="pi pi-upload" size="small" outlined
      :loading="procesando"
      @click="zipInputRef.click()"
      style="border-color:#915BD8;color:#915BD8" />
  </div>

  <!-- ── Dialog preview ──────────────────────────────────────────────────── -->
  <Dialog v-model:visible="showDialog" modal
    header="Vista previa — Predios por documento"
    :style="{ width: '1120px', maxWidth: '98vw' }"
    :closable="!guardando">

    <div class="space-y-4 pt-1">

      <!-- Período detectado del ZIP -->
      <div v-if="periodoZip && periodoZip !== periodo"
        class="rounded-xl border p-3 flex items-center gap-3"
        style="background:#eff6ff;border-color:#bfdbfe">
        <i class="pi pi-info-circle text-sm flex-shrink-0" style="color:#2563eb"/>
        <p class="text-xs" style="color:#1e40af">
          El ZIP corresponde al período <strong>{{ periodoZip }}</strong>.
          Los documentos se guardarán en ese período.
        </p>
      </div>

      <!-- Advertencia de documentos ya existentes -->
      <div v-if="hayDuplicados"
        class="rounded-xl border p-3 flex items-start gap-3"
        style="background:#fef3c7;border-color:#f59e0b40">
        <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706"/>
        <div class="flex-1 text-xs" style="color:#92400e">
          <p class="font-semibold mb-1">
            Ya existe documento para {{ predioscDuplicados.length }} predio(s) en este período
          </p>
          <p>Si confirmas, se <strong>reemplazarán</strong> los documentos existentes de esos predios.</p>
        </div>
      </div>

      <!-- Predios sin match -->
      <div v-if="prediosSinMatch.length"
        class="rounded-xl border p-3 flex items-start gap-3"
        style="background:#fef2f2;border-color:#fca5a540">
        <i class="pi pi-exclamation-circle text-sm flex-shrink-0 mt-0.5" style="color:#dc2626"/>
        <div class="flex-1 text-xs" style="color:#991b1b">
          <p class="font-semibold mb-1">{{ prediosSinMatch.length }} predio(s) sin proyecto en BD</p>
          <p class="font-mono text-[11px]">{{ prediosSinMatch.map(p => p.codigoPredio).join(', ') }}</p>
          <p class="mt-0.5">Se guardarán como <span class="font-mono">…_SIN-MATCH.pdf</span> para revisión manual.</p>
        </div>
      </div>

      <!-- Tabla de preview agrupada por carpeta/documento -->
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto" style="max-height:58vh">
          <table class="w-full text-sm border-collapse" style="min-width:1000px">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Código predio</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto identificado</th>
                <th class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-32">Valor (COP)</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Archivo resultante</th>
                <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">Match</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="grupo in gruposPreview" :key="grupo.uid">
                <!-- Encabezado de grupo -->
                <tr class="bg-purple-50/40 border-b border-purple-100">
                  <td colspan="5" class="px-3 py-2">
                    <div class="flex items-center gap-2 flex-wrap text-[11px]">
                      <span class="font-mono text-gray-500">{{ grupo.carpeta }}</span>
                      <span class="text-gray-300">·</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        :style="formatoStyle(grupo.formato)">Formato {{ grupo.formato }}</span>
                      <span v-if="grupo.numeroCuentaCobro" class="text-gray-300">·</span>
                      <span v-if="grupo.numeroCuentaCobro" class="font-semibold" style="color:#6d28d9">
                        {{ grupo.numeroCuentaCobro }}
                      </span>
                      <span class="text-gray-300">·</span>
                      <span class="text-gray-500">Arrendatario:</span>
                      <input v-model="grupo.nombreArrendatario" type="text"
                        placeholder="(vacío)"
                        class="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-purple-300"
                        style="min-width:200px" />
                      <span class="ml-auto text-gray-400">{{ grupo.predios.length }} predio(s)</span>
                    </div>
                  </td>
                </tr>
                <!-- Filas de predios -->
                <tr v-for="predio in grupo.predios" :key="predio.uid"
                  class="border-b border-gray-50 hover:bg-gray-50/50"
                  :class="!predio.proyectoId ? 'bg-red-50/40' : (predio.yaExiste ? 'bg-amber-50/40' : '')">
                  <td class="px-3 py-2 font-mono text-xs text-gray-600">
                    {{ predio.codigoPredio }}
                    <i v-if="predio.yaExiste" class="pi pi-refresh text-[9px] ml-1" style="color:#d97706"
                      title="Ya existe — se reemplazará" />
                  </td>
                  <td class="px-3 py-2">
                    <div v-if="predio.proyectoId" class="text-xs font-medium" style="color:#2C2039">
                      {{ predio.proyectoNombre }}
                    </div>
                    <select v-else
                      v-model="predio.proyectoId"
                      class="text-xs border border-red-300 rounded px-2 py-1 w-full bg-white"
                      @change="onProyectoSeleccionado(predio)">
                      <option :value="null">— Sin match (SIN-MATCH) —</option>
                      <option v-for="p in props.proyectos" :key="p.id" :value="p.id">
                        {{ p.proyecto }}{{ p.codigo ? ` (${p.codigo})` : '' }}
                      </option>
                    </select>
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-xs text-gray-600">
                    {{ predio.valor != null ? formatCOP(predio.valor) : '—' }}
                  </td>
                  <td class="px-3 py-2 text-[11px] font-mono" style="color:#7c3aed;max-width:320px">
                    <span class="truncate block" :title="nombrePredio(grupo, predio)">
                      {{ nombrePredio(grupo, predio) }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="predio.proyectoId"
                      class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style="background:#dcfce7;color:#166534">
                      <i class="pi pi-check text-[10px]" />OK
                    </span>
                    <span v-else
                      class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style="background:#fee2e2;color:#991b1b">
                      <i class="pi pi-times text-[10px]" />Sin match
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex items-center justify-between pt-1">
        <span class="text-xs text-gray-400">
          {{ totalPredios }} predio(s) en {{ gruposPreview.length }} documento(s) ·
          {{ prediosListos }} con match
        </span>
        <div class="flex gap-2">
          <Button label="Cancelar" size="small" outlined severity="secondary"
            :disabled="guardando" @click="showDialog = false" />
          <Button :label="hayDuplicados ? 'Reemplazar y guardar' : 'Confirmar y guardar'"
            icon="pi pi-check" size="small"
            :loading="guardando" :disabled="totalPredios === 0"
            @click="confirmar"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>

    </div>
  </Dialog>

  <!-- ── Dialog resumen post-guardado ────────────────────────────────────── -->
  <Dialog v-model:visible="showResumen" modal header="Resultado del procesamiento" :style="{ width: '580px' }">
    <div class="space-y-3 pt-1 text-sm">
      <!-- Asociados -->
      <div class="rounded-lg border p-3 space-y-1.5" style="background:#f0fdf4;border-color:#bbf7d0">
        <p class="text-xs font-semibold" style="color:#166534">
          <i class="pi pi-check-circle mr-1"/>
          {{ resumen.asociados.length }} predio(s) asociados correctamente
        </p>
        <div v-for="(item, idx) in resumen.asociados" :key="idx"
          class="flex items-center gap-2 text-[11px] text-gray-600 pl-3">
          <i class="pi pi-file-pdf text-[9px]" style="color:#16a34a"/>
          <span class="font-mono text-gray-400">{{ item.codigo }}</span>
          <i class="pi pi-arrow-right text-[9px] text-gray-300"/>
          <span>{{ item.proyecto }}</span>
        </div>
      </div>

      <!-- Sin match -->
      <div v-if="resumen.sinMatch.length" class="rounded-lg border p-3 space-y-1.5" style="background:#fffbeb;border-color:#fcd34d40">
        <p class="text-xs font-semibold" style="color:#92400e">
          <i class="pi pi-exclamation-triangle mr-1"/>
          {{ resumen.sinMatch.length }} predio(s) sin match — revisión manual
        </p>
        <div v-for="(item, idx) in resumen.sinMatch" :key="idx"
          class="flex items-center gap-2 text-[11px] pl-3">
          <span class="font-mono font-semibold text-amber-700">{{ item.codigo }}</span>
          <span class="text-gray-400">—</span>
          <span class="text-gray-500">{{ item.carpeta }}</span>
        </div>
      </div>

      <!-- Totales -->
      <div class="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t">
        <span><i class="pi pi-copy mr-1"/>{{ resumen.copiasGeneradas }} copias generadas</span>
        <span><i class="pi pi-folder mr-1"/>{{ resumen.carpetasProcesadas }} carpetas procesadas</span>
      </div>
    </div>
    <template #footer>
      <Button label="Cerrar" size="small" @click="cerrarResumen" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { uploadCuentaCobro, fetchDocsPeriodo } from '@/composables/useArriendosDocs'
import workerService from '@/utils/workers/workerService'

const toast = useToast()

const props = defineProps({
  proyectos:    { type: Array,  required: true },   // [{ id, proyecto, codigo }]
  periodo:      { type: String, required: true },   // 'YYYY-MM'
  periodoLabel: { type: String, required: true },
})
const emit = defineEmits(['docs-actualizados'])

const zipInputRef   = ref(null)
const procesando    = ref(false)
const guardando     = ref(false)
const showDialog    = ref(false)
const showResumen   = ref(false)
const gruposPreview = ref([])
const periodoZip    = ref(null)

const resumen = ref({ asociados: [], sinMatch: [], copiasGeneradas: 0, carpetasProcesadas: 0 })

const todosPredios    = computed(() => gruposPreview.value.flatMap(g => g.predios))
const totalPredios    = computed(() => todosPredios.value.length)
const prediosListos   = computed(() => todosPredios.value.filter(p => p.proyectoId).length)
const prediosSinMatch = computed(() => todosPredios.value.filter(p => !p.proyectoId))
const predioscDuplicados = computed(() => todosPredios.value.filter(p => p.yaExiste))
const hayDuplicados   = computed(() => predioscDuplicados.value.length > 0)

// ── Formato COP ────────────────────────────────────────────────────────────────
function formatCOP(v) {
  if (v == null) return '—'
  return '$ ' + Math.round(v).toLocaleString('es-CO')
}

function formatoStyle(f) {
  return {
    A: 'background:#dcfce7;color:#166534',
    B: 'background:#dbeafe;color:#1e40af',
    C: 'background:#fef3c7;color:#92400e',
    D: 'background:#f3f4f6;color:#6b7280',
  }[f] ?? 'background:#f3f4f6;color:#6b7280'
}

// ── Nombre de archivo por predio ────────────────────────────────────────────────
// [CODIGO_PREDIO]_[YYYY-MM]_[Arrendatario]_[Nombre Proyecto].pdf  (+ _pagoN si aplica)
function nombrePredio(grupo, predio) {
  const sani = s => (s || '').replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
  const periodo = periodoZip.value || props.periodo
  const arr  = sani(grupo.nombreArrendatario)
  const proy = predio.proyectoId ? sani(predio.proyectoNombre) : 'SIN-MATCH'
  const partes = [predio.codigoPredio, periodo]
  if (arr) partes.push(arr)
  partes.push(proy)
  let base = partes.join('_')
  if (predio.conPago) base += `_pago${grupo.pagoId}`
  return base + '.pdf'
}

// ── Procesamiento del ZIP (descargado a un Web Worker) ────────────────────────
// El parseo pesado (descompresión jszip + extracción de texto pdfjs + regex) corre
// en fileProcessor.worker.js para no congelar la UI. El worker devuelve los grupos
// con sus Blobs y el emparejamiento de predios ya resuelto; aquí sólo se hace la
// verificación de duplicados (que requiere la API) y se actualiza la vista.
async function onZipSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  procesando.value    = true
  gruposPreview.value = []
  periodoZip.value    = null

  try {
    const { periodoZip: periodo, grupos, warning } = await workerService.postMessage('processZip', {
      file,
      // Sólo se envían los campos necesarios para el emparejamiento (clonables).
      proyectos: props.proyectos.map(p => ({ id: p.id, proyecto: p.proyecto, codigo: p.codigo })),
    })

    periodoZip.value = periodo

    if (warning) {
      toast.add({ severity: 'warn', summary: warning, life: 4000 })
      return
    }

    // Advertencia: documentos ya existentes en el período (mismo proyecto + pago)
    try {
      const existentes = await fetchDocsPeriodo(periodoZip.value || props.periodo)
      const clave = new Set(existentes.map(d => `${d.arr_proyecto_id}|${d.pago_id}`))
      for (const g of grupos) for (const p of g.predios) {
        if (p.proyectoId && clave.has(`${p.proyectoId}|${g.pagoId}`)) p.yaExiste = true
      }
    } catch { /* no bloquea */ }

    gruposPreview.value = grupos
    showDialog.value = true
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error al procesar el ZIP', detail: err.message, life: 5000 })
  } finally {
    procesando.value = false
  }
}

function onProyectoSeleccionado(predio) {
  const p = props.proyectos.find(p => p.id === predio.proyectoId)
  predio.proyectoNombre = p?.proyecto ?? null
}

// ── Confirmar y guardar ───────────────────────────────────────────────────────
async function confirmar() {
  guardando.value = true
  const periodoParse = periodoZip.value || props.periodo
  const asociados = []
  const sinMatch  = []
  let copiasGeneradas    = 0
  let carpetasProcesadas = 0

  try {
    for (const grupo of gruposPreview.value) {
      carpetasProcesadas++
      const filename = `documento_pago${grupo.pagoId}.pdf`   // nombre del archivo original enviado
      try {
        await uploadCuentaCobro({
          file:           new File([grupo.pdfBlob], grupo.originalName || filename),
          fileSecundario: grupo.pdfSecBlob ? new File([grupo.pdfSecBlob], grupo.pdfSecNombre || 'enviada.pdf') : null,
          periodo:        periodoParse,
          pagoId:         grupo.pagoId,
          codigoContrato: grupo.codigoExtraido,
          tipoDocumento:  grupo.tipoArchivo,
          numeroCuentaCobro:  grupo.numeroCuentaCobro,
          nombreArrendatario: grupo.nombreArrendatario,
          predios: grupo.predios.map(p => ({
            arr_proyecto_id:  p.proyectoId,
            codigo_predio:    p.codigoPredio,
            valor_individual: p.valor,
            nombre_resultante: nombrePredio(grupo, p),
          })),
        })
        for (const p of grupo.predios) {
          copiasGeneradas++
          if (p.proyectoId) asociados.push({ codigo: p.codigoPredio, proyecto: p.proyectoNombre })
          else              sinMatch.push({ codigo: p.codigoPredio, carpeta: grupo.carpeta })
        }
      } catch (uploadErr) {
        console.error('Error subiendo', grupo.carpeta, uploadErr)
        toast.add({ severity: 'warn', summary: `Error al subir ${grupo.carpeta}`, life: 4000 })
      }
    }

    resumen.value = { asociados, sinMatch, copiasGeneradas, carpetasProcesadas }
    showDialog.value  = false
    showResumen.value = true
    emit('docs-actualizados', periodoParse)
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error al guardar', detail: err.message, life: 4000 })
  } finally {
    guardando.value = false
  }
}

function cerrarResumen() {
  showResumen.value = false
  emit('docs-actualizados', periodoZip.value || props.periodo)
}
</script>
