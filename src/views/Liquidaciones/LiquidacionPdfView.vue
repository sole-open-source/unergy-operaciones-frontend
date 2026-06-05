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

// ── Construcción del informe (bloques verticales: Total + cada inversionista) ──
// Una matriz ancha se desborda en el PDF; en su lugar cada entidad (Total e
// inversionista) lleva su propia tabla angosta Concepto · Valor · Soporte, que
// pagina limpio y nunca corta columnas.
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

// Tabla angosta (Concepto · Valor · Soporte) para un estado de resultados.
function detalleHtml(er) {
  const filas = er.grupos.map(g => {
    const neg = g.sign < 0
    const sub = `<tr class="rpt-grp"><td class="rpt-c-con">${esc(g.label)}</td>` +
      `<td class="rpt-c-val" style="color:${neg ? '#D64455' : '#2C2039'}">${neg ? '−' : ''}${fmtCOP(Math.abs(g.total))}</td>` +
      `<td class="rpt-c-sop"></td></tr>`
    const lineas = g.lineas.map(ln => {
      let sop = ''
      if (ln.soporte_url) sop = `<a class="rpt-sop" href="${esc(ln.soporte_url)}" target="_blank" rel="noopener">${esc(ln.refCodigo || 'Soporte')}</a>`
      else if (ln.refCodigo) sop = `<span class="rpt-sop-muted">${esc(ln.refCodigo)}</span>`
      return `<tr class="rpt-ln"><td class="rpt-c-con rpt-indent">${esc(ln.label)}</td>` +
        `<td class="rpt-c-val">${fmtCOP(ln.valor)}</td><td class="rpt-c-sop">${sop}</td></tr>`
    }).join('')
    return sub + lineas
  }).join('')
  const neto = `<tr class="rpt-neto"><td class="rpt-c-con">Valor a pagar</td><td class="rpt-c-val">${fmtCOP(er.neto)}</td><td class="rpt-c-sop"></td></tr>`
  return `<table class="rpt-detail"><thead><tr><th class="rpt-c-con">Concepto</th><th class="rpt-c-val">Valor</th><th class="rpt-c-sop">Soporte</th></tr></thead><tbody>${filas}${neto}</tbody></table>`
}

function kpisHtml(er) {
  const costosTot = (er.costosOperativos || 0) + (er.facturasTotal || 0)
  const k = [
    { lbl: 'Valor a pagar (ingresos)', val: fmtCOP(er.valorAPagar) },
    { lbl: 'Costos y facturas', val: fmtCOP(costosTot) },
    { lbl: 'Ingreso neto', val: fmtCOP(er.neto), big: true },
  ]
  return `<div class="rpt-kpis">${k.map(x => `<div class="rpt-kpi${x.big ? ' rpt-kpi-big' : ''}"><div class="rpt-kpi-lbl">${x.lbl}</div><div class="rpt-kpi-val">${x.val}</div></div>`).join('')}</div>`
}

