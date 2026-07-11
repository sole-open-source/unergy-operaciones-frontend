<template>
  <div class="space-y-4" v-if="frontera">
    <!-- Header / breadcrumb -->
    <div class="flex items-center gap-3">
      <button @click="$router.push('/mem/fronteras')"
        class="text-sm flex items-center gap-1 hover:underline" style="color: #915BD8;">
        <i class="pi pi-arrow-left text-xs" /> Fronteras
      </button>
      <span style="color: #c5b9db;">/</span>
      <span class="text-sm font-semibold" style="color: #2C2039;">
        {{ frontera.nombre_frontera || frontera.codigo_frontera || `#${frontera.id}` }}
      </span>
    </div>

    <div>
      <h1 class="text-lg font-bold" style="color: #2C2039;">
        {{ frontera.nombre_frontera || frontera.codigo_frontera || `Frontera #${frontera.id}` }}
      </h1>
      <p class="text-xs mt-0.5" style="color: #9b89b5;">
        <span v-if="frontera.codigo_frontera" class="font-mono">{{ frontera.codigo_frontera }}</span>
        <span v-if="frontera.proyecto_nombre"> · {{ frontera.proyecto_nombre }}</span>
        <span v-if="frontera.tipo_frontera"> · {{ tipoLabel(frontera.tipo_frontera) }}</span>
      </p>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <div class="flex border-b" style="border-color: #e8e0f0;">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          class="px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
          :style="activeTab === tab.key
            ? 'border-color: #915BD8; color: #915BD8;'
            : 'border-color: transparent; color: #6b5a8a;'">
          <i :class="tab.icon + ' mr-1.5 text-xs'" />{{ tab.label }}
        </button>
      </div>

      <div class="p-6">
        <!-- ── Tab: Resumen ── -->
        <div v-if="activeTab === 'resumen'" class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="campo in resumenCampos" :key="campo.label">
            <p class="text-xs uppercase tracking-wide font-semibold" style="color:#6b5a8a;">{{ campo.label }}</p>
            <p class="text-sm mt-1" style="color:#2C2039;">{{ campo.value || '—' }}</p>
          </div>
        </div>

        <!-- ── Tab: Datos de Medición ── -->
        <MedicionDataSection v-else-if="activeTab === 'medicion'" :frontera-id="frontera.id" />
      </div>
    </div>
  </div>

  <div v-else-if="cargando" class="flex items-center justify-center py-20">
    <i class="pi pi-spin pi-spinner text-2xl" style="color: #915BD8;" />
  </div>

  <div v-else class="text-center py-20">
    <i class="pi pi-exclamation-circle text-3xl mb-2" style="color:#e0d5f0" />
    <p class="text-sm" style="color:#9b89b5;">No se encontró la frontera solicitada.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api/client'
import MedicionDataSection from './components/MedicionDataSection.vue'

const route = useRoute()
const frontera = ref(null)
const cargando = ref(true)
const activeTab = ref('medicion')

const tabs = [
  { key: 'resumen', label: 'Resumen', icon: 'pi pi-info-circle' },
  { key: 'medicion', label: 'Datos de Medición', icon: 'pi pi-chart-line' },
]

function tipoLabel(t) {
  const map = { generacion: 'Generación', consumo: 'Consumo', generacion_consumo: 'Gen+Consumo', consumo_auxiliar: 'Auxiliar', consumo_propio: 'Propio' }
  return map[t] || t
}

const resumenCampos = computed(() => {
  const f = frontera.value || {}
  return [
    { label: 'Código', value: f.codigo_frontera },
    { label: 'Estado', value: f.estado },
    { label: 'Tipo', value: f.tipo_frontera ? tipoLabel(f.tipo_frontera) : null },
    { label: 'Proyecto', value: f.proyecto_nombre },
    { label: 'Operador', value: f.operador_comercial || f.operador_red },
    { label: 'Municipio', value: f.municipio },
    { label: 'Cap. efectiva (MW)', value: f.capacidad_efectiva_mw != null ? Number(f.capacidad_efectiva_mw).toFixed(3) : null },
    { label: 'Serial medidor ppal.', value: f.nro_serie_med_ppal },
    { label: 'Medidor Quoia', value: f.quoia_meter_id },
  ]
})

async function cargar() {
  cargando.value = true
  const id = route.params.id
  try {
    // Se prefiere el endpoint puntual (patrón de OperadorRedDetailView).
    const { data } = await api.get(`/fronteras/${id}`)
    frontera.value = data
  } catch (e) {
    // Fallback robusto: si aún no existe GET /fronteras/:id, se busca en la lista.
    try {
      const { data } = await api.get('/fronteras', { params: { limit: 500 } })
      frontera.value = (Array.isArray(data) ? data : []).find(f => String(f.id) === String(id)) || null
    } catch {
      frontera.value = null
    }
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>
