<template>
  <div class="space-y-4 pt-3">

    <!-- ── Barra superior ────────────────────────────────────────────────── -->
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
        <Button label="Agregar proyecto" icon="pi pi-plus" size="small" outlined
          @click="openAgregar"
          style="border-color:#915BD8;color:#915BD8" />
        <Button label="Guardar selección" icon="pi pi-save" size="small"
          :loading="guardando"
          style="background:#915BD8;border-color:#915BD8"
          @click="guardarSeleccion" />
      </div>
    </div>

    <!-- ── Tabla ──────────────────────────────────────────────────────────── -->
    <div class="rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse" style="min-width:980px">
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
              <th class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Valor Base</th>
              <th v-if="colsVisibles.factor_acumulado"
                class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Factor Acum.</th>
              <th v-if="colsVisibles.valor_anual_indexado"
                class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Val. Anual Indexado</th>
              <th class="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 bg-purple-50">
                Canon Arrendamiento
              </th>
              <th v-if="colsVisibles.historial"
                class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Historial IPC</th>
              <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Facturado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in filas" :key="fila.id"
              class="border-b border-gray-50 hover:bg-gray-50/50 group"
              :class="!fila.habilitado ? 'opacity-50' : ''">
              <!-- Checkbox — siempre habilitado -->
              <td class="px-3 py-2 text-center">
                <input type="checkbox" v-model="seleccion[fila.id]" class="accent-purple-600" />
              </td>
              <!-- Proyecto + botón editar -->
              <td class="px-3 py-2 font-medium" style="color:#2C2039; white-space:nowrap">
                <span class="inline-flex items-center gap-1.5">
                  {{ fila.proyecto }}
                  <button type="button"
                    class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-purple-600"
                    title="Editar proyecto"
                    @click="openEditar(fila)">
                    <i class="pi pi-pencil" style="font-size:11px" />
                  </button>
                </span>
              </td>
              <td class="px-3 py-2 font-mono text-xs text-gray-500">{{ periodoActual }}</td>
              <td class="px-3 py-2 text-xs text-gray-600">{{ periodoLabel }}</td>
              <td v-if="colsVisibles.n_indexaciones" class="px-3 py-2 text-right text-xs text-gray-500">
                {{ fila.n_indexaciones ?? '—' }}
              </td>
              <td class="px-3 py-2 text-right font-mono text-xs text-gray-600">
                {{ fila.valor_base != null ? formatCOP(fila.valor_base) : '—' }}
              </td>
              <td v-if="colsVisibles.factor_acumulado" class="px-3 py-2 text-right font-mono text-xs">
                {{ fila.factor_acumulado != null ? fila.factor_acumulado.toFixed(6) : '—' }}
              </td>
              <td v-if="colsVisibles.valor_anual_indexado" class="px-3 py-2 text-right font-mono text-xs">
                {{ fila.valor_anual_indexado != null ? formatCOP(fila.valor_anual_indexado) : '—' }}
              </td>
              <!-- Canon — muestra valor del archivo; ícono si difiere del calculado -->
              <td class="px-3 py-2 text-right tabular-nums bg-purple-50/30"
                :style="seleccion[fila.id] ? 'color:#7c3aed' : 'color:#9ca3af'">
                <span class="inline-flex items-center justify-end gap-1">
                  <span v-if="fila.canon_archivo != null" class="font-semibold">
                    {{ formatCOP(fila.canon_archivo) }}
                  </span>
                  <span v-else-if="fila.canon_calculado != null" class="font-semibold">
                    {{ formatCOP(fila.canon_calculado) }}
                  </span>
                  <span v-else class="text-gray-300">—</span>
                  <i v-if="fila.difiere_archivo"
                    class="pi pi-exclamation-triangle flex-shrink-0 cursor-help"
                    style="font-size:11px;color:#f59e0b"
                    v-tooltip.top="`Valor calculado por IPC: ${formatCOP(fila.canon_calculado)}`" />
                </span>
              </td>
              <td v-if="colsVisibles.historial" class="px-3 py-2 text-xs text-gray-400"
                style="white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis"
                :title="fila.historial_detalle">
                {{ fila.historial_texto || '—' }}
              </td>
              <td class="px-3 py-2 text-center">
                <button type="button" @click="toggleFacturado(fila.id)">
                  <span v-if="facturadoActual[fila.id]"
                    class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style="background:#dcfce7;color:#166534">
                    <i class="pi pi-check text-[10px]"/>Sí
                  </span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </button>
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
              <td class="px-3 py-2.5 text-right font-bold tabular-nums" style="color:#7c3aed">
                {{ formatCOP(totalSeleccionado) }}
              </td>
              <td v-if="colsVisibles.historial"></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Notificación IPC pendiente ─────────────────────────────────────── -->
    <div v-if="proyectosSinIPC.length"
      class="rounded-xl border p-3 flex items-start gap-3"
      style="background:#fef3c7;border-color:#f59e0b40">
      <i class="pi pi-exclamation-triangle text-sm flex-shrink-0 mt-0.5" style="color:#d97706"/>
      <div class="flex-1 text-xs" style="color:#92400e">
        <p class="font-semibold mb-1">IPC pendiente para próximos períodos</p>
        <p>{{ proyectosSinIPC.join(', ') }} — agrégalo en el diálogo IPC.</p>
      </div>
    </div>

    <!-- ── Dialog IPC ─────────────────────────────────────────────────────── -->
    <Dialog v-model:visible="showIPCDialog" modal header="Tasas IPC — Arriendos" :style="{ width: '460px' }">
      <div class="space-y-3 pt-1">
        <p class="text-xs text-gray-500">
          El IPC de diciembre del año N se aplica a partir del 1 de enero del año N+1.
        </p>
        <DataTable :value="ipcTasas" class="text-sm" stripedRows>
          <Column field="año" header="Año dic" style="width:80px" />
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
              <label class="text-xs text-gray-500">Año (dic)</label>
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
          <Button label="Guardar tasa" icon="pi pi-check" size="small"
            @click="guardarIPC"
            style="background:#915BD8;border-color:#915BD8" />
        </div>
      </div>
    </Dialog>

    <!-- ── Dialog Agregar / Editar proyecto ──────────────────────────────── -->
    <Dialog v-model:visible="showFormDialog" modal
      :header="formMode === 'agregar' ? 'Agregar proyecto' : 'Editar proyecto'"
      :style="{ width: '480px' }">
      <div class="space-y-3 pt-1">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs font-medium text-gray-500">Proyecto <span class="text-red-400">*</span></label>
            <InputText v-model="formData.Proyecto" class="w-full" placeholder="Minigranja Solar …" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500">Código</label>
            <InputText v-model="formData.Codigo" class="w-full" placeholder="COLCEST…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500">Fecha firma contrato</label>
            <input type="date" v-model="formData['Fecha firma contrato']"
              class="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500">Valor base (COP/mes)</label>
            <InputNumber v-model="formData['Valor base']" :useGrouping="true" class="w-full"
              placeholder="0" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500">Canon arrendamiento (COP/mes)</label>
            <InputNumber v-model="formData['Canon arrendamiento']" :useGrouping="true" class="w-full"
              placeholder="0" />
          </div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t">
          <button v-if="formMode === 'editar' && formEsExtra"
            type="button"
            class="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            @click="eliminarProyecto">
            <i class="pi pi-trash text-xs" /> Eliminar
          </button>
          <div v-else />
          <div class="flex gap-2">
            <Button label="Cancelar" size="small" outlined severity="secondary"
              @click="showFormDialog = false" />
            <Button label="Guardar" icon="pi pi-check" size="small"
              :disabled="!formData.Proyecto"
              @click="guardarForm"
              style="background:#915BD8;border-color:#915BD8" />
          </div>
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import Button      from 'primevue/button'
import Tag         from 'primevue/tag'
import Dialog      from 'primevue/dialog'
import DataTable   from 'primevue/datatable'
import Column      from 'primevue/column'
import InputNumber from 'primevue/inputnumber'
import InputText   from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import arriendosRaw from '@/data/pagoarriendos.json'

