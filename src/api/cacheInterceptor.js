/**
 * Capa SECUNDARIA y opcional de caché a nivel HTTP para peticiones GET.
 *
 * La capa PRIMARIA recomendada es el store Pinia `useReferenceData`
 * (src/stores/referenceData.js): las vistas deberían consumir ese store. Este
 * módulo existe para endpoints aún no migrados que se quieran cachear sin tocar
 * cada vista.
 *
 * Se ofrecen dos formas:
 *   1) `cachedGet(axiosInstance, url, config, ttlMs)` — envoltorio explícito y
 *      seguro (recomendado): no muta el adapter ni intercepta nada global.
 *   2) `installCacheInterceptor(axiosInstance, opts)` — instala un interceptor
 *      de request que corta en seco los GET cacheados (resolviéndolos desde un
 *      interceptor de error controlado). Solo cachea URLs que casen con
 *      `cacheableUrlPatterns`, para NUNCA cachear listados dinámicos.
 *
 * IMPORTANTE: a propósito NO se llama a `installCacheInterceptor` en
 * `src/api/client.js`. Cablearlo de forma global es arriesgado (cachearía por
 * error endpoints dinámicos como /clientes o /ppa). Es opt-in: actívalo solo
 * para un patrón de URLs estáticas concreto si lo necesitas.
 */
import { cache, SEMI_STATIC_TTL } from '@/utils/cache'

/** Hash estable y barato de los params para diferenciar entradas del mismo URL. */
function hashParams(params) {
  if (!params) return ''
  try {
    const keys = Object.keys(params).sort()
    return keys.map((k) => `${k}=${JSON.stringify(params[k])}`).join('&')
  } catch {
    return ''
  }
}

/** Construye la clave de caché HTTP para un (method, url, params). */
export function httpCacheKey(method, url, params) {
  return `http:${String(method).toLowerCase()}:${url}:${hashParams(params)}`
}

/**
 * GET cacheado explícito. Devuelve la respuesta cacheada (`{ data, cached:true }`)
 * si hay hit vigente; si no, pide a la red, cachea `data` y la devuelve.
 *
 * No lanza si la caché no está disponible: en ese caso simplemente va a red.
 */
export async function cachedGet(axiosInstance, url, config = {}, ttlMs = SEMI_STATIC_TTL) {
  const key = httpCacheKey('get', url, config.params)
  const entry = cache.get(key)
  if (entry) return { data: entry.value, status: 200, cached: true, config }

  const resp = await axiosInstance.get(url, config)
  cache.set(key, resp.data, ttlMs)
  return { ...resp, cached: false }
}

/**
 * Instala un interceptor de caché GET en una instancia de axios.
 *
 * @param {import('axios').AxiosInstance} axiosInstance
 * @param {Object} opts
 * @param {RegExp[]} opts.cacheableUrlPatterns  Solo se cachean GET cuyo url case con alguno.
 * @param {number}  [opts.ttlMs]                TTL para las entradas (def: SEMI_STATIC_TTL).
 * @returns {Function} `eject` para desinstalar ambos interceptores.
 */
export function installCacheInterceptor(axiosInstance, { cacheableUrlPatterns = [], ttlMs = SEMI_STATIC_TTL } = {}) {
  const isCacheable = (config) =>
    String(config.method).toLowerCase() === 'get' &&
    cacheableUrlPatterns.some((re) => re.test(config.url || ''))

  // Request: ante un hit, lanzamos un "error" controlado que el response error
  // interceptor convierte en la respuesta cacheada (patrón simple y seguro,
  // sin sustituir el adapter de axios).
  const reqId = axiosInstance.interceptors.request.use((config) => {
    if (isCacheable(config)) {
      const entry = cache.get(httpCacheKey('get', config.url, config.params))
      if (entry) {
        return Promise.reject({ __cacheHit: true, config, data: entry.value })
      }
    }
    return config
  })

  // Response: en éxito, cachea los GET cacheables; en error, resuelve los hits.
  const resId = axiosInstance.interceptors.response.use(
    (resp) => {
      if (isCacheable(resp.config)) {
        cache.set(httpCacheKey('get', resp.config.url, resp.config.params), resp.data, ttlMs)
      }
      return resp
    },
    (error) => {
      if (error && error.__cacheHit) {
        return Promise.resolve({ data: error.data, status: 200, cached: true, config: error.config })
      }
      return Promise.reject(error)
    }
  )

  return function eject() {
    axiosInstance.interceptors.request.eject(reqId)
    axiosInstance.interceptors.response.eject(resId)
  }
}
