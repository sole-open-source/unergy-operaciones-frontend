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
      <button v-if="isAdmin" @click="showCreate = true"
              class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
              style="background: #915BD8;">
        <i class="pi pi-plus mr-1.5" /> Nueva garantía
      </button>
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
            <span class="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                  :style="exp.dias_restantes <= 7
                    ? 'background: rgba(220,38,38,0.12); color: #DC2626;'
                    : 'background: rgba(234,88,12,0.1); color: #EA580C;'">
              {{ exp.dias_restantes }} días
            </span>
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
        <span class="text-xs px-2 py-0.5 rounded-full font-bold"
              style="background: rgba(202,138,4,0.15); color: #CA8A04;">
          {{ o.porcentaje.toFixed(0) }}% cobertura
        </span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-0 border-b" style="border-color: rgba(44,32,57,0.10);">
      <button v-for="(tab, i) in ['Garantías', 'Movimientos recientes', 'Por tipo']" :key="i"
              @click="activeTab = i"
              class="px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
              :style="activeTab === i
                ? 'color: #915BD8; border-color: #915BD8;'
                : 'color: #7a6e8a; border-color: transparent;'">
        {{ tab }}
      </button>
    </div>

    <!-- Tab: Garantías List -->
    <div v-show="activeTab === 0" class="space-y-4">
      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <select v-model="filterEstado" class="text-sm rounded-lg border px-3 py-1.5" style="border-color: #e8e0f0;">
          <option value="">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="vencida">Vencida</option>
          <option value="en_renovacion">En renovación</option>
          <option value="en_proceso">En proceso</option>
          <option value="liberada">Liberada</option>
        </select>
        <select v-model="filterTipo" class="text-sm rounded-lg border px-3 py-1.5" style="border-color: #e8e0f0;">
          <option value="">Todos los tipos</option>
          <option value="cuenta_custodia">Cuenta custodia</option>
          <option value="poliza">Póliza</option>
          <option value="carta_credito">Carta de crédito</option>
          <option value="fiducia">Fiducia</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <div v-if="loading" class="flex justify-center py-16">
          <i class="pi pi-spin pi-spinner text-2xl" style="color: #915BD8;" />
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr style="background: rgba(145,91,216,0.05);">
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Proyecto</th>
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Tipo</th>
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Entidad</th>
              <th class="text-right px-4 py-3 font-semibold" style="color: #6b5a8a;">Valor</th>
              <th class="text-center px-4 py-3 font-semibold" style="color: #6b5a8a;">Cobertura</th>
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Vencimiento</th>
              <th class="text-center px-4 py-3 font-semibold" style="color: #6b5a8a;">Estado</th>
              <th class="px-4 py-3" style="width: 80px;"></th>
            </tr>
          </thead>
          <tbody class="divide-y" style="border-color: #f3f0f7;">
            <tr v-for="g in filteredGarantias" :key="g.id" class="hover:bg-gray-50/50 transition-colors">
              <td class="px-4 py-3">
                <span class="font-semibold" style="color: #2C2039;">{{ g.proyecto_nombre || '—' }}</span>
                <p v-if="g.contrato_nombre" class="text-[11px]" style="color: #6b5a8a;">{{ g.contrato_nombre }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" :style="tipoStyle(g.tipo)">
                  {{ TIPO_LABELS[g.tipo] || g.tipo }}
                </span>
              </td>
              <td class="px-4 py-3" style="color: #2C2039;">{{ g.entidad || '—' }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums" style="color: #2C2039;">{{ fmtCOP(g.valor_cop) }}</td>
              <td class="px-4 py-3 text-center">
                <span v-if="g.porcentaje_cobertura != null" class="text-xs font-bold px-2 py-0.5 rounded-full"
                      :style="g.porcentaje_cobertura > 100
                        ? 'background: rgba(202,138,4,0.15); color: #CA8A04;'
                        : 'background: rgba(16,185,129,0.1); color: #10B981;'">
                  {{ g.porcentaje_cobertura }}%
                </span>
                <span v-else style="color: #6b5a8a;">—</span>
              </td>
              <td class="px-4 py-3">
                <template v-if="g.fecha_vencimiento">
                  <span :style="{ color: diasRestantes(g) <= 30 ? '#D64455' : '#2C2039' }">
                    {{ g.fecha_vencimiento }}
                  </span>
                  <span v-if="diasRestantes(g) <= 30 && diasRestantes(g) > 0" class="text-[10px] ml-1 font-bold" style="color: #D64455;">
                    ({{ diasRestantes(g) }}d)
                  </span>
                </template>
                <span v-else style="color: #6b5a8a;">—</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="text-xs px-2.5 py-1 rounded-full font-semibold" :style="estadoStyle(g.estado)">
                  {{ ESTADO_LABELS[g.estado] || g.estado }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button @click="selectedGarantia = g; showDetail = true"
                        class="text-xs px-2.5 py-1 rounded-lg transition-colors"
                        style="background: rgba(145,91,216,0.08); color: #915BD8;">
                  <i class="pi pi-eye mr-1" />Ver
                </button>
              </td>
            </tr>
            <tr v-if="!filteredGarantias.length && !loading">
              <td colspan="8" class="px-4 py-12 text-center" style="color: #6b5a8a;">
                <i class="pi pi-shield text-3xl mb-2 block" style="color: #e8e0f0;" />
                No hay garantías {{ filterEstado || filterTipo ? 'con estos filtros' : 'registradas' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab: Recent Movements -->
    <div v-show="activeTab === 1" class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm overflow-hidden" style="border: 1px solid #e8e0f0;">
        <table v-if="resumen.movimientos_recientes?.length" class="w-full text-sm">
          <thead>
            <tr style="background: rgba(145,91,216,0.05);">
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Fecha</th>
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Tipo</th>
              <th class="text-right px-4 py-3 font-semibold" style="color: #6b5a8a;">Monto</th>
              <th class="text-left px-4 py-3 font-semibold" style="color: #6b5a8a;">Concepto</th>
            </tr>
          </thead>
          <tbody class="divide-y" style="border-color: #f3f0f7;">
            <tr v-for="m in resumen.movimientos_recientes" :key="m.id">
              <td class="px-4 py-3 tabular-nums" style="color: #2C2039;">{{ m.fecha }}</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" :style="movTipoStyle(m.tipo)">
                  {{ MOV_LABELS[m.tipo] || m.tipo }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums"
                  :style="{ color: ['deposito','devolucion','interes'].includes(m.tipo) ? '#10B981' : '#D64455' }">
                {{ ['deposito','devolucion','interes'].includes(m.tipo) ? '+' : '-' }}{{ fmtCOP(Math.abs(m.monto_cop)) }}
              </td>
              <td class="px-4 py-3" style="color: #6b5a8a;">{{ m.concepto || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="py-12 text-center" style="color: #6b5a8a;">
          Sin movimientos en los últimos 30 días
        </div>
      </div>
    </div>

    <!-- Tab: By Type -->
    <div v-show="activeTab === 2" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="(info, tipo) in resumen.por_tipo" :key="tipo"
           class="bg-white rounded-xl shadow-sm p-5" style="border: 1px solid #e8e0f0;">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs px-2 py-0.5 rounded-full font-semibold" :style="tipoStyle(tipo)">
            {{ TIPO_LABELS[tipo] || tipo }}
          </span>
        </div>
        <p class="text-2xl font-bold" style="color: #2C2039;">{{ fmtCOP(info.valor_cop) }}</p>
        <p class="text-xs mt-1" style="color: #6b5a8a;">{{ info.count }} garantía{{ info.count !== 1 ? 's' : '' }}</p>
      </div>
      <div v-if="!Object.keys(resumen.por_tipo || {}).length" class="col-span-3 py-12 text-center" style="color: #6b5a8a;">
        Sin garantías registradas
      </div>
    </div>

    <!-- Detail Dialog -->
    <div v-if="showDetail && selectedGarantia" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showDetail = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
        <div class="px-6 py-4 flex items-center justify-between border-b" style="border-color: #e8e0f0;">
          <h3 class="text-lg font-bold" style="color: #2C2039;">Detalle de Garantía</h3>
          <button @click="showDetail = false" class="text-gray-400 hover:text-gray-600"><i class="pi pi-times" /></button>
        </div>
        <div class="px-6 py-5 space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
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
          <!-- Movement history from detail endpoint -->
          <div v-if="detailMovimientos.length">
            <span class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Historial de movimientos</span>
            <div class="mt-2 space-y-1.5">
              <div v-for="m in detailMovimientos" :key="m.id"
                   class="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style="background: #fafafa;">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded font-medium" :style="movTipoStyle(m.tipo)">{{ MOV_LABELS[m.tipo] || m.tipo }}</span>
                  <span style="color: #6b5a8a;">{{ m.fecha }}</span>
                </div>
                <div class="text-right">
                  <span class="font-semibold tabular-nums"
                        :style="{ color: ['deposito','devolucion','interes'].includes(m.tipo) ? '#10B981' : '#D64455' }">
                    {{ ['deposito','devolucion','interes'].includes(m.tipo) ? '+' : '-' }}{{ fmtCOP(Math.abs(m.monto_cop)) }}
                  </span>
                  <span v-if="m.saldo_posterior_cop != null" class="text-xs ml-2" style="color: #6b5a8a;">
                    Saldo: {{ fmtCOP(m.saldo_posterior_cop) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="px-6 py-3 border-t flex justify-end gap-2" style="border-color: #e8e0f0;">
          <button v-if="isAdmin" @click="showDetail = false; editGarantia(selectedGarantia)"
                  class="text-sm px-4 py-2 rounded-lg font-medium"
                  style="background: rgba(145,91,216,0.1); color: #915BD8;">
            <i class="pi pi-pencil mr-1" /> Editar
          </button>
          <button @click="showDetail = false" class="text-sm px-4 py-2 rounded-lg" style="color: #6b5a8a;">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showCreate = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        <div class="px-6 py-4 flex items-center justify-between border-b" style="border-color: #e8e0f0;">
          <h3 class="text-lg font-bold" style="color: #2C2039;">{{ editingId ? 'Editar' : 'Nueva' }} Garantía</h3>
          <button @click="showCreate = false" class="text-gray-400 hover:text-gray-600"><i class="pi pi-times" /></button>
        </div>
        <form @submit.prevent="saveGarantia" class="px-6 py-5 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Proyecto</label>
              <select v-model="form.proyecto_id" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;">
                <option :value="null">— Sin proyecto —</option>
                <option v-for="p in proyectos" :key="p.id" :value="p.id">{{ p.nombre_comercial }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Tipo *</label>
              <select v-model="form.tipo" required class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;">
                <option v-for="(label, code) in TIPO_LABELS" :key="code" :value="code">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Estado</label>
              <select v-model="form.estado" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;">
                <option v-for="(label, code) in ESTADO_LABELS" :key="code" :value="code">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Entidad</label>
              <input v-model="form.entidad" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" placeholder="Banco / aseguradora" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Referencia</label>
              <input v-model="form.numero_referencia" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Valor COP *</label>
              <input v-model.number="form.valor_cop" type="number" step="0.01" required class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Cobertura %</label>
              <input v-model.number="form.porcentaje_cobertura" type="number" step="0.01" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Constitución</label>
              <input v-model="form.fecha_constitucion" type="date" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Vencimiento</label>
              <input v-model="form.fecha_vencimiento" type="date" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Frontera</label>
              <input v-model="form.codigo_frontera" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
            <div class="col-span-2">
              <label class="text-xs font-semibold uppercase" style="color: #6b5a8a;">Observaciones</label>
              <textarea v-model="form.observaciones" rows="2" class="w-full mt-1 text-sm rounded-lg border px-3 py-2" style="border-color: #e8e0f0;" />
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="showCreate = false" class="text-sm px-4 py-2 rounded-lg" style="color: #6b5a8a;">Cancelar</button>
            <button type="submit" :disabled="saving"
                    class="text-sm px-5 py-2 rounded-lg font-semibold text-white" style="background: #915BD8;">
              {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/client'

const auth = useAuthStore()
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
const filterEstado = ref('')
const filterTipo = ref('')

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

const defaultForm = () => ({
  proyecto_id: null,
  contrato_ppa_id: null,
  codigo_frontera: null,
  tipo: 'cuenta_custodia',
  entidad: null,
  numero_referencia: null,
  valor_cop: 0,
  porcentaje_cobertura: null,
  fecha_constitucion: null,
  fecha_vencimiento: null,
  estado: 'vigente',
  observaciones: null,
})

const form = ref(defaultForm())

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
  const diff = new Date(g.fecha_vencimiento) - new Date()
  return Math.ceil(diff / 86400000)
}

function tipoStyle(tipo) {
  const map = {
    cuenta_custodia: 'background: rgba(145,91,216,0.1); color: #915BD8;',
    poliza: 'background: rgba(59,130,246,0.1); color: #3B82F6;',
    carta_credito: 'background: rgba(20,184,166,0.1); color: #14B8A6;',
    fiducia: 'background: rgba(240,192,64,0.15); color: #CA8A04;',
    otro: 'background: rgba(107,90,138,0.1); color: #6b5a8a;',
  }
  return map[tipo] || map.otro
}

function estadoStyle(estado) {
  const map = {
    vigente: 'background: rgba(16,185,129,0.1); color: #10B981;',
    vencida: 'background: rgba(214,68,85,0.1); color: #D64455;',
    en_renovacion: 'background: rgba(240,192,64,0.15); color: #CA8A04;',
    liberada: 'background: rgba(107,90,138,0.1); color: #6b5a8a;',
    en_proceso: 'background: rgba(59,130,246,0.1); color: #3B82F6;',
  }
  return map[estado] || map.en_proceso
}

function movTipoStyle(tipo) {
  const map = {
    deposito: 'background: rgba(16,185,129,0.1); color: #10B981;',
    cobro_xm: 'background: rgba(214,68,85,0.1); color: #D64455;',
    devolucion: 'background: rgba(16,185,129,0.1); color: #10B981;',
    ajuste: 'background: rgba(107,90,138,0.1); color: #6b5a8a;',
    interes: 'background: rgba(20,184,166,0.1); color: #14B8A6;',
    renovacion: 'background: rgba(145,91,216,0.1); color: #915BD8;',
  }
  return map[tipo] || map.ajuste
}

function editGarantia(g) {
  editingId.value = g.id
  form.value = { ...g }
  showCreate.value = true
}

async function saveGarantia() {
  saving.value = true
  try {
    if (editingId.value) {
      await api.patch(`/garantias/${editingId.value}`, form.value)
    } else {
      await api.post('/garantias', form.value)
    }
    showCreate.value = false
    editingId.value = null
    form.value = defaultForm()
    await loadData()
  } catch (e) {
    alert(e.response?.data?.detail || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const [resRes, listRes, projRes] = await Promise.all([
      api.get('/garantias/resumen').catch(() => ({ data: {} })),
      api.get('/garantias').catch(() => ({ data: { items: [] } })),
      api.get('/proyectos', { params: { size: 500 } }).catch(() => ({ data: { items: [] } })),
    ])
    resumen.value = resRes.data || {}
    garantias.value = listRes.data?.items || []
    proyectos.value = projRes.data?.items || []
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
