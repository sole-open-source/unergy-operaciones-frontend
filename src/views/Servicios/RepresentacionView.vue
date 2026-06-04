<template>
  <div class="space-y-5">

    <!-- ── Breadcrumb + título ──────────────────────────────────────────────── -->
    <div class="flex items-center gap-2">
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.back()" class="-ml-1" />
      <div>
        <p class="text-xs leading-none mb-0.5" style="color:#9b89b5">
          <span class="cursor-pointer hover:underline"
            @click="$router.push(`/proyectos/${route.params.id}`)">
            {{ proyectoNombre || '…' }}
          </span>
          <span class="mx-1.5">›</span><span>Servicios</span>
          <span class="mx-1.5">›</span>
          <span class="font-medium" style="color:#2C2039">Representación</span>
        </p>
        <h2 class="text-lg font-bold" style="color:#2C2039">Representación CGM</h2>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><ProgressSpinner /></div>

    <!-- Sin datos -->
    <div v-else-if="!contratos.length"
      class="rounded-xl border border-dashed p-10 text-center" style="border-color:#3b82f640">
      <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
        style="background:#eff6ff">
        <i class="pi pi-file-edit text-xl" style="color:#3b82f6" />
      </div>
      <p class="text-sm font-medium text-gray-600 mb-1">Sin contratos de representación</p>
      <p class="text-xs text-gray-400">
        No se encontraron contratos CGM/Representación para este proyecto.
      </p>
    </div>

    <!-- ── Tarjetas con selector de inversionista ─────────────────────────────── -->
    <template v-else>
      <!-- Selector de inversionista (tabs pequeños) si hay más de uno -->
      <div v-if="contratos.length > 1" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-semibold text-gray-500">Inversionista:</span>
        <button
          v-for="c in contratos" :key="c.inversionista"
          type="button"
          class="text-xs px-3 py-1.5 rounded-full font-medium transition-all border"
          :class="invSeleccionado === c.inversionista
            ? 'text-white border-transparent'
            : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'"
          :style="invSeleccionado === c.inversionista
            ? 'background:#3b82f6;border-color:#3b82f6'
            : ''"
          @click="invSeleccionado = c.inversionista">
          {{ c.inversionista }}
        </button>
      </div>

      <!-- Tarjeta del inversionista seleccionado -->
      <div v-if="contratoActivo" class="rounded-xl border bg-white p-5"
        style="border-color:#3b82f640">

        <!-- Header tarjeta -->
        <div class="flex items-start justify-between mb-4 gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style="background:#eff6ff">
              <i class="pi pi-file-edit text-sm" style="color:#3b82f6" />
            </div>
            <div>
              <p class="text-xs text-gray-400 leading-none mb-0.5">Contrato de Representación CGM</p>
              <span class="text-sm font-semibold" style="color:#2C2039">{{ proyectoNombre }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <Tag v-if="contratoActivo.estado"
              :value="ESTADO_LABELS[contratoActivo.estado] || contratoActivo.estado"
              :severity="ESTADO_SEVERITY[contratoActivo.estado] || 'secondary'"
              class="text-xs" />
            <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
              @click="abrirDialog" />
          </div>
        </div>

        <!-- Mini-cards de meta-info -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <InfoMini icon="pi pi-briefcase" label="Inversionista"
            :value="contratoActivo.inversionista" />
          <InfoMini icon="pi pi-folder" label="Portafolio"
            :value="contratoActivo.portafolio" />
          <InfoMini icon="pi pi-calendar" label="Fecha firma"
            :value="contratoActivo.fecha_firma" />
          <InfoMini icon="pi pi-file-pdf" label="Contrato">
            <template #default>
              <a v-if="contratoActivo.soporte_url"
                 :href="contratoActivo.soporte_url" target="_blank" rel="noopener"
                 class="text-sm font-semibold flex items-center gap-1.5 hover:underline"
                 style="color:#3b82f6">
                <i class="pi pi-external-link text-xs" />Ver contrato
              </a>
              <span v-else class="text-sm text-gray-400">Sin enlace</span>
            </template>
          </InfoMini>
        </div>

        <!-- Bloques de valor -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">

          <!-- Tarifa Admin — porcentaje fijo, sin expandible -->
          <div class="rounded-lg p-3.5" style="background:#f0f9ff;border:1px solid #bae6fd">
            <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#0369a1">
              <i class="pi pi-percentage text-xs" style="color:#0ea5e9" />Tarifa Admin
            </p>
            <p class="text-base font-bold tabular-nums" style="color:#0284c7">
              {{ contratoActivo.tarifa_admin != null
                  ? (contratoActivo.tarifa_admin * 100).toFixed(1) + '%'
                  : '—' }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">Porcentaje fijo</p>
          </div>

          <!-- Tarifa CGM -->
          <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
            <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
              <i class="pi pi-chart-bar text-xs" style="color:#3b82f6" />Tarifa CGM
            </p>
            <p class="text-base font-bold tabular-nums" style="color:#1d4ed8">
              {{ valorVigente(contratoActivo.indexacion_cgm, contratoActivo.tarifa_cgm) }}
              <span class="text-xs font-normal text-gray-400 ml-0.5">$/kWh</span>
            </p>
            <button v-if="(contratoActivo.indexacion_cgm || []).length > 0" type="button"
              class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
              style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
              @click="togglePanel('cgm')">
              <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                :style="paneles.cgm ? 'transform:rotate(180deg)' : ''" />
              {{ paneles.cgm ? 'Ocultar' : 'Ver indexación' }}
            </button>
          </div>

          <!-- Tarifa Representación -->
          <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
            <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
              <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />Tarifa Representación
            </p>
            <p class="text-base font-bold tabular-nums" style="color:#1d4ed8">
              {{ valorVigente(contratoActivo.indexacion_rep, contratoActivo.tarifa_rep) }}
              <span class="text-xs font-normal text-gray-400 ml-0.5">$/kWh</span>
            </p>
            <button v-if="(contratoActivo.indexacion_rep || []).length > 0" type="button"
              class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
              style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
              @click="togglePanel('rep')">
              <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                :style="paneles.rep ? 'transform:rotate(180deg)' : ''" />
              {{ paneles.rep ? 'Ocultar' : 'Ver indexación' }}
            </button>
          </div>
        </div>

        <!-- Tabla indexación CGM — renderizada inline, sin sub-componente -->
        <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: paneles.cgm ? '800px' : '0px' }">
          <div class="pt-3">
            <TablaCgm
              titulo="Indexación CGM"
              :filas="normalizarAniversarios(contratoActivo.indexacion_cgm)"
              :hoy="hoy"
            />
          </div>
        </div>

        <!-- Tabla indexación Representación — renderizada inline, sin sub-componente -->
        <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: paneles.rep ? '800px' : '0px' }">
          <div class="pt-3">
            <TablaCgm
              titulo="Indexación Representación"
              :filas="normalizarAniversarios(contratoActivo.indexacion_rep)"
              :hoy="hoy"
            />
          </div>
        </div>

      </div>
    </template>

    <!-- ── Dialog editar (campos manuales del contrato) ───────────────────────── -->
    <Dialog v-model:visible="dialogVisible" modal :style="{ width: '480px' }"
      :breakpoints="{ '520px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center"
            style="background:#eff6ff">
            <i class="pi pi-pencil text-xs" style="color:#3b82f6" />
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
            <InputText v-model="editForm.fecha_firma_contrato" class="w-full"
              placeholder="YYYY-MM-DD" />
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
import { ref, computed, onMounted, watch, reactive } from 'vue'
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

