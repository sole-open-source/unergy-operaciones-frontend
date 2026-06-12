# Garantías Fase 2 — Descuento de facturas (PDF) en Semanales

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Permitir subir PDFs de XM en el flujo Semanales, extraer documentos (tipo/valor/vencimiento/número), marcar los DÉBITO a descontar y ajustar el "Disponible" usado en panel y mensaje.

**Architecture:** Solo frontend. Nuevo composable `useFacturasPDF.js` (pdfjs-dist, ya instalado). Nuevo componente `FacturasDescuento.vue` (tabla editable). Integración en `SemanalesTab.vue`. Sin backend, sin persistencia del detalle.

**Spec:** `docs/superpowers/specs/2026-06-11-garantias-parser-correcciones-y-descuento-facturas.md` (Fase 2).

**Nota de calibración:** la extracción posicional de fecha/valor es best-effort; toda celda es editable y hay avisos de revisión + ingreso manual. Requiere validación con PDFs reales.

---

### Task 1: Composable `useFacturasPDF.js`

**Files:**
- Create: `src/views/Garantias/AjustesXM/composables/useFacturasPDF.js`

Requisitos (spec §2.2):
- Worker de pdfjs para Vite: `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` y `pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl`.
- `parseFacturas(files)` → `{ documentos: [...], errors: [] }`. Procesa varios archivos; cada **página** = un documento.
- Por documento extraer:
  - **tipo** por título (tabla del spec). DÉBITO = descuenta; resto no por defecto.
  - **valorTotal**: regex `/Valor Total:\s*([\d.,]+)/` sobre el texto de la página, **primer match**. Si hay >1 match → `warnings: ['multiple_valor']`. Formato CO `9.755,00`→`9755.00`.
  - **vencimiento**: fecha bajo la etiqueta `Vencimiento` (NO Generación/Expedición/Periodo). Usar posiciones de `getTextContent` para tomar la fecha más cercana debajo de la etiqueta; fallback: primera fecha tras "Vencimiento" en el texto. Formato `DD-mmm-YY` ES. Si no se halla → `warnings: ['sin_vencimiento']`.
  - **numero**: identificador junto al título (`/\b([A-Z]{2,5}\d{4,})\b/`).
  - **pagina**: número de página de origen.
  - Si la página no tiene texto (escaneada) → `warnings: ['escaneada']`, campos en null.

Implementación de referencia:

```js
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const MESES = { ene:0, feb:1, mar:2, abr:3, may:4, jun:5, jul:6, ago:7, sep:8, sept:8, oct:9, nov:10, dic:11 }
const DATE_RE = /(\d{1,2})-([a-zA-Záéíóú]+)\.?-(\d{2,4})/

const TIPO_RULES = [
  { re: /FACTURA ELECTR[OÓ]NICA DE VENTA/i, tipo: 'DÉBITO',       concepto: 'Factura de venta',  descuenta: true },
  { re: /Nota\s*cr[eé]dito/i,               tipo: 'CRÉDITO',      concepto: 'Nota crédito',      descuenta: false },
  { re: /Informe de Ventas/i,               tipo: 'INFORME',      concepto: 'Informe de ventas', descuenta: false },
  { re: /Ajuste de Ventas a Cargo/i,        tipo: 'AJUSTE CARGO', concepto: 'Ajuste a cargo',    descuenta: false },
  { re: /Ajuste de Ventas a Favor/i,        tipo: 'AJUSTE FAVOR', concepto: 'Ajuste a favor',    descuenta: false },
]

function classifyTipo(text) {
  for (const r of TIPO_RULES) if (r.re.test(text)) return r
  return { tipo: 'DESCONOCIDO', concepto: '—', descuenta: false }
}

function parseCO(s) {
  if (s == null) return null
  const n = parseFloat(String(s).trim().replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseFechaES(s) {
  const m = String(s).toLowerCase().match(DATE_RE)
  if (!m) return null
  const mes = MESES[m[2].slice(0, 4)] ?? MESES[m[2].slice(0, 3)]
  if (mes == null) return null
  let yy = parseInt(m[3], 10); if (yy < 100) yy += 2000
  const d = new Date(yy, mes, parseInt(m[1], 10))
  return isNaN(d.getTime()) ? null : d
}

function fechaISO(d) {
  if (!d) return null
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

// Fecha bajo la etiqueta 'Vencimiento' usando posiciones (transform[4]=x, [5]=y)
function vencimientoDesdeItems(items) {
  const label = items.find((it) => /vencimiento/i.test(it.str))
  if (!label) return null
  const lx = label.transform[4], ly = label.transform[5]
  let best = null, score = Infinity
  for (const it of items) {
    const m = it.str.match(DATE_RE)
    if (!m) continue
    const x = it.transform[4], y = it.transform[5]
    const dy = ly - y               // y crece hacia arriba en PDF; debajo => dy>0
    if (dy < -2) continue           // descartar lo que está por encima de la etiqueta
    const s = Math.abs(dy) + Math.abs(x - lx) * 0.5
    if (s < score) { score = s; best = m[0] }
  }
  return best
}

export async function parseFacturas(files) {
  const documentos = []
  const errors = []
  for (const file of files) {
    let pdf
    try {
      const data = await file.arrayBuffer()
      pdf = await pdfjsLib.getDocument({ data }).promise
    } catch (e) {
      errors.push(`No se pudo leer ${file.name}: ${e.message}`)
      continue
    }
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      const items = content.items
      const text = items.map((i) => i.str).join(' ')
      const warnings = []

      if (!text.trim()) {
        documentos.push({ archivo: file.name, pagina: p, tipo: 'DESCONOCIDO', concepto: '—',
          descuenta: false, numero: null, valorTotal: null, vencimiento: null,
          warnings: ['escaneada'] })
        continue
      }

      const cls = classifyTipo(text)
      const numero = (text.match(/\b([A-Z]{2,5}\d{4,})\b/) || [])[1] || null

      const valMatches = [...text.matchAll(/Valor Total:\s*([\d.,]+)/g)]
      const valorTotal = valMatches.length ? parseCO(valMatches[0][1]) : null
      if (valMatches.length > 1) warnings.push('multiple_valor')
      if (!valMatches.length) warnings.push('sin_valor')

      let vStr = vencimientoDesdeItems(items)
      if (!vStr) {
        const after = text.split(/vencimiento/i)[1]
        if (after) { const m = after.match(DATE_RE); if (m) vStr = m[0] }
      }
      const vDate = parseFechaES(vStr)
      if (!vDate) warnings.push('sin_vencimiento')

      documentos.push({
        archivo: file.name, pagina: p,
        tipo: cls.tipo, concepto: cls.concepto, descuenta: cls.descuenta,
        numero, valorTotal,
        vencimiento: fechaISO(vDate),
        warnings,
      })
    }
  }
  // dedup por numero (conservar primero)
  const seen = new Set()
  const dedup = documentos.filter((d) => {
    if (!d.numero) return true
    if (seen.has(d.numero)) return false
    seen.add(d.numero); return true
  })
  return { documentos: dedup, errors }
}

// Viernes de la semana actual (configurable por el caller)
export function viernesDeEstaSemana(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = d.getDay()              // 0 dom .. 6 sab
  const diff = 5 - day                // 5 = viernes
  d.setDate(d.getDate() + diff)
  return d
}
```

