<template>
  <div class="cgm-root">
    <header class="cgm-topbar">
      <span class="cgm-brand"><i class="pi pi-envelope" /> Reporte CGM</span>
      <button class="cgm-icon-btn" :disabled="loading" @click="loadData" title="Actualizar">
        <i :class="loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" />
      </button>
    </header>

    <main class="cgm-scroll">
      <div class="cgm-dates">
        <label class="cgm-date-field">
          <span>Desde</span>
          <input type="date" v-model="fechaDesdeStr" :max="fechaHastaStr || ayerStr" />
        </label>
        <label class="cgm-date-field">
          <span>Hasta</span>
          <input type="date" v-model="fechaHastaStr" :min="fechaDesdeStr" :max="ayerStr" />
        </label>
      </div>

      <div class="cgm-filters">
        <button v-for="opt in tipoOpciones" :key="opt.value" type="button"
          class="cgm-filter-pill" :class="{ 'cgm-filter-pill--on': filtroTipo === opt.value }"
          @click="filtroTipo = opt.value">
          {{ opt.label }}
        </button>
      </div>

      <input v-model="busqueda" type="text" placeholder="Buscar destinatario…" class="cgm-search" />

      <div v-if="loading" class="cgm-loading"><i class="pi pi-spin pi-spinner" /> Cargando…</div>

      <template v-else>
        <div v-if="!destinatariosFiltrados.length" class="cgm-empty">Ningún destinatario coincide con el filtro.</div>

        <div v-for="row in destinatariosFiltrados" :key="row.key" class="cgm-card">
          <label class="cgm-check" @click.stop>
            <input type="checkbox" :checked="seleccionados.has(row.key)" :disabled="!row.correos.length"
              @change="toggleSeleccion(row.key)" />
          </label>

          <div class="cgm-card-main" @click="toggle(row.key)">
            <div class="cgm-card-top">
              <span class="cgm-pill" :class="row.tipo === 'Operador de Red' ? 'cgm-pill--or' : 'cgm-pill--cliente'">
                {{ row.tipo }}
              </span>
              <span class="cgm-proj-count">
                <i class="pi pi-chevron-down cgm-chev" :class="{ 'cgm-chev--open': expanded.has(row.key) }" />
                {{ row.proyectos.length }} proy.
              </span>
            </div>
            <div class="cgm-nombre" :class="{ 'cgm-nombre--muted': !row.nombre }">{{ row.nombre || row.sinVinculo }}</div>

            <RouterLink v-if="row.linkCorregir && row.correos.length" :to="row.linkCorregir"
              class="cgm-correos" @click.stop>
              {{ row.correos.length }} correo{{ row.correos.length > 1 ? 's' : '' }}
            </RouterLink>
            <RouterLink v-else-if="row.linkCorregir" :to="row.linkCorregir" class="cgm-correos cgm-correos--bad" @click.stop>
              {{ row.textoCorregir }}
            </RouterLink>
            <span v-else class="cgm-correos cgm-correos--muted">—</span>

            <div v-if="expanded.has(row.key)" class="cgm-chips">
              <span v-for="p in row.proyectos" :key="p" class="cgm-chip">{{ p }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="cgm-bottom-space" />
    </main>

    <div class="cgm-send-bar">
      <button class="cgm-send-btn" :disabled="!totalSeleccionados || enviando" @click="enviarSeleccionados">
        <i :class="['pi', enviando ? 'pi-spin pi-spinner' : 'pi-send']" />
        {{ enviando ? 'Enviando…' : `Enviar a ${totalSeleccionados}` }}
      </button>
    </div>

    <MobileTabBar />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import MobileTabBar from '@/mobile/components/MobileTabBar.vue'

const toast = useToast()

function fechaStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const ayerStr = fechaStr(new Date(Date.now() - 86400000))

const fronteras = ref([])
const loading = ref(true)
const enviando = ref(false)
const expanded = ref(new Set())
const filtroTipo = ref('todos')
const busqueda = ref('')
const fechaDesdeStr = ref(ayerStr)
const fechaHastaStr = ref(ayerStr)

const tipoOpciones = [
  { value: 'todos', label: 'Todos' },
  { value: 'Operador de Red', label: 'Operador' },
  { value: 'Cliente', label: 'Cliente' },
]

function toggle(key) {
  const next = new Set(expanded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expanded.value = next
}

// Misma lógica de agrupación que la vista de escritorio (ReporteCGMView.vue):
// una fila por destinatario único, agrupando los proyectos que cubre.
const destinatarios = computed(() => {
  const proyectos = new Map()
  for (const f of fronteras.value) {
    const key = f.proyecto_nombre || `frontera-${f.id}`
    if (!proyectos.has(key)) proyectos.set(key, f)
  }

  const grupos = new Map()
  function addEntry(refTipo, refId, tipo, nombre, sinVinculo, correos, linkCorregir, textoCorregir, proyecto) {
    const key = `${tipo}-${refId ?? 'sin-vinculo'}`
    if (!grupos.has(key)) {
      grupos.set(key, { key, refTipo, refId, tipo, nombre, sinVinculo, correos, linkCorregir, textoCorregir, proyectos: [] })
    }
    grupos.get(key).proyectos.push(proyecto)
  }

  for (const [proyecto, f] of proyectos) {
    addEntry('operador', f.operador_red_id, 'Operador de Red', f.operador_comercial,
      'Sin operador vinculado', f.operador_correos,
      f.operador_red_id ? `/mem/operadores-red/${f.operador_red_id}` : null, 'Sin correos — corregir', proyecto)
    addEntry('cliente', f.cliente_id, 'Cliente', f.cliente_nombre,
      'Sin cliente vinculado', f.cliente_correos_cgm,
      f.cliente_id ? `/clientes/${f.cliente_id}?tab=contactos` : null, 'Sin correos CGM — corregir', proyecto)
  }

  return [...grupos.values()].sort((a, b) => (a.nombre || 'zzz').localeCompare(b.nombre || 'zzz'))
})

const destinatariosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  return destinatarios.value.filter(row => {
    if (filtroTipo.value !== 'todos' && row.tipo !== filtroTipo.value) return false
    if (texto && !(row.nombre || '').toLowerCase().includes(texto)) return false
    return true
  })
})

