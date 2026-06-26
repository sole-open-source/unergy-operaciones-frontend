<template>
  <div class="space-y-4 pt-3">

    <!-- ── Barra superior ──────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <p class="text-xs text-gray-400">
        {{ filas.length }} proyectos · haz clic en
        <i class="pi pi-pencil" style="font-size:10px" /> para editar cualquier campo
      </p>
      <Button label="Agregar" icon="pi pi-plus" size="small" outlined
        @click="agregarFila"
        style="border-color:#915BD8;color:#915BD8" />
    </div>

    <!-- ── Tabla ──────────────────────────────────────────────────────────── -->
    <div class="rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse" style="min-width:860px">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto</th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500" style="width:140px">
                Tipo de pago
              </th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500" style="width:170px">
                Anticipo pagado hasta
              </th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500" style="width:160px">
                Próxima fecha por cobrar
              </th>
              <th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Observaciones</th>
              <th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500" style="width:80px">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, i) in filas" :key="fila.id"
              class="border-b border-gray-50 hover:bg-gray-50/40 group"
              :class="fila._editando ? 'bg-purple-50/30' : ''">

              <!-- ── MODO LECTURA ── -->
              <template v-if="!fila._editando">
                <td class="px-3 py-2.5 font-medium text-sm" style="color:#2C2039; white-space:nowrap">
                  {{ fila.proyecto }}
                  <span v-if="fila._custom"
                    class="ml-1 text-[10px] px-1 py-0.5 rounded"
                    style="background:#f1f5f9;color:#64748b">manual</span>
                </td>
                <td class="px-3 py-2.5">
                  <span v-if="fila.tipo_pago"
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :style="tipoPagoStyle(fila.tipo_pago)">
                    {{ fila.tipo_pago }}
                  </span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>
                <td class="px-3 py-2.5 text-xs text-gray-600">
                  {{ fila.anticipo_hasta || '—' }}
                </td>
                <td class="px-3 py-2.5 text-xs text-gray-600">
                  <span v-if="fila.proxima_fecha"
                    :style="proximaFechaStyle(fila.proxima_fecha)"
                    class="font-medium">
                    {{ fmtFecha(fila.proxima_fecha) }}
                  </span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-3 py-2.5 text-xs text-gray-500 max-w-xs truncate"
                  :title="fila.observaciones">
                  {{ fila.observaciones || '—' }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button type="button"
                      class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-purple-600"
                      v-tooltip.top="'Editar'"
                      @click="iniciarEdicion(i)">
                      <i class="pi pi-pencil" style="font-size:12px" />
                    </button>
                    <button v-if="fila._custom" type="button"
                      class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                      v-tooltip.top="'Eliminar'"
                      @click="eliminarFila(i)">
                      <i class="pi pi-trash" style="font-size:11px" />
                    </button>
                  </div>
                </td>
              </template>

              <!-- ── MODO EDICIÓN ── -->
              <template v-else>
                <td class="px-3 py-2">
                  <input v-if="fila._custom"
                    v-model="fila._draft.proyecto" type="text"
                    class="input-cell w-full"
                    placeholder="Nombre del proyecto" />
                  <span v-else class="text-sm font-medium" style="color:#2C2039">
                    {{ fila.proyecto }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <select v-model="fila._draft.tipo_pago" class="input-cell w-full">
                    <option value="">— Seleccionar —</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </td>
                <td class="px-3 py-2">
                  <input v-model="fila._draft.anticipo_hasta" type="text"
                    class="input-cell w-full"
                    placeholder="ej: marzo 2026" />
                </td>
                <td class="px-3 py-2">
                  <input v-model="fila._draft.proxima_fecha" type="date"
                    class="input-cell w-full" />
                </td>
                <td class="px-3 py-2">
                  <input v-model="fila._draft.observaciones" type="text"
                    class="input-cell w-full"
                    placeholder="Observaciones…" />
                </td>
                <td class="px-3 py-2 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button type="button"
                      class="text-purple-600 hover:text-purple-800 transition-colors"
                      v-tooltip.top="'Guardar'"
                      @click="guardarFila(i)">
                      <i class="pi pi-check" style="font-size:13px" />
                    </button>
                    <button type="button"
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                      v-tooltip.top="'Cancelar'"
                      @click="cancelarEdicion(i)">
                      <i class="pi pi-times" style="font-size:12px" />
                    </button>
                  </div>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import arriendosRaw from '@/data/pagoarriendos.json'

// ── Storage ────────────────────────────────────────────────────────────────────
const INFO_KEY  = 'arriendos_info'
const EXTRA_KEY = 'arriendos_proyectos_extra'

// info guardada: { [id]: { tipo_pago, anticipo_hasta, proxima_fecha, observaciones } }
const infoStore = ref({})

function cargarInfo() {
  try {
    const raw = localStorage.getItem(INFO_KEY)
    if (raw) infoStore.value = JSON.parse(raw)
  } catch {}
}

function persistirInfo() {
  // Guardar sólo los campos editables, no el estado de UI
  const data = {}
  filas.value.forEach(f => {
    data[f.id] = {
      tipo_pago:      f.tipo_pago,
      anticipo_hasta: f.anticipo_hasta,
      proxima_fecha:  f.proxima_fecha,
      observaciones:  f.observaciones,
      ...(f._custom ? { proyecto: f.proyecto, _custom: true } : {}),
    }
  })
  try { localStorage.setItem(INFO_KEY, JSON.stringify(data)) } catch {}
}

// ── Filas ──────────────────────────────────────────────────────────────────────
const filas = ref([])

function construirFilas() {
  // 1. Proyectos del JSON
  const fuente = [...arriendosRaw]

  // 2. Proyectos extras (agregados manualmente en el panel)
  try {
    const rawExtra = localStorage.getItem(EXTRA_KEY)
    if (rawExtra) {
      const extras = JSON.parse(rawExtra)
      extras.forEach(e => fuente.push({ ...e, _extraId: e._extraId }))
    }
  } catch {}

  // 3. Construir fila por cada proyecto
  const resultado = fuente.map(p => {
    const id      = p._extraId ?? (p.Codigo || p.Proyecto)
    const saved   = infoStore.value[id] || {}
    return {
      id,
      proyecto:       p.Proyecto,
      tipo_pago:      saved.tipo_pago      ?? '',
      anticipo_hasta: saved.anticipo_hasta ?? '',
      proxima_fecha:  saved.proxima_fecha  ?? '',
      observaciones:  saved.observaciones  ?? '',
      _custom:        false,
      _editando:      false,
      _draft:         {},
    }
  })

  // 4. Filas manuales (agregadas desde esta pestaña, no del panel)
  Object.entries(infoStore.value).forEach(([id, data]) => {
    if (!data._custom) return
    if (resultado.some(f => f.id === id)) return
    resultado.push({
      id,
      proyecto:       data.proyecto       ?? id,
      tipo_pago:      data.tipo_pago      ?? '',
      anticipo_hasta: data.anticipo_hasta ?? '',
      proxima_fecha:  data.proxima_fecha  ?? '',
      observaciones:  data.observaciones  ?? '',
      _custom:        true,
      _editando:      false,
      _draft:         {},
    })
  })

  filas.value = resultado
}

// ── Edición inline ─────────────────────────────────────────────────────────────
function iniciarEdicion(i) {
  const f = filas.value[i]
  f._draft = {
    proyecto:       f.proyecto,
    tipo_pago:      f.tipo_pago,
    anticipo_hasta: f.anticipo_hasta,
    proxima_fecha:  f.proxima_fecha,
    observaciones:  f.observaciones,
  }
  f._editando = true
}

function guardarFila(i) {
  const f = filas.value[i]
  if (f._custom && f._draft.proyecto) f.proyecto = f._draft.proyecto
  f.tipo_pago      = f._draft.tipo_pago      ?? ''
  f.anticipo_hasta = f._draft.anticipo_hasta ?? ''
  f.proxima_fecha  = f._draft.proxima_fecha  ?? ''
  f.observaciones  = f._draft.observaciones  ?? ''
  f._editando = false
  persistirInfo()
}

function cancelarEdicion(i) {
  const f = filas.value[i]
  // Si era una fila nueva sin datos, eliminarla
  if (f._custom && !f.tipo_pago && !f.anticipo_hasta && !f.proxima_fecha && !f.observaciones && !f.proyecto.trim()) {
    filas.value.splice(i, 1)
  } else {
    f._editando = false
  }
}

function agregarFila() {
  const newId = `info_custom_${Date.now()}`
  filas.value.push({
    id:             newId,
    proyecto:       '',
    tipo_pago:      '',
    anticipo_hasta: '',
    proxima_fecha:  '',
    observaciones:  '',
    _custom:        true,
    _editando:      true,
    _draft: { proyecto: '', tipo_pago: '', anticipo_hasta: '', proxima_fecha: '', observaciones: '' },
  })
}

function eliminarFila(i) {
  const f = filas.value[i]
  filas.value.splice(i, 1)
  if (infoStore.value[f.id]) {
    delete infoStore.value[f.id]
    persistirInfo()
  }
}

// ── Helpers visuales ───────────────────────────────────────────────────────────
function tipoPagoStyle(tipo) {
  if (tipo === 'Mensual')    return 'background:#ede9fe;color:#6d28d9'
  if (tipo === 'Trimestral') return 'background:#dbeafe;color:#1e40af'
  if (tipo === 'Semestral')  return 'background:#dcfce7;color:#166534'
  if (tipo === 'Anual')      return 'background:#fef3c7;color:#92400e'
  return 'background:#f3f4f6;color:#6b7280'
}

function fmtFecha(iso) {
  if (!iso) return ''
  try {
    const [y, m, d] = iso.split('-')
    const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`
  } catch { return iso }
}

function proximaFechaStyle(iso) {
  if (!iso) return ''
  const diff = (new Date(iso) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return 'color:#dc2626'   // vencida
  if (diff < 15)  return 'color:#d97706'   // próxima (< 15 días)
  return 'color:#2C2039'
}

onMounted(() => { cargarInfo(); construirFilas() })
</script>

<style scoped>
.input-cell {
  font-size: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 8px;
  background: #fff;
  outline: none;
  transition: border-color .15s;
}
.input-cell:focus { border-color: #915BD8; box-shadow: 0 0 0 2px #915BD820; }
select.input-cell { cursor: pointer; }
</style>
