/**
 * conciliacionMandatos.js
 * ---------------------------------------------------------------------------
 * Motor PURO (sin DOM ni framework) de conciliación "Mandato (PDF) vs. Asiento
 * contable (Odoo .xlsx)" para Finanzas → Validador de Mandatos → Conciliación
 * Contable → COSTOS.
 *
 * La vista lee los archivos (xlsx/pdf) y pinta la UI; este módulo solo recibe
 * datos y devuelve el resultado de la conciliación.
 *
 * Reglas clave aprendidas en producción (NO relajar sin revisar):
 *   1. El mandante se empareja por PALABRA COMPLETA exigiendo TODOS sus términos
 *      distintivos. Con subcadena, "STRADA" coincide dentro de "E-STRADA" y se
 *      suman costos de un tercero equivocado.
 *   2. Mandante, NIT y proyecto se leen del CUERPO del PDF, no del nombre de
 *      archivo (el nombre puede traer tildes mal codificadas).
 *   3. Tolerancia de redondeo de $1 al comparar importes.
 * ---------------------------------------------------------------------------
 */

// ===================== CONFIGURACIÓN (modo COSTOS) =====================

/** Cuenta contable -> concepto del mandato. Ajustar si cambia el PUC. */
export const ACC2CONCEPT = {
  '28151002': 'mant',     '28151003': 'iva_mant',
  '28151009': 'int',      '28151015': 'int',
  '28151010': 'iva_int',  '28151016': 'iva_int',
  '28150515': 'arr',      '28150517': 'arr',
  '28150516': 'iva_arr',  '28150518': 'iva_arr',
}

/** Concepto -> etiqueta legible. */
export const CONCEPTS = {
  mant: 'Mantenimiento', iva_mant: 'IVA mantenimiento',
  int: 'Servicio de internet', iva_int: 'IVA internet',
  arr: 'Arriendo', iva_arr: 'IVA arriendo',
}

/** Cuentas que NO son de costo de mandato: si reciben débito = "cuenta equivocada". */
export const NON_COST_ACCOUNTS = {
  '23355002': 'Contrapartida proveedor internet',
  '23359505': 'Otros',
  '23653010': 'Retención arrendamientos',
  '22050505': 'Proveedores nacionales',
  '28151006': 'Retefuente terceros',
}

/** Palabras a ignorar al comparar nombres de mandante/asociado. */
const STOP = new Set(['SA', 'SAS', 'SAA', 'LTDA', 'CIA', 'ESP', 'EN', 'DEL', 'LOS', 'LAS', 'DE', 'LA', 'EL', 'Y', 'S', 'A', 'SOCIEDAD', 'C'])

/** Palabras de relleno al comparar nombres de proyecto/planta. */
const FILLER = new Set(['MINIGRANJA', 'SOLAR', 'PROYECTO', 'MANDATO', 'COSTOS', 'COSTO', 'MINI', 'GRANJA', 'LA', 'EL', 'LOS', 'LAS', 'DE', 'DEL', 'SAN'])

/** Tolerancia de redondeo en pesos. */
export const TOL = 1

// ===================== UTILIDADES =====================

export const norm = (s) =>
  (s == null ? '' : s.toString())
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export const projectTokens = (s) => norm(s).split(' ').filter((t) => t.length > 2 && !FILLER.has(t))

/** Conjunto de tokens distintivos de un nombre de empresa/persona (palabra completa). */
export const nameTokenSet = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)))

/** Convierte "1.234.567,89" / "$ 1.234.567,89" a número (formato CO). */
export const parseNum = (s) => {
  if (s == null) return 0
  if (typeof s === 'number') return s
  let t = s.toString().trim().replace(/\$/g, '').replace(/\s/g, '')
  t = t.replace(/\./g, '').replace(/,/g, '.')
  const n = parseFloat(t)
  return isNaN(n) ? 0 : n
}

// ===================== PARSEO DE ASIENTOS (Excel Odoo) =====================