// Selección: marcados por defecto los que ya tienen correos; sin correos no se pueden seleccionar.
const seleccionados = ref(new Set())

watch(destinatarios, (rows) => {
  const next = new Set(seleccionados.value)
  for (const r of rows) {
    if (r.correos.length && !next.has(r.key)) next.add(r.key)
  }
  seleccionados.value = next
}, { immediate: true })

function toggleSeleccion(key) {
  const next = new Set(seleccionados.value)
  next.has(key) ? next.delete(key) : next.add(key)
  seleccionados.value = next
}

const totalSeleccionados = computed(() => destinatarios.value.filter(r => seleccionados.value.has(r.key)).length)

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/fronteras', { params: { limit: 500 } })
    fronteras.value = data
  } catch (e) {
    console.error('Error loading fronteras:', e)
  } finally {
    loading.value = false
  }
}

async function enviarSeleccionados() {
  const filas = destinatarios.value.filter(r => seleccionados.value.has(r.key) && r.refId != null)
  if (!filas.length) return

  enviando.value = true
  try {
    const { data } = await api.post('/reporte-cgm/enviar', {
      fecha_inicio: fechaDesdeStr.value,
      fecha_fin: fechaHastaStr.value || fechaDesdeStr.value,
      destinatarios: filas.map(r => ({ tipo: r.refTipo, id: r.refId })),
    })
    const ok = data.resultados.filter(r => r.ok)
    const conError = data.resultados.filter(r => !r.ok)
    toast.add({
      severity: conError.length ? 'warn' : 'success',
      summary: `${ok.length} enviado${ok.length === 1 ? '' : 's'}${conError.length ? `, ${conError.length} con error` : ''}`,
      detail: conError.length ? conError.map(r => `${r.nombre}: ${r.error}`).join(' · ') : undefined,
      life: 6000,
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al enviar', detail: e.response?.data?.detail || e.message, life: 5000 })
  } finally {
    enviando.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.cgm-root {
  position: relative;
  display: flex; flex-direction: column;
  height: 100vh; height: 100dvh; overflow: hidden;
  background: #f3f4f6; color: #2C2039;
  font-family: system-ui, -apple-system, sans-serif;
}

.cgm-topbar {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
  background: #2C2039; color: #fff;
}
.cgm-brand { flex: 1; font-size: clamp(15px, 4.2vw, 17px); font-weight: 700; letter-spacing: .2px; }
.cgm-brand .pi { color: #F6FF72; margin-right: 6px; }
.cgm-icon-btn {
  width: 36px; height: 36px; border-radius: 10px; border: none;
  background: rgba(255,255,255,0.1); color: #fff; font-size: 15px; flex-shrink: 0;
}
.cgm-icon-btn:disabled { opacity: .5; }

.cgm-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 12px 13px; }

.cgm-dates { display: flex; gap: 10px; margin-bottom: 10px; }
.cgm-date-field { flex: 1; display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 700; color: #6b5a8a; text-transform: uppercase; letter-spacing: .3px; }
.cgm-date-field input {
  font-family: inherit; font-size: 14px; font-weight: 600; color: #2C2039;
  border: 1.5px solid #e8e0f0; border-radius: 10px; padding: 8px 10px; background: #fff;
}

.cgm-filters { display: flex; gap: 6px; margin-bottom: 10px; }
.cgm-filter-pill {
  flex: 1; font-size: 12px; font-weight: 700; padding: 8px 0; border-radius: 10px;
  border: 1.5px solid #e8e0f0; background: #fff; color: #6b5a8a;
}
.cgm-filter-pill--on { border-color: #915BD8; background: #915BD8; color: #fff; }

.cgm-search {
  width: 100%; font-family: inherit; font-size: 14px; margin-bottom: 12px;
  border: 1.5px solid #e8e0f0; border-radius: 10px; padding: 9px 12px; background: #fff; color: #2C2039;
}
.cgm-search::placeholder { color: #c4b8d4; }

.cgm-loading { display: flex; align-items: center; gap: 8px; color: #6b5a8a; font-size: 13.5px; padding: 14px 4px; }
.cgm-loading .pi-spinner { color: #915BD8; }
.cgm-empty { color: #9ca3af; font-size: 13px; padding: 20px 4px; text-align: center; }

.cgm-card {
  display: flex; align-items: flex-start; gap: 10px;
  background: #fff; border: 1px solid #eceaf2; border-radius: 14px;
  padding: 11px 12px; margin-bottom: 9px;
}
.cgm-check { flex-shrink: 0; padding-top: 2px; }
.cgm-check input { width: 18px; height: 18px; accent-color: #915BD8; }
.cgm-card-main { flex: 1; min-width: 0; }

.cgm-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.cgm-pill { font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.cgm-pill--or { background: rgba(145,91,216,0.12); color: #6E3FB8; }
.cgm-pill--cliente { background: rgba(16,185,129,0.12); color: #059669; }
.cgm-proj-count { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: #9b8db5; flex-shrink: 0; }
.cgm-chev { font-size: 9px; transition: transform .12s ease; }
.cgm-chev--open { transform: rotate(180deg); }

.cgm-nombre { font-size: 14px; font-weight: 700; color: #2C2039; margin-bottom: 4px; }
.cgm-nombre--muted { font-style: italic; font-weight: 500; color: #c4b8d4; }

.cgm-correos { display: inline-block; font-size: 12.5px; font-weight: 600; color: #6E3FB8; text-decoration: underline; }
.cgm-correos--bad { color: #D64455; }
.cgm-correos--muted { color: #c4b8d4; text-decoration: none; font-style: italic; }

.cgm-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.cgm-chip { font-size: 11px; padding: 3px 8px; border-radius: 7px; background: #f9f7ff; border: 1px solid #eceaf2; color: #6b5a8a; }

.cgm-bottom-space { height: 74px; }

.cgm-send-bar {
  position: absolute; left: 0; right: 0; bottom: calc(56px + env(safe-area-inset-bottom));
  padding: 10px 13px; background: linear-gradient(to top, #f3f4f6 70%, transparent);
}
.cgm-send-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: #915BD8; color: #fff; font-size: 14px; font-weight: 700;
  border: none; border-radius: 12px; padding: 13px 0; box-shadow: 0 4px 14px rgba(145,91,216,0.35);
}
.cgm-send-btn:disabled { opacity: .4; box-shadow: none; }
</style>
