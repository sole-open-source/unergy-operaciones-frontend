import api from '@/api/client'

// Servicio de documentos de cliente.
//
// Los archivos se guardan en el almacenamiento seguro de Unergy (S3) a través
// del backend. El flujo real del backend es de dos pasos, igual que el usado en
// ClienteDetailView.vue:
//   1. Crear el registro del documento         → POST /clientes/{id}/documentos
//   2. Adjuntar el archivo al registro (S3)     → POST /clientes/{id}/documentos/{docId}/archivo
// Este servicio encapsula ambos pasos en una sola llamada.

// Tipos y tamaño aceptados (mismos que el diálogo de documentos existente).
export const DOCUMENTO_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
// 20 MB — mismo tope que muestra el subidor de ClienteDetailView.vue, para que
// un archivo válido en la ficha no sea rechazado al crear el cliente.
export const DOCUMENTO_MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const EXT_PERMITIDAS = ['pdf', 'jpg', 'jpeg', 'png', 'webp']

// Valida un archivo en el frontend antes de subirlo.
// Devuelve un mensaje de error, o null si el archivo es válido.
export function validarArchivo(file) {
  if (!file) return 'No se seleccionó ningún archivo'
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !EXT_PERMITIDAS.includes(ext)) {
    return `Tipo de archivo no permitido (.${ext || '?'}). Usa PDF, JPG, PNG o WEBP.`
  }
  if (file.size > DOCUMENTO_MAX_SIZE) {
    return `El archivo supera el tamaño máximo de ${DOCUMENTO_MAX_SIZE / 1024 / 1024} MB.`
  }
  return null
}

// Sube un documento de un cliente al almacenamiento seguro de Unergy.
// Crea el registro del documento y, si se entrega un archivo, lo adjunta.
// Devuelve la referencia del documento tal como la conoce el backend
// (incluye id, nombre y archivo_url/archivo_nombre cuando ya está disponible).
export async function uploadClienteDocumento(clienteId, { tipo, nombre, estado = 'aceptado', file }) {
  const { data: doc } = await api.post(`/clientes/${clienteId}/documentos`, {
    tipo,
    nombre,
    estado,
  })

  if (!file) return doc

  const fd = new FormData()
  fd.append('archivo', file)
  const { data: actualizado } = await api.post(
    `/clientes/${clienteId}/documentos/${doc.id}/archivo`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  // El endpoint de archivo devuelve el documento actualizado con la URL segura.
  return actualizado ?? doc
}
