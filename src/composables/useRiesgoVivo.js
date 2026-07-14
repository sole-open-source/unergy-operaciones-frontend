import { ref, computed } from 'vue'
import api from '@/api/client'
import { calculateRisk, alertasAccionables } from '@/utils/riskEngine'
import { mesActualISO } from '@/utils/liquidaciones'

// ── Riesgo Vivo: garantías × exposición ante XM ──────────────────────────────
// Fuente de datos — SIN endpoints nuevos, se cruzan dos que ya existen:
//
//   GET /garantias                                  → { items: [...] }
//   GET /liquidaciones/resumen-panel?periodo=YYYY-MM → { proyectos: [...] }
//
// `resumen-panel` es el mismo insumo que usa todo el módulo de Liquidaciones (no
// existe un `GET /liquidaciones` plano) y es el único que trae la exposición ya
// agregada por proyecto y período. El cálculo vive en utils/riskEngine.js; este
// composable solo trae los datos y expone el resultado.
//
// Se usa desde 4 vistas (Riesgo, Garantías, Liquidaciones y Alertas): cada una
// llama a `cargar()` y lee el mismo resultado, sin duplicar la lógica de fetch.
// ──────────────────────────────────────────────────────────────────────────────

export function useRiesgoVivo() {
  const garantias = ref([])
  const paneles = ref([])
  const loading = ref(false)
  const error = ref(null)
  const periodo = ref(mesActualISO())   // "YYYY-MM-01"

  const riesgo = computed(() =>
    calculateRisk({ garantias: garantias.value, paneles: paneles.value })
  )
  const proyectos = computed(() => riesgo.value.proyectos)
  const alertas = computed(() => riesgo.value.alertas)
  const totales = computed(() => riesgo.value.totales)
  const accionables = computed(() => alertasAccionables(alertas.value))

  /** Riesgo de un proyecto puntual (para pintar el badge en una fila). */
  const porProyecto = computed(() => {
    const idx = new Map()
    for (const p of proyectos.value) idx.set(p.proyecto_id, p)
    return idx
  })

  async function cargar(per = periodo.value) {
    periodo.value = per
    loading.value = true
    error.value = null
    try {
      // La preliquidación es el panel del mes en curso (el oficial se emite
      // después): es lo que da la exposición "viva" del período actual.
      const [gRes, pRes] = await Promise.all([
        api.get('/garantias', { params: { size: 500 } }),
        api.get('/liquidaciones/resumen-panel', {
          params: { periodo: per.slice(0, 7), tipo: 'preliquidacion' },
        }),
      ])
      garantias.value = gRes.data?.items || []
      paneles.value = pRes.data?.proyectos || []
    } catch (e) {
      error.value = e?.response?.data?.detail || 'No se pudo cargar el riesgo de liquidez'
      garantias.value = []
      paneles.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    garantias, paneles, periodo, loading, error,
    riesgo, proyectos, alertas, totales, accionables, porProyecto,
    cargar,
  }
}
