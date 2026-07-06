<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-xs" style="color: #9b89b5;">
        Destinatarios del reporte CGM (operador de red + cliente). El envío del correo todavía no está conectado.
      </p>
      <button type="button" disabled
        v-tooltip.top="'Pendiente: falta conectar el motor de generación y envío (hoy solo existe en el script standalone)'"
        class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg opacity-40 cursor-not-allowed"
        style="background:#915BD8;color:#fff;">
        <i class="pi pi-send text-xs" /> Enviar
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl" style="color: #915BD8;" />
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center gap-2 flex-wrap">
        <button v-for="opt in tipoOpciones" :key="opt.value" type="button" @click="filtroTipo = opt.value"
          class="text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          :style="filtroTipo === opt.value
            ? 'background:#915BD8;color:#fff;'
            : 'background:#fff;color:#6b5a8a;border:1.5px solid #e8e0f0;'">
          {{ opt.label }}
        </button>
        <span class="p-input-icon-left" style="max-width: 240px; flex: 1;">
          <i class="pi pi-search" />
          <InputText v-model="busqueda" placeholder="Buscar destinatario…" class="w-full" size="small" />
        </span>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <table class="w-full text-sm">
          <thead>
            <tr style="background: #f9f7ff;">
              <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Destinatario</th>
              <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Tipo</th>
              <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Correos</th>
              <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Proyectos</th>
            </tr>
          </thead>
          <tbody>
          <template v-for="row in destinatariosFiltrados" :key="row.key">
            <tr class="border-t" style="border-color: #f0ecf6;">
              <td class="px-4 py-2.5">
                <p v-if="row.nombre" class="font-medium" style="color: #2C2039;">{{ row.nombre }}</p>
                <p v-else class="text-xs italic" style="color: #c4b8d4;">{{ row.sinVinculo }}</p>
              </td>
              <td class="px-4 py-2.5">
                <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :style="row.tipo === 'Operador de Red'
                    ? 'background: rgba(145,91,216,0.1); color: #6E3FB8;'
                    : 'background: rgba(16,185,129,0.1); color: #059669;'">
                  {{ row.tipo }}
                </span>
              </td>
              <td class="px-4 py-2.5">
                <RouterLink v-if="row.linkCorregir && row.correos.length"
                  :to="row.linkCorregir" class="font-medium underline" style="color: #6E3FB8;"
                  v-tooltip.top="'Ver y editar correos'">
                  {{ row.correos.length }} correo{{ row.correos.length > 1 ? 's' : '' }}
                </RouterLink>
                <RouterLink v-else-if="row.linkCorregir"
                  :to="row.linkCorregir" class="text-xs font-medium underline" style="color: #D64455;">
                  {{ row.textoCorregir }}
                </RouterLink>
                <span v-else class="text-xs italic" style="color: #c4b8d4;">—</span>
              </td>
              <td class="px-4 py-2.5">
                <button type="button" @click="toggle(row.key)"
                  class="flex items-center gap-1.5 text-xs font-medium" style="color: #6b5a8a;">
                  <i :class="['pi text-[10px]', expanded.has(row.key) ? 'pi-chevron-down' : 'pi-chevron-right']" />
                  {{ row.proyectos.length }} proyecto{{ row.proyectos.length > 1 ? 's' : '' }}
                </button>
              </td>
            </tr>
            <tr v-if="expanded.has(row.key)" class="border-t" style="border-color: #f0ecf6; background: #fbfaff;">
              <td colspan="4" class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <span v-for="p in row.proyectos" :key="p"
                    class="text-xs px-2.5 py-1 rounded-lg" style="background: #fff; border: 1px solid #e8e0f0; color: #6b5a8a;">
                    {{ p }}
                  </span>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!destinatariosFiltrados.length">
            <td colspan="4" class="px-4 py-8 text-center text-xs italic" style="color: #c4b8d4;">
              Ningún destinatario coincide con el filtro.
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import api from '@/api/client'

const fronteras = ref([])
const loading = ref(true)
const expanded = ref(new Set())
const filtroTipo = ref('todos')
const busqueda = ref('')

const tipoOpciones = [
  { value: 'todos', label: 'Todos' },
  { value: 'Operador de Red', label: 'Operador de Red' },
  { value: 'Cliente', label: 'Cliente' },
]

function toggle(key) {
  const next = new Set(expanded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expanded.value = next
}

// Una fila por destinatario único (no por proyecto): agrupa generación+consumo
// de la misma planta y, si un mismo operador/cliente cubre varios proyectos,
// los junta en una sola fila con el detalle expandible.
const destinatarios = computed(() => {
  const proyectos = new Map()
  for (const f of fronteras.value) {
    const key = f.proyecto_nombre || `frontera-${f.id}`
    if (!proyectos.has(key)) proyectos.set(key, f)
  }

  const grupos = new Map()
  function addEntry(entidadKey, tipo, nombre, sinVinculo, correos, linkCorregir, textoCorregir, proyecto) {
    const key = `${tipo}-${entidadKey}`
    if (!grupos.has(key)) {
      grupos.set(key, { key, tipo, nombre, sinVinculo, correos, linkCorregir, textoCorregir, proyectos: [] })
    }
    grupos.get(key).proyectos.push(proyecto)
  }

  for (const [proyecto, f] of proyectos) {
    addEntry(f.operador_comercial || 'sin-operador', 'Operador de Red', f.operador_comercial,
      'Sin operador vinculado', f.operador_correos,
      f.operador_comercial ? '/mem/operadores-red' : null, 'Sin correos — corregir', proyecto)
    addEntry(f.cliente_id ?? 'sin-cliente', 'Cliente', f.cliente_nombre,
      'Sin cliente vinculado', f.cliente_correos_cgm,
      f.cliente_id ? `/clientes/${f.cliente_id}` : null, 'Sin correos CGM — corregir', proyecto)
  }

  return [...grupos.values()].sort((a, b) => (a.nombre || 'zzz').localeCompare(b.nombre || 'zzz'))
})

const destinatariosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return destinatarios.value.filter(row => {
    if (filtroTipo.value !== 'todos' && row.tipo !== filtroTipo.value) return false
    if (texto && !(row.nombre || '').toLowerCase().includes(texto)) return false
    return true
  })
})

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/fronteras', { params: { limit: 500 } })
    fronteras.value = data
  } catch (e) {
    console.error('Error loading fronteras:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
