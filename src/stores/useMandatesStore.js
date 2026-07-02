// ──────────────────────────────────────────────────────────────────────────
// useMandatesStore
// ---------------------------------------------------------------------------
// Store de dominio de la conciliación "Mandato (PDF) vs. Asiento contable
// (Odoo .xlsx)" — Finanzas → Validador de Mandatos.
//
// CENTRALIZA:
//   • El estado del soporte contable cargado (grupos de ingresos, detalle de
//     costos línea-a-línea y etiquetas analíticas), que antes vivía en variables
//     de cierre dentro de la vista.
//   • El mapa persistido planta→etiqueta (localStorage), incluida su carga/guardado.
//   • Las operaciones de conciliación (sugerir etiqueta, conciliar, emparejar).
//
// El MOTOR de cálculo puro sigue en '@/utils/conciliacionMandatos.js' (regex y
// reglas de negocio verificadas en producción, con test dedicado). Este store lo
// IMPORTA y lo envuelve; no reimplementa nada, para no arriesgar esas reglas.
// ──────────────────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  parseAsientos, extractMandate, suggestTag, reconciliar, fmt, norm,
  parseIngresos, matchIngresoContab,
} from '@/utils/conciliacionMandatos.js'

const TAGMAP_KEY = 'conc_costos_tagmap'

export const useMandatesStore = defineStore('mandates', () => {
  // ── Estado ────────────────────────────────────────────────────────────────
  const contabilidadData = ref([])   // [{asociado, planta, valor_contabilidad}] — modo ingresos/autoconsumo
  const asientosDetalle  = ref([])   // detalle línea-a-línea del xlsx — modo costos
  const tagsAnaliticos   = ref([])   // etiquetas analíticas (proyectos) del xlsx
  const savedTagMap      = ref(readTagMap())  // mapa recordado planta→etiqueta
  const isLoading        = ref(false)
  const error            = ref(null)

  // ── Persistencia del mapa de etiquetas ─────────────────────────────────────
  function readTagMap() {
    try { return JSON.parse(localStorage.getItem(TAGMAP_KEY) || '{}') } catch { return {} }
  }
  function persistTagMap() {
    try { localStorage.setItem(TAGMAP_KEY, JSON.stringify(savedTagMap.value)) } catch { /* noop */ }
  }

  // ── Carga del soporte contable ──────────────────────────────────────────────
  /**
   * Procesa la matriz del xlsx (sheet_to_json {header:1}) y llena el estado:
   *  - INGRESOS/AUTOCONSUMO: parseIngresos → grupos (asociado, planta).
   *  - COSTOS: parseAsientos → detalle línea-a-línea + etiquetas analíticas.
   * @returns {{grupos:number, lineas:number, tags:number}} conteos cargados.
   */
  function loadContabilidad(matriz) {
    isLoading.value = true
    error.value = null
    try {
      contabilidadData.value = parseIngresos(matriz)
      try {
        const pa = parseAsientos(matriz)
        asientosDetalle.value = pa.details
        tagsAnaliticos.value  = pa.tags
      } catch {
        asientosDetalle.value = []
        tagsAnaliticos.value  = []
      }
      return {
        grupos: contabilidadData.value.length,
        lineas: asientosDetalle.value.length,
        tags:   tagsAnaliticos.value.length,
      }
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /** Limpia el soporte cargado (sin tocar el mapa de etiquetas recordadas). */
  function reset() {
    contabilidadData.value = []
    asientosDetalle.value  = []
    tagsAnaliticos.value   = []
    error.value = null
  }

  // ── Operaciones de conciliación (sobre el estado cargado) ───────────────────

  /** Sugiere la etiqueta analítica de un proyecto contra las etiquetas y el mapa recordado. */
  function suggestTagFor(projName) {
    return suggestTag(projName, tagsAnaliticos.value, savedTagMap.value)
  }

  /** Recuerda (y persiste) la etiqueta elegida manualmente para una planta. */
  function rememberTag(projName, tag) {
    if (!tag || !projName) return
    savedTagMap.value = { ...savedTagMap.value, [norm(projName)]: tag }
    persistTagMap()
  }

  /** Concilia un mandato de costos contra el detalle contable cargado. */
  function reconcile(mandato, tag) {
    return reconciliar(mandato, asientosDetalle.value, tag)
  }

  /**
   * Orquesta sugerencia + conciliación de un mandato de COSTOS en un solo paso.
   * Devuelve el registro listo para pintar: {mandato, tag, sugStatus, candidates, ...rec}.
   */
  function reconcileCosto(mandato) {
    const sug = suggestTagFor(mandato.projName)
    const rec = reconcile(mandato, sug.tag)
    return { mandato, tag: sug.tag, sugStatus: sug.status, candidates: sug.candidates, ...rec }
  }

  /** Empareja un mandato de INGRESOS contra los grupos contables cargados. */
  function matchIngreso(mandato) {
    return matchIngresoContab(mandato, contabilidadData.value)
  }

  return {
    // estado
    contabilidadData, asientosDetalle, tagsAnaliticos, savedTagMap, isLoading, error,
    // acciones con estado
    loadContabilidad, reset, suggestTagFor, rememberTag, reconcile, reconcileCosto,
    matchIngreso, persistTagMap,
    // motor puro re-expuesto (API de dominio centralizada)
    parseAsientos, parseIngresos, extractMandate, suggestTag, reconciliar, matchIngresoContab, fmt, norm,
  }
})
