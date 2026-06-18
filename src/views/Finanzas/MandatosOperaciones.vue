<template>
  <div class="mand-root">
    <!-- B. Navegador de período -->
    <div class="mand-periodo-bar">
      <i class="pi pi-calendar text-sm" style="color:#6D4AE8" />
      <button class="mand-nav-btn" @click="cambiarMes(-1)"><i class="pi pi-chevron-left" /></button>
      <span class="mand-periodo-label">{{ periodoLargo }}</span>
      <button class="mand-nav-btn" @click="cambiarMes(1)"><i class="pi pi-chevron-right" /></button>
      <span class="mand-periodo-code">{{ periodo }}</span>
      <span v-if="badgeMes" class="mand-badge-mes" :class="`mand-badge-mes--${badgeMes}`">
        {{ badgeMes === 'correcciones' ? 'Correcciones pendientes' : badgeMes === 'cerrado' ? 'Mes cerrado' : '' }}
      </span>
      <span class="mand-sync">Gmail no conectado</span>
    </div>

    <div v-if="cargando" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner" style="font-size:1.5rem; color:#6D4AE8;" />
    </div>

    <div v-else>
      <!-- Las secciones C–H se añaden en tasks posteriores -->
      <div class="mand-tabla-wrap">
        <p class="text-xs text-gray-400 px-2 py-3">{{ mandatos.length }} mandatos en {{ periodo }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/client'

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Período inicial: mayo 2025 (donde viven los datos de prueba).
const anio = ref(2025)
const mes = ref(5)   // 1-12

const periodo = computed(() => `${anio.value}-${String(mes.value).padStart(2, '0')}`)
const periodoLargo = computed(() => `${MESES_ES[mes.value - 1]} ${anio.value}`)

const cargando = ref(false)
const mandatos = ref([])
const periodosInfo = ref([])

const badgeMes = computed(() => {
  const info = periodosInfo.value.find(p => p.periodo === periodo.value)
  return info ? info.badge : null
})

function cambiarMes(delta) {
  let m = mes.value + delta
  let y = anio.value
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  mes.value = m
  anio.value = y
  cargar()
}

async function cargar() {
  cargando.value = true
  try {
    const [r1, r2] = await Promise.allSettled([
      api.get('/mandatos', { params: { periodo: periodo.value } }),
      api.get('/mandatos/periodos'),
    ])
    mandatos.value = r1.status === 'fulfilled' ? r1.value.data : []
    periodosInfo.value = r2.status === 'fulfilled' ? r2.value.data : []
  } catch {
    mandatos.value = []
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
defineExpose({ cargar })
</script>

<style scoped>
.mand-root { padding: 14px 16px 28px; }
.mand-periodo-bar {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border: 1px solid #ECE7F2; border-radius: 12px;
  padding: 8px 14px; margin-bottom: 14px; flex-wrap: wrap;
}
.mand-nav-btn {
  background: #F4F1FA; border: 1px solid #E5E2EC; border-radius: 8px;
  width: 28px; height: 28px; cursor: pointer; color: #6B5A8A;
  display: inline-flex; align-items: center; justify-content: center;
}
.mand-nav-btn:hover { background: rgba(109,74,232,.1); color: #6D4AE8; }
.mand-periodo-label { font-size: 14px; font-weight: 700; color: #2C2039; min-width: 130px; text-align: center; }
.mand-periodo-code { font-size: 12px; color: #8B7BA8; font-weight: 600; }
.mand-badge-mes { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
.mand-badge-mes--correcciones { background: #FAEEDA; color: #854F0B; }
.mand-badge-mes--cerrado { background: #EAF3DE; color: #3B6D11; }
.mand-sync { margin-left: auto; font-size: 11px; color: #B0A8C0; }
.mand-tabla-wrap { background: #fff; border: 1px solid #ECE7F2; border-radius: 12px; }
</style>
