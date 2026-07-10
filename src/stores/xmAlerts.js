import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'

// Alertas de nivel crítico: proyectos en operación que no tienen datos de XM
// necesarios para la liquidación mensual. La falta de estos datos bloquea la
// liquidación y genera retrasos financieros, por lo que se muestran de forma
// prominente en el Dashboard.
//
// Contrato del endpoint (backend por definir): GET /alerts/missing-xm-data
//   -> [{ project_id, project_name, month, year, message }]
// donde `message` ya trae el texto listo para mostrar, p. ej.
//   "El Proyecto X no tiene datos para liquidar en el mes Y".
export const useXmAlertsStore = defineStore('xmAlerts', () => {
  const missingXmDataAlerts = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchMissingXmDataAlerts() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/alerts/missing-xm-data')
      missingXmDataAlerts.value = Array.isArray(data) ? data : []
    } catch (err) {
      // Degradar con elegancia: no romper el Dashboard si el endpoint falla.
      missingXmDataAlerts.value = []
      // Un 404 significa que el endpoint aún no está desplegado en el backend:
      // no es una falla operativa que deba alarmar al usuario, así que se omite.
      // Cualquier otro error (red, 5xx) sí se reporta en la UI.
      if (err?.response?.status !== 404) {
        error.value = err?.response?.data?.detail || 'No se pudieron cargar las alertas de datos XM'
      }
    } finally {
      loading.value = false
    }
  }

  return { missingXmDataAlerts, loading, error, fetchMissingXmDataAlerts }
})
