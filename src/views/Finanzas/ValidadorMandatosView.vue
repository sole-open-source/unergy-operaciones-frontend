<template>
  <div class="gf-page">
    <!-- ══ HEADER ══════════════════════════════════════════════════════════ -->
    <div class="mon-tab-bar">
      <i class="pi pi-file-check text-sm" style="color:#915BD8" />
      <span class="text-base font-bold text-gray-800 whitespace-nowrap mr-2">Validador de Mandatos</span>
      <span class="vm-version">v8.0</span>
    </div>

    <!-- El validador (HTML/JS portado tal cual) se inyecta aquí en onMounted -->
    <div ref="root" class="vm-root"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as XLSX from 'xlsx'
import {
  parseAsientos, extractMandate, suggestTag, reconciliar, fmt, norm as normNombre,
} from '@/utils/conciliacionMandatos.js'

const root = ref(null)

// IDs de las funciones globales que el markup invoca vía onclick — se limpian al desmontar
const GLOBAL_FNS = [
  'switchTab', 'setMode', 'updateAuditUI', 'loadExcel', 'setConcMode',
  'updateConcUI', 'startConciliation', 'renderConcTable', 'exportConcCSV',
  'startAudit', 'setCostoTag',
]

// Carga un <script> externo una sola vez (pdf.js / xlsx desde CDN, igual que el HTML original)
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve() })
    s.addEventListener('error', reject)
    document.head.appendChild(s)
  })
}

// ── Markup del validador (idéntico al HTML standalone, sin <html>/<head>/<body>) ──
const MARKUP = `
  <!-- TABS PRINCIPALES -->
  <div class="tab-bar">
    <button class="tab-btn active" id="tabAudit" onclick="switchTab('audit')">🔍 Auditoría PDFs</button>
    <button class="tab-btn" id="tabConc"  onclick="switchTab('conc')">⚖️ Conciliación Contable</button>
  </div>

  <!-- ==================== SECCIÓN AUDITORÍA ==================== -->
  <div id="sectionAudit">
    <div class="mode-selector">
      <button class="mode-btn active" id="btnModeIngresos"    onclick="setMode('ingresos')">INGRESOS (Exige **)</button>
      <button class="mode-btn"        id="btnModeCostos"       onclick="setMode('costos')">COSTOS (Sin **)</button>
      <button class="mode-btn"        id="btnModeAutoconsumo"  onclick="setMode('autoconsumo')">AUTOCONSUMO (Exige **)</button>
    </div>

    <div class="drop-zone" onclick="document.getElementById('fileInput').click()">
      <input type="file" id="fileInput" accept=".pdf" multiple style="display:none" onchange="updateAuditUI()">
      <div class="dz-icon" style="font-size:28px;margin-bottom:6px">📄</div>
      <div id="dropText">Cargar PDFs para Auditoría Masiva</div>
    </div>

    <button class="btn-primary" id="btnRun" disabled onclick="startAudit()" style="width:100%;margin-bottom:16px">Iniciar Validación</button>

    <div class="stats" id="statsBar" style="display:none">
      <div class="stat-card"><span class="stat-val" id="sTotal">0</span><small>PROCESADOS</small></div>
      <div class="stat-card" style="color:var(--ok)"><span class="stat-val" id="sOk">0</span><small>PASAN</small></div>
      <div class="stat-card" style="color:var(--err)"><span class="stat-val" id="sErr">0</span><small>RECHAZADOS</small></div>
    </div>

    <div class="results-grid" id="results"></div>

    <div id="reportContainer" class="panel" style="display:none">
      <h3 style="margin-top:0">Hallazgos y Rechazos</h3>
      <table class="report-table">
        <thead><tr><th>Archivo / CMU</th><th>Doc ($)</th><th>Cálculo ($)</th><th>Motivo</th></tr></thead>
        <tbody id="reportContent"></tbody>
      </table>
    </div>
  </div>

  <!-- ==================== SECCIÓN CONCILIACIÓN ==================== -->
  <div id="sectionConc" style="display:none">

    <div class="panel">
      <h3 style="margin:0 0 4px 0">Conciliación: Contabilidad vs. Mandatos PDF</h3>
      <p style="margin:0 0 18px 0; color:#64748b; font-size:13px;">
        Carga el soporte contable (exportación Odoo en <b>.xlsx</b>) y luego los PDFs del lote.
        El sistema cruza el <b>Valor a Pagar</b> de cada mandato contra la sumatoria contable por inversionista + planta.
      </p>

      <!-- Sub-tipo -->
      <div class="mode-selector" style="margin-bottom:18px">
        <button class="mode-btn active" id="cTabIngresos"    onclick="setConcMode('ingresos')">INGRESOS (**)</button>
        <button class="mode-btn"        id="cTabCostos"       onclick="setConcMode('costos')">COSTOS</button>
        <button class="mode-btn"        id="cTabAutoconsumo"  onclick="setConcMode('autoconsumo')">AUTOCONSUMO (**)</button>
      </div>

      <!-- PASO 1: Excel -->
      <div class="step-row">
        <span class="step-badge">1</span>
        <div style="flex:1">
          <div style="font-weight:600; margin-bottom:6px; font-size:14px">Soporte contable (exportación Odoo .xlsx)</div>
          <div class="drop-zone" id="dzExcel" onclick="document.getElementById('xlsxInput').click()" style="padding:20px">
            <input type="file" id="xlsxInput" accept=".xlsx,.xls" style="display:none" onchange="loadExcel(this)">
            <div class="dz-icon" style="font-size:22px;margin-bottom:4px">📊</div>
            <div id="xlsxLabel" style="font-size:13px;color:#64748b">Clic para cargar el <b>.xlsx</b> exportado de Odoo</div>
          </div>
          <div id="xlsxStatus" style="font-size:12px;color:#64748b;margin-top:-8px;margin-bottom:4px"></div>
        </div>
      </div>

      <!-- PASO 2: PDFs -->
      <div class="step-row">
        <span class="step-badge">2</span>
        <div style="flex:1">
          <div style="font-weight:600; margin-bottom:6px; font-size:14px">Mandatos PDFs del mismo lote</div>
          <div class="drop-zone" id="dzPdfs" onclick="document.getElementById('concFileInput').click()" style="padding:20px">
            <input type="file" id="concFileInput" accept=".pdf" multiple style="display:none" onchange="updateConcUI()">
            <div class="dz-icon" style="font-size:22px;margin-bottom:4px">📁</div>
            <div id="concDropText" style="font-size:13px;color:#64748b">Clic para cargar los PDFs del lote</div>
          </div>
        </div>
      </div>

      <!-- PASO 3: Ejecutar -->
      <div style="display:flex; gap:10px; margin-top:4px">
        <button class="btn-primary" id="btnConc" disabled onclick="startConciliation()" style="flex:1">
          ⚖️ Ejecutar Conciliación
        </button>
        <button class="btn-secondary" id="btnExportCSV" disabled onclick="exportConcCSV()">
          ⬇ Exportar CSV
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats" id="concStatsBar" style="display:none">
      <div class="stat-card"><span class="stat-val" id="csTotal">0</span><small>PDFs</small></div>
      <div class="stat-card" style="color:var(--ok)"><span class="stat-val" id="csMatch">0</span><small>COINCIDEN</small></div>
      <div class="stat-card" style="color:var(--err)"><span class="stat-val" id="csDiff">0</span><small>DIFERENCIAS</small></div>
      <div class="stat-card" style="color:var(--warn)"><span class="stat-val" id="csNoCont">0</span><small>SIN CONTAB.</small></div>
      <div class="stat-card" style="color:#6366f1"><span class="stat-val" id="csNoPdf">0</span><small>SIN PDF</small></div>
    </div>

    <!-- Tabla resultados -->
    <div id="concTableContainer" class="panel" style="display:none">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px">
        <h3 style="margin:0">Resultado de Conciliación</h3>
        <div class="conc-controls">
          <label class="toggle-label">
            <input type="checkbox" id="filterDiffOnly" onchange="renderConcTable()"> Solo diferencias/alertas
          </label>
          <div style="display:flex;align-items:center;gap:6px;font-size:13px">
            <span style="color:#64748b">Tolerancia:</span>
            <input type="number" class="tol-input" id="toleranceInput" value="200" min="0" step="100" onchange="renderConcTable()">
            <span style="color:#64748b">$</span>
          </div>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="report-table">
          <thead>
            <tr>
              <th>CMU</th>
              <th>Inversionista</th>
              <th>Planta</th>
              <th style="text-align:right">Valor PDF</th>
              <th style="text-align:right">Valor Contab.</th>
              <th style="text-align:right">Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody id="concTableBody"></tbody>
        </table>
      </div>
      <!-- Registros contables sin PDF -->
      <div id="sinPdfSection" style="margin-top:20px;display:none">
        <h4 style="color:var(--warn);margin:0 0 10px 0">⚠️ Registros contables sin PDF correspondiente</h4>
        <table class="report-table">
          <thead><tr><th>Inversionista (Contabilidad)</th><th>Planta</th><th style="text-align:right">Valor Contab.</th></tr></thead>
          <tbody id="sinPdfBody"></tbody>
        </table>
      </div>
    </div>

    <!-- Resultado DETALLADO por concepto (modo COSTOS) -->
    <div id="concCostosContainer" class="panel" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px">
        <h3 style="margin:0">Conciliación detallada por concepto · Costos</h3>
        <label class="toggle-label">
          <input type="checkbox" id="costosOnlyProblem" onchange="renderConcTable()"> Solo con hallazgos
        </label>
      </div>
      <p style="margin:0 0 14px 0;color:#64748b;font-size:12px">
        Empareja por <b>palabra completa</b> del mandante + etiqueta analítica, y valida concepto por concepto
        (mantenimiento, IVA, internet, arriendo), conceptos faltantes/sobrantes y montos en cuenta equivocada.
      </p>
      <div id="concCostosBody"></div>
    </div>

  </div><!-- /sectionConc -->
`

