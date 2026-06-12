<template>
  <div class="pc-wrap">
    <!-- Top -->
    <div class="pc-top">
      <div>
        <h1>Panel Contable</h1>
        <div class="sub">
          {{ periodoLabel }} · división por % del backend · IVA automático sobre costos
        </div>
      </div>
      <div class="top-actions">
        <input type="month" v-model="periodo" class="month-in" @change="cargarPaneles" />
        <button v-if="tab !== 'diferencia'" class="btn-o" :disabled="loading" @click="$refs.erInput.click()">
          <i class="pi pi-upload" /> Cargar ER
        </button>
        <input ref="erInput" type="file" accept=".xlsx,.xls" multiple class="hidden" @change="onErSelected" />
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tab" :class="{ act: tab === 'preliquidacion' }" @click="setTab('preliquidacion')">Preliquidación</div>
      <div class="tab" :class="{ act: tab === 'oficial' }" @click="setTab('oficial')">Oficial</div>
      <div class="tab" :class="{ act: tab === 'diferencia' }" @click="setTab('diferencia')">Diferencia</div>
    </div>

    <div v-if="uploading" class="banner">
      <i class="pi pi-spin pi-spinner" /> Procesando ER ({{ uploading }})…
    </div>
    <div v-if="uploadMsg" class="banner banner-info" v-html="uploadMsg" />

    <!-- ── PRELIQUIDACIÓN / OFICIAL ── -->
    <template v-if="tab !== 'diferencia'">
      <div v-if="loading" class="empty"><i class="pi pi-spin pi-spinner" /> Cargando…</div>

      <template v-else>
        <!-- Selección + consecutivos -->
        <div class="card">
          <div class="card-h">
            <h3>Selección de liquidación</h3>
            <div class="pool-actions">
              <button class="mini" @click="selAll('liquidar', true)">Liquidar todos</button>
              <button class="mini" @click="selAll('liquidar', false)">Ninguno</button>
              <button class="mini" @click="selAll('generar_mandatos', true)">Generar todos</button>
              <button class="mini" @click="selAll('generar_mandatos', false)">Generar ninguno</button>
            </div>
          </div>

          <div v-if="!paneles.length" class="empty sm">
            No hay paneles para {{ periodoLabel }}. Carga uno o varios archivos ER.
          </div>

          <div v-else class="tbl-wrap">
            <table class="ptbl">
              <thead><tr>
                <th class="l">Proyecto</th>
                <th>Inversionistas</th>
                <th>Ingreso bruto</th>
                <th>Liquidar</th>
                <th>Generar mandatos</th>
              </tr></thead>
              <tbody>
                <tr v-for="p in paneles" :key="p.id">
                  <td class="l">
                    <span class="pname">{{ p.proyecto }}</span>
                    <span v-if="!p.tiene_costos" class="pill pill-warn">sin costos</span>
                    <span v-if="p.tiene_bolsa" class="pill pill-bolsa">bolsa</span>
                  </td>
                  <td><span class="pmeta">{{ p.inversionistas.map(i => i.nombre).join(', ') }}</span></td>
                  <td style="text-align:right;">{{ fmt(p.ingreso_bruto_cop) }}</td>
                  <td><input type="checkbox" class="chk" v-model="p.liquidar" @change="onFlag(p)" /></td>
                  <td><input type="checkbox" class="gen-chk" v-model="p.generar_mandatos" @change="onFlag(p)" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="cons-pool">
            <div class="fld">
              <label>Consecutivo Ingresos inicial</label>
              <input type="number" v-model.number="consIngIni" @change="reasignar" />
            </div>
            <div class="fld">
              <label>Consecutivo Costos inicial</label>
              <input type="number" v-model.number="consCosIni" @change="reasignar" />
            </div>
            <div class="hint">
              Solo los proyectos marcados <b>Liquidar</b> consumen consecutivo.
              Costos numera únicamente si el proyecto tiene costos.
            </div>
            <div class="summary">
              <b>{{ nLiquidan }}</b>/{{ paneles.length }} liquidan · <b>{{ nGeneran }}</b> generan mandatos
            </div>
          </div>
        </div>

        <!-- Detalle por proyecto -->
        <div class="sec-title">Detalle contable por proyecto</div>
        <div v-for="p in paneles" :key="'d' + p.id" class="proj" :class="{ off: !p.liquidar, open: open[p.id] }">
          <div class="phead" @click="toggle(p.id)">
            <span class="chev">▶</span>
            <div class="pn">{{ p.proyecto }}</div>
            <span v-if="!p.tiene_costos" class="pill pill-warn">sin costos</span>
            <span v-if="p.tiene_bolsa" class="pill pill-bolsa">bolsa</span>
            <span v-if="p.generar_mandatos" class="pill pill-gen">genera mandatos</span>
            <span v-if="!p.liquidar" class="pill pill-off">no liquida</span>
            <div class="pcons">
              <span>Ing: <b>{{ p.consecutivo_ingresos ?? '—' }}</b></span>
              <span>Cost: <b>{{ p.consecutivo_costos ?? '—' }}</b></span>
            </div>
          </div>

          <div class="body" v-show="open[p.id]">
            <div v-for="inv in p.inversionistas" :key="inv.proyecto_inversionista_id || inv.nombre" class="inv-block">
              <div class="inv-head">
                <div class="inv-name">{{ inv.nombre }} · {{ (inv.porcentaje ?? 0).toFixed(2) }}%</div>
                <div class="inv-cons">
                  <span>Ing: <b>{{ p.liquidar ? (p.consecutivo_ingresos ?? '—') : '—' }}</b></span>
                  <span>Cost: <b>{{ (p.liquidar && p.tiene_costos) ? (p.consecutivo_costos ?? '—') : '—' }}</b></span>
                </div>
              </div>
              <div class="tbl-wrap">
                <table class="dt">
                  <thead><tr>
                    <th class="l">Concepto</th>
                    <th>Valor ({{ shortName(inv.nombre) }})</th>
                    <th class="l">Comprobante</th>
                  </tr></thead>
                  <tbody>
                    <template v-for="g in grupos" :key="g.key">
                      <template v-if="lineasDe(inv, g.key).length">
                        <tr class="grp"><td colspan="3">{{ g.label }}</td></tr>
                        <tr v-for="ln in lineasDe(inv, g.key)" :key="ln.id">
                          <td class="l">{{ ln.concepto }}</td>
                          <td>
                            <input class="val-in" :class="{ neg: ln.valor_cop < 0 }"
                                   type="number" v-model.number="ln.valor_cop" @change="markDirty(p)" />
                          </td>
                          <td class="l">
                            <input class="comp-in" placeholder="comprob." v-model="ln.comprobante_contable" @change="markDirty(p)" />
                          </td>
                        </tr>
                        <tr v-if="g.total" class="tot">
                          <td class="l">{{ g.total }}</td>
                          <td>{{ fmt(totalGrupo(inv, g.key)) }}</td>
                          <td></td>
                        </tr>
                      </template>
                    </template>
                    <tr class="grp"><td colspan="3">RESULTADO</td></tr>
                    <tr class="tot">
                      <td class="l">Utilidad</td>
                      <td :class="{ neg: utilidad(inv) < 0 }">{{ fmt(utilidad(inv)) }}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="proj-foot">
              <button class="btn" :disabled="!dirty[p.id]" @click="guardar(p)">
                <i class="pi pi-save" /> Guardar cambios
              </button>
              <span v-if="savedAt[p.id]" class="saved">✓ guardado</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ── DIFERENCIA ── -->
    <template v-else>
      <div v-if="loading" class="empty"><i class="pi pi-spin pi-spinner" /> Cargando…</div>

      <!-- Sin liquidación oficial todavía -->
      <div v-else-if="!diff.tiene_oficial" class="card">
        <div class="empty">
          <i class="pi pi-clock" style="font-size:22px; display:block; margin-bottom:8px; color:var(--p2);" />
          Aún no hay liquidación oficial para comparar.<br />
          Carga el ER oficial en la pestaña <b>Oficial</b>.
        </div>
      </div>

      <div v-else-if="!diff.proyectos?.length" class="card">
        <div class="empty sm">Sin datos para comparar en {{ periodoLabel }}.</div>
      </div>

      <template v-else>
        <div v-for="proy in diff.proyectos" :key="proy.proyecto_id" class="diff-proy">
          <div class="diff-proy-h">{{ proy.proyecto_nombre }}</div>

          <!-- KPIs por proyecto -->
          <div class="cards-resumen">
            <div class="rc">
              <div class="rc-lbl">Utilidad estimada</div>
              <div class="rc-val">{{ fmt(proy.utilidad_pre) }}</div>
            </div>
            <div class="rc">
              <div class="rc-lbl">Utilidad real</div>
              <div class="rc-val">{{ proy.tiene_oficial ? fmt(proy.utilidad_oficial) : 'pendiente' }}</div>
            </div>
            <div class="rc">
              <div class="rc-lbl">Diferencia</div>
              <div class="rc-val" :class="diffClass(proy.utilidad_dif)">
                <span v-if="proy.utilidad_dif != null" class="arrow">{{ arrow(proy.utilidad_dif) }}</span>{{ fmt(proy.utilidad_dif) }}
              </div>
            </div>
          </div>

          <!-- Tabla por inversionista -->
          <div v-for="inv in proy.inversionistas" :key="inv.proyecto_inversionista_id || inv.nombre" class="card">
            <div class="inv-head">
              <div class="inv-name">{{ inv.nombre }} · {{ (inv.porcentaje ?? 0).toFixed(2) }}%</div>
            </div>
            <div class="tbl-wrap">
              <table class="dt diff-dt">
                <thead><tr>
                  <th class="l">Concepto</th>
                  <th>Preliquidación</th>
                  <th>Oficial</th>
                  <th>Diferencia</th>
                  <th>%</th>
                </tr></thead>
                <tbody>
                  <template v-for="g in grupos" :key="g.key">
                    <template v-if="lineasGrupo(inv, g.key).length">
                      <tr class="grp"><td colspan="5">{{ g.label }}</td></tr>
                      <tr v-for="(ln, i) in lineasGrupo(inv, g.key)" :key="g.key + i">
                        <td class="l">{{ ln.concepto }}</td>
                        <td>{{ fmt(ln.preliquidacion) }}</td>
                        <td>{{ ln.oficial != null ? fmt(ln.oficial) : '—' }}</td>
                        <td :class="diffClass(ln.diferencia)">
                          <span v-if="ln.diferencia != null && ln.diferencia !== 0" class="arrow">{{ arrow(ln.diferencia) }}</span>{{ ln.diferencia != null ? fmt(ln.diferencia) : '—' }}
                        </td>
                        <td :class="diffClass(ln.diferencia)">{{ ln.pct_variacion != null ? ln.pct_variacion.toFixed(1) + '%' : '—' }}</td>
                      </tr>
                    </template>
                  </template>
                  <tr class="grp"><td colspan="5">RESULTADO</td></tr>
                  <tr class="tot">
                    <td class="l">Utilidad</td>
                    <td>{{ fmt(inv.utilidad_pre) }}</td>
                    <td>{{ inv.utilidad_oficial != null ? fmt(inv.utilidad_oficial) : '—' }}</td>
                    <td :class="diffClass(inv.utilidad_dif)">
                      <span v-if="inv.utilidad_dif != null && inv.utilidad_dif !== 0" class="arrow">{{ arrow(inv.utilidad_dif) }}</span>{{ inv.utilidad_dif != null ? fmt(inv.utilidad_dif) : '—' }}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/client'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const grupos = [
  { key: 'ingresos', label: 'INGRESOS', total: 'Total Ingresos' },
  { key: 'comercializacion', label: 'COMERCIALIZACIÓN XM', total: 'Total Comercialización' },
  { key: 'costos', label: 'COSTOS OPERATIVOS', total: 'Total Costos Operativos' },
  { key: 'facturas', label: 'FACTURAS DE SERVICIO', total: null },
]

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const tab = ref('preliquidacion')
const periodo = ref(defaultPeriodo())
const paneles = ref([])
const diff = ref({})
const open = reactive({})
const dirty = reactive({})
const savedAt = reactive({})
const loading = ref(false)
const uploading = ref(0)
const uploadMsg = ref('')
const consIngIni = ref(793)
const consCosIni = ref(850)
const erInput = ref(null)

