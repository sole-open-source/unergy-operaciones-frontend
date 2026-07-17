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
  // Póliza todo riesgo y lucrocesante (antes sin mapear: el verificador la
  // ignoraba tanto en el asiento como en el mandato).
  '28151004': 'poliza',   '28151007': 'iva_poliza',
  // Servicios públicos - consumo de energía (sin cuenta de IVA separada; la
  // contrapartida en Haber —p. ej. "23355001 SERV DE ENERGIA"— no es un costo
  // adicional, es solo el otro lado del asiento).
  '28151008': 'serv_pub',
  // Administración de proyectos (costos para terceros).
  '28151020': 'admin',    '28151021': 'iva_admin',
}

/** Concepto -> etiqueta legible. */
export const CONCEPTS = {
  mant: 'Mantenimiento', iva_mant: 'IVA mantenimiento',
  int: 'Servicio de internet', iva_int: 'IVA internet',
  arr: 'Arriendo', iva_arr: 'IVA arriendo',
  poliza: 'Póliza todo riesgo y lucrocesante', iva_poliza: 'IVA póliza',
  serv_pub: 'Servicios públicos - consumo de energía',
  admin: 'Administración', iva_admin: 'IVA administración',
  // Sub-tipos de arriendo cuando el proyecto factura por separado (ej. La
  // Reserva). Si el proyecto no divide el arriendo, todo sigue cayendo en el
  // concepto genérico 'arr'.
  arr_cc: 'Arriendo Cuenta de Cobro', arr_fact: 'Arriendo Factura Electrónica',
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

/**
 * Expande abreviaturas comunes ANTES de tokenizar. En algunas filas el campo
 * "Asociado" del asiento abrevia el mandante con "PA" (Patrimonio Autónomo) en
 * vez del nombre completo "PATRIMONIOS AUTONOMOS..." (ej. "FIDUCIARIA BANCOLOMBIA
 * PA NESTLE 18254"). Como "PA" tiene solo 2 letras se descartaba por el filtro de
 * longitud y nunca calzaba con "PATRIMONIOS"/"AUTONOMOS" del mandato → el mandato
 * se reportaba como "no aparece registrado" aunque sí estaba, con otro texto.
 */
export const expandirAbreviaturas = (s) => norm(s).replace(/\bPA\b/g, 'PATRIMONIOS AUTONOMOS')

/** Conjunto de tokens distintivos de un nombre de empresa/persona (palabra completa). */
export const nameTokenSet = (s) => new Set(expandirAbreviaturas(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w)))

/**
 * ¿El asociado del asiento corresponde al mandante del PDF? Coincide si los tokens
 * distintivos de uno son SUBCONJUNTO de los del otro (con intersección no vacía). El
 * asiento suele abreviar el nombre corporativo del PA omitiendo las palabras genéricas
 * — p. ej. "PA 17844 SOL DE LA SIERRA" vs. el mandante completo "PATRIMONIOS AUTONOMOS
 * FIDUCIARIA BANCOLOMBIA ... 17844 SOL DE LA SIERRA": comparten el código de portafolio
 * (17844) + fondo, pero el asiento no trae FIDUCIARIA/BANCOLOMBIA. Exigir TODOS los
 * tokens del mandante fallaba (0 líneas / sin match). Distingue fondos distintos por su
 * token distintivo (17844 vs 18254) y NO reintroduce STRADA⊂ESTRADA (por palabra
 * completa no comparten tokens). Usado por reconciliar (costos) y matchIngresoContab.
 * @param {string[]} mandTok  Tokens del mandante (nameTokenSet del mandato).
 * @param {string} aso        Asociado del asiento.
 */
export const asociadoCoincideMandante = (mandTok, aso) => {
  const aset = nameTokenSet(aso)
  if (!mandTok.length || !aset.size) return false
  let inter = 0
  for (const t of mandTok) if (aset.has(t)) inter++
  return inter > 0 && (inter === mandTok.length || inter === aset.size)
}

