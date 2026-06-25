<template>
  <div class="p-5 space-y-5 min-h-screen" style="background: #FDFAF7; color: #2C2039;">

    <!-- Header -->
    <PageHeader title="Cumplimiento PPA" subtitle="Generación vs. compromisos contractuales de energía">
      <template #lead>
        <div class="cv-icon-tile"><i class="pi pi-bolt" /></div>
      </template>
      <template #actions>
        <span v-if="cacheSize" class="text-xs font-mono px-2 py-1 rounded" style="background: rgba(145,91,216,0.08); color: #915BD8;">
          caché: {{ cacheSize }}
        </span>
        <button @click="clearCacheAndReload"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style="border: 1px solid rgba(214,68,85,0.3); color: #D64455; background: rgba(214,68,85,0.05);"
          :style="cacheClearing ? 'opacity: 0.6; pointer-events: none;' : ''">
          <i class="pi pi-refresh text-xs" :class="{ 'pi-spin': cacheClearing }" />
          Borrar caché y consultar energía
        </button>
      </template>
    </PageHeader>

    <!-- Tab bar -->
    <div class="flex gap-1 border-b -mt-1" style="border-color: rgba(44,32,57,0.08);">
      <button
        v-for="(tab, i) in TABS"
        :key="i"
        @click="activeTab = i"
        class="cv-tab"
        :class="{ active: activeTab === i }"
      >{{ tab }}</button>
    </div>

    <!-- ═══════════════ CUMPLIMIENTO TAB ═══════════════ -->
    <div v-show="activeTab === 1" class="space-y-6">

      <!-- Selectors -->
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="selectedYear" :options="years" class="w-24" @change="onYearChange" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Contrato</label>
          <Select
            v-model="selectedContratoId"
            :options="contratos"
            optionLabel="label"
            optionValue="id"
            placeholder="Seleccionar contrato"
            class="w-72"
            @change="loadAnnualData"
          />
        </div>
      </div>

      <!-- Chart loading -->
      <div v-if="chartLoading" class="flex flex-col items-center justify-center py-20 gap-3">
        <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
        <p class="text-sm" style="color: #7a6e8a;">Consultando generación para 12 meses…</p>
      </div>

      <!-- Chart error -->
      <Message v-else-if="chartError" severity="error" :closable="false">{{ chartError }}</Message>

      <!-- Chart -->
      <template v-else-if="anualData">
        <div class="flex items-center gap-2 text-sm flex-wrap" style="color: #7a6e8a;">
          <span class="font-semibold text-base" style="color: #2C2039;">
            {{ anualData.contrato.nombre_interno || anualData.contrato.numero_codigo_contrato }}
          </span>
          <span>·</span>
          <span>{{ anualData.contrato.comprador_nombre }}</span>
          <span>·</span>
          <span>{{ anualData.year }}</span>
          <span v-if="selectedContratoId === CONSOLIDADO_ID" class="text-xs px-2 py-0.5 rounded-full font-medium" style="background: rgba(145,91,216,0.12); color: #915BD8;">
            Suma de todos los contratos
          </span>
        </div>

        <div class="cv-panel p-4">
          <div ref="chartBox" class="relative select-none" style="width: 100%; height: 360px;">
            <svg
              :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
              preserveAspectRatio="xMidYMid meet"
              style="width: 100%; height: 100%;"
              @mousemove="onSvgMousemove"
              @mouseleave="hovered = null"
              @click="onSvgClick"
            >
              <g v-for="gl in yGridLines" :key="gl.val">
                <line :x1="PAD_L" :y1="gl.y" :x2="SVG_W - PAD_R" :y2="gl.y" stroke="rgba(44,32,57,0.07)" stroke-width="1" />
                <text :x="PAD_L - 7" :y="gl.y + 4" text-anchor="end" font-size="10" fill="#7a6e8a">{{ fmtShort(gl.val) }}</text>
              </g>

              <g v-for="(mes, i) in anualData.meses" :key="i">
                <!-- Background highlights -->
                <rect v-if="isCurrentMonth(mes)" :x="slotX(i)" y="0" :width="slotW" :height="SVG_H - PAD_B + 2" fill="rgba(145,91,216,0.06)" />
                <rect v-if="selectedMonthIdx === i" :x="slotX(i)" y="0" :width="slotW" :height="SVG_H - PAD_B + 2" fill="rgba(240,192,64,0.08)" />
                <!-- Commitment zone (green band) -->
                <rect v-if="mes.min_mwh !== null && mes.max_mwh !== null" :x="slotX(i)" :y="toY(mes.max_mwh)" :width="slotW" :height="toY(mes.min_mwh) - toY(mes.max_mwh)" fill="rgba(46,125,50,0.10)" />

                <!-- CURRENT MONTH: two bars side by side -->
                <template v-if="mes.tipo_datos === 'mes_actual'">
                  <!-- Left bar: actual generation (solid) -->
                  <rect v-if="mes.gen_mwh > 0"
                    :x="dualBarLeftX(i)" :y="toY(mes.gen_mwh)" :width="dualBarW" :height="toY(0) - toY(mes.gen_mwh)"
                    fill="#915BD8" rx="1" />
                  <!-- Right bar: projected close (lighter + pattern) -->
                  <rect v-if="cierreVal(mes) > 0"
                    :x="dualBarRightX(i)" :y="toY(cierreVal(mes))" :width="dualBarW" :height="toY(0) - toY(cierreVal(mes))"
                    fill="rgba(59,186,220,0.65)" rx="1" />
                  <rect v-if="cierreVal(mes) > 0"
                    :x="dualBarRightX(i)" :y="toY(cierreVal(mes))" :width="dualBarW" :height="toY(0) - toY(cierreVal(mes))"
                    fill="none" stroke="rgba(59,186,220,0.9)" stroke-width="1" stroke-dasharray="3,2" rx="1" />
                  <!-- Deficit/excedent shading on projection bar -->
                  <rect v-if="mes.estado === 'deficit' && mes.min_mwh !== null && cierreVal(mes) > 0 && cierreVal(mes) < mes.min_mwh"
                    :x="dualBarRightX(i)" :y="toY(mes.min_mwh)" :width="dualBarW" :height="toY(cierreVal(mes)) - toY(mes.min_mwh)"
                    fill="rgba(214,68,85,0.32)" />
                  <rect v-if="mes.estado === 'excedente' && mes.max_mwh !== null && cierreVal(mes) > mes.max_mwh"
                    :x="dualBarRightX(i)" :y="toY(cierreVal(mes))" :width="dualBarW" :height="toY(mes.max_mwh) - toY(cierreVal(mes))"
                    fill="rgba(20,184,166,0.5)" />
                </template>

                <!-- PAST / FUTURE months: single bar -->
                <template v-else>
                  <rect v-if="genVal(mes) > 0" :x="barX(i)" :y="toY(genVal(mes))" :width="barW" :height="toY(0) - toY(genVal(mes))"
                    :fill="mes.tipo_datos === 'proyeccion_historica' ? 'rgba(59,186,220,0.55)' : '#915BD8'" />
                  <rect v-if="genVal(mes) > 0 && mes.tipo_datos === 'proyeccion_historica'" :x="barX(i)" :y="toY(genVal(mes))" :width="barW" :height="toY(0) - toY(genVal(mes))"
                    fill="none" stroke="rgba(59,186,220,0.9)" stroke-width="1" stroke-dasharray="3,2" />
                  <rect v-if="mes.estado === 'deficit' && mes.min_mwh !== null && genVal(mes) > 0 && genVal(mes) < mes.min_mwh"
                    :x="barX(i)" :y="toY(mes.min_mwh)" :width="barW" :height="toY(genVal(mes)) - toY(mes.min_mwh)"
                    fill="rgba(214,68,85,0.32)" />
                  <rect v-if="mes.estado === 'excedente' && mes.max_mwh !== null && genVal(mes) > mes.max_mwh"
                    :x="barX(i)" :y="toY(genVal(mes))" :width="barW" :height="toY(mes.max_mwh) - toY(genVal(mes))"
                    fill="rgba(20,184,166,0.5)" />
                </template>

                <!-- Min/max lines -->
                <line v-if="mes.min_mwh !== null" :x1="slotX(i)" :y1="toY(mes.min_mwh)" :x2="slotX(i) + slotW" :y2="toY(mes.min_mwh)" stroke="rgba(214,68,85,0.50)" stroke-width="1" />
                <line v-if="mes.max_mwh !== null" :x1="slotX(i)" :y1="toY(mes.max_mwh)" :x2="slotX(i) + slotW" :y2="toY(mes.max_mwh)" stroke="rgba(145,91,216,0.50)" stroke-width="1" />
                <!-- Hover highlight -->
                <rect v-if="hovered === i && selectedMonthIdx !== i" :x="slotX(i)" :y="PAD_T" :width="slotW" :height="PLOT_H" fill="rgba(145,91,216,0.07)" />
                <!-- Month label -->
                <circle v-if="selectedMonthIdx === i" :cx="slotX(i) + slotW / 2" :cy="SVG_H - PAD_B + 30" r="3" fill="#F0C040" />
                <text :x="slotX(i) + slotW / 2" :y="SVG_H - PAD_B + 17" text-anchor="middle" font-size="11"
                  :fill="selectedMonthIdx === i ? '#F0C040' : isCurrentMonth(mes) ? '#2C2039' : '#7a6e8a'"
                  :font-weight="selectedMonthIdx === i || isCurrentMonth(mes) ? '700' : '400'"
                >{{ MESES_CORTOS[i] }}</text>
                <!-- Clickable area -->
                <rect :x="slotX(i)" :y="PAD_T" :width="slotW" :height="PLOT_H" fill="transparent" style="cursor: pointer;" />
              </g>

              <line :x1="PAD_L" :y1="PAD_T" :x2="PAD_L" :y2="PAD_T + PLOT_H" stroke="rgba(44,32,57,0.18)" stroke-width="1" />
              <line :x1="PAD_L" :y1="PAD_T + PLOT_H" :x2="SVG_W - PAD_R" :y2="PAD_T + PLOT_H" stroke="rgba(44,32,57,0.18)" stroke-width="1" />
            </svg>

            <!-- Tooltip -->
            <div
              v-if="hovered !== null && anualData.meses[hovered]"
              class="absolute pointer-events-none z-10 rounded-xl shadow-lg text-sm"
              style="background: #2C2039; color: #FDFAF7; padding: 10px 14px; min-width: 200px;"
              :style="{ left: tooltipX + 'px', top: tooltipY + 'px', transform: 'translateY(-100%)' }"
            >
              <div class="font-bold mb-2" style="color: #F0C040;">
                {{ MESES[hovered] }} {{ selectedYear }}
                <span v-if="anualData.meses[hovered].tipo_datos === 'mes_actual'" class="ml-1 text-xs font-normal" style="color: rgba(59,186,220,0.85);">mes en curso</span>
                <span v-else-if="anualData.meses[hovered].tipo_datos === 'proyeccion_historica'" class="ml-1 text-xs font-normal" style="color: rgba(253,250,247,0.55);">proyección</span>
              </div>
              <div class="space-y-1">
                <!-- Current month: show both actual and projection -->
                <template v-if="anualData.meses[hovered].tipo_datos === 'mes_actual'">
                  <div class="flex justify-between gap-6">
                    <span style="color: #c4a1f0;">Generación actual</span>
                    <span class="font-mono font-semibold" style="color: #c4a1f0;">{{ fmtMwh(anualData.meses[hovered].gen_mwh) }}</span>
                  </div>
                  <div v-if="cierreVal(anualData.meses[hovered])" class="flex justify-between gap-6">
                    <span style="color: rgba(59,186,220,0.9);">Proy. cierre</span>
                    <span class="font-mono font-bold" style="color: rgba(59,186,220,0.95);">{{ fmtMwh(cierreVal(anualData.meses[hovered])) }}</span>
                  </div>
                  <div v-if="anualData.meses[hovered].dias_restantes != null" class="text-xs mt-0.5" style="color: rgba(253,250,247,0.40);">
                    {{ anualData.meses[hovered].dia_actual }}d transcurridos · {{ anualData.meses[hovered].dias_restantes }}d restantes
                  </div>
                </template>
                <!-- Past / Future: single value -->
                <template v-else>
                  <div class="flex justify-between gap-6">
                    <span style="color: rgba(253,250,247,0.65);">Generación</span>
                    <span class="font-mono font-semibold">{{ fmtMwh(genVal(anualData.meses[hovered])) }}</span>
                  </div>
                </template>
                <div v-if="anualData.meses[hovered].min_mwh !== null" class="flex justify-between gap-6">
                  <span style="color: rgba(253,250,247,0.65);">Mínimo</span>
                  <span class="font-mono">{{ fmtMwh(anualData.meses[hovered].min_mwh) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].max_mwh !== null" class="flex justify-between gap-6">
                  <span style="color: rgba(253,250,247,0.65);">Máximo</span>
                  <span class="font-mono">{{ fmtMwh(anualData.meses[hovered].max_mwh) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].estado === 'deficit'" class="flex justify-between gap-6 mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #D64455;">Déficit (proy.)</span>
                  <span class="font-mono font-bold" style="color: #D64455;">{{ fmtMwh(anualData.meses[hovered].compras_bolsa_mwh) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].estado === 'excedente'" class="flex justify-between gap-6 mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #2DD4BF;">Excedente (proy.)</span>
                  <span class="font-mono font-bold" style="color: #2DD4BF;">{{ fmtMwh(anualData.meses[hovered].excedentes_bolsa_mwh) }}</span>
                </div>
              </div>
              <div class="mt-2 pt-1 text-xs" style="color: rgba(253,250,247,0.35);">Clic para ver desglose</div>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-5 mt-3 pl-1">
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(46,125,50,0.18); border: 1px solid rgba(46,125,50,0.45);"></div>Zona de cumplimiento</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: #915BD8;"></div>Generación real</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(59,186,220,0.65); border: 1px dashed rgba(59,186,220,0.9);"></div>Proyección cierre (prom. 30d)</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(214,68,85,0.38);"></div>Brecha de déficit</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(20,184,166,0.6);"></div>Excedente contractual</div>
          </div>
        </div>
      </template>

      <!-- Empty chart state -->
      <div v-else-if="!chartLoading && !chartError" class="text-center py-16 cv-panel" style="color: #7a6e8a;">
        <i class="pi pi-chart-bar text-4xl mb-3 block" style="color: #915BD8;" />
        <p>Selecciona un año y un contrato para ver el cumplimiento anual.</p>
      </div>

      <!-- Summary table -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold" style="color: #2C2039;">Resumen anual por contrato — {{ selectedYear }}</h2>
          <span v-if="tableLoading" class="text-xs" style="color: #7a6e8a;">Cargando…</span>
        </div>
        <DataTable
          :value="tableDataWithTotal"
          size="small"
          stripedRows
          class="cv-panel overflow-hidden cursor-pointer"
          @row-click="e => selectContrato(e.data.id)"
          :rowClass="row => row.id === selectedContratoId ? 'row-selected' : row.id === CONSOLIDADO_ID ? 'row-consolidado' : ''"
        >
          <Column header="Contrato" style="min-width: 200px;">
            <template #body="{ data: row }">
              <div class="font-semibold text-sm" style="color: #2C2039;">{{ row.nombre_interno || row.numero_codigo_contrato }}</div>
              <div class="text-xs mt-0.5" style="color: #7a6e8a;">{{ row.comprador_nombre }}</div>
            </template>
          </Column>
          <Column header="Vigencia" style="width: 190px;">
            <template #body="{ data: row }">
              <span class="text-xs" style="color: #7a6e8a;">{{ fmtFecha(row.fecha_inicio) }} – {{ fmtFecha(row.fecha_fin) }}</span>
            </template>
          </Column>
          <Column header="Mín anual" style="width: 130px; text-align: right;">
            <template #body="{ data: row }">
              <span v-if="row.total_min_mwh !== null" class="font-mono text-sm">{{ fmtMwh(row.total_min_mwh) }}</span>
              <span v-else class="text-xs" style="color: #b0a0c0;">—</span>
            </template>
          </Column>
          <Column header="Máx anual" style="width: 130px; text-align: right;">
            <template #body="{ data: row }">
              <span v-if="row.total_max_mwh !== null" class="font-mono text-sm">{{ fmtMwh(row.total_max_mwh) }}</span>
              <span v-else class="text-xs" style="color: #b0a0c0;">—</span>
            </template>
          </Column>
          <Column header="Meses" style="width: 90px; text-align: center;">
            <template #body="{ data: row }">
              <span class="font-mono text-sm">{{ row.meses_con_compromisos }}<span class="text-xs" style="color: #7a6e8a;">/12</span></span>
            </template>
          </Column>
          <Column style="width: 44px; text-align: center;">
            <template #body="{ data: row }">
              <i :class="row.id === selectedContratoId ? 'pi pi-chart-bar' : 'pi pi-chevron-right'" class="text-xs" style="color: #915BD8;" />
            </template>
          </Column>
        </DataTable>
      </div>

    </div>

    <!-- ═══════════════ SIMULADOR TAB ═══════════════ -->
    <div v-show="activeTab === 0" class="space-y-5">

      <!-- Controls -->
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="simYear" :options="years" class="w-24" @change="loadSimulator" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Mes</label>
          <Select v-model="simMonth" :options="MESES_OPTIONS" optionLabel="label" optionValue="value" class="w-36" @change="loadSimulator" />
        </div>
        <button @click="resetSim" class="cv-btn">
          <i class="pi pi-refresh text-xs" style="color: #915BD8;" />Resetear
        </button>
        <button v-if="hiddenContratos.size > 0" @click="showAllContratos" class="cv-btn">
          <i class="pi pi-eye text-xs" style="color: #2e7d32;" />Mostrar ocultos ({{ hiddenContratos.size }})
        </button>
        <button
          @click="sortDesc = !sortDesc"
          class="cv-btn"
          v-tooltip="sortDesc ? 'Mayor cumplimiento primero' : 'Menor cumplimiento primero'"
        >
          <i class="pi text-xs" :class="sortDesc ? 'pi-sort-amount-down' : 'pi-sort-amount-up'" style="color: #915BD8;" />
          {{ sortDesc ? '↓ Mayor %' : '↑ Menor %' }}
        </button>

        <!-- Filtro por estado (derivado de la proyección de cierre) -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            @click="estadoFiltro = null"
            class="cv-btn"
            :style="estadoFiltro === null ? 'border-color:#915BD8; background:rgba(145,91,216,0.10); color:#915BD8; font-weight:700;' : ''"
          >Todos</button>
          <button
            v-for="f in ESTADO_FILTROS"
            :key="f.key"
            @click="toggleEstadoFiltro(f.key)"
            class="cv-btn"
            :style="estadoFiltro === f.key ? `border-color:${f.color}; background:${f.color}1f; color:${f.color}; font-weight:700;` : ''"
            v-tooltip="f.tip"
          >
            <span class="inline-block rounded-full" :style="`width:8px; height:8px; background:${f.color};`"></span>
            {{ f.label }}
            <b class="ml-0.5">{{ estadoCounts[f.key] }}</b>
          </button>
        </div>

        <div class="flex-1"></div>
        <button @click="showNuevoForm = true" class="cv-btn-cta">
          <i class="pi pi-plus text-xs" />PPA nuevo
        </button>
        <span class="w-full text-xs" style="color: #9b8fb0;">Arrastra las plantas entre contratos para simular</span>
      </div>

      <!-- Formulario PPA nuevo -->
      <div v-if="showNuevoForm" class="rounded-xl border p-5" style="background: white; border-color: rgba(240,192,64,0.4);">
        <div class="flex items-center gap-2 mb-4">
          <i class="pi pi-bolt" style="color: #F0C040;" />
          <span class="font-bold text-sm" style="color: #2C2039;">Nuevo PPA nuevo</span>
        </div>
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold" style="color: #7a6e8a;">Nombre</label>
            <InputText v-model="ficticioNombre" placeholder="Ej: PPA Simulado 1" class="w-48" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold" style="color: #7a6e8a;">Mínimo (MWh)</label>
            <InputText v-model.number="ficticioMin" type="number" placeholder="0" class="w-32" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold" style="color: #7a6e8a;">Máximo (MWh)</label>
            <InputText v-model.number="ficticioMax" type="number" placeholder="0" class="w-32" />
          </div>
          <div class="flex gap-2">
            <button
              @click="crearNuevo"
              :disabled="!ficticioNombre || ficticioMax <= 0"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition"
              :style="!ficticioNombre || ficticioMax <= 0
                ? 'background: rgba(44,32,57,0.08); color: rgba(44,32,57,0.3); cursor: not-allowed;'
                : 'background: #915BD8; color: white; cursor: pointer;'"
            >
              <i class="pi pi-check text-xs" />Crear
            </button>
            <button
              @click="showNuevoForm = false"
              class="px-3 py-2 rounded-lg text-sm transition"
              style="color: #7a6e8a;"
            >Cancelar</button>
          </div>
        </div>
      </div>

      <div v-if="simLoading" class="flex flex-col items-center justify-center py-20 gap-3">
        <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
        <p class="text-sm" style="color: #7a6e8a;">Cargando generación promedio de las plantas…</p>
      </div>

      <div v-else-if="simError" class="flex flex-col items-center gap-3 py-10">
        <Message severity="error" :closable="false">{{ simError }}</Message>
        <button @click="loadSimulator()"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style="background: #915BD8; color: white;">
          <i class="pi pi-refresh mr-1" /> Reintentar
        </button>
      </div>

      <template v-else-if="simData">

        <!-- Contract columns (responsive grid) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div
              v-for="c in visibleContratos"
              :key="c.id"
              class="cv-card flex flex-col"
              :class="{ 'cv-card-dragover': dragOver === c.id }"
              @dragover.prevent="onDragOver(c.id)"
              @drop.prevent="onDrop(c.id)"
            >
              <!-- Contract header -->
              <div
                class="px-4 pt-3 pb-2 border-b flex items-start justify-between gap-2 cursor-pointer select-none"
                style="border-color: rgba(44,32,57,0.07);"
                @click="toggleExpand(c.id)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <i
                    class="pi text-xs transition-transform flex-shrink-0"
                    :class="expandedContratos.includes(c.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
                    style="color: #915BD8;"
                  />
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-sm truncate" style="color: #2C2039;">{{ c.nombre }}</span>
                      <span v-if="c._ficticio" class="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style="background: rgba(240,192,64,0.18); color: #9a6700;">Nuevo</span>
                      <span v-if="simResults[c.id]?.plantasEsp != null"
                        class="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                        :style="estadoBadge(simResults[c.id].estadoPlantas)"
                        v-tooltip="'Plantas registradas en GESCON / inscritas exigidas por el contrato este mes'"
                      >{{ simResults[c.id].plantasReg }}/{{ simResults[c.id].plantasEsp }} plantas</span>
                      <span v-else class="text-xs font-mono flex-shrink-0" style="color: #7a6e8a;">{{ (simAssignments[c.id] || []).length }} plantas</span>
                      <span v-if="simResults[c.id]?.pct !== null && simResults[c.id]?.pct !== undefined"
                        class="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                        :style="estadoBadge(simResults[c.id].estado)"
                      >{{ Math.round(simResults[c.id].pct) }}%</span>
                    </div>
                    <div class="text-xs mt-0.5 truncate" style="color: #7a6e8a;">{{ c.comprador_nombre }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    @click.stop="abrirDetalleCapa(c)"
                    class="rounded-md p-1 transition-colors hover:bg-purple-50"
                    style="color: #915BD8;"
                    v-tooltip="'Ver detalle de la capa'"
                  >
                    <i class="pi pi-window-maximize text-xs" />
                  </button>
                  <button
                    v-if="c._ficticio"
                    @click.stop="eliminarNuevo(c.id)"
                    class="rounded-md p-1 transition-colors hover:bg-red-50"
                    style="color: #D64455;"
                    v-tooltip="'Eliminar PPA'"
                  >
                    <i class="pi pi-trash text-xs" />
                  </button>
                  <button
                    @click.stop="hideContrato(c.id)"
                    class="rounded-md p-1 transition-colors hover:bg-red-50"
                    style="color: #b0a0c0;"
                    v-tooltip="'Ocultar contrato'"
                  >
                    <i class="pi pi-eye-slash text-xs" />
                  </button>
                </div>
              </div>

              <!-- Cumplimiento — tabla de energías + barras consecutivas -->
              <div class="px-4 py-3 border-b" style="border-color: rgba(44,32,57,0.07);" v-if="simResults[c.id]">
                <!-- Tabla: títulos + valores -->
                <div class="grid grid-cols-3 gap-x-3 mb-3">
                  <div>
                    <div class="text-[10px] font-semibold uppercase tracking-wide leading-tight" style="color: #7a6e8a;">Energía entregada</div>
                    <div class="flex items-baseline gap-1 mt-1 flex-wrap">
                      <span class="font-mono text-xs font-bold" style="color: #2C2039;">{{ fmtMwh(simResults[c.id].gen) }}</span>
                      <span v-if="simResults[c.id].genDup > 0"
                        class="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style="background: rgba(240,192,64,0.22); color: #9a6700;"
                        v-tooltip="'De lo entregado, esta parte es compra en bolsa'"
                      ><i class="pi pi-shopping-cart" style="font-size: 9px;" />{{ fmtMwh(simResults[c.id].genDup) }} bolsa</span>
                    </div>
                  </div>
                  <div>
                    <div class="text-[10px] font-semibold uppercase tracking-wide leading-tight" style="color: #7a6e8a;">Energía mínima</div>
                    <div class="font-mono text-xs font-bold mt-1" style="color: #2C2039;">{{ simResults[c.id].min !== null ? fmtMwh(simResults[c.id].min) : '—' }}</div>
                  </div>
                  <div>
                    <div class="text-[10px] font-semibold uppercase tracking-wide leading-tight" style="color: #7a6e8a;">Energía proyectada</div>
                    <div class="font-mono text-xs font-bold mt-1" style="color: #2C2039;">{{ simResults[c.id].genProy != null && simResults[c.id].genProy > 0 ? fmtMwh(simResults[c.id].genProy) : '—' }}</div>
                  </div>
                </div>

                <!-- Bullet chart: una barra con zonas déficit / en rango / excedente -->
                <div class="space-y-1.5">
                  <div class="relative rounded-md overflow-hidden" style="height: 26px; background: rgba(44,32,57,0.04);">
                    <!-- Zonas de fondo -->
                    <template v-if="simResults[c.id].bullet.hasZones">
                      <div v-if="simResults[c.id].bullet.hasMin" class="absolute inset-y-0"
                        :style="{ left: '0', width: simResults[c.id].bullet.minPct + '%', background: 'rgba(214,68,85,0.10)' }" />
                      <div class="absolute inset-y-0"
                        :style="{ left: simResults[c.id].bullet.minPct + '%', width: (simResults[c.id].bullet.maxPct - simResults[c.id].bullet.minPct) + '%', background: 'rgba(46,125,50,0.11)' }" />
                      <div v-if="simResults[c.id].bullet.hasMax" class="absolute inset-y-0"
                        :style="{ left: simResults[c.id].bullet.maxPct + '%', right: '0', background: 'rgba(20,184,166,0.14)' }" />
                    </template>
                    <!-- Energía entregada (color = estado) -->
                    <div class="absolute rounded-sm transition-all duration-300"
                      style="top: 50%; transform: translateY(-50%); height: 10px; left: 0;"
                      :style="{ width: simResults[c.id].bullet.measurePct + '%', background: estadoColor(simResults[c.id].estado) }" />
                    <!-- Compra en bolsa: tramo amarillo DENTRO de la barra entregada -->
                    <div v-if="simResults[c.id].bullet.dupW"
                      class="absolute transition-all duration-300"
                      style="top: 50%; transform: translateY(-50%); height: 10px; background: #E0A800; opacity: 0.92;"
                      :style="{ left: simResults[c.id].bullet.bolsaStartPct + '%', width: simResults[c.id].bullet.dupW + '%' }"
                      v-tooltip="'Compra en bolsa (origen del suministro)'" />
                    <!-- Marcas mín / máx -->
                    <div v-if="simResults[c.id].bullet.hasMin" class="absolute rounded"
                      style="top: -1px; bottom: -1px; width: 2px; background: #2C2039; opacity: 0.45;"
                      :style="{ left: simResults[c.id].bullet.minPct + '%' }" v-tooltip="'Mínimo: ' + fmtMwh(simResults[c.id].min)" />
                    <div v-if="simResults[c.id].bullet.hasMax" class="absolute rounded"
                      style="top: -1px; bottom: -1px; width: 2px; background: #2C2039; opacity: 0.45;"
                      :style="{ left: simResults[c.id].bullet.maxPct + '%' }" v-tooltip="'Máximo: ' + fmtMwh(simResults[c.id].max)" />
                    <!-- Proyección de cierre (diamante) -->
                    <div v-if="simResults[c.id].bullet.proyPct != null" class="absolute"
                      style="top: 50%; width: 11px; height: 11px; transform: translate(-50%,-50%) rotate(45deg); background: #fff; border: 2px solid #2C2039; border-radius: 2px;"
                      :style="{ left: simResults[c.id].bullet.proyPct + '%' }"
                      v-tooltip="'Proyección de cierre: ' + fmtMwh(simResults[c.id].genProy)" />
                  </div>
                  <!-- Estados -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" :style="estadoBadge(simResults[c.id].estado)">
                      {{ estadoLabel(simResults[c.id].estado) }}
                    </span>
                    <span v-if="simResults[c.id].genProy != null && simResults[c.id].genProy > 0"
                      class="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      :style="estadoBadge(simResults[c.id].estadoProy)">
                      ◆ proy. {{ estadoLabel(simResults[c.id].estadoProy) }}
                    </span>
                  </div>
                </div>

                <!-- Cumplimiento de plantas: registradas en GESCON (numerador) / inscritas exigidas por contrato (denominador) -->
                <div v-if="simResults[c.id].plantasEsp != null" class="mt-3 pt-3 border-t" style="border-color: rgba(44,32,57,0.07);">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] font-semibold uppercase tracking-wide" style="color: #7a6e8a;">Plantas registradas / inscritas</span>
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-xs font-bold" style="color: #2C2039;">{{ simResults[c.id].plantasReg }} / {{ simResults[c.id].plantasEsp }}</span>
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" :style="estadoBadge(simResults[c.id].estadoPlantas)">
                        {{ estadoLabel(simResults[c.id].estadoPlantas) }}
                      </span>
                    </div>
                  </div>
                  <div class="relative rounded-md overflow-hidden" style="height: 8px; background: rgba(44,32,57,0.06);">
                    <div class="absolute inset-y-0 left-0 rounded-sm transition-all duration-300"
                      :style="{ width: simResults[c.id].plantasPct + '%', background: estadoColor(simResults[c.id].estadoPlantas) }" />
                  </div>
                </div>
              </div>

              <!-- Plant drop zone (collapsible) -->
              <div v-show="expandedContratos.includes(c.id)" class="p-3 space-y-1.5 overflow-y-auto sim-plant-zone" style="min-height: 64px; max-height: 220px;">
                <div
                  v-for="p in (simAssignments[c.id] || [])"
                  :key="p.id"
                  draggable="true"
                  @dragstart="onDragStart(p, c.id)"
                  @dragend="onDragEnd"
                  class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs select-none"
                  :style="[
                    p.comprado_por_unergy
                      ? 'background: rgba(240,192,64,0.12); cursor: grab; border: 1px solid rgba(240,192,64,0.4);'
                      : 'background: rgba(145,91,216,0.08); cursor: grab; border: 1px solid rgba(145,91,216,0.15);',
                    dragPlanta && dragPlanta.id === p.id ? 'opacity: 0.35;' : '',
                  ]"
                >
                  <div class="min-w-0">
                    <span class="font-medium truncate block" style="color: #2C2039; max-width: 128px;">{{ p.nombre }}</span>
                    <span v-if="p.es_duplicado" class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
                      style="background: rgba(240,192,64,0.22); color: #9a6700;"
                      v-tooltip="'Compra en bolsa — cuenta para el contrato, origen bolsa'"
                    ><i class="pi pi-shopping-cart" style="font-size: 9px;" />Compra bolsa</span>
                    <span v-else-if="p.comprado_por_unergy" class="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                      style="background: rgba(240,192,64,0.25); color: #9a6700;"
                      v-tooltip="p.contrato_compra_nombre || 'Contrato de compra'"
                    >Compra Unergy</span>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="font-mono font-semibold" :style="p.es_duplicado ? 'color: #9a6700;' : p.comprado_por_unergy ? 'color: #9a6700;' : 'color: #915BD8;'">
                      {{ p.month_mwh != null ? fmtMwh(p.month_mwh * p.pct_despacho) : '—' }}
                    </div>
                    <div style="color: #7a6e8a;">{{ (p.pct_despacho * 100).toFixed(0) }}%</div>
                  </div>
                </div>
                <div
                  v-if="dragOver === c.id"
                  class="flex items-center justify-center py-3 rounded-lg text-xs border border-dashed"
                  style="color: #915BD8; border-color: rgba(145,91,216,0.4); background: rgba(145,91,216,0.04);"
                >
                  Soltar aquí
                </div>
                <div
                  v-else-if="!(simAssignments[c.id] || []).length"
                  class="flex items-center justify-center py-3 rounded-lg text-xs border border-dashed"
                  style="color: rgba(44,32,57,0.22); border-color: rgba(44,32,57,0.12);"
                >
                  Arrastra plantas aquí
                </div>
              </div>
            </div>
        </div>

        <!-- Sin contrato pool -->
        <div
          class="rounded-xl border p-4 transition-shadow"
          style="border-color: rgba(44,32,57,0.12); background: white;"
          :style="dragOver === 'none' ? 'border-color: #915BD8; box-shadow: 0 0 0 2px rgba(145,91,216,0.18);' : ''"
          @dragover.prevent="dragOver = 'none'"
          @drop.prevent="onDrop(null)"
        >
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #7a6e8a;">
            Sin contrato
            <span class="ml-1 font-normal normal-case tracking-normal" style="color: rgba(44,32,57,0.3);">(no contribuye al cumplimiento)</span>
          </p>
          <div class="flex flex-wrap gap-2 min-h-8">
            <div
              v-for="p in (simAssignments['none'] || [])"
              :key="p.id"
              draggable="true"
              @dragstart="onDragStart(p, null)"
              @dragend="onDragEnd"
              class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs select-none"
              :style="[
                p.comprado_por_unergy
                  ? 'background: rgba(240,192,64,0.15); cursor: grab; border: 1px solid rgba(240,192,64,0.4);'
                  : 'background: rgba(44,32,57,0.06); cursor: grab; border: 1px solid rgba(44,32,57,0.10);',
                dragPlanta && dragPlanta.id === p.id ? 'opacity: 0.35;' : '',
              ]"
            >
              <span class="font-medium" style="color: #2C2039;">{{ p.nombre }}</span>
              <span v-if="p.es_duplicado" class="font-semibold px-1.5 py-0.5 rounded"
                style="background: rgba(240,192,64,0.22); color: #9a6700;"
                v-tooltip="'Compra en bolsa'"
              >Bolsa</span>
              <span v-else-if="p.comprado_por_unergy" class="font-semibold px-1.5 py-0.5 rounded"
                style="background: rgba(240,192,64,0.25); color: #9a6700;"
                v-tooltip="p.contrato_compra_nombre || 'Contrato de compra'"
              >Compra</span>
              <span class="font-mono" :style="p.es_duplicado ? 'color: #9a6700;' : p.comprado_por_unergy ? 'color: #9a6700;' : 'color: #7a6e8a;'">
                {{ p.month_mwh != null ? fmtMwh(p.month_mwh) : '—' }}
              </span>
            </div>
            <div
              v-if="dragOver === 'none'"
              class="flex items-center justify-center px-4 py-1.5 rounded-lg text-xs border border-dashed"
              style="color: #915BD8; border-color: rgba(145,91,216,0.4); background: rgba(145,91,216,0.04);"
            >
              Soltar aquí
            </div>
            <span v-else-if="!(simAssignments['none'] || []).length" class="text-xs py-1" style="color: rgba(44,32,57,0.3);">
              No hay plantas sin contrato
            </span>
          </div>
        </div>

      </template>

    </div>

    <!-- ═══════════════ PROYECTOS TAB ═══════════════ -->
    <div v-show="activeTab === 2" class="space-y-5">

      <!-- Month selector + mode switch -->
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="pcYear" :options="years" class="w-24" @change="loadPlantasContratos" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Mes</label>
          <Select v-model="pcMonth" :options="MESES_OPTIONS" optionLabel="label" optionValue="value" class="w-40" @change="loadPlantasContratos" />
        </div>
        <div class="flex rounded-lg overflow-hidden border" style="border-color: rgba(44,32,57,0.15);">
          <button
            v-for="mode in PC_MODES" :key="mode.key"
            @click="pcMode = mode.key"
            class="px-4 py-2 text-sm font-semibold transition-colors"
            :style="pcMode === mode.key
              ? `background: ${mode.bg}; color: ${mode.color};`
              : 'background: transparent; color: #7a6e8a;'"
          >{{ mode.label }}</button>
        </div>
        <span class="text-xs" style="color: #7a6e8a;">
          {{ pcMode === 'venta' ? 'Plantas inscritas en GESCON por contrato de venta'
           : pcMode === 'compra' ? 'Plantas que Unergy compra energía'
           : 'Plantas sin asignación GESCON este mes (van a bolsa)' }}
        </span>
      </div>

      <div v-if="pcLoading" class="flex flex-col items-center justify-center py-20 gap-3">
        <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
        <p class="text-sm" style="color: #7a6e8a;">Cargando plantas y contratos…</p>
      </div>

      <Message v-else-if="pcError" severity="error" :closable="false">{{ pcError }}</Message>

      <template v-else-if="pcData">

        <!-- VENTA mode -->
        <template v-if="pcMode === 'venta'">
          <div v-for="c in pcData.venta" :key="c.id" class="cv-card">
            <div class="px-4 py-3 flex items-center justify-between"
              style="background: rgba(145,91,216,0.04); border-bottom: 1px solid rgba(44,32,57,0.07);">
              <div>
                <span class="font-bold text-sm" style="color: #2C2039;">{{ c.nombre }}</span>
                <span class="ml-2 text-xs" style="color: #7a6e8a;">{{ c.comprador_nombre }}</span>
              </div>
              <span class="text-xs font-mono px-2 py-0.5 rounded"
                style="background: rgba(145,91,216,0.10); color: #915BD8;">
                {{ c.plantas.length }} plantas
              </span>
            </div>
            <div v-if="c.plantas.length" class="divide-y" style="border-color: rgba(44,32,57,0.05);">
              <div v-for="p in c.plantas" :key="p.id" class="px-4 py-2.5 flex items-center justify-between text-sm"
                :style="p.es_duplicado ? 'background: rgba(240,192,64,0.08);' : ''">
                <div class="flex items-center gap-2">
                  <span class="font-medium" style="color: #2C2039;">{{ p.nombre }}</span>
                  <span v-if="p.es_duplicado" class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style="background: rgba(240,192,64,0.22); color: #9a6700;" v-tooltip="'Compra en bolsa'"><i class="pi pi-shopping-cart" style="font-size: 9px;" />Compra bolsa</span>
                  <span v-if="p.codigo_sic" class="text-xs font-mono px-1.5 py-0.5 rounded" style="background: rgba(44,32,57,0.06); color: #7a6e8a;">{{ p.codigo_sic }}</span>
                  <span v-if="p.pct_despacho != null" class="text-xs font-mono" style="color: #915BD8;">{{ (p.pct_despacho * 100).toFixed(0) }}%</span>
                </div>
                <div class="text-xs font-mono text-right" style="color: #7a6e8a;">
                  <span v-if="p.fecha_inicio">{{ p.fecha_inicio }}</span>
                  <span v-if="p.fecha_inicio && p.fecha_fin"> → </span>
                  <span v-if="p.fecha_fin" :style="isExpiringSoon(p.fecha_fin) ? 'color: #D64455; font-weight: 600;' : ''">{{ p.fecha_fin }}</span>
                </div>
              </div>
            </div>
            <div v-else class="px-4 py-4 text-xs text-center" style="color: rgba(44,32,57,0.3);">
              Sin plantas asignadas en GESCON para {{ MESES[pcMonth - 1] }} {{ pcYear }}
            </div>
          </div>
        </template>

        <!-- COMPRA mode -->
        <template v-if="pcMode === 'compra'">
          <div v-if="!pcData.compra.length" class="text-center py-12 text-sm" style="color: #7a6e8a;">
            No hay contratos de compra vigentes en {{ MESES[pcMonth - 1] }} {{ pcYear }}
          </div>
          <div v-for="c in pcData.compra" :key="c.id" class="cv-card-gold">
            <div class="px-4 py-3 flex items-center justify-between"
              style="background: rgba(240,192,64,0.08); border-bottom: 1px solid rgba(240,192,64,0.2);">
              <div>
                <span class="font-bold text-sm" style="color: #9a6700;">{{ c.nombre }}</span>
                <span class="ml-2 text-xs" style="color: #7a6e8a;">Vendedor: {{ c.vendedor_nombre }}</span>
              </div>
              <span class="text-xs font-mono px-2 py-0.5 rounded"
                style="background: rgba(240,192,64,0.18); color: #9a6700;">
                {{ c.plantas.length }} plantas
              </span>
            </div>
            <div v-if="c.plantas.length" class="divide-y" style="border-color: rgba(44,32,57,0.05);">
              <div v-for="p in c.plantas" :key="p.id" class="px-4 py-2.5 flex items-center justify-between text-sm">
                <span class="font-medium" style="color: #2C2039;">{{ p.nombre }}</span>
                <div class="text-xs font-mono text-right" style="color: #7a6e8a;">
                  <span v-if="p.fecha_inicio">{{ p.fecha_inicio }}</span>
                  <span v-if="p.fecha_inicio && p.fecha_fin"> → </span>
                  <span v-if="p.fecha_fin" :style="isExpiringSoon(p.fecha_fin) ? 'color: #D64455; font-weight: 600;' : ''">{{ p.fecha_fin }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- BOLSA mode -->
        <template v-if="pcMode === 'bolsa'">
          <div class="cv-card">
            <div class="px-4 py-3" style="background: rgba(44,32,57,0.04); border-bottom: 1px solid rgba(44,32,57,0.07);">
              <span class="font-bold text-sm" style="color: #2C2039;">Plantas en bolsa</span>
              <span class="ml-2 text-xs" style="color: #7a6e8a;">Sin asignación GESCON en {{ MESES[pcMonth - 1] }} {{ pcYear }}</span>
              <span class="ml-2 text-xs font-mono px-2 py-0.5 rounded" style="background: rgba(44,32,57,0.08); color: #7a6e8a;">
                {{ pcData.bolsa.length }}
              </span>
            </div>
            <div v-if="pcData.bolsa.length" class="divide-y" style="border-color: rgba(44,32,57,0.05);">
              <div v-for="p in pcData.bolsa" :key="p.id" class="px-4 py-2.5 text-sm font-medium" style="color: #2C2039;">
                {{ p.nombre }}
              </div>
            </div>
            <div v-else class="px-4 py-8 text-xs text-center" style="color: rgba(44,32,57,0.3);">
              Todas las plantas tienen asignación GESCON este mes
            </div>
          </div>
        </template>

      </template>
    </div>

    <!-- ═══════════════ ENERGÍA TRANSADA TAB ═══════════════ -->
    <div v-show="activeTab === 3" class="space-y-5">

      <!-- Selectors -->
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Año</label>
          <Select v-model="etYear" :options="etYearOptions" class="w-24" @change="onEtPeriodChange" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase tracking-wider" style="color: #915BD8;">Mes</label>
          <Select v-model="etMonth" :options="etMonthOptions" optionLabel="label" optionValue="value" class="w-40" @change="onEtPeriodChange" />
        </div>
        <span v-if="etData" class="text-xs px-2 py-1 rounded" style="background: rgba(145,91,216,0.08); color: #915BD8;">
          {{ etPeriodoLabel }}
        </span>
        <span v-if="etFromCache" class="text-xs px-2 py-1 rounded" style="background: rgba(44,32,57,0.06); color: #7a6e8a;" title="Datos del histórico guardado en este navegador">
          <i class="pi pi-history text-xs mr-1" />histórico local
        </span>
      </div>

      <div v-if="etLoading" class="flex flex-col items-center justify-center py-20 gap-3">
        <ProgressSpinner style="width:48px;height:48px;" strokeWidth="4" animationDuration=".8s" />
        <p class="text-sm" style="color: #7a6e8a;">Consultando energía transada de {{ MESES[etMonth - 1] }}…</p>
      </div>

      <Message v-else-if="etError" severity="error" :closable="false">{{ etError }}</Message>

      <template v-else-if="etData">

        <Message v-if="etData.warning" severity="warn" :closable="false">{{ etData.warning }}</Message>

        <!-- Summary cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="cv-card px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: #7a6e8a;">Total transada</p>
            <p class="text-2xl font-bold font-mono" style="color: #2C2039;">{{ fmtMwh(etData.totales.gen_mwh) }} <span class="text-sm font-normal">MWh</span></p>
            <p class="text-xs mt-0.5" style="color: #7a6e8a;">{{ etData.totales.n_plantas }} proyectos con datos</p>
          </div>
          <div class="cv-card px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: #915BD8;">Vía PPA</p>
            <p class="text-2xl font-bold font-mono" style="color: #915BD8;">{{ fmtMwh(etData.totales.ppa_mwh) }} <span class="text-sm font-normal">MWh</span></p>
            <p class="text-xs mt-0.5" style="color: #7a6e8a;">{{ etPct(etData.totales.ppa_mwh) }}% del total</p>
          </div>
          <div class="cv-card px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: #2C2039;">En bolsa</p>
            <p class="text-2xl font-bold font-mono" style="color: #2C2039;">{{ fmtMwh(etData.totales.bolsa_mwh) }} <span class="text-sm font-normal">MWh</span></p>
            <p class="text-xs mt-0.5" style="color: #7a6e8a;">{{ etPct(etData.totales.bolsa_mwh) }}% del total</p>
          </div>
        </div>

        <!-- Tabla por proyecto -->
        <div class="cv-card overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr style="color: #7a6e8a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(145,91,216,0.04);">
                <th class="text-left px-4 py-3">Proyecto</th>
                <th class="text-left px-2 py-3">Cómo se transó</th>
                <th class="text-right px-2 py-3">PPA (MWh)</th>
                <th class="text-right px-2 py-3">Bolsa (MWh)</th>
                <th class="text-right px-4 py-3">Total (MWh)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in etData.plantas" :key="p.id" style="border-top: 1px solid rgba(44,32,57,0.06);">
                <td class="px-4 py-2.5 font-medium" style="color: #2C2039;">
                  {{ p.nombre }}
                  <span v-if="p.modo === 'sin_datos'" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style="background: rgba(214,68,85,0.12); color: #D64455;">sin datos</span>
                </td>
                <td class="px-2 py-2.5">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="c in p.contratos.filter(c => !c.es_duplicado)" :key="c.id"
                      class="text-xs px-1.5 py-0.5 rounded font-medium"
                      style="background: rgba(145,91,216,0.10); color: #915BD8;"
                      :title="`${c.dias_activos} días activos`">
                      {{ c.nombre }} · {{ (c.pct * 100).toFixed(0) }}%
                    </span>
                    <span v-if="p.modo === 'bolsa' || p.modo === 'mixto'"
                      class="text-xs px-1.5 py-0.5 rounded font-medium"
                      style="background: rgba(44,32,57,0.08); color: #2C2039;">Bolsa</span>
                    <span v-if="p.modo === 'sin_datos'" class="text-xs" style="color: #7a6e8a;">—</span>
                  </div>
                </td>
                <td class="px-2 py-2.5 text-right font-mono" style="color: #915BD8;">{{ p.ppa_mwh !== null ? fmtMwh(p.ppa_mwh) : '—' }}</td>
                <td class="px-2 py-2.5 text-right font-mono" style="color: #2C2039;">{{ p.bolsa_mwh !== null ? fmtMwh(p.bolsa_mwh) : '—' }}</td>
                <td class="px-4 py-2.5 text-right font-mono font-semibold" style="color: #2C2039;">{{ p.gen_mwh !== null ? fmtMwh(p.gen_mwh) : '—' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid rgba(44,32,57,0.12); background: rgba(145,91,216,0.04);">
                <td class="px-4 py-3 font-bold" style="color: #2C2039;">TOTAL ENERGÍA TRANSADA</td>
                <td></td>
                <td class="px-2 py-3 text-right font-mono font-bold" style="color: #915BD8;">{{ fmtMwh(etData.totales.ppa_mwh) }}</td>
                <td class="px-2 py-3 text-right font-mono font-bold" style="color: #2C2039;">{{ fmtMwh(etData.totales.bolsa_mwh) }}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-base" style="color: #2C2039;">{{ fmtMwh(etData.totales.gen_mwh) }}</td>
              </tr>
            </tfoot>
          </table>
          <div v-if="!etData.plantas.length" class="px-4 py-10 text-sm text-center" style="color: rgba(44,32,57,0.35);">
            Sin proyectos con energía transada en {{ MESES[etMonth - 1] }} {{ etYear }}
          </div>
        </div>

      </template>
    </div>

    <!-- Floating: detalle de la capa (misma información que la imagen) -->
    <Teleport to="body">
      <template v-if="detalleCapa">
        <div class="fixed inset-0" style="z-index: 60; background: rgba(44,32,57,0.28);" @click="cerrarDetalleCapa" />
        <div
          class="fixed shadow-2xl"
          style="z-index: 61; background: #ffffff; width: 700px; max-width: 94vw; max-height: 88vh; overflow-y: auto; border-radius: 16px; border: 1px solid rgba(44,32,57,0.12); top: 50%; left: 50%; transform: translate(-50%, -50%);"
          @click.stop
        >
          <div style="height: 6px; background: #915BD8; border-radius: 16px 16px 0 0;" />
          <!-- Header -->
          <div class="px-6 pt-4 pb-3" style="border-bottom: 1px solid rgba(44,32,57,0.08);">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-bold text-lg truncate" style="color: #2C2039;">{{ detalleCapa.c.nombre }}</div>
                <div class="text-sm truncate" style="color: #7a6e8a;">{{ detalleCapa.c.comprador_nombre }}</div>
                <span class="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style="background: rgba(145,91,216,0.10); color: #915BD8;">
                  <i class="pi pi-calendar text-[10px]" /> Período de consulta: {{ periodoSimLabel }}
                </span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span v-if="detalleCapa.res.pct != null && detalleCapa.res.pct !== undefined" class="text-xs font-semibold px-2 py-0.5 rounded-full" :style="estadoBadge(detalleCapa.res.estado)">{{ Math.round(detalleCapa.res.pct) }}%</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :style="estadoBadge(detalleCapa.res.estado)">{{ estadoLabel(detalleCapa.res.estado) }}</span>
                <button
                  @click="copiarImagenCapa(detalleCapa.c)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  :style="copiadoCapaId === detalleCapa.c.id ? 'background: rgba(46,125,50,0.12); color: #2e7d32;' : 'background: #915BD8; color: white;'"
                  v-tooltip="'Copia la imagen al portapapeles (o la descarga si el navegador no lo permite)'"
                >
                  <i class="pi text-xs" :class="copiadoCapaId === detalleCapa.c.id ? 'pi-check' : 'pi-image'" />
                  {{ copiadoCapaId === detalleCapa.c.id ? '¡Copiado!' : 'Copiar imagen' }}
                </button>
                <button class="rounded-lg p-1.5 transition-colors hover:bg-gray-100" style="color: #7a6e8a;" @click="cerrarDetalleCapa"><i class="pi pi-times text-sm" /></button>
              </div>
            </div>
            <!-- Métricas (energía duplicada como 4ª columna si aplica) -->
            <div class="grid gap-3 mt-3" :class="detalleCapa.res.genDup > 0 ? 'grid-cols-4' : 'grid-cols-3'">
              <div>
                <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: #7a6e8a;">Energía entregada</div>
                <div class="font-mono text-sm font-bold mt-0.5" style="color: #2C2039;">{{ fmtMwh(detalleCapa.res.gen) }}</div>
              </div>
              <div>
                <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: #7a6e8a;">Energía mínima</div>
                <div class="font-mono text-sm font-bold mt-0.5" style="color: #2C2039;">{{ detalleCapa.res.min != null ? fmtMwh(detalleCapa.res.min) : '—' }}</div>
              </div>
              <div>
                <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: #7a6e8a;">Energía proyectada</div>
                <div class="font-mono text-sm font-bold mt-0.5" style="color: #2C2039;">{{ detalleCapa.res.genProy != null && detalleCapa.res.genProy > 0 ? fmtMwh(detalleCapa.res.genProy) : '—' }}</div>
              </div>
              <div v-if="detalleCapa.res.genDup > 0" v-tooltip.bottom="'De la energía entregada, esta parte se suministra con compra en bolsa (cuenta para el contrato, origen bolsa)'">
                <div class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide" style="color: #9a6700;"><i class="pi pi-shopping-cart" style="font-size: 9px;" />Compra en bolsa</div>
                <div class="font-mono text-sm font-bold mt-0.5" style="color: #9a6700;">{{ fmtMwh(detalleCapa.res.genDup) }}</div>
              </div>
            </div>
          </div>
          <!-- Tabla -->
          <div class="px-6 py-4">
            <p class="text-xs font-bold uppercase tracking-widest mb-2" style="color: #915BD8;">{{ detalleCapa.plantas.length }} proyecto{{ detalleCapa.plantas.length === 1 ? '' : 's' }} en el contrato</p>
            <table class="w-full text-sm">
              <thead>
                <tr style="color: #7a6e8a; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
                  <th class="text-left pb-2">Proyecto</th>
                  <th class="text-right pb-2">% Despacho</th>
                  <th class="text-right pb-2">Energía generada</th>
                  <th class="text-right pb-2">Proyección cierre del mes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in detalleCapa.plantas" :key="p.id" style="border-top: 1px solid rgba(44,32,57,0.06);">
                  <td class="py-2 pr-2 font-medium" :style="p.es_duplicado ? 'color:#9a6700' : p.comprado_por_unergy ? 'color:#9a6700' : 'color:#2C2039'">
                    {{ p.nombre }}
                    <span v-if="p.es_duplicado" class="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style="background: rgba(240,192,64,0.22); color: #9a6700;" v-tooltip="'Compra en bolsa'"><i class="pi pi-shopping-cart" style="font-size: 9px;" />Compra bolsa</span>
                    <span v-else-if="p.comprado_por_unergy" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style="background: rgba(240,192,64,0.25); color: #9a6700;">Compra</span>
                  </td>
                  <td class="py-2 px-2 text-right font-mono text-xs" style="color: #7a6e8a;">{{ (p.pct_despacho * 100).toFixed(0) }}%</td>
                  <td class="py-2 px-2 text-right font-mono font-semibold" :style="p.es_duplicado ? 'color:#9a6700' : 'color:#2C2039'">{{ p.month_mwh != null ? fmtMwh(p.month_mwh * p.pct_despacho) : '—' }}</td>
                  <td class="py-2 pl-2 text-right font-mono font-semibold" style="color: #915BD8;">
                    <template v-if="plantaProyMwh(p) != null">◆ {{ fmtMwh(plantaProyMwh(p)) }}</template>
                    <span v-else style="color: rgba(44,32,57,0.3);">—</span>
                  </td>
                </tr>
                <tr v-if="!detalleCapa.plantas.length">
                  <td colspan="4" class="py-6 text-center text-sm" style="color: rgba(44,32,57,0.35);">Sin proyectos asignados</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid rgba(44,32,57,0.12);">
                  <td class="pt-3 text-sm font-bold" style="color: #2C2039;">Total · {{ detalleCapa.plantas.length }} proyecto{{ detalleCapa.plantas.length === 1 ? '' : 's' }}</td>
                  <td></td>
                  <td class="pt-3 text-right font-mono font-bold text-base" style="color: #915BD8;">{{ fmtMwh(detalleCapa.res.gen) }}</td>
                  <td class="pt-3 text-right font-mono font-bold text-base" style="color: #915BD8;">{{ detalleCapa.res.genProy != null && detalleCapa.res.genProy > 0 ? fmtMwh(detalleCapa.res.genProy) : '—' }}</td>
                </tr>
                <tr v-if="detalleCapa.res.genDup > 0">
                  <td colspan="2"></td>
                  <td class="pt-1 text-right font-mono text-xs font-semibold" style="color: #9a6700;">de ello, {{ fmtMwh(detalleCapa.res.genDup) }} compra en bolsa</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <!-- Veredicto -->
            <div class="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3" :style="{ background: veredictoCapa(detalleCapa.res).bg }">
              <i class="pi mt-0.5" :class="veredictoCapa(detalleCapa.res).icon" :style="{ color: veredictoCapa(detalleCapa.res).fg }" />
              <div>
                <div class="font-bold text-sm" :style="{ color: veredictoCapa(detalleCapa.res).fg }">{{ veredictoCapa(detalleCapa.res).txt }}</div>
                <div v-if="veredictoCapa(detalleCapa.res).sub" class="text-xs mt-0.5" style="color: #7a6e8a;">{{ veredictoCapa(detalleCapa.res).sub }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- Floating month breakdown -->
    <Teleport to="body">
      <template v-if="selectedMonthIdx !== null && anualData && anualData.meses[selectedMonthIdx]">
        <div class="fixed inset-0" style="z-index: 40; background: rgba(44,32,57,0.25);" @click="selectedMonthIdx = null" />
        <div
          class="fixed rounded-2xl shadow-2xl"
          style="z-index: 50; background: #FDFAF7; width: 600px; max-height: 80vh; overflow-y: auto; border: 1px solid rgba(44,32,57,0.12); top: 50%; left: 50%; transform: translate(-50%, -50%);"
          @click.stop
        >
          <div class="flex items-center justify-between px-5 py-4" style="border-bottom: 1px solid rgba(44,32,57,0.10);">
            <div>
              <span class="font-bold text-base" style="color: #2C2039;">{{ MESES[selectedMonthIdx] }} {{ selectedYear }}</span>
              <span v-if="anualData.meses[selectedMonthIdx].tipo_datos !== 'real'" class="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style="background: rgba(145,91,216,0.12); color: #915BD8;">proyección</span>
            </div>
            <button class="rounded-lg p-1.5" style="color: #7a6e8a;" @click="selectedMonthIdx = null">
              <i class="pi pi-times text-sm" />
            </button>
          </div>
          <div class="px-5 py-4">
            <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: #915BD8;">Desglose por planta</p>
            <table class="w-full text-sm">
              <thead>
                <tr style="color: #7a6e8a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                  <th class="text-left pb-2">Planta</th>
                  <th class="text-right pb-2">%</th>
                  <th class="text-right pb-2">Gen. planta</th>
                  <th class="text-right pb-2">Gen. contrato</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, pi) in anualData.meses[selectedMonthIdx].plantas" :key="pi"
                  style="border-top: 1px solid rgba(44,32,57,0.06);"
                  :style="p.es_duplicado ? 'background: rgba(240,192,64,0.08);' : ''"
                >
                  <td class="py-2 pr-2 font-medium" style="color: #2C2039;">
                    {{ p.nombre }}
                    <span v-if="p.es_duplicado" class="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style="background: rgba(240,192,64,0.22); color: #9a6700;" v-tooltip="'Compra en bolsa'"><i class="pi pi-shopping-cart" style="font-size: 9px;" />Compra bolsa</span>
                    <span v-if="p.contrato" class="ml-1 text-xs font-normal px-1.5 py-0.5 rounded" style="color: #915BD8; background: rgba(145,91,216,0.08);">{{ p.contrato }}</span>
                    <span v-if="p.dias_en_contrato && p.dias_mes && p.dias_en_contrato < p.dias_mes" class="ml-1 text-xs font-normal" style="color: #7a6e8a;">{{ p.dias_en_contrato }}/{{ p.dias_mes }} días</span>
                  </td>
                  <td class="py-2 px-2 text-right font-mono text-xs" style="color: #7a6e8a;">{{ (p.pct_despacho * 100).toFixed(0) }}%</td>
                  <td class="py-2 px-2 text-right font-mono" style="color: #2C2039;">{{ p.gen_planta_mwh !== null ? fmtMwh(p.gen_planta_mwh) : '—' }}</td>
                  <td class="py-2 pl-2 text-right font-mono font-semibold" :style="p.es_duplicado ? 'color: #9a6700;' : 'color: #915BD8;'">{{ p.gen_contrato_mwh !== null ? fmtMwh(p.gen_contrato_mwh) : '—' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid rgba(44,32,57,0.12);">
                  <td colspan="3" class="pt-3 text-sm font-semibold" style="color: #2C2039;">Total al contrato</td>
                  <td class="pt-3 text-right font-mono font-bold" style="color: #2C2039;">{{ fmtMwh(genVal(anualData.meses[selectedMonthIdx])) }}</td>
                </tr>
                <tr v-if="anualData.meses[selectedMonthIdx].exposicion_bolsa_duplicados_mwh">
                  <td colspan="3" class="pt-1 text-sm font-semibold" style="color: #9a6700;">de ello, compra en bolsa</td>
                  <td class="pt-1 text-right font-mono font-bold" style="color: #9a6700;">{{ fmtMwh(anualData.meses[selectedMonthIdx].exposicion_bolsa_duplicados_mwh) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { proyectoActivoEnMes } from '@/utils/proyectoActivo'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import client from '@/api/client'

// ── LocalStorage cache ───────────────────────────────────────────────────────
const CACHE_PREFIX = 'cumpl_'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function cacheKey(endpoint, params) {
  return CACHE_PREFIX + endpoint + '|' + JSON.stringify(params)
}

function cacheGet(endpoint, params) {
  try {
    const raw = localStorage.getItem(cacheKey(endpoint, params))
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(endpoint, params))
      return null
    }
    return data
  } catch { return null }
}

function cacheSet(endpoint, params, data) {
  try {
    localStorage.setItem(cacheKey(endpoint, params), JSON.stringify({ ts: Date.now(), data }))
  } catch { /* quota exceeded — ignore */ }
}

function cacheClearAll() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(CACHE_PREFIX)) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
}

function cacheGetSize() {
  let bytes = 0, count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(CACHE_PREFIX)) {
      bytes += (localStorage.getItem(k) || '').length * 2
      count++
    }
  }
  if (!count) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB (${count})` : `${(bytes / 1024).toFixed(0)} KB (${count})`
}

async function cachedGet(endpoint, params = {}) {
  const cached = cacheGet(endpoint, params)
  if (cached) return cached
  const res = await client.get(endpoint, { params, timeout: 120000 })
  cacheSet(endpoint, params, res.data)
  return res.data
}

const cacheSize = ref(cacheGetSize())
const cacheClearing = ref(false)

function updateCacheSize() { cacheSize.value = cacheGetSize() }

async function clearCacheAndReload() {
  cacheClearing.value = true
  cacheClearAll()
  cacheSize.value = ''
  anualData.value = null
  simData.value = null
  pcData.value = null
  etData.value = null
  tableData.value = []
  try {
    await Promise.all([loadAnnualData(), loadTableData()])
    if (activeTab.value === 0) await loadSimulator()
    if (activeTab.value === 2) await loadPlantasContratos()
    if (activeTab.value === 3) await loadEnergiaTransada()
  } finally {
    cacheClearing.value = false
    updateCacheSize()
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS      = ['Estrategia', 'Cumplimiento', 'Proyectos', 'Energía transada']
const activeTab = ref(0)

// ── Chart constants ───────────────────────────────────────────────────────────
const SVG_W  = 820
const SVG_H  = 340
const PAD_L  = 62
const PAD_R  = 22
const PAD_T  = 18
const PAD_B  = 42
const PLOT_W = SVG_W - PAD_L - PAD_R
const PLOT_H = SVG_H - PAD_T - PAD_B
const N      = 12
const slotW  = PLOT_W / N
const barW   = slotW * 0.54

// ── Labels ────────────────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_OPTIONS = MESES.map((m, i) => ({ label: m, value: i + 1 }))

// ── Shared ────────────────────────────────────────────────────────────────────
const now   = new Date()
const years = Array.from({ length: 18 }, (_, i) => 2024 + i)

// ── Cumplimiento state ────────────────────────────────────────────────────────
const contratos          = ref([])
const selectedYear       = ref(now.getFullYear())
const selectedContratoId = ref(null)
const anualData          = ref(null)
const chartLoading       = ref(false)
const chartError         = ref(null)
const tableData          = ref([])
const tableLoading       = ref(false)
const hovered            = ref(null)
const tooltipX           = ref(0)
const tooltipY           = ref(0)
const selectedMonthIdx   = ref(null)
const chartBox           = ref(null)

// ── Backend proyectos (para filtrar por fecha_fin_representacion) ─────────────
const backendProyectos = ref([])

async function loadBackendProyectos() {
  try {
    const res = await client.get('/proyectos', { params: { size: 200 } })
    backendProyectos.value = res.data.items || []
  } catch { /* degradar silenciosamente */ }
}

// ── Simulador state ───────────────────────────────────────────────────────────
const simYear          = ref(now.getFullYear())
const simMonth         = ref(now.getMonth() + 1)
const simData          = ref(null)
const simLoading       = ref(false)
const simError         = ref(null)
const simAssignments   = ref({})
const hiddenContratos  = ref(new Set())
const ficticioContratos = ref([])
const showNuevoForm = ref(false)
const ficticioNombre   = ref('')
const ficticioMin      = ref(0)
const ficticioMax      = ref(0)
let ficticioNextId     = 1
const expandedContratos = ref([])
const sortDesc         = ref(true)
// Filtro por estado (deriva de la proyección, ver estadoEfectivo en simResults).
// null = todos | 'ok' (cumplido) | 'deficit' (incumplido) | 'excedente' (exposición en bolsa)
const estadoFiltro     = ref(null)
const ESTADO_FILTROS = [
  { key: 'ok',        label: 'Cumplido',            color: '#2e7d32', tip: 'Entre el mínimo y el máximo (por proyección de cierre)' },
  { key: 'deficit',   label: 'Incumplido',          color: '#D64455', tip: 'Déficit: por debajo del mínimo (por proyección de cierre)' },
  { key: 'excedente', label: 'Exposición en bolsa', color: '#14B8A6', tip: 'Excedente sobre el máximo o plantas duplicadas (compra en bolsa)' },
]
function toggleEstadoFiltro(k) { estadoFiltro.value = estadoFiltro.value === k ? null : k }
// Exposición en bolsa = excedente (vende en bolsa) O plantas duplicadas (compra en bolsa,
// genDup>0), aunque el contrato esté cumplido/déficit. Los demás estados son excluyentes.
function contratoMatchEstado(r, key) {
  if (!r) return false
  if (key === 'excedente') return r.estadoEfectivo === 'excedente' || r.tieneDup
  return r.estadoEfectivo === key
}
const dragPlanta       = ref(null)
const dragFromContrato = ref(undefined)
const dragOver         = ref(null)

// ── Proyectos tab state ──────────────────────────────────────────────────────
const PC_MODES = [
  { key: 'venta',  label: 'Venta',  bg: 'rgba(145,91,216,0.12)', color: '#915BD8' },
  { key: 'compra', label: 'Compra', bg: 'rgba(240,192,64,0.18)', color: '#9a6700' },
  { key: 'bolsa',  label: 'Bolsa',  bg: 'rgba(44,32,57,0.10)',   color: '#2C2039' },
]
const pcYear    = ref(now.getFullYear())
const pcMonth   = ref(now.getMonth() + 1)
const pcMode    = ref('venta')
const pcData    = ref(null)
const pcLoading = ref(false)
const pcError   = ref(null)

// ── Energía transada state ────────────────────────────────────────────────────
// Histórico por mes en localStorage: los meses cerrados son inmutables y se
// guardan sin TTL; el mes actual siempre se consulta fresco y se va guardando
// como parcial. Un prefetch silencioso completa el histórico del año.
const ET_PREFIX  = 'cumpl_et_'
const etYear     = ref(now.getFullYear())
const etMonth    = ref(now.getMonth() + 1)
const etData     = ref(null)
const etLoading  = ref(false)
const etError    = ref(null)
const etFromCache = ref(false)
let etPrefetching = false

const etYearOptions = computed(() => years.filter(y => y <= now.getFullYear()))

const etMonthOptions = computed(() => {
  const maxMonth = etYear.value === now.getFullYear() ? now.getMonth() + 1 : 12
  return MESES_OPTIONS.filter(o => o.value <= maxMonth)
})

const etPeriodoLabel = computed(() => {
  const p = etData.value?.periodo
  if (!p) return ''
  return p.es_mes_actual
    ? `Del 1 al ${p.dia_corte} de ${MESES[p.month - 1].toLowerCase()} ${p.year}`
    : `Mes completo · ${MESES[p.month - 1]} ${p.year}`
})

function etPct(val) {
  const total = etData.value?.totales?.gen_mwh
  if (!total || val === null) return '0'
  return (val / total * 100).toFixed(1)
}

function etIsCurrentMonth(y, m) {
  return y === now.getFullYear() && m === now.getMonth() + 1
}

function etCacheKey(y, m) { return `${ET_PREFIX}${y}_${String(m).padStart(2, '0')}` }

function etCacheGet(y, m) {
  try {
    const raw = localStorage.getItem(etCacheKey(y, m))
    if (!raw) return null
    const { data, partial } = JSON.parse(raw)
    // Un mes guardado como parcial (era el mes en curso) deja de valer cuando el mes cierra
    if (partial && !etIsCurrentMonth(y, m)) {
      localStorage.removeItem(etCacheKey(y, m))
      return null
    }
    return data
  } catch { return null }
}

function etCacheSet(y, m, data) {
  try {
    localStorage.setItem(etCacheKey(y, m), JSON.stringify({
      ts: Date.now(),
      partial: etIsCurrentMonth(y, m),
      data,
    }))
  } catch { /* quota exceeded — ignorar */ }
}

async function etFetch(y, m) {
  const res = await client.get('/cumplimiento/energia-transada', { params: { year: y, month: m }, timeout: 180000 })
  etCacheSet(y, m, res.data)
  return res.data
}

async function loadEnergiaTransada() {
  const y = etYear.value, m = etMonth.value
  etError.value = null
  etFromCache.value = false

  // Mes cerrado ya guardado → instantáneo desde el histórico local
  if (!etIsCurrentMonth(y, m)) {
    const cached = etCacheGet(y, m)
    if (cached) {
      etData.value = cached
      etFromCache.value = true
      prefetchEtHistory()
      return
    }
  }

  etLoading.value = true
  try {
    etData.value = await etFetch(y, m)
    updateCacheSize()
    prefetchEtHistory()
  } catch (e) {
    const status = e.response?.status
    etError.value = e.response?.data?.detail
      || (status === 401 ? 'Sesión expirada — inicia sesión de nuevo.'
         : e.code === 'ECONNABORTED' ? 'Tiempo de espera agotado — el servidor tardó demasiado.'
         : 'Error al consultar la energía transada.')
  } finally {
    etLoading.value = false
  }
}

// Completa en segundo plano el histórico del año (meses cerrados que falten),
// secuencial para no saturar el backend. El usuario no ve nada de esto.
async function prefetchEtHistory() {
  if (etPrefetching) return
  etPrefetching = true
  try {
    const y = etYear.value
    const lastClosed = y === now.getFullYear() ? now.getMonth() : (y < now.getFullYear() ? 12 : 0)
    for (let m = 1; m <= lastClosed; m++) {
      if (etCacheGet(y, m)) continue
      try { await etFetch(y, m) } catch { break /* backend con problemas — reintentar en próxima visita */ }
    }
    updateCacheSize()
  } finally {
    etPrefetching = false
  }
}

function onEtPeriodChange() {
  const maxMonth = etYear.value === now.getFullYear() ? now.getMonth() + 1 : 12
  if (etMonth.value > maxMonth) etMonth.value = maxMonth
  loadEnergiaTransada()
}

const allContratos = computed(() => {
  if (!simData.value) return []
  return [...simData.value.contratos, ...ficticioContratos.value]
})

const visibleContratos = computed(() => {
  const res = simResults.value
  const filtered = allContratos.value.filter(c => {
    if (hiddenContratos.value.has(c.id)) return false
    if (estadoFiltro.value && !contratoMatchEstado(res[c.id], estadoFiltro.value)) return false
    return true
  })
  return filtered.slice().sort((a, b) => {
    const pctA = res[a.id]?.pct ?? -1
    const pctB = res[b.id]?.pct ?? -1
    return sortDesc.value ? pctB - pctA : pctA - pctB
  })
})

// Conteo por estado (sobre los contratos no ocultos) para mostrar en los botones de filtro.
const estadoCounts = computed(() => {
  const res = simResults.value
  const counts = { ok: 0, deficit: 0, excedente: 0 }
  for (const c of allContratos.value) {
    if (hiddenContratos.value.has(c.id)) continue
    // Conteos por propiedad (no excluyentes: un contrato cumplido puede tener exposición).
    for (const k of ['ok', 'deficit', 'excedente']) {
      if (contratoMatchEstado(res[c.id], k)) counts[k]++
    }
  }
  return counts
})

// ── Table with consolidated row ──────────────────────────────────────────────
const tableDataWithTotal = computed(() => {
  if (!tableData.value.length) return []
  const rows = tableData.value
  const totalMin = rows.reduce((s, r) => s + (r.total_min_mwh || 0), 0)
  const totalMax = rows.reduce((s, r) => s + (r.total_max_mwh || 0), 0)
  const maxMeses = Math.max(...rows.map(r => r.meses_con_compromisos || 0))
  return [
    {
      id: CONSOLIDADO_ID,
      nombre_interno: 'Consolidado (todos)',
      comprador_nombre: `${rows.length} contratos`,
      fecha_inicio: null,
      fecha_fin: null,
      total_min_mwh: Math.round(totalMin * 10) / 10,
      total_max_mwh: Math.round(totalMax * 10) / 10,
      meses_con_compromisos: maxMeses,
    },
    ...rows,
  ]
})

// ── Chart math ────────────────────────────────────────────────────────────────
const yMaxVal = computed(() => {
  if (!anualData.value) return 1000
  let m = 0
  for (const mes of anualData.value.meses) m = Math.max(m, mes.max_mwh || 0, genVal(mes), cierreVal(mes))
  return m > 0 ? m * 1.18 : 1000
})

const yGridLines = computed(() => {
  const step = niceStep(yMaxVal.value)
  const lines = []
  for (let v = 0; v <= yMaxVal.value; v += step) lines.push({ val: v, y: toY(v) })
  return lines
})

function niceStep(max) {
  const rough = max / 5
  const mag   = Math.pow(10, Math.floor(Math.log10(rough || 1)))
  const mult  = rough / mag
  if (mult < 1.5) return mag
  if (mult < 3.5) return 2 * mag
  if (mult < 7.5) return 5 * mag
  return 10 * mag
}

function toY(val)  { return PAD_T + PLOT_H * (1 - (val || 0) / yMaxVal.value) }
function slotX(i)  { return PAD_L + i * slotW }
function barX(i)   { return PAD_L + i * slotW + (slotW - barW) / 2 }
function genVal(mes) { return mes.gen_proyectada_mwh ?? mes.gen_mwh ?? 0 }
function cierreVal(mes) { return mes.gen_proyectada_cierre ?? 0 }
function isCurrentMonth(mes) { return selectedYear.value === now.getFullYear() && mes.month === (now.getMonth() + 1) }

// Dual-bar geometry for current month (two narrower bars side by side)
const dualBarW = slotW * 0.26
const dualGap  = slotW * 0.03
function dualBarLeftX(i)  { return PAD_L + i * slotW + (slotW - dualBarW * 2 - dualGap) / 2 }
function dualBarRightX(i) { return dualBarLeftX(i) + dualBarW + dualGap }

// ── Chart interaction ─────────────────────────────────────────────────────────
function monthIdxFromEvent(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const svgX = (event.clientX - rect.left) * (SVG_W / rect.width)
  const idx  = Math.floor((svgX - PAD_L) / slotW)
  return (idx >= 0 && idx < N && svgX >= PAD_L) ? idx : null
}

function onSvgMousemove(event) {
  const idx = monthIdxFromEvent(event)
  hovered.value = idx
  if (idx !== null && chartBox.value) {
    const r = chartBox.value.getBoundingClientRect()
    tooltipX.value = Math.min(event.clientX - r.left + 12, r.width - 215)
    tooltipY.value = event.clientY - r.top - 10
  }
}

function onSvgClick(event) {
  const idx = monthIdxFromEvent(event)
  if (idx === null) return
  selectedMonthIdx.value = selectedMonthIdx.value === idx ? null : idx
}

// ── Simulador computed ────────────────────────────────────────────────────────
const simResults = computed(() => {
  if (!simData.value || !Object.keys(simAssignments.value).length) return {}
  const out = {}
  const esActual = simData.value.es_mes_actual
  const diaAct = simData.value.dia_actual
  const diasRest = simData.value.dias_restantes
  for (const c of allContratos.value) {
    const plantas = simAssignments.value[c.id] || []
    let genReal = 0, genDup = 0, genProy = 0
    for (const p of plantas) {
      if (p.month_mwh == null) continue
      const mwh = p.month_mwh * p.pct_despacho
      // Todo el suministro cuenta para el cumplimiento (real o compra en bolsa);
      // genDup es el subconjunto cuyo origen es bolsa (informativo).
      genReal += mwh
      if (p.es_duplicado) genDup += mwh
      if (esActual && p.month_mwh_proyectado != null) {
        genProy += p.month_mwh_proyectado * p.pct_despacho
      }
    }
    const gen = genReal
    const { min_mwh: min, max_mwh: max } = c
    let estado = 'sin_compromisos'
    if (min !== null || max !== null) {
      const effectiveMin = min ?? 0
      if (gen < effectiveMin) estado = 'deficit'
      else if (max !== null && gen > max) estado = 'excedente'
      else estado = 'ok'
    }
    const pct = max != null ? (gen / max * 100) : min != null ? (gen / min * 100) : null
    const dupPct = genDup > 0 && (max != null || min != null)
      ? (genDup / (max ?? min) * 100) : null
    const proyPct = esActual && genProy > 0 && (max != null || min != null)
      ? (genProy / (max ?? min) * 100) : null
    let estadoProy = 'sin_compromisos'
    if (esActual && genProy > 0 && (min !== null || max !== null)) {
      const effMin = min ?? 0
      if (genProy < effMin) estadoProy = 'deficit'
      else if (max !== null && genProy > max) estadoProy = 'excedente'
      else estadoProy = 'ok'
    }
    // ── Geometría del bullet chart (zonas déficit/rango/excedente sobre un eje común) ──
    const hasMin = min !== null
    const hasMax = max !== null
    let axisMax
    if (hasMax)      axisMax = Math.max(max * 1.2, gen * 1.06, (genProy || 0) * 1.06)
    else if (hasMin) axisMax = Math.max(min * 1.4, gen * 1.1, (genProy || 0) * 1.1)
    else             axisMax = Math.max(gen, genProy || 0, 1) * 1.1
    const clampPct = v => Math.max(0, Math.min(100, (v / axisMax) * 100))
    const bullet = {
      hasMin, hasMax,
      hasZones: hasMin || hasMax,
      minPct: hasMin ? clampPct(min) : 0,
      maxPct: hasMax ? clampPct(max) : 100,
      measurePct: clampPct(gen),
      // Tramo de "compra en bolsa" DENTRO de la barra entregada (al final): de
      // (gen - genDup) hasta gen. Se pinta amarillo sobre la barra de estado.
      bolsaStartPct: genDup > 0 ? clampPct(Math.max(0, gen - genDup)) : null,
      dupW: genDup > 0 ? Math.max(0, clampPct(gen) - clampPct(Math.max(0, gen - genDup))) : 0,
      proyPct: (esActual && genProy > 0) ? clampPct(genProy) : null,
    }

    // ── Cumplimiento de plantas: registradas en GESCON (numerador) vs inscritas exigidas por el contrato (denominador) ──
    const plantasEsp = c.plantas_esperadas ?? null
    const plantasReg = plantas.length
    let estadoPlantas = 'sin_compromisos'
    if (plantasEsp !== null) {
      if (plantasReg < plantasEsp) estadoPlantas = 'deficit'
      else if (plantasReg > plantasEsp) estadoPlantas = 'excedente'
      else estadoPlantas = 'ok'
    }
    // Barra: si aún no hay meta inscrita (0), llena al 100% cuando ya hay plantas registradas y 0 si no.
    const plantasPct = plantasEsp != null
      ? (plantasEsp > 0 ? Math.min(100, (plantasReg / plantasEsp) * 100) : (plantasReg > 0 ? 100 : 0))
      : null

    // Estado para filtrar: la proyección de cierre cuando existe (mes en curso),
    // si no, el estado real (meses ya cerrados o sin proyección disponible).
    const estadoEfectivo = (esActual && genProy > 0 && estadoProy !== 'sin_compromisos')
      ? estadoProy : estado

    out[c.id] = {
      gen: Math.round(gen * 10) / 10,
      genDup: Math.round(genDup * 10) / 10,
      tieneDup: genDup > 0,
      genProy: esActual ? Math.round(genProy * 10) / 10 : null,
      estado, estadoProy, estadoEfectivo, pct, dupPct, proyPct, min, max,
      diaActual: diaAct, diasRestantes: diasRest, bullet,
      plantasReg, plantasEsp, estadoPlantas, plantasPct,
    }
  }
  return out
})

// ── Simulador drag-and-drop ───────────────────────────────────────────────────
function initAssignments(data) {
  const proyMap = Object.fromEntries(backendProyectos.value.map(p => [p.id, p]))
  const a = { none: [] }
  for (const c of data.contratos) a[c.id] = []
  for (const p of data.plantas) {
    const proy = proyMap[p.id]
    if (proy && !proyectoActivoEnMes(proy, simYear.value, simMonth.value)) continue
    const key = p.contrato_id ?? 'none'
    if (!a[key]) a[key] = []
    a[key].push({ ...p })
  }
  simAssignments.value = a
}

function resetSim() {
  if (simData.value) initAssignments(simData.value)
  ficticioContratos.value = []
  hiddenContratos.value = new Set()
  expandedContratos.value = []
}

function crearNuevo() {
  if (!ficticioNombre.value || ficticioMax.value <= 0) return
  const id = `__ficticio_${ficticioNextId++}`
  const contrato = {
    id,
    nombre: ficticioNombre.value.trim(),
    comprador_nombre: 'Simulado',
    min_mwh: ficticioMin.value || 0,
    max_mwh: ficticioMax.value,
    _ficticio: true,
  }
  ficticioContratos.value = [...ficticioContratos.value, contrato]
  simAssignments.value[id] = []
  ficticioNombre.value = ''
  ficticioMin.value = 0
  ficticioMax.value = 0
  showNuevoForm.value = false
}

function eliminarNuevo(contratoId) {
  const plantas = simAssignments.value[contratoId] || []
  if (plantas.length) {
    if (!simAssignments.value['none']) simAssignments.value['none'] = []
    simAssignments.value['none'].push(...plantas)
  }
  delete simAssignments.value[contratoId]
  ficticioContratos.value = ficticioContratos.value.filter(c => c.id !== contratoId)
  hiddenContratos.value = new Set([...hiddenContratos.value].filter(id => id !== contratoId))
}

function toggleExpand(contratoId) {
  const idx = expandedContratos.value.indexOf(contratoId)
  if (idx >= 0) expandedContratos.value.splice(idx, 1)
  else expandedContratos.value.push(contratoId)
}

function hideContrato(contratoId) {
  hiddenContratos.value = new Set([...hiddenContratos.value, contratoId])
}

function showAllContratos() {
  hiddenContratos.value = new Set()
}

function onDragOver(contratoId) {
  dragOver.value = contratoId
  if (!expandedContratos.value.includes(contratoId)) {
    expandedContratos.value.push(contratoId)
  }
}

function onDragStart(planta, fromContratoId) {
  dragPlanta.value = { ...planta }
  dragFromContrato.value = fromContratoId ?? 'none'
}

function onDragEnd() {
  dragPlanta.value = null
  dragFromContrato.value = undefined
  dragOver.value = null
}

function onDrop(toContratoId) {
  if (!dragPlanta.value) return
  const from = dragFromContrato.value
  const to   = toContratoId ?? 'none'
  if (from === to) { dragOver.value = null; return }

  const fromList = simAssignments.value[from]
  if (fromList) {
    const idx = fromList.findIndex(p => p.id === dragPlanta.value.id)
    if (idx >= 0) fromList.splice(idx, 1)
  }
  if (!simAssignments.value[to]) simAssignments.value[to] = []
  simAssignments.value[to].push({ ...dragPlanta.value })

  dragPlanta.value = null
  dragFromContrato.value = undefined
  dragOver.value = null
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtMwh(val) {
  if (val === null || val === undefined) return '—'
  return val.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MWh'
}
function fmtShort(val) {
  if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return Math.round(val).toString()
}
function fmtFecha(iso) {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  return `${MESES_CORTOS[parseInt(m) - 1]} ${y}`
}

// ── Helpers de barras de cumplimiento (simulador) ─────────────────────────────
function estadoColor(estado) {
  return estado === 'ok'        ? '#2e7d32'
       : estado === 'deficit'   ? '#D64455'
       : estado === 'excedente' ? '#14B8A6'
       : '#b0a0c0'
}
function estadoBadge(estado) {
  return estado === 'ok'        ? 'background: rgba(46,125,50,0.12); color: #2e7d32;'
       : estado === 'deficit'   ? 'background: rgba(214,68,85,0.12); color: #D64455;'
       : estado === 'excedente' ? 'background: rgba(20,184,166,0.16); color: #0F766E;'
       : 'background: rgba(44,32,57,0.06); color: #7a6e8a;'
}
function estadoLabel(estado) {
  return estado === 'ok'        ? '✓ OK'
       : estado === 'deficit'   ? '↓ Déficit'
       : estado === 'excedente' ? '↑ Excedente'
       : '— Sin datos'
}

// ── Copiar imagen de una capa (contrato + sus proyectos) ──────────────────────
// Renderiza la capa a un PNG con Canvas (sin dependencias) y lo copia al
// portapapeles. Si el navegador no permite escribir imágenes al portapapeles,
// cae a descargar el PNG. Muestra el total de proyectos del contrato y las
// cantidades (energía por planta + agregados).
const copiadoCapaId = ref(null)

// ── Panel flotante "ver detalle de la capa" (misma info que la imagen) ────────
const detalleCapaId = ref(null)
const esMesActualSim = computed(() => !!(simData.value && simData.value.es_mes_actual))
const periodoSimLabel = computed(() => `${MESES[simMonth.value - 1]} ${simYear.value}`)

function abrirDetalleCapa(c) { detalleCapaId.value = c.id }
function cerrarDetalleCapa() { detalleCapaId.value = null }

const detalleCapa = computed(() => {
  if (detalleCapaId.value == null) return null
  const c = allContratos.value.find(x => x.id === detalleCapaId.value)
  if (!c) return null
  return { c, plantas: simAssignments.value[c.id] || [], res: simResults.value[c.id] || {} }
})

// Proyección de cierre del mes por planta (mes en curso; incluye duplicados,
// porque la compra en bolsa también cubre el contrato).
function plantaProyMwh(p) {
  return (esMesActualSim.value && p.month_mwh_proyectado != null)
    ? p.month_mwh_proyectado * p.pct_despacho
    : null
}

// Veredicto de riesgo / probabilidad (proyección vs mínimo) — espeja la imagen
function veredictoCapa(res) {
  const minDef = res.min != null
  const proyOk = esMesActualSim.value && res.genProy != null && res.genProy > 0
  if (minDef && proyOk) {
    if (res.genProy >= res.min) {
      return { icon: 'pi-check-circle', txt: 'Probabilidad de cumplimiento alta',
        sub: `Proyección ${fmtMwh(res.genProy)} ≥ mínimo ${fmtMwh(res.min)}`,
        bg: 'rgba(46,125,50,0.10)', fg: '#2e7d32' }
    }
    return { icon: 'pi-exclamation-triangle', txt: 'Riesgo de incumplimiento',
      sub: `Proyección ${fmtMwh(res.genProy)} < mínimo ${fmtMwh(res.min)}`,
      bg: 'rgba(214,68,85,0.10)', fg: '#D64455' }
  }
  if (minDef) {
    return { icon: 'pi-minus-circle', txt: 'Sin proyección del mes para evaluar',
      sub: `Mínimo ${fmtMwh(res.min)}`, bg: 'rgba(44,32,57,0.05)', fg: '#7a6e8a' }
  }
  return { icon: 'pi-minus-circle', txt: 'Contrato sin energía mínima definida',
    sub: '', bg: 'rgba(44,32,57,0.05)', fg: '#7a6e8a' }
}

function _estadoTextoPlano(estado) {
  return estado === 'ok' ? 'En rango'
       : estado === 'deficit' ? 'Déficit'
       : estado === 'excedente' ? 'Excedente'
       : 'Sin datos'
}

function _truncarTexto(ctx, texto, maxW) {
  if (ctx.measureText(texto).width <= maxW) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

function _dibujarPill(ctx, x, y, texto, bg, fg, font) {
  ctx.font = font
  const padX = 9, h = 21
  const w = ctx.measureText(texto).width + padX * 2
  const r = h / 2
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  ctx.fillStyle = fg
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, x + padX, y + h / 2 + 0.5)
  return w
}

function _renderCapaCanvas(c) {
  const plantas = simAssignments.value[c.id] || []
  const res = simResults.value[c.id] || {}
  const esActual = !!(simData.value && simData.value.es_mes_actual)

  const DARK = '#2C2039', GREY = '#7a6e8a', PURPLE = '#915BD8'
  const RED = '#D64455', GOLD = '#9a6700'
  const scale = 2
  const W = 880, padX = 36
  const headerH = 156, tableHeadH = 32, rowH = 36, totalH = 52, riskH = 56, footerH = 50
  const bodyTop = headerH + tableHeadH
  const H = bodyTop + Math.max(plantas.length, 1) * rowH + totalH + riskH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  // Fondo + barra de acento
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = PURPLE
  ctx.fillRect(0, 0, W, 6)

  // ── Header: nombre + comprador ──
  ctx.fillStyle = DARK
  ctx.font = 'bold 23px Inter, Arial, sans-serif'
  ctx.fillText(_truncarTexto(ctx, c.nombre || 'Contrato', W - padX * 2 - 150), padX, 44)
  ctx.fillStyle = GREY
  ctx.font = '13px Inter, Arial, sans-serif'
  ctx.fillText(_truncarTexto(ctx, c.comprador_nombre || '', W - padX * 2 - 150), padX, 64)
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 11px Inter, Arial, sans-serif'
  ctx.fillText(`Período de consulta: ${MESES[simMonth.value - 1]} ${simYear.value}`, padX, 84)

  // Pills estado + % (arriba a la derecha)
  const estado = res.estado || 'sin_compromisos'
  const badgeBg = estado === 'ok' ? 'rgba(46,125,50,0.12)' : estado === 'deficit' ? 'rgba(214,68,85,0.12)'
                : estado === 'excedente' ? 'rgba(20,184,166,0.16)' : 'rgba(44,32,57,0.06)'
  const badgeFg = estado === 'ok' ? '#2e7d32' : estado === 'deficit' ? RED
                : estado === 'excedente' ? '#0F766E' : GREY
  ctx.textBaseline = 'middle'
  const pctTxt = (res.pct !== null && res.pct !== undefined) ? Math.round(res.pct) + '%' : null
  let pillX = W - padX
  const f = 'bold 12px Inter, Arial, sans-serif'
  // se dibujan de derecha a izquierda
  if (pctTxt) {
    ctx.font = f
    const w = ctx.measureText(pctTxt).width + 18
    pillX -= w
    _dibujarPill(ctx, pillX, 32, pctTxt, badgeBg, badgeFg, f)
    pillX -= 8
  }
  {
    const lbl = _estadoTextoPlano(estado)
    ctx.font = f
    const w = ctx.measureText(lbl).width + 18
    pillX -= w
    _dibujarPill(ctx, pillX, 32, lbl, badgeBg, badgeFg, f)
  }
  ctx.textBaseline = 'alphabetic'

  // ── Métricas (energía duplicada se suma como 4ª columna si aplica) ──
  const metrics = [
    ['ENERGÍA ENTREGADA', fmtMwh(res.gen), DARK],
    ['ENERGÍA MÍNIMA', res.min !== null && res.min !== undefined ? fmtMwh(res.min) : '—', DARK],
    ['ENERGÍA PROYECTADA', (res.genProy != null && res.genProy > 0) ? fmtMwh(res.genProy) : '—', DARK],
  ]
  if (res.genDup > 0) metrics.push(['COMPRA EN BOLSA', fmtMwh(res.genDup), GOLD])
  const colW = (W - padX * 2) / metrics.length
  metrics.forEach(([lbl, val, valColor], i) => {
    const x = padX + i * colW
    ctx.fillStyle = valColor === DARK ? GREY : valColor
    ctx.font = 'bold 9px Inter, Arial, sans-serif'
    ctx.fillText(lbl, x, 100)
    ctx.fillStyle = valColor
    ctx.font = 'bold 16px Inter, Arial, sans-serif'
    ctx.fillText(val, x, 120)
  })

  // Línea divisoria + "N proyectos"
  ctx.strokeStyle = 'rgba(44,32,57,0.10)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(padX, 138); ctx.lineTo(W - padX, 138); ctx.stroke()
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 12px Inter, Arial, sans-serif'
  ctx.fillText(`${plantas.length} proyecto${plantas.length === 1 ? '' : 's'} en el contrato`, padX, headerH - 4)

  // ── Cabecera de tabla ──
  const colProyR = W - padX            // proyección cierre del mes (derecha)
  const colEneR  = W - padX - 200      // energía generada
  const colPctR  = W - padX - 360      // % despacho
  const yHead = headerH + 20
  ctx.fillStyle = GREY
  ctx.font = 'bold 10px Inter, Arial, sans-serif'
  ctx.fillText('PROYECTO', padX, yHead)
  ctx.textAlign = 'right'
  ctx.fillText('% DESPACHO', colPctR, yHead)
  ctx.font = 'bold 9px Inter, Arial, sans-serif'
  ctx.fillText('ENERGÍA GENERADA', colEneR, yHead)
  ctx.fillText('PROYECCIÓN CIERRE DEL MES', colProyR, yHead)
  ctx.textAlign = 'left'

  // ── Filas de proyectos ──
  if (!plantas.length) {
    ctx.fillStyle = 'rgba(44,32,57,0.35)'
    ctx.font = 'italic 13px Inter, Arial, sans-serif'
    ctx.fillText('Sin proyectos asignados', padX, bodyTop + 24)
  }
  plantas.forEach((p, i) => {
    const yTop = bodyTop + i * rowH
    const yMid = yTop + rowH / 2
    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(145,91,216,0.04)'
      ctx.fillRect(padX - 8, yTop, W - padX * 2 + 16, rowH)
    }
    const mwh = p.month_mwh != null ? p.month_mwh * p.pct_despacho : null
    const colName = p.es_duplicado ? GOLD : p.comprado_por_unergy ? GOLD : DARK
    ctx.textBaseline = 'middle'
    // Nombre
    ctx.fillStyle = colName
    ctx.font = '600 13px Inter, Arial, sans-serif'
    let nameMaxW = colPctR - padX - 90
    const nombre = _truncarTexto(ctx, p.nombre || `Proyecto ${p.id}`, nameMaxW)
    ctx.fillText(nombre, padX, yMid)
    // Tag duplicado / compra
    const nx = padX + ctx.measureText(nombre).width + 8
    if (p.es_duplicado) {
      _dibujarPill(ctx, nx, yMid - 9, 'Compra bolsa', 'rgba(240,192,64,0.22)', GOLD, 'bold 10px Inter, Arial, sans-serif')
    } else if (p.comprado_por_unergy) {
      _dibujarPill(ctx, nx, yMid - 9, 'Compra', 'rgba(240,192,64,0.25)', GOLD, 'bold 10px Inter, Arial, sans-serif')
    }
    // % despacho
    ctx.textAlign = 'right'
    ctx.fillStyle = GREY
    ctx.font = '12px Inter, Arial, sans-serif'
    ctx.fillText((p.pct_despacho * 100).toFixed(0) + '%', colPctR, yMid)
    // Energía generada
    ctx.fillStyle = colName
    ctx.font = 'bold 13px Inter, Arial, sans-serif'
    ctx.fillText(mwh != null ? fmtMwh(mwh) : '—', colEneR, yMid)
    // Proyección cierre del mes (mes en curso; incluye duplicados — bolsa también cubre)
    const mwhProy = (esActual && p.month_mwh_proyectado != null)
      ? p.month_mwh_proyectado * p.pct_despacho : null
    if (mwhProy != null) {
      ctx.fillStyle = PURPLE
      ctx.font = 'bold 13px Inter, Arial, sans-serif'
      ctx.fillText('◆ ' + fmtMwh(mwhProy), colProyR, yMid)
    } else {
      ctx.fillStyle = 'rgba(44,32,57,0.3)'
      ctx.font = '13px Inter, Arial, sans-serif'
      ctx.fillText('—', colProyR, yMid)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  })

  // ── Fila total ──
  const yTotalTop = bodyTop + Math.max(plantas.length, 1) * rowH + 6
  ctx.strokeStyle = 'rgba(44,32,57,0.14)'
  ctx.beginPath(); ctx.moveTo(padX, yTotalTop); ctx.lineTo(W - padX, yTotalTop); ctx.stroke()
  const yTotalMid = yTotalTop + totalH / 2
  ctx.textBaseline = 'middle'
  ctx.fillStyle = DARK
  ctx.font = 'bold 14px Inter, Arial, sans-serif'
  ctx.fillText(`Total · ${plantas.length} proyecto${plantas.length === 1 ? '' : 's'}`, padX, yTotalMid)
  ctx.textAlign = 'right'
  // Total energía generada
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 16px Inter, Arial, sans-serif'
  ctx.fillText(fmtMwh(res.gen), colEneR, yTotalMid)
  if (res.genDup > 0) {
    ctx.fillStyle = GOLD
    ctx.font = 'bold 11px Inter, Arial, sans-serif'
    ctx.fillText(`de ello, ${fmtMwh(res.genDup)} compra en bolsa`, colEneR, yTotalMid + 17)
  }
  // Total proyección cierre del mes
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 16px Inter, Arial, sans-serif'
  const totalProy = (esActual && res.genProy != null && res.genProy > 0) ? fmtMwh(res.genProy) : '—'
  ctx.fillText(totalProy, colProyR, yTotalMid)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // ── Veredicto: riesgo / probabilidad de cumplimiento (proyección vs mínimo) ──
  const yRiskTop = bodyTop + Math.max(plantas.length, 1) * rowH + totalH
  const minDef = res.min != null
  const proyOk = esActual && res.genProy != null && res.genProy > 0
  let riskBg, riskFg, riskIcon, riskTxt, riskSub
  if (minDef && proyOk) {
    if (res.genProy >= res.min) {
      riskBg = 'rgba(46,125,50,0.10)'; riskFg = '#2e7d32'; riskIcon = '✓'
      riskTxt = 'Probabilidad de cumplimiento alta'
      riskSub = `Proyección ${fmtMwh(res.genProy)} ≥ mínimo ${fmtMwh(res.min)}`
    } else {
      riskBg = 'rgba(214,68,85,0.10)'; riskFg = RED; riskIcon = '⚠'
      riskTxt = 'Riesgo de incumplimiento'
      riskSub = `Proyección ${fmtMwh(res.genProy)} < mínimo ${fmtMwh(res.min)}`
    }
  } else if (minDef) {
    riskBg = 'rgba(44,32,57,0.05)'; riskFg = GREY; riskIcon = '•'
    riskTxt = 'Sin proyección del mes para evaluar'
    riskSub = `Mínimo ${fmtMwh(res.min)}`
  } else {
    riskBg = 'rgba(44,32,57,0.05)'; riskFg = GREY; riskIcon = '•'
    riskTxt = 'Contrato sin energía mínima definida'
    riskSub = ''
  }
  ctx.fillStyle = riskBg
  ctx.beginPath(); ctx.roundRect(padX, yRiskTop + 6, W - padX * 2, riskH - 12, 10); ctx.fill()
  ctx.textBaseline = 'middle'
  const yRiskMid = yRiskTop + riskH / 2
  ctx.fillStyle = riskFg
  ctx.font = 'bold 15px Inter, Arial, sans-serif'
  ctx.fillText(`${riskIcon}  ${riskTxt}`, padX + 16, yRiskMid - (riskSub ? 8 : 0))
  if (riskSub) {
    ctx.font = '11px Inter, Arial, sans-serif'
    ctx.fillText(riskSub, padX + 16, yRiskMid + 10)
  }
  ctx.textBaseline = 'alphabetic'

  // ── Footer ──
  ctx.fillStyle = '#faf8fc'
  ctx.fillRect(0, H - footerH, W, footerH)
  ctx.fillStyle = PURPLE
  ctx.font = 'bold 12px Inter, Arial, sans-serif'
  ctx.fillText('Unergy', padX, H - footerH / 2 + 1)
  ctx.fillStyle = GREY
  ctx.font = '11px Inter, Arial, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('Cumplimiento PPA', padX + 58, H - footerH / 2 + 1)
  ctx.textAlign = 'right'
  ctx.fillText(`${MESES[simMonth.value - 1]} ${simYear.value}`, W - padX, H - footerH / 2 + 1)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  return canvas
}

async function copiarImagenCapa(c) {
  let canvas
  try {
    canvas = _renderCapaCanvas(c)
  } catch (e) {
    console.error('No se pudo renderizar la imagen de la capa', e)
    return
  }
  canvas.toBlob(async (blob) => {
    if (!blob) return
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      copiadoCapaId.value = c.id
      setTimeout(() => { if (copiadoCapaId.value === c.id) copiadoCapaId.value = null }, 2200)
    } catch (e) {
      // Fallback: el navegador no permite escribir imágenes al portapapeles → descargar
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `capa-${(c.nombre || 'contrato').replace(/[^\w-]+/g, '_')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }, 'image/png')
}

// ── Data loading ──────────────────────────────────────────────────────────────
const CONSOLIDADO_ID = '__consolidado__'

async function loadContratos() {
  try {
    const res = await client.get('/cumplimiento/ppa')
    const mapped = res.data.map(c => ({
      ...c,
      label: c.nombre_interno || c.numero_codigo_contrato || `Contrato ${c.id}`,
    }))
    contratos.value = [
      { id: CONSOLIDADO_ID, label: '📊 Consolidado (todos)' },
      ...mapped,
    ]
    if (mapped.length > 0) {
      selectedContratoId.value = CONSOLIDADO_ID
    }
  } catch (e) {
    console.error('Error loading contratos', e)
  }
}

async function loadAnnualData() {
  if (!selectedContratoId.value) return
  chartLoading.value = true
  chartError.value   = null
  anualData.value    = null
  hovered.value      = null
  selectedMonthIdx.value = null
  try {
    if (selectedContratoId.value === CONSOLIDADO_ID) {
      await loadConsolidado()
    } else {
      anualData.value = await cachedGet(
        `/cumplimiento/ppa/${selectedContratoId.value}/anual`,
        { year: selectedYear.value },
      )
    }
    updateCacheSize()
  } catch (e) {
    chartError.value = e.response?.data?.detail || 'Error al cargar los datos anuales.'
  } finally {
    chartLoading.value = false
  }
}

async function loadConsolidado() {
  const realContratos = contratos.value.filter(c => c.id !== CONSOLIDADO_ID)
  if (!realContratos.length) return

  const results = await Promise.allSettled(
    realContratos.map(c =>
      cachedGet(`/cumplimiento/ppa/${c.id}/anual`, { year: selectedYear.value })
    )
  )
  updateCacheSize()

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)

  if (!successful.length) {
    chartError.value = 'No se pudo cargar ningún contrato.'
    return
  }

  const meses = []
  for (let i = 0; i < 12; i++) {
    let totalGen = 0, totalProy = null, totalCierre = null, totalMin = 0, totalMax = 0
    let hasMin = false, hasMax = false, totalBolsaDup = 0
    let diaActual = null, diasRestantes = null
    const allPlantas = []

    for (const data of successful) {
      const mes = data.meses[i]
      totalGen += mes.gen_mwh || 0
      if (mes.gen_proyectada_mwh !== null && mes.gen_proyectada_mwh !== undefined) {
        totalProy = (totalProy || 0) + mes.gen_proyectada_mwh
      }
      if (mes.gen_proyectada_cierre !== null && mes.gen_proyectada_cierre !== undefined) {
        totalCierre = (totalCierre || 0) + mes.gen_proyectada_cierre
      }
      if (mes.min_mwh !== null) { totalMin += mes.min_mwh; hasMin = true }
      if (mes.max_mwh !== null) { totalMax += mes.max_mwh; hasMax = true }
      if (mes.exposicion_bolsa_duplicados_mwh) totalBolsaDup += mes.exposicion_bolsa_duplicados_mwh
      if (mes.dia_actual != null) diaActual = mes.dia_actual
      if (mes.dias_restantes != null) diasRestantes = mes.dias_restantes
      for (const p of (mes.plantas || [])) {
        allPlantas.push({
          ...p,
          contrato: data.contrato.nombre_interno || data.contrato.numero_codigo_contrato,
        })
      }
    }

    const minMwh = hasMin ? Math.round(totalMin * 1000) / 1000 : null
    const maxMwh = hasMax ? Math.round(totalMax * 1000) / 1000 : null
    const gen = Math.round(totalGen * 1000) / 1000
    const cierre = totalCierre !== null ? Math.round(totalCierre * 1000) / 1000 : null
    const val = cierre ?? (totalProy !== null ? Math.round(totalProy * 1000) / 1000 : gen)

    let estado = 'sin_compromisos', compras = null, excedentes = null
    if (minMwh !== null || maxMwh !== null) {
      const effectiveMin = minMwh ?? 0
      if (val < effectiveMin) { estado = 'deficit'; compras = Math.round((effectiveMin - val) * 1000) / 1000; excedentes = 0 }
      else if (maxMwh !== null && val > maxMwh) { estado = 'excedente'; compras = 0; excedentes = Math.round((val - maxMwh) * 1000) / 1000 }
      else { estado = 'ok'; compras = 0; excedentes = 0 }
    }

    const ref = successful[0].meses[i]
    meses.push({
      month: i + 1,
      gen_mwh: gen,
      gen_proyectada_mwh: totalProy !== null ? Math.round(totalProy * 1000) / 1000 : null,
      gen_proyectada_cierre: cierre,
      dia_actual: diaActual,
      dias_restantes: diasRestantes,
      min_mwh: minMwh,
      max_mwh: maxMwh,
      estado,
      tipo_datos: ref.tipo_datos,
      compras_bolsa_mwh: compras,
      excedentes_bolsa_mwh: excedentes,
      exposicion_bolsa_duplicados_mwh: totalBolsaDup > 0 ? Math.round(totalBolsaDup * 1000) / 1000 : null,
      plantas: allPlantas,
      n_plantas: allPlantas.length,
    })
  }

  anualData.value = {
    contrato: {
      id: CONSOLIDADO_ID,
      nombre_interno: 'Consolidado',
      numero_codigo_contrato: `${successful.length} contratos`,
      comprador_nombre: 'Todos los compradores',
    },
    year: selectedYear.value,
    meses,
  }
}