/**
 * Detecta columnas por nombre de encabezado (robusto a variaciones del export).
 * Soporta DEBE/HABER o un único "Importe en moneda" con signo, y el proyecto
 * desde una columna ANALÍTICA o, si no existe, desde ETIQUETA.
 *
 * @param {Array<Array>} rows  Filas del Excel incluida la cabecera (sheet_to_json {header:1}).
 * @returns {{details: Array, tags: string[]}}
 *   details: [{cpt, asociado, acc, accDesc, debe, haber, etiqueta, proj}]
 *   tags: etiquetas analíticas (proyectos) únicas, ordenadas.
 */
export function parseAsientos(rows) {
  if (!rows || !rows.length) return { details: [], tags: [] }
  const head = rows[0].map((h) => norm(h))
  const find = (...names) => {
    for (const n of names) { const i = head.indexOf(n); if (i !== -1) return i }
    return -1
  }
  const findInc = (sub) => head.findIndex((h) => h.includes(sub))
  const col = {
    asiento: find('ASIENTO CONTABLE', 'ASIENTO'),
    asociado: find('ASOCIADO'),
    cuenta: find('CUENTA'),
    debe: find('DEBE'),
    haber: find('HABER'),
    importe: findInc('IMPORTE'),
    etiqueta: find('ETIQUETA'),
    proj: findInc('ANALITICA'),
  }

  const details = []
  const tagSet = new Set()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    const asociado = col.asociado !== -1 ? r[col.asociado] : null
    const cuenta = col.cuenta !== -1 ? r[col.cuenta] : null
    if (!asociado || !cuenta) continue          // solo líneas de detalle
    // Saltar filas de agrupación/subtotal (asiento con sangría) si hay columna asiento
    if (col.asiento !== -1) {
      const a = r[col.asiento]
      if (a != null && /^\s/.test(a.toString())) continue
    }
    const accNo = cuenta.toString().trim().split(/\s+/)[0]
    const accDesc = cuenta.toString().trim().replace(accNo, '').trim()

    // Débito/haber: usar DEBE/HABER si existen; si no, derivar del importe con signo.
    let debe = 0, haber = 0
    if (col.debe !== -1 || col.haber !== -1) {
      debe = parseNum(r[col.debe])
      haber = parseNum(r[col.haber])
    } else if (col.importe !== -1) {
      const imp = parseNum(r[col.importe])
      if (imp >= 0) debe = imp; else haber = -imp
    }

    // Proyecto/etiqueta analítica: columna ANALÍTICA si existe; si no, ETIQUETA.
    const etiqueta = col.etiqueta !== -1 ? (r[col.etiqueta] || '').toString() : ''
    const proj = (col.proj !== -1 ? (r[col.proj] || '') : etiqueta).toString().trim()
    if (proj) tagSet.add(proj)

    details.push({
      cpt: col.asiento !== -1 ? (r[col.asiento] || '').toString() : '',
      asociado: asociado.toString(),
      acc: accNo, accDesc,
      debe, haber,
      etiqueta,
      proj,
    })
  }
  return { details, tags: Array.from(tagSet).sort() }
}

// ===================== PARSEO DE MANDATO (texto del PDF) =====================

/**
 * @param {string} text      Texto extraído del PDF.
 * @param {string} filename  Nombre del archivo (fallback).
 * @returns {{cmu,projName,mandante,nit,vals,total}}
 */
