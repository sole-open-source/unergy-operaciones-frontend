<template>
  <div v-if="isLoginPage" class="h-screen">
    <RouterView />
  </div>
  <div v-else-if="routeReady" class="flex h-screen overflow-hidden bg-gray-100">
    <AppSidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <AppTopbar />
      <main :class="isMonitoreo ? 'flex-1 overflow-hidden p-0' : isSolar ? 'flex-1 overflow-hidden p-0' : 'flex-1 overflow-y-auto p-6'">
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
import AppTopbar from '@/components/AppTopbar.vue'

const route = useRoute()
const toast = useToast()
const routeReady = computed(() => !!route.name)
const isLoginPage = computed(() => ['Login', 'ForgotPassword', 'ResetPassword'].includes(route.name))
const isMonitoreo = computed(() => route.name === 'Fallas')
const isSolar     = computed(() => route.name === 'Solar')

onMounted(() => {
  window.__primeToast = (opts) => toast.add(opts)
})
</script>
