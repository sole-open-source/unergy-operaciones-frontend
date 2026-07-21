<template>
  <div class="space-y-5">
    <PageHeader
      title="Seguimiento Conexión XM (MDC)"
      subtitle="Proceso de conexión GD/AGGE ante el OR, XM (CND) y el ASIC — de la CREG 174 a la aprobación del requisito 9.4 (100%)."
    >
      <template #actions>
        <span class="cx-chip">Datos de ejemplo</span>
      </template>
    </PageHeader>

    <!-- KPIs globales -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="cx-card cx-kpi">
        <div class="cx-kpi-n">{{ proyectos.length }}</div>
        <div class="cx-kpi-l">Proyectos</div>
      </div>
      <div class="cx-card cx-kpi">
        <div class="cx-kpi-n">{{ avancePromedio }}%</div>
        <div class="cx-kpi-l">Avance promedio</div>
      </div>
      <div class="cx-card cx-kpi">
        <div class="cx-kpi-n" :style="{ color: totalAlertas ? '#CA8A04' : '#10B981' }">{{ totalAlertas }}</div>
        <div class="cx-kpi-l">Alertas pendientes</div>
      </div>
      <div class="cx-card cx-kpi">
        <div class="cx-kpi-n" :style="{ color: totalBloqueos ? '#D64455' : '#10B981' }">{{ totalBloqueos }}</div>
        <div class="cx-kpi-l">Bloqueos</div>
      </div>
    </div>

    <!-- Selector de proyectos -->
    <div class="cx-proyectos">
      <button
        v-for="p in proyectos"
        :key="p.id"
        class="cx-card cx-proyecto"
        :class="{ 'cx-proyecto--on': p.id === selId }"
        @click="selId = p.id"
      >
        <div class="cx-proyecto-top">
          <div>
            <div class="cx-proyecto-nombre">{{ p.nombreComercial }}</div>
            <div class="cx-proyecto-meta">{{ p.tipoProyecto }} · {{ p.tecnologia }} · {{ p.or }}</div>
          </div>
          <span v-if="p.avancePct >= 100" class="cx-pill cx-pill--ok">Completo</span>
          <span v-else class="cx-pill cx-pill--brand">En proceso</span>
        </div>
        <div class="cx-bar"><span :style="{ width: Math.min(100, p.avancePct) + '%' }" /></div>
        <div class="cx-proyecto-foot">
          <span class="cx-avance-num">{{ p.avancePct }}%</span>
          <span class="cx-tags">
            <span v-if="p.alertasPendientes.length" class="cx-pill cx-pill--warn">⚠ {{ p.alertasPendientes.length }}</span>
            <span v-if="p.bloqueos.length" class="cx-pill cx-pill--danger">⛔ {{ p.bloqueos.length }}</span>
          </span>
        </div>
      </button>
    </div>

    <!-- Detalle del proyecto seleccionado -->
    <div v-if="sel" class="space-y-4">
      <!-- Avance + siguiente paso -->
      <div class="cx-card">
        <div class="cx-flex-between">
          <strong style="color:#2C2039">Avance acumulado — {{ sel.nombreComercial }}</strong>
          <span class="cx-avance-num" style="font-size:1.4rem">{{ sel.avancePct }}%</span>
        </div>
        <div class="cx-bar" style="margin-top:8px"><span :style="{ width: Math.min(100, sel.avancePct) + '%' }" /></div>

        <div class="cx-next" v-if="sel.siguientePaso">
          <div class="cx-next-l">Siguiente paso</div>
          <div class="cx-next-b">
            <span class="cx-code">{{ sel.siguientePaso.codigo }}</span> — {{ sel.siguientePaso.descripcion }}
          </div>
          <div class="cx-next-s">
            Etapa: {{ sel.siguientePaso.etiquetaEtapa }} · Responsable:
            <span class="cx-pill">{{ sel.siguientePaso.responsable || 'por definir' }}</span>
          </div>
        </div>
        <div class="cx-next" v-else>
          <span class="cx-pill cx-pill--ok">Alcance actual (hasta 9.4) completado — 100%</span>
        </div>
      </div>

      <!-- Bloqueos -->
      <div v-if="sel.bloqueos.length" class="cx-card">
        <strong style="color:#2C2039">Bloqueos</strong>
        <ul class="cx-list">
          <li v-for="b in sel.bloqueos" :key="b.etapa" class="cx-list-item cx-list-item--danger">
            <strong>{{ b.etiqueta }}</strong> — {{ b.motivo }}
          </li>
        </ul>
      </div>

      <!-- Alertas -->
      <div class="cx-card">
        <strong style="color:#2C2039">Alertas pendientes ({{ sel.alertasPendientes.length }})</strong>
        <p v-if="!sel.alertasPendientes.length" class="cx-muted" style="margin:8px 0 0">Sin alertas pendientes.</p>
        <ul v-else class="cx-list">
          <li v-for="(a, i) in sel.alertasPendientes" :key="i" class="cx-list-item cx-list-item--warn">
            <div class="cx-tipo">{{ a.tipo }}</div>
            <div>{{ a.mensaje }}</div>
          </li>
        </ul>
      </div>

      <!-- Estado por etapa -->
      <div class="cx-card">
        <strong style="color:#2C2039">Estado por etapa</strong>
        <div class="cx-etapas">
          <div
            v-for="e in sel.porEtapa"
            :key="e.etapa"
            class="cx-etapa"
            :class="etapaClase(e)"
          >
            <div>
              <div class="cx-etapa-t">{{ e.etiqueta }}</div>
              <div class="cx-etapa-s">
                {{ e.estadoActual }}<template v-if="e.responsableActual"> · {{ e.responsableActual }}</template>
              </div>
            </div>
            <div style="text-align:right; white-space:nowrap">
              <span class="cx-avance-num">{{ e.ganadoPct }}/{{ e.totalPct }}%</span>
              <div class="cx-etapa-h">{{ e.completos }}/{{ e.totalHitos }} hitos</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hitos + Validación 9.3 -->
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="cx-card">
          <strong style="color:#2C2039">Hitos (ponderación)</strong>
          <ul class="cx-list">
            <li v-for="h in sel.hitos" :key="h.hito" class="cx-hito" :class="{ 'cx-hito--done': h.completado }">
              <span class="cx-hito-c">{{ h.completado ? '✓' : '' }} {{ h.codigo }}</span>
              <span style="flex:1">{{ h.descripcion }}</span>
              <span class="cx-hito-p">{{ h.pesoPct }}%</span>
            </li>
          </ul>
        </div>

        <div class="cx-card">
          <div class="cx-flex-between">
            <strong style="color:#2C2039">Validación 9.3</strong>
            <span class="cx-pill" :class="sel.validacion93.valido ? 'cx-pill--ok' : 'cx-pill--danger'">
              {{ sel.validacion93.valido ? 'sin errores' : 'con errores' }}
            </span>
          </div>
          <div style="margin-top:10px">
            <div v-for="(r, i) in sel.validacion93.resultados" :key="i" class="cx-val">
              <span>{{ r.regla }}</span>
              <span :class="'cx-sev cx-sev--' + r.severidad" :title="r.mensaje">{{ r.severidad }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { Estado } from '@/features/conexion-xm/domain/enums'
import { listarProyectosResumen } from '@/features/conexion-xm/repo'

const proyectos = ref(listarProyectosResumen())
const selId = ref(proyectos.value[0]?.id ?? null)
const sel = computed(() => proyectos.value.find((p) => p.id === selId.value) || null)

const avancePromedio = computed(() => {
  if (!proyectos.value.length) return 0
  const prom = proyectos.value.reduce((s, p) => s + p.avancePct, 0) / proyectos.value.length
  return Math.round(prom * 10) / 10
})
const totalAlertas = computed(() => proyectos.value.reduce((s, p) => s + p.alertasPendientes.length, 0))
const totalBloqueos = computed(() => proyectos.value.reduce((s, p) => s + p.bloqueos.length, 0))

function etapaClase(e) {
  if (e.bloqueada || e.estadoActual === Estado.VENCIDO) return 'cx-etapa--bloqueada'
  if (e.ganadoPct >= e.totalPct && e.totalPct > 0) return 'cx-etapa--completa'
  if (e.estadoActual !== Estado.NO_INICIADO) return 'cx-etapa--progreso'
  return ''
}
</script>

<style scoped>
.cx-card {
  background: #fff;
  border: 1px solid #e8e0f0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(44, 32, 57, 0.04);
}
.cx-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: #6e3fb8;
  background: #f3edfb;
  border: 1px solid #e2d4f5;
  border-radius: 999px;
  padding: 3px 10px;
}
.cx-kpi { text-align: left; }
.cx-kpi-n { font-size: 1.7rem; font-weight: 800; color: #2c2039; font-variant-numeric: tabular-nums; }
.cx-kpi-l { font-size: 0.78rem; color: #7a6e8a; }

.cx-proyectos {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
.cx-proyecto { text-align: left; cursor: pointer; transition: border-color .15s, transform .15s; }
.cx-proyecto:hover { border-color: #915bd8; transform: translateY(-1px); }
.cx-proyecto--on { border-color: #915bd8; box-shadow: 0 0 0 2px rgba(145, 91, 216, .18); }
.cx-proyecto-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.cx-proyecto-nombre { font-weight: 700; color: #2c2039; }
.cx-proyecto-meta { font-size: 0.76rem; color: #7a6e8a; margin-top: 2px; }
.cx-proyecto-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.cx-tags { display: flex; gap: 6px; }

.cx-bar { height: 10px; background: #f0eaf8; border: 1px solid #e8e0f0; border-radius: 999px; overflow: hidden; margin-top: 8px; }
.cx-bar > span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #915bd8, #b08ae2); transition: width .4s ease; }
.cx-avance-num { font-weight: 800; color: #2c2039; font-variant-numeric: tabular-nums; }

.cx-flex-between { display: flex; justify-content: space-between; align-items: baseline; }
.cx-muted { color: #7a6e8a; font-size: 0.85rem; }

.cx-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; border: 1px solid #e2d4f5; background: #f6f2fb; color: #6e3fb8; white-space: nowrap; }
.cx-pill--ok { color: #10b981; background: #e9f9f2; border-color: #bfead8; }
.cx-pill--warn { color: #b7791f; background: #fdf5e2; border-color: #f0dfae; }
.cx-pill--danger { color: #d64455; background: #fdeef0; border-color: #f4c9cf; }
.cx-pill--brand { color: #6e3fb8; background: #f3edfb; border-color: #e2d4f5; }

.cx-next { margin-top: 14px; border: 1px solid #e2d4f5; background: #faf7fe; border-radius: 10px; padding: 12px 14px; }
.cx-next-l { font-size: 0.72rem; color: #7a6e8a; }
.cx-next-b { font-weight: 600; color: #2c2039; margin-top: 2px; }
.cx-next-s { font-size: 0.8rem; color: #7a6e8a; margin-top: 4px; }
.cx-code { font-family: ui-monospace, monospace; color: #915bd8; font-weight: 700; }

.cx-list { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 8px; }
.cx-list-item { padding: 10px 12px; border: 1px solid #e8e0f0; border-radius: 10px; background: #faf8fc; font-size: 0.9rem; color: #2c2039; }
.cx-list-item--warn { border-left: 3px solid #f0c040; }
.cx-list-item--danger { border-left: 3px solid #d64455; }
.cx-tipo { font-size: 0.7rem; font-weight: 700; color: #b7791f; font-family: ui-monospace, monospace; }

.cx-etapas { display: grid; gap: 8px; margin-top: 10px; }
.cx-etapa { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 12px 14px; border: 1px solid #e8e0f0; border-radius: 10px; background: #faf8fc; }
.cx-etapa--completa { border-left: 3px solid #10b981; }
.cx-etapa--progreso { border-left: 3px solid #b08ae2; }
.cx-etapa--bloqueada { border-left: 3px solid #d64455; }
.cx-etapa-t { font-weight: 600; font-size: 0.92rem; color: #2c2039; }
.cx-etapa-s { font-size: 0.76rem; color: #7a6e8a; margin-top: 2px; font-family: ui-monospace, monospace; }
.cx-etapa-h { font-size: 0.72rem; color: #7a6e8a; }

.cx-hito { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; border: 1px solid #e8e0f0; border-radius: 10px; background: #faf8fc; font-size: 0.88rem; color: #2c2039; }
.cx-hito-c { font-weight: 700; font-family: ui-monospace, monospace; min-width: 30px; color: #7a6e8a; }
.cx-hito--done .cx-hito-c { color: #10b981; }
.cx-hito-p { color: #7a6e8a; font-variant-numeric: tabular-nums; font-size: 0.8rem; }

.cx-val { display: flex; justify-content: space-between; gap: 12px; font-size: 0.84rem; padding: 6px 0; border-bottom: 1px dashed #ece7f2; color: #2c2039; }
.cx-val:last-child { border-bottom: none; }
.cx-sev { font-weight: 700; font-size: 0.76rem; }
.cx-sev--OK { color: #10b981; }
.cx-sev--ERROR { color: #d64455; }
.cx-sev--ADVERTENCIA { color: #b7791f; }
.cx-sev--PENDIENTE { color: #9b8fb0; }
</style>
