<template>
  <div class="space-y-6">

    <!-- ── Header ────────────────────────────────────────────────────────────── -->
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
        <h2 class="text-lg font-bold" style="color:#2C2039">Representación</h2>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20"><ProgressSpinner /></div>

    <template v-else>

      <!-- ══════════════════════════════════════════════════════════════════════
           SECCIÓN 1 — lo que había antes (contratos del sistema)
      ═══════════════════════════════════════════════════════════════════════ -->
      <div class="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <i class="pi pi-file-edit text-sm" style="color:#3b82f6" />
            <p class="text-sm font-semibold text-gray-700">Contratos · Representación</p>
          </div>
          <Button label="Nuevo contrato" icon="pi pi-plus" size="small"
            style="background:#3b82f6;border-color:#3b82f6"
            @click="abrirDialog()" />
        </div>

        <DataTable :value="contratos" :loading="loading" stripedRows class="text-sm" rowHover
          emptyMessage="Sin contratos registrados para este proyecto.">
          <Column field="numero_contrato" header="N° contrato" style="width:130px">
            <template #body="{ data }">
              <span class="font-mono text-xs text-gray-500">{{ data.numero_contrato || '—' }}</span>
            </template>
          </Column>
          <Column header="Contratante">
            <template #body="{ data }">{{ data.contratante_nombre || '—' }}</template>
          </Column>
          <Column header="Inversionista">
            <template #body="{ data }">{{ data.inversionista_nombre || '—' }}</template>
          </Column>
          <Column header="Prestador">
            <template #body="{ data }">{{ data.prestador_nombre || '—' }}</template>
          </Column>
          <Column field="fecha_firma_contrato" header="Firma" style="width:95px">
            <template #body="{ data }">{{ data.fecha_firma_contrato || '—' }}</template>
          </Column>
          <Column header="Estado" style="width:120px">
            <template #body="{ data }">
              <Tag :value="ESTADO_LABELS[data.estado] || data.estado"
                   :severity="ESTADO_SEVERITY[data.estado]" />
            </template>
          </Column>
          <Column style="width:80px">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button icon="pi pi-pencil" text size="small" severity="secondary"
                  @click="abrirDialog(data)" />
                <Button icon="pi pi-trash" text size="small" severity="danger"
                  @click="eliminar(data.id)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           SECCIÓN 2 — vista nueva con tarifas CGM / Representación
      ═══════════════════════════════════════════════════════════════════════ -->
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="h-px flex-1" style="background:#dbeafe" />
          <span class="text-xs font-semibold px-3 py-1 rounded-full"
            style="background:#eff6ff;color:#1d4ed8">
            Tarifas CGM / Representación
          </span>
          <div class="h-px flex-1" style="background:#dbeafe" />
        </div>

        <!-- Sin contratos con tarifas -->
        <div v-if="!contratosConTarifas.length"
          class="rounded-xl border border-dashed p-8 text-center" style="border-color:#3b82f640">
          <i class="pi pi-chart-bar text-2xl mb-2 block" style="color:#93c5fd" />
          <p class="text-sm text-gray-500">Ningún contrato tiene tarifas CGM/Representación aún.</p>
          <p class="text-xs text-gray-400 mt-1">Crea un contrato arriba y completa los campos de tarifa.</p>
        </div>

        <!-- Tarjetas -->
        <div v-for="c in contratosConTarifas" :key="c.id" class="space-y-0 mb-4">
          <!-- Separador inversionista -->
          <div class="flex items-center gap-3 py-1">
            <div class="h-px flex-1" style="background:#dbeafe" />
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
              style="background:#eff6ff;color:#1d4ed8">
              {{ c.inversionista_nombre }}
            </span>
            <div class="h-px flex-1" style="background:#dbeafe" />
          </div>

          <!-- Tarjeta -->
          <div class="rounded-xl border bg-white p-5" style="border-color:#3b82f640">
            <!-- Mini-cards encabezado -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
                  <i class="pi pi-user text-xs" style="color:#3b82f6" />Contratante
                </p>
                <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                  {{ c.contratante_nombre || 'Unergy Energía Digital S.A.S. E.S.P.' }}
                </p>
              </div>
              <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
                  <i class="pi pi-briefcase text-xs" style="color:#3b82f6" />Inversionista
                </p>
                <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                  {{ c.inversionista_nombre || '—' }}
                </p>
              </div>
              <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
                  <i class="pi pi-building text-xs" style="color:#3b82f6" />Prestador
                </p>
                <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                  {{ c.prestador_nombre || 'Unergy Energía Digital S.A.S. E.S.P.' }}
                </p>
              </div>
              <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
                  <i class="pi pi-calendar text-xs" style="color:#3b82f6" />Fecha firma
                </p>
                <p class="text-sm font-semibold" style="color:#1c1917">
                  {{ c.fecha_firma_contrato || '—' }}
                </p>
              </div>
              <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
                  <i class="pi pi-folder text-xs" style="color:#3b82f6" />Portafolio
                </p>
                <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                  {{ c.portafolio || '—' }}
                </p>
              </div>
              <div class="rounded-lg p-3" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1 flex items-center gap-1" style="color:#1e40af">
                  <i class="pi pi-file-pdf text-xs" style="color:#3b82f6" />Contrato Drive
                </p>
                <a v-if="c.enlace_drive?.startsWith('http')"
                   :href="c.enlace_drive" target="_blank" rel="noopener"
                   class="text-sm font-semibold flex items-center gap-1 hover:underline"
                   style="color:#3b82f6">
                  <i class="pi pi-external-link text-xs" />Ver contrato
                </a>
                <span v-else class="text-sm text-gray-400">Sin enlace</span>
              </div>
            </div>

            <!-- Bloques de tarifa -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Admin -->
              <div class="rounded-xl p-4" style="background:#f0f9ff;border:1px solid #bae6fd">
                <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#0369a1">
                  <i class="pi pi-percentage text-xs" style="color:#0ea5e9" />Tarifa Admin
                </p>
                <p class="text-2xl font-bold tabular-nums" style="color:#0369a1">
                  {{ c.tarifa_admin != null ? (c.tarifa_admin * 100).toFixed(1) + '%' : '—' }}
                </p>
                <p class="text-xs mt-1" style="color:#7dd3fc">Porcentaje fijo</p>
              </div>
              <!-- CGM -->
              <div class="rounded-xl p-4" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-chart-bar text-xs" style="color:#3b82f6" />Tarifa CGM
                </p>
                <p class="text-2xl font-bold tabular-nums" style="color:#1d4ed8">
                  {{ valorVigente(c.indexacion_cgm, c.tarifa_cgm) }} $/kWh
                </p>
                <button v-if="c.indexacion_cgm?.length" type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggle(c.id,'cgm')">
                  <i class="pi pi-chevron-down text-xs"
                    :style="isOpen(c.id,'cgm') ? 'transform:rotate(180deg)' : ''" />
                  {{ isOpen(c.id,'cgm') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </div>
              <!-- Representación -->
              <div class="rounded-xl p-4" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />Tarifa Representación
                </p>
                <p class="text-2xl font-bold tabular-nums" style="color:#1d4ed8">
                  {{ valorVigente(c.indexacion_representacion, c.tarifa_representacion) }} $/kWh
                </p>
                <button v-if="c.indexacion_representacion?.length" type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggle(c.id,'rep')">
                  <i class="pi pi-chevron-down text-xs"
                    :style="isOpen(c.id,'rep') ? 'transform:rotate(180deg)' : ''" />
                  {{ isOpen(c.id,'rep') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </div>
            </div>

            <!-- Tabla indexación CGM -->
            <div :style="{overflow:'hidden',transition:'max-height .35s ease',
              maxHeight:isOpen(c.id,'cgm')?'500px':'0px'}">
              <div class="pt-4">
                <TablaIdx titulo="Indexación CGM" :filas="c.indexacion_cgm||[]" />
              </div>
            </div>
            <!-- Tabla indexación Representación -->
            <div :style="{overflow:'hidden',transition:'max-height .35s ease',
              maxHeight:isOpen(c.id,'rep')?'500px':'0px'}">
              <div class="pt-4">
                <TablaIdx titulo="Indexación Representación" :filas="c.indexacion_representacion||[]" />
              </div>
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
            {{ dialog.modo === 'crear' ? 'Nuevo contrato CGM / Representación' : 'Editar contrato' }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 flex flex-col gap-1">
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
            <InputNumber v-model="dialog.form.tarifa_admin_pct"
              :minFractionDigits="1" :maxFractionDigits="2" suffix="%" class="w-full" placeholder="3.8" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Contrato en Drive</label>
            <InputText v-model="dialog.form.enlace_drive" class="w-full" placeholder="https://drive.google.com/…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa CGM base ($/kWh)</label>
            <InputNumber v-model="dialog.form.tarifa_cgm"
              :minFractionDigits="2" :maxFractionDigits="4" class="w-full" placeholder="6.0" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Representación base ($/kWh)</label>
            <InputNumber v-model="dialog.form.tarifa_representacion"
              :minFractionDigits="2" :maxFractionDigits="4" class="w-full" placeholder="6.0" />
          </div>
        </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const route = useRoute()
const toast = useToast()

const ANIO_ACTUAL = 2026
const ESTADO_LABELS  = { vigente: 'Vigente', vencido: 'Vencido', terminado: 'Terminado', en_renovacion: 'En renovación' }
const ESTADO_SEVERITY = { vigente: 'success', vencido: 'danger', terminado: 'secondary', en_renovacion: 'warn' }

const proyectoNombre = ref('')
const contratos = ref([])
const loading = ref(true)
const guardando = ref(false)

// Solo muestra la sección de tarifas para contratos que ya tienen inversionista
const contratosConTarifas = computed(() =>
  contratos.value.filter(c => c.inversionista_nombre)
)

// Paneles expandibles de indexación
const paneles = ref({})
const isOpen = (id, tipo) => !!paneles.value[`${id}:${tipo}`]
const toggle = (id, tipo) => {
  const k = `${id}:${tipo}`
  paneles.value[k] = !paneles.value[k]
}

function valorVigente(indexaciones, base) {
  if (!indexaciones?.length) return base != null ? base.toFixed(3) : '—'
  const v = indexaciones.find(f => f.año === ANIO_ACTUAL) ?? indexaciones[indexaciones.length - 1]
  return v?.valor != null ? v.valor.toFixed(3) : (base != null ? base.toFixed(3) : '—')
}

// ── Dialog ────────────────────────────────────────────────────────────────────
const dialog = reactive({
  visible: false, modo: 'crear', id: null,
  form: {
    inversionista_nombre: '', portafolio: '', codigo_sun_factory: '',
    estado: 'vigente', fecha_firma_contrato: '', enlace_drive: '',
    tarifa_admin_pct: null, tarifa_cgm: null, tarifa_representacion: null,
  },
})

function abrirDialog(contrato = null) {
  if (contrato) {
    dialog.modo = 'editar'
    dialog.id = contrato.id
    Object.assign(dialog.form, {
      inversionista_nombre: contrato.inversionista_nombre || '',
      portafolio: contrato.portafolio || '',
      codigo_sun_factory: contrato.codigo_sun_factory || '',
      estado: contrato.estado || 'vigente',
      fecha_firma_contrato: contrato.fecha_firma_contrato || '',
      enlace_drive: contrato.enlace_drive || '',
      tarifa_admin_pct: contrato.tarifa_admin != null ? contrato.tarifa_admin * 100 : null,
      tarifa_cgm: contrato.tarifa_cgm ?? null,
      tarifa_representacion: contrato.tarifa_representacion ?? null,
    })
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
    toast.add({ severity: 'success', summary: dialog.modo === 'crear' ? 'Contrato creado' : 'Actualizado', life: 2500 })
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
  } catch {
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

<!-- ── TablaIdx ────────────────────────────────────────────────────────────── -->
<script>
const ANIO = 2026
const TablaIdx = {
  props: { titulo: String, filas: { type: Array, default: () => [] } },
  computed: {
    vigente() {
      return this.filas.find(f => f.año === ANIO) ?? this.filas[this.filas.length - 1]
    },
  },
  methods: {
    esV(f) { return f === this.vigente },
    est(f) {
      if (f.esBase || f.año < ANIO) return 'pagado'
      if (this.esV(f)) return 'vigente'
      return 'pendiente'
    },
  },
  template: `
    <div class="rounded-xl overflow-hidden" style="border:1px solid #bfdbfe">
      <div class="flex items-center justify-between px-4 py-2.5" style="background:#eff6ff">
        <span class="text-xs font-semibold" style="color:#1e40af">
          <i class="pi pi-chart-line text-xs mr-1" style="color:#3b82f6"/>{{ titulo }}
        </span>
        <span class="text-xs text-gray-400">Año vigente: ${ANIO}</span>
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
            class="border-b border-gray-50 hover:bg-blue-50/20"
            :style="esV(f)?'background:#eff6ff40':''">
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-semibold" :style="esV(f)?'color:#1d4ed8':'color:#2C2039'">{{ f.año }}</span>
                <span v-if="esV(f)" class="text-xs px-1.5 py-0.5 rounded font-bold" style="background:#dbeafe;color:#1d4ed8">actual</span>
                <i v-if="esV(f)" class="pi pi-arrow-left text-xs" style="color:#1d4ed8"/>
              </div>
            </td>
            <td class="px-4 py-2.5">
              <span v-if="f.ipc==null" class="text-gray-400 text-xs">— (base)</span>
              <span v-else class="font-mono tabular-nums" style="color:#374151">{{ f.ipc }}%</span>
            </td>
            <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
              :style="esV(f)?'color:#1d4ed8':'color:#2C2039'">{{ f.valor?.toFixed(3) ?? '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="est(f)==='pagado'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dcfce7;color:#166534"><i class="pi pi-check text-xs"/>Pagado</span>
              <span v-else-if="est(f)==='vigente'"
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
}
export default { components: { TablaIdx } }
</script>
