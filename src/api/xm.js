import axios from 'axios'

// El FTP de XM solo acepta conexiones desde IPs conocidas — Railway no
// puede llegar ahí directo, así que estas llamadas van al agente local
// que la usuaria corre en su propio computador (ver
// unergy-operaciones-backend/local_agent/README.md), no al backend en
// Railway. Por eso esta instancia de axios es independiente de la de
// `./client.js`: no lleva baseURL de la plataforma ni el interceptor de
// autenticación (el agente local no requiere token, solo acepta
// conexiones desde localhost).
const agenteLocal = axios.create({
  baseURL: 'http://127.0.0.1:8420',
  timeout: 10000,
})

export function iniciarDescargaXM(payload) {
  return agenteLocal.post('/descargas', payload).then((r) => r.data)
}

export function consultarEstadoXM(jobId) {
  return agenteLocal.get(`/descargas/${jobId}`).then((r) => r.data)
}

export function descargarArchivoXM(jobId, formato) {
  return agenteLocal
    .get(`/descargas/${jobId}/archivo`, { params: { formato }, responseType: 'blob' })
    .then((r) => r.data)
}

export function agenteLocalNoDisponible(error) {
  return !error.response
}
