// avance_pct = Σ pesos de los hitos COMPLETADOS. Un hito "en proceso" no suma.
// Pesos configurables (no hardcodeados por proyecto). Funciones puras.

import { ETAPAS_ACTUALES, HITOS, HITOS_POR_KEY } from './enums'

export function redondear2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function hitosPorDefecto() {
  return HITOS.map((h) => ({ hito: h.key, pesoPct: h.pesoDefault, completado: false }))
}

export function calcularAvancePct(hitos) {
  const suma = hitos.filter((h) => h.completado).reduce((acc, h) => acc + h.pesoPct, 0)
  return redondear2(suma)
}

export function sumaPesos(hitos) {
  return redondear2(hitos.reduce((acc, h) => acc + h.pesoPct, 0))
}

export function avancePorEtapa(hitos) {
  const acc = new Map()
  for (const etapa of ETAPAS_ACTUALES) {
    acc.set(etapa, { etapa, ganadoPct: 0, totalPct: 0, completos: 0, totalHitos: 0 })
  }
  for (const h of hitos) {
    const meta = HITOS_POR_KEY[h.hito]
    if (!meta) continue
    const row = acc.get(meta.etapa)
    if (!row) continue
    row.totalPct = redondear2(row.totalPct + h.pesoPct)
    row.totalHitos += 1
    if (h.completado) {
      row.ganadoPct = redondear2(row.ganadoPct + h.pesoPct)
      row.completos += 1
    }
  }
  return ETAPAS_ACTUALES.map((e) => acc.get(e))
}

export function siguienteHitoPendiente(hitos) {
  const completados = new Set(hitos.filter((h) => h.completado).map((h) => h.hito))
  for (const meta of HITOS) {
    if (!completados.has(meta.key)) return meta.key
  }
  return null
}

export function resumenAvance(hitos) {
  return {
    avancePct: calcularAvancePct(hitos),
    totalPct: sumaPesos(hitos),
    hitosCompletados: hitos.filter((h) => h.completado).map((h) => h.hito),
    hitosPendientes: hitos.filter((h) => !h.completado).map((h) => h.hito),
    porEtapa: avancePorEtapa(hitos),
  }
}
