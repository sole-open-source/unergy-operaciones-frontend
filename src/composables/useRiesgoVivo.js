import { ref, computed } from 'vue'
import api from '@/api/client'
import {
  calculateRisk, alertasAccionables, saldoVivoDesdeMovimientos, ESTADOS_QUE_RESPALDAN,
} from '@/utils/riskEngine'
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
  // Garantías cuyo GET /movimientos falló: su saldo quedó en valor_cop
  // (constituido) y la cobertura puede estar SOBREestimada. La vista debe avisar.
  const saldosNoVerificados = ref(0)
  // Cambiar de mes dispara cargas concurrentes de duración variable: solo la
  // ÚLTIMA pedida puede escribir los refs, o la tabla mostraría la exposición
  // de un período con la etiqueta de otro.
  let cargaSeq = 0

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
    const mySeq = ++cargaSeq
    periodo.value = per
    loading.value = true
    error.value = null
    try {
      // La preliquidación es el panel del mes en curso (el oficial se emite
      // después): es lo que da la exposición "viva" del período actual.
      const [gRes, pRes] = await Promise.all([
        api.get('/garantias'),
        api.get('/liquidaciones/resumen-panel', {
          params: { periodo: per.slice(0, 7), tipo: 'preliquidacion' },
        }),
      ])
      const items = gRes.data?.items || []
      // El saldo VIVO no viene en el list (el backend nunca aplica los
      // movimientos sobre valor_cop): hay que pedir los movimientos de cada
      // garantía que respalda. Si una petición falla se queda sin saldo_vivo_cop
      // y el motor cae a valor_cop (mejor un dato constituido que ninguna vista),
      // pero se cuenta y se marca para que la vista lo diga.
      const noVerificados = await hidratarSaldosVivos(items)
      if (mySeq !== cargaSeq) return   // respuesta obsoleta: ya hay una carga más nueva
      garantias.value = items
      paneles.value = pRes.data?.proyectos || []
      saldosNoVerificados.value = noVerificados
    } catch (e) {
      if (mySeq !== cargaSeq) return   // el fallo viejo no debe pisar datos nuevos
      error.value = e?.response?.data?.detail || 'No se pudo cargar el riesgo de liquidez'
      garantias.value = []
      paneles.value = []
      saldosNoVerificados.value = 0
    } finally {
      if (mySeq === cargaSeq) loading.value = false
    }
  }

  return {
    garantias, paneles, periodo, loading, error, saldosNoVerificados,
    riesgo, proyectos, alertas, totales, accionables, porProyecto,
    cargar,
  }
}

const CONCURRENCIA_MOVIMIENTOS = 6

/**
 * Inyecta `saldo_vivo_cop` (mutando cada item) desde GET /garantias/{id}/movimientos,
 * solo para las garantías cuyo saldo cuenta (estado que respalda). En lotes de
 * CONCURRENCIA_MOVIMIENTOS para no inundar el backend.
 *
 * Fallo ≠ vacío: una lista vacía de movimientos significa que valor_cop ES el
 * saldo (el backend siembra desde ahí); una petición FALLIDA deja el saldo sin
 * verificar → se marca `saldo_sin_verificar` y se cuenta, para que la vista
 * avise en vez de re-sobreestimar la cobertura en silencio.
 *
 * @returns {number} Cuántas garantías quedaron sin saldo verificado.
 */
async function hidratarSaldosVivos(items) {
  const relevantes = items.filter((g) => g?.id != null && ESTADOS_QUE_RESPALDAN.has(g.estado))
  let noVerificados = 0
  for (let i = 0; i < relevantes.length; i += CONCURRENCIA_MOVIMIENTOS) {
    const lote = relevantes.slice(i, i + CONCURRENCIA_MOVIMIENTOS)
    await Promise.all(lote.map(async (g) => {
      try {
        const res = await api.get(`/garantias/${g.id}/movimientos`)
        const saldo = saldoVivoDesdeMovimientos(res.data)
        if (saldo != null) g.saldo_vivo_cop = saldo
      } catch {
        g.saldo_sin_verificar = true   // el motor usará valor_cop (constituido)
        noVerificados += 1
      }
    }))
  }
  return noVerificados
}
