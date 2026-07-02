// ──────────────────────────────────────────────────────────────────────────
// useLiquidationsStore
// ---------------------------------------------------------------------------
// Store de dominio de Liquidaciones. Centraliza el cálculo financiero del
// "Estado de Resultados" (ingreso neto = valor a pagar − costos − facturas de
// servicio) y los helpers de formato/estado usados por las vistas.
//
// El MOTOR de cálculo puro sigue en '@/utils/liquidaciones.js' (fórmula oficial
// confirmada por dirección, con matices de comercialización/bolsa y de dedupe de
// facturas). Este store lo IMPORTA y lo envuelve; además puede sostener una
// liquidación "activa" y derivar de ella el neto / valor a pagar / costos como
// getters, para que las vistas no repitan el cálculo.
//
// Nota de alcance: los componentes de '@/views/Liquidaciones/**' siguen
// importando los helpers puros directamente (son formateadores usados en
// plantillas). Este store no los reemplaza uno a uno; ofrece el mismo API
// centralizado y probado para el consumo desde lógica de negocio.
// ──────────────────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fmtCOP, fmtCompact, formatPeriodo, toISOMonth, mesActualISO,
  normTipo, normPct, pct, estadoSeverity, estadoLabel, facturaEstadoSeverity,
  netoFromVista, valorAPagarFromVista, costosFromVista,
  codigoSoporte, indiceSoportesProyecto, construirEstadoResultados,
} from '@/utils/liquidaciones.js'

export const useLiquidationsStore = defineStore('liquidations', () => {
  // ── Estado ────────────────────────────────────────────────────────────────
  const liquidationData = ref(null)   // resumen de la liquidación activa (forma por-proyecto)
  const isLoading       = ref(false)
  const error           = ref(null)

  // ── Getters derivados de la liquidación activa ──────────────────────────────
  const neto        = computed(() => netoFromVista(liquidationData.value))
  const valorAPagar = computed(() => valorAPagarFromVista(liquidationData.value))
  const costos      = computed(() => costosFromVista(liquidationData.value))

  // ── Acciones de estado ──────────────────────────────────────────────────────
  function setLiquidation(data) {
    liquidationData.value = data || null
    error.value = null
  }
  function reset() {
    liquidationData.value = null
    error.value = null
  }

  return {
    // estado + getters
    liquidationData, isLoading, error, neto, valorAPagar, costos,
    setLiquidation, reset,
    // motor puro re-expuesto (API de dominio centralizada y probada)
    fmtCOP, fmtCompact, formatPeriodo, toISOMonth, mesActualISO,
    normTipo, normPct, pct, estadoSeverity, estadoLabel, facturaEstadoSeverity,
    netoFromVista, valorAPagarFromVista, costosFromVista,
    codigoSoporte, indiceSoportesProyecto, construirEstadoResultados,
  }
})