export function extractMandate(text, filename = '') {
  text = text || ''
  const cmu = (text.match(/CMU\d+/i) || filename.match(/CMU\d+/i) || ['?'])[0]
  const flat = text.replace(/\s+/g, ' ')

  // Mandante + NIT desde el cuerpo (más confiable que el nombre de archivo)
  let mandante = '', nit = ''
  const mm = flat.match(/de mandatario,?\s*y\s+(.+?),\s*con NIT\.?\s*([\d.\-\s]+?),?\s*en calidad de mandante/i)
  if (mm) { mandante = mm[1].trim(); nit = mm[2].replace(/\s/g, '') }
  if (!mandante) mandante = (filename.match(/-([^-]+)\.pdf$/i) || [])[1] || ''

  // Proyecto / planta
  let proj = (flat.match(/relacionado con el proyecto\s+([^.]+?)\s*$/i) || [])[1]
  if (!proj) proj = (flat.match(/relacionado con el proyecto\s+(.+?)(?:\.|\s+a saber)/i) || [])[1]
  if (!proj) proj = (text.match(/proyecto\s+(.+?)\s+a saber/is) || [])[1]
  if (!proj) { const m = filename.match(/-Costos-(.+?)-[^-]+\.pdf/i); proj = m ? m[1] : filename }
  proj = (proj || '').replace(/\s+/g, ' ').trim()

  // Conceptos: línea "ETIQUETA ... $ valor"
  const map = [
    ['MANTENIMIENTO', 'mant'], ['IVA MANTENIMIENTO', 'iva_mant'],
    ['SERVICIO DE INTERNET', 'int'], ['IVA INTERNET', 'iva_int'],
    ['ARRIENDO', 'arr'], ['IVA ARRIENDO', 'iva_arr'],
  ]
  const vals = {}; let total = null
  text.split('\n').forEach((line) => {
    const m = line.match(/^(.*?)\$\s*([\d.,]+)\s*$/)
    if (!m) return
    const label = norm(m[1]); const v = parseNum(m[2])
    if (label.includes('VALOR A PAGAR')) { total = v; return }
    for (const [kw, key] of map) {
      if (label.startsWith(kw) || (kw.startsWith('IVA') && label.includes(kw))) {
        if ((key === 'mant' || key === 'int' || key === 'arr') && label.includes('IVA')) continue
        vals[key] = v; return
      }
    }
  })
  return { cmu, projName: proj, mandante, nit, vals, total }
}

// ===================== EMPAREJAMIENTO DE PROYECTO =====================

/**
 * Sugiere la etiqueta analítica para un mandato. Prioriza un mapa guardado
 * (nombre de planta normalizado → etiqueta), luego automático por token.
 * @returns {{tag,status,candidates}} status: 'recordado'|'auto'|'elige'|'revisar'
 */
export function suggestTag(projName, tags, savedMap = {}) {
  const remembered = savedMap[norm(projName)]
  if (remembered && tags.includes(remembered)) return { tag: remembered, status: 'recordado', candidates: [] }

  const tks = projectTokens(projName)
  if (!tks.length) return { tag: '', status: 'revisar', candidates: [] }
  const cand = tags.filter((t) => { const nt = norm(t); return tks.some((tk) => nt.includes(tk)) })
  if (cand.length === 1) return { tag: cand[0], status: 'auto', candidates: cand }
  if (cand.length > 1) {
    const scored = cand.map((t) => {
      const nt = norm(t)
      const sc = tks.filter((tk) => nt.includes(tk)).length + (nt.endsWith(tks[tks.length - 1]) ? 0.5 : 0)
      return { t, sc }
    }).sort((a, b) => b.sc - a.sc)
    if (scored[0].sc > scored[1].sc) return { tag: scored[0].t, status: 'auto', candidates: cand }
    return { tag: '', status: 'elige', candidates: cand }
  }
  return { tag: '', status: 'revisar', candidates: [] }
}

// ===================== CONCILIACIÓN =====================

export const fmt = (n) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })

/**
 * Concilia un mandato contra el detalle contable.
 * @param {object} mandato   Resultado de extractMandate().
 * @param {Array}  details   details de parseAsientos().
 * @param {string} tag       Etiqueta analítica elegida/confirmada.
 * @returns {{status, flags, sums, lines}}
 */