const route  = useRoute()
const toast  = useToast()

// ── Constantes ────────────────────────────────────────────────────────────────
const ESTADO_LABELS   = { vigente:'Vigente', vencido:'Vencido', terminado:'Terminado', en_renovacion:'En renovación', 'Operación':'Operación', 'Construcción':'Construcción' }
const ESTADO_SEVERITY = { vigente:'success', vencido:'danger', terminado:'secondary', en_renovacion:'warn', 'Operación':'success', 'Construcción':'warn' }
const ESTADOS_OPCIONES = [
  { label:'Vigente', value:'vigente' },
  { label:'Vencido', value:'vencido' },
  { label:'Terminado', value:'terminado' },
  { label:'En renovación', value:'en_renovacion' },
]

// ── Estado ────────────────────────────────────────────────────────────────────
const proyectoNombre = ref('')
const codigoTSF      = ref('')
const contratos      = ref([])   // lista de contratos del proyecto (uno por inversionista)
const loading        = ref(true)
const guardando       = ref(false)
const dialogVisible   = ref(false)
const invSeleccionado = ref('')
const hoy = new Date().toISOString().split('T')[0]

// Paneles expandibles — reactive object igual que OperacionView
const paneles = reactive({ cgm: false, rep: false })
function togglePanel(tipo) {
  paneles[tipo] = !paneles[tipo]
}

