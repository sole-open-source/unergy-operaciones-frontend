<template>
  <div class="space-y-4" style="background:#FDFAF7; min-height:100vh; padding:1rem">

    <!-- Header -->
    <div class="flex items-center gap-3 flex-wrap">
      <Button icon="pi pi-arrow-left" text @click="$router.back()" />
      <div>
        <h2 class="text-lg font-semibold" style="color:#2C2039">
          {{ liq?.proyecto_nombre }} — {{ formatPeriodo(liq?.periodo) }}
        </h2>
        <Tag v-if="liq" :value="liq.estado" :severity="estadoSeverity(liq.estado)" class="text-xs mt-0.5" />
      </div>
      <div class="ml-auto flex gap-2 flex-wrap items-center">
        <a v-if="liq?.estado_resultados_url" :href="liq.estado_resultados_url" target="_blank"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
          style="background:#F6FF72; color:#2C2039">
          <i class="pi pi-chart-line text-xs" />Estado de Resultados
        </a>
        <Button label="Editar resumen" icon="pi pi-calculator" outlined size="small"
          style="border-color:#915BD8; color:#915BD8" @click="abrirEditResumen" />
        <Button label="Estado" icon="pi pi-pencil" outlined size="small"
          style="border-color:#2C2039; color:#2C2039" @click="dialogEstado = true" />
      </div>
    </div>

    <ProgressSpinner v-if="loading" class="block mx-auto" />

    <template v-if="!loading && liq">

      <!-- Tarjetas resumen financiero -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl shadow-sm p-4 text-center border-t-4" style="border-color:#22c55e">
          <div class="text-xs text-gray-500 mb-1">Ingresos brutos</div>
          <div class="text-base font-semibold text-green-700">{{ fmt(resumenCalculado.ingresos_brutos) }}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center border-t-4" style="border-color:#ef4444">
          <div class="text-xs text-gray-500 mb-1">Comercialización XM</div>
          <div class="text-base font-semibold text-red-600">{{ fmt(resumenCalculado.comercializacion) }}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center border-t-4" style="border-color:#ef4444">
          <div class="text-xs text-gray-500 mb-1">Costos operativos</div>
          <div class="text-base font-semibold text-red-600">{{ fmt(resumenCalculado.costos_op) }}</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 text-center border-t-4" style="border-color:#915BD8">
          <div class="text-xs text-gray-500 mb-1">Ingreso neto</div>
          <div class="text-base font-semibold" style="color:#915BD8">{{ fmt(resumenCalculado.neto) }}</div>
        </div>
      </div>

      <!-- Datos adicionales: comprobante, consecutivos -->
      <div class="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap gap-4 text-xs" style="color:#2C2039">
        <span><span class="text-gray-400">Comprobante:</span>
          <strong class="ml-1">{{ liq.comprobante_contable_ref || '—' }}</strong></span>
        <span><span class="text-gray-400">Consec. Ingresos:</span>
          <strong class="ml-1">{{ liq.consecutivo_inicial_ingresos ?? '—' }}</strong></span>
        <span><span class="text-gray-400">Consec. Costos:</span>
          <strong class="ml-1">{{ liq.consecutivo_inicial_costos ?? '—' }}</strong></span>
        <span><span class="text-gray-400">Tasa cambio:</span>
          <strong class="ml-1">{{ liq.tasa_cambio ?? '—' }}</strong></span>
        <span v-if="liq.observaciones_resultados" class="text-gray-500 italic">
          {{ liq.observaciones_resultados }}</span>
      </div>

      <!-- ══ INGRESOS ══ -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="text-white px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none"
          style="background:#1e5c2e"
          @click="toggleSeccion('ingresos')">
          <i :class="seccionesAbiertas.has('ingresos') ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-xs" />
          <span class="font-semibold">Ingresos</span>
          <span class="text-green-300 text-xs ml-auto">
            {{ inversionistasConDetalle.length }} inversionista(s)
          </span>
        </div>

        <div v-if="seccionesAbiertas.has('ingresos')" class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-gray-600" style="background:#f1f5f9">
                <th class="px-3 py-1.5 text-left w-44">Inversionista</th>
                <th class="px-3 py-1.5 text-right w-24">Participación</th>
                <th class="px-3 py-1.5 text-left w-28">N° Mandato</th>
                <th class="px-3 py-1.5 text-left w-24">Consec.</th>
                <th class="px-3 py-1.5 text-left">Concepto</th>
                <th class="px-3 py-1.5 text-right w-36">Valor COP</th>
                <th class="px-3 py-1.5 text-left w-32">Ref. Factura</th>
                <th class="px-3 py-1.5 w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <!-- Fila total proyecto -->
              <tr class="font-semibold border-b-2" style="background:rgba(145,91,216,0.08); border-color:rgba(145,91,216,0.3)">
                <td class="px-3 py-1.5 font-bold" style="color:#2C2039" colspan="2">Total Proyecto</td>
                <td class="px-3 py-1.5" />
                <td class="px-3 py-1.5" />
                <td class="px-3 py-1.5" style="color:#915BD8">Porcentaje de Participación</td>
                <td class="px-3 py-1.5 text-right font-semibold" style="color:#915BD8">100.00%</td>
                <td class="px-3 py-1.5" />
                <td class="px-3 py-1.5" />
              </tr>

              <!-- Por inversionista -->
              <template v-for="inv in inversionistasConDetalle" :key="inv.id">
                <!-- Header inversionista -->
                <tr class="text-white border-t border-gray-600" style="background:#2C2039">
                  <td class="px-3 py-1.5 font-semibold truncate max-w-[176px]" :title="inv.nombre">
                    {{ inv.nombre }}
                  </td>
                  <td class="px-3 py-1.5 text-right text-gray-300 font-semibold">{{ pct(inv.porcentaje) }}</td>
                  <td class="px-3 py-1.5" colspan="2" />
                  <td class="px-3 py-1.5 text-gray-300">Porcentaje de Participación</td>
                  <td class="px-3 py-1.5 text-right font-semibold">{{ pct(inv.porcentaje) }}</td>
                  <td class="px-3 py-1.5" />
                  <td class="px-3 py-1.5 text-center">
                    <Button icon="pi pi-plus" text size="small" class="!text-green-300"
                      title="Agregar mandato de ingresos"
                      @click="abrirDialogMandato('ingresos', inv.id, inv.nombre)" />
                  </td>
                </tr>

                <!-- Mandatos de ingresos -->
                <template v-for="m in inv.mandatosIngresos" :key="m.id">
                  <!-- Sub-header de mandato -->
                  <tr style="background:rgba(30,92,46,0.06)">
                    <td class="px-3 py-1 text-green-800 font-medium text-[11px]" colspan="2">
                      Mandato
                    </td>
                    <td class="px-3 py-1 text-[11px] text-gray-600 font-mono">{{ m.numero_mandato || '—' }}</td>
                    <td class="px-3 py-1 text-[11px] text-gray-500">
                      {{ m.consecutivo ?? liq.consecutivo_inicial_ingresos ?? '—' }}
                    </td>
                    <td class="px-3 py-1 text-[11px] text-gray-500 italic">
                      {{ m.beneficiario_nombre || '' }}
                    </td>
                    <td class="px-3 py-1" />
                    <td class="px-3 py-1" />
                    <td class="px-3 py-1 text-center">
                      <div class="flex justify-center gap-0.5">
                        <Button icon="pi pi-pencil" text size="small" severity="info"
                          @click="abrirDialogMandato('ingresos', inv.id, inv.nombre, m)" />
                        <Button icon="pi pi-trash" text size="small" severity="danger"
                          @click="eliminarMandato(m.id)" />
                        <Button icon="pi pi-plus" text size="small" class="!text-green-600"
                          title="Agregar línea"
                          @click="abrirDialogLinea(m.id, 'ingresos')" />
                      </div>
                    </td>
                  </tr>
                  <!-- Líneas del mandato -->
                  <tr v-for="l in m.lineas" :key="l.id"
                    class="border-b hover:bg-green-50"
                    style="background:rgba(240,253,244,0.8); border-color:rgba(44,32,57,0.06)">
                    <td class="px-3 py-1.5" colspan="4" />
                    <td class="px-3 py-1.5" style="color:#2C2039">{{ ETIQUETAS[l.tipo_linea] || l.concepto }}</td>
                    <td class="px-3 py-1.5 text-right font-mono">{{ fmt(l.valor_cop) }}</td>
                    <td class="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                      <a v-if="l.soporte_url" :href="l.soporte_url" target="_blank"
                        class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                        <i class="pi pi-external-link text-xs" />{{ l.referencia_factura || 'Ver' }}
                      </a>
                      <span v-else>{{ l.referencia_factura }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-center">
                      <div class="flex justify-center gap-0.5">
                        <Button icon="pi pi-pencil" text size="small" severity="info"
                          @click="abrirDialogLinea(m.id, 'ingresos', l)" />
                        <Button icon="pi pi-trash" text size="small" severity="danger"
                          @click="eliminarLinea(m.id, l.id)" />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!m.lineas.length">
                    <td colspan="8" class="px-3 py-1.5 text-center text-gray-400 italic text-[11px]"
                      style="background:rgba(240,253,244,0.5)">
                      Sin líneas — usa el botón + para añadir
                    </td>
                  </tr>
                </template>

                <tr v-if="!inv.mandatosIngresos.length" class="border-b border-gray-100">
                  <td colspan="8" class="px-3 py-2 text-center text-gray-400 italic text-xs"
                    style="background:rgba(240,253,244,0.4)">
                    Sin mandato de ingresos — usa el botón + del inversionista para agregar
                  </td>
                </tr>
              </template>

              <tr v-if="!inversionistasConDetalle.length">
                <td colspan="8" class="px-4 py-4 text-center text-gray-400">
                  Sin inversionistas registrados en el proyecto
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ DATOS XM (Mercado) ══ -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none"
          style="background:rgba(59,130,246,0.06); color:#1e40af; border-left:3px solid #3B82F6"
          @click="toggleSeccion('xm_datos')">
          <i :class="seccionesAbiertas.has('xm_datos') ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-xs" />
          <span class="font-semibold">Datos XM ({{ (liq.xm_datos || []).length }})</span>
          <div class="ml-auto flex items-center gap-2">
            <Button v-if="!(liq.xm_datos || []).length" icon="pi pi-bolt" label="Auto-poblar"
              text size="small" style="color:#1e40af"
              @click.stop="autoPopulateXM()" :loading="autoPopulatingXM" />
          </div>
        </div>
        <div v-if="seccionesAbiertas.has('xm_datos')">
          <div v-if="!(liq.xm_datos || []).length" class="p-6 text-center">
            <i class="pi pi-database text-3xl mb-2" style="color: #9CA3AF;" />
            <p class="text-sm" style="color: #6b5a8a;">Sin datos XM registrados</p>
            <p class="text-xs mt-1" style="color: #9CA3AF;">Usa "Auto-poblar" para calcular desde generación y precios de bolsa</p>
          </div>
          <table v-else class="w-full text-xs">
            <thead>
              <tr class="text-gray-600" style="background:#f1f5f9">
                <th class="px-3 py-1.5 text-left">Tipo Venta</th>
                <th class="px-3 py-1.5 text-right">Energía kWh</th>
                <th class="px-3 py-1.5 text-right">Tarifa $/kWh</th>
                <th class="px-3 py-1.5 text-right">Valor COP</th>
                <th class="px-3 py-1.5 text-left">Ref. Factura XM</th>
                <th class="px-3 py-1.5 w-20" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="x in (liq.xm_datos || [])" :key="x.id"
                class="border-b hover:bg-blue-50"
                style="background:rgba(59,130,246,0.03); border-color:rgba(44,32,57,0.06)">
                <td class="px-3 py-1.5 text-blue-700 font-medium">{{ x.tipo_venta }}</td>
                <td class="px-3 py-1.5 text-right font-mono" style="color:#2C2039">{{ Number(x.energia_kwh).toLocaleString('es-CO', {maximumFractionDigits: 1}) }}</td>
                <td class="px-3 py-1.5 text-right font-mono" style="color:#2C2039">${{ Number(x.tarifa_aplicada_kwh).toFixed(2) }}</td>
                <td class="px-3 py-1.5 text-right font-semibold" style="color:#1e40af">${{ Number(x.valor_bruto_cop).toLocaleString('es-CO', {maximumFractionDigits: 0}) }}</td>
                <td class="px-3 py-1.5 text-gray-500 font-mono">{{ x.referencia_factura_xm || '—' }}</td>
                <td class="px-3 py-1.5 text-center">
                  <Button icon="pi pi-trash" text rounded severity="danger" size="small"
                    @click="deleteXMDato(x.id)" title="Eliminar" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ COSTOS ══ -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="text-white px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none"
          style="background:#7f1d1d"
          @click="toggleSeccion('costos')">
          <i :class="seccionesAbiertas.has('costos') ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-xs" />
          <span class="font-semibold">Costos</span>
          <div class="ml-auto flex items-center gap-2">
            <Button icon="pi pi-plus" label="Agregar costo" text size="small"
              class="!text-red-200 hover:!text-white"
              @click.stop="abrirDialogCosto()" />
          </div>
        </div>

        <div v-if="seccionesAbiertas.has('costos')">
          <!-- Costos de proyecto (LiquidacionCosto) -->
          <div class="overflow-x-auto border-b border-gray-200">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-gray-600" style="background:#f1f5f9">
                  <th class="px-3 py-1.5 text-left w-36">Tipo</th>
                  <th class="px-3 py-1.5 text-left">Descripción</th>
                  <th class="px-3 py-1.5 text-left w-32">Proveedor</th>
                  <th class="px-3 py-1.5 text-left w-28">Soporte</th>
                  <th class="px-3 py-1.5 text-right w-36">Valor COP</th>
                  <th class="px-3 py-1.5 w-20" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in (liq.costos || [])" :key="c.id"
                  class="border-b hover:bg-red-50"
                  style="background:rgba(255,240,240,0.6); border-color:rgba(44,32,57,0.06)">
                  <td class="px-3 py-1.5 text-red-700 font-medium">{{ c.tipo_costo }}</td>
                  <td class="px-3 py-1.5" style="color:#2C2039">{{ c.descripcion }}</td>
                  <td class="px-3 py-1.5 text-gray-500">{{ c.proveedor }}</td>
                  <td class="px-3 py-1.5">
                    <a v-if="c.soporte_url" :href="c.soporte_url" target="_blank"
                      class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                      <i class="pi pi-external-link text-xs" />{{ c.nro_soporte || 'Ver' }}
                    </a>
                    <span v-else class="text-gray-400">{{ c.nro_soporte }}</span>
                  </td>
                  <td class="px-3 py-1.5 text-right font-mono text-red-600">{{ fmt(c.valor_cop) }}</td>
                  <td class="px-3 py-1.5">
                    <div class="flex gap-0.5 justify-end">
                      <Button icon="pi pi-pencil" text size="small" severity="info" @click="abrirDialogCosto(c)" />
                      <Button icon="pi pi-trash" text size="small" severity="danger" @click="eliminarCosto(c.id)" />
                    </div>
                  </td>
                </tr>
                <tr v-if="!(liq.costos || []).length">
                  <td colspan="6" class="px-4 py-3 text-center text-xs text-gray-400 italic"
                    style="background:rgba(255,240,240,0.3)">
                    Sin costos de proyecto — usa "Agregar costo"
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Costos por inversionista (mandatos tipo costos) -->
          <div v-if="inversionistasConDetalle.length" class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-gray-500" style="background:#f8f8f8">
                  <th class="px-3 py-1 text-left w-44">Inversionista</th>
                  <th class="px-3 py-1 text-right w-24">Participación</th>
                  <th class="px-3 py-1 text-left w-28">N° Mandato</th>
                  <th class="px-3 py-1 text-left w-24">Consec.</th>
                  <th class="px-3 py-1 text-left">Concepto</th>
                  <th class="px-3 py-1 text-right w-36">Valor COP</th>
                  <th class="px-3 py-1 text-left w-32">Ref. Factura</th>
                  <th class="px-3 py-1 w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="inv in inversionistasConDetalle" :key="`cos_${inv.id}`">
                  <tr class="text-white border-t border-gray-600" style="background:#2C2039">
                    <td class="px-3 py-1.5 font-semibold truncate max-w-[176px]" :title="inv.nombre">{{ inv.nombre }}</td>
                    <td class="px-3 py-1.5 text-right text-gray-300">{{ pct(inv.porcentaje) }}</td>
                    <td class="px-3 py-1.5" colspan="4" />
                    <td class="px-3 py-1.5" />
                    <td class="px-3 py-1.5 text-center">
                      <Button icon="pi pi-plus" text size="small" class="!text-red-300"
                        title="Agregar mandato de costos"
                        @click="abrirDialogMandato('costos', inv.id, inv.nombre)" />
                    </td>
                  </tr>

                  <template v-for="m in inv.mandatosCostos" :key="m.id">
                    <tr style="background:rgba(127,29,29,0.05)">
                      <td class="px-3 py-1 text-red-800 font-medium text-[11px]" colspan="2">Costos</td>
                      <td class="px-3 py-1 text-[11px] text-gray-600 font-mono">{{ m.numero_mandato || '—' }}</td>
                      <td class="px-3 py-1 text-[11px] text-gray-500">
                        {{ m.consecutivo ?? liq.consecutivo_inicial_costos ?? '—' }}
                      </td>
                      <td class="px-3 py-1 text-[11px] text-gray-500 italic">{{ m.beneficiario_nombre || '' }}</td>
                      <td class="px-3 py-1" />
                      <td class="px-3 py-1" />
                      <td class="px-3 py-1 text-center">
                        <div class="flex justify-center gap-0.5">
                          <Button icon="pi pi-pencil" text size="small" severity="info"
                            @click="abrirDialogMandato('costos', inv.id, inv.nombre, m)" />
                          <Button icon="pi pi-trash" text size="small" severity="danger"
                            @click="eliminarMandato(m.id)" />
                          <Button icon="pi pi-plus" text size="small" class="!text-red-600"
                            title="Agregar línea"
                            @click="abrirDialogLinea(m.id, 'costos')" />
                        </div>
                      </td>
                    </tr>
                    <tr v-for="l in m.lineas" :key="l.id"
                      class="border-b hover:bg-red-50"
                      style="background:rgba(255,240,240,0.5); border-color:rgba(44,32,57,0.06)">
                      <td class="px-3 py-1.5" colspan="4" />
                      <td class="px-3 py-1.5" style="color:#2C2039">{{ ETIQUETAS[l.tipo_linea] || l.concepto }}</td>
                      <td class="px-3 py-1.5 text-right font-mono text-red-600">{{ fmt(l.valor_cop) }}</td>
                      <td class="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                        <a v-if="l.soporte_url" :href="l.soporte_url" target="_blank"
                          class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                          <i class="pi pi-external-link text-xs" />{{ l.referencia_factura || 'Ver' }}
                        </a>
                        <span v-else>{{ l.referencia_factura }}</span>
                      </td>
                      <td class="px-3 py-1.5 text-center">
                        <div class="flex justify-center gap-0.5">
                          <Button icon="pi pi-pencil" text size="small" severity="info"
                            @click="abrirDialogLinea(m.id, 'costos', l)" />
                          <Button icon="pi pi-trash" text size="small" severity="danger"
                            @click="eliminarLinea(m.id, l.id)" />
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!m.lineas.length">
                      <td colspan="8" class="px-3 py-1.5 text-center text-gray-400 italic text-[11px]"
                        style="background:rgba(255,240,240,0.3)">
                        Sin líneas — usa el botón + para añadir
                      </td>
                    </tr>
                  </template>

                  <tr v-if="!inv.mandatosCostos.length">
                    <td colspan="8" class="px-3 py-1.5 text-center text-gray-400 italic text-[11px]"
                      style="background:rgba(255,240,240,0.2)">
                      Sin mandato de costos
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ══ SERVICIOS ══ -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="text-white px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none"
          style="background:#78350f"
          @click="toggleSeccion('servicios')">
          <i :class="seccionesAbiertas.has('servicios') ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="text-xs" />
          <span class="font-semibold">Servicios (Facturas)</span>
          <Button icon="pi pi-plus" label="Agregar" text size="small"
            class="ml-auto !text-yellow-200 hover:!text-white"
            @click.stop="abrirDialogFactura()" />
        </div>

        <div v-if="seccionesAbiertas.has('servicios')">
          <div v-if="(liq.facturas || []).length" class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-gray-600" style="background:#f1f5f9">
                  <th class="px-3 py-1.5 text-left w-36">Servicio</th>
                  <th class="px-3 py-1.5 text-left w-28">N° Factura</th>
                  <th class="px-3 py-1.5 text-left w-24">Soporte</th>
                  <th class="px-3 py-1.5 text-left w-24">Emisión</th>
                  <th class="px-3 py-1.5 text-left w-24">Vencimiento</th>
                  <th class="px-3 py-1.5 text-left w-24">Estado</th>
                  <th class="px-3 py-1.5 text-right w-36">Valor COP</th>
                  <th class="px-3 py-1.5 w-20" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in (liq.facturas || [])" :key="f.id"
                  class="border-b hover:bg-yellow-50"
                  style="background:rgba(246,255,114,0.12); border-color:rgba(44,32,57,0.06)">
                  <td class="px-3 py-1.5 text-yellow-700 font-medium">{{ LABEL_SERVICIO[f.tipo_servicio] || f.tipo_servicio }}</td>
                  <td class="px-3 py-1.5 font-mono text-xs" style="color:#2C2039">{{ f.numero_factura }}</td>
                  <td class="px-3 py-1.5">
                    <a v-if="f.soporte_url" :href="f.soporte_url" target="_blank"
                      class="flex items-center gap-1 hover:underline" style="color:#915BD8">
                      <i class="pi pi-file-pdf text-red-500 text-xs" />{{ f.nro_soporte || 'Ver' }}
                    </a>
                    <span v-else class="text-gray-400">{{ f.nro_soporte }}</span>
                  </td>
                  <td class="px-3 py-1.5 text-gray-500">{{ f.fecha_emision }}</td>
                  <td class="px-3 py-1.5 text-gray-500">{{ f.fecha_vencimiento }}</td>
                  <td class="px-3 py-1.5">
                    <Tag :value="f.estado" :severity="facturaEstadoSeverity(f.estado)" class="text-[10px]" />
                  </td>
                  <td class="px-3 py-1.5 text-right font-mono" style="color:#2C2039">{{ fmt(f.valor_cop) }}</td>
                  <td class="px-3 py-1.5">
                    <div class="flex gap-0.5 justify-end">
                      <Button icon="pi pi-pencil" text size="small" severity="info" @click="abrirDialogFactura(f)" />
                      <Button icon="pi pi-trash" text size="small" severity="danger" @click="eliminarFactura(f.id)" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="px-4 py-4 text-center text-xs text-gray-400 italic"
            style="background:rgba(246,255,114,0.08)">
            Sin facturas de servicio — usa "Agregar"
          </div>
        </div>
      </div>
    </template>

    <!-- ─── Dialog: Estado ───────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogEstado" header="Actualizar estado" modal class="w-72">
      <div class="space-y-3 py-2">
        <Select v-model="nuevoEstado" :options="estadosOpciones" class="w-full" />
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogEstado = false" />
          <Button label="Guardar" size="small" :loading="guardando" @click="guardarEstado" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Resumen financiero ──────────────────────────────────── -->
    <Dialog v-model:visible="dialogResumen" header="Editar resumen financiero" modal class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tasa de cambio (USD/COP)</label>
          <InputNumber v-model="resumenForm.tasa_cambio" :maxFractionDigits="4" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Comprobante contable</label>
          <InputText v-model="resumenForm.comprobante_contable_ref" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Consecutivo inicial ingresos</label>
          <InputNumber v-model="resumenForm.consecutivo_inicial_ingresos" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Consecutivo inicial costos</label>
          <InputNumber v-model="resumenForm.consecutivo_inicial_costos" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Fecha inicio proceso</label>
          <DatePicker v-model="resumenForm.fecha_inicio_proceso" dateFormat="yy-mm-dd" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Fecha firma</label>
          <DatePicker v-model="resumenForm.fecha_firma" dateFormat="yy-mm-dd" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">URL estado de resultados</label>
          <InputText v-model="resumenForm.estado_resultados_url" class="w-full" placeholder="https://..." />
        </div>
        <div class="flex flex-col gap-1 col-span-2">
          <label class="text-xs text-gray-600">Observaciones</label>
          <Textarea v-model="resumenForm.observaciones_resultados" rows="2" class="w-full" />
        </div>
        <div class="col-span-2 flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogResumen = false" />
          <Button label="Guardar" size="small" :loading="guardando" @click="guardarResumen" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Costo ───────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogCosto" :header="costoEditId ? 'Editar costo' : 'Agregar costo'" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo de costo</label>
          <Select v-model="costoForm.tipo_costo" :options="tiposCostoOpciones" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Descripción</label>
          <InputText v-model="costoForm.descripcion" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Proveedor</label>
          <InputText v-model="costoForm.proveedor" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">N° Soporte</label>
            <InputText v-model="costoForm.nro_soporte" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">URL Soporte</label>
            <InputText v-model="costoForm.soporte_url" class="w-full" placeholder="https://..." />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Valor (COP)</label>
          <InputNumber v-model="costoForm.valor_cop" :maxFractionDigits="2" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogCosto = false" />
          <Button :label="costoEditId ? 'Actualizar' : 'Agregar'" size="small" :loading="guardando" @click="guardarCosto" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Factura ─────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogFactura" :header="facturaEditId ? 'Editar factura' : 'Agregar factura'" modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo de servicio</label>
          <Select v-model="facturaForm.tipo_servicio" :options="tiposServicioOpciones"
            optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">N° Factura</label>
            <InputText v-model="facturaForm.numero_factura" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">N° Soporte</label>
            <InputText v-model="facturaForm.nro_soporte" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">URL Soporte</label>
          <InputText v-model="facturaForm.soporte_url" class="w-full" placeholder="https://..." />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Fecha emisión</label>
            <DatePicker v-model="facturaForm.fecha_emision" dateFormat="yy-mm-dd" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Fecha vencimiento</label>
            <DatePicker v-model="facturaForm.fecha_vencimiento" dateFormat="yy-mm-dd" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Estado</label>
            <Select v-model="facturaForm.estado" :options="['emitida','pagada','vencida']" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Valor (COP)</label>
            <InputNumber v-model="facturaForm.valor_cop" :maxFractionDigits="2" class="w-full" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogFactura = false" />
          <Button :label="facturaEditId ? 'Actualizar' : 'Agregar'" size="small" :loading="guardando" @click="guardarFactura" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Mandato ─────────────────────────────────────────────── -->
    <Dialog v-model:visible="dialogMandato"
      :header="(mandatoEditId ? 'Editar' : 'Agregar') + ' mandato de ' + mandatoCtx.tipo + ' — ' + mandatoCtx.invNombre"
      modal class="w-full max-w-lg">
      <div class="grid grid-cols-2 gap-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">N° Mandato / Contrato</label>
          <InputText v-model="mandatoForm.numero_mandato" class="w-full" placeholder="Ej: Terpel 1, NEU I…" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Consecutivo</label>
          <InputNumber v-model="mandatoForm.consecutivo" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Beneficiario</label>
          <InputText v-model="mandatoForm.beneficiario_nombre" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">NIT Beneficiario</label>
          <InputText v-model="mandatoForm.beneficiario_nit" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Categoría contable</label>
          <InputText v-model="mandatoForm.categoria_contable" class="w-full" />
        </div>
        <div class="flex items-center gap-2 pt-4">
          <Checkbox v-model="mandatoForm.pa_aplica" binary inputId="pa_aplica" />
          <label for="pa_aplica" class="text-xs text-gray-600 cursor-pointer">PA aplica</label>
        </div>
        <div class="col-span-2 flex flex-col gap-1">
          <label class="text-xs text-gray-600">Observaciones</label>
          <Textarea v-model="mandatoForm.observaciones" rows="2" class="w-full" />
        </div>
        <div class="col-span-2 flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogMandato = false" />
          <Button :label="mandatoEditId ? 'Actualizar' : 'Crear'" size="small" :loading="guardando" @click="guardarMandato" />
        </div>
      </div>
    </Dialog>

    <!-- ─── Dialog: Línea de mandato ────────────────────────────────────── -->
    <Dialog v-model:visible="dialogLinea"
      :header="(lineaEditId ? 'Editar' : 'Agregar') + ' línea'"
      modal class="w-full max-w-md">
      <div class="space-y-3 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Tipo de línea</label>
          <Select v-model="lineaForm.tipo_linea" :options="tiposLineaActual"
            optionLabel="label" optionValue="value"
            @change="onTipoLineaChange" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-600">Concepto</label>
          <InputText v-model="lineaForm.concepto" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Valor (COP)</label>
            <InputNumber v-model="lineaForm.valor_cop" :maxFractionDigits="2" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Porcentaje (%)</label>
            <InputNumber v-model="lineaForm.porcentaje" :maxFractionDigits="6" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Referencia factura</label>
            <InputText v-model="lineaForm.referencia_factura" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-600">Orden</label>
            <InputNumber v-model="lineaForm.orden" :useGrouping="false" :maxFractionDigits="0" class="w-full" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button label="Cancelar" severity="secondary" size="small" @click="dialogLinea = false" />
          <Button :label="lineaEditId ? 'Actualizar' : 'Agregar'" size="small" :loading="guardando" @click="guardarLinea" />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import api from '@/api/client'

const route = useRoute()
const toast = useToast()

const liq = ref(null)
const proyectoInversionistas = ref([])
const loading = ref(false)
const guardando = ref(false)

const seccionesAbiertas = ref(new Set(['ingresos', 'xm_datos', 'costos', 'servicios']))
function toggleSeccion(key) {
  if (seccionesAbiertas.value.has(key)) seccionesAbiertas.value.delete(key)
  else seccionesAbiertas.value.add(key)
  seccionesAbiertas.value = new Set(seccionesAbiertas.value)
}

// ─── Catálogos ────────────────────────────────────────────────────────────────
const estadosOpciones = [
  'iniciada', 'costos_registrados', 'xm_procesado', 'mandatos_emitidos',
  'en_contabilidad', 'en_revisoria', 'facturado', 'entregado',
]

const tiposCostoOpciones = [
  'mantenimiento', 'arriendo', 'servicio_internet', 'poliza_cumplimiento',
  'servicios_publicos_consumo', 'cambio_equipos_medida', 'seguro', 'otro_costo',
]

const tiposServicioOpciones = [
  { label: 'Representación', value: 'representacion' },
  { label: 'CGM', value: 'cgm' },
  { label: 'Administración Operación', value: 'administracion_operacion' },
  { label: 'Otro', value: 'otro' },
]

const TIPOS_LINEA_INGRESOS = [
  'ingreso_bruto', 'ajuste_xm', 'ajuste_unergy', 'ajuste_comercializacion',
  'intereses', 'otro_ingreso', 'despacho', 'ventas_en_bolsa',
  'compras_en_bolsa', 'redistribucion_ingresos', 'valor_a_pagar',
]
const TIPOS_LINEA_COSTOS = [
  'mantenimiento', 'arriendo', 'servicio_internet', 'poliza_cumplimiento',
  'servicios_publicos_consumo', 'cambio_equipos_medida', 'seguro', 'otro_costo',
  'comercializacion', 'representacion', 'cgm', 'administracion',
  'iva', 'retencion_fuente', 'reteica', 'ica_opex', 'otro_impuesto',
]

const ETIQUETAS = {
  ingreso_bruto: 'Ingreso Bruto', ajuste_xm: 'Ajuste Xm',
  ajuste_unergy: 'Ajuste Unergy', ajuste_comercializacion: 'Comercialización',
  intereses: 'Intereses', otro_ingreso: 'Otro Ingreso', despacho: 'Despacho',
  ventas_en_bolsa: 'Ventas en Bolsa', compras_en_bolsa: 'Compras en Bolsa',
  redistribucion_ingresos: 'Redistribución de Ingresos de acuerdo al Protocolo',
  mantenimiento: 'Mantenimiento', arriendo: 'Arriendo',
  servicio_internet: 'Servicio de Internet', poliza_cumplimiento: 'Póliza de Cumplimiento',
  servicios_publicos_consumo: 'Servicios Públicos Consumo de energía',
  cambio_equipos_medida: 'Cambio Equipos de Medida', seguro: 'Seguro',
  otro_costo: 'Otro Costo', comercializacion: 'Comercialización',
  representacion: 'Representación', cgm: 'CGM', administracion: 'Administración',
  iva: 'IVA', retencion_fuente: 'Retención en la Fuente', reteica: 'Reteica',
  ica_opex: 'ICA OPEX', otro_impuesto: 'Otro Impuesto', valor_a_pagar: 'Valor a Pagar',
}

const LABEL_SERVICIO = {
  representacion: 'Representación', cgm: 'CGM',
  administracion_operacion: 'Administración', otro: 'Otro',
}

// ─── Dialogs estado ───────────────────────────────────────────────────────────
const dialogEstado = ref(false)
const nuevoEstado = ref('')

// ─── Dialog resumen ───────────────────────────────────────────────────────────
const dialogResumen = ref(false)
const resumenForm = reactive({
  tasa_cambio: null,
  comprobante_contable_ref: '', consecutivo_inicial_ingresos: null,
  consecutivo_inicial_costos: null, fecha_inicio_proceso: null,
  fecha_firma: null, estado_resultados_url: '', observaciones_resultados: '',
})

function abrirEditResumen() {
  Object.assign(resumenForm, {
    tasa_cambio: liq.value.tasa_cambio ?? null,
    comprobante_contable_ref: liq.value.comprobante_contable_ref ?? '',
    consecutivo_inicial_ingresos: liq.value.consecutivo_inicial_ingresos ?? null,
    consecutivo_inicial_costos: liq.value.consecutivo_inicial_costos ?? null,
    fecha_inicio_proceso: liq.value.fecha_inicio_proceso ?? null,
    fecha_firma: liq.value.fecha_firma ?? null,
    estado_resultados_url: liq.value.estado_resultados_url ?? '',
    observaciones_resultados: liq.value.observaciones_resultados ?? '',
  })
  dialogResumen.value = true
}

// ─── Dialog costos ────────────────────────────────────────────────────────────
const dialogCosto = ref(false)
const costoEditId = ref(null)
const costoForm = reactive({
  tipo_costo: null, descripcion: '', proveedor: '',
  nro_soporte: '', soporte_url: '', valor_cop: null,
})

function abrirDialogCosto(c = null) {
  costoEditId.value = c?.id ?? null
  Object.assign(costoForm, {
    tipo_costo: c?.tipo_costo ?? null,
    descripcion: c?.descripcion ?? '',
    proveedor: c?.proveedor ?? '',
    nro_soporte: c?.nro_soporte ?? '',
    soporte_url: c?.soporte_url ?? '',
    valor_cop: c?.valor_cop ?? null,
  })
  dialogCosto.value = true
}

// ─── Dialog facturas ──────────────────────────────────────────────────────────
const dialogFactura = ref(false)
const facturaEditId = ref(null)
const facturaForm = reactive({
  tipo_servicio: null, numero_factura: '', nro_soporte: '',
  soporte_url: '', fecha_emision: null, fecha_vencimiento: null,
  estado: 'emitida', valor_cop: null,
})

function abrirDialogFactura(f = null) {
  facturaEditId.value = f?.id ?? null
  Object.assign(facturaForm, {
    tipo_servicio: f?.tipo_servicio ?? null,
    numero_factura: f?.numero_factura ?? '',
    nro_soporte: f?.nro_soporte ?? '',
    soporte_url: f?.soporte_url ?? '',
    fecha_emision: f?.fecha_emision ?? null,
    fecha_vencimiento: f?.fecha_vencimiento ?? null,
    estado: f?.estado ?? 'emitida',
    valor_cop: f?.valor_cop ?? null,
  })
  dialogFactura.value = true
}

// ─── Dialog mandatos ──────────────────────────────────────────────────────────
const dialogMandato = ref(false)
const mandatoEditId = ref(null)
const mandatoCtx = reactive({ tipo: '', piId: null, invNombre: '' })
const mandatoForm = reactive({
  numero_mandato: '', consecutivo: null, beneficiario_nombre: '',
  beneficiario_nit: '', pa_aplica: false, categoria_contable: '', observaciones: '',
})

function abrirDialogMandato(tipo, piId, invNombre, m = null) {
  mandatoEditId.value = m?.id ?? null
  Object.assign(mandatoCtx, { tipo, piId, invNombre })
  Object.assign(mandatoForm, {
    numero_mandato: m?.numero_mandato ?? '',
    consecutivo: m?.consecutivo ?? null,
    beneficiario_nombre: m?.beneficiario_nombre ?? '',
    beneficiario_nit: m?.beneficiario_nit ?? '',
    pa_aplica: m?.pa_aplica ?? false,
    categoria_contable: m?.categoria_contable ?? '',
    observaciones: m?.observaciones ?? '',
  })
  dialogMandato.value = true
}

// ─── Dialog líneas ────────────────────────────────────────────────────────────
const dialogLinea = ref(false)
const lineaEditId = ref(null)
const lineaCtx = reactive({ mandatoId: null, mandatoTipo: '' })
const lineaForm = reactive({
  tipo_linea: null, concepto: '', valor_cop: null,
  porcentaje: null, referencia_factura: '', orden: 0,
})

const tiposLineaActual = computed(() => {
  const lista = lineaCtx.mandatoTipo === 'ingresos' ? TIPOS_LINEA_INGRESOS : TIPOS_LINEA_COSTOS
  return lista.map(v => ({ label: ETIQUETAS[v] || v, value: v }))
})

function onTipoLineaChange() {
  if (lineaForm.tipo_linea) {
    lineaForm.concepto = ETIQUETAS[lineaForm.tipo_linea] || lineaForm.tipo_linea
  }
}

function abrirDialogLinea(mandatoId, mandatoTipo, l = null) {
  lineaEditId.value = l?.id ?? null
  Object.assign(lineaCtx, { mandatoId, mandatoTipo })
  Object.assign(lineaForm, {
    tipo_linea: l?.tipo_linea ?? null,
    concepto: l?.concepto ?? '',
    valor_cop: l?.valor_cop ?? null,
    porcentaje: l?.porcentaje ?? null,
    referencia_factura: l?.referencia_factura ?? '',
    orden: l?.orden ?? 0,
  })
  dialogLinea.value = true
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const TIPOS_INGRESO_BRUTO = new Set(['ingreso_bruto', 'despacho', 'ventas_en_bolsa', 'redistribucion_ingresos'])
const TIPOS_COMERCIALIZACION = new Set(['ajuste_comercializacion', 'comercializacion', 'compras_en_bolsa'])

const resumenCalculado = computed(() => {
  const mandatos = liq.value?.mandatos || []
  const costos = liq.value?.costos || []

  // Preferir mandatos del "Total" (inversionista null) para el nivel proyecto
  const ingTotal = mandatos.filter(m => m.tipo === 'ingresos' && !m.inversionista)
  const ingInv   = mandatos.filter(m => m.tipo === 'ingresos' &&  m.inversionista)
  const ingMandatos = ingTotal.length ? ingTotal : ingInv

  let ingresos_brutos = 0
  let comercializacion = 0
  let neto = 0

  for (const m of ingMandatos) {
    for (const l of m.lineas) {
      if (TIPOS_INGRESO_BRUTO.has(l.tipo_linea))   ingresos_brutos += l.valor_cop
      if (TIPOS_COMERCIALIZACION.has(l.tipo_linea)) comercializacion += Math.abs(l.valor_cop)
    }
    if (m.valor_neto_cop != null) neto += m.valor_neto_cop
  }

  // Costos operativos fijos = LiquidacionCosto a nivel proyecto
  const costos_op = costos.reduce((acc, c) => acc + c.valor_cop, 0)

  // Si no hay datos en mandatos, caer al campo almacenado manualmente
  if (!ingresos_brutos && !comercializacion && !neto) {
    return {
      ingresos_brutos: liq.value?.ingresos_energia_cop,
      comercializacion: liq.value?.costos_comercializacion_xm_cop,
      costos_op: costos_op || liq.value?.costos_operativos_cop,
      neto: liq.value?.ingreso_neto_cop,
    }
  }

  return { ingresos_brutos, comercializacion, costos_op, neto }
})

const inversionistasConDetalle = computed(() => {
  if (!proyectoInversionistas.value.length) return []
  const mandatos = liq.value?.mandatos || []
  return proyectoInversionistas.value.map(pi => ({
    id: pi.id,
    nombre: pi.cliente_nombre,
    porcentaje: pi.porcentaje_participacion,
    es_patrimonio_autonomo: pi.es_patrimonio_autonomo,
    mandatosIngresos: mandatos.filter(m => m.inversionista?.id === pi.id && m.tipo === 'ingresos'),
    mandatosCostos: mandatos.filter(m => m.inversionista?.id === pi.id && m.tipo === 'costos'),
  }))
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(v)
}
function pct(v) {
  if (v == null) return '—'
  return (v * 100).toFixed(4) + '%'
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
function facturaEstadoSeverity(e) {
  return { emitida: 'info', pagada: 'success', vencida: 'danger' }[e] || 'secondary'
}
function isoDate(v) {
  if (!v) return null
  if (typeof v === 'string') return v
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Carga ────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/liquidaciones/${route.params.id}`)
    liq.value = data
    nuevoEstado.value = data.estado
  } catch (e) {
    console.error('[LiquidacionDetail] Error:', e?.response?.status, e?.response?.data ?? e)
    toast.add({
      severity: 'error',
      summary: `Error ${e?.response?.status || 'red'} — liq ${route.params.id}`,
      detail: JSON.stringify(e?.response?.data ?? e?.message ?? 'sin detalle').slice(0, 300),
      life: 10000
    })
  } finally {
    loading.value = false
  }

  if (liq.value?.proyecto_id) {
    try {
      const r = await api.get(`/proyectos/${liq.value.proyecto_id}/inversionistas`)
      const raw = r.data
      proyectoInversionistas.value = Array.isArray(raw) ? raw : (raw.items ?? [])
    } catch (e) {
      console.error('[LiquidacionDetail] Error cargando inversionistas:', e?.response?.status, e?.response?.data ?? e)
    }
  }
}

// ─── Guardar estado ───────────────────────────────────────────────────────────
async function guardarEstado() {
  guardando.value = true
  try {
    await api.patch(`/liquidaciones/${route.params.id}`, { estado: nuevoEstado.value })
    liq.value.estado = nuevoEstado.value
    dialogEstado.value = false
    toast.add({ severity: 'success', summary: 'Estado actualizado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

// ─── Guardar resumen ──────────────────────────────────────────────────────────
async function guardarResumen() {
  guardando.value = true
  try {
    const payload = {}
    const keys = Object.keys(resumenForm)
    for (const k of keys) {
      const v = resumenForm[k]
      // Incluir números (incluso 0), strings no vacíos, booleans, fechas
      if (v !== null && v !== undefined) {
        if (typeof v === 'string') {
          payload[k] = v || null  // convertir string vacío a null
        } else if (v instanceof Date) {
          payload[k] = isoDate(v)
        } else {
          payload[k] = v
        }
      }
    }
    await api.patch(`/liquidaciones/${route.params.id}`, payload)
    // Recargar para asegurar consistencia con el servidor
    await load()
    dialogResumen.value = false
    toast.add({ severity: 'success', summary: 'Resumen actualizado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

// ─── Datos XM ────────────────────────────────────────────────────────────────
const autoPopulatingXM = ref(false)

async function autoPopulateXM() {
  autoPopulatingXM.value = true
  try {
    const { data } = await api.post(`/liquidaciones/${route.params.id}/xm-datos/auto-populate`)
    if (data.xm_datos?.length) {
      liq.value.xm_datos = data.xm_datos
      toast.add({ severity: 'success', summary: 'Datos XM poblados', detail: data.msg, life: 5000 })
    } else {
      toast.add({ severity: 'warn', summary: 'Sin datos', detail: data.msg, life: 4000 })
    }
  } catch (e) {
    const msg = e.response?.data?.detail || 'Error al auto-poblar datos XM'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    autoPopulatingXM.value = false
  }
}

async function deleteXMDato(datoId) {
  if (!confirm('¿Eliminar este dato XM?')) return
  try {
    await api.delete(`/liquidaciones/${route.params.id}/xm-datos/${datoId}`)
    liq.value.xm_datos = (liq.value.xm_datos || []).filter(x => x.id !== datoId)
    toast.add({ severity: 'success', summary: 'Dato XM eliminado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Costos ───────────────────────────────────────────────────────────────────
async function guardarCosto() {
  if (!costoForm.tipo_costo || costoForm.valor_cop == null) {
    toast.add({ severity: 'warn', summary: 'Completa tipo y valor', life: 2000 }); return
  }
  guardando.value = true
  try {
    const payload = { ...costoForm }
    if (costoEditId.value) {
      const { data } = await api.patch(`/liquidaciones/${route.params.id}/costos/${costoEditId.value}`, payload)
      const idx = liq.value.costos.findIndex(c => c.id === costoEditId.value)
      if (idx >= 0) liq.value.costos[idx] = data
    } else {
      const { data } = await api.post(`/liquidaciones/${route.params.id}/costos`, payload)
      liq.value.costos = [...(liq.value.costos || []), data]
    }
    dialogCosto.value = false
    toast.add({ severity: 'success', summary: costoEditId.value ? 'Costo actualizado' : 'Costo agregado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el costo', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarCosto(id) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/costos/${id}`)
    liq.value.costos = liq.value.costos.filter(c => c.id !== id)
    toast.add({ severity: 'success', summary: 'Costo eliminado', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Facturas ─────────────────────────────────────────────────────────────────
async function guardarFactura() {
  if (!facturaForm.tipo_servicio || facturaForm.valor_cop == null) {
    toast.add({ severity: 'warn', summary: 'Completa tipo y valor', life: 2000 }); return
  }
  guardando.value = true
  try {
    const payload = {
      ...facturaForm,
      fecha_emision: isoDate(facturaForm.fecha_emision),
      fecha_vencimiento: isoDate(facturaForm.fecha_vencimiento),
    }
    if (facturaEditId.value) {
      const { data } = await api.patch(`/liquidaciones/${route.params.id}/facturas/${facturaEditId.value}`, payload)
      const idx = liq.value.facturas.findIndex(f => f.id === facturaEditId.value)
      if (idx >= 0) liq.value.facturas[idx] = data
    } else {
      const { data } = await api.post(`/liquidaciones/${route.params.id}/facturas`, payload)
      liq.value.facturas = [...(liq.value.facturas || []), data]
    }
    dialogFactura.value = false
    toast.add({ severity: 'success', summary: facturaEditId.value ? 'Factura actualizada' : 'Factura agregada', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarFactura(id) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/facturas/${id}`)
    liq.value.facturas = liq.value.facturas.filter(f => f.id !== id)
    toast.add({ severity: 'success', summary: 'Factura eliminada', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Mandatos ─────────────────────────────────────────────────────────────────
async function guardarMandato() {
  guardando.value = true
  try {
    const payload = {
      tipo: mandatoCtx.tipo,
      inversionista_id: mandatoCtx.piId,
      numero_mandato: mandatoForm.numero_mandato || null,
      consecutivo: mandatoForm.consecutivo ?? null,
      beneficiario_nombre: mandatoForm.beneficiario_nombre || null,
      beneficiario_nit: mandatoForm.beneficiario_nit || null,
      pa_aplica: mandatoForm.pa_aplica,
      categoria_contable: mandatoForm.categoria_contable || null,
      observaciones: mandatoForm.observaciones || null,
    }
    if (mandatoEditId.value) {
      await api.patch(`/liquidaciones/${route.params.id}/mandatos/${mandatoEditId.value}`, payload)
    } else {
      await api.post(`/liquidaciones/${route.params.id}/mandatos`, payload)
    }
    dialogMandato.value = false
    toast.add({ severity: 'success', summary: mandatoEditId.value ? 'Mandato actualizado' : 'Mandato creado', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el mandato', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarMandato(id) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/mandatos/${id}`)
    toast.add({ severity: 'success', summary: 'Mandato eliminado', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

// ─── Líneas ───────────────────────────────────────────────────────────────────
async function guardarLinea() {
  if (!lineaForm.tipo_linea || lineaForm.valor_cop == null) {
    toast.add({ severity: 'warn', summary: 'Completa tipo y valor', life: 2000 }); return
  }
  guardando.value = true
  try {
    const payload = {
      tipo_linea: lineaForm.tipo_linea,
      concepto: lineaForm.concepto || ETIQUETAS[lineaForm.tipo_linea] || lineaForm.tipo_linea,
      valor_cop: lineaForm.valor_cop,
      porcentaje: lineaForm.porcentaje ?? null,
      referencia_factura: lineaForm.referencia_factura || null,
      orden: lineaForm.orden ?? 0,
    }
    const liqId = route.params.id
    const mId = lineaCtx.mandatoId
    if (lineaEditId.value) {
      await api.patch(`/liquidaciones/${liqId}/mandatos/${mId}/lineas/${lineaEditId.value}`, payload)
    } else {
      await api.post(`/liquidaciones/${liqId}/mandatos/${mId}/lineas`, payload)
    }
    dialogLinea.value = false
    toast.add({ severity: 'success', summary: lineaEditId.value ? 'Línea actualizada' : 'Línea agregada', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la línea', life: 3000 })
  } finally {
    guardando.value = false
  }
}

async function eliminarLinea(mandatoId, lineaId) {
  try {
    await api.delete(`/liquidaciones/${route.params.id}/mandatos/${mandatoId}/lineas/${lineaId}`)
    toast.add({ severity: 'success', summary: 'Línea eliminada', life: 2000 })
    await load()
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

onMounted(load)
</script>
