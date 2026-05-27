<template>
  <div class="inf-page">

    <!-- ══ Hero Header ══════════════════════════════════════════════ -->
    <div class="inf-hero">
      <div class="inf-hero-left">
        <h1 class="inf-hero-title">Informes</h1>
        <p class="inf-hero-sub">Informes operacionales y FMO · equipo Unergy</p>
      </div>
      <button class="inf-refresh-btn" :disabled="loading" @click="cargar" title="Actualizar">
        <span :class="loading ? 'spin-icon' : ''">↻</span>
        Actualizar
      </button>
    </div>

    <!-- ══ KPIs ═════════════════════════════════════════════════════ -->
    <div class="inf-kpis">
      <button
        class="kpi-card kpi-total"
        :class="{ 'kpi-active': !filtroEstado }"
        @click="setFiltroEstado('')"
      >
        <span class="kpi-num">{{ todosLoaded.length }}</span>
        <span class="kpi-label">Total</span>
      </button>
      <button
        class="kpi-card kpi-borrador"
        :class="{ 'kpi-active': filtroEstado === 'borrador' }"
        @click="setFiltroEstado('borrador')"
      >
        <span class="kpi-num">{{ kpis.borrador }}</span>
        <span class="kpi-label">Borrador</span>
      </button>
      <button
        class="kpi-card kpi-revisado"
        :class="{ 'kpi-active': filtroEstado === 'revisado' }"
        @click="setFiltroEstado('revisado')"
      >
        <span class="kpi-num">{{ kpis.revisado }}</span>
        <span class="kpi-label">Revisado</span>
      </button>
      <button
        class="kpi-card kpi-aprobado"
        :class="{ 'kpi-active': filtroEstado === 'aprobado' }"
        @click="setFiltroEstado('aprobado')"
      >
        <span class="kpi-num">{{ kpis.aprobado }}</span>
        <span class="kpi-label">Aprobado</span>
      </button>
    </div>

    <!-- ══ Filtros ═══════════════════════════════════════════════════ -->
    <div class="inf-filtros-bar">
      <div class="inf-filtros-group">
        <label class="inf-filtro-label">Año</label>
        <select v-model="filtroAnio" class="inf-select">
          <option value="">Todos</option>
          <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="inf-filtros-group">
        <label class="inf-filtro-label">Mes</label>
        <select v-model="filtroMes" class="inf-select">
          <option value="">Todos</option>
          <option v-for="m in meses" :key="m.v" :value="m.v">{{ m.label }}</option>
        </select>
      </div>
      <div class="inf-filtros-group">
        <label class="inf-filtro-label">Estado</label>
        <select v-model="filtroEstado" class="inf-select">
          <option value="">Todos</option>
          <option value="borrador">Borrador</option>
          <option value="revisado">Revisado</option>
          <option value="aprobado">Aprobado</option>
        </select>
      </div>
      <button v-if="filtroAnio || filtroMes || filtroEstado" class="inf-clear-btn" @click="limpiarFiltros">
        ✕ Limpiar filtros
      </button>

      <!-- contador -->
      <span class="inf-count-label" v-if="!loading">
        {{ informesFiltrados.length }} resultado{{ informesFiltrados.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- ══ Loading ═══════════════════════════════════════════════════ -->
    <div v-if="loading" class="inf-loading">
      <div class="spin-ring" />
      <span>Cargando informes…</span>
    </div>

    <!-- ══ Error ═════════════════════════════════════════════════════ -->
    <div v-else-if="error" class="inf-error-box">
      <span class="inf-error-icon">⚠️</span>
      <div>
        <div class="inf-error-title">Error al cargar informes</div>
        <div class="inf-error-msg">{{ error }}</div>
      </div>
      <button class="inf-refresh-btn" @click="cargar">Reintentar</button>
    </div>

    <!-- ══ Empty ═════════════════════════════════════════════════════ -->
    <div v-else-if="!informesFiltrados.length" class="inf-empty">
      <div class="inf-empty-icon">📄</div>
      <div class="inf-empty-title">
        {{ (filtroAnio || filtroMes || filtroEstado) ? 'Sin resultados para los filtros aplicados' : 'No hay informes guardados' }}
      </div>
      <div class="inf-empty-sub">
        {{ (filtroAnio || filtroMes || filtroEstado) ? 'Prueba con otros filtros' : 'Genera un informe desde Monitoreo Fallas' }}
      </div>
      <button v-if="filtroAnio || filtroMes || filtroEstado" class="inf-clear-btn" style="margin-top:12px" @click="limpiarFiltros">
        ✕ Limpiar filtros
      </button>
    </div>

    <!-- ══ Lista ═════════════════════════════════════════════════════ -->
    <div v-else class="inf-table-wrapper" :class="{ 'inf-table-wrapper--with-bulk': seleccionados.size > 0 }">
      <table class="inf-table">
        <thead>
          <tr>
            <th class="th-check">
              <input type="checkbox" class="inf-check"
                     :checked="todasSeleccionadas"
                     :indeterminate.prop="parcialSeleccion"
                     @change="toggleAll"
                     title="Seleccionar todas las filas visibles" />
            </th>
            <th>Estado</th>
            <th>Proyecto</th>
            <th>Tipo</th>
            <th>Periodo</th>
            <th>Última edición</th>
            <th>Aprobado por</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inf in informesFiltrados"
            :key="inf.id"
            class="inf-row"
            :class="{ 'inf-row--selected': seleccionados.has(inf.id) }"
            @click="abrirInforme(inf.id)"
          >
            <td class="td-check" @click.stop>
              <input type="checkbox" class="inf-check"
                     :checked="seleccionados.has(inf.id)"
                     @change="toggleSel(inf.id)"
                     :title="`Seleccionar ${inf.proyecto_nombre || inf.sub_project}`" />
            </td>
            <td>
              <span :class="['estado-pill', 'pill-' + inf.estado]">
                {{ estadoLabel(inf.estado) }}
              </span>
            </td>
            <td class="td-proyecto">
              <div class="td-nombre">{{ inf.proyecto_nombre || inf.sub_project }}</div>
              <div class="td-sub" v-if="inf.proyecto_nombre && inf.sub_project !== inf.proyecto_nombre">{{ inf.sub_project }}</div>
            </td>
            <td>
              <span class="tipo-tag">{{ tipoLabel(inf.tipo) }}</span>
            </td>
            <td class="td-periodo">
              {{ inf.periodo_display || formatPeriodo(inf.periodo_desde) }}
              <span v-if="inf.correo_enviado" class="enviado-dot" title="Correo enviado">📧</span>
            </td>
            <td class="td-fecha">
              <div>{{ inf.editado_en ? formatFecha(inf.editado_en) : '—' }}</div>
              <div class="td-autor" v-if="inf.editado_por_nombre">{{ inf.editado_por_nombre }}</div>
            </td>
            <td class="td-fecha">
              <div v-if="inf.aprobado_por_nombre" class="td-autor">{{ inf.aprobado_por_nombre }}</div>
              <div v-else class="td-empty">—</div>
            </td>
            <td class="td-acciones" @click.stop>
              <button class="action-btn action-open" @click="abrirInforme(inf.id)" title="Abrir informe">
                →
              </button>
              <button
                v-if="inf.estado !== 'aprobado'"
                class="action-btn action-del"
                :title="`Eliminar ${inf.proyecto_nombre || inf.sub_project}`"
                @click="eliminarInforme(inf)"
              >
                🗑
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ Bulk action bar (sticky-bottom) ══════════════════════════════ -->
    <transition name="slide-up">
      <div v-if="seleccionados.size > 0" class="inf-bulkbar">
        <div class="inf-bulkbar-info">
          <span class="inf-bulkbar-count">{{ seleccionados.size }}</span>
          <span class="inf-bulkbar-label">
            informe{{ seleccionados.size !== 1 ? 's' : '' }} seleccionado{{ seleccionados.size !== 1 ? 's' : '' }}
          </span>
          <span class="inf-bulkbar-breakdown">
            <span v-if="conteoSel.borrador" class="inf-mini-pill pill-borrador">{{ conteoSel.borrador }} borrador</span>
            <span v-if="conteoSel.revisado" class="inf-mini-pill pill-revisado">{{ conteoSel.revisado }} revisado</span>
            <span v-if="conteoSel.aprobado" class="inf-mini-pill pill-aprobado">{{ conteoSel.aprobado }} aprobado</span>
          </span>
        </div>
        <div class="inf-bulkbar-actions">
          <button class="inf-btn inf-btn-ghost"
                  v-if="puedeMarcarRevisado"
                  :disabled="enviando"
                  @click="bulkMarcarRevisado">
            👁 Marcar revisado{{ conteoSel.borrador > 1 ? 's' : '' }}
          </button>
          <button class="inf-btn inf-btn-ghost"
                  v-if="puedeDevolverBorrador"
                  :disabled="enviando"
                  @click="bulkDevolverBorrador">
            ↩ Devolver a borrador
          </button>
          <button class="inf-btn inf-btn-primary"
                  :disabled="!puedeAprobarEnviar || enviando"
                  @click="abrirConfirmEnvio"
                  :title="puedeAprobarEnviar ? 'Aprobar y enviar al correo operacional de cada cliente' : 'Selecciona informes en borrador, revisado o aprobado-sin-enviar'">
            ✉️ Aprobar y enviar
          </button>
          <button class="inf-btn inf-btn-ghost" :disabled="enviando" @click="limpiarSeleccion">
            ✕ Limpiar
          </button>
        </div>
      </div>
    </transition>

    <!-- ══ Modal: confirmar envío ═══════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="confirmEnvio" class="inf-modal-backdrop" @click.self="cerrarConfirmEnvio">
        <div class="inf-modal">
          <div class="inf-modal-header">
            <div>
              <h3 class="inf-modal-title">Aprobar y enviar {{ infsParaEnviar.length }} informe{{ infsParaEnviar.length !== 1 ? 's' : '' }}</h3>
              <p class="inf-modal-sub">
                Cada informe se aprobará y se enviará por correo al <b>cliente operacional</b> registrado en su ficha.
              </p>
            </div>
            <button class="inf-modal-close" :disabled="enviando" @click="cerrarConfirmEnvio">✕</button>
          </div>

          <!-- Lista de informes a enviar -->
          <div class="inf-modal-body">
            <div v-if="!enviando && !resultadoEnvio" class="inf-confirm-list">
              <div v-for="(inf, idx) in infsParaEnviar" :key="inf.id" class="inf-confirm-row">
                <div class="inf-confirm-num">{{ idx + 1 }}</div>
                <div class="inf-confirm-main">
                  <div class="inf-confirm-nombre">{{ inf.proyecto_nombre || inf.sub_project }}</div>
                  <div class="inf-confirm-meta">
                    <span class="tipo-tag">{{ tipoLabel(inf.tipo) }}</span>
                    <span>·</span>
                    <span>{{ inf.periodo_display || formatPeriodo(inf.periodo_desde) }}</span>
                  </div>
                </div>
                <div class="inf-confirm-trans">
                  <span :class="['estado-pill', 'pill-' + inf.estado]">{{ estadoLabel(inf.estado) }}</span>
                  <span class="inf-confirm-arrow">→</span>
                  <span class="estado-pill pill-aprobado">Aprobado</span>
                  <span class="inf-confirm-mail" title="Se enviará al correo operacional del cliente">📧</span>
                </div>
              </div>
            </div>

            <!-- Progreso -->
            <div v-else-if="enviando" class="inf-confirm-progress">
              <div class="inf-confirm-bar-wrap">
                <div class="inf-confirm-bar" :style="{ width: `${(progreso.hechos / progreso.total) * 100}%` }" />
              </div>
              <div class="inf-confirm-progress-info">
                <div class="inf-confirm-progress-num">{{ progreso.hechos }} / {{ progreso.total }}</div>
                <div class="inf-confirm-progress-msg">{{ progreso.actual || 'Procesando…' }}</div>
              </div>
              <div class="inf-confirm-progress-counts">
                <span class="inf-mini-pill pill-aprobado" v-if="progreso.ok > 0">✅ {{ progreso.ok }} enviados</span>
                <span class="inf-mini-pill pill-error" v-if="progreso.err > 0">⚠️ {{ progreso.err }} con error</span>
              </div>
            </div>

            <!-- Resultado -->
            <div v-else-if="resultadoEnvio" class="inf-confirm-result">
              <div class="inf-confirm-result-summary">
                <div class="inf-confirm-result-big">
                  <span class="inf-confirm-result-ok" v-if="resultadoEnvio.ok > 0">✅ {{ resultadoEnvio.ok }}</span>
                  <span class="inf-confirm-result-err" v-if="resultadoEnvio.err > 0">⚠️ {{ resultadoEnvio.err }}</span>
                </div>
                <div class="inf-confirm-result-text">
                  {{ resultadoEnvio.ok > 0 ? `${resultadoEnvio.ok} enviado${resultadoEnvio.ok !== 1 ? 's' : ''}` : '' }}
                  {{ resultadoEnvio.err > 0 ? ` · ${resultadoEnvio.err} con error` : '' }}
                </div>
              </div>
              <div v-if="resultadoEnvio.detalles?.length" class="inf-result-list">
                <div v-for="d in resultadoEnvio.detalles" :key="d.id" class="inf-result-row"
                     :class="{ 'inf-result-row--err': !d.ok }">
                  <span class="inf-result-icon">{{ d.ok ? '✅' : '⚠️' }}</span>
                  <div class="inf-result-main">
                    <div class="inf-result-nombre">{{ d.nombre }}</div>
                    <div class="inf-result-msg">{{ d.msg }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="inf-modal-footer">
            <button v-if="!enviando && !resultadoEnvio" class="inf-btn inf-btn-ghost" @click="cerrarConfirmEnvio">
              Cancelar
            </button>
            <button v-if="!enviando && !resultadoEnvio"
                    class="inf-btn inf-btn-primary"
                    @click="ejecutarEnvio">
              ✉️ Confirmar envío de {{ infsParaEnviar.length }} informe{{ infsParaEnviar.length !== 1 ? 's' : '' }}
            </button>
            <button v-if="resultadoEnvio" class="inf-btn inf-btn-primary" @click="cerrarConfirmEnvio">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/client'

const router = useRouter()

const todosLoaded  = ref([])
const loading      = ref(false)
const error        = ref(null)
const filtroEstado = ref('')
const filtroAnio   = ref('')
const filtroMes    = ref('')

// ── Selección masiva ───────────────────────────────────────────────
const seleccionados   = ref(new Set())   // Set<id>
const confirmEnvio    = ref(false)
const enviando        = ref(false)
const progreso        = ref({ hechos: 0, total: 0, actual: '', ok: 0, err: 0 })
const resultadoEnvio  = ref(null)        // { ok, err, detalles[] }

const meses = [
  { v: '01', label: 'Enero' },   { v: '02', label: 'Febrero' },
  { v: '03', label: 'Marzo' },   { v: '04', label: 'Abril' },
  { v: '05', label: 'Mayo' },    { v: '06', label: 'Junio' },
  { v: '07', label: 'Julio' },   { v: '08', label: 'Agosto' },
  { v: '09', label: 'Septiembre' }, { v: '10', label: 'Octubre' },
  { v: '11', label: 'Noviembre' }, { v: '12', label: 'Diciembre' },
]

const kpis = computed(() => ({
  borrador: todosLoaded.value.filter(i => i.estado === 'borrador').length,
  revisado: todosLoaded.value.filter(i => i.estado === 'revisado').length,
  aprobado: todosLoaded.value.filter(i => i.estado === 'aprobado').length,
}))

const aniosDisponibles = computed(() => {
  const set = new Set()
  todosLoaded.value.forEach(i => { if (i.periodo_desde) set.add(i.periodo_desde.slice(0, 4)) })
  return [...set].sort((a, b) => b - a)
})

const informesFiltrados = computed(() =>
  todosLoaded.value.filter(i => {
    if (filtroEstado.value && i.estado !== filtroEstado.value) return false
    if (filtroAnio.value && (!i.periodo_desde || !i.periodo_desde.startsWith(filtroAnio.value))) return false
    if (filtroMes.value && (!i.periodo_desde || i.periodo_desde.slice(5, 7) !== filtroMes.value)) return false
    return true
  })
)

function setFiltroEstado(val) {
  // toggle: si ya está activo, lo quita
  filtroEstado.value = filtroEstado.value === val ? '' : val
}

// ── Multi-select helpers ───────────────────────────────────────────
const seleccionadosArr = computed(() =>
  todosLoaded.value.filter(i => seleccionados.value.has(i.id))
)
const conteoSel = computed(() => ({
  borrador: seleccionadosArr.value.filter(i => i.estado === 'borrador').length,
  revisado: seleccionadosArr.value.filter(i => i.estado === 'revisado').length,
  aprobado: seleccionadosArr.value.filter(i => i.estado === 'aprobado').length,
}))
// Aprobar+enviar acepta cualquier no-aprobado-y-ya-enviado.
const infsParaEnviar = computed(() =>
  seleccionadosArr.value.filter(i => !(i.estado === 'aprobado' && i.correo_enviado))
)
const puedeAprobarEnviar = computed(() => infsParaEnviar.value.length > 0)
const puedeMarcarRevisado = computed(() =>
  seleccionadosArr.value.length > 0 &&
  seleccionadosArr.value.every(i => i.estado === 'borrador')
)
const puedeDevolverBorrador = computed(() =>
  seleccionadosArr.value.length > 0 &&
  seleccionadosArr.value.every(i => i.estado === 'revisado')
)
const todasSeleccionadas = computed(() =>
  informesFiltrados.value.length > 0 &&
  informesFiltrados.value.every(i => seleccionados.value.has(i.id))
)
const parcialSeleccion = computed(() => {
  const visibles = informesFiltrados.value
  const sel = visibles.filter(i => seleccionados.value.has(i.id)).length
  return sel > 0 && sel < visibles.length
})

function toggleSel(id) {
  const s = new Set(seleccionados.value)
  s.has(id) ? s.delete(id) : s.add(id)
  seleccionados.value = s
}
function toggleAll() {
  const s = new Set(seleccionados.value)
  if (todasSeleccionadas.value) {
    informesFiltrados.value.forEach(i => s.delete(i.id))
  } else {
    informesFiltrados.value.forEach(i => s.add(i.id))
  }
  seleccionados.value = s
}
function limpiarSeleccion() { seleccionados.value = new Set() }

// Limpiar selección cuando cambia el filtro (para evitar acciones invisibles)
watch([filtroEstado, filtroAnio, filtroMes], () => { limpiarSeleccion() })

// ── Bulk: marcar revisado ──────────────────────────────────────────
async function bulkMarcarRevisado() {
  const items = seleccionadosArr.value.filter(i => i.estado === 'borrador')
  if (!items.length) return
  enviando.value = true
  try {
    const results = await Promise.allSettled(
      items.map(i => api.patch(`/informes/${i.id}/estado`, { estado: 'revisado' }))
    )
    let ok = 0
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        const upd = r.value.data
        const t = todosLoaded.value.find(x => x.id === items[idx].id)
        if (t) Object.assign(t, upd)
        ok++
      }
    })
    if (ok < items.length) alert(`Se marcaron ${ok} de ${items.length} como revisados. ${items.length - ok} fallaron.`)
  } finally {
    enviando.value = false
  }
}

