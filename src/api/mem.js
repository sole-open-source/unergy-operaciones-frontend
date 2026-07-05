import api from './client'

// API del módulo MEM (Mercado de Energía Mayorista).
//
// El balance energético propio vive bajo el módulo de cumplimiento del backend
// (`/cumplimiento/balance-energetico`). Ojo: la instancia de axios de
// `client.js` ya lleva el baseURL `/api/v1`, así que la ruta aquí es relativa
// a él — NO se antepone `/api/v1` de nuevo.
//
// El endpoint puede no estar desplegado todavía. En ese caso (404/500 o red
// caída) devolvemos una estructura vacía marcada como `disponible: false` para
// que la vista degrade con gracia en lugar de romperse.

/**
 * Obtiene el balance energético propio de Unergy para un mes/año.
 * @param {number} mes  Mes (1-12)
 * @param {number} anio Año (ej. 2026)
 * @returns {Promise<{items: Array, precio_bolsa_promedio: number, disponible: boolean}>}
 */
export async function fetchBalanceEnergetico(mes, anio) {
  try {
    const { data } = await api.get('/cumplimiento/balance-energetico', {
      params: { mes, anio },
    })
    return normalizarBalance(data)
  } catch (err) {
    const status = err.response?.status
    // 404 = endpoint aún no desplegado; 500 = fallo del servicio; sin
    // `response` = red/agente caído. En todos devolvemos vacío controlado.
    if (status === 404 || status === 500 || !err.response) {
      return { items: [], precio_bolsa_promedio: 0, disponible: false }
    }
    // Errores como 401/403 los propagamos: el interceptor de client.js ya los
    // maneja (logout / toast de permisos).
    throw err
  }
}

// El backend puede devolver un arreglo plano de contratos o un objeto con los
// totales. Normalizamos a una forma estable para la vista.
function normalizarBalance(data) {
  if (Array.isArray(data)) {
    return { items: data, precio_bolsa_promedio: 0, disponible: true }
  }
  const items = data?.contratos || data?.items || []
  return {
    items,
    precio_bolsa_promedio: Number(data?.precio_bolsa_promedio) || 0,
    disponible: true,
  }
}