/**
 * Normaliza un string monetario a "cuerpo numérico" y signo: quita $, espacios,
 * y detecta negativo por signo menos o paréntesis contables "(1.234)".
 * @returns {{body: string, neg: boolean} | null}  null si queda vacío.
 */
const stripMoney = (s) => {
  if (s == null) return null
  if (typeof s === 'number') return { body: String(s), neg: false, isNumber: true, value: s }
  let t = s.toString().trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!t) return null
  const neg = /^-/.test(t) || /^\(.*\)$/.test(t)
  t = t.replace(/[()]/g, '').replace(/^-/, '')
  if (!t) return null
  return { body: t, neg }
}

/**
 * Normaliza una CIFRA a Number, detectando automáticamente si la coma/punto es
 * separador de miles o decimal. Es la ÚNICA función de parseo numérico; sirve
 * para AMBAS fuentes, sin necesidad de saber de cuál viene el dato:
 *   - Mandato (PDF), formato US: coma=miles, punto=decimal  ("2,011.51" → 2011.51)
 *   - Asiento (Excel), formato CO: punto=miles, coma=decimal ("2.011,51" → 2011.51)
 *
 * Reglas de detección:
 *   1. Si ya es número, se devuelve tal cual (así llegan las celdas del xlsx).
 *   2. Se quitan $ y espacios; negativo por signo "-" o paréntesis contable "(1.234)".
 *   3. Si hay coma Y punto: el ÚLTIMO en aparecer es el DECIMAL; el otro, miles.
 *      ("1,234.56"→1234.56 US · "1.234,56"→1234.56 CO)
 *   4. Si hay un solo tipo de separador:
 *        - aparece varias veces           → miles   ("1.234.567" / "1,234,567" → 1234567)
 *        - una vez con EXACTAMENTE 3 dígitos detrás → miles ("497,333"→497333 · "129.413"→129413)
 *        - una vez con ≠3 dígitos detrás   → decimal ("0,50"→0.5 · "12.5"→12.5)
 *
 * La regla 4 asume el dominio (pesos colombianos): NO hay importes con 3 decimales
 * —los decimales son de 2 (,00 / .51)— por eso "X,YYY"/"X.YYY" con 3 dígitos son
 * siempre miles. Maneja vacío/null → 0.
 */
export const normalizarCifra = (s) => {
  const p = stripMoney(s)
  if (!p) return 0
  if (p.isNumber) return p.value
  const body = p.body                          // solo dígitos y separadores , .
  const hasComma = body.includes(',')
  const hasDot = body.includes('.')
  let t
  if (hasComma && hasDot) {
    // El último separador que aparece es el decimal; el otro es de miles.
    const comaEsDecimal = body.lastIndexOf(',') > body.lastIndexOf('.')
    t = comaEsDecimal
      ? body.replace(/\./g, '').replace(',', '.')  // CO: puntos=miles fuera, coma=decimal
      : body.replace(/,/g, '')                     // US: comas=miles fuera, punto=decimal
  } else if (hasComma || hasDot) {
    const sep = hasComma ? ',' : '.'
    const parts = body.split(sep)
    const unaVez = parts.length === 2
    const decimales = unaVez ? parts[1].length : 0
    // Único separador: decimal solo si aparece una vez y NO tiene 3 dígitos detrás.
    t = (unaVez && decimales !== 3)
      ? body.replace(sep, '.')                      // decimal
      : parts.join('')                             // miles
  } else {
    t = body
  }
  const n = parseFloat(t)
  if (isNaN(n)) return 0
  return p.neg ? -n : n
}

/**
 * @deprecated Usar normalizarCifra. Alias mantenidos para compatibilidad con
 * código/tests que aún los importen; ahora ambos delegan en la función única.
 */
