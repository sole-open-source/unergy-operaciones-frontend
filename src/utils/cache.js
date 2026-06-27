/**
 * Capa de caché genérica con expiración por TTL y persistencia en localStorage.
 *
 * Todas las entradas se guardan bajo el prefijo `samantha:cache:` con la forma
 * `{ value, expiresAt }`. Si localStorage no está disponible (modo privado,
 * cuota llena, SSR) se degrada de forma transparente a un `Map` en memoria.
 *
 * Escrito sin `export default` ni `export { ... }` a propósito: el test
 * (`cache.test.mjs`) evalúa el código fuente quitando `export const` /
 * `export function`, igual que `conciliacionMandatos.test.mjs`.
 */

export const PREFIX = 'samantha:cache:'

// TTL por defecto según volatilidad del dato.
export const STATIC_TTL = 24 * 60 * 60 * 1000 // 24 h — catálogos que casi nunca cambian
export const SEMI_STATIC_TTL = 60 * 60 * 1000 // 1 h — listas de apoyo (proyectos, clientes…)

/** Una entrada está expirada si no existe o su `expiresAt` ya pasó. */
export function isExpired(entry) {
  return !entry || typeof entry.expiresAt !== 'number' || Date.now() >= entry.expiresAt
}

/**
 * Crea un gestor de caché con un prefijo de namespace dado.
 * Devuelve un objeto con la API pública; toda interacción con localStorage va
 * envuelta en try/catch y cae a un Map en memoria ante cualquier fallo.
 */
export function createCacheManager(prefix = PREFIX) {
  const memory = new Map() // respaldo cuando localStorage falla
  let useMemory = false // una vez que falla, no reintentamos en cada llamada

  const full = (key) => prefix + key

  function _setRaw(fullKey, raw) {
    if (!useMemory) {
      try {
        localStorage.setItem(fullKey, raw)
        return
      } catch {
        useMemory = true // cuota llena / modo privado → memoria
      }
    }
    memory.set(fullKey, raw)
  }

  function _getRaw(fullKey) {
    if (!useMemory) {
      try {
        return localStorage.getItem(fullKey)
      } catch {
        useMemory = true
      }
    }
    return memory.has(fullKey) ? memory.get(fullKey) : null
  }

  function _removeRaw(fullKey) {
    if (!useMemory) {
      try {
        localStorage.removeItem(fullKey)
      } catch {
        useMemory = true
      }
    }
    memory.delete(fullKey)
  }

  /** Lista las claves persistidas (con prefijo completo) en el backend activo. */
  function _keys() {
    if (!useMemory) {
      try {
        const out = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k != null && k.startsWith(prefix)) out.push(k)
        }
        return out
      } catch {
        useMemory = true
      }
    }
    return Array.from(memory.keys()).filter((k) => k.startsWith(prefix))
  }

  /**
   * Devuelve `{ value, expiresAt }` o `null`. Auto-elimina entradas expiradas
   * o corruptas.
   */
  function get(key) {
    const fullKey = full(key)
    const raw = _getRaw(fullKey)
    if (raw == null) return null
    let entry
    try {
      entry = JSON.parse(raw)
    } catch {
      _removeRaw(fullKey) // valor corrupto
      return null
    }
    if (isExpired(entry)) {
      _removeRaw(fullKey)
      return null
    }
    return entry
  }

  /** Guarda `value` con expiración `Date.now() + ttlMs`. */
  function set(key, value, ttlMs = SEMI_STATIC_TTL) {
    const entry = { value, expiresAt: Date.now() + ttlMs }
    try {
      _setRaw(full(key), JSON.stringify(entry))
    } catch {
      // value no serializable — ignoramos silenciosamente, la capa superior
      // simplemente volverá a pedir el dato a la red.
    }
    return entry
  }

  /** Elimina una sola clave. */
  function invalidate(key) {
    _removeRaw(full(key))
  }

  /**
   * Elimina todas las claves cuyo nombre lógico empieza por `subPrefix`
   * (p. ej. `invalidatePrefix('refdata:')`).
   */
  function invalidatePrefix(subPrefix) {
    const target = prefix + subPrefix
    for (const k of _keys()) {
      if (k.startsWith(target)) _removeRaw(k)
    }
  }

  /** Elimina todo lo gestionado por este namespace. */
  function clearAll() {
    for (const k of _keys()) _removeRaw(k)
  }

  return { get, set, invalidate, invalidatePrefix, clearAll, isExpired, prefix }
}

/** Instancia singleton compartida por toda la app. */
export const cache = createCacheManager()
