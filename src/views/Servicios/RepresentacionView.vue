<template>
  <div class="space-y-5">

    <!-- ── Header ────────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.back()" class="-ml-1" />
        <div>
          <p class="text-xs leading-none mb-0.5" style="color:#9b89b5">
            <span class="cursor-pointer hover:underline"
              @click="$router.push(`/proyectos/${route.params.id}`)">
              {{ proyectoNombre || '…' }}
            </span>
            <span class="mx-1.5">›</span>
            <span>Servicios</span>
            <span class="mx-1.5">›</span>
            <span class="font-medium" style="color:#2C2039">Representación</span>
          </p>
          <h2 class="text-lg font-bold" style="color:#2C2039">Representación CGM</h2>
        </div>
      </div>
      <Button label="Nuevo contrato" icon="pi pi-plus" size="small"
        style="background:#3b82f6;border-color:#3b82f6"
        @click="abrirDialog()" />
    </div>

    <!-- ── Loading ────────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- ── Sin contratos ──────────────────────────────────────────────────────── -->
    <template v-else-if="!contratos.length">
      <div class="rounded-xl border border-dashed p-10 text-center" style="border-color:#3b82f640">
        <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style="background:#eff6ff">
          <i class="pi pi-file-edit text-xl" style="color:#3b82f6" />
        </div>
        <p class="text-sm font-medium text-gray-600 mb-1">Sin contratos de representación</p>
        <p class="text-xs text-gray-400 mb-4">No se encontraron contratos CGM/Representación para este proyecto.</p>
        <Button label="Crear contrato" icon="pi pi-plus" size="small"
          style="background:#3b82f6;border-color:#3b82f6"
          @click="abrirDialog()" />
      </div>
    </template>

    <!-- ── Tarjetas por inversionista ─────────────────────────────────────────── -->
    <template v-else>
      <div v-for="contrato in contratos" :key="contrato.id" class="space-y-0">

        <!-- Separador con nombre del inversionista -->
        <div class="flex items-center gap-3 py-2">
          <div class="h-px flex-1" style="background:#dbeafe" />
          <span class="text-xs font-semibold px-2 py-1 rounded-full"
            style="background:#eff6ff; color:#1d4ed8">
            {{ contrato.inversionista_nombre || 'Sin inversionista' }}
          </span>
          <div class="h-px flex-1" style="background:#dbeafe" />
        </div>

        <!-- Tarjeta de contrato -->
        <div class="rounded-xl border bg-white p-5" style="border-color:#3b82f640">

          <!-- Encabezado de tarjeta -->
          <div class="flex items-start justify-between mb-5 gap-3 flex-wrap">
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
            <div class="flex items-center gap-2">
              <Tag v-if="contrato.estado"
                :value="ESTADO_LABELS[contrato.estado] || contrato.estado"
                :severity="ESTADO_SEVERITY[contrato.estado]" class="text-xs" />
              <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="abrirDialog(contrato)" />
              <Button icon="pi pi-trash" text size="small" severity="danger"
                @click="eliminar(contrato.id)" />
            </div>
          </div>

          <!-- Mini-cards de encabezado -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-user text-xs" style="color:#3b82f6" />Contratante
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                {{ contrato.contratante_nombre || 'Unergy Energía Digital S.A.S. E.S.P.' }}
              </p>
            </div>
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-briefcase text-xs" style="color:#3b82f6" />Inversionista
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                {{ contrato.inversionista_nombre || '—' }}
              </p>
            </div>
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-building text-xs" style="color:#3b82f6" />Prestador
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                {{ contrato.prestador_nombre || 'Unergy Energía Digital S.A.S. E.S.P.' }}
              </p>
            </div>
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-calendar text-xs" style="color:#3b82f6" />Fecha firma
              </p>
              <p class="text-sm font-semibold" style="color:#1c1917">
                {{ contrato.fecha_firma_contrato || '—' }}
              </p>
            </div>
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-folder text-xs" style="color:#3b82f6" />Portafolio
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                {{ contrato.portafolio || '—' }}
              </p>
            </div>
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-file-pdf text-xs" style="color:#3b82f6" />Contrato en Drive
              </p>
              <a v-if="contrato.enlace_drive?.startsWith('http')"
                 :href="contrato.enlace_drive" target="_blank" rel="noopener"
                 class="text-sm font-semibold flex items-center gap-1.5 hover:underline"
                 style="color:#3b82f6">
                <i class="pi pi-external-link text-xs" />Ver contrato
              </a>
              <span v-else class="text-sm text-gray-400">Sin enlace</span>
            </div>
          </div>

          <!-- Bloques de valor -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

            <!-- Tarifa Admin -->
            <div class="rounded-xl p-4" style="background:#f0f9ff;border:1px solid #bae6fd">
              <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#0369a1">
                <i class="pi pi-percentage text-xs" style="color:#0ea5e9" />Tarifa Admin
              </p>
              <p class="text-2xl font-bold tabular-nums" style="color:#0369a1">
                {{ contrato.tarifa_admin != null
                    ? (contrato.tarifa_admin * 100).toFixed(1) + '%'
                    : '—' }}
              </p>
              <p class="text-xs mt-1" style="color:#7dd3fc">Porcentaje fijo sobre liquidación</p>
            </div>

            <!-- Tarifa CGM -->
            <div class="rounded-xl p-4" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-chart-bar text-xs" style="color:#3b82f6" />Tarifa CGM
              </p>
              <template v-if="contrato.tarifa_cgm != null">
                <p class="text-2xl font-bold tabular-nums" style="color:#1d4ed8">
                  {{ valorVigente(contrato.indexacion_cgm, contrato.tarifa_cgm) }} $/kWh
                </p>
                <button v-if="contrato.indexacion_cgm?.length"
                  type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggleIdx(contrato.id, 'cgm')">
                  <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :style="isOpen(contrato.id,'cgm') ? 'transform:rotate(180deg)' : ''" />
                  {{ isOpen(contrato.id,'cgm') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </template>
              <p v-else class="text-sm text-gray-400">—</p>
            </div>

            <!-- Tarifa Representación -->
            <div class="rounded-xl p-4" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />Tarifa Representación
              </p>
              <template v-if="contrato.tarifa_representacion != null">
                <p class="text-2xl font-bold tabular-nums" style="color:#1d4ed8">
                  {{ valorVigente(contrato.indexacion_representacion, contrato.tarifa_representacion) }} $/kWh
                </p>
                <button v-if="contrato.indexacion_representacion?.length"
                  type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggleIdx(contrato.id, 'rep')">
                  <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :style="isOpen(contrato.id,'rep') ? 'transform:rotate(180deg)' : ''" />
                  {{ isOpen(contrato.id,'rep') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </template>
              <p v-else class="text-sm text-gray-400">—</p>
            </div>
          </div>

          <!-- Tabla CGM -->
          <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: isOpen(contrato.id,'cgm') ? '600px' : '0px' }">
            <div class="pt-4">
              <TablaIdx titulo="Indexación CGM" :filas="contrato.indexacion_cgm || []" />
            </div>
          </div>

          <!-- Tabla Representación -->
          <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: isOpen(contrato.id,'rep') ? '600px' : '0px' }">
            <div class="pt-4">
              <TablaIdx titulo="Indexación Representación" :filas="contrato.indexacion_representacion || []" />
            </div>
          </div>

        </div>
      </div>
    </template>

    <!-- ── Dialog crear / editar ──────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialog.visible" modal :style="{ width: '560px' }"
      :breakpoints="{ '600px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-file-edit text-sm" style="color:#3b82f6" />
          <span class="font-semibold text-sm" style="color:#2C2039">
            {{ dialog.modo === 'crear' ? 'Nuevo contrato CGM/Representación' : 'Editar contrato' }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-xs font-medium text-gray-600">Inversionista <span class="text-red-400">*</span></label>
            <InputText v-model="dialog.form.inversionista_nombre" class="w-full" placeholder="Nombre del inversionista" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Portafolio</label>
            <InputText v-model="dialog.form.portafolio" class="w-full" placeholder="Ej: Ayurá 1, Cox…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Código Sun Factory</label>
            <InputText v-model="dialog.form.codigo_sun_factory" class="w-full" placeholder="COLCEST…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Estado</label>
            <Select v-model="dialog.form.estado"
              :options="[{label:'Vigente',value:'vigente'},{label:'Vencido',value:'vencido'},{label:'Terminado',value:'terminado'}]"
              optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha firma</label>
            <InputText v-model="dialog.form.fecha_firma_contrato" class="w-full" placeholder="YYYY-MM-DD" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Admin (%)</label>
            <InputNumber v-model="dialog.form.tarifa_admin_pct" :minFractionDigits="1" :maxFractionDigits="2"
              suffix="%" class="w-full" placeholder="3.8" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Contrato en Drive</label>
            <InputText v-model="dialog.form.enlace_drive" class="w-full" placeholder="https://drive.google.com/…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa CGM base ($/kWh)</label>
            <InputNumber v-model="dialog.form.tarifa_cgm" :minFractionDigits="2" :maxFractionDigits="4"
              class="w-full" placeholder="6.0" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Representación base ($/kWh)</label>
            <InputNumber v-model="dialog.form.tarifa_representacion" :minFractionDigits="2" :maxFractionDigits="4"
              class="w-full" placeholder="6.0" />
          </div>
        </div>
        <p class="text-xs text-gray-400">
          Las tablas de indexación se pueden editar desde la vista una vez guardado el contrato.
        </p>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialog.visible = false" />
        <Button :label="dialog.modo === 'crear' ? 'Crear' : 'Guardar'"
          icon="pi pi-check" :loading="guardando"
          style="background:#3b82f6;border-color:#3b82f6"
          @click="guardar" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const route = useRoute()
const toast = useToast()

const ANIO_ACTUAL = 2026

const ESTADO_LABELS = { vigente: 'Vigente', vencido: 'Vencido', terminado: 'Terminado', en_renovacion: 'En renovación' }
const ESTADO_SEVERITY = { vigente: 'success', vencido: 'danger', terminado: 'secondary', en_renovacion: 'warn' }

const proyectoNombre = ref('')
const contratos = ref([])
const loading = ref(true)
const guardando = ref(false)

const idxOpen = ref({})
function isOpen(id, tipo) { return !!idxOpen.value[`${id}:${tipo}`] }
function toggleIdx(id, tipo) {
  const k = `${id}:${tipo}`
  idxOpen.value[k] = !idxOpen.value[k]
}

function valorVigente(indexaciones, base) {
  if (!indexaciones?.length) return base?.toFixed(3) ?? '—'
  const v = indexaciones.find(f => f.año === ANIO_ACTUAL) ?? indexaciones[indexaciones.length - 1]
  return v?.valor?.toFixed(3) ?? base?.toFixed(3) ?? '—'
}

const dialog = reactive({
  visible: false,
  modo: 'crear',
  id: null,
  form: {
    inversionista_nombre: '',
    portafolio: '',
    codigo_sun_factory: '',
    estado: 'vigente',
    fecha_firma_contrato: '',
    enlace_drive: '',
    tarifa_admin_pct: null,
    tarifa_cgm: null,
    tarifa_representacion: null,
  },
})

function abrirDialog(contrato = null) {
  if (contrato) {
    dialog.modo = 'editar'
    dialog.id = contrato.id
    dialog.form.inversionista_nombre = contrato.inversionista_nombre || ''
    dialog.form.portafolio = contrato.portafolio || ''
    dialog.form.codigo_sun_factory = contrato.codigo_sun_factory || ''
    dialog.form.estado = contrato.estado || 'vigente'
    dialog.form.fecha_firma_contrato = contrato.fecha_firma_contrato || ''
    dialog.form.enlace_drive = contrato.enlace_drive || ''
    dialog.form.tarifa_admin_pct = contrato.tarifa_admin != null ? contrato.tarifa_admin * 100 : null
    dialog.form.tarifa_cgm = contrato.tarifa_cgm ?? null
    dialog.form.tarifa_representacion = contrato.tarifa_representacion ?? null
  } else {
    dialog.modo = 'crear'
    dialog.id = null
    Object.assign(dialog.form, {
      inversionista_nombre: '', portafolio: '', codigo_sun_factory: '',
      estado: 'vigente', fecha_firma_contrato: '', enlace_drive: '',
      tarifa_admin_pct: null, tarifa_cgm: null, tarifa_representacion: null,
    })
  }
  dialog.visible = true
}

async function guardar() {
  if (!dialog.form.inversionista_nombre) {
    toast.add({ severity: 'warn', summary: 'El inversionista es obligatorio', life: 2000 })
    return
  }
  guardando.value = true
  try {
    const payload = {
      servicio_aplica: 'representacion',
      proyecto_id: Number(route.params.id),
      inversionista_nombre: dialog.form.inversionista_nombre,
      portafolio: dialog.form.portafolio || null,
      codigo_sun_factory: dialog.form.codigo_sun_factory || null,
      estado: dialog.form.estado,
      fecha_firma_contrato: dialog.form.fecha_firma_contrato || null,
      enlace_drive: dialog.form.enlace_drive || null,
      tarifa_admin: dialog.form.tarifa_admin_pct != null ? dialog.form.tarifa_admin_pct / 100 : null,
      tarifa_cgm: dialog.form.tarifa_cgm ?? null,
      tarifa_representacion: dialog.form.tarifa_representacion ?? null,
      contratante_nombre: 'Unergy Energía Digital S.A.S. E.S.P.',
      prestador_nombre: 'Unergy Energía Digital S.A.S. E.S.P.',
    }
    if (dialog.modo === 'crear') {
      await api.post('/contratos-servicio', payload)
    } else {
      await api.patch(`/contratos-servicio/${dialog.id}`, payload)
    }
    dialog.visible = false
    toast.add({ severity: 'success', summary: dialog.modo === 'crear' ? 'Contrato creado' : 'Contrato actualizado', life: 2500 })
    await cargar()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 4000 })
  } finally {
    guardando.value = false
  }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este contrato?')) return
  try {
    await api.delete(`/contratos-servicio/${id}`)
    toast.add({ severity: 'success', summary: 'Eliminado', life: 2000 })
    await cargar()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

async function cargar() {
  try {
    const { data } = await api.get('/contratos-servicio', {
      params: { tipo: 'representacion', proyecto_id: route.params.id },
    })
    contratos.value = data
  } catch {
    toast.add({ severity: 'error', summary: 'Error al cargar contratos', life: 3000 })
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/proyectos/${route.params.id}`)
    proyectoNombre.value = data.nombre_comercial || ''
  } catch { /* graceful degrade */ }
  await cargar()
  loading.value = false
})
</script>

<!-- ── TablaIdx (componente local) ────────────────────────────────────────── -->
<script>
const ANIO_ACTUAL_GLOBAL = 2026

const TablaIdx = {
  props: {
    titulo: { type: String, required: true },
    filas:  { type: Array, default: () => [] },
  },
  computed: {
    vigente() {
      if (!this.filas.length) return null
      return this.filas.find(f => f.año === ANIO_ACTUAL_GLOBAL) ?? this.filas[this.filas.length - 1]
    },
  },
  methods: {
    esVigente(f) { return f === this.vigente },
    estado(f) {
      if (f.esBase || f.año < ANIO_ACTUAL_GLOBAL) return 'pagado'
      if (this.esVigente(f)) return 'vigente'
      return 'pendiente'
    },
  },
  template: `
    <div class="rounded-xl overflow-hidden" style="border:1px solid #bfdbfe">
      <div class="flex items-center justify-between px-4 py-2.5" style="background:#eff6ff">
        <span class="text-xs font-semibold" style="color:#1e40af">
          <i class="pi pi-chart-line text-xs mr-1.5" style="color:#3b82f6" />{{ titulo }}
        </span>
        <span class="text-xs text-gray-400">Año vigente: {{ $options.ANIO }}</span>
      </div>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100">
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">Año</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">IPC aplicado</th>
            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500">Valor ($/kWh)</th>
            <th class="px-4 py-2 text-center text-xs font-semibold text-gray-500">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filas.length">
            <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">Sin datos de indexación.</td>
          </tr>
          <tr v-for="f in filas" :key="f.año"
            class="border-b border-gray-50 hover:bg-blue-50/20 transition-colors"
            :style="esVigente(f) ? 'background:#eff6ff40' : ''">
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-semibold" :style="esVigente(f) ? 'color:#1d4ed8' : 'color:#2C2039'">
                  {{ f.año }}
                </span>
                <span v-if="esVigente(f)" class="text-xs px-1.5 py-0.5 rounded font-bold leading-none"
                  style="background:#dbeafe;color:#1d4ed8">actual</span>
                <i v-if="esVigente(f)" class="pi pi-arrow-left text-xs" style="color:#1d4ed8" />
              </div>
            </td>
            <td class="px-4 py-2.5">
              <span v-if="f.ipc == null" class="text-gray-400 text-xs">— (base)</span>
              <span v-else class="font-mono tabular-nums" style="color:#374151">{{ f.ipc }}%</span>
            </td>
            <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
              :style="esVigente(f) ? 'color:#1d4ed8' : 'color:#2C2039'">
              {{ f.valor?.toFixed(3) ?? '—' }}
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="estado(f) === 'pagado'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dcfce7;color:#166534">
                <i class="pi pi-check text-xs" />Pagado
              </span>
              <span v-else-if="estado(f) === 'vigente'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dbeafe;color:#1d4ed8">Vigente</span>
              <span v-else
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#f3f4f6;color:#9ca3af">Pendiente</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  ANIO: ANIO_ACTUAL_GLOBAL,
}
export default { components: { TablaIdx } }
</script>