export function reconciliar(mandato, details, tag) {
  const flags = []
  if (!tag) {
    return { status: 'bad', flags: [{ lvl: 'bad', code: 'SIN_TAG', txt: 'No se asignó etiqueta analítica; no se puede verificar.' }], sums: {}, lines: [] }
  }

  // Mandante por PALABRA COMPLETA y con TODOS los términos distintivos (fix STRADA/ESTRADA)
  const mandTok = [...nameTokenSet(mandato.mandante)]
  const asociadoMatch = (aso) => {
    const aset = nameTokenSet(aso)
    return mandTok.length > 0 && mandTok.every((t) => aset.has(t))
  }
  const lines = details.filter((d) => d.proj === tag && asociadoMatch(d.asociado))

  // Sumar por concepto el DÉBITO de la cuenta de costo (NUNCA el neto debe − haber).
  // En arriendo el mandante aparece en AMBOS lados del asiento: como débito (el costo)
  // y como crédito (el arrendador es la misma fiduciaria). Netear debe − haber los
  // cancela y el arriendo "desaparece" (queda 0). El costo real es el débito; cada
  // asiento (p. ej. 3 contratos de una planta) aporta su débito y se suman todos.
  const sums = {}; const wrongAcc = []
  lines.forEach((d) => {
    const c = ACC2CONCEPT[d.acc]
    if (c) sums[c] = (sums[c] || 0) + d.debe
    else if (NON_COST_ACCOUNTS[d.acc] && (d.debe - d.haber) > 0) wrongAcc.push(d)
  })

  // Reparto entre fiduciarias: una planta puede repartir un concepto (p. ej. arriendo)
  // entre varias sub-fiduciarias. Esas líneas están en la MISMA analítica y la MISMA
  // cuenta de costo, pero con un asociado DISTINTO al mandante, y entran como crédito.
  // Las acumulamos por concepto para explicar la diferencia como hallazgo (no error duro).
  const otrasFid = {}
  details.forEach((d) => {
    if (d.proj !== tag || asociadoMatch(d.asociado)) return
    const c = ACC2CONCEPT[d.acc]
    if (!c) return
    const credito = (d.haber || 0) - (d.debe || 0)
    if (credito <= 0) return
    const o = otrasFid[c] || (otrasFid[c] = { monto: 0, asociados: new Set() })
    o.monto += credito
    o.asociados.add(d.asociado)
  })

  // A) Importes por concepto (incluye faltantes)
  Object.keys(mandato.vals || {}).forEach((c) => {
    const mv = mandato.vals[c] || 0
    const av = Math.round((sums[c] || 0) * 100) / 100
    const o = otrasFid[c]
    const gap = mv - av
    if (av === 0 && mv > 0 && o && Math.abs(gap - o.monto) <= TOL)
      // Todo el concepto quedó en otra(s) fiduciaria(s) sobre la misma planta.
      flags.push({ lvl: 'warn', code: 'REPARTO', txt: `${CONCEPTS[c]}: mandato ${fmt(mv)} no aparece para este mandante, pero sí ${fmt(o.monto)} en otra(s) fiduciaria(s) [${[...o.asociados].join(', ')}] sobre la misma planta. Revisar reparto con contabilidad.` })
    else if (av === 0 && mv > 0)
      flags.push({ lvl: 'bad', code: 'FALTANTE', txt: `${CONCEPTS[c]}: en el mandato (${fmt(mv)}) pero no aparece en el asiento para este mandante/proyecto.` })
    else if (Math.abs(mv - av) > TOL && o && gap > TOL && Math.abs(gap - o.monto) <= TOL)
      // El asiento del mandante cubre su parte; el resto está en otra(s) fiduciaria(s)
      // de la MISMA planta. No es error duro: hallazgo para revisión.
      flags.push({ lvl: 'warn', code: 'REPARTO', txt: `${CONCEPTS[c]}: mandato ${fmt(mv)} = asiento ${fmt(av)} (mandante) + ${fmt(o.monto)} en otra(s) fiduciaria(s) [${[...o.asociados].join(', ')}] sobre la misma planta. Revisar reparto con contabilidad.` })
    else if (Math.abs(mv - av) > TOL)
      flags.push({ lvl: 'bad', code: 'DIFERENCIA', txt: `${CONCEPTS[c]}: mandato ${fmt(mv)} vs. asiento ${fmt(av)} · diferencia ${fmt(Math.abs(mv - av))}.` })
    else
      flags.push({ lvl: 'ok', code: 'OK', txt: `${CONCEPTS[c]}: ${fmt(mv)} — coincide.` })
  })

  // B) Conceptos en el asiento que el mandato no lista (sobrantes)
  Object.keys(sums).forEach((c) => {
    if (!(c in (mandato.vals || {})) && sums[c] > TOL)
      flags.push({ lvl: 'warn', code: 'SOBRANTE', txt: `${CONCEPTS[c]}: ${fmt(sums[c])} registrado en el asiento pero no listado en el mandato.` })
  })

  // C) Cuenta equivocada
  wrongAcc.forEach((d) => {
    flags.push({ lvl: 'bad', code: 'CUENTA', txt: `Posible cuenta equivocada: ${fmt(d.debe)} en cuenta ${d.acc} (${NON_COST_ACCOUNTS[d.acc]}), que no es de costo de mandato.` })
  })

  // D) Total declarado vs. suma de costos
  if (mandato.total != null) {
    const sumConc = Object.values(sums).reduce((a, b) => a + b, 0)
    if (Math.abs(sumConc - mandato.total) > TOL)
      flags.push({ lvl: 'warn', code: 'TOTAL', txt: `Total: "valor a pagar" del mandato ${fmt(mandato.total)} vs. suma de costos ${fmt(Math.round(sumConc))}.` })
  }

  const status = flags.some((f) => f.lvl === 'bad') ? 'bad' : flags.some((f) => f.lvl === 'warn') ? 'warn' : 'ok'
  return { status, flags, sums, lines }
}

