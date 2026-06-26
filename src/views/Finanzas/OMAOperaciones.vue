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
              <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Documento</th>
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
                <span v-if="!fila.habilitado"
                  class="inline-flex items-center gap-1 ml-1.5 text-[10px] font-normal px-1.5 py-0.5 rounded-full align-middle"
                  style="background:#fef3c7; color:#92400e"
                  :title="fila.historial_indexaciones">
                  <i class="pi pi-exclamation-triangle text-[9px]" />{{ fila.historial_indexaciones }}
                </span>
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
              <td class="px-3 py-2 text-right bg-purple-50/30 group"
                style="position:relative; min-width:150px">
                <!-- Modo edición -->
                <input v-if="editando === fila.contrato_id"
                  v-model="inputBuffer"
                  type="text" inputmode="numeric"
                  class="w-full text-right text-sm tabular-nums font-semibold rounded-md px-1.5 py-0.5 outline-none"
                  style="border:1.5px solid #915BD8; color:#7c3aed"
                  @keydown.enter.prevent="confirmarEdicion(fila)"
                  @keydown.esc.prevent="cancelarEdicion()"
                  @blur="confirmarEdicion(fila)"
                  v-focus />
                <!-- Modo display -->
                <div v-else class="flex items-center justify-end gap-1.5">
                  <!-- Íconos en hover -->
                  <span class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <i v-if="fila.habilitado" class="pi pi-pencil text-[11px] cursor-pointer"
                      style="color:#915BD8" title="Editar valor"
                      @click="iniciarEdicion(fila)" />
                    <i v-if="fila.habilitado" class="pi pi-info-circle text-[11px] cursor-pointer"
                      style="color:#915BD8" title="Ver cálculo"
                      @click="mostrarInfo($event, fila)" />
                  </span>
                  <!-- Indicador de modificación manual -->
                  <span v-if="esManual(fila)" title="Valor modificado manualmente"
                    style="color:#f59e0b; font-size:12px; line-height:1">●</span>
                  <!-- Valor -->
                  <span class="font-semibold tabular-nums cursor-text"
                    :style="(fila.incluido && fila.habilitado) ? 'color:#7c3aed' : 'color:#9ca3af'"
                    @click="iniciarEdicion(fila)">
                    {{ valorEfectivo(fila) != null ? formatCOP(valorEfectivo(fila)) : '—' }}
                  </span>
                </div>
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
              <td class="px-3 py-2 text-center">
                <DocumentoIcon
                  :doc="fila.documento_disponible ? { nombre_archivo: fila.documento_nombre || fila.nombre_proyecto } : null"
                  :tooltip="fila.documento_disponible ? (fila.documento_nombre || fila.nombre_proyecto) : null"
                  @click="descargarDocumento(fila)" />
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

    <!-- ── Popover: desglose del cálculo ──────────────────────────────── -->
    <Popover ref="infoPopover">
      <div v-if="filaInfo" class="text-xs" style="min-width:280px; color:#2C2039">
        <p class="font-semibold mb-2 flex items-center gap-1.5" style="color:#7c3aed">
          <i class="pi pi-chart-bar text-[11px]" /> Cálculo del Valor a Facturar
        </p>
        <div class="space-y-1 font-mono">
          <div class="flex justify-between gap-6">
            <span class="text-gray-500">Valor Base Anual</span>
            <span>{{ formatCOP(filaInfo.valor_base_anual) }}</span>
          </div>
          <div class="flex justify-between gap-6">
            <span class="text-gray-500">÷ 12 meses</span>
            <span>{{ formatCOP(filaInfo.valor_base_anual / 12) }}</span>
          </div>
          <div class="flex justify-between gap-6">
            <span class="text-gray-500">Índice IPC aplicado</span>
            <span>× {{ filaInfo.factor_acumulado.toFixed(5) }}</span>
          </div>
          <div class="flex justify-between gap-6">
            <span class="text-gray-500">IPC acumulado período</span>
            <span>{{ ipcAcumPct(filaInfo) }}%</span>
          </div>
          <div v-if="filaInfo.prorrateo_label && filaInfo.prorrateo_label !== 'Completo'"
            class="flex justify-between gap-6">
            <span class="text-gray-500">Prorrateo</span>
            <span>{{ filaInfo.prorrateo_label }}</span>
          </div>
        </div>
        <div class="border-t mt-2 pt-2">
          <div class="flex justify-between gap-6 font-semibold">
            <span>Valor a Facturar</span>
            <span style="color:#7c3aed">{{ formatCOP(valorEfectivo(filaInfo)) }}</span>
          </div>
        </div>
        <!-- Aviso de modificación manual -->
        <div v-if="esManual(filaInfo)"
          class="mt-2 pt-2 border-t rounded-md p-2 text-[11px] flex items-start gap-1.5"
          style="background:#fffbeb; color:#92400e">
          <i class="pi pi-exclamation-triangle text-[11px] mt-0.5" style="color:#d97706" />
          <div class="flex-1">
            <p>⚠️ Valor modificado manualmente.</p>
            <p class="mt-0.5">Original calculado:
              <strong>{{ formatCOP(filaInfo.valor_calculado) }}</strong>
            </p>
            <button type="button" class="mt-1 underline" style="color:#915BD8"
              @click="revertirCalculado(filaInfo)">
              Revertir a calculado
            </button>
          </div>
        </div>
      </div>
    </Popover>

    <!-- ── Dialog administración IPC ─────────────────────────────────── -->
    <Dialog v-model:visible="showIPCDialog" modal header="Tasas IPC" :style="{ width: '420px' }">
      <div class="space-y-3 pt-1">
        <p class="text-xs text-gray-500">
          La tasa del año N indexa la facturación de ese mismo año N. Se acumula desde
          el año siguiente a la fecha base del contrato — max(suscripción, inicio de
          operación) — y solo aplica si el contrato ya cumplió un año.
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
import { useFinanceStore } from '@/stores/finance.js'
import Button        from 'primevue/button'
import Tag           from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog        from 'primevue/dialog'
import DataTable     from 'primevue/datatable'
import Column        from 'primevue/column'
import InputNumber   from 'primevue/inputnumber'
import InputText     from 'primevue/inputtext'
import Popover       from 'primevue/popover'
import { useToast }  from 'primevue/usetoast'
import api           from '@/api/client'
import DocumentoIcon  from '@/components/DocumentoIcon.vue'

