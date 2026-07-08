import api from './client'

// Módulo centralizado para los datos de Finanzas.
//
// El listado maestro de proyectos con arriendo dejó de vivir en el JSON
// estático `src/data/pagoarriendos.json`; ahora se deriva del backend. El
// endpoint de cálculo (`/arriendos/calculo/{periodo}`) es la fuente de verdad
// de qué proyectos tienen canon de arrendamiento — es el mismo que consumen
// ArriendosOperaciones y ArriendosProveedor —, así que de ahí obtenemos el
// listado que necesita la pestaña de Info.
//
// Usa la instancia compartida de axios (`./client`), que ya aplica la baseURL
// (VITE_API_BASE_URL), el token de autenticación y los interceptores comunes.

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Devuelve los proyectos con pago de arriendo en el formato
// { Codigo, Proyecto } que consumen las vistas de Arriendos (mismo shape que
// tenía el JSON estático, para no romper la lógica que ya lo consumía).
export async function getPagoArriendos() {
  const { data } = await api.get(`/arriendos/calculo/${periodoActual()}`)
  return (data.filas || []).map((f) => ({
    Codigo: f.codigo ?? null,
    Proyecto: f.proyecto,
  }))
}
