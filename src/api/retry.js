// ── Política de reintentos para errores 5xx transitorios ─────────────────────
// Un 502/503/504 suele ser un hiccup del gateway o el backend reiniciándose.
// Reintentamos las peticiones IDEMPOTENTES (sin efectos secundarios duplicados)
// hasta `MAX_RETRIES` veces con espera exponencial antes de propagar el error.
//
// Extraído de client.js para poder probar la decisión y el backoff sin tener
// que instanciar axios (ver retry.test.mjs).

export const MAX_RETRIES = 3
export const RETRY_STATUSES = [502, 503, 504]

// Solo métodos idempotentes: reintentar un POST/PUT/PATCH/DELETE podría
// duplicar una operación con efectos secundarios. GET es el caso real de la app.
export const RETRYABLE_METHODS = ['get']

// Espera exponencial con tope y jitter leve: ~0.5s, 1s, 2s (máx 4s + jitter).
// `attempt` empieza en 1. `rand` es inyectable para pruebas deterministas.
export function backoffDelay(attempt, rand = Math.random) {
  return Math.min(500 * 2 ** (attempt - 1), 4000) + rand() * 100
}

// ¿Debe reintentarse esta respuesta fallida? `attempt` es el número del intento
// de reintento que se está por hacer (1 = primer reintento).
//
// Nota: los timeouts y errores de red no traen `status` (undefined), así que NO
// se reintentan aquí — un backend caído surge el error tras un solo timeout en
// vez de encadenar varios. Solo reintentamos 5xx *recibidos* (502/503/504), que
// el gateway suele devolver rápido. 500 queda fuera a propósito: suele ser un
// bug de la app (determinista), no un hiccup transitorio.
export function shouldRetry(method, status, attempt) {
  const m = (method || 'get').toLowerCase()
  return (
    RETRYABLE_METHODS.includes(m) &&
    RETRY_STATUSES.includes(status) &&
    attempt >= 1 &&
    attempt <= MAX_RETRIES
  )
}
