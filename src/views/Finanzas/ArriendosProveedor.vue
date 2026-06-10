<template>
  <div class="space-y-4 pt-3">

    <div class="flex items-center gap-3">
      <button type="button" @click="cambiarMes(-1)"
        class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
        <i class="pi pi-chevron-left text-xs text-gray-500" />
      </button>
      <span class="text-sm font-semibold" style="color:#2C2039; min-width:100px; text-align:center">
        {{ periodoLabel }}
      </span>
      <button type="button" @click="cambiarMes(1)"
        class="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50">
        <i class="pi pi-chevron-right text-xs text-gray-500" />
      </button>
      <Tag :value="periodoActual" severity="secondary" class="text-xs font-mono" />
    </div>

    <div v-if="!filas.length"
      class="rounded-xl border border-dashed p-8 text-center" style="border-color:#915BD840">
      <i class="pi pi-inbox text-2xl mb-2 block" style="color:#c4b5fd"/>
      <p class="text-sm text-gray-500">No hay proyectos guardados para este período.</p>
      <p class="text-xs text-gray-400 mt-1">Operaciones aún no guardó la selección del mes.</p>
    </div>
    <div v-else class="rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse" style="min-width:680px">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Proyecto</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Mes / Año</th>
              <th class="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Canon a Facturar</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Indexación aplicada</th>
              <th class="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in filas" :key="fila.id"
              class="border-b border-gray-50 hover:bg-gray-50/50">
              <td class="px-4 py-2.5 font-medium" style="color:#2C2039">{{ fila.proyecto }}</td>
              <td class="px-4 py-2.5 text-xs text-gray-500">{{ periodoLabel }}</td>
              <td class="px-4 py-2.5 text-right font-semibold tabular-nums" style="color:#7c3aed">
                {{ formatCOP(fila.canon_calculado) }}
              </td>
              <td class="px-4 py-2.5 text-xs text-gray-400"
                style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                :title="fila.historial_texto">
                {{ fila.historial_texto }}
              </td>
              <td class="px-4 py-2.5 text-center">
                <button v-if="!facturadoActual[fila.id]" type="button"
                  class="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors hover:bg-green-50"
                  style="border-color:#15803d;color:#15803d"
                  @click="toggleFacturado(fila.id)">
                  Marcar facturado
                </button>
                <span v-else
                  class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80"
                  style="background:#dcfce7;color:#166534"
                  @click="toggleFacturado(fila.id)">
                  <i class="pi pi-check text-[10px]"/>FACTURADO
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Soporte del período ─────────────────────────────────────────────── -->
    <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#E5E2EC">
      <div class="flex items-center justify-between px-4 py-2.5 border-b"
        style="border-color:#F3F0FA;background:#FDFCFF">
        <div class="flex items-center gap-2">
          <i class="pi pi-file-pdf text-xs" style="color:#915BD8" />
          <span class="text-sm font-semibold" style="color:#2C2039">Soporte del período</span>
          <Tag :value="periodoLabel" severity="secondary" class="text-xs font-mono" />
        </div>
        <span v-if="soporte.enlace"
          class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style="background:#dcfce7;color:#166534">
          <i class="pi pi-check text-[10px]"/>Registrado
        </span>
        <span v-else class="text-xs text-gray-400">Pendiente</span>
      </div>
      <div class="px-4 py-3 space-y-2">
        <div v-if="soporte.enlace"
          class="flex items-center gap-3 p-2.5 rounded-lg" style="background:#f0fdf4;border:1px solid #bbf7d0">
          <i class="pi pi-external-link text-sm flex-shrink-0" style="color:#16a34a"/>
          <a :href="soporte.enlace" target="_blank" rel="noopener"
            class="flex-1 text-xs font-medium truncate hover:underline" style="color:#15803d">
            {{ soporte.enlace }}
          </a>
          <button type="button" @click="soporte.enlace = ''; persistSoporte()"
            class="text-gray-400 hover:text-red-500 text-xs">
            <i class="pi pi-times"/>
          </button>
        </div>
        <p class="text-xs text-gray-500">{{ soporte.enlace ? 'Reemplazar enlace:' : 'Enlace al soporte (Drive, etc.):' }}</p>
        <div class="flex gap-2">
          <input type="url" v-model="nuevoEnlace"
            placeholder="https://drive.google.com/…"
            class="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-200" />
          <button type="button"
            :disabled="!nuevoEnlace.startsWith('http')"
            class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style="background:#915BD8;color:#fff;border:none"
            :style="!nuevoEnlace.startsWith('http') ? 'opacity:0.4;cursor:not-allowed' : 'cursor:pointer'"
            @click="guardarSoporte">
            <i class="pi pi-save text-xs"/>Guardar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import Tag from 'primevue/tag'
import arriendosRaw from '@/data/pagoarriendos.json'

const hoy           = new Date()
const periodoOffset = ref(0)

const periodoActual = computed(() => {
  const d    = new Date(hoy.getFullYear(), hoy.getMonth() + periodoOffset.value, 1)
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
})

