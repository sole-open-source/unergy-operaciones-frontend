<template>
  <div class="space-y-4 pt-3">

    <!-- ── Barra superior: periodo + columnas + IPC ──────────────────────── -->
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

    <!-- ── Tabla ──────────────────────────────────────────────────────────── -->
    <div class="rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse" style="min-width:960px">
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
              class="border-b border-gray-50 hover:bg-gray-50/50"
              :class="!fila.habilitado ? 'opacity-40' : ''">
              <td class="px-3 py-2 text-center">
                <input type="checkbox"
                  :disabled="!fila.habilitado"
                  v-model="seleccion[fila.id]"
                  class="accent-purple-600" />
              </td>
              <td class="px-3 py-2 font-medium" style="color:#2C2039; white-space:nowrap">
                {{ fila.proyecto }}
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
              <td class="px-3 py-2 text-right tabular-nums bg-purple-50/30"
                :style="fila.habilitado && seleccion[fila.id] ? 'color:#7c3aed' : 'color:#9ca3af'">
                <span v-if="fila.canon_calculado != null" class="font-semibold">
                  {{ formatCOP(fila.canon_calculado) }}
                </span>
                <span v-if="fila.difiere_archivo"
                  class="ml-1 text-amber-600 font-normal text-[10px] whitespace-nowrap"
                  :title="`Valor en archivo: ${formatCOP(fila.canon_archivo)}`">
                  ⚠️ Difiere del archivo: {{ formatCOP(fila.canon_archivo) }}
                </span>
                <span v-if="fila.canon_calculado == null" class="text-gray-300">—</span>
              </td>
              <td v-if="colsVisibles.historial" class="px-3 py-2 text-xs text-gray-400"
                style="white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis"
                :title="fila.historial_detalle">
                {{ fila.historial_texto || '—' }}
              </td>
              <td class="px-3 py-2 text-center">
                <button type="button"
                  :disabled="!fila.habilitado"
                  @click="toggleFacturado(fila.id)">
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
        <p class="font-semibold mb-1">IPC pendiente para calcular próximos aniversarios</p>
        <p>Los siguientes proyectos tienen aniversarios próximos pero el IPC del año correspondiente aún no está disponible: {{ proyectosSinIPC.join(', ') }}. Agrégalo en el diálogo IPC.</p>
      </div>
    </div>

    <!-- ── Dialog IPC ─────────────────────────────────────────────────────── -->
    <Dialog v-model:visible="showIPCDialog" modal header="Tasas IPC — Arriendos" :style="{ width: '460px' }">
      <div class="space-y-3 pt-1">
        <p class="text-xs text-gray-500">
          El IPC de diciembre del año N se aplica en los aniversarios del año N+1, según la cláusula de indexación del contrato (DANE).
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
          <Button label="Guardar tasa" icon="pi pi-check" size="small"
            @click="guardarIPC"
            style="background:#915BD8;border-color:#915BD8" />
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
  { año: 2023, tasa: 0.0928, confirmado: true,  fuente: 'DANE' },
  { año: 2024, tasa: 0.0520, confirmado: true,  fuente: 'DANE' },
  { año: 2025, tasa: 0.0510, confirmado: true,  fuente: 'DANE' },
])

