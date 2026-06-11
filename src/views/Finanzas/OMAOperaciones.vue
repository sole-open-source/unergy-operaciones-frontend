<template>
  <div class="space-y-4 pt-3">

    <!-- ── Barra superior: periodo + guardar + columnas + IPC ──────────── -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <button type="button" @click="cambiarMes(-1)"
            class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
            <i class="pi pi-chevron-left text-xs text-gray-500" />
          </button>
          <span class="text-sm font-semibold" style="color:#2C2039; min-width:100px; text-align:center">
            {{ periodoLabel }}
          </span>
          <button type="button" @click="cambiarMes(1)"
            class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
            <i class="pi pi-chevron-right text-xs text-gray-500" />
          </button>
        </div>
        <Tag :value="periodoActual" severity="secondary" class="text-xs font-mono" />
      </div>

      <div class="flex items-center gap-2">
        <div class="relative">
          <Button label="Columnas" icon="pi pi-table" size="small" outlined severity="secondary"
            @click="showColMenu = !showColMenu" />
          <div v-if="showColMenu"
            class="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-1"
            style="min-width:240px">
            <p class="text-xs font-semibold text-gray-500 mb-2">Mostrar columnas</p>
            <label v-for="col in columnasOpcionales" :key="col.key"
              class="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
              <input type="checkbox" v-model="colsVisibles[col.key]" class="accent-purple-600" />
              {{ col.label }}
            </label>
          </div>
        </div>
        <Button label="IPC" icon="pi pi-chart-line" size="small" outlined
          @click="showIPCDialog = true"
          style="border-color:#915BD8;color:#915BD8" />
        <Button label="Guardar selección" icon="pi pi-save" size="small"
          :loading="guardando"
          style="background:#915BD8;border-color:#915BD8"
          @click="guardarSeleccion" />
      </div>
    </div>

    <!-- ── Notificación de cambio IPC ─────────────────────────────────── -->
    <div v-if="notificacionIPC"
      class="rounded-xl border p-3 flex items-start gap-3"
      style="background:#fef3c7;border-color:#f59e0b40">
      <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706"/>
      <div class="flex-1 text-xs">
        <p class="font-semibold mb-1" style="color:#92400e">
          Nueva tasa IPC {{ notificacionIPC.año }}: {{ (notificacionIPC.tasa * 100).toFixed(2) }}%
          — Los valores cambiaron
        </p>
        <div v-for="af in notificacionIPC.afectados" :key="af.contrato_id"
          class="mb-0.5" style="color:#78350f">
          <strong>{{ af.nombre }}</strong>:
          {{ formatCOP(af.valor_anterior) }} → {{ formatCOP(af.valor_nuevo) }}
          <span :class="af.diff_cop > 0 ? 'text-green-700' : 'text-red-700'">
            ({{ af.diff_cop > 0 ? '+' : '' }}{{ formatCOP(af.diff_cop) }},
             {{ af.diff_pct > 0 ? '+' : '' }}{{ af.diff_pct.toFixed(2) }}%)
          </span>
        </div>
      </div>
      <button type="button" @click="notificacionIPC = null" class="text-gray-400 hover:text-gray-600">
        <i class="pi pi-times text-xs"/>
      </button>
    </div>

    <!-- ── Tabla ──────────────────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-10"><ProgressSpinner /></div>
    <div v-else class="rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse" style="min-width:900px">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-3 py-2.5 text-left w-10">
                <input type="checkbox" :checked="todosMarcados" @change="toggleTodos"
                  class="accent-purple-600" />
              </th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Período</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Mes / Año</th>
              <th v-if="colsVisibles.n_indexaciones"
                class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">N° IPC</th>
              <th class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Valor Base Anual</th>
              <th v-if="colsVisibles.factor_acumulado"
                class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Factor Acum.</th>
              <th v-if="colsVisibles.valor_anual_indexado"
                class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Val. Anual Indexado</th>
              <th v-if="colsVisibles.valor_mes_completo"
                class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Mes Completo</th>
              <th v-if="colsVisibles.prorrateo"
                class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Prorrateo</th>
              <th class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 bg-purple-50">
                Valor a Facturar
              </th>
              <th v-if="colsVisibles.historial"
                class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Historial IPC</th>
              <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Facturado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in filas" :key="fila.contrato_id"
              class="border-b border-gray-50 hover:bg-gray-50/50"
              :class="!fila.habilitado ? 'opacity-40' : ''">
              <td class="px-3 py-2 text-center">
                <input type="checkbox"
                  :disabled="!fila.habilitado"
                  v-model="seleccion[fila.contrato_id]"
                  class="accent-purple-600" />
              </td>
              <td class="px-3 py-2 font-medium" style="color:#2C2039; white-space:nowrap">
                {{ fila.nombre_proyecto }}
              </td>
              <td class="px-3 py-2 font-mono text-xs text-gray-500">{{ fila.periodo }}</td>
              <td class="px-3 py-2 text-xs text-gray-600">{{ fila.mes_año }}</td>
              <td v-if="colsVisibles.n_indexaciones" class="px-3 py-2 text-right text-xs text-gray-500">
                {{ fila.n_indexaciones }}
              </td>
              <td class="px-3 py-2 text-right font-mono text-xs text-gray-600">
                {{ fila.valor_base_anual != null ? formatCOP(fila.valor_base_anual) : '—' }}
              </td>
              <td v-if="colsVisibles.factor_acumulado" class="px-3 py-2 text-right font-mono text-xs">
                {{ fila.habilitado ? fila.factor_acumulado.toFixed(6) : '—' }}
              </td>
              <td v-if="colsVisibles.valor_anual_indexado" class="px-3 py-2 text-right font-mono text-xs">
                {{ fila.valor_anual_indexado != null ? formatCOP(fila.valor_anual_indexado) : '—' }}
              </td>
              <td v-if="colsVisibles.valor_mes_completo" class="px-3 py-2 text-right font-mono text-xs">
                {{ fila.valor_mes_completo != null ? formatCOP(fila.valor_mes_completo) : '—' }}
              </td>
              <td v-if="colsVisibles.prorrateo" class="px-3 py-2 text-center text-xs text-gray-500">
                {{ fila.prorrateo_label }}
              </td>
              <td class="px-3 py-2 text-right font-semibold tabular-nums bg-purple-50/30"
                :style="fila.incluido && fila.habilitado ? 'color:#7c3aed' : 'color:#9ca3af'">
                {{ fila.valor_a_facturar != null ? formatCOP(fila.valor_a_facturar) : '—' }}
              </td>
              <td v-if="colsVisibles.historial" class="px-3 py-2 text-xs text-gray-400"
                style="white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis"
                :title="fila.historial_indexaciones">
                {{ fila.historial_indexaciones }}
              </td>
              <td class="px-3 py-2 text-center">
                <span v-if="fila.facturado"
                  class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style="background:#dcfce7;color:#166534">
                  <i class="pi pi-check text-[10px]"/>Sí
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
            </tr>
            <!-- Fila total -->
            <tr v-if="filas.length" class="bg-gray-50 border-t-2 border-gray-200">
              <td colspan="4" class="px-3 py-2.5 text-xs font-semibold text-gray-600">
                Total ({{ filasSeleccionadas }} proyectos seleccionados)
              </td>
              <td v-if="colsVisibles.n_indexaciones"></td>
              <td></td>
              <td v-if="colsVisibles.factor_acumulado"></td>
              <td v-if="colsVisibles.valor_anual_indexado"></td>
              <td v-if="colsVisibles.valor_mes_completo"></td>
              <td v-if="colsVisibles.prorrateo"></td>
              <td class="px-3 py-2.5 text-right font-bold tabular-nums"
                style="color:#7c3aed">
                {{ formatCOP(totalSeleccionado) }}
              </td>
              <td v-if="colsVisibles.historial"></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Factura consolidada del proveedor ──────────────────────────── -->
    <div class="flex items-center gap-3 p-3 rounded-xl border"
      :style="facturaProveedor.nombre_archivo
        ? 'background:#f0fdf4;border-color:#bbf7d0'
        : 'background:#fafafa;border-color:#e5e7eb'">
      <i class="pi pi-file-pdf text-sm flex-shrink-0"
        :style="facturaProveedor.nombre_archivo ? 'color:#16a34a' : 'color:#d1d5db'"/>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold"
          :style="facturaProveedor.nombre_archivo ? 'color:#15803d' : 'color:#9ca3af'">
          Factura consolidada del proveedor — {{ periodoLabel }}
        </p>
        <p class="text-[10px] mt-0.5"
          :style="facturaProveedor.nombre_archivo ? 'color:#166534' : 'color:#9ca3af'">
          {{ facturaProveedor.nombre_archivo
              ? `Subida el ${fmtFechaFactura(facturaProveedor.subido_en)}`
              : 'El proveedor aún no ha subido la factura de este período.' }}
        </p>
      </div>
      <a v-if="facturaProveedor.tiene_archivo"
        :href="`${apiBaseFactura}/om/factura/${periodoActual}/file`"
        target="_blank" rel="noopener"
        class="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0"
        style="color:#15803d">
        <i class="pi pi-download text-xs"/>Descargar
      </a>
      <a v-else-if="facturaProveedor.enlace_pdf"
        :href="facturaProveedor.enlace_pdf" target="_blank" rel="noopener"
        class="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0"
        style="color:#915BD8">
        <i class="pi pi-external-link text-xs"/>Ver
      </a>
    </div>

    <!-- ── Dialog administración IPC ─────────────────────────────────── -->
    <Dialog v-model:visible="showIPCDialog" modal header="Tasas IPC" :style="{ width: '420px' }">
      <div class="space-y-3 pt-1">
        <p class="text-xs text-gray-500">
          El IPC de diciembre del año N se aplica desde enero del año N+1.
        </p>
        <DataTable :value="ipcTasas" class="text-sm" stripedRows>
          <Column field="año" header="Año" style="width:80px" />
          <Column header="Tasa (%)">
            <template #body="{ data }">{{ (data.tasa * 100).toFixed(2) }}%</template>
          </Column>
          <Column header="Estado">
            <template #body="{ data }">
              <Tag :value="data.confirmado ? 'Confirmado' : 'Pendiente'"
                :severity="data.confirmado ? 'success' : 'warn'" />
            </template>
          </Column>
          <Column header="Fuente">
            <template #body="{ data }">{{ data.fuente || '—' }}</template>
          </Column>
        </DataTable>
        <div class="border-t pt-3 space-y-2">
          <p class="text-xs font-semibold text-gray-600">Agregar / actualizar tasa</p>
          <div class="grid grid-cols-3 gap-2">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Año</label>
              <InputNumber v-model="ipcForm.año" :useGrouping="false" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Tasa (%)</label>
              <InputNumber v-model="ipcForm.tasaPct" :minFractionDigits="2" :maxFractionDigits="4"
                suffix="%" class="w-full" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-500">Fuente</label>
              <InputText v-model="ipcForm.fuente" class="w-full" placeholder="DANE" />
            </div>
          </div>
          <Button label="Guardar tasa" icon="pi pi-check" size="small" :loading="guardandoIPC"
            @click="guardarIPC"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import Button        from 'primevue/button'
