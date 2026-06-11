import { ref } from 'vue'
import { uuid } from '../utils/formatters.js'

const STORAGE_KEY = 'garantias_historial'
const PB_KEY = 'garantias_pb_anterior'
const MENCIONES_KEY = 'garantias_menciones'

function loadHistorial() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistorial(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useGarantiasHistorial() {
  const historial = ref(loadHistorial())

  function guardar(registro) {
    const entry = { id: uuid(), ...registro }
    historial.value = [entry, ...historial.value]
    saveHistorial(historial.value)
  }

  function eliminar(id) {
    historial.value = historial.value.filter((r) => r.id !== id)
    saveHistorial(historial.value)
  }

  function exportarJSON() {
    const blob = new Blob([JSON.stringify(historial.value, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'historial_garantias.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importarJSON(jsonStr) {
    const incoming = JSON.parse(jsonStr)
    if (!Array.isArray(incoming)) throw new Error('El JSON debe ser un array')
    const existingIds = new Set(historial.value.map((r) => r.id))
    const nuevos = incoming.filter((r) => r.id && !existingIds.has(r.id))
    historial.value = [...historial.value, ...nuevos]
    saveHistorial(historial.value)
    return nuevos.length
  }

  function getPbAnterior() {
    const v = localStorage.getItem(PB_KEY)
    return v != null ? parseFloat(v) : null
  }

  function setPbAnterior(v) {
    if (v != null) localStorage.setItem(PB_KEY, String(v))
  }

  function getMenciones() {
    return localStorage.getItem(MENCIONES_KEY) || ''
  }

  function setMenciones(v) {
    localStorage.setItem(MENCIONES_KEY, v || '')
  }

  return {
    historial,
    guardar,
    eliminar,
    exportarJSON,
    importarJSON,
    getPbAnterior,
    setPbAnterior,
    getMenciones,
    setMenciones,
  }
}
