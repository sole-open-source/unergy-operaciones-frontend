<template>
  <div class="imv-page">

    <!-- ══ Topbar compacto ═══════════════════════════════════════ -->
    <div class="imv-topbar">
      <div class="imv-topbar-title">
        <i class="pi pi-file-edit text-sm" style="color:#915BD8" />
        <h2 class="text-base font-bold text-gray-800 whitespace-nowrap">Informes Mensuales</h2>
        <span class="hidden lg:inline text-xs text-gray-500">· Generación, revisión y envío al cliente</span>
      </div>

      <!-- Tabs internas: Generar / Pipeline -->
      <div class="imv-tabs">
        <button class="imv-tab" :class="{ 'imv-tab--on': tab === 'generar' }"
                @click="tab = 'generar'">
          <i class="pi pi-cog" />
          <span>Generar</span>
        </button>
        <button class="imv-tab" :class="{ 'imv-tab--on': tab === 'pipeline' }"
                @click="tab = 'pipeline'">
          <i class="pi pi-send" />
          <span>Revisión y envío</span>
          <span class="imv-tab-badge" v-if="badgePipeline">{{ badgePipeline }}</span>
        </button>
      </div>

      <div class="imv-topbar-spacer" />
    </div>

    <!-- Wizard de generación -->
    <InformesMensualesPanel v-if="tab === 'generar'" />

    <!-- Pipeline de verificación + envío -->
    <EnvioMensualPanel v-else-if="tab === 'pipeline'" />

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InformesMensualesPanel from './InformesMensualesPanel.vue'
import EnvioMensualPanel from './EnvioMensualPanel.vue'
import api from '@/api/client'

const route = useRoute()
const router = useRouter()

const tab = ref(route.query.tab === 'pipeline' ? 'pipeline' : 'generar')
const badgePipeline = ref(null)   // cantidad de informes del mes en curso pendientes/comentados

// Sync con query string para deep-link
function setTab(t) {
  tab.value = t
  const q = { ...route.query }
  if (t === 'pipeline') q.tab = 'pipeline'
  else delete q.tab
  router.replace({ query: q })
}
// Watcher para sincronizar query con tab activa (cuando cambia desde el UI)
import { watch } from 'vue'
watch(tab, (val) => setTab(val))

// Cuenta informes pendientes/comentados del mes actual para mostrar badge en el tab Pipeline
async function cargarBadge() {
  try {
    const now   = new Date()
    const desde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const hasta = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    // ✅ Filtro en backend para no depender del orden/límite
    const { data } = await api.get('/informes/', {
      params: { periodo_desde_gte: desde, periodo_desde_lte: hasta, limit: 500 }
    })
    const pendientes = (data || []).filter(i => i.estado !== 'aprobado' || !i.correo_enviado).length
    badgePipeline.value = pendientes || null
  } catch { /* no crítico */ }
}
onMounted(cargarBadge)
</script>

<style scoped>
.imv-page {
  min-height: 100%;
  background: #f8f7fa;
  font-family: 'Sora', system-ui, sans-serif;
}

/* Topbar compacto con tabs */
.imv-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  min-height: 44px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.imv-topbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.imv-topbar-spacer { flex: 1; }

/* Tabs */
.imv-tabs {
  display: inline-flex;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 2px;
  gap: 0;
}
.imv-tab {
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
.imv-tab i { font-size: 12px; }
.imv-tab:hover:not(.imv-tab--on) { color: #2C2039; background: rgba(145,91,216,.08); }
.imv-tab--on {
  background: #915BD8;
  color: #FDFAF7;
  box-shadow: 0 1px 4px rgba(145,91,216,.3);
}
.imv-tab--on:hover { color: #FDFAF7; }
.imv-tab-badge {
  background: #DC2626;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 2px;
  min-width: 16px;
  text-align: center;
}
.imv-tab--on .imv-tab-badge {
  background: #fff;
  color: #DC2626;
}
</style>