function buildHtml(l, invs) {
  const cols = columnasDe(l, invs)
  const total = cols.find(c => c.es_total)
  const invsCols = cols.filter(c => !c.es_total)
  const periodo = formatPeriodo(l.periodo)
  const proyecto = esc(l.proyecto_nombre || '')

  const cover = `
    <section class="rpt-block rpt-cover">
      <div class="rpt-title">Estado de Resultados</div>
      <div class="rpt-subtitle">${proyecto}</div>
      <div class="rpt-meta-grid">
        <div class="rpt-meta"><div class="rpt-meta-lbl">Periodo</div><div class="rpt-meta-val">${periodo}</div></div>
        <div class="rpt-meta"><div class="rpt-meta-lbl">Estado</div><div class="rpt-meta-val">${esc(l.estado || '—')}</div></div>
        <div class="rpt-meta"><div class="rpt-meta-lbl">Tasa de cambio</div><div class="rpt-meta-val">${l.tasa_cambio ?? '—'}</div></div>
        <div class="rpt-meta"><div class="rpt-meta-lbl">Comprobante</div><div class="rpt-meta-val">${esc(l.comprobante_contable_ref || '—')}</div></div>
      </div>
    </section>`

  const resumen = total ? `
    <section class="rpt-block">
      <h2 class="rpt-h2">Resumen del proyecto · Total</h2>
      ${kpisHtml(total.er)}
      ${detalleHtml(total.er)}
    </section>` : ''

  const porInv = invsCols.length ? `
    <section class="rpt-block rpt-keep-head">
      <h2 class="rpt-h2">Desglose por inversionista</h2>
    </section>
    ${invsCols.map(c => `
    <section class="rpt-block rpt-inv">
      <div class="rpt-inv-head"><span class="rpt-inv-name">${esc(c.nombre)}</span><span class="rpt-inv-pct">${c.pct}</span></div>
      ${detalleHtml(c.er)}
    </section>`).join('')}` : ''

  const obs = l.observaciones_resultados ? `
    <section class="rpt-block">
      <h2 class="rpt-h2">Observaciones</h2>
      <p class="rpt-obs">${esc(l.observaciones_resultados)}</p>
    </section>` : ''

  // Wrapper de página con thead/tfoot → header y pie se repiten en cada hoja
  // (técnica robusta de HTML-a-PDF, sin cortar contenido ni desbordar el ancho).
  return `
<table class="rpt-page">
  <thead class="rpt-running"><tr><td>
    <div class="rpt-head"><span class="rpt-head-brand">Unergy · Estado de Resultados</span><span class="rpt-head-meta">${proyecto} — ${periodo}</span></div>
  </td></tr></thead>
  <tbody><tr><td>
    <div class="rpt-content">${cover}${resumen}${porInv}${obs}</div>
  </td></tr></tbody>
  <tfoot class="rpt-running"><tr><td>
    <div class="rpt-foot"><span>Unergy S.A.S. · Informe para uso del cliente</span><span>${proyecto} — ${periodo}</span></div>
  </td></tr></tfoot>
</table>`.trim()
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
.liq-doc{background:#fff;color:#2C2039;font-family:'Sora',system-ui,sans-serif;font-size:12px;line-height:1.45;}
.rpt-page{width:100%;border-collapse:collapse;table-layout:fixed;}
.rpt-running > tr > td{padding:0;}
.rpt-head,.rpt-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:10px;color:#9b8fb0;}
.rpt-head{border-bottom:1px solid #ece4f5;padding-bottom:6px;margin-bottom:14px;}
.rpt-foot{border-top:1px solid #ece4f5;padding-top:6px;margin-top:14px;}
.rpt-head-brand{font-weight:700;color:#6E3FB8;}
.rpt-block{margin-bottom:16px;}
.rpt-cover{margin-bottom:18px;}
.rpt-title{font-size:21px;font-weight:800;letter-spacing:-.5px;color:#2C2039;}
.rpt-subtitle{font-size:14px;font-weight:600;color:#6E3FB8;margin:2px 0 12px;}
.rpt-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.rpt-meta{background:#faf7ff;border:1px solid #ece4f5;border-radius:8px;padding:8px 10px;}
.rpt-meta-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9b8fb0;margin-bottom:2px;}
.rpt-meta-val{font-size:13px;font-weight:700;color:#2C2039;}
.rpt-h2{font-size:13px;font-weight:800;color:#2C2039;margin:0 0 10px;padding-left:9px;border-left:3px solid #915BD8;}
.rpt-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;}
.rpt-kpi{background:#faf7ff;border:1px solid #ece4f5;border-radius:8px;padding:8px 10px;}
.rpt-kpi-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9b8fb0;margin-bottom:3px;}
.rpt-kpi-val{font-size:15px;font-weight:800;color:#2C2039;font-variant-numeric:tabular-nums;}
.rpt-kpi-big{background:rgba(145,91,216,0.08);border-color:rgba(145,91,216,.25);}
.rpt-kpi-big .rpt-kpi-val{color:#6E3FB8;}
.rpt-inv{margin-bottom:14px;}
.rpt-inv-head{display:flex;justify-content:space-between;align-items:center;background:#faf7ff;border:1px solid #ece4f5;border-bottom:none;border-radius:8px 8px 0 0;padding:7px 10px;}
.rpt-inv-name{font-weight:800;font-size:12px;color:#2C2039;}
.rpt-inv-pct{font-size:11px;font-weight:700;color:#6E3FB8;font-variant-numeric:tabular-nums;}
.rpt-detail{width:100%;border-collapse:collapse;font-size:11px;}
.rpt-detail th{background:#faf7ff;color:#6E3FB8;font-size:9px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;padding:5px 9px;border-bottom:1px solid #ece4f5;}
.rpt-detail td{padding:4px 9px;border-top:1px solid #f4eefc;vertical-align:top;}
.rpt-c-con{text-align:left;color:#3d3550;word-break:break-word;}
.rpt-c-val{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;width:30%;}
.rpt-c-sop{text-align:right;white-space:nowrap;width:22%;}
.rpt-indent{padding-left:20px !important;color:#5b5470;}
.rpt-grp td{background:#fcfaff;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.3px;color:#6E3FB8;}
.rpt-grp .rpt-c-val{color:#2C2039;}
.rpt-neto td{border-top:2px solid #915BD8;background:rgba(145,91,216,0.08);font-weight:800;}
.rpt-neto .rpt-c-con{color:#2C2039;}
.rpt-neto .rpt-c-val{color:#6E3FB8;}
.rpt-sop{font-size:9px;color:#6E3FB8;text-decoration:none;}
.rpt-sop-muted{font-size:9px;color:#bba8d4;}
.rpt-obs{background:#faf7ff;border-left:3px solid #4ADE80;border-radius:8px;padding:10px 12px;color:#3d3550;font-size:11px;}
@media print{
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
  .liq-doc{font-size:11px;}
  thead.rpt-running{display:table-header-group;}
  tfoot.rpt-running{display:table-footer-group;}
  /* No cortar: filas, KPIs, portada ni bloques chicos de inversionista */
  .rpt-detail tr{break-inside:avoid;page-break-inside:avoid;}
  .rpt-kpis,.rpt-cover,.rpt-inv{break-inside:avoid;page-break-inside:avoid;}
  /* Mantener cada encabezado pegado a su contenido */
  .rpt-h2,.rpt-inv-head{break-after:avoid;page-break-after:avoid;}
  /* Tablas largas paginan repitiendo su encabezado */
  .rpt-detail thead{display:table-header-group;}
}
`
const PRINT_PAGE_CSS = `@page{size:A4;margin:13mm;}
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
