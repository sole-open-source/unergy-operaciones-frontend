<template>
  <div class="space-y-5">

    <!-- ── Header ───────────────────────────────────────────────────────────── -->
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
          <span class="font-medium" style="color:#2C2039">Operación</span>
        </p>
        <h2 class="text-lg font-bold" style="color:#2C2039">Operación</h2>
      </div>
    </div>

    <!-- ── Loading ───────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="flex justify-center py-20">
      <ProgressSpinner />
    </div>

    <!-- ── Tabs ──────────────────────────────────────────────────────────────── -->
    <TabView v-else @tab-change="onTabChange">

      <!-- ══════════ MANTENIMIENTO ══════════ -->
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-1.5 px-1">
            <i class="pi pi-wrench text-xs" />
            <span>Mantenimiento</span>
          </div>
        </template>
        <div class="space-y-5 pt-3">

          <!-- Info card -->
          <template v-if="contratos.mantenimiento">
            <div class="rounded-xl border bg-white p-5" style="border-color:#f59e0b40">
              <!-- Header -->
              <div class="flex items-start justify-between mb-4 gap-3">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#fef3c7">
                    <i class="pi pi-wrench text-sm" style="color:#f59e0b" />
                  </div>
                  <div>
                    <p class="text-xs text-gray-400 leading-none mb-0.5">Contrato de Mantenimiento O&amp;M</p>
                    <span class="text-sm font-semibold" style="color:#2C2039">{{ proyectoNombre }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <Tag :value="CONTRATO_LABELS[contratos.mantenimiento.estado]"
                       :severity="CONTRATO_SEVERITY[contratos.mantenimiento.estado]" class="text-xs" />
                  <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                    @click="openMantenimientoDialog('editar')" />
                  <Button icon="pi pi-file-excel" label="Cargar desde Excel" size="small" severity="secondary" outlined
                    @click="triggerExcelInput" />
                  <input ref="excelInputRef" type="file" accept=".xlsx,.xls" class="hidden"
                    @change="cargarDesdeExcel" />
                </div>
              </div>
              <!-- Mini-cards grid -->
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <!-- Contratante -->
                <div class="rounded-lg p-3.5" style="background:#fffbeb;border:1px solid #fde68a">
                  <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#92400e">
                    <i class="pi pi-user text-xs" style="color:#f59e0b" />Contratante
                  </p>
                  <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                    {{ contratos.mantenimiento.contratante_nombre || '—' }}
                  </p>
                </div>
                <!-- Prestador -->
                <div class="rounded-lg p-3.5" style="background:#fffbeb;border:1px solid #fde68a">
                  <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#92400e">
                    <i class="pi pi-building text-xs" style="color:#f59e0b" />Prestador
                  </p>
                  <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                    {{ contratos.mantenimiento.prestador_nombre || '—' }}
                  </p>
                </div>
                <!-- Fecha inicio -->
                <div class="rounded-lg p-3.5" style="background:#fffbeb;border:1px solid #fde68a">
                  <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#92400e">
                    <i class="pi pi-calendar text-xs" style="color:#f59e0b" />Fecha de inicio O&amp;M
                  </p>
                  <p class="text-sm font-semibold" style="color:#1c1917">
                    {{ formatFecha(contratos.mantenimiento.fecha_inicio) || '—' }}
                  </p>
                </div>
                <!-- Valor anual -->
                <div class="rounded-lg p-3.5" style="background:#fffbeb;border:1px solid #fde68a">
                  <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#92400e">
                    <i class="pi pi-dollar text-xs" style="color:#f59e0b" />Valor O&amp;M Anual (BASE)
                  </p>
                  <p class="text-base font-bold" style="color:#d97706">
                    {{ formatCOP(getValorVigente(contratos.mantenimiento.indexacion_anual)?.valor ?? contratos.mantenimiento.tarifa_base) || '—' }}
                  </p>
                  <button type="button"
                    class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                    style="background:none;border:none;padding:0;cursor:pointer;color:#f59e0b"
                    @click="showIndexacion.anual = !showIndexacion.anual">
                    <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                      :style="showIndexacion.anual ? 'transform:rotate(180deg)' : ''" />
                    {{ showIndexacion.anual ? 'Ocultar' : 'Ver indexación' }}
                  </button>
                </div>
                <!-- Valor mensual -->
                <div class="rounded-lg p-3.5" style="background:#fffbeb;border:1px solid #fde68a">
                  <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#92400e">
                    <i class="pi pi-calculator text-xs" style="color:#f59e0b" />Valor mensual
                  </p>
                  <p class="text-base font-bold" style="color:#d97706">
                    {{ formatCOP(getValorVigente(contratos.mantenimiento.indexacion_mensual)?.valor ?? contratos.mantenimiento.tarifa_mensual ?? (contratos.mantenimiento.tarifa_base != null ? Math.round(contratos.mantenimiento.tarifa_base / 12) : null)) || '—' }}
                  </p>
                  <button type="button"
                    class="mt-2 flex items-center gap-1 text-xs font-medium hover:opacity-75 transition-opacity"
                    style="background:none;border:none;padding:0;cursor:pointer;color:#f59e0b"
                    @click="showIndexacion.mensual = !showIndexacion.mensual">
                    <i class="pi pi-chevron-down text-xs transition-transform duration-200"
                      :style="showIndexacion.mensual ? 'transform:rotate(180deg)' : ''" />
                    {{ showIndexacion.mensual ? 'Ocultar' : 'Ver indexación' }}
                  </button>
                </div>
                <!-- Enlace Drive -->
                <div class="rounded-lg p-3.5" style="background:#fffbeb;border:1px solid #fde68a">
                  <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#92400e">
                    <i class="pi pi-file-pdf text-xs" style="color:#f59e0b" />Contrato en Drive
                  </p>
                  <a v-if="contratos.mantenimiento.enlace_drive && contratos.mantenimiento.enlace_drive.startsWith('http')"
                     :href="contratos.mantenimiento.enlace_drive" target="_blank" rel="noopener"
                     class="text-sm font-semibold flex items-center gap-1.5 hover:underline" style="color:#f59e0b">
                    <i class="pi pi-external-link text-xs" />Ver contrato
                  </a>
                  <button v-else @click="openMantenimientoDialog('editar')"
                    class="text-sm font-medium flex items-center gap-1.5" style="color:#f59e0b">
                    <i class="pi pi-plus-circle text-xs" />Agregar enlace
                  </button>
                </div>
              </div>

              <!-- ── Paneles de indexación O&M ─────────────────────────────────── -->

              <!-- Panel ANUAL -->
              <div :style="{ overflow: 'hidden', transition: 'max-height 0.35s ease', maxHeight: showIndexacion.anual ? '800px' : '0px' }">
                <div class="pt-3">
                  <div class="rounded-xl border border-amber-200 overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-2.5 bg-amber-50">
                      <span class="text-xs font-semibold" style="color:#92400e">
                        <i class="pi pi-dollar text-xs mr-1.5" style="color:#f59e0b" />Indexación anual O&M
                      </span>
                      <span class="text-xs text-gray-400">Año vigente: {{ ANIO_ACTUAL }}</span>
                    </div>
                    <table class="w-full text-sm border-collapse">
                      <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                          <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">Año</th>
                          <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">IPC aplicado</th>
                          <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500">Valor anual</th>
                          <th class="px-4 py-2 text-center text-xs font-semibold text-gray-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!contratos.mantenimiento.indexacion_anual?.length">
                          <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">
                            Sin datos de indexación — carga un archivo JSON con el botón de abajo.
                          </td>
                        </tr>
                        <tr v-for="fila in (contratos.mantenimiento.indexacion_anual || [])" :key="fila.anio"
                          class="border-b border-gray-50 hover:bg-amber-50/20 transition-colors"
                          :class="fila.anio === ANIO_ACTUAL ? 'bg-amber-50/50' : ''">
                          <td class="px-4 py-2.5">
                            <div class="flex items-center gap-1.5">
                              <span class="font-mono font-semibold"
                                :style="fila.anio === ANIO_ACTUAL ? 'color:#d97706' : 'color:#2C2039'">
                                {{ fila.anio }}
                              </span>
                              <span v-if="fila.anio === ANIO_ACTUAL"
                                class="text-xs px-1.5 py-0.5 rounded font-bold leading-none"
                                style="background:#fef3c7;color:#d97706">actual</span>
                              <i v-if="fila.anio === ANIO_ACTUAL" class="pi pi-arrow-left text-xs" style="color:#d97706" />
                            </div>
                          </td>
                          <td class="px-4 py-2.5">
                            <span v-if="fila.ipc_aplicado == null" class="text-gray-400 text-xs">— (base)</span>
                            <span v-else class="font-mono tabular-nums" style="color:#374151">{{ fila.ipc_aplicado }}%</span>
                          </td>
                          <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
                            :style="fila.anio === ANIO_ACTUAL ? 'color:#d97706' : 'color:#2C2039'">
                            {{ formatCOP(fila.valor) }}
                          </td>
                          <td class="px-4 py-2.5 text-center">
                            <span v-if="fila.ipc_aplicado == null || fila.anio < ANIO_ACTUAL"
                              class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style="background:#dcfce7;color:#166534">
                              <i class="pi pi-check text-xs" />Pagado
                            </span>
                            <span v-else-if="fila.anio === ANIO_ACTUAL"
                              class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style="background:#fef3c7;color:#d97706">
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
                    <div class="flex items-center justify-end px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                      <button type="button"
                        class="flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors"
                        style="background:none;border:none;padding:0;cursor:pointer;color:#f59e0b"
                        @click="idxInputAnualRef?.click()">
                        <i class="pi pi-upload text-xs" />
                        Cargar indexación anual desde JSON
                      </button>
                      <input ref="idxInputAnualRef" type="file" accept=".json" class="hidden"
                        @change="e => importarIndexacion(e, 'anual')" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Panel MENSUAL -->
              <div :style="{ overflow: 'hidden', transition: 'max-height 0.35s ease', maxHeight: showIndexacion.mensual ? '800px' : '0px' }">
                <div class="pt-3">
                  <div class="rounded-xl border border-amber-200 overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-2.5 bg-amber-50">
                      <span class="text-xs font-semibold" style="color:#92400e">
                        <i class="pi pi-calculator text-xs mr-1.5" style="color:#f59e0b" />Indexación mensual O&M
                      </span>
                      <span class="text-xs text-gray-400">Año vigente: {{ ANIO_ACTUAL }}</span>
                    </div>
                    <table class="w-full text-sm border-collapse">
                      <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                          <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">Año</th>
                          <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">IPC aplicado</th>
                          <th class="px-4 py-2 text-right text-xs font-semibold text-gray-500">Valor mensual</th>
                          <th class="px-4 py-2 text-center text-xs font-semibold text-gray-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!contratos.mantenimiento.indexacion_mensual?.length">
                          <td colspan="4" class="px-4 py-6 text-center text-xs text-gray-400">
                            Sin datos de indexación — carga un archivo JSON con el botón de abajo.
                          </td>
                        </tr>
                        <tr v-for="fila in (contratos.mantenimiento.indexacion_mensual || [])" :key="fila.anio"
                          class="border-b border-gray-50 hover:bg-amber-50/20 transition-colors"
                          :class="fila.anio === ANIO_ACTUAL ? 'bg-amber-50/50' : ''">
                          <td class="px-4 py-2.5">
                            <div class="flex items-center gap-1.5">
                              <span class="font-mono font-semibold"
                                :style="fila.anio === ANIO_ACTUAL ? 'color:#d97706' : 'color:#2C2039'">
                                {{ fila.anio }}
                              </span>
                              <span v-if="fila.anio === ANIO_ACTUAL"
                                class="text-xs px-1.5 py-0.5 rounded font-bold leading-none"
                                style="background:#fef3c7;color:#d97706">actual</span>
                              <i v-if="fila.anio === ANIO_ACTUAL" class="pi pi-arrow-left text-xs" style="color:#d97706" />
                            </div>
                          </td>
                          <td class="px-4 py-2.5">
                            <span v-if="fila.ipc_aplicado == null" class="text-gray-400 text-xs">— (base)</span>
                            <span v-else class="font-mono tabular-nums" style="color:#374151">{{ fila.ipc_aplicado }}%</span>
                          </td>
                          <td class="px-4 py-2.5 text-right font-semibold tabular-nums"
                            :style="fila.anio === ANIO_ACTUAL ? 'color:#d97706' : 'color:#2C2039'">
                            {{ formatCOP(fila.valor) }}
                          </td>
                          <td class="px-4 py-2.5 text-center">
                            <span v-if="fila.ipc_aplicado == null || fila.anio < ANIO_ACTUAL"
                              class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style="background:#dcfce7;color:#166534">
                              <i class="pi pi-check text-xs" />Pagado
                            </span>
                            <span v-else-if="fila.anio === ANIO_ACTUAL"
                              class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style="background:#fef3c7;color:#d97706">
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
                    <div class="flex items-center justify-end px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                      <button type="button"
                        class="flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors"
                        style="background:none;border:none;padding:0;cursor:pointer;color:#f59e0b"
                        @click="idxInputMensualRef?.click()">
                        <i class="pi pi-upload text-xs" />
                        Cargar indexación mensual desde JSON
                      </button>
                      <input ref="idxInputMensualRef" type="file" accept=".json" class="hidden"
                        @change="e => importarIndexacion(e, 'mensual')" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </template>
          <template v-else>
            <div class="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-10 text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style="background:#fef3c7">
                <i class="pi pi-wrench text-xl" style="color:#f59e0b" />
              </div>
              <p class="text-sm font-medium text-gray-600 mb-1">Sin contrato de mantenimiento</p>
              <p class="text-xs text-gray-400 mb-4">Registra el contrato para iniciar el seguimiento de pagos</p>
              <Button label="Crear contrato" icon="pi pi-plus" size="small"
                style="background:#f59e0b;border-color:#f59e0b"
                @click="openMantenimientoDialog('crear')" />
            </div>
          </template>

          <!-- Payments section -->
          <PagosTabla
            tipo="mantenimiento"
            color="#f59e0b"
            :contrato-id="contratos.mantenimiento?.id ?? null"
            :pagos="pagos.mantenimiento"
            :loading-pagos="loadingPagos.mantenimiento"
            :filtros="filtros.mantenimiento"
            @open-pago="openNuevoPago('mantenimiento')"
            @eliminar="(id) => eliminarPago('mantenimiento', id)"
          />

          <!-- Facturas -->
          <FacturasCobradas
            :datos="facturasCobradas"
            :proyecto-nombre="proyectoNombre"
          />
          <FacturasEmitidas
            :datos="facturasEmitidas"
            :proyecto-nombre="proyectoNombre"
          />

        </div>
      </TabPanel>

      <!-- ══════════ ARRIENDOS ══════════ -->
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-1.5 px-1">
            <i class="pi pi-home text-xs" />
            <span>Arriendos</span>
          </div>
        </template>
        <div class="space-y-5 pt-3">

          <template v-if="contratos.arriendo">
            <div class="rounded-xl border bg-white p-5" style="border-color:#8b5cf640">
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:#f5f3ff">
                    <i class="pi pi-home text-sm" style="color:#8b5cf6" />
                  </div>
                  <span class="text-sm font-semibold" style="color:#2C2039">Contrato de Arriendo</span>
                  <Tag :value="CONTRATO_LABELS[contratos.arriendo.estado]"
                       :severity="CONTRATO_SEVERITY[contratos.arriendo.estado]" class="text-xs" />
                </div>
                <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                  @click="openEditContrato('arriendo')" />
                <Button icon="pi pi-plus" label="Nuevo contrato" size="small" outlined
                  style="border-color:#8b5cf6;color:#8b5cf6"
                  @click="openWizard('arriendo')" />
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                <InfoIcon icon="pi pi-user" color="#8b5cf6" label="Contratante"
                  :value="contratos.arriendo.contratante_nombre" />
                <InfoIcon icon="pi pi-briefcase" color="#8b5cf6" label="Prestador"
                  :value="contratos.arriendo.prestador_nombre" />
                <InfoIcon icon="pi pi-calendar-plus" color="#8b5cf6" label="Fecha firma contrato"
                  :value="formatFecha(contratos.arriendo.fecha_firma_contrato)" />
                <InfoIcon icon="pi pi-dollar" color="#8b5cf6" label="Valor anual (BASE)"
                  :value="formatCOP(contratos.arriendo.tarifa_base)" />
                <InfoIcon icon="pi pi-calculator" color="#8b5cf6" label="Valor arriendo mensual"
                  :value="formatCOP(contratos.arriendo.tarifa_base != null ? contratos.arriendo.tarifa_base / 12 : null)" />
                <InfoLink color="#8b5cf6" label="Enlace del contrato en Drive"
                  :href="contratos.arriendo.enlace_drive" />
              </div>
            </div>
          </template>
          <template v-else>
            <!-- Datos estáticos desde JSON si existen -->
            <template v-if="buscarArriendoEstatico(proyectoNombre)">
              <div class="rounded-xl border bg-white p-5" style="border-color:#8b5cf640">
                <div class="flex items-start justify-between mb-4 gap-3">
                  <div class="flex items-center gap-2.5 flex-wrap">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#f5f3ff">
                      <i class="pi pi-home text-sm" style="color:#8b5cf6" />
                    </div>
                    <div>
                      <p class="text-xs text-gray-400 leading-none mb-0.5">Contrato de Arriendo</p>
                      <span class="text-sm font-semibold" style="color:#2C2039">{{ proyectoNombre }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <Tag value="Vigente" severity="success" class="text-xs" />
                    <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                      @click="openEditContrato('arriendo')" />
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div class="rounded-lg p-3.5" style="background:#f5f3ff;border:1px solid #ddd6fe">
                    <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#5b21b6">
                      <i class="pi pi-user text-xs" style="color:#8b5cf6" />Contratante
                    </p>
                    <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                      {{ buscarArriendoEstatico(proyectoNombre).contratante }}
                    </p>
                  </div>
                  <div class="rounded-lg p-3.5" style="background:#f5f3ff;border:1px solid #ddd6fe">
                    <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#5b21b6">
                      <i class="pi pi-building text-xs" style="color:#8b5cf6" />Prestador
                    </p>
                    <p class="text-sm font-semibold leading-snug" style="color:#1c1917">
                      {{ buscarArriendoEstatico(proyectoNombre).prestador }}
                    </p>
                  </div>
                  <div class="rounded-lg p-3.5" style="background:#f5f3ff;border:1px solid #ddd6fe">
                    <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#5b21b6">
                      <i class="pi pi-calendar text-xs" style="color:#8b5cf6" />Fecha firma contrato
                    </p>
                    <p class="text-sm font-semibold" style="color:#1c1917">
                      {{ buscarArriendoEstatico(proyectoNombre).fecha_firma }}
                    </p>
                  </div>
                  <div class="rounded-lg p-3.5" style="background:#f5f3ff;border:1px solid #ddd6fe">
                    <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#5b21b6">
                      <i class="pi pi-dollar text-xs" style="color:#8b5cf6" />Valor anual (BASE)
                    </p>
                    <p class="text-base font-bold" style="color:#7c3aed">
                      {{ formatCOP(buscarArriendoEstatico(proyectoNombre).valor_anual) }}
                    </p>
                  </div>
                  <div class="rounded-lg p-3.5" style="background:#f5f3ff;border:1px solid #ddd6fe">
                    <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#5b21b6">
                      <i class="pi pi-calculator text-xs" style="color:#8b5cf6" />Valor arriendo mensual
                    </p>
                    <p class="text-base font-bold" style="color:#7c3aed">
                      {{ formatCOP(buscarArriendoEstatico(proyectoNombre).valor_mensual) }}
                    </p>
                  </div>
                  <div class="rounded-lg p-3.5" style="background:#f5f3ff;border:1px solid #ddd6fe">
                    <p class="text-xs mb-1.5 flex items-center gap-1.5" style="color:#5b21b6">
                      <i class="pi pi-file-pdf text-xs" style="color:#8b5cf6" />Contrato en Drive
                    </p>
                    <a v-if="buscarArriendoEstatico(proyectoNombre).enlace"
                       :href="buscarArriendoEstatico(proyectoNombre).enlace"
                       target="_blank" rel="noopener"
                       class="text-sm font-semibold flex items-center gap-1.5 hover:underline" style="color:#8b5cf6">
                      <i class="pi pi-external-link text-xs" />Ver contrato
                    </a>
                    <span v-else class="text-sm text-gray-400">Sin enlace</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Sin datos en JSON ni en BD -->
            <template v-else>
              <div class="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center">
                <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style="background:#f5f3ff">
                  <i class="pi pi-home text-xl" style="color:#8b5cf6" />
                </div>
                <p class="text-sm font-medium text-gray-600 mb-1">Sin contrato de arriendo registrado</p>
                <p class="text-xs text-gray-400 mb-4">No se encontró contrato de arriendo para este proyecto</p>
                <Button label="Crear contrato" icon="pi pi-plus" size="small"
                  style="background:#8b5cf6;border-color:#8b5cf6"
                  @click="openWizard('arriendo')" />
              </div>
            </template>
          </template>

          <PagosTabla
            tipo="arriendo"
            color="#8b5cf6"
            :contrato-id="contratos.arriendo?.id ?? null"
            :pagos="pagos.arriendo"
            :loading-pagos="loadingPagos.arriendo"
            :filtros="filtros.arriendo"
            @open-pago="openNuevoPago('arriendo')"
            @eliminar="(id) => eliminarPago('arriendo', id)"
          />
        </div>
      </TabPanel>

      <!-- ══════════ INTERNET ══════════ -->
      <TabPanel>
        <template #header>
          <div class="flex items-center gap-1.5 px-1">
            <i class="pi pi-wifi text-xs" />
            <span>Internet</span>
          </div>
        </template>
        <div class="space-y-5 pt-3">

          <template v-if="contratos.internet">
            <div class="rounded-xl border bg-white p-5" style="border-color:#06b6d440">
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:#ecfeff">
                    <i class="pi pi-wifi text-sm" style="color:#06b6d4" />
                  </div>
                  <span class="text-sm font-semibold" style="color:#2C2039">Servicio de Internet</span>
                  <Tag :value="CONTRATO_LABELS[contratos.internet.estado]"
                       :severity="CONTRATO_SEVERITY[contratos.internet.estado]" class="text-xs" />
                </div>
                <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                  @click="openEditContrato('internet')" />
                <Button icon="pi pi-plus" label="Nuevo servicio" size="small" outlined
                  style="border-color:#06b6d4;color:#06b6d4"
                  @click="openWizard('internet')" />
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
                <InfoIcon icon="pi pi-building" color="#06b6d4" label="Proveedor"
                  :value="contratos.internet.prestador_nombre" />
                <InfoIcon icon="pi pi-dollar" color="#06b6d4" label="Valor facturado"
                  :value="formatCOP(contratos.internet.tarifa_base)" />
                <InfoBadge color="#06b6d4" label="Estado del pago"
                  :estado="contratos.internet.estado_pago" />
                <InfoLink color="#06b6d4" label="Factura / Contrato en Drive"
                  :href="contratos.internet.enlace_drive" />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/40 p-10 text-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style="background:#ecfeff">
                <i class="pi pi-wifi text-xl" style="color:#06b6d4" />
              </div>
              <p class="text-sm font-medium text-gray-600 mb-1">Sin servicio de internet registrado</p>
              <p class="text-xs text-gray-400 mb-4">Registra el proveedor para iniciar el seguimiento de pagos</p>
              <Button label="Registrar servicio" icon="pi pi-plus" size="small"
                style="background:#06b6d4;border-color:#06b6d4"
                @click="openWizard('internet')" />
            </div>
          </template>

          <PagosTabla
            tipo="internet"
            color="#06b6d4"
            :contrato-id="contratos.internet?.id ?? null"
            :pagos="pagos.internet"
            :loading-pagos="loadingPagos.internet"
            :filtros="filtros.internet"
            @open-pago="openNuevoPago('internet')"
            @eliminar="(id) => eliminarPago('internet', id)"
          />
        </div>
      </TabPanel>

    </TabView>

    <!-- ── Dialog Mantenimiento (crear / editar) ─────────────────────────────── -->
    <Dialog v-model:visible="dialogMant.visible" modal :style="{ width: '520px' }"
      :breakpoints="{ '560px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-wrench text-sm" style="color:#f59e0b" />
          <span class="font-semibold text-sm" style="color:#2C2039">
            {{ dialogMant.modo === 'crear' ? 'Crear contrato de mantenimiento' : 'Editar contrato de mantenimiento' }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <!-- Contratante / Prestador -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Contratante <span class="text-red-400">*</span></label>
            <InputText v-model="dialogMant.form.contratante_nombre" class="w-full" placeholder="Nombre o razón social" />
            <p v-if="dialogMant.errores.contratante_nombre" class="text-xs text-red-400">{{ dialogMant.errores.contratante_nombre }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Prestador <span class="text-red-400">*</span></label>
            <InputText v-model="dialogMant.form.prestador_nombre" class="w-full" placeholder="Nombre o razón social" />
            <p v-if="dialogMant.errores.prestador_nombre" class="text-xs text-red-400">{{ dialogMant.errores.prestador_nombre }}</p>
          </div>
        </div>
        <!-- Fecha / Estado -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha de inicio O&amp;M <span class="text-red-400">*</span></label>
            <DatePicker v-model="dialogMant.form.fecha_inicio" dateFormat="yy-mm-dd"
              class="w-full" showClear placeholder="aaaa-mm-dd" />
            <p v-if="dialogMant.errores.fecha_inicio" class="text-xs text-red-400">{{ dialogMant.errores.fecha_inicio }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Estado <span class="text-red-400">*</span></label>
            <Select v-model="dialogMant.form.estado" :options="ESTADOS_MANT"
              optionLabel="label" optionValue="value" class="w-full" />
            <p v-if="dialogMant.errores.estado" class="text-xs text-red-400">{{ dialogMant.errores.estado }}</p>
          </div>
        </div>
        <!-- Valor anual / Valor mensual -->
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Valor O&amp;M Anual (BASE) <span class="text-red-400">*</span></label>
            <InputNumber v-model="dialogMant.form.tarifa_base"
              mode="currency" currency="COP" locale="es-CO" :maxFractionDigits="0"
              class="w-full" placeholder="$ 0"
              @update:modelValue="v => { if (v != null) dialogMant.form.tarifa_mensual = Math.round(v / 12) }" />
            <p v-if="dialogMant.errores.tarifa_base" class="text-xs text-red-400">{{ dialogMant.errores.tarifa_base }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Valor mensual <span class="text-red-400">*</span></label>
            <InputNumber v-model="dialogMant.form.tarifa_mensual"
              mode="currency" currency="COP" locale="es-CO" :maxFractionDigits="0"
              class="w-full" placeholder="$ 0" />
            <p class="text-xs text-gray-400">Sugerido: Valor Anual ÷ 12</p>
          </div>
        </div>
        <!-- Enlace Drive -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Enlace del contrato en Drive</label>
          <InputText v-model="dialogMant.form.enlace_drive" class="w-full"
            placeholder="https://drive.google.com/…" />
          <p v-if="dialogMant.errores.enlace_drive" class="text-xs text-red-400">{{ dialogMant.errores.enlace_drive }}</p>
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogMant.visible = false" />
        <Button :label="dialogMant.modo === 'crear' ? 'Crear contrato' : 'Guardar cambios'"
          icon="pi pi-check" :loading="guardandoMant"
          style="background:#f59e0b;border-color:#f59e0b"
          @click="saveMantenimiento" />
      </template>
    </Dialog>

    <!-- ── Wizard nuevo contrato ──────────────────────────────────────────────── -->
    <ContratoServicioWizard
      v-if="wizardVisible"
      :visible="wizardVisible"
      :tipo="wizardTipo"
      :proyecto-id-default="Number(route.params.id)"
      @cerrar="wizardVisible = false"
      @creado="onContratoCreado"
    />

    <!-- ── Dialog editar contrato ───────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogEdit.visible" modal :style="{ width: '480px' }"
      :breakpoints="{ '520px': '95vw' }">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-pencil text-sm" :style="`color:${DIALOG_EDIT_COLOR[dialogEdit.tipo]}`" />
          <span class="font-semibold text-sm" style="color:#2C2039">
            Editar — {{ DIALOG_EDIT_LABEL[dialogEdit.tipo] }}
          </span>
        </div>
      </template>
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div v-if="dialogEdit.tipo === 'mantenimiento'" class="col-span-2 md:col-span-1 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha de inicio O&amp;M</label>
            <DatePicker v-model="dialogEdit.form.fecha_inicio"
              dateFormat="yy-mm-dd" class="w-full" showClear placeholder="aaaa-mm-dd" />
          </div>
          <div v-else-if="dialogEdit.tipo === 'arriendo'" class="col-span-2 md:col-span-1 flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Fecha firma contrato</label>
            <DatePicker v-model="dialogEdit.form.fecha_firma_contrato"
              dateFormat="yy-mm-dd" class="w-full" showClear placeholder="aaaa-mm-dd" />
          </div>
          <div class="flex flex-col gap-1" :class="dialogEdit.tipo === 'internet' ? 'col-span-2 md:col-span-1' : ''">
            <label class="text-xs font-medium text-gray-600">
              {{ dialogEdit.tipo === 'mantenimiento' ? 'Valor O&M Anual BASE (COP)' : dialogEdit.tipo === 'arriendo' ? 'Valor anual BASE (COP)' : 'Valor facturado (COP)' }}
            </label>
            <InputNumber v-model="dialogEdit.form.tarifa_base"
              mode="currency" currency="COP" locale="es-CO" :maxFractionDigits="0"
              class="w-full" placeholder="$ 0" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Estado del pago</label>
          <Select v-model="dialogEdit.form.estado_pago" :options="ESTADO_PAGO_OPCIONES"
            optionLabel="label" optionValue="value" placeholder="Sin definir" showClear class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Enlace en Drive</label>
          <InputText v-model="dialogEdit.form.enlace_drive"
            placeholder="https://drive.google.com/…" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogEdit.visible = false" />
        <Button label="Guardar cambios" icon="pi pi-check" :loading="guardandoContrato"
          @click="saveContrato"
          :style="`background:${DIALOG_EDIT_COLOR[dialogEdit.tipo]};border-color:${DIALOG_EDIT_COLOR[dialogEdit.tipo]}`" />
      </template>
    </Dialog>

    <!-- ── Dialog nuevo pago ─────────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogPago.visible" modal header="Registrar pago" :style="{ width: '420px' }"
      :breakpoints="{ '500px': '95vw' }">
      <div class="space-y-4 pt-1">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Mes</label>
            <Select v-model="dialogPago.form.mes" :options="MESES_OPCIONES"
              optionLabel="label" optionValue="value" placeholder="Mes" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-600">Año</label>
            <InputNumber v-model="dialogPago.form.año" :useGrouping="false"
              :min="2020" :max="2099" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Valor pagado (COP)</label>
          <InputNumber v-model="dialogPago.form.valor_pagado" mode="currency" currency="COP"
            locale="es-CO" :maxFractionDigits="0" class="w-full" placeholder="$ 0" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Estado</label>
          <Select v-model="dialogPago.form.estado" :options="ESTADO_PAGO_OPCIONES"
            optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">Enlace de factura (Drive)</label>
          <InputText v-model="dialogPago.form.enlace_factura" placeholder="https://drive.google.com/…" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="dialogPago.visible = false" />
        <Button label="Registrar" icon="pi pi-check" :loading="guardandoPago" @click="guardarPago" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import ContratoServicioWizard from '@/views/Contratos/ContratoServicioWizard.vue'
import ARRIENDOS_ESTATICOS from '@/assets/arriendos_data.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// ── Arriendo estático (fallback desde JSON) ───────────────────────────────────
function buscarArriendoEstatico(nombre) {
  if (!nombre) return null
  const nombreLower = nombre.trim().toLowerCase()
  // 1. Coincidencia exacta
  const exacto = ARRIENDOS_ESTATICOS.find(r => r.proyecto.toLowerCase() === nombreLower)
  if (exacto) return exacto
  // 2. Por palabras clave (mismo patrón que FacturasMantenimiento)
  const STOP = new Set(['mgs', 'de', 'la', 'el', 'los', 'las', 'del', 'solar', 'minigranja', 'y', 'con'])
  const keywords = nombreLower.split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
  if (!keywords.length) return null
  let mejor = null; let mejorScore = 0
  for (const r of ARRIENDOS_ESTATICOS) {
    const pLower = r.proyecto.toLowerCase()
    const score = keywords.filter(kw => pLower.includes(kw)).length
    if (score > mejorScore) { mejorScore = score; mejor = r }
  }
  return mejorScore > 0 ? mejor : null
}

// ── Constantes ────────────────────────────────────────────────────────────────
const MESES_NOMBRES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const MESES_OPCIONES = MESES_NOMBRES.slice(1).map((m, i) => ({ label: m, value: i + 1 }))

const ESTADO_PAGO_OPCIONES = [
  { label: 'Pendiente',  value: 'pendiente' },
  { label: 'Revisado',   value: 'revisado' },
  { label: 'Aprobado',   value: 'aprobado' },
]

const ESTADO_PAGO_LABELS    = { pendiente: 'Pendiente', revisado: 'Revisado', aprobado: 'Aprobado' }
const ESTADO_PAGO_SEVERITY  = { pendiente: 'danger', revisado: 'warn', aprobado: 'success' }

const CONTRATO_LABELS   = { vigente: 'Vigente', vencido: 'Vencido', terminado: 'Terminado', en_renovacion: 'En renovación', en_revision: 'En revisión' }
const CONTRATO_SEVERITY = { vigente: 'success', vencido: 'danger', terminado: 'secondary', en_renovacion: 'warn', en_revision: 'warn' }

const ESTADOS_MANT = [
  { label: 'Vigente',     value: 'vigente' },
  { label: 'Vencido',     value: 'vencido' },
  { label: 'En revisión', value: 'en_revision' },
]

const TABS_TIPOS = ['mantenimiento', 'arriendo', 'internet']

const DIALOG_EDIT_COLOR = { mantenimiento: '#f59e0b', arriendo: '#8b5cf6', internet: '#06b6d4' }
const DIALOG_EDIT_LABEL = { mantenimiento: 'Mantenimiento', arriendo: 'Arriendo', internet: 'Internet' }

// ── Estado reactivo ───────────────────────────────────────────────────────────
const loading          = ref(true)
const proyectoNombre   = ref('')
const guardandoPago    = ref(false)
const guardandoContrato = ref(false)
const guardandoMant      = ref(false)
const excelInputRef      = ref(null)
const idxInputAnualRef   = ref(null)
const idxInputMensualRef = ref(null)
const ANIO_ACTUAL        = new Date().getFullYear()
const showIndexacion     = reactive({ anual: false, mensual: false })
const facturasCobradas   = ref([])
const facturasEmitidas   = ref([])

const dialogMant = reactive({
  visible: false,
  modo: 'crear',
  form: {
    contratante_nombre: '',
    prestador_nombre: '',
    fecha_inicio: null,
    tarifa_base: null,
    tarifa_mensual: null,
    enlace_drive: '',
    estado: 'vigente',
  },
  errores: {},
})

const contratos = reactive({ mantenimiento: null, arriendo: null, internet: null })
const pagos     = reactive({ mantenimiento: [],   arriendo: [],   internet: [] })
const loadingPagos = reactive({ mantenimiento: false, arriendo: false, internet: false })

const filtros = reactive({
  mantenimiento: { año: null, mes: null },
  arriendo:      { año: null, mes: null },
  internet:      { año: null, mes: null },
})

const wizardVisible = ref(false)
const wizardTipo    = ref('mantenimiento')

const dialogEdit = reactive({
  visible: false,
  tipo: 'mantenimiento',
  form: { tarifa_base: null, fecha_firma_contrato: null, fecha_inicio: null, enlace_drive: '', estado_pago: null },
})

const dialogPago = reactive({
  visible: false,
  tipo: 'mantenimiento',
  form: { mes: null, año: new Date().getFullYear(), valor_pagado: null, estado: 'pendiente', enlace_factura: '' },
})

// ── Carga inicial ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const proyId = route.params.id
  try {
    const [proyRes, mantRes, arrRes, netRes] = await Promise.allSettled([
      api.get(`/proyectos/${proyId}`),
      api.get('/contratos-servicio', { params: { tipo: 'mantenimiento', proyecto_id: proyId } }),
      api.get('/contratos-servicio', { params: { tipo: 'arriendo',      proyecto_id: proyId } }),
      api.get('/contratos-servicio', { params: { tipo: 'internet',      proyecto_id: proyId } }),
    ])

    if (proyRes.status === 'fulfilled') proyectoNombre.value = proyRes.value.data.nombre_comercial

    contratos.mantenimiento = mantRes.status === 'fulfilled' && mantRes.value.data.length ? mantRes.value.data[0] : null
    contratos.arriendo      = arrRes.status  === 'fulfilled' && arrRes.value.data.length  ? arrRes.value.data[0]  : null
    contratos.internet      = netRes.status  === 'fulfilled' && netRes.value.data.length  ? netRes.value.data[0]  : null

    await loadPagos('mantenimiento')
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al cargar', detail: e.message, life: 4000 })
  } finally {
    loading.value = false
  }
})

// ── Pagos ─────────────────────────────────────────────────────────────────────
async function loadPagos(tipo) {
  if (!contratos[tipo]) { pagos[tipo] = []; return }
  loadingPagos[tipo] = true
  try {
    const { data } = await api.get(`/contratos-servicio/${contratos[tipo].id}/pagos`)
    pagos[tipo] = data
  } catch {
    pagos[tipo] = []
  } finally {
    loadingPagos[tipo] = false
  }
}

function onTabChange(e) {
  const tipo = TABS_TIPOS[e.index]
  if (tipo) loadPagos(tipo)
}

function openNuevoPago(tipo) {
  dialogPago.tipo = tipo
  dialogPago.form = { mes: null, año: new Date().getFullYear(), valor_pagado: null, estado: 'pendiente', enlace_factura: '' }
  dialogPago.visible = true
}

async function guardarPago() {
  const tipo = dialogPago.tipo
  if (!contratos[tipo]) return
  if (!dialogPago.form.mes || !dialogPago.form.año) {
    toast.add({ severity: 'warn', summary: 'Completa mes y año', life: 2500 })
    return
  }
  guardandoPago.value = true
  try {
    await api.post(`/contratos-servicio/${contratos[tipo].id}/pagos`, {
      mes:          dialogPago.form.mes,
      año:          dialogPago.form.año,
      valor_pagado: dialogPago.form.valor_pagado,
      estado:       dialogPago.form.estado,
      enlace_factura: dialogPago.form.enlace_factura || null,
    })
    await loadPagos(tipo)
    dialogPago.visible = false
    toast.add({ severity: 'success', summary: 'Pago registrado', life: 2500 })
  } catch (e) {
    const msg = e.response?.data?.detail
    const isDup = typeof msg === 'string' && msg.includes('uq_pago_servicio')
    toast.add({
      severity: 'error',
      summary: isDup ? 'Ya existe un pago para ese período' : 'Error al registrar',
      detail: isDup ? undefined : String(msg ?? ''),
      life: 4000,
    })
  } finally {
    guardandoPago.value = false
  }
}

async function eliminarPago(tipo, pagoId) {
  if (!contratos[tipo]) return
  if (!confirm('¿Eliminar este pago?')) return
  try {
    await api.delete(`/contratos-servicio/${contratos[tipo].id}/pagos/${pagoId}`)
    pagos[tipo] = pagos[tipo].filter(p => p.id !== pagoId)
    toast.add({ severity: 'success', summary: 'Pago eliminado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ── Edición de contrato ───────────────────────────────────────────────────────
function openEditContrato(tipo) {
  const c = contratos[tipo]
  if (!c) return
  dialogEdit.tipo = tipo
  dialogEdit.form.tarifa_base = c.tarifa_base
  dialogEdit.form.fecha_firma_contrato = c.fecha_firma_contrato ? new Date(c.fecha_firma_contrato) : null
  dialogEdit.form.fecha_inicio = c.fecha_inicio ? new Date(c.fecha_inicio) : null
  dialogEdit.form.enlace_drive = c.enlace_drive || ''
  dialogEdit.form.estado_pago = c.estado_pago || null
  dialogEdit.visible = true
}

async function saveContrato() {
  const tipo = dialogEdit.tipo
  if (!contratos[tipo]) return
  guardandoContrato.value = true
  try {
    const toISO = d => d instanceof Date ? d.toISOString().slice(0, 10) : (d || null)
    const payload = {
      tarifa_base: dialogEdit.form.tarifa_base,
      enlace_drive: dialogEdit.form.enlace_drive?.trim() || null,
      estado_pago: dialogEdit.form.estado_pago || null,
    }
    if (tipo === 'mantenimiento') {
      payload.fecha_inicio = toISO(dialogEdit.form.fecha_inicio)
    } else {
      payload.fecha_firma_contrato = toISO(dialogEdit.form.fecha_firma_contrato)
    }
    const { data } = await api.patch(`/contratos-servicio/${contratos[tipo].id}`, payload)
    contratos[tipo] = { ...contratos[tipo], ...data }
    dialogEdit.visible = false
    toast.add({ severity: 'success', summary: 'Contrato actualizado', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al guardar', detail: e.response?.data?.detail, life: 3000 })
  } finally {
    guardandoContrato.value = false
  }
}

// ── Wizard ────────────────────────────────────────────────────────────────────
function openWizard(tipo) {
  wizardTipo.value = tipo
  wizardVisible.value = true
}

async function onContratoCreado() {
  const tipo = wizardTipo.value
  const proyId = route.params.id
  try {
    const { data } = await api.get('/contratos-servicio', { params: { tipo, proyecto_id: proyId } })
    contratos[tipo] = data.length ? data[0] : null
    await loadPagos(tipo)
  } catch { /* ignore */ }
}

// ── Mantenimiento modal (crear / editar) ──────────────────────────────────────
function openMantenimientoDialog(modo) {
  dialogMant.modo = modo
  dialogMant.errores = {}
  if (modo === 'editar' && contratos.mantenimiento) {
    const c = contratos.mantenimiento
    dialogMant.form.contratante_nombre = c.contratante_nombre || ''
    dialogMant.form.prestador_nombre   = c.prestador_nombre   || ''
    dialogMant.form.fecha_inicio       = c.fecha_inicio ? new Date(c.fecha_inicio) : null
    dialogMant.form.tarifa_base        = c.tarifa_base ?? null
    dialogMant.form.tarifa_mensual     = c.tarifa_mensual ?? (c.tarifa_base != null ? Math.round(c.tarifa_base / 12) : null)
    dialogMant.form.enlace_drive       = c.enlace_drive || ''
    dialogMant.form.estado             = c.estado || 'vigente'
  } else {
    dialogMant.form.contratante_nombre = ''
    dialogMant.form.prestador_nombre   = ''
    dialogMant.form.fecha_inicio       = null
    dialogMant.form.tarifa_base        = null
    dialogMant.form.tarifa_mensual     = null
    dialogMant.form.enlace_drive       = ''
    dialogMant.form.estado             = 'vigente'
  }
  dialogMant.visible = true
}

function validarFormMant() {
  const e = {}
  if (!dialogMant.form.contratante_nombre?.trim()) e.contratante_nombre = 'Campo requerido'
  if (!dialogMant.form.prestador_nombre?.trim())   e.prestador_nombre   = 'Campo requerido'
  if (!dialogMant.form.fecha_inicio)                e.fecha_inicio       = 'Campo requerido'
  if (dialogMant.form.tarifa_base == null)          e.tarifa_base        = 'Campo requerido'
  if (!dialogMant.form.estado)                      e.estado             = 'Campo requerido'
  const link = dialogMant.form.enlace_drive?.trim()
  if (link && !link.startsWith('http')) e.enlace_drive = 'Debe ser una URL válida (debe iniciar con http)'
  dialogMant.errores = e
  return Object.keys(e).length === 0
}

async function saveMantenimiento() {
  if (!validarFormMant()) return
  guardandoMant.value = true
  try {
    const toISO = d => d instanceof Date ? d.toISOString().slice(0, 10) : (d || null)
    const payload = {
      contratante_nombre: dialogMant.form.contratante_nombre.trim(),
      prestador_nombre:   dialogMant.form.prestador_nombre.trim(),
      fecha_inicio:       toISO(dialogMant.form.fecha_inicio),
      tarifa_base:        dialogMant.form.tarifa_base,
      tarifa_mensual:     dialogMant.form.tarifa_mensual ?? null,
      enlace_drive:       dialogMant.form.enlace_drive?.trim() || null,
      estado:             dialogMant.form.estado,
    }
    if (dialogMant.modo === 'crear') {
      const proyId = route.params.id
      payload.servicio_aplica = 'mantenimiento'
      payload.proyecto_id     = Number(proyId)
      await api.post('/contratos-servicio', payload)
      const { data } = await api.get('/contratos-servicio', { params: { tipo: 'mantenimiento', proyecto_id: proyId } })
      contratos.mantenimiento = data.length ? data[0] : null
      await loadPagos('mantenimiento')
    } else {
      const { data } = await api.patch(`/contratos-servicio/${contratos.mantenimiento.id}`, payload)
      contratos.mantenimiento = { ...contratos.mantenimiento, ...data }
    }
    dialogMant.visible = false
    toast.add({ severity: 'success', summary: dialogMant.modo === 'crear' ? 'Contrato creado' : 'Contrato actualizado', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail ?? e.message, life: 4000 })
  } finally {
    guardandoMant.value = false
  }
}

// ── Importación desde Excel ───────────────────────────────────────────────────
function triggerExcelInput() {
  excelInputRef.value?.click()
}

async function cargarDesdeExcel(event) {
  const file = event.target.files?.[0]
  if (!file) return
  event.target.value = ''
  try {
    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
    const ws     = wb.Sheets[wb.SheetNames[0]]
    const rows   = XLSX.utils.sheet_to_json(ws, { defval: '' })

    const proyNombre = proyectoNombre.value?.trim().toLowerCase()
    const fila = rows.find(r => {
      const val = r['Proyecto'] ?? r['proyecto'] ?? r['PROYECTO'] ?? ''
      return String(val).trim().toLowerCase() === proyNombre
    })

    if (!fila) {
      toast.add({
        severity: 'error',
        summary: 'Proyecto no encontrado en el Excel',
        detail: `No se encontró "${proyectoNombre.value}" en la columna "Proyecto". Verifica el archivo e intenta de nuevo.`,
        life: 6000,
      })
      return
    }

    const parseNum = v => {
      if (v == null || v === '') return null
      const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''))
      return isNaN(n) ? null : n
    }

    const parseFecha = v => {
      if (!v) return null
      if (v instanceof Date) return v
      const d = new Date(v)
      return isNaN(d.getTime()) ? null : d
    }

    dialogMant.form.contratante_nombre = String(fila['Contratante'] ?? '').trim()
    dialogMant.form.prestador_nombre   = String(fila['Prestador'] ?? '').trim()
    dialogMant.form.fecha_inicio       = parseFecha(fila['Fecha de inicio O&M'])
    dialogMant.form.tarifa_base        = parseNum(fila['Valor O&M Anual (BASE)'])
    const mensualExcel                 = parseNum(fila['Valor mensual'])
    dialogMant.form.tarifa_mensual     = mensualExcel ?? (dialogMant.form.tarifa_base != null ? Math.round(dialogMant.form.tarifa_base / 12) : null)
    dialogMant.form.enlace_drive       = String(fila['Enlace del contrato en Drive'] ?? '').trim()
    dialogMant.form.estado             = contratos.mantenimiento?.estado ?? 'vigente'
    dialogMant.errores                 = {}
    dialogMant.modo                    = contratos.mantenimiento ? 'editar' : 'crear'
    dialogMant.visible                 = true

    toast.add({ severity: 'info', summary: 'Datos cargados desde Excel', detail: 'Revisa los datos y confirma para guardar.', life: 4000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al leer el Excel', detail: e.message, life: 4000 })
  }
}

// ── Indexación O&M ────────────────────────────────────────────────────────────
function getValorVigente(filas) {
  if (!filas || !filas.length) return null
  return filas.find(f => f.anio === ANIO_ACTUAL) ?? filas[filas.length - 1]
}

async function importarIndexacion(event, tipo) {
  const file = event.target.files?.[0]
  if (!file) return
  event.target.value = ''
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const { data: result } = await api.post('/contratos-servicio/importar-indexacion', data, {
      params: { tipo },
    })
    // Recargar el contrato para reflejar los nuevos datos de indexación
    const { data: contratoData } = await api.get('/contratos-servicio', {
      params: { tipo: 'mantenimiento', proyecto_id: route.params.id },
    })
    contratos.mantenimiento = contratoData.length ? contratoData[0] : null
    const total       = result.actualizados?.length ?? 0
    const sinEncontrar = result.no_encontrados ?? []
    const detalle = sinEncontrar.length
      ? `${sinEncontrar.length} no encontrado${sinEncontrar.length > 1 ? 's' : ''}: ${sinEncontrar.slice(0, 4).join(', ')}${sinEncontrar.length > 4 ? '…' : ''}`
      : undefined
    toast.add({
      severity: 'success',
      summary: `✓ ${total} proyecto${total !== 1 ? 's' : ''} actualizado${total !== 1 ? 's' : ''}`,
      detail: detalle,
      life: 6000,
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error al importar indexación', detail: e.message, life: 4000 })
  }
}

// ── Helpers de formato ────────────────────────────────────────────────────────
function formatCOP(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

function formatFecha(f) {
  if (!f) return '—'
  return String(f).slice(0, 10)
}
</script>

<!-- ── Componentes inline ─────────────────────────────────────────────────────── -->
<script>
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'

const MESES_NOMBRES_STATIC = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const MESES_OPCIONES_STATIC = MESES_NOMBRES_STATIC.slice(1).map((m, i) => ({ label: m, value: i + 1 }))

const ESTADO_PAGO_LABELS_S   = { pendiente: 'Pendiente', revisado: 'Revisado', aprobado: 'Aprobado' }
const ESTADO_PAGO_SEVERITY_S = { pendiente: 'danger', revisado: 'warn', aprobado: 'success' }

const AÑOS_STATIC = (() => {
  const cur = new Date().getFullYear()
  return Array.from({ length: cur - 2020 + 2 }, (_, i) => 2020 + i)
})()

// Campo con ícono + etiqueta + valor
const InfoIcon = {
  props: {
    icon: String, color: String,
    label: String, value: [String, Number],
  },
  template: `
    <div class="flex items-start gap-2.5 min-w-0">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        :style="'background:' + color + '18'">
        <i :class="icon + ' text-xs'" :style="'color:' + color" />
      </div>
      <div class="min-w-0">
        <p class="text-xs font-medium leading-none mb-0.5" style="color:#9b89b5">{{ label }}</p>
        <p class="text-sm font-medium truncate" style="color:#2C2039">{{ value ?? '—' }}</p>
      </div>
    </div>
  `,
}

// Badge de estado de pago con etiqueta
const InfoBadge = {
  components: { Tag },
  props: { color: String, label: String, estado: String },
  data() {
    return { ESTADO_PAGO_LABELS_S, ESTADO_PAGO_SEVERITY_S }
  },
  template: `
    <div class="flex items-start gap-2.5">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        :style="'background:' + color + '18'">
        <i class="pi pi-credit-card text-xs" :style="'color:' + color" />
      </div>
      <div>
        <p class="text-xs font-medium leading-none mb-1" style="color:#9b89b5">{{ label }}</p>
        <Tag v-if="estado" :value="ESTADO_PAGO_LABELS_S[estado]" :severity="ESTADO_PAGO_SEVERITY_S[estado]" />
        <span v-else class="text-sm" style="color:#9ca3af">—</span>
      </div>
    </div>
  `,
}

// Enlace a Drive con ícono clicable (+ botón "Agregar enlace" si editable y vacío)
const InfoLink = {
  props: { color: String, label: String, href: String, editable: Boolean },
  emits: ['editar'],
  template: `
    <div class="flex items-start gap-2.5">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        :style="'background:' + color + '18'">
        <i class="pi pi-link text-xs" :style="'color:' + color" />
      </div>
      <div>
        <p class="text-xs font-medium leading-none mb-0.5" style="color:#9b89b5">{{ label }}</p>
        <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer"
          class="text-sm font-medium hover:underline inline-flex items-center gap-1"
          style="color:#915BD8">
          <i class="pi pi-external-link text-xs" />
          Ver en Drive
        </a>
        <template v-else>
          <button v-if="editable" type="button"
            class="text-xs font-medium inline-flex items-center gap-1 hover:underline transition-opacity"
            style="background:none;border:none;cursor:pointer;padding:0;color:#9b89b5"
            @click="$emit('editar')">
            <i class="pi pi-plus-circle text-xs" />
            Agregar enlace
          </button>
          <span v-else class="text-sm" style="color:#9ca3af">—</span>
        </template>
      </div>
    </div>
  `,
}

// Tabla de pagos mensuales reutilizable
const PagosTabla = {
  components: { Tag, Button, DataTable, Column, Select },
  emits: ['open-pago', 'eliminar'],
  props: {
    tipo: String,
    color: String,
    contratoId: { type: Number, default: null },
    pagos: { type: Array, default: () => [] },
    loadingPagos: Boolean,
    filtros: { type: Object, default: () => ({ año: null, mes: null }) },
  },
  data() {
    return {
      MESES_NOMBRES_STATIC,
      MESES_OPCIONES_STATIC,
      ESTADO_PAGO_LABELS_S,
      ESTADO_PAGO_SEVERITY_S,
      AÑOS_STATIC,
    }
  },
  computed: {
    pagosFiltrados() {
      let result = this.pagos || []
      if (this.filtros.año) result = result.filter(p => p.año === this.filtros.año)
      if (this.filtros.mes) result = result.filter(p => p.mes === this.filtros.mes)
      return result
    },
    hayFiltros() {
      return this.filtros.año || this.filtros.mes
    },
  },
  methods: {
    limpiar() {
      this.filtros.año = null
      this.filtros.mes = null
    },
    formatCOPLocal(val) {
      if (val == null) return '—'
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    },
  },
  template: `
    <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#e5e7eb">
      <!-- Header de la tabla -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <i class="pi pi-table text-sm" :style="'color:' + color" />
          <span class="text-sm font-semibold" style="color:#2C2039">Historial de pagos</span>
        </div>
        <Button v-if="contratoId" label="Registrar pago" icon="pi pi-plus" size="small"
          :style="'background:' + color + ';border-color:' + color"
          @click="$emit('open-pago')" />
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50/60">
        <div class="flex items-center gap-1.5">
          <i class="pi pi-filter text-xs text-gray-400" />
          <span class="text-xs text-gray-400 font-medium">Filtrar por:</span>
        </div>
        <Select v-model="filtros.año" :options="AÑOS_STATIC" placeholder="Año"
          showClear class="text-sm" style="height:32px;min-width:90px" />
        <Select v-model="filtros.mes" :options="MESES_OPCIONES_STATIC"
          optionLabel="label" optionValue="value" placeholder="Mes"
          showClear class="text-sm" style="height:32px;min-width:110px" />
        <Button v-if="hayFiltros" label="Limpiar" text severity="secondary" size="small"
          icon="pi pi-times" @click="limpiar" />
        <span v-if="hayFiltros" class="text-xs text-gray-400 ml-auto">
          {{ pagosFiltrados.length }} resultado{{ pagosFiltrados.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Tabla -->
      <DataTable :value="pagosFiltrados" :loading="loadingPagos" stripedRows
        class="text-sm" rowHover
        emptyMessage="Sin pagos registrados para este período.">
        <Column header="Mes" style="width:120px">
          <template #body="{ data }">
            <span class="font-medium" style="color:#2C2039">{{ MESES_NOMBRES_STATIC[data.mes] }}</span>
          </template>
        </Column>
        <Column field="año" header="Año" style="width:80px">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ data.año }}</span>
          </template>
        </Column>
        <Column header="Valor pagado" style="width:150px">
          <template #body="{ data }">
            <span class="font-semibold tabular-nums" style="color:#2C2039">
              {{ formatCOPLocal(data.valor_pagado) }}
            </span>
          </template>
        </Column>
        <Column header="Estado" style="width:130px">
          <template #body="{ data }">
            <Tag :value="ESTADO_PAGO_LABELS_S[data.estado]"
                 :severity="ESTADO_PAGO_SEVERITY_S[data.estado]" />
          </template>
        </Column>
        <Column header="Factura" style="width:90px" bodyClass="text-center">
          <template #body="{ data }">
            <a v-if="data.enlace_factura" :href="data.enlace_factura"
              target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style="color:#915BD8">
              <i class="pi pi-external-link" />
              Ver
            </a>
            <span v-else class="text-gray-300 text-sm">—</span>
          </template>
        </Column>
        <Column style="width:50px" bodyClass="text-right">
          <template #body="{ data }">
            <Button icon="pi pi-trash" text severity="danger" size="small"
              @click="$emit('eliminar', data.id)" v-tooltip.left="'Eliminar'" />
          </template>
        </Column>
      </DataTable>
    </div>
  `,
}

// Acordeón desplegable con animación suave
const Acordeon = {
  props: {
    titulo: String,
    icono: String,
    color: { type: String, default: '#f59e0b' },
    count: { type: Number, default: 0 },
  },
  data() {
    return { abierto: false }
  },
  template: `
    <div class="rounded-xl border bg-white overflow-hidden" style="border-color:#e5e7eb">
      <button type="button"
        class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
        @click="abierto = !abierto">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="'background:' + color + '18'">
            <i :class="icono + ' text-xs'" :style="'color:' + color" />
          </div>
          <span class="text-sm font-semibold" style="color:#2C2039">{{ titulo }}</span>
          <span class="inline-flex items-center justify-center rounded-full text-xs font-medium px-2 py-0.5 leading-none"
            :style="'background:' + color + '15; color:' + color">{{ count }}</span>
        </div>
        <i class="pi pi-chevron-down text-xs text-gray-400 transition-transform duration-200"
          :style="abierto ? 'transform:rotate(180deg)' : ''" />
      </button>
      <transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="abierto" class="border-t border-gray-100">
          <slot />
        </div>
      </transition>
    </div>
  `,
}

// Acordeón 1: Facturas cobradas
const FacturasCobradas = {
  components: { DataTable, Column, Select, Acordeon },
  props: {
    datos: { type: Array, default: () => [] },
    proyectoNombre: String,
  },
  data() {
    return {
      filtroAño: null,
      filtroMes: null,
      AÑOS_STATIC,
      MESES_OPCIONES_STATIC,
      MESES_NOMBRES_STATIC,
    }
  },
  computed: {
    datosFiltrados() {
      let r = this.datos
      if (this.filtroAño) r = r.filter(f => f.anio === this.filtroAño)
      if (this.filtroMes) r = r.filter(f => f.mes === this.filtroMes)
      return r
    },
    hayFiltros() { return this.filtroAño || this.filtroMes },
  },
  methods: {
    limpiarFiltros() { this.filtroAño = null; this.filtroMes = null },
    formatCOP(val) {
      if (val == null) return '—'
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    },
  },
  template: `
    <Acordeon titulo="Facturas cobradas" icono="pi pi-file-import" color="#f59e0b" :count="datos.length">
      <div class="flex flex-wrap items-center gap-3 px-5 py-3 bg-gray-50/60 border-b border-gray-100">
        <div class="flex items-center gap-1.5">
          <i class="pi pi-filter text-xs text-gray-400" />
          <span class="text-xs text-gray-400 font-medium">Filtrar por:</span>
        </div>
        <Select v-model="filtroAño" :options="AÑOS_STATIC" placeholder="Año"
          showClear class="text-sm" style="height:32px;min-width:90px" />
        <Select v-model="filtroMes" :options="MESES_OPCIONES_STATIC"
          optionLabel="label" optionValue="value" placeholder="Mes"
          showClear class="text-sm" style="height:32px;min-width:110px" />
        <button v-if="hayFiltros" type="button"
          class="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          @click="limpiarFiltros">
          <i class="pi pi-times text-xs" /> Limpiar
        </button>
        <span v-if="hayFiltros" class="text-xs text-gray-400 ml-auto">
          {{ datosFiltrados.length }} resultado{{ datosFiltrados.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <DataTable :value="datosFiltrados" stripedRows rowHover class="text-sm"
        emptyMessage="Sin facturas cobradas registradas.">
        <Column header="Mes" style="min-width:100px">
          <template #body="{ data }">
            <span class="font-medium" style="color:#2C2039">{{ MESES_NOMBRES_STATIC[data.mes] ?? data.mes }}</span>
          </template>
        </Column>
        <Column field="proyecto" header="Proyecto" style="min-width:130px" />
        <Column field="inversionista" header="Inversionista" style="min-width:130px" />
        <Column header="Monto" style="min-width:140px">
          <template #body="{ data }">
            <span class="font-semibold tabular-nums" style="color:#2C2039">{{ formatCOP(data.monto) }}</span>
          </template>
        </Column>
        <Column field="nroFactura" header="N° Factura" style="min-width:110px" />
        <Column header="Soporte" style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <a v-if="data.soporteUrl" :href="data.soporteUrl" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-amber-50"
              style="color:#f59e0b" title="Ver soporte">
              <i class="pi pi-file text-sm" />
            </a>
            <span v-else class="text-gray-300 text-sm">—</span>
          </template>
        </Column>
      </DataTable>
    </Acordeon>
  `,
}

// Acordeón 2: Facturas emitidas
const FacturasEmitidas = {
  components: { DataTable, Column, Select, Acordeon },
  props: {
    datos: { type: Array, default: () => [] },
    proyectoNombre: String,
  },
  data() {
    return {
      filtroAño: null,
      filtroMes: null,
      AÑOS_STATIC,
      MESES_OPCIONES_STATIC,
    }
  },
  computed: {
    datosFiltrados() {
      let r = this.datos
      if (this.filtroAño) {
        r = r.filter(f => {
          const d = f.fecha ? new Date(f.fecha) : null
          return d && d.getFullYear() === this.filtroAño
        })
      }
      if (this.filtroMes) {
        r = r.filter(f => {
          const d = f.fecha ? new Date(f.fecha) : null
          return d && d.getMonth() + 1 === this.filtroMes
        })
      }
      return r
    },
    hayFiltros() { return this.filtroAño || this.filtroMes },
  },
  methods: {
    limpiarFiltros() { this.filtroAño = null; this.filtroMes = null },
    formatCOP(val) {
      if (val == null) return '—'
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
    },
  },
  template: `
    <Acordeon titulo="Facturas emitidas" icono="pi pi-file-export" color="#f59e0b" :count="datos.length">
      <div class="flex flex-wrap items-center gap-3 px-5 py-3 bg-gray-50/60 border-b border-gray-100">
        <div class="flex items-center gap-1.5">
          <i class="pi pi-filter text-xs text-gray-400" />
          <span class="text-xs text-gray-400 font-medium">Filtrar por:</span>
        </div>
        <Select v-model="filtroAño" :options="AÑOS_STATIC" placeholder="Año"
          showClear class="text-sm" style="height:32px;min-width:90px" />
        <Select v-model="filtroMes" :options="MESES_OPCIONES_STATIC"
          optionLabel="label" optionValue="value" placeholder="Mes"
          showClear class="text-sm" style="height:32px;min-width:110px" />
        <button v-if="hayFiltros" type="button"
          class="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          @click="limpiarFiltros">
          <i class="pi pi-times text-xs" /> Limpiar
        </button>
        <span v-if="hayFiltros" class="text-xs text-gray-400 ml-auto">
          {{ datosFiltrados.length }} resultado{{ datosFiltrados.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <DataTable :value="datosFiltrados" stripedRows rowHover class="text-sm"
        emptyMessage="Sin facturas emitidas registradas.">
        <Column field="fecha" header="Fecha" style="min-width:110px" />
        <Column field="proyecto" header="Proyecto" style="min-width:130px" />
        <Column field="nroFactura" header="N° Factura" style="min-width:110px" />
        <Column header="Monto" style="min-width:140px">
          <template #body="{ data }">
            <span class="font-semibold tabular-nums" style="color:#2C2039">{{ formatCOP(data.monto) }}</span>
          </template>
        </Column>
        <Column header="Soporte" style="width:80px" bodyClass="text-center">
          <template #body="{ data }">
            <a v-if="data.soporteUrl" :href="data.soporteUrl" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-amber-50"
              style="color:#f59e0b" title="Ver soporte">
              <i class="pi pi-file text-sm" />
            </a>
            <span v-else class="text-gray-300 text-sm">—</span>
          </template>
        </Column>
      </DataTable>
    </Acordeon>
  `,
}

export default {
  components: { InfoIcon, InfoBadge, InfoLink, PagosTabla, Acordeon, FacturasCobradas, FacturasEmitidas },
}
</script>
