<template>
  <div class="if-wrap">

    <!-- ══ Toolbar ══════════════════════════════════════════════════════ -->
    <div class="if-topbar">
      <div class="if-topbar-title">
        <i class="pi pi-exclamation-triangle text-sm" style="color:#D97706" />
        <h2 class="text-base font-bold text-gray-800 whitespace-nowrap">Informes Faltantes</h2>
        <span class="hidden lg:inline text-xs text-gray-500">· Registra la razón de la ausencia o genera un borrador</span>
      </div>

      <div class="if-topbar-actions">
        <span v-if="mock" class="if-mock-pill" v-tooltip.bottom="'El backend aún no expone /informes/faltantes; los datos se guardan localmente para pruebas.'">
          <i class="pi pi-database" /> modo local
        </span>
        <Button icon="pi pi-refresh" outlined size="small" :loading="loading" @click="cargar"
                v-tooltip.bottom="'Actualizar'" />
        <Button label="Registrar faltante" icon="pi pi-plus" size="small" @click="abrirCrear" />
      </div>
    </div>

    <!-- Banner de alerta: faltantes no justificados -->
    <div v-if="noJustificados > 0" class="if-alert">
      <i class="pi pi-exclamation-circle" />
      <span>
        <b>{{ noJustificados }}</b> informe{{ noJustificados !== 1 ? 's' : '' }} faltante{{ noJustificados !== 1 ? 's' : '' }}
        sin justificar. Registra la razón o genera el borrador correspondiente.
      </span>
    </div>

    <!-- ══ Filtros ══════════════════════════════════════════════════════ -->
    <div class="if-toolbar">
      <IconField class="flex-1 min-w-[200px] max-w-sm">
        <InputIcon class="pi pi-search text-xs" />
        <InputText v-model="search" placeholder="Buscar por proyecto o razón…" class="w-full" size="small" />
      </IconField>
      <Select v-model="filtroEstado" :options="opcionesEstado" optionLabel="label" optionValue="value"
              placeholder="Estado" showClear class="w-44" size="small" />
      <Select v-model="filtroProyecto" :options="opcionesProyecto" optionLabel="label" optionValue="value"
              placeholder="Proyecto" showClear filter class="w-52" size="small" :loading="loadingProyectos" />
      <Button v-if="hayFiltros" icon="pi pi-times" text size="small" severity="secondary"
              @click="limpiarFiltros" v-tooltip.bottom="'Limpiar filtros'" />
      <span class="ml-auto text-[11px] text-gray-500 whitespace-nowrap" v-if="!loading">
        {{ filtrados.length }} / {{ faltantes.length }}
      </span>
    </div>

    <!-- ══ Tabla ════════════════════════════════════════════════════════ -->
    <div class="if-table-wrap">
      <div v-if="error" class="p-6 flex items-center gap-3 text-red-600">
        <i class="pi pi-exclamation-circle text-xl" />
        <div class="flex-1">
          <div class="font-semibold">Error al cargar</div>
          <div class="text-sm text-gray-500">{{ error }}</div>
        </div>
        <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargar" />
      </div>

      <DataTable v-else :value="filtrados" :loading="loading" rowHover stripedRows
                 class="if-table text-sm" :rows="15" paginator
                 :rowsPerPageOptions="[10, 15, 25, 50]" :alwaysShowPaginator="false" scrollable>
        <template #empty>
          <div class="flex flex-col items-center py-14 gap-2 text-gray-400">
            <i class="pi pi-check-circle text-4xl" style="color:#22C55E" />
            <p class="text-sm font-semibold text-gray-700">Sin informes faltantes</p>
            <p class="text-xs">
              {{ hayFiltros ? 'Ningún faltante coincide con los filtros.' : 'Todos los proyectos tienen su informe del período al día.' }}
            </p>
            <Button v-if="hayFiltros" label="Limpiar filtros" icon="pi pi-times" text size="small"
                    class="mt-2" @click="limpiarFiltros" />
          </div>
        </template>

        <Column header="Proyecto" field="proyecto_nombre" sortable style="min-width:220px">
          <template #body="{ data }">
            <div class="font-semibold text-gray-800">{{ data.proyecto_nombre || data.sub_project }}</div>
            <div class="text-[11px] text-gray-400">{{ data.sub_project }}</div>
          </template>
        </Column>

        <Column header="Mes / Año" sortable field="_periodo" style="min-width:120px">
          <template #body="{ data }">{{ periodoLabel(data) }}</template>
        </Column>

        <Column header="Razón" style="min-width:260px">
          <template #body="{ data }">
            <div v-if="data.razon" class="if-razon">{{ data.razon }}</div>
            <span v-else class="text-gray-400 italic text-xs">Sin razón registrada</span>
          </template>
        </Column>

        <Column header="Estado" sortable field="estado" style="width:150px">
          <template #body="{ data }">
            <Tag :value="ESTADO_LABEL[data.estado] || data.estado" :severity="estadoSeverity(data.estado)" />
          </template>
        </Column>

        <Column header="" style="width:150px" :pt="{ headerCell: { style: 'border:none' } }">
          <template #body="{ data }">
            <div class="flex items-center gap-1 justify-end">
              <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                      @click="abrirEditar(data)" v-tooltip.left="'Editar razón / justificar'" />
              <Button icon="pi pi-file-edit" text rounded size="small"
                      :disabled="convirtiendoId === data.id"
                      :loading="convirtiendoId === data.id"
                      @click="generarBorrador(data)"
                      v-tooltip.left="'Generar borrador de informe'" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- ══ Dialog: registrar / editar razón ═════════════════════════════ -->
    <Dialog v-model:visible="formVisible" modal class="w-full max-w-lg"
            :header="editando ? 'Editar razón del faltante' : 'Registrar informe faltante'">
      <div class="flex flex-col gap-4">
        <div v-if="!editando" class="flex flex-col gap-1">
          <label class="if-label">Proyecto</label>
          <Select v-model="form.sub_project" :options="opcionesProyecto" optionLabel="label" optionValue="value"
                  placeholder="Selecciona un proyecto…" filter class="w-full" :loading="loadingProyectos" />
          <small v-if="formErrors.sub_project" class="if-error">{{ formErrors.sub_project }}</small>
        </div>
        <div v-else class="if-readonly">
          <span class="if-label">Proyecto</span>
          <div class="font-semibold text-gray-800">{{ form.proyecto_nombre || form.sub_project }}</div>
        </div>

        <div v-if="!editando" class="flex flex-col gap-1">
          <label class="if-label">Mes del informe faltante</label>
          <input type="month" v-model="form.mesInput" :max="mesMax" class="if-input" />
          <small v-if="formErrors.mesInput" class="if-error">{{ formErrors.mesInput }}</small>
        </div>
        <div v-else class="if-readonly">
          <span class="if-label">Período</span>
          <div class="font-semibold text-gray-800">{{ periodoLabel({ anio: form.anio, mes: form.mes }) }}</div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="if-label">Razón de la ausencia</label>
          <Textarea v-model="form.razon" rows="3" autoResize class="w-full"
                    placeholder="Ej.: el proyecto energizó a mitad de mes; sin datos suficientes para un informe completo." />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox v-model="form.justificado" :binary="true" inputId="just" />
          <label for="just" class="text-sm text-gray-700 cursor-pointer">Marcar como justificado</label>
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text severity="secondary" size="small" @click="formVisible = false" />
        <Button :label="editando ? 'Guardar' : 'Registrar'" icon="pi pi-check" size="small"
                :loading="guardando" @click="guardarForm" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import api from '@/api/client'
