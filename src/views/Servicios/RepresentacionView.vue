<template>
  <div class="space-y-5">

    <!-- Breadcrumb -->
    <div class="flex items-center gap-2">
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.back()" class="-ml-1" />
      <div>
        <p class="text-xs leading-none mb-0.5" style="color:#9b89b5">
          <span class="cursor-pointer hover:underline"
            @click="$router.push(`/proyectos/${route.params.id}`)">{{ proyectoNombre || '…' }}</span>
          <span class="mx-1.5">›</span><span>Servicios</span>
          <span class="mx-1.5">›</span>
          <span class="font-medium" style="color:#2C2039">Representación</span>
        </p>
        <h2 class="text-lg font-bold" style="color:#2C2039">Representación CGM</h2>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><ProgressSpinner /></div>

    <div v-else-if="!contratos.length"
      class="rounded-xl border border-dashed p-10 text-center" style="border-color:#3b82f640">
      <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style="background:#eff6ff">
        <i class="pi pi-file-edit text-xl" style="color:#3b82f6" />
      </div>
      <p class="text-sm font-medium text-gray-600 mb-1">Sin contratos de representación</p>
      <p class="text-xs text-gray-400">No se encontraron contratos CGM/Representación para este proyecto.</p>
    </div>

    <template v-else>
      <!-- Selector de inversionista -->
      <div v-if="contratos.length > 1" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-semibold text-gray-500">Inversionista:</span>
        <button v-for="c in contratos" :key="c.inversionista" type="button"
          class="text-xs px-3 py-1.5 rounded-full font-medium transition-all border"
          :class="invSeleccionado === c.inversionista ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'"
          :style="invSeleccionado === c.inversionista ? 'background:#3b82f6' : ''"
          @click="seleccionarInv(c.inversionista)">
          {{ c.inversionista }}
        </button>
      </div>

      <!-- Tarjeta -->
      <div v-if="contratoActivo" class="rounded-xl border bg-white p-5" style="border-color:#3b82f640">

        <!-- Header compacto: nombre + badge + botón -->
        <div class="flex items-center justify-between mb-2 gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <i class="pi pi-file-edit text-xs flex-shrink-0" style="color:#3b82f6"/>
            <span class="text-sm font-semibold truncate" style="color:#2C2039">{{ proyectoNombre }}</span>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <Tag v-if="contratoActivo.estado"
              :value="ESTADO_LABELS[contratoActivo.estado] || contratoActivo.estado"
              :severity="ESTADO_SEVERITY[contratoActivo.estado] || 'secondary'"
              class="text-[11px] !py-0 !px-1.5" />
            <button type="button"
              class="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
              style="background:none;border:none;padding:0;cursor:pointer"
              @click="abrirDialog">
              <i class="pi pi-pencil text-[11px]"/>Editar
            </button>
          </div>
        </div>

        <!-- Meta-info: una línea con pipes -->
        <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-3 text-xs text-gray-500">
          <span><span class="font-medium" style="color:#1e40af">Inv:</span> {{ contratoActivo.inversionista || '—' }}</span>
          <span class="text-gray-300">|</span>
          <span><span class="font-medium" style="color:#1e40af">Portafolio:</span> {{ contratoActivo.portafolio || '—' }}</span>
          <span class="text-gray-300">|</span>
          <span><span class="font-medium" style="color:#1e40af">Firma:</span> {{ contratoActivo.fecha_firma || '—' }}</span>
          <span class="text-gray-300">|</span>
          <a v-if="contratoActivo.soporte_url"
             :href="contratoActivo.soporte_url" target="_blank" rel="noopener"
             class="flex items-center gap-0.5 font-medium hover:underline" style="color:#3b82f6">
            <i class="pi pi-external-link text-[10px]"/>Ver contrato
          </a>
          <span v-else class="text-gray-400">Sin contrato</span>
        </div>

        <!-- Bloques de valor compactos en fila -->
        <div class="grid grid-cols-3 gap-2 mb-0">
          <!-- Tarifa Admin -->
          <div class="rounded-lg px-3 py-2" style="background:#f0f9ff;border:1px solid #bae6fd">
            <p class="text-[11px] font-medium mb-0.5" style="color:#0369a1">Tarifa Admin</p>
            <p class="text-sm font-bold tabular-nums" style="color:#0284c7">
              {{ contratoActivo.tarifa_admin != null ? (contratoActivo.tarifa_admin * 100).toFixed(1) + '%' : '—' }}
            </p>
            <p class="text-[10px] text-gray-400">Fijo</p>
          </div>

          <!-- Tarifa CGM -->
          <div class="rounded-lg px-3 py-2" style="background:#eff6ff;border:1px solid #bfdbfe">
            <p class="text-[11px] font-medium mb-0.5" style="color:#1e40af">Tarifa CGM</p>
            <p class="text-sm font-bold tabular-nums" style="color:#1d4ed8">
              {{ valorVigente(idxCgm) }}
              <span class="text-[10px] font-normal text-gray-400">$/kWh</span>
            </p>
            <button v-if="idxCgm.length" type="button"
              class="flex items-center gap-0.5 text-[11px] font-medium hover:opacity-75 transition-opacity mt-0.5"
              style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
              @click="paneles.cgm = !paneles.cgm">
              <i class="pi pi-chevron-down text-[10px] transition-transform duration-200"
                :style="paneles.cgm ? 'transform:rotate(180deg)' : ''"/>
              {{ paneles.cgm ? 'Ocultar' : 'Ver indexación' }}
            </button>
          </div>

          <!-- Tarifa Representación -->
          <div class="rounded-lg px-3 py-2" style="background:#eff6ff;border:1px solid #bfdbfe">
            <p class="text-[11px] font-medium mb-0.5" style="color:#1e40af">Tarifa Rep.</p>
            <p class="text-sm font-bold tabular-nums" style="color:#1d4ed8">
              {{ valorVigente(idxRep) }}
              <span class="text-[10px] font-normal text-gray-400">$/kWh</span>
            </p>
            <button v-if="idxRep.length" type="button"
              class="flex items-center gap-0.5 text-[11px] font-medium hover:opacity-75 transition-opacity mt-0.5"
              style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
              @click="paneles.rep = !paneles.rep">
              <i class="pi pi-chevron-down text-[10px] transition-transform duration-200"
                :style="paneles.rep ? 'transform:rotate(180deg)' : ''"/>
              {{ paneles.rep ? 'Ocultar' : 'Ver indexación' }}
            </button>
          </div>
        </div>

        <!-- ═══ TABLA CGM inline — sin sub-componentes ═══════════════════════ -->
        <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: paneles.cgm ? '800px' : '0px' }">
          <div class="pt-3 rounded-xl overflow-hidden" style="border:1px solid #bfdbfe">
            <div class="flex items-center justify-between px-4 py-2.5" style="background:#eff6ff">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold" style="color:#1e40af">Indexación CGM</span>
                <span
                  v-tooltip.top="TOOLTIP_IDX"
                  class="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] cursor-help select-none"
                  style="background:#bfdbfe;color:#1e40af">ⓘ</span>
              </div>
              <span class="text-xs text-gray-400">Hoy: {{ hoy }}</span>
            </div>
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">Fecha aniversario</th>
                  <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">IPC aplicado</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500">Valor ($/kWh)</th>
                  <th class="px-4 py-2 text-center text-xs font-semibold text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!idxCgm.length">
                  <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">Sin datos de indexación.</td>
                </tr>
                <tr v-for="(f, i) in idxCgm" :key="i"
                  class="border-b border-gray-50"
                  :style="iVigente(idxCgm) === i ? 'background:#fff7ed' : ''">
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono font-semibold"
                        :style="iVigente(idxCgm) === i ? 'color:#d97706' : 'color:#2C2039'">
                        {{ fmtFecha(f.fecha) }}
                      </span>
                      <span v-if="f.es_base" class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style="background:#e0f2fe;color:#0369a1">base</span>
                      <span v-if="iVigente(idxCgm) === i && !f.es_base"
                        class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style="background:#fef3c7;color:#d97706">actual</span>
                      <i v-if="iVigente(idxCgm) === i" class="pi pi-arrow-left text-xs" style="color:#d97706"/>
                    </div>
                  </td>
                  <td class="px-4 py-2.5">
                    <span v-if="f.ipc == null" class="text-gray-400 text-xs">— (base)</span>
                    <span v-else class="font-mono tabular-nums" style="color:#374151">{{ f.ipc }}%</span>
                  </td>
                  <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
                    :style="iVigente(idxCgm) === i ? 'color:#d97706' : 'color:#2C2039'">
                    {{ fmtVal(f.valor) }}
                  </td>
                  <td class="px-4 py-2.5 text-center">
                    <span v-if="estadoFila(idxCgm, i) === 'pagado'"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style="background:#dcfce7;color:#166534"><i class="pi pi-check text-xs"/>Pagado</span>
                    <span v-else-if="estadoFila(idxCgm, i) === 'vigente'"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style="background:#fef3c7;color:#d97706">Vigente</span>
                    <span v-else class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style="background:#f3f4f6;color:#9ca3af">Pendiente</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ═══ TABLA REPRESENTACIÓN inline ════════════════════════════════════ -->
        <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: paneles.rep ? '800px' : '0px' }">
          <div class="pt-3 rounded-xl overflow-hidden" style="border:1px solid #bfdbfe">
            <div class="flex items-center justify-between px-4 py-2.5" style="background:#eff6ff">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold" style="color:#1e40af">Indexación Representación</span>
                <span
                  v-tooltip.top="TOOLTIP_IDX"
                  class="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] cursor-help select-none"
                  style="background:#bfdbfe;color:#1e40af">ⓘ</span>
              </div>
              <span class="text-xs text-gray-400">Hoy: {{ hoy }}</span>
            </div>
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">Fecha aniversario</th>
                  <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">IPC aplicado</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500">Valor ($/kWh)</th>
                  <th class="px-4 py-2 text-center text-xs font-semibold text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!idxRep.length">
                  <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">Sin datos de indexación.</td>
                </tr>
                <tr v-for="(f, i) in idxRep" :key="i"
                  class="border-b border-gray-50"
                  :style="iVigente(idxRep) === i ? 'background:#fff7ed' : ''">
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono font-semibold"
                        :style="iVigente(idxRep) === i ? 'color:#d97706' : 'color:#2C2039'">
                        {{ fmtFecha(f.fecha) }}
                      </span>
                      <span v-if="f.es_base" class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style="background:#e0f2fe;color:#0369a1">base</span>
                      <span v-if="iVigente(idxRep) === i && !f.es_base"
                        class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style="background:#fef3c7;color:#d97706">actual</span>
                      <i v-if="iVigente(idxRep) === i" class="pi pi-arrow-left text-xs" style="color:#d97706"/>
                    </div>
                  </td>
                  <td class="px-4 py-2.5">
                    <span v-if="f.ipc == null" class="text-gray-400 text-xs">— (base)</span>
                    <span v-else class="font-mono tabular-nums" style="color:#374151">{{ f.ipc }}%</span>
                  </td>
                  <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
                    :style="iVigente(idxRep) === i ? 'color:#d97706' : 'color:#2C2039'">
                    {{ fmtVal(f.valor) }}
                  </td>
                  <td class="px-4 py-2.5 text-center">
                    <span v-if="estadoFila(idxRep, i) === 'pagado'"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style="background:#dcfce7;color:#166534"><i class="pi pi-check text-xs"/>Pagado</span>
                    <span v-else-if="estadoFila(idxRep, i) === 'vigente'"
                      class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style="background:#fef3c7;color:#d97706">Vigente</span>
                    <span v-else class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style="background:#f3f4f6;color:#9ca3af">Pendiente</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </template>

    <!-- Dialog editar -->
    <Dialog v-model:visible="dialogVisible" modal :style="{ width: '480px' }"
      :breakpoints="{ '520px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:#eff6ff">
            <i class="pi pi-pencil text-xs" style="color:#3b82f6"/>
          </div>
          <span class="font-semibold text-sm" style="color:#2C2039">Editar contrato</span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Inversionista</label>
            <InputText v-model="editForm.inversionista_nombre" class="w-full" disabled />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Estado</label>
            <Select v-model="editForm.estado" :options="ESTADOS_OPCIONES"
              optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha firma</label>
            <InputText v-model="editForm.fecha_firma_contrato" class="w-full" placeholder="YYYY-MM-DD" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Admin (%)</label>
            <InputNumber v-model="editForm.tarifa_admin_pct"
              :minFractionDigits="1" :maxFractionDigits="2" suffix="%" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Contrato en Drive</label>
            <InputText v-model="editForm.enlace_drive" class="w-full"
              placeholder="https://drive.google.com/…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa CGM base ($/kWh)</label>
            <InputNumber v-model="editForm.tarifa_cgm"
              :minFractionDigits="2" :maxFractionDigits="4" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Rep. base ($/kWh)</label>
            <InputNumber v-model="editForm.tarifa_representacion"
              :minFractionDigits="2" :maxFractionDigits="4" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogVisible = false" />
        <Button label="Guardar cambios" icon="pi pi-check" :loading="guardando"
          style="background:#3b82f6;border-color:#3b82f6" @click="guardar" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Button        from 'primevue/button'
