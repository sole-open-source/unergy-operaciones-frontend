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
    header="Vista previa — Predios por cuenta de cobro"
    :style="{ width: '1080px', maxWidth: '98vw' }"
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

      <!-- Alertas de predios sin match -->
      <div v-if="prediosSinMatch.length"
        class="rounded-xl border p-3 flex items-start gap-3"
        style="background:#fef3c7;border-color:#f59e0b40">
        <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706"/>
        <div class="flex-1 text-xs" style="color:#92400e">
          <p class="font-semibold mb-1">
            {{ prediosSinMatch.length }} predio(s) sin proyecto identificado
          </p>
          <p class="font-mono text-[11px]">
            {{ prediosSinMatch.map(p => p.codigoPredio).join(', ') }}
          </p>
        </div>
      </div>

      <!-- Tabla de preview agrupada por carpeta/cuenta -->
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto" style="max-height:60vh">
          <table class="w-full text-sm border-collapse" style="min-width:960px">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Código predio</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto identificado</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 w-28">Estado</th>
                <th class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-32">Valor (COP)</th>
                <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">Match</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="grupo in gruposPreview" :key="grupo.uid">
                <!-- Encabezado de grupo (carpeta + cuenta de cobro) -->
                <tr class="bg-purple-50/40 border-b border-purple-100">
                  <td colspan="5" class="px-3 py-1.5">
                    <div class="flex items-center gap-2 flex-wrap text-[11px]">
                      <span class="font-mono text-gray-500">{{ grupo.carpeta }}</span>
                      <span class="text-gray-300">·</span>
                      <span class="font-semibold" style="color:#6d28d9">
                        {{ grupo.numeroCuentaCobro || 'Sin N° de cuenta' }}
                      </span>
                      <span v-if="grupo.nombreArrendatario" class="text-gray-300">·</span>
                      <span v-if="grupo.nombreArrendatario" class="text-gray-600">
                        {{ grupo.nombreArrendatario }}
                      </span>
                      <span class="text-gray-300">·</span>
                      <span class="text-gray-400">{{ grupo.predios.length }} predio(s)</span>
                      <span v-if="grupo.tipoArchivo"
                        class="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style="background:#f3f4f6;color:#6b7280">{{ grupo.tipoArchivo }}</span>
                    </div>
                  </td>
                </tr>
                <!-- Filas de predios -->
                <tr v-for="predio in grupo.predios" :key="predio.uid"
                  class="border-b border-gray-50 hover:bg-gray-50/50"
                  :class="!predio.proyectoId ? 'bg-amber-50/40' : ''">
                  <td class="px-3 py-2 font-mono text-xs text-gray-600">{{ predio.codigoPredio }}</td>
                  <td class="px-3 py-2">
                    <div v-if="predio.proyectoId" class="text-xs font-medium" style="color:#2C2039">
                      {{ predio.proyectoNombre }}
                    </div>
                    <select v-else
                      v-model="predio.proyectoId"
                      class="text-xs border border-amber-300 rounded px-2 py-1 w-full bg-white"
                      @change="onProyectoSeleccionado(predio)">
                      <option :value="null">— Seleccionar proyecto —</option>
                      <option v-for="p in props.proyectos" :key="p.id" :value="p.id">
                        {{ p.proyecto }}{{ p.codigo ? ` (${p.codigo})` : '' }}
                      </option>
                    </select>
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-500">{{ predio.estado || '—' }}</td>
                  <td class="px-3 py-2 text-right font-mono text-xs text-gray-600">
                    {{ predio.valor != null ? formatCOP(predio.valor) : '—' }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="predio.proyectoId"
                      class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style="background:#dcfce7;color:#166534">
                      <i class="pi pi-check text-[10px]" />OK
                    </span>
                    <span v-else
                      class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style="background:#fef3c7;color:#92400e">
                      <i class="pi pi-exclamation-triangle text-[10px]" />Revisar
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
          {{ prediosListos }} de {{ totalPredios }} predios listos · {{ gruposPreview.length }} cuentas
        </span>
        <div class="flex gap-2">
          <Button label="Cancelar" size="small" outlined severity="secondary"
            :disabled="guardando" @click="showDialog = false" />
          <Button label="Confirmar y guardar" icon="pi pi-check" size="small"
            :loading="guardando" :disabled="prediosListos === 0"
            @click="confirmar"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>

    </div>
  </Dialog>

  <!-- ── Dialog resumen post-guardado ────────────────────────────────────── -->
  <Dialog v-model:visible="showResumen" modal header="Resultado del procesamiento" :style="{ width: '560px' }">
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
          {{ resumen.sinMatch.length }} predio(s) sin match en BD
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
        <span><i class="pi pi-paperclip mr-1"/>{{ resumen.archivosGuardados }} archivos guardados</span>
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
import JSZip from 'jszip'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { uploadCuentaCobro } from '@/composables/useArriendosDocs'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

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
const gruposPreview = ref([])      // [{ uid, carpeta, pagoId, codigoExtraido, numeroCuentaCobro, nombreArrendatario, tipoArchivo, pdfBlob, pdfSecBlob, pdfSecNombre, predios:[...] }]
const periodoZip    = ref(null)

const resumen = ref({ asociados: [], sinMatch: [], archivosGuardados: 0, carpetasProcesadas: 0 })

let uidCounter = 0
const uid = () => `n_${++uidCounter}`

const todosPredios     = computed(() => gruposPreview.value.flatMap(g => g.predios))
const totalPredios     = computed(() => todosPredios.value.length)
const prediosListos    = computed(() => todosPredios.value.filter(p => p.proyectoId).length)
const prediosSinMatch  = computed(() => todosPredios.value.filter(p => !p.proyectoId))

// ── Formato COP ────────────────────────────────────────────────────────────────
function formatCOP(v) {
  if (v == null) return '—'
  return '$ ' + Math.round(v).toLocaleString('es-CO')
}

// ── Período del nombre del ZIP ──────────────────────────────────────────────────
function extraerPeriodoDeZip(filename) {
  const m = filename.match(/(\d{4}-\d{2})/)
  if (!m) return null
  const mm = parseInt(m[1].split('-')[1])
  return (mm >= 1 && mm <= 12) ? m[1] : null
}

function mesLabel(periodoStr) {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return MESES[parseInt(periodoStr.split('-')[1]) - 1]
}

// ── Nombre de archivo resultante (uno por cuenta de cobro) ──────────────────────
function nombreArchivo(grupo) {
  const sanitize = s => (s || '').replace(/[/\\:*?"<>|]/g, '_').trim()
  const mes = mesLabel(periodoZip.value || props.periodo)
  const num = sanitize(grupo.numeroCuentaCobro || grupo.codigoExtraido || 'cuenta_cobro')
  return `cuenta_cobro_${num}_${mes}.pdf`
}

// ── Selección del archivo principal según prioridad ───────────────────────────
// 1. cuenta_cobro.pdf (no enviada) → 2. factura_electronica.pdf → 3. .jpg
function seleccionarPrincipal(archivos) {
  const cc = archivos.filter(a =>
    a.nombre.toLowerCase().includes('cuenta_cobro') &&
    !a.nombre.toLowerCase().includes('enviada') &&
    !a.nombre.toLowerCase().includes('_env'))
  if (cc.length) return { principal: cc[0], tipoArchivo: 'cuenta_cobro' }

  const factPdf = archivos.filter(a =>
    a.nombre.toLowerCase().includes('factura_electronica') && a.nombre.toLowerCase().endsWith('.pdf'))
  if (factPdf.length) return { principal: factPdf[0], tipoArchivo: 'factura_electronica' }

  const factJpg = archivos.filter(a =>
    a.nombre.toLowerCase().includes('factura_electronica') &&
    (a.nombre.toLowerCase().endsWith('.jpg') || a.nombre.toLowerCase().endsWith('.jpeg')))
  if (factJpg.length) return { principal: factJpg[0], tipoArchivo: 'factura_electronica_jpg' }

  const otroPdf = archivos.filter(a => a.nombre.toLowerCase().endsWith('.pdf') && !a.nombre.toLowerCase().includes('enviada'))
  if (otroPdf.length) return { principal: otroPdf[0], tipoArchivo: 'pdf' }

  return { principal: archivos[0] || null, tipoArchivo: 'desconocido' }
}

function seleccionarSecundario(archivos, principal) {
  return archivos.find(a =>
    a !== principal &&
    a.nombre.toLowerCase().includes('enviada') &&
    a.nombre.toLowerCase().endsWith('.pdf')) ?? null
}

// ── Extracción de texto del PDF → líneas por página, aplanadas ────────────────
async function extraerLineas(arrayBuffer) {
  try {
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    const lineas = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page    = await pdf.getPage(p)
      const content = await page.getTextContent()
      const byY = {}
      for (const item of content.items) {
        if (!item.str?.trim()) continue
        const y = Math.round(item.transform[5])
        if (!byY[y]) byY[y] = []
        byY[y].push({ x: item.transform[4], str: item.str })
      }
      Object.keys(byY).map(Number).sort((a, b) => b - a).forEach(y => {
        const linea = byY[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim()
        if (linea) lineas.push(linea)
      })
    }
    return lineas
  } catch { return [] }
}

// ── Parseo de números (US "1,646,075.85" o CO "1.646.075,85") ─────────────────
function parseValor(s) {
  if (!s) return null
  let t = String(s).replace(/[^\d.,]/g, '')
  if (!t) return null
  const lastComma = t.lastIndexOf(',')
  const lastDot   = t.lastIndexOf('.')
  if (lastComma > lastDot) t = t.replace(/\./g, '').replace(',', '.')   // CO: coma decimal
  else                     t = t.replace(/,/g, '')                       // US: punto decimal
  const v = parseFloat(t)
  return isNaN(v) ? null : v
}

// ── Código corto de predio (sin sufijo _CIUDAD_ZONA) ───────────────────────────
function predioShort(codigo) {
  if (!codigo) return null
  const m = codigo.match(/COL[A-Z0-9]+P\d+/i)
  return m ? m[0].toUpperCase() : null
}

function matchPredio(short) {
  if (!short) return null
  return props.proyectos.find(p => predioShort(p.codigo) === short) ?? null
}

// Fallback: proyecto por código de carpeta (contrato sin P#)
function matchPorCodigoCarpeta(folderCode) {
  if (!folderCode) return null
  let p = props.proyectos.find(p => p.codigo === folderCode)
  if (p) return p
  p = props.proyectos.find(p => p.codigo && p.codigo.startsWith(folderCode))
  return p ?? null
}

// ── Encabezado de la cuenta de cobro ───────────────────────────────────────────
function extraerEncabezado(lineas) {
  const texto = lineas.join('\n')
  let numero = null, arrendatario = null

  const mNum = texto.match(/CUENTA\s+DE\s+COBRO[^A-Z0-9]*([A-Z]+-[\d-]+)/i)
  if (mNum) numero = mNum[1].trim()

  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/DEBE\s+A\s*:?\s*(.+)/i)
    if (m && m[1].trim()) { arrendatario = m[1].trim(); break }
    if (/DEBE\s+A\s*:?\s*$/i.test(lineas[i]) && lineas[i + 1]) { arrendatario = lineas[i + 1].trim(); break }
  }
  if (arrendatario) {
    arrendatario = arrendatario.replace(/\s*(C\.?C\.?|NIT)\.?\s*[\d.\-]+.*$/i, '').trim()
  }
  return { numero, arrendatario }
}

// ── Predios de la tabla de conceptos ───────────────────────────────────────────
function extraerPredios(lineas) {
  const predios = []
  const seen = new Set()
  for (const l of lineas) {
    const mFull = l.match(/COL[A-Z0-9]+P\d+(?:_[A-Z0-9\-]+)*/i)
    if (!mFull) continue
    const full  = mFull[0].toUpperCase()
    const short = predioShort(full)
    if (!short || seen.has(short)) continue

    const nums  = l.match(/\d[\d.,]*\d/g) || []
    const valor = nums.length ? parseValor(nums[nums.length - 1]) : null

    let estado = ''
    const after   = l.slice(l.indexOf(mFull[0]) + mFull[0].length)
    const mEstado = after.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ]+/)
    if (mEstado) estado = mEstado[0]

    seen.add(short)
    predios.push({ codigoPredioFull: full, codigoPredio: short, estado, valor })
  }
  return predios
}

