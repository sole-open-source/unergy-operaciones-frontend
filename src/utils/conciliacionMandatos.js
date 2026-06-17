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
const nameTokenSet = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)))

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

  // Sumar por concepto (débito = costo cargado al mandante) + detectar cuenta equivocada
  const sums = {}; const wrongAcc = []
  lines.forEach((d) => {
    const c = ACC2CONCEPT[d.acc]
    if (c) sums[c] = (sums[c] || 0) + d.debe
    else if (NON_COST_ACCOUNTS[d.acc] && d.debe > 0) wrongAcc.push(d)
  })

  // A) Importes por concepto (incluye faltantes)
  Object.keys(mandato.vals || {}).forEach((c) => {
    const mv = mandato.vals[c] || 0
    const av = Math.round((sums[c] || 0) * 100) / 100
    if (av === 0 && mv > 0)
      flags.push({ lvl: 'bad', code: 'FALTANTE', txt: `${CONCEPTS[c]}: en el mandato (${fmt(mv)}) pero no aparece en el asiento para este mandante/proyecto.` })
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
