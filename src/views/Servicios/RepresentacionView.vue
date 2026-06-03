<template>
  <div class="space-y-5">

    <!-- ── Header ────────────────────────────────────────────────────────────── -->
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
        <p class="text-xs text-gray-400">No se encontraron contratos CGM/Representación para este proyecto.</p>
      </div>
    </template>

    <!-- ── Tarjetas por inversionista ─────────────────────────────────────────── -->
    <template v-else>
      <div v-for="contrato in contratos" :key="contrato.inversionista" class="space-y-0">

        <!-- Separador con nombre del inversionista -->
        <div class="flex items-center gap-3 py-2">
          <div class="h-px flex-1" style="background:#dbeafe" />
          <span class="text-xs font-semibold px-2 py-1 rounded-full"
            style="background:#eff6ff; color:#1d4ed8">
            {{ contrato.inversionista }}
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
            <Tag v-if="contrato.estado"
              :value="contrato.estado.trim()"
              :severity="estadoSeverity(contrato.estado)" class="text-xs" />
          </div>

          <!-- Mini-cards de encabezado -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <!-- Contratante -->
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-user text-xs" style="color:#3b82f6" />Contratante
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">Unergy Energía Digital S.A.S. E.S.P.</p>
            </div>
            <!-- Inversionista -->
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-briefcase text-xs" style="color:#3b82f6" />Inversionista
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">{{ contrato.inversionista }}</p>
            </div>
            <!-- Prestador -->
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-building text-xs" style="color:#3b82f6" />Prestador
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">Unergy Energía Digital S.A.S. E.S.P.</p>
            </div>
            <!-- Fecha firma -->
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-calendar text-xs" style="color:#3b82f6" />Fecha firma
              </p>
              <p class="text-sm font-semibold" style="color:#1c1917">
                {{ contrato.fechaFirma || '—' }}
              </p>
            </div>
            <!-- Portafolio -->
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-folder text-xs" style="color:#3b82f6" />Portafolio
              </p>
              <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                {{ contrato.portafolio || '—' }}
              </p>
            </div>
            <!-- Contrato en Drive -->
            <div class="rounded-lg p-3.5" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-file-pdf text-xs" style="color:#3b82f6" />Contrato en Drive
              </p>
              <a v-if="contrato.soporte && contrato.soporte.startsWith('http')"
                 :href="contrato.soporte" target="_blank" rel="noopener"
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
                {{ contrato.tarifaAdmin != null ? (contrato.tarifaAdmin * 100).toFixed(1) + '%' : '—' }}
              </p>
              <p class="text-xs mt-1" style="color:#7dd3fc">Porcentaje fijo sobre liquidación</p>
            </div>

            <!-- Tarifa CGM -->
            <div class="rounded-xl p-4" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-chart-bar text-xs" style="color:#3b82f6" />Tarifa CGM
              </p>
              <template v-if="contrato.cgm.tarifaBase != null">
                <p class="text-2xl font-bold tabular-nums" style="color:#1d4ed8">
                  {{ getValorVigente(contrato.cgm.indexaciones)?.valor != null
                      ? getValorVigente(contrato.cgm.indexaciones).valor.toFixed(3) + ' $/kWh'
                      : contrato.cgm.tarifaBase + ' $/kWh' }}
                </p>
                <button v-if="contrato.cgm.indexaciones.length > 0"
                  type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggleIdx(contrato.inversionista, 'cgm')">
                  <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :style="isIdxOpen(contrato.inversionista,'cgm') ? 'transform:rotate(180deg)' : ''" />
                  {{ isIdxOpen(contrato.inversionista,'cgm') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </template>
              <p v-else class="text-sm text-gray-400">—</p>
            </div>

            <!-- Tarifa Representación -->
            <div class="rounded-xl p-4" style="background:#eff6ff;border:1px solid #bfdbfe">
              <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" style="color:#1e40af">
                <i class="pi pi-file-edit text-xs" style="color:#3b82f6" />Tarifa Representación
              </p>
              <template v-if="contrato.representacion.tarifaBase != null">
                <p class="text-2xl font-bold tabular-nums" style="color:#1d4ed8">
                  {{ getValorVigente(contrato.representacion.indexaciones)?.valor != null
                      ? getValorVigente(contrato.representacion.indexaciones).valor.toFixed(3) + ' $/kWh'
                      : contrato.representacion.tarifaBase + ' $/kWh' }}
                </p>
                <button v-if="contrato.representacion.indexaciones.length > 0"
                  type="button"
                  class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                  style="background:none;border:none;padding:0;cursor:pointer;color:#3b82f6"
                  @click="toggleIdx(contrato.inversionista, 'representacion')">
                  <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                    :style="isIdxOpen(contrato.inversionista,'representacion') ? 'transform:rotate(180deg)' : ''" />
                  {{ isIdxOpen(contrato.inversionista,'representacion') ? 'Ocultar' : 'Ver indexación' }}
                </button>
              </template>
              <p v-else class="text-sm text-gray-400">—</p>
            </div>
          </div>

          <!-- Tabla indexación CGM -->
          <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: isIdxOpen(contrato.inversionista,'cgm') ? '600px' : '0px' }">
            <div class="pt-4">
              <TablaIndexacion
                titulo="Indexación CGM"
                unidad="$/kWh"
                :filas="contrato.cgm.indexaciones"
                :anio-actual="ANIO_ACTUAL"
                color="#3b82f6"
                bg="#eff6ff"
                border="#bfdbfe"
              />
            </div>
          </div>

          <!-- Tabla indexación Representación -->
          <div :style="{ overflow:'hidden', transition:'max-height 0.35s ease',
            maxHeight: isIdxOpen(contrato.inversionista,'representacion') ? '600px' : '0px' }">
            <div class="pt-4">
              <TablaIndexacion
                titulo="Indexación Representación"
                unidad="$/kWh"
                :filas="contrato.representacion.indexaciones"
                :anio-actual="ANIO_ACTUAL"
                color="#3b82f6"
                bg="#eff6ff"
                border="#bfdbfe"
              />
            </div>
          </div>

        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import CONTRATOS_CGM from '@/assets/contratos_cgm_data.js'