function defaultPeriodo () {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const periodoLabel = computed(() => {
  const [y, m] = periodo.value.split('-')
  return `${MESES[Number(m) - 1] || ''} ${y}`
})
const nLiquidan = computed(() => paneles.value.filter(p => p.liquidar).length)
const nGeneran = computed(() => paneles.value.filter(p => p.generar_mandatos).length)

const fmt = (n) => {
  const r = Math.round(Number(n) || 0)
  if (r === 0) return '–'
  return (r < 0 ? '-$ ' : '$ ') + Math.abs(r).toLocaleString('es-CO')
}
const shortName = (n) => (n || '').split(' ').slice(0, 2).join(' ')
const diffClass = (v) => (v == null ? '' : (v > 0 ? 'pos' : (v < 0 ? 'neg' : '')))
const arrow = (v) => (v == null || v === 0 ? '' : (v > 0 ? '▲ ' : '▼ '))

// Diferencia: líneas de un inversionista por grupo (ya cruzadas en el backend).
const lineasGrupo = (inv, grupo) => (inv.lineas || []).filter(l => l.grupo === grupo)

const lineasDe = (inv, grupo) => inv.lineas.filter(l => l.grupo === grupo)
const totalGrupo = (inv, grupo) => lineasDe(inv, grupo).reduce((s, l) => s + (Number(l.valor_cop) || 0), 0)
const utilidad = (inv) => inv.lineas.reduce((s, l) => s + (Number(l.valor_cop) || 0), 0)

function setTab (t) {
  tab.value = t
  if (t === 'diferencia') cargarDiferencia()
  else cargarPaneles()
}
function toggle (id) { open[id] = !open[id] }
function markDirty (p) { dirty[p.id] = true; savedAt[p.id] = false }

async function cargarPaneles () {
  if (tab.value === 'diferencia') return cargarDiferencia()
  loading.value = true
  try {
    const { data } = await api.get('/panel-contable', { params: { periodo: periodo.value, tipo: tab.value } })
    paneles.value = data.paneles || []
    paneles.value.forEach((p, i) => { if (open[p.id] === undefined) open[p.id] = (i === 0 && p.liquidar) })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los paneles', life: 4000 })
  } finally {
    loading.value = false
  }
}

async function cargarDiferencia () {
  loading.value = true
  try {
    const { data } = await api.get('/panel-contable/diferencia', { params: { periodo: periodo.value } })
    diff.value = data
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la diferencia', life: 4000 })
  } finally {
    loading.value = false
  }
}

async function onErSelected (e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploading.value = files.length
  uploadMsg.value = ''
  const fd = new FormData()
  files.forEach(f => fd.append('files', f))
  fd.append('periodo', periodo.value)
  fd.append('tipo', tab.value)
  try {
    const { data } = await api.post('/panel-contable/cargar-er', fd)
    const partes = []
    if (data.cargados?.length) partes.push(`<b>${data.cargados.length}</b> cargados`)
    if (data.sin_match?.length) partes.push(`<span style="color:#c0392b">${data.sin_match.length} sin match: ${data.sin_match.join(', ')}</span>`)
    if (data.errores?.length) partes.push(`<span style="color:#c0392b">${data.errores.length} con error</span>`)
    uploadMsg.value = partes.join(' · ')
    toast.add({ severity: 'success', summary: 'ER procesados', detail: `${data.cargados?.length || 0} proyecto(s)`, life: 3500 })
    await cargarPaneles()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.detail || 'Fallo al procesar ER', life: 5000 })
  } finally {
    uploading.value = 0
    if (erInput.value) erInput.value.value = ''
  }
}

