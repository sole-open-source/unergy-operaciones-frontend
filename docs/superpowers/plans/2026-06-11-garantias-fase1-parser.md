# Garantías Fase 1 — Correcciones de Parser

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Corregir `parseSemanales` y `parseTxr` para que reflejen la estructura real verificada de los Excel de XM, y ajustar el panel de custodia en Semanales.

**Architecture:** Solo frontend. Reescribir `useGarantiasParser.js` (lógica SheetJS) manteniendo la forma de salida `{label,valor}[]` compatible con `BloqueCodigo`. Sin cambios de backend. Persistencia (totales/precios/custodia) sin cambios.

**Tech Stack:** Vue 3, SheetJS (`xlsx`), PrimeVue.

**Spec:** `docs/superpowers/specs/2026-06-11-garantias-parser-correcciones-y-descuento-facturas.md` (Fase 1).

---

### Task 1: Reescribir `parseSemanales` con la estructura real

**Files:**
- Modify: `src/views/Garantias/AjustesXM/composables/useGarantiasParser.js`

Reglas (del spec §1.1–1.4):
- Garantía: hoja por patrón `/dep[oó]sito\s*sem/i`; encabezados fila 8; cols 0-2 = CÓDIGO/AGENTE/ACTIVIDAD; ajustes col 3..último header no vacío (dinámico); datos fila 9 hasta `col0==='TOTAL'`; UNGC ausente → ceros; precios tras TOTAL (label col1, valor col2; TRM por prefijo `TRM del`).
- Tabla por agente: una fila por columna de ajuste + fila `TIE` (de WEB) ; `total` = suma ajustes + TIE.
- Custodia (hoja `WebBalancePubrdl`): fila col1==='3050200006371'; disponible col9, congelado col3+col4, saldo col2, transferencias col7.
- WEB (hoja `DEPÓSITO`): datos desde fila 10; código col1, TIE col4; UNGC/UNGG.

Reemplazar todo lo relacionado con `extractBloque`, `extractPrecios` y el cuerpo de `parseSemanales` por esta implementación (mantener `identifyFiles`, `readWorkbook` y `parseTxr` salvo lo indicado en Task 2):

```js
const HEADER_ROW = 8
const DATA_START = 9

function sheetRows(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
}

function findSheetByPattern(wb, pattern) {
  const name = wb.SheetNames.find((n) => pattern.test(n))
  return wb.Sheets[name] || wb.Sheets[wb.SheetNames[0]]
}

function findSheetByName(wb, target) {
  const found = wb.SheetNames.find((n) => n.trim().toUpperCase() === target.toUpperCase())
  return found ? wb.Sheets[found] : null
}

// Celdas de Excel ya vienen numéricas; null-safe.
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
  const ws = findSheetByName(wb, 'DEPÓSITO') || wb.Sheets[wb.SheetNames[0]]
  const rows = sheetRows(ws)
  const tie = {}
  for (let i = 10; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const code = String(row[1] ?? '').trim()
    if (code === 'UNGC' || code === 'UNGG') tie[code] = num(row[4]) ?? 0
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
```

Nuevo cuerpo de `parseSemanales`:

```js
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
```

- [ ] Reemplazar el código viejo (`extractBloque`, `extractPrecios`, cuerpo de `parseSemanales`) por lo anterior. Mantener imports y `identifyFiles`/`readWorkbook`.
- [ ] `npm run build` y confirmar que compila.
- [ ] Commit: `fix(garantias): parser semanales con estructura real (columnas dinámicas, custodia, TIE)`

---

### Task 2: TXR/Mensuales — mapear por nombre de encabezado, columnas ausentes vacías

**Files:**
- Modify: `src/views/Garantias/AjustesXM/composables/useGarantiasParser.js` (`parseTxr`)
- Revisar: `src/views/Garantias/AjustesXM/tabs/TxrTab.vue`, `MensualesTab.vue`

- [ ] En `parseTxr`: ya mapea por header al construir `obj`. Quitar el requisito rígido de que exista `Total Ajuste` para no abortar (si falta, `totalAjuste=0` y warning, ya está). Devolver también `headers` (array de nombres presentes) para render dinámico.
- [ ] En `TxrTab.vue`/`MensualesTab.vue`: renderizar la tabla con las columnas presentes (`headers`); celdas ausentes vacías. Si ya renderizan dinámico desde las keys del row, basta con confirmar y no romper.
- [ ] `npm run build`.
- [ ] Commit: `fix(garantias): TXR/Mensuales mapea columnas por encabezado`

---

### Task 3: Panel de custodia Semanales — 4ª card + disponible negativo en rojo

**Files:**
- Modify: `src/views/Garantias/AjustesXM/tabs/SemanalesTab.vue`

- [ ] Cambiar el panel de custodia de 3 a 4 cards (grid 4 cols en md): `Disponible`, `Disponible (Aplicación de garantía)` = `custodia.disponible + totalUNGG + totalUNGC` (texto verde), `Congelado`, `Saldo`.
- [ ] `Disponible` en rojo (`#D64455`) si `custodia.disponible < 0`.
- [ ] Guardar contra `custodia` posiblemente `null` (usar optional chaining; el panel solo si `resultado.custodia`).
- [ ] El mensaje (Paso 3) sigue usando `custodia.disponible`. No romper `guardarRegistro` (sigue mandando los mismos campos).
- [ ] `npm run build`.
- [ ] Commit: `feat(garantias): panel custodia con aplicación de garantía y disponible negativo`

---

### Task 4: Build final + deploy + verificar producción

- [ ] `npm run build` final (debe pasar limpio).
- [ ] `git push origin master`.
- [ ] Esperar ~2-3 min; verificar en producción que el chunk de Garantías actualizó (comparar hash del bundle / `curl` + `grep`).
