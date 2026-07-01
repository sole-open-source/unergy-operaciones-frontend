// Builders PUROS (sin dependencias de XLSX/jsPDF) para exportar la vista de
// Cumplimiento anual (pestaña "Cumplimiento": gráfica + selector año/contrato).
// Separado del componente para poder testear en Node y reusar entre el
// exportador de Excel y el de PDF.

export const MESES_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export const ESTADO_LABELS = {
  ok: 'Cumple',
  deficit: 'Déficit',
  excedente: 'Excedente',
  sin_compromisos: 'Sin compromisos',
  sin_datos: 'Sin datos',
  finalizado: 'Finalizado',
  no_iniciado: 'No iniciado',
}

export function estadoLabelExport(estado) {
  return ESTADO_LABELS[estado] || estado || '—'
}

export function fmtNumExport(v, decimales = 1) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

function genVal(mes) { return mes.gen_proyectada_cierre ?? mes.gen_proyectada_mwh ?? mes.gen_mwh ?? 0 }

/**
 * Convierte los 12 `meses` de un contrato (respuesta de /cumplimiento/ppa/{id}/anual
 * o el consolidado equivalente) en filas listas para tabla, con valores crudos
 * (para Excel) y formateados es-CO (para PDF/otras vistas de texto).
 */
export function prepararFilasMensuales(meses) {
  return (meses || []).map((mes, i) => ({
    mes: MESES_ABBR[i],
    genMwh: Math.round(genVal(mes) * 1000) / 1000,
    minMwh: mes.min_mwh,
    maxMwh: mes.max_mwh,
    estado: mes.estado,
    estadoLabel: estadoLabelExport(mes.estado),
    comprasBolsaMwh: mes.compras_bolsa_mwh,
    excedentesMwh: mes.excedentes_bolsa_mwh,
  }))
}

/** Totales anuales (sumas simples) de las filas mensuales ya preparadas. */
export function totalizarFilasMensuales(filas) {
  const sum = (key) => filas.reduce((acc, f) => acc + (f[key] ?? 0), 0)
  return {
    genMwh: Math.round(sum('genMwh') * 1000) / 1000,
    minMwh: Math.round(sum('minMwh') * 1000) / 1000,
    maxMwh: Math.round(sum('maxMwh') * 1000) / 1000,
    comprasBolsaMwh: Math.round(sum('comprasBolsaMwh') * 1000) / 1000,
    excedentesMwh: Math.round(sum('excedentesMwh') * 1000) / 1000,
  }
}

/**
 * Agrega las plantas que participan en un contrato a lo largo del año: suma la
 * generación aportada mes a mes y conserva el último % de despacho visto (el
 * más reciente/representativo). Si `incluirContrato` es true (modo consolidado),
 * separa por (planta, contrato) en vez de solo por planta.
 */
export function agregarPlantasAnuales(meses, { incluirContrato = false } = {}) {
  const acc = new Map()
  for (const mes of (meses || [])) {
    for (const p of (mes.plantas || [])) {
      const key = incluirContrato ? `${p.nombre}__${p.contrato || ''}` : p.nombre
      if (!acc.has(key)) {
        acc.set(key, { nombre: p.nombre, contrato: p.contrato || '', pctDespacho: p.pct_despacho ?? null, genAportadaMwh: 0, esDuplicado: false })
      }
      const row = acc.get(key)
      if (p.pct_despacho !== null && p.pct_despacho !== undefined) row.pctDespacho = p.pct_despacho
      if (p.gen_contrato_mwh) row.genAportadaMwh += p.gen_contrato_mwh
      if (p.es_duplicado) row.esDuplicado = true
    }
  }
  return [...acc.values()]
    .map(r => ({ ...r, genAportadaMwh: Math.round(r.genAportadaMwh * 1000) / 1000 }))
    .sort((a, b) => b.genAportadaMwh - a.genAportadaMwh)
}

