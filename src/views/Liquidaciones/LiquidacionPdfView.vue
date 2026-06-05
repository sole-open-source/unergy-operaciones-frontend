<template>
  <div class="liqpdf-wrapper">
    <!-- Toast -->
    <transition name="fade">
      <div v-if="toastMsg" :class="['liqpdf-toast', toastErr ? 'is-err' : 'is-ok']">{{ toastMsg }}</div>
    </transition>

    <!-- Toolbar (no se imprime) -->
    <div class="liqpdf-toolbar">
      <div class="flex items-center gap-2">
        <Button icon="pi pi-arrow-left" text size="small" @click="volver" />
        <div>
          <div class="text-sm font-bold" style="color:#2C2039">Informe PDF — Estado de Resultados</div>
          <div class="text-[11px]" style="color:#9b8fb0">
            {{ liq?.proyecto_nombre }} · {{ periodoLabel }}
            <span v-if="actualizadoEn"> · guardado {{ actualizadoEn }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <Button v-if="!editMode" label="Editar" icon="pi pi-pencil" outlined size="small"
          style="border-color:#915BD8; color:#915BD8" @click="enterEdit" />
        <Button v-if="editMode" label="Descartar" icon="pi pi-undo" outlined size="small"
          severity="secondary" @click="discardEdit" />
        <Button v-if="editMode" label="Guardar" icon="pi pi-save" size="small"
          style="background:#915BD8; border-color:#915BD8" :loading="saving" @click="guardar" />
        <Button label="Regenerar" icon="pi pi-refresh" outlined size="small"
          severity="secondary" @click="regenerar" :disabled="editMode" title="Reconstruir el informe desde los datos actuales" />
        <Button label="Descargar PDF" icon="pi pi-file-pdf" size="small"
          style="background:#F6FF72; border-color:#F6FF72; color:#2C2039" @click="descargar" />
      </div>
    </div>

    <div v-if="editMode" class="liqpdf-hint">
      ✏️ Haz clic en cualquier texto para editarlo. Al terminar pulsa <b>Guardar</b>.
      El PDF respeta saltos de página: las capas no se cortan y el pie va siempre al final de cada hoja.
    </div>

    <ProgressSpinner v-if="loading" class="block mx-auto my-10" />

    <!-- Lienzo del informe -->
    <div v-show="!loading" class="liqpdf-canvas">
      <div ref="contentRef" class="liq-doc" :contenteditable="editMode ? 'true' : 'false'" v-html="htmlContent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import {
  fmtCOP, pct, formatPeriodo,
  construirEstadoResultados, indiceSoportesProyecto,
} from '@/utils/liquidaciones'

const route = useRoute()
const router = useRouter()

const liq = ref(null)
const inversionistas = ref([])
const htmlContent = ref('')
const actualizadoEn = ref(null)
const loading = ref(false)
const saving = ref(false)
const editMode = ref(false)
const contentRef = ref(null)
const toastMsg = ref('')
const toastErr = ref(false)
let _t = null

const periodoLabel = computed(() => formatPeriodo(liq.value?.periodo))

function toast(msg, err = false) {
  toastMsg.value = msg; toastErr.value = err
  clearTimeout(_t); _t = setTimeout(() => { toastMsg.value = '' }, 4000)
}
function volver() { router.push(`/liquidaciones/${route.params.id}`) }

// ── Construcción del informe (matriz Total + inversionistas) ──────────────────
const GRUPOS = [
  { key: 'ingresos', label: 'Ingresos', sign: 1 },
  { key: 'comercializacion', label: 'Comercialización / Bolsa', sign: -1 },
  { key: 'ajustes', label: 'Ajustes', sign: 1 },
  { key: 'costos', label: 'Costos operativos (OPEX)', sign: -1 },
  { key: 'facturas', label: 'Facturas de servicio', sign: -1 },
]
const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const esDel = (m, piId) => m.inversionista?.id === piId || m.inversionista_id === piId