import {
  listarFaltantes, registrarFaltante, actualizarFaltante, convertirEnBorrador,
  isMock, periodoLabel, ESTADO, ESTADO_LABEL,
} from '@/services/informesService'

const emit = defineEmits(['faltantes-updated'])
const router = useRouter()

// ── Estado ───────────────────────────────────────────────────────────────
const faltantes = ref([])
const proyectos = ref([])
const loading = ref(false)
const loadingProyectos = ref(false)
const error = ref('')
const mock = ref(false)
const convirtiendoId = ref(null)

const search = ref('')
const filtroEstado = ref(null)
const filtroProyecto = ref(null)

const today = new Date()
const mesMax = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

// ── Formulario (crear / editar) ────────────────────────────────────────────
const formVisible = ref(false)
const editando = ref(false)
const guardando = ref(false)
const form = ref({ id: null, sub_project: '', proyecto_nombre: '', anio: null, mes: null, mesInput: '', razon: '', justificado: false })
const formErrors = ref({})

// ── Opciones ─────────────────────────────────────────────────────────────
const opcionesEstado = [
  { label: ESTADO_LABEL[ESTADO.NO_JUSTIFICADO], value: ESTADO.NO_JUSTIFICADO },
  { label: ESTADO_LABEL[ESTADO.JUSTIFICADO], value: ESTADO.JUSTIFICADO },
  { label: ESTADO_LABEL[ESTADO.CONVERTIDO], value: ESTADO.CONVERTIDO },
]

