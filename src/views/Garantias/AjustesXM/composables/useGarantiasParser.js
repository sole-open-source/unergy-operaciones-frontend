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

function firstSheet(wb) {
  return sheetToRows(wb, wb.SheetNames[0])
}

function extractBloque(rows, codigo) {
  // Find the start row where col A === codigo
  // Collect next 8 rows (7 days + 1 sum/TIE row)
  const bloque = []
  let found = false
  let count = 0
  for (let i = 9; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    if (!found && row[0] === codigo) {
      found = true
    }
    if (found) {
      bloque.push({ label: row[1] ?? `Día ${count + 1}`, valor: row[2] })
      count++
      if (count >= 8) break
    }
  }
  return bloque
}

function extractPrecios(rows) {
  // Search for price labels in the first sheet
  const labels = { pb: ['PB'], restricciones: ['Restricciones'], stn: ['STN'], trm: ['TRM'], ptb: ['PTB'] }
  const precios = { pb: null, restricciones: null, stn: null, trm: null, ptb: null }
  for (const row of rows) {
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim()
      for (const [key, names] of Object.entries(labels)) {
        if (names.includes(cell)) {
          // Value is in adjacent cell (c+1 or c-1)
          const next = row[c + 1]
          if (next != null && !isNaN(parseFloat(next))) {
            precios[key] = parseFloat(next)
          }
        }
      }
    }
  }
  return precios
}

export async function parseSemanales(garantiaFile, saldoFile, webFile) {
  const errors = []

  let garantiaRows, saldoRows, webRows
  try {
    const wb = await readWorkbook(garantiaFile)
    garantiaRows = firstSheet(wb)
  } catch (e) {
    errors.push(`Error leyendo Garantía: ${e.message}`)
    return { ungc: [], ungg: [], custodia: {}, precios: {}, totalUNGC: 0, totalUNGG: 0, totalConsignar: 0, fechaNombre: '', errors }
  }

  try {
    const wb = await readWorkbook(saldoFile)
    saldoRows = firstSheet(wb)
  } catch (e) {
    errors.push(`Error leyendo Saldo: ${e.message}`)
  }

  try {
    const wb = await readWorkbook(webFile)
    const ws = wb.Sheets['Depósito']
    if (!ws) {
      errors.push('Hoja "Depósito" no encontrada en WEB Garantías')
      webRows = []
    } else {
      webRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    }
  } catch (e) {
    errors.push(`Error leyendo WEB: ${e.message}`)
    webRows = []
  }

  // Extract UNGC and UNGG blocks from Garantía
  const ungc = extractBloque(garantiaRows, 'UNGC')
  const ungg = extractBloque(garantiaRows, 'UNGG')

  // Override last row of each block with TIE value from WEB Garantías
  // WEB: sheet 'Depósito', data from row idx 10, col B (idx 1) = code, col E (idx 4) = TIE value
  const tieMap = {}
  if (webRows && webRows.length) {
    for (let i = 10; i < webRows.length; i++) {
      const row = webRows[i]
      if (!row) continue
      const code = row[1]
      const tieVal = row[4]
      if (code && tieVal != null) tieMap[code] = tieVal
    }
  }

  if (tieMap['UNGC'] != null && ungc.length > 0) {
    ungc[ungc.length - 1] = { label: 'TIE', valor: tieMap['UNGC'] }
  }
  if (tieMap['UNGG'] != null && ungg.length > 0) {
    ungg[ungg.length - 1] = { label: 'TIE', valor: tieMap['UNGG'] }
  }

  // Custodia from Saldo file
  // Data from row idx 11; find col B (idx 1) === '3050200006371'
  // col J (idx 9) = disponible; cols D+E (idx 3+4) = congelado; col H (idx 7) = valorTransferencia
  let custodia = { disponible: null, congelado: null, saldo: null }
  if (saldoRows) {
    for (let i = 11; i < saldoRows.length; i++) {
      const row = saldoRows[i]
      if (!row) continue
      const cuentaStr = String(row[1] ?? '').trim()
      if (cuentaStr === '3050200006371') {
        const disponible = parseFloat(row[9]) || 0
        const congelado = (parseFloat(row[3]) || 0) + (parseFloat(row[4]) || 0)
        const valorTransferencia = parseFloat(row[7]) || 0
        const saldo = disponible + congelado + valorTransferencia
        custodia = { disponible, congelado, saldo }
        break
      }
    }
    if (custodia.disponible === null) {
      errors.push('No se encontró la cuenta 3050200006371 en Saldo Cuenta Custodia')
    }
  }

  // Precios
  const precios = extractPrecios(garantiaRows)

  // Totals: sum of valores in each block
  const totalUNGC = ungc.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0)
  const totalUNGG = ungg.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0)
  const totalConsignar = totalUNGC + totalUNGG

  // fecha from filename
  const fechaNombre = garantiaFile.name.replace(/\.[^.]+$/, '')

  return { ungc, ungg, custodia, precios, totalUNGC, totalUNGG, totalConsignar, fechaNombre, errors }
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