function columnasDe(l, invs) {
  const esAuto = l.tipo_venta === 'autoconsumo'
  const soportes = indiceSoportesProyecto(l)
  const mandatos = l.mandatos || []
  const pickTotal = (tipo) => {
    const total = mandatos.filter(x => x.tipo === tipo && x.inversionista_id == null && !x.inversionista)
    return total.length ? total : mandatos.filter(x => x.tipo === tipo && (x.inversionista || x.inversionista_id != null))
  }
  const cols = [{
    id: 'total', nombre: 'Total', pct: '100%', es_total: true,
    er: construirEstadoResultados({
      ingresosMandatos: pickTotal('ingresos'), costosMandatos: pickTotal('costos'),
      costos: l.costos || [], facturas: l.facturas || [], esAutoconsumo: esAuto, soportes,
    }),
  }]
  for (const pi of (invs || [])) {
    const ing = mandatos.filter(m => m.tipo === 'ingresos' && esDel(m, pi.id))
    const cos = mandatos.filter(m => m.tipo === 'costos' && esDel(m, pi.id))
    if (!ing.length && !cos.length) continue
    const er = construirEstadoResultados({ ingresosMandatos: ing, costosMandatos: cos, esAutoconsumo: esAuto, soportes })
    if (!er.grupos.length) continue
    cols.push({ id: 'inv' + pi.id, nombre: pi.cliente_nombre || 'Inversionista', pct: pct(pi.porcentaje_participacion), er })
  }
  for (const c of cols) c.neto = c.er.neto
  return cols
}

function matrizDe(cols) {
  const out = []
  for (const g of GRUPOS) {
    const map = new Map()
    for (const c of cols) {
      const gr = c.er.grupos.find(x => x.key === g.key); if (!gr) continue
      for (const ln of gr.lineas) {
        const key = ln.tipo || ln.label
        if (!map.has(key)) map.set(key, { label: ln.label, celdas: {} })
        const row = map.get(key)
        const cel = row.celdas[c.id] || { valor: 0, soporte_url: null, refCodigo: null, referencia: null }
        cel.valor += ln.valor
        if (!cel.soporte_url && ln.soporte_url) { cel.soporte_url = ln.soporte_url; cel.refCodigo = ln.refCodigo; cel.referencia = ln.referencia }
        if (!cel.refCodigo && ln.refCodigo) { cel.refCodigo = ln.refCodigo; cel.referencia = ln.referencia }
        row.celdas[c.id] = cel
      }
    }
    if (!map.size) continue
    const totales = {}
    for (const c of cols) { const gr = c.er.grupos.find(x => x.key === g.key); totales[c.id] = gr ? gr.total : null }
    out.push({ ...g, lineas: [...map.values()], totales })
  }
  return out
}