async function bulkDevolverBorrador() {
  const items = seleccionadosArr.value.filter(i => i.estado === 'revisado')
  if (!items.length) return
  if (!confirm(`¿Devolver ${items.length} informe(s) a borrador?`)) return
  enviando.value = true
  try {
    const results = await Promise.allSettled(
      items.map(i => api.patch(`/informes/${i.id}/estado`, { estado: 'borrador' }))
    )
    let ok = 0
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        const upd = r.value.data
        const t = todosLoaded.value.find(x => x.id === items[idx].id)
        if (t) Object.assign(t, upd)
        ok++
      }
    })
    if (ok < items.length) alert(`Se devolvieron ${ok} de ${items.length}. ${items.length - ok} fallaron.`)
  } finally {
    enviando.value = false
  }
}

// ── Bulk: aprobar y enviar (con confirmación) ──────────────────────
function abrirConfirmEnvio() {
  if (!infsParaEnviar.value.length) return
  resultadoEnvio.value = null
  progreso.value = { hechos: 0, total: 0, actual: '', ok: 0, err: 0 }
  confirmEnvio.value = true
}
function cerrarConfirmEnvio() {
  if (enviando.value) return
  confirmEnvio.value = false
  if (resultadoEnvio.value) {
    // si hubo envíos exitosos, limpiar selección de los que ya quedaron enviados
    const enviadosOk = new Set(
      (resultadoEnvio.value.detalles || []).filter(d => d.ok).map(d => d.id)
    )
    const newSel = new Set(seleccionados.value)
    enviadosOk.forEach(id => newSel.delete(id))
    seleccionados.value = newSel
    resultadoEnvio.value = null
  }
}