const contratoActivo = computed(() =>
  contratos.value.find(c => c.inversionista === invSeleccionado.value)
  || contratos.value[0]
  || null
)

// Reset paneles al cambiar inversionista
watch(invSeleccionado, () => { paneles.cgm = false; paneles.rep = false })

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizarAniversarios(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(f => ({
    fecha:   f.fecha   ?? null,
    anno:    f.anno    ?? null,
    ipc:     f.ipc     ?? null,
    valor:   f.valor   ?? null,
    es_base: f.es_base ?? false,
  }))
}

function valorVigente(raw, base) {
  const filas = normalizarAniversarios(raw)
  if (!filas.length) return base != null ? Number(base).toFixed(3) : '—'
  const hoyDate = new Date(hoy)
  // Último aniversario cuya fecha ≤ hoy
  const pasadas = filas.filter(f => f.fecha && new Date(f.fecha) <= hoyDate)
  const v = pasadas.length ? pasadas[pasadas.length - 1] : filas[0]
  return v?.valor != null ? Number(v.valor).toFixed(3) : (base != null ? Number(base).toFixed(3) : '—')
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
    estado: c.estado || 'vigente',
    fecha_firma_contrato: c.fecha_firma || '',
    enlace_drive: c.soporte_url || '',
    tarifa_admin_pct: c.tarifa_admin != null ? c.tarifa_admin * 100 : null,
    tarifa_cgm: c.tarifa_cgm ?? null,
    tarifa_representacion: c.tarifa_rep ?? null,
  })
  dialogVisible.value = true
}