function buildHtml(l, invs) {
  const cols = columnasDe(l, invs)
  const grupos = matrizDe(cols)
  const periodo = formatPeriodo(l.periodo)
  const proyecto = esc(l.proyecto_nombre || '')

  const thCols = cols.map(c =>
    `<th class="liq-th-num${c.es_total ? ' liq-col-total' : ''}"><div class="liq-th-name">${esc(c.nombre)}</div><div class="liq-th-pct">${c.pct}</div></th>`
  ).join('')

  const bodyRows = grupos.map(g => {
    const subCells = cols.map(c => {
      const t = g.totales[c.id]
      if (t == null) return `<td class="liq-num liq-muted${c.es_total ? ' liq-col-total' : ''}">—</td>`
      const neg = g.sign < 0
      return `<td class="liq-num liq-sub${c.es_total ? ' liq-col-total' : ''}" style="color:${neg ? '#D64455' : '#2C2039'}">${neg ? '−' : ''}${fmtCOP(Math.abs(t))}</td>`
    }).join('')
    const subRow = `<tr class="liq-grp"><td class="liq-grp-label">${esc(g.label)}</td>${subCells}</tr>`
    const lineRows = g.lineas.map(ln => {
      const cells = cols.map(c => {
        const cel = ln.celdas[c.id]
        if (!cel) return `<td class="liq-num liq-muted${c.es_total ? ' liq-col-total' : ''}">—</td>`
        let sop = ''
        if (cel.soporte_url) sop = `<a class="liq-sop" href="${esc(cel.soporte_url)}" target="_blank" rel="noopener">${esc(cel.refCodigo || 'Soporte')}</a>`
        else if (cel.refCodigo) sop = `<span class="liq-sop-muted">${esc(cel.refCodigo)}</span>`
        return `<td class="liq-num${c.es_total ? ' liq-col-total' : ''}"><span class="liq-cell-val">${fmtCOP(cel.valor)}</span>${sop ? '<span class="liq-cell-sop">' + sop + '</span>' : ''}</td>`
      }).join('')
      return `<tr class="liq-line"><td class="liq-line-label">${esc(ln.label)}</td>${cells}</tr>`
    }).join('')
    return subRow + lineRows
  }).join('')

  const netoRow = `<tr class="liq-neto"><td class="liq-neto-label">Valor a pagar</td>${cols.map(c => `<td class="liq-num liq-neto-val${c.es_total ? ' liq-col-total' : ''}">${fmtCOP(c.neto)}</td>`).join('')}</tr>`

  const obs = l.observaciones_resultados
    ? `<section class="pdf-section liq-obs"><h2 class="liq-h2">Observaciones</h2><p class="liq-obs-text">${esc(l.observaciones_resultados)}</p></section>` : ''

  return `
<div class="liq-running-header">
  <span class="lh-brand">Unergy · Estado de Resultados</span>
  <span class="lh-meta">${proyecto} — ${periodo}</span>
</div>

<section class="pdf-section liq-cover">
  <div class="liq-title">Estado de Resultados</div>
  <div class="liq-cover-sub">${proyecto}</div>
  <div class="liq-meta-grid">
    <div class="liq-meta"><div class="liq-meta-lbl">Periodo</div><div class="liq-meta-val">${periodo}</div></div>
    <div class="liq-meta"><div class="liq-meta-lbl">Estado</div><div class="liq-meta-val">${esc(l.estado || '—')}</div></div>
    <div class="liq-meta"><div class="liq-meta-lbl">Tasa de cambio</div><div class="liq-meta-val">${l.tasa_cambio ?? '—'}</div></div>
    <div class="liq-meta"><div class="liq-meta-lbl">Comprobante</div><div class="liq-meta-val">${esc(l.comprobante_contable_ref || '—')}</div></div>
  </div>
</section>

<section class="pdf-section">
  <h2 class="liq-h2">Estado de Resultados por inversionista</h2>
  <table class="liq-table">
    <thead><tr><th class="liq-th-concepto">Concepto</th>${thCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>${netoRow}</tfoot>
  </table>
</section>

${obs}

<div class="liq-running-footer">
  <span>Unergy S.A.S. · Informe generado para uso del cliente</span>
  <span>${proyecto} — ${periodo}</span>
</div>`.trim()
}

// ── Carga ─────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/liquidaciones/${route.params.id}`)
    liq.value = data
    if (data?.proyecto_id) {
      try {
        const r = await api.get(`/proyectos/${data.proyecto_id}/inversionistas`)
        inversionistas.value = Array.isArray(r.data) ? r.data : (r.data?.items ?? [])
      } catch { inversionistas.value = [] }
    }
    // Informe guardado en BD
    let guardado = null
    try {
      const { data: inf } = await api.get(`/liquidaciones/${route.params.id}/informe`)
      guardado = inf?.html_content || null
      actualizadoEn.value = inf?.actualizado_en ? new Date(inf.actualizado_en).toLocaleString('es-CO') : null
    } catch { /* sin informe previo */ }
    htmlContent.value = guardado || buildHtml(liq.value, inversionistas.value)
  } catch (e) {
    toast('Error cargando la liquidación', true)
  } finally {
    loading.value = false
  }
}