function cargarIPCStorage() {
  try {
    const raw = localStorage.getItem(IPC_STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      // Merge: stored rates override defaults for matching years
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
const ipcForm       = reactive({ año: new Date().getFullYear(), tasaPct: null, fuente: 'DANE' })

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

// ── Cálculo de indexaciones ────────────────────────────────────────────────────
function calcularFila(proyecto) {
  const id        = proyecto.Codigo || proyecto.Proyecto
  const valorBase = proyecto['Valor base']
  const canonArchivo = proyecto['Canon arrendamiento']

  if (!proyecto['Fecha firma contrato'] || valorBase == null) {
    return {
      id,
      proyecto:            proyecto.Proyecto,
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
    }
  }

  const [yyyy]    = periodoActual.value.split('-').map(Number)
  const añoPeriodo = yyyy
  const añoFirma   = new Date(proyecto['Fecha firma contrato']).getFullYear()

  let valorActual    = valorBase
  let factorAcum     = 1
  let nIndexaciones  = 0
  let ipcFaltante    = false
  const histItems    = []
  const histDetalle  = [`Base ${añoFirma} (${proyecto['Fecha firma contrato']}): ${formatCOP(valorBase)}`]

  // Indexación por año calendario: 1 ene de cada año desde año_firma+1 hasta año_periodo
  for (let añoCorriente = añoFirma + 1; añoCorriente <= añoPeriodo; añoCorriente++) {
    const añoDic = añoCorriente - 1   // IPC de diciembre del año anterior
    const ipc    = getIPC(añoDic)

    if (ipc === undefined) {
      ipcFaltante = true
      histDetalle.push(`Ene ${añoCorriente}: IPC dic ${añoDic} no disponible ⚠️`)
      break
    }

    valorActual  = valorActual * (1 + ipc)
    factorAcum  *= (1 + ipc)
    nIndexaciones++

    const label = `Ene ${añoCorriente} (IPC dic ${añoDic}: ${(ipc * 100).toFixed(2)}%) → ${formatCOP(valorActual)}`
    histItems.push(`IPC dic ${añoDic}: ${(ipc * 100).toFixed(2)}%`)
    histDetalle.push(label + (añoCorriente <= hoy.getFullYear() ? '' : ' [Proyectado]'))
  }

  // Detectar si el próximo año necesita IPC aún no disponible
  if (!ipcFaltante && getIPC(añoPeriodo) === undefined) {
    ipcFaltante = true
  }

  const TOLERANCIA = 0.001
  const difiere = canonArchivo != null &&
    Math.abs(valorActual - canonArchivo) / Math.max(Math.abs(canonArchivo), 1) > TOLERANCIA

  return {
    id,
    proyecto:            proyecto.Proyecto,
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
  }
}

function fmtFecha(date) {
  try {
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

// ── Filas ──────────────────────────────────────────────────────────────────────
const filas = computed(() => arriendosRaw.map(p => calcularFila(p)))

const proyectosSinIPC = computed(() =>
  filas.value.filter(f => f.habilitado && f.ipc_faltante).map(f => f.proyecto)
)

// ── Selección ──────────────────────────────────────────────────────────────────
const SEL_STORAGE_KEY  = 'arriendos_seleccion'
const FACT_STORAGE_KEY = 'arriendos_facturado'

const seleccion      = reactive({})
const facturadoStore = reactive({})

const facturadoActual = computed(() => facturadoStore[periodoActual.value] || {})

const filasHabilitadas   = computed(() => filas.value.filter(f => f.habilitado))
const todosMarcados      = computed(() =>
  filasHabilitadas.value.length > 0 &&
  filasHabilitadas.value.every(f => seleccion[f.id])
)
const filasSeleccionadas = computed(() =>
  filasHabilitadas.value.filter(f => seleccion[f.id]).length
)
const totalSeleccionado  = computed(() =>
  filas.value
    .filter(f => f.habilitado && seleccion[f.id] && f.canon_calculado != null)
    .reduce((s, f) => s + f.canon_calculado, 0)
)

function toggleTodos(e) {
  filasHabilitadas.value.forEach(f => { seleccion[f.id] = e.target.checked })
}

function toggleFacturado(id) {
  if (!facturadoStore[periodoActual.value]) facturadoStore[periodoActual.value] = {}
  facturadoStore[periodoActual.value][id] = !facturadoStore[periodoActual.value][id]
  persistFacturado()
}

// ── Persistencia en localStorage ───────────────────────────────────────────────
function cargarStorage() {
  try {
    const rawSel = localStorage.getItem(SEL_STORAGE_KEY)
    if (rawSel) {
      const data = JSON.parse(rawSel)
      const periodo = periodoActual.value
      const saved   = data[periodo] || {}
      filasHabilitadas.value.forEach(f => {
        seleccion[f.id] = saved[f.id] !== undefined ? saved[f.id] : true
      })
    } else {
      filasHabilitadas.value.forEach(f => { seleccion[f.id] = true })
    }
  } catch {
    filasHabilitadas.value.forEach(f => { seleccion[f.id] = true })
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
    filasHabilitadas.value.forEach(f => {
      data[periodoActual.value][f.id] = !!seleccion[f.id]
    })
    localStorage.setItem(SEL_STORAGE_KEY, JSON.stringify(data))
    // Publicar para ArriendosProveedor
    window.dispatchEvent(new CustomEvent('arriendos-seleccion-guardada', { detail: { periodo: periodoActual.value } }))
    toast.add({ severity: 'success', summary: 'Selección guardada', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

function persistFacturado() {
  try { localStorage.setItem(FACT_STORAGE_KEY, JSON.stringify(facturadoStore)) } catch {}
}

watch(periodoActual, () => { cargarStorage() })
onMounted(() => { cargarIPCStorage(); cargarStorage() })
</script>
