<template>
  <div class="imv-page">

    <!-- ══ Topbar compacto (estilo Gestión de Fallas) ══════════════ -->
    <div class="imv-topbar">
      <div class="imv-topbar-title">
        <i class="pi pi-file-edit text-sm" style="color:#915BD8" />
        <h2 class="text-base font-bold text-gray-800 whitespace-nowrap">Informes Mensuales</h2>
        <span class="hidden md:inline text-xs text-gray-500">· Generación, verificación y envío</span>
      </div>
      <div class="imv-topbar-actions">
        <RouterLink to="/informes" class="imv-link-btn"
                    v-tooltip.bottom="'Ver informes guardados (borradores, revisados, aprobados)'">
          <i class="pi pi-folder-open" />
          <span class="hidden sm:inline">Guardados</span>
        </RouterLink>
        <button class="imv-link-btn imv-link-btn--primary"
                @click="envioMensualOpen = true"
                v-tooltip.bottom="'Pipeline mensual: revisar, comentar, verificar y enviar al cliente'">
          <i class="pi pi-send" />
          <span class="hidden sm:inline">Envío mensual</span>
        </button>
      </div>
    </div>

    <!-- Wizard -->
    <InformesMensualesPanel />

    <!-- Panel de envío mensual (full-overlay) -->
    <EnvioMensualPanel v-if="envioMensualOpen" @cerrar="envioMensualOpen = false" />

  </div>
</template>

<script setup>
import { ref } from 'vue'
import InformesMensualesPanel from './InformesMensualesPanel.vue'
import EnvioMensualPanel from './EnvioMensualPanel.vue'

const envioMensualOpen = ref(false)
</script>

<style scoped>
.imv-page {
  min-height: 100%;
  background: #f8f7fa;
  font-family: 'Sora', system-ui, sans-serif;
}

/* Topbar compacto */
.imv-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  min-height: 42px;
}
.imv-topbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.imv-topbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}
.imv-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 6px;
  padding: 5px 10px;
  color: #6D28D9;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: all .15s;
}
.imv-link-btn:hover { background: #E9DEFC; border-color: #C7A8F0; }
.imv-link-btn i { font-size: 12px; }

.imv-link-btn--primary {
  background: #915BD8;
  border-color: #915BD8;
  color: #FDFAF7;
}
.imv-link-btn--primary:hover {
  background: #7C3AED;
  border-color: #7C3AED;
}
</style>