// Procesa UN informe: lo lleva del estado actual a aprobado + envía.
async function procesarUno(inf) {
  const nombre = `${inf.proyecto_nombre || inf.sub_project} · ${inf.periodo_display || inf.periodo_desde}`
  try {
    // borrador → revisado (si aplica)
    if (inf.estado === 'borrador') {
      const { data } = await api.patch(`/informes/${inf.id}/estado`, { estado: 'revisado' })
      const t = todosLoaded.value.find(x => x.id === inf.id)
      if (t) Object.assign(t, data)
    }
    // revisado → aprobado (si aplica)
    if (inf.estado === 'borrador' || inf.estado === 'revisado') {
      const { data } = await api.patch(`/informes/${inf.id}/estado`, { estado: 'aprobado' })
      const t = todosLoaded.value.find(x => x.id === inf.id)
      if (t) Object.assign(t, data)
    }
    // enviar
    const { data: env } = await api.post(`/informes/${inf.id}/enviar`, {})
    const t = todosLoaded.value.find(x => x.id === inf.id)
    if (t) { t.correo_enviado = true; t.correo_enviado_en = new Date().toISOString() }
    return { id: inf.id, nombre, ok: true, msg: `Enviado a ${env.enviado_a}` }
  } catch (e) {
    const msg = e.response?.data?.detail || e.message || 'Error desconocido'
    return { id: inf.id, nombre, ok: false, msg }
  }
}