// ===================== INGRESOS (energía) =====================
//
// El soporte de INGRESOS de Odoo trae la planta dentro de la columna ETIQUETA
// (la columna ANALÍTICA viene vacía en estos exports), con la forma:
//
//   "<CONCEPTO> [CLASIF] <PLANTA> <MES> <AÑO> <comercializador>"
//
//   CONCEPTO ∈ {INGRESO BRUTO, COMERCIALIZACIÓN, DESPACHO, VENTAS/COMPRAS EN
//   BOLSA, REDISTRIBUCIÓN DE INGRESOS…}; CLASIF ∈ {BIAC, UNGC, PPA} (solo aparece
//   en las líneas de INGRESO BRUTO, no en las demás → hay que quitarlo para que
//   todas las líneas de una planta agrupen igual).
//
// El "Valor a Pagar" del PDF (Ingreso Bruto/Despacho − Comercialización ± Bolsa
// + Redistribución) queda como NETO (débito − crédito) de la cuenta 28150505
// (INGRESO DE ENERGÍA) por inversionista + planta. Las demás cuentas del grupo
// 2815 son contra-asientos que se anulan (28151001/28151005) o del comercializador
// (28150501 GANANCIAS POR PARTICIPACIÓN), por eso NO se suman. Verificado contra
// PDFs reales: RODRIGUEZ/Uruaco 3.439.314 · SUNO/Uruaco 3.655.103 · GD NAOS1
// 58.469.697. (Plantas que sólo operan en bolsa —Baraya, El Son— no tienen línea
// de Despacho en este soporte y quedarán como DIFERENCIA: es un faltante del dato).

/** Prefijo de cuenta cuyo neto (débito − crédito) equivale al valor a pagar. */
export const INGRESO_ACC_PREFIX = '28150505'

const MESES_RE = /\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b.*$/
const CONCEPTO_RE = /^(INGRESO BRUTO|COMERCIALIZACION|DESPACHO|VENTAS EN BOLSA|COMPRAS EN BOLSA|REDISTRIBUCION DE INGRESOS DE ACUERDO AL PROTOCOLO|REDISTRIBUCION)\s+/
const CLASIF_RE = /^(BIAC|UNGC|PPA)\s+/