// ── Procesamiento del ZIP ─────────────────────────────────────────────────────
async function onZipSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  procesando.value    = true
  gruposPreview.value = []
  periodoZip.value    = extraerPeriodoDeZip(file.name)

  try {
    const zip = await JSZip.loadAsync(file)
    const carpetas = new Set()
    zip.forEach((path) => {
      const top = path.split('/')[0]
      if (top.toLowerCase().startsWith('pago_')) carpetas.add(top)
    })

    if (!carpetas.size) {
      toast.add({ severity: 'warn', summary: 'ZIP sin carpetas pago_*', life: 4000 })
      return
    }

    const grupos = []

    for (const carpeta of [...carpetas].sort()) {
      // pago_3554_COLCEST17 → pagoId=3554, codigoExtraido=COLCEST17
      const partes         = carpeta.split('_')
      const pagoId         = parseInt(partes[1]) || 0
      const codigoExtraido = partes.slice(2).join('_')

      const archivos = []
      zip.forEach((path, entry) => {
        if (path.startsWith(carpeta + '/') && !entry.dir) {
          archivos.push({ path, entry, nombre: path.split('/').pop() })
        }
      })
      if (!archivos.length) continue

      const { principal, tipoArchivo } = seleccionarPrincipal(archivos)
      const secundario = seleccionarSecundario(archivos, principal)
      if (!principal) continue

      const esPdf     = principal.nombre.toLowerCase().endsWith('.pdf')
      const pdfBuffer = await principal.entry.async('arraybuffer')
      const pdfBlob   = new Blob([pdfBuffer], { type: esPdf ? 'application/pdf' : 'image/jpeg' })

      let pdfSecBlob = null, pdfSecNombre = null
      if (secundario) {
        pdfSecBlob   = new Blob([await secundario.entry.async('arraybuffer')], { type: 'application/pdf' })
        pdfSecNombre = secundario.nombre
      }

      let numeroCuentaCobro = null, nombreArrendatario = null
      let prediosRaw = []

      if (esPdf) {
        const lineas = await extraerLineas(pdfBuffer)
        const enc = extraerEncabezado(lineas)
        numeroCuentaCobro  = enc.numero
        nombreArrendatario = enc.arrendatario
        prediosRaw = extraerPredios(lineas)
      }

      let predios
      if (prediosRaw.length) {
        // Cada predio del PDF → una fila, matcheada por prefijo
        predios = prediosRaw.map(pr => {
          const m = matchPredio(pr.codigoPredio)
          return {
            uid: uid(),
            codigoPredio:     pr.codigoPredio,
            codigoPredioFull: pr.codigoPredioFull,
            estado:           pr.estado,
            valor:            pr.valor,
            proyectoId:       m?.id ?? null,
            proyectoNombre:   m?.proyecto ?? null,
          }
        })
      } else {
        // Fallback: sin tabla parseable (factura/jpg) → match por código de carpeta
        const m = matchPorCodigoCarpeta(codigoExtraido)
        predios = [{
          uid: uid(),
          codigoPredio:     codigoExtraido,
          codigoPredioFull: codigoExtraido,
          estado:           '',
          valor:            null,
          proyectoId:       m?.id ?? null,
          proyectoNombre:   m?.proyecto ?? null,
        }]
      }

      grupos.push({
        uid: uid(), carpeta, pagoId, codigoExtraido,
        numeroCuentaCobro, nombreArrendatario, tipoArchivo,
        pdfBlob, pdfSecBlob, pdfSecNombre, predios,
      })
    }

    if (!grupos.length) {
      toast.add({ severity: 'warn', summary: 'No se encontraron documentos procesables', life: 4000 })
      return
    }

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
  let archivosGuardados  = 0
  let carpetasProcesadas = 0

  try {
    for (const grupo of gruposPreview.value) {
      carpetasProcesadas++
      const prediosOk = grupo.predios.filter(p => p.proyectoId)
      const prediosNo = grupo.predios.filter(p => !p.proyectoId)

      for (const p of prediosNo) {
        sinMatch.push({ codigo: p.codigoPredio, carpeta: grupo.carpeta })
      }
      if (!prediosOk.length) continue

      const filename = nombreArchivo(grupo)
      try {
        await uploadCuentaCobro({
          file:           new File([grupo.pdfBlob], filename),
          fileSecundario: grupo.pdfSecBlob ? new File([grupo.pdfSecBlob], grupo.pdfSecNombre || 'enviada.pdf') : null,
          periodo:        periodoParse,
          pagoId:         grupo.pagoId,
          codigoContrato: grupo.codigoExtraido,
          tipoDocumento:  grupo.tipoArchivo,
          nombreResultante:   filename,
          numeroCuentaCobro:  grupo.numeroCuentaCobro,
          nombreArrendatario: grupo.nombreArrendatario,
          predios: prediosOk.map(p => ({
            arr_proyecto_id:  p.proyectoId,
            codigo_predio:    p.codigoPredio,
            valor_individual: p.valor,
          })),
        })
        archivosGuardados++
        for (const p of prediosOk) {
          asociados.push({ codigo: p.codigoPredio, proyecto: p.proyectoNombre })
        }
      } catch (uploadErr) {
        console.error('Error subiendo', grupo.carpeta, uploadErr)
        toast.add({ severity: 'warn', summary: `Error al subir ${grupo.carpeta}`, life: 4000 })
      }
    }

    resumen.value = { asociados, sinMatch, archivosGuardados, carpetasProcesadas }
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
