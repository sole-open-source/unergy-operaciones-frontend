<template>
  <div class="space-y-5">
    <!-- Controles de respaldo -->
    <div class="flex flex-wrap gap-2 justify-end">
      <Button label="Exportar JSON" icon="pi pi-download" text severity="secondary" size="small"
        @click="store.exportarJSON()" />
      <label class="cursor-pointer">
        <Button label="Importar JSON" icon="pi pi-upload" text severity="secondary" size="small"
          tag="span" as="span" />
        <input type="file" accept=".json" class="hidden" @change="onImport" />
      </label>
      <Button label="Exportar a Excel" icon="pi pi-file-excel" severity="secondary" outlined size="small"
        @click="exportarExcel" />
    </div>

    <!-- Tabla resumen -->
    <div v-if="store.historial.value.length" class="bg-white rounded-xl shadow-sm overflow-hidden"
      style="border:1px solid #e8e0f0">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:#6b5a8a">Fecha</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:#6b5a8a">Tipo</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">PB</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">UNGC</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">UNGG</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Total</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Disponible</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Saldo</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:#6b5a8a">—</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.historial.value" :key="r.id"
            class="border-b last:border-b-0 hover:bg-gray-50/50">
            <td class="px-3 py-2 tabular-nums" style="color:#2C2039">{{ r.fecha }}</td>
            <td class="px-3 py-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :style="tipoBadge(r.tipo)">
                {{ r.tipo }}
              </span>
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs" style="color:#6b5a8a">
              {{ r.pb != null ? fmtCOP(r.pb) : '—' }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.totalUNGC != null ? fmtCOP(r.totalUNGC) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.totalUNGG != null ? fmtCOP(r.totalUNGG) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold" style="color:#2C2039">
              {{ r.totalConsignar != null ? fmtCOP(r.totalConsignar) : (r.totalAjusteTXR != null ? fmtCOP(r.totalAjusteTXR) : '—') }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.disponibleCustodia != null ? fmtCOP(r.disponibleCustodia) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.saldo != null ? fmtCOP(r.saldo) : '—' }}</td>
            <td class="px-3 py-2 text-center">
              <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                @click="store.eliminar(r.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="py-12 text-center" style="color:#6b5a8a">
      <i class="pi pi-inbox text-3xl mb-2 block" style="color:#c4b8d4" />
      No hay registros en el historial. Confirma un reporte desde Semanales, TXR o Mensuales.
    </div>

    <!-- Gráfica — se agrega en Task 11 -->
  </div>
</template>

<script setup>
import { useGarantiasHistorial } from '../composables/useGarantiasHistorial.js'
import { fmtCOP } from '../utils/formatters.js'
import { exportHistorialExcel } from '../utils/excelExport.js'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const store = useGarantiasHistorial()

function tipoBadge(tipo) {
  const map = {
    semanal: 'background:#f3f0f7;color:#915BD8',
    txr:     'background:#dbeafe;color:#1d4ed8',
    mensual: 'background:#d1fae5;color:#065f46',
  }
  return map[tipo] || 'background:#f3f4f6;color:#6b7280'
}

function exportarExcel() {
  exportHistorialExcel(store.historial.value)
}

async function onImport(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    const count = store.importarJSON(text)
    toast.add({ severity: 'success', summary: `${count} registros importados`, life: 3000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error al importar', detail: err.message, life: 4000 })
  } finally {
    e.target.value = ''
  }
}
</script>
