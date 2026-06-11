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
    header="Vista previa — Renombrado de archivos"
    :style="{ width: '960px', maxWidth: '98vw' }"
    :closable="!guardando">

    <div class="space-y-4 pt-1">

      <!-- Alertas de filas con problemas -->
      <div v-if="filasConError.length"
        class="rounded-xl border p-3 flex items-start gap-3"
        style="background:#fef3c7;border-color:#f59e0b40">
        <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706"/>
        <div class="flex-1 text-xs" style="color:#92400e">
          <p class="font-semibold mb-1">
            {{ filasConError.length }} archivo(s) requieren revisión manual
          </p>
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="f in filasConError" :key="f.carpeta">
              <strong>{{ f.carpeta }}</strong>
              <span v-if="!f.proyectoId"> — proyecto no identificado</span>
              <span v-else-if="!f.persona"> — nombre no extraído del PDF</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Tabla de preview -->
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse" style="min-width:820px">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Carpeta</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto identificado</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Nombre en PDF</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 bg-purple-50">Nombre de archivo resultante</th>
                <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(fila, i) in filasPreview" :key="fila.carpeta"
                class="border-b border-gray-50 hover:bg-gray-50/50"
                :class="!fila.proyectoId || !fila.persona ? 'bg-amber-50/40' : ''">
                <td class="px-3 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">
                  {{ fila.carpeta }}
                </td>
                <!-- Proyecto: selector si no fue identificado -->
                <td class="px-3 py-2">
                  <div v-if="fila.proyectoId" class="text-xs font-medium" style="color:#2C2039">
                    {{ fila.proyectoNombre }}
                    <span class="text-gray-400 font-normal"> ({{ fila.codigoExtraido }})</span>
                  </div>
                  <select v-else
                    v-model="filasPreview[i].proyectoId"
                    class="text-xs border border-amber-300 rounded px-2 py-1 w-full bg-white"
                    @change="onProyectoSeleccionado(i)">
                    <option value="">— Seleccionar proyecto —</option>
                    <option v-for="p in props.proyectos" :key="p.id" :value="p.id">
                      {{ p.proyecto }}
                    </option>
                  </select>
                </td>
                <!-- Nombre: editable siempre -->
                <td class="px-3 py-2">
                  <input
                    v-model="filasPreview[i].persona"
                    type="text"
                    placeholder="Nombre de la persona…"
                    class="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-purple-200"
                    :class="!fila.persona ? 'border-amber-300' : ''" />
                </td>
                <!-- Nombre resultante -->
                <td class="px-3 py-2 text-xs font-mono bg-purple-50/30" style="color:#7c3aed">
                  {{ nombreResultante(fila) }}
                </td>
                <!-- Estado -->
                <td class="px-3 py-2 text-center">
                  <span v-if="fila.proyectoId && fila.persona"
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style="background:#dcfce7;color:#166534">
                    <i class="pi pi-check text-[10px]" />Listo
                  </span>
                  <span v-else
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style="background:#fef3c7;color:#92400e">
                    <i class="pi pi-exclamation-triangle text-[10px]" />Revisar
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex items-center justify-between pt-1">
        <span class="text-xs text-gray-400">
          {{ filasListas }} de {{ filasPreview.length }} archivos listos para guardar
        </span>
        <div class="flex gap-2">
          <Button label="Cancelar" size="small" outlined severity="secondary"
            :disabled="guardando"
            @click="showDialog = false" />
          <Button label="Confirmar y guardar" icon="pi pi-check" size="small"
            :loading="guardando"
            :disabled="filasListas === 0"
            @click="confirmar"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>

    </div>
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
import { docsMeta, storeBlob, saveDocsMeta, docKey } from '@/composables/useArriendosDocs'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const toast = useToast()

const props = defineProps({
  proyectos:    { type: Array,  required: true },   // [{ id, proyecto, codigo }]
  periodo:      { type: String, required: true },   // 'YYYY-MM'
  periodoLabel: { type: String, required: true },   // 'Mayo 2026'
})

const zipInputRef   = ref(null)
const procesando    = ref(false)
const guardando     = ref(false)
const showDialog    = ref(false)
const filasPreview  = ref([])

const filasConError = computed(() =>
  filasPreview.value.filter(f => !f.proyectoId || !f.persona)
)
const filasListas = computed(() =>
  filasPreview.value.filter(f => f.proyectoId && f.persona).length
)

// ── Nombre de archivo resultante ───────────────────────────────────────────────
function mesLabel(periodoStr) {
  const [, mm] = periodoStr.split('-')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return MESES[parseInt(mm) - 1]
}