import Tag           from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog        from 'primevue/dialog'
import DataTable     from 'primevue/datatable'
import Column        from 'primevue/column'
import InputNumber   from 'primevue/inputnumber'
import InputText     from 'primevue/inputtext'
import { useToast }  from 'primevue/usetoast'
import api           from '@/api/client'

const toast = useToast()

const hoy = new Date()
const periodoOffset = ref(0)

const periodoActual = computed(() => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + periodoOffset.value, 1)
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
})

const periodoLabel = computed(() => {
  const [yyyy, mm] = periodoActual.value.split('-')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${MESES[parseInt(mm) - 1]} ${yyyy}`
})

function cambiarMes(delta) { periodoOffset.value += delta }

const columnasOpcionales = [
  { key: 'n_indexaciones',      label: 'N° de Indexaciones' },
  { key: 'factor_acumulado',    label: 'Factor Acumulado' },
  { key: 'valor_anual_indexado',label: 'Valor Anual Indexado (COP)' },
  { key: 'valor_mes_completo',  label: 'Valor Mes Completo (COP)' },
  { key: 'prorrateo',           label: 'Prorrateo (Días Op.)' },
  { key: 'historial',           label: 'Historial de Indexaciones' },
]
const colsVisibles = reactive({
  n_indexaciones:       false,
  factor_acumulado:     false,
  valor_anual_indexado: false,
  valor_mes_completo:   false,
  prorrateo:            false,
  historial:            false,
})
const showColMenu = ref(false)

const loading   = ref(false)
const guardando = ref(false)
const filas     = ref([])
const seleccion = reactive({})
const ipcTasas  = ref([])
const showIPCDialog = ref(false)
const guardandoIPC  = ref(false)
const notificacionIPC = ref(null)
const ipcForm = reactive({ año: new Date().getFullYear(), tasaPct: null, fuente: 'DANE' })

const filasHabilitadas   = computed(() => filas.value.filter(f => f.habilitado))
const filasSeleccionadas = computed(() => filasHabilitadas.value.filter(f => seleccion[f.contrato_id]).length)
const todosMarcados      = computed(() =>
  filasHabilitadas.value.length > 0 &&
  filasHabilitadas.value.every(f => seleccion[f.contrato_id])
)
const totalSeleccionado = computed(() =>
  filas.value
    .filter(f => f.habilitado && seleccion[f.contrato_id] && f.valor_a_facturar)
    .reduce((s, f) => s + f.valor_a_facturar, 0)
)

function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

function toggleTodos(e) {
  filasHabilitadas.value.forEach(f => { seleccion[f.contrato_id] = e.target.checked })
}

async function cargarDatos() {
  loading.value = true
  try {
    const [calcRes, ipcRes] = await Promise.all([
      api.get(`/om/calculo/${periodoActual.value}`),
      api.get('/om/ipc'),
    ])
    filas.value    = calcRes.data.filas
    ipcTasas.value = ipcRes.data

    filas.value.forEach(f => {
      if (seleccion[f.contrato_id] === undefined) {
        seleccion[f.contrato_id] = f.incluido && f.habilitado
      }
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function guardarSeleccion() {
  guardando.value = true
  try {
    const items = filas.value.map(f => ({
      contrato_id: f.contrato_id,
      incluido: !!(seleccion[f.contrato_id] && f.habilitado),
    }))
    await api.post(`/om/seleccion/${periodoActual.value}`, { items })
    toast.add({ severity: 'success', summary: 'Selección guardada', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function guardarIPC() {
  if (!ipcForm.año || ipcForm.tasaPct == null) return
  guardandoIPC.value = true
  const filasAntes = filas.value.map(f => ({ contrato_id: f.contrato_id, nombre: f.nombre_proyecto, valor: f.valor_a_facturar }))
  try {
    await api.put(`/om/ipc/${ipcForm.año}`, {
      tasa: ipcForm.tasaPct / 100,
      confirmado: true,
      fuente: ipcForm.fuente || 'manual',
    })
    toast.add({ severity: 'success', summary: 'Tasa IPC guardada', life: 2500 })
    const ipcRes = await api.get('/om/ipc')
    ipcTasas.value = ipcRes.data
    await cargarDatos()
    // Calcular cambios para notificación
    const afectados = []
    filas.value.forEach(f => {
      const antes = filasAntes.find(x => x.contrato_id === f.contrato_id)
      if (antes && antes.valor != null && f.valor_a_facturar != null && antes.valor !== f.valor_a_facturar) {
        const diff_cop = f.valor_a_facturar - antes.valor
        const diff_pct = antes.valor > 0 ? (diff_cop / antes.valor) * 100 : 0
        afectados.push({ contrato_id: f.contrato_id, nombre: f.nombre_proyecto, valor_anterior: antes.valor, valor_nuevo: f.valor_a_facturar, diff_cop, diff_pct })
      }
    })
    if (afectados.length) {
      notificacionIPC.value = { año: ipcForm.año, tasa: ipcForm.tasaPct / 100, afectados }
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar IPC', life: 3000 })
  } finally {
    guardandoIPC.value = false
  }
}

// ── Factura del proveedor (lectura desde Operaciones) ─────────────────────────
const facturaProveedor = ref({ nombre_archivo: null, enlace_pdf: null, tiene_archivo: false, subido_en: null })
const apiBaseFactura   = import.meta.env.VITE_API_URL?.replace(/\/$/, '') + '/api/v1'

function fmtFechaFactura(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

async function cargarFacturaProveedor() {
  try {
    const { data } = await api.get(`/om/factura/${periodoActual.value}`)
    facturaProveedor.value = data
  } catch { facturaProveedor.value = { nombre_archivo: null, enlace_pdf: null, tiene_archivo: false, subido_en: null } }
}

watch(periodoActual, () => { cargarDatos(); cargarFacturaProveedor() })
onMounted(() => { cargarDatos(); cargarFacturaProveedor() })
</script>
