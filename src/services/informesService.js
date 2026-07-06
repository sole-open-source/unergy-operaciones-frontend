// ──────────────────────────────────────────────────────────────────────────
// informesService — gestión de informes mensuales FALTANTES.
//
// Permite listar los informes que un proyecto/período debería tener y aún no se
// han generado, registrar la razón de la ausencia, justificarlos y convertir un
// faltante en un borrador de informe (que luego se completa en el wizard).
//
// NOTA sobre backend: al igual que reportAggregatorService, el backend de la
// plataforma (unergy-operaciones-backend, montado en /api/v1 vía @/api/client)
// puede no exponer todavía las rutas de faltantes. Por eso el servicio intenta
// SIEMPRE la ruta real y, si ésta no está disponible (404 / red / 501), degrada
// de forma transparente a un almacén MOCK persistido en localStorage. El día que
// el backend implemente los endpoints (@/api/client → FALTANTES_ENDPOINTS) el
// servicio los usará sin cambios en la UI.
// ──────────────────────────────────────────────────────────────────────────

import api, { FALTANTES_ENDPOINTS } from '@/api/client'

export const ENDPOINTS = FALTANTES_ENDPOINTS

// Estados posibles de un faltante.
export const ESTADO = {
  NO_JUSTIFICADO: 'no_justificado',
  JUSTIFICADO: 'justificado',
  CONVERTIDO: 'convertido', // ya se generó un borrador a partir del faltante
}

export const ESTADO_LABEL = {
  [ESTADO.NO_JUSTIFICADO]: 'No justificado',
  [ESTADO.JUSTIFICADO]: 'Justificado',
  [ESTADO.CONVERTIDO]: 'Borrador generado',
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Etiqueta legible del período de un faltante ("Mayo 2026"). */
export function periodoLabel(f) {
  if (!f || !f.mes || !f.anio) return '—'
  return `${MESES[f.mes - 1] || f.mes} ${f.anio}`
}

// ── Almacén MOCK (localStorage) ─────────────────────────────────────────────
// Se activa cuando el backend no expone el endpoint. Persiste entre recargas
// para que el flujo (registrar → justificar → convertir) sea verificable en el
// frontend sin depender del servidor.
const LS_KEY = 'unergy_informes_faltantes_mock'
let _mockMode = false
let _seq = 1000

function _now() {
  return new Date().toISOString()
}

function _readStore() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupto → re-sembrar */ }
  const seed = _seedStore()
  _writeStore(seed)
  return seed
}

function _writeStore(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)) } catch { /* cuota llena, ignorar */ }
  // Mantener la secuencia por encima del mayor id existente.
  for (const it of items) {
    const n = Number(it.id)
    if (Number.isFinite(n) && n >= _seq) _seq = n + 1
  }
}

// Semilla mínima y realista para el mes anterior al actual.
function _seedStore() {
  const d = new Date()
  let mes = d.getMonth() // 0-based del mes actual → mes anterior (1..12 al sumar +1 y restar 1)
  let anio = d.getFullYear()
  if (mes === 0) { mes = 12; anio -= 1 } // enero → diciembre del año anterior
  const base = { anio, mes, estado: ESTADO.NO_JUSTIFICADO, razon: '', informe_id: null, created_at: _now(), updated_at: _now() }
  return [
    { id: ++_seq, sub_project: 'PROYECTO_DEMO_1', proyecto_nombre: 'Granja Solar La Esperanza', ...base },
    { id: ++_seq, sub_project: 'PROYECTO_DEMO_2', proyecto_nombre: 'Autogeneración Industrias del Valle', ...base },
    { id: ++_seq, sub_project: 'PROYECTO_DEMO_3', proyecto_nombre: 'Parque Fotovoltaico El Retiro', ...base, estado: ESTADO.JUSTIFICADO, razon: 'Contrato O&M inició el día 20; sin mes completo para reportar.' },
  ]
}

/** ¿El servicio está operando contra el almacén mock (backend no disponible)? */
export function isMock() {
  return _mockMode
}

// Un error indica "endpoint no disponible" (→ degradar a mock) si no hubo
// respuesta (fallo de red) o el backend respondió 404 / 501 (no implementado).
function _endpointUnavailable(err) {
  const status = err?.response?.status
  return !err?.response || status === 404 || status === 501
}

