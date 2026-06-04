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

    <template v-else>

      <!-- ══════════════════════════════════════════════════════════════════════
           SECCIÓN 1 — tabla de contratos (vista anterior / gestión)
      ═══════════════════════════════════════════════════════════════════════ -->
      <div class="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <i class="pi pi-file-edit text-sm" style="color:#3b82f6" />
            <p class="text-sm font-semibold" style="color:#2C2039">
              Contratos · Representación
            </p>
          </div>
          <Button label="Nuevo contrato" icon="pi pi-plus" size="small"
            style="background:#3b82f6;border-color:#3b82f6"
            @click="abrirDialog()" />
        </div>
        <DataTable :value="contratos" stripedRows class="text-sm" rowHover
          emptyMessage="Sin contratos registrados para este proyecto.">
          <Column header="Inversionista">
            <template #body="{ data }">
              <span class="font-medium" style="color:#2C2039">
                {{ data.inversionista_nombre || '—' }}
              </span>
            </template>
          </Column>
          <Column header="Portafolio" class="hidden md:table-cell">
            <template #body="{ data }">{{ data.portafolio || '—' }}</template>
          </Column>
          <Column field="fecha_firma_contrato" header="Firma" style="width:100px">
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
                  v-tooltip="'Editar'" @click="abrirDialog(data)" />
                <Button icon="pi pi-trash" text size="small" severity="danger"
                  v-tooltip="'Eliminar'" @click="eliminar(data.id)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════
           SECCIÓN 2 — tarjetas de tarifas CGM / Representación
      ═══════════════════════════════════════════════════════════════════════ -->
      <div v-if="!contratosConTarifas.length"
        class="rounded-xl border border-dashed p-10 text-center"
        style="border-color:#3b82f640">
        <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style="background:#eff6ff">
          <i class="pi pi-file-edit text-xl" style="color:#3b82f6" />
        </div>
        <p class="text-sm font-medium text-gray-600 mb-1">Sin datos de tarifas</p>
        <p class="text-xs text-gray-400">
          Crea un contrato con tarifas CGM/Representación para verlo aquí.
        </p>
      </div>

      <template v-else>
        <!-- Separador de sección -->
        <div class="flex items-center gap-3">
          <div class="h-px flex-1" style="background:#dbeafe" />
          <span class="text-xs font-semibold px-3 py-1 rounded-full"
            style="background:#eff6ff;color:#1d4ed8">
            Tarifas CGM / Representación
          </span>
          <div class="h-px flex-1" style="background:#dbeafe" />
        </div>

        <!-- Una tarjeta por inversionista -->
        <div v-for="c in contratosConTarifas" :key="c.id">

          <!-- Encabezado de sección: nombre del inversionista -->
          <div class="flex items-center gap-3 mb-2">
            <div class="h-px flex-1" style="background:#e0effe" />
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
              style="background:#eff6ff;color:#3b82f6">
              {{ c.inversionista_nombre }}
            </span>
            <div class="h-px flex-1" style="background:#e0effe" />
          </div>

          <!-- Tarjeta (misma estructura que Mantenimiento O&M) -->
          <div class="rounded-xl border bg-white p-5 mb-4"
            style="border-color:#3b82f640">

            <!-- Header de la tarjeta -->
            <div class="flex items-start justify-between mb-4 gap-3">
              <div class="flex items-center gap-2.5 flex-wrap">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style="background:#eff6ff">
                  <i class="pi pi-file-edit text-sm" style="color:#3b82f6" />
                </div>
                <div>
                  <p class="text-xs text-gray-400 leading-none mb-0.5">
                    Contrato de Representación CGM
                  </p>
                  <span class="text-sm font-semibold" style="color:#2C2039">
                    {{ proyectoNombre }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <Tag :value="ESTADO_LABELS[c.estado] || c.estado"
                     :severity="ESTADO_SEVERITY[c.estado]" class="text-xs" />
                <Button icon="pi pi-pencil" label="Editar" size="small"
                  text severity="secondary" @click="abrirDialog(c)" />
              </div>
            </div>

            <!-- Mini-cards: meta-info del contrato -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <!-- Inversionista -->
              <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-briefcase text-xs" style="color:#3b82f6" />Inversionista
                </p>
                <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                  {{ c.inversionista_nombre || '—' }}
                </p>
              </div>
              <!-- Portafolio -->
              <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-folder text-xs" style="color:#3b82f6" />Portafolio
                </p>
                <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                  {{ c.portafolio || '—' }}
                </p>
              </div>
              <!-- Fecha firma -->
              <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-calendar text-xs" style="color:#3b82f6" />Fecha firma
                </p>
                <p class="text-sm font-semibold" style="color:#1c1917">
                  {{ c.fecha_firma_contrato || '—' }}
                </p>
              </div>
              <!-- Link al contrato (solo si existe) -->
              <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-file-pdf text-xs" style="color:#3b82f6" />Contrato
                </p>
                <a v-if="c.enlace_drive?.startsWith('http')"
                   :href="c.enlace_drive" target="_blank" rel="noopener"
                   class="text-sm font-semibold flex items-center gap-1.5 hover:underline"
                   style="color:#3b82f6">
                  <i class="pi pi-external-link text-xs" />Ver contrato
                </a>
                <span v-else class="text-sm text-gray-400">Sin enlace</span>
              </div>
            </div>

            <!-- Bloques de valor: Admin | CGM | Representación -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">

              <!-- Tarifa Admin — sin indexación -->
              <div class="rounded-lg p-3.5" style="background:#f0f9ff;border:1px solid #bae6fd">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#0369a1">
                  <i class="pi pi-percentage text-xs" style="color:#0ea5e9" />Tarifa Admin
                </p>
                <p class="text-base font-bold tabular-nums" style="color:#0284c7">
                  {{ c.tarifa_admin != null
                      ? (c.tarifa_admin * 100).toFixed(1) + '%'
                      : '—' }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">Porcentaje fijo</p>
              </div>

              <!-- Tarifa CGM — con indexación expandible -->
              <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-chart-bar text-xs" style="color:#3b82f6" />Tarifa CGM
                </p>
                <p class="text-base font-bold tabular-nums" style="color:#1d4ed8">
                  {{ valorVigente(c.indexacion_cgm, c.tarifa_cgm) }}
                  <span class="text-xs font-normal text-gray-400 ml-0.5">$/kWh</span>
                </p>
                <button v-if="idxLen(c.indexacion_cgm)" type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggleIdx(c.id, 'cgm')">
                  <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :style="isOpen(c.id,'cgm') ? 'transform:rotate(180deg)' : ''" />
                  {{ isOpen(c.id,'cgm') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </div>

              <!-- Tarifa Representación — con indexación expandible -->
              <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
                <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                  <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />Tarifa Representación
                </p>
                <p class="text-base font-bold tabular-nums" style="color:#1d4ed8">
                  {{ valorVigente(c.indexacion_representacion, c.tarifa_representacion) }}
                  <span class="text-xs font-normal text-gray-400 ml-0.5">$/kWh</span>
                </p>
                <button v-if="idxLen(c.indexacion_representacion)" type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggleIdx(c.id, 'rep')">
                  <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :style="isOpen(c.id,'rep') ? 'transform:rotate(180deg)' : ''" />
                  {{ isOpen(c.id,'rep') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </div>
            </div>

            <!-- Tabla indexación CGM (animada con max-height igual que OperacionView) -->
            <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
                maxHeight: isOpen(c.id,'cgm') ? '600px' : '0px' }">
              <div class="pt-3">
                <TablaIndexacion
                  titulo="Indexación CGM"
                  :filas="normalizarIdx(c.indexacion_cgm)"
                  :anio-vigente="ANIO_ACTUAL"
                />
              </div>
            </div>

            <!-- Tabla indexación Representación -->
            <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
                maxHeight: isOpen(c.id,'rep') ? '600px' : '0px' }">
              <div class="pt-3">
                <TablaIndexacion
                  titulo="Indexación Representación"
                  :filas="normalizarIdx(c.indexacion_representacion)"
                  :anio-vigente="ANIO_ACTUAL"
                />
              </div>
            </div>

          </div>
        </div>
      </template>
    </template>

    <!-- ── Dialog crear / editar ─────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialog.visible" modal :style="{ width: '520px' }"
      :breakpoints="{ '560px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center"
            style="background:#eff6ff">
            <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />
          </div>
          <span class="font-semibold text-sm" style="color:#2C2039">
            {{ dialog.modo === 'crear'
                ? 'Nuevo contrato Representación CGM'
                : 'Editar contrato' }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">
              Inversionista <span class="text-red-400">*</span>
            </label>
            <InputText v-model="dialog.form.inversionista_nombre" class="w-full"
              placeholder="Nombre del inversionista" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Portafolio</label>
            <InputText v-model="dialog.form.portafolio" class="w-full"
              placeholder="Ej: Ayurá 1" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Código Sun Factory</label>
            <InputText v-model="dialog.form.codigo_sun_factory" class="w-full"
              placeholder="COLCEST…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Estado</label>
            <Select v-model="dialog.form.estado"
              :options="ESTADOS_OPCIONES"
              optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha firma</label>
            <InputText v-model="dialog.form.fecha_firma_contrato" class="w-full"
              placeholder="YYYY-MM-DD" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Admin (%)</label>
            <InputNumber v-model="dialog.form.tarifa_admin_pct"
              :minFractionDigits="1" :maxFractionDigits="2" suffix="%" class="w-full"
              placeholder="3.8" />
          </div>
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Contrato en Drive</label>
            <InputText v-model="dialog.form.enlace_drive" class="w-full"
              placeholder="https://drive.google.com/…" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa CGM base ($/kWh)</label>
            <InputNumber v-model="dialog.form.tarifa_cgm"
              :minFractionDigits="2" :maxFractionDigits="4" class="w-full"
              placeholder="6.0" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Tarifa Representación base ($/kWh)</label>
            <InputNumber v-model="dialog.form.tarifa_representacion"
              :minFractionDigits="2" :maxFractionDigits="4" class="w-full"
              placeholder="6.0" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialog.visible = false" />
        <Button :label="dialog.modo === 'crear' ? 'Crear contrato' : 'Guardar cambios'"
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
import Button      from 'primevue/button'
import Tag         from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable   from 'primevue/datatable'
import Column      from 'primevue/column'
import Dialog      from 'primevue/dialog'
import InputText   from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select      from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const route = useRoute()
const toast = useToast()

// ── Constantes ───────────────────────────────────────────────────────────────
const ANIO_ACTUAL = 2026

const ESTADO_LABELS   = {
  vigente: 'Vigente', vencido: 'Vencido',
  terminado: 'Terminado', en_renovacion: 'En renovación',
}
const ESTADO_SEVERITY = {
  vigente: 'success', vencido: 'danger',
  terminado: 'secondary', en_renovacion: 'warn',
}
const ESTADOS_OPCIONES = [
  { label: 'Vigente',     value: 'vigente' },
  { label: 'Vencido',     value: 'vencido' },
  { label: 'Terminado',   value: 'terminado' },
  { label: 'En renovación', value: 'en_renovacion' },
]

// ── Estado ───────────────────────────────────────────────────────────────────
const proyectoNombre = ref('')
const codigoTSF      = ref('')
const contratos      = ref([])
const loading        = ref(true)
const guardando      = ref(false)

// Paneles de indexación: { "id:tipo": bool }
const paneles = ref({})
const isOpen  = (id, tipo) => !!paneles.value[`${id}:${tipo}`]
function toggleIdx(id, tipo) {
  const k = `${id}:${tipo}`
  paneles.value = { ...paneles.value, [k]: !paneles.value[k] }
}

// Solo contratos que tienen inversionista (los que muestran tarjeta)
const contratosConTarifas = computed(() =>
  contratos.value.filter(c => c.inversionista_nombre)
)

// ── Helpers de indexación ────────────────────────────────────────────────────

/**
 * Normaliza un array JSONB de indexación.
 * El JSONB usa la clave "año" (con ñ). JavaScript accede a ella con f['año'].
 * Devuelve siempre { anio, ipc, valor, esBase } para uso seguro en el componente.
 */
function normalizarIdx(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(f => ({
    anio:   f['año'] ?? null,   // clave canónica del JSONB
    ipc:    f.ipc   ?? null,
    valor:  f.valor ?? null,
    esBase: f.esBase ?? false,
  }))
}

/** Longitud segura del array de indexación (null → 0) */
function idxLen(raw) {
  return Array.isArray(raw) ? raw.length : 0
}

/** Devuelve el valor del año vigente (o el último disponible) como string */
function valorVigente(raw, base) {
  const idx = normalizarIdx(raw)
  if (!idx.length) return base != null ? Number(base).toFixed(3) : '—'
  const v = idx.find(f => f.anio === ANIO_ACTUAL) ?? idx[idx.length - 1]
  return v?.valor != null
    ? Number(v.valor).toFixed(3)
    : (base != null ? Number(base).toFixed(3) : '—')
}

// ── Dialog ───────────────────────────────────────────────────────────────────
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

function abrirDialog(c = null) {
  if (c) {
    dialog.modo = 'editar'
    dialog.id   = c.id
    Object.assign(dialog.form, {
      inversionista_nombre: c.inversionista_nombre || '',
      portafolio:           c.portafolio           || '',
      codigo_sun_factory:   c.codigo_sun_factory   || '',
      estado:               c.estado               || 'vigente',
      fecha_firma_contrato: c.fecha_firma_contrato  || '',
      enlace_drive:         c.enlace_drive          || '',
      tarifa_admin_pct:     c.tarifa_admin != null ? c.tarifa_admin * 100 : null,
      tarifa_cgm:           c.tarifa_cgm            ?? null,
      tarifa_representacion:c.tarifa_representacion ?? null,
    })
  } else {
    dialog.modo = 'crear'
    dialog.id   = null
    Object.assign(dialog.form, {
      inversionista_nombre: '',
      portafolio: '', codigo_sun_factory: '',
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
      servicio_aplica:      'representacion',
      proyecto_id:          Number(route.params.id),
      inversionista_nombre: dialog.form.inversionista_nombre,
      portafolio:           dialog.form.portafolio           || null,
      codigo_sun_factory:   dialog.form.codigo_sun_factory   || null,
      estado:               dialog.form.estado,
      fecha_firma_contrato: dialog.form.fecha_firma_contrato || null,
      enlace_drive:         dialog.form.enlace_drive         || null,
      tarifa_admin:         dialog.form.tarifa_admin_pct != null
                              ? dialog.form.tarifa_admin_pct / 100 : null,
      tarifa_cgm:           dialog.form.tarifa_cgm           ?? null,
      tarifa_representacion:dialog.form.tarifa_representacion ?? null,
    }
    if (dialog.modo === 'crear') {
      await api.post('/contratos-servicio', payload)
    } else {
      await api.patch(`/contratos-servicio/${dialog.id}`, payload)
    }
    dialog.visible = false
    toast.add({
      severity: 'success',
      summary: dialog.modo === 'crear' ? 'Contrato creado' : 'Cambios guardados',
      life: 2500,
    })
    await cargar()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail, life: 4000 })
  } finally {
    guardando.value = false
  }
}

async function eliminar(id) {
  if (!confirm('¿Eliminar este contrato? Esta acción no se puede deshacer.')) return
  try {
    await api.delete(`/contratos-servicio/${id}`)
    toast.add({ severity: 'success', summary: 'Contrato eliminado', life: 2000 })
    await cargar()
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ── Carga de datos ────────────────────────────────────────────────────────────
async function cargar() {
  try {
    const params = { tipo: 'representacion', proyecto_id: route.params.id }
    if (codigoTSF.value) params.codigo_tsf = codigoTSF.value
    const { data } = await api.get('/contratos-servicio', { params })
    contratos.value = data
  } catch {
    toast.add({ severity: 'error', summary: 'Error al cargar contratos', life: 3000 })
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

<!-- ══════════════════════════════════════════════════════════════════════════
     TablaIndexacion — componente local (mismo estilo que OperacionView)
═══════════════════════════════════════════════════════════════════════════ -->
<script>
const TablaIndexacion = {
  props: {
    titulo:      { type: String,  required: true },
    filas:       { type: Array,   default: () => [] },
    anioVigente: { type: Number,  default: 2026 },
  },
  computed: {
    /** Índice de la fila vigente (año = anioVigente) o la última fila */
    iVigente() {
      const i = this.filas.findIndex(f => f.anio === this.anioVigente)
      return i >= 0 ? i : this.filas.length - 1
    },
  },
  methods: {
    esVigente(i) { return i === this.iVigente },

    /**
     * Estado de cada fila:
     * - 'vigente':  es la fila del año vigente
     * - 'pagado':   año anterior al vigente (ya liquidado)
     * - 'pendiente': año posterior al vigente (futuro)
     *
     * CORRECCIÓN: el año base puede coincidir con el año vigente (2026),
     * en ese caso prima 'vigente' sobre 'pagado'.
     */
    estadoFila(f, i) {
      if (this.esVigente(i)) return 'vigente'
      if (f.anio < this.anioVigente) return 'pagado'
      return 'pendiente'
    },

    fmt(v) {
      return v != null ? Number(v).toFixed(3) : '—'
    },
  },
  template: `
    <div class="rounded-xl border border-blue-200 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2.5 bg-blue-50">
        <span class="text-xs font-semibold" style="color:#1e40af">
          <i class="pi pi-chart-line text-xs mr-1.5" style="color:#3b82f6" />{{ titulo }}
        </span>
        <span class="text-xs text-gray-400">Año vigente: {{ anioVigente }}</span>
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
            <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">
              Sin datos de indexación registrados.
            </td>
          </tr>
          <tr v-for="(f, i) in filas" :key="i"
            class="border-b border-gray-50 hover:bg-blue-50/20 transition-colors"
            :class="esVigente(i) ? 'bg-blue-50/50' : ''">
            <!-- Año -->
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-semibold"
                  :style="esVigente(i) ? 'color:#1d4ed8' : 'color:#2C2039'">
                  {{ f.anio }}
                </span>
                <span v-if="esVigente(i)"
                  class="text-xs px-1.5 py-0.5 rounded font-bold leading-none"
                  style="background:#dbeafe;color:#1d4ed8">actual</span>
                <i v-if="esVigente(i)" class="pi pi-arrow-left text-xs" style="color:#1d4ed8" />
              </div>
            </td>
            <!-- IPC -->
            <td class="px-4 py-2.5">
              <span v-if="f.ipc == null" class="text-gray-400 text-xs">— (base)</span>
              <span v-else class="font-mono tabular-nums" style="color:#374151">
                {{ f.ipc }}%
              </span>
            </td>
            <!-- Valor -->
            <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
              :style="esVigente(i) ? 'color:#1d4ed8' : 'color:#2C2039'">
              {{ fmt(f.valor) }}
            </td>
            <!-- Estado -->
            <td class="px-4 py-2.5 text-center">
              <span v-if="estadoFila(f,i) === 'pagado'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dcfce7;color:#166534">
                <i class="pi pi-check text-xs" />Pagado
              </span>
              <span v-else-if="estadoFila(f,i) === 'vigente'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dbeafe;color:#1d4ed8">
                Vigente
              </span>
              <span v-else
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#f3f4f6;color:#9ca3af">
                Pendiente
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
}
export default { components: { TablaIndexacion } }
</script>