async function guardar() {
  const c = contratoActivo.value
  if (!c) return
  guardando.value = true
  try {
    const payload = {
      servicio_aplica: 'representacion',
      proyecto_id: Number(route.params.id),
      inversionista_nombre: editForm.inversionista_nombre,
      estado: editForm.estado,
      fecha_firma_contrato: editForm.fecha_firma_contrato || null,
      enlace_drive: editForm.enlace_drive || null,
      tarifa_admin: editForm.tarifa_admin_pct != null ? editForm.tarifa_admin_pct / 100 : null,
      tarifa_cgm: editForm.tarifa_cgm ?? null,
      tarifa_representacion: editForm.tarifa_representacion ?? null,
    }
    if (c.db_id) {
      await api.patch(`/contratos-servicio/${c.db_id}`, payload)
    } else {
      await api.post('/contratos-servicio', {
        ...payload,
        codigo_sun_factory: c.codigo_sun_factory || null,
        portafolio: c.portafolio || null,
        nombre_proyecto_ref: c.proyecto || null,
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

<!-- Componentes locales registrados en el segundo bloque <script> (Options API)      -->
<!-- InfoMini: mini-card de meta-info                                                 -->
<!-- TablaCgm: tabla de indexación con aniversarios, IPC y estado                     -->
<script>
import { defineComponent, computed, h } from 'vue'

const TOOLTIP = 'La indexación se aplica en la fecha de renovación anual del contrato, usando el IPC del año inmediatamente anterior certificado por el DANE.'

// ── InfoMini ─────────────────────────────────────────────────────────────────
const InfoMini = {
  props: { icon: String, label: String, value: [String, Number] },
  template: `
    <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
      <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
        <i :class="icon" class="text-xs" style="color:#3b82f6"/>{{ label }}
      </p>
      <slot>
        <p class="text-sm font-semibold leading-snug" style="color:#1c1917">{{ value || '—' }}</p>
      </slot>
    </div>`,
}

// ── TablaCgm — tabla de aniversarios con IPC y estado ────────────────────────
const TablaCgm = defineComponent({
  name: 'TablaCgm',
  props: {
    titulo: { type: String, required: true },
    filas:  { type: Array,  default: () => [] },
    hoy:    { type: String, required: true },
  },
  setup(props) {
    const iVigente = computed(() => {
      const hoyDate = new Date(props.hoy)
      let idx = -1
      for (let i = 0; i < props.filas.length; i++) {
        const f = props.filas[i]
        if (f.fecha && new Date(f.fecha) <= hoyDate) idx = i
      }
      return idx >= 0 ? idx : 0
    })

    function esVigente(i)      { return i === iVigente.value }
    function fmtFecha(fecha) {
      if (!fecha) return '—'
      const parts = fecha.split('-')
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : fecha
    }
    function fmtVal(v) { return v != null ? Number(v).toFixed(3) : '—' }
    function estadoFila(f, i) {
      if (esVigente(i)) return 'vigente'
      if (f.fecha && new Date(f.fecha) < new Date(props.hoy)) return 'pagado'
      return 'pendiente'
    }

    return { iVigente, esVigente, fmtFecha, fmtVal, estadoFila, TOOLTIP }
  },
  template: `
    <div class="rounded-xl overflow-hidden" style="border:1px solid #bfdbfe">
      <div class="flex items-center justify-between px-4 py-2.5" style="background:#eff6ff">
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-semibold" style="color:#1e40af">{{ titulo }}</span>
          <span class="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] cursor-help select-none"
            style="background:#bfdbfe;color:#1e40af" :title="TOOLTIP">ⓘ</span>
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
          <tr v-if="!filas.length">
            <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">Sin datos de indexación.</td>
          </tr>
          <tr v-for="(f, i) in filas" :key="i"
            class="border-b border-gray-50"
            :style="esVigente(i) ? 'background:#fff7ed' : ''">
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-semibold"
                  :style="esVigente(i) ? 'color:#d97706' : 'color:#2C2039'">
                  {{ fmtFecha(f.fecha) }}
                </span>
                <span v-if="f.es_base" class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style="background:#e0f2fe;color:#0369a1">base</span>
                <span v-if="esVigente(i) && !f.es_base" class="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style="background:#fef3c7;color:#d97706">actual</span>
                <i v-if="esVigente(i)" class="pi pi-arrow-left text-xs" style="color:#d97706" />
              </div>
            </td>
            <td class="px-4 py-2.5">
              <span v-if="f.ipc == null" class="text-gray-400 text-xs">— (base)</span>
              <span v-else class="font-mono tabular-nums" style="color:#374151">{{ f.ipc }}%</span>
            </td>
            <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
              :style="esVigente(i) ? 'color:#d97706' : 'color:#2C2039'">
              {{ fmtVal(f.valor) }}
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="estadoFila(f,i)==='pagado'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dcfce7;color:#166534"><i class="pi pi-check text-xs"/>Pagado</span>
              <span v-else-if="estadoFila(f,i)==='vigente'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#fef3c7;color:#d97706">Vigente</span>
              <span v-else
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#f3f4f6;color:#9ca3af">Pendiente</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>`,
})

export default { components: { InfoMini, TablaCgm } }
</script>
