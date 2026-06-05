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
        <Select v-model="selInv" :options="opcionesInv" optionLabel="label" optionValue="value"
          size="small" class="liqpdf-sel" :disabled="editMode" @change="onSelChange"
          title="Inversionista que aparecerá en el informe" />
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
import Select from 'primevue/select'
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

// Selección de inversionista (null = todos: Total + cada inversionista)
const selInv = ref(null)
// Datos de generación (API monitoreo) y comparativo (vista por-proyecto)
const dias = ref([])            // [{date, kwh}]
const genActual = ref(null)     // kWh del mes
const genProm = ref(null)       // promedio kWh de los 3 meses anteriores
const comp = ref(null)          // { actual:{ingresos,costosOp,facturas,neto}, promedio:{…}|null }
const tarifas = ref({ representacion: null, cgm: null, admin: null })

// Columnas (Total + inversionistas con movimientos) para selector y armado
const cols = computed(() => (liq.value ? columnasDe(liq.value, inversionistas.value) : []))
const opcionesInv = computed(() => [
  { label: 'Todos (Total + inversionistas)', value: null },
  ...cols.value.filter(c => !c.es_total).map(c => ({ label: `${c.nombre} (${c.pct})`, value: Number(String(c.id).replace('inv', '')) })),
])

const fmtKwh = (v) => v == null ? '—' : (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + ' MWh' : Math.round(v) + ' kWh')
const _cop2 = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtTarifa = (v) => v == null ? '—' : _cop2.format(v)

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

// Gráfica de generación diaria como SVG inline (vive en el HTML guardado/impreso).
function svgGeneracion(ds) {
  if (!ds.length) return '<div class="rpt-empty">Sin datos de generación para este período.</div>'
  const W = 720, H = 168, padL = 42, padR = 8, padT = 8, padB = 20
  const max = Math.max(...ds.map(d => d.kwh), 1)
  const innerW = W - padL - padR, innerH = H - padT - padB
  const n = ds.length, bw = innerW / n, baseY = padT + innerH
  const bars = ds.map((d, i) => {
    const h = Math.max((d.kwh / max) * innerH, 0)
    const x = padL + i * bw + bw * 0.12, y = baseY - h
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.76).toFixed(1)}" height="${h.toFixed(1)}" rx="1" fill="#915BD8"/>`
  }).join('')
  const xlabels = ds.map((d, i) => {
    if (i % 5 !== 0 && i !== n - 1) return ''
    const x = padL + i * bw + bw * 0.5
    return `<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="8" fill="#9b8fb0">${Number(d.date.split('-')[2])}</text>`
  }).join('')
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">` +
    `<line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="#ece4f5"/>` +
    `<text x="${padL - 5}" y="${padT + 8}" text-anchor="end" font-size="8" fill="#9b8fb0">${fmtKwh(max)}</text>` +
    `<text x="${padL - 5}" y="${baseY}" text-anchor="end" font-size="8" fill="#9b8fb0">0</text>` +
    `${bars}${xlabels}</svg>`
}

// "Este mes vs promedio del proyecto" (nivel proyecto, contexto del informe).
function comparativoSectionHtml() {
  const c = comp.value
  if (!c || !c.actual) return ''
  const a = c.actual, p = c.promedio
  const delta = (cur, prev) => (prev && cur != null ? (cur - prev) / Math.abs(prev) * 100 : null)
  const costosA = a.costosOp + a.facturas
  const costosP = p ? p.costosOp + p.facturas : null
  const items = [
    { lbl: 'Generado', val: fmtKwh(genActual.value), d: delta(genActual.value, genProm.value) },
    { lbl: 'Ingresos', val: fmtCOP(a.ingresos), d: delta(a.ingresos, p?.ingresos) },
    { lbl: 'Costos totales', val: fmtCOP(costosA), d: delta(costosA, costosP) },
    { lbl: 'Ingreso neto', val: fmtCOP(a.neto), d: delta(a.neto, p?.neto) },
  ]
  const cards = items.map(x => `<div class="rpt-kpi"><div class="rpt-kpi-lbl">${x.lbl}</div><div class="rpt-kpi-val">${x.val}</div>` +
    (x.d != null ? `<div class="rpt-delta ${x.d >= 0 ? 'up' : 'down'}">${x.d >= 0 ? '▲' : '▼'} ${Math.abs(x.d).toFixed(0)}% vs prom.</div>` : '') + `</div>`).join('')
  return `<section class="rpt-block"><h2 class="rpt-h2">Este mes vs promedio del proyecto</h2><div class="rpt-kpis rpt-kpis-4">${cards}</div></section>`
}