import Tag           from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog        from 'primevue/dialog'
import InputText     from 'primevue/inputtext'
import InputNumber   from 'primevue/inputnumber'
import Select        from 'primevue/select'
import { useToast }  from 'primevue/usetoast'
import api           from '@/api/client'

const route = useRoute()
const toast = useToast()

// ── Constantes ────────────────────────────────────────────────────────────────
const ESTADO_LABELS   = { vigente:'Vigente', vencido:'Vencido', terminado:'Terminado', en_renovacion:'En renovación', 'Operación':'Operación', 'Construcción':'Construcción' }
const ESTADO_SEVERITY = { vigente:'success', vencido:'danger', terminado:'secondary', en_renovacion:'warn', 'Operación':'success', 'Construcción':'warn' }
const ESTADOS_OPCIONES = [
  { label:'Vigente', value:'vigente' },
  { label:'Vencido', value:'vencido' },
  { label:'Terminado', value:'terminado' },
  { label:'En renovación', value:'en_renovacion' },
]
const hoy = new Date().toISOString().split('T')[0]
const TOOLTIP_IDX = 'La indexación se aplica en la fecha de renovación anual del contrato, usando el IPC del año inmediatamente anterior certificado por el DANE.'

// ── Estado ────────────────────────────────────────────────────────────────────
const proyectoNombre  = ref('')
const codigoTSF       = ref('')
const contratos       = ref([])
const loading         = ref(true)
const guardando       = ref(false)
const dialogVisible   = ref(false)
const invSeleccionado = ref('')
const paneles         = reactive({ cgm: false, rep: false })

