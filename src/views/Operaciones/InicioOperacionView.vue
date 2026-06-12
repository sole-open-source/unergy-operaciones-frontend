<template>
  <div class="io-page">
    <!-- ══ LISTA DE PROYECTOS ══════════════════════════════════════════════ -->
    <div v-if="!seleccion" class="io-list-wrap">
      <div class="io-list-head">
        <div class="flex items-center gap-2">
          <i class="pi pi-flag" style="color:#915BD8;font-size:16px" />
          <h2 class="io-title">Inicio de Operación</h2>
          <span class="io-badge">{{ proyectos.length }}</span>
        </div>
        <button class="io-icon-btn" :disabled="loadingLista" @click="cargarLista" title="Actualizar">
          <i :class="loadingLista ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
        </button>
      </div>

      <div class="io-search">
        <i class="pi pi-search" />
        <input v-model="busqueda" placeholder="Buscar proyecto…" />
      </div>

      <div v-if="loadingLista" class="io-state"><i class="pi pi-spin pi-spinner" /> Cargando proyectos…</div>
      <div v-else-if="!proyectosFiltrados.length" class="io-state">
        <i class="pi pi-inbox" style="font-size:32px;color:#cbd5e1" />
        <span>{{ proyectos.length ? 'Sin resultados' : 'No hay proyectos con servicio en operación' }}</span>
      </div>

      <div v-else class="io-grid">
        <button v-for="p in proyectosFiltrados" :key="p.id" class="io-card" @click="abrir(p.id)">
          <div class="io-card-top">
            <span class="io-card-name">{{ p.nombre_comercial }}</span>
            <span v-if="p.tiene_ficha" class="io-card-tag" :style="progresoStyle(p.progreso_pct)">{{ p.progreso_pct }}%</span>
            <span v-else class="io-card-tag io-card-tag--new">Sin iniciar</span>
          </div>
          <div class="io-card-meta">
            <span v-if="p.municipio || p.departamento"><i class="pi pi-map-marker" /> {{ [p.municipio, p.departamento].filter(Boolean).join(', ') }}</span>
            <span v-if="p.potencia_instalada_kwp"><i class="pi pi-bolt" /> {{ fmtCapacidad(p.potencia_instalada_kwp) }}</span>
          </div>
          <div class="io-card-bar"><div class="io-card-bar-fill" :style="{ width: (p.tiene_ficha ? p.progreso_pct : 0) + '%' }" /></div>
        </button>
      </div>
    </div>

    <!-- ══ FICHA DE DETALLE (misma pantalla, no modal) ═════════════════════ -->
    <div v-else class="io-detail">
      <div v-if="loadingFicha" class="io-state"><i class="pi pi-spin pi-spinner" /> Cargando ficha…</div>

      <template v-else>
        <!-- Encabezado -->
        <div class="io-detail-head">
          <button class="io-back" @click="cerrar"><i class="pi pi-arrow-left" /> Proyectos</button>
          <div class="io-detail-actions">
            <span v-if="dirty" class="io-dirty">Cambios sin guardar</span>
            <button class="io-save" :disabled="guardando || !dirty" @click="guardar">
              <i :class="guardando ? 'pi pi-spin pi-spinner' : 'pi pi-check'" /> {{ guardando ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>

        <div class="io-hero">
          <h1 class="io-hero-name">{{ proyecto.nombre_comercial }}</h1>
          <div class="io-hero-facts">
            <div class="io-fact">
              <span class="io-fact-label">Empresa contratista</span>
              <input v-model="ficha.empresa_contratista" class="io-fact-input" placeholder="—" @input="marcar" />
            </div>
            <div class="io-fact">
              <span class="io-fact-label">Ubicación</span>
              <span class="io-fact-val">{{ ubicacion || '—' }}</span>
            </div>
            <div class="io-fact">
              <span class="io-fact-label">Capacidad instalada</span>
              <span class="io-fact-val">{{ proyecto.potencia_instalada_kwp ? fmtCapacidad(proyecto.potencia_instalada_kwp) : '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Progreso global checklist -->
        <div class="io-progress-card">
          <div class="io-progress-top">
            <span>Checklist de sistemas aprobados</span>
            <b>{{ progreso }}%</b>
          </div>
          <div class="io-progress-bar"><div class="io-progress-fill" :style="{ width: progreso + '%' }" /></div>
          <span class="io-progress-sub">{{ aprobadosCount }} de {{ CHECKLIST.length }} aprobados</span>
        </div>

        <!-- ─ Sección 1: Checklist ─ -->
        <section class="io-acc">
          <button class="io-acc-head" @click="toggle('checklist')">
            <i :class="['pi', abierto.checklist ? 'pi-chevron-down' : 'pi-chevron-right']" />
            <i class="pi pi-list-check io-acc-ico" />
            <span>Checklist de sistemas</span>
            <span class="io-acc-count">{{ progreso }}%</span>
          </button>
          <div v-show="abierto.checklist" class="io-acc-body">
            <div v-for="item in CHECKLIST" :key="item.key" class="io-row">
              <div class="io-row-label">
                {{ item.label }} <span v-if="item.ref" class="io-ref">{{ item.ref }}</span>
              </div>
              <div class="io-seg">
                <button v-for="opt in ESTADOS_CHECK" :key="opt.value"
                  :class="['io-seg-btn', ficha.checklist[item.key] === opt.value && `io-seg-btn--${opt.value}`]"
                  @click="setCheck(item.key, opt.value)">{{ opt.label }}</button>
              </div>
            </div>
          </div>
        </section>

        <!-- ─ Sección 2: Fechas ─ -->
        <section class="io-acc">
          <button class="io-acc-head" @click="toggle('fechas')">
            <i :class="['pi', abierto.fechas ? 'pi-chevron-down' : 'pi-chevron-right']" />
            <i class="pi pi-calendar io-acc-ico" />
            <span>Fechas</span>
          </button>
          <div v-show="abierto.fechas" class="io-acc-body">
            <div class="io-dates">
              <label class="io-date">
                <span>Fecha de energización</span>
                <input type="date" v-model="ficha.fecha_energizacion" @change="marcar" />
              </label>
              <label class="io-date">
                <span>Fecha de inicio de operación</span>
                <input type="date" v-model="ficha.fecha_inicio_operacion" @change="marcar" />
              </label>
            </div>
            <div v-if="diasDesdeEnergizacion != null" class="io-dias">
              <i class="pi pi-clock" /> Han pasado <b>{{ diasDesdeEnergizacion }}</b> días desde la energización
            </div>
          </div>
        </section>

        <!-- ─ Sección 3: Pruebas de desempeño ─ -->
        <section class="io-acc">
          <button class="io-acc-head" @click="toggle('pruebas')">
            <i :class="['pi', abierto.pruebas ? 'pi-chevron-down' : 'pi-chevron-right']" />
            <i class="pi pi-bolt io-acc-ico" />
            <span>Pruebas de desempeño</span>
          </button>
          <div v-show="abierto.pruebas" class="io-acc-body">
            <div v-for="prueba in PRUEBAS" :key="prueba.key" class="io-prueba">
              <div class="io-prueba-top">
                <span class="io-prueba-label">{{ prueba.label }}</span>
                <div class="io-seg">
                  <button v-for="opt in ESTADOS_PRUEBA" :key="opt.value"
                    :class="['io-seg-btn', pruebaEstado(prueba.key) === opt.value && `io-seg-btn--${opt.color}`]"
                    @click="setPrueba(prueba.key, opt.value)">{{ opt.label }}</button>
                </div>
              </div>
              <input class="io-obs" :value="pruebaObs(prueba.key)" placeholder="Observación…"
                @input="setPruebaObs(prueba.key, $event.target.value)" />
            </div>
          </div>
        </section>

        <!-- ─ Sección 4: Documentación ─ -->
        <section class="io-acc">
          <button class="io-acc-head" @click="toggle('documentos')">
            <i :class="['pi', abierto.documentos ? 'pi-chevron-down' : 'pi-chevron-right']" />
            <i class="pi pi-folder-open io-acc-ico" />
            <span>Documentación</span>
            <span class="io-acc-count">{{ docsEntregados }}/{{ DOCUMENTOS.length }}</span>
          </button>
          <div v-show="abierto.documentos" class="io-acc-body">
            <div v-for="doc in DOCUMENTOS" :key="doc.key" class="io-doc">
              <div class="io-doc-top">
                <span class="io-doc-label">{{ doc.label }}</span>
                <div class="io-seg">
                  <button v-for="opt in ESTADOS_DOC" :key="opt.value"
                    :class="['io-seg-btn', docEstado(doc.key) === opt.value && `io-seg-btn--${opt.color}`]"
                    @click="setDoc(doc.key, opt.value)">{{ opt.label }}</button>
                </div>
              </div>
              <div class="io-doc-link">
                <i class="pi pi-link" />
                <input :value="docLink(doc.key)" placeholder="Pegar link del documento…"
                  @input="setDocLink(doc.key, $event.target.value)" />
                <a v-if="docLink(doc.key)" :href="docLink(doc.key)" target="_blank" rel="noopener" class="io-doc-open" title="Abrir">
                  <i class="pi pi-external-link" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- ─ Sección 5: Pendientes ─ -->
        <section class="io-acc">
          <button class="io-acc-head" @click="toggle('pendientes')">
            <i :class="['pi', abierto.pendientes ? 'pi-chevron-down' : 'pi-chevron-right']" />
            <i class="pi pi-exclamation-circle io-acc-ico" />
            <span>Pendientes</span>
            <span class="io-acc-count">{{ ficha.pendientes.length }}</span>
          </button>
          <div v-show="abierto.pendientes" class="io-acc-body">
            <div class="io-table-wrap">
              <table class="io-table">
                <thead>
                  <tr>
                    <th style="min-width:180px">Descripción</th>
                    <th style="min-width:130px">Responsable</th>
                    <th style="min-width:140px">Fecha compromiso</th>
                    <th style="min-width:70px">Clas.</th>
                    <th style="min-width:120px">Estado</th>
                    <th style="min-width:160px">Observaciones</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in ficha.pendientes" :key="i">
                    <td><input v-model="p.descripcion" @input="marcar" placeholder="Descripción" /></td>
                    <td><input v-model="p.responsable" @input="marcar" placeholder="Responsable" /></td>
                    <td><input type="date" v-model="p.fecha_compromiso" @change="marcar" /></td>
                    <td>
                      <select v-model="p.clasificacion" @change="marcar">
                        <option value="">—</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </td>
                    <td>
                      <select v-model="p.estado" @change="marcar">
                        <option value="abierto">Abierto</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </td>
                    <td><input v-model="p.observaciones" @input="marcar" placeholder="Observaciones" /></td>
                    <td><button class="io-del" @click="eliminarPendiente(i)" title="Eliminar"><i class="pi pi-trash" /></button></td>
                  </tr>
                  <tr v-if="!ficha.pendientes.length">
                    <td colspan="7" class="io-table-empty">Sin pendientes. Agrega una fila.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button class="io-add-row" @click="agregarPendiente"><i class="pi pi-plus" /> Agregar pendiente</button>
          </div>
        </section>

        <div style="height:14px" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/client'

// ── Catálogos fijos (deben coincidir con _CHECKLIST_KEYS del backend) ─────────
const CHECKLIST = [
  { key: 'paneles', label: 'Paneles solares', ref: 'QA-FT-16' },
  { key: 'inversores', label: 'Inversores', ref: 'QA-FT-17' },
  { key: 'estacion_meteo', label: 'Estación meteorológica' },
  { key: 'cctv', label: 'CCTV', ref: 'QA-FT-22' },
  { key: 'cable_solar', label: 'Cable solar' },
  { key: 'cableado_mt_bt', label: 'Cableado MT y BT' },
  { key: 'transformadores', label: 'Transformadores' },
  { key: 'rele_reconectador', label: 'Relé / Reconectador' },
  { key: 'tableros', label: 'Tableros eléctricos' },
  { key: 'shelter_skid', label: 'Shelter o Skid' },
  { key: 'tracker', label: 'Tracker' },
  { key: 'obras_civiles', label: 'Obras civiles' },
  { key: 'doc_om', label: 'Documentación O&M', ref: 'QA-FT-27' },
]
const ESTADOS_CHECK = [
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'na', label: 'N/A' },
]
const PRUEBAS = [
  { key: 'pr', label: 'Rendimiento (PR)' },
  { key: 'inyeccion', label: 'Inyección a red' },
  { key: 'protecciones', label: 'Protecciones' },
  { key: 'medidor', label: 'Verificación de medidor de energía' },
  { key: 'scada', label: 'SCADA / monitoreo' },
]
const ESTADOS_PRUEBA = [
  { value: 'pendiente', label: 'Pendiente', color: 'pend' },
  { value: 'ejecutada', label: 'Ejecutada', color: 'aprobado' },
  { value: 'no_aplica', label: 'No aplica', color: 'na' },
]
const DOCUMENTOS = [
  { key: 'permiso_conexion', label: 'Permiso de conexión a red' },
  { key: 'acta_energizacion', label: 'Acta de energización firmada' },
  { key: 'acta_inicio', label: 'Acta de inicio de operación' },
  { key: 'protocolos_electricas', label: 'Protocolos de pruebas eléctricas' },
  { key: 'termografia', label: 'Informe de termografía' },
  { key: 'curva_iv', label: 'Informe de curva IV' },
  { key: 'datalogger', label: 'Datalogger / SCADA activo' },
  { key: 'polizas', label: 'Pólizas de seguro activas' },
  { key: 'garantias', label: 'Garantías de equipos registradas' },
]
const ESTADOS_DOC = [
  { value: 'entregado', label: 'Entregado', color: 'aprobado' },
  { value: 'pendiente', label: 'Pendiente', color: 'pend' },
  { value: 'no_aplica', label: 'No aplica', color: 'na' },
]

// ── Estado ────────────────────────────────────────────────────────────────
const proyectos = ref([])
const loadingLista = ref(false)
const busqueda = ref('')

const seleccion = ref(null)        // proyecto_id seleccionado
const proyecto = reactive({})      // datos del encabezado
const ficha = reactive({
  empresa_contratista: '',
  fecha_energizacion: null,
  fecha_inicio_operacion: null,
  checklist: {},
  pruebas: {},
  documentos: {},
  pendientes: [],
})
const loadingFicha = ref(false)
const guardando = ref(false)
const dirty = ref(false)
const abierto = reactive({ checklist: true, fechas: true, pruebas: false, documentos: false, pendientes: false })

// ── Lista ───────────────────────────────────────────────────────────────────
const proyectosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return proyectos.value
  return proyectos.value.filter((p) => (p.nombre_comercial || '').toLowerCase().includes(q))
})

async function cargarLista() {
  loadingLista.value = true
  try {
    const { data } = await api.get('/inicio-operacion/proyectos')
    proyectos.value = data
  } catch {
    proyectos.value = []
  } finally {
    loadingLista.value = false
  }
}

// ── Detalle ───────────────────────────────────────────────────────────────
async function abrir(id) {
  seleccion.value = id
  loadingFicha.value = true
  dirty.value = false
  try {
    const { data } = await api.get(`/inicio-operacion/${id}`)
    Object.assign(proyecto, data.proyecto)
    Object.assign(ficha, {
      empresa_contratista: data.ficha.empresa_contratista || '',
      fecha_energizacion: data.ficha.fecha_energizacion || null,
      fecha_inicio_operacion: data.ficha.fecha_inicio_operacion || null,
      checklist: data.ficha.checklist || {},
      pruebas: data.ficha.pruebas || {},
      documentos: data.ficha.documentos || {},
      pendientes: Array.isArray(data.ficha.pendientes) ? data.ficha.pendientes : [],
    })
  } catch {
    window.__primeToast?.({ severity: 'error', summary: 'No se pudo cargar la ficha', life: 3000 })
    seleccion.value = null
  } finally {
    loadingFicha.value = false
  }
}

function cerrar() {
  if (dirty.value && !confirm('Tienes cambios sin guardar. ¿Salir de todos modos?')) return
  seleccion.value = null
}

async function guardar() {
  guardando.value = true
  try {
    const payload = {
      empresa_contratista: ficha.empresa_contratista || null,
      fecha_energizacion: ficha.fecha_energizacion || null,
      fecha_inicio_operacion: ficha.fecha_inicio_operacion || null,
      checklist: ficha.checklist,
      pruebas: ficha.pruebas,
      documentos: ficha.documentos,
      pendientes: ficha.pendientes,
    }
    await api.put(`/inicio-operacion/${seleccion.value}`, payload)
    dirty.value = false
    window.__primeToast?.({ severity: 'success', summary: 'Ficha guardada', life: 2000 })
    cargarLista()
  } catch (e) {
    window.__primeToast?.({ severity: 'error', summary: 'No se pudo guardar', detail: e.response?.data?.detail, life: 3500 })
  } finally {
    guardando.value = false
  }
}

function marcar() { dirty.value = true }
function toggle(k) { abierto[k] = !abierto[k] }

// ── Checklist ───────────────────────────────────────────────────────────────
function setCheck(key, value) {
  ficha.checklist[key] = ficha.checklist[key] === value ? null : value
  marcar()
}
const aprobadosCount = computed(() => CHECKLIST.filter((i) => ficha.checklist[i.key] === 'aprobado').length)
const progreso = computed(() => CHECKLIST.length ? Math.round(aprobadosCount.value / CHECKLIST.length * 100) : 0)

// ── Pruebas ───────────────────────────────────────────────────────────────
function pruebaEstado(key) { return ficha.pruebas[key]?.estado || null }
function pruebaObs(key) { return ficha.pruebas[key]?.observacion || '' }
function setPrueba(key, value) {
  const cur = ficha.pruebas[key] || {}
  ficha.pruebas[key] = { ...cur, estado: cur.estado === value ? null : value }
  marcar()
}
function setPruebaObs(key, val) {
  ficha.pruebas[key] = { ...(ficha.pruebas[key] || {}), observacion: val }
  marcar()
}

// ── Documentos ──────────────────────────────────────────────────────────────
function docEstado(key) { return ficha.documentos[key]?.estado || null }
function docLink(key) { return ficha.documentos[key]?.link || '' }
function setDoc(key, value) {
  const cur = ficha.documentos[key] || {}
  ficha.documentos[key] = { ...cur, estado: cur.estado === value ? null : value }
  marcar()
}
function setDocLink(key, val) {
  ficha.documentos[key] = { ...(ficha.documentos[key] || {}), link: val }
  marcar()
}
const docsEntregados = computed(() => DOCUMENTOS.filter((d) => ficha.documentos[d.key]?.estado === 'entregado').length)

// ── Pendientes ──────────────────────────────────────────────────────────────
function agregarPendiente() {
  ficha.pendientes.push({ descripcion: '', responsable: '', fecha_compromiso: null, clasificacion: '', estado: 'abierto', observaciones: '' })
  marcar()
}
function eliminarPendiente(i) { ficha.pendientes.splice(i, 1); marcar() }

// ── Derivados encabezado ──────────────────────────────────────────────────
const ubicacion = computed(() =>
  [proyecto.municipio, proyecto.departamento, proyecto.direccion_vereda].filter(Boolean).join(', '))

const diasDesdeEnergizacion = computed(() => {
  if (!ficha.fecha_energizacion) return null
  const d = new Date(ficha.fecha_energizacion + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
})

// ── Helpers de formato ──────────────────────────────────────────────────────
function fmtCapacidad(kwp) {
  const n = Number(kwp)
  if (!n) return '—'
  return n >= 1000 ? (n / 1000).toFixed(2) + ' MWp' : n.toLocaleString('es-CO') + ' kWp'
}
function progresoStyle(pct) {
  const c = pct >= 100 ? '#16a34a' : pct >= 50 ? '#915BD8' : '#d97706'
  return { background: c + '1a', color: c }
}

onMounted(cargarLista)
</script>

<style scoped>
.io-page { height: 100%; display: flex; flex-direction: column; font-family: system-ui, -apple-system, sans-serif; color: #2C2039; }

/* ── Lista ── */
.io-list-wrap { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.io-list-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 2px 14px; }
.io-title { font-size: 17px; font-weight: 800; margin: 0; }
.io-badge { background: #f3edfb; color: #6E3FB8; font-size: 12px; font-weight: 800; padding: 1px 9px; border-radius: 9px; }
.io-icon-btn { width: 34px; height: 34px; border: 1px solid #e5e7eb; border-radius: 9px; background: #fff; color: #6b5a8a; }
.io-icon-btn:disabled { opacity: .5; }

.io-search { display: flex; align-items: center; gap: 9px; background: #f5f3fa; border: 1px solid #eceaf2; border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; }
.io-search .pi { color: #9ca3af; }
.io-search input { flex: 1; border: none; background: none; outline: none; font-size: 15px; color: #2C2039; }

.io-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 50px 20px; color: #6b5a8a; font-size: 15px; }
.io-state .pi-spinner { font-size: 24px; color: #915BD8; }

.io-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; overflow-y: auto; padding-bottom: 8px; }
.io-card { text-align: left; background: #fff; border: 1px solid #eceaf2; border-radius: 14px; padding: 14px; cursor: pointer; transition: box-shadow .15s, transform .1s; }
.io-card:hover { box-shadow: 0 6px 18px rgba(145,91,216,0.15); transform: translateY(-1px); }
.io-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.io-card-name { flex: 1; font-size: 14.5px; font-weight: 700; color: #2C2039; line-height: 1.25; }
.io-card-tag { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 7px; flex-shrink: 0; }
.io-card-tag--new { background: #fef3c7; color: #92400e; }
.io-card-meta { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: #6b5a8a; margin-bottom: 10px; }
.io-card-meta .pi { font-size: 11px; color: #915BD8; margin-right: 4px; }
.io-card-bar { height: 5px; background: #f0eef5; border-radius: 3px; overflow: hidden; }
.io-card-bar-fill { height: 100%; background: #915BD8; border-radius: 3px; transition: width .3s; }

/* ── Detalle ── */
.io-detail { flex: 1; overflow-y: auto; min-height: 0; }
.io-detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; position: sticky; top: 0; background: #f8f7fb; padding: 4px 0 10px; z-index: 5; }
.io-back { display: flex; align-items: center; gap: 7px; border: none; background: none; color: #6E3FB8; font-size: 14px; font-weight: 700; cursor: pointer; }
.io-detail-actions { display: flex; align-items: center; gap: 12px; }
.io-dirty { font-size: 12px; color: #d97706; font-weight: 600; }
.io-save { display: flex; align-items: center; gap: 8px; border: none; background: #915BD8; color: #fff; font-size: 14px; font-weight: 700; padding: 9px 18px; border-radius: 10px; cursor: pointer; }
.io-save:disabled { opacity: .45; cursor: default; }

.io-hero { background: #2C2039; color: #fff; border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; }
.io-hero-name { font-size: 20px; font-weight: 800; margin: 0 0 14px; }
.io-hero-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.io-fact { display: flex; flex-direction: column; gap: 4px; }
.io-fact-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #b9a8d8; }
.io-fact-val { font-size: 14.5px; font-weight: 600; }
.io-fact-input { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); border-radius: 8px; padding: 7px 10px; color: #fff; font-size: 14px; outline: none; }
.io-fact-input::placeholder { color: rgba(255,255,255,0.4); }
.io-fact-input:focus { border-color: #F6FF72; }

.io-progress-card { background: #fff; border: 1px solid #eceaf2; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
.io-progress-top { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #2C2039; margin-bottom: 8px; }
.io-progress-top b { color: #915BD8; font-size: 16px; }
.io-progress-bar { height: 8px; background: #f0eef5; border-radius: 5px; overflow: hidden; }
.io-progress-fill { height: 100%; background: linear-gradient(90deg, #915BD8, #6E3FB8); border-radius: 5px; transition: width .35s; }
.io-progress-sub { display: block; margin-top: 7px; font-size: 12px; color: #9b8db5; }

/* ── Acordeón ── */
.io-acc { background: #fff; border: 1px solid #eceaf2; border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
.io-acc-head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 14px 16px; border: none; background: #fff; font-size: 15px; font-weight: 700; color: #2C2039; cursor: pointer; text-align: left; }
.io-acc-head > .pi:first-child { color: #9ca3af; font-size: 13px; }
.io-acc-ico { color: #915BD8; font-size: 15px; }
.io-acc-head span:first-of-type { flex: 1; }
.io-acc-count { background: #f3edfb; color: #6E3FB8; font-size: 12px; font-weight: 800; padding: 1px 9px; border-radius: 8px; }
.io-acc-body { padding: 4px 16px 16px; border-top: 1px solid #f3f0f7; }

/* ── Filas checklist ── */
.io-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f5f3f9; flex-wrap: wrap; }
.io-row:last-child { border-bottom: none; }
.io-row-label { font-size: 14px; color: #2C2039; font-weight: 500; }
.io-ref { font-size: 10.5px; font-weight: 700; color: #6E3FB8; background: #f3edfb; padding: 1px 6px; border-radius: 5px; margin-left: 4px; }

.io-seg { display: inline-flex; background: #f5f3fa; border-radius: 9px; padding: 3px; gap: 2px; flex-shrink: 0; }
.io-seg-btn { border: none; background: none; font-size: 12.5px; font-weight: 700; color: #6b5a8a; padding: 6px 12px; border-radius: 7px; cursor: pointer; white-space: nowrap; }
.io-seg-btn--aprobado, .io-seg-btn--entregado { background: #dcfce7; color: #15803d; }
.io-seg-btn--rechazado { background: #fee2e2; color: #b91c1c; }
.io-seg-btn--na, .io-seg-btn--no_aplica { background: #e5e7eb; color: #4b5563; }
.io-seg-btn--ejecutada { background: #dcfce7; color: #15803d; }
.io-seg-btn--pend, .io-seg-btn--pendiente { background: #fef3c7; color: #92400e; }

/* ── Fechas ── */
.io-dates { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; padding-top: 10px; }
.io-date { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: #6b5a8a; }
.io-date input { padding: 11px 13px; border: 1.5px solid #e8e0f0; border-radius: 10px; font-size: 15px; color: #2C2039; outline: none; }
.io-date input:focus { border-color: #915BD8; }
.io-dias { margin-top: 14px; background: #f3edfb; color: #6E3FB8; font-size: 13.5px; padding: 10px 14px; border-radius: 10px; }
.io-dias b { font-size: 15px; }

/* ── Pruebas ── */
.io-prueba { padding: 12px 0; border-bottom: 1px solid #f5f3f9; }
.io-prueba:last-child { border-bottom: none; }
.io-prueba-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.io-prueba-label { font-size: 14px; font-weight: 500; }
.io-obs { width: 100%; padding: 9px 12px; border: 1.5px solid #e8e0f0; border-radius: 9px; font-size: 13.5px; color: #2C2039; outline: none; }
.io-obs:focus { border-color: #915BD8; }

/* ── Documentos ── */
.io-doc { padding: 12px 0; border-bottom: 1px solid #f5f3f9; }
.io-doc:last-child { border-bottom: none; }
.io-doc-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.io-doc-label { font-size: 14px; font-weight: 500; }
.io-doc-link { display: flex; align-items: center; gap: 8px; background: #f8f7fb; border: 1.5px solid #e8e0f0; border-radius: 9px; padding: 4px 10px; }
.io-doc-link .pi-link { color: #9ca3af; font-size: 13px; }
.io-doc-link input { flex: 1; border: none; background: none; outline: none; font-size: 13.5px; color: #2C2039; padding: 6px 0; }
.io-doc-open { color: #915BD8; padding: 4px; }

/* ── Tabla pendientes ── */
.io-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-top: 8px; }
.io-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.io-table th { text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; color: #9b8db5; padding: 6px 6px; border-bottom: 1.5px solid #eceaf2; }
.io-table td { padding: 5px 6px; border-bottom: 1px solid #f5f3f9; vertical-align: middle; }
.io-table input, .io-table select { width: 100%; border: 1px solid #e8e0f0; border-radius: 7px; padding: 7px 9px; font-size: 13px; color: #2C2039; outline: none; background: #fff; }
.io-table input:focus, .io-table select:focus { border-color: #915BD8; }
.io-table-empty { text-align: center; color: #9ca3af; padding: 18px 0; font-size: 13px; }
.io-del { border: none; background: #fef2f2; color: #b91c1c; border-radius: 7px; width: 30px; height: 30px; cursor: pointer; }
.io-add-row { margin-top: 12px; display: flex; align-items: center; gap: 7px; border: 1.5px dashed #cbb8e8; background: #faf8fd; color: #6E3FB8; font-size: 13.5px; font-weight: 700; padding: 9px 16px; border-radius: 10px; cursor: pointer; }
</style>
