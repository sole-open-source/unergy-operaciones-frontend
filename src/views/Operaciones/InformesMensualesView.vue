<template>
  <div class="imv-page">

    <!-- ══ Hero Header ══════════════════════════════════════════════ -->
    <div class="imv-hero">
      <div class="imv-hero-left">
        <div class="imv-hero-row">
          <div class="imv-hero-ico">
            <i class="pi pi-file-edit" />
          </div>
          <div>
            <h1 class="imv-hero-title">Informes mensuales</h1>
            <p class="imv-hero-sub">Generación por proyecto, portafolio y FMO · equipo Operaciones Unergy</p>
          </div>
        </div>
      </div>
      <div class="imv-hero-actions">
        <RouterLink to="/informes" class="imv-link-btn" v-tooltip.bottom="'Ver informes guardados (borradores, revisados, aprobados)'">
          <i class="pi pi-folder-open" /> Informes guardados
        </RouterLink>
      </div>
    </div>

    <!-- Wizard -->
    <InformesMensualesPanel />

  </div>
</template>

<script setup>
import InformesMensualesPanel from './InformesMensualesPanel.vue'
</script>

<style scoped>
.imv-page {
  min-height: 100%;
  background: #f8f7fa;
  font-family: 'Sora', system-ui, sans-serif;
}

/* Hero */
.imv-hero {
  background: linear-gradient(135deg, #2C2039 0%, #3d2b52 60%, #4a2d6e 100%);
  padding: 28px 32px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(145,91,216,.2);
}
.imv-hero-row {
  display: flex; align-items: center; gap: 14px;
}
.imv-hero-ico {
  width: 44px; height: 44px;
  background: rgba(145,91,216,.18);
  border: 1px solid rgba(145,91,216,.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #DDD2F0; font-size: 20px;
}
.imv-hero-title {
  font-size: 24px;
  font-weight: 900;
  color: #FDFAF7;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}
.imv-hero-sub {
  font-size: 13px;
  color: rgba(253,250,247,.55);
  margin: 0;
}
.imv-hero-actions {
  display: inline-flex; align-items: center; gap: 8px;
}
.imv-link-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 8px;
  padding: 8px 14px;
  color: #FDFAF7;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: background .15s;
}
.imv-link-btn:hover { background: rgba(255,255,255,.2); }
.imv-link-btn i { font-size: 13px; }
</style>