function _enterMock() {
  if (!_mockMode) _mockMode = true
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Lista los informes faltantes. Acepta filtros opcionales que el backend
 * entiende como query params (estado, sub_project, anio, mes).
 * @returns {Promise<Array>}
 */
export async function listarFaltantes(params = {}) {
  if (!_mockMode) {
    try {
      const { data } = await api.get(ENDPOINTS.list, { params })
      // El backend puede devolver { items: [...] } o un array plano.
      return Array.isArray(data) ? data : (data?.items ?? [])
    } catch (err) {
      if (!_endpointUnavailable(err)) throw err
      _enterMock()
    }
  }
  // Mock: filtra en cliente.
  let items = _readStore()
  if (params.estado) items = items.filter(i => i.estado === params.estado)
  if (params.sub_project) items = items.filter(i => i.sub_project === params.sub_project)
  if (params.anio) items = items.filter(i => Number(i.anio) === Number(params.anio))
  if (params.mes) items = items.filter(i => Number(i.mes) === Number(params.mes))
  return items
}

/**
 * Registra un nuevo faltante con su razón.
 * @param {{sub_project:string, proyecto_nombre?:string, anio:number, mes:number, razon?:string, estado?:string}} payload
 * @returns {Promise<Object>} el faltante creado
 */
export async function registrarFaltante(payload) {
  const body = {
    sub_project: payload.sub_project,
    proyecto_nombre: payload.proyecto_nombre || payload.sub_project,
    anio: Number(payload.anio),
    mes: Number(payload.mes),
    razon: (payload.razon || '').trim(),
    estado: payload.estado || (payload.razon?.trim() ? ESTADO.JUSTIFICADO : ESTADO.NO_JUSTIFICADO),
  }
  if (!_mockMode) {
    try {
      const { data } = await api.post(ENDPOINTS.create, body)
      return data
    } catch (err) {
      if (!_endpointUnavailable(err)) throw err
      _enterMock()
    }
  }
  const items = _readStore()
  // Evitar duplicados (mismo proyecto + período) para imitar el 409 del backend.
  const dup = items.find(i => i.sub_project === body.sub_project && Number(i.anio) === body.anio && Number(i.mes) === body.mes)
  if (dup) {
    const e = new Error('Ya existe un faltante para ese proyecto y período')
    e.response = { status: 409, data: { detail: 'Ya existe un faltante para ese proyecto y período' } }
    throw e
  }
  const nuevo = { id: ++_seq, informe_id: null, created_at: _now(), updated_at: _now(), ...body }
  items.unshift(nuevo)
  _writeStore(items)
  return nuevo
}

/**
 * Actualiza estado y/o razón de un faltante.
 * @param {number|string} id
 * @param {{razon?:string, estado?:string}} cambios
 * @returns {Promise<Object>} el faltante actualizado
 */
export async function actualizarFaltante(id, cambios) {
  if (!_mockMode) {
    try {
      const { data } = await api.patch(ENDPOINTS.update(id), cambios)
      return data
    } catch (err) {
      if (!_endpointUnavailable(err)) throw err
      _enterMock()
    }
  }
  const items = _readStore()
  const idx = items.findIndex(i => String(i.id) === String(id))
  if (idx === -1) {
    const e = new Error('Faltante no encontrado')
    e.response = { status: 404 }
    throw e
  }
  items[idx] = { ...items[idx], ...cambios, updated_at: _now() }
  _writeStore(items)
  return items[idx]
}

/**
 * Convierte un faltante en un borrador de informe. El backend crea el borrador
 * y devuelve su identificador para poder abrir el editor / pre-cargar el wizard.
 * @param {number|string} id
 * @returns {Promise<Object>} { informe_id, sub_project, anio, mes, ... }
 */
export async function convertirEnBorrador(id) {
  if (!_mockMode) {
    try {
      const { data } = await api.post(ENDPOINTS.convertirDraft(id))
      return data
    } catch (err) {
      if (!_endpointUnavailable(err)) throw err
      _enterMock()
    }
  }
  const items = _readStore()
  const idx = items.findIndex(i => String(i.id) === String(id))
  if (idx === -1) {
    const e = new Error('Faltante no encontrado')
    e.response = { status: 404 }
    throw e
  }
  if (items[idx].estado === ESTADO.CONVERTIDO && items[idx].informe_id) {
    const e = new Error('El faltante ya fue convertido a borrador')
    e.response = { status: 409, data: { detail: 'El faltante ya fue convertido a borrador' } }
    throw e
  }
  // En mock no existe un id de informe real → dejamos informe_id nulo para que
  // la UI abra el wizard pre-cargado en vez del editor de un informe inexistente.
  items[idx] = { ...items[idx], estado: ESTADO.CONVERTIDO, informe_id: null, updated_at: _now() }
  _writeStore(items)
  return { ...items[idx] }
}

export default {
  ENDPOINTS,
  ESTADO,
  ESTADO_LABEL,
  periodoLabel,
  isMock,
  listarFaltantes,
  registrarFaltante,
  actualizarFaltante,
  convertirEnBorrador,
}
