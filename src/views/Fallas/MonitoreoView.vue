<template>
  <div class="space-y-4">

    <!-- ══ Header ══════════════════════════════════════════════════════ -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full flex items-center justify-center" style="background: rgba(145,91,216,0.12);">
          <i class="pi pi-bolt text-base" style="color: #915BD8;" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-800">Monitoreo de Fallas</h2>
          <p class="text-xs text-gray-500">Seguimiento operacional de la flota Unergy</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button v-if="activeTab === 0" label="Actualizar" icon="pi pi-refresh" outlined size="small"
          :loading="loading" @click="cargar" />
        <Button v-if="activeTab === 0" label="Registrar falla" icon="pi pi-plus" size="small"
          @click="showDialog = true" />
        <Button v-if="activeTab === 1" label="Actualizar" icon="pi pi-refresh" outlined size="small"
          :loading="genLoading" @click="cargarGeneracion" />
        <Button v-if="activeTab === 4" label="Crear informe" icon="pi pi-plus" size="small"
          @click="showCrearInforme = !showCrearInforme" />
      </div>
    </div>

    <!-- ══ Tabs ════════════════════════════════════════════════════════ -->
    <TabView v-model:activeIndex="activeTab">

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB 0 — FALLAS                                                -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <TabPanel header="Fallas">
        <div class="space-y-4 pt-2">

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

          <!-- Filtros -->
          <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
            <div class="flex flex-col gap-1">
              <label class="field-label">Buscar</label>
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="buscar" placeholder="Código, proyecto, descripción..." class="w-72" />
              </IconField>
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Estado</label>
              <Select v-model="filtroEstado" :options="catalogos.estados" optionLabel="etiqueta" optionValue="codigo"
                placeholder="Todos" showClear class="w-40" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Prioridad</label>
              <Select v-model="filtroPrioridad" :options="catalogos.prioridades" optionLabel="etiqueta" optionValue="codigo"
                placeholder="Todas" showClear class="w-40" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="field-label">Proyecto</label>
              <Select v-model="filtroProyecto" :options="proyectos" optionLabel="nombre_comercial" optionValue="id"
                placeholder="Todos" showClear filter class="w-56" />
            </div>
            <div class="flex items-center gap-3 ml-auto">
              <Button v-if="hayFiltros" label="Limpiar" icon="pi pi-times" text size="small"
                severity="secondary" @click="limpiarFiltros" />
              <span v-if="!loading" class="text-xs text-gray-500">
                {{ fallasFiltradas.length }} resultado{{ fallasFiltradas.length !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>

          <!-- Tabla -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div v-if="error" class="p-6 flex items-center gap-3 text-red-600 text-sm">
              <i class="pi pi-exclamation-circle text-xl" />
              <div class="flex-1">
                <div class="font-semibold">Error al cargar</div>
                <div class="text-gray-500">{{ error }}</div>
              </div>
              <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargar" />
            </div>
            <DataTable v-else :value="fallasFiltradas" :loading="loading" stripedRows rowHover class="text-sm"
              :rows="20" paginator :rowsPerPageOptions="[10, 20, 50, 100]" @row-click="(e) => irDetalle(e.data.id)">
              <template #empty>
                <div class="flex flex-col items-center py-10 gap-2 text-gray-400">
                  <i class="pi pi-inbox text-3xl" />
                  <p class="text-sm">{{ hayFiltros ? 'Sin resultados con los filtros aplicados' : 'Sin fallas registradas' }}</p>
                  <Button v-if="hayFiltros" label="Limpiar filtros" icon="pi pi-times" text size="small"
                    @click="limpiarFiltros" />
                </div>
              </template>
              <Column field="codigo_interno" header="Código" style="width:120px">
                <template #body="{ data }">
                  <code class="text-xs font-mono text-gray-600">{{ data.codigo_interno }}</code>
                </template>
              </Column>
              <Column header="Proyecto">
                <template #body="{ data }">
                  <span class="font-medium text-gray-800">{{ data.proyecto?.nombre_comercial || '—' }}</span>
                </template>
              </Column>
              <Column header="Categoría / Tipo" style="min-width:200px">
                <template #body="{ data }">
                  <div>
                    <span v-if="data.tipo?.categoria" class="cat-tag" :style="catTagStyle(data.tipo.categoria.color_hex)">
                      {{ data.tipo.categoria.etiqueta }}
                    </span>
                    <div class="text-xs text-gray-500 mt-0.5">{{ data.tipo?.etiqueta || '—' }}</div>
                  </div>
                </template>
              </Column>
              <Column header="Estado" style="width:130px">
                <template #body="{ data }">
                  <Tag :value="data.estado?.etiqueta || '—'" :style="pillStyle(data.estado?.color_hex)" />
                </template>
              </Column>
              <Column header="Prioridad" style="width:110px">
                <template #body="{ data }">
                  <Tag :value="data.prioridad?.etiqueta || '—'" :severity="prioSeverity(data.prioridad?.codigo)" />
                </template>
              </Column>
              <Column header="Identificada" style="width:120px">
                <template #body="{ data }">
                  <span class="text-xs text-gray-600">{{ fmtFecha(data.fecha_identificacion) }}</span>
                </template>
              </Column>
              <Column header="SLA" style="width:100px">
                <template #body="{ data }">
                  <Tag v-if="data.sla_cumplido === true" value="Cumplido" severity="success" />
                  <Tag v-else-if="data.sla_cumplido === false" value="Vencido" severity="danger" />
                  <Tag v-else-if="slaRisk(data)" value="En riesgo" severity="warn" />
                  <span v-else class="text-gray-300 text-xs">—</span>
                </template>
              </Column>
              <Column header="Asignado a" style="width:140px">
                <template #body="{ data }">
                  <span v-if="data.asignado_a" class="text-xs text-gray-700">{{ data.asignado_a.nombre }}</span>
                  <span v-else class="text-xs text-gray-400">Sin asignar</span>
                </template>
              </Column>
              <Column style="width:50px">
                <template #body="{ data }">
                  <Button icon="pi pi-arrow-right" text rounded size="small" severity="secondary"
                    @click.stop="irDetalle(data.id)" />
                </template>
              </Column>
            </DataTable>
          </div>
        </div>

        <!-- Dialog registrar falla -->
        <Dialog v-model:visible="showDialog" header="Registrar nueva falla" modal class="w-full max-w-2xl"
          :closable="!saving">
          <FallaForm :catalogos="catalogos" @save="onCreate" @cancel="showDialog = false" />
        </Dialog>
      </TabPanel>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB 1 — GENERACIÓN                                             -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <TabPanel header="Generación">
        <div class="space-y-4 pt-2">

          <!-- Filtros generación -->
          <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4">
            <div class="flex flex-col gap-1 relative" ref="genSelectorRef" style="flex: 1; min-width: 260px;">
              <label class="field-label">Proyectos a comparar</label>
              <div class="relative">
                <IconField>
                  <InputIcon class="pi pi-search" />
                  <InputText v-model="genBuscarProyecto" placeholder="Buscar y seleccionar proyecto..."
                    class="w-full" @focus="genDropdownOpen = true"
                    @blur="setTimeout(() => genDropdownOpen = false, 200)" />
                </IconField>
                <span v-if="genSeleccionados.length"
                  class="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {{ genSeleccionados.length }}
                </span>
              </div>
              <div v-if="genDropdownOpen && genProyectosOpciones.length"
                class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-72 overflow-auto z-20">
                <div v-for="p in genProyectosOpciones" :key="p.name"
                  class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  :class="{ 'bg-purple-50': genSeleccionados.includes(p.name) }"
                  @mousedown.prevent="toggleGenProyecto(p.name)">
                  <i v-if="genSeleccionados.includes(p.name)" class="pi pi-check text-xs" style="color:#915BD8" />
                  <span v-else class="w-3" />
                  <span class="flex-1 truncate">{{ p.name }}</span>
                  <span class="text-xs text-gray-400">{{ p.mwh.toFixed(1) }} MWh</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="field-label">Período</label>
              <div class="flex gap-1">
                <Button v-for="d in [7, 30, 90]" :key="d" :label="d + 'd'"
                  :severity="genDias === d ? 'primary' : 'secondary'"
                  :outlined="genDias !== d" size="small" @click="cambiarDias(d)" />
              </div>
            </div>

            <div v-if="genHistorial.length" class="flex flex-col items-end ml-auto">
              <span class="text-2xl font-bold" style="color:#D4A017">{{ genTotalMWh.toFixed(1) }}</span>
              <span class="text-xs text-gray-500">MWh flota ({{ genDias }}d)</span>
            </div>
            <div v-if="genFlota.online" class="flex flex-col items-end">
              <span class="text-2xl font-bold text-emerald-500">{{ genFlota.online }}</span>
              <span class="text-xs text-gray-500">Online ahora</span>
            </div>
          </div>

          <!-- Tags proyectos seleccionados -->
          <div v-if="genSeleccionados.length" class="flex flex-wrap items-center gap-2">
            <Tag v-for="name in genSeleccionados" :key="name"
              class="cursor-pointer" :value="name" severity="secondary"
              @click="toggleGenProyecto(name)">
              <template #icon><i class="pi pi-times text-[10px]" /></template>
            </Tag>
            <Button label="Limpiar selección" icon="pi pi-times" text size="small" severity="secondary"
              @click="genSeleccionados = []" />
          </div>

          <!-- Loading / Error -->
          <div v-if="genLoading" class="bg-white rounded-xl shadow-sm py-16 flex flex-col items-center gap-3">
            <ProgressSpinner style="width:36px; height:36px" />
            <span class="text-sm text-gray-500">Cargando datos de generación…</span>
          </div>
          <div v-else-if="genError" class="bg-white rounded-xl shadow-sm p-6 flex items-center gap-3 text-red-600">
            <i class="pi pi-exclamation-circle text-xl" />
            <div class="flex-1">
              <div class="font-semibold">Error</div>
              <div class="text-sm text-gray-500">{{ genError }}</div>
            </div>
            <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargarGeneracion" />
          </div>
          <div v-else-if="!genHistorial.length"
            class="bg-white rounded-xl shadow-sm py-16 flex flex-col items-center gap-2 text-gray-400">
            <i class="pi pi-sun text-3xl" />
            <p class="text-sm">Sin datos de generación</p>
            <p class="text-xs">No se obtuvieron datos del sistema de monitoreo</p>
          </div>

          <!-- Tabla generación -->
          <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-gray-800">
                  {{ genSeleccionados.length
                    ? `Comparación de proyectos — últimos ${genDias} días`
                    : `Ranking de generación — últimos ${genDias} días` }}
                </h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ genDatosFiltrados.length }} proyecto{{ genDatosFiltrados.length !== 1 ? 's' : '' }}
                  {{ genSeleccionados.length ? 'seleccionados' : 'en flota' }}</p>
              </div>
              <Tag v-if="genSeleccionados.length && genP90CumpleCount !== null"
                :value="`${genP90CumpleCount}/${genSeleccionados.length} cumplen P90`"
                :severity="genP90CumpleCount === genSeleccionados.length ? 'success' : 'warn'" />
            </div>

            <!-- Gráfico barras comparativo -->
            <div v-if="genDatosFiltrados.length" class="p-5 space-y-2">
              <div v-for="row in genDatosFiltrados.slice(0, 20)" :key="row.name" class="flex items-center gap-3 text-xs">
                <div class="w-44 truncate font-medium text-gray-700" :title="row.name">{{ row.name }}</div>
                <div class="flex-1 relative bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div class="absolute inset-y-0 left-0 rounded-full transition-all"
                    :style="{ width: genBarWidth(row.mwh) + '%', background: genBarColor(row) }" />
                  <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white mix-blend-difference">
                    {{ row.mwh.toFixed(2) }} MWh
                  </span>
                </div>
                <Tag v-if="row.pct_p90 !== null" :value="`P90: ${row.pct_p90}%`"
                  :severity="row.pct_p90 >= 100 ? 'success' : row.pct_p90 >= 80 ? 'warn' : 'danger'" class="text-[10px]" />
              </div>
            </div>

            <!-- Tabla detallada -->
            <DataTable :value="genConP90" class="text-sm" stripedRows rowHover>
              <Column header="Proyecto">
                <template #body="{ data }">
                  <span class="font-medium text-gray-800">{{ data.name }}</span>
                </template>
              </Column>
              <Column header="MWh generados">
                <template #body="{ data }">
                  <span class="font-mono font-semibold">{{ data.mwh.toFixed(3) }}</span>
                </template>
              </Column>
              <Column header="Cap. (kWp)">
                <template #body="{ data }">
                  <span class="text-gray-700">{{ data.capacity_kwp ? data.capacity_kwp.toLocaleString('es-CO') : '—' }}</span>
                </template>
              </Column>
              <Column header="Rendimiento">
                <template #body="{ data }">
                  <span v-if="data.capacity_kwp && data.mwh" class="text-xs text-gray-600">
                    {{ ((data.mwh * 1000) / data.capacity_kwp).toFixed(2) }} kWh/kWp
                  </span>
                  <span v-else class="text-gray-300">—</span>
                </template>
              </Column>
              <Column header="P90 / mes">
                <template #body="{ data }">
                  <span v-if="data.p90_kwh" class="text-xs text-gray-600">{{ (data.p90_kwh / 1000).toFixed(2) }} MWh</span>
                  <span v-else class="text-gray-300">—</span>
                </template>
              </Column>
              <Column header="Cumplimiento P90">
                <template #body="{ data }">
                  <Tag v-if="data.pct_p90 !== null" :value="`${data.pct_p90}%`"
                    :severity="data.pct_p90 >= 100 ? 'success' : data.pct_p90 >= 80 ? 'warn' : 'danger'" />
                  <span v-else class="text-gray-300">—</span>
                </template>
              </Column>
              <Column header="Días con datos">
                <template #body="{ data }">
                  <span class="text-xs">{{ data.days_with_data ?? '—' }}</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </TabPanel>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB 2 — GRÁFICOS                                               -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <TabPanel header="Gráficos">
        <div class="space-y-4 pt-2">
          <div v-if="loading" class="bg-white rounded-xl shadow-sm py-16 flex flex-col items-center gap-3">
            <ProgressSpinner style="width:36px;height:36px" />
            <span class="text-sm text-gray-500">Cargando datos…</span>
          </div>
          <div v-else-if="!todasLasFallas.length"
            class="bg-white rounded-xl shadow-sm py-16 flex flex-col items-center gap-2 text-gray-400">
            <i class="pi pi-chart-bar text-3xl" />
            <p class="text-sm">Sin datos de fallas</p>
          </div>
          <div v-else class="space-y-4">

            <!-- Filtro y KPIs -->
            <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4">
              <div class="flex flex-col gap-1">
                <label class="field-label">Filtrar por proyecto</label>
                <Select v-model="filtroGraficosProyecto" :options="proyectos" optionLabel="nombre_comercial"
                  optionValue="id" placeholder="Todos" showClear filter class="w-64" />
              </div>
              <div class="flex flex-col items-center gap-0.5 px-4">
                <span class="text-2xl font-bold" style="color:#915BD8">{{ fallasFiltGraficos.length }}</span>
                <span class="text-xs text-gray-500">fallas analizadas</span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 ml-auto">
                <div class="text-center">
                  <div class="text-lg font-bold text-red-600">{{ grafKpis.criticas }}</div>
                  <div class="text-[10px] uppercase text-gray-500 tracking-wide">Críticas</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-blue-600">{{ grafKpis.resueltas }}</div>
                  <div class="text-[10px] uppercase text-gray-500 tracking-wide">Resueltas</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-emerald-600">{{ grafKpis.tasaResolucion }}%</div>
                  <div class="text-[10px] uppercase text-gray-500 tracking-wide">Tasa resol.</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold" style="color:#915BD8">{{ grafKpis.avgDias }}</div>
                  <div class="text-[10px] uppercase text-gray-500 tracking-wide">Días prom.</div>
                </div>
              </div>
            </div>

            <!-- Top proyecto -->
            <div v-if="!filtroGraficosProyecto && topProyecto"
              class="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style="background: rgba(145,91,216,0.12);">🏆</div>
              <div class="flex-1">
                <div class="text-xs uppercase tracking-wide text-gray-500">Proyecto con más fallas</div>
                <div class="text-lg font-bold text-gray-800">{{ topProyecto.label }}</div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-extrabold" style="color:#915BD8">{{ topProyecto.count }}</div>
                <div class="text-xs text-gray-500">fallas registradas</div>
              </div>
            </div>

            <!-- Grid charts -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

              <!-- Donut estado -->
              <div class="bg-white rounded-xl shadow-sm p-5">
                <h4 class="text-sm font-semibold text-gray-700 mb-4">Distribución por estado</h4>
                <div class="flex items-center gap-5">
                  <div class="relative w-32 h-32 flex-shrink-0">
                    <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90">
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0eaf8" stroke-width="4" />
                      <circle v-for="(seg, i) in donutEstado" :key="i" cx="21" cy="21" r="15.9" fill="none"
                        :stroke="seg.color" stroke-width="4"
                        :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                        :stroke-dashoffset="seg.offset" stroke-linecap="round" />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                      <span class="text-xl font-bold text-gray-800">{{ fallasFiltGraficos.length }}</span>
                      <span class="text-[10px] text-gray-500 uppercase">total</span>
                    </div>
                  </div>
                  <div class="flex-1 space-y-1.5">
                    <div v-for="seg in donutEstado" :key="seg.label" class="flex items-center gap-2 text-xs">
                      <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: seg.color }" />
                      <span class="flex-1 text-gray-700 truncate">{{ seg.label }}</span>
                      <span class="font-semibold text-gray-800">{{ seg.count }}</span>
                      <span class="text-gray-400 w-9 text-right">{{ Math.round(seg.pct) }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Donut prioridad -->
              <div class="bg-white rounded-xl shadow-sm p-5">
                <h4 class="text-sm font-semibold text-gray-700 mb-4">Distribución por prioridad</h4>
                <div class="flex items-center gap-5">
                  <div class="relative w-32 h-32 flex-shrink-0">
                    <svg viewBox="0 0 42 42" class="w-full h-full -rotate-90">
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0eaf8" stroke-width="4" />
                      <circle v-for="(seg, i) in donutPrioridad" :key="i" cx="21" cy="21" r="15.9" fill="none"
                        :stroke="seg.color" stroke-width="4"
                        :stroke-dasharray="`${seg.pct} ${100 - seg.pct}`"
                        :stroke-dashoffset="seg.offset" stroke-linecap="round" />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                      <span class="text-xl font-bold text-gray-800">{{ fallasFiltGraficos.length }}</span>
                      <span class="text-[10px] text-gray-500 uppercase">total</span>
                    </div>
                  </div>
                  <div class="flex-1 space-y-1.5">
                    <div v-for="seg in donutPrioridad" :key="seg.label" class="flex items-center gap-2 text-xs">
                      <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: seg.color }" />
                      <span class="flex-1 text-gray-700 truncate">{{ seg.label }}</span>
                      <span class="font-semibold text-gray-800">{{ seg.count }}</span>
                      <span class="text-gray-400 w-9 text-right">{{ Math.round(seg.pct) }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Categorías -->
              <div v-if="fallasPorCategoria.length" class="bg-white rounded-xl shadow-sm p-5">
                <h4 class="text-sm font-semibold text-gray-700 mb-4">Fallas por categoría</h4>
                <div class="space-y-2">
                  <div v-for="g in fallasPorCategoria" :key="g.label" class="flex items-center gap-3 text-xs">
                    <div class="w-28 truncate text-gray-700">{{ g.label }}</div>
                    <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                      <div class="h-full rounded-full transition-all"
                        :style="{ width: (g.count / barMax * 100) + '%', background: g.color || '#915BD8' }" />
                    </div>
                    <div class="w-8 text-right font-semibold text-gray-800">{{ g.count }}</div>
                  </div>
                </div>
              </div>

              <!-- Top tipos -->
              <div v-if="fallasPorTipo.length" class="bg-white rounded-xl shadow-sm p-5">
                <h4 class="text-sm font-semibold text-gray-700 mb-4">Top tipos de falla</h4>
                <div class="space-y-2">
                  <div v-for="g in fallasPorTipo.slice(0, 8)" :key="g.label" class="flex items-center gap-3 text-xs">
                    <div class="w-28 truncate text-gray-700" :title="g.label">{{ g.label }}</div>
                    <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                      <div class="h-full rounded-full bg-blue-500"
                        :style="{ width: (g.count / fallasPorTipo[0].count * 100) + '%' }" />
                    </div>
                    <div class="w-8 text-right font-semibold text-gray-800">{{ g.count }}</div>
                  </div>
                </div>
              </div>

              <!-- Timeline (wide) -->
              <div v-if="fallasPorMes.length > 1" class="md:col-span-2 bg-white rounded-xl shadow-sm p-5">
                <div class="flex items-end justify-between mb-3">
                  <h4 class="text-sm font-semibold text-gray-700">Evolución mensual de fallas</h4>
                  <span class="text-xs text-gray-500">Últimos 12 meses</span>
                </div>
                <div class="flex items-end gap-2 h-40 px-2">
                  <div v-for="m in fallasPorMes" :key="m.key"
                    class="flex-1 flex flex-col items-center gap-1.5">
                    <div class="w-full flex-1 flex items-end">
                      <div class="w-full rounded-t transition-all relative"
                        :style="{ height: (m.count / timelineMax * 100) + '%', background: '#915BD8', minHeight: m.count > 0 ? '4px' : '0' }">
                        <span v-if="m.count > 0"
                          class="absolute left-1/2 -translate-x-1/2 -top-5 text-[10px] font-bold text-gray-700">{{ m.count }}</span>
                      </div>
                    </div>
                    <div class="text-[10px] text-gray-500">{{ m.label }}</div>
                  </div>
                </div>
              </div>

              <!-- Top proyectos (wide) -->
              <div v-if="!filtroGraficosProyecto && fallasPorProyecto.length"
                class="md:col-span-2 bg-white rounded-xl shadow-sm p-5">
                <h4 class="text-sm font-semibold text-gray-700 mb-4">Top proyectos con más fallas</h4>
                <div class="space-y-2">
                  <div v-for="g in fallasPorProyecto.slice(0, 10)" :key="g.label" class="flex items-center gap-3 text-xs">
                    <div class="w-44 truncate text-gray-700" :title="g.label">{{ g.label }}</div>
                    <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                      <div class="h-full rounded-full transition-all"
                        :style="{ width: (g.count / fallasPorProyecto[0].count * 100) + '%', background: '#915BD8' }" />
                    </div>
                    <div class="w-8 text-right font-semibold text-gray-800">{{ g.count }}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </TabPanel>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB 3 — CLIENTES                                               -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <TabPanel header="Clientes">
        <div class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 pt-2">

          <!-- Panel izquierdo -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col" style="max-height: calc(100vh - 240px);">
            <div class="p-3 border-b border-gray-100 space-y-2">
              <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="clienteBuscar" placeholder="Buscar cliente..." class="w-full" />
              </IconField>
              <label class="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <Checkbox v-model="clienteSoloConProyectos" :binary="true" />
                Solo con proyectos
              </label>
            </div>

            <div v-if="clientesLoading" class="flex justify-center py-8">
              <ProgressSpinner style="width:32px;height:32px" />
            </div>
            <div v-else-if="!clientesFiltrados.length" class="py-8 px-4 text-center text-gray-400 text-sm">
              <p>Sin clientes</p>
              <p class="text-xs mt-1">Prueba otro filtro</p>
            </div>
            <div v-else class="flex-1 overflow-auto">
              <button v-for="c in clientesFiltrados" :key="c.id"
                class="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                :class="{ 'bg-purple-50': clienteSeleccionado?.id === c.id }"
                @click="seleccionarCliente(c)">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style="background:#915BD8">
                  {{ (c.nombre || c.razon_social || '?').charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm text-gray-800 truncate">{{ c.nombre || c.razon_social || '—' }}</div>
                  <div class="text-xs text-gray-500">{{ proyectosPorClienteId(c.id).length }} proyecto(s)</div>
                </div>
                <div v-if="genMWhParaCliente(c.id) > 0" class="text-right flex-shrink-0">
                  <div class="text-xs font-bold" style="color:#D4A017">{{ genMWhParaCliente(c.id).toFixed(1) }}</div>
                  <div class="text-[10px] text-gray-400">MWh</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Panel derecho -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div v-if="!clienteSeleccionado" class="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <i class="pi pi-building text-4xl" />
              <p class="text-sm font-semibold">Selecciona un cliente</p>
              <p class="text-xs">Haz clic en un cliente para ver su generación por proyecto</p>
            </div>
            <template v-else>
              <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                  style="background:#915BD8">
                  {{ (clienteSeleccionado.nombre || clienteSeleccionado.razon_social || '?').charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-gray-800">{{ clienteSeleccionado.nombre || clienteSeleccionado.razon_social }}</h3>
                  <p class="text-xs text-gray-500">{{ proyectosCliente.length }} proyecto(s) activos</p>
                </div>
                <Button icon="pi pi-times" text rounded size="small" severity="secondary"
                  @click="clienteSeleccionado = null" />
              </div>

              <!-- KPIs cliente -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-gray-100">
                <div class="p-4 text-center border-r border-gray-100">
                  <div class="text-2xl font-bold text-gray-800">{{ proyectosCliente.length }}</div>
                  <div class="text-[10px] uppercase tracking-wide text-gray-500">Proyectos</div>
                </div>
                <div class="p-4 text-center border-r border-gray-100">
                  <div class="text-2xl font-bold" style="color:#D4A017">
                    {{ generacionCliente.reduce((s, r) => s + (r.mwh || 0), 0).toFixed(2) }}
                  </div>
                  <div class="text-[10px] uppercase tracking-wide text-gray-500">MWh ({{ genDias }}d)</div>
                </div>
                <div class="p-4 text-center border-r border-gray-100">
                  <div class="text-2xl font-bold" style="color:#915BD8">
                    {{ proyectosCliente.reduce((s, p) => s + (p.capacidad_kwp || 0), 0).toLocaleString('es-CO') }}
                  </div>
                  <div class="text-[10px] uppercase tracking-wide text-gray-500">kWp total</div>
                </div>
                <div class="p-4 text-center">
                  <div class="text-2xl font-bold text-red-600">{{ fallasPorClienteId(clienteSeleccionado.id) }}</div>
                  <div class="text-[10px] uppercase tracking-wide text-gray-500">Fallas activas</div>
                </div>
              </div>

              <DataTable v-if="proyectosCliente.length" :value="proyectosCliente" class="text-sm" stripedRows>
                <Column header="Proyecto">
                  <template #body="{ data }">
                    <span class="font-medium text-gray-800">{{ data.nombre_comercial }}</span>
                  </template>
                </Column>
                <Column header="Capacidad (kWp)">
                  <template #body="{ data }">
                    {{ data.capacidad_kwp ? data.capacidad_kwp.toLocaleString('es-CO') : '—' }}
                  </template>
                </Column>
                <Column :header="`MWh (${genDias}d)`">
                  <template #body="{ data }">
                    <span class="font-mono font-semibold">
                      {{ genMWhProyecto(data.nombre_comercial) != null
                        ? genMWhProyecto(data.nombre_comercial).toFixed(3)
                        : '—' }}
                    </span>
                  </template>
                </Column>
                <Column header="Rendimiento">
                  <template #body="{ data }">
                    <span v-if="data.capacidad_kwp && genMWhProyecto(data.nombre_comercial)" class="text-xs text-gray-600">
                      {{ ((genMWhProyecto(data.nombre_comercial) * 1000) / data.capacidad_kwp).toFixed(2) }} kWh/kWp
                    </span>
                    <span v-else class="text-gray-300">—</span>
                  </template>
                </Column>
                <Column header="Cumplimiento P90">
                  <template #body="{ data }">
                    <Tag v-if="data.p90_mensual && genMWhProyecto(data.nombre_comercial) != null"
                      :value="`${cumpleP90Pct(data, genDias)}%`"
                      :severity="cumpleP90Pct(data, genDias) >= 100 ? 'success' : cumpleP90Pct(data, genDias) >= 80 ? 'warn' : 'danger'" />
                    <span v-else class="text-gray-300">—</span>
                  </template>
                </Column>
                <Column header="Fallas activas">
                  <template #body="{ data }">
                    <Tag v-if="fallasPorProyectoId(data.id) > 0" :value="String(fallasPorProyectoId(data.id))" severity="danger" />
                    <Tag v-else value="0" severity="success" />
                  </template>
                </Column>
              </DataTable>
              <div v-else class="py-10 text-center text-sm text-gray-400">
                Este cliente no tiene proyectos registrados en la plataforma
              </div>
            </template>
          </div>
        </div>
      </TabPanel>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- TAB 4 — INFORMES                                               -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <TabPanel header="Informes">
        <div class="space-y-4 pt-2">

          <!-- Panel crear -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <button class="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              @click="showCrearInforme = !showCrearInforme">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: rgba(145,91,216,0.12);">
                  <i class="pi pi-file-edit text-sm" style="color:#915BD8" />
                </div>
                <span class="font-semibold text-sm text-gray-800">Crear nuevo informe</span>
              </div>
              <i :class="['pi', showCrearInforme ? 'pi-chevron-up' : 'pi-chevron-down', 'text-xs text-gray-400']" />
            </button>
            <div v-if="showCrearInforme" class="px-5 pb-5 pt-1 border-t border-gray-50">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div class="md:col-span-2 flex flex-col gap-1">
                  <label class="field-label">Proyecto</label>
                  <Select v-model="crearForm.proyectoId" :options="proyectos" optionLabel="nombre_comercial"
                    optionValue="id" placeholder="Seleccionar proyecto..." filter class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Tipo</label>
                  <Select v-model="crearForm.tipo" :options="TIPOS_INFORME" optionLabel="label" optionValue="value"
                    class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Mes</label>
                  <Select v-model="crearForm.mes" :options="MESES_OPTIONS" optionLabel="label" optionValue="value"
                    class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="field-label">Año</label>
                  <Select v-model="crearForm.anio" :options="ANIOS" class="w-full" />
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div v-if="crearForm.proyectoId" class="text-xs text-gray-500">
                  <Tag :value="crearForm.tipo === 'fmo' ? 'FMO' : 'OPER.'"
                    :severity="crearForm.tipo === 'fmo' ? 'warn' : 'info'" class="mr-2" />
                  {{ proyectos.find(p => p.id === crearForm.proyectoId)?.nombre_comercial }}
                  · {{ MESES[crearForm.mes - 1] }} {{ crearForm.anio }}
                </div>
                <span v-else />
                <Button label="Crear informe" icon="pi pi-plus" :loading="creando"
                  :disabled="!crearForm.proyectoId" @click="crearInforme" />
              </div>
            </div>
          </div>

          <!-- Lista informes -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-semibold text-sm text-gray-800">Informes generados</h3>
              <Button label="Actualizar" icon="pi pi-refresh" outlined size="small" @click="cargarInformes(true)" />
            </div>
            <div v-if="informesLoading" class="py-10 flex justify-center">
              <ProgressSpinner style="width:32px;height:32px" />
            </div>
            <div v-else-if="informesError" class="p-5 flex items-center gap-3 text-red-600 text-sm">
              <i class="pi pi-exclamation-circle text-xl" />
              <div class="flex-1">
                <div class="font-semibold">Error al cargar</div>
                <div class="text-gray-500">{{ informesError }}</div>
              </div>
              <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargarInformes(true)" />
            </div>
            <div v-else-if="!informes.length" class="py-12 text-center text-gray-400">
              <i class="pi pi-file text-3xl mb-2 block" />
              <p class="text-sm font-semibold">No hay informes generados</p>
              <p class="text-xs">Usa el botón "Crear informe" para generar el primero</p>
            </div>
            <div v-else>
              <button v-for="inf in informes" :key="inf.id"
                class="w-full flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left"
                @click="router.push(`/informes/${inf.id}`)">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <Tag :value="(inf.tipo || 'fmo').toUpperCase()"
                    :severity="inf.tipo === 'fmo' ? 'warn' : 'info'" class="text-[10px]" />
                  <div class="min-w-0">
                    <div class="font-medium text-sm text-gray-800 truncate">{{ inf.proyecto_nombre || '—' }}</div>
                    <div class="text-xs text-gray-500">{{ inf.periodo_display || fmtPeriodo(inf.periodo_desde) }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  <Tag :value="ESTADO_INFORME_LABELS[inf.estado] || inf.estado"
                    :severity="ESTADO_INFORME_SEVERITY[inf.estado] || 'secondary'" />
                  <span class="text-xs text-gray-500 hidden md:inline">{{ fmtFechaCorta(inf.creado_en || inf.created_at) }}</span>
                  <i class="pi pi-arrow-right text-xs text-gray-400" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </TabPanel>

    </TabView>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'
import ProgressSpinner from 'primevue/progressspinner'
import FallaForm from './FallaForm.vue'
import api from '@/api/client'

// ── Constantes ──────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_OPTIONS = MESES.map((label, i) => ({ value: i + 1, label }))
const _now = new Date()
const ANIOS = [_now.getFullYear() - 1, _now.getFullYear(), _now.getFullYear() + 1].filter(y => y >= 2024)

// Backend acepta 'op' | 'fmo' | 'port'. 'operaciones' fue un bug anterior.
const TIPOS_INFORME = [
  { value: 'fmo', label: 'FMO' },
  { value: 'op',  label: 'Operaciones' },
]

const ESTADO_INFORME_LABELS = { borrador: 'Borrador', revisado: 'Revisado', aprobado: 'Aprobado' }
const ESTADO_INFORME_SEVERITY = { borrador: 'warn', revisado: 'info', aprobado: 'success' }

const router = useRouter()
const toast = useToast()

// ── Tabs ────────────────────────────────────────────────────────────────
const activeTab = ref(0)

// ════════════════════════════════════════════════════════════════════════
// TAB 0 — FALLAS
// ════════════════════════════════════════════════════════════════════════
const todasLasFallas = ref([])
const loading = ref(false)
const error = ref(null)
const saving = ref(false)
const showDialog = ref(false)
const catalogos = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })
const proyectos = ref([])

const buscar = ref('')
const filtroEstado = ref('')
const filtroPrioridad = ref('')
const filtroProyecto = ref('')

const hayFiltros = computed(() =>
  buscar.value || filtroEstado.value || filtroPrioridad.value || filtroProyecto.value
)

const kpis = computed(() => ({
  abierta: todasLasFallas.value.filter(f => f.estado?.codigo === 'abierta').length,
  en_gestion: todasLasFallas.value.filter(f => f.estado?.codigo === 'en_gestion').length,
  en_espera: todasLasFallas.value.filter(f => f.estado?.codigo === 'en_espera').length,
  critica: todasLasFallas.value.filter(f => f.prioridad?.codigo === 'critica').length,
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
    if (filtroEstado.value && f.estado?.codigo !== filtroEstado.value) return false
    if (filtroPrioridad.value && f.prioridad?.codigo !== filtroPrioridad.value) return false
    if (filtroProyecto.value && f.proyecto?.id !== filtroProyecto.value) return false
    return true
  })
)

async function cargar() {
  loading.value = true
  error.value = null
  try {
    const { data: primera } = await api.get('/fallas', { params: { page: 1, size: 200 } })
    const total = primera.total ?? 0
    const items = [...(primera.items ?? [])]
    if (total > 200) {
      const totalPages = Math.ceil(total / 200)
      const restResults = await Promise.allSettled(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/fallas', { params: { page: i + 2, size: 200 } })
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

// ════════════════════════════════════════════════════════════════════════
// TAB 1 — GENERACIÓN
// ════════════════════════════════════════════════════════════════════════
const genLoading = ref(false)
const genError = ref(null)
const genHistorial = ref([])
const genFlota = ref({})
const genDias = ref(30)
const genSeleccionados = ref([])
const genBuscarProyecto = ref('')
const genDropdownOpen = ref(false)
const genSelectorRef = ref(null)

// Opciones del selector usan `proyectos` (disponible desde el inicio, sin esperar API generación)
const genProyectosOpciones = computed(() => {
  const q = genBuscarProyecto.value.toLowerCase()
  return proyectos.value
    .filter(p => !q || (p.nombre_comercial || '').toLowerCase().includes(q))
    .slice(0, 50)
})

const genTotalMWh = computed(() => genHistorial.value.reduce((s, h) => s + (h.mwh || 0), 0))

const genDatosFiltrados = computed(() => {
  if (!genSeleccionados.value.length) {
    return [...genHistorial.value].sort((a, b) => b.mwh - a.mwh)
  }
  return genHistorial.value.filter(h => genSeleccionados.value.includes(h.name))
})

const genConP90 = computed(() =>
  genDatosFiltrados.value.map(h => {
    const p = proyectos.value.find(proj =>
      (proj.nombre_comercial || '').toLowerCase() === (h.name || '').toLowerCase()
    )
    const p90_kwh = p?.p90_mensual ?? null
    const p90_esperado = p90_kwh ? p90_kwh * (genDias.value / 30) : null
    const kwh_actual = h.mwh * 1000
    const pct_p90 = p90_esperado ? Math.round(kwh_actual / p90_esperado * 100) : null
    return { ...h, p90_kwh, pct_p90 }
  })
)

const genP90CumpleCount = computed(() => {
  const con_p90 = genConP90.value.filter(r => r.pct_p90 !== null)
  if (!con_p90.length) return null
  return con_p90.filter(r => r.pct_p90 >= 100).length
})

const genMaxMwh = computed(() => Math.max(...genDatosFiltrados.value.map(h => h.mwh), 1))

function genBarWidth(mwh) { return Math.max(2, (mwh / genMaxMwh.value) * 100) }
function genBarColor(row) {
  if (row.pct_p90 === null) return '#915BD8'
  if (row.pct_p90 >= 100) return '#10B981'
  if (row.pct_p90 >= 80) return '#F0C040'
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
  genError.value = null
  try {
    const [histRes, fleetRes] = await Promise.allSettled([
      api.get('/generacion-solar/fleet/history/by-project', { params: { days: genDias.value } }),
      api.get('/generacion-solar/fleet'),
    ])
    if (histRes.status === 'fulfilled') genHistorial.value = histRes.value.data ?? []
    if (fleetRes.status === 'fulfilled') genFlota.value = fleetRes.value.data ?? {}
  } catch (e) {
    genError.value = e.message || 'Error cargando generación'
  } finally {
    genLoading.value = false
  }
}

// ════════════════════════════════════════════════════════════════════════
// TAB 2 — GRÁFICOS
// ════════════════════════════════════════════════════════════════════════
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
  groupBy(fallasFiltGraficos.value, f => f.tipo?.categoria?.etiqueta, f => f.tipo?.categoria?.color_hex || '#915BD8')
)
const fallasPorProyecto = computed(() => groupBy(todasLasFallas.value, f => f.proyecto?.nombre_comercial))
const fallasPorTipo = computed(() => groupBy(fallasFiltGraficos.value, f => f.tipo?.etiqueta))
const topProyecto = computed(() => fallasPorProyecto.value[0] || null)
const barMax = computed(() => Math.max(...fallasPorCategoria.value.map(g => g.count), 1))

const grafKpis = computed(() => {
  const arr = fallasFiltGraficos.value
  const resueltas = arr.filter(f => f.sla_cumplido === true || f.estado?.codigo === 'cerrada').length
  const criticas = arr.filter(f => f.prioridad?.codigo === 'critica').length
  const tasa = arr.length ? Math.round(resueltas / arr.length * 100) : 0
  const conDias = arr.filter(f => f.dias_abierta != null)
  const avg = conDias.length ? Math.round(conDias.reduce((s, f) => s + f.dias_abierta, 0) / conDias.length) : 0
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

// ════════════════════════════════════════════════════════════════════════
// TAB 3 — CLIENTES
// ════════════════════════════════════════════════════════════════════════
const clientes = ref([])
const clientesLoading = ref(false)
const clienteBuscar = ref('')
const clienteSoloConProyectos = ref(false)
const clienteSeleccionado = ref(null)

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

const proyectosCliente = computed(() => {
  if (!clienteSeleccionado.value) return []
  return proyectosPorClienteId(clienteSeleccionado.value.id)
})

const generacionCliente = computed(() => {
  if (!proyectosCliente.value.length || !genHistorial.value.length) return []
  const nombres = new Set(proyectosCliente.value.map(p => (p.nombre_comercial || '').toLowerCase()))
  return genHistorial.value.filter(h => nombres.has((h.name || '').toLowerCase()))
})

function proyectosPorClienteId(clienteId) {
  return proyectos.value.filter(p => p.cliente_id === clienteId || p.cliente?.id === clienteId)
}
function genMWhParaCliente(clienteId) {
  const proys = proyectosPorClienteId(clienteId)
  if (!proys.length || !genHistorial.value.length) return 0
  const nombres = new Set(proys.map(p => (p.nombre_comercial || '').toLowerCase()))
  return genHistorial.value.filter(h => nombres.has((h.name || '').toLowerCase())).reduce((s, h) => s + (h.mwh || 0), 0)
}
function genMWhProyecto(nombre) {
  const h = genHistorial.value.find(h => (h.name || '').toLowerCase() === (nombre || '').toLowerCase())
  return h ? h.mwh : null
}
function fallasPorClienteId(clienteId) {
  const proys = new Set(proyectosPorClienteId(clienteId).map(p => p.id))
  return todasLasFallas.value.filter(f =>
    proys.has(f.proyecto?.id) && f.estado?.codigo !== 'cerrada' && f.sla_cumplido !== true
  ).length
}
function fallasPorProyectoId(proyectoId) {
  return todasLasFallas.value.filter(f =>
    f.proyecto?.id === proyectoId && f.estado?.codigo !== 'cerrada' && f.sla_cumplido !== true
  ).length
}
function cumpleP90Pct(proyecto, dias) {
  const mwh = genMWhProyecto(proyecto.nombre_comercial)
  if (mwh == null || !proyecto.p90_mensual) return null
  const kwh_actual = mwh * 1000
  const p90_esperado = proyecto.p90_mensual * (dias / 30)
  return Math.round(kwh_actual / p90_esperado * 100)
}
async function seleccionarCliente(c) {
  clienteSeleccionado.value = c
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

// ════════════════════════════════════════════════════════════════════════
// TAB 4 — INFORMES
// ════════════════════════════════════════════════════════════════════════
const informes = ref([])
const informesLoading = ref(false)
const informesError = ref(null)
const showCrearInforme = ref(false)
const creando = ref(false)
const crearForm = ref({
  proyectoId: '',
  tipo: 'fmo',
  mes: _now.getMonth() + 1,
  anio: _now.getFullYear(),
})

async function cargarInformes(force = false) {
  if (informesLoading.value && !force) return
  informesLoading.value = true
  informesError.value = null
  try {
    const { data } = await api.get('/informes/', { params: { limit: 200 } })
    informes.value = Array.isArray(data) ? data : (data.items ?? [])
  } catch (e) {
    informesError.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    informesLoading.value = false
  }
}

function plantillaInformeHTML(proyecto, tipo, periodoDisplay) {
  const tipoLabel = tipo === 'fmo' ? 'FMO' : 'Operaciones'
  return `<div class="informe-template">
  <h1>Informe ${tipoLabel} — ${proyecto.nombre_comercial}</h1>
  <p><strong>Período:</strong> ${periodoDisplay}</p>
  <h2>Resumen ejecutivo</h2>
  <p>Edita este informe haciendo clic en cualquier texto.</p>
  <h2>Generación</h2>
  <p>—</p>
  <h2>Fallas e incidencias</h2>
  <p>—</p>
  <h2>Conclusiones</h2>
  <p>—</p>
</div>`
}

async function crearInforme() {
  const proyecto = proyectos.value.find(p => p.id === crearForm.value.proyectoId)
  if (!proyecto) return
  creando.value = true
  try {
    const firstDay = new Date(crearForm.value.anio, crearForm.value.mes - 1, 1)
    const lastDay = new Date(crearForm.value.anio, crearForm.value.mes, 0)
    const periodo_desde = firstDay.toISOString().split('T')[0]
    const periodo_hasta = lastDay.toISOString().split('T')[0]
    const periodo_display = `${MESES[crearForm.value.mes - 1]} ${crearForm.value.anio}`
    const sub_project = proyecto.sub_project || proyecto.solenium_id || proyecto.codigo_solenium || proyecto.nombre_comercial

    const { data: newInforme } = await api.post('/informes/', {
      tipo: crearForm.value.tipo,
      sub_project,
      periodo_desde,
      periodo_hasta,
      periodo_display,
      proyecto_nombre: proyecto.nombre_comercial,
      html_content: plantillaInformeHTML(proyecto, crearForm.value.tipo, periodo_display),
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

// ════════════════════════════════════════════════════════════════════════
// HELPERS VISUALES
// ════════════════════════════════════════════════════════════════════════
function pillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}40` }
}
function catTagStyle(hex) {
  const c = hex || '#915BD8'
  return { display: 'inline-block', background: c + '18', color: c, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }
}
function kpiActiveStyle(color, active) {
  return active ? { boxShadow: `inset 0 0 0 2px ${color}` } : {}
}
function prioSeverity(codigo) {
  return { critica: 'danger', alta: 'warn', media: 'info', baja: 'secondary' }[codigo] || 'secondary'
}
function slaRisk(f) {
  if (!f.sla_limite_horas || f.sla_cumplido !== null) return false
  if (!f.fecha_identificacion) return false
  const inicio = new Date(f.fecha_identificacion + 'T00:00:00')
  const deadline = new Date(inicio.getTime() + f.sla_limite_horas * 3_600_000)
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

// ════════════════════════════════════════════════════════════════════════
// WATCH + MOUNTED
// ════════════════════════════════════════════════════════════════════════
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
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b5a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.kpi-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 12px 14px;
  background: #fff;
  border: 1px solid #ece8f4;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  overflow: hidden;
}
.kpi-card:hover { background: #faf9fc; transform: translateY(-1px); }
.kpi-card--active { background: #faf7ff; }

.kpi-val {
  font-size: 26px;
  font-weight: 800;
  color: #2C2039;
  line-height: 1;
}
.kpi-lbl {
  font-size: 11px;
  color: #6b5a8a;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}
.kpi-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
}

.cat-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
</style>