const opcionesProyecto = computed(() =>
  [...proyectos.value]
    .map(p => ({
      value: p.sub_project,
      label: p.nombre_display || p.nombre_clientes || p.nombre_comercial || p.sub_project,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
)

const hayFiltros = computed(() => !!(search.value || filtroEstado.value || filtroProyecto.value))

const noJustificados = computed(() => faltantes.value.filter(f => f.estado === ESTADO.NO_JUSTIFICADO).length)

const filtrados = computed(() => {
  const q = search.value.trim().toLowerCase()
  return faltantes.value
    .filter(f => {
      if (filtroEstado.value && f.estado !== filtroEstado.value) return false
      if (filtroProyecto.value && f.sub_project !== filtroProyecto.value) return false
      if (q) {
        const hay = `${f.proyecto_nombre || ''} ${f.sub_project || ''} ${f.razon || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    // Clave de orden para la columna Mes/Año (sortField sólo acepta un string).
    .map(f => ({ ...f, _periodo: `${f.anio}-${String(f.mes).padStart(2, '0')}` }))
})

// ── Helpers ────────────────────────────────────────────────────────────────
function estadoSeverity(estado) {
  if (estado === ESTADO.NO_JUSTIFICADO) return 'danger'
  if (estado === ESTADO.JUSTIFICADO) return 'success'
  if (estado === ESTADO.CONVERTIDO) return 'info'
  return 'secondary'
}

function toast(msg, isErr = false) {
  window.__primeToast?.({
    severity: isErr ? 'error' : 'success',
    summary: isErr ? 'Error' : 'Listo',
    detail: msg,
    life: isErr ? 4200 : 3000,
  })
}

function limpiarFiltros() {
  search.value = ''
  filtroEstado.value = null
  filtroProyecto.value = null
}

function notificarPadre() {
  emit('faltantes-updated', { total: faltantes.value.length, noJustificados: noJustificados.value })
}

// ── Carga ────────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  error.value = ''
  try {
    faltantes.value = await listarFaltantes()
    mock.value = isMock()
    notificarPadre()
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'No se pudieron cargar los faltantes'
  } finally {
    loading.value = false
  }
}

async function cargarProyectos() {
  loadingProyectos.value = true
  try {
    const { data } = await api.get('/monitoreo/_legacy', { params: { action: 'getProjects' } })
    if (data?.ok) proyectos.value = (data.projects || []).filter(p => p.sub_project)
  } catch { /* no crítico: el filtro/selector quedará vacío */ }
  finally { loadingProyectos.value = false }
}

onMounted(() => { cargar(); cargarProyectos() })
defineExpose({ cargar })

// ── Crear / editar ─────────────────────────────────────────────────────────
function abrirCrear() {
  editando.value = false
  formErrors.value = {}
  form.value = { id: null, sub_project: '', proyecto_nombre: '', anio: null, mes: null, mesInput: mesMax, razon: '', justificado: false }
  formVisible.value = true
}

function abrirEditar(row) {
  editando.value = true
  formErrors.value = {}
  form.value = {
    id: row.id,
    sub_project: row.sub_project,
    proyecto_nombre: row.proyecto_nombre,
    anio: row.anio,
    mes: row.mes,
    mesInput: `${row.anio}-${String(row.mes).padStart(2, '0')}`,
    razon: row.razon || '',
    justificado: row.estado === ESTADO.JUSTIFICADO || row.estado === ESTADO.CONVERTIDO,
  }
  formVisible.value = true
}

function validarForm() {
  const errs = {}
  if (!editando.value) {
    if (!form.value.sub_project) errs.sub_project = 'Selecciona un proyecto.'
    if (!form.value.mesInput) errs.mesInput = 'Indica el mes del informe.'
  }
  formErrors.value = errs
  return Object.keys(errs).length === 0
}

async function guardarForm() {
  if (!validarForm()) return
  guardando.value = true
  try {
    const nuevoEstado = form.value.justificado ? ESTADO.JUSTIFICADO : ESTADO.NO_JUSTIFICADO
    if (editando.value) {
      // No degradar un faltante ya convertido a "no justificado" al editar.
      const target = faltantes.value.find(f => f.id === form.value.id)
      const estado = target?.estado === ESTADO.CONVERTIDO ? ESTADO.CONVERTIDO : nuevoEstado
      const actualizado = await actualizarFaltante(form.value.id, { razon: form.value.razon.trim(), estado })
      const idx = faltantes.value.findIndex(f => f.id === form.value.id)
      if (idx !== -1) faltantes.value[idx] = { ...faltantes.value[idx], ...actualizado }
      toast('Faltante actualizado')
    } else {
      const [y, m] = form.value.mesInput.split('-').map(Number)
      const proyecto = opcionesProyecto.value.find(p => p.value === form.value.sub_project)
      const creado = await registrarFaltante({
        sub_project: form.value.sub_project,
        proyecto_nombre: proyecto?.label,
        anio: y, mes: m,
        razon: form.value.razon.trim(),
        estado: nuevoEstado,
      })
      faltantes.value.unshift(creado)
      toast('Faltante registrado')
    }
    formVisible.value = false
    notificarPadre()
  } catch (e) {
    if (e.response?.status === 409) {
      toast(e.response?.data?.detail || 'Ya existe un faltante para ese proyecto y período', true)
    } else {
      toast(e.response?.data?.detail || e.message || 'No se pudo guardar', true)
    }
  } finally {
    guardando.value = false
  }
}

// ── Generar borrador ─────────────────────────────────────────────────────
async function generarBorrador(row) {
  convirtiendoId.value = row.id
  try {
    const res = await convertirEnBorrador(row.id)
    // Reflejar el nuevo estado en la fila.
    const idx = faltantes.value.findIndex(f => f.id === row.id)
    if (idx !== -1) faltantes.value[idx] = { ...faltantes.value[idx], estado: ESTADO.CONVERTIDO, informe_id: res?.informe_id ?? null }
    notificarPadre()
    // Si el backend creó un informe real, abrir su editor; si no (mock), pre-cargar
    // el wizard de generación con el proyecto y período del faltante.
    if (res?.informe_id) {
      toast('Borrador creado — abriendo editor…')
      router.push(`/informes/${res.informe_id}`)
    } else {
      toast('Abriendo el generador pre-cargado con este proyecto y período…')
      router.push({
        path: '/operaciones/informes-mensuales',
        query: { tab: 'generar', proyecto: row.sub_project, mes: `${row.anio}-${String(row.mes).padStart(2, '0')}` },
      })
    }
  } catch (e) {
    if (e.response?.status === 409) {
      toast(e.response?.data?.detail || 'El faltante ya fue convertido a borrador', true)
      cargar()
    } else {
      toast(e.response?.data?.detail || e.message || 'No se pudo generar el borrador', true)
    }
  } finally {
    convirtiendoId.value = null
  }
}
</script>

<style scoped>
.if-wrap {
  min-height: 100%;
  background: #f8f7fa;
  font-family: 'Sora', system-ui, sans-serif;
  padding: 0 0 24px;
}

.if-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #ECE7F2;
}
.if-topbar-title { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.if-topbar-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.if-mock-pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; color: #92600A;
  background: #FEF3C7; border: 1px solid #FDE68A;
  padding: 3px 8px; border-radius: 999px;
}

.if-alert {
  display: flex; align-items: center; gap: 10px;
  margin: 12px 14px 0;
  padding: 10px 14px;
  background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
  color: #B91C1C; font-size: 13px;
}
.if-alert i { font-size: 16px; }

.if-toolbar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 12px 14px;
}

.if-table-wrap {
  margin: 0 14px;
  background: #fff;
  border: 1px solid #ECE7F2;
  border-radius: 12px;
  overflow: hidden;
}

.if-razon {
  font-size: 12px; color: #3D2D5C; line-height: 1.5;
  max-width: 420px;
  white-space: normal;
}

.if-label { font-size: 11px; font-weight: 700; color: #6B5A8A; text-transform: uppercase; letter-spacing: .4px; }
.if-error { color: #DC2626; font-size: 11px; }
.if-readonly { display: flex; flex-direction: column; gap: 2px; }

.if-input {
  border: 1px solid #E5E2EC;
  border-radius: 8px;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 13px;
  color: #2C2039;
  background: #fff;
}
.if-input:focus { outline: none; border-color: #915BD8; box-shadow: 0 0 0 3px rgba(145,91,216,.15); }
</style>
