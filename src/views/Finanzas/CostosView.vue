<template>
  <div class="gf-page">

    <!-- ══ TAB BAR ══════════════════════════════════════════════════════════ -->
    <div class="mon-tab-bar">
      <i class="pi pi-credit-card text-sm" style="color:#915BD8" />
      <span class="text-base font-bold text-gray-800 whitespace-nowrap mr-2">Costos</span>
      <div class="mon-tab-group">
        <button
          v-for="(tab, i) in TABS"
          :key="i"
          class="mon-tab"
          :class="{ 'mon-tab--active': activeTab === i }"
          @click="activeTab = i"
        >
          <i :class="tab.icon" style="font-size:12px" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ══ TAB 0 — MANTENIMIENTO ══════════════════════════════════════════ -->
    <div v-if="activeTab === 0" class="mon-tab-view">
      <div class="mon-tab-empty">
        <i class="pi pi-wrench" style="font-size:2.5rem; color:#c4b8d4;" />
        <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Mantenimiento</p>
        <p class="mt-1 text-xs" style="color:#a094b8;">Próximamente — registros de costos de mantenimiento</p>
      </div>
    </div>

    <!-- ══ TAB 1 — ARRIENDOS ══════════════════════════════════════════════ -->
    <div v-if="activeTab === 1" class="mon-tab-view">
      <div class="mon-tab-empty">
        <i class="pi pi-building" style="font-size:2.5rem; color:#c4b8d4;" />
        <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Arriendos</p>
        <p class="mt-1 text-xs" style="color:#a094b8;">Próximamente — registros de costos de arriendos</p>
      </div>
    </div>

    <!-- ══ TAB 2 — SERVICIOS DE INTERNET ══════════════════════════════════ -->
    <div v-if="activeTab === 2" class="mon-tab-view">
      <div class="mon-tab-empty">
        <i class="pi pi-wifi" style="font-size:2.5rem; color:#c4b8d4;" />
        <p class="mt-3 text-sm font-semibold" style="color:#6b5a8a;">Servicios de Internet</p>
        <p class="mt-1 text-xs" style="color:#a094b8;">Próximamente — registros de costos de servicios de internet</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const TABS = [
  { label: 'Mantenimiento',        icon: 'pi pi-wrench' },
  { label: 'Arriendos',            icon: 'pi pi-building' },
  { label: 'Servicios de Internet', icon: 'pi pi-wifi' },
]

const activeTab = ref(0)
</script>

<style scoped>
.gf-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f5f4f8;
}

/* ── Tab bar (mismo estilo que MonitoreoView) ── */
.mon-tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 25;
}
.mon-tab-group {
  display: inline-flex;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 2px;
  gap: 0;
}
.mon-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: #6B5A8A;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.mon-tab i { font-size: 12px; }
.mon-tab:hover:not(.mon-tab--active) { color: #2C2039; background: rgba(145,91,216,.08); }
.mon-tab--active {
  background: #915BD8;
  color: #FDFAF7;
  box-shadow: 0 1px 4px rgba(145,91,216,.3);
}
.mon-tab--active:hover { color: #FDFAF7; }

/* ── Contenido ── */
.mon-tab-view {
  padding: 24px 24px 40px;
  background: #f5f4f8;
}
.mon-tab-empty {
  text-align: center;
  padding: 80px 20px;
}

@media (max-width: 640px) {
  .mon-tab-view { padding: 16px; }
}
</style>
