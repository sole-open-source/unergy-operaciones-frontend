<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="flex items-center gap-2">
      <Button icon="pi pi-arrow-left" text severity="secondary" @click="$router.back()" class="-ml-1" />
      <div>
        <p class="text-xs leading-none mb-0.5" style="color:#9b89b5">
          <span class="cursor-pointer hover:underline" @click="$router.push(`/proyectos/${route.params.id}`)">
            {{ proyectoNombre || '…' }}
          </span>
          <span class="mx-1.5">›</span><span>Servicios</span>
          <span class="mx-1.5">›</span>
          <span class="font-medium" style="color:#2C2039">Representación</span>
        </p>
        <h2 class="text-lg font-bold" style="color:#2C2039">Representación</h2>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><ProgressSpinner /></div>

    <template v-else>

      <!-- ═══ SECCIÓN 1 — tabla de contratos (vista anterior) ═══════════════════ -->
      <div class="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />
            <p class="text-sm font-semibold text-gray-700">Contratos · Representación</p>
          </div>
          <Button label="Nuevo contrato" icon="pi pi-plus" size="small"
            style="background:#3b82f6;border-color:#3b82f6"
            @click="abrirDialog()" />
        </div>
        <DataTable :value="contratos" stripedRows class="text-sm" rowHover
          emptyMessage="Sin contratos registrados para este proyecto.">
          <Column field="numero_contrato" header="N°" style="width:90px">
            <template #body="{ data }">
              <span class="font-mono text-xs text-gray-400">{{ data.numero_contrato || '—' }}</span>
            </template>
          </Column>
          <Column header="Inversionista">
            <template #body="{ data }">{{ data.inversionista_nombre || '—' }}</template>
          </Column>
          <Column header="Contratante" class="hidden md:table-cell">
            <template #body="{ data }">{{ data.contratante_nombre || '—' }}</template>
          </Column>
          <Column field="fecha_firma_contrato" header="Firma" style="width:90px">
            <template #body="{ data }">{{ data.fecha_firma_contrato || '—' }}</template>
          </Column>
          <Column header="Estado" style="width:110px">
            <template #body="{ data }">
              <Tag :value="ESTADO_LABELS[data.estado] || data.estado"
                   :severity="ESTADO_SEVERITY[data.estado]" />
            </template>
          </Column>
          <Column style="width:70px">
            <template #body="{ data }">
              <div class="flex gap-1">
                <Button icon="pi pi-pencil" text size="small" severity="secondary" @click="abrirDialog(data)" />
                <Button icon="pi pi-trash" text size="small" severity="danger" @click="eliminar(data.id)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- ═══ SECCIÓN 2 — tarjetas CGM/Representación ═══════════════════════════ -->
      <div>
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1" style="background:#dbeafe" />
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:#eff6ff;color:#1d4ed8">
            Tarifas CGM / Representación
          </span>
          <div class="h-px flex-1" style="background:#dbeafe" />
        </div>

        <div v-if="!contratosConTarifas.length"
          class="rounded-xl border border-dashed p-6 text-center" style="border-color:#3b82f640">
          <p class="text-sm text-gray-400">Ningún contrato tiene tarifas CGM/Representación registradas.</p>
        </div>

        <div v-for="c in contratosConTarifas" :key="c.id" class="mb-3">

          <!-- Separador inversionista -->
          <div class="flex items-center gap-2 mb-1.5">
            <div class="h-px flex-1" style="background:#e0effe" />
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style="background:#eff6ff;color:#3b82f6">
              {{ c.inversionista_nombre }}
            </span>
            <div class="h-px flex-1" style="background:#e0effe" />
          </div>

          <!-- Tarjeta compacta -->
          <div class="rounded-lg border bg-white" style="border-color:#dbeafe">

            <!-- Fila de meta-info -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-b text-xs"
              style="border-color:#f0f7ff">
              <!-- Nombre del proyecto -->
              <span class="flex items-center gap-1 font-semibold" style="color:#2C2039">
                <i class="pi pi-bolt text-[10px]" style="color:#3b82f6"/>
                {{ proyectoNombre }}
              </span>
              <!-- Portafolio -->
              <span v-if="c.portafolio" class="flex items-center gap-1 text-gray-500">
                <i class="pi pi-folder text-[10px]" style="color:#3b82f6"/>
                <span class="font-medium" style="color:#1e40af">Portafolio:</span>
                {{ c.portafolio }}
              </span>
              <!-- Badge estado -->
              <Tag v-if="c.estado" :value="ESTADO_LABELS[c.estado]||c.estado"
                   :severity="ESTADO_SEVERITY[c.estado]" class="text-[10px] !py-0 !px-1.5" />
              <!-- Inversionista -->
              <span class="flex items-center gap-1 text-gray-500">
                <i class="pi pi-briefcase text-[10px]" style="color:#3b82f6"/>
                <span class="font-medium" style="color:#1e40af">Inversionista:</span>
                {{ c.inversionista_nombre || '—' }}
              </span>
              <!-- Fecha firma -->
              <span class="flex items-center gap-1 text-gray-500">
                <i class="pi pi-calendar text-[10px]" style="color:#3b82f6"/>
                <span class="font-medium" style="color:#1e40af">Firma:</span>
                {{ c.fecha_firma_contrato || '—' }}
              </span>
              <!-- Link contrato (solo si existe) -->
              <a v-if="c.enlace_drive?.startsWith('http')"
                 :href="c.enlace_drive" target="_blank" rel="noopener"
                 class="flex items-center gap-1 font-medium hover:underline ml-auto"
                 style="color:#3b82f6">
                <i class="pi pi-external-link text-[10px]"/>Ver contrato
              </a>
            </div>

            <!-- Bloques de tarifa en una sola fila -->
            <div class="grid grid-cols-3 divide-x" style="divide-color:#f0f7ff">

              <!-- Tarifa Admin -->
              <div class="px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide mb-1" style="color:#0369a1">
                  Tarifa Admin
                </p>
                <p class="text-base font-bold tabular-nums" style="color:#0284c7">
                  {{ c.tarifa_admin != null ? (c.tarifa_admin * 100).toFixed(1) + '%' : '—' }}
                </p>
                <p class="text-[10px] text-gray-400 mt-0.5">Porcentaje fijo</p>
              </div>

              <!-- Tarifa CGM -->
              <div class="px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide mb-1" style="color:#1e40af">
                  Tarifa CGM
                </p>
                <p class="text-base font-bold tabular-nums" style="color:#2563eb">
                  {{ valorVigente(c.indexacion_cgm, c.tarifa_cgm) }}
                  <span class="text-xs font-normal text-gray-400">$/kWh</span>
                </p>
                <button v-if="(c.indexacion_cgm||[]).length" type="button"
                  class="flex items-center gap-0.5 text-[10px] font-medium mt-0.5 hover:opacity-75"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggle(c.id,'cgm')">
                  <i class="pi pi-chevron-down text-[9px]"
                    :style="isOpen(c.id,'cgm')?'transform:rotate(180deg);transition:.2s':'transition:.2s'" />
                  {{ isOpen(c.id,'cgm') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </div>

              <!-- Tarifa Representación -->
              <div class="px-3 py-2.5">
                <p class="text-[10px] font-semibold uppercase tracking-wide mb-1" style="color:#1e40af">
                  Tarifa Rep.
                </p>
                <p class="text-base font-bold tabular-nums" style="color:#2563eb">
                  {{ valorVigente(c.indexacion_representacion, c.tarifa_representacion) }}
                  <span class="text-xs font-normal text-gray-400">$/kWh</span>
                </p>
                <button v-if="(c.indexacion_representacion||[]).length" type="button"
                  class="flex items-center gap-0.5 text-[10px] font-medium mt-0.5 hover:opacity-75"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggle(c.id,'rep')">
                  <i class="pi pi-chevron-down text-[9px]"
                    :style="isOpen(c.id,'rep')?'transform:rotate(180deg);transition:.2s':'transition:.2s'" />
                  {{ isOpen(c.id,'rep') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </div>
            </div>

            <!-- Tabla indexación CGM -->
            <div v-show="isOpen(c.id,'cgm')" class="border-t" style="border-color:#dbeafe">
              <TablaIdx titulo="Indexación CGM" :filas="normalizarIdx(c.indexacion_cgm)" />
            </div>
            <!-- Tabla indexación Representación -->
            <div v-show="isOpen(c.id,'rep')" class="border-t" style="border-color:#dbeafe">
              <TablaIdx titulo="Indexación Representación" :filas="normalizarIdx(c.indexacion_representacion)" />
            </div>

          </div>
        </div>
      </div>

    </template>

    <!-- Dialog crear / editar -->
    <Dialog v-model:visible="dialog.visible" modal :style="{ width: '520px' }"
      :breakpoints="{ '560px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-file-edit text-sm" style="color:#3b82f6" />
          <span class="font-semibold text-sm" style="color:#2C2039">
            {{ dialog.modo === 'crear' ? 'Nuevo contrato CGM / Representación' : 'Editar contrato' }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Inversionista <span class="text-red-400">*</span></label>
            <InputText v-model="dialog.form.inversionista_nombre" class="w-full" placeholder="Nombre del inversionista" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Portafolio</label>
            <InputText v-model="dialog.form.portafolio" class="w-full" placeholder="Ej: Ayurá 1" />
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
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialog.visible = false" />
        <Button :label="dialog.modo==='crear'?'Crear':'Guardar'" icon="pi pi-check" :loading="guardando"
          style="background:#3b82f6;border-color:#3b82f6" @click="guardar" />
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
const ESTADO_LABELS  = { vigente:'Vigente', vencido:'Vencido', terminado:'Terminado', en_renovacion:'En renovación' }
const ESTADO_SEVERITY = { vigente:'success', vencido:'danger', terminado:'secondary', en_renovacion:'warn' }

const proyectoNombre = ref('')
const codigoTSF = ref('')
const contratos = ref([])
const loading = ref(true)
const guardando = ref(false)

// Solo tarjetas con inversionista (campo obligatorio para la tarjeta)
const contratosConTarifas = computed(() =>
  contratos.value.filter(c => c.inversionista_nombre)
)

// Normaliza el array de indexación: acepta clave "año" (ñ) o "anio"
function normalizarIdx(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(f => ({
    anio:  f.anio ?? f['año'] ?? f.año ?? null,
    ipc:   f.ipc  ?? null,
    valor: f.valor ?? null,
    esBase: f.esBase ?? f.es_base ?? false,
  }))
}

function valorVigente(raw, base) {
  const idx = normalizarIdx(raw)
  if (!idx.length) return base != null ? Number(base).toFixed(3) : '—'
  const v = idx.find(f => f.anio === ANIO_ACTUAL) ?? idx[idx.length - 1]
  return v?.valor != null ? Number(v.valor).toFixed(3) : (base != null ? Number(base).toFixed(3) : '—')
}

// Paneles expandibles
const paneles = ref({})
const isOpen  = (id, tipo) => !!paneles.value[`${id}:${tipo}`]
function toggle(id, tipo) {
  const k = `${id}:${tipo}`
  paneles.value = { ...paneles.value, [k]: !paneles.value[k] }
}

// Dialog
const dialog = reactive({
  visible: false, modo: 'crear', id: null,
  form: {
    inversionista_nombre:'', portafolio:'', codigo_sun_factory:'',
    estado:'vigente', fecha_firma_contrato:'', enlace_drive:'',
    tarifa_admin_pct: null, tarifa_cgm: null, tarifa_representacion: null,
  },
})

function abrirDialog(c = null) {
  if (c) {
    dialog.modo = 'editar'; dialog.id = c.id
    Object.assign(dialog.form, {
      inversionista_nombre: c.inversionista_nombre || '',
      portafolio: c.portafolio || '',
      codigo_sun_factory: c.codigo_sun_factory || '',
      estado: c.estado || 'vigente',
      fecha_firma_contrato: c.fecha_firma_contrato || '',
      enlace_drive: c.enlace_drive || '',
      tarifa_admin_pct: c.tarifa_admin != null ? c.tarifa_admin * 100 : null,
      tarifa_cgm: c.tarifa_cgm ?? null,
      tarifa_representacion: c.tarifa_representacion ?? null,
    })
  } else {
    dialog.modo = 'crear'; dialog.id = null
    Object.assign(dialog.form, {
      inversionista_nombre:'', portafolio:'', codigo_sun_factory:'',
      estado:'vigente', fecha_firma_contrato:'', enlace_drive:'',
      tarifa_admin_pct:null, tarifa_cgm:null, tarifa_representacion:null,
    })
  }
  dialog.visible = true
}

async function guardar() {
  if (!dialog.form.inversionista_nombre) {
    toast.add({ severity:'warn', summary:'El inversionista es obligatorio', life:2000 }); return
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
      contratante_nombre: 'Unergy Energia Digital S.A.S. E.S.P.',
      prestador_nombre:   'Unergy Energia Digital S.A.S. E.S.P.',
    }
    if (dialog.modo === 'crear') await api.post('/contratos-servicio', payload)
    else await api.patch(`/contratos-servicio/${dialog.id}`, payload)
    dialog.visible = false
    toast.add({ severity:'success', summary: dialog.modo==='crear' ? 'Contrato creado' : 'Actualizado', life:2500 })
    await cargar()
  } catch (e) {
    toast.add({ severity:'error', summary:'Error', detail:e.response?.data?.detail, life:4000 })
  } finally { guardando.value = false }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este contrato?')) return
  try {
    await api.delete(`/contratos-servicio/${id}`)
    toast.add({ severity:'success', summary:'Eliminado', life:2000 })
    await cargar()
  } catch { toast.add({ severity:'error', summary:'Error al eliminar', life:3000 }) }
}

async function cargar() {
  try {
    const params = { tipo: 'representacion', proyecto_id: route.params.id }
    if (codigoTSF.value) params.codigo_tsf = codigoTSF.value
    const { data } = await api.get('/contratos-servicio', { params })
    contratos.value = data
  } catch { toast.add({ severity:'error', summary:'Error al cargar contratos', life:3000 }) }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/proyectos/${route.params.id}`)
    proyectoNombre.value = data.nombre_comercial || ''
    codigoTSF.value = data.codigo_tsf || ''
  } catch { /* graceful degrade */ }
  await cargar()
  loading.value = false
})
</script>

<!-- ── TablaIdx ────────────────────────────────────────────────────────────── -->
<script>
const ANIO_V = 2026
const TablaIdx = {
  props: {
    titulo: { type: String, required: true },
    filas:  { type: Array, default: () => [] },
  },
  computed: {
    iVigente() {
      // índice del año vigente (o último si no existe)
      const idx = this.filas.findIndex(f => f.anio === ANIO_V)
      return idx >= 0 ? idx : this.filas.length - 1
    },
  },
  methods: {
    esVigente(i) { return i === this.iVigente },
    estadoFila(f, i) {
      if (f.esBase || f.anio < ANIO_V) return 'pagado'
      if (this.esVigente(i)) return 'vigente'
      return 'pendiente'
    },
  },
  template: `
    <div>
      <div class="flex items-center justify-between px-3 py-1.5" style="background:#f8faff">
        <span class="text-[11px] font-semibold" style="color:#1e40af">{{ titulo }}</span>
        <span class="text-[10px] text-gray-400">Año vigente: ${ANIO_V}</span>
      </div>
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase tracking-wide">
            <th class="px-3 py-1.5 text-left font-semibold">Año</th>
            <th class="px-3 py-1.5 text-left font-semibold">IPC aplicado</th>
            <th class="px-3 py-1.5 text-right font-semibold">Valor ($/kWh)</th>
            <th class="px-3 py-1.5 text-center font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filas.length">
            <td colspan="4" class="px-3 py-4 text-center text-gray-400">Sin datos de indexación.</td>
          </tr>
          <tr v-for="(f, i) in filas" :key="i"
            class="border-b border-gray-50"
            :style="esVigente(i) ? 'background:#eff6ff' : ''">
            <td class="px-3 py-1.5">
              <span class="font-mono font-semibold"
                :style="esVigente(i) ? 'color:#1d4ed8' : 'color:#374151'">{{ f.anio }}</span>
              <span v-if="esVigente(i)"
                class="ml-1 text-[9px] px-1 py-0.5 rounded font-bold"
                style="background:#dbeafe;color:#1d4ed8">actual ←</span>
            </td>
            <td class="px-3 py-1.5">
              <span v-if="!f.ipc" class="text-gray-400">— (base)</span>
              <span v-else class="font-mono" style="color:#374151">{{ f.ipc }}%</span>
            </td>
            <td class="px-3 py-1.5 text-right font-semibold font-mono tabular-nums"
              :style="esVigente(i) ? 'color:#1d4ed8' : 'color:#374151'">
              {{ f.valor != null ? Number(f.valor).toFixed(3) : '—' }}
            </td>
            <td class="px-3 py-1.5 text-center">
              <span v-if="estadoFila(f,i)==='pagado'"
                class="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style="background:#dcfce7;color:#166534"><i class="pi pi-check text-[9px]"/>Pagado</span>
              <span v-else-if="estadoFila(f,i)==='vigente'"
                class="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style="background:#dbeafe;color:#1d4ed8">Vigente</span>
              <span v-else
                class="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
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
