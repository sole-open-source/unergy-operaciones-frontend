// ──────────────────────────────────────────────────────────────────────────
// xmAsicService — ingestión de contratos ASIC de XM.
//
// Encapsula la carga del archivo (Excel/CSV) que exporta el ASIC de XM hacia
// el backend, que se encarga de parsearlo, validarlo y persistir los contratos.
//
// NOTA sobre backend: el endpoint `POST /integraciones/xm/asic/upload` (bajo el
// baseURL `/api/v1` de `@/api/client`) es el contrato previsto para esta carga.
// Acepta `multipart/form-data` con el campo `file` y responde:
//   200 → { procesados, filas, contratos: [...], advertencias: [...] }
//   400 → { detail: '...' } | { detail: [{ fila, columna, msg }, ...] }
//   500 → { detail: '...' }
// El servicio normaliza tanto la respuesta como los errores para que la vista
// no tenga que conocer la forma exacta del payload.
// ──────────────────────────────────────────────────────────────────────────

import api from '@/api/client'

// Endpoint previsto para la ingestión ASIC. Fuente única de verdad.
export const ENDPOINT = '/integraciones/xm/asic/upload'

/**
 * Sube un archivo de contratos ASIC de XM al backend para su ingestión.
 *
 * @param {File} file  Archivo Excel (.xlsx/.xls) o CSV seleccionado por el usuario.
 * @returns {Promise<object>} Respuesta normalizada del backend
 *          (p. ej. { procesados, filas, contratos, advertencias }).
 * @throws  Rechaza con el error de axios; usa `parseUploadError` para el mensaje.
 */
export async function uploadASICContracts(file) {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo para cargar.')
  }

  const form = new FormData()
  form.append('file', file, file.name)

  const { data } = await api.post(ENDPOINT, form, {
    // El interceptor de `@/api/client` ya remueve el Content-Type cuando el
    // body es FormData (para que el navegador ponga el boundary), pero lo
    // declaramos explícito por claridad y consistencia con el resto de subidas.
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

/**
 * Extrae un mensaje y (si existen) los errores de validación estructurados de
 * un error de axios. El backend puede devolver `detail` como string o como un
 * arreglo de errores por fila/columna (estilo FastAPI).
 *
 * @param {any} err  Error capturado de `uploadASICContracts`.
 * @param {string} [fallback]  Mensaje por defecto cuando no hay detalle.
 * @returns {{ message: string, validationErrors: Array<{ fila?: number|string, columna?: string, msg: string }> }}
 */
export function parseUploadError(err, fallback = 'No se pudo procesar el archivo ASIC.') {
  const detail = err?.response?.data?.detail

  // Arreglo de errores estructurados (validación por fila/columna).
  if (Array.isArray(detail)) {
    const validationErrors = detail.map((d) => ({
      fila: d.fila ?? (Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : undefined),
      columna: d.columna ?? (Array.isArray(d.loc) ? d.loc.join(' › ') : undefined),
      msg: d.msg || d.message || String(d),
    }))
    return {
      message: `Se encontraron ${validationErrors.length} problema(s) de validación en el archivo.`,
      validationErrors,
    }
  }

  // Detalle simple (string) o error de red / genérico.
  const message = (typeof detail === 'string' && detail)
    || err?.response?.data?.message
    || err?.message
    || fallback

  return { message, validationErrors: [] }
}

export default { uploadASICContracts, parseUploadError, ENDPOINT }
