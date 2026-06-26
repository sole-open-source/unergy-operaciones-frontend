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
    :style="{ width: '1020px', maxWidth: '98vw' }"
    :closable="!guardando">

    <div class="space-y-4 pt-1">

      <!-- Período detectado del ZIP -->
      <div v-if="periodoZip && periodoZip !== periodo"
        class="rounded-xl border p-3 flex items-center gap-3"
        style="background:#eff6ff;border-color:#bfdbfe">
        <i class="pi pi-info-circle text-sm flex-shrink-0" style="color:#2563eb"/>
        <p class="text-xs" style="color:#1e40af">
          El ZIP corresponde al período <strong>{{ periodoZip }}</strong>.
          Los documentos se guardarán en ese período, no en el período actual de la vista.
        </p>
      </div>

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
            <li v-for="f in filasConError" :key="f.uid">
              <strong>{{ f.carpeta }}</strong>
              <span v-if="f.errorDetalle"> — {{ f.errorDetalle }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Tabla de preview -->
      <div class="rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse" style="min-width:920px">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Carpeta / Tipo</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto identificado</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Nombre en documento</th>
                <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 bg-purple-50">Archivo resultante</th>
                <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(fila, i) in filasPreview" :key="fila.uid"
                class="border-b border-gray-50 hover:bg-gray-50/50"
                :class="!fila.proyectoId || !fila.persona ? 'bg-amber-50/40' : ''">
                <!-- Carpeta + tipo detectado -->
                <td class="px-3 py-2">
                  <p class="text-xs font-mono text-gray-500 whitespace-nowrap">{{ fila.carpeta }}</p>
                  <div class="flex items-center gap-1 mt-0.5">
                    <span v-if="fila.tipo"
                      class="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
                      :style="tipoStyle(fila.tipo)">
                      {{ tipoLabel(fila.tipo) }}
                    </span>
                    <span v-if="fila.tipoArchivo"
                      class="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style="background:#f3f4f6;color:#6b7280">
                      {{ fila.tipoArchivo }}
                    </span>
                  </div>
                </td>
                <!-- Proyecto: selector si no fue identificado -->
                <td class="px-3 py-2">
                  <div v-if="fila.proyectoId" class="text-xs font-medium" style="color:#2C2039">
                    {{ fila.proyectoNombre }}
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
                    placeholder="Nombre de la persona o empresa…"
                    class="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-purple-200"
                    :class="!fila.persona ? 'border-amber-300' : ''" />
                </td>
                <!-- Nombre resultante (read-only) -->
                <td class="px-3 py-2 text-xs font-mono bg-purple-50/30" style="color:#7c3aed;max-width:260px">
                  <span class="truncate block" :title="nombreResultante(fila)">
                    {{ nombreResultante(fila) }}
                  </span>
                </td>
                <!-- Estado -->
                <td class="px-3 py-2 text-center">
                  <span v-if="fila.proyectoId && fila.persona"
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style="background:#dcfce7;color:#166534">
                    <i class="pi pi-check text-[10px]" />Listo
                  </span>
                  <span v-else
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium cursor-help"
                    style="background:#fef3c7;color:#92400e"
                    v-tooltip.top="fila.errorDetalle">
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
          {{ filasListas }} de {{ filasPreview.length }} archivos listos
        </span>
        <div class="flex gap-2">
          <Button label="Cancelar" size="small" outlined severity="secondary"
            :disabled="guardando" @click="showDialog = false" />
          <Button label="Confirmar y guardar" icon="pi pi-check" size="small"
            :loading="guardando" :disabled="filasListas === 0"
            @click="confirmar"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>

    </div>
  </Dialog>

  <!-- ── Dialog resumen post-guardado ────────────────────────────────────── -->
  <Dialog v-model:visible="showResumen" modal header="Resultado del procesamiento" :style="{ width: '540px' }">
    <div class="space-y-3 pt-1 text-sm">
      <!-- Asociados -->
      <div class="rounded-lg border p-3 space-y-1.5" style="background:#f0fdf4;border-color:#bbf7d0">
        <p class="text-xs font-semibold" style="color:#166534">
          <i class="pi pi-check-circle mr-1"/>
          {{ resumen.asociados.length }} contrato(s) asociados correctamente
        </p>
        <div v-for="item in resumen.asociados" :key="item.codigo"
          class="flex items-center gap-2 text-[11px] text-gray-600 pl-3">
          <i class="pi pi-file-pdf text-[9px]" style="color:#16a34a"/>
          <span class="font-mono text-gray-400">{{ item.codigo }}</span>
          <i class="pi pi-arrow-right text-[9px] text-gray-300"/>
          <span>{{ item.proyecto }}</span>
          <span v-if="item.pago_id" class="ml-auto text-gray-400 font-mono">pago_{{ item.pago_id }}</span>
        </div>
      </div>

      <!-- Sin match -->
      <div v-if="resumen.sinMatch.length" class="rounded-lg border p-3 space-y-1.5" style="background:#fffbeb;border-color:#fcd34d40">
        <p class="text-xs font-semibold" style="color:#92400e">
          <i class="pi pi-exclamation-triangle mr-1"/>
          {{ resumen.sinMatch.length }} código(s) sin match en BD
        </p>
        <div v-for="item in resumen.sinMatch" :key="item.codigo"
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
      <Button label="Cerrar" size="small" @click="showResumen = false; $emit('docs-actualizados', periodoZip || periodo)" />
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
import { uploadDoc } from '@/composables/useArriendosDocs'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const toast = useToast()

const props = defineProps({
  proyectos:    { type: Array,  required: true },   // [{ id, proyecto, codigo }]
  periodo:      { type: String, required: true },   // 'YYYY-MM'
  periodoLabel: { type: String, required: true },   // 'Mayo 2026'
})
const emit = defineEmits(['docs-actualizados'])

const zipInputRef  = ref(null)
const procesando   = ref(false)
const guardando    = ref(false)
const showDialog   = ref(false)
const showResumen  = ref(false)
const filasPreview = ref([])
const periodoZip   = ref(null)   // período extraído del nombre del ZIP

const resumen = ref({ asociados: [], sinMatch: [], archivosGuardados: 0, carpetasProcesadas: 0 })

let uidCounter = 0
const uid = () => `row_${++uidCounter}`

const filasConError = computed(() => filasPreview.value.filter(f => !f.proyectoId || !f.persona))
const filasListas   = computed(() => filasPreview.value.filter(f => f.proyectoId && f.persona).length)

// ── Etiquetas de tipo ─────────────────────────────────────────────────────────
function tipoLabel(tipo) {
  return { 1: 'Cuenta cobro simple', 3: 'Cuenta cobro múltiple', 4: 'Factura DIAN' }[tipo] ?? 'Desconocido'
}
function tipoStyle(tipo) {
  if (tipo === 1) return 'background:#ede9fe;color:#6d28d9'
  if (tipo === 3) return 'background:#dbeafe;color:#1e40af'
  if (tipo === 4) return 'background:#dcfce7;color:#166534'
  return 'background:#f3f4f6;color:#6b7280'
}

// ── Nombre de archivo resultante (misma lógica existente, no modificar) ────────
function mesLabel(periodoStr) {
  const [, mm] = periodoStr.split('-')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return MESES[parseInt(mm) - 1]
}

function nombreResultante(fila) {
  if (!fila.proyectoId || !fila.persona) return '—'
  const sanitize = s => (s || '').replace(/[/\\:*?"<>|]/g, '_').trim()
  const codigo  = sanitize(fila.codigoExtraido || fila.proyectoId)
  const nombre  = sanitize(fila.proyectoNombre || '')
  const mes     = mesLabel(periodoZip.value || props.periodo)
  const persona = sanitize(fila.persona)
  return `${codigo}_${nombre}_${mes}_${persona}.pdf`
}

// ── Extraer período del nombre del ZIP ─────────────────────────────────────────
function extraerPeriodoDeZip(filename) {
  // soportes_2026-06_operation_all.zip → 2026-06
  const m = filename.match(/(\d{4}-\d{2})/)
  if (!m) return null
  const [yyyy, mm] = m[1].split('-')
  if (parseInt(mm) >= 1 && parseInt(mm) <= 12) return m[1]
  return null
}

// ── Selección del archivo principal según prioridad ───────────────────────────
// 1. cuenta_cobro.pdf (nunca cuenta_cobro_enviada.pdf)
// 2. factura_electronica.pdf
// 3. factura_electronica.jpg
function seleccionarPrincipal(archivos) {
  // archivos: array de { path, entry, nombre }
  const porNombre = nombre => archivos.filter(a => a.nombre.toLowerCase() === nombre)

  const cuentaCobro = archivos.filter(a =>
    a.nombre.toLowerCase().includes('cuenta_cobro') &&
    !a.nombre.toLowerCase().includes('enviada') &&
    !a.nombre.toLowerCase().includes('_env')
  )
  if (cuentaCobro.length) return { principal: cuentaCobro[0], tipoArchivo: 'cuenta_cobro' }

  const factPdf = archivos.filter(a =>
    a.nombre.toLowerCase().includes('factura_electronica') && a.nombre.toLowerCase().endsWith('.pdf')
  )
  if (factPdf.length) return { principal: factPdf[0], tipoArchivo: 'factura_electronica' }

  const factJpg = archivos.filter(a =>
    a.nombre.toLowerCase().includes('factura_electronica') &&
    (a.nombre.toLowerCase().endsWith('.jpg') || a.nombre.toLowerCase().endsWith('.jpeg'))
  )
  if (factJpg.length) return { principal: factJpg[0], tipoArchivo: 'factura_electronica_jpg' }

  // Fallback: primer PDF
  const cualquierPdf = archivos.filter(a => a.nombre.toLowerCase().endsWith('.pdf') && !a.nombre.toLowerCase().includes('enviada'))
  if (cualquierPdf.length) return { principal: cualquierPdf[0], tipoArchivo: 'pdf' }

  return { principal: archivos[0] || null, tipoArchivo: 'desconocido' }
}

function seleccionarSecundario(archivos, principal) {
  return archivos.find(a =>
    a !== principal &&
    a.nombre.toLowerCase().includes('enviada') &&
    a.nombre.toLowerCase().endsWith('.pdf')
  ) ?? null
}

// ── Extracción de texto del PDF → líneas ──────────────────────────────────────
async function extraerLineas(arrayBuffer) {
  try {
    const pdf   = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    const pages = []
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
      const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a)
      const lineas   = sortedYs.map(y =>
        byY[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim()
      ).filter(l => l)
      pages.push(lineas)
    }
    return pages
  } catch { return [] }
}

// ── Detección de tipo ─────────────────────────────────────────────────────────
function detectarTipo(paginasLineas) {
  const primeras = paginasLineas[0] ?? []
  const texto    = primeras.join('\n')
  if (/FACTURA ELECTR[OÓ]NICA\s+DE\s+VENTA/i.test(texto)) return 4
  if (/CUENTA DE COBRO\s+N[\.º°]\s*UNERGY/i.test(texto))   return 3
  if (/CUENTA DE COBRO/i.test(texto))                        return 1
  return 0
}

function stripZapSign(paginasLineas) {
  const resultado = []
  for (const pagLineas of paginasLineas) {
    if (/ZapSign|Informe de Firmas|Audit Trail/i.test(pagLineas.join('\n'))) break
    resultado.push(pagLineas)
  }
  return resultado
}

function esNombreValido(texto) {
  if (!texto || texto.length < 4 || texto.length > 100) return false
  if (/^\d+$/.test(texto)) return false
  if (/^\$|^COP\s*\d/i.test(texto)) return false
  if (/^(CUENTA|FACTURA|DEBE|FIRMA|FECHA|VALOR|TOTAL|CONCEPTO|PROYECTO|ESTADO)/i.test(texto)) return false
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(texto)) return false
  return true
}

function parseTipo1(paginasLineas) {
  const lineas = paginasLineas.flat()
  for (let i = 0; i < lineas.length; i++) {
    if (/^\s*DEBE\s+A\s*$/i.test(lineas[i])) {
      for (let j = i + 1; j < lineas.length; j++) {
        const candidato = lineas[j].trim()
        if (!candidato) continue
        const siguiente = lineas.slice(j + 1, j + 4).join(' ')
        if (/C\.?C\.?\s*\d/i.test(siguiente) || /C\.?C\.?/i.test(candidato)) {
          const nombre = candidato.replace(/C\.?C\.?\s*\d+.*/i, '').trim()
          if (esNombreValido(nombre)) return { nombre, error: null }
        }
        if (esNombreValido(candidato)) return { nombre: candidato, error: null }
        break
      }
    }
  }
  return { nombre: '', error: 'No se encontró "DEBE A" seguido de nombre' }
}

function parseTipo3(paginasLineas) {
  const pagsFiltradas = stripZapSign(paginasLineas)
  const lineas        = pagsFiltradas.flat()
  let nombre = ''
  for (let i = 0; i < lineas.length; i++) {
    if (/^\s*DEBE\s+A\s*$/i.test(lineas[i])) {
      for (let j = i + 1; j < lineas.length; j++) {
        const candidato = lineas[j].trim()
        if (!candidato) continue
        const contexto = lineas.slice(j, j + 5).join(' ')
        if (/NIT\.?\s*\d/i.test(contexto)) {
          const nom = candidato.replace(/NIT\.?\s*\d+.*/i, '').trim()
          if (esNombreValido(nom)) { nombre = nom; break }
          if (esNombreValido(candidato)) { nombre = candidato; break }
        }
        if (esNombreValido(candidato)) { nombre = candidato; break }
        break
      }
      break
    }
  }
  const proyectosEnTabla = []
  const nombreProyectoRegex = /(?:Minigranja\s+Solar[\w\s]+|MINIGRANJA\s+SOLAR[\w\s]+)/i
  for (const l of lineas) {
    const m = l.match(nombreProyectoRegex)
    if (m) {
      const proyecto = m[0].replace(/\s+(?:Aprobado|Pendiente|Pagado|\$|COP)\b.*/i, '').trim()
      if (proyecto && !proyectosEnTabla.includes(proyecto)) proyectosEnTabla.push(proyecto)
    }
  }
  return { nombre, proyectos: proyectosEnTabla.length ? proyectosEnTabla : null, error: nombre ? null : 'No se encontró "DEBE A"' }
}

function parseTipo4(paginasLineas) {
  const lineas = paginasLineas.flat()
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]
    const mInline = l.match(/Raz[oó]n\s+Social\s*[:\s]+(.+)/i)
    if (mInline) {
      const nombre = mInline[1].split(/[,;|]/)[0].trim()
      if (esNombreValido(nombre)) return { nombre, error: null }
    }
    if (/Raz[oó]n\s+Social\s*[:\s]*$/i.test(l) && lineas[i + 1]) {
      const nombre = lineas[i + 1].trim().split(/[,;|]/)[0].trim()
      if (esNombreValido(nombre)) return { nombre, error: null }
    }
  }
  return { nombre: '', error: 'No se encontró "Razón Social"' }
}

