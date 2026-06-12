import * as XLSX from 'xlsx'

const FILE_PATTERNS = {
  garantia: /garanti[aá]\s*semanal\s*mensual/i,
  saldo: /saldo\s*cuenta\s*custodia/i,
  web: /web[\s_-]*garant(i[ea]s?)/i,
}

export function identifyFiles(files) {
  const result = { garantia: null, saldo: null, web: null, errors: [] }
  for (const file of files) {
    const name = file.name
    if (FILE_PATTERNS.garantia.test(name)) {
      result.garantia = file
    } else if (FILE_PATTERNS.saldo.test(name)) {
      result.saldo = file
    } else if (FILE_PATTERNS.web.test(name)) {
      result.web = file
    } else {
      result.errors.push(`Archivo no reconocido: "${name}"`)
    }
  }
  if (!result.garantia) result.errors.push('Falta el archivo Garantía Semanal Mensual')
  if (!result.saldo) result.errors.push('Falta el archivo Saldo Cuenta Custodia')
  if (!result.web) result.errors.push('Falta el archivo WEB Garantías')
  return result
}

async function readWorkbook(file) {
  const buffer = await file.arrayBuffer()
  return XLSX.read(buffer, { type: 'array' })
}

function sheetToRows(wb, sheetName) {
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada en ${wb.SheetNames.join(', ')}`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
}

const HEADER_ROW = 8
const DATA_START = 9

function sheetRows(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
}

function findSheetByPattern(wb, pattern) {
  const name = wb.SheetNames.find((n) => pattern.test(n))
  return wb.Sheets[name] || wb.Sheets[wb.SheetNames[0]]
}

// Normaliza acentos (compuestos o descompuestos) y mayúsculas para comparar nombres de hoja.
function normSheet(s) {
  return String(s).normalize('NFC').toUpperCase()
    .replace(/[ÁÀÂÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E').replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[ÓÒÔÖ]/g, 'O').replace(/[ÚÙÛÜ]/g, 'U').trim()
}

function findSheetByName(wb, target) {
  const t = normSheet(target)
  const found =
    wb.SheetNames.find((n) => normSheet(n) === t) ||
    wb.SheetNames.find((n) => normSheet(n).includes(t))
  return found ? wb.Sheets[found] : null
}

// Las celdas numéricas de Excel ya vienen como Number; null-safe.
function num(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function parseGarantiaSheet(wb) {
  const ws = findSheetByPattern(wb, /dep[oó]sito\s*sem/i)
  const rows = sheetRows(ws)
  const header = rows[HEADER_ROW] || []

  const adjColNames = []
  const adjCols = []
  for (let c = 3; c < header.length; c++) {
    const name = String(header[c] ?? '').trim()
    if (name) { adjCols.push({ idx: c, name }); adjColNames.push(name) }
  }

  const agents = {}
  let totalRowIdx = -1
  for (let i = DATA_START; i < rows.length; i++) {
    const row = rows[i]
    const c0 = String(row?.[0] ?? '').trim()
    if (c0.toUpperCase() === 'TOTAL') { totalRowIdx = i; break }
    if (!row) continue
    if (c0 === 'UNGC' || c0 === 'UNGG') {
      const vals = {}
      for (const { idx, name } of adjCols) vals[name] = num(row[idx]) ?? 0
      agents[c0] = vals
    }
  }

  const precios = { pb: null, restricciones: null, stn: null, trm: null, ptb: null }
  if (totalRowIdx !== -1) {
    for (let i = totalRowIdx; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const label = String(row[1] ?? '').trim()
      const val = num(row[2])
      if (/^PB$/i.test(label)) precios.pb = val
      else if (/^Restricciones$/i.test(label)) precios.restricciones = val
      else if (/^STN$/i.test(label)) precios.stn = val
      else if (/^TRM\s*del/i.test(label)) precios.trm = val
      else if (/^PTB$/i.test(label)) precios.ptb = val
    }
  }
  return { adjColNames, agents, precios }
}

function parseWebTie(wb) {
  // Hoja DEPÓSITO (verificado con archivo real): encabezados en fila 10, datos desde fila 11.
  // Código en columna 0, valor "Valor a Pagar de TIES" en columna 3.
  const ws = findSheetByName(wb, 'DEPÓSITO') || wb.Sheets[wb.SheetNames[0]]
  const rows = sheetRows(ws)
  const tie = {}
  for (let i = 11; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const code = String(row[0] ?? '').trim()
    if (code === 'UNGC' || code === 'UNGG') tie[code] = num(row[3]) ?? 0
  }
  return tie
}

function parseCustodia(wb) {
  const ws = findSheetByName(wb, 'WebBalancePubrdl') || wb.Sheets[wb.SheetNames[0]]
  const rows = sheetRows(ws)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    if (String(row[1] ?? '').trim() === '3050200006371') {
      return {
        disponible: num(row[9]) ?? 0,
        congelado: (num(row[3]) ?? 0) + (num(row[4]) ?? 0),
        saldo: num(row[2]) ?? 0,
        transferencias: num(row[7]) ?? 0,
      }
    }
  }
  return null
}

function buildBlock(adjColNames, agentVals, tieVal) {
  const rows = adjColNames.map((name) => ({ label: name, valor: agentVals ? (agentVals[name] ?? 0) : 0 }))
  rows.push({ label: 'TIE', valor: tieVal ?? 0 })
  const total = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0)
  return { rows, total }
}

export async function parseSemanales(garantiaFile, saldoFile, webFile) {
  const errors = []
  let gWb, sWb, wWb
  try { gWb = await readWorkbook(garantiaFile) } catch (e) { errors.push(`Error leyendo Garantía: ${e.message}`) }
  try { sWb = await readWorkbook(saldoFile) } catch (e) { errors.push(`Error leyendo Saldo: ${e.message}`) }
  try { wWb = await readWorkbook(webFile) } catch (e) { errors.push(`Error leyendo WEB: ${e.message}`) }

  if (!gWb) {
    return { ungc: [], ungg: [], custodia: null, precios: {}, totalUNGC: 0, totalUNGG: 0, totalConsignar: 0, fechaNombre: '', errors }
  }

  const { adjColNames, agents, precios } = parseGarantiaSheet(gWb)
  const tie = wWb ? parseWebTie(wWb) : {}
  if (!agents.UNGC) errors.push('No se encontró la fila UNGC en Garantía (se muestra en $0)')
  if (!agents.UNGG) errors.push('No se encontró la fila UNGG en Garantía')

  const blkUNGC = buildBlock(adjColNames, agents.UNGC, tie.UNGC)
  const blkUNGG = buildBlock(adjColNames, agents.UNGG, tie.UNGG)

  let custodia = null
  if (sWb) {
    custodia = parseCustodia(sWb)
    if (!custodia) errors.push('No se encontró la cuenta 3050200006371 en Saldo Cuenta Custodia')
  }

  const totalUNGC = blkUNGC.total
  const totalUNGG = blkUNGG.total
  const totalConsignar = totalUNGC + totalUNGG
  const fechaNombre = garantiaFile.name.replace(/\.[^.]+$/, '')

  return {
    ungc: blkUNGC.rows, ungg: blkUNGG.rows,
    custodia, precios,
    totalUNGC, totalUNGG, totalConsignar,
    fechaNombre, errors,
  }
}

const MESES_TXR = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11 }
const txt = (s) => String(s ?? '').normalize('NFC').trim()
const isTotalAjuste = (s) => /^total\s*ajuste$/i.test(txt(s))

// Detecta la hoja de datos por contenido: la fila cuyo primer encabezado es CÓDIGO
// y que contiene una columna "Total Ajuste". Devuelve { name, headerRowIdx, rows }.
function findTxrSheet(wb) {
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null })
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const row = rows[i]
      if (!row) continue
      if (normSheet(row[0]) !== 'CODIGO') continue
      if (row.some((c) => isTotalAjuste(c))) return { name, headerRowIdx: i, rows }
    }
  }
  return null
}

// Busca "FECHA DE VENCIMIENTO: DD DE MMM DE YYYY" en cualquier celda del libro → ISO.
function findVencimiento(wb) {
  const re = /FECHA DE VENCIMIENTO:\s*(\d{1,2})\s+DE\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+DE\s+(\d{4})/i
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null })
    for (const row of rows) {
      if (!row) continue
      for (const cell of row) {
        const m = String(cell ?? '').match(re)
        if (!m) continue
        const mes = MESES_TXR[m[2].toLowerCase().slice(0, 3)]
        if (mes == null) continue
        const z = (n) => String(n).padStart(2, '0')
        return `${m[3]}-${z(mes + 1)}-${z(parseInt(m[1], 10))}`
      }
    }
  }
  return null
}

export async function parseTxr(file) {
  const errors = []
  let wb
  try {
    wb = await readWorkbook(file)
  } catch (e) {
    errors.push(`Error leyendo archivo TXR/Mensual: ${e.message}`)
    return { rows: [], headers: [], totalAjuste: 0, fechaVencimiento: null, errors }
  }

  const found = findTxrSheet(wb)
  if (!found) {
    errors.push(`No se encontró una hoja con encabezados esperados (CÓDIGO + "Total Ajuste"). Hojas en el archivo: ${wb.SheetNames.join(', ')}`)
    return { rows: [], headers: [], totalAjuste: 0, fechaVencimiento: findVencimiento(wb), errors }
  }

  const { rows, headerRowIdx } = found
  const rawHeaders = (rows[headerRowIdx] || []).map((h) => txt(h))
  const codigoIdx = rawHeaders.findIndex((h) => normSheet(h) === 'CODIGO')
  const ajusteHeader = rawHeaders.find((h) => isTotalAjuste(h))

  // Filas UNGC / UNGG por columna CÓDIGO; mapear todas las columnas por nombre.
  const dataRows = []
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const cod = normSheet(row[codigoIdx])
    if (cod === 'UNGC' || cod === 'UNGG') {
      const obj = {}
      rawHeaders.forEach((h, idx) => { if (h) obj[h] = row[idx] ?? null })
      dataRows.push(obj)
    }
  }

  if (!dataRows.length) errors.push('No se encontraron filas con código UNGC o UNGG')

  // Monto a consignar = Total Ajuste de UNGG.
  const ungg = dataRows.find((r) => normSheet(r[rawHeaders[codigoIdx]]) === 'UNGG')
  const totalRaw = ungg && ajusteHeader ? ungg[ajusteHeader] : null
  const totalAjuste = totalRaw != null && !isNaN(parseFloat(totalRaw)) ? parseFloat(totalRaw) : 0

  return { rows: dataRows, headers: rawHeaders.filter(Boolean), totalAjuste, fechaVencimiento: findVencimiento(wb), errors }
}

// ---------- Mensual (distinto al TXR) ----------

const empiezaGarantia = (s) => /^garant[ií]a/i.test(txt(s))

// Hoja de detalle: CÓDIGO en col 0 + columna que empiece con GARANTIA. Entre varias
// candidatas (hay una hoja resumen con solo CÓDIGO+GARANTIA), usar la de más columnas.
function findMensualSheet(wb) {
  const candidates = []
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null })
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const row = rows[i]
      if (!row) continue
      if (normSheet(row[0]) !== 'CODIGO') continue
      if (row.some((c) => empiezaGarantia(c))) {
        candidates.push({ name, headerRowIdx: i, rows, ncols: row.filter((c) => txt(c)).length })
        break
      }
    }
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.ncols - a.ncols)
  return candidates[0]
}

// "Fecha límite de presentación: DD DE MM DE YYYY" (mes numérico). Respaldo: FECHA DE VENCIMIENTO (texto).
function findFechaLimite(wb) {
  const re = /Fecha l[ií]mite de presentaci[oó]n:\s*(\d{1,2})\s+DE\s+(\d{1,2})\s+DE\s+(\d{4})/i
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null })
    for (const row of rows) {
      if (!row) continue
      for (const cell of row) {
        const m = String(cell ?? '').match(re)
        if (!m) continue
        const z = (n) => String(n).padStart(2, '0')
        return `${m[3]}-${z(parseInt(m[2], 10))}-${z(parseInt(m[1], 10))}`
      }
    }
  }
  return findVencimiento(wb)
}

// Mes del reporte desde el título "Garantías mensuales YYYY-MM".
function findMesReporte(wb) {
  const re = /Garant[ií]as mensuales\s+(\d{4})-(\d{1,2})/i
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null })
    for (const row of rows) {
      if (!row) continue
      for (const cell of row) {
        const m = String(cell ?? '').match(re)
        if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}`
      }
    }
  }
  return null
}

