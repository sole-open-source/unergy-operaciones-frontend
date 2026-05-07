<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold" style="color:#2C2039">Liquidaciones</h2>
      <Button label="Nueva liquidación" icon="pi pi-plus" size="small" @click="dialogNueva = true" />
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Desde</label>
        <DatePicker v-model="filtros.desde" view="month" dateFormat="mm/yy" showButtonBar placeholder="Mes inicio" class="w-36" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Hasta</label>
        <DatePicker v-model="filtros.hasta" view="month" dateFormat="mm/yy" showButtonBar placeholder="Mes fin" class="w-36" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">Estado</label>
        <Select v-model="filtros.estado" :options="estadosOpciones" showClear placeholder="Todos" class="w-44" />
      </div>
      <Button icon="pi pi-search" label="Buscar" size="small" @click="recargar" />
      <Button icon="pi pi-times" severity="secondary" text size="small" @click="limpiarFiltros" />
    </div>

    <!-- Tabs -->
    <TabView v-model:activeIndex="tabActivo">

      <!-- ══ Tab Panel General ══ -->
      <TabPanel header="Panel General">
        <ProgressSpinner v-if="loadingVista" class="block mx-auto my-8" />
        <div v-else class="rounded-xl shadow-sm overflow-hidden" style="background:#FDFAF7">
          <div v-if="!filasDetalle.length" class="text-center py-8 text-sm text-gray-400">
            No hay liquidaciones para los filtros seleccionados.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs border-collapse" style="min-width:1500px">
              <thead>
                <tr class="text-white text-[11px] uppercase tracking-wide" style="background:#2C2039">
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Proyecto</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Inversionista</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Doc. Contable</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Contacto 1</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Contacto 2</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Concepto</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap font-semibold">Total</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Ref. Factura / Soporte</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Consec. Ingresos</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Consec. Costos</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Comprobante Contable</th>
                  <th class="px-3 py-2.5 text-center whitespace-nowrap font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="fila in filasDetalle" :key="fila.key">

                  <!-- nivel proyecto -->
                  <tr v-if="fila.separador && fila.nivel === 'proyecto'"
                    style="background:#2C2039; cursor:pointer"
                    @click="toggleNivel(expandidosProyecto, fila.proyKey)">
                    <td colspan="12" class="px-4 py-2 font-bold text-[11px] tracking-widest text-white uppercase select-none">
                      <i :class="expandidosProyecto[fila.proyKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                    </td>
                  </tr>

                  <!-- nivel año -->
                  <tr v-else-if="fila.separador && fila.nivel === 'anio' && expandidosProyecto[fila.proyKey]"
                    style="background:#3d2d52; cursor:pointer"
                    @click="toggleNivel(expandidosAnio, fila.anioKey)">
                    <td colspan="12" class="px-4 py-1.5 font-semibold text-[11px] text-white select-none pl-8">
                      <i :class="expandidosAnio[fila.anioKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                    </td>
                  </tr>

                  <!-- nivel mes -->
                  <tr v-else-if="fila.separador && fila.nivel === 'mes' && expandidosProyecto[fila.proyKey] && expandidosAnio[fila.anioKey]"
                    style="background:#915BD8; cursor:pointer"
                    @click="toggleNivel(expandidosMes, fila.mesKey)">
                    <td colspan="12" class="px-4 py-1 font-bold text-[11px] tracking-widest text-white uppercase select-none pl-12">
                      <i :class="expandidosMes[fila.mesKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                      <span class="ml-4 font-normal text-purple-200 normal-case tracking-normal">
                        {{ fila.sublabel }}
                      </span>
                      <a v-if="fila.erUrl" :href="fila.erUrl" target="_blank" rel="noopener noreferrer"
                        class="ml-4 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold normal-case tracking-normal hover:opacity-80"
                        style="background:#F6FF72; color:#2C2039"
                        @click.stop>
                        <i class="pi pi-chart-line text-[9px]" />E.R.
                      </a>
                    </td>
                  </tr>

                  <!-- fila datos -->
                  <tr v-else-if="!fila.separador && expandidosProyecto[fila.proyKey] && expandidosAnio[fila.anioKey] && expandidosMes[fila.mesKey]"
                    :style="estiloFila(fila)"
                    class="border-b transition-colors duration-100"
                    style="border-color:rgba(44,32,57,0.07)">
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.65">{{ fila.proyecto }}</td>
                    <td class="px-3 py-1.5 font-medium text-[11px]"
                      :style="fila.inversionista === 'Total' ? 'color:#915BD8; font-weight:700' : 'color:#2C2039'">
                      {{ fila.inversionista }}
                      <span v-if="fila.inversionista === 'Total'"
                        class="ml-1 px-1 py-0.5 rounded text-[8px] font-semibold tracking-wide"
                        style="background:rgba(145,91,216,0.15); color:#915BD8">100%</span>
                    </td>
                    <td class="px-3 py-1.5">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :style="badgeDoc(fila.doc)">
                        {{ fila.doc }}
                      </span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px] text-gray-500">{{ fila.contacto1 }}</td>
                    <td class="px-3 py-1.5 text-[11px] text-gray-500">{{ fila.contacto2 }}</td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039">{{ fila.concepto }}</td>
                    <td class="px-3 py-1.5 text-right font-mono text-[11px]"
                      :style="fila.negativo ? 'color:#dc2626' : 'color:#2C2039'">
                      <span v-if="fila.isPercent" class="font-semibold" style="color:#915BD8">{{ fila.pctLabel }}</span>
                      <span v-else>{{ fila.total != null ? fmt(fila.total) : '—' }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px] whitespace-nowrap">
                      <a v-if="fila.soporteUrl" :href="fila.soporteUrl" target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                        <i class="pi pi-file-pdf text-red-500 text-xs" />{{ fila.refFactura || 'Ver' }}
                      </a>
                      <span v-else style="color:#2C2039; opacity:0.7">{{ fila.refFactura }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.6">{{ fila.conseIngresos }}</td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.6">{{ fila.conseCostos }}</td>
                    <td class="px-3 py-1.5 text-[11px] font-mono" style="color:#2C2039; opacity:0.7">{{ fila.comprobante }}</td>
                    <td class="px-3 py-1.5 text-center whitespace-nowrap" v-if="!fila.isPercent">
                      <button class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                        title="Ver detalle"
                        @click="verDetalle(fila)">
                        <i class="pi pi-eye text-gray-500 text-xs" />
                      </button>
                    </td>
                    <td class="px-3 py-1.5" v-else></td>
                  </tr>

                </template>
              </tbody>
            </table>
          </div>
        </div>
      </TabPanel>

      <!-- ══ Tab Ingresos ══ -->
      <TabPanel header="Ingresos">
        <ProgressSpinner v-if="loadingVista" class="block mx-auto my-8" />
        <div v-else class="rounded-xl shadow-sm overflow-hidden" style="background:#FDFAF7">
          <div v-if="!filasIngresos.length" class="text-center py-8 text-sm text-gray-400">
            No hay liquidaciones para los filtros seleccionados.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs border-collapse" style="min-width:1500px">
              <thead>
                <tr class="text-white text-[11px] uppercase tracking-wide" style="background:#2C2039">
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Proyecto</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Inversionista</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Doc. Contable</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Contacto 1</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Contacto 2</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Concepto</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap font-semibold">Total</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Ref. Factura / Soporte</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Consec. Ingresos</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Consec. Costos</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Comprobante Contable</th>
                  <th class="px-3 py-2.5 text-center whitespace-nowrap font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="fila in filasIngresos" :key="fila.key">

                  <!-- nivel proyecto -->
                  <tr v-if="fila.separador && fila.nivel === 'proyecto'"
                    style="background:#2C2039; cursor:pointer"
                    @click="toggleNivel(expandidosProyecto, fila.proyKey)">
                    <td colspan="12" class="px-4 py-2 font-bold text-[11px] tracking-widest text-white uppercase select-none">
                      <i :class="expandidosProyecto[fila.proyKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                    </td>
                  </tr>

                  <!-- nivel año -->
                  <tr v-else-if="fila.separador && fila.nivel === 'anio' && expandidosProyecto[fila.proyKey]"
                    style="background:#3d2d52; cursor:pointer"
                    @click="toggleNivel(expandidosAnio, fila.anioKey)">
                    <td colspan="12" class="px-4 py-1.5 font-semibold text-[11px] text-white select-none pl-8">
                      <i :class="expandidosAnio[fila.anioKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                    </td>
                  </tr>

                  <!-- nivel mes -->
                  <tr v-else-if="fila.separador && fila.nivel === 'mes' && expandidosProyecto[fila.proyKey] && expandidosAnio[fila.anioKey]"
                    style="background:#915BD8; cursor:pointer"
                    @click="toggleNivel(expandidosMes, fila.mesKey)">
                    <td colspan="12" class="px-4 py-1 font-bold text-[11px] tracking-widest text-white uppercase select-none pl-12">
                      <i :class="expandidosMes[fila.mesKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                      <span class="ml-4 font-normal text-purple-200 normal-case tracking-normal">
                        {{ fila.sublabel }}
                      </span>
                      <a v-if="fila.erUrl" :href="fila.erUrl" target="_blank" rel="noopener noreferrer"
                        class="ml-4 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold normal-case tracking-normal hover:opacity-80"
                        style="background:#F6FF72; color:#2C2039"
                        @click.stop>
                        <i class="pi pi-chart-line text-[9px]" />E.R.
                      </a>
                    </td>
                  </tr>

                  <!-- fila datos -->
                  <tr v-else-if="!fila.separador && expandidosProyecto[fila.proyKey] && expandidosAnio[fila.anioKey] && expandidosMes[fila.mesKey]"
                    :style="estiloFila(fila)"
                    class="border-b transition-colors duration-100"
                    style="border-color:rgba(44,32,57,0.07)">
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.65">{{ fila.proyecto }}</td>
                    <td class="px-3 py-1.5 font-medium text-[11px]"
                      :style="fila.inversionista === 'Total' ? 'color:#915BD8; font-weight:700' : 'color:#2C2039'">
                      {{ fila.inversionista }}
                      <span v-if="fila.inversionista === 'Total'"
                        class="ml-1 px-1 py-0.5 rounded text-[8px] font-semibold tracking-wide"
                        style="background:rgba(145,91,216,0.15); color:#915BD8">100%</span>
                    </td>
                    <td class="px-3 py-1.5">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :style="badgeDoc(fila.doc)">{{ fila.doc }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px] text-gray-500">{{ fila.contacto1 }}</td>
                    <td class="px-3 py-1.5 text-[11px] text-gray-500">{{ fila.contacto2 }}</td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039">{{ fila.concepto }}</td>
                    <td class="px-3 py-1.5 text-right font-mono text-[11px]"
                      :style="fila.negativo ? 'color:#dc2626' : 'color:#2C2039'">
                      <span v-if="fila.isPercent" class="font-semibold" style="color:#915BD8">{{ fila.pctLabel }}</span>
                      <span v-else>{{ fila.total != null ? fmt(fila.total) : '—' }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px] whitespace-nowrap">
                      <a v-if="fila.soporteUrl" :href="fila.soporteUrl" target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                        <i class="pi pi-file-pdf text-red-500 text-xs" />{{ fila.refFactura || 'Ver' }}
                      </a>
                      <span v-else style="color:#2C2039; opacity:0.7">{{ fila.refFactura }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.6">{{ fila.conseIngresos }}</td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.6">{{ fila.conseCostos }}</td>
                    <td class="px-3 py-1.5 text-[11px] font-mono" style="color:#2C2039; opacity:0.7">{{ fila.comprobante }}</td>
                    <td class="px-3 py-1.5 text-center whitespace-nowrap" v-if="!fila.isPercent">
                      <button class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                        title="Ver detalle"
                        @click="verDetalle(fila)">
                        <i class="pi pi-eye text-gray-500 text-xs" />
                      </button>
                      <button v-if="fila.doc === 'Mandato' && fila.mandatoId && fila.lineaId"
                        class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 transition-colors ml-1"
                        title="Eliminar línea"
                        @click="eliminarMandatoLinea(fila)">
                        <i class="pi pi-trash text-red-500 text-xs" />
                      </button>
                    </td>
                    <td class="px-3 py-1.5" v-else></td>
                  </tr>

                </template>
              </tbody>
            </table>
          </div>
          <div v-if="ingresoBrutoTotal > 0"
            class="px-4 py-3 border-t text-xs font-semibold" style="border-color:rgba(145,91,216,0.2); color:#2C2039">
            Ingreso Bruto Total del período:
            <span class="font-mono ml-1" style="color:#915BD8">{{ fmt(ingresoBrutoTotal) }}</span>
          </div>
        </div>
      </TabPanel>

      <!-- ══ Tab Costos ══ -->
      <TabPanel header="Costos">
        <ProgressSpinner v-if="loadingVista" class="block mx-auto my-8" />
        <div v-else class="rounded-xl shadow-sm overflow-hidden" style="background:#FDFAF7">
          <div v-if="!filasCostos.length" class="text-center py-8 text-sm text-gray-400">
            No hay liquidaciones para los filtros seleccionados.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs border-collapse" style="min-width:1500px">
              <thead>
                <tr class="text-white text-[11px] uppercase tracking-wide" style="background:#2C2039">
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Proyecto</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Inversionista</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Doc. Contable</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Contacto 1</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Contacto 2</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Concepto</th>
                  <th class="px-3 py-2.5 text-right whitespace-nowrap font-semibold">Total</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Ref. Factura / Soporte</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Consec. Ingresos</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Consec. Costos</th>
                  <th class="px-3 py-2.5 text-left whitespace-nowrap font-semibold">Comprobante Contable</th>
                  <th class="px-3 py-2.5 text-center whitespace-nowrap font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="fila in filasCostos" :key="fila.key">

                  <!-- nivel proyecto -->
                  <tr v-if="fila.separador && fila.nivel === 'proyecto'"
                    style="background:#2C2039; cursor:pointer"
                    @click="toggleNivel(expandidosProyecto, fila.proyKey)">
                    <td colspan="12" class="px-4 py-2 font-bold text-[11px] tracking-widest text-white uppercase select-none">
                      <i :class="expandidosProyecto[fila.proyKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                    </td>
                  </tr>

                  <!-- nivel año -->
                  <tr v-else-if="fila.separador && fila.nivel === 'anio' && expandidosProyecto[fila.proyKey]"
                    style="background:#3d2d52; cursor:pointer"
                    @click="toggleNivel(expandidosAnio, fila.anioKey)">
                    <td colspan="12" class="px-4 py-1.5 font-semibold text-[11px] text-white select-none pl-8">
                      <i :class="expandidosAnio[fila.anioKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                    </td>
                  </tr>

                  <!-- nivel mes -->
                  <tr v-else-if="fila.separador && fila.nivel === 'mes' && expandidosProyecto[fila.proyKey] && expandidosAnio[fila.anioKey]"
                    style="background:#915BD8; cursor:pointer"
                    @click="toggleNivel(expandidosMes, fila.mesKey)">
                    <td colspan="12" class="px-4 py-1 font-bold text-[11px] tracking-widest text-white uppercase select-none pl-12">
                      <i :class="expandidosMes[fila.mesKey] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                        class="mr-2 text-[10px]" />
                      {{ fila.label }}
                      <span class="ml-4 font-normal text-purple-200 normal-case tracking-normal">
                        {{ fila.sublabel }}
                      </span>
                      <a v-if="fila.erUrl" :href="fila.erUrl" target="_blank" rel="noopener noreferrer"
                        class="ml-4 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold normal-case tracking-normal hover:opacity-80"
                        style="background:#F6FF72; color:#2C2039"
                        @click.stop>
                        <i class="pi pi-chart-line text-[9px]" />E.R.
                      </a>
                    </td>
                  </tr>

                  <!-- fila datos -->
                  <tr v-else-if="!fila.separador && expandidosProyecto[fila.proyKey] && expandidosAnio[fila.anioKey] && expandidosMes[fila.mesKey]"
                    :style="estiloFila(fila)"
                    class="border-b transition-colors duration-100"
                    style="border-color:rgba(44,32,57,0.07)">
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.65">{{ fila.proyecto }}</td>
                    <td class="px-3 py-1.5 font-medium text-[11px]"
                      :style="fila.inversionista === 'Total' ? 'color:#915BD8; font-weight:700' : 'color:#2C2039'">
                      {{ fila.inversionista }}
                      <span v-if="fila.inversionista === 'Total'"
                        class="ml-1 px-1 py-0.5 rounded text-[8px] font-semibold tracking-wide"
                        style="background:rgba(145,91,216,0.15); color:#915BD8">100%</span>
                    </td>
                    <td class="px-3 py-1.5">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :style="badgeDoc(fila.doc)">{{ fila.doc }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px] text-gray-500">{{ fila.contacto1 }}</td>
                    <td class="px-3 py-1.5 text-[11px] text-gray-500">{{ fila.contacto2 }}</td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039">{{ fila.concepto }}</td>
                    <td class="px-3 py-1.5 text-right font-mono text-[11px]"
                      :style="fila.negativo ? 'color:#dc2626' : 'color:#2C2039'">
                      <span v-if="fila.isPercent" class="font-semibold" style="color:#915BD8">{{ fila.pctLabel }}</span>
                      <span v-else>{{ fila.total != null ? fmt(fila.total) : '—' }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px] whitespace-nowrap">
                      <a v-if="fila.soporteUrl" :href="fila.soporteUrl" target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                        <i class="pi pi-file-pdf text-red-500 text-xs" />{{ fila.refFactura || 'Ver' }}
                      </a>
                      <span v-else style="color:#2C2039; opacity:0.7">{{ fila.refFactura }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.6">{{ fila.conseIngresos }}</td>
                    <td class="px-3 py-1.5 text-[11px]" style="color:#2C2039; opacity:0.6">{{ fila.conseCostos }}</td>
                    <td class="px-3 py-1.5 text-[11px] font-mono" style="color:#2C2039; opacity:0.7">{{ fila.comprobante }}</td>
                    <td class="px-3 py-1.5 text-center whitespace-nowrap" v-if="!fila.isPercent">
                      <button class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                        title="Ver detalle"
                        @click="verDetalle(fila)">
                        <i class="pi pi-eye text-gray-500 text-xs" />
                      </button>
                      <button v-if="(fila.doc === 'Costos' && fila.mandatoId && fila.lineaId) || (fila.doc === 'Factura' && fila.facturaId)"
                        class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 transition-colors ml-1"
                        title="Eliminar"
                        @click="fila.doc === 'Factura' ? eliminarFactura(fila) : eliminarMandatoLinea(fila)">
                        <i class="pi pi-trash text-red-500 text-xs" />
                      </button>
                    </td>
                    <td class="px-3 py-1.5" v-else></td>
                  </tr>

                </template>
              </tbody>
            </table>
          </div>
          <div v-if="totalCostos !== 0 || totalFacturasServicio !== 0"
            class="px-4 py-3 border-t text-xs font-semibold flex gap-6" style="border-color:rgba(220,38,38,0.2); color:#2C2039">
            <span>
              Total Costos:
              <span class="font-mono ml-1" style="color:#dc2626">{{ fmt(totalCostos) }}</span>
            </span>
            <span>
              Total Facturas Servicio:
              <span class="font-mono ml-1" style="color:#2C2039">{{ fmt(totalFacturasServicio) }}</span>
            </span>
          </div>
        </div>
      </TabPanel>
    </TabView>

    <!-- Dialog nueva liquidación -->
    <Dialog v-model:visible="dialogNueva" header="Nueva liquidación" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Proyecto</label>
          <Select v-model="nueva.proyecto_id" :options="proyectosOpciones"
            optionLabel="nombre_comercial" optionValue="id"
            placeholder="Seleccionar proyecto" filter class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Período</label>
          <DatePicker v-model="nueva.periodo" view="month" dateFormat="yy-mm-dd" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo venta</label>
          <Select v-model="nueva.tipo_venta" :options="['bolsa','ppa','interno']" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogNueva = false" />
          <Button label="Crear" size="small" :loading="creando" @click="crearLiquidacion" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'

const toast = useToast()
const router = useRouter()

const vistaProyectos = ref([])
const loadingVista = ref(false)
const proyectosOpciones = ref([])
const tabActivo = ref(0)

const filtros = ref({ desde: null, hasta: null, estado: null })
const estadosOpciones = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]

const dialogNueva = ref(false)
const creando = ref(false)
const nueva = ref({ proyecto_id: null, periodo: null, tipo_venta: 'bolsa' })

// 3 niveles de colapso independientes
const expandidosProyecto = reactive({})  // key: proyecto_id (string)
const expandidosAnio     = reactive({})  // key: proyId_año
const expandidosMes      = reactive({})  // key: proyId_liqId

function toggleNivel(store, key) {
  if (store[key]) delete store[key]
  else store[key] = true
}

// ─── Etiquetas de líneas ──────────────────────────────────────────────────────
const ETIQUETAS_LISTA = {
  ingreso_bruto: 'Ingreso Bruto',
  ajuste_unergy: 'Ajuste Unergy',
  ajuste_comercializacion: 'Comercialización',
  intereses: 'Intereses',
  otro_ingreso: 'Otro Ingreso',
  despacho: 'Despacho',
  ventas_en_bolsa: 'Ventas en Bolsa',
  compras_en_bolsa: 'Compras en Bolsa',
  redistribucion_ingresos: 'Redistribución de Ingresos de acuerdo al Protocolo',
  mantenimiento: 'Mantenimiento',
  arriendo: 'Arriendo',
  servicio_internet: 'Servicio de Internet',
  iva_internet: 'IVA Internet',
  poliza_cumplimiento: 'Póliza de Cumplimiento',
  servicios_publicos_consumo: 'Servicios Públicos Consumo de energía',
  cambio_equipos_medida: 'Cambio Equipos de Medida',
  seguro: 'Seguro',
  otro_costo: 'Otro Costo',
  comercializacion: 'Comercialización',
  representacion: 'Representación',
  cgm: 'CGM',
  administracion: 'Administración',
  iva: 'IVA',
  retencion_fuente: 'Retención en la Fuente',
  reteica: 'Reteica',
  ica_opex: 'ICA OPEX',
  otro_impuesto: 'Otro Impuesto',
  valor_a_pagar: 'Valor a Pagar',
}

const TIPOS_FACTURA_SET = new Set(['representacion', 'cgm', 'administracion', 'administracion_operacion'])

const COSTOS_NEG = new Set([
  'ajuste_comercializacion', 'arriendo', 'mantenimiento', 'servicio_internet',
  'poliza_cumplimiento', 'servicios_publicos_consumo', 'cambio_equipos_medida',
  'seguro', 'otro_costo', 'compras_en_bolsa', 'comercializacion',
  'representacion', 'cgm', 'administracion', 'iva', 'retencion_fuente',
  'reteica', 'ica_opex', 'otro_impuesto',
])

const LABEL_FACTURA = {
  representacion: 'Representación',
  cgm: 'CGM',
  administracion_operacion: 'Administración',
}

const OMITIR_LINEAS = new Set(['ajuste_xm'])

const TIPO_LINEA_TO_COSTO = {
  mantenimiento:              'mantenimiento',
  servicio_internet:          'internet',
  iva_internet:               'internet',
  arriendo:                   'arriendo',
  poliza_cumplimiento:        'polizas',
  servicios_publicos_consumo: 'servicios_publicos',
  cambio_equipos_medida:      'cambio_equipos_medida',
}

// ─── Colores ──────────────────────────────────────────────────────────────────
const COLORES_FILA = {
  Información_Total: { background: 'rgba(44,32,57,0.06)' },
  Información_inv:   { background: 'rgba(44,32,57,0.03)' },
  Mandato_Total:     { background: 'rgba(145,91,216,0.12)' },
  Mandato_inv:       { background: 'rgba(145,91,216,0.05)' },
  Costos_Total:      { background: 'rgba(220,38,38,0.08)' },
  Costos_inv:        { background: 'rgba(220,38,38,0.03)' },
  Factura_Total:     { background: 'rgba(246,255,114,0.35)' },
  Factura_inv:       { background: 'rgba(246,255,114,0.15)' },
}

function estiloFila(fila) {
  const nivel = fila.inversionista === 'Total' ? 'Total' : 'inv'
  return COLORES_FILA[`${fila.doc}_${nivel}`] || { background: '#FDFAF7' }
}

function badgeDoc(doc) {
  return {
    Mandato:     { background: '#915BD8', color: '#fff' },
    Costos:      { background: '#fee2e2', color: '#b91c1c' },
    Factura:     { background: '#F6FF72', color: '#2C2039' },
    Información: { background: '#2C2039', color: '#FDFAF7' },
  }[doc] || { background: '#e5e7eb', color: '#374151' }
}

// ─── Filas planas con agrupación Proyecto → Año → Mes ─────────────────────────
const filasDetalle = computed(() => {
  const rows = []

  for (const proy of vistaProyectos.value) {
    const proyId  = String(proy.proyecto_id)
    const proyNombre = proy.proyecto_nombre

    // Separador nivel proyecto
    rows.push({
      key: `sep_proy_${proyId}`,
      separador: true, nivel: 'proyecto',
      proyKey: proyId,
      label: proyNombre,
    })

    // Agrupar liquidaciones por año
    const byAnio = {}
    for (const liq of (proy.liquidaciones || [])) {
      const year = (liq.periodo || '').split('-')[0]
      if (!byAnio[year]) byAnio[year] = []
      byAnio[year].push(liq)
    }

    for (const year of Object.keys(byAnio).sort()) {
      const anioKey = `${proyId}_${year}`

      // Separador nivel año
      rows.push({
        key: `sep_anio_${proyId}_${year}`,
        separador: true, nivel: 'anio',
        proyKey: proyId, anioKey,
        label: year,
      })

      for (const liq of byAnio[year]) {
        const mesKey    = `${proyId}_${liq.liquidacion_id}`
        const liqId     = liq.liquidacion_id
        const comprobante = liq.comprobante_contable_ref || ''
        const consIng0  = liq.consecutivo_inicial_ingresos != null ? String(liq.consecutivo_inicial_ingresos) : ''
        const consCos0  = liq.consecutivo_inicial_costos   != null ? String(liq.consecutivo_inicial_costos)   : ''

        // Separador nivel mes
        rows.push({
          key: `sep_mes_${liqId}`,
          separador: true, nivel: 'mes',
          proyKey: proyId, anioKey, mesKey,
          label: formatPeriodo(liq.periodo),
          sublabel: liq.estado,
          erUrl: liq.estado_resultados_url || null,
        })

        // Fila Total — Información (100%)
        rows.push(_f(`${liqId}_t_info`, {
          proyKey: proyId, anioKey, mesKey, liqId,
          proyecto: proyNombre, inversionista: 'Total', doc: 'Información',
          contacto1: '', contacto2: '',
          concepto: 'Porcentaje de Participación',
          isPercent: true, pctLabel: '100.00%',
          conseIngresos: consIng0, conseCostos: consCos0, comprobante,
        }))

        // Mapa soporte_url por tipo_costo desde costos_proyecto[]
        const costosSoporteMap = new Map()
        for (const c of (liq.costos_proyecto || [])) {
          costosSoporteMap.set(c.tipo_costo, c.soporte_url || null)
        }

        // Totales de ingresos y costos (agregados)
        const totalIng = new Map()
        const totalCos = new Map()
        for (const inv of (liq.inversionistas || [])) {
          for (const m of (inv.mandatos_ingresos || [])) {
            for (const l of (m.lineas || [])) {
              if (OMITIR_LINEAS.has(l.tipo_linea)) continue
              if (TIPOS_FACTURA_SET.has(l.tipo_linea)) continue
              const k = `${l.tipo_linea}|${l.referencia_factura || ''}`
              if (!totalIng.has(k)) totalIng.set(k, {
                tipo_linea: l.tipo_linea,
                concepto: ETIQUETAS_LISTA[l.tipo_linea] || l.concepto,
                valor: 0,
                refFactura: l.referencia_factura || '',
              })
              totalIng.get(k).valor += l.valor_cop
            }
          }
          for (const m of (inv.mandatos_costos || [])) {
            for (const l of (m.lineas || [])) {
              if (OMITIR_LINEAS.has(l.tipo_linea)) continue
              const k = `${l.tipo_linea}|${l.referencia_factura || ''}`
              if (!totalCos.has(k)) totalCos.set(k, {
                tipo_linea: l.tipo_linea,
                tipo_costo_key: TIPO_LINEA_TO_COSTO[l.tipo_linea] || 'otro',
                concepto: ETIQUETAS_LISTA[l.tipo_linea] || l.concepto,
                valor: 0,
                refFactura: l.referencia_factura || '',
              })
              totalCos.get(k).valor += l.valor_cop
            }
          }
        }

        for (const r of totalIng.values()) {
          rows.push(_f(`${liqId}_t_ing_${r.tipo_linea}`, {
            proyKey: proyId, anioKey, mesKey, liqId,
            proyecto: proyNombre, inversionista: 'Total', doc: 'Mandato',
            contacto1: '', contacto2: '',
            concepto: r.concepto, total: r.valor,
            negativo: COSTOS_NEG.has(r.tipo_linea),
            refFactura: r.refFactura,
            conseIngresos: consIng0, conseCostos: '', comprobante,
          }))
        }

        for (const r of totalCos.values()) {
          rows.push(_f(`${liqId}_t_cos_${r.tipo_linea}`, {
            proyKey: proyId, anioKey, mesKey, liqId,
            proyecto: proyNombre, inversionista: 'Total', doc: 'Costos',
            contacto1: '', contacto2: '',
            concepto: r.concepto, total: r.valor, negativo: true,
            refFactura: r.refFactura,
            soporteUrl: costosSoporteMap.get(r.tipo_costo_key) || null,
            conseIngresos: '', conseCostos: consCos0, comprobante,
          }))
        }

        // Filas Total — Facturas de servicio
        for (const f of (liq.facturas_servicio || [])) {
          rows.push(_f(`${liqId}_t_fac_${f.id}`, {
            proyKey: proyId, anioKey, mesKey, liqId, facturaId: f.id,
            proyecto: proyNombre, inversionista: 'Total', doc: 'Factura',
            contacto1: LABEL_FACTURA[f.tipo_servicio] || f.tipo_servicio,
            contacto2: f.numero_factura || '',
            concepto: LABEL_FACTURA[f.tipo_servicio] || f.tipo_servicio,
            total: f.valor_cop, negativo: false,
            refFactura: f.nro_soporte || '', soporteUrl: f.soporte_url || null,
            conseIngresos: '', conseCostos: '', comprobante,
          }))
        }

        // ── Por inversionista ─────────────────────────────────────────────────
        for (const inv of (liq.inversionistas || [])) {
          const pctLabel = inv.porcentaje_participacion != null
            ? (inv.porcentaje_participacion * 100).toFixed(4) + '%' : '—'

          rows.push(_f(`${liqId}_${inv.inversionista_id}_info`, {
            proyKey: proyId, anioKey, mesKey, liqId,
            proyecto: proyNombre, inversionista: inv.inversionista_nombre, doc: 'Información',
            contacto1: '', contacto2: '',
            concepto: 'Porcentaje de Participación',
            isPercent: true, pctLabel,
            conseIngresos: consIng0, conseCostos: consCos0, comprobante,
          }))

          for (const m of (inv.mandatos_ingresos || [])) {
            const consIng = m.consecutivo != null ? String(m.consecutivo) : consIng0
            for (const l of (m.lineas || [])) {
              if (OMITIR_LINEAS.has(l.tipo_linea)) continue
              if (TIPOS_FACTURA_SET.has(l.tipo_linea)) continue
              rows.push(_f(`${liqId}_${inv.inversionista_id}_ing_${l.id}`, {
                proyKey: proyId, anioKey, mesKey, liqId,
                mandatoId: m.id, lineaId: l.id,
                proyecto: proyNombre, inversionista: inv.inversionista_nombre, doc: 'Mandato',
                contacto1: m.numero_mandato || '',
                contacto2: m.beneficiario_nombre || '',
                concepto: ETIQUETAS_LISTA[l.tipo_linea] || l.concepto,
                total: l.valor_cop, negativo: COSTOS_NEG.has(l.tipo_linea),
                refFactura: l.referencia_factura || '',
                soporteUrl: l.soporte_url || null,
                conseIngresos: consIng, conseCostos: '', comprobante,
              }))
            }
          }

          for (const m of (inv.mandatos_costos || [])) {
            const consCos = m.consecutivo != null ? String(m.consecutivo) : consCos0
            for (const l of (m.lineas || [])) {
              if (OMITIR_LINEAS.has(l.tipo_linea)) continue
              rows.push(_f(`${liqId}_${inv.inversionista_id}_cos_${l.id}`, {
                proyKey: proyId, anioKey, mesKey, liqId,
                mandatoId: m.id, lineaId: l.id,
                proyecto: proyNombre, inversionista: inv.inversionista_nombre, doc: 'Costos',
                contacto1: m.numero_mandato || '',
                contacto2: m.beneficiario_nombre || '',
                concepto: ETIQUETAS_LISTA[l.tipo_linea] || l.concepto,
                total: l.valor_cop, negativo: true,
                refFactura: l.referencia_factura || '',
                soporteUrl: l.soporte_url || null,
                conseIngresos: '', conseCostos: consCos, comprobante,
              }))
            }
          }
        }
      }
    }
  }
  return rows
})

// ─── Vistas filtradas por pestaña ─────────────────────────────────────────────
const filasIngresos = computed(() =>
  filasDetalle.value.filter(f =>
    f.separador || f.doc === 'Mandato' || f.doc === 'Información'
  )
)

const filasCostos = computed(() =>
  filasDetalle.value.filter(f =>
    f.separador || f.doc === 'Costos' || f.doc === 'Factura' || f.doc === 'Información'
  )
)

const ingresoBrutoTotal = computed(() =>
  filasDetalle.value
    .filter(f => !f.separador && f.concepto === 'Ingreso Bruto' && f.inversionista === 'Total')
    .reduce((acc, f) => acc + (f.total || 0), 0)
)

const totalCostos = computed(() =>
  filasDetalle.value
    .filter(f => !f.separador && f.doc === 'Costos' && f.inversionista === 'Total')
    .reduce((acc, f) => acc + (f.total || 0), 0)
)

const totalFacturasServicio = computed(() =>
  filasDetalle.value
    .filter(f => !f.separador && f.doc === 'Factura' && f.inversionista === 'Total')
    .reduce((acc, f) => acc + (f.total || 0), 0)
)

function _f(key, d) {
  return {
    key,
    separador: false,
    nivel: null,
    erUrl: null,
    proyKey:    d.proyKey    ?? '',
    anioKey:    d.anioKey    ?? '',
    mesKey:     d.mesKey     ?? '',
    liqId:      d.liqId      ?? null,
    facturaId:  d.facturaId  ?? null,
    mandatoId:  d.mandatoId  ?? null,
    lineaId:    d.lineaId    ?? null,
    proyecto:       d.proyecto       ?? '',
    inversionista:  d.inversionista  ?? '',
    doc:            d.doc            ?? '',
    contacto1:      d.contacto1      ?? '',
    contacto2:      d.contacto2      ?? '',
    concepto:       d.concepto       ?? '',
    total:          d.total          ?? null,
    isPercent:      d.isPercent      ?? false,
    pctLabel:       d.pctLabel       ?? '',
    negativo:       d.negativo       ?? false,
    refFactura:     d.refFactura     ?? '',
    soporteUrl:     d.soporteUrl     ?? null,
    conseIngresos:  d.conseIngresos  ?? '',
    conseCostos:    d.conseCostos    ?? '',
    comprobante:    d.comprobante    ?? '',
  }
}

// ─── Acciones ────────────────────────────────────────────────────────────────
function verDetalle(fila) {
  router.push(`/liquidaciones/${fila.liqId}`)
}

async function eliminarFactura(fila) {
  if (!window.confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return
  try {
    await api.delete(`/liquidaciones/${fila.liqId}/facturas/${fila.facturaId}`)
    toast.add({ severity: 'success', summary: 'Eliminada', life: 2000 })
    loadVistas()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la factura', life: 3000 })
  }
}

async function eliminarMandatoLinea(fila) {
  if (!window.confirm('¿Eliminar esta línea? Esta acción no se puede deshacer.')) return
  try {
    await api.delete(`/liquidaciones/${fila.liqId}/mandatos/${fila.mandatoId}/lineas/${fila.lineaId}`)
    toast.add({ severity: 'success', summary: 'Eliminada', life: 2000 })
    loadVistas()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la línea', life: 3000 })
  }
}

// ─── Params / carga ───────────────────────────────────────────────────────────
function buildParams() {
  const p = {}
  if (filtros.value.desde) p.periodo_desde = toISOMonth(filtros.value.desde)
  if (filtros.value.hasta) p.periodo_hasta = toISOMonth(filtros.value.hasta)
  if (filtros.value.estado) p.estado = filtros.value.estado
  return p
}

function toISOMonth(d) {
  if (!d) return null
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
}

async function loadVistas() {
  loadingVista.value = true
  const params = buildParams()
  try {
    const { data } = await api.get('/liquidaciones/vistas/por-proyecto', { params })
    vistaProyectos.value = data
  } catch (e) {
    console.error('Vista por proyecto:', e)
    vistaProyectos.value = []
  } finally {
    loadingVista.value = false
  }
}

async function loadProyectosOpciones() {
  try {
    const { data } = await api.get('/proyectos', { params: { size: 200 } })
    proyectosOpciones.value = data.items || []
  } catch {
    proyectosOpciones.value = []
  }
}

function recargar() { loadVistas() }

function limpiarFiltros() {
  filtros.value = { desde: null, hasta: null, estado: null }
  loadVistas()
}

// ─── Nueva liquidación ────────────────────────────────────────────────────────
async function crearLiquidacion() {
  if (!nueva.value.proyecto_id || !nueva.value.periodo) return
  creando.value = true
  try {
    const { data } = await api.post('/liquidaciones', {
      proyecto_id: nueva.value.proyecto_id,
      periodo: toISOMonth(nueva.value.periodo),
      tipo_venta: nueva.value.tipo_venta,
    })
    dialogNueva.value = false
    toast.add({ severity: 'success', summary: 'Creada', life: 2000 })
    router.push(`/liquidaciones/${data.id}`)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear', life: 3000 })
  } finally {
    creando.value = false
  }
}

// ─── Formato ──────────────────────────────────────────────────────────────────
function fmt(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(v)
}

function formatPeriodo(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}

function estadoSeverity(e) {
  return {
    iniciada: 'secondary', costos_registrados: 'info', xm_procesado: 'info',
    mandatos_emitidos: 'warn', en_contabilidad: 'warn', en_revisoria: 'warn',
    facturado: 'success', entregado: 'contrast',
  }[e] || 'secondary'
}

onMounted(() => {
  loadVistas()
  loadProyectosOpciones()
})
</script>
