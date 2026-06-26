/**
 * Composable para documentos de Arriendos — persistencia en backend.
 *
 * docsPorProyecto: Map reactivo {arr_proyecto_id → ArrDocumento[]}
 * Cargado desde GET /arriendos/documentos/{periodo} al llamar loadDocs(periodo).
 */
import { ref } from 'vue'
import api from '@/api/client'

// Estado reactivo compartido: { [arr_proyecto_id]: ArrDocumento[] }
export const docsPorProyecto = ref({})

/**
 * Carga los documentos del período desde el backend y actualiza docsPorProyecto.
 */
export async function loadDocs(periodo) {
  try {
    const { data } = await api.get(`/arriendos/documentos/${periodo}`)
    const agrupado = {}
    for (const doc of data) {
      if (!agrupado[doc.arr_proyecto_id]) agrupado[doc.arr_proyecto_id] = []
      agrupado[doc.arr_proyecto_id].push(doc)
    }
    docsPorProyecto.value = agrupado
  } catch (err) {
    console.error('Error cargando documentos arriendos:', err)
    docsPorProyecto.value = {}
  }
}

/**
 * Sube un documento (principal + opcional secundario) al backend.
 * Retorna el id del documento creado/actualizado.
 */
export async function uploadDoc({ file, fileSecundario, arrProyectoId, periodo, pagoId, codigoContrato, tipoDocumento, nombreResultante }) {
  const form = new FormData()
  form.append('arr_proyecto_id',  arrProyectoId)
  form.append('periodo',          periodo)
  form.append('pago_id',          pagoId)
  form.append('codigo_contrato',  codigoContrato)
  form.append('tipo_documento',   tipoDocumento)
  form.append('nombre_resultante',nombreResultante)
  form.append('file', file, nombreResultante)
  if (fileSecundario) {
    form.append('file_secundario', fileSecundario, fileSecundario.name)
  }
  const { data } = await api.post('/arriendos/documentos/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Sube UNA cuenta de cobro y la asocia a MÚLTIPLES predios.
 * El archivo se guarda una sola vez en backend; se crea una fila por predio.
 *
 * @param {object}   p
 * @param {File}     p.file
 * @param {File|null}p.fileSecundario
 * @param {string}   p.periodo
 * @param {number}   p.pagoId
 * @param {string}   p.codigoContrato
 * @param {string}   p.tipoDocumento
 * @param {string}   p.nombreResultante
 * @param {string|null} p.numeroCuentaCobro
 * @param {string|null} p.nombreArrendatario
 * @param {Array<{arr_proyecto_id:number, codigo_predio:string, valor_individual:number|null}>} p.predios
 */
export async function uploadCuentaCobro({
  file, fileSecundario, periodo, pagoId, codigoContrato, tipoDocumento,
  nombreResultante, numeroCuentaCobro, nombreArrendatario, predios,
}) {
  const form = new FormData()
  form.append('periodo',           periodo)
  form.append('pago_id',           pagoId)
  form.append('codigo_contrato',   codigoContrato)
  form.append('tipo_documento',    tipoDocumento)
  form.append('nombre_resultante', nombreResultante)
  form.append('predios',           JSON.stringify(predios))
  if (numeroCuentaCobro) form.append('numero_cuenta_cobro', numeroCuentaCobro)
  if (nombreArrendatario) form.append('nombre_arrendatario', nombreArrendatario)
  form.append('file', file, nombreResultante)
  if (fileSecundario) {
    form.append('file_secundario', fileSecundario, fileSecundario.name)
  }
  const { data } = await api.post('/arriendos/documentos/upload-cuenta-cobro', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Descarga el PDF de un documento desde el backend.
 */
export async function downloadDoc(docId, nombreArchivo) {
  const resp = await api.get(`/arriendos/documentos/file/${docId}`, { responseType: 'blob' })
  const url  = URL.createObjectURL(resp.data)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nombreArchivo
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Elimina un documento del backend y remueve del estado local.
 */
export async function deleteDoc(docId) {
  await api.delete(`/arriendos/documentos/${docId}`)
  // Limpiar de estado reactivo
  for (const proyectoId of Object.keys(docsPorProyecto.value)) {
    docsPorProyecto.value[proyectoId] = docsPorProyecto.value[proyectoId].filter(d => d.id !== docId)
    if (!docsPorProyecto.value[proyectoId].length) delete docsPorProyecto.value[proyectoId]
  }
}