async function ejecutarEnvio() {
  const items = [...infsParaEnviar.value]
  if (!items.length) return
  enviando.value = true
  progreso.value = { hechos: 0, total: items.length, actual: '', ok: 0, err: 0 }
  const detalles = []

  // Concurrencia limitada a 3 para no saturar el SMTP
  const CONC = 3
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const my = idx++
      const inf = items[my]
      progreso.value = { ...progreso.value, actual: `${inf.proyecto_nombre || inf.sub_project}…` }
      const res = await procesarUno(inf)
      detalles.push(res)
      progreso.value = {
        ...progreso.value,
        hechos: progreso.value.hechos + 1,
        ok: progreso.value.ok + (res.ok ? 1 : 0),
        err: progreso.value.err + (res.ok ? 0 : 1),
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, items.length) }, worker))

  resultadoEnvio.value = {
    ok: detalles.filter(d => d.ok).length,
    err: detalles.filter(d => !d.ok).length,
    detalles: detalles.sort((a, b) => Number(a.ok) - Number(b.ok)),  // errores primero
  }
  enviando.value = false
}

async function cargar() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/informes/', { params: { limit: 200 } })
    todosLoaded.value = data
  } catch (e) {
    error.value = e.response?.data?.detail || e.message
  } finally {
    loading.value = false
  }
}