function nombreResultante(fila) {
  if (!fila.proyectoId || !fila.persona) return '—'
  const codigo  = fila.codigoExtraido || fila.proyectoId
  const nombre  = fila.proyectoNombre || ''
  const mes     = mesLabel(props.periodo)
  const persona = fila.persona.trim()
  // Sanitizar para nombre de archivo
  const sanitize = s => s.replace(/[/\\:*?"<>|]/g, '_')
  return `${sanitize(codigo)}_${sanitize(nombre)}_${mes}_${sanitize(persona)}.pdf`
}

// ── Matching carpeta → proyecto ────────────────────────────────────────────────
function matchProyecto(folderCode) {
  // folderCode: 'COLCEST49', 'COLLAGT19', etc.
  // Try exact match on codigo
  let p = props.proyectos.find(p => p.codigo === folderCode)
  if (p) return p
  // Try prefix match: fullCode.startsWith(folderCode)
  p = props.proyectos.find(p => p.codigo && p.codigo.startsWith(folderCode))
  if (p) return p
  // Try name contains (fallback)
  p = props.proyectos.find(p => p.proyecto?.toLowerCase().includes(folderCode.toLowerCase()))
  return p ?? null
}

// ── Extracción de texto del PDF ────────────────────────────────────────────────
async function extractTextFromPDF(arrayBuffer) {
  try {
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    let text = ''
    const pages = Math.min(pdf.numPages, 3)
    for (let i = 1; i <= pages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(item => item.str).join(' ') + '\n'
    }
    return text
  } catch {
    return ''
  }
}

function extractNombre(text) {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l)

  // Patrones de cuentas de cobro colombianas
  const patterns = [
    /nombre\s+completo\s*[:\s]+([A-Za-záéíóúñÁÉÍÓÚÑ ,]+)/i,
    /cobro\s+a\s+nombre\s+de\s*[:\s]+([A-Za-záéíóúñÁÉÍÓÚÑ ,]+)/i,
    /(?:prestador|arrendador|contratista|proveedor|beneficiario)\s*[:\s]+([A-Za-záéíóúñÁÉÍÓÚÑ ,]+)/i,
    /nombre\s*[:\s]+([A-Za-záéíóúñÁÉÍÓÚÑ ]{5,60})/i,
    /^yo[,\s]+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ]+){1,4})/m,
  ]

  for (const line of lines) {
    for (const pat of patterns) {
      const m = line.match(pat)
      if (m) {
        const candidate = m[1].split(/[,;:\d]/)[0].trim()
        if (candidate.length >= 4 && candidate.length <= 70) return candidate
      }
    }
  }

  // Fallback: primera línea de 2-5 palabras todas capitalizadas
  for (const line of lines.slice(0, 20)) {
    if (/^[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4}$/.test(line)) return line
  }

  return ''
}

// ── Procesamiento del ZIP ──────────────────────────────────────────────────────
async function onZipSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''  // reset para permitir re-selección

  procesando.value = true
  filasPreview.value = []

  try {
    const zip      = await JSZip.loadAsync(file)
    const carpetas = new Set()

    // Identificar carpetas de nivel raíz con patrón pago_*
    zip.forEach((path) => {
      const parts = path.split('/')
      if (parts.length >= 1 && parts[0].startsWith('pago_')) {
        carpetas.add(parts[0])
      }
    })

    if (!carpetas.size) {
      toast.add({ severity: 'warn', summary: 'ZIP sin carpetas pago_*', life: 4000 })
      return
    }

    const filas = []

    for (const carpeta of carpetas) {
      // Extraer código: pago_2213_COLCEST49 → COLCEST49
      const parts        = carpeta.split('_')
      const codigoExtraido = parts.slice(2).join('_')

      // Buscar PDF dentro de la carpeta
      let pdfFile = null
      zip.forEach((path, zipEntry) => {
        if (path.startsWith(carpeta + '/') && path.toLowerCase().endsWith('.pdf') && !zipEntry.dir) {
          if (!pdfFile) pdfFile = zipEntry
        }
      })

      if (!pdfFile) {
        filas.push({
          carpeta, codigoExtraido,
          proyectoId: null, proyectoNombre: null,
          persona: '', pdfFile: null,
          errorMsg: 'Sin PDF en la carpeta',
        })
        continue
      }

      // Extraer texto del PDF
      const pdfArrayBuffer = await pdfFile.async('arraybuffer')
      const texto          = await extractTextFromPDF(pdfArrayBuffer)
      const persona        = extractNombre(texto)

      // Matchear proyecto
      const matchedP = matchProyecto(codigoExtraido)

      filas.push({
        carpeta,
        codigoExtraido,
        proyectoId:     matchedP?.id   ?? null,
        proyectoNombre: matchedP?.proyecto ?? null,
        persona,
        pdfBlob:        new Blob([pdfArrayBuffer], { type: 'application/pdf' }),
        errorMsg:       null,
      })
    }

    filasPreview.value = filas
    showDialog.value   = true
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error al procesar el ZIP', detail: err.message, life: 4000 })
  } finally {
    procesando.value = false
  }
}

function onProyectoSeleccionado(i) {
  const p = props.proyectos.find(p => p.id === filasPreview.value[i].proyectoId)
  if (p) filasPreview.value[i].proyectoNombre = p.proyecto
}

// ── Confirmar y guardar ────────────────────────────────────────────────────────
async function confirmar() {
  guardando.value = true
  let guardados = 0
  try {
    for (const fila of filasPreview.value) {
      if (!fila.proyectoId || !fila.persona || !fila.pdfBlob) continue

      const filename = nombreResultante(fila)
      const key      = docKey(fila.proyectoId, props.periodo)

      // Guardar blob en IndexedDB con el nombre resultante
      const renamedBlob = new Blob([fila.pdfBlob], { type: 'application/pdf' })
      await storeBlob(key, renamedBlob)

      // Guardar metadato
      docsMeta.value[key] = {
        filename,
        proyecto:   fila.proyectoNombre,
        persona:    fila.persona.trim(),
        periodo:    props.periodo,
        codigo:     fila.codigoExtraido,
      }
      guardados++
    }
    saveDocsMeta()
    showDialog.value = false
    toast.add({
      severity: 'success',
      summary:  `${guardados} archivo(s) guardados`,
      detail:   'Visibles en la columna Documento del panel.',
      life: 3500,
    })
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error al guardar', detail: err.message, life: 4000 })
  } finally {
    guardando.value = false
  }
}
</script>
