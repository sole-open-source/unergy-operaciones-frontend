<template>
  <div class="mon-page">

    <!-- ══ HERO ══════════════════════════════════════════════════════════ -->
    <div class="mon-hero">
      <div>
        <h1 class="mon-hero-title">Monitoreo de Fallas</h1>
        <p class="mon-hero-sub">Seguimiento operacional en tiempo real · Unergy</p>
      </div>
      <div class="mon-hero-actions">
        <button v-if="activeTab === 0" class="mon-btn mon-btn-ghost" :disabled="loading" @click="cargar">
          <span :class="loading ? 'spin' : ''">↻</span> Actualizar
        </button>
        <button v-if="activeTab === 0" class="mon-btn mon-btn-primary" @click="showDialog = true">
          + Registrar falla
        </button>
        <button v-if="activeTab === 1" class="mon-btn mon-btn-ghost" :disabled="genLoading" @click="cargarGeneracion">
          <span :class="genLoading ? 'spin' : ''">↻</span> Actualizar
        </button>
        <button v-if="activeTab === 4" class="mon-btn mon-btn-primary" @click="showCrearInforme = !showCrearInforme">
          + Crear informe
        </button>
      </div>
    </div>

    <!-- ══ TAB BAR ═══════════════════════════════════════════════════════════ -->
    <div class="mon-tabs">
      <button v-for="(tab, i) in TABS" :key="i"
              class="mon-tab" :class="{ 'mon-tab--active': activeTab === i }"
              @click="activeTab = i">
        <span class="mon-tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 0: FALLAS                                                     -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 0">

      <!-- KPI Cards -->
      <div class="mon-kpis">
        <button class="kpi" :class="!filtroEstado && !filtroPrioridad ? 'kpi--active kpi--purple' : ''"
                @click="limpiarFiltros">
          <div class="kpi-val">{{ todasLasFallas.length }}</div>
          <div class="kpi-label">Total</div>
          <div class="kpi-bar kpi-bar--purple" />
        </button>
        <button class="kpi" :class="filtroEstado === 'abierta' ? 'kpi--active kpi--red' : ''"
                @click="setFiltroEstado('abierta')">
          <div class="kpi-val">{{ kpis.abierta }}</div>
          <div class="kpi-label">Abiertas</div>
          <div class="kpi-bar kpi-bar--red" />
        </button>
        <button class="kpi" :class="filtroEstado === 'en_gestion' ? 'kpi--active kpi--orange' : ''"
                @click="setFiltroEstado('en_gestion')">
          <div class="kpi-val">{{ kpis.en_gestion }}</div>
          <div class="kpi-label">En gestión</div>
          <div class="kpi-bar kpi-bar--orange" />
        </button>
        <button class="kpi" :class="filtroEstado === 'en_espera' ? 'kpi--active kpi--blue' : ''"
                @click="setFiltroEstado('en_espera')">
          <div class="kpi-val">{{ kpis.en_espera }}</div>
          <div class="kpi-label">En espera</div>
          <div class="kpi-bar kpi-bar--blue" />
        </button>
        <button class="kpi" :class="filtroPrioridad === 'critica' ? 'kpi--active kpi--red' : ''"
                @click="setFiltroPrioridad('critica')">
          <div class="kpi-val kpi-val--red">{{ kpis.critica }}</div>
          <div class="kpi-label">Críticas</div>
          <div class="kpi-bar kpi-bar--red" />
        </button>
      </div>

      <!-- Filtros -->
      <div class="mon-filters">
        <div class="mon-filter-field mon-filter-search">
          <label class="mon-filter-label">Buscar</label>
          <input v-model="buscar" type="text" class="mon-input"
                 placeholder="Código, proyecto, descripción…" />
        </div>
        <div class="mon-filter-field">
          <label class="mon-filter-label">Estado</label>
          <select v-model="filtroEstado" class="mon-select">
            <option value="">Todos</option>
            <option v-for="e in catalogos.estados" :key="e.id" :value="e.codigo">{{ e.etiqueta }}</option>
          </select>
        </div>
        <div class="mon-filter-field">
          <label class="mon-filter-label">Prioridad</label>
          <select v-model="filtroPrioridad" class="mon-select">
            <option value="">Todas</option>
            <option v-for="p in catalogos.prioridades" :key="p.id" :value="p.codigo">{{ p.etiqueta }}</option>
          </select>
        </div>
        <div class="mon-filter-field">
          <label class="mon-filter-label">Proyecto</label>
          <select v-model="filtroProyecto" class="mon-select">
            <option value="">Todos</option>
            <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
          </select>
        </div>
        <div class="mon-filter-actions">
          <button v-if="hayFiltros" class="mon-btn-clear" @click="limpiarFiltros">✕ Limpiar</button>
          <span v-if="!loading" class="mon-count">{{ fallasFiltradas.length }} falla{{ fallasFiltradas.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Tabla -->
      <div class="mon-table-area">
        <div v-if="loading" class="mon-loading">
          <div class="mon-spinner" /><span>Cargando fallas…</span>
        </div>
        <div v-else-if="error" class="mon-error">
          <span>⚠️</span>
          <div>
            <div class="mon-error-title">Error al cargar</div>
            <div class="mon-error-msg">{{ error }}</div>
          </div>
          <button class="mon-btn-outline" @click="cargar">Reintentar</button>
        </div>
        <div v-else-if="!fallasFiltradas.length" class="mon-empty">
          <div class="mon-empty-icon">⚡</div>
          <p class="mon-empty-title">{{ hayFiltros ? 'Sin resultados' : 'Sin fallas registradas' }}</p>
          <p class="mon-empty-sub">{{ hayFiltros ? 'Intenta con otros filtros' : 'El sistema opera sin incidencias activas' }}</p>
          <button v-if="hayFiltros" class="mon-btn-clear" style="margin-top:12px" @click="limpiarFiltros">✕ Limpiar filtros</button>
        </div>
        <table v-else class="mon-table">
          <thead>
            <tr>
              <th>Código</th><th>Proyecto</th><th>Categoría / Tipo</th>
              <th>Estado</th><th>Prioridad</th><th>Identificada</th>
              <th>SLA</th><th>Asignado a</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in fallasFiltradas" :key="f.id" class="mon-row" @click="irDetalle(f.id)">
              <td class="td-codigo">{{ f.codigo_interno }}</td>
              <td class="td-proyecto">{{ f.proyecto?.nombre_comercial || '—' }}</td>
              <td class="td-tipo">
                <span v-if="f.tipo?.categoria" class="cat-tag" :style="catStyle(f.tipo.categoria.color_hex)">
                  {{ f.tipo.categoria.etiqueta }}
                </span>
                <div class="tipo-sub">{{ f.tipo?.etiqueta || '—' }}</div>
              </td>
              <td>
                <span class="estado-pill" :style="pillStyle(f.estado?.color_hex)">
                  {{ f.estado?.etiqueta || '—' }}
                </span>
              </td>
              <td>
                <span class="prio-pill" :class="'prio-' + (f.prioridad?.nivel || 4)">
                  {{ f.prioridad?.etiqueta || '—' }}
                </span>
              </td>
              <td class="td-fecha">{{ fmtFecha(f.fecha_identificacion) }}</td>
              <td>
                <span v-if="f.sla_cumplido === true"       class="sla sla-ok">✓ OK</span>
                <span v-else-if="f.sla_cumplido === false" class="sla sla-fail">Vencido</span>
                <span v-else-if="slaRisk(f)"               class="sla sla-warn">En riesgo</span>
                <span v-else class="td-dash">—</span>
              </td>
              <td class="td-asig">
                <span v-if="f.asignado_a">{{ f.asignado_a.nombre }}</span>
                <span v-else class="td-dash">Sin asignar</span>
              </td>
              <td class="td-arrow" @click.stop>
                <button class="arrow-btn" @click="irDetalle(f.id)">→</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Dialog nueva falla -->
      <Dialog v-model:visible="showDialog" header="Registrar nueva falla" modal
              class="w-full max-w-2xl" :closable="!saving">
        <FallaForm :catalogos="catalogos" @save="onCreate" @cancel="showDialog = false" />
      </Dialog>

    </template><!-- /TAB 0 -->

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: GENERACIÓN                                                 -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 1" class="mon-tab-view">

      <!-- Filtros generación -->
      <div class="gen-header">
        <div class="gen-filters-row">
          <!-- Selector de proyectos -->
          <div class="gen-project-selector" ref="genSelectorRef">
            <label class="mon-filter-label">Proyectos a comparar</label>
            <div class="gen-input-wrap">
              <input v-model="genBuscarProyecto" type="text" class="mon-input"
                     placeholder="Buscar y seleccionar proyecto…"
                     @focus="genDropdownOpen = true"
                     @blur="cerrarDropdownGen" />
              <span v-if="genSeleccionados.length" class="gen-sel-count">{{ genSeleccionados.length }}</span>
            </div>
            <div v-if="genDropdownOpen && genProyectosOpciones.length" class="gen-dropdown">
              <div v-for="p in genProyectosOpciones" :key="p.nombre_comercial"
                   class="gen-dropdown-item"
                   :class="{ 'gen-dropdown-item--sel': genSeleccionados.includes(p.nombre_comercial) }"
                   @mousedown.prevent="toggleGenProyecto(p.nombre_comercial)">
                <span class="gen-check">{{ genSeleccionados.includes(p.nombre_comercial) ? '✓' : '' }}</span>
                <span class="gen-dropdown-name">{{ p.nombre_comercial }}</span>
                <span v-if="genMWhProyecto(p.nombre_comercial) != null" class="gen-dropdown-mwh">
                  {{ genMWhProyecto(p.nombre_comercial).toFixed(1) }} MWh
                </span>
              </div>
            </div>
          </div>

          <!-- Filtro días -->
          <div>
            <label class="mon-filter-label">Período</label>
            <div class="gen-days-btns">
              <button v-for="d in [7, 30, 90]" :key="d"
                      class="gen-day-btn" :class="{ active: genDias === d }"
                      @click="cambiarDias(d)">
                {{ d }}d
              </button>
            </div>
          </div>

          <!-- KPI total rápido -->
          <div class="gen-quick-kpi" v-if="genHistorial.length">
            <div class="gen-quick-kpi-val">{{ genTotalMWh.toFixed(1) }}</div>
            <div class="gen-quick-kpi-lbl">MWh flota ({{ genDias }}d)</div>
          </div>
          <div class="gen-quick-kpi" style="color:#10B981" v-if="genFlota.online">
            <div class="gen-quick-kpi-val" style="color:#10B981">{{ genFlota.online }}</div>
            <div class="gen-quick-kpi-lbl">Online ahora</div>
          </div>
        </div>

        <!-- Tags proyectos seleccionados -->
        <div v-if="genSeleccionados.length" class="gen-tags-row">
          <span v-for="name in genSeleccionados" :key="name" class="gen-tag">
            {{ name }}
            <button @click="toggleGenProyecto(name)">×</button>
          </span>
          <button class="mon-btn-clear" @click="genSeleccionados = []">✕ Limpiar selección</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="genLoading" class="mon-tab-loading">
        <div class="mon-spinner" /><span>Cargando datos de generación…</span>
      </div>

      <!-- Error -->
      <div v-else-if="genError" class="mon-error" style="margin: 0 0 20px">
        <span>⚠️</span>
        <div><div class="mon-error-title">Error</div><div class="mon-error-msg">{{ genError }}</div></div>
        <button class="mon-btn-outline" @click="cargarGeneracion">Reintentar</button>
      </div>

      <!-- Sin datos -->
      <div v-else-if="!genHistorial.length" class="mon-tab-empty">
        <div class="mon-empty-icon">☀️</div>
        <p class="mon-empty-title">Sin datos de generación</p>
        <p class="mon-empty-sub">No se obtuvieron datos del sistema de monitoreo</p>
      </div>

      <!-- Tabla de generación -->
      <template v-else>
        <div class="gen-table-card">
          <div class="gen-table-card-header">
            <div>
              <h3 class="gen-table-title">
                {{ genSeleccionados.length
                  ? `Comparación de proyectos — últimos ${genDias} días`
                  : `Ranking de generación — últimos ${genDias} días` }}
              </h3>
              <p class="gen-table-sub">{{ genDatosFiltrados.length }} proyecto{{ genDatosFiltrados.length !== 1 ? 's' : '' }}
                {{ genSeleccionados.length ? 'seleccionados' : 'en flota' }}</p>
            </div>
            <div v-if="genSeleccionados.length && genP90CumpleCount !== null" class="gen-p90-summary">
              <span class="gen-p90-badge" :class="genP90CumpleCount === genSeleccionados.length ? 'gen-p90-ok' : 'gen-p90-warn'">
                {{ genP90CumpleCount }}/{{ genSeleccionados.length }} cumplen P90
              </span>
            </div>
          </div>

          <!-- Gráfico de barras comparativo -->
          <div v-if="genDatosFiltrados.length" class="gen-bar-viz">
            <div v-for="row in genDatosFiltrados.slice(0, 20)" :key="row.name" class="gen-viz-row">
              <div class="gen-viz-label" :title="row.name">{{ row.name }}</div>
              <div class="gen-viz-track">
                <div class="gen-viz-fill"
                     :style="{ width: genBarWidth(row.mwh) + '%', background: genBarColor(row) }" />
                <span class="gen-viz-val">{{ row.mwh.toFixed(2) }} MWh</span>
              </div>
              <div class="gen-viz-badges">
                <span v-if="row.pct_p90 !== null"
                      class="gen-p90-badge gen-p90-sm"
                      :class="row.pct_p90 >= 100 ? 'gen-p90-ok' : row.pct_p90 >= 80 ? 'gen-p90-warn' : 'gen-p90-fail'">
                  P90: {{ row.pct_p90 }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Tabla detallada -->
          <table class="gen-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>MWh generados</th>
                <th>Cap. (kWp)</th>
                <th>Rendimiento</th>
                <th>P90 / mes</th>
                <th>Cumplimiento P90</th>
                <th>Días con datos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in genConP90" :key="row.name" class="gen-row">
                <td class="gen-td-nombre">{{ row.name }}</td>
                <td>
                  <span class="gen-mwh-val">{{ row.mwh.toFixed(3) }}</span>
                </td>
                <td>{{ row.capacity_kwp ? row.capacity_kwp.toLocaleString('es-CO') : '—' }}</td>
                <td>
                  <span v-if="row.capacity_kwp && row.mwh" class="gen-rendimiento">
                    {{ ((row.mwh * 1000) / row.capacity_kwp).toFixed(2) }} kWh/kWp
                  </span>
                  <span v-else class="td-dash">—</span>
                </td>
                <td>
                  <span v-if="row.p90_kwh" class="gen-p90-ref">
                    {{ (row.p90_kwh / 1000).toFixed(2) }} MWh
                  </span>
                  <span v-else class="td-dash">—</span>
                </td>
                <td>
                  <span v-if="row.pct_p90 !== null"
                        class="gen-p90-badge"
                        :class="row.pct_p90 >= 100 ? 'gen-p90-ok' : row.pct_p90 >= 80 ? 'gen-p90-warn' : 'gen-p90-fail'">
                    {{ row.pct_p90 }}%
                  </span>
                  <span v-else class="td-dash">—</span>
                </td>
                <td>{{ row.days_with_data ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: GRÁFICOS                                                   -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 2" class="mon-tab-view">
      <div v-if="loading" class="mon-tab-loading">
        <div class="mon-spinner" /><span>Cargando datos…</span>
      </div>
      <div v-else-if="!todasLasFallas.length" class="mon-tab-empty">
        <div class="mon-empty-icon">📊</div>
        <p class="mon-empty-title">Sin datos de fallas</p>
        <p class="mon-empty-sub">No hay registros para generar gráficos</p>
      </div>
      <div v-else>

        <!-- Filtro y badge -->
        <div class="chart-filters">
          <div class="mon-filter-field">
            <label class="mon-filter-label">Filtrar por proyecto</label>
            <select v-model="filtroGraficosProyecto" class="mon-select">
              <option value="">Todos los proyectos</option>
              <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
            </select>
          </div>
          <div class="chart-total-badge">
            <span class="chart-total-num">{{ fallasFiltGraficos.length }}</span>
            <span class="chart-total-lbl">fallas analizadas</span>
          </div>
          <!-- KPIs rápidos gráficos -->
          <div class="chart-kpi-mini">
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#dc2626">{{ grafKpis.criticas }}</div>
              <div class="chart-kpi-mini-lbl">Críticas</div>
            </div>
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#2563eb">{{ grafKpis.resueltas }}</div>
              <div class="chart-kpi-mini-lbl">Resueltas</div>
            </div>
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#16a34a">{{ grafKpis.tasaResolucion }}%</div>
              <div class="chart-kpi-mini-lbl">Tasa resolución</div>
            </div>
            <div class="chart-kpi-mini-item">
              <div class="chart-kpi-mini-val" style="color:#7c3aed">{{ grafKpis.avgDias }}</div>
              <div class="chart-kpi-mini-lbl">Días prom. abierta</div>
            </div>
          </div>
        </div>

        <!-- Proyecto con más fallas -->
        <div v-if="!filtroGraficosProyecto && topProyecto" class="top-proyecto-card">
          <div class="top-proy-icon">🏆</div>
          <div class="top-proy-body">
            <div class="top-proy-label">Proyecto con más fallas</div>
            <div class="top-proy-name">{{ topProyecto.label }}</div>
          </div>
          <div class="top-proy-count">
            <div class="top-proy-num">{{ topProyecto.count }}</div>
            <div class="top-proy-sub">fallas registradas</div>
          </div>
          <div class="top-proy-bar-wrap">
            <div class="top-proy-bar" style="width:100%"></div>
          </div>
        </div>

        <div class="charts-grid">

          <!-- Donut: por estado -->
          <div class="chart-card">
            <div class="chart-title">Distribución por estado</div>
            <div class="donut-wrap">
              <svg viewBox="0 0 42 42" class="donut-svg">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0eaf8" stroke-width="4"/>
                <circle v-for="(seg, i) in donutEstado" :key="i"
                  cx="21" cy="21" r="15.9" fill="none"
                  :stroke="seg.color" stroke-width="4"
                  :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                  :stroke-dashoffset="seg.offset"
                  stroke-linecap="round"
                  transform="rotate(-90 21 21)" />
              </svg>
              <div class="donut-total">
                <div class="donut-total-num">{{ fallasFiltGraficos.length }}</div>
                <div class="donut-total-lbl">total</div>
              </div>
            </div>
            <div class="donut-legend">
              <div v-for="seg in donutEstado" :key="seg.label" class="legend-row">
                <span class="legend-dot" :style="{ background: seg.color }"></span>
                <span class="legend-label">{{ seg.label }}</span>
                <span class="legend-val">{{ seg.count }}</span>
                <span class="legend-pct">{{ Math.round(seg.pct) }}%</span>
              </div>
            </div>
          </div>

          <!-- Donut: por prioridad -->
          <div class="chart-card">
            <div class="chart-title">Distribución por prioridad</div>
            <div class="donut-wrap">
              <svg viewBox="0 0 42 42" class="donut-svg">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0eaf8" stroke-width="4"/>
                <circle v-for="(seg, i) in donutPrioridad" :key="i"
                  cx="21" cy="21" r="15.9" fill="none"
                  :stroke="seg.color" stroke-width="4"
                  :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                  :stroke-dashoffset="seg.offset"
                  stroke-linecap="round"
                  transform="rotate(-90 21 21)" />
              </svg>
              <div class="donut-total">
                <div class="donut-total-num">{{ fallasFiltGraficos.length }}</div>
                <div class="donut-total-lbl">total</div>
              </div>
            </div>
            <div class="donut-legend">
              <div v-for="seg in donutPrioridad" :key="seg.label" class="legend-row">
                <span class="legend-dot" :style="{ background: seg.color }"></span>
                <span class="legend-label">{{ seg.label }}</span>
                <span class="legend-val">{{ seg.count }}</span>
                <span class="legend-pct">{{ Math.round(seg.pct) }}%</span>
              </div>
            </div>
          </div>

          <!-- Barras: por categoría -->
          <div class="chart-card" v-if="fallasPorCategoria.length">
            <div class="chart-title">Fallas por categoría</div>
            <div class="bar-chart">
              <div v-for="g in fallasPorCategoria" :key="g.label" class="bar-row">
                <div class="bar-label">{{ g.label }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (g.count / barMax * 100) + '%', background: g.color || '#915BD8' }" />
                </div>
                <div class="bar-val">{{ g.count }}</div>
              </div>
            </div>
          </div>

          <!-- Timeline: fallas por mes -->
          <div class="chart-card chart-card--wide" v-if="fallasPorMes.length > 1">
            <div class="chart-card-header">
              <div class="chart-title" style="margin-bottom:0">Evolución mensual de fallas</div>
              <div class="chart-subtitle">Últimos 12 meses</div>
            </div>
            <div class="timeline-chart">
              <div class="timeline-bars">
                <div v-for="m in fallasPorMes" :key="m.key" class="tl-col">
                  <div class="tl-bar-wrap">
                    <div class="tl-bar"
                         :style="{ height: (m.count / timelineMax * 100) + '%' }"
                         :title="`${m.label}: ${m.count} fallas`">
                      <span class="tl-bar-val" v-if="m.count > 0">{{ m.count }}</span>
                    </div>
                  </div>
                  <div class="tl-label">{{ m.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Barras: top proyectos con más fallas -->
          <div class="chart-card chart-card--wide" v-if="!filtroGraficosProyecto && fallasPorProyecto.length">
            <div class="chart-title">Top proyectos con más fallas</div>
            <div class="bar-chart">
              <div v-for="g in fallasPorProyecto.slice(0, 10)" :key="g.label" class="bar-row">
                <div class="bar-label">{{ g.label }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (g.count / fallasPorProyecto[0].count * 100) + '%', background: '#915BD8' }" />
                </div>
                <div class="bar-val">{{ g.count }}</div>
              </div>
            </div>
          </div>

          <!-- Heatmap tipo de falla -->
          <div class="chart-card chart-card--wide" v-if="fallasPorTipo.length">
            <div class="chart-title">Top tipos de falla</div>
            <div class="bar-chart">
              <div v-for="g in fallasPorTipo.slice(0, 8)" :key="g.label" class="bar-row">
                <div class="bar-label">{{ g.label }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (g.count / fallasPorTipo[0].count * 100) + '%', background: '#3b82f6' }" />
                </div>
                <div class="bar-val">{{ g.count }}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: CLIENTES                                                   -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 3" class="mon-tab-view" style="padding: 0; overflow: hidden;">
      <div class="cli-layout">

        <!-- Panel izquierdo: lista de clientes -->
        <div class="cli-panel-list">
          <div class="cli-search-area">
            <input v-model="clienteBuscar" type="text" class="mon-input"
                   placeholder="🔍 Buscar cliente…" />
            <label class="cli-toggle-label">
              <input type="checkbox" v-model="clienteSoloConProyectos" />
              <span>Solo con proyectos</span>
            </label>
          </div>

          <div v-if="clientesLoading" class="mon-tab-loading" style="padding: 40px 20px">
            <div class="mon-spinner" />
          </div>
          <div v-else-if="!clientesFiltrados.length" class="mon-tab-empty" style="padding: 40px 20px">
            <p class="mon-empty-title">Sin clientes</p>
            <p class="mon-empty-sub">Prueba otro filtro</p>
          </div>
          <div v-else class="cli-list">
            <div v-for="c in clientesFiltrados" :key="c.id"
                 class="cli-card"
                 :class="{ 'cli-card--active': clienteSeleccionado?.id === c.id }"
                 @click="seleccionarCliente(c)">
              <div class="cli-card-avatar">
                {{ (c.nombre || c.razon_social || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="cli-card-body">
                <div class="cli-card-nombre">{{ c.nombre || c.razon_social || '—' }}</div>
                <div class="cli-card-sub">{{ proyectosPorClienteId(c.id).length }} proyecto(s)</div>
              </div>
              <div v-if="genMWhParaCliente(c.id) > 0" class="cli-card-gen">
                <span class="cli-gen-num">{{ genMWhParaCliente(c.id).toFixed(1) }}</span>
                <span class="cli-gen-unit">MWh</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel derecho: detalle cliente -->
        <div class="cli-panel-detail">
          <!-- Estado vacío -->
          <div v-if="!clienteSeleccionado" class="cli-detail-empty">
            <div class="mon-empty-icon">🏢</div>
            <p class="mon-empty-title">Selecciona un cliente</p>
            <p class="mon-empty-sub">Haz clic en un cliente para ver su generación por proyecto</p>
          </div>

          <template v-else>
            <!-- Header cliente -->
            <div class="cli-detail-header">
              <div class="cli-detail-avatar">
                {{ (clienteSeleccionado.nombre || clienteSeleccionado.razon_social || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="cli-detail-info">
                <h2 class="cli-detail-nombre">{{ clienteSeleccionado.nombre || clienteSeleccionado.razon_social }}</h2>
                <p class="cli-detail-sub">{{ proyectosCliente.length }} proyecto(s) activos</p>
              </div>
              <button class="mon-btn-outline" @click="clienteSeleccionado = null" style="margin-left: auto">
                ✕ Cerrar
              </button>
            </div>

            <!-- KPIs del cliente -->
            <div class="cli-kpis">
              <div class="cli-kpi">
                <div class="cli-kpi-val">{{ proyectosCliente.length }}</div>
                <div class="cli-kpi-lbl">Proyectos</div>
              </div>
              <div class="cli-kpi">
                <div class="cli-kpi-val" style="color:#D4A017">
                  {{ generacionCliente.reduce((s, r) => s + (r.mwh || 0), 0).toFixed(2) }}
                </div>
                <div class="cli-kpi-lbl">MWh ({{ genDias }}d)</div>
              </div>
              <div class="cli-kpi">
                <div class="cli-kpi-val" style="color:#915BD8">
                  {{ proyectosCliente.reduce((s, p) => s + (p.capacidad_kwp || 0), 0).toLocaleString('es-CO') }}
                </div>
                <div class="cli-kpi-lbl">kWp total</div>
              </div>
              <div class="cli-kpi">
                <div class="cli-kpi-val" style="color:#dc2626">
                  {{ fallasPorClienteId(clienteSeleccionado.id) }}
                </div>
                <div class="cli-kpi-lbl">Fallas activas</div>
              </div>
            </div>

            <!-- Tabla proyectos del cliente -->
            <div v-if="proyectosCliente.length" class="cli-table-wrap">
              <table class="gen-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Capacidad (kWp)</th>
                    <th>MWh ({{ genDias }}d)</th>
                    <th>Rendimiento</th>
                    <th>P90 mensual</th>
                    <th>Cumplimiento P90</th>
                    <th>Fallas activas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in proyectosCliente" :key="p.id" class="gen-row">
                    <td class="gen-td-nombre">{{ p.nombre_comercial }}</td>
                    <td>{{ p.capacidad_kwp ? p.capacidad_kwp.toLocaleString('es-CO') : '—' }}</td>
                    <td>
                      <span class="gen-mwh-val">
                        {{ genMWhProyecto(p.nombre_comercial) != null
                          ? genMWhProyecto(p.nombre_comercial).toFixed(3)
                          : '—' }}
                      </span>
                    </td>
                    <td>
                      <span v-if="p.capacidad_kwp && genMWhProyecto(p.nombre_comercial)" class="gen-rendimiento">
                        {{ ((genMWhProyecto(p.nombre_comercial) * 1000) / p.capacidad_kwp).toFixed(2) }} kWh/kWp
                      </span>
                      <span v-else class="td-dash">—</span>
                    </td>
                    <td>
                      <span v-if="p.p90_mensual" class="gen-p90-ref">
                        {{ (p.p90_mensual / 1000).toFixed(2) }} MWh
                      </span>
                      <span v-else class="td-dash">—</span>
                    </td>
                    <td>
                      <span v-if="p.p90_mensual && genMWhProyecto(p.nombre_comercial) != null"
                            class="gen-p90-badge"
                            :class="cumpleP90Pct(p, genDias) >= 100 ? 'gen-p90-ok' : cumpleP90Pct(p, genDias) >= 80 ? 'gen-p90-warn' : 'gen-p90-fail'">
                        {{ cumpleP90Pct(p, genDias) }}%
                      </span>
                      <span v-else class="td-dash">—</span>
                    </td>
                    <td>
                      <span v-if="fallasPorProyectoId(p.id) > 0"
                            class="sla sla-fail">{{ fallasPorProyectoId(p.id) }}</span>
                      <span v-else class="sla sla-ok">0</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="mon-tab-empty">
              <p class="mon-empty-sub">Este cliente no tiene proyectos registrados en la plataforma</p>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 4: INFORMES                                                   -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeTab === 4" class="mon-tab-view">

      <!-- Panel crear informe -->
      <div class="inf-create-panel" :class="{ 'inf-create-panel--open': showCrearInforme }">
        <div class="inf-create-toggle" @click="showCrearInforme = !showCrearInforme">
          <div class="inf-create-toggle-left">
            <span class="inf-create-icon">📋</span>
            <span class="inf-create-toggle-label">Crear nuevo informe</span>
          </div>
          <span class="inf-create-chevron">{{ showCrearInforme ? '▲' : '▼' }}</span>
        </div>
        <div v-if="showCrearInforme" class="inf-create-body">
          <div class="inf-form-row">
            <div class="inf-form-field inf-form-field--wide">
              <label class="inf-form-label">Proyecto</label>
              <select v-model="crearForm.proyectoId" class="mon-select">
                <option value="">Seleccionar proyecto…</option>
                <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
              </select>
            </div>
            <div class="inf-form-field">
              <label class="inf-form-label">Tipo</label>
              <select v-model="crearForm.tipo" class="mon-select">
                <option value="fmo">FMO</option>
                <option value="operaciones">Operaciones</option>
              </select>
            </div>
            <div class="inf-form-field">
              <label class="inf-form-label">Mes</label>
              <select v-model="crearForm.mes" class="mon-select">
                <option v-for="(m, i) in MESES" :key="i + 1" :value="i + 1">{{ m }}</option>
              </select>
            </div>
            <div class="inf-form-field">
              <label class="inf-form-label">Año</label>
              <select v-model="crearForm.anio" class="mon-select">
                <option v-for="y in ANIOS" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>
          <div class="inf-form-footer">
            <div v-if="crearForm.proyectoId" class="inf-form-preview">
              <span class="inf-tipo-badge" :class="'inf-tipo-' + crearForm.tipo">{{ crearForm.tipo.toUpperCase() }}</span>
              {{ proyectos.find(p => p.id === crearForm.proyectoId)?.nombre_comercial }}
              · {{ MESES[crearForm.mes - 1] }} {{ crearForm.anio }}
            </div>
            <button class="mon-btn mon-btn-primary" :disabled="creando || !crearForm.proyectoId" @click="crearInforme">
              <span v-if="creando" class="spin">↻</span>
              {{ creando ? 'Creando…' : '+ Crear informe' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de informes -->
      <div class="inf-list-section">
        <div class="inf-list-header">
          <h3 class="inf-list-title">Informes generados</h3>
          <button class="mon-btn-outline" @click="cargarInformes(true)">↻ Actualizar</button>
        </div>
        <div v-if="informesLoading" class="mon-tab-loading">
          <div class="mon-spinner" /><span>Cargando informes…</span>
        </div>
        <div v-else-if="informesError" class="mon-error" style="margin:0 0 16px">
          <span>⚠️</span>
          <div><div class="mon-error-title">Error al cargar</div><div class="mon-error-msg">{{ informesError }}</div></div>
          <button class="mon-btn-outline" @click="cargarInformes(true)">Reintentar</button>
        </div>
        <div v-else-if="!informes.length" class="inf-empty">
          <div class="mon-empty-icon">📋</div>
          <p class="mon-empty-title">No hay informes generados</p>
          <p class="mon-empty-sub">Usa el botón "Crear informe" para generar el primero</p>
        </div>
        <div v-else class="inf-list">
          <div v-for="inf in informes" :key="inf.id" class="inf-row" @click="router.push(`/informes/${inf.id}`)">
            <div class="inf-row-left">
              <span class="inf-tipo-badge" :class="'inf-tipo-' + (inf.tipo || 'fmo')">
                {{ (inf.tipo || 'fmo').toUpperCase() }}
              </span>
              <div class="inf-row-info">
                <div class="inf-row-nombre">{{ inf.proyecto_nombre || '—' }}</div>
                <div class="inf-row-periodo">{{ inf.periodo_display || fmtPeriodo(inf.periodo_desde) }}</div>
              </div>
            </div>
            <div class="inf-row-right">
              <span class="inf-estado-badge" :class="'inf-estado-' + (inf.estado || 'borrador')">
                {{ { borrador: 'Borrador', revisado: 'Revisado', aprobado: 'Aprobado' }[inf.estado] || inf.estado }}
              </span>
              <span class="inf-row-fecha">{{ fmtFechaCorta(inf.created_at) }}</span>
              <span class="inf-row-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import FallaForm from './FallaForm.vue'
import api from '@/api/client'

// ── Tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { label: 'Fallas',     icon: '⚡' },
  { label: 'Generación', icon: '☀️' },
  { label: 'Gráficos',   icon: '📊' },
  { label: 'Clientes',   icon: '🏢' },
  { label: 'Informes',   icon: '📋' },
]
const activeTab = ref(0)

// ── Constantes informes ────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const _now   = new Date()
const ANIOS  = [_now.getFullYear() - 1, _now.getFullYear(), _now.getFullYear() + 1].filter(y => y >= 2024)

const router = useRouter()
const toast  = useToast()

// ════════════════════════════════════════════════════════════
// TAB 0 — FALLAS
// ════════════════════════════════════════════════════════════
const todasLasFallas = ref([])
const loading         = ref(false)
const error           = ref(null)
const saving          = ref(false)
const showDialog      = ref(false)
const catalogos       = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos       = ref([])

const buscar          = ref('')
const filtroEstado    = ref('')
const filtroPrioridad = ref('')
const filtroProyecto  = ref('')

const hayFiltros = computed(() =>
  buscar.value || filtroEstado.value || filtroPrioridad.value || filtroProyecto.value
)

const kpis = computed(() => ({
  abierta:    todasLasFallas.value.filter(f => f.estado?.codigo === 'abierta').length,
  en_gestion: todasLasFallas.value.filter(f => f.estado?.codigo === 'en_gestion').length,
  en_espera:  todasLasFallas.value.filter(f => f.estado?.codigo === 'en_espera').length,
  critica:    todasLasFallas.value.filter(f => f.prioridad?.codigo === 'critica').length,
}))

const fallasFiltradas = computed(() =>
  todasLasFallas.value.filter(f => {
    const q = buscar.value.toLowerCase().trim()
    if (q && !(
      (f.codigo_interno || '').toLowerCase().includes(q) ||
      (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q) ||
      (f.descripcion || '').toLowerCase().includes(q) ||
      (f.tipo?.etiqueta || '').toLowerCase().includes(q)
    )) return false
    if (filtroEstado.value    && f.estado?.codigo    !== filtroEstado.value)    return false
    if (filtroPrioridad.value && f.prioridad?.codigo !== filtroPrioridad.value) return false
    if (filtroProyecto.value  && f.proyecto?.id      !== filtroProyecto.value)  return false
    return true
  })
)

// Carga TODAS las fallas (sin excluir ninguna, incluidas cerradas)
async function cargar() {
  loading.value = true
  error.value   = null
  try {
    const { data: primera } = await api.get('/fallas', { params: { page: 1, size: 500 } })
    const total = primera.total ?? 0
    const items = [...(primera.items ?? [])]

    if (total > 500) {
      const totalPages = Math.ceil(total / 500)
      const restResults = await Promise.allSettled(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/fallas', { params: { page: i + 2, size: 500 } })
        )
      )
      for (const r of restResults) {
        if (r.status === 'fulfilled') items.push(...(r.value.data.items ?? []))
      }
    }
    todasLasFallas.value = items
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    loading.value = false
  }
}

async function cargarCatalogos() {
  try {
    const { data } = await api.get('/fallas/catalogos')
    catalogos.value = data
  } catch { /* no crítico */ }
}

async function cargarProyectos() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    proyectos.value = data.items ?? []
  } catch { /* no crítico */ }
}

function irDetalle(id) { router.push(`/fallas/${id}`) }

function setFiltroEstado(val) {
  filtroPrioridad.value = ''
  filtroEstado.value = filtroEstado.value === val ? '' : val
}
function setFiltroPrioridad(val) {
  filtroEstado.value = ''
  filtroPrioridad.value = filtroPrioridad.value === val ? '' : val
}
function limpiarFiltros() {
  buscar.value = ''; filtroEstado.value = ''; filtroPrioridad.value = ''; filtroProyecto.value = ''
}

async function onCreate(payload) {
  saving.value = true
  try {
    const notaInicial = payload.nota_inicial
    delete payload.nota_inicial
    const { data: nueva } = await api.post('/fallas', payload)
    if (notaInicial) await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
    showDialog.value = false
    toast.add({ severity: 'success', summary: 'Falla registrada', life: 3000 })
    await cargar()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail ?? 'Error al registrar', life: 4000 })
  } finally {
    saving.value = false
  }
}

// ════════════════════════════════════════════════════════════
// TAB 1 — GENERACIÓN
// ════════════════════════════════════════════════════════════
const genLoading       = ref(false)
const genError         = ref(null)
const genHistorial     = ref([])   // [{name, mwh, capacity_kwp, days_with_data, last_date}]
const genFlota         = ref({})
const genDias          = ref(30)
const genSeleccionados = ref([])   // nombres de proyectos seleccionados
const genBuscarProyecto = ref('')
const genDropdownOpen  = ref(false)

// Opciones del selector usan `proyectos` (disponible desde el inicio, sin esperar API generación)
const genProyectosOpciones = computed(() => {
  const q = genBuscarProyecto.value.toLowerCase()
  return proyectos.value
    .filter(p => !q || (p.nombre_comercial || '').toLowerCase().includes(q))
    .slice(0, 50)
})

const genTotalMWh = computed(() =>
  genHistorial.value.reduce((s, h) => s + (h.mwh || 0), 0)
)

const genDatosFiltrados = computed(() => {
  if (!genSeleccionados.value.length) {
    return [...genHistorial.value].sort((a, b) => b.mwh - a.mwh)
  }
  return genHistorial.value.filter(h => genSeleccionados.value.includes(h.name))
})

// Enriquecer con P90 desde proyectos de la plataforma
const genConP90 = computed(() =>
  genDatosFiltrados.value.map(h => {
    const p = proyectos.value.find(proj =>
      (proj.nombre_comercial || '').toLowerCase() === (h.name || '').toLowerCase()
    )
    const p90_kwh = p?.p90_mensual ?? null
    // P90 prorated: mensual * (días / 30)
    const p90_esperado = p90_kwh ? p90_kwh * (genDias.value / 30) : null
    const kwh_actual   = h.mwh * 1000
    const pct_p90 = p90_esperado ? Math.round(kwh_actual / p90_esperado * 100) : null
    return { ...h, p90_kwh, pct_p90 }
  })
)

const genP90CumpleCount = computed(() => {
  const con_p90 = genConP90.value.filter(r => r.pct_p90 !== null)
  if (!con_p90.length) return null
  return con_p90.filter(r => r.pct_p90 >= 100).length
})

const genMaxMwh = computed(() =>
  Math.max(...genDatosFiltrados.value.map(h => h.mwh), 1)
)

function genBarWidth(mwh) {
  return Math.max(2, (mwh / genMaxMwh.value) * 100)
}

function genBarColor(row) {
  if (row.pct_p90 === null) return '#915BD8'
  if (row.pct_p90 >= 100) return '#10B981'
  if (row.pct_p90 >= 80)  return '#F0C040'
  return '#D64455'
}

function toggleGenProyecto(name) {
  const idx = genSeleccionados.value.indexOf(name)
  if (idx >= 0) genSeleccionados.value.splice(idx, 1)
  else genSeleccionados.value.push(name)
  genBuscarProyecto.value = ''
  genDropdownOpen.value = false
}

function cerrarDropdownGen() {
  setTimeout(() => { genDropdownOpen.value = false }, 200)
}

async function cambiarDias(dias) {
  genDias.value = dias
  await cargarGeneracion()
}

async function cargarGeneracion() {
  genLoading.value = true
  genError.value   = null
  try {
    const [histRes, fleetRes] = await Promise.allSettled([
      api.get('/generacion-solar/fleet/history/by-project', { params: { days: genDias.value } }),
      api.get('/generacion-solar/fleet'),
    ])
    if (histRes.status === 'fulfilled') genHistorial.value = histRes.value.data ?? []
    if (fleetRes.status === 'fulfilled') genFlota.value    = fleetRes.value.data ?? {}
  } catch (e) {
    genError.value = e.message || 'Error cargando generación'
  } finally {
    genLoading.value = false
  }
}

// ════════════════════════════════════════════════════════════
// TAB 2 — GRÁFICOS
// ════════════════════════════════════════════════════════════
const filtroGraficosProyecto = ref('')

const fallasFiltGraficos = computed(() => {
  if (!filtroGraficosProyecto.value) return todasLasFallas.value
  return todasLasFallas.value.filter(f => f.proyecto?.id === filtroGraficosProyecto.value)
})

function groupBy(arr, keyFn, colorFn, labelFn) {
  const g = {}
  for (const f of arr) {
    const k = keyFn(f) || 'Sin dato'
    if (!g[k]) g[k] = { label: labelFn ? labelFn(f) : k, color: colorFn ? colorFn(f) : '#915BD8', count: 0 }
    g[k].count++
  }
  return Object.values(g).sort((a, b) => b.count - a.count)
}

const fallasPorCategoria = computed(() =>
  groupBy(fallasFiltGraficos.value,
    f => f.tipo?.categoria?.etiqueta,
    f => f.tipo?.categoria?.color_hex || '#915BD8')
)
const fallasPorProyecto = computed(() =>
  groupBy(todasLasFallas.value, f => f.proyecto?.nombre_comercial)
)
const fallasPorTipo = computed(() =>
  groupBy(fallasFiltGraficos.value, f => f.tipo?.etiqueta)
)
const topProyecto = computed(() => fallasPorProyecto.value[0] || null)
const barMax      = computed(() => Math.max(...fallasPorCategoria.value.map(g => g.count), 1))

// KPIs gráficos
const grafKpis = computed(() => {
  const arr = fallasFiltGraficos.value
  const resueltas = arr.filter(f => f.sla_cumplido === true || f.estado?.codigo === 'cerrada').length
  const criticas  = arr.filter(f => f.prioridad?.codigo === 'critica').length
  const tasa      = arr.length ? Math.round(resueltas / arr.length * 100) : 0
  const conDias   = arr.filter(f => f.dias_abierta != null)
  const avg       = conDias.length ? Math.round(conDias.reduce((s, f) => s + f.dias_abierta, 0) / conDias.length) : 0
  return { criticas, resueltas, tasaResolucion: tasa, avgDias: avg }
})

const PRIO_COLORS = { critica: '#dc2626', alta: '#ea580c', media: '#d97706', baja: '#6b7280' }

function buildDonut(arr, keyFn, colorFn) {
  const segments = groupBy(arr, keyFn, colorFn)
  const total = segments.reduce((s, g) => s + g.count, 0)
  if (!total) return []
  let offset = 25
  return segments.map(seg => {
    const pct = (seg.count / total) * 100
    const out = { ...seg, pct, offset: 100 - offset }
    offset += pct
    return out
  })
}

const donutEstado = computed(() =>
  buildDonut(fallasFiltGraficos.value, f => f.estado?.etiqueta, f => f.estado?.color_hex || '#915BD8')
)
const donutPrioridad = computed(() =>
  buildDonut(fallasFiltGraficos.value, f => f.prioridad?.etiqueta, f => PRIO_COLORS[f.prioridad?.codigo] || '#915BD8')
)

const fallasPorMes = computed(() => {
  const g = {}
  for (const f of fallasFiltGraficos.value) {
    if (!f.fecha_identificacion) continue
    const key = f.fecha_identificacion.slice(0, 7)
    g[key] = (g[key] || 0) + 1
  }
  return Object.entries(g)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([key, count]) => ({
      key, count,
      label: new Date(key + '-15').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    }))
})
const timelineMax = computed(() => Math.max(...fallasPorMes.value.map(m => m.count), 1))

// ════════════════════════════════════════════════════════════
// TAB 3 — CLIENTES
// ════════════════════════════════════════════════════════════
const clientes                 = ref([])
const clientesLoading          = ref(false)
const clienteBuscar            = ref('')
const clienteSoloConProyectos  = ref(false)
const clienteSeleccionado      = ref(null)

const clientesFiltrados = computed(() => {
  let list = clientes.value
  if (clienteBuscar.value) {
    const q = clienteBuscar.value.toLowerCase()
    list = list.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.razon_social || '').toLowerCase().includes(q)
    )
  }
  if (clienteSoloConProyectos.value) {
    list = list.filter(c => proyectosPorClienteId(c.id).length > 0)
  }
  return list
})

// Proyectos del cliente seleccionado
const proyectosCliente = computed(() => {
  if (!clienteSeleccionado.value) return []
  return proyectosPorClienteId(clienteSeleccionado.value.id)
})

// Generación para los proyectos del cliente seleccionado
const generacionCliente = computed(() => {
  if (!proyectosCliente.value.length || !genHistorial.value.length) return []
  const nombres = new Set(proyectosCliente.value.map(p => (p.nombre_comercial || '').toLowerCase()))
  return genHistorial.value.filter(h => nombres.has((h.name || '').toLowerCase()))
})

function proyectosPorClienteId(clienteId) {
  return proyectos.value.filter(p =>
    p.cliente_id === clienteId ||
    p.cliente?.id === clienteId
  )
}

function genMWhParaCliente(clienteId) {
  const proys = proyectosPorClienteId(clienteId)
  if (!proys.length || !genHistorial.value.length) return 0
  const nombres = new Set(proys.map(p => (p.nombre_comercial || '').toLowerCase()))
  return genHistorial.value
    .filter(h => nombres.has((h.name || '').toLowerCase()))
    .reduce((s, h) => s + (h.mwh || 0), 0)
}

function genMWhProyecto(nombre) {
  const h = genHistorial.value.find(h => (h.name || '').toLowerCase() === (nombre || '').toLowerCase())
  return h ? h.mwh : null
}

function fallasPorClienteId(clienteId) {
  const proys = new Set(proyectosPorClienteId(clienteId).map(p => p.id))
  return todasLasFallas.value.filter(f =>
    proys.has(f.proyecto?.id) &&
    f.estado?.codigo !== 'cerrada' &&
    f.sla_cumplido !== true
  ).length
}

function fallasPorProyectoId(proyectoId) {
  return todasLasFallas.value.filter(f =>
    f.proyecto?.id === proyectoId &&
    f.estado?.codigo !== 'cerrada' &&
    f.sla_cumplido !== true
  ).length
}

function cumpleP90Pct(proyecto, dias) {
  const mwh = genMWhProyecto(proyecto.nombre_comercial)
  if (mwh == null || !proyecto.p90_mensual) return null
  const kwh_actual    = mwh * 1000
  const p90_esperado  = proyecto.p90_mensual * (dias / 30)
  return Math.round(kwh_actual / p90_esperado * 100)
}

async function seleccionarCliente(c) {
  clienteSeleccionado.value = c
  // Cargar generación si no está cargada
  if (!genHistorial.value.length) cargarGeneracion()
}

async function cargarClientes() {
  clientesLoading.value = true
  try {
    const { data } = await api.get('/clientes', { params: { size: 200 } })
    clientes.value = data.items ?? (Array.isArray(data) ? data : [])
  } catch { /* no crítico */ }
  finally { clientesLoading.value = false }
}

// ════════════════════════════════════════════════════════════
// TAB 4 — INFORMES
// ════════════════════════════════════════════════════════════
const informes         = ref([])
const informesLoading  = ref(false)
const informesError    = ref(null)
const showCrearInforme = ref(false)
const creando          = ref(false)
const crearForm = ref({
  proyectoId: '',
  tipo: 'fmo',
  mes: _now.getMonth() + 1,
  anio: _now.getFullYear(),
})

async function cargarInformes(force = false) {
  if (informesLoading.value && !force) return
  informesLoading.value = true
  informesError.value   = null
  try {
    const { data } = await api.get('/informes/', { params: { limit: 200 } })
    informes.value = Array.isArray(data) ? data : (data.items ?? [])
  } catch (e) {
    informesError.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    informesLoading.value = false
  }
}

async function crearInforme() {
  const proyecto = proyectos.value.find(p => p.id === crearForm.value.proyectoId)
  if (!proyecto) return
  creando.value = true
  try {
    const firstDay = new Date(crearForm.value.anio, crearForm.value.mes - 1, 1)
    const lastDay  = new Date(crearForm.value.anio, crearForm.value.mes, 0)
    const periodo_desde   = firstDay.toISOString().split('T')[0]
    const periodo_hasta   = lastDay.toISOString().split('T')[0]
    const periodo_display = `${MESES[crearForm.value.mes - 1]} ${crearForm.value.anio}`
    // sub_project: preferir el campo solenium primero
    const sub_project = proyecto.sub_project || proyecto.solenium_id || proyecto.codigo_solenium || proyecto.nombre_comercial

    const { data: newInforme } = await api.post('/informes/', {
      tipo: crearForm.value.tipo,
      sub_project,
      periodo_desde,
      periodo_hasta,
      periodo_display,
      proyecto_nombre: proyecto.nombre_comercial,
    })
    toast.add({ severity: 'success', summary: 'Informe creado', detail: `${periodo_display} · ${proyecto.nombre_comercial}`, life: 3000 })
    showCrearInforme.value = false
    await cargarInformes(true)
    router.push(`/informes/${newInforme.id}`)
  } catch (err) {
    const detail = err?.response?.data?.detail
    const msg = Array.isArray(detail)
      ? detail.map(e => `${e.loc?.slice(-1)[0] ?? ''}: ${e.msg}`).join(' | ')
      : (detail ?? err.message ?? 'No se pudo crear el informe')
    toast.add({ severity: 'error', summary: 'Error al crear informe', detail: msg, life: 8000 })
  } finally {
    creando.value = false
  }
}

// ════════════════════════════════════════════════════════════
// HELPERS VISUALES COMPARTIDOS
// ════════════════════════════════════════════════════════════
function pillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}40` }
}
function catStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '18', color: c }
}
function slaRisk(f) {
  if (!f.sla_limite_horas || f.sla_cumplido !== null) return false
  if (!f.fecha_identificacion) return false
  const inicio    = new Date(f.fecha_identificacion + 'T00:00:00')
  const deadline  = new Date(inicio.getTime() + f.sla_limite_horas * 3_600_000)
  const remaining = (deadline - Date.now()) / 3_600_000
  return remaining > 0 && remaining < f.sla_limite_horas * 0.2
}
function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtFechaCorta(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtPeriodo(desde) {
  if (!desde) return '—'
  return new Date(desde + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

// ════════════════════════════════════════════════════════════
// WATCH + MOUNTED
// ════════════════════════════════════════════════════════════
watch(activeTab, (val) => {
  if (val === 1) {
    if (!proyectos.value.length) cargarProyectos()   // necesario para el selector
    if (!genHistorial.value.length) cargarGeneracion()
  }
  if (val === 3 && !clientes.value.length) { cargarClientes(); if (!genHistorial.value.length) cargarGeneracion() }
  if (val === 4) cargarInformes(true)
})

onMounted(() => {
  cargarProyectos()
  cargarCatalogos()
  cargar()
})
</script>

<style scoped>
/* ── Base ─────────────────────────────────────────────────────────── */
.mon-page {
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto;
  background: #f5f4f8; font-family: 'Sora', system-ui, sans-serif;
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.mon-hero {
  background: linear-gradient(135deg, #1e1530 0%, #2C2039 55%, #3a2653 100%);
  padding: 24px 32px 22px; display: flex; align-items: center;
  justify-content: space-between; gap: 16px; flex-wrap: wrap;
  border-bottom: 1px solid rgba(145,91,216,.18); flex-shrink: 0;
}
.mon-hero-title { font-size: 22px; font-weight: 800; color: #f5f0ff; margin: 0 0 3px; letter-spacing: -0.3px; }
.mon-hero-sub   { font-size: 12.5px; color: rgba(245,240,255,.45); margin: 0; }
.mon-hero-actions { display: flex; gap: 9px; flex-wrap: wrap; }

/* ── Botones ──────────────────────────────────────────────────────── */
.mon-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 8px; padding: 8px 16px;
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all .15s; white-space: nowrap; border: none;
}
.mon-btn:disabled { opacity: .45; cursor: not-allowed; }
.mon-btn-ghost { background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.18) !important; color: rgba(245,240,255,.85); }
.mon-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,.15); }
.mon-btn-primary { background: #7c3aed; border: 1px solid #6d28d9 !important; color: #fff; }
.mon-btn-primary:hover:not(:disabled) { background: #6d28d9; }
.mon-btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.mon-btn-outline {
  background: transparent; border: 1.5px solid #e5e0f0; border-radius: 8px;
  padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: #6d5a8e;
  cursor: pointer; font-family: inherit; transition: all .14s;
}
.mon-btn-outline:hover { border-color: #915BD8; color: #6d28d9; background: #f5f0ff; }

/* ── Tab bar ──────────────────────────────────────────────────────── */
.mon-tabs {
  display: flex; background: #1e1530;
  padding: 0 32px; border-bottom: 1px solid rgba(145,91,216,.22);
  flex-shrink: 0; overflow-x: auto;
}
.mon-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; font-size: 12.5px; font-weight: 600; font-family: inherit;
  color: rgba(245,240,255,.42); background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap;
  transition: color .14s, border-color .14s; margin-bottom: -1px;
}
.mon-tab:hover:not(.mon-tab--active) { color: rgba(245,240,255,.72); }
.mon-tab--active { color: #f5f0ff; border-bottom-color: #915BD8; }
.mon-tab-icon { font-size: 14px; }
@media (max-width: 768px) { .mon-tabs { padding-left: 12px; } .mon-tab { padding: 10px 12px; } }

/* ── KPIs fallas ──────────────────────────────────────────────────── */
.mon-kpis {
  display: grid; grid-template-columns: repeat(5, 1fr);
  background: #fff; border-bottom: 1px solid #ece8f4; flex-shrink: 0;
}
@media (max-width: 900px) { .mon-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 540px) { .mon-kpis { grid-template-columns: repeat(2, 1fr); } }
.kpi {
  display: flex; flex-direction: column; align-items: center;
  padding: 18px 10px 14px; border-right: 1px solid #ece8f4;
  position: relative; transition: background .13s; overflow: hidden;
  background: none; cursor: pointer; font-family: inherit;
}
.kpi:last-child { border-right: none; }
.kpi--active { background: #faf8ff; }
.kpi-val { font-size: 28px; font-weight: 900; line-height: 1; color: #2C2039; margin-bottom: 4px; }
.kpi-val--red { color: #dc2626; }
.kpi-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .55px; color: #a094b8; }
.kpi--active .kpi-label { color: #6d5a8e; }
.kpi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; opacity: 0; border-radius: 2px 2px 0 0; transition: opacity .15s; }
.kpi--active .kpi-bar { opacity: 1; }
.kpi-bar--purple { background: #915BD8; } .kpi-bar--orange { background: #f97316; }
.kpi-bar--red { background: #ef4444; } .kpi-bar--blue { background: #3b82f6; }
.kpi--purple .kpi-val { color: #7c3aed; } .kpi--orange .kpi-val { color: #ea580c; }
.kpi--red .kpi-val { color: #dc2626; } .kpi--blue .kpi-val { color: #2563eb; }

/* ── Filtros fallas ───────────────────────────────────────────────── */
.mon-filters {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 14px 32px; background: #fff;
  border-bottom: 1px solid #ece8f4; flex-shrink: 0;
}
.mon-filter-field { display: flex; flex-direction: column; gap: 4px; }
.mon-filter-search { flex: 1; min-width: 200px; }
.mon-filter-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #a094b8; }
.mon-input, .mon-select {
  background: #faf9fc; border: 1.5px solid #e5e0f0; border-radius: 8px;
  padding: 7px 11px; color: #2C2039; font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .14s;
}
.mon-input  { width: 100%; }
.mon-select { min-width: 148px; cursor: pointer; }
.mon-input:focus, .mon-select:focus { border-color: #915BD8; }
.mon-filter-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; align-self: flex-end; padding-bottom: 1px; }
.mon-btn-clear {
  background: transparent; border: 1.5px solid #e5e0f0; border-radius: 8px;
  padding: 7px 13px; font-size: 12px; font-weight: 700; color: #7d7190;
  cursor: pointer; font-family: inherit; transition: all .14s;
}
.mon-btn-clear:hover { border-color: #915BD8; color: #6d28d9; }
.mon-count { font-size: 12px; color: #a094b8; font-weight: 600; white-space: nowrap; }

/* ── Tabla fallas ─────────────────────────────────────────────────── */
.mon-table-area { flex: 1; padding: 20px 32px 28px; min-height: 0; }
.mon-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 80px 20px; color: #a094b8; font-size: 13px; }
.mon-spinner { width: 32px; height: 32px; border: 3px solid #ece8f4; border-top-color: #915BD8; border-radius: 50%; animation: spin .75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .75s linear infinite; }
.mon-error {
  display: flex; align-items: center; gap: 14px;
  background: #fff5f5; border: 1px solid #fecaca; border-radius: 10px;
  padding: 16px 20px; font-size: 13px; margin-bottom: 16px;
}
.mon-error-title { font-weight: 700; color: #dc2626; font-size: 13px; }
.mon-error-msg   { font-size: 12px; color: #ef4444; }
.mon-empty { text-align: center; padding: 70px 20px; }
.mon-empty-icon  { font-size: 40px; opacity: .2; margin-bottom: 12px; }
.mon-empty-title { font-size: 15px; font-weight: 700; color: #6b7280; margin-bottom: 5px; }
.mon-empty-sub   { font-size: 12.5px; color: #9ca3af; }
.mon-table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  background: #fff; border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(44,32,57,.07), 0 0 0 1px rgba(44,32,57,.05);
}
.mon-table thead tr { background: #faf8fc; }
.mon-table thead th {
  padding: 11px 14px; text-align: left; font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; color: #a094b8;
  white-space: nowrap; border-bottom: 1px solid #ece8f4;
}
.mon-row { transition: background .1s; cursor: pointer; }
.mon-row:not(:last-child) td { border-bottom: 1px solid #f3f0f8; }
.mon-row:hover td { background: #faf7ff; }
.mon-row td { padding: 11px 14px; vertical-align: middle; font-size: 13px; color: #2C2039; }
.td-codigo  { font-family: 'Courier New', monospace; font-size: 11.5px; font-weight: 700; color: #7c3aed; white-space: nowrap; }
.td-proyecto { font-weight: 600; min-width: 140px; }
.td-tipo { min-width: 150px; }
.cat-tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: .25px; text-transform: uppercase; margin-bottom: 3px; }
.tipo-sub { font-size: 11px; color: #8b7fa8; margin-top: 2px; }
.td-fecha { font-size: 12px; color: #4b3b72; white-space: nowrap; }
.td-asig  { font-size: 12px; min-width: 110px; color: #4b3b72; }
.td-dash  { color: #c9c0d8; font-style: italic; font-size: 12px; }
.estado-pill, .prio-pill { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: .25px; white-space: nowrap; text-transform: uppercase; }
.prio-1 { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.prio-2 { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.prio-3 { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.prio-4 { background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; }
.sla { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
.sla-ok   { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.sla-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.sla-warn { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.td-arrow { width: 44px; }
.arrow-btn { background: transparent; border: 1px solid #e5e0f0; border-radius: 7px; padding: 4px 10px; font-size: 14px; font-weight: 700; color: #7c3aed; cursor: pointer; transition: all .12s; }
.arrow-btn:hover { background: #f5f0ff; border-color: #7c3aed; }

/* ── Tab panels ───────────────────────────────────────────────────── */
.mon-tab-view { flex: 1; overflow-y: auto; padding: 24px 32px 40px; background: #f5f4f8; }
@media (max-width: 768px) { .mon-tab-view { padding: 16px; } }
.mon-tab-loading { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 80px 20px; color: #a094b8; font-size: 13px; }
.mon-tab-empty { text-align: center; padding: 80px 20px; }

/* ══════════════════════════════════════════════════════════
   GENERACIÓN
═══════════════════════════════════════════════════════════ */
.gen-header { background: #fff; border-radius: 12px; border: 1px solid #ece8f4; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(44,32,57,.04); }
.gen-filters-row { display: flex; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
.gen-project-selector { flex: 1; min-width: 240px; max-width: 400px; position: relative; }
.gen-input-wrap { position: relative; }
.gen-sel-count {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: #7c3aed; color: #fff; border-radius: 50%; width: 18px; height: 18px;
  font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center;
}
.gen-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
  background: #fff; border: 1.5px solid #e5e0f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(44,32,57,.13); max-height: 260px; overflow-y: auto;
}
.gen-dropdown-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 14px;
  cursor: pointer; font-size: 12.5px; color: #2C2039; transition: background .1s;
}
.gen-dropdown-item:hover { background: #faf7ff; }
.gen-dropdown-item--sel { background: #f5f0ff; }
.gen-check { width: 14px; color: #7c3aed; font-weight: 900; font-size: 11px; flex-shrink: 0; }
.gen-dropdown-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gen-dropdown-mwh { font-size: 11px; color: #D4A017; font-weight: 700; white-space: nowrap; }
.gen-days-btns { display: flex; gap: 4px; }
.gen-day-btn {
  padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1.5px solid #e5e0f0;
  color: #6d5a8e; background: transparent; transition: all .13s;
}
.gen-day-btn.active { background: #7c3aed; border-color: #7c3aed; color: #fff; }
.gen-day-btn:not(.active):hover { border-color: #915BD8; color: #7c3aed; }
.gen-quick-kpi { text-align: center; min-width: 80px; }
.gen-quick-kpi-val { font-size: 24px; font-weight: 900; color: #D4A017; line-height: 1; }
.gen-quick-kpi-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #a094b8; margin-top: 3px; }
.gen-tags-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid #f0eaf8; }
.gen-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: #f0eaf8; color: #6d28d9; border: 1px solid #d4b8f0;
  border-radius: 20px; padding: 4px 10px 4px 12px; font-size: 12px; font-weight: 600;
}
.gen-tag button { background: none; border: none; cursor: pointer; color: #915BD8; font-size: 14px; line-height: 1; padding: 0; }

/* Tabla generación */
.gen-table-card { background: #fff; border-radius: 12px; border: 1px solid #ece8f4; overflow: hidden; box-shadow: 0 1px 3px rgba(44,32,57,.04); }
.gen-table-card-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 24px 16px; border-bottom: 1px solid #f0eaf8; flex-wrap: wrap; gap: 12px; }
.gen-table-title { font-size: 14px; font-weight: 700; color: #2C2039; margin: 0 0 3px; }
.gen-table-sub   { font-size: 11.5px; color: #a094b8; margin: 0; }
.gen-p90-summary { display: flex; align-items: center; }

/* Viz de barras */
.gen-bar-viz { padding: 16px 24px; border-bottom: 1px solid #f0eaf8; display: flex; flex-direction: column; gap: 8px; }
.gen-viz-row { display: grid; grid-template-columns: 200px 1fr 100px; align-items: center; gap: 12px; }
.gen-viz-label { font-size: 12px; font-weight: 600; color: #4a3b6b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gen-viz-track { position: relative; height: 22px; background: #f5f3fc; border-radius: 4px; overflow: hidden; }
.gen-viz-fill { height: 100%; border-radius: 4px; transition: width .6s ease; }
.gen-viz-val { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 700; color: #2C2039; white-space: nowrap; }
.gen-viz-badges { display: flex; gap: 4px; }

/* Tabla */
.gen-table { width: 100%; border-collapse: collapse; }
.gen-table thead tr { background: #faf8fc; }
.gen-table thead th { padding: 10px 16px; text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #a094b8; white-space: nowrap; border-bottom: 1px solid #ece8f4; }
.gen-row:not(:last-child) td { border-bottom: 1px solid #f5f3fc; }
.gen-row:hover td { background: #faf7ff; }
.gen-row td { padding: 10px 16px; font-size: 13px; color: #2C2039; }
.gen-td-nombre { font-weight: 600; min-width: 160px; }
.gen-mwh-val   { font-family: monospace; font-size: 13px; font-weight: 700; color: #D4A017; }
.gen-rendimiento { font-size: 12px; color: #6b5a8a; }
.gen-p90-ref     { font-size: 12px; color: #6b5a8a; }

/* Badges P90 */
.gen-p90-badge {
  display: inline-block; font-size: 11px; font-weight: 800; padding: 3px 8px;
  border-radius: 20px; white-space: nowrap; letter-spacing: .2px;
}
.gen-p90-sm { font-size: 9.5px; padding: 2px 6px; }
.gen-p90-ok   { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.gen-p90-warn { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.gen-p90-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

/* ══════════════════════════════════════════════════════════
   GRÁFICOS
═══════════════════════════════════════════════════════════ */
.chart-filters { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.chart-total-badge {
  display: flex; flex-direction: column; align-items: center;
  background: #fff; border: 1px solid #ece8f4; border-radius: 10px; padding: 8px 16px;
}
.chart-total-num { font-size: 22px; font-weight: 900; color: #7c3aed; line-height: 1; }
.chart-total-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #a094b8; }

.chart-kpi-mini { display: flex; gap: 12px; flex-wrap: wrap; }
.chart-kpi-mini-item {
  background: #fff; border: 1px solid #ece8f4; border-radius: 10px;
  padding: 8px 14px; text-align: center; min-width: 70px;
}
.chart-kpi-mini-val { font-size: 20px; font-weight: 900; line-height: 1; }
.chart-kpi-mini-lbl { font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #a094b8; letter-spacing: .4px; margin-top: 2px; }

.top-proyecto-card {
  display: flex; align-items: center; gap: 16px;
  background: linear-gradient(135deg, #4c1d95, #6d28d9);
  border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
  color: #fff; position: relative; overflow: hidden;
}
.top-proy-icon { font-size: 28px; flex-shrink: 0; }
.top-proy-body { flex: 1; }
.top-proy-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .7; margin-bottom: 3px; }
.top-proy-name  { font-size: 17px; font-weight: 800; }
.top-proy-count { text-align: right; flex-shrink: 0; }
.top-proy-num   { font-size: 36px; font-weight: 900; line-height: 1; }
.top-proy-sub   { font-size: 11px; opacity: .7; font-weight: 600; }
.top-proy-bar-wrap { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,.2); }
.top-proy-bar { height: 100%; background: rgba(255,255,255,.5); }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.chart-card { background: #fff; border-radius: 12px; border: 1px solid #ece8f4; padding: 20px 22px; box-shadow: 0 1px 3px rgba(44,32,57,.04); }
.chart-card--wide { grid-column: 1 / -1; }
.chart-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.chart-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .55px; color: #a094b8; margin-bottom: 16px; }
.chart-subtitle { font-size: 10.5px; color: #c0b8d4; }

/* Donuts */
.donut-wrap { position: relative; display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.donut-svg  { width: 100px; height: 100px; flex-shrink: 0; }
.donut-total { position: absolute; left: 32px; top: 50%; transform: translate(-50%, -50%); text-align: center; }
.donut-total-num { font-size: 20px; font-weight: 900; color: #2C2039; line-height: 1; }
.donut-total-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #a094b8; letter-spacing: .4px; }
.donut-legend { display: flex; flex-direction: column; gap: 6px; }
.legend-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot   { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-label { flex: 1; color: #4b3b72; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-val   { font-weight: 700; color: #2C2039; }
.legend-pct   { font-size: 10.5px; color: #a094b8; min-width: 28px; text-align: right; }

/* Barras */
.bar-chart { display: flex; flex-direction: column; gap: 10px; }
.bar-row { display: grid; grid-template-columns: 140px 1fr 32px; align-items: center; gap: 8px; }
.bar-label { font-size: 11.5px; font-weight: 600; color: #4a3b6b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 10px; background: #f0eaf8; border-radius: 5px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 5px; transition: width .6s ease; min-width: 4px; }
.bar-val   { font-size: 12px; font-weight: 700; color: #6d28d9; text-align: right; }

/* Timeline */
.timeline-chart { padding: 8px 0; }
.timeline-bars { display: flex; align-items: flex-end; gap: 4px; height: 130px; padding: 0 4px; }
.tl-col { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
.tl-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.tl-bar {
  width: 100%; min-height: 4px; border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #a78bfa, #7c3aed);
  transition: height .6s ease; position: relative;
  display: flex; align-items: flex-start; justify-content: center;
}
.tl-bar-val { font-size: 9px; font-weight: 700; color: #fff; padding: 2px 0; }
.tl-label   { font-size: 9px; font-weight: 600; color: #a094b8; text-align: center; white-space: nowrap; }

/* ══════════════════════════════════════════════════════════
   CLIENTES
═══════════════════════════════════════════════════════════ */
.cli-layout {
  display: grid; grid-template-columns: 300px 1fr;
  height: 100%; overflow: hidden;
}
@media (max-width: 900px) { .cli-layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; } }

.cli-panel-list {
  background: #fff; border-right: 1px solid #ece8f4;
  display: flex; flex-direction: column; overflow: hidden;
}
.cli-search-area {
  padding: 16px; border-bottom: 1px solid #f0eaf8;
  display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;
}
.cli-toggle-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #6b5a8a; font-weight: 600; cursor: pointer; user-select: none;
}
.cli-toggle-label input { accent-color: #7c3aed; }
.cli-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.cli-card {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 12px; border-radius: 10px; cursor: pointer;
  transition: background .1s; border: 1.5px solid transparent;
}
.cli-card:hover { background: #faf7ff; }
.cli-card--active { background: #f5f0ff; border-color: #d4b8f0; }
.cli-card-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #915BD8);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800;
}
.cli-card-body { flex: 1; min-width: 0; }
.cli-card-nombre { font-size: 13px; font-weight: 700; color: #2C2039; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cli-card-sub    { font-size: 11px; color: #a094b8; margin-top: 2px; }
.cli-card-gen    { text-align: right; flex-shrink: 0; }
.cli-gen-num     { font-size: 14px; font-weight: 800; color: #D4A017; }
.cli-gen-unit    { font-size: 10px; font-weight: 700; color: #a094b8; margin-left: 2px; }

.cli-panel-detail { background: #f5f4f8; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.cli-detail-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; }
.cli-detail-header {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border-radius: 12px; padding: 20px 24px;
  border: 1px solid #ece8f4;
}
.cli-detail-avatar {
  width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #915BD8);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800;
}
.cli-detail-info { flex: 1; min-width: 0; }
.cli-detail-nombre { font-size: 18px; font-weight: 800; color: #2C2039; margin: 0 0 3px; }
.cli-detail-sub    { font-size: 12.5px; color: #a094b8; margin: 0; }

.cli-kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
@media (max-width: 700px) { .cli-kpis { grid-template-columns: repeat(2, 1fr); } }
.cli-kpi {
  background: #fff; border-radius: 12px; border: 1px solid #ece8f4;
  padding: 16px; text-align: center;
}
.cli-kpi-val { font-size: 26px; font-weight: 900; color: #2C2039; line-height: 1; margin-bottom: 4px; }
.cli-kpi-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #a094b8; }

.cli-table-wrap { background: #fff; border-radius: 12px; border: 1px solid #ece8f4; overflow: hidden; }

/* ══════════════════════════════════════════════════════════
   INFORMES
═══════════════════════════════════════════════════════════ */
.inf-create-panel {
  background: #fff; border: 1.5px solid #e5e0f0; border-radius: 12px;
  margin-bottom: 20px; overflow: hidden; transition: border-color .15s;
}
.inf-create-panel--open { border-color: #915BD8; }
.inf-create-toggle {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; cursor: pointer; user-select: none; transition: background .12s;
}
.inf-create-toggle:hover { background: #faf7ff; }
.inf-create-toggle-left  { display: flex; align-items: center; gap: 10px; }
.inf-create-icon         { font-size: 18px; }
.inf-create-toggle-label { font-size: 14px; font-weight: 700; color: #2C2039; }
.inf-create-chevron      { font-size: 11px; color: #a094b8; font-weight: 700; }
.inf-create-body         { padding: 0 20px 20px; border-top: 1px solid #f0eaf8; padding-top: 18px; }
.inf-form-row            { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.inf-form-field          { display: flex; flex-direction: column; gap: 5px; min-width: 140px; }
.inf-form-field--wide    { flex: 2; min-width: 200px; }
.inf-form-label          { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #a094b8; }
.inf-form-footer         { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.inf-form-preview        { font-size: 13px; color: #6b5a8a; font-weight: 600; display: flex; align-items: center; gap: 8px; }

.inf-list-section { }
.inf-list-header  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.inf-list-title   { font-size: 15px; font-weight: 700; color: #2C2039; margin: 0; }
.inf-empty        { text-align: center; padding: 60px 20px; }
.inf-list         { display: flex; flex-direction: column; background: #fff; border: 1px solid #ece8f4; border-radius: 12px; overflow: hidden; }
.inf-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 18px; cursor: pointer; transition: background .1s;
  border-bottom: 1px solid #f3f0f8;
}
.inf-row:last-child { border-bottom: none; }
.inf-row:hover { background: #faf7ff; }
.inf-row-left  { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.inf-tipo-badge {
  display: inline-block; font-size: 9.5px; font-weight: 800; padding: 3px 8px;
  border-radius: 20px; letter-spacing: .5px; white-space: nowrap; flex-shrink: 0;
}
.inf-tipo-fmo         { background: #f0f4ff; color: #3730a3; border: 1px solid #c7d2fe; }
.inf-tipo-operaciones { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.inf-row-info    { min-width: 0; }
.inf-row-nombre  { font-size: 13.5px; font-weight: 700; color: #2C2039; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.inf-row-periodo { font-size: 11.5px; color: #a094b8; margin-top: 2px; text-transform: capitalize; }
.inf-row-right   { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.inf-estado-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; }
.inf-estado-borrador { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
.inf-estado-revisado { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.inf-estado-aprobado { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.inf-row-fecha { font-size: 11.5px; color: #a094b8; }
.inf-row-arrow { font-size: 14px; font-weight: 700; color: #7c3aed; }

/* Responsive */
@media (max-width: 768px) {
  .mon-hero, .mon-filters, .mon-table-area { padding-left: 16px; padding-right: 16px; }
  .gen-viz-row { grid-template-columns: 120px 1fr 80px; }
  .bar-row { grid-template-columns: 100px 1fr 28px; }
}
</style>
