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
    :style="{ width: '980px', maxWidth: '98vw' }"
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
          <table class="w-full text-sm border-collapse" style="min-width:860px">
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
                  <span v-if="fila.tipo"
                    class="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium"
                    :style="tipoStyle(fila.tipo)">
                    {{ tipoLabel(fila.tipo) }}
                  </span>
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

const zipInputRef  = ref(null)
const procesando   = ref(false)
const guardando    = ref(false)
const showDialog   = ref(false)
const filasPreview = ref([])

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

// ── Nombre de archivo resultante ──────────────────────────────────────────────
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
  const mes     = mesLabel(props.periodo)
  const persona = sanitize(fila.persona)
  return `${codigo}_${nombre}_${mes}_${persona}.pdf`
}

// ── Extracción de texto del PDF → líneas ──────────────────────────────────────
async function extraerLineas(arrayBuffer) {
  try {
    const pdf   = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    const pages = []

    for (let p = 1; p <= pdf.numPages; p++) {
      const page    = await pdf.getPage(p)
      const content = await page.getTextContent()

      // Agrupar items por posición Y → reconstruir líneas
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
  } catch (err) {
    console.error('Error PDF:', err)
    return []
  }
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

// ── Strip de páginas ZapSign ──────────────────────────────────────────────────
function stripZapSign(paginasLineas) {
  const resultado = []
  for (const pagLineas of paginasLineas) {
    const textoPage = pagLineas.join('\n')
    if (/ZapSign|Informe de Firmas|Audit Trail/i.test(textoPage)) break
    resultado.push(pagLineas)
  }
  return resultado
}

// ── Parser Tipo 1 / 2: Cuenta de cobro simple ─────────────────────────────────
// Estructura: ... DEBE A \n <Nombre> \n CC. XXXXXXX
function parseTipo1(paginasLineas) {
  const lineas = paginasLineas.flat()

  for (let i = 0; i < lineas.length; i++) {
    if (/^\s*DEBE\s+A\s*$/i.test(lineas[i])) {
      // Siguiente línea no vacía = nombre
      for (let j = i + 1; j < lineas.length; j++) {
        const candidato = lineas[j].trim()
        if (!candidato) continue
        // La línea siguiente debe tener CC. o C.C.
        const siguiente = lineas.slice(j + 1, j + 4).join(' ')
        if (/C\.?C\.?\s*\d/i.test(siguiente) || /C\.?C\.?/i.test(candidato)) {
          // Si el CC está en la misma línea, separar
          const nombre = candidato.replace(/C\.?C\.?\s*\d+.*/i, '').trim()
          if (esNombreValido(nombre)) return { nombre, error: null }
        }
        // Aceptar si parece nombre aunque no veamos CC inmediatamente
        if (esNombreValido(candidato)) return { nombre: candidato, error: null }
        break
      }
    }
  }
  return { nombre: '', error: 'No se encontró "DEBE A" seguido de nombre' }
}

// ── Parser Tipo 3: Cuenta de cobro múltiple (ZapSign) ────────────────────────
// Estructura: DEBE A \n <Nombre> \n NIT. + tabla Concepto|Proyecto|Estado|Valor
function parseTipo3(paginasLineas) {
  const pagsFiltradas = stripZapSign(paginasLineas)
  const lineas        = pagsFiltradas.flat()

  // 1. Extraer nombre (igual que tipo 1 pero confirma con NIT)
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

  // 2. Extraer filas de la tabla (Concepto | Proyecto | Estado | Valor)
  //    Los PDFs de texto extraen celdas en orden de lectura.
  //    Buscar segmentos que contengan nombre de proyecto reconocible.
  const proyectosEnTabla = []
  const nombreProyectoRegex = /(?:Minigranja\s+Solar[\w\s]+|MINIGRANJA\s+SOLAR[\w\s]+)/i

  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(nombreProyectoRegex)
    if (m) {
      // Limpiar: quitar texto después de separadores típicos de tabla
      const proyecto = m[0].replace(/\s+(?:Aprobado|Pendiente|Pagado|\$|COP)\b.*/i, '').trim()
      if (proyecto && !proyectosEnTabla.includes(proyecto)) {
        proyectosEnTabla.push(proyecto)
      }
    }
  }

  return {
    nombre,
    proyectos: proyectosEnTabla.length ? proyectosEnTabla : null,
    error: nombre ? null : 'No se encontró "DEBE A" seguido de nombre',
  }
}

// ── Parser Tipo 4: Factura electrónica DIAN ──────────────────────────────────
function parseTipo4(paginasLineas) {
  const lineas = paginasLineas.flat()
  let enSeccionEmisor = false

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]

    // Detectar sección del emisor
    if (/Datos del Emisor|Datos del Vendedor|EMISOR|VENDEDOR/i.test(l)) {
      enSeccionEmisor = true
    }

    // Buscar Razón Social (puede estar en la misma línea o la siguiente)
    if (enSeccionEmisor || true) {   // buscar en todo el doc por seguridad
      const mInline = l.match(/Raz[oó]n\s+Social\s*[:\s]+(.+)/i)
      if (mInline) {
        const nombre = mInline[1].split(/[,;|]/)[0].trim()
        if (esNombreValido(nombre)) return { nombre, error: null }
      }
      // Razón Social en una línea, valor en la siguiente
      if (/Raz[oó]n\s+Social\s*[:\s]*$/i.test(l) && lineas[i + 1]) {
        const nombre = lineas[i + 1].trim().split(/[,;|]/)[0].trim()
        if (esNombreValido(nombre)) return { nombre, error: null }
      }
    }
  }
  return { nombre: '', error: 'No se encontró "Razón Social" del emisor' }
}

