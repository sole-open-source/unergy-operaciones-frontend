/**
 * Correlación precio de bolsa (XM) ↔ generación real de la flota Unergy.
 *
 * Precios: GET /evo/dailyspot/hourly/{fecha} → [{hora, precio_cop_kwh, planta_marginal, ...}]
 * Generación: no hay endpoint horario de flota (/generacion-solar/fleet/history es diario),
 * así que agregamos proyecto por proyecto con /generacion-solar/proyecto/{id}/historial.
 */
import { ref, computed } from 'vue'
import api from '@/api/client'

// Solenium responde una llamada por proyecto; limitamos el paralelismo para no saturar el proxy.
const CONCURRENCIA = 6

/** Ejecuta fn sobre items con un máximo de `limit` promesas en vuelo. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diaAnterior(fecha) {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return ymd(dt)
}

export function useGenerationCorrelation() {
  const loading = ref(false)
  const error = ref(null)
  const fecha = ref(null)
  const rows = ref([])              // [{ hour, hora_label, price_cop, generation_kwh, marginal }]
  const proyectosConDato = ref(0)
  const proyectosConsultados = ref(0)

  const hayPrecios = computed(() => rows.value.some(r => r.price_cop > 0))
  const hayGeneracion = computed(() => rows.value.some(r => r.generation_kwh > 0))

  /**
   * Generación horaria de un proyecto para `fecha`, en kWh por hora de reloj (0..23).
   *
   * Solenium devuelve el acumulado histórico si fecha_inicio == fecha_fin; con un rango
   * de dos días entrega los incrementos por franja, así que pedimos día anterior → fecha
   * y nos quedamos solo con las franjas de `fecha`.
   */
  async function generacionProyecto(proyectoId, fecha) {
    const { data } = await api.get(`/generacion-solar/proyecto/${proyectoId}/historial`, {
      params: { fecha_inicio: diaAnterior(fecha), fecha_fin: fecha, granularidad: 'hour' },
    })
    const porHora = new Array(24).fill(0)
    let tuvoDato = false
    for (const pt of (data?.puntos ?? [])) {
      const label = String(pt.label ?? '')
      if (!label.startsWith(fecha)) continue          // descarta las franjas del día anterior
      const hora = Number(label.slice(11, 13))
      const kwh = Number(pt.kwh)
      if (!Number.isFinite(hora) || hora < 0 || hora > 23 || !Number.isFinite(kwh)) continue
      porHora[hora] += kwh
      tuvoDato = true
    }
    return tuvoDato ? porHora : null
  }

  /** Carga precios + generación de la flota para `fecha` (YYYY-MM-DD) y arma la serie común. */
  async function fetchCorrelationData(f) {
    loading.value = true
    error.value = null
    fecha.value = f
    try {
      // Una fecha sin registrar devuelve 200 con [], así que un fallo aquí es de red o del
      // backend: lo dejamos propagar en vez de mostrarlo como "sin datos".
      const [preciosRes, proyectosRes] = await Promise.all([
        api.get(`/evo/dailyspot/hourly/${f}`),
        api.get('/proyectos', { params: { size: 500 } }),
      ])

      // XM indexa la hora 1..24, donde la hora 1 es la franja 00:00–01:00.
      // Solenium marca cada franja con su hora de reloj, así que llevamos todo a 0..23.
      const precioPorHora = new Array(24).fill(0)
      const marginalPorHora = new Array(24).fill('')
      for (const p of (preciosRes?.data ?? [])) {
        const h = Number(p.hora) - 1
        if (h < 0 || h > 23) continue
        precioPorHora[h] = Number(p.precio_cop_kwh) || 0
        marginalPorHora[h] = p.planta_marginal || ''
      }

      const operativos = (proyectosRes?.data?.items ?? []).filter(p => p.estado === 'en_operacion')
      proyectosConsultados.value = operativos.length

      const series = await mapLimit(operativos, CONCURRENCIA, (p) =>
        generacionProyecto(p.id, f).catch(() => null),   // un proyecto sin Solenium no invalida la flota
      )

      const genPorHora = new Array(24).fill(0)
      let conDato = 0
      for (const s of series) {
        if (!s) continue
        conDato++
        for (let h = 0; h < 24; h++) genPorHora[h] += s[h]
      }
      proyectosConDato.value = conDato

      rows.value = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        hora_label: `${String(h).padStart(2, '0')}:00`,
        price_cop: precioPorHora[h],
        generation_kwh: genPorHora[h],
        marginal: marginalPorHora[h],
      }))
    } catch (e) {
      console.error('Error cargando correlación precio/generación:', e)
      error.value = 'No se pudo cargar la correlación de precio y generación.'
      rows.value = []
      proyectosConDato.value = 0
      proyectosConsultados.value = 0
    } finally {
      loading.value = false
    }
  }

  /** Ingreso bruto (COP) = Σ precio_cop_kwh × generación_kwh. */
  function calculateRevenue(data) {
    return (data ?? []).reduce((s, r) => s + (r.price_cop || 0) * (r.generation_kwh || 0), 0)
  }

  const ingresoBruto = computed(() => calculateRevenue(rows.value))
  const generacionTotalKwh = computed(() =>
    rows.value.reduce((s, r) => s + (r.generation_kwh || 0), 0),
  )

  // Precio medio al que la flota realmente vendió. Sin generación (p. ej. de noche o
  // un día sin datos) no está definido: devolvemos null en vez de dividir por cero.
  const precioPromedioPonderado = computed(() =>
    generacionTotalKwh.value > 0 ? ingresoBruto.value / generacionTotalKwh.value : null,
  )

  const horaPico = computed(() => {
    if (!hayGeneracion.value) return null
    return rows.value.reduce((mx, r) => (r.generation_kwh > mx.generation_kwh ? r : mx), rows.value[0])
  })

  return {
    loading,
    error,
    fecha,
    rows,
    hayPrecios,
    hayGeneracion,
    proyectosConDato,
    proyectosConsultados,
    fetchCorrelationData,
    calculateRevenue,
    ingresoBruto,
    generacionTotalKwh,
    precioPromedioPonderado,
    horaPico,
  }
}
