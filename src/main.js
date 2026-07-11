import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

const UnergPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '{violet.50}',
      100: '{violet.100}',
      200: '{violet.200}',
      300: '{violet.300}',
      400: '{violet.400}',
      500: '#915BD8',
      600: '#7c4ec0',
      700: '#6a3faa',
      800: '#593393',
      900: '#4a2878',
      950: '#31175a',
    },
    // A11y: anillo de foco visible y consistente en todos los componentes (WCAG 2.4.7).
    focusRing: {
      width: '3px',
      style: 'solid',
      color: '#915BD8',
      offset: '2px',
    },
  },
})
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import 'primeicons/primeicons.css'
import './assets/main.css'

import App from './App.vue'
import router from './router'
import InfoField from './components/InfoField.vue'
import PageHeader from './components/PageHeader.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: UnergPreset,
    options: { darkModeSelector: '.dark', cssLayer: false },
  },
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)
app.component('InfoField', InfoField)
app.component('PageHeader', PageHeader)

// A11y (solo desarrollo): auditoría automática con axe-core en consola.
// Se carga de forma perezosa y tolerante a fallos: si el paquete no está
// instalado, la app arranca igual sin errores. Corre tras cada navegación.
if (import.meta.env.DEV) {
  import('axe-core')
    .then(({ default: axe }) => {
      let timer = null
      const runAudit = () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          axe.run(document, { resultTypes: ['violations'] }).then((res) => {
            if (res.violations.length) {
              // eslint-disable-next-line no-console
              console.groupCollapsed(`[a11y] ${res.violations.length} problema(s) de accesibilidad`)
              res.violations.forEach((v) => {
                // eslint-disable-next-line no-console
                console.warn(`${v.impact ?? 'n/a'} · ${v.id}: ${v.help}`, v.nodes.map((n) => n.target))
              })
              // eslint-disable-next-line no-console
              console.groupEnd()
            }
          }).catch(() => {})
        }, 800)
      }
      router.afterEach(runAudit)
      runAudit()
    })
    .catch(() => {
      // axe-core no disponible: continuar sin auditoría en vivo.
    })
}

router.isReady().then(() => {
  app.mount('#app')
  // Si llegamos hasta acá es porque el build actual sí cargó bien -- limpiar
  // la marca para que un deploy FUTURO (mientras esta pestaña siga abierta)
  // pueda disparar su propia recarga automática, en vez de quedar bloqueado
  // por una recarga de un deploy anterior ya resuelta.
  sessionStorage.removeItem('vite_reload_intentado')
})

// Vite dispara esto cuando falla la carga de un módulo/CSS cargado con import()
// perezoso (pestaña abierta desde antes de un deploy, pidiendo un archivo que
// Vercel ya reemplazó). Recarga UNA sola vez para tomar la versión nueva --
// sin este guardado, si el archivo sigue sin existir tras recargar (deploy
// roto, no solo desactualizado), esto reintentaría para siempre.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('vite_reload_intentado')) return
  sessionStorage.setItem('vite_reload_intentado', '1')
  window.location.reload()
})
