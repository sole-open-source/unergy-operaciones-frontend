// ─────────────────────────────────────────────────────────────────────────────
// chartUtils — utilidades compartidas para la gestión de gráficas Chart.js
//
// vue-chartjs ya administra el ciclo de vida del canvas (crea la gráfica en
// onMounted y llama a chart.destroy() en onBeforeUnmount, además de adjuntar un
// ResizeObserver cuando responsive:true). Estas utilidades centralizan el
// registro de componentes y comparten el plugin de crosshair entre vistas.
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