const toast = useToast()

// Autofocus para el input de edición inline (expuesto como v-focus)
const vFocus = { mounted: (el) => el.focus() }

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
const descargando = reactive({})
const guardando = ref(false)
const filas     = ref([])
const seleccion = reactive({})
const ipcTasas  = ref([])
const showIPCDialog = ref(false)
const guardandoIPC  = ref(false)
const notificacionIPC = ref(null)
const ipcForm = reactive({ año: new Date().getFullYear(), tasaPct: null, fuente: 'DANE' })

// ── Edición inline del Valor a Facturar ──────────────────────────────────────
const overrides   = reactive({})   // { [contrato_id]: { valor:Number|null, dirty:Boolean } }
const editando    = ref(null)      // contrato_id de la celda en modo input
const inputBuffer = ref('')        // texto crudo del input activo
const infoPopover = ref(null)      // ref al <Popover>
const filaInfo    = ref(null)      // fila cuyo desglose se muestra

const filasHabilitadas   = computed(() => filas.value.filter(f => f.habilitado))
const filasSeleccionadas = computed(() => filasHabilitadas.value.filter(f => seleccion[f.contrato_id]).length)
const todosMarcados      = computed(() =>
  filasHabilitadas.value.length > 0 &&
  filasHabilitadas.value.every(f => seleccion[f.contrato_id])
)
const totalSeleccionado = computed(() =>
  filas.value
    .filter(f => f.habilitado && seleccion[f.contrato_id])
    .reduce((s, f) => s + (valorEfectivo(f) || 0), 0)
)

// Formato de moneda centralizado vía finance store (COP, 0 decimales por defecto).
const financeStore = useFinanceStore()
function formatCOP(v) {
  return financeStore.format(v)
}

function parseCOP(str) {
  if (str == null) return null
  const limpio = String(str).replace(/[^\d]/g, '')   // quita $, puntos de miles, espacios
  if (limpio === '') return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

// Valor a mostrar/guardar: override local dirty → valor del backend (ya resuelto)
function valorEfectivo(fila) {
  const ov = overrides[fila.contrato_id]
  if (ov && ov.dirty) {
    // override revertido (valor null) → mostrar el calculado por IPC
    return ov.valor != null ? ov.valor : (fila.valor_calculado ?? fila.valor_a_facturar)
  }
  return fila.valor_a_facturar
}

// True si la fila tiene override (local dirty o persistido en backend)
function esManual(fila) {
  const ov = overrides[fila.contrato_id]
  if (ov && ov.dirty) return ov.valor != null
  return !!fila.editado_manual
}

function toggleTodos(e) {
  filasHabilitadas.value.forEach(f => { seleccion[f.contrato_id] = e.target.checked })
}

function iniciarEdicion(fila) {
  if (!fila.habilitado) return
  editando.value = fila.contrato_id
  inputBuffer.value = String(valorEfectivo(fila) ?? '')
}

function confirmarEdicion(fila) {
  if (editando.value !== fila.contrato_id) return
  const v = parseCOP(inputBuffer.value)
  if (v != null) {
    overrides[fila.contrato_id] = { valor: v, dirty: true }
  }
  editando.value = null
}

function cancelarEdicion() {
  editando.value = null   // descarta el buffer; restaura el valor mostrado
}

function revertirCalculado(fila) {
  // marca para enviar valor_manual:null → vuelve al valor calculado por IPC
  overrides[fila.contrato_id] = { valor: null, dirty: true }
  infoPopover.value?.hide()
}

function mostrarInfo(ev, fila) {
  filaInfo.value = fila
  infoPopover.value?.show(ev)
}

function ipcAcumPct(fila) {
  return ((fila.factor_acumulado - 1) * 100).toFixed(3)
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
    const items = filas.value.map(f => {
      const ov = overrides[f.contrato_id]
      let valor_manual = null
      if (ov && ov.dirty) valor_manual = ov.valor          // override local (o null si revertido)
      else if (f.editado_manual) valor_manual = f.valor_a_facturar  // conserva override persistido
      return {
        contrato_id: f.contrato_id,
        incluido: !!(seleccion[f.contrato_id] && f.habilitado),
        valor_manual,
      }
    })
    await api.post(`/om/seleccion/${periodoActual.value}`, { items })
    Object.keys(overrides).forEach(k => delete overrides[k])
    await cargarDatos()
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

async function descargarDocumento(fila) {
  descargando[fila.contrato_id] = true
  try {
    const resp = await api.get(
      `/om/documento/${fila.periodo}/${fila.contrato_id}`,
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `SOFV_${fila.nombre_proyecto}_${fila.periodo}_mantenimiento.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  } catch {
    toast.add({ severity: 'error', summary: 'Error al descargar documento', life: 3000 })
  } finally {
    descargando[fila.contrato_id] = false
  }
}

watch(periodoActual, () => { cargarDatos(); cargarFacturaProveedor() })
onMounted(() => { cargarDatos(); cargarFacturaProveedor() })
</script>