// ── Lógica del validador (idéntica al HTML original) ──
// Recibe `el` = contenedor raíz para acotar las búsquedas por id al componente.
function initValidador(el) {
  const pdfjsLib = window.pdfjsLib
  // XLSX viene del paquete npm (import arriba), ya no del CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

  // getElementById acotado al contenedor del componente (evita colisiones globales)
  const $ = (id) => el.querySelector('#' + id)

  // ====== ESTADO GLOBAL ======
  let currentMode     = 'ingresos'
  let currentConcMode = 'ingresos'
  let contabilidadData = []   // [{asociado, planta, valor_contabilidad}]  cargado desde xlsx (modo total)
  let concResults      = []   // resultados del cruce (modos ingresos/autoconsumo)

  // --- Modo COSTOS: conciliación detallada por concepto ---
  let asientosDetalle = []    // detalle línea-a-línea del xlsx (parseAsientos)
  let tagsAnaliticos  = []    // etiquetas analíticas (proyectos) del xlsx
  let costosResults   = []    // [{mandato, tag, status, flags, sums, candidates, fileName}]
  const TAGMAP_KEY = 'conc_costos_tagmap'
  const loadTagMap = () => { try { return JSON.parse(localStorage.getItem(TAGMAP_KEY) || '{}') } catch { return {} } }
  const saveTagMap = (m) => { try { localStorage.setItem(TAGMAP_KEY, JSON.stringify(m)) } catch { /* noop */ } }
  let savedTagMap = loadTagMap()

  // ====== TABS ======
  function switchTab(tab) {
    $('sectionAudit').style.display = tab === 'audit' ? '' : 'none'
    $('sectionConc').style.display  = tab === 'conc'  ? '' : 'none'
    $('tabAudit').classList.toggle('active', tab === 'audit')
    $('tabConc').classList.toggle('active', tab === 'conc')
  }

  // ====== AUDITORÍA: modo ======
  function setMode(m) {
    currentMode = m
    ;['Ingresos','Costos','Autoconsumo'].forEach(x =>
      $('btnMode'+x).classList.toggle('active', m === x.toLowerCase()))
  }

  function updateAuditUI() {
    const n = $('fileInput').files.length
    $('btnRun').disabled = n === 0
    $('dropText').innerHTML = `<b>${n} PDF${n!==1?'s':''} cargados</b>`
    el.querySelector('#sectionAudit .drop-zone').classList.toggle('loaded', n > 0)
  }

  // ====== CARGA XLSX (SheetJS — todo en cliente) ======
  function loadExcel(input) {
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, {type:'array'})
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, {defval:''})
        contabilidadData = parseContabilidad(rows)
        // Modo costos: detalle línea-a-línea (matriz de filas incl. cabecera)
        try {
          const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const pa = parseAsientos(matriz)
          asientosDetalle = pa.details
          tagsAnaliticos  = pa.tags
        } catch (e2) { asientosDetalle = []; tagsAnaliticos = [] }
        const label = $('xlsxLabel')
        const esCostos = currentConcMode === 'costos'
        const cuenta = esCostos ? asientosDetalle.length : contabilidadData.length
        label.innerHTML = `<b style="color:var(--ok)">✅ ${file.name}</b> — <span style="color:#64748b">${cuenta} ${esCostos ? 'líneas de detalle' : 'registros'} cargados</span>`
        $('dzExcel').classList.add('loaded')
        $('xlsxStatus').textContent = esCostos
          ? `Periodo: ${detectPeriodo(rows)} · ${asientosDetalle.length} líneas · ${tagsAnaliticos.length} proyectos (etiquetas analíticas)`
          : `Periodo detectado: ${detectPeriodo(rows)} · Cuenta 28150505: ${contabilidadData.length} líneas agrupadas`
        updateConcBtn()
      } catch(err) {
        $('xlsxLabel').innerHTML = `<span style="color:var(--err)">❌ Error leyendo el archivo: ${err.message}</span>`
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function detectPeriodo(rows) {
    for (const r of rows) {
      const v = r['Asiento contable'] || r['asiento contable'] || ''
      if (v) return v
    }
    return 'desconocido'
  }

  // Parsear el xlsx de Odoo: agrupar cuenta 28150505 por (Asociado, Planta)
  function parseContabilidad(rows) {
    const map = new Map()
    for (const r of rows) {
      const cuenta = String(r['Cuenta'] || r['cuenta'] || '')
      if (!cuenta.includes('28150505')) continue
      const asociado = String(r['Asociado'] || r['asociado'] || '').trim()
      const etiqueta = String(r['Etiqueta'] || r['etiqueta'] || '').trim()
      const importe  = parseFloat(r['Importe en moneda'] || r['importe en moneda'] || 0) || 0
      const planta   = extractPlantaFromEtiqueta(etiqueta)
      const key = asociado + '|||' + planta
      map.set(key, (map.get(key) || 0) + importe)
    }
    const result = []
    for (const [key, net] of map.entries()) {
      const [asociado, planta] = key.split('|||')
      result.push({ asociado, planta, valor_contabilidad: net })
    }
    return result
  }

  function extractPlantaFromEtiqueta(label) {
    const meses = '(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)'
    const up = label.toUpperCase()
    let m
    m = up.match(new RegExp('(MINIGRANJA SOLAR [\\w\\s\\u00C0-\\u017E#\\-]+?)\\s+' + meses))
    if (m) return m[1].trim()
    m = up.match(new RegExp('(GD [\\w\\s\\-\\.]+?)\\s+' + meses))
    if (m) return m[1].trim()
    m = up.match(new RegExp('(SOL&CIELO[\\s\\w\\-]+?)\\s+' + meses))
    if (m) return m[1].trim()
    m = up.match(new RegExp('(PSF[\\s\\-][\\w\\s]+?)\\s+' + meses))
    if (m) return m[1].trim()
    m = up.match(new RegExp('([\\w\\s\\-]+?)\\s+' + meses))
    if (m) return m[1].trim()
    return label.slice(0,60).trim()
  }

  function norm(s) {
    return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
            .replace(/[.\-,]/g,' ').replace(/\s+/g,' ').trim()
  }

  function buscarEnContabilidad(asociado, planta) {
    const na = norm(asociado), np = norm(planta)
    // Exacto
    for (const r of contabilidadData) {
      if (norm(r.asociado) === na && norm(r.planta) === np) return r
    }
    // Fuzzy planta (contains) + asociado (contains)
    for (const r of contabilidadData) {
      const ra = norm(r.asociado), rp = norm(r.planta)
      const plantaOk = rp.includes(np) || np.includes(rp)
      const asocOk   = ra.includes(na) || na.includes(ra)
      if (plantaOk && asocOk) return r
    }
    // Solo planta (útil cuando el nombre del inversionista difiere mucho)
    if (np.length > 6) {
      for (const r of contabilidadData) {
        const rp = norm(r.planta)
        if (rp.includes(np) || np.includes(rp)) return r
      }
    }
    return null
  }

  // ====== CONCILIACIÓN: controles ======
  function setConcMode(m) {
    currentConcMode = m
    ;['Ingresos','Costos','Autoconsumo'].forEach(x =>
      $('cTab'+x).classList.toggle('active', m === x.toLowerCase()))
    // Ocultar resultados previos de otro modo para no mezclar vistas
    $('concTableContainer').style.display = 'none'
    $('concCostosContainer').style.display = 'none'
    $('concStatsBar').style.display = 'none'
    updateConcBtn()
  }

  function updateConcUI() {
    const n = $('concFileInput').files.length
    $('concDropText').innerHTML = n
      ? `<b style="color:var(--ok)">✅ ${n} PDF${n!==1?'s':''} cargados</b>`
      : 'Clic para cargar los PDFs del lote'
    $('dzPdfs').classList.toggle('loaded', n > 0)
    updateConcBtn()
  }

  function updateConcBtn() {
    const hasPdfs  = $('concFileInput').files.length > 0
    const hasXlsx  = currentConcMode === 'costos'
      ? asientosDetalle.length > 0
      : contabilidadData.length > 0
    $('btnConc').disabled = !(hasPdfs && hasXlsx)
  }

  // ====== EXTRACCIÓN PDF para conciliación ======
  async function extractConcData(file, mode) {
    try {
      const data = await file.arrayBuffer()
      const pdf  = await pdfjsLib.getDocument({data}).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i)
        const content = await page.getTextContent()
        fullText += content.items.map(it => it.str).join('  ') + ' \n '
      }
      const text = fullText.toUpperCase()

      // CMU
      const cmuM = text.match(/CMU(\d+)/i)
      const cmu  = cmuM ? 'CMU' + cmuM[1]
                 : (file.name.match(/CMU\d+/i) || [''])[0].toUpperCase()

      // Inversionista: bloque "Señores ... NIT"
      let inversionista = ''
      const senM = fullText.match(/Se[ñn]ores\s*\r?\n?\s*([\w\s\.\-,]+?)(?=\s*NIT|\s*Medell|\s*Bogot|\s*Cali|\s*\n\n)/is)
      if (senM) inversionista = senM[1].replace(/\s+/g,' ').trim()

      // Planta: "proyecto [nombre]"
      let planta = ''
      const pM = fullText.match(/proyecto\s+([\w\s\-#À-ž]+?)[\.\,\r\n]/i)
      if (pM) planta = pM[1].replace(/\s+/g,' ').trim()

      // Valor a Pagar
      let valorPagar = 0
      if (mode === 'autoconsumo') {
        const nums = [...text.matchAll(/\b([\d]{1,3}(?:,[\d]{3})+|[\d]{5,})\b/g)]
          .map(m => ({ val: parseFloat(m[1].replace(/,/g,'')), idx: m.index }))
          .filter(m => m.val >= 1000)
        const ti = text.indexOf('VALOR A PAGAR')
        if (ti > -1) {
          const cl = nums.find(v => v.idx > ti && v.idx - ti < 600)
          if (cl) valorPagar = cl.val
        }
      } else {
        const nums = [...text.matchAll(/\$\s*([\d\.,]+)/g)]
          .map(m => ({ val: parseFloat(m[1].replace(/\./g,'').replace(/,/g,'.')), idx: m.index }))
        const ti = text.indexOf('VALOR A PAGAR')
        if (ti > -1) {
          const cl = nums.find(v => v.idx > ti && v.idx - ti < 500)
          if (cl) valorPagar = cl.val
        }
      }

      return { cmu, inversionista, planta, valorPagar, fileName: file.name }
    } catch(e) {
      return { cmu:'', inversionista:'', planta:'', valorPagar:0, fileName:file.name, error:true }
    }
  }

  // ====== CONCILIACIÓN DETALLADA (modo COSTOS) ======

  // Extrae texto preservando líneas (agrupa items del PDF por coordenada Y),
  // necesario para leer "ETIQUETA ... $ valor" línea por línea.
  async function extractPdfLines(file) {
    const data = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data }).promise
    let out = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const byLine = new Map()
      content.items.forEach(it => {
        const y = Math.round(it.transform[5])
        if (!byLine.has(y)) byLine.set(y, [])
        byLine.get(y).push({ x: it.transform[4], s: it.str })
      })
      ;[...byLine.keys()].sort((a, b) => b - a).forEach(y => {
        out += byLine.get(y).sort((a, b) => a.x - b.x).map(o => o.s).join(' ') + '\n'
      })
    }
    return out
  }

  function recalcCostosStats() {
    $('csTotal').textContent  = costosResults.length
    $('csMatch').textContent  = costosResults.filter(r => r.status === 'ok').length
    $('csDiff').textContent   = costosResults.filter(r => r.status === 'bad').length
    $('csNoCont').textContent = costosResults.filter(r => r.status === 'warn').length
    $('csNoPdf').textContent  = costosResults.filter(r => !r.tag).length
  }

  async function startConciliationCostos() {
    const files = [...$('concFileInput').files]
    costosResults = []
    $('concStatsBar').style.display = 'flex'
    $('concTableContainer').style.display = 'none'
    $('concCostosContainer').style.display = 'none'
    $('btnExportCSV').disabled = true

    for (const file of files) {
      let mandato
      try {
        const text = await extractPdfLines(file)
        mandato = extractMandate(text, file.name)
      } catch (e) {
        mandato = { cmu: '', projName: '', mandante: '', nit: '', vals: {}, total: null }
      }
      const sug = suggestTag(mandato.projName, tagsAnaliticos, savedTagMap)
      const rec = reconciliar(mandato, asientosDetalle, sug.tag)
      costosResults.push({ mandato, fileName: file.name, tag: sug.tag, sugStatus: sug.status, candidates: sug.candidates, ...rec })
    }

    recalcCostosStats()
    $('concCostosContainer').style.display = 'block'
    $('btnExportCSV').disabled = false
    renderConcCostos()
  }

  function renderConcCostos() {
    const body = $('concCostosBody')
    if (!body) return
    const onlyProb = $('costosOnlyProblem') && $('costosOnlyProblem').checked
    const lvlColor = { ok: '#10b981', warn: '#f59e0b', bad: '#e11d48' }
    const stBadge = s => s === 'ok'
      ? '<span class="badge badge-ok">✅ OK</span>'
      : s === 'warn'
        ? '<span class="badge badge-warn">⚠️ Revisar</span>'
        : '<span class="badge badge-err">❌ Hallazgos</span>'
    const visible = onlyProb ? costosResults.filter(r => r.status !== 'ok') : costosResults
    if (!visible.length) { body.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px">Sin registros</div>'; return }
    body.innerHTML = visible.map(r => {
      const idx = costosResults.indexOf(r)
      let tagControl
      if (r.tag && (r.sugStatus === 'recordado' || r.sugStatus === 'auto')) {
        tagControl = `<span style="color:#64748b;font-size:12px">Etiqueta analítica: <b>${r.tag}</b> <small>(${r.sugStatus})</small></span>`
      } else {
        const opts = ['<option value="">— elegir etiqueta —</option>']
          .concat(tagsAnaliticos.map(t => `<option value="${t}" ${t === r.tag ? 'selected' : ''}>${t}</option>`)).join('')
        tagControl = `<span style="color:#64748b;font-size:12px">Etiqueta analítica: </span><select class="tol-input" style="width:auto;min-width:220px" onchange="setCostoTag(${idx}, this.value)">${opts}</select>`
      }
      const flagsHtml = r.flags.map(f => `<li style="color:${lvlColor[f.lvl]};font-size:12px;margin:2px 0">${f.txt}</li>`).join('')
      return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
          <div><b style="color:var(--accent)">${r.mandato.cmu || '-'}</b>
            <span style="font-size:12px;margin-left:8px">${r.mandato.mandante || '<span style="color:var(--warn)">mandante no detectado</span>'}</span></div>
          ${stBadge(r.status)}
        </div>
        <div style="margin-bottom:6px">${tagControl}</div>
        <ul style="margin:0;padding-left:18px">${flagsHtml || '<li style="font-size:12px;color:#64748b">Sin detalle</li>'}</ul>
      </div>`
    }).join('')
  }

  function setCostoTag(idx, tag) {
    const r = costosResults[idx]
    if (!r) return
    r.tag = tag
    if (tag && r.mandato.projName) { savedTagMap[normNombre(r.mandato.projName)] = tag; saveTagMap(savedTagMap) }
    Object.assign(r, reconciliar(r.mandato, asientosDetalle, tag))
    r.sugStatus = tag ? 'recordado' : r.sugStatus
    recalcCostosStats()
    renderConcCostos()
  }

  function exportConcCostosCSV() {
    if (!costosResults.length) return
    let csv = '﻿CMU,Mandante,Etiqueta,Estado,Nivel,Codigo,Detalle,Archivo\n'
    for (const r of costosResults) {
      const base = [r.mandato.cmu || '', `"${(r.mandato.mandante || '').replace(/"/g, '""')}"`, `"${r.tag || ''}"`, r.status]
      if (r.flags.length) {
        for (const f of r.flags) csv += base.concat([f.lvl, f.code, `"${f.txt.replace(/"/g, '""')}"`, `"${r.fileName}"`]).join(',') + '\n'
      } else {
        csv += base.concat(['', '', '', `"${r.fileName}"`]).join(',') + '\n'
      }
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
      download: `conciliacion_costos_${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
  }

  // ====== EJECUTAR CONCILIACIÓN ======
  async function startConciliation() {
    if (currentConcMode === 'costos') return startConciliationCostos()
    const files = [...$('concFileInput').files]
    concResults  = []
    $('concStatsBar').style.display = 'flex'
    $('concTableContainer').style.display = 'none'
    $('btnExportCSV').disabled = true

    // Marcar todos como no-encontrados inicialmente
    const contMatched = new Set()

    let matchN=0, diffN=0, noContN=0

    for (const file of files) {
      const d = await extractConcData(file, currentConcMode)
      const rec = (d.inversionista || d.planta)
                ? buscarEnContabilidad(d.inversionista, d.planta) : null
      const contVal   = rec ? Math.abs(rec.valor_contabilidad) : null
      const diferencia= contVal !== null ? Math.round(d.valorPagar - contVal) : null
      const tol       = parseInt($('toleranceInput').value) || 200
      let estado
      if (d.error)        estado = 'ERROR_PDF'
      else if (!contVal)  { estado = 'SIN_CONTAB'; noContN++ }
      else if (Math.abs(diferencia) <= tol) { estado = 'OK'; matchN++ }
      else                { estado = 'DIFERENCIA'; diffN++ }

      if (rec) contMatched.add(rec.asociado + '|||' + rec.planta)
      concResults.push({ ...d, contVal, diferencia, estado, recKey: rec ? rec.asociado+'|||'+rec.planta : null })
    }

    // Registros contables sin PDF
    const sinPdf = contabilidadData.filter(r =>
      !contMatched.has(r.asociado+'|||'+r.planta) && r.valor_contabilidad < 0
    )

    $('csTotal').textContent  = files.length
    $('csMatch').textContent  = matchN
    $('csDiff').textContent   = diffN
    $('csNoCont').textContent = noContN
    $('csNoPdf').textContent  = sinPdf.length

    $('concTableContainer').style.display = 'block'
    $('btnExportCSV').disabled = false
    renderConcTable(sinPdf)
  }

  function renderConcTable(sinPdfOverride) {
    if (currentConcMode === 'costos') return renderConcCostos()
    const tol     = parseInt($('toleranceInput').value) || 200
    const onlyDiff= $('filterDiffOnly').checked
    const tbody   = $('concTableBody')
    tbody.innerHTML = ''

    let m=0, d=0, nc=0
    const rows = concResults.map(r => {
      let estado = r.estado
      if (r.contVal !== null && r.diferencia !== null) {
        estado = Math.abs(r.diferencia) <= tol ? 'OK' : 'DIFERENCIA'
      }
      if (estado==='OK') m++; else if (estado==='SIN_CONTAB'||estado==='ERROR_PDF') nc++; else d++
      return {...r, estado}
    })
    $('csMatch').textContent  = m
    $('csDiff').textContent   = d
    $('csNoCont').textContent = nc

    const visible = onlyDiff ? rows.filter(r => r.estado !== 'OK') : rows
    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px">Sin registros</td></tr>'
    } else {
      for (const r of visible) {
        const [color, badge] = r.estado === 'OK'
          ? ['#10b981','<span class="badge badge-ok">✅ OK</span>']
          : r.estado === 'DIFERENCIA'
          ? ['#e11d48','<span class="badge badge-err">❌ Diferencia</span>']
          : ['#f59e0b','<span class="badge badge-warn">⚠️ '+r.estado+'</span>']

        const difStr = r.diferencia !== null
          ? `<span style="color:${color};font-weight:700">${r.diferencia>=0?'+':''}${r.diferencia.toLocaleString('es-CO')}</span>`
          : '—'

        tbody.innerHTML += `<tr>
          <td class="mono" style="color:var(--accent);font-weight:600">${r.cmu||'-'}</td>
          <td style="font-size:12px;max-width:200px;word-break:break-word">${r.inversionista||'<span style="color:var(--warn)">No detectado</span>'}</td>
          <td style="font-size:12px;max-width:180px;word-break:break-word">${r.planta||'<span style="color:var(--warn)">No detectado</span>'}</td>
          <td class="mono" style="text-align:right">$${Math.round(r.valorPagar).toLocaleString('es-CO')}</td>
          <td class="mono" style="text-align:right">${r.contVal!==null?'$'+Math.round(r.contVal).toLocaleString('es-CO'):'<span style="color:var(--warn)">—</span>'}</td>
          <td class="mono" style="text-align:right">${difStr}</td>
          <td>${badge}</td>
        </tr>`
      }
    }

    // Sin PDF
    const sinPdf = sinPdfOverride || contabilidadData.filter(r =>
      !concResults.find(cr => cr.recKey === r.asociado+'|||'+r.planta) && r.valor_contabilidad < 0
    )
    const sinPdfSection = $('sinPdfSection')
    const sinPdfBody    = $('sinPdfBody')
    $('csNoPdf').textContent = sinPdf.length
    if (sinPdf.length && !onlyDiff) {
      sinPdfSection.style.display = 'block'
      sinPdfBody.innerHTML = sinPdf.map(r => `<tr>
        <td style="font-size:12px">${r.asociado}</td>
        <td style="font-size:12px">${r.planta}</td>
        <td class="mono" style="text-align:right;color:var(--warn)">$${Math.round(Math.abs(r.valor_contabilidad)).toLocaleString('es-CO')}</td>
      </tr>`).join('')
    } else {
      sinPdfSection.style.display = 'none'
    }
  }

  function exportConcCSV() {
    if (currentConcMode === 'costos') return exportConcCostosCSV()
    if (!concResults.length) return
    const tol = parseInt($('toleranceInput').value) || 200
    let csv = '﻿'
    csv += 'CMU,Inversionista,Planta,Valor PDF,Valor Contabilidad,Diferencia,Estado,Archivo\n'
    for (const r of concResults) {
      const estado = r.contVal!==null
        ? (Math.abs(r.diferencia)<=tol ? 'OK' : 'DIFERENCIA') : r.estado
      csv += [
        r.cmu,
        `"${r.inversionista}"`,
        `"${r.planta}"`,
        Math.round(r.valorPagar),
        r.contVal!==null ? Math.round(r.contVal) : '',
        r.diferencia!==null ? r.diferencia : '',
        estado,
        `"${r.fileName}"`
      ].join(',') + '\n'
    }
    // Registros sin PDF
    const sinPdf = contabilidadData.filter(r =>
      !concResults.find(cr => cr.recKey === r.asociado+'|||'+r.planta) && r.valor_contabilidad < 0)
    for (const r of sinPdf) {
      csv += ['',`"${r.asociado}"`,`"${r.planta}"`, '', Math.round(Math.abs(r.valor_contabilidad)), '', 'SIN_PDF', ''].join(',') + '\n'
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'})),
      download: `conciliacion_mandatos_${new Date().toISOString().slice(0,10)}.csv`
    })
    a.click()
  }

  // ====== AUDITORÍA (lógica original intacta) ======
  async function startAudit() {
    const files = [...$('fileInput').files]
    const container    = $('results')
    const reportBody   = $('reportContent')
    const reportContainer = $('reportContainer')
    container.innerHTML = ''
    reportBody.innerHTML = ''
    reportContainer.style.display = 'none'
    $('statsBar').style.display = 'flex'
    const processedCmuIds = new Set()
    let ok=0, err=0

    for (const file of files) {
      const card = document.createElement('div')
      card.className = 'card'
      card.innerHTML = `<b style="font-size:12px">${file.name}</b><div class="spinner" style="margin-top:8px"></div>`
      container.appendChild(card)

      const res = await processPdf(file)
      const cmuInName = (file.name.match(/CMU\d+/i)||[''])[0].toUpperCase()

      if (res.approved) {
        if (!cmuInName) { res.approved=false; res.msg='Nombre sin CMU' }
        else if (res.cmuInText && cmuInName !== res.cmuInText) { res.approved=false; res.msg=`Conflicto: archivo ${cmuInName} vs PDF ${res.cmuInText}` }
        else if (processedCmuIds.has(cmuInName)) { res.approved=false; res.msg=`CMU ${cmuInName} duplicado` }
      }
      if (cmuInName) processedCmuIds.add(cmuInName)

      if (res.approved) ok++
      else {
        err++
        reportContainer.style.display = 'block'
        reportBody.innerHTML += `<tr>
          <td>${cmuInName||'S/N'}<br><small style="color:#94a3b8;font-size:10px">${file.name}</small></td>
          <td class="mono">$${res.reported.toLocaleString()}</td>
          <td class="mono">$${res.expected.toLocaleString()}</td>
          <td class="txt-err">${res.msg}</td>
        </tr>`
      }

      card.innerHTML = `
        <span class="pill ${res.approved?'pill-ok':'pill-err'}">${res.approved?'CUMPLE':'RECHAZADO'}</span>
        <b style="font-size:12px;display:block;margin-right:65px;color:var(--accent)">${cmuInName||'Sin CMU'}</b>
        <div style="font-size:11px;color:#64748b;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${file.name}</div>
        <div style="font-size:12px;margin-top:10px;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #f1f5f9;padding-top:8px">
          <div>Matemática: ${res.mathOk?'✅':'❌'}</div>
          ${(currentMode==='ingresos'||currentMode==='autoconsumo')?`<div>Marca (**): ${res.starOk?'✅':'❌'}</div>`:'<div></div>'}
          <div style="font-weight:700;grid-column:span 2;margin-top:6px" class="mono">Total: $${res.reported.toLocaleString()}</div>
        </div>`

      $('sTotal').textContent = files.length
      $('sOk').textContent    = ok
      $('sErr').textContent   = err
    }
  }

  async function processPdf(file) {
    if (currentMode === 'autoconsumo') return processPdfAutoconsumo(file)
    try {
      const data = await file.arrayBuffer()
      const pdf  = await pdfjsLib.getDocument({data}).promise
      let fullText=''
      for (let i=1; i<=pdf.numPages; i++) {
        const p = await pdf.getPage(i)
        fullText += (await p.getTextContent()).items.map(it=>it.str).join('  ') + ' \n '
      }
      const text = fullText.toUpperCase()
      const cmuM = text.match(/CMU\d+/i)
      const cmuInText = cmuM ? cmuM[0].toUpperCase() : null
      const money = [...text.matchAll(/\$\s*([\d\.,]+)/g)].map(m=>({
        val: parseFloat(m[1].replace(/\./g,'').replace(/,/g,'.')), index:m.index}))
      const labels=[]
      ;[{type:'SUMA',re:/SUMA/g},{type:'RESTA',re:/RESTA/g},{type:'TOTAL',re:/VALOR\s+A\s+PAGAR/g}].forEach(p=>{
        let m; const r=new RegExp(p.re.source,'g')
        while((m=r.exec(text))!==null) labels.push({type:p.type,index:m.index})
      })
      labels.sort((a,b)=>a.index-b.index)
      let calc=0,reported=0,totalFound=false
      labels.forEach(l=>{
        const v=money.find(v=>v.index>l.index && v.index-l.index<500)
        if(v){if(l.type==='SUMA')calc+=v.val;else if(l.type==='RESTA')calc-=v.val;else{reported=v.val;totalFound=true;}}
      })
      const diff=Math.abs(reported-calc)
      const mathOk=diff<150&&reported>0
      const starOk=currentMode==='ingresos'?fullText.includes('**'):true
      let msg='OK'
      if(!totalFound) msg="No se halló 'Valor a Pagar'"
      else if(reported===0) msg='Valor a Pagar = $0'
      else if(!mathOk) msg=`Error cálculo (Dif: $${Math.round(diff)})`
      else if(!starOk) msg='Faltan asteriscos (**)'
      return {approved:mathOk&&starOk&&totalFound,mathOk,starOk,diff,reported,expected:calc,msg,cmuInText}
    } catch(e){return{approved:false,reported:0,expected:0,msg:'Error lectura PDF'}}
  }

  async function processPdfAutoconsumo(file) {
    try {
      const data = await file.arrayBuffer()
      const pdf  = await pdfjsLib.getDocument({data}).promise
      let fullText=''
      for (let i=1; i<=pdf.numPages; i++) {
        const p = await pdf.getPage(i)
        fullText += (await p.getTextContent()).items.map(it=>it.str).join('  ') + ' \n '
      }
      const text = fullText.toUpperCase()
      const cmuM = text.match(/CMU\d+/i)
      const cmuInText = cmuM ? cmuM[0].toUpperCase() : null
      const money=[...text.matchAll(/\b([\d]{1,3}(?:,[\d]{3})+|[\d]{4,})\b/g)]
        .map(m=>({val:parseFloat(m[1].replace(/,/g,'')),index:m.index})).filter(m=>m.val>=100)
      const labels=[]
      ;[{type:'SUMA',re:/\bSUMA\b/g},{type:'RESTA',re:/\bRESTA\b/g},{type:'TOTAL',re:/VALOR\s+A\s+PAGAR/g}].forEach(p=>{
        let m; const r=new RegExp(p.re.source,'g')
        while((m=r.exec(text))!==null) labels.push({type:p.type,index:m.index})
      })
      labels.sort((a,b)=>a.index-b.index)
      let calc=0,reported=0,totalFound=false
      labels.forEach(l=>{
        const v=money.find(v=>v.index>l.index && v.index-l.index<600)
        if(v){if(l.type==='SUMA')calc+=v.val;else if(l.type==='RESTA')calc-=v.val;else{reported=v.val;totalFound=true;}}
      })
      const diff=Math.abs(reported-calc)
      const mathOk=totalFound&&diff<150&&reported>0
      const starOk=fullText.includes('**')
      let msg='OK'
      if(!totalFound) msg="No se halló 'Valor a Pagar'"
      else if(reported===0) msg='Valor a Pagar = $0'
      else if(!mathOk) msg=`Error cálculo (Dif: $${Math.round(diff)})`
      else if(!starOk) msg='Faltan asteriscos (**)'
      return{approved:mathOk&&starOk&&totalFound,mathOk,starOk,diff,reported,expected:calc,msg,cmuInText}
    } catch(e){return{approved:false,reported:0,expected:0,msg:'Error lectura PDF',cmuInText:null}}
  }

  // Exponer las funciones que el markup invoca vía onclick/onchange
  window.switchTab = switchTab
  window.setMode = setMode
  window.updateAuditUI = updateAuditUI
  window.loadExcel = loadExcel
  window.setConcMode = setConcMode
  window.updateConcUI = updateConcUI
  window.startConciliation = startConciliation
  window.renderConcTable = renderConcTable
  window.exportConcCSV = exportConcCSV
  window.startAudit = startAudit
  window.setCostoTag = setCostoTag
}

onMounted(async () => {
  // pdf.js sigue desde CDN; XLSX ahora es el paquete npm importado
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
  root.value.innerHTML = MARKUP
  initValidador(root.value)
})

onBeforeUnmount(() => {
  GLOBAL_FNS.forEach(fn => { delete window[fn] })
})
</script>

<style scoped>
/* ── Header (estilo plataforma) ───────────────────────────────────────── */
.gf-page { padding: 16px; }
.mon-tab-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; margin-bottom: 16px;
  background: #fff; border: 1px solid #ECE7F2; border-radius: 12px;
}
.vm-version {
  color: #94a3b8; font-size: 12px;
  font-family: 'IBM Plex Mono', monospace;
}

/* ── Variables del validador: --accent adaptado a la marca (#915BD8) ──── */
.vm-root {
  --bg: #f8fafc; --accent: #915BD8; --text: #1e293b;
  --err: #e11d48; --ok: #10b981; --warn: #f59e0b; --radius: 12px;
  font-family: 'IBM Plex Sans', 'Sora', system-ui, sans-serif;
  color: var(--text);
}

/* Las reglas siguientes son ::v-deep para alcanzar el HTML inyectado en onMounted */
.vm-root :deep(*) { box-sizing: border-box; }

.vm-root :deep(.tab-bar) { display: flex; gap: 10px; margin-bottom: 18px; background: #e2e8f0; padding: 5px; border-radius: 10px; }
.vm-root :deep(.tab-btn) { flex: 1; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: .3s; color: #64748b; font-size: 14px; background:transparent; }
.vm-root :deep(.tab-btn.active) { background: white; color: var(--accent); box-shadow: 0 2px 4px rgba(0,0,0,.1); }

.vm-root :deep(.mode-selector) { display: flex; gap: 10px; margin-bottom: 16px; background: #e2e8f0; padding: 5px; border-radius: 10px; }
.vm-root :deep(.mode-btn) { flex: 1; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: .3s; color: #64748b; font-size: 13px; background:transparent; }
.vm-root :deep(.mode-btn.active) { background: white; color: var(--accent); box-shadow: 0 2px 4px rgba(0,0,0,.1); }

.vm-root :deep(.drop-zone) { border: 2px dashed #cbd5e1; border-radius: var(--radius); padding: 32px; text-align: center; background: white; cursor: pointer; margin-bottom: 14px; transition:.2s; }
.vm-root :deep(.drop-zone:hover) { border-color: var(--accent); background:#faf8ff; }
.vm-root :deep(.drop-zone.loaded) { border-color: var(--ok); border-style: solid; background: #f0fdf4; }
.vm-root :deep(.drop-zone.loaded .dz-icon) { color: var(--ok); }

.vm-root :deep(.btn-primary) { background: var(--accent); color: white; border: none; padding: 14px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 15px; transition:.2s; }
.vm-root :deep(.btn-primary:disabled) { opacity: .4; cursor: not-allowed; }
.vm-root :deep(.btn-primary:not(:disabled):hover) { background: #6D28D9; }
.vm-root :deep(.btn-secondary) { background: #0f766e; color: white; border: none; padding: 14px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px; white-space:nowrap; }
.vm-root :deep(.btn-secondary:disabled) { opacity:.4; cursor:not-allowed; }

.vm-root :deep(.stats) { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap:wrap; }
.vm-root :deep(.stat-card) { flex: 1; min-width: 100px; background: white; padding: 14px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
.vm-root :deep(.stat-val) { font-size: 22px; font-weight: 700; display: block; }

.vm-root :deep(.results-grid) { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 14px; margin-bottom: 24px; }
.vm-root :deep(.card) { background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 15px; position: relative; }
.vm-root :deep(.pill) { position: absolute; top: 13px; right: 13px; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 50px; text-transform: uppercase; }
.vm-root :deep(.pill-ok)  { background: #ecfdf5; color: #065f46; }
.vm-root :deep(.pill-err) { background: #fff1f2; color: #9f1239; }

.vm-root :deep(.panel) { background: white; border-radius: var(--radius); border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 18px; box-shadow: 0 2px 6px rgba(0,0,0,.06); }
.vm-root :deep(.report-table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.vm-root :deep(.report-table th) { text-align: left; padding: 10px 12px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-size:12px; }
.vm-root :deep(.report-table td) { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.vm-root :deep(.report-table tr:last-child td) { border-bottom: none; }
.vm-root :deep(.mono) { font-family: 'IBM Plex Mono', monospace; }
.vm-root :deep(.txt-err) { color: var(--err); font-weight: 600; }
.vm-root :deep(.txt-ok)  { color: var(--ok); font-weight: 600; }
.vm-root :deep(.txt-warn){ color: var(--warn); font-weight: 600; }

.vm-root :deep(.spinner) { border: 3px solid #f3f3f3; border-top: 3px solid var(--accent); border-radius: 50%; width: 18px; height: 18px; animation: vm-spin 1s linear infinite; display:inline-block; }
@keyframes vm-spin { to { transform: rotate(360deg); } }

.vm-root :deep(.step-badge) { display:inline-block; background:var(--accent); color:white; border-radius:50%; width:22px; height:22px; line-height:22px; text-align:center; font-size:12px; font-weight:700; margin-right:8px; flex-shrink:0; }
.vm-root :deep(.step-row) { display:flex; align-items:flex-start; gap:0; margin-bottom:14px; }

.vm-root :deep(.conc-controls) { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
.vm-root :deep(.toggle-label) { display:flex; align-items:center; gap:5px; cursor:pointer; font-size:13px; white-space:nowrap; }
.vm-root :deep(.tol-input) { width:90px; padding:6px 10px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; }

.vm-root :deep(.badge) { padding:2px 10px; border-radius:50px; font-size:11px; font-weight:700; }
.vm-root :deep(.badge-ok)   { background:#ecfdf5; color:#065f46; }
.vm-root :deep(.badge-err)  { background:#fff1f2; color:#9f1239; }
.vm-root :deep(.badge-warn) { background:#fffbeb; color:#92400e; }

.vm-root :deep(h2),
.vm-root :deep(h3),
.vm-root :deep(h4) { color: #2C2039; }
</style>
