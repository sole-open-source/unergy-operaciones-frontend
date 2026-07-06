<template>
  <div v-if="contrato" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Button icon="pi pi-arrow-left" text @click="$router.back()" class="-ml-2" />
        <div>
          <h2 class="text-xl font-bold text-gray-800">
            {{ contrato.nombre_interno || contrato.numero_codigo_contrato || 'Contrato PPA' }}
          </h2>
          <div class="flex items-center gap-2 mt-0.5">
            <span v-if="contrato.numero_codigo_contrato" class="text-xs text-gray-400 font-mono">
              {{ contrato.numero_codigo_contrato }}
            </span>
            <Tag value="PPA" severity="warning" class="text-xs" />
            <Tag :value="(contrato.tipo_contrato === 'compra') ? 'Compra' : 'Venta'"
              :style="(contrato.tipo_contrato === 'compra')
                ? 'background:#915BD8;color:#fff'
                : 'background:#F6FF72;color:#2C2039'" class="text-xs" />
            <span class="text-xs text-gray-400">{{ contrato.proyectos?.length || 0 }} proyectos</span>
          </div>
        </div>
      </div>
      <Button label="Editar contrato" icon="pi pi-pencil" severity="secondary" outlined
        @click="abrirEdicionCompleta" />
    </div>

    <!-- Tabs -->
    <TabView>
      <!-- ══ DATOS ══ -->
      <TabPanel header="Datos">
        <div class="space-y-6 p-2">

          <!-- Identificación -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide">Identificación</p>
              <Button v-if="!editandoId" icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="iniciarEdicionId" />
              <div v-else class="flex gap-2">
                <Button label="Cancelar" size="small" text severity="secondary" @click="cancelarEdicionId" />
                <Button label="Guardar" icon="pi pi-check" size="small" :loading="guardandoId"
                  @click="guardarId" />
              </div>
            </div>
            <!-- Modo lectura -->
            <div v-if="!editandoId" class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Nombre interno" :value="contrato.nombre_interno" />
              <InfoField label="Número de contrato" :value="contrato.numero_codigo_contrato" />
            </div>
            <!-- Modo edición -->
            <div v-else class="grid grid-cols-2 gap-4 max-w-xl">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">Nombre interno</label>
                <InputText v-model="formId.nombre_interno" placeholder="Ej: Terpel 1" class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">Número de contrato</label>
                <InputText v-model="formId.numero_codigo_contrato" placeholder="Ej: UNERGY 001-2023" class="w-full" />
              </div>
            </div>
          </div>

          <Divider />

          <!-- Partes -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide">Partes del contrato</p>
              <Button v-if="!editandoPartes" icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="iniciarEdicionPartes" />
              <div v-else class="flex gap-2">
                <Button label="Cancelar" size="small" text severity="secondary" @click="cancelarEdicionPartes" />
                <Button label="Guardar" icon="pi pi-check" size="small" :loading="guardandoPartes"
                  @click="guardarPartes" />
              </div>
            </div>
            <!-- Modo lectura -->
            <div v-if="!editandoPartes" class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Comprador" :value="contrato.comprador_nombre" />
              <InfoField label="NIT comprador" :value="contrato.comprador_nit" />
              <div />
              <InfoField label="Vendedor" :value="contrato.vendedor_nombre" />
              <InfoField label="NIT vendedor" :value="contrato.vendedor_nit" />
            </div>
            <!-- Modo edición -->
            <div v-else class="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
              <div class="space-y-3">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Comprador</span>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">Nombre / Razón social</label>
                  <InputText v-model="formPartes.comprador_nombre" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">NIT</label>
                  <InputText v-model="formPartes.comprador_nit" class="w-full" />
                </div>
              </div>
              <div class="space-y-3">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vendedor</span>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">Nombre / Razón social</label>
                  <InputText v-model="formPartes.vendedor_nombre" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-600">NIT</label>
                  <InputText v-model="formPartes.vendedor_nit" class="w-full" />
                </div>
              </div>
            </div>
          </div>

          <Divider />

          <!-- Vigencia -->
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Vigencia</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Fecha inicio" :value="formatFecha(contrato.fecha_inicio)" />
              <InfoField label="Fecha fin" :value="formatFecha(contrato.fecha_fin)" />
              <InfoField label="Duración" :value="duracion" />
            </div>
          </div>

          <Divider />

          <!-- Condiciones comerciales -->
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Condiciones comerciales</p>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Índice de indexación" :value="contrato.indice_indexacion" />
              <InfoField label="Periodicidad indexación" :value="contrato.periodicidad_indexacion" />
              <InfoField label="Período base indexación" :value="contrato.periodo_indexacion_base" />
              <InfoField label="Valor indexación base" :value="contrato.valor_indexacion_base != null ? String(contrato.valor_indexacion_base) : null" />
              <InfoField label="Periodicidad facturación" :value="contrato.periodicidad_facturacion" />
              <InfoField label="Tiempo de pago (días)" :value="contrato.tiempo_pago != null ? String(contrato.tiempo_pago) : null" />
              <div v-if="contrato.condiciones_pago" class="col-span-2 md:col-span-3 flex flex-col gap-0.5">
                <span class="text-xs font-medium" style="color:#9b89b5">Condiciones de pago</span>
                <span class="text-sm" style="color:#2C2039">{{ contrato.condiciones_pago }}</span>
              </div>
            </div>
          </div>

          <Divider />

          <!-- GESCON / SIC -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide">GESCON / SIC</p>
              <Button v-if="!editandoGescon" icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="editandoGescon = true" />
              <div v-else class="flex gap-2">
                <Button label="Cancelar" size="small" text severity="secondary" @click="editandoGescon = false" />
                <Button label="Guardar" size="small" icon="pi pi-check" :loading="guardandoGescon" @click="guardarGescon" />
              </div>
            </div>
            <!-- Modo lectura -->
            <div v-if="!editandoGescon" class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <InfoField label="Código SIC" :value="contrato.codigo_sic" />
              <InfoField label="Código GESCON" :value="contrato.gescon_codigo" />
              <InfoField label="GESCON inicio" :value="formatFecha(contrato.gescon_fecha_inicio)" />
              <InfoField label="GESCON fin" :value="formatFecha(contrato.gescon_fecha_fin)" />
              <InfoField label="Precio GESCON" :value="contrato.gescon_precio != null ? `$${Number(contrato.gescon_precio).toFixed(4)}` : null" />
              <InfoField label="Cantidades GESCON (kWh)" :value="contrato.gescon_cantidades_kwh != null ? Number(contrato.gescon_cantidades_kwh).toLocaleString('es-CO') : null" />
            </div>
            <!-- Modo edición -->
            <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">Código SIC</label>
                <InputText v-model="formGescon.codigo_sic" class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">Código GESCON</label>
                <InputText v-model="formGescon.gescon_codigo" class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">Precio GESCON ($/kWh)</label>
                <InputNumber v-model="formGescon.gescon_precio" :maxFractionDigits="4" class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">GESCON inicio</label>
                <DatePicker v-model="formGescon.gescon_fecha_inicio" dateFormat="yy-mm-dd" showIcon class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">GESCON fin</label>
                <DatePicker v-model="formGescon.gescon_fecha_fin" dateFormat="yy-mm-dd" showIcon class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-gray-600">Cantidades GESCON (kWh)</label>
                <InputNumber v-model="formGescon.gescon_cantidades_kwh" :maxFractionDigits="3" class="w-full" />
              </div>
            </div>
          </div>

          <Divider />

          <!-- Detalles operacionales y contractuales -->
          <div>
            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Detalles Operacionales y Contractuales</p>
            <div class="grid grid-cols-1 gap-4 text-sm">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-medium" style="color:#9b89b5">Alcance del servicio</span>
                <span class="text-sm whitespace-pre-line" style="color:#2C2039">{{ contrato.service_scope || '—' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-medium" style="color:#9b89b5">Términos específicos del servicio</span>
                <span class="text-sm whitespace-pre-line" style="color:#2C2039">{{ contrato.specific_service_terms || '—' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-medium" style="color:#9b89b5">SLAs (Acuerdos de nivel de servicio)</span>
                <span class="text-sm whitespace-pre-line" style="color:#2C2039">{{ contrato.slas || '—' }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-medium" style="color:#9b89b5">Responsabilidades</span>
                <span class="text-sm whitespace-pre-line" style="color:#2C2039">{{ contrato.responsibilities || '—' }}</span>
              </div>
            </div>
          </div>

        </div>
      </TabPanel>

      <!-- ══ CANTIDADES ══ -->
      <TabPanel :header="`Cantidades (${contrato.compromisos_energia?.length || 0})`">
        <div class="flex justify-between items-center mb-3">
          <SelectButton v-if="!editandoCantidades" v-model="vistaCantidades" :options="VISTAS" optionLabel="label" optionValue="value" />
          <span v-else />
          <div class="flex gap-2">
            <template v-if="!editandoCantidades">
              <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="editandoCantidades = true" />
            </template>
            <template v-else>
              <Button label="Cancelar" size="small" text severity="secondary"
                @click="editandoCantidades = false; energiaPaste = ''; energiaRows = []; energiaError = ''" />
              <Button label="Guardar" icon="pi pi-check" size="small" :loading="guardandoCantidades"
                :disabled="!energiaRows.length" @click="guardarCantidades" />
            </template>
          </div>
        </div>

        <!-- Modo edición cantidades -->
        <template v-if="editandoCantidades">
          <p class="text-xs text-gray-400 mb-2">
            Copia las columnas <strong>Año · Mes · Mín · Máx · Plantas contrato</strong> desde Excel y pégalas aquí
            (Mín/Máx en MWh/mes; <strong>Plantas contrato</strong> = nº de plantas que el contrato exige ese mes).
            Máx y Plantas contrato son opcionales. Esto <strong>reemplazará</strong> todos los compromisos actuales.
          </p>
          <Textarea v-model="energiaPaste" rows="7"
            placeholder="2024&#9;Enero&#9;90&#9;180&#9;4&#10;2024&#9;Febrero&#9;90&#9;180&#9;4"
            class="w-full font-mono text-xs" @paste="onPasteEnergia" />
          <div class="flex items-center gap-2 mt-2">
            <Button label="Procesar" icon="pi pi-refresh" size="small" severity="secondary" outlined @click="parseEnergia" />
            <Button v-if="energiaRows.length" label="Limpiar" icon="pi pi-times" size="small" severity="danger" text
              @click="energiaRows = []; energiaPaste = ''; energiaError = ''" />
            <span v-if="energiaRows.length" class="text-xs text-green-600 font-medium">{{ energiaRows.length }} filas listas</span>
            <span v-if="energiaError" class="text-xs text-red-400">{{ energiaError }}</span>
          </div>
          <div v-if="energiaRows.length" class="mt-3 border border-gray-100 rounded-lg overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-1.5 text-left text-gray-500 font-medium">Año</th>
                  <th class="px-3 py-1.5 text-left text-gray-500 font-medium">Mes</th>
                  <th class="px-3 py-1.5 text-right text-gray-500 font-medium">Mín (MWh)</th>
                  <th class="px-3 py-1.5 text-right text-gray-500 font-medium">Máx (MWh)</th>
                  <th class="px-3 py-1.5 text-right text-gray-500 font-medium">Plantas contrato</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in energiaRows.slice(0, 8)" :key="i" class="border-t border-gray-50">
                  <td class="px-3 py-1 text-gray-700">{{ r.año }}</td>
                  <td class="px-3 py-1 text-gray-700">{{ MESES[r.mes - 1] }}</td>
                  <td class="px-3 py-1 text-right text-gray-700">{{ r.energia_minima }}</td>
                  <td class="px-3 py-1 text-right text-gray-700">{{ r.energia_maxima ?? '—' }}</td>
                  <td class="px-3 py-1 text-right text-gray-700">{{ r.cantidad_proyectos ?? '—' }}</td>
                </tr>
                <tr v-if="energiaRows.length > 8" class="border-t border-gray-50">
                  <td colspan="5" class="px-3 py-1 text-gray-300 italic">… y {{ energiaRows.length - 8 }} filas más</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Modo lectura cantidades -->
        <template v-else>
          <DataTable
            :value="vistaCantidades === 'anual' ? cantidadesAnuales : cantidadesMensuales"
            stripedRows class="text-sm" paginator :rows="24"
            :rowsPerPageOptions="[12, 24, 60, 120]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            emptyMessage="Sin compromisos de energía registrados."
          >
            <Column field="año" header="Año" style="width:70px" />
            <Column v-if="vistaCantidades === 'mensual'" header="Mes" style="width:130px">
              <template #body="{ data }">{{ MESES[data.mes - 1] }}</template>
            </Column>
            <Column :header="vistaCantidades === 'anual' ? 'Mín (MWh/año)' : 'Mín (MWh/mes)'">
              <template #body="{ data }">
                {{ data.energia_minima != null ? Number(data.energia_minima).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }}
              </template>
            </Column>
            <Column :header="vistaCantidades === 'anual' ? 'Máx (MWh/año)' : 'Máx (MWh/mes)'">
              <template #body="{ data }">
                {{ data.energia_maxima != null ? Number(data.energia_maxima).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—' }}
              </template>
            </Column>
            <Column style="width:150px">
              <template #header>
                <span v-tooltip.top="'Plantas registradas y despachando energía al contrato. La calcula la plataforma vía GESCON.'">
                  {{ vistaCantidades === 'anual' ? 'Plantas inscritas (máx)' : 'Plantas inscritas' }}
                </span>
              </template>
              <template #body="{ data }">
                {{ data.plantas_inscritas != null ? data.plantas_inscritas : '—' }}
              </template>
            </Column>
            <Column :header="vistaCantidades === 'anual' ? 'Plantas contrato (máx)' : 'Plantas contrato'" style="width:150px">
              <template #body="{ data }">
                {{ data.cantidad_proyectos != null ? data.cantidad_proyectos : '—' }}
              </template>
            </Column>
            <Column header="Rango">
              <template #body="{ data }">
                <div v-if="data.energia_minima != null && data.energia_maxima != null" class="text-xs text-gray-400">
                  {{ ((data.energia_maxima / data.energia_minima - 1) * 100).toFixed(0) }}% flex
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </TabPanel>

      <!-- ══ TARIFAS ══ -->
      <TabPanel :header="`Tarifas (${contrato.tarifas?.length || 0})`">
        <div class="flex justify-between items-center mb-3">
          <SelectButton v-if="!editandoTarifas" v-model="vistaTarifas" :options="VISTAS" optionLabel="label" optionValue="value" />
          <span v-else />
          <div class="flex gap-2">
            <template v-if="!editandoTarifas">
              <Button icon="pi pi-pencil" label="Editar" size="small" text severity="secondary"
                @click="editandoTarifas = true" />
            </template>
            <template v-else>
              <Button label="Cancelar" size="small" text severity="secondary"
                @click="editandoTarifas = false; tarifasPaste = ''; tarifasRows = []; tarifasError = ''" />
              <Button label="Guardar" icon="pi pi-check" size="small" :loading="guardandoTarifas"
                :disabled="!tarifasRows.length" @click="guardarTarifas" />
            </template>
          </div>
        </div>

        <!-- Modo edición tarifas -->
        <template v-if="editandoTarifas">
          <p class="text-xs text-gray-400 mb-2">
            Copia las columnas <strong>Año · Mes · Tarifa</strong> desde Excel y pégalas aquí.
            Esto <strong>reemplazará</strong> todas las tarifas actuales.
          </p>
          <Textarea v-model="tarifasPaste" rows="7"
            placeholder="2024&#9;Enero&#9;460&#10;2024&#9;Febrero&#9;460"
            class="w-full font-mono text-xs" @paste="onPasteTarifas" />
          <div class="flex items-center gap-2 mt-2">
            <Button label="Procesar" icon="pi pi-refresh" size="small" severity="secondary" outlined @click="parseTarifas" />
            <Button v-if="tarifasRows.length" label="Limpiar" icon="pi pi-times" size="small" severity="danger" text
              @click="tarifasRows = []; tarifasPaste = ''; tarifasError = ''" />
            <span v-if="tarifasRows.length" class="text-xs text-green-600 font-medium">{{ tarifasRows.length }} filas listas</span>
            <span v-if="tarifasError" class="text-xs text-red-400">{{ tarifasError }}</span>
          </div>
          <div v-if="tarifasRows.length" class="mt-3 border border-gray-100 rounded-lg overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-1.5 text-left text-gray-500 font-medium">Año</th>
                  <th class="px-3 py-1.5 text-left text-gray-500 font-medium">Mes</th>
                  <th class="px-3 py-1.5 text-right text-gray-500 font-medium">Tarifa ($/kWh)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in tarifasRows.slice(0, 8)" :key="i" class="border-t border-gray-50">
                  <td class="px-3 py-1 text-gray-700">{{ r.año }}</td>
                  <td class="px-3 py-1 text-gray-700">{{ MESES[r.mes - 1] }}</td>
                  <td class="px-3 py-1 text-right text-gray-700">{{ r.tarifa }}</td>
                </tr>
                <tr v-if="tarifasRows.length > 8" class="border-t border-gray-50">
                  <td colspan="3" class="px-3 py-1 text-gray-300 italic">… y {{ tarifasRows.length - 8 }} filas más</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- Modo lectura tarifas -->
        <template v-else>
          <DataTable
            :value="vistaTarifas === 'anual' ? tarifasAnuales : tarifasMensuales"
            stripedRows class="text-sm" paginator :rows="24"
            :rowsPerPageOptions="[12, 24, 60, 120]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            emptyMessage="Sin tarifas registradas."
          >
            <Column field="año" header="Año" style="width:70px" />
            <Column v-if="vistaTarifas === 'mensual'" header="Mes" style="width:130px">
              <template #body="{ data }">{{ MESES[data.mes - 1] }}</template>
            </Column>
            <Column header="Tarifa (COP/kWh)">
              <template #body="{ data }">
                <span class="font-mono font-medium text-amber-700">
                  {{ data.tarifa != null ? `$${Number(data.tarifa).toLocaleString('es-CO', { maximumFractionDigits: 2 })}` : '—' }}
                </span>
                <span v-if="vistaTarifas === 'anual' && !data._uniforme" class="text-xs text-gray-400 ml-1">prom.</span>
              </template>
            </Column>
            <Column header="Variación">
              <template #body="{ data, index }">
                <template v-if="index > 0">
                  <span
                    v-if="currentTarifas[index - 1]?.tarifa != null && data.tarifa != null"
                    class="text-xs font-medium"
                    :class="data.tarifa < currentTarifas[index-1].tarifa ? 'text-green-600' : data.tarifa > currentTarifas[index-1].tarifa ? 'text-red-500' : 'text-gray-400'"
                  >
                    {{ variacion(currentTarifas[index-1].tarifa, data.tarifa) }}
                  </span>
                </template>
              </template>
            </Column>
          </DataTable>
        </template>
      </TabPanel>

      <!-- ══ CONTRATOS ASIC ══ -->
      <TabPanel :header="`Contratos ASIC (${asicFiltrados.length})`">
        <div class="flex justify-between items-center mb-3">
          <span class="text-xs text-gray-400">{{ asicRows.length }} registros totales</span>
          <SelectButton v-model="vistaAsic"
            :options="[{ label: 'Vigentes', value: 'vigentes' }, { label: 'Históricos', value: 'historicos' }]"
            optionLabel="label" optionValue="value" />
        </div>
        <div v-if="loadingAsic" class="flex items-center justify-center py-16 text-gray-400 gap-2">
          <i class="pi pi-spin pi-spinner" />
          <span class="text-sm">Cargando registros ASIC…</span>
        </div>
        <DataTable
          v-else
          :value="asicFiltrados"
          stripedRows
          class="text-sm"
          emptyMessage="Sin registros ASIC para este contrato."
          sortField="fecha_solicitud"
          :sortOrder="-1"
        >
          <Column field="codigo_sic_contrato" header="Código SIC" sortable style="width:110px">
            <template #body="{ data }">
              <span class="font-mono text-xs">{{ data.codigo_sic_contrato || '—' }}</span>
            </template>
          </Column>
          <Column field="planta_nombre" header="Planta" sortable>
            <template #body="{ data }">
              <router-link v-if="data.proyecto_id" :to="`/proyectos/${data.proyecto_id}`"
                class="text-amber-700 hover:underline">
                {{ data.planta_nombre || data.proyecto_id }}
              </router-link>
              <span v-else class="text-gray-400">—</span>
            </template>
          </Column>
          <Column field="tipo_solicitud" header="Tipo" style="width:120px">
            <template #body="{ data }">
              <Tag
                :value="data.tipo_solicitud"
                :severity="{ registro: 'success', modificacion: 'info', terminacion: 'danger', desistimiento: 'secondary' }[data.tipo_solicitud] || 'secondary'"
                class="text-xs capitalize"
              />
            </template>
          </Column>
          <Column field="estado_solicitud" header="Estado" style="width:110px">
            <template #body="{ data }">
              <Tag
                :value="data.estado_solicitud.replace('_', ' ')"
                :severity="{ publicado: 'success', en_proceso: 'warn', rechazado: 'danger', desistido: 'secondary' }[data.estado_solicitud] || 'secondary'"
                class="text-xs capitalize"
              />
            </template>
          </Column>
          <Column field="fecha_inicio" header="Inicio" sortable style="width:100px" />
          <Column field="fecha_fin" header="Fin" sortable style="width:100px" />
          <Column field="porcentaje_despacho" header="% Despacho" style="width:110px">
            <template #body="{ data }">
              <span v-if="data.porcentaje_despacho != null"
                :class="data.porcentaje_despacho > 100 ? 'text-red-600 font-semibold' : ''">
                {{ Number(data.porcentaje_despacho).toFixed(1) }}%
              </span>
              <span v-else class="text-gray-400">—</span>
            </template>
          </Column>
          <Column field="fecha_solicitud" header="F. solicitud" sortable style="width:120px" />
          <Column field="observaciones" header="Observaciones">
            <template #body="{ data }">
              <span class="text-xs text-gray-500">{{ data.observaciones || '—' }}</span>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ══ PROYECTOS ══ -->
      <TabPanel :header="`Proyectos (${contrato.proyectos?.length || 0})`">
        <div class="flex justify-end mb-3">
          <Button label="Asociar proyecto" icon="pi pi-plus" size="small" severity="secondary" outlined
            @click="abrirAsociar" />
        </div>
        <div v-if="contrato.proyectos?.length" class="p-2">
          <DataTable :value="contrato.proyectos" stripedRows class="text-sm" rowHover>
            <Column field="id" header="ID" style="width:60px" />
            <Column field="nombre_comercial" header="Nombre comercial" sortable>
              <template #body="{ data }">
                <router-link :to="`/proyectos/${data.id}`"
                  class="font-medium text-amber-700 hover:underline">
                  {{ data.nombre_comercial }}
                </router-link>
              </template>
            </Column>
          </DataTable>
        </div>
        <div v-else class="flex flex-col items-center py-16 gap-2 text-gray-400">
          <i class="pi pi-sitemap text-3xl" />
          <span class="text-sm">Sin proyectos asociados</span>
        </div>
      </TabPanel>
    </TabView>

    <!-- Wizard edición completa -->
    <PPAContratoWizard v-if="showWizard" :visible="showWizard"
      :initialData="wizardInitialData"
      :editandoId="wizardEditandoId"
      @cerrar="showWizard = false"
      @editado="onWizardEditado"
      @creado="onWizardCreado" />

    <!-- Dialog asociar proyecto -->
    <Dialog v-model:visible="showAsociar" header="Asociar proyecto" modal :style="{ width: '420px' }">
      <div class="flex flex-col gap-2 pt-1">
        <label class="text-xs font-medium text-gray-600">Buscar proyecto</label>
        <Select
          v-model="proyectoSeleccionado"
          :options="todosProyectosDisponibles"
          optionLabel="nombre_comercial"
          placeholder="Seleccionar proyecto…"
          filter
          filterPlaceholder="Buscar…"
          class="w-full"
          :loading="cargandoProyectos"
        />
      </div>
      <template #footer>
        <Button label="Cancelar" severity="secondary" outlined @click="showAsociar = false" />
        <Button label="Asociar" icon="pi pi-check" :loading="asociando"
          :disabled="!proyectoSeleccionado" @click="asociarProyecto" />
      </template>
    </Dialog>
  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="flex items-center justify-center py-24 text-gray-400 gap-3">
    <i class="pi pi-spin pi-spinner text-xl" />
    <span>Cargando contrato…</span>
  </div>

  <!-- Error -->
  <div v-else class="flex flex-col items-center py-24 text-gray-400 gap-2">
    <i class="pi pi-exclamation-triangle text-3xl text-amber-400" />
    <span class="text-sm">No se encontró el contrato</span>
    <Button label="Volver" text @click="$router.back()" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Divider from 'primevue/divider'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InfoField from '@/components/InfoField.vue'
import PPAContratoWizard from '@/views/Contratos/PPAContratoWizard.vue'
import api from '@/api/client'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const VISTAS = [{ label: 'Mensual', value: 'mensual' }, { label: 'Anual', value: 'anual' }]

const route = useRoute()
const toast = useToast()
const contrato = ref(null)
const loading = ref(true)

// Edición inline de identificación
const editandoId = ref(false)
const guardandoId = ref(false)
const formId = reactive({ nombre_interno: null, numero_codigo_contrato: null })

function iniciarEdicionId() {
  formId.nombre_interno = contrato.value.nombre_interno
  formId.numero_codigo_contrato = contrato.value.numero_codigo_contrato
  editandoId.value = true
}

function cancelarEdicionId() {
  editandoId.value = false
}

async function guardarId() {
  guardandoId.value = true
  try {
    const { data } = await api.patch(`/ppa/${contrato.value.id}`, {
      nombre_interno: formId.nombre_interno || null,
      numero_codigo_contrato: formId.numero_codigo_contrato || null,
    })
    contrato.value = { ...contrato.value, ...data }
    editandoId.value = false
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Identificación actualizada', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoId.value = false
  }
}

// Edición inline de GESCON
const editandoGescon = ref(false)
const guardandoGescon = ref(false)
const formGescon = reactive({
  codigo_sic: null,
  gescon_codigo: null,
  gescon_fecha_inicio: null,
  gescon_fecha_fin: null,
  gescon_precio: null,
  gescon_cantidades_kwh: null,
})

function toISODate(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

async function guardarGescon() {
  guardandoGescon.value = true
  try {
    const payload = {
      codigo_sic: formGescon.codigo_sic || null,
      gescon_codigo: formGescon.gescon_codigo || null,
      gescon_fecha_inicio: toISODate(formGescon.gescon_fecha_inicio),
      gescon_fecha_fin: toISODate(formGescon.gescon_fecha_fin),
      gescon_precio: formGescon.gescon_precio,
      gescon_cantidades_kwh: formGescon.gescon_cantidades_kwh,
    }
    await api.patch(`/ppa/${contrato.value.id}`, payload)
    Object.assign(contrato.value, payload)
    editandoGescon.value = false
    toast.add({ severity: 'success', summary: 'GESCON actualizado', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoGescon.value = false
  }
}

// Edición inline de partes
const editandoPartes = ref(false)
const guardandoPartes = ref(false)
const formPartes = reactive({ comprador_nombre: null, comprador_nit: null, vendedor_nombre: null, vendedor_nit: null })

function iniciarEdicionPartes() {
  formPartes.comprador_nombre = contrato.value.comprador_nombre
  formPartes.comprador_nit = contrato.value.comprador_nit
  formPartes.vendedor_nombre = contrato.value.vendedor_nombre
  formPartes.vendedor_nit = contrato.value.vendedor_nit
  editandoPartes.value = true
}

function cancelarEdicionPartes() {
  editandoPartes.value = false
}

async function guardarPartes() {
  guardandoPartes.value = true
  try {
    const { data } = await api.patch(`/ppa/${contrato.value.id}`, formPartes)
    contrato.value = { ...contrato.value, ...data }
    editandoPartes.value = false
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Partes del contrato actualizadas', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoPartes.value = false
  }
}
const vistaCantidades = ref('mensual')
const vistaTarifas = ref('mensual')

// Plantas inscritas (calculadas por la plataforma): "año-mes" -> nº de plantas registradas
// y despachando energía al contrato vía GESCON. Numerador del cumplimiento de plantas.
const plantasInscritasMap = ref({})

// Edición tarifas
const editandoTarifas = ref(false)
const guardandoTarifas = ref(false)
const tarifasPaste = ref('')
const tarifasRows = ref([])
const tarifasError = ref('')

// Edición cantidades
const editandoCantidades = ref(false)
const guardandoCantidades = ref(false)
const energiaPaste = ref('')
const energiaRows = ref([])
const energiaError = ref('')

const MESES_ES = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
}

function splitRow(line) {
  return line.includes('\t') ? line.split('\t') : line.split(',')
}

function parseMes(raw) {
  const s = String(raw).trim()
  const num = parseInt(s, 10)
  if (!isNaN(num) && num >= 1 && num <= 12) return num
  return MESES_ES[s.toLowerCase()] ?? null
}

function parseTarifas() {
  tarifasError.value = ''
  const lines = tarifasPaste.value.split('\n').map(l => l.trim()).filter(Boolean)
  const rows = []
  for (const [i, line] of lines.entries()) {
    const cols = splitRow(line)
    if (cols.length < 3) { tarifasError.value = `Fila ${i + 1}: se esperan 3 columnas`; tarifasRows.value = []; return }
    const año = parseInt(cols[0].trim(), 10)
    const mes = parseMes(cols[1].trim())
    const tarifa = parseFloat(cols[2].trim().replace(',', '.'))
    if (isNaN(año) || !mes || isNaN(tarifa)) { tarifasError.value = `Fila ${i + 1}: datos inválidos`; tarifasRows.value = []; return }
    rows.push({ año, mes, tarifa })
  }
  tarifasRows.value = rows
}

function parseEnergia() {
  energiaError.value = ''
  const lines = energiaPaste.value.split('\n').map(l => l.trim()).filter(Boolean)
  const rows = []
  for (const [i, line] of lines.entries()) {
    const cols = splitRow(line)
    if (cols.length < 3) { energiaError.value = `Fila ${i + 1}: se esperan al menos 3 columnas (Año · Mes · Mín)`; energiaRows.value = []; return }
    const año = parseInt(cols[0].trim(), 10)
    const mes = parseMes(cols[1].trim())
    const min = parseFloat(cols[2].trim().replace(',', '.'))
    const max = cols[3] ? parseFloat(cols[3].trim().replace(',', '.')) : null
    const plantasRaw = cols[4] ? cols[4].trim() : ''
    const plantas = plantasRaw ? parseInt(plantasRaw.replace(',', '.'), 10) : null
    if (isNaN(año) || !mes || isNaN(min)) { energiaError.value = `Fila ${i + 1}: datos inválidos`; energiaRows.value = []; return }
    rows.push({
      año, mes,
      energia_minima: min,
      energia_maxima: (max !== null && !isNaN(max)) ? max : null,
      cantidad_proyectos: (plantas !== null && !isNaN(plantas)) ? plantas : null,
    })
  }
  energiaRows.value = rows
}

function onPasteTarifas() { setTimeout(parseTarifas, 50) }
function onPasteEnergia() { setTimeout(parseEnergia, 50) }

async function guardarTarifas() {
  guardandoTarifas.value = true
  try {
    const { data } = await api.put(`/ppa/${contrato.value.id}/tarifas`, tarifasRows.value)
    contrato.value = { ...contrato.value, tarifas: data }
    editandoTarifas.value = false
    tarifasPaste.value = ''; tarifasRows.value = []
    toast.add({ severity: 'success', summary: 'Guardado', detail: `${data.length} tarifas actualizadas`, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoTarifas.value = false
  }
}

async function guardarCantidades() {
  guardandoCantidades.value = true
  try {
    const { data } = await api.put(`/ppa/${contrato.value.id}/compromisos`, energiaRows.value)
    contrato.value = { ...contrato.value, compromisos_energia: data }
    editandoCantidades.value = false
    energiaPaste.value = ''; energiaRows.value = []
    cargarPlantasInscritas()  // los periodos pudieron cambiar → recalcular inscritas
    toast.add({ severity: 'success', summary: 'Guardado', detail: `${data.length} compromisos actualizados`, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    guardandoCantidades.value = false
  }
}
const asicRows = ref([])
const loadingAsic = ref(false)
const vistaAsic = ref('vigentes')

const asicFiltrados = computed(() => {
  if (vistaAsic.value === 'historicos') return asicRows.value
  const hoy = new Date().toISOString().slice(0, 10)
  return asicRows.value.filter(r => r.fecha_fin && r.fecha_fin >= hoy)
})

const duracion = computed(() => {
  if (!contrato.value?.fecha_inicio || !contrato.value?.fecha_fin) return null
  const a = new Date(contrato.value.fecha_inicio)
  const b = new Date(contrato.value.fecha_fin)
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  const años = Math.floor(meses / 12)
  const resto = meses % 12
  return años > 0
    ? `${años} año${años !== 1 ? 's' : ''}${resto > 0 ? ` ${resto} mes${resto !== 1 ? 'es' : ''}` : ''}`
    : `${meses} mes${meses !== 1 ? 'es' : ''}`
})

function formatFecha(f) {
  if (!f) return null
  return String(f).slice(0, 10)
}

function variacion(prev, curr) {
  const pct = ((curr - prev) / prev) * 100
  if (pct === 0) return '—'
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function agregarPorAño(rows, campos, modo) {
  const byYear = {}
  for (const r of rows) {
    ;(byYear[r.año] = byYear[r.año] || []).push(r)
  }
  return Object.keys(byYear).sort((a, b) => a - b).map(año => {
    const filas = byYear[año]
    const uniforme = campos.every(c => filas.every(f => f[c] === filas[0][c]))
    const entry = { año: Number(año), _uniforme: uniforme }
    for (const c of campos) {
      const sum = filas.reduce((acc, f) => acc + (f[c] ?? 0), 0)
      entry[c] = modo === 'suma' ? sum : sum / filas.length
    }
    return entry
  })
}

const tarifasMensuales = computed(() => {
  if (!contrato.value?.tarifas) return []
  return [...contrato.value.tarifas].sort((a, b) => a.año - b.año || a.mes - b.mes)
})

const tarifasAnuales = computed(() => {
  if (!contrato.value?.tarifas) return []
  return agregarPorAño(tarifasMensuales.value, ['tarifa'], 'promedio')
})

const currentTarifas = computed(() =>
  vistaTarifas.value === 'anual' ? tarifasAnuales.value : tarifasMensuales.value
)

const cantidadesMensuales = computed(() => {
  if (!contrato.value?.compromisos_energia) return []
  return [...contrato.value.compromisos_energia]
    .sort((a, b) => a.año - b.año || a.mes - b.mes)
    .map(r => ({ ...r, plantas_inscritas: plantasInscritasMap.value[`${r.año}-${r.mes}`] ?? null }))
})

const cantidadesAnuales = computed(() => {
  if (!contrato.value?.compromisos_energia) return []
  const base = agregarPorAño(cantidadesMensuales.value, ['energia_minima', 'energia_maxima'], 'suma')
  // Plantas (contrato e inscritas) no se suman entre meses: por año mostramos el máximo.
  const maxContratoByYear = {}
  const maxInscritasByYear = {}
  for (const r of cantidadesMensuales.value) {
    if (r.cantidad_proyectos != null)
      maxContratoByYear[r.año] = Math.max(maxContratoByYear[r.año] ?? 0, r.cantidad_proyectos)
    if (r.plantas_inscritas != null)
      maxInscritasByYear[r.año] = Math.max(maxInscritasByYear[r.año] ?? 0, r.plantas_inscritas)
  }
  return base.map(e => ({
    ...e,
    cantidad_proyectos: maxContratoByYear[e.año] ?? null,
    plantas_inscritas: maxInscritasByYear[e.año] ?? null,
  }))
})

// Wizard edición completa
const showWizard = ref(false)
const wizardInitialData = ref(null)
const wizardEditandoId = ref(null)

function abrirEdicionCompleta() {
  wizardInitialData.value = { ...contrato.value }
  wizardEditandoId.value = contrato.value.id
  showWizard.value = true
}

function onWizardEditado() {
  showWizard.value = false
  cargar()
  toast.add({ severity: 'success', summary: 'Contrato actualizado', life: 2000 })
}

function onWizardCreado() {
  showWizard.value = false
  cargar()
}

// Asociar proyecto
const showAsociar = ref(false)
const proyectoSeleccionado = ref(null)
const todosProyectos = ref([])
const cargandoProyectos = ref(false)
const asociando = ref(false)

const todosProyectosDisponibles = computed(() => {
  const asociadosIds = new Set((contrato.value?.proyectos ?? []).map(p => p.id))
  return todosProyectos.value.filter(p => !asociadosIds.has(p.id))
})

async function abrirAsociar() {
  showAsociar.value = true
  proyectoSeleccionado.value = null
  if (todosProyectos.value.length) return
  cargandoProyectos.value = true
  try {
    const { data } = await api.get('/proyectos', { params: { size: 500 } })
    todosProyectos.value = (data.items ?? data).sort((a, b) =>
      (a.nombre_comercial ?? '').localeCompare(b.nombre_comercial ?? ''))
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.message, life: 3000 })
  } finally {
    cargandoProyectos.value = false
  }
}

async function asociarProyecto() {
  if (!proyectoSeleccionado.value) return
  asociando.value = true
  try {
    await api.post(`/ppa/${contrato.value.id}/proyectos`, { proyecto_id: proyectoSeleccionado.value.id })
    contrato.value.proyectos = [...(contrato.value.proyectos ?? []), proyectoSeleccionado.value]
    showAsociar.value = false
    toast.add({ severity: 'success', summary: 'Proyecto asociado', detail: proyectoSeleccionado.value.nombre_comercial, life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || e.message, life: 4000 })
  } finally {
    asociando.value = false
  }
}

async function cargarPlantasInscritas() {
  if (!contrato.value?.id) return
  try {
    const { data } = await api.get(`/cumplimiento/ppa/${contrato.value.id}/plantas-inscritas-por-mes`)
    const map = {}
    for (const r of data) map[`${r.año}-${r.mes}`] = r.plantas_inscritas
    plantasInscritasMap.value = map
  } catch (e) {
    // No bloquea la pestaña: si falla, la columna muestra "—".
    plantasInscritasMap.value = {}
  }
}

async function cargar() {
  loading.value = true
  try {
    const { data } = await api.get(`/ppa/${route.params.id}`)
    contrato.value = data
    cargarPlantasInscritas()
    Object.assign(formGescon, {
      codigo_sic: data.codigo_sic ?? null,
      gescon_codigo: data.gescon_codigo ?? null,
      gescon_fecha_inicio: data.gescon_fecha_inicio ?? null,
      gescon_fecha_fin: data.gescon_fecha_fin ?? null,
      gescon_precio: data.gescon_precio ?? null,
      gescon_cantidades_kwh: data.gescon_cantidades_kwh ?? null,
    })
    if (data.numero_codigo_contrato || data.codigo_sic) cargarAsic(data)
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.message, life: 3000 })
  } finally {
    loading.value = false
  }
}

async function cargarAsic(c) {
  loadingAsic.value = true
  try {
    // Primero intenta por numero_codigo_contrato (un contrato PPA agrupa varios SIC)
    // y si tiene codigo_sic lo usa como filtro adicional de respaldo
    const params = c.numero_codigo_contrato
      ? { contrato_interno: c.numero_codigo_contrato }
      : { codigo_sic_contrato: c.codigo_sic }
    const { data } = await api.get('/asic', { params })
    asicRows.value = data
  } catch (e) {
    toast.add({ severity: 'warn', summary: 'ASIC', detail: 'No se pudieron cargar registros ASIC', life: 3000 })
  } finally {
    loadingAsic.value = false
  }
}

onMounted(cargar)
</script>