export async function parseMensual(file) {
  const errors = []
  let wb
  try {
    wb = await readWorkbook(file)
  } catch (e) {
    errors.push(`Error leyendo archivo Mensual: ${e.message}`)
    return { rows: [], headers: [], monto: 0, garantiaUNGC: 0, garantiaUNGG: 0, noConsigna: false, fechaVencimiento: null, mesReporte: null, errors }
  }

  const found = findMensualSheet(wb)
  if (!found) {
    errors.push(`No se encontró una hoja con encabezados esperados (CÓDIGO + columna GARANTIA). Hojas en el archivo: ${wb.SheetNames.join(', ')}`)
    return { rows: [], headers: [], monto: 0, garantiaUNGC: 0, garantiaUNGG: 0, noConsigna: false, fechaVencimiento: findFechaLimite(wb), mesReporte: findMesReporte(wb), errors }
  }

  const { rows, headerRowIdx } = found
  const rawHeaders = (rows[headerRowIdx] || []).map((h) => txt(h))
  const codigoIdx = rawHeaders.findIndex((h) => normSheet(h) === 'CODIGO')
  const garantiaHeader = rawHeaders.find((h) => empiezaGarantia(h))

  const dataRows = []
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const cod = normSheet(row[codigoIdx])
    if (cod === 'UNGC' || cod === 'UNGG') {
      const obj = {}
      rawHeaders.forEach((h, idx) => { if (h) obj[h] = row[idx] ?? null })
      dataRows.push(obj)
    }
  }
  if (!dataRows.length) errors.push('No se encontraron filas con código UNGC o UNGG')

  const codHeader = rawHeaders[codigoIdx]
  const valGarantia = (cod) => {
    const r = dataRows.find((x) => normSheet(x[codHeader]) === cod)
    return r && garantiaHeader ? (num(r[garantiaHeader]) ?? 0) : 0
  }
  const garantiaUNGG = valGarantia('UNGG')
  const garantiaUNGC = valGarantia('UNGC')
  const monto = garantiaUNGG || garantiaUNGC
  const noConsigna = garantiaUNGG === 0 && garantiaUNGC === 0

  return {
    rows: dataRows,
    headers: rawHeaders.filter(Boolean),
    monto, garantiaUNGC, garantiaUNGG, noConsigna,
    fechaVencimiento: findFechaLimite(wb),
    mesReporte: findMesReporte(wb),
    errors,
  }
}