function enterEdit() { editMode.value = true }
function discardEdit() {
  editMode.value = false
  // recargar último guardado / generado
  load()
}
function regenerar() {
  if (!liq.value) return
  htmlContent.value = buildHtml(liq.value, inversionistas.value)
  toast('Informe regenerado desde los datos')
}

async function guardar() {
  if (!contentRef.value) return
  saving.value = true
  try {
    const newHtml = contentRef.value.innerHTML
    const { data } = await api.put(`/liquidaciones/${route.params.id}/informe`, { html_content: newHtml })
    htmlContent.value = newHtml
    actualizadoEn.value = data?.actualizado_en ? new Date(data.actualizado_en).toLocaleString('es-CO') : null
    editMode.value = false
    toast('💾 Informe guardado en la base de datos')
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || 'No se pudo guardar'), true)
  } finally {
    saving.value = false
  }
}

// ── Descargar PDF (ventana aislada → print) ───────────────────────────────────
function descargar() {
  const inner = (editMode.value && contentRef.value) ? contentRef.value.innerHTML : htmlContent.value
  const titulo = `Estado de Resultados — ${liq.value?.proyecto_nombre || ''} ${periodoLabel.value}`
  const w = window.open('', '_blank')
  if (!w) { toast('Permite las ventanas emergentes para descargar el PDF', true); return }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>` +
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">` +
    `<style>${REPORT_CSS}${PRINT_PAGE_CSS}</style></head><body><div class="liq-doc">${inner}</div>` +
    `<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></body></html>`)
  w.document.close()
}

// ── CSS del informe (inyectado para preview + usado en la ventana de impresión) ─
// El @page va solo a la ventana de impresión (PRINT_PAGE_CSS) para no afectar el resto de la app.
const REPORT_CSS = `
.liq-doc{background:#fff;color:#2C2039;font-family:'Sora',system-ui,sans-serif;font-size:12px;line-height:1.5;}
.liq-running-header,.liq-running-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:10px;color:#9b8fb0;}
.liq-running-header{border-bottom:1px solid #ece4f5;padding-bottom:6px;margin-bottom:16px;}
.liq-running-footer{border-top:1px solid #ece4f5;padding-top:6px;margin-top:16px;}
.lh-brand{font-weight:700;color:#6E3FB8;}
.liq-cover{margin-bottom:18px;}
.liq-title{font-size:22px;font-weight:800;color:#2C2039;letter-spacing:-0.5px;}
.liq-cover-sub{font-size:14px;font-weight:600;color:#6E3FB8;margin-top:2px;margin-bottom:12px;}
.liq-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.liq-meta{background:#faf7ff;border:1px solid #ece4f5;border-radius:8px;padding:8px 10px;}
.liq-meta-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9b8fb0;margin-bottom:2px;}
.liq-meta-val{font-size:13px;font-weight:700;color:#2C2039;}
.liq-h2{font-size:13px;font-weight:800;color:#2C2039;margin:0 0 10px;padding-left:9px;border-left:3px solid #915BD8;}
.liq-table{width:100%;border-collapse:collapse;font-size:11px;}
.liq-table th,.liq-table td{padding:6px 9px;text-align:right;white-space:nowrap;vertical-align:top;}
.liq-th-concepto{text-align:left;background:#faf7ff;color:#6E3FB8;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #ece4f5;}
.liq-th-num{background:#faf7ff;border-bottom:1px solid #ece4f5;}
.liq-th-name{font-weight:700;color:#2C2039;}
.liq-th-pct{font-size:9px;color:#bba8d4;font-weight:600;}
.liq-col-total{background:rgba(145,91,216,0.06);}
.liq-grp .liq-grp-label{text-align:left;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#6E3FB8;background:#fcfaff;}
.liq-grp .liq-sub{font-weight:800;background:#fcfaff;}
.liq-grp td{background:#fcfaff;}
.liq-line td{border-top:1px solid #f4eefc;}
.liq-line-label{text-align:left;color:#5b5470;padding-left:18px !important;}
.liq-cell-val{font-variant-numeric:tabular-nums;color:#3d3550;}
.liq-cell-sop{display:block;margin-top:1px;}
.liq-sop{font-size:9px;color:#6E3FB8;text-decoration:none;}
.liq-sop-muted{font-size:9px;color:#bba8d4;}
.liq-muted{color:#cdbfe2;}
.liq-neto td{border-top:2px solid #915BD8;background:rgba(145,91,216,0.08);font-weight:800;}
.liq-neto-label{text-align:left;color:#2C2039;}
.liq-neto-val{color:#6E3FB8;}
.liq-obs{margin-top:16px;}
.liq-obs-text{background:#faf7ff;border-left:3px solid #4ADE80;border-radius:8px;padding:10px 12px;color:#3d3550;font-size:11px;}
@media print{
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
  .liq-doc{font-size:11px;}
  .liq-running-header{position:fixed;top:0;left:0;right:0;margin:0;padding:4mm 12mm;background:#fff;border-bottom:1px solid #ece4f5;}
  .liq-running-footer{position:fixed;bottom:0;left:0;right:0;margin:0;padding:4mm 12mm;background:#fff;border-top:1px solid #ece4f5;}
  .pdf-section{break-inside:avoid;page-break-inside:avoid;}
  .liq-line,.liq-grp,.liq-neto{break-inside:avoid;page-break-inside:avoid;}
  .liq-table thead{display:table-header-group;}
}
`
const PRINT_PAGE_CSS = `@page{size:A4;margin:24mm 12mm 20mm 12mm;}
html,body{margin:0;padding:0;background:#fff;}
body .liq-doc{padding:0;}`