function selAll (campo, val) {
  paneles.value.forEach(p => { p[campo] = val })
  Promise.all(paneles.value.map(p => api.patch(`/panel-contable/${p.id}`, { [campo]: val }).catch(() => {})))
    .then(() => { if (campo === 'liquidar') reasignar() })
}

async function onFlag (p) {
  try {
    await api.patch(`/panel-contable/${p.id}`, { liquidar: p.liquidar, generar_mandatos: p.generar_mandatos })
    reasignar()
  } catch (e) { /* noop */ }
}

async function reasignar () {
  try {
    await api.post('/panel-contable/reasignar-consecutivos', {
      periodo: periodo.value,
      tipo: tab.value,
      consecutivo_ingresos_inicial: Number(consIngIni.value) || 0,
      consecutivo_costos_inicial: Number(consCosIni.value) || 0,
    })
    // Refrescar consecutivos sin perder el estado de despliegue.
    const { data } = await api.get('/panel-contable', { params: { periodo: periodo.value, tipo: tab.value } })
    const map = Object.fromEntries((data.paneles || []).map(p => [p.id, p]))
    paneles.value.forEach(p => {
      const fresh = map[p.id]
      if (fresh) { p.consecutivo_ingresos = fresh.consecutivo_ingresos; p.consecutivo_costos = fresh.consecutivo_costos }
    })
  } catch (e) { /* noop */ }
}