const toast = useToast()

// ── Período ────────────────────────────────────────────────────────────────────
const hoy           = new Date()
const periodoOffset = ref(0)

const periodoActual = computed(() => {
  const d    = new Date(hoy.getFullYear(), hoy.getMonth() + periodoOffset.value, 1)
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

// ── Columnas opcionales ────────────────────────────────────────────────────────
const columnasOpcionales = [
  { key: 'n_indexaciones',      label: 'N° de Indexaciones' },
  { key: 'factor_acumulado',    label: 'Factor Acumulado' },
  { key: 'valor_anual_indexado',label: 'Valor Anual Indexado' },
  { key: 'historial',           label: 'Historial de Indexaciones' },
]
const colsVisibles = reactive({
  n_indexaciones:       false,
  factor_acumulado:     false,
  valor_anual_indexado: false,
  historial:            false,
})
const showColMenu = ref(false)

// ── Tasas IPC ──────────────────────────────────────────────────────────────────
const IPC_STORAGE_KEY = 'arriendos_ipc_tasas'

const ipcTasas = ref([
  { año: 2023, tasa: 0.0928, confirmado: true, fuente: 'DANE' },
  { año: 2024, tasa: 0.0520, confirmado: true, fuente: 'DANE' },
  { año: 2025, tasa: 0.0510, confirmado: true, fuente: 'DANE' },
])

function cargarIPCStorage() {
  try {
    const raw = localStorage.getItem(IPC_STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      stored.forEach(s => {
        const idx = ipcTasas.value.findIndex(t => t.año === s.año)
        if (idx >= 0) ipcTasas.value[idx] = s
        else ipcTasas.value.push(s)
      })
      ipcTasas.value.sort((a, b) => a.año - b.año)
    }
  } catch {}
}

function getIPC(año) {
  return ipcTasas.value.find(t => t.año === año)?.tasa
}

const showIPCDialog = ref(false)
const ipcForm       = reactive({ año: new Date().getFullYear() - 1, tasaPct: null, fuente: 'DANE' })

function guardarIPC() {
  if (!ipcForm.año || ipcForm.tasaPct == null) return
  const tasa = ipcForm.tasaPct / 100
  const idx  = ipcTasas.value.findIndex(t => t.año === ipcForm.año)
  if (idx >= 0) {
    ipcTasas.value[idx] = { año: ipcForm.año, tasa, confirmado: true, fuente: ipcForm.fuente || 'DANE' }
  } else {
    ipcTasas.value.push({ año: ipcForm.año, tasa, confirmado: true, fuente: ipcForm.fuente || 'DANE' })
    ipcTasas.value.sort((a, b) => a.año - b.año)
  }
  try { localStorage.setItem(IPC_STORAGE_KEY, JSON.stringify(ipcTasas.value)) } catch {}
  toast.add({ severity: 'success', summary: 'Tasa IPC guardada', life: 2500 })
}

// ── Proyectos extra (agregados manualmente) y overrides de edición ─────────────
const EXTRA_STORAGE_KEY    = 'arriendos_proyectos_extra'
const OVERRIDE_STORAGE_KEY = 'arriendos_overrides'

const proyectosExtra    = ref([])   // array de objetos con misma estructura que arriendosRaw
const proyectosOverride = ref({})   // { id: { campos sobreescritos } }

function cargarProyectosStorage() {
  try {
    const rawExtra = localStorage.getItem(EXTRA_STORAGE_KEY)
    if (rawExtra) proyectosExtra.value = JSON.parse(rawExtra)
  } catch {}
  try {
    const rawOv = localStorage.getItem(OVERRIDE_STORAGE_KEY)
    if (rawOv) proyectosOverride.value = JSON.parse(rawOv)
  } catch {}
}

function persistExtra() {
  try { localStorage.setItem(EXTRA_STORAGE_KEY, JSON.stringify(proyectosExtra.value)) } catch {}
}
function persistOverride() {
  try { localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(proyectosOverride.value)) } catch {}
}

// ── Cálculo de indexaciones ────────────────────────────────────────────────────
function calcularFila(proyectoRaw) {
  // Aplicar override si existe
  const id  = proyectoRaw._extraId ?? (proyectoRaw.Codigo || proyectoRaw.Proyecto)
  const ov  = proyectosOverride.value[id] || {}
  const p   = { ...proyectoRaw, ...ov }

  const valorBase    = p['Valor base']
  const canonArchivo = p['Canon arrendamiento']

  const sinDatos = !p['Fecha firma contrato'] || valorBase == null
  if (sinDatos) {
    return {
      id,
      proyecto:            p.Proyecto,
      valor_base:          valorBase ?? null,
      canon_calculado:     null,
      canon_archivo:       canonArchivo ?? null,
      difiere_archivo:     false,
      n_indexaciones:      null,
      factor_acumulado:    null,
      valor_anual_indexado:null,
      historial_texto:     '—',
      historial_detalle:   '—',
      habilitado:          false,
      ipc_faltante:        false,
      esExtra:             !!proyectoRaw._extraId,
    }
  }

  const [yyyy]     = periodoActual.value.split('-').map(Number)
  const añoPeriodo = yyyy
  const añoFirma   = new Date(p['Fecha firma contrato']).getFullYear()

  let valorActual   = valorBase
  let factorAcum    = 1
  let nIndexaciones = 0
  let ipcFaltante   = false
  const histItems   = []
  const histDetalle = [`Base ${añoFirma} (${p['Fecha firma contrato']}): ${formatCOP(valorBase)}`]

  for (let añoCorriente = añoFirma + 1; añoCorriente <= añoPeriodo; añoCorriente++) {
    const añoDic = añoCorriente - 1
    const ipc    = getIPC(añoDic)
    if (ipc === undefined) {
      ipcFaltante = true
      histDetalle.push(`Ene ${añoCorriente}: IPC dic ${añoDic} no disponible`)
      break
    }
    valorActual  = valorActual * (1 + ipc)
    factorAcum  *= (1 + ipc)
    nIndexaciones++
    const label = `Ene ${añoCorriente} (IPC dic ${añoDic}: ${(ipc * 100).toFixed(2)}%) → ${formatCOP(valorActual)}`
    histItems.push(`IPC dic ${añoDic}: ${(ipc * 100).toFixed(2)}%`)
    histDetalle.push(label + (añoCorriente <= hoy.getFullYear() ? '' : ' [Proyectado]'))
  }

  if (!ipcFaltante && getIPC(añoPeriodo) === undefined) ipcFaltante = true

  const TOLERANCIA = 0.001
  const difiere = canonArchivo != null &&
    Math.abs(valorActual - canonArchivo) / Math.max(Math.abs(canonArchivo), 1) > TOLERANCIA

  return {
    id,
    proyecto:            p.Proyecto,
    valor_base:          valorBase,
    canon_calculado:     valorActual,
    canon_archivo:       canonArchivo,
    difiere_archivo:     difiere,
    n_indexaciones:      nIndexaciones,
    factor_acumulado:    factorAcum,
    valor_anual_indexado:valorActual * 12,
    historial_texto:     histItems.length ? histItems.join(' → ') : `Sin indexaciones (base: ${formatCOP(valorBase)})`,
    historial_detalle:   histDetalle.join('\n'),
    habilitado:          true,
    ipc_faltante:        ipcFaltante,
    esExtra:             !!proyectoRaw._extraId,
  }
}

function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

// ── Filas (JSON + extras) ──────────────────────────────────────────────────────
const filas = computed(() => {
  const base   = arriendosRaw.map(p => calcularFila(p))
  const extras = proyectosExtra.value.map(p => calcularFila(p))
  return [...base, ...extras]
})

const proyectosSinIPC = computed(() =>
  filas.value.filter(f => f.habilitado && f.ipc_faltante).map(f => f.proyecto)
)

// ── Selección (todos los proyectos, habilitados o no) ─────────────────────────
const SEL_STORAGE_KEY  = 'arriendos_seleccion'
const FACT_STORAGE_KEY = 'arriendos_facturado'

const seleccion      = reactive({})
const facturadoStore = reactive({})

const facturadoActual    = computed(() => facturadoStore[periodoActual.value] || {})
const todosMarcados      = computed(() =>
  filas.value.length > 0 && filas.value.every(f => seleccion[f.id])
)
const filasSeleccionadas = computed(() => filas.value.filter(f => seleccion[f.id]).length)
const totalSeleccionado  = computed(() =>
  filas.value
    .filter(f => seleccion[f.id])
    .reduce((s, f) => s + (f.canon_archivo ?? f.canon_calculado ?? 0), 0)
)

function toggleTodos(e) {
  filas.value.forEach(f => { seleccion[f.id] = e.target.checked })
}

function toggleFacturado(id) {
  if (!facturadoStore[periodoActual.value]) facturadoStore[periodoActual.value] = {}
  facturadoStore[periodoActual.value][id] = !facturadoStore[periodoActual.value][id]
  try { localStorage.setItem(FACT_STORAGE_KEY, JSON.stringify(facturadoStore)) } catch {}
}

// ── Persistencia ───────────────────────────────────────────────────────────────
function cargarStorage() {
  try {
    const rawSel = localStorage.getItem(SEL_STORAGE_KEY)
    const data   = rawSel ? JSON.parse(rawSel) : {}
    const saved  = data[periodoActual.value] || {}
    filas.value.forEach(f => {
      seleccion[f.id] = saved[f.id] !== undefined ? saved[f.id] : true
    })
  } catch {
    filas.value.forEach(f => { seleccion[f.id] = true })
  }
  try {
    const rawFact = localStorage.getItem(FACT_STORAGE_KEY)
    if (rawFact) Object.assign(facturadoStore, JSON.parse(rawFact))
  } catch {}
}

const guardando = ref(false)
function guardarSeleccion() {
  guardando.value = true
  try {
    const raw  = localStorage.getItem(SEL_STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[periodoActual.value] = {}
    filas.value.forEach(f => { data[periodoActual.value][f.id] = !!seleccion[f.id] })
    localStorage.setItem(SEL_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new CustomEvent('arriendos-seleccion-guardada', { detail: { periodo: periodoActual.value } }))
    toast.add({ severity: 'success', summary: 'Selección guardada', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

// ── Dialog Agregar / Editar ────────────────────────────────────────────────────
const showFormDialog = ref(false)
const formMode       = ref('agregar')   // 'agregar' | 'editar'
const formTargetId   = ref(null)
const formEsExtra    = ref(false)
const formData       = reactive({
  Proyecto: '',
  Codigo: '',
  'Fecha firma contrato': '',
  'Valor base': null,
  'Canon arrendamiento': null,
})

function resetForm() {
  formData.Proyecto               = ''
  formData.Codigo                 = ''
  formData['Fecha firma contrato'] = ''
  formData['Valor base']          = null
  formData['Canon arrendamiento'] = null
}

function openAgregar() {
  resetForm()
  formMode.value    = 'agregar'
  formTargetId.value = null
  formEsExtra.value  = false
  showFormDialog.value = true
}

function openEditar(fila) {
  // Reconstruir campos actuales (override + raw)
  const raw = fila.esExtra
    ? proyectosExtra.value.find(p => p._extraId === fila.id)
    : arriendosRaw.find(p => (p.Codigo || p.Proyecto) === fila.id)
  const ov  = proyectosOverride.value[fila.id] || {}
  const src = { ...(raw || {}), ...ov }

  formData.Proyecto               = src.Proyecto || ''
  formData.Codigo                 = src.Codigo || ''
  formData['Fecha firma contrato'] = src['Fecha firma contrato'] || ''
  formData['Valor base']          = src['Valor base'] ?? null
  formData['Canon arrendamiento'] = src['Canon arrendamiento'] ?? null

  formMode.value    = 'editar'
  formTargetId.value = fila.id
  formEsExtra.value  = fila.esExtra
  showFormDialog.value = true
}

function guardarForm() {
  if (!formData.Proyecto) return

  if (formMode.value === 'agregar') {
    const extraId = `extra_${Date.now()}`
    proyectosExtra.value.push({
      _extraId:                 extraId,
      Proyecto:                 formData.Proyecto,
      Codigo:                   formData.Codigo || undefined,
      'Fecha firma contrato':   formData['Fecha firma contrato'] || undefined,
      'Valor base':             formData['Valor base'] ?? undefined,
      'Canon arrendamiento':    formData['Canon arrendamiento'] ?? undefined,
    })
    persistExtra()
    // Seleccionar el nuevo proyecto por defecto
    seleccion[extraId] = true
  } else {
    // Editar: guardar como override (para JSON) o actualizar directamente (para extra)
    if (formEsExtra.value) {
      const idx = proyectosExtra.value.findIndex(p => p._extraId === formTargetId.value)
      if (idx >= 0) {
        proyectosExtra.value[idx] = {
          ...proyectosExtra.value[idx],
          Proyecto:               formData.Proyecto,
          Codigo:                 formData.Codigo || undefined,
          'Fecha firma contrato': formData['Fecha firma contrato'] || undefined,
          'Valor base':           formData['Valor base'] ?? undefined,
          'Canon arrendamiento':  formData['Canon arrendamiento'] ?? undefined,
        }
        persistExtra()
      }
    } else {
      proyectosOverride.value[formTargetId.value] = {
        Proyecto:               formData.Proyecto,
        Codigo:                 formData.Codigo || undefined,
        'Fecha firma contrato': formData['Fecha firma contrato'] || undefined,
        'Valor base':           formData['Valor base'] ?? undefined,
        'Canon arrendamiento':  formData['Canon arrendamiento'] ?? undefined,
      }
      persistOverride()
    }
  }

  showFormDialog.value = false
  toast.add({ severity: 'success', summary: formMode.value === 'agregar' ? 'Proyecto agregado' : 'Proyecto actualizado', life: 2500 })
}

function eliminarProyecto() {
  if (!formEsExtra.value) return
  proyectosExtra.value = proyectosExtra.value.filter(p => p._extraId !== formTargetId.value)
  persistExtra()
  showFormDialog.value = false
  toast.add({ severity: 'info', summary: 'Proyecto eliminado', life: 2500 })
}

watch(periodoActual, () => { cargarStorage() })
onMounted(() => { cargarIPCStorage(); cargarProyectosStorage(); cargarStorage() })
</script>
