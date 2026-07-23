<template>
  <div class="space-y-4">
    <PageHeader title="IDs proyectos"
                subtitle="Cobertura de IDs de Quoia y liquidación · solo GD y minigranjas" />

    <!-- Filtro de búsqueda -->
    <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-end border" style="border-color:#ECE7F2">
      <div>
        <label class="field-label">Buscar</label>
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="q" placeholder="Nombre del proyecto…" class="w-64" />
        </IconField>
      </div>
      <div class="flex-1" />
      <div class="text-xs text-gray-400 self-center">
        {{ filtrados.length }} proyecto{{ filtrados.length === 1 ? '' : 's' }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl shadow-sm p-10 flex justify-center">
      <i class="pi pi-spin pi-spinner text-2xl text-gray-400" />
    </div>

    <template v-else>
      <div v-if="!filtrados.length"
           class="bg-white rounded-xl shadow-sm p-10 text-center text-sm text-gray-400">
        No se encontraron proyectos GD/minigranja con los filtros aplicados.
      </div>

      <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden border" style="border-color:#ECE7F2">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <!-- Grupos -->
              <tr class="bg-gray-50 border-b border-gray-100">
                <th rowspan="2" class="sticky-col text-left px-4 py-2.5 font-medium text-gray-500 text-xs
                                        uppercase tracking-wide align-bottom" style="min-width:240px">
                  Proyecto
                </th>
                <th rowspan="2" class="text-left px-3 py-2.5 font-medium text-gray-500 text-xs uppercase
                                        tracking-wide align-bottom whitespace-nowrap">Tipo</th>
                <th colspan="3" class="text-center px-3 py-2 font-semibold text-[11px] uppercase tracking-wide"
                    style="color:#915BD8; border-left:1px solid #EEE;">ID Quoia</th>
                <th colspan="2" class="text-center px-3 py-2 font-semibold text-[11px] uppercase tracking-wide"
                    style="color:#2C2039; border-left:1px solid #EEE;">ID liquidaciones</th>
              </tr>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th v-for="col in COLUMNS" :key="col.key"
                    class="text-center px-3 py-2 font-medium text-gray-500 text-[11px] whitespace-nowrap"
                    :style="col.groupStart ? 'border-left:1px solid #EEE;' : ''">
                  {{ col.short }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtrados" :key="row.id"
                  class="border-t border-gray-100 hover:bg-gray-50/70 transition-colors duration-100 row-hover">
                <!-- Nombre -->
                <td class="sticky-col px-4 py-2" style="min-width:240px">
                  <button type="button" class="text-left text-sm text-gray-800 font-medium proyecto-nombre-link"
                          @click="irAlDetalle(row.id)" v-tooltip.bottom="'Abrir detalle'">
                    {{ formatearNombreProyecto(row.nombre_comercial) }}
                  </button>
                </td>
                <!-- Tipo -->
                <td class="px-3 py-2 whitespace-nowrap">
                  <span class="tipo-badge" :style="tipoStyle(row.tipo_proyecto)">
                    {{ TIPO_LABELS[row.tipo_proyecto] || row.tipo_proyecto || '—' }}
                  </span>
                </td>
                <!-- Celdas de ID (chulito clickeable) -->
                <td v-for="col in COLUMNS" :key="col.key"
                    class="px-3 py-2 text-center cursor-pointer id-cell"
                    :style="col.groupStart ? 'border-left:1px solid #F1F1F1;' : ''"
                    @click="irAlDetalle(row.id)"
                    v-tooltip.bottom="tieneValor(row[col.key]) ? String(row[col.key]) : 'Sin registrar · clic para agregar'">
                  <i v-if="tieneValor(row[col.key])" class="pi pi-check-circle"
                     style="color:#10B981; font-size:1rem;" />
                  <span v-else class="add-hint text-gray-300">+</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import api from '@/api/client'
import { formatearNombreProyecto } from '@/views/Proyectos/proyectosUi'

const router = useRouter()

// Solo GD y minigranjas (sin autoconsumo ni ningún otro tipo).
const TIPOS_INCLUIDOS = ['gd', 'minigranja']
const TIPO_LABELS = { minigranja: 'Minigranja', gd: 'GD' }

// Las 5 IDs: 3 de Quoia + 2 de liquidación (códigos SIC).
const COLUMNS = [
  { key: 'quoia_reporte_generacion_id', short: 'Rep. Gen.',     groupStart: true },
  { key: 'quoia_reporte_consumo_id',    short: 'Rep. Consumo',  groupStart: false },
  { key: 'quoia_nodo_id',               short: 'Nodo',          groupStart: false },
  { key: 'codigo_sic_generacion',       short: 'SIC gen.',      groupStart: true },
  { key: 'codigo_sic_consumo',          short: 'SIC con.',      groupStart: false },
]

const loading = ref(true)
const proyectos = ref([])
const q = ref('')

function tieneValor(v) {
  return v !== null && v !== undefined && v !== ''
}

function tipoStyle(tipo) {
  const c = tipo === 'gd' ? '#3B82F6' : '#10B981'
  return `background:${c}18; color:${c};`
}

function irAlDetalle(id) {
  router.push(`/proyectos/${id}?edit=true`)
}

const filtrados = computed(() => {
  const term = q.value.trim().toLowerCase()
  return proyectos.value
    .filter(p => TIPOS_INCLUIDOS.includes(p.tipo_proyecto))
    .filter(p => !term || (p.nombre_comercial || '').toLowerCase().includes(term))
    .sort((a, b) => (a.nombre_comercial || '').localeCompare(b.nombre_comercial || ''))
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/proyectos', { params: { page: 1, size: 500 } })
    proyectos.value = data.items ?? data
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.field-label { @apply block text-xs font-medium text-gray-600 mb-1; }

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #ffffff;
  border-right: 1px solid #E5E7EB;
}
thead .sticky-col { background: #F9FAFB; z-index: 3; }
.row-hover:hover .sticky-col { background: #F8FAFC; }

.proyecto-nombre-link { cursor: pointer; transition: color 0.12s; }
.proyecto-nombre-link:hover { color: #915BD8; text-decoration: underline; text-underline-offset: 2px; }

.tipo-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
}

/* Celda de ID: la pista "+" solo aparece al pasar el mouse por la fila */
.id-cell .add-hint { opacity: 0; transition: opacity 0.12s; font-weight: 700; }
.row-hover:hover .id-cell .add-hint { opacity: 1; }
.id-cell:hover { background: #F3EEFB; }
</style>