function limpiarFiltros() {
  filtroEstado.value = ''; filtroAnio.value = ''; filtroMes.value = ''
}

function abrirInforme(id) { router.push(`/informes/${id}`) }

async function eliminarInforme(inf) {
  const nombre = inf.proyecto_nombre || inf.sub_project
  const periodo = inf.periodo_display || inf.periodo_desde || ''
  if (!confirm(`¿Eliminar el informe "${nombre} · ${periodo}"?\n\nEsta acción no se puede deshacer.`)) return
  try {
    await api.delete(`/informes/${inf.id}`)
    todosLoaded.value = todosLoaded.value.filter(i => i.id !== inf.id)
  } catch (e) {
    alert('⚠️ ' + (e.response?.data?.detail || e.message))
  }
}

function estadoLabel(e) {
  return { borrador: 'Borrador', revisado: 'Revisado', aprobado: 'Aprobado' }[e] || e
}
function tipoLabel(t) {
  return { op: 'Operacional', fmo: 'FMO', port: 'Portafolio' }[t] || (t || '—').toUpperCase()
}
function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatPeriodo(iso) {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  const mes = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][+m] || m
  return `${mes} ${y}`
}

onMounted(cargar)
</script>

<style scoped>
/* ── Página ─────────────────────────────────────────────────────── */
.inf-page {
  min-height: 100%;
  background: #f8f7fa;
  padding: 0;
  font-family: 'Sora', system-ui, sans-serif;
}