// Generación del mes (gráfica + KPIs + tarifas), nivel proyecto.
function generacionSectionHtml() {
  if (!dias.value.length) return ''
  const tot = dias.value.reduce((s, d) => s + d.kwh, 0)
  const t = tarifas.value
  const hayTar = t.representacion != null || t.cgm != null || t.admin != null
  const tarifasHtml = hayTar ? `<div class="rpt-tarifas">
      <div class="rpt-tar"><span>Representación</span><b>${fmtTarifa(t.representacion)}</b></div>
      <div class="rpt-tar"><span>CGM</span><b>${fmtTarifa(t.cgm)}</b></div>
      <div class="rpt-tar"><span>Administración</span><b>${fmtTarifa(t.admin)}</b></div>
    </div>` : ''
  return `<section class="rpt-block">
      <h2 class="rpt-h2">Generación del mes</h2>
      <div class="rpt-gen-kpis"><span>Generado <b>${fmtKwh(tot)}</b></span><span>Días <b>${dias.value.length}</b></span><span>Promedio/día <b>${fmtKwh(tot / dias.value.length)}</b></span></div>
      <div class="rpt-chart">${svgGeneracion(dias.value)}</div>
      ${tarifasHtml}
    </section>`
}

function buildHtml() {
  const l = liq.value
  if (!l) return ''
  const cs = cols.value
  const periodo = formatPeriodo(l.periodo)
  const proyecto = esc(l.proyecto_nombre || '')

  // Estado de Resultados según selección de inversionista
  const sel = selInv.value
  const selCol = sel != null ? cs.find(c => c.id === 'inv' + sel) : null
  let estado = ''
  if (selCol) {
    estado = `
    <section class="rpt-block rpt-inv">
      <div class="rpt-inv-head"><span class="rpt-inv-name">${esc(selCol.nombre)}</span><span class="rpt-inv-pct">${selCol.pct}</span></div>
      ${kpisHtml(selCol.er)}
      ${detalleHtml(selCol.er)}
    </section>`
  } else {
    const total = cs.find(c => c.es_total)
    const invsCols = cs.filter(c => !c.es_total)
    estado = (total ? `
    <section class="rpt-block">
      <h2 class="rpt-h2">Resumen del proyecto · Total</h2>
      ${kpisHtml(total.er)}
      ${detalleHtml(total.er)}
    </section>` : '') +
      (invsCols.length ? `
    <section class="rpt-block"><h2 class="rpt-h2">Desglose por inversionista</h2></section>` +
        invsCols.map(c => `
    <section class="rpt-block rpt-inv">
      <div class="rpt-inv-head"><span class="rpt-inv-name">${esc(c.nombre)}</span><span class="rpt-inv-pct">${c.pct}</span></div>
      ${detalleHtml(c.er)}
    </section>`).join('') : '')
  }

  const invLine = selCol ? `<div class="rpt-cover-inv">Inversionista: <b>${esc(selCol.nombre)}</b> · ${selCol.pct}</div>` : ''
  const cover = `
    <section class="rpt-block rpt-cover">
      <div class="rpt-title">Estado de Resultados</div>
      <div class="rpt-subtitle">${proyecto}</div>
      ${invLine}
      <div class="rpt-meta-grid">
        <div class="rpt-meta"><div class="rpt-meta-lbl">Periodo</div><div class="rpt-meta-val">${periodo}</div></div>
        <div class="rpt-meta"><div class="rpt-meta-lbl">Estado</div><div class="rpt-meta-val">${esc(l.estado || '—')}</div></div>
        <div class="rpt-meta"><div class="rpt-meta-lbl">Tasa de cambio</div><div class="rpt-meta-val">${l.tasa_cambio ?? '—'}</div></div>
        <div class="rpt-meta"><div class="rpt-meta-lbl">Comprobante</div><div class="rpt-meta-val">${esc(l.comprobante_contable_ref || '—')}</div></div>
      </div>
    </section>`

  const obs = l.observaciones_resultados ? `
    <section class="rpt-block">
      <h2 class="rpt-h2">Observaciones</h2>
      <p class="rpt-obs">${esc(l.observaciones_resultados)}</p>
    </section>` : ''

  const content = cover + comparativoSectionHtml() + generacionSectionHtml() + estado + obs

  // Wrapper de página con thead/tfoot → header y pie se repiten en cada hoja.
  return `
<table class="rpt-page">
  <thead class="rpt-running"><tr><td>
    <div class="rpt-head"><span class="rpt-head-brand">Unergy · Estado de Resultados</span><span class="rpt-head-meta">${proyecto} — ${periodo}</span></div>
  </td></tr></thead>
  <tbody><tr><td>
    <div class="rpt-content">${content}</div>
  </td></tr></tbody>
  <tfoot class="rpt-running"><tr><td>
    <div class="rpt-foot"><span>Unergy S.A.S. · Informe para uso del cliente</span><span>${proyecto} — ${periodo}</span></div>
  </td></tr></tfoot>
</table>`.trim()
}