// ── Inversionista activo ──────────────────────────────────────────────────────
const contratoActivo = computed(() =>
  contratos.value.find(c => c.inversionista === invSeleccionado.value)
  ?? contratos.value[0]
  ?? null
)

// Arrays de indexación ya normalizados del contrato activo
const idxCgm = computed(() => normalizarAniversarios(contratoActivo.value?.indexacion_cgm))
const idxRep = computed(() => normalizarAniversarios(contratoActivo.value?.indexacion_rep))

// Reset paneles al cambiar inversionista
watch(invSeleccionado, () => { paneles.cgm = false; paneles.rep = false })

function seleccionarInv(inv) {
  invSeleccionado.value = inv
}

// ── Helpers de indexación ─────────────────────────────────────────────────────

/** Normaliza el array JSONB → {fecha, anno, ipc, valor, es_base} */
function normalizarAniversarios(raw) {
  if (!Array.isArray(raw) || !raw.length) return []
  return raw.map(f => ({
    fecha:   f.fecha   ?? null,
    anno:    f.anno    ?? null,
    ipc:     f.ipc     ?? null,
    valor:   f.valor   ?? null,
    es_base: f.es_base ?? false,
  }))
}

/** Índice de la fila vigente (último aniversario cuya fecha ≤ hoy) */
function iVigente(filas) {
  const hoyDate = new Date(hoy)
  let idx = -1
  for (let i = 0; i < filas.length; i++) {
    if (filas[i].fecha && new Date(filas[i].fecha) <= hoyDate) idx = i
  }
  return idx >= 0 ? idx : 0
}

