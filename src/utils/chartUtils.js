// ─────────────────────────────────────────────────────────────────────────────
// chartUtils — utilidades compartidas para la gestión de gráficas Chart.js
//
// vue-chartjs ya administra el ciclo de vida del canvas (crea la gráfica en
// onMounted y llama a chart.destroy() en onBeforeUnmount, además de adjuntar un
// ResizeObserver cuando responsive:true). Estas utilidades centralizan el
// registro de componentes, evitan recrear datos/objetos en cada render y
// ofrecen un throttle para suavizar redibujados por resize.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

let _registered = false

/**
 * Registra una sola vez el superconjunto de componentes Chart.js usados en la
 * app. ChartJS.register es idempotente, pero el guard evita trabajo repetido
 * cuando varias vistas lo invocan en cada montaje.
 */
export function registerCharts() {
  if (_registered) return
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  )
  _registered = true
}

/**
 * Throttle por flanco de subida + cola final. Limita la frecuencia con la que
 * se ejecuta `fn` (p. ej. al redimensionar la ventana) a una vez cada `wait` ms.
 * @param {Function} fn
 * @param {number} wait  milisegundos entre ejecuciones (def. 200)
 */
export function throttle(fn, wait = 200) {
  let last = 0
  let timer = null
  let lastArgs = null
  return function throttled(...args) {
    const now = Date.now()
    const remaining = wait - (now - last)
    lastArgs = args
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null }
      last = now
      fn.apply(this, lastArgs)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(this, lastArgs)
      }, remaining)
    }
  }
}

/**
 * Observa el redimensionado de un elemento con throttle. Devuelve una función
 * de limpieza que desconecta el observer (llámala en onBeforeUnmount).
 * @param {HTMLElement} el
 * @param {Function} cb
 * @param {number} wait  throttle en ms (def. 200)
 * @returns {() => void} disposer
 */
export function observeResize(el, cb, wait = 200) {
  if (!el || typeof ResizeObserver === 'undefined') return () => {}
  const throttled = throttle(cb, wait)
  const ro = new ResizeObserver(throttled)
  ro.observe(el)
  return () => ro.disconnect()
}

/**
 * Plugin de crosshair (línea vertical punteada sobre el punto activo del
 * tooltip). Compartido por las gráficas de líneas en tiempo real.
 */
export const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart.tooltip?._active?.length) return
    const x = chart.tooltip._active[0].element.x
    const { ctx, chartArea: { top, bottom } } = chart
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(28,18,50,0.18)'
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.restore()
  },
}
