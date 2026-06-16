import { ref } from 'vue'
import api from '@/api/client.js'

function toFrontend(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    fecha: r.fecha,
    pb: r.pb,
    restricciones: r.restricciones,
    stn: r.stn,
    trm: r.trm,
    ptb: r.ptb,
    totalUNGC: r.total_ungc,
    totalUNGG: r.total_ungg,
    totalConsignar: r.total_consignar,
    disponibleCustodia: r.disponible_custodia,
    congelado: r.congelado,
    saldo: r.saldo,
    totalAjusteTXR: r.total_ajuste_txr,
    snapshot: r.snapshot ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toBackend(r) {
  const map = {
    tipo: 'tipo',
    fecha: 'fecha',
    pb: 'pb',
    restricciones: 'restricciones',
    stn: 'stn',
    trm: 'trm',
    ptb: 'ptb',
    totalUNGC: 'total_ungc',
    totalUNGG: 'total_ungg',
    totalConsignar: 'total_consignar',
    disponibleCustodia: 'disponible_custodia',
    congelado: 'congelado',
    saldo: 'saldo',
    totalAjusteTXR: 'total_ajuste_txr',
    snapshot: 'snapshot',
  }
  const out = {}
  for (const [feKey, beKey] of Object.entries(map)) {
    if (feKey in r) out[beKey] = r[feKey]
  }
  return out
}

const PB_KEY = 'garantias_pb_anterior'
const MENCIONES_KEY = 'garantias_menciones'

// Estado compartido (singleton): así un guardado en Semanales se refleja en el Histórico
// y la vista no queda con una caché vacía propia de cada instancia.
const historial = ref([])
const loading = ref(false)
const errorMsg = ref('')

export function useGarantiasHistorial() {

  async function cargar() {
    loading.value = true
    errorMsg.value = ''
    try {
      const { data } = await api.get('/garantias-ajustes')
      historial.value = Array.isArray(data) ? data.map(toFrontend) : []
    } catch (e) {
      console.error('[garantias] cargar() falló:', e?.response?.data || e)
      errorMsg.value = e?.response?.data?.detail || e?.message || 'No se pudo cargar el historial'
      historial.value = []
    } finally {
      loading.value = false
    }
  }

  async function guardar(registro) {
    const { data } = await api.post('/garantias-ajustes', toBackend(registro))
    historial.value.unshift(toFrontend(data))
  }

  async function actualizar(id, campos) {
    const { data } = await api.patch(`/garantias-ajustes/${id}`, toBackend(campos))
    const idx = historial.value.findIndex(r => r.id === id)
    if (idx !== -1) historial.value[idx] = toFrontend(data)
  }

  async function eliminar(id) {
    await api.delete(`/garantias-ajustes/${id}`)
    historial.value = historial.value.filter(r => r.id !== id)
  }

  function getPbAnterior() {
    const v = localStorage.getItem(PB_KEY)
    return v !== null ? parseFloat(v) : null
  }

  function setPbAnterior(v) {
    localStorage.setItem(PB_KEY, String(v))
  }

  function getMenciones() {
    return localStorage.getItem(MENCIONES_KEY) || ''
  }

  function setMenciones(v) {
    localStorage.setItem(MENCIONES_KEY, v)
  }

  return { historial, loading, errorMsg, cargar, guardar, actualizar, eliminar, getPbAnterior, setPbAnterior, getMenciones, setMenciones }
}