/** Estado de la fila: pagado / vigente / pendiente */
function estadoFila(filas, i) {
  const iv = iVigente(filas)
  if (i === iv) return 'vigente'
  if (filas[i].fecha && new Date(filas[i].fecha) < new Date(hoy)) return 'pagado'
  return 'pendiente'
}

/** Valor de la fila vigente (para mostrar en el bloque de tarifa) */
function valorVigente(filas) {
  if (!filas.length) return '—'
  const f = filas[iVigente(filas)]
  return f?.valor != null ? Number(f.valor).toFixed(3) : '—'
}

/** Formatea fecha YYYY-MM-DD → DD/MM/YYYY */
function fmtFecha(fecha) {
  if (!fecha) return '—'
  const p = fecha.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fecha
}

/** Formatea valor numérico a 3 decimales */
function fmtVal(v) {
  return v != null ? Number(v).toFixed(3) : '—'
}

// ── Dialog editar ─────────────────────────────────────────────────────────────
const editForm = reactive({
  inversionista_nombre: '',
  estado: 'vigente',
  fecha_firma_contrato: '',
  enlace_drive: '',
  tarifa_admin_pct: null,
  tarifa_cgm: null,
  tarifa_representacion: null,
})

function abrirDialog() {
  const c = contratoActivo.value
  if (!c) return
  Object.assign(editForm, {
    inversionista_nombre: c.inversionista || '',
    estado:               c.estado || 'vigente',
    fecha_firma_contrato: c.fecha_firma || '',
    enlace_drive:         c.soporte_url || '',
    tarifa_admin_pct:     c.tarifa_admin != null ? c.tarifa_admin * 100 : null,
    tarifa_cgm:           c.tarifa_cgm ?? null,
    tarifa_representacion:c.tarifa_rep ?? null,
  })
  dialogVisible.value = true
}

