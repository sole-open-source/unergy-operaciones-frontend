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
import { isZodError, zodIssuesToText } from './utils/schemas/validationError'

const app = createApp(App)

// Manejador global de errores: distingue los errores de VALIDACIÓN (Zod), que
// nacen de datos del usuario, de los errores del BACKEND / la app. Las vistas ya
// muestran un Toast al validar en el submit; este es la red de seguridad para un
// ZodError que se escape sin capturar (se registra distinto, no como fallo app).
app.config.errorHandler = (err, _instance, info) => {
  if (isZodError(err)) {
    console.warn('[Validación] Error de esquema no capturado:', zodIssuesToText(err), `(${info})`)
  } else {
    console.error('[App] Error no capturado:', err, `(${info})`)
  }
}

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
