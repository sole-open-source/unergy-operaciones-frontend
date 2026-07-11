import api from '@/api/client'

/**
 * Capa de servicio para los datos de medición de una frontera (generación /
 * consumo en MWh) con atribución de fuente (XM / SIDER / Manual).
 *
 * Convenciones del repo:
 *  - Reutiliza la instancia compartida `@/api/client`, que ya inyecta el token
 *    de autenticación y maneja 401/403. NO se crea un axios nuevo (a diferencia
 *    de `@/api/xm`, que apunta al agente local en 127.0.0.1 y por eso sí es
 *    independiente).
 *  - Las funciones puras de parseo (`parse*`, `normalizar*`, `format*`) no
 *    dependen de `api`, para poder probarlas con el patrón `node --test` del
 *    repo (ver `fronterasService.test.mjs`).
 *
 * Contrato esperado del backend (endpoints por implementar en
 * unergy-operaciones-backend):
 *  - GET  /fronteras/:id/mediciones/ultimas
 *      → { ultima: Registro|null, recientes: Registro[] }  ó  {} / null si vacío
 *  - GET  /fronteras/:id/mediciones/historico?desde&hasta&tipo
 *      → { registros: Registro[] }  ó  Registro[]
 *  - POST /fronteras/:id/mediciones/sincronizar-xm
 *      → { job_id?, mensaje? }
 *  donde Registro = { valor_mwh, tipo, fuente, fecha_registro }
 *  tipo   ∈ { generacion, consumo }
 *  fuente ∈ { XM, SIDER, MANUAL }
 *
 * Escenario "sin datos": cuando XM aún no ha liquidado el período, el backend
 * responde vacío (p. ej. `{ detail: 'LiquidacionXMDato vacía' }`, `null`, `{}`
 * o listas vacías). Los parsers lo detectan y devuelven `disponible: false`
 * para que la UI muestre el estado vacío con botón "Sincronizar".
 */

// ── Metadatos de fuentes (badge/severity para PrimeVue Tag) ────────────────────
export const FUENTE_META = {
  XM:     { label: 'XM',     severity: 'info',      color: '#3B82F6' },
  SIDER:  { label: 'SIDER',  severity: 'warn',      color: '#CA8A04' },
  MANUAL: { label: 'Manual', severity: 'secondary', color: '#6B7280' },
}

const TIPO_LABEL = { generacion: 'Generación', consumo: 'Consumo' }

// Normaliza la fuente a una de las claves canónicas de FUENTE_META.
// Cualquier valor desconocido/ausente cae en MANUAL (registro cargado a mano).
export function normalizarFuente(raw) {
  const s = (raw ?? '').toString().trim().toUpperCase()
  if (s === 'XM') return 'XM'
  if (s === 'SIDER') return 'SIDER'
  return 'MANUAL'
}

export function metaFuente(fuente) {
  return FUENTE_META[normalizarFuente(fuente)]
}

// Normaliza el tipo (generacion/consumo). Tolera acentos y mayúsculas.
export function normalizarTipo(raw) {
  const s = (raw ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.startsWith('consum')) return 'consumo'
  if (s.startsWith('generac') || s.startsWith('gen')) return 'generacion'
  return s || null
}

// ¿La respuesta del backend representa "sin datos" (LiquidacionXMDato vacía)?
export function esRespuestaVacia(raw) {
  if (raw == null) return true
  if (Array.isArray(raw)) return raw.length === 0
  if (typeof raw === 'object') {
    const detail = (raw.detail || raw.mensaje || '').toString().toLowerCase()
    if (detail.includes('vac') || detail.includes('sin datos') || detail.includes('no data')) return true
    // Objeto sin ninguna medición útil (ni ultima ni registros/recientes con datos).
    const tieneUltima = raw.ultima != null && (raw.ultima.valor_mwh != null || raw.ultima.valor != null)
    const lista = raw.recientes || raw.registros || []
    if (!tieneUltima && (!Array.isArray(lista) || lista.length === 0) && raw.valor_mwh == null && raw.valor == null) {
      return true
    }
  }
  return false
}