async function loadTableData() {
  tableLoading.value = true
  try {
    tableData.value = await cachedGet('/cumplimiento/ppa/resumen-anual', { year: selectedYear.value })
    updateCacheSize()
  } catch (e) {
    console.error('Error loading table data', e)
  } finally {
    tableLoading.value = false
  }
}

function onYearChange() { loadAnnualData(); loadTableData() }
function selectContrato(id) {
  selectedContratoId.value = id
  loadAnnualData()
}

async function loadSimulator(retry = true) {
  simLoading.value = true
  simError.value   = null
  try {
    const data = await cachedGet('/cumplimiento/simulador', { year: simYear.value, month: simMonth.value })
    simData.value = data
    initAssignments(data)
    updateCacheSize()
  } catch (e) {
    if (retry && (!e.response || e.code === 'ECONNABORTED' || e.response?.status >= 500)) {
      console.warn('Simulador: reintentando tras error', e.message)
      return loadSimulator(false)
    }
    const detail = e.response?.data?.detail
    const status = e.response?.status
    simError.value = detail
      || (status === 401 ? 'Sesión expirada — inicia sesión de nuevo.'
         : status === 503 ? 'API de generación no disponible temporalmente. Intenta en unos minutos.'
         : e.code === 'ECONNABORTED' ? 'Tiempo de espera agotado — el servidor tardó demasiado.'
         : 'Error al cargar el simulador.')
  } finally {
    simLoading.value = false
  }
}

