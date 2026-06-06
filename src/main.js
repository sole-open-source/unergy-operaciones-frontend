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
// Directiva v-tooltip de PrimeVue: se usa en ~10 vistas (incl. los badges
// real/estimada y "% Obra" de Proyectos próximos a energizarse) pero nunca se
// registró → todos los tooltips quedaban inertes. Una línea los activa app-wide.
app.directive('tooltip', Tooltip)
app.component('InfoField', InfoField)
app.component('PageHeader', PageHeader)

router.isReady().then(() => app.mount('#app'))
