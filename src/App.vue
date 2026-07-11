<template>
  <!-- Skip link: primer elemento tabulable; salta la navegación e ir al contenido -->
  <a href="#main-content" class="skip-link" @click="skipToMain">Saltar al contenido principal</a>

  <!-- App móvil (PWA) y páginas de login: pantalla completa, sin chrome de la plataforma -->
  <div v-if="isLoginPage || isMobileApp" class="h-screen">
    <RouterView />
  </div>
  <div v-else-if="routeReady" class="flex h-screen overflow-hidden bg-gray-100">
    <AppSidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Mobile menu trigger (sólo en <lg cuando sidebar cerrado) -->
      <button v-if="!mobileOpen" @click="toggle"
        class="lg:hidden fixed top-3 left-3 z-30 w-9 h-9 rounded-lg bg-white shadow-md border border-gray-200 flex items-center justify-center"
        style="color: #2C2039;" title="Menú">
        <i class="pi pi-bars" />
      </button>

      <!-- Reabrir sidebar (escritorio, cuando está oculto) -->
      <button v-if="collapsed" @click="toggleCollapsed"
        class="hidden lg:flex sb-reopen" title="Mostrar barra lateral">
        <i class="pi pi-angle-double-right" />
      </button>
      <main id="main-content" tabindex="-1" role="main"
        :class="isSolar ? 'flex-1 overflow-hidden p-0' : 'flex-1 overflow-y-auto p-4 pt-14 sm:p-5 sm:pt-14 lg:p-6 lg:pt-6'">
        <RouterView />
      </main>
    </div>
  </div>
  <Toast position="top-right" />
  <ConfirmDialog />
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import AppSidebar from '@/components/AppSidebar.vue'
import { useSidebar } from '@/composables/useSidebar'
import { focusElement } from '@/composables/useA11yFocus'

const route = useRoute()
const toast = useToast()

// Skip link → mueve el foco (no solo el scroll) al contenido principal.
function skipToMain(e) {
  const main = document.getElementById('main-content')
  if (main) {
    e.preventDefault()
    focusElement(main)
    main.scrollIntoView()
  }
}
const { mobileOpen, toggle, collapsed, toggleCollapsed } = useSidebar()
const routeReady = computed(() => !!route.name)
const isLoginPage = computed(() => ['Login', 'ForgotPassword', 'ResetPassword'].includes(route.name))
const isMobileApp = computed(() => !!route.meta.mobile)
const isSolar     = computed(() => route.name === 'SolarLive')

onMounted(() => {
  window.__primeToast = (opts) => toast.add(opts)
})
</script>

<style>
.sb-reopen {
  position: fixed; top: 14px; left: 0; z-index: 40;
  width: 26px; height: 38px; padding-left: 2px;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #915BD8, #4C1D95);
  color: #fff; border: none; cursor: pointer;
  border-radius: 0 10px 10px 0;
  box-shadow: 0 4px 14px rgba(76, 29, 149, .35);
  transition: width .15s ease, padding-left .15s ease;
}
.sb-reopen:hover { width: 32px; padding-left: 4px; }
.sb-reopen .pi { font-size: 13px; }
</style>
