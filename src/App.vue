<template>
  <div v-if="isLoginPage" class="h-screen">
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
      <main :class="isSolar ? 'flex-1 overflow-hidden p-0' : 'flex-1 overflow-y-auto p-4 pt-14 sm:p-5 sm:pt-14 lg:p-6 lg:pt-6'">
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

const route = useRoute()
const toast = useToast()
const { mobileOpen, toggle } = useSidebar()
const routeReady = computed(() => !!route.name)
const isLoginPage = computed(() => ['Login', 'ForgotPassword', 'ResetPassword'].includes(route.name))
const isSolar     = computed(() => route.name === 'Solar')

onMounted(() => {
  window.__primeToast = (opts) => toast.add(opts)
})
</script>