const route = useRoute()
const router = useRouter()

const ANIO_ACTUAL = 2026

const proyectoNombre = ref('')
const codigoTSF = ref('')
const loading = ref(true)

// Estado de paneles expandidos: { `${inversionista}:${tipo}`: bool }
const idxOpen = ref({})

function idxKey(inv, tipo) { return `${inv}:${tipo}` }
function isIdxOpen(inv, tipo) { return !!idxOpen.value[idxKey(inv, tipo)] }
function toggleIdx(inv, tipo) {
  const k = idxKey(inv, tipo)
  idxOpen.value[k] = !idxOpen.value[k]
}

function normalizarNombre(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const contratos = computed(() => {
  const tsf = codigoTSF.value
  const nombre = proyectoNombre.value
  return CONTRATOS_CGM.filter(c => {
    if (tsf && c.codigoSunFactory) return c.codigoSunFactory === tsf
    const n1 = normalizarNombre(c.proyecto)
    const n2 = normalizarNombre(nombre)
    return n1 === n2 || n1.includes(n2) || n2.includes(n1)
  })
})

function getValorVigente(indexaciones) {
  if (!indexaciones?.length) return null
  const vigente = indexaciones.find(f => f.año === ANIO_ACTUAL)
  if (vigente) return vigente
  return indexaciones[indexaciones.length - 1] ?? null
}

function estadoSeverity(estado) {
  const e = (estado || '').trim().toLowerCase()
  if (e === 'operación' || e === 'operacion') return 'success'
  if (e === 'construcción' || e === 'construccion') return 'warn'
  return 'secondary'
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/proyectos/${route.params.id}`)
    proyectoNombre.value = data.nombre_comercial || ''
    codigoTSF.value = data.codigo_tsf || ''
  } catch {
    /* graceful degrade — matching por nombre vacío mostrará sin contratos */
  } finally {
    loading.value = false
  }
})
</script>

<!-- ── TablaIndexacion (componente local) ──────────────────────────────────── -->
<script>
const TablaIndexacion = {
  props: {
    titulo:     { type: String,  required: true },
    unidad:     { type: String,  default: '$/kWh' },
    filas:      { type: Array,   default: () => [] },
    anioActual: { type: Number,  required: true },
    color:      { type: String,  default: '#3b82f6' },
    bg:         { type: String,  default: '#eff6ff' },
    border:     { type: String,  default: '#bfdbfe' },
  },
  computed: {
    vigente() {
      if (!this.filas.length) return null
      const v = this.filas.find(f => f.año === this.anioActual)
      return v ?? this.filas[this.filas.length - 1]
    },
  },
  methods: {
    esVigente(fila) {
      return fila === this.vigente
    },
    estadoFila(fila) {
      if (fila.esBase || fila.año < this.anioActual) return 'pagado'
      if (this.esVigente(fila)) return 'vigente'
      return 'pendiente'
    },
  },
  template: `
    <div class="rounded-xl overflow-hidden" :style="'border:1px solid ' + border">
      <div class="flex items-center justify-between px-4 py-2.5" :style="'background:' + bg">
        <span class="text-xs font-semibold" :style="'color:#1e40af'">
          <i class="pi pi-chart-line text-xs mr-1.5" :style="'color:' + color" />{{ titulo }}
        </span>
        <span class="text-xs text-gray-400">Año vigente: {{ anioActual }}</span>
      </div>
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100">
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">Año</th>
            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">IPC aplicado</th>
            <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500">Valor ({{ unidad }})</th>
            <th class="px-4 py-2 text-center text-xs font-semibold text-gray-500">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filas.length">
            <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">Sin datos de indexación registrados.</td>
          </tr>
          <tr v-for="fila in filas" :key="fila.año"
            class="border-b border-gray-50 hover:bg-blue-50/20 transition-colors"
            :style="esVigente(fila) ? 'background:#eff6ff40' : ''">
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-semibold"
                  :style="esVigente(fila) ? 'color:#1d4ed8' : 'color:#2C2039'">
                  {{ fila.año }}
                </span>
                <span v-if="esVigente(fila)"
                  class="text-xs px-1.5 py-0.5 rounded font-bold leading-none"
                  style="background:#dbeafe;color:#1d4ed8">actual</span>
                <i v-if="esVigente(fila)" class="pi pi-arrow-left text-xs" style="color:#1d4ed8" />
              </div>
            </td>
            <td class="px-4 py-2.5">
              <span v-if="fila.ipc == null" class="text-gray-400 text-xs">— (base)</span>
              <span v-else class="font-mono tabular-nums" style="color:#374151">{{ fila.ipc }}%</span>
            </td>
            <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
              :style="esVigente(fila) ? 'color:#1d4ed8' : 'color:#2C2039'">
              {{ fila.valor != null ? fila.valor.toFixed(3) : '—' }}
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="estadoFila(fila) === 'pagado'"
                class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style="background:#dcfce7;color:#166534">
                <i class="pi pi-check text-xs" />Pagado
              </span>
              <span v-else-if="estadoFila(fila) === 'vigente'"
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
