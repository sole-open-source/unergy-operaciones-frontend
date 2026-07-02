import api from './client'

export function iniciarDescargaXM(payload) {
  return api.post('/xm/descargas', payload).then((r) => r.data)
}

export function consultarEstadoXM(jobId) {
  return api.get(`/xm/descargas/${jobId}`).then((r) => r.data)
}

export function descargarArchivoXM(jobId, formato) {
  return api
    .get(`/xm/descargas/${jobId}/archivo`, { params: { formato }, responseType: 'blob' })
    .then((r) => r.data)
}
