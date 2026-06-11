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
  }
  const out = {}
  for (const [feKey, beKey] of Object.entries(map)) {
    if (feKey in r) out[beKey] = r[feKey]
  }
  return out
}

const PB_KEY = 'garantias_pb_anterior'
const MENCIONES_KEY = 'garantias_menciones'

export function useGarantiasHistorial() {
  const historial = ref([])
  const loading = ref(false)

  async function cargar() {
    loading.value = true
    try {
      const { data } = await api.get('/garantias-ajustes')
      historial.value = data.map(toFrontend)
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

  return { historial, loading, cargar, guardar, actualizar, eliminar, getPbAnterior, setPbAnterior, getMenciones, setMenciones }
}
