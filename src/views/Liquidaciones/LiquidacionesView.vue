<template>
  <div class="liq-page">

    <!-- ══ Topbar compacto con tabs (patrón TSF) ═══════════════════ -->
    <div class="liq-topbar">
      <div class="liq-topbar-title">
        <i class="pi pi-dollar text-sm" style="color:#915BD8" />
        <h2 class="text-base font-bold text-gray-800 whitespace-nowrap">Liquidaciones</h2>
        <span class="hidden xl:inline text-xs text-gray-500">· Estado financiero por proyecto y período</span>
      </div>

      <div class="liq-tabs">
        <button v-for="t in TABS" :key="t.key" class="liq-tab"
          :class="{ 'liq-tab--on': tab === t.key }" @click="tab = t.key">
          <i :class="t.icon" /><span>{{ t.label }}</span>
        </button>
      </div>

      <div class="liq-topbar-spacer" />

      <!-- Selector de período (sólo en el dashboard) -->
      <div v-if="tab === 'resumen'" class="liq-period">
        <button class="liq-period-btn" @click="stepMes(-1)" v-tooltip.bottom="'Mes anterior'">
          <i class="pi pi-chevron-left text-xs" />
        </button>
        <span class="liq-period-label">{{ formatPeriodo(periodo) }}</span>
        <button class="liq-period-btn" :disabled="esMesActual" @click="stepMes(1)" v-tooltip.bottom="'Mes siguiente'">
          <i class="pi pi-chevron-right text-xs" />
        </button>
      </div>
    </div>

    <!-- ══ Contenido por tab ═══════════════════════════════════════ -->
    <ResumenPanel v-if="tab === 'resumen'" :periodo="periodo" />
    <LiquidacionesListView v-else-if="tab === 'proyectos'" embedded />
    <LiquidacionesPorInversionistaView v-else-if="tab === 'inversionistas'" embedded />

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ResumenPanel from './panels/ResumenPanel.vue'
import LiquidacionesListView from './LiquidacionesListView.vue'
import LiquidacionesPorInversionistaView from './LiquidacionesPorInversionistaView.vue'
import { formatPeriodo, mesActualISO } from '@/utils/liquidaciones'

const TABS = [
  { key: 'resumen', label: 'Resumen', icon: 'pi pi-chart-bar' },
  { key: 'proyectos', label: 'Proyectos', icon: 'pi pi-folder' },
  { key: 'inversionistas', label: 'Inversionistas', icon: 'pi pi-users' },
]
const VALID = TABS.map(t => t.key)

const route = useRoute()
const router = useRouter()

function tabInicial() {
  if (VALID.includes(route.query.tab)) return route.query.tab
  if (route.query.tipo) return 'proyectos'   // sidebar: /liquidaciones?tipo=...
  return 'resumen'
}
const tab = ref(tabInicial())
watch(tab, (val) => {
  const q = { ...route.query }
  if (val === 'resumen') delete q.tab
  else q.tab = val
  router.replace({ query: q })
})

// Navegación desde el sidebar (?tipo= o ?tab=) estando ya montada la vista
watch(() => route.query, (q) => {
  if (q.tipo && tab.value !== 'proyectos') tab.value = 'proyectos'
  else if (VALID.includes(q.tab) && q.tab !== tab.value) tab.value = q.tab
})

// Período del dashboard
const periodo = ref(mesActualISO())
const esMesActual = computed(() => periodo.value === mesActualISO())
function stepMes(delta) {
  const [y, m] = periodo.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  if (delta > 0 && next > mesActualISO()) return
  periodo.value = next
}

</script>

<style scoped>
.liq-page {
  min-height: 100%;
  background: #FDFAF7;
}
.liq-topbar {
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
.liq-topbar-title { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.liq-topbar-spacer { flex: 1; }

.liq-tabs {
  display: inline-flex;
  background: #F4F1FA;
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 2px;
}
.liq-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #6B5A8A;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.liq-tab i { font-size: 12px; }
.liq-tab:hover:not(.liq-tab--on) { color: #2C2039; background: rgba(145,91,216,.08); }
.liq-tab--on { background: #915BD8; color: #FDFAF7; box-shadow: 0 1px 4px rgba(145,91,216,.3); }

.liq-period { display: inline-flex; align-items: center; gap: 6px; }
.liq-period-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px;
  border: 1px solid #E5E2EC; background: #fff; color: #6E3FB8; cursor: pointer;
  transition: all .15s;
}
.liq-period-btn:hover:not(:disabled) { background: #F4F1FA; }
.liq-period-btn:disabled { opacity: .4; cursor: not-allowed; }
.liq-period-label { font-size: 13px; font-weight: 700; color: #2C2039; min-width: 78px; text-align: center; }
</style>