const N_COLS = 7 // Mes, Generación, Mínimo, Máximo, Estado, Compras bolsa, Excedentes

/**
 * Construye el AOA (array de arrays) de la hoja de un contrato: encabezado con
 * datos del contrato, tabla mensual, totales y sección de plantas participantes.
 *
 * @param {object} opts
 * @param {{nombre_interno, numero_codigo_contrato, comprador_nombre}} opts.contrato
 * @param {number} opts.year
 * @param {Array} opts.meses - 12 meses (formato /anual)
 * @param {boolean} [opts.consolidado] - si true, la sección de plantas incluye columna "Contrato"
 * @returns {{ aoa, headerRow, totalRow, plantHeaderRow, plantTotalRow, nCols, plantCols }}
 */
export function construirContratoAnualAOA({ contrato, year, meses, consolidado = false }) {
  const filas = prepararFilasMensuales(meses)
  const totales = totalizarFilasMensuales(filas)
  const plantas = agregarPlantasAnuales(meses, { incluirContrato: consolidado })

  const aoa = []
  aoa.push([`UNERGY — Matriz anual de cumplimiento ${year}`])
  aoa.push([contrato.nombre_interno || contrato.numero_codigo_contrato || `Contrato ${contrato.id}`])
  aoa.push([`Contrato ${contrato.numero_codigo_contrato || '—'} · ${contrato.comprador_nombre || '—'} · ${year}`])
  aoa.push([])

  const headerRow = aoa.length
  aoa.push(['Mes', 'Generación (MWh)', 'Mínimo (MWh)', 'Máximo (MWh)', 'Estado', 'Compras bolsa (MWh)', 'Excedentes (MWh)'])

  for (const f of filas) {
    aoa.push([f.mes, f.genMwh, f.minMwh, f.maxMwh, f.estadoLabel, f.comprasBolsaMwh, f.excedentesMwh])
  }

  const totalRow = aoa.length
  aoa.push(['TOTAL', totales.genMwh, totales.minMwh, totales.maxMwh, '', totales.comprasBolsaMwh, totales.excedentesMwh])

  aoa.push([])
  aoa.push([])

  const plantHeaderRow = aoa.length
  const plantCols = consolidado
    ? ['Planta', 'Contrato', '% Despacho', 'Generación aportada (MWh)']
    : ['Planta', '% Despacho', 'Generación aportada (MWh)']
  aoa.push(['Plantas participantes', ...Array(plantCols.length - 1).fill('')])
  aoa.push(plantCols)

  for (const p of plantas) {
    const pct = p.pctDespacho != null ? Math.round(p.pctDespacho * 100) : null
    aoa.push(consolidado
      ? [p.nombre, p.contrato, pct, p.genAportadaMwh]
      : [p.nombre, pct, p.genAportadaMwh])
  }

  const plantTotalRow = aoa.length
  const totalGenPlantas = Math.round(plantas.reduce((a, p) => a + p.genAportadaMwh, 0) * 1000) / 1000
  aoa.push(consolidado
    ? [`TOTAL (${plantas.length} plantas)`, '', '', totalGenPlantas]
    : [`TOTAL (${plantas.length} plantas)`, '', totalGenPlantas])

  return { aoa, headerRow, totalRow, plantHeaderRow: plantHeaderRow + 1, plantTotalRow, nCols: N_COLS, plantCols: plantCols.length }
}

const ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', ü: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', Ü: 'U' }

/** Nombre corto para archivo: minúsculas, sin tildes/espacios/símbolos. */
export function slugify(s) {
  return (s || '')
    .toString()
    .replace(/[áéíóúñüÁÉÍÓÚÑÜ]/g, (ch) => ACENTOS[ch] || ch)
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase()
}

/** Nombre de hoja válido para Excel: sin caracteres prohibidos, máx. 31 caracteres. */
export function sheetNameSafe(name) {
  return (name || 'Hoja').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Hoja'
}