// ── Validación de nombre ──────────────────────────────────────────────────────
function esNombreValido(texto) {
  if (!texto || texto.length < 4 || texto.length > 100) return false
  // Descartar si es sólo números, fechas, valores monetarios o palabras clave
  if (/^\d+$/.test(texto)) return false
  if (/^\$|^COP\s*\d/i.test(texto)) return false
  if (/^(CUENTA|FACTURA|DEBE|FIRMA|FECHA|VALOR|TOTAL|CONCEPTO|PROYECTO|ESTADO)/i.test(texto)) return false
  // Debe tener al menos una letra
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(texto)) return false
  return true
}

// ── Matching carpeta-código → proyecto ────────────────────────────────────────
function matchPorCodigo(folderCode) {
  if (!folderCode) return null
  let p = props.proyectos.find(p => p.codigo === folderCode)
  if (p) return p
  // Prefijo: el código del ZIP es prefijo del código completo
  p = props.proyectos.find(p => p.codigo && p.codigo.startsWith(folderCode))
  return p ?? null
}

function matchPorNombre(nombreTabla) {
  if (!nombreTabla) return null
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const needle = norm(nombreTabla)
  // Exacto
  let p = props.proyectos.find(p => norm(p.proyecto) === needle)
  if (p) return p
  // Contiene
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
      // Extraer código del nombre de carpeta: pago_2213_COLCEST49 → COLCEST49
      const partes         = carpeta.split('_')
      const codigoExtraido = partes.slice(2).join('_')

      // Buscar primer PDF en la carpeta
      let pdfEntry = null
      zip.forEach((path, entry) => {
        if (path.startsWith(carpeta + '/') && path.toLowerCase().endsWith('.pdf') && !entry.dir) {
          if (!pdfEntry) pdfEntry = entry
        }
      })

      if (!pdfEntry) {
        nuevasFilas.push({
          uid: uid(), carpeta, codigoExtraido,
          proyectoId: null, proyectoNombre: null,
          persona: '', pdfBlob: null, tipo: 0,
          errorDetalle: 'Sin PDF en la carpeta',
        })
        continue
      }

      const pdfBuffer  = await pdfEntry.async('arraybuffer')
      const paginas    = await extraerLineas(pdfBuffer)
      const tipo       = detectarTipo(paginas)
      const pdfBlob    = new Blob([pdfBuffer], { type: 'application/pdf' })

      if (tipo === 0) {
        nuevasFilas.push({
          uid: uid(), carpeta, codigoExtraido,
          proyectoId: null, proyectoNombre: null,
          persona: '', pdfBlob, tipo,
          errorDetalle: 'Tipo de documento no reconocido',
        })
        continue
      }

      if (tipo === 1) {
        const { nombre, error } = parseTipo1(paginas)
        const match = matchPorCodigo(codigoExtraido)
        nuevasFilas.push({
          uid: uid(), carpeta, codigoExtraido,
          proyectoId:     match?.id ?? null,
          proyectoNombre: match?.proyecto ?? null,
          persona:        nombre,
          pdfBlob, tipo,
          errorDetalle: !match ? 'Proyecto no identificado' : !nombre ? error : null,
        })
        continue
      }

      if (tipo === 3) {
        const { nombre, proyectos, error } = parseTipo3(paginas)

        if (proyectos?.length) {
          // Una entrada por proyecto en la tabla
          for (const nomProyecto of proyectos) {
            const match = matchPorNombre(nomProyecto) ?? matchPorCodigo(codigoExtraido)
            nuevasFilas.push({
              uid: uid(), carpeta, codigoExtraido,
              proyectoId:     match?.id ?? null,
              proyectoNombre: match?.proyecto ?? nomProyecto,
              persona:        nombre,
              pdfBlob, tipo,
              errorDetalle: !match ? 'Proyecto no identificado' : !nombre ? error : null,
            })
          }
        } else {
          // Sin tabla identificada: una entrada con el código de la carpeta
          const match = matchPorCodigo(codigoExtraido)
          nuevasFilas.push({
            uid: uid(), carpeta, codigoExtraido,
            proyectoId:     match?.id ?? null,
            proyectoNombre: match?.proyecto ?? null,
            persona:        nombre,
            pdfBlob, tipo,
            errorDetalle: !match ? 'Proyecto no identificado' : !nombre ? error : null,
          })
        }
        continue
      }

      if (tipo === 4) {
        const { nombre, error } = parseTipo4(paginas)
        const match = matchPorCodigo(codigoExtraido)
        nuevasFilas.push({
          uid: uid(), carpeta, codigoExtraido,
          proyectoId:     match?.id ?? null,
          proyectoNombre: match?.proyecto ?? null,
          persona:        nombre,
          pdfBlob, tipo,
          errorDetalle: !match ? 'Proyecto no identificado' : !nombre ? error : null,
        })
      }
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
  let guardados = 0
  try {
    for (const fila of filasPreview.value) {
      if (!fila.proyectoId || !fila.persona || !fila.pdfBlob) continue

      const filename = nombreResultante(fila)
      const key      = docKey(fila.proyectoId, props.periodo)

      await storeBlob(key, new Blob([fila.pdfBlob], { type: 'application/pdf' }))
      docsMeta.value[key] = {
        filename,
        proyecto: fila.proyectoNombre,
        persona:  fila.persona.trim(),
        periodo:  props.periodo,
        codigo:   fila.codigoExtraido,
      }
      guardados++
    }
    saveDocsMeta()
    showDialog.value = false
    toast.add({
      severity: 'success',
      summary:  `${guardados} archivo(s) guardados`,
      detail:   'Visibles en la columna Documento.',
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