export const parseMandatoNumber = normalizarCifra
export const parseAsientoNumber = normalizarCifra
export const parseNum = normalizarCifra

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
      debe = parseAsientoNumber(r[col.debe])
      haber = parseAsientoNumber(r[col.haber])
    } else if (col.importe !== -1) {
      const imp = parseAsientoNumber(r[col.importe])
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

  // Conceptos: línea "ETIQUETA ... $ valor".
  // El ORDEN importa: las reglas específicas se evalúan antes que las genéricas
  // (label.startsWith), para que "ARRIENDO CUENTA DE COBRO" no caiga en 'arr'.
  const map = [
    ['MANTENIMIENTO', 'mant'], ['IVA MANTENIMIENTO', 'iva_mant'],
    ['SERVICIO DE INTERNET', 'int'], ['IVA INTERNET', 'iva_int'],
    // Variantes específicas de arriendo ANTES del genérico: cuando el proyecto
    // divide el arriendo en dos facturas (ej. La Reserva), se guardan como
    // conceptos separados y cada una se verifica contra su etiqueta del asiento.
    ['ARRIENDO CUENTA DE COBRO', 'arr_cc'], ['ARRIENDO FACTURA', 'arr_fact'],
    ['ARRIENDO', 'arr'], ['IVA ARRIENDO', 'iva_arr'],
    // 'POLIZA' (sin el resto de la frase) para tolerar variaciones de redacción.
    ['POLIZA', 'poliza'], ['IVA POLIZA', 'iva_poliza'],
    // Servicios públicos - consumo de energía (sin IVA separado).
    ['SERVICIOS PUBLICOS', 'serv_pub'],
    // Administración de proyectos.
    ['ADMINISTRACION', 'admin'], ['IVA ADMINISTRACION', 'iva_admin'],
  ]
  const vals = {}; let total = null
  text.split('\n').forEach((line) => {
    const m = line.match(/^(.*?)\$\s*([\d.,]+)\s*$/)
    if (!m) return
    const label = norm(m[1]); const v = parseMandatoNumber(m[2])
    if (label.includes('VALOR A PAGAR')) { total = v; return }
    for (const [kw, key] of map) {
      if (label.startsWith(kw) || (kw.startsWith('IVA') && label.includes(kw))) {
        // Evita que "IVA MANTENIMIENTO"/"IVA PÓLIZA"/... caiga en el concepto base.
        if ((key === 'mant' || key === 'int' || key === 'arr' || key === 'poliza' || key === 'admin') && label.includes('IVA')) continue
        // Se ACUMULA (no se sobrescribe) para soportar conceptos que el mandato
        // divide en varias líneas mapeadas al mismo concepto genérico (ej. dos
        // líneas de "arriendo"); antes la segunda pisaba a la primera.
        vals[key] = (vals[key] || 0) + v; return
      }
    }
    // Conceptos de INGRESO (Ingreso Bruto, Arranque y Parada, Energía en Bolsa,
    // Servicios Despacho CND / Admin SIC, I.V.A. SIC, etc.). Disjuntos de los de
    // costos, así que es aditivo. Alimenta la conciliación por concepto de ingresos.
    for (const c of INGRESO_CONCEPTOS) {
      if (c.re.test(label)) { vals[c.key] = (vals[c.key] || 0) + v; return }
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

  // Mandante por PALABRA COMPLETA (fix STRADA/ESTRADA) pero tolerando abreviaturas
  // del PA en el asiento (ver asociadoCoincideMandante).
  const mandTok = [...nameTokenSet(mandato.mandante)]
  const lines = details.filter((d) => d.proj === tag && asociadoCoincideMandante(mandTok, d.asociado))

  // Sumar por concepto el DÉBITO de la cuenta de costo (NUNCA el neto debe − haber).
  // En arriendo el mandante (la fiduciaria) aparece en AMBOS lados del asiento, con el
  // MISMO importe: como débito (el costo) y como crédito (contrapartida/reverso). Netear
  // debe − haber los cancela y el arriendo "desaparece" (queda 0). El costo real es el
  // débito; cada contrato de la planta aporta su débito y se suman todos.
  // (Verificado con el Excel real de mayo, planta [10038] LA ESMERALDA, CMU0996:
  //  5 contratos × 368.513,81 de débito Bancolombia = 1.842.569 = arriendo del mandato.
  //  Los créditos a los arrendadores —p. ej. personas naturales— quedan fuera porque su
  //  asociado no es el mandante y, además, son crédito, no débito.)
  const sums = {}; const wrongAcc = []
  lines.forEach((d) => {
    let c = ACC2CONCEPT[d.acc]
    // Si la cuenta es de arriendo genérico, se afina el concepto según la
    // ETIQUETA del asiento — algunos proyectos (ej. La Reserva) dividen el
    // arriendo en dos facturas que comparten cuenta contable pero se distinguen
    // por la etiqueta: "...CC..." (Cuenta de Cobro) o "...FACT..." (Factura). Si
    // la etiqueta no trae ninguna de las dos, se queda como 'arr' genérico y no
    // rompe los proyectos que no dividen el arriendo.
    if (c === 'arr') {
      const etq = norm(d.etiqueta || '')
      if (/\bCC\b/.test(etq)) c = 'arr_cc'
      else if (/\bFACT\b/.test(etq)) c = 'arr_fact'
    }
    if (c) sums[c] = (sums[c] || 0) + d.debe
    else if (NON_COST_ACCOUNTS[d.acc] && (d.debe - d.haber) > 0) wrongAcc.push(d)
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
const CONCEPTO_RE = /^(INGRESO BRUTO|COMERCIALIZACION|SERVICIOS DESPACHO Y COORDINACION CND|DESPACHO|VENTAS EN BOLSA|COMPRAS EN BOLSA|ENERGIA EN BOLSA|REDISTRIBUCION DE INGRESOS DE ACUERDO AL PROTOCOLO|REDISTRIBUCION|ARRANQUE Y PARADA|SERVICIOS DE ADMINISTRACION SIC|I V A SIC(?: 19)?|CARGO POR CONFIABILIDAD|FAZNI)\s*(?:19\s*)?(?:COP\s*)?(?:GENERADOR|COMERCIALIZADOR)?\s*/
const CLASIF_RE = /^(BIAC|UNGC|UNGG|PPA|TERPEL\s?\d?)\s+/

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
    // Asociado: mismo criterio robusto que costos — tolera que el asiento abrevie el
    // PA (p. ej. "PA 17844 SOL DE LA SIERRA" vs. el mandante completo con FIDUCIARIA
    // BANCOLOMBIA) emparejando por identidad distintiva compartida (código 17844).
    if (mandTok.length && !asociadoCoincideMandante(mandTok, g.asociado)) continue
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

// ===================== INGRESOS: DESGLOSE POR CONCEPTO =====================
//
// El mandato (PDF) de ingresos lista el "Valor a Pagar" como Ingreso Bruto (SUMA)
// menos varios costos (RESTA): Arranque y Parada, Energía en Bolsa, Servicios
// Despacho y Coordinación CND, Servicios de Administración SIC, I.V.A. SIC, etc.
// La contabilidad trae los MISMOS conceptos como líneas del 28150505. Para
// conciliar concepto a concepto (no solo el total) se normaliza cada concepto a
// una clave canónica común a ambas fuentes. `rol` documenta si suma o resta al
// valor a pagar (informativo; el cruce compara magnitudes absolutas por concepto).

/** Conceptos de ingreso reconocidos, en orden de especificidad (el 1º que casa gana). */
export const INGRESO_CONCEPTOS = [
  { key: 'INGRESO BRUTO', rol: 'suma', re: /^INGRESO BRUTO\b/ },
  { key: 'COMERCIALIZACION', rol: 'resta', re: /^COMERCIALIZACION\b/ },
  { key: 'SERVICIOS DESPACHO Y COORDINACION CND', rol: 'resta', re: /^SERVICIOS DESPACHO Y COORDINACION CND\b/ },
  { key: 'DESPACHO', rol: 'resta', re: /^DESPACHO\b/ },
  { key: 'ENERGIA EN BOLSA', rol: 'resta', re: /^ENERGIA EN BOLSA\b/ },
  { key: 'VENTAS EN BOLSA', rol: 'resta', re: /^VENTAS EN BOLSA\b/ },
  { key: 'COMPRAS EN BOLSA', rol: 'resta', re: /^COMPRAS EN BOLSA\b/ },
  { key: 'REDISTRIBUCION', rol: 'resta', re: /^REDISTRIBUCION\b/ },
  { key: 'ARRANQUE Y PARADA', rol: 'resta', re: /^ARRANQUE Y PARADA\b/ },
  { key: 'SERVICIOS DE ADMINISTRACION SIC', rol: 'resta', re: /^SERVICIOS DE ADMINISTRACION SIC\b/ },
  { key: 'I V A SIC', rol: 'resta', re: /^I V A SIC\b/ },
  { key: 'CARGO POR CONFIABILIDAD', rol: 'resta', re: /^CARGO POR CONFIABILIDAD\b/ },
  { key: 'FAZNI', rol: 'resta', re: /^FAZNI\b/ },
]

/** Tolerancia por concepto (pesos) al conciliar mandato vs contabilidad. */
export const TOL_CONCEPTO = 200

/**
 * Clave canónica del concepto a partir de la ETIQUETA del asiento (o del label del
 * PDF ya normalizado). Devuelve null si no reconoce ningún concepto de ingreso.
 */
export function conceptoDesdeEtiqueta(etiqueta) {
  const n = norm(etiqueta)
  for (const c of INGRESO_CONCEPTOS) if (c.re.test(n)) return c.key
  return null
}

/**
 * Agrupa el soporte de INGRESOS por (asociado, planta) devolviendo el neto
 * (débito − crédito) del 28150505 DESGLOSADO POR CONCEPTO. Ignora los contra-
 * asientos (28151001/28151005/…) igual que parseIngresos.
 * @returns {Array<{asociado, planta, conceptos: Object<string,number>}>}
 */
export function parseIngresosPorConcepto(rows, accPrefix = INGRESO_ACC_PREFIX) {
  const { details } = parseAsientos(rows)
  const map = new Map()
  for (const d of details) {
    if (!d.acc || !d.acc.startsWith(accPrefix)) continue
    const planta = plantaDesdeEtiqueta(d.etiqueta || d.proj)
    const concepto = conceptoDesdeEtiqueta(d.etiqueta || d.proj)
    if (!planta || !d.asociado || !concepto) continue
    const key = norm(d.asociado) + '|||' + planta
    const cur = map.get(key) || { asociado: d.asociado, planta, conceptos: {} }
    cur.conceptos[concepto] = (cur.conceptos[concepto] || 0) + (d.debe - d.haber)
    map.set(key, cur)
  }
  return [...map.values()]
}

/**
 * Cruza los conceptos del mandato (PDF) contra los de la contabilidad, concepto a
 * concepto. Compara MAGNITUDES absolutas con tolerancia. Marca cada concepto como
 * OK, DIFERENCIA, FALTA_CONTAB (en el PDF pero no en el asiento) o SOBRA_CONTAB
 * (en el asiento pero no en el PDF).
 * @param {Object<string,number>} valsPdf         Conceptos del PDF (magnitudes, de extractMandate.vals).
 * @param {Object<string,number>} conceptosContab Netos por concepto (de parseIngresosPorConcepto).
 * @returns {Array<{concepto, rol, pdf, contab, dif, estado}>}
 */
export function matchIngresoConceptos(valsPdf = {}, conceptosContab = {}, tol = TOL_CONCEPTO) {
  return INGRESO_CONCEPTOS
    .filter((c) => valsPdf[c.key] !== undefined || conceptosContab[c.key] !== undefined)
    .map((c) => {
      const pdf = valsPdf[c.key] !== undefined ? valsPdf[c.key] : null
      const contab = conceptosContab[c.key] !== undefined ? Math.abs(conceptosContab[c.key]) : null
      let estado
      if (pdf === null) estado = 'SOBRA_CONTAB'
      else if (contab === null) estado = 'FALTA_CONTAB'
      else estado = Math.abs(pdf - contab) <= tol ? 'OK' : 'DIFERENCIA'
      return { concepto: c.key, rol: c.rol, pdf, contab, dif: (pdf !== null && contab !== null) ? Math.round(pdf - contab) : null, estado }
    })
}