async function guardar() {
  const c = contratoActivo.value
  if (!c) return
  guardando.value = true
  try {
    const payload = {
      servicio_aplica:      'representacion',
      proyecto_id:          Number(route.params.id),
      inversionista_nombre: editForm.inversionista_nombre,
      estado:               editForm.estado,
      fecha_firma_contrato: editForm.fecha_firma_contrato || null,
      enlace_drive:         editForm.enlace_drive || null,
      tarifa_admin:         editForm.tarifa_admin_pct != null ? editForm.tarifa_admin_pct / 100 : null,
      tarifa_cgm:           editForm.tarifa_cgm ?? null,
      tarifa_representacion:editForm.tarifa_representacion ?? null,
    }
    if (c.db_id) {
      await api.patch(`/contratos-servicio/${c.db_id}`, payload)
    } else {
      await api.post('/contratos-servicio', {
        ...payload,
        codigo_sun_factory: c.codigo_sun_factory || null,
        portafolio:         c.portafolio || null,
        nombre_proyecto_ref:c.proyecto || null,
      })
    }
    dialogVisible.value = false
    toast.add({ severity:'success', summary:'Cambios guardados', life:2500 })
    await cargar()
  } catch (e) {
    toast.add({ severity:'error', summary:'Error', detail:e.response?.data?.detail, life:4000 })
  } finally {
    guardando.value = false
  }
}

// ── Carga ─────────────────────────────────────────────────────────────────────
async function cargar() {
  try {
    const params = {}
    if (proyectoNombre.value) params.proyecto_nombre = proyectoNombre.value
    if (codigoTSF.value)      params.codigo_sun_factory = codigoTSF.value
    const { data } = await api.get('/representacion', { params })
    contratos.value = data
    if (data.length && !invSeleccionado.value) {
      invSeleccionado.value = data[0].inversionista
    }
  } catch {
    toast.add({ severity:'error', summary:'Error al cargar contratos', life:3000 })
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/proyectos/${route.params.id}`)
    proyectoNombre.value = data.nombre_comercial || ''
    codigoTSF.value      = data.codigo_tsf       || ''
  } catch { /* graceful degrade */ }
  await cargar()
  loading.value = false
})
</script>
