/**
 * datosOperativos.js
 * Esquema y utilidades para el campo estructurado `datos_operativos` de los
 * informes operacionales. Compartido por InformeDatosOperativosEditor.vue y
 * InformeDetailView.vue para no duplicar la forma de los datos.
 *
 * Forma:
 * {
 *   generacion:   { real_mwh, esperada_mwh, pr_pct, disponibilidad_pct },
 *   precios:      { precio_energia, moneda, ingreso_estimado },
 *   cumplimiento: [ { metrica, objetivo, real, unidad } ],
 *   observaciones: string
 * }
 */

/** Estructura vacía por defecto (informe nuevo o sin datos_operativos). */
export function emptyDatosOperativos() {
  return {
    generacion: {
      real_mwh: null,
      esperada_mwh: null,
      pr_pct: null,
      disponibilidad_pct: null,
    },
    precios: {
      precio_energia: null,
      moneda: 'COP',
      ingreso_estimado: null,
    },
    cumplimiento: [],
    observaciones: '',
  }
}

/** Fila de cumplimiento vacía. */
export function emptyCumplimientoRow() {
  return { metrica: '', objetivo: null, real: null, unidad: '%' }
}

/**
 * Normaliza cualquier valor entrante (posiblemente null o parcial) a la forma
 * completa, evitando accesos a propiedades indefinidas en los inputs.
 */
export function normalizeDatosOperativos(raw) {
  const base = emptyDatosOperativos()
  if (!raw || typeof raw !== 'object') return base
  return {
    generacion: { ...base.generacion, ...(raw.generacion || {}) },
    precios: { ...base.precios, ...(raw.precios || {}) },
    cumplimiento: Array.isArray(raw.cumplimiento)
      ? raw.cumplimiento.map((c) => ({ ...emptyCumplimientoRow(), ...c }))
      : [],
    observaciones: raw.observaciones || '',
  }
}

/**
 * Validación básica en cliente de tipos y campos requeridos.
 * No sustituye la validación de negocio del backend (validateInforme); sirve
 * como retroalimentación inmediata mientras se edita.
 * @returns {{ valid: boolean, messages: Array<{field:string, text:string, severity:string}> }}
 */
export function validateDatosOperativosLocal(d) {
  const messages = []
  const g = d?.generacion || {}
  const p = d?.precios || {}

  const isNum = (v) => v != null && v !== '' && Number.isFinite(Number(v))

  if (!isNum(g.real_mwh)) {
    messages.push({ field: 'Generación real', text: 'Requerida (MWh).', severity: 'error' })
  }
  if (!isNum(g.esperada_mwh)) {
    messages.push({ field: 'Generación esperada', text: 'Requerida (MWh).', severity: 'error' })
  }
  if (isNum(g.pr_pct) && (Number(g.pr_pct) < 0 || Number(g.pr_pct) > 100)) {
    messages.push({ field: 'PR', text: 'El PR debe estar entre 0 y 100 %.', severity: 'error' })
  }
  if (isNum(g.disponibilidad_pct) && (Number(g.disponibilidad_pct) < 0 || Number(g.disponibilidad_pct) > 100)) {
    messages.push({ field: 'Disponibilidad', text: 'Debe estar entre 0 y 100 %.', severity: 'error' })
  }
  if (p.precio_energia != null && p.precio_energia !== '' && Number(p.precio_energia) < 0) {
    messages.push({ field: 'Precio de energía', text: 'No puede ser negativo.', severity: 'error' })
  }

  ;(d?.cumplimiento || []).forEach((c, i) => {
    if (!c.metrica || !String(c.metrica).trim()) {
      messages.push({ field: `Cumplimiento #${i + 1}`, text: 'Falta el nombre de la métrica.', severity: 'warn' })
    }
  })

  const valid = !messages.some((m) => m.severity === 'error')
  return { valid, messages }
}