- [ ] Crear el archivo.
- [ ] `npm run build` (verifica que el worker `?url` resuelve en Vite).
- [ ] Commit: `feat(garantias): composable parseFacturas (PDF XM con pdfjs)`

---

### Task 2: Componente `FacturasDescuento.vue`

**Files:**
- Create: `src/views/Garantias/AjustesXM/FacturasDescuento.vue`

Props: `documentos` (Array), `disponible` (Number), `fechaObjetivo` (String ISO).
Emite: `update:totalDescontado`, `update:disponibleAjustado` (o expone vía v-model). Mantiene el estado `marcado` por fila.

Comportamiento (spec §2.4):
- Tabla editable: `✓ | Número | Tipo | Concepto | Valor Total | Vencimiento | Página`.
- Inicial: marcar los `descuenta === true` (DÉBITO) con `vencimiento <= fechaObjetivo`. El usuario puede togglear cualquiera.
- `Valor Total` y `Vencimiento` editables (InputNumber / input date) por si la extracción fue imperfecta.
- Filas con `warnings` (multiple_valor / sin_vencimiento / sin_valor / escaneada): badge ámbar "revisar" + tooltip del motivo.
- Pie: `Disponible original`, `Total descontado` (suma de marcados con valorTotal), `Disponible ajustado` = original − total descontado.
- Recalcular en cada cambio y emitir `totalDescontado` y `disponibleAjustado` al padre.

- [ ] Crear el componente (PrimeVue: Checkbox/InputNumber/Button; estilo consistente con los otros tabs).
- [ ] `npm run build`.
- [ ] Commit: `feat(garantias): componente FacturasDescuento editable`

---

### Task 3: Integrar en `SemanalesTab.vue`

**Files:**
- Modify: `src/views/Garantias/AjustesXM/tabs/SemanalesTab.vue`

- [ ] Paso 1: añadir una zona de carga **opcional** multi-archivo para PDFs (`accept=".pdf"`, `multiple`). Guardar en `files.value.pdfs` (array).
- [ ] En `procesar()`: si hay PDFs, `await parseFacturas(pdfs)` y guardar `facturas.value`. Si falla, push a `parseErrors` sin abortar el resto.
- [ ] Estado: `fechaObjetivo = ref(fmtISODate(viernesDeEstaSemana()))` (editable con un date input en Paso 2).
- [ ] Paso 2: bajo el panel de custodia, si hay `facturas`, renderizar `<FacturasDescuento :documentos :disponible="custodia.disponible" :fechaObjetivo v-model:disponibleAjustado="disponibleAjustado" v-model:totalDescontado="totalDescontado" />`.
- [ ] `disponibleAjustado` (ref, default = custodia.disponible) reemplaza a `custodia.disponible` en:
  - la card "Disponible" del panel (cuando hay facturas) — mostrar el ajustado, y debajo el original en gris.
  - `disponibleAplicacion` = disponibleAjustado + totalUNGG + totalUNGC.
  - el mensaje (Paso 3): la línea de disponible usa el ajustado; opcional añadir "Descontado: $X" si totalDescontado>0.
- [ ] Sin facturas: comportamiento idéntico al actual (usa custodia.disponible).
- [ ] No romper `guardarRegistro` (sigue guardando `disponibleCustodia` = original; el ajustado es de visualización).
- [ ] `npm run build`.
- [ ] Commit: `feat(garantias): integrar descuento de facturas en flujo Semanales`

---

### Task 4: Build final + push + verificar prod

- [ ] `npm run build` final limpio.
- [ ] `git fetch` + merge/pull no destructivo si el remoto avanzó; rebuild si hubo merge.
- [ ] `git push origin master`.
- [ ] Verificar en producción (curl + grep de un marcador, p. ej. "Disponible ajustado").
