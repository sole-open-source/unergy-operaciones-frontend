// ── Servicio de Web Worker ──────────────────────────────────────────────────────
// Envoltura simple sobre un único `fileProcessor.worker.js` para descargar del hilo
// principal el trabajo pesado de archivos (ZIP, PDF, XLSX). Expone una API basada en
// promesas: cada llamada envía un mensaje con un id incremental y se resuelve cuando
// el worker responde con ese mismo id.
//
//   import workerService from '@/utils/workers/workerService'
//   const { grupos } = await workerService.postMessage('processZip', { file, proyectos })
//
// El worker se crea de forma perezosa en la primera llamada y se reutiliza. Si el
// worker muere por un error fatal, se descarta y la siguiente llamada crea uno nuevo.

class FileWorkerService {
  constructor() {
    this.worker = null
    this.pending = new Map()   // id → { resolve, reject }
    this.seq = 0
  }

  // Crea (o reutiliza) el worker subyacente.
  _ensureWorker() {
    if (this.worker) return this.worker

    const worker = new Worker(
      new URL('./fileProcessor.worker.js', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (e) => {
      const { id, ok, result, error } = e.data || {}
      const entry = this.pending.get(id)
      if (!entry) return
      this.pending.delete(id)
      if (ok) entry.resolve(result)
      else entry.reject(new Error(error || 'Error en el procesamiento del archivo'))
    }

    // Error fatal del worker: rechaza todo lo pendiente y descarta el worker para
    // que la próxima llamada arranque uno limpio.
    const failAll = (msg) => {
      const err = new Error(msg)
      for (const { reject } of this.pending.values()) reject(err)
      this.pending.clear()
      this._teardown()
    }
    worker.onerror = (e) => failAll(e.message || 'El worker de archivos falló')
    worker.onmessageerror = () => failAll('No se pudo deserializar el mensaje del worker')

    this.worker = worker
    return worker
  }

  _teardown() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }

  /**
   * Envía una tarea al worker y devuelve una promesa con el resultado.
   * @param {string} type    Operación: 'processZip' | 'parseFacturas' | 'parseSemanales' | 'parseTxr' | 'parseMensual'
   * @param {object} payload Datos de entrada (File/Blob/arrays — clonables por estructura).
   * @returns {Promise<any>}
   */
  postMessage(type, payload = {}) {
    const worker = this._ensureWorker()
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      try {
        worker.postMessage({ id, type, payload })
      } catch (err) {
        this.pending.delete(id)
        reject(err)
      }
    })
  }

  // Alias semántico equivalente a postMessage.
  run(type, payload) {
    return this.postMessage(type, payload)
  }
}

const workerService = new FileWorkerService()
export default workerService
export { FileWorkerService }