/* ── Hero ───────────────────────────────────────────────────────── */
.inf-hero {
  background: linear-gradient(135deg, #2C2039 0%, #3d2b52 60%, #4a2d6e 100%);
  padding: 28px 32px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(145,91,216,.2);
}
.inf-hero-title {
  font-size: 24px;
  font-weight: 900;
  color: #FDFAF7;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}
.inf-hero-sub {
  font-size: 13px;
  color: rgba(253,250,247,.55);
  margin: 0;
}

/* ── KPIs ───────────────────────────────────────────────────────── */
.inf-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border-bottom: 1px solid #e5e2ec;
}
@media (max-width: 640px) { .inf-kpis { grid-template-columns: repeat(2, 1fr); } }

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  border: none;
  background: #fff;
  cursor: pointer;
  transition: background .15s;
  border-right: 1px solid #e5e2ec;
  position: relative;
  font-family: inherit;
}
.kpi-card:last-child { border-right: none; }
.kpi-card:hover { background: #f4f1fa; }

.kpi-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  opacity: 0;
  transition: opacity .15s;
}
.kpi-card.kpi-active::after { opacity: 1; }
.kpi-card.kpi-active { background: #f9f7ff; }

.kpi-total::after    { background: #915BD8; }
.kpi-borrador::after { background: #d4a017; }
.kpi-revisado::after { background: #2563EB; }
.kpi-aprobado::after { background: #16a34a; }

.kpi-num {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 5px;
}
.kpi-total    .kpi-num { color: #6d28d9; }
.kpi-borrador .kpi-num { color: #d4a017; }
.kpi-revisado .kpi-num { color: #2563EB; }
.kpi-aprobado .kpi-num { color: #16a34a; }

.kpi-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: #9ca3af;
}
.kpi-card.kpi-active .kpi-label { color: #6b7280; }

/* ── Filtros ────────────────────────────────────────────────────── */
.inf-filtros-bar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 32px;
  background: #fff;
  border-bottom: 1px solid #e5e2ec;
}
.inf-filtros-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.inf-filtro-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #9ca3af;
}
.inf-select {
  background: #fff;
  border: 1.5px solid #e5e2ec;
  border-radius: 8px;
  padding: 7px 12px;
  color: #2C2039;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  min-width: 130px;
  transition: border-color .15s;
}
.inf-select:focus { border-color: #915BD8; }

.inf-clear-btn {
  background: transparent;
  border: 1.5px solid #e5e2ec;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  align-self: flex-end;
}
.inf-clear-btn:hover { border-color: #915BD8; color: #6d28d9; }

.inf-count-label {
  margin-left: auto;
  align-self: flex-end;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 600;
}

/* ── Refresh btn ────────────────────────────────────────────────── */
.inf-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 8px;
  padding: 8px 16px;
  color: #FDFAF7;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background .15s;
}
.inf-refresh-btn:hover:not(:disabled) { background: rgba(255,255,255,.2); }
.inf-refresh-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Loading ─────────────────────────────────────────────────────── */
.inf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 32px;
  color: #9ca3af;
  font-size: 13px;
}
.spin-ring {
  width: 32px; height: 32px;
  border: 3px solid #e5e2ec;
  border-top-color: #915BD8;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { display: inline-block; animation: spin .8s linear infinite; }

/* ── Error ───────────────────────────────────────────────────────── */
.inf-error-box {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 24px 32px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 16px 20px;
}
.inf-error-icon { font-size: 22px; flex-shrink: 0; }
.inf-error-title { font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 2px; }
.inf-error-msg { font-size: 12px; color: #ef4444; }

/* ── Empty ───────────────────────────────────────────────────────── */
.inf-empty {
  text-align: center;
  padding: 80px 32px;
}
.inf-empty-icon { font-size: 48px; margin-bottom: 14px; opacity: .3; }
.inf-empty-title { font-size: 16px; font-weight: 700; color: #6b7280; margin-bottom: 6px; }
.inf-empty-sub { font-size: 13px; color: #9ca3af; }

/* ── Tabla ───────────────────────────────────────────────────────── */
.inf-table-wrapper {
  padding: 24px 32px;
  overflow-x: auto;
}
.inf-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04);
}
.inf-table thead tr {
  background: #f8f7fa;
  border-bottom: 2px solid #e5e2ec;
}
.inf-table thead th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: #9ca3af;
  white-space: nowrap;
}
.inf-row {
  border-bottom: 1px solid #f0edf7;
  cursor: pointer;
  transition: background .12s;
}
.inf-row:last-child { border-bottom: none; }
.inf-row:hover { background: #f9f7ff; }
.inf-row td {
  padding: 13px 16px;
  vertical-align: middle;
}

.td-proyecto { min-width: 180px; }
.td-nombre {
  font-size: 13px;
  font-weight: 700;
  color: #1a1025;
}
.td-sub {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}
.td-periodo {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
}
.td-fecha { min-width: 120px; }
.td-fecha > div:first-child { font-size: 12px; color: #374151; }
.td-autor { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.td-empty { color: #d1d5db; font-size: 13px; }

/* Estado pills */
.estado-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: .4px;
  white-space: nowrap;
  text-transform: uppercase;
}
.pill-borrador { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
.pill-revisado { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
.pill-aprobado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

/* Tipo tag */
.tipo-tag {
  font-size: 11px;
  font-weight: 700;
  background: #f3f0ff;
  color: #7c3aed;
  border: 1px solid #e9d5ff;
  border-radius: 5px;
  padding: 2px 7px;
}

.enviado-dot { margin-left: 5px; font-size: 12px; }

/* Acciones */
.td-acciones {
  width: 80px;
  white-space: nowrap;
}
.action-btn {
  background: transparent;
  border: 1px solid #e5e2ec;
  border-radius: 6px;
  padding: 4px 9px;
  cursor: pointer;
  font-size: 13px;
  transition: all .14s;
  font-family: inherit;
}
.action-open { color: #6d28d9; margin-right: 4px; font-weight: 800; }
.action-open:hover { background: #f3f0ff; border-color: #7c3aed; }
.action-del { color: #ef4444; }
.action-del:hover { background: #fff5f5; border-color: #ef4444; }

/* ── Multi-select ───────────────────────────────────────────────── */
.th-check, .td-check { width: 36px; text-align: center; padding-left: 12px !important; padding-right: 0 !important; }
.inf-check {
  width: 16px; height: 16px;
  accent-color: #915BD8;
  cursor: pointer;
}
.inf-row--selected { background: #FAF5FF !important; }
.inf-row--selected:hover { background: #F3E8FF !important; }
.inf-table-wrapper--with-bulk { padding-bottom: 90px; }  /* deja espacio para barra fija */

/* ── Bulk action bar (sticky-bottom) ─────────────────────────────── */
.inf-bulkbar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  background: #1A1025;
  border: 1px solid rgba(145,91,216,.45);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: 0 10px 30px rgba(28,18,50,.35);
  z-index: 40;
  max-width: calc(100vw - 40px);
}
.inf-bulkbar-info {
  display: inline-flex; align-items: center; gap: 10px;
  color: #FDFAF7;
}
.inf-bulkbar-count {
  background: #915BD8;
  color: #fff;
  border-radius: 14px;
  padding: 2px 10px;
  font-weight: 800;
  font-size: 12px;
  min-width: 28px;
  text-align: center;
}
.inf-bulkbar-label { font-size: 13px; font-weight: 600; }
.inf-bulkbar-breakdown { display: inline-flex; gap: 5px; margin-left: 4px; }
.inf-mini-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: .3px;
  text-transform: uppercase;
}
.inf-mini-pill.pill-error { background: #FEE2E2; color: #991B1B; }
.inf-bulkbar-actions {
  display: inline-flex; gap: 6px; flex-wrap: wrap;
  margin-left: auto;
}

.inf-btn {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  white-space: nowrap;
}
.inf-btn:disabled { opacity: .5; cursor: not-allowed; }
.inf-btn-ghost {
  background: rgba(255,255,255,.08);
  color: #FDFAF7;
  border-color: rgba(255,255,255,.18);
}
.inf-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.16); }
.inf-btn-primary {
  background: #915BD8;
  color: #fff;
  border-color: #915BD8;
}
.inf-btn-primary:hover:not(:disabled) { background: #7C3AED; border-color: #7C3AED; }

/* ── Modal: confirmar envío ──────────────────────────────────────── */
.inf-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(26, 16, 37, .55);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  padding: 20px;
  backdrop-filter: blur(2px);
}
.inf-modal {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 640px;
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
}
.inf-modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #ECE7F2;
}
.inf-modal-title {
  font-size: 16px;
  font-weight: 800;
  color: #1A1025;
  margin: 0 0 4px;
}
.inf-modal-sub {
  font-size: 12px;
  color: #6B5A8A;
  margin: 0;
  line-height: 1.5;
}
.inf-modal-close {
  background: transparent;
  border: none;
  font-size: 18px;
  color: #6B5A8A;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  border-radius: 6px;
  flex-shrink: 0;
}
.inf-modal-close:hover { background: #F4F1FA; color: #2C2039; }
.inf-modal-body {
  padding: 14px 22px;
  overflow-y: auto;
  flex: 1;
}
.inf-modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid #ECE7F2;
  background: #FAF8FE;
}
.inf-modal-footer .inf-btn-ghost { background: transparent; color: #6B5A8A; border-color: #E5E2EC; }
.inf-modal-footer .inf-btn-ghost:hover:not(:disabled) { background: #F4F1FA; }

/* Lista en el modal */
.inf-confirm-list {
  display: flex; flex-direction: column; gap: 8px;
}
.inf-confirm-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  background: #FAF8FE;
  border: 1px solid #ECE7F2;
  border-radius: 9px;
}
.inf-confirm-num {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #915BD8;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}
.inf-confirm-main { flex: 1; min-width: 0; }
.inf-confirm-nombre {
  font-size: 13px;
  font-weight: 700;
  color: #1A1025;
}
.inf-confirm-meta {
  font-size: 11px;
  color: #6B5A8A;
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 2px;
}
.inf-confirm-trans {
  display: inline-flex; align-items: center; gap: 5px;
  flex-shrink: 0;
}
.inf-confirm-arrow { color: #9CA3AF; font-size: 14px; }
.inf-confirm-mail { font-size: 13px; margin-left: 2px; }

/* Progreso */
.inf-confirm-progress { padding: 12px 4px 8px; }
.inf-confirm-bar-wrap {
  background: #ECE7F2;
  border-radius: 99px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}
.inf-confirm-bar {
  height: 100%;
  background: linear-gradient(90deg, #915BD8, #7C3AED);
  border-radius: 99px;
  transition: width .25s ease;
}
.inf-confirm-progress-info {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.inf-confirm-progress-num {
  font-size: 18px;
  font-weight: 800;
  color: #6D28D9;
}
.inf-confirm-progress-msg {
  font-size: 12px;
  color: #6B5A8A;
  font-style: italic;
  text-align: right;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inf-confirm-progress-counts {
  display: flex; gap: 6px;
}

/* Resultado */
.inf-confirm-result-summary {
  text-align: center;
  padding: 14px 0 18px;
  border-bottom: 1px solid #ECE7F2;
  margin-bottom: 14px;
}
.inf-confirm-result-big {
  display: inline-flex; gap: 14px;
  font-size: 28px;
  font-weight: 900;
  margin-bottom: 6px;
}
.inf-confirm-result-ok { color: #16A34A; }
.inf-confirm-result-err { color: #DC2626; }
.inf-confirm-result-text {
  font-size: 13px;
  color: #6B5A8A;
  font-weight: 600;
}
.inf-result-list {
  display: flex; flex-direction: column; gap: 6px;
}
.inf-result-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 10px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 8px;
}
.inf-result-row--err { background: #FEF2F2; border-color: #FECACA; }
.inf-result-icon { font-size: 14px; flex-shrink: 0; }
.inf-result-main { flex: 1; min-width: 0; }
.inf-result-nombre {
  font-size: 12px;
  font-weight: 700;
  color: #1A1025;
}
.inf-result-msg {
  font-size: 11px;
  color: #6B5A8A;
  margin-top: 1px;
}
.inf-result-row--err .inf-result-msg { color: #991B1B; }

/* Transiciones */
.slide-up-enter-active, .slide-up-leave-active { transition: all .25s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 120%); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
