<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-xs" style="color: #9b89b5;">
        Destinatarios resueltos por frontera (operador de red + cliente). El envío del correo todavía no está conectado.
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

    <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
      <table class="w-full text-sm">
        <thead>
          <tr style="background: #f9f7ff;">
            <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Frontera</th>
            <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Operador de Red</th>
            <th class="text-left px-4 py-2.5 font-semibold" style="color: #6b5a8a;">Cliente</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in fronteras" :key="f.id" class="border-t" style="border-color: #f0ecf6;">
            <td class="px-4 py-2.5">
              <p class="font-medium" style="color: #2C2039;">{{ f.nombre_frontera }}</p>
              <p class="text-xs" style="color: #9b89b5;">{{ f.codigo_frontera || '—' }}</p>
            </td>
            <td class="px-4 py-2.5">
              <p v-if="f.operador_comercial" style="color: #2C2039;">{{ f.operador_comercial }}</p>
              <p v-else class="text-xs italic" style="color: #c4b8d4;">Sin operador vinculado</p>
              <span v-if="f.operador_correos.length" class="text-xs" style="color: #6b5a8a;">
                {{ f.operador_correos.length }} correo{{ f.operador_correos.length > 1 ? 's' : '' }}
              </span>
              <RouterLink v-else to="/mem/operadores-red"
                class="text-xs font-medium underline" style="color: #D64455;">
                Sin correos — corregir
              </RouterLink>
            </td>
            <td class="px-4 py-2.5">
              <p v-if="f.cliente_nombre" style="color: #2C2039;">{{ f.cliente_nombre }}</p>
              <p v-else class="text-xs italic" style="color: #c4b8d4;">Sin cliente vinculado</p>
              <span v-if="f.cliente_correos_cgm.length" class="text-xs" style="color: #6b5a8a;">
                {{ f.cliente_correos_cgm.length }} correo{{ f.cliente_correos_cgm.length > 1 ? 's' : '' }}
              </span>
              <RouterLink v-else-if="f.cliente_id" :to="`/clientes/${f.cliente_id}`"
                class="text-xs font-medium underline" style="color: #D64455;">
                Sin correos CGM — corregir
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/client'

const fronteras = ref([])
const loading = ref(true)

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