const periodoLabel = computed(() => {
  const [yyyy, mm] = periodoActual.value.split('-')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${MESES[parseInt(mm) - 1]} ${yyyy}`
})

function cambiarMes(delta) { periodoOffset.value += delta }

function formatCOP(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)
}

// ── Leer selección y valores calculados desde localStorage ────────────────────
const SEL_STORAGE_KEY  = 'arriendos_seleccion'
const FACT_STORAGE_KEY = 'arriendos_facturado'
const IPC_STORAGE_KEY  = 'arriendos_ipc_tasas'
const SOPO_STORAGE_KEY = 'arriendos_soportes'

const ipcTasas = ref([
  { año: 2023, tasa: 0.0928 },
  { año: 2024, tasa: 0.0520 },
  { año: 2025, tasa: 0.0510 },
])

function cargarIPCStorage() {
  try {
    const raw = localStorage.getItem(IPC_STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      stored.forEach(s => {
        const idx = ipcTasas.value.findIndex(t => t.año === s.año)
        if (idx >= 0) ipcTasas.value[idx] = s
        else ipcTasas.value.push(s)
      })
    }
  } catch {}
}

function getIPC(año) {
  return ipcTasas.value.find(t => t.año === año)?.tasa
}

function calcularCanon(proyecto) {
  const valorBase = proyecto['Valor base']
  if (!proyecto['Fecha firma contrato'] || valorBase == null) return { canon: null, historial: '—' }

  const [yyyy]     = periodoActual.value.split('-').map(Number)
  const añoPeriodo = yyyy
  const añoFirma   = new Date(proyecto['Fecha firma contrato']).getFullYear()
  let valor        = valorBase
  const histItems  = []

  // Indexación por año calendario: 1 ene de cada año desde año_firma+1 hasta año_periodo
  for (let añoCorriente = añoFirma + 1; añoCorriente <= añoPeriodo; añoCorriente++) {
    const ipc = getIPC(añoCorriente - 1)  // IPC dic del año anterior
    if (ipc === undefined) break
    valor *= (1 + ipc)
    histItems.push(`IPC dic ${añoCorriente - 1}: ${(ipc * 100).toFixed(2)}%`)
  }

  return {
    canon:    valor,
    historial: histItems.length ? histItems.join(' → ') : `Sin indexaciones`,
  }
}

const facturadoStore = reactive({})
const facturadoActual = computed(() => facturadoStore[periodoActual.value] || {})

function toggleFacturado(id) {
  if (!facturadoStore[periodoActual.value]) facturadoStore[periodoActual.value] = {}
  facturadoStore[periodoActual.value][id] = !facturadoStore[periodoActual.value][id]
  try { localStorage.setItem(FACT_STORAGE_KEY, JSON.stringify(facturadoStore)) } catch {}
}

const filas = computed(() => {
  try {
    const raw    = localStorage.getItem(SEL_STORAGE_KEY)
    const data   = raw ? JSON.parse(raw) : {}
    const saved  = data[periodoActual.value] || {}
    const result = []
    arriendosRaw.forEach(p => {
      const id = p.Codigo || p.Proyecto
      if (!saved[id]) return
      const { canon, historial } = calcularCanon(p)
      if (canon == null) return
      result.push({ id, proyecto: p.Proyecto, canon_calculado: canon, historial_texto: historial })
    })
    return result
  } catch { return [] }
})

// ── Soporte del período ────────────────────────────────────────────────────────
const soporteStore = reactive({})
const soporte      = computed(() => soporteStore[periodoActual.value] || { enlace: '' })
const nuevoEnlace  = ref('')

function cargarSoporte() {
  try {
    const raw = localStorage.getItem(SOPO_STORAGE_KEY)
    if (raw) Object.assign(soporteStore, JSON.parse(raw))
  } catch {}
}

function guardarSoporte() {
  if (!nuevoEnlace.value.startsWith('http')) return
  if (!soporteStore[periodoActual.value]) soporteStore[periodoActual.value] = {}
  soporteStore[periodoActual.value].enlace = nuevoEnlace.value
  nuevoEnlace.value = ''
  persistSoporte()
}

function persistSoporte() {
  try { localStorage.setItem(SOPO_STORAGE_KEY, JSON.stringify(soporteStore)) } catch {}
}

function cargarTodo() {
  cargarIPCStorage()
  try {
    const raw = localStorage.getItem(FACT_STORAGE_KEY)
    if (raw) Object.assign(facturadoStore, JSON.parse(raw))
  } catch {}
  cargarSoporte()
}

// Escuchar cuando Operaciones guarda selección
function onSeleccionGuardada(e) {
  if (e.detail?.periodo === periodoActual.value) { /* computed ya reacciona */ }
}

watch(periodoActual, () => { nuevoEnlace.value = '' })
onMounted(() => {
  cargarTodo()
  window.addEventListener('arriendos-seleccion-guardada', onSeleccionGuardada)
})
</script>
