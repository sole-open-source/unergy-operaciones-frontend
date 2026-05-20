<template>
  <div class="p-6 space-y-6 min-h-screen" style="background: #FDFAF7; color: #2C2039;">

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold" style="color: #2C2039;">Cumplimiento PPA</h1>
        <p class="text-sm mt-0.5" style="color: #7a6e8a;">Generación vs. compromisos contractuales de energía</p>
      </div>
      <div class="flex items-center gap-2">
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
      </div>
    </div>

    <!-- Tab bar -->
    <div class="flex gap-0 border-b -mt-2" style="border-color: rgba(44,32,57,0.10);">
      <button
        v-for="(tab, i) in TABS"
        :key="i"
        @click="activeTab = i"
        class="px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
        :style="activeTab === i
          ? 'color: #915BD8; border-color: #915BD8;'
          : 'color: #7a6e8a; border-color: transparent;'"
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

        <div class="rounded-xl border p-4" style="background: white; border-color: rgba(44,32,57,0.12);">
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
                <rect v-if="isCurrentMonth(mes)" :x="slotX(i)" y="0" :width="slotW" :height="SVG_H - PAD_B + 2" fill="rgba(145,91,216,0.04)" />
                <rect v-if="selectedMonthIdx === i" :x="slotX(i)" y="0" :width="slotW" :height="SVG_H - PAD_B + 2" fill="rgba(240,192,64,0.08)" />
                <rect v-if="mes.min_mwh !== null && mes.max_mwh !== null" :x="slotX(i)" :y="toY(mes.max_mwh)" :width="slotW" :height="toY(mes.min_mwh) - toY(mes.max_mwh)" fill="rgba(46,125,50,0.10)" />
                <rect v-if="genVal(mes) > 0" :x="barX(i)" :y="toY(genVal(mes))" :width="barW" :height="toY(0) - toY(genVal(mes))" fill="#915BD8" :opacity="mes.tipo_datos === 'proyeccion_historica' ? 0.55 : 1" />
                <rect v-if="genVal(mes) > 0 && mes.tipo_datos === 'proyeccion_historica'" :x="barX(i)" :y="toY(genVal(mes))" :width="barW" :height="toY(0) - toY(genVal(mes))" fill="none" stroke="#915BD8" stroke-width="1" stroke-dasharray="3,2" />
                <rect v-if="mes.estado === 'deficit' && mes.min_mwh !== null && genVal(mes) > 0 && genVal(mes) < mes.min_mwh" :x="barX(i)" :y="toY(mes.min_mwh)" :width="barW" :height="toY(genVal(mes)) - toY(mes.min_mwh)" fill="rgba(214,68,85,0.32)" />
                <rect v-if="mes.estado === 'excedente' && mes.max_mwh !== null && genVal(mes) > mes.max_mwh" :x="barX(i)" :y="toY(genVal(mes))" :width="barW" :height="toY(mes.max_mwh) - toY(genVal(mes))" fill="rgba(240,192,64,0.55)" />
                <line v-if="mes.min_mwh !== null" :x1="slotX(i)" :y1="toY(mes.min_mwh)" :x2="slotX(i) + slotW" :y2="toY(mes.min_mwh)" stroke="rgba(214,68,85,0.50)" stroke-width="1" />
                <line v-if="mes.max_mwh !== null" :x1="slotX(i)" :y1="toY(mes.max_mwh)" :x2="slotX(i) + slotW" :y2="toY(mes.max_mwh)" stroke="rgba(145,91,216,0.50)" stroke-width="1" />
                <rect v-if="hovered === i && selectedMonthIdx !== i" :x="slotX(i)" :y="PAD_T" :width="slotW" :height="PLOT_H" fill="rgba(145,91,216,0.07)" />
                <circle v-if="selectedMonthIdx === i" :cx="barX(i) + barW / 2" :cy="SVG_H - PAD_B + 30" r="3" fill="#F0C040" />
                <text :x="barX(i) + barW / 2" :y="SVG_H - PAD_B + 17" text-anchor="middle" font-size="11"
                  :fill="selectedMonthIdx === i ? '#F0C040' : isCurrentMonth(mes) ? '#2C2039' : '#7a6e8a'"
                  :font-weight="selectedMonthIdx === i || isCurrentMonth(mes) ? '700' : '400'"
                >{{ MESES_CORTOS[i] }}</text>
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
                <span v-if="anualData.meses[hovered].tipo_datos !== 'real'" class="ml-1 text-xs font-normal" style="color: rgba(253,250,247,0.55);">proyección</span>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between gap-6">
                  <span style="color: rgba(253,250,247,0.65);">Generación</span>
                  <span class="font-mono font-semibold">{{ fmtMwh(genVal(anualData.meses[hovered])) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].min_mwh !== null" class="flex justify-between gap-6">
                  <span style="color: rgba(253,250,247,0.65);">Mínimo</span>
                  <span class="font-mono">{{ fmtMwh(anualData.meses[hovered].min_mwh) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].max_mwh !== null" class="flex justify-between gap-6">
                  <span style="color: rgba(253,250,247,0.65);">Máximo</span>
                  <span class="font-mono">{{ fmtMwh(anualData.meses[hovered].max_mwh) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].estado === 'deficit'" class="flex justify-between gap-6 mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #D64455;">Déficit</span>
                  <span class="font-mono font-bold" style="color: #D64455;">{{ fmtMwh(anualData.meses[hovered].compras_bolsa_mwh) }}</span>
                </div>
                <div v-if="anualData.meses[hovered].estado === 'excedente'" class="flex justify-between gap-6 mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #F0C040;">Excedente</span>
                  <span class="font-mono font-bold" style="color: #F0C040;">{{ fmtMwh(anualData.meses[hovered].excedentes_bolsa_mwh) }}</span>
                </div>
              </div>
              <div class="mt-2 pt-1 text-xs" style="color: rgba(253,250,247,0.35);">Clic para ver desglose</div>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-5 mt-3 pl-1">
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(46,125,50,0.18); border: 1px solid rgba(46,125,50,0.45);"></div>Zona de cumplimiento</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: #915BD8;"></div>Generación real</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(214,68,85,0.38);"></div>Brecha de déficit</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(240,192,64,0.6);"></div>Excedente contractual</div>
            <div class="flex items-center gap-2 text-xs" style="color: #7a6e8a;"><div class="w-4 h-4 rounded-sm" style="background: rgba(145,91,216,0.45); border: 1px dashed #915BD8;"></div>Proyección</div>
          </div>
        </div>
      </template>

      <!-- Empty chart state -->
      <div v-else-if="!chartLoading && !chartError" class="text-center py-16 rounded-xl border" style="color: #7a6e8a; border-color: rgba(44,32,57,0.10);">
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
          class="border rounded-xl overflow-hidden cursor-pointer"
          style="border-color: rgba(44,32,57,0.12);"
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
        <button
          @click="resetSim"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition"
          style="border-color: rgba(145,91,216,0.35); color: #915BD8; background: transparent;"
        >
          <i class="pi pi-refresh text-xs" />Resetear
        </button>
        <button
          v-if="hiddenContratos.size > 0"
          @click="showAllContratos"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition"
          style="border-color: rgba(46,125,50,0.35); color: #2e7d32; background: transparent;"
        >
          <i class="pi pi-eye text-xs" />Mostrar ocultos ({{ hiddenContratos.size }})
        </button>
        <button
          @click="showNuevoForm = true"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition"
          style="border-color: rgba(240,192,64,0.5); color: #9a6700; background: rgba(240,192,64,0.08);"
        >
          <i class="pi pi-plus text-xs" />PPA nuevo
        </button>
        <button
          @click="sortDesc = !sortDesc"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition"
          style="border-color: rgba(145,91,216,0.25); color: #915BD8; background: transparent;"
          v-tooltip="sortDesc ? 'Mayor cumplimiento primero' : 'Menor cumplimiento primero'"
        >
          <i class="pi text-xs" :class="sortDesc ? 'pi-sort-amount-down' : 'pi-sort-amount-up'" />
          {{ sortDesc ? '↓ Mayor %' : '↑ Menor %' }}
        </button>
        <span class="text-xs" style="color: #7a6e8a;">Arrastra las plantas entre contratos para simular</span>
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
              class="rounded-xl border transition-shadow flex flex-col"
              style="border-color: rgba(44,32,57,0.12); background: white;"
              :style="dragOver === c.id ? 'border-color: #915BD8; box-shadow: 0 0 0 2px rgba(145,91,216,0.18);' : ''"
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
                      <span class="text-xs font-mono flex-shrink-0" style="color: #7a6e8a;">{{ (simAssignments[c.id] || []).length }} plantas</span>
                      <span v-if="simResults[c.id]?.pct !== null && simResults[c.id]?.pct !== undefined"
                        class="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                        :style="simResults[c.id].estado === 'ok'
                          ? 'background: rgba(46,125,50,0.12); color: #2e7d32;'
                          : simResults[c.id].estado === 'deficit'
                          ? 'background: rgba(214,68,85,0.12); color: #D64455;'
                          : 'background: rgba(240,192,64,0.18); color: #9a6700;'"
                      >{{ Math.round(simResults[c.id].pct) }}%</span>
                    </div>
                    <div class="text-xs mt-0.5 truncate" style="color: #7a6e8a;">{{ c.comprador_nombre }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-0.5 flex-shrink-0">
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

              <!-- Compliance meter -->
              <div class="px-4 py-3 border-b" style="border-color: rgba(44,32,57,0.07);" v-if="simResults[c.id]">
                <div class="relative h-2 rounded-full overflow-hidden mb-1.5" style="background: rgba(44,32,57,0.08);">
                  <div
                    class="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                    :style="{
                      width: simResults[c.id].pct !== null ? Math.min(simResults[c.id].pct, 100) + '%' : '0%',
                      background: simResults[c.id].estado === 'ok' ? '#2e7d32' : simResults[c.id].estado === 'deficit' ? '#D64455' : '#F0C040',
                    }"
                  />
                  <!-- Min marker -->
                  <div
                    v-if="simResults[c.id].min !== null && simResults[c.id].max > 0"
                    class="absolute top-0 h-full w-0.5"
                    style="background: rgba(44,32,57,0.35);"
                    :style="{ left: Math.min(simResults[c.id].min / simResults[c.id].max * 100, 100) + '%' }"
                  />
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-xs font-bold" style="color: #2C2039;">{{ fmtMwh(simResults[c.id].gen) }}</span>
                  <span
                    class="text-xs font-semibold px-2 py-0.5 rounded-full"
                    :style="simResults[c.id].estado === 'ok'
                      ? 'background: rgba(46,125,50,0.12); color: #2e7d32;'
                      : simResults[c.id].estado === 'deficit'
                      ? 'background: rgba(214,68,85,0.12); color: #D64455;'
                      : simResults[c.id].estado === 'excedente'
                      ? 'background: rgba(240,192,64,0.18); color: #9a6700;'
                      : 'background: rgba(44,32,57,0.06); color: #7a6e8a;'"
                  >
                    {{ simResults[c.id].estado === 'ok' ? '✓ OK'
                     : simResults[c.id].estado === 'deficit' ? '↓ Déficit'
                     : simResults[c.id].estado === 'excedente' ? '↑ Excedente'
                     : '— Sin datos' }}
                  </span>
                </div>
                <div v-if="simResults[c.id].min !== null" class="text-xs mt-0.5" style="color: #7a6e8a;">
                  {{ fmtMwh(simResults[c.id].min) }} – {{ fmtMwh(simResults[c.id].max) }}
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
                    <span v-if="p.es_duplicado" class="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                      style="background: rgba(214,68,85,0.12); color: #D64455;"
                      v-tooltip="'Duplicado — exposición en bolsa'"
                    >Exp. bolsa</span>
                    <span v-else-if="p.comprado_por_unergy" class="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                      style="background: rgba(240,192,64,0.25); color: #9a6700;"
                      v-tooltip="p.contrato_compra_nombre || 'Contrato de compra'"
                    >Compra Unergy</span>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="font-mono font-semibold" :style="p.es_duplicado ? 'color: #D64455;' : p.comprado_por_unergy ? 'color: #9a6700;' : 'color: #915BD8;'">
                      {{ p.avg_daily_mwh != null ? fmtMwh(p.avg_daily_mwh * simData.dias_mes * p.pct_despacho) : '—' }}
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
                style="background: rgba(214,68,85,0.12); color: #D64455;"
              >Dup.</span>
              <span v-else-if="p.comprado_por_unergy" class="font-semibold px-1.5 py-0.5 rounded"
                style="background: rgba(240,192,64,0.25); color: #9a6700;"
                v-tooltip="p.contrato_compra_nombre || 'Contrato de compra'"
              >Compra</span>
              <span class="font-mono" :style="p.es_duplicado ? 'color: #D64455;' : p.comprado_por_unergy ? 'color: #9a6700;' : 'color: #7a6e8a;'">
                {{ p.avg_daily_mwh != null ? fmtMwh(p.avg_daily_mwh * simData.dias_mes) : '—' }}
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
          <div v-for="c in pcData.venta" :key="c.id"
            class="rounded-xl border overflow-hidden" style="border-color: rgba(44,32,57,0.12); background: white;">
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
                :style="p.es_duplicado ? 'background: rgba(214,68,85,0.04);' : ''">
                <div class="flex items-center gap-2">
                  <span class="font-medium" style="color: #2C2039;">{{ p.nombre }}</span>
                  <span v-if="p.es_duplicado" class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style="background: rgba(214,68,85,0.12); color: #D64455;">Exp. bolsa</span>
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
          <div v-for="c in pcData.compra" :key="c.id"
            class="rounded-xl border overflow-hidden" style="border-color: rgba(240,192,64,0.4); background: white;">
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
          <div class="rounded-xl border overflow-hidden" style="border-color: rgba(44,32,57,0.12); background: white;">
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
                  :style="p.es_duplicado ? 'background: rgba(214,68,85,0.04);' : ''"
                >
                  <td class="py-2 pr-2 font-medium" style="color: #2C2039;">
                    {{ p.nombre }}
                    <span v-if="p.es_duplicado" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style="background: rgba(214,68,85,0.12); color: #D64455;">Exp. bolsa</span>
                    <span v-if="p.contrato" class="ml-1 text-xs font-normal px-1.5 py-0.5 rounded" style="color: #915BD8; background: rgba(145,91,216,0.08);">{{ p.contrato }}</span>
                    <span v-if="p.dias_en_contrato && p.dias_mes && p.dias_en_contrato < p.dias_mes" class="ml-1 text-xs font-normal" style="color: #7a6e8a;">{{ p.dias_en_contrato }}/{{ p.dias_mes }} días</span>
                  </td>
                  <td class="py-2 px-2 text-right font-mono text-xs" style="color: #7a6e8a;">{{ (p.pct_despacho * 100).toFixed(0) }}%</td>
                  <td class="py-2 px-2 text-right font-mono" style="color: #2C2039;">{{ p.gen_planta_mwh !== null ? fmtMwh(p.gen_planta_mwh) : '—' }}</td>
                  <td class="py-2 pl-2 text-right font-mono font-semibold" :style="p.es_duplicado ? 'color: #D64455;' : 'color: #915BD8;'">{{ p.gen_contrato_mwh !== null ? fmtMwh(p.gen_contrato_mwh) : '—' }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid rgba(44,32,57,0.12);">
                  <td colspan="3" class="pt-3 text-sm font-semibold" style="color: #2C2039;">Total al contrato</td>
                  <td class="pt-3 text-right font-mono font-bold" style="color: #2C2039;">{{ fmtMwh(genVal(anualData.meses[selectedMonthIdx])) }}</td>
                </tr>
                <tr v-if="anualData.meses[selectedMonthIdx].exposicion_bolsa_duplicados_mwh">
                  <td colspan="3" class="pt-1 text-sm font-semibold" style="color: #D64455;">Exposición bolsa (duplicados)</td>
                  <td class="pt-1 text-right font-mono font-bold" style="color: #D64455;">{{ fmtMwh(anualData.meses[selectedMonthIdx].exposicion_bolsa_duplicados_mwh) }}</td>
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
  tableData.value = []
  try {
    await Promise.all([loadAnnualData(), loadTableData()])
    if (activeTab.value === 0) await loadSimulator()
    if (activeTab.value === 2) await loadPlantasContratos()
  } finally {
    cacheClearing.value = false
    updateCacheSize()
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS      = ['Estrategia', 'Cumplimiento', 'Proyectos']
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

const allContratos = computed(() => {
  if (!simData.value) return []
  return [...simData.value.contratos, ...ficticioContratos.value]
})

const visibleContratos = computed(() => {
  const filtered = allContratos.value.filter(c => !hiddenContratos.value.has(c.id))
  const res = simResults.value
  return filtered.slice().sort((a, b) => {
    const pctA = res[a.id]?.pct ?? -1
    const pctB = res[b.id]?.pct ?? -1
    return sortDesc.value ? pctB - pctA : pctA - pctB
  })
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
  for (const mes of anualData.value.meses) m = Math.max(m, mes.max_mwh || 0, genVal(mes))
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
function isCurrentMonth(mes) { return selectedYear.value === now.getFullYear() && mes.month === (now.getMonth() + 1) }

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
  for (const c of allContratos.value) {
    const plantas = simAssignments.value[c.id] || []
    const gen = plantas.reduce((sum, p) => {
      if (p.avg_daily_mwh == null) return sum
      return sum + p.avg_daily_mwh * simData.value.dias_mes * p.pct_despacho
    }, 0)
    const { min_mwh: min, max_mwh: max } = c
    let estado = 'sin_compromisos'
    if (min !== null && max !== null) {
      if (gen < min) estado = 'deficit'
      else if (gen > max) estado = 'excedente'
      else estado = 'ok'
    }
    out[c.id] = { gen: Math.round(gen * 10) / 10, estado, pct: max ? (gen / max * 100) : null, min, max }
  }
  return out
})

// ── Simulador drag-and-drop ───────────────────────────────────────────────────
function initAssignments(data) {
  const a = { none: [] }
  for (const c of data.contratos) a[c.id] = []
  for (const p of data.plantas) {
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
    let totalGen = 0, totalProy = null, totalMin = 0, totalMax = 0
    let hasMin = false, hasMax = false, totalBolsaDup = 0
    const allPlantas = []

    for (const data of successful) {
      const mes = data.meses[i]
      totalGen += mes.gen_mwh || 0
      if (mes.gen_proyectada_mwh !== null && mes.gen_proyectada_mwh !== undefined) {
        totalProy = (totalProy || 0) + mes.gen_proyectada_mwh
      }
      if (mes.min_mwh !== null) { totalMin += mes.min_mwh; hasMin = true }
      if (mes.max_mwh !== null) { totalMax += mes.max_mwh; hasMax = true }
      if (mes.exposicion_bolsa_duplicados_mwh) totalBolsaDup += mes.exposicion_bolsa_duplicados_mwh
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
    const val = totalProy !== null ? Math.round(totalProy * 1000) / 1000 : gen

    let estado = 'sin_compromisos', compras = null, excedentes = null
    if (minMwh !== null && maxMwh !== null) {
      if (val < minMwh) { estado = 'deficit'; compras = Math.round((minMwh - val) * 1000) / 1000; excedentes = 0 }
      else if (val > maxMwh) { estado = 'excedente'; compras = 0; excedentes = Math.round((val - maxMwh) * 1000) / 1000 }
      else { estado = 'ok'; compras = 0; excedentes = 0 }
    }

    const ref = successful[0].meses[i]
    meses.push({
      month: i + 1,
      gen_mwh: gen,
      gen_proyectada_mwh: totalProy !== null ? Math.round(totalProy * 1000) / 1000 : null,
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
})

onMounted(async () => {
  await loadContratos()
  loadSimulator()
})
</script>

<style scoped>
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
