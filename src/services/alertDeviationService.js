// ──────────────────────────────────────────────────────────────────────────
// alertDeviationService — gestión de reglas de alerta de "Desviación de
// Generación vs. Compromiso PPA" y consulta/resolución de las alertas activas
// que dichas reglas producen.
//
// NOTA sobre backend: al momento de escribir esto, unergy-operaciones-backend
// (montado en /api/v1 vía @/api/client) NO expone todavía los endpoints de
// reglas de desviación ni de evaluación en tiempo real. Igual que
// reportAggregatorService, este servicio arranca en modo MOCK (in-memory,
// coherente y realista) y deja cableadas las rutas reales para el día en que se
// implementen. La UI ofrece un toggle Mock / Real (ver setUseMock).
//
// IMPORTANTE: las rutas van SIN el prefijo /api/v1 porque el cliente axios ya
// lo antepone vía baseURL. El spec las describe como /api/v1/alertas/... pero la
// forma correcta contra @/api/client es /alertas/...
// ──────────────────────────────────────────────────────────────────────────

import api from '@/api/client'

// Endpoints previstos (aún no disponibles en el backend). Fuente única de verdad
// para cuando se implementen.
export const ENDPOINTS = {
  rules: '/alertas/desviacion-generacion-rules',
  alerts: '/alertas/desviacion-generacion',
}

// ── Modo Mock / Real ────────────────────────────────────────────────────────
// Por defecto MOCK, porque los endpoints reales aún no existen. Cuando el
// backend los publique, llamar setUseMock(false) (o exponer un toggle en la UI).
let useMock = true
export function setUseMock(v) { useMock = !!v }
export function isMock() { return useMock }

// ── Almacén mock in-memory ──────────────────────────────────────────────────
// Se siembra con datos coherentes para que la UI sea plenamente funcional y
// testeable sin backend. Los IDs se generan con un contador (sin Math.random,
// para determinismo entre recargas dentro de la misma sesión).
let _idSeq = 100
function nextId() { return ++_idSeq }

let _mockRules = [
  {
    id: 1,
    ppa_id: null,
    ppa_nombre: 'PPA Planta Laureles',
    proyecto_id: null,
    proyecto_nombre: 'Planta Laureles',
    umbral_desviacion_pct: 10,
    periodo_comparacion_horas: 4,
    activa: true,
  },
  {
    id: 2,
    ppa_id: null,
    ppa_nombre: 'PPA Solar Girardota',
    proyecto_id: null,
    proyecto_nombre: 'Solar Girardota',
    umbral_desviacion_pct: 15,
    periodo_comparacion_horas: 6,
    activa: true,
  },
]

let _mockAlerts = [
  {
    id: 1,
    ppa_nombre: 'PPA Planta Laureles',
    proyecto_nombre: 'Planta Laureles',
    desviacion_pct: -18.4,
    generacion_real_kwh: 32640,
    generacion_comprometida_kwh: 40000,
    periodo_inicio: '2026-07-11T08:00:00',
    periodo_fin: '2026-07-11T12:00:00',
    estado: 'activa',
  },
  {
    id: 2,
    ppa_nombre: 'PPA Solar Girardota',
    proyecto_nombre: 'Solar Girardota',
    desviacion_pct: -22.1,
    generacion_real_kwh: 21030,
    generacion_comprometida_kwh: 27000,
    periodo_inicio: '2026-07-11T10:00:00',
    periodo_fin: '2026-07-11T16:00:00',
    estado: 'activa',
  },
]

// Simula la latencia de red para que la UI ejerza su ruta async/loading real.
function mockDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), 250))
}

// ── Reglas de desviación (CRUD) ─────────────────────────────────────────────

/** GET /alertas/desviacion-generacion-rules → lista de reglas. */
export async function getDeviationRules() {
  if (useMock) return mockDelay(_mockRules.map((r) => ({ ...r })))
  const { data } = await api.get(ENDPOINTS.rules)
  return Array.isArray(data) ? data : (data.items ?? [])
}

/** POST /alertas/desviacion-generacion-rules → crea una regla. */
export async function createDeviationRule(ruleData) {
  if (useMock) {
    const nueva = { id: nextId(), activa: true, ...ruleData }
    _mockRules = [..._mockRules, nueva]
    return mockDelay({ ...nueva })
  }
  const { data } = await api.post(ENDPOINTS.rules, ruleData)
  return data
}

/** PUT /alertas/desviacion-generacion-rules/{id} → actualiza una regla. */
export async function updateDeviationRule(id, ruleData) {
  if (useMock) {
    _mockRules = _mockRules.map((r) => (r.id === id ? { ...r, ...ruleData, id } : r))
    return mockDelay(_mockRules.find((r) => r.id === id))
  }
  const { data } = await api.put(`${ENDPOINTS.rules}/${id}`, ruleData)
  return data
}

/** DELETE /alertas/desviacion-generacion-rules/{id} → elimina una regla. */
export async function deleteDeviationRule(id) {
  if (useMock) {
    _mockRules = _mockRules.filter((r) => r.id !== id)
    return mockDelay(true)
  }
  await api.delete(`${ENDPOINTS.rules}/${id}`)
  return true
}

// ── Alertas activas (evaluación) ────────────────────────────────────────────

/** GET /alertas/desviacion-generacion → alertas de desviación activas. */
export async function getActiveDeviationAlerts() {
  if (useMock) return mockDelay(_mockAlerts.map((a) => ({ ...a })))
  const { data } = await api.get(ENDPOINTS.alerts)
  return Array.isArray(data) ? data : (data.items ?? [])
}

/** PATCH /alertas/desviacion-generacion/{id}/resolve → marca una alerta resuelta. */
export async function resolveDeviationAlert(id) {
  if (useMock) {
    _mockAlerts = _mockAlerts.map((a) => (a.id === id ? { ...a, estado: 'resuelta' } : a))
    return mockDelay(_mockAlerts.find((a) => a.id === id))
  }
  const { data } = await api.patch(`${ENDPOINTS.alerts}/${id}/resolve`)
  return data
}

export default {
  ENDPOINTS,
  setUseMock,
  isMock,
  getDeviationRules,
  createDeviationRule,
  updateDeviationRule,
  deleteDeviationRule,
  getActiveDeviationAlerts,
  resolveDeviationAlert,
}
