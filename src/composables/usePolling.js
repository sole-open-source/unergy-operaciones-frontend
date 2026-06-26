import { ref, onMounted, onUnmounted } from 'vue'

// ── Polling con intervalo adaptativo ────────────────────────────────────────
// Centraliza la lógica de sondeo HTTP de las vistas "en vivo". Llama de forma
// repetida a `fetchFunction` y expone `data`, `loading` y `error` reactivos.
//
// Backoff adaptativo: ante errores consecutivos el intervalo crece según
// `onErrorIntervalMultiplier` hasta `maxInterval`; en cuanto un fetch tiene
// éxito vuelve al `initialInterval`. Usa un setTimeout auto-encadenado (en vez
// de setInterval) para que un cambio de cadencia o un fetch lento no provoquen
// solapamiento de peticiones, y limpia el temporizador en `onUnmounted` para
// evitar fugas de memoria.
//
//   const { data, loading, error, refresh, start, stop } = usePolling(fn, {
//     initialInterval: 5000, onErrorIntervalMultiplier: 2, maxInterval: 60000,
//   })
//
// Opciones:
//   initialInterval            ms entre sondeos exitosos          (def. 5000)
//   onErrorIntervalMultiplier  factor de backoff por error        (def. 2)
//   maxInterval                tope del backoff en ms             (def. 60000)
//   immediate                  ejecuta un fetch al arrancar       (def. true)
//   autoStart                  arranca el sondeo en onMounted     (def. true)
// ──────────────────────────────────────────────────────────────────────────────
export function usePolling(fetchFunction, options = {}) {
  const {
    initialInterval = 5000,
    onErrorIntervalMultiplier = 2,
    maxInterval = 60000,
    immediate = true,
    autoStart = true,
  } = options

  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const isPolling = ref(false)

  let timer = null
  let baseInterval = initialInterval     // cadencia objetivo (puede cambiar en runtime)
  let currentInterval = initialInterval  // cadencia efectiva (afectada por el backoff)
  let running = false                    // ¿el bucle de sondeo está activo?

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function scheduleNext() {
    clearTimer()
    if (!running) return
    timer = setTimeout(execute, currentInterval)
  }

  async function execute() {
    clearTimer()
    loading.value = true
    try {
      data.value = await fetchFunction()
      error.value = null
      currentInterval = baseInterval               // éxito → reset del backoff
    } catch (e) {
      error.value = e
      currentInterval = Math.min(currentInterval * onErrorIntervalMultiplier, maxInterval)
    } finally {
      loading.value = false
    }
    scheduleNext()
  }

  // Arranca el sondeo periódico (idempotente).
  function start() {
    if (running) return
    running = true
    isPolling.value = true
    currentInterval = baseInterval
    if (immediate) execute()
    else scheduleNext()
  }

  // Detiene el sondeo y limpia el temporizador (los datos ya cargados persisten).
  function stop() {
    running = false
    isPolling.value = false
    clearTimer()
  }

  // Fetch manual puntual; si el sondeo está activo, reinicia la cadencia.
  async function refresh() {
    await execute()
  }

  // Cambia la cadencia objetivo en caliente (p. ej. el usuario elige otro ritmo).
  function setInterval(ms) {
    baseInterval = ms
    currentInterval = ms
    if (running) scheduleNext()
  }

  onMounted(() => { if (autoStart) start() })
  onUnmounted(stop)

  return { data, loading, error, isPolling, start, stop, refresh, setInterval }
}