// ── Datos en vivo: generación (API monitoreo) y comparativo (vista por-proyecto) ─
const _norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
function ultimoDiaMes(periodo) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m, 0)
  return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function mesPrevio(periodo, k) {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m - 1 - k, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
async function resolverSub() {
  const { data } = await api.get('/monitoreo/_legacy', { params: { action: 'getProjects' } })
  const projects = data?.projects ?? []
  const pid = liq.value?.proyecto_id != null ? String(liq.value.proyecto_id) : null
  const nombre = _norm(liq.value?.proyecto_nombre)
  let m = pid && projects.find(p => String(p.id ?? p.proyecto_id) === pid && p.sub_project)
  if (!m && nombre) m = projects.find(p => _norm(p.nombre_comercial) === nombre && p.sub_project)
  if (!m && nombre) m = projects.find(p => p.sub_project && (_norm(p.nombre_comercial).includes(nombre) || nombre.includes(_norm(p.nombre_comercial))))
  return m?.sub_project ?? null
}
async function _genData(sub, periodo) {
  const { data } = await api.get('/monitoreo/_legacy', { params: { action: 'getGeneration', sub_project: sub, date_from: periodo, date_to: ultimoDiaMes(periodo) } })
  if (data && data.ok === false) return null
  const map = new Map()
  for (const it of (Array.isArray(data?.data) ? data.data : [])) {
    if (!it || it.kwh == null || !it.date) continue
    map.set(it.date, (map.get(it.date) || 0) + Number(it.kwh))
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, kwh]) => ({ date, kwh }))
}
async function loadGeneracion() {
  dias.value = []; genActual.value = null; genProm.value = null
  if (!liq.value?.periodo) return
  try {
    const sub = await resolverSub()
    if (sub) {
      dias.value = await _genData(sub, liq.value.periodo) || []
      genActual.value = dias.value.length ? dias.value.reduce((s, d) => s + d.kwh, 0) : null
      const prevs = []
      for (let k = 1; k <= 3; k++) {
        const ds = await _genData(sub, mesPrevio(liq.value.periodo, k))
        const t = (ds || []).reduce((s, d) => s + d.kwh, 0)
        if (t > 0) prevs.push(t)
      }
      if (prevs.length) genProm.value = prevs.reduce((a, b) => a + b, 0) / prevs.length
    }
  } catch { /* generación opcional */ }
  await loadTarifas()
}
async function loadTarifas() {
  tarifas.value = { representacion: null, cgm: null, admin: null }
  if (!liq.value?.proyecto_id) return
  try {
    const { data } = await api.get('/contratos-servicio', { params: { proyecto_id: liq.value.proyecto_id } })
    const contratos = Array.isArray(data) ? data : []
    const anio = Number(liq.value.periodo.split('-')[0])
    const tar = (idx, base) => {
      const arr = Array.isArray(idx) ? idx.filter(r => r && r.valor != null) : []
      if (arr.length) {
        const ex = arr.find(r => Number(r.año ?? r.anio) === anio)
        if (ex) return Number(ex.valor)
        const pr = arr.filter(r => Number(r.año ?? r.anio) <= anio).sort((a, b) => Number(b.año ?? b.anio) - Number(a.año ?? a.anio))
        if (pr.length) return Number(pr[0].valor)
      }
      return base != null ? Number(base) : null
    }
    const tv = { representacion: null, cgm: null, admin: null }
    for (const c of contratos) {
      if (tv.representacion == null && (c.indexacion_representacion?.length || c.tarifa_representacion != null)) tv.representacion = tar(c.indexacion_representacion, c.tarifa_representacion)
      if (tv.cgm == null && (c.indexacion_cgm?.length || c.tarifa_cgm != null)) tv.cgm = tar(c.indexacion_cgm, c.tarifa_cgm)
      if (tv.admin == null && c.tarifa_admin != null) tv.admin = Number(c.tarifa_admin)
    }
    tarifas.value = tv
  } catch { /* tarifas opcionales */ }
}
async function loadComparativo() {
  comp.value = null
  if (!liq.value?.proyecto_id) return
  try {
    const { data } = await api.get('/liquidaciones/vistas/por-proyecto', { params: { proyecto_id: liq.value.proyecto_id } })
    const proy = Array.isArray(data) ? (data.find(p => String(p.proyecto_id) === String(liq.value.proyecto_id)) || data[0]) : null
    const liqs = proy?.liquidaciones || []
    const sum = (arr, k) => (arr || []).reduce((s, x) => s + (Number(x?.[k]) || 0), 0)
    const itemsDe = (q) => {
      const ing = sum(q.mandatos_total_ingresos, 'valor_neto_cop') || Number(q.resumen?.total_ingresos_cop) || 0
      const cos = sum(q.mandatos_total_costos, 'valor_neto_cop') || Number(q.resumen?.total_costos_cop) || 0
      const fac = sum(q.facturas_servicio, 'valor_cop') || Number(q.resumen?.total_facturas_cop) || 0
      return { ingresos: ing, costosOp: cos, facturas: fac, neto: ing - cos - fac }
    }
    const conV = (it) => it.ingresos !== 0 || it.costosOp !== 0 || it.facturas !== 0
    const per = liq.value.periodo
    const actualLiq = liqs.find(x => x.periodo === per)
    const prev = liqs.filter(x => x.periodo < per).sort((a, b) => b.periodo.localeCompare(a.periodo)).slice(0, 3).map(itemsDe).filter(conV)
    let promedio = null
    if (prev.length) {
      const avg = (k) => prev.reduce((s, it) => s + it[k], 0) / prev.length
      promedio = { ingresos: avg('ingresos'), costosOp: avg('costosOp'), facturas: avg('facturas'), neto: avg('neto') }
    }
    comp.value = { actual: actualLiq ? itemsDe(actualLiq) : null, promedio }
  } catch { /* comparativo opcional */ }
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
    // Datos en vivo (generación + comparativo), opcionales y en paralelo
    await Promise.all([loadGeneracion(), loadComparativo()])
    // Informe guardado en BD
    let guardado = null
    try {
      const { data: inf } = await api.get(`/liquidaciones/${route.params.id}/informe`)
      guardado = inf?.html_content || null
      actualizadoEn.value = inf?.actualizado_en ? new Date(inf.actualizado_en).toLocaleString('es-CO') : null
    } catch { /* sin informe previo */ }
    htmlContent.value = guardado || buildHtml()
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
function onSelChange() {
  if (editMode.value || !liq.value) return
  htmlContent.value = buildHtml()
}
function regenerar() {
  if (!liq.value) return
  htmlContent.value = buildHtml()
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
.rpt-kpis-4{grid-template-columns:repeat(4,1fr);}
.rpt-delta{font-size:9px;font-weight:700;margin-top:2px;}
.rpt-delta.up{color:#2D8A4E;}
.rpt-delta.down{color:#D64455;}
.rpt-cover-inv{font-size:12px;color:#2C2039;margin:-6px 0 12px;}
.rpt-cover-inv b{color:#6E3FB8;}
.rpt-gen-kpis{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:8px;font-size:11px;color:#6b5a8a;}
.rpt-gen-kpis b{color:#2C2039;font-size:13px;margin-left:4px;}
.rpt-chart{background:#fcfaff;border:1px solid #ece4f5;border-radius:8px;padding:10px;margin-bottom:8px;}
.rpt-chart svg{display:block;width:100%;height:auto;}
.rpt-empty{color:#9b8fb0;font-size:11px;padding:8px;}
.rpt-tarifas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.rpt-tar{background:#faf7ff;border:1px solid #ece4f5;border-radius:8px;padding:6px 10px;text-align:center;font-size:10px;color:#6E3FB8;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}
.rpt-tar b{display:block;color:#2C2039;font-size:13px;margin-top:2px;font-variant-numeric:tabular-nums;}
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
  /* No cortar: filas, KPIs, portada, gráfica, tarifas ni bloques de inversionista */
  .rpt-detail tr{break-inside:avoid;page-break-inside:avoid;}
  .rpt-kpis,.rpt-cover,.rpt-inv,.rpt-chart,.rpt-tarifas,.rpt-gen-kpis{break-inside:avoid;page-break-inside:avoid;}
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
.liqpdf-sel{ max-width:260px; }
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