// ── Matching ──────────────────────────────────────────────────────────────────
function matchPorCodigo(folderCode) {
  if (!folderCode) return null
  let p = props.proyectos.find(p => p.codigo === folderCode)
  if (p) return p
  p = props.proyectos.find(p => p.codigo && p.codigo.startsWith(folderCode))
  return p ?? null
}

function matchPorNombre(nombreTabla) {
  if (!nombreTabla) return null
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const needle = norm(nombreTabla)
  let p = props.proyectos.find(p => norm(p.proyecto) === needle)
  if (p) return p
  p = props.proyectos.find(p => norm(p.proyecto).includes(needle) || needle.includes(norm(p.proyecto)))
  return p ?? null
}

// ── Procesamiento del ZIP ─────────────────────────────────────────────────────
async function onZipSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  procesando.value = true
  filasPreview.value = []
  periodoZip.value = extraerPeriodoDeZip(file.name)

  try {
    const zip      = await JSZip.loadAsync(file)
    const carpetas = new Set()

    zip.forEach((path) => {
      const partes = path.split('/')
      if (partes[0].toLowerCase().startsWith('pago_')) carpetas.add(partes[0])
    })

    if (!carpetas.size) {
      toast.add({ severity: 'warn', summary: 'ZIP sin carpetas pago_*', life: 4000 })
      return
    }

    const nuevasFilas = []

    for (const carpeta of [...carpetas].sort()) {
      // pago_3554_COLCEST17 → pagoId=3554, codigoExtraido=COLCEST17
      const partes         = carpeta.split('_')
      const pagoId         = parseInt(partes[1]) || 0
      const codigoExtraido = partes.slice(2).join('_')

      // Recopilar todos los archivos de la carpeta
      const archivosEnCarpeta = []
      zip.forEach((path, entry) => {
        if (path.startsWith(carpeta + '/') && !entry.dir) {
          const nombre = path.split('/').pop()
          archivosEnCarpeta.push({ path, entry, nombre })
        }
      })

      if (!archivosEnCarpeta.length) {
        nuevasFilas.push({
          uid: uid(), carpeta, codigoExtraido, pagoId,
          proyectoId: null, proyectoNombre: null,
          persona: '', pdfBlob: null, pdfSecBlob: null, tipo: 0, tipoArchivo: null,
          errorDetalle: 'Sin archivos en la carpeta',
        })
        continue
      }

      // Seleccionar principal y secundario según prioridad
      const { principal, tipoArchivo } = seleccionarPrincipal(archivosEnCarpeta)
      const secundario = seleccionarSecundario(archivosEnCarpeta, principal)

      if (!principal) {
        nuevasFilas.push({
          uid: uid(), carpeta, codigoExtraido, pagoId,
          proyectoId: null, proyectoNombre: null,
          persona: '', pdfBlob: null, pdfSecBlob: null, tipo: 0, tipoArchivo,
          errorDetalle: 'Sin documento principal reconocible',
        })
        continue
      }

      const esPdf = principal.nombre.toLowerCase().endsWith('.pdf')
      const pdfBuffer = await principal.entry.async('arraybuffer')
      const pdfBlob   = new Blob([pdfBuffer], { type: esPdf ? 'application/pdf' : 'image/jpeg' })

      let pdfSecBlob = null
      let pdfSecNombre = null
      if (secundario) {
        const secBuffer = await secundario.entry.async('arraybuffer')
        pdfSecBlob   = new Blob([secBuffer], { type: 'application/pdf' })
        pdfSecNombre = secundario.nombre
      }

      let tipo = 0
      let parsedPersona = ''
      let parsedError = null

      if (esPdf) {
        const paginas = await extraerLineas(pdfBuffer)
        tipo = detectarTipo(paginas)

        if (tipo === 1) {
          const r = parseTipo1(paginas)
          parsedPersona = r.nombre
          parsedError   = r.error
        } else if (tipo === 3) {
          const r = parseTipo3(paginas)
          if (r.proyectos?.length) {
            // Tipo 3 con múltiples proyectos → una fila por proyecto
            for (const nomProyecto of r.proyectos) {
              const match = matchPorNombre(nomProyecto) ?? matchPorCodigo(codigoExtraido)
              nuevasFilas.push({
                uid: uid(), carpeta, codigoExtraido, pagoId,
                proyectoId:     match?.id ?? null,
                proyectoNombre: match?.proyecto ?? nomProyecto,
                persona:        r.nombre,
                pdfBlob, pdfSecBlob, pdfSecNombre, tipo, tipoArchivo,
                errorDetalle: !match ? 'Proyecto no identificado' : !r.nombre ? r.error : null,
              })
            }
            continue
          }
          parsedPersona = r.nombre
          parsedError   = r.error
        } else if (tipo === 4) {
          const r = parseTipo4(paginas)
          parsedPersona = r.nombre
          parsedError   = r.error
        }
      }

      const match = matchPorCodigo(codigoExtraido)
      nuevasFilas.push({
        uid: uid(), carpeta, codigoExtraido, pagoId,
        proyectoId:     match?.id ?? null,
        proyectoNombre: match?.proyecto ?? null,
        persona:        parsedPersona,
        pdfBlob, pdfSecBlob, pdfSecNombre, tipo, tipoArchivo,
        errorDetalle: !match ? 'Proyecto no identificado' : (!parsedPersona && parsedError) ? parsedError : null,
      })
    }

    filasPreview.value = nuevasFilas
    showDialog.value   = true
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error al procesar el ZIP', detail: err.message, life: 5000 })
  } finally {
    procesando.value = false
  }
}

