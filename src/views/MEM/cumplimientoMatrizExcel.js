// Builder PURO de la matriz anual para Excel.
// construirMatrizAOA no depende de SheetJS (testeable en Node).
//
// Layout de columnas:
//   0 = Contrato / Proyecto
//   1..12 = meses (Ene..Dic)
//   13 = Total anual
//   14 = Mín anual
//   15 = Estado
//   16 = Bolsa (MWh)

const MES_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const COL = { primera: 0, mes1: 1, total: 13, min: 14, estado: 15, bolsa: 16 }
const N_COLS = 17

/** Converts a 0-based column index to Excel column letter (A, B, … AA, …) */
function colLetter(idx) {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/**
 * Constructs the Array-of-Arrays and formula metadata for the annual compliance matrix.
 *
 * Row layout (0-based indices):
 *   0   → title row
 *   1   → blank
 *   2   → header row
 *   3+  → contract rows (level 0) each followed by their project rows (level 1)
 *   last → grand-total row (level 0)
 *
 * @param {object} data  - { year, contratos: [...] }
 * @param {number} year  - export year (used in title)
 * @returns {{ aoa, rowLevels, formulaCells, totalRow, headerRow }}
 *   aoa          - Array of arrays (values only; formula cells will be overwritten by xlsx-js-style)
 *   rowLevels    - outline level per row (0 = top-level, 1 = project detail)
 *   formulaCells - [{ r, c, f, kind }]  r/c are 0-based; f is an Excel formula string
 *   totalRow     - 0-based index of the grand-total row
 *   headerRow    - 0-based index of the header row (= 2)
 */
export function construirMatrizAOA(data, year) {
  const aoa = []
  const rowLevels = []     // outline level per row
  const formulaCells = []  // { r, c, f, kind }
  const contractRowIndices = [] // 0-based row indices of contract rows (for grand-total formula)

  // ── Rows 0-2: title, blank, header ──────────────────────────────────────
  aoa.push([`Matriz anual de cumplimiento — ${year}`])
  rowLevels.push(0)

  aoa.push([])
  rowLevels.push(0)

  aoa.push(['Contrato / Proyecto', ...MES_ABBR, 'Total', 'Mín anual', 'Estado', 'Bolsa (MWh)'])
  rowLevels.push(0)

  // ── Contract + project rows ──────────────────────────────────────────────
  for (const contrato of data.contratos) {
    const contratoRowIdx = aoa.length   // 0-based; Excel row = contratoRowIdx + 1
    contractRowIndices.push(contratoRowIdx)

    // Contract row — months will be filled with formula cells; other values set here
    const contratoAoaRow = new Array(N_COLS).fill('')
    contratoAoaRow[COL.primera] = `${contrato.nombre_interno || contrato.numero_codigo_contrato} (${contrato.n_plantas} pl.)`
    contratoAoaRow[COL.min]     = contrato.total_min_anual_mwh ?? ''
    contratoAoaRow[COL.estado]  = contrato.estado_cumplimiento === 'cumple' ? '✓ Cumple' : '✗ No cumple'
    contratoAoaRow[COL.bolsa]   = contrato.bolsa_anual_mwh ?? ''
    aoa.push(contratoAoaRow)
    rowLevels.push(0)

    // Project rows (level 1) — must be added BEFORE we build formulas so we know the range
    const projStartIdx = aoa.length   // 0-based index of first project row
    for (const proj of contrato.proyectos) {
      const projRow = new Array(N_COLS).fill('')
      projRow[COL.primera] = `    ${proj.nombre} (${Math.round((proj.pct_despacho_rep ?? 0) * 100)}% part.)`
      for (let m = 0; m < 12; m++) {
        projRow[COL.mes1 + m] = proj.meses[m]?.valor_mwh ?? 0
      }
      aoa.push(projRow)
      rowLevels.push(1)
    }
    const projEndIdx = aoa.length - 1   // 0-based index of last project row

    // Formula: contract month = SUM of project rows for that month
    for (let m = 0; m < 12; m++) {
      const col = colLetter(COL.mes1 + m)
      if (contrato.proyectos.length > 0) {
        // Excel rows are 1-based: projStartIdx+1 .. projEndIdx+1
        formulaCells.push({
          r: contratoRowIdx,
          c: COL.mes1 + m,
          kind: 'contrato_mes',
          f: `SUM(${col}${projStartIdx + 1}:${col}${projEndIdx + 1})`,
        })
      } else {
        // No projects — use raw value
        contratoAoaRow[COL.mes1 + m] = contrato.meses[m]?.valor_mwh ?? 0
      }
    }

    // Formula: contract annual total = SUM(Ene..Dic) on its own row
    const firstMesCol = colLetter(COL.mes1)
    const lastMesCol  = colLetter(COL.mes1 + 11)
    const excelRow    = contratoRowIdx + 1   // 1-based
    formulaCells.push({
      r: contratoRowIdx,
      c: COL.total,
      kind: 'contrato_total',
      f: `SUM(${firstMesCol}${excelRow}:${lastMesCol}${excelRow})`,
    })
  }

  // ── Grand-total row ──────────────────────────────────────────────────────
  const totalRow = aoa.length   // 0-based index
  const totalAoaRow = new Array(N_COLS).fill('')
  totalAoaRow[COL.primera] = `TOTAL (${data.contratos.length} contratos)`
  aoa.push(totalAoaRow)
  rowLevels.push(0)

  // Grand-total month formulas: SUM of the individual contract cells (not a range,
  // since project rows are interspersed). We use explicit cell references to contract rows.
  for (let m = 0; m < 12; m++) {
    const col = colLetter(COL.mes1 + m)
    if (contractRowIndices.length > 0) {
      // Each reference: col + (1-based Excel row)
      const refs = contractRowIndices.map(r => `${col}${r + 1}`).join(',')
      formulaCells.push({
        r: totalRow,
        c: COL.mes1 + m,
        kind: 'total_mes',
        f: `SUM(${refs})`,
      })
    } else {
      formulaCells.push({ r: totalRow, c: COL.mes1 + m, kind: 'total_mes', f: '0' })
    }
  }

  return { aoa, rowLevels, formulaCells, totalRow, headerRow: 2 }
}
