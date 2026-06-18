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
      <!-- E. Tarjetas de métricas -->
      <div class="mand-metricas">
        <div class="mand-metrica"><span class="mand-metrica-num">{{ resumen.total }}</span><span class="mand-metrica-lbl">Total</span></div>
        <div class="mand-metrica mand-metrica--amb"><span class="mand-metrica-num">{{ resumen.correcciones }}</span><span class="mand-metrica-lbl">Correcciones</span></div>
        <div class="mand-metrica mand-metrica--ver"><span class="mand-metrica-num">{{ resumen.firmados }}</span><span class="mand-metrica-lbl">Firmados</span></div>
        <div class="mand-metrica mand-metrica--mor"><span class="mand-metrica-num">{{ resumen.enviados_inversionista }}</span><span class="mand-metrica-lbl">Enviados inv.</span></div>
        <div class="mand-metrica"><span class="mand-metrica-num">{{ resumen.pendientes }}</span><span class="mand-metrica-lbl">Pendientes</span></div>
      </div>

      <!-- D. Sub-tabs -->
      <div class="mand-subtabs">
        <button v-for="t in SUBTABS" :key="t.value" class="mand-subtab"
          :class="{ 'mand-subtab--active': subTab === t.value }" @click="subTab = t.value">
          {{ t.label }}<span v-if="t.value === 'correcciones'" class="mand-subtab-count">{{ resumen.correcciones }}</span>
        </button>
      </div>

      <!-- F. Filtros -->
      <div class="mand-filtros">
        <Select v-model="filtroEstado" :options="ESTADOS_OPCIONES" optionLabel="label" optionValue="value"
          placeholder="Estado" showClear class="mand-filtro-sel" />
        <Select v-model="filtroTercero" :options="tercerosOpciones" placeholder="Tercero / inversionista"
          showClear filter class="mand-filtro-sel" />
        <span class="mand-buscar"><i class="pi pi-search" /><input v-model="buscarCmu" type="text" placeholder="Buscar CMU…" /></span>
      </div>

      <!-- G. Tabla (Task 9) -->
      <div class="mand-tabla-wrap">
        <p class="text-xs text-gray-400 px-2 py-3">{{ mandatosFiltrados.length }} mandatos</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Select from 'primevue/select'
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
const resumen = ref({ total: 0, correcciones: 0, firmados: 0, enviados_inversionista: 0, pendientes: 0 })
const inversionistas = ref([])

// Sub-tabs: todos | correcciones | firmados | enviados_inv
const subTab = ref('todos')
const filtroEstado = ref(null)
const filtroTercero = ref(null)
const buscarCmu = ref('')

const ESTADOS_OPCIONES = [
  { label: 'Pendiente envío', value: 'pendiente_envio' },
  { label: 'Enviado revisoría', value: 'enviado_revisoria' },
  { label: 'Con correcciones', value: 'con_correcciones' },
  { label: 'Corregido', value: 'corregido' },
  { label: 'Firmado', value: 'firmado' },
  { label: 'Enviado inversionista', value: 'enviado_inversionista' },
  { label: 'Sin inversionista', value: 'sin_inversionista' },
]

const SUBTABS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Correcciones', value: 'correcciones' },
  { label: 'Firmados', value: 'firmados' },
  { label: 'Enviados a inv.', value: 'enviados_inv' },
]

const tercerosOpciones = computed(() => {
  const set = new Set(mandatos.value.map(m => m.tercero).filter(Boolean))
  return Array.from(set).sort()
})

const mandatosFiltrados = computed(() => {
  let lista = mandatos.value
  if (subTab.value === 'correcciones') lista = lista.filter(m => m.estado === 'con_correcciones' || m.estado === 'corregido')
  else if (subTab.value === 'firmados') lista = lista.filter(m => m.estado === 'firmado')
  else if (subTab.value === 'enviados_inv') lista = lista.filter(m => m.estado === 'enviado_inversionista')
  if (filtroEstado.value) lista = lista.filter(m => m.estado === filtroEstado.value)
  if (filtroTercero.value) lista = lista.filter(m => m.tercero === filtroTercero.value)
  if (buscarCmu.value.trim()) {
    const q = buscarCmu.value.trim().toUpperCase()
    lista = lista.filter(m => (m.cmu || '').toUpperCase().includes(q))
  }
  return lista
})

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
    const [r1, r2, r3, r4] = await Promise.allSettled([
      api.get('/mandatos', { params: { periodo: periodo.value } }),
      api.get('/mandatos/periodos'),
      api.get('/mandatos/resumen', { params: { periodo: periodo.value } }),
      api.get('/mandato-inversionistas'),
    ])
    mandatos.value = r1.status === 'fulfilled' ? r1.value.data : []
    periodosInfo.value = r2.status === 'fulfilled' ? r2.value.data : []
    resumen.value = r3.status === 'fulfilled' ? r3.value.data : resumen.value
    inversionistas.value = r4.status === 'fulfilled' ? r4.value.data : []
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
.mand-metricas { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
.mand-metrica { background: #fff; border: 1px solid #ECE7F2; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.mand-metrica-num { font-size: 22px; font-weight: 800; color: #2C2039; }
.mand-metrica-lbl { font-size: 11px; color: #8B7BA8; font-weight: 600; }
.mand-metrica--amb .mand-metrica-num { color: #854F0B; }
.mand-metrica--ver .mand-metrica-num { color: #3B6D11; }
.mand-metrica--mor .mand-metrica-num { color: #534AB7; }
.mand-subtabs { display: inline-flex; background: #F4F1FA; border: 1px solid #E5E2EC; border-radius: 8px; padding: 2px; margin-bottom: 12px; }
.mand-subtab { background: transparent; border: none; padding: 5px 14px; font-size: 12px; font-weight: 700; color: #6B5A8A; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.mand-subtab--active { background: #6D4AE8; color: #fff; }
.mand-subtab-count { background: rgba(255,255,255,.3); border-radius: 999px; padding: 0 6px; font-size: 10px; }
.mand-subtab:not(.mand-subtab--active) .mand-subtab-count { background: #E1D7F5; color: #6D4AE8; }
.mand-filtros { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.mand-filtro-sel { min-width: 200px; }
.mand-buscar { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #E5E2EC; border-radius: 8px; padding: 6px 10px; }
.mand-buscar input { border: none; outline: none; font-size: 13px; }
.mand-buscar i { color: #B0A8C0; font-size: 12px; }
@media (max-width: 720px) { .mand-metricas { grid-template-columns: repeat(2, 1fr); } }
</style>