async function loadPlantasContratos() {
  pcLoading.value = true
  pcError.value   = null
  try {
    pcData.value = await cachedGet('/cumplimiento/plantas-contratos', { year: pcYear.value, month: pcMonth.value })
    updateCacheSize()
  } catch (e) {
    pcError.value = e.response?.data?.detail || 'Error al cargar plantas y contratos.'
  } finally {
    pcLoading.value = false
  }
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  const end = new Date(dateStr + 'T00:00:00')
  const diff = (end - now) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 60
}

watch(activeTab, (tab) => {
  if (tab === 0 && !simData.value) loadSimulator()
  if (tab === 1 && !anualData.value) { loadAnnualData(); loadTableData() }
  if (tab === 2 && !pcData.value) loadPlantasContratos()
  if (tab === 3 && !etData.value) loadEnergiaTransada()
})

onMounted(async () => {
  await Promise.all([loadContratos(), loadBackendProyectos()])
  loadSimulator()
})
</script>

<style scoped>
/* ── Rediseño Notion + brand Unergy (header, tabs, toolbar, tarjetas) ── */
.cv-icon-tile {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  display: grid; place-items: center;
  background: rgba(145,91,216,0.12); color: #915BD8; font-size: 17px;
}
.cv-tab {
  font-size: 13.5px; font-weight: 700; color: #9b8fb0;
  padding: 9px 13px; border: 0; background: none; cursor: pointer;
  border-radius: 8px 8px 0 0; border-bottom: 2px solid transparent;
  margin-bottom: -1px; transition: background .12s, color .12s;
}
.cv-tab:hover { background: rgba(44,32,57,0.04); color: #2C2039; }
.cv-tab.active { color: #2C2039; border-bottom-color: #915BD8; }

.cv-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 34px;
  padding: 0 12px; border-radius: 9px; border: 1px solid rgba(44,32,57,0.12);
  background: #fff; color: #2C2039; font-size: 13px; cursor: pointer;
  transition: background .12s, border-color .12s;
}
.cv-btn:hover { background: rgba(44,32,57,0.04); border-color: rgba(145,91,216,0.40); }
.cv-btn-cta {
  display: inline-flex; align-items: center; gap: 6px; height: 34px;
  padding: 0 14px; border-radius: 9px; border: 0;
  background: #F6FF72; color: #2C2039; font-size: 13px; font-weight: 700; cursor: pointer;
  box-shadow: 0 1px 0 rgba(44,32,57,0.04); transition: filter .12s, box-shadow .12s;
}
.cv-btn-cta:hover { filter: brightness(0.97); box-shadow: 0 3px 12px rgba(246,255,114,0.55); }

.cv-card {
  background: #fff; border: 1px solid rgba(44,32,57,0.07); border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(44,32,57,0.04), 0 2px 10px rgba(44,32,57,0.035);
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.cv-card:hover {
  border-color: rgba(145,91,216,0.32);
  box-shadow: 0 10px 28px rgba(44,32,57,0.11);
  transform: translateY(-2px);
}
.cv-card-dragover { border-color: #915BD8 !important; box-shadow: 0 0 0 2px rgba(145,91,216,0.18) !important; }
.cv-panel {
  background: #fff; border: 1px solid rgba(44,32,57,0.07); border-radius: 16px;
  box-shadow: 0 1px 2px rgba(44,32,57,0.04), 0 2px 10px rgba(44,32,57,0.035);
}
.cv-card-gold {
  background: #fff; border: 1px solid rgba(240,192,64,0.5); border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(154,103,0,0.05), 0 2px 10px rgba(154,103,0,0.04);
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.cv-card-gold:hover { border-color: rgba(240,192,64,0.9); box-shadow: 0 10px 28px rgba(154,103,0,0.12); transform: translateY(-2px); }

:deep(.p-datatable .p-datatable-thead th) {
  background: rgba(44,32,57,0.05);
  color: #7a6e8a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px;
}
:deep(.p-datatable .p-datatable-tbody td) {
  padding: 8px 12px;
  font-size: 13px;
  color: #2C2039;
}
:deep(.p-datatable .p-datatable-tbody tr:hover td) {
  background: rgba(145,91,216,0.05) !important;
}
:deep(.p-datatable .row-selected td) {
  background: rgba(145,91,216,0.09) !important;
}
:deep(.p-datatable .row-consolidado td) {
  background: rgba(145,91,216,0.05) !important;
  border-bottom: 2px solid rgba(145,91,216,0.18) !important;
  font-weight: 600;
}
.sim-plant-zone::-webkit-scrollbar {
  width: 4px;
}
.sim-plant-zone::-webkit-scrollbar-thumb {
  background: rgba(145,91,216,0.2);
  border-radius: 2px;
}
.sim-plant-zone::-webkit-scrollbar-track {
  background: transparent;
}
</style>