let _styleEl = null
onMounted(async () => {
  _styleEl = document.createElement('style')
  _styleEl.setAttribute('data-liqpdf', '')
  _styleEl.textContent = REPORT_CSS
  document.head.appendChild(_styleEl)
  await load()
})
onBeforeUnmount(() => { if (_styleEl) _styleEl.remove() })
</script>

<style scoped>
.liqpdf-wrapper{ padding:14px; background:#FDFAF7; min-height:100vh; }
.liqpdf-toolbar{
  position:sticky; top:0; z-index:20; background:#fff;
  border:1px solid #e8e0f0; border-radius:12px; padding:10px 14px;
  display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
  box-shadow:0 2px 10px rgba(44,32,57,.04); margin-bottom:12px;
}
.liqpdf-hint{
  background:rgba(145,91,216,0.06); border:1px solid rgba(145,91,216,0.2);
  border-radius:8px; padding:8px 12px; font-size:11px; color:#6b5a8a; margin-bottom:12px; line-height:1.5;
}
/* Lienzo tipo hoja */
.liqpdf-canvas{ display:flex; justify-content:center; }
.liqpdf-canvas .liq-doc{
  width:210mm; max-width:100%; background:#fff;
  border:1px solid #e8e0f0; border-radius:10px;
  box-shadow:0 6px 30px rgba(44,32,57,.10);
  padding:18mm 14mm; min-height:60vh;
}
.liq-doc[contenteditable="true"]{ outline:2px dashed rgba(145,91,216,.35); outline-offset:4px; }
.liq-doc :focus{ outline:none; }
/* Toast */
.liqpdf-toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:9999;
  padding:10px 20px; border-radius:10px; font-size:13px; font-weight:700; color:#fff; box-shadow:0 6px 24px rgba(0,0,0,.25); }
.liqpdf-toast.is-ok{ background:#2D8A4E; }
.liqpdf-toast.is-err{ background:#b3324a; }
.fade-enter-active,.fade-leave-active{ transition:opacity .3s; }
.fade-enter-from,.fade-leave-to{ opacity:0; }

@media print{
  .liqpdf-toolbar,.liqpdf-hint,.liqpdf-toast{ display:none !important; }
  .liqpdf-wrapper{ padding:0 !important; background:#fff !important; }
  .liqpdf-canvas .liq-doc{ border:none !important; border-radius:0 !important; box-shadow:none !important; padding:0 !important; width:auto !important; }
}
</style>