/**
 * Nombre de planta normalizado a partir de la columna ETIQUETA. Quita el
 * concepto inicial, el clasificador (BIAC/UNGC/PPA) y todo lo que va desde el
 * mes en adelante, de modo que TODAS las líneas de una misma planta produzcan
 * la misma clave de agrupación.
 */
export function plantaDesdeEtiqueta(etiqueta) {
  let p = norm(etiqueta)            // mayúsculas, sin tildes, sólo [A-Z0-9 ]
  p = p.replace(MESES_RE, '').trim() // corta "MES AÑO comercializador…"
  p = p.replace(CONCEPTO_RE, '')     // quita el concepto inicial
  p = p.replace(CLASIF_RE, '')       // quita BIAC/UNGC/PPA
  return p.trim()
}

/**
 * Tokens distintivos de una planta. Igual que projectTokens pero CONSERVANDO los
 * números: NAOS 1/2/3, POLARIS 1/2 y VALENCIA ORIENTE 1/2 sólo se distinguen por
 * el dígito, que projectTokens descarta por longitud.
 */
export const plantaTokens = (s) =>
  norm(s).split(' ').filter((t) => (t.length > 2 && !FILLER.has(t)) || /^\d+$/.test(t))

/**
 * Agrupa el soporte de INGRESOS por (asociado, planta) sumando el neto
 * (débito − crédito) de la cuenta de ingreso. Reutiliza parseAsientos para
 * detectar columnas de forma robusta.
 * @param {Array<Array>} rows  Filas del Excel incluida cabecera (sheet_to_json {header:1}).
 * @param {string} accPrefix   Prefijo de cuenta a sumar (def. 28150505).
 * @returns {Array<{asociado, planta, valor_contabilidad}>}  valor_contabilidad<0 = a pagar.
 */
export function parseIngresos(rows, accPrefix = INGRESO_ACC_PREFIX) {
  const { details } = parseAsientos(rows)
  const map = new Map()
  for (const d of details) {
    if (!d.acc || !d.acc.startsWith(accPrefix)) continue
    const planta = plantaDesdeEtiqueta(d.etiqueta || d.proj)
    if (!planta || !d.asociado) continue
    const key = norm(d.asociado) + '|||' + planta
    const cur = map.get(key) || { asociado: d.asociado, planta, valor_contabilidad: 0 }
    cur.valor_contabilidad += d.debe - d.haber
    map.set(key, cur)
  }
  return [...map.values()].filter((g) => Math.abs(g.valor_contabilidad) > 1)
}

/**
 * Empareja un mandato (PDF) con un grupo contable de ingresos con el mismo
 * criterio robusto de costos: el asociado debe contener TODAS las palabras
 * distintivas del mandante (palabra completa, evita STRADA⊂ESTRADA) y la planta
 * se elige por mejor score de tokens compartidos (incluyendo números).
 * @param {{mandante?:string, projName?:string}} mandato
 * @param {Array} grupos  Salida de parseIngresos().
 * @returns {object|null} El grupo contable emparejado, o null.
 */
export function matchIngresoContab(mandato, grupos) {
  const mandTok = [...nameTokenSet(mandato.mandante || '')]
  const ptk = plantaTokens(mandato.projName || '')
  if (!ptk.length) return null
  let best = null, bestSc = 0
  for (const g of grupos) {
    // Asociado: todas las palabras distintivas del mandante presentes (si las hay)
    if (mandTok.length) {
      const aset = nameTokenSet(g.asociado)
      if (!mandTok.every((t) => aset.has(t))) continue
    }
    // Planta: score por tokens compartidos (incluye dígitos)
    const gtk = new Set(plantaTokens(g.planta))
    if (!gtk.size) continue
    let sc = ptk.filter((t) => gtk.has(t)).length
    if (!sc) continue
    if (ptk.every((t) => gtk.has(t))) sc += 0.5  // bonus: todos los tokens del PDF presentes
    if (sc > bestSc) { bestSc = sc; best = g }
  }
  return best
}