function onProyectoSeleccionado(i) {
  const p = props.proyectos.find(p => p.id === filasPreview.value[i].proyectoId)
  if (p) filasPreview.value[i].proyectoNombre = p.proyecto
}

// ── Confirmar y guardar ───────────────────────────────────────────────────────
async function confirmar() {
  guardando.value = true
  const periodoParse = periodoZip.value || props.periodo
  const asociados    = []
  const sinMatch     = []
  let archivosGuardados = 0

  try {
    for (const fila of filasPreview.value) {
      if (!fila.proyectoId || !fila.persona || !fila.pdfBlob) {
        if (fila.codigoExtraido && !fila.proyectoId) {
          sinMatch.push({ codigo: fila.codigoExtraido, carpeta: fila.carpeta })
        }
        continue
      }

      const filename = nombreResultante(fila)
      const tipoDoc  = fila.tipoArchivo || (fila.tipo === 4 ? 'factura_electronica' : 'cuenta_cobro')

      try {
        await uploadDoc({
          file:            new File([fila.pdfBlob], filename),
          fileSecundario:  fila.pdfSecBlob ? new File([fila.pdfSecBlob], fila.pdfSecNombre || 'enviada.pdf') : null,
          arrProyectoId:   fila.proyectoId,
          periodo:         periodoParse,
          pagoId:          fila.pagoId,
          codigoContrato:  fila.codigoExtraido,
          tipoDocumento:   tipoDoc,
          nombreResultante: filename,
        })
        archivosGuardados++
        asociados.push({
          codigo:   fila.codigoExtraido,
          proyecto: fila.proyectoNombre,
          pago_id:  fila.pagoId,
        })
      } catch (uploadErr) {
        console.error('Error subiendo', fila.carpeta, uploadErr)
        toast.add({ severity: 'warn', summary: `Error al subir ${fila.carpeta}`, life: 4000 })
      }
    }

    // Carpetas sin match en BD
    for (const fila of filasPreview.value) {
      if (!fila.proyectoId && fila.codigoExtraido && !sinMatch.find(s => s.codigo === fila.codigoExtraido)) {
        sinMatch.push({ codigo: fila.codigoExtraido, carpeta: fila.carpeta })
      }
    }

    resumen.value = {
      asociados,
      sinMatch,
      archivosGuardados,
      carpetasProcesadas: filasPreview.value.length,
    }

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
</script>
