<template>
  <nav class="mtb">
    <!-- Coordinador y técnico no tienen acceso a generación/resumen -->
    <template v-if="rol === 'coordinador' || rol === 'tecnico'">
      <RouterLink :to="fallasPath" class="mtb-item" active-class="mtb-item--active">
        <i class="pi pi-wrench" /><span>Fallas</span>
      </RouterLink>
      <button class="mtb-item mtb-item--logout" @click="logout">
        <i class="pi pi-sign-out" /><span>Salir</span>
      </button>
    </template>
    <template v-else>
      <RouterLink to="/m/solar" class="mtb-item" active-class="mtb-item--active">
        <i class="pi pi-sun" /><span>Generación</span>
      </RouterLink>
      <RouterLink to="/m/fallas" class="mtb-item" active-class="mtb-item--active">
        <i class="pi pi-wrench" /><span>Fallas</span>
      </RouterLink>
      <RouterLink to="/m/resumen" class="mtb-item" active-class="mtb-item--active">
        <i class="pi pi-chart-bar" /><span>Resumen</span>
      </RouterLink>
      <RouterLink to="/m/reporte-cgm" class="mtb-item" active-class="mtb-item--active">
        <i class="pi pi-envelope" /><span>CGM</span>
      </RouterLink>
    </template>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const rol = computed(() => auth.role)
const fallasPath = computed(() => rol.value === 'coordinador' ? '/m/coordinador' : '/m/tecnico')

function logout() {
  auth.logout()
  router.push('/m/login')
}
</script>

<style scoped>
.mtb {
  display: flex; flex-shrink: 0;
  background: #fff; border-top: 1px solid #eceaf2;
  padding-bottom: env(safe-area-inset-bottom);
}
.mtb-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 9px 0 7px; text-decoration: none;
  color: #9b8db5; font-size: 11px; font-weight: 600;
}
.mtb-item .pi { font-size: 20px; }
.mtb-item--active { color: #915BD8; }
</style>
