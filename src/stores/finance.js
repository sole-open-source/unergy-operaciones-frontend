import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  formatCurrency, createDecimal, round, toNumber,
} from '@/utils/financialCalculations.js'

// ──────────────────────────────────────────────────────────────────────────
// Store de presentación financiera — interfaz única para que los componentes
// muestren cifras de dinero con locale, moneda y precisión consistentes.
//
// La precisión por defecto es 0 decimales: es la convención de COP en la app
// (Finanzas y Garantías muestran pesos sin decimales). El módulo de
// Liquidaciones usa 2 decimales y puede pedirlo explícitamente. La aritmética
// vive en @/utils/financialCalculations.js (decimal.js); este store solo formatea.
// ──────────────────────────────────────────────────────────────────────────
export const useFinanceStore = defineStore('finance', () => {
  const currencyLocale = ref('es-CO')
  const currencyCode = ref('COP')
  const displayPrecision = ref(0)

  /**
   * Formatea un valor (number | string | Decimal) como moneda.
   * `precision` permite sobreescribir la precisión por llamada (p.ej. 2 en
   * Liquidaciones) sin cambiar el default del store. Null → '—'.
   */
  function format(value, precision = displayPrecision.value) {
    return formatCurrency(value, currencyCode.value, currencyLocale.value, precision)
  }

  /** Alias semántico para uso en plantillas: financeStore.formattedAmount(v). */
  function formattedAmount(value, precision = displayPrecision.value) {
    return format(value, precision)
  }

  /** Redondea a la precisión de presentación (o la indicada) y devuelve number. */
  function roundForDisplay(value, precision = displayPrecision.value) {
    return toNumber(round(value, precision))
  }

  /** Permite reconfigurar moneda/locale/precisión (p.ej. multimoneda futura). */
  function configure({ locale, code, precision } = {}) {
    if (locale != null) currencyLocale.value = locale
    if (code != null) currencyCode.value = code
    if (precision != null) displayPrecision.value = precision
  }

  return {
    currencyLocale, currencyCode, displayPrecision,
    format, formattedAmount, roundForDisplay, configure,
    // Re-export para componentes que necesiten construir Decimals directamente.
    createDecimal,
  }
})
