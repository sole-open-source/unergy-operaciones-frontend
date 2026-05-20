<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background: rgba(145,91,216,0.12);">
          <i class="pi pi-shield text-lg" style="color: #915BD8;" />
        </div>
        <div>
          <h1 class="text-2xl font-bold" style="color: #2C2039;">Garantías</h1>
          <p class="text-xs" style="color: #6b5a8a;">Gestión de garantías XM, pólizas y cuentas custodia</p>
        </div>
      </div>
      <Button v-if="isAdmin" label="Nueva garantía" icon="pi pi-plus" @click="openCreate" />
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Saldo total</p>
        <p class="text-2xl font-bold mt-1" style="color: #2C2039;">{{ fmtCOP(resumen.total_valor_cop) }}</p>
        <p class="text-xs mt-0.5" style="color: #915BD8;">{{ resumen.count_vigentes }} vigentes</p>
      </div>
      <div class="rounded-xl shadow-sm p-5" :style="resumen.expiring_30d?.length > 0
        ? 'background: #FEF2F2; border: 2px solid rgba(214,68,85,0.3);'
        : 'background: white; border: 1px solid #e8e0f0;'">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Por vencer (30d)</p>
        <p class="text-2xl font-bold mt-1" :style="{ color: resumen.expiring_30d?.length > 0 ? '#D64455' : '#10B981' }">
          {{ resumen.expiring_30d?.length || 0 }}
        </p>
        <p v-if="resumen.expiring_30d?.length" class="text-xs mt-0.5" style="color: #D64455;">Requiere acción inmediata</p>
        <p v-else class="text-xs mt-0.5" style="color: #10B981;">Sin vencimientos próximos</p>
      </div>
      <div class="rounded-xl shadow-sm p-5" :style="resumen.oversold?.length > 0
        ? 'background: #FFFBEB; border: 2px solid rgba(240,192,64,0.4);'
        : 'background: white; border: 1px solid #e8e0f0;'">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Sobrevendidos</p>
        <p class="text-2xl font-bold mt-1" :style="{ color: resumen.oversold?.length > 0 ? '#CA8A04' : '#10B981' }">
          {{ resumen.oversold?.length || 0 }}
        </p>
        <p v-if="resumen.oversold?.length" class="text-xs mt-0.5" style="color: #CA8A04;">Cobertura &gt;100%</p>
        <p v-else class="text-xs mt-0.5" style="color: #10B981;">Cobertura dentro de límites</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold" style="color: #6b5a8a;">Vencidas</p>
        <p class="text-2xl font-bold mt-1" :style="{ color: resumen.count_vencidas > 0 ? '#D64455' : '#6b5a8a' }">
          {{ resumen.count_vencidas || 0 }}
        </p>
        <p class="text-xs mt-0.5" style="color: #6b5a8a;">Sin renovar</p>
      </div>
    </div>

    <!-- Expiring Soon Alert -->
    <div v-if="resumen.expiring_30d?.length" class="rounded-xl overflow-hidden" style="border: 2px solid #D64455;">
      <div class="px-4 py-2 flex items-center gap-2" style="background: #D64455;">
        <i class="pi pi-clock text-white text-sm" />
        <span class="text-sm font-bold text-white">Garantías próximas a vencer</span>
      </div>
      <div class="divide-y" style="background: #FEF2F2;">
        <div v-for="exp in resumen.expiring_30d" :key="exp.id"
             class="flex items-center justify-between px-4 py-3 text-sm">
          <div>
            <span class="font-semibold" style="color: #2C2039;">{{ exp.proyecto_nombre }}</span>
            <Tag class="ml-2" :severity="exp.dias_restantes <= 7 ? 'danger' : 'warn'"
                 :value="`${exp.dias_restantes} días`" />
          </div>
          <span class="font-semibold" style="color: #2C2039;">{{ fmtCOP(exp.valor_cop) }}</span>
        </div>
      </div>
    </div>

    <!-- Oversold Alert -->
    <div v-if="resumen.oversold?.length" class="rounded-xl p-4" style="background: #FFFBEB; border: 2px solid rgba(202,138,4,0.3);">
      <div class="flex items-center gap-2 mb-2">
        <i class="pi pi-exclamation-triangle text-sm" style="color: #CA8A04;" />
        <span class="text-sm font-bold" style="color: #CA8A04;">Proyectos sobrevendidos</span>
      </div>
      <div v-for="o in resumen.oversold" :key="o.garantia_id" class="flex items-center gap-3 text-sm py-1">
        <span class="font-semibold" style="color: #2C2039;">{{ o.proyecto_nombre }}</span>
        <Tag severity="warn" :value="`${(o.porcentaje ?? 0).toFixed(0)}% cobertura`" />
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-0 border-b" style="border-color: rgba(44,32,57,0.10);">
      <button v-for="(tab, i) in ['Garantías', 'Vencimientos Próximos', 'Movimientos recientes', 'Por tipo']" :key="i"
              @click="activeTab = i"
              class="px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
              :style="activeTab === i
                ? 'color: #915BD8; border-color: #915BD8;'
                : 'color: #7a6e8a; border-color: transparent;'">
        {{ tab }}
        <span v-if="i === 1 && vencimientoCount > 0"
          class="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style="background: rgba(214,68,85,0.1); color: #D64455;">
          {{ vencimientoCount }}
        </span>
      </button>
    </div>

    <!-- Tab: Garantías List -->
    <div v-if="activeTab === 0" class="space-y-4">
      <!-- Filters -->
      <div class="flex flex-wrap gap-3 items-end">
        <div>
          <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Estado</label>
          <Select v-model="filterEstado" :options="estadoOptions" optionLabel="label" optionValue="value"
                  showClear placeholder="Todos" class="w-44" />
        </div>
        <div>
          <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Tipo</label>
          <Select v-model="filterTipo" :options="tipoOptions" optionLabel="label" optionValue="value"
                  showClear placeholder="Todos" class="w-44" />
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <DataTable :value="filteredGarantias" :loading="loading" scrollable
                   scrollHeight="calc(100vh - 420px)" class="text-sm"
                   stripedRows>
          <template #empty>
            <div class="text-center py-12" style="color: #6b5a8a;">
              <i class="pi pi-shield text-3xl mb-2 block" style="color: #c4b8d4;" />
              No hay garantías {{ filterEstado || filterTipo ? 'con estos filtros' : 'registradas' }}
            </div>
          </template>

          <Column field="proyecto_nombre" header="Proyecto" style="min-width: 180px">
            <template #body="{ data: g }">
              <span class="font-semibold" style="color: #2C2039;">{{ g.proyecto_nombre || '—' }}</span>
              <p v-if="g.contrato_nombre" class="text-[11px]" style="color: #6b5a8a;">{{ g.contrato_nombre }}</p>
            </template>
          </Column>
          <Column field="tipo" header="Tipo" style="min-width: 130px">
            <template #body="{ data: g }">
              <Tag :value="TIPO_LABELS[g.tipo] || g.tipo" :severity="tipoSeverity(g.tipo)" />
            </template>
          </Column>
          <Column field="entidad" header="Entidad" style="min-width: 120px">
            <template #body="{ data: g }">{{ g.entidad || '—' }}</template>
          </Column>
          <Column field="valor_cop" header="Valor" style="min-width: 140px" class="text-right">
            <template #body="{ data: g }">
              <span class="font-semibold tabular-nums" style="color: #2C2039;">{{ fmtCOP(g.valor_cop) }}</span>
            </template>
          </Column>
          <Column field="porcentaje_cobertura" header="Cobertura" style="min-width: 100px; text-align: center;">
            <template #body="{ data: g }">
              <Tag v-if="g.porcentaje_cobertura != null"
                   :value="`${g.porcentaje_cobertura}%`"
                   :severity="g.porcentaje_cobertura > 100 ? 'warn' : 'success'" />
              <span v-else style="color: #6b5a8a;">—</span>
            </template>
          </Column>
          <Column field="fecha_vencimiento" header="Vencimiento" style="min-width: 140px">
            <template #body="{ data: g }">
              <template v-if="g.fecha_vencimiento">
                <span :style="{ color: diasRestantes(g) <= 30 ? '#D64455' : '#2C2039' }">
                  {{ g.fecha_vencimiento }}
                </span>
                <span v-if="diasRestantes(g) <= 30 && diasRestantes(g) > 0" class="text-[10px] ml-1 font-bold" style="color: #D64455;">
                  ({{ diasRestantes(g) }}d)
                </span>
              </template>
              <span v-else style="color: #6b5a8a;">—</span>
            </template>
          </Column>
          <Column field="estado" header="Estado" style="min-width: 120px; text-align: center;">
            <template #body="{ data: g }">
              <Tag :value="ESTADO_LABELS[g.estado] || g.estado" :severity="estadoSeverity(g.estado)" />
            </template>
          </Column>
          <Column style="width: 80px; text-align: center;">
            <template #body="{ data: g }">
              <Button icon="pi pi-eye" text rounded size="small" @click="openDetail(g)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Tab: Vencimientos Próximos -->
    <div v-if="activeTab === 1" class="space-y-4">
      <div class="flex flex-wrap gap-2 items-center mb-2">
        <button v-for="d in [30, 60, 90]" :key="d" @click="vencimientoDays = d"
          class="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
          :style="vencimientoDays === d ? { backgroundColor: '#915BD8', color: 'white' } : { color: '#6b5a8a', border: '1px solid #e8e0f0' }">
          {{ d }} días
        </button>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <DataTable :value="vencimientosFiltrados" class="text-sm" stripedRows
          :paginator="vencimientosFiltrados.length > 10" :rows="10">
          <template #empty>
            <div class="text-center py-12" style="color: #10B981;">
              <i class="pi pi-check-circle text-3xl mb-2 block" />
              Sin garantías por vencer en los próximos {{ vencimientoDays }} días
            </div>
          </template>
          <Column field="proyecto_nombre" header="Proyecto" style="min-width: 180px">
            <template #body="{ data: g }">
              <span class="font-semibold" style="color: #2C2039;">{{ g.proyecto_nombre || '—' }}</span>
            </template>
          </Column>
          <Column field="tipo" header="Tipo" style="min-width: 120px">
            <template #body="{ data: g }">
              <Tag :value="TIPO_LABELS[g.tipo] || g.tipo" :severity="tipoSeverity(g.tipo)" />
            </template>
          </Column>
          <Column field="valor_cop" header="Valor" style="min-width: 130px">
            <template #body="{ data: g }">
              <span class="font-semibold tabular-nums" style="color: #2C2039;">{{ fmtCOP(g.valor_cop) }}</span>
            </template>
          </Column>
          <Column field="fecha_vencimiento" header="Vencimiento" style="min-width: 140px">
            <template #body="{ data: g }">
              <span class="font-semibold" :style="{ color: diasRestantes(g) <= 7 ? '#D64455' : diasRestantes(g) <= 30 ? '#CA8A04' : '#2C2039' }">
                {{ g.fecha_vencimiento }}
              </span>
              <Tag class="ml-1.5" :severity="diasRestantes(g) <= 7 ? 'danger' : diasRestantes(g) <= 30 ? 'warn' : 'info'"
                :value="`${diasRestantes(g)}d`" />
            </template>
          </Column>
          <Column field="estado" header="Estado" style="min-width: 110px">
            <template #body="{ data: g }">
              <Tag :value="ESTADO_LABELS[g.estado] || g.estado" :severity="estadoSeverity(g.estado)" />
            </template>
          </Column>
          <Column style="width: 60px">
            <template #body="{ data: g }">
              <Button icon="pi pi-eye" text rounded size="small" @click="openDetail(g)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Tab: Recent Movements -->
    <div v-if="activeTab === 2" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <DataTable v-if="resumen.movimientos_recientes?.length" :value="resumen.movimientos_recientes"
                   class="text-sm" stripedRows>
          <Column field="fecha" header="Fecha" style="min-width: 100px">
            <template #body="{ data: m }">
              <span class="tabular-nums" style="color: #2C2039;">{{ m.fecha }}</span>
            </template>
          </Column>
          <Column field="tipo" header="Tipo" style="min-width: 110px">
            <template #body="{ data: m }">
              <Tag :value="MOV_LABELS[m.tipo] || m.tipo" :severity="movSeverity(m.tipo)" />
            </template>
          </Column>
          <Column field="monto_cop" header="Monto" style="min-width: 130px" class="text-right">
            <template #body="{ data: m }">
              <span class="font-semibold tabular-nums"
                    :style="{ color: ['deposito','devolucion','interes','renovacion'].includes(m.tipo) ? '#10B981' : '#D64455' }">
                {{ ['deposito','devolucion','interes','renovacion'].includes(m.tipo) ? '+' : '-' }}{{ fmtCOP(Math.abs(m.monto_cop)) }}
              </span>
            </template>
          </Column>
          <Column field="concepto" header="Concepto" style="min-width: 150px">
            <template #body="{ data: m }">
              <span style="color: #6b5a8a;">{{ m.concepto || '—' }}</span>
            </template>
          </Column>
        </DataTable>
        <div v-else class="py-12 text-center" style="color: #6b5a8a;">
          Sin movimientos en los últimos 30 días
        </div>
      </div>
    </div>

    <!-- Tab: By Type -->
    <div v-if="activeTab === 3" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="(info, tipo) in resumen.por_tipo" :key="tipo"
           class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center gap-2 mb-3">
          <Tag :value="TIPO_LABELS[tipo] || tipo" :severity="tipoSeverity(tipo)" />
        </div>
        <p class="text-2xl font-bold" style="color: #2C2039;">{{ fmtCOP(info.valor_cop) }}</p>
        <p class="text-xs mt-1" style="color: #6b5a8a;">{{ info.count }} garantía{{ info.count !== 1 ? 's' : '' }}</p>
      </div>
      <div v-if="!Object.keys(resumen.por_tipo || {}).length" class="col-span-3 py-12 text-center" style="color: #6b5a8a;">
        Sin garantías registradas
      </div>
    </div>

    <!-- Detail Dialog -->
    <Dialog v-model:visible="showDetail" header="Detalle de Garantía" modal class="w-full max-w-2xl">
      <div v-if="selectedGarantia" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Proyecto</span><p class="font-semibold" style="color: #2C2039;">{{ selectedGarantia.proyecto_nombre || '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Contrato</span><p class="font-semibold" style="color: #2C2039;">{{ selectedGarantia.contrato_nombre || '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Tipo</span><p>{{ TIPO_LABELS[selectedGarantia.tipo] || selectedGarantia.tipo }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Entidad</span><p>{{ selectedGarantia.entidad || '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Valor</span><p class="font-bold text-lg" style="color: #2C2039;">{{ fmtCOP(selectedGarantia.valor_cop) }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Cobertura</span><p>{{ selectedGarantia.porcentaje_cobertura != null ? selectedGarantia.porcentaje_cobertura + '%' : '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Constitución</span><p>{{ selectedGarantia.fecha_constitucion || '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Vencimiento</span><p :style="{ color: diasRestantes(selectedGarantia) <= 30 ? '#D64455' : '#2C2039' }">{{ selectedGarantia.fecha_vencimiento || '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Referencia</span><p>{{ selectedGarantia.numero_referencia || '—' }}</p></div>
          <div><span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Frontera</span><p>{{ selectedGarantia.codigo_frontera || '—' }}</p></div>
        </div>
        <div v-if="selectedGarantia.observaciones">
          <span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Observaciones</span>
          <p class="text-sm mt-1 p-3 rounded-lg" style="background: #f3f0f7; color: #2C2039;">{{ selectedGarantia.observaciones }}</p>
        </div>
        <div v-if="detailMovimientos.length">
          <span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Historial de movimientos</span>
          <div class="mt-2 space-y-1.5">
            <div v-for="m in detailMovimientos" :key="m.id"
                 class="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style="background: #fafafa;">
              <div class="flex items-center gap-2">
                <Tag :value="MOV_LABELS[m.tipo] || m.tipo" :severity="movSeverity(m.tipo)" />
                <span style="color: #6b5a8a;">{{ m.fecha }}</span>
              </div>
              <div class="text-right">
                <span class="font-semibold tabular-nums"
                      :style="{ color: ['deposito','devolucion','interes','renovacion'].includes(m.tipo) ? '#10B981' : '#D64455' }">
                  {{ ['deposito','devolucion','interes','renovacion'].includes(m.tipo) ? '+' : '-' }}{{ fmtCOP(Math.abs(m.monto_cop)) }}
                </span>
                <span v-if="m.saldo_posterior_cop != null" class="text-xs ml-2" style="color: #6b5a8a;">
                  Saldo: {{ fmtCOP(m.saldo_posterior_cop) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button v-if="isAdmin" label="Editar" icon="pi pi-pencil" severity="secondary"
                @click="showDetail = false; editGarantia(selectedGarantia)" />
        <Button label="Cerrar" text @click="showDetail = false" />
      </template>
    </Dialog>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:visible="showCreate" :header="editingId ? 'Editar Garantía' : 'Nueva Garantía'" modal class="w-full max-w-lg">
      <form @submit.prevent="saveGarantia" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="col-span-1 sm:col-span-2">
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Proyecto</label>
            <Select v-model="form.proyecto_id" :options="proyectos" optionLabel="nombre_comercial" optionValue="id"
                    placeholder="— Sin proyecto —" showClear filter class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Tipo *</label>
            <Select v-model="form.tipo" :options="tipoOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Contrato PPA</label>
            <Select v-model="form.contrato_ppa_id" :options="contratosPPA" optionLabel="label" optionValue="value"
              placeholder="Sin contrato" showClear filter class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Estado</label>
            <Select v-model="form.estado" :options="estadoOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Entidad</label>
            <InputText v-model="form.entidad" class="w-full" placeholder="Banco / aseguradora" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Referencia</label>
            <InputText v-model="form.numero_referencia" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Valor COP *</label>
            <InputNumber v-model="form.valor_cop" mode="currency" currency="COP" locale="es-CO" :min="0" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Cobertura %</label>
            <InputNumber v-model="form.porcentaje_cobertura" suffix="%" :min="0" :max="999" class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Constitución</label>
            <DatePicker v-model="form.fecha_constitucion" dateFormat="yy-mm-dd" showButtonBar class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Vencimiento</label>
            <DatePicker v-model="form.fecha_vencimiento" dateFormat="yy-mm-dd" showButtonBar class="w-full" />
          </div>
          <div>
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Frontera</label>
            <InputText v-model="form.codigo_frontera" class="w-full" />
          </div>
          <div class="col-span-1 sm:col-span-2">
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Observaciones</label>
            <Textarea v-model="form.observaciones" rows="2" class="w-full" />
          </div>
          <div class="col-span-1 sm:col-span-2">
            <label class="text-xs font-semibold uppercase block mb-1" style="color: #6b5a8a;">Documento adjunto</label>
            <div class="flex items-center gap-3">
              <label class="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-1.5"
                style="background: #6b5a8a;">
                <i class="pi pi-upload text-xs" />
                {{ attachedFile ? 'Cambiar' : 'Seleccionar archivo' }}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" class="hidden" @change="onFileAttach" />
              </label>
              <span v-if="attachedFile" class="text-sm truncate max-w-48" style="color: #2C2039;">{{ attachedFile.name }}</span>
              <span v-else-if="form.documento_url" class="text-xs" style="color: #6b5a8a;">
                <a :href="form.documento_url" target="_blank" class="underline" style="color: #915BD8;">Ver adjunto actual</a>
              </span>
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <Button label="Cancelar" severity="secondary" text @click="showCreate = false" />
        <Button :label="saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')"
                :loading="saving" @click="saveGarantia" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import api from '@/api/client'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'

const auth = useAuthStore()
const toast = useToast()
const isAdmin = computed(() => auth.role === 'admin')

const loading = ref(true)
const saving = ref(false)
const activeTab = ref(0)
const resumen = ref({})
const garantias = ref([])
const proyectos = ref([])
const showCreate = ref(false)
const showDetail = ref(false)
const selectedGarantia = ref(null)
const detailMovimientos = ref([])
const editingId = ref(null)
const filterEstado = ref(null)
const filterTipo = ref(null)
const vencimientoDays = ref(30)
const attachedFile = ref(null)
const contratosPPA = ref([])

const TIPO_LABELS = {
  cuenta_custodia: 'Cuenta custodia',
  poliza: 'Póliza',
  carta_credito: 'Carta de crédito',
  fiducia: 'Fiducia',
  otro: 'Otro',
}

const ESTADO_LABELS = {
  vigente: 'Vigente',
  vencida: 'Vencida',
  en_renovacion: 'En renovación',
  liberada: 'Liberada',
  en_proceso: 'En proceso',
}

const MOV_LABELS = {
  deposito: 'Depósito',
  cobro_xm: 'Cobro XM',
  devolucion: 'Devolución',
  ajuste: 'Ajuste',
  interes: 'Interés',
  renovacion: 'Renovación',
}

const tipoOptions = Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }))
const estadoOptions = Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }))

const defaultForm = () => ({
  proyecto_id: null,
  contrato_ppa_id: null,
  codigo_frontera: null,
  tipo: 'cuenta_custodia',
  entidad: null,
  numero_referencia: null,
  valor_cop: null,
  porcentaje_cobertura: null,
  fecha_constitucion: null,
  fecha_vencimiento: null,
  estado: 'vigente',
  observaciones: null,
  documento_url: null,
})

const form = ref(defaultForm())

const vencimientosFiltrados = computed(() => {
  return garantias.value.filter(g => {
    const d = diasRestantes(g)
    return d > 0 && d <= vencimientoDays.value && g.estado !== 'liberada'
  }).sort((a, b) => diasRestantes(a) - diasRestantes(b))
})

const vencimientoCount = computed(() => {
  return garantias.value.filter(g => {
    const d = diasRestantes(g)
    return d > 0 && d <= 90 && g.estado !== 'liberada'
  }).length
})

function onFileAttach(e) {
  attachedFile.value = e.target.files[0] || null
}

const filteredGarantias = computed(() => {
  let list = garantias.value
  if (filterEstado.value) list = list.filter(g => g.estado === filterEstado.value)
  if (filterTipo.value) list = list.filter(g => g.tipo === filterTipo.value)
  return list
})

function fmtCOP(v) {
  if (v == null) return '$0'
  return '$' + Math.round(v).toLocaleString('es-CO')
}

function diasRestantes(g) {
  if (!g.fecha_vencimiento) return 999
  const d = new Date(g.fecha_vencimiento)
  if (isNaN(d.getTime())) return 999
  return Math.ceil((d - new Date()) / 86400000)
}

function tipoSeverity(tipo) {
  const map = { cuenta_custodia: 'info', poliza: 'info', carta_credito: 'success', fiducia: 'warn', otro: 'secondary' }
  return map[tipo] || 'secondary'
}

function estadoSeverity(estado) {
  const map = { vigente: 'success', vencida: 'danger', en_renovacion: 'warn', liberada: 'secondary', en_proceso: 'info' }
  return map[estado] || 'info'
}

function movSeverity(tipo) {
  const map = { deposito: 'success', cobro_xm: 'danger', devolucion: 'success', ajuste: 'secondary', interes: 'success', renovacion: 'info' }
  return map[tipo] || 'secondary'
}

function openDetail(g) {
  selectedGarantia.value = g
  showDetail.value = true
}

function openCreate() {
  editingId.value = null
  form.value = defaultForm()
  showCreate.value = true
}

function editGarantia(g) {
  editingId.value = g.id
  form.value = {
    proyecto_id: g.proyecto_id,
    contrato_ppa_id: g.contrato_ppa_id,
    codigo_frontera: g.codigo_frontera,
    tipo: g.tipo,
    entidad: g.entidad,
    numero_referencia: g.numero_referencia,
    valor_cop: g.valor_cop,
    porcentaje_cobertura: g.porcentaje_cobertura,
    fecha_constitucion: g.fecha_constitucion,
    fecha_vencimiento: g.fecha_vencimiento,
    estado: g.estado,
    observaciones: g.observaciones,
    documento_url: g.documento_url || null,
  }
  attachedFile.value = null
  showCreate.value = true
}

function formatDateForApi(val) {
  if (!val) return null
  if (typeof val === 'string') return val
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

async function saveGarantia() {
  if (!form.value.tipo) {
    toast.add({ severity: 'warn', summary: 'Campo requerido', detail: 'Seleccione un tipo', life: 3000 })
    return
  }
  if (form.value.valor_cop == null || form.value.valor_cop < 0) {
    toast.add({ severity: 'warn', summary: 'Campo requerido', detail: 'Ingrese un valor válido', life: 3000 })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      fecha_constitucion: formatDateForApi(form.value.fecha_constitucion),
      fecha_vencimiento: formatDateForApi(form.value.fecha_vencimiento),
    }
    let garantiaId
    if (editingId.value) {
      await api.patch(`/garantias/${editingId.value}`, payload)
      garantiaId = editingId.value
      toast.add({ severity: 'success', summary: 'Actualizada', life: 2000 })
    } else {
      const { data: created } = await api.post('/garantias', payload)
      garantiaId = created.id
      toast.add({ severity: 'success', summary: 'Garantía creada', life: 2000 })
    }
    // Upload attached document
    if (attachedFile.value && garantiaId) {
      try {
        const fd = new FormData()
        fd.append('archivo', attachedFile.value)
        await api.post(`/garantias/${garantiaId}/documento`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch {
        toast.add({ severity: 'warn', summary: 'Archivo no subido', detail: 'La garantía se guardó pero el archivo no pudo subirse', life: 4000 })
      }
    }
    showCreate.value = false
    attachedFile.value = null
    editingId.value = null
    form.value = defaultForm()
    await loadData()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: e.response?.data?.detail || 'Error al guardar', life: 4000 })
  } finally {
    saving.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const [resRes, listRes, projRes, ppaRes] = await Promise.all([
      api.get('/garantias/resumen').catch(() => ({ data: {} })),
      api.get('/garantias').catch(() => ({ data: { items: [] } })),
      api.get('/proyectos', { params: { size: 500 } }).catch(() => ({ data: { items: [] } })),
      api.get('/ppa').catch(() => ({ data: [] })),
    ])
    resumen.value = resRes.data || {}
    garantias.value = listRes.data?.items || []
    proyectos.value = projRes.data?.items || []
    const ppaList = Array.isArray(ppaRes.data) ? ppaRes.data : (ppaRes.data?.items || [])
    contratosPPA.value = ppaList.map(c => ({ value: c.id, label: c.nombre_interno || c.numero_codigo_contrato || `PPA #${c.id}` }))
  } finally {
    loading.value = false
  }
}

watch(selectedGarantia, async (g) => {
  if (!g) { detailMovimientos.value = []; return }
  try {
    const res = await api.get(`/garantias/${g.id}`)
    detailMovimientos.value = res.data?.movimientos || []
  } catch {
    detailMovimientos.value = []
  }
})

watch(showCreate, (v) => {
  if (!v) { editingId.value = null; form.value = defaultForm() }
})

onMounted(loadData)
</script>