async function guardar (p) {
  const lineas = []
  p.inversionistas.forEach(inv => inv.lineas.forEach(l => {
    lineas.push({ id: l.id, valor_cop: Number(l.valor_cop) || 0, comprobante_contable: l.comprobante_contable })
  }))
  try {
    await api.patch(`/panel-contable/${p.id}`, { lineas })
    dirty[p.id] = false
    savedAt[p.id] = true
    toast.add({ severity: 'success', summary: 'Guardado', detail: p.proyecto, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 4000 })
  }
}

onMounted(cargarPaneles)
</script>

<style scoped>
.pc-wrap {
  --p1:#2C2039; --p2:#915BD8; --yl:#F6FF72; --bg:#FDFAF7;
  --txt:#2C2039; --txt2:#6b6478; --txt3:#9a93a8; --line:#ece7f2; --line2:#ddd6e8;
  --red:#c0392b; --green:#1e8449; --sec:#f5f2fa; --info:#eee7fb;
  background: var(--bg); color: var(--txt); padding: 24px; font-size: 13px; line-height: 1.4;
  min-height: 100%;
}
.hidden { display: none; }
.pc-top { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:18px; }
.pc-top h1 { font-size:20px; font-weight:600; color:var(--p1); }
.pc-top .sub { font-size:13px; color:var(--txt2); margin-top:2px; }
.top-actions { display:flex; gap:8px; align-items:center; }
.month-in { font-size:13px; padding:8px 10px; border:1px solid var(--line2); border-radius:9px; color:var(--p1); }
.btn { background:var(--p2); color:#fff; border:none; padding:9px 16px; border-radius:9px; font-size:13px; cursor:pointer; font-weight:500; }
.btn:hover { filter:brightness(1.07); }
.btn:disabled { opacity:.5; cursor:default; }
.btn-o { background:#fff; color:var(--p2); border:1px solid var(--line2); padding:9px 16px; border-radius:9px; font-size:13px; cursor:pointer; font-weight:500; }
.btn-o:hover { background:var(--sec); }

.tabs { display:flex; gap:4px; margin-bottom:18px; border-bottom:1px solid var(--line2); }
.tab { padding:9px 18px; font-size:13px; cursor:pointer; color:var(--txt2); border-bottom:2px solid transparent; margin-bottom:-1px; }
.tab.act { color:var(--p1); border-bottom-color:var(--p2); font-weight:600; }

.banner { background:var(--info); color:var(--p1); padding:10px 14px; border-radius:9px; margin-bottom:14px; font-size:12.5px; }
.banner-info { background:#faf8fd; border:1px solid var(--line); }

.card { background:#fff; border:1px solid var(--line); border-radius:12px; margin-bottom:16px; overflow:hidden; }
.card-h { padding:13px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.card-h h3 { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--p2); font-weight:600; }
.pool-actions { display:flex; gap:8px; flex-wrap:wrap; }
.mini { font-size:12px; padding:5px 11px; border-radius:7px; border:1px solid var(--line2); background:#fff; color:var(--txt2); cursor:pointer; }
.mini:hover { background:var(--sec); }

.empty { padding:30px; text-align:center; color:var(--txt3); font-size:13px; }
.empty.sm { padding:18px; }

.ptbl { width:100%; border-collapse:collapse; font-size:13px; }
.ptbl th { font-weight:500; color:var(--txt2); padding:8px 14px; text-align:center; border-bottom:1px solid var(--line); background:#faf8fd; }
.ptbl th.l { text-align:left; }
.ptbl td { padding:7px 14px; text-align:center; border-bottom:1px solid var(--line); }
.ptbl td.l { text-align:left; }
.ptbl tr:hover { background:var(--sec); }
.ptbl tr:last-child td { border-bottom:none; }
.pname { font-weight:500; color:var(--p1); }
.pmeta { font-size:11px; color:var(--txt3); }
.pill { font-size:10px; padding:2px 7px; border-radius:6px; font-weight:500; margin-left:6px; white-space:nowrap; }
.pill-warn { background:#fdf6d8; color:#8a6d00; }
.pill-bolsa { background:var(--info); color:var(--p2); }
.pill-gen { background:#e3f5e9; color:var(--green); }
.pill-off { background:var(--line); color:var(--txt3); }
.chk { width:17px; height:17px; accent-color:var(--p2); cursor:pointer; }
.gen-chk { width:17px; height:17px; accent-color:var(--green); cursor:pointer; }

.cons-pool { display:flex; gap:18px; align-items:flex-end; flex-wrap:wrap; padding:13px 18px; background:#faf8fd; border-top:1px solid var(--line); }
.fld label { font-size:11px; color:var(--txt2); display:block; margin-bottom:4px; }
.fld input { font-size:13px; padding:6px 9px; border:1px solid var(--line2); border-radius:7px; width:130px; }
.hint { font-size:12px; color:var(--txt3); max-width:320px; align-self:center; }
.summary { font-size:12px; color:var(--txt2); align-self:center; margin-left:auto; }
.summary b { color:var(--p1); }

.sec-title { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--txt2); font-weight:600; margin:18px 0 10px; }
.proj { background:#fff; border:1px solid var(--line); border-radius:12px; margin-bottom:10px; overflow:hidden; transition:opacity .2s; }
.proj.off { opacity:.45; }
.phead { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; flex-wrap:wrap; }
.phead:hover { background:var(--sec); }
.chev { color:var(--txt3); transition:transform .2s; font-size:12px; }
.proj.open .chev { transform:rotate(90deg); }
.pn { font-size:14px; font-weight:600; color:var(--p1); flex:1; min-width:150px; }
.pcons { font-size:11px; color:var(--txt2); font-variant-numeric:tabular-nums; display:flex; gap:12px; }
.pcons b { color:var(--p1); font-weight:600; }
.body { border-top:1px solid var(--line); }
.inv-block { border-bottom:1px solid var(--line); }
.inv-head { display:flex; align-items:center; gap:10px; padding:8px 16px; background:var(--sec); }
.inv-name { font-size:12px; font-weight:600; flex:1; color:var(--p1); }
.inv-cons { font-size:11px; color:var(--txt2); font-variant-numeric:tabular-nums; display:flex; gap:10px; }
.inv-cons b { color:var(--p1); }
.tbl-wrap { overflow-x:auto; }
table.dt { width:100%; border-collapse:collapse; font-size:12.5px; min-width:640px; }
table.dt th { font-weight:500; color:var(--txt2); padding:6px 12px; text-align:right; border-bottom:1px solid var(--line); white-space:nowrap; }
table.dt th:first-child, table.dt th.l { text-align:left; }
table.dt td { padding:5px 12px; text-align:right; font-variant-numeric:tabular-nums; border-bottom:1px solid var(--line); }
table.dt td:first-child, table.dt td.l { text-align:left; color:var(--txt2); }
tr.grp td { font-weight:600; font-size:11px; letter-spacing:.03em; color:var(--p1); padding-top:9px; background:#faf8fd; border-top:1px solid var(--line2); }
tr.tot td { background:var(--sec); font-weight:600; }
.neg { color:var(--red); }
.pos { color:var(--green); }
.val-in { width:130px; font-size:12.5px; padding:3px 6px; border:1px solid transparent; border-radius:5px; text-align:right; font-variant-numeric:tabular-nums; background:transparent; }
.val-in:hover { border-color:var(--line2); }
.val-in:focus { outline:none; background:var(--info); border-color:var(--p2); }
.comp-in { width:100px; font-size:11px; padding:3px 6px; border:1px solid var(--line2); border-radius:5px; text-align:left; }
.proj-foot { display:flex; align-items:center; gap:12px; padding:12px 16px; }
.saved { font-size:12px; color:var(--green); }

.cards-resumen { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:16px; }
.rc { background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
.rc-lbl { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--txt2); margin-bottom:6px; }
.rc-val { font-size:20px; font-weight:600; color:var(--p1); font-variant-numeric:tabular-nums; }

.diff-proy { margin-bottom:26px; }
.diff-proy-h { font-size:15px; font-weight:600; color:var(--p1); margin-bottom:10px; }
.diff-dt th { text-align:right; }
.diff-dt th.l { text-align:left; }
.arrow { font-size:10px; }
</style>
