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

export async function parseTxr(file) {
  const errors = []
  let rows
  try {
    const wb = await readWorkbook(file)
    rows = sheetToRows(wb, 'Ajuste')
  } catch (e) {
    errors.push(`Error leyendo archivo TXR/Mensual: ${e.message}`)
    return { rows: [], totalAjuste: 0, errors }
  }

  if (!rows.length) {
    errors.push('La hoja "Ajuste" está vacía')
    return { rows: [], totalAjuste: 0, errors }
  }

  // First row = headers
  const headers = (rows[0] || []).map((h) => String(h ?? '').trim())
  const codigoIdx = headers.indexOf('CÓDIGO')
  const ajusteIdx = headers.indexOf('Total Ajuste')

  if (codigoIdx === -1) {
    errors.push('Columna "CÓDIGO" no encontrada en hoja Ajuste')
    return { rows: [], totalAjuste: 0, errors }
  }

  if (ajusteIdx === -1) {
    errors.push('Columna "Total Ajuste" no encontrada en hoja Ajuste')
  }

  // Filter rows where CÓDIGO === UNGC or UNGG
  const dataRows = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const cod = String(row[codigoIdx] ?? '').trim()
    if (cod === 'UNGC' || cod === 'UNGG') {
      const obj = {}
      headers.forEach((h, idx) => {
        obj[h] = row[idx] ?? null
      })
      dataRows.push(obj)
    }
  }

  if (!dataRows.length) {
    errors.push('No se encontraron filas con código UNGC o UNGG en hoja Ajuste')
  }

  const totalAjuste = dataRows.reduce((s, r) => {
    const v = r['Total Ajuste']
    return s + (v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : 0)
  }, 0)

  return { rows: dataRows, totalAjuste, errors }
}