// Convierte un registro crudo del backend a la forma que consume la UI, o
// devuelve null si el registro no trae un valor numérico utilizable.
export function parseRegistro(raw) {
  if (!raw || typeof raw !== 'object') return null
  const valorMwh = Number(raw.valor_mwh ?? raw.valor ?? raw.mwh)
  if (!Number.isFinite(valorMwh)) return null
  const fuente = normalizarFuente(raw.fuente)
  const tipo = normalizarTipo(raw.tipo)
  return {
    valorMwh,
    valorKwh: valorMwh * 1000,
    tipo,
    tipoLabel: TIPO_LABEL[tipo] || (tipo ? tipo : '—'),
    fuente,
    fuenteLabel: FUENTE_META[fuente].label,
    fuenteSeverity: FUENTE_META[fuente].severity,
    fuenteColor: FUENTE_META[fuente].color,
    fecha: raw.fecha_registro ?? raw.fecha ?? raw.created_at ?? null,
  }
}

// Parsea la respuesta de "últimas mediciones" a { disponible, ultima, recientes }.
export function parseUltimasMediciones(raw) {
  if (esRespuestaVacia(raw)) return { disponible: false, ultima: null, recientes: [] }

  // El backend puede devolver el registro suelto o envuelto en { ultima, recientes }.
  const recientesRaw = Array.isArray(raw) ? raw : (raw.recientes || raw.registros || [])
  const recientes = (Array.isArray(recientesRaw) ? recientesRaw : [])
    .map(parseRegistro)
    .filter(Boolean)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  let ultima = parseRegistro(raw.ultima) || parseRegistro(raw) || recientes[0] || null
  if (!ultima) return { disponible: false, ultima: null, recientes }
  return { disponible: true, ultima, recientes }
}

// Parsea el histórico a series separadas de generación y consumo, ordenadas por
// fecha ascendente, listas para el gráfico de líneas.
export function parseHistorico(raw) {
  if (esRespuestaVacia(raw)) return { generacion: [], consumo: [] }
  const listaRaw = Array.isArray(raw) ? raw : (raw.registros || raw.recientes || [])
  const registros = (Array.isArray(listaRaw) ? listaRaw : [])
    .map(parseRegistro)
    .filter(r => r && r.fecha)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  return {
    generacion: registros.filter(r => r.tipo === 'generacion').map(r => ({ fecha: r.fecha, valorMwh: r.valorMwh, fuente: r.fuente })),
    consumo: registros.filter(r => r.tipo === 'consumo').map(r => ({ fecha: r.fecha, valorMwh: r.valorMwh, fuente: r.fuente })),
  }
}

// Formatea un valor en MWh, degradando a kWh cuando es pequeño (mismo criterio
// que GeneracionMensualChart).
export function formatMedicionValor(mwh) {
  if (mwh == null || !Number.isFinite(Number(mwh))) return '—'
  const n = Number(mwh)
  if (Math.abs(n) < 1) return `${(n * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} kWh`
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 3 })} MWh`
}

export function formatMedicionFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString('es-CO')
}

// ── Llamadas al backend ────────────────────────────────────────────────────────
export function getFronteraMeasurements(id) {
  return api.get(`/fronteras/${id}/mediciones/ultimas`).then((r) => parseUltimasMediciones(r.data))
}

export function getMeasurementHistory(id, { startDate, endDate, tipo } = {}) {
  const params = {}
  if (startDate) params.desde = startDate
  if (endDate) params.hasta = endDate
  if (tipo) params.tipo = tipo
  return api.get(`/fronteras/${id}/mediciones/historico`, { params }).then((r) => parseHistorico(r.data))
}

export function triggerXMIngestion(fronteraId) {
  return api.post(`/fronteras/${fronteraId}/mediciones/sincronizar-xm`, {}).then((r) => r.data)
}

export default {
  getFronteraMeasurements,
  getMeasurementHistory,
  triggerXMIngestion,
  FUENTE_META,
  metaFuente,
}
