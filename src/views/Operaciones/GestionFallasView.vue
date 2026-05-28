<template>
  <div class="gf-page" ref="pageRef">

    <!-- ══ STICKY HEADER: title + buckets + filters siempre visibles ════ -->
    <div class="gf-sticky-header" ref="stickyHeaderRef">

    <!-- ══ TITLE + BUCKETS + ACTIONS (una sola fila compacta) ═══════════ -->
    <div class="gf-topbar">
      <div class="gf-topbar-title">
        <i class="pi pi-bolt text-sm" style="color:#915BD8" />
        <h2 class="text-base font-bold text-gray-800 whitespace-nowrap">Gestión de Fallas</h2>
      </div>

      <!-- Bucket pills inline -->
      <div class="gf-bucket-pills">
        <button v-for="b in BUCKETS" :key="b.key"
          class="bucket-pill"
          :class="{ 'bucket-pill--active': bucket === b.key }"
          :style="bucketPillStyle(b.color, bucket === b.key)"
          @click="bucket = b.key">
          <span class="bucket-pill-dot" :style="{ background: b.color }" />
          <span class="bucket-pill-label">{{ b.label }}</span>
          <span class="bucket-pill-count" :style="{ color: b.color }">{{ counts[b.key] }}</span>
        </button>
      </div>

      <div class="gf-topbar-actions">
        <Button icon="pi pi-refresh" outlined size="small" :loading="loading" @click="cargar"
          v-tooltip.bottom="'Actualizar'" />
        <Button label="Nueva" icon="pi pi-plus" size="small" @click="abrirCrear" />
      </div>
    </div>

    <!-- ══ TOOLBAR (fila delgada) ═══════════════════════════════════════ -->
    <div class="gf-toolbar">
      <IconField class="flex-1 min-w-[200px] max-w-sm">
        <InputIcon class="pi pi-search text-xs" />
        <InputText ref="searchInputRef" v-model="search"
          placeholder="Buscar por código, descripción, proyecto, tipo..."
          class="w-full" size="small" />
      </IconField>
      <Select v-model="filtroProyecto" :options="proyectos" optionLabel="nombre_comercial"
        optionValue="id" placeholder="Proyecto" showClear filter class="w-36" size="small" />
      <Select v-model="filtroPrioridad" :options="catalogos.prioridades"
        optionLabel="etiqueta" optionValue="codigo" placeholder="Prioridad" showClear class="w-32" size="small" />
      <Select v-model="filtroAsignado" :options="opcionesAsignado"
        optionLabel="label" optionValue="value" placeholder="Responsable" showClear filter class="w-36" size="small" />
      <Select v-model="filtroEstado" :options="catalogos.estados"
        optionLabel="etiqueta" optionValue="codigo" placeholder="Estado" showClear class="w-32" size="small" />
      <DatePicker v-model="filtroFechaDesde" placeholder="Desde" dateFormat="yy-mm-dd"
        showButtonBar class="w-28" size="small" />
      <DatePicker v-model="filtroFechaHasta" placeholder="Hasta" dateFormat="yy-mm-dd"
        showButtonBar class="w-28" size="small" />
      <Button v-if="hayFiltros" icon="pi pi-times" text size="small" severity="secondary"
        @click="limpiarFiltros" v-tooltip.bottom="'Limpiar filtros'" />
      <span class="ml-auto text-[11px] text-gray-500 whitespace-nowrap" v-if="!loading">
        {{ filtradas.length }} / {{ porBucket.length }}
      </span>
    </div>

    </div><!-- /gf-sticky-header -->

  <div :class="['gf-layout', drawerVisible && 'gf-layout--split']">

  <div class="gf-main space-y-4 min-w-0">

    <!-- ══ COMPACT LIST (sólo lg+ con panel abierto) ════════════════════ -->
    <div v-if="drawerVisible" class="gf-compact hidden lg:flex">
      <div class="gf-compact-header">
        <span class="text-[11px] font-bold uppercase tracking-wide text-gray-500">
          {{ filtradas.length }} falla{{ filtradas.length !== 1 ? 's' : '' }}
        </span>
      </div>
      <div v-if="!filtradas.length" class="gf-compact-empty">
        <i class="pi pi-inbox text-2xl mb-2" />
        <p class="text-xs">Sin resultados</p>
      </div>
      <div v-else class="gf-compact-list">
        <button v-for="f in filtradas" :key="f.id"
          class="gf-compact-row"
          :class="{ 'gf-compact-row--active': drawerFalla?.id === f.id }"
          @click="abrirDrawer(f)">
          <span class="gf-compact-stripe" :style="{ background: prioColor(f.prioridad?.codigo) }" />
          <div class="gf-compact-content">
            <div class="gf-compact-line1">
              <code class="gf-compact-code">{{ f.codigo_interno }}</code>
              <span v-if="f.estado?.codigo"
                class="gf-compact-dot"
                :style="{ background: f.estado?.color_hex || '#915BD8' }"
                v-tooltip.right="f.estado?.etiqueta" />
            </div>
            <div class="gf-compact-line2">{{ f.tipo?.etiqueta || f.descripcion || 'Sin descripción' }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- ══ TABLA (oculta cuando hay panel en lg+) ═══════════════════════ -->
    <div :class="['gf-table-wrap', drawerVisible && 'lg:!hidden']">
      <div v-if="error" class="p-6 flex items-center gap-3 text-red-600">
        <i class="pi pi-exclamation-circle text-xl" />
        <div class="flex-1">
          <div class="font-semibold">Error al cargar</div>
          <div class="text-sm text-gray-500">{{ error }}</div>
        </div>
        <Button label="Reintentar" icon="pi pi-refresh" outlined size="small" @click="cargar" />
      </div>
      <DataTable v-else :value="filtradas" :loading="loading" rowHover stripedRows
        class="gf-table text-sm" :rows="25" paginator
        :rowsPerPageOptions="[15, 25, 50, 100]" :alwaysShowPaginator="false"
        @row-click="(e) => abrirDrawer(e.data)" selectionMode="single"
        :rowClass="rowClass" scrollable>
        <template #empty>
          <div class="flex flex-col items-center py-14 gap-2 text-gray-400">
            <i :class="bucketActual.icon + ' text-4xl'" :style="{ color: bucketActual.color }" />
            <p class="text-sm font-semibold text-gray-700">{{ emptyTitulo }}</p>
            <p class="text-xs">{{ emptySubtitulo }}</p>
            <Button v-if="bucket === 'activas' && !hayFiltros" label="Registrar primera falla"
              icon="pi pi-plus" outlined size="small" class="mt-2" @click="abrirCrear" />
            <Button v-else-if="hayFiltros" label="Limpiar filtros" icon="pi pi-times" text size="small"
              class="mt-2" @click="limpiarFiltros" />
          </div>
        </template>

        <Column header="" style="width:6px;padding:0" :pt="{ headerCell: { style: 'padding:0; border:none' } }">
          <template #body="{ data }">
            <div class="prio-stripe" :style="{ background: prioColor(data.prioridad?.codigo) }" />
          </template>
        </Column>

        <Column field="codigo_interno" header="Código" style="width:110px" sortable>
          <template #body="{ data }">
            <code class="font-mono text-xs text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">{{ data.codigo_interno }}</code>
          </template>
        </Column>

        <Column header="Falla" style="min-width:280px">
          <template #body="{ data }">
            <div class="flex items-start gap-2">
              <span class="cat-dot mt-1.5 flex-shrink-0"
                :style="{ background: data.tipo?.categoria?.color_hex || '#915BD8' }"
                v-tooltip.top="data.tipo?.categoria?.etiqueta || ''" />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-800 truncate">{{ data.tipo?.etiqueta || 'Sin tipo' }}</div>
                <div class="text-xs text-gray-500 line-clamp-1">{{ data.descripcion }}</div>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Proyecto" style="min-width:130px">
          <template #body="{ data }">
            <span class="text-sm text-gray-700">{{ data.proyecto?.nombre_comercial || '—' }}</span>
          </template>
        </Column>

        <Column header="Asignado" style="width:160px">
          <template #body="{ data }">
            <div v-if="data.asignado_a" class="flex items-center gap-2">
              <div class="avatar-sm" :style="avatarStyle(data.asignado_a)">
                {{ initials(data.asignado_a.nombre) }}
              </div>
              <span class="text-xs text-gray-700 truncate flex-1">{{ data.asignado_a.nombre }}</span>
            </div>
            <div v-else class="flex items-center gap-2 text-gray-400">
              <div class="avatar-sm avatar-sm--empty"><i class="pi pi-user text-[10px]" /></div>
              <span class="text-xs">Sin asignar</span>
            </div>
          </template>
        </Column>

        <Column header="Prioridad" style="width:100px">
          <template #body="{ data }">
            <span class="prio-pill" :style="prioPillStyle(data.prioridad?.codigo)">
              {{ data.prioridad?.etiqueta || '—' }}
            </span>
          </template>
        </Column>

        <Column header="Estado" style="width:130px">
          <template #body="{ data }">
            <Tag :value="data.estado?.etiqueta || '—'" :style="estadoPillStyle(data.estado?.color_hex)" />
          </template>
        </Column>

        <Column header="Fecha" style="width:100px" field="fecha_identificacion" sortable>
          <template #body="{ data }">
            <div class="text-xs">
              <div class="text-gray-700">{{ fmtFecha(data.fecha_identificacion) }}</div>
              <div class="text-gray-400">{{ relativeTime(data.fecha_identificacion) }}</div>
            </div>
          </template>
        </Column>

        <Column header="" style="width:120px">
          <template #body="{ data }">
            <div class="row-actions" @click.stop>
              <Button v-if="!data.estado?.es_estado_final" icon="pi pi-check-circle"
                text rounded size="small" severity="success"
                @click="quickResolve(data)" v-tooltip.left="'Marcar resuelta'" />
              <Button icon="pi pi-pencil" text rounded size="small" severity="info"
                @click="abrirEditar(data)" v-tooltip.left="'Editar'" />
              <Button icon="pi pi-arrow-right" text rounded size="small" severity="secondary"
                @click="abrirDrawer(data)" v-tooltip.left="'Ver detalle'" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

  </div><!-- /gf-main -->

    <!-- ══ PANEL DETALLE ════════════════════════════════════════════════ -->
    <aside v-if="drawerVisible && drawerFalla" class="gf-aside" @keydown.left.stop="navegar(-1)" @keydown.right.stop="navegar(1)">
      <!-- Backdrop solo en móvil -->
      <div class="gf-aside-backdrop" @click="drawerVisible = false" />
      <div class="gf-aside-panel">
        <!-- Header panel -->
        <div class="gf-drawer-header">
          <Button icon="pi pi-times" text rounded size="small" @click="drawerVisible = false" v-tooltip.bottom="'Cerrar (Esc)'" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="font-mono text-sm text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{{ drawerFalla.codigo_interno }}</code>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-sm font-medium text-gray-700 truncate">{{ drawerFalla.tipo?.etiqueta }}</span>
              <span v-if="navIndex >= 0" class="text-[10px] text-gray-400 ml-auto whitespace-nowrap hidden sm:inline-block">
                {{ navIndex + 1 }} / {{ filtradas.length }}
              </span>
            </div>
          </div>
          <Button icon="pi pi-chevron-left" text rounded size="small" severity="secondary"
            :disabled="navIndex <= 0" @click="navegar(-1)" v-tooltip.bottom="'Anterior (←)'" />
          <Button icon="pi pi-chevron-right" text rounded size="small" severity="secondary"
            :disabled="navIndex < 0 || navIndex >= filtradas.length - 1" @click="navegar(1)" v-tooltip.bottom="'Siguiente (→)'" />
          <Button icon="pi pi-external-link" text rounded size="small" severity="secondary"
            @click="$router.push(`/fallas/${drawerFalla.id}`)" v-tooltip.bottom="'Abrir página completa'" />
          <Button icon="pi pi-trash" text rounded size="small" severity="danger"
            @click="confirmDelete(drawerFalla)" v-tooltip.bottom="'Eliminar'" />
        </div>

        <!-- Body drawer -->
        <div class="gf-drawer-body">

          <!-- ── HERO: identificación + descripción + badges + hechos ─── -->
          <section class="gf-hero">
            <!-- Descripción prominente (el "qué pasa") -->
            <p class="gf-hero-desc">{{ drawerFalla.descripcion }}</p>

            <!-- Badges (estado, prioridad, categoría) -->
            <div class="flex flex-wrap gap-1.5">
              <Tag :value="drawerFalla.estado?.etiqueta" :style="estadoPillStyle(drawerFalla.estado?.color_hex)" />
              <span class="prio-pill" :style="prioPillStyle(drawerFalla.prioridad?.codigo)">
                {{ drawerFalla.prioridad?.etiqueta }}
              </span>
              <Tag v-if="drawerFalla.tipo?.categoria" :value="drawerFalla.tipo.categoria.etiqueta"
                :style="catTagStyle(drawerFalla.tipo.categoria.color_hex)" />
            </div>

            <!-- Hechos en grid compacto (todo a un vistazo) -->
            <dl class="gf-facts">
              <div class="gf-fact">
                <dt class="gf-fact-label"><i class="pi pi-building" /> Proyecto</dt>
                <dd class="gf-fact-value">{{ drawerFalla.proyecto?.nombre_comercial || '—' }}</dd>
              </div>
              <div class="gf-fact">
                <dt class="gf-fact-label"><i class="pi pi-user" /> Asignado</dt>
                <dd class="gf-fact-value">
                  <div v-if="drawerFalla.asignado_a" class="flex items-center gap-1.5">
                    <div class="avatar-xs" :style="avatarStyle(drawerFalla.asignado_a)">{{ initials(drawerFalla.asignado_a.nombre) }}</div>
                    <span>{{ drawerFalla.asignado_a.nombre }}</span>
                  </div>
                  <span v-else class="text-gray-500">Sin asignar</span>
                </dd>
              </div>
              <div class="gf-fact">
                <dt class="gf-fact-label"><i class="pi pi-calendar" /> Identificada</dt>
                <dd class="gf-fact-value">{{ fmtFecha(drawerFalla.fecha_identificacion) }} <span class="text-gray-500">· {{ relativeTime(drawerFalla.fecha_identificacion) }}</span></dd>
              </div>
              <div class="gf-fact">
                <dt class="gf-fact-label"><i class="pi pi-user-edit" /> Registrado por</dt>
                <dd class="gf-fact-value">{{ drawerFalla.registrado_por?.nombre || '—' }}</dd>
              </div>
              <div v-if="drawerFalla.fecha_resolucion" class="gf-fact">
                <dt class="gf-fact-label"><i class="pi pi-check-circle" /> Resuelta</dt>
                <dd class="gf-fact-value text-emerald-700 font-semibold">{{ fmtFecha(drawerFalla.fecha_resolucion?.slice?.(0,10) || drawerFalla.fecha_resolucion) }}</dd>
              </div>
              <div v-if="drawerFalla.energia_perdida_kwh != null" class="gf-fact">
                <dt class="gf-fact-label"><i class="pi pi-bolt" /> Energía perdida</dt>
                <dd class="gf-fact-value text-red-700 font-semibold">{{ Number(drawerFalla.energia_perdida_kwh).toLocaleString('es-CO') }} kWh</dd>
              </div>
            </dl>
          </section>

          <!-- ── EDICIÓN RÁPIDA + SLA (grid 2-col en pantallas anchas) ─── -->
          <div class="gf-twocol">
            <!-- Quick actions con autosave -->
            <section class="gf-section gf-section--filled">
              <header class="gf-section-head">
                <i class="pi pi-bolt gf-section-icon" />
                <h3 class="gf-section-title">Edición rápida</h3>
                <span v-if="savingQuick" class="gf-save-flag">
                  <i class="pi pi-spin pi-spinner" /> Guardando…
                </span>
                <span v-else-if="savedFlash" class="gf-save-flag gf-save-flag--ok">
                  <i class="pi pi-check" /> Guardado
                </span>
              </header>
              <div class="space-y-2">
                <div class="gf-field-row">
                  <label class="gf-field-label">Estado</label>
                  <Select v-model="quickEdit.estado_id" :options="catalogos.estados"
                    optionLabel="etiqueta" optionValue="id" class="flex-1"
                    @change="autosaveQuick()" />
                </div>
                <div class="gf-field-row">
                  <label class="gf-field-label">Prioridad</label>
                  <Select v-model="quickEdit.prioridad_id" :options="catalogos.prioridades"
                    optionLabel="etiqueta" optionValue="id" class="flex-1"
                    @change="autosaveQuick()" />
                </div>
                <div class="gf-field-row">
                  <label class="gf-field-label">Asignado</label>
                  <Select v-model="quickEdit.asignado_a_id" :options="usuarios"
                    optionLabel="nombre" optionValue="id" placeholder="Sin asignar" showClear filter
                    class="flex-1" @change="autosaveQuick()" />
                </div>
              </div>
            </section>

            <!-- SLA -->
            <section class="gf-section gf-section--filled">
              <header class="gf-section-head">
                <i class="pi pi-clock gf-section-icon" />
                <h3 class="gf-section-title">SLA</h3>
                <Tag v-if="drawerFalla.sla_limite_horas" class="ml-auto" :value="slaText(drawerFalla)" :severity="slaSeverity(drawerFalla)" />
                <span v-else class="ml-auto text-xs text-gray-500">Sin límite</span>
              </header>
              <template v-if="drawerFalla.sla_limite_horas">
                <div class="gf-sla-stat">
                  <span class="gf-sla-num" :style="{ color: slaTextColor(drawerFalla) }">{{ horasTranscurridas(drawerFalla) }}h</span>
                  <span class="gf-sla-of">de {{ drawerFalla.sla_limite_horas }}h</span>
                </div>
                <div class="bg-gray-200 rounded-full h-2 overflow-hidden mt-2">
                  <div class="h-full rounded-full transition-all" :style="slaFillStyle(drawerFalla)" />
                </div>
              </template>
              <p v-else class="text-sm text-gray-600 mt-1">Esta falla no tiene SLA configurado.</p>
            </section>
          </div>

          <!-- ── ACCIÓN SUGERIDA (alta visibilidad si existe) ──────────── -->
          <aside v-if="drawerFalla.tipo?.accion_sugerida" class="gf-suggestion">
            <div class="gf-suggestion-icon"><i class="pi pi-lightbulb" /></div>
            <div>
              <p class="gf-suggestion-label">Acción sugerida</p>
              <p class="gf-suggestion-text">{{ drawerFalla.tipo.accion_sugerida }}</p>
            </div>
          </aside>

          <!-- ── ANÁLISIS ──────────────────────────────────────────────── -->
          <section v-if="drawerFalla.causa_raiz || drawerFalla.acciones_correctivas" class="gf-section">
            <header class="gf-section-head">
              <i class="pi pi-search gf-section-icon" />
              <h3 class="gf-section-title">Análisis</h3>
            </header>
            <div class="space-y-3">
              <div v-if="drawerFalla.causa_raiz">
                <p class="gf-subhead">Causa raíz</p>
                <p class="gf-body-text">{{ drawerFalla.causa_raiz }}</p>
              </div>
              <div v-if="drawerFalla.acciones_correctivas">
                <p class="gf-subhead">Acciones correctivas</p>
                <p class="gf-body-text">{{ drawerFalla.acciones_correctivas }}</p>
              </div>
            </div>
          </section>

          <!-- ── SEGUIMIENTOS ──────────────────────────────────────────── -->
          <section class="gf-section">
            <header class="gf-section-head">
              <i class="pi pi-comments gf-section-icon" />
              <h3 class="gf-section-title">Seguimientos</h3>
              <span class="gf-section-count">{{ drawerFalla.seguimientos?.length || 0 }}</span>
            </header>

            <!-- Add note -->
            <div class="gf-add-note">
              <Textarea v-model="nuevaNota.nota" rows="2" autoResize
                placeholder="Agregar nota o actualización…" class="w-full" />
              <div class="flex items-center gap-2 mt-2">
                <Select v-model="nuevaNota.estado_id" :options="catalogos.estados"
                  optionLabel="etiqueta" optionValue="id" placeholder="Cambiar estado (opcional)"
                  showClear class="flex-1" />
                <Button label="Agregar" icon="pi pi-send" size="small"
                  :disabled="!nuevaNota.nota.trim() && !nuevaNota.estado_id"
                  :loading="addingSeg" @click="agregarSeguimiento" />
              </div>
            </div>

            <!-- Timeline -->
            <div v-if="sortedSeguimientos.length" class="space-y-3 mt-3">
              <div v-for="seg in sortedSeguimientos" :key="seg.id" class="flex gap-2.5">
                <div class="avatar-md flex-shrink-0" :style="avatarStyle(seg.usuario)">
                  {{ initials(seg.usuario?.nombre) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span class="gf-body-text font-semibold">{{ seg.usuario?.nombre || 'Sistema' }}</span>
                    <span class="text-xs text-gray-500">{{ relativeTime(seg.created_at, true) }}</span>
                  </div>
                  <p v-if="seg.nota" class="gf-body-text whitespace-pre-line">{{ seg.nota }}</p>
                  <div v-if="seg.estado_nuevo" class="mt-1.5">
                    <Tag :value="seg.estado_nuevo?.etiqueta" :style="estadoPillStyle(seg.estado_nuevo?.color_hex)" />
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 mt-3">Aún no hay seguimientos registrados.</p>
          </section>

          <!-- ── ACCIONES PRINCIPALES (final del scroll) ───────────────── -->
          <div class="gf-actions-inline">
            <Button label="Editar completa" icon="pi pi-pencil" outlined class="flex-1"
              @click="editarDesdeDrawer" />
            <Button v-if="!drawerFalla.estado?.es_estado_final" label="Marcar resuelta"
              icon="pi pi-check" severity="success" class="flex-1"
              :loading="resolvingFalla" @click="quickResolve(drawerFalla)" />
            <Button v-else label="Reabrir" icon="pi pi-replay" severity="warn" outlined
              class="flex-1" @click="reabrirFalla" />
          </div>

        </div>
      </div><!-- /gf-aside-panel -->
    </aside>

  </div><!-- /gf-layout -->

    <!-- ══ DIALOG CREAR / EDITAR ══════════════════════════════════════════ -->
    <Dialog v-model:visible="formDialogVisible" modal class="w-full max-w-2xl"
      :header="editingFalla ? `Editar falla ${editingFalla.codigo_interno}` : 'Nueva falla'"
      :closable="!savingForm">
      <FallaForm :initial="editingFalla" :catalogos="catalogos"
        @save="onSaveForm" @cancel="formDialogVisible = false" />
    </Dialog>

  </div><!-- /outer space-y-4 -->
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import FallaForm from '@/views/Fallas/FallaForm.vue'
import api from '@/api/client'

const router = useRouter()
const toast = useToast()
const confirmService = useConfirm()

// ── Constantes ──────────────────────────────────────────────────────────
const BUCKETS = [
  { key: 'activas',     label: 'Activas',     icon: 'pi pi-bolt',          color: '#dc2626' },
  { key: 'programadas', label: 'Programadas', icon: 'pi pi-calendar-clock',color: '#2563eb' },
  { key: 'resueltas',   label: 'Resueltas',   icon: 'pi pi-check-circle',  color: '#16a34a' },
  { key: 'todas',       label: 'Todas',       icon: 'pi pi-list',          color: '#915BD8' },
]

const PRIO_COLORS = {
  critica: '#dc2626',
  alta:    '#ea580c',
  media:   '#d97706',
  baja:    '#6b7280',
}

const AVATAR_PALETTE = ['#915BD8', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777']

// ── Estado base ──────────────────────────────────────────────────────────
const allFallas = ref([])
const proyectos = ref([])
const usuarios = ref([])
const catalogos = ref({ estados: [], prioridades: [], tipos: [], resoluciones: [] })

const loading = ref(false)
const error = ref(null)

const bucket = ref('todas')
const search = ref('')
const filtroProyecto = ref(null)
const filtroPrioridad = ref(null)
const filtroAsignado = ref(null)
const filtroEstado = ref(null)
const filtroFechaDesde = ref(null)
const filtroFechaHasta = ref(null)

const searchInputRef = ref(null)

// Refs para medir la altura real del header sticky y anclar la lista compacta
const pageRef = ref(null)
const stickyHeaderRef = ref(null)

// ── Drawer / detalle ─────────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerFalla = ref(null)
const quickEdit = reactive({
  estado_id: null,
  prioridad_id: null,
  asignado_a_id: null,
})
const savingQuick = ref(false)
const savedFlash = ref(false)
const resolvingFalla = ref(false)
const addingSeg = ref(false)
const nuevaNota = reactive({ nota: '', estado_id: null })

// ── Dialog formulario ────────────────────────────────────────────────────
const formDialogVisible = ref(false)
const editingFalla = ref(null)
const savingForm = ref(false)

// ── Computed ─────────────────────────────────────────────────────────────
const opcionesAsignado = computed(() => [
  { value: '__none__', label: 'Sin asignar' },
  ...usuarios.value.map(u => ({ value: u.id, label: u.nombre })),
])

const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

function bucketDeFalla(f) {
  if (f.estado?.es_estado_final) return 'resueltas'
  const fid = f.fecha_identificacion ? new Date(f.fecha_identificacion + 'T00:00:00') : null
  if (fid && fid.getTime() > hoy.getTime()) return 'programadas'
  return 'activas'
}

const counts = computed(() => {
  const c = { activas: 0, programadas: 0, resueltas: 0, todas: allFallas.value.length }
  for (const f of allFallas.value) c[bucketDeFalla(f)]++
  return c
})

const porBucket = computed(() => {
  if (bucket.value === 'todas') return allFallas.value
  return allFallas.value.filter(f => bucketDeFalla(f) === bucket.value)
})

const filtradas = computed(() => {
  let arr = porBucket.value
  const q = search.value.trim().toLowerCase()
  if (q) {
    arr = arr.filter(f =>
      (f.codigo_interno || '').toLowerCase().includes(q) ||
      (f.descripcion || '').toLowerCase().includes(q) ||
      (f.proyecto?.nombre_comercial || '').toLowerCase().includes(q) ||
      (f.tipo?.etiqueta || '').toLowerCase().includes(q) ||
      (f.tipo?.categoria?.etiqueta || '').toLowerCase().includes(q)
    )
  }
  if (filtroProyecto.value) arr = arr.filter(f => f.proyecto?.id === filtroProyecto.value)
  if (filtroPrioridad.value) arr = arr.filter(f => f.prioridad?.codigo === filtroPrioridad.value)
  if (filtroEstado.value) arr = arr.filter(f => f.estado?.codigo === filtroEstado.value)
  if (filtroAsignado.value === '__none__') arr = arr.filter(f => !f.asignado_a)
  else if (filtroAsignado.value) arr = arr.filter(f => f.asignado_a?.id === filtroAsignado.value)
  if (filtroFechaDesde.value) {
    const desde = startOfDay(filtroFechaDesde.value)
    arr = arr.filter(f => f.fecha_identificacion && new Date(f.fecha_identificacion + 'T00:00:00') >= desde)
  }
  if (filtroFechaHasta.value) {
    const hasta = startOfDay(filtroFechaHasta.value); hasta.setHours(23, 59, 59, 999)
    arr = arr.filter(f => f.fecha_identificacion && new Date(f.fecha_identificacion + 'T00:00:00') <= hasta)
  }
  return arr
})

const hayFiltros = computed(() =>
  search.value || filtroProyecto.value || filtroPrioridad.value || filtroAsignado.value ||
  filtroEstado.value || filtroFechaDesde.value || filtroFechaHasta.value
)

const bucketActual = computed(() => BUCKETS.find(b => b.key === bucket.value) || BUCKETS[0])

const emptyTitulo = computed(() => {
  if (hayFiltros.value) return 'Sin resultados con los filtros aplicados'
  return {
    activas: 'No hay fallas activas',
    programadas: 'Sin fallas programadas',
    resueltas: 'Sin fallas resueltas',
    todas: 'No hay fallas registradas',
  }[bucket.value]
})

const emptySubtitulo = computed(() => {
  if (hayFiltros.value) return 'Prueba con otros filtros o limpia la búsqueda'
  return {
    activas: 'Todas las incidencias están bajo control',
    programadas: 'No hay intervenciones planificadas a futuro',
    resueltas: 'Aún no se han cerrado fallas',
    todas: 'Registra la primera para empezar',
  }[bucket.value]
})

const sortedSeguimientos = computed(() =>
  [...(drawerFalla.value?.seguimientos ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
)

// Índice de la falla actual del panel en la lista filtrada (para navegación)
const navIndex = computed(() => {
  if (!drawerFalla.value) return -1
  return filtradas.value.findIndex(f => f.id === drawerFalla.value.id)
})

function navegar(delta) {
  if (!filtradas.value.length) return
  const cur = navIndex.value
  if (cur < 0) return
  const next = Math.max(0, Math.min(filtradas.value.length - 1, cur + delta))
  if (next === cur) return
  abrirDrawer(filtradas.value[next])
}

// ── Carga ────────────────────────────────────────────────────────────────
async function cargar() {
  loading.value = true
  error.value = null
  try {
    const { data: primera } = await api.get('/fallas', { params: { page: 1, size: 500 } })
    const total = primera.total ?? 0
    const items = [...(primera.items ?? [])]
    if (total > 500) {
      const totalPages = Math.ceil(total / 500)
      const rest = await Promise.allSettled(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.get('/fallas', { params: { page: i + 2, size: 500 } })
        )
      )
      for (const r of rest) {
        if (r.status === 'fulfilled') items.push(...(r.value.data.items ?? []))
      }
    }
    allFallas.value = items
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

async function cargarUsuarios() {
  try {
    const { data } = await api.get('/usuarios', { params: { size: 200 } })
    usuarios.value = data.items ?? []
  } catch { /* /usuarios puede no existir */ }
}

// ── Acciones ─────────────────────────────────────────────────────────────
function limpiarFiltros() {
  search.value = ''
  filtroProyecto.value = null
  filtroPrioridad.value = null
  filtroAsignado.value = null
  filtroEstado.value = null
  filtroFechaDesde.value = null
  filtroFechaHasta.value = null
}

function abrirDrawer(falla) {
  drawerFalla.value = falla
  quickEdit.estado_id = falla.estado?.id ?? null
  quickEdit.prioridad_id = falla.prioridad?.id ?? null
  quickEdit.asignado_a_id = falla.asignado_a?.id ?? null
  nuevaNota.nota = ''
  nuevaNota.estado_id = null
  drawerVisible.value = true
}

function abrirCrear() {
  editingFalla.value = null
  formDialogVisible.value = true
}

function abrirEditar(falla) {
  editingFalla.value = falla
  formDialogVisible.value = true
}

function editarDesdeDrawer() {
  if (!drawerFalla.value) return
  editingFalla.value = drawerFalla.value
  formDialogVisible.value = true
}

async function onSaveForm(payload) {
  savingForm.value = true
  try {
    if (editingFalla.value) {
      const notaInicial = payload.nota_inicial
      delete payload.nota_inicial
      await api.patch(`/fallas/${editingFalla.value.id}`, payload)
      if (notaInicial) await api.post(`/fallas/${editingFalla.value.id}/seguimientos`, { nota: notaInicial })
      toast.add({ severity: 'success', summary: 'Falla actualizada', life: 2500 })
    } else {
      const notaInicial = payload.nota_inicial
      delete payload.nota_inicial
      const { data: nueva } = await api.post('/fallas', payload)
      if (notaInicial) await api.post(`/fallas/${nueva.id}/seguimientos`, { nota: notaInicial })
      toast.add({ severity: 'success', summary: 'Falla registrada', life: 2500 })
    }
    formDialogVisible.value = false
    await cargar()
    // Si el drawer estaba abierto, refrescar su contenido
    if (drawerFalla.value && editingFalla.value) {
      const refreshed = allFallas.value.find(f => f.id === editingFalla.value.id)
      if (refreshed) abrirDrawer(refreshed)
    }
  } catch (err) {
    const msg = err?.response?.data?.detail ?? 'Error al guardar'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    savingForm.value = false
  }
}

// Autosave quick-edit con debounce
let _autosaveTimer = null
function autosaveQuick() {
  if (_autosaveTimer) clearTimeout(_autosaveTimer)
  _autosaveTimer = setTimeout(() => guardarQuickEdit(), 350)
}

async function guardarQuickEdit() {
  if (!drawerFalla.value) return
  const payload = {}
  if (quickEdit.estado_id !== drawerFalla.value.estado?.id) payload.estado_id = quickEdit.estado_id
  if (quickEdit.prioridad_id !== drawerFalla.value.prioridad?.id) payload.prioridad_id = quickEdit.prioridad_id
  if ((quickEdit.asignado_a_id ?? null) !== (drawerFalla.value.asignado_a?.id ?? null)) {
    payload.asignado_a_id = quickEdit.asignado_a_id
  }
  if (!Object.keys(payload).length) return

  savingQuick.value = true
  try {
    const { data } = await api.patch(`/fallas/${drawerFalla.value.id}`, payload)
    drawerFalla.value = data
    const idx = allFallas.value.findIndex(f => f.id === data.id)
    if (idx >= 0) allFallas.value[idx] = data
    savedFlash.value = true
    setTimeout(() => { savedFlash.value = false }, 1500)
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo guardar', detail: err?.response?.data?.detail, life: 3000 })
    // Revertir UI
    quickEdit.estado_id = drawerFalla.value.estado?.id ?? null
    quickEdit.prioridad_id = drawerFalla.value.prioridad?.id ?? null
    quickEdit.asignado_a_id = drawerFalla.value.asignado_a?.id ?? null
  } finally {
    savingQuick.value = false
  }
}

async function quickResolve(falla) {
  const estadoFinal = catalogos.value.estados.find(e => e.es_estado_final)
  if (!estadoFinal) {
    toast.add({ severity: 'warn', summary: 'Sin estado final configurado', life: 3000 })
    return
  }
  confirmService.require({
    message: `¿Marcar la falla ${falla.codigo_interno} como ${estadoFinal.etiqueta.toLowerCase()}?`,
    header: 'Resolver falla',
    icon: 'pi pi-check-circle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Marcar resuelta', severity: 'success' },
    accept: async () => {
      resolvingFalla.value = true
      try {
        const { data } = await api.patch(`/fallas/${falla.id}`, {
          estado_id: estadoFinal.id,
          fecha_resolucion: new Date().toISOString(),
          sla_cumplido: !slaVencido(falla),
        })
        const idx = allFallas.value.findIndex(f => f.id === data.id)
        if (idx >= 0) allFallas.value[idx] = data
        if (drawerFalla.value?.id === data.id) drawerFalla.value = data
        toast.add({ severity: 'success', summary: 'Falla resuelta', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
      } finally {
        resolvingFalla.value = false
      }
    },
  })
}

async function reabrirFalla() {
  const abierta = catalogos.value.estados.find(e => e.codigo === 'abierta')
    || catalogos.value.estados.find(e => !e.es_estado_final)
  if (!abierta) {
    toast.add({ severity: 'warn', summary: 'Sin estado abierto configurado', life: 3000 })
    return
  }
  try {
    const { data } = await api.patch(`/fallas/${drawerFalla.value.id}`, {
      estado_id: abierta.id,
      fecha_resolucion: null,
    })
    drawerFalla.value = data
    const idx = allFallas.value.findIndex(f => f.id === data.id)
    if (idx >= 0) allFallas.value[idx] = data
    quickEdit.estado_id = data.estado?.id ?? null
    toast.add({ severity: 'success', summary: 'Falla reabierta', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
  }
}

async function agregarSeguimiento() {
  if (!nuevaNota.nota.trim() && !nuevaNota.estado_id) return
  addingSeg.value = true
  try {
    const payload = {}
    if (nuevaNota.nota.trim()) payload.nota = nuevaNota.nota.trim()
    if (nuevaNota.estado_id) payload.estado_nuevo_id = nuevaNota.estado_id
    await api.post(`/fallas/${drawerFalla.value.id}/seguimientos`, payload)
    nuevaNota.nota = ''
    nuevaNota.estado_id = null
    // Refrescar la falla del drawer
    const { data } = await api.get(`/fallas/${drawerFalla.value.id}`)
    drawerFalla.value = data
    const idx = allFallas.value.findIndex(f => f.id === data.id)
    if (idx >= 0) allFallas.value[idx] = data
    quickEdit.estado_id = data.estado?.id ?? null
    toast.add({ severity: 'success', summary: 'Seguimiento agregado', life: 2000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
  } finally {
    addingSeg.value = false
  }
}

function confirmDelete(falla) {
  confirmService.require({
    message: `¿Eliminar la falla ${falla.codigo_interno}? Esta acción no se puede deshacer.`,
    header: 'Eliminar falla',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary' },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: async () => {
      try {
        await api.delete(`/fallas/${falla.id}`)
        allFallas.value = allFallas.value.filter(f => f.id !== falla.id)
        drawerVisible.value = false
        toast.add({ severity: 'success', summary: 'Falla eliminada', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.detail, life: 3000 })
      }
    },
  })
}

// ── Helpers visuales ─────────────────────────────────────────────────────
function prioColor(codigo) { return PRIO_COLORS[codigo] || '#9ca3af' }
function prioPillStyle(codigo) {
  const c = prioColor(codigo)
  return { background: c + '18', color: c, border: `1px solid ${c}40` }
}
function estadoPillStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '1a', color: c, border: `1px solid ${c}40` }
}
function catTagStyle(hex) {
  const c = hex || '#915BD8'
  return { background: c + '18', color: c, border: `1px solid ${c}33` }
}
function bucketActiveStyle(color, active) {
  if (!active) return {}
  return { boxShadow: `inset 0 0 0 2px ${color}` }
}

function bucketPillStyle(color, active) {
  if (!active) return {}
  return { color }
}

function rowClass(data) {
  return drawerFalla.value?.id === data.id ? 'gf-row-active' : ''
}

function initials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(/\s+/)
  return (parts[0]?.[0] || '?').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()
}

function avatarStyle(user) {
  if (!user) return { background: '#9ca3af' }
  const id = user.id ?? hashCode(user.nombre || '')
  const color = AVATAR_PALETTE[Math.abs(id) % AVATAR_PALETTE.length]
  return { background: color }
}

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return h
}

function horasTranscurridas(falla) {
  if (!falla?.fecha_identificacion) return 0
  const desde = new Date(falla.fecha_ocurrencia || (falla.fecha_identificacion + 'T00:00:00'))
  const hasta = falla.fecha_resolucion ? new Date(falla.fecha_resolucion) : new Date()
  return Math.max(0, Math.round((hasta - desde) / 3_600_000))
}

function slaPct(falla) {
  if (!falla?.sla_limite_horas) return null
  return Math.min(Math.round((horasTranscurridas(falla) / falla.sla_limite_horas) * 100), 110)
}

function slaVencido(falla) {
  const p = slaPct(falla)
  return p != null && p >= 100
}

function slaFillStyle(falla) {
  const p = Math.min(slaPct(falla) ?? 0, 100)
  return { width: `${p}%`, background: slaTextColor(falla) }
}

function slaTextColor(falla) {
  if (falla?.sla_cumplido === true) return '#16a34a'
  if (falla?.sla_cumplido === false) return '#dc2626'
  const p = slaPct(falla)
  if (p == null) return '#9ca3af'
  if (p >= 100) return '#dc2626'
  if (p >= 70) return '#d97706'
  return '#16a34a'
}

function slaText(falla) {
  if (falla?.sla_cumplido === true) return 'OK'
  if (falla?.sla_cumplido === false) return 'Vencido'
  const p = slaPct(falla)
  if (p == null) return '—'
  if (p >= 100) return 'Vencido'
  return `${p}%`
}

function slaSeverity(falla) {
  const c = slaTextColor(falla)
  if (c === '#16a34a') return 'success'
  if (c === '#dc2626') return 'danger'
  if (c === '#d97706') return 'warn'
  return 'secondary'
}

function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO',
    { day: '2-digit', month: 'short', year: 'numeric' })
}

function relativeTime(d, includeAbsolute = false) {
  if (!d) return ''
  const date = typeof d === 'string' && d.length === 10
    ? new Date(d + 'T00:00:00')
    : new Date(d)
  const diff = (Date.now() - date.getTime()) / 1000
  let rel
  if (diff < 60) rel = 'ahora'
  else if (diff < 3600) rel = `hace ${Math.floor(diff / 60)}min`
  else if (diff < 86400) rel = `hace ${Math.floor(diff / 3600)}h`
  else if (diff < 86400 * 30) rel = `hace ${Math.floor(diff / 86400)}d`
  else if (diff < 86400 * 365) rel = `hace ${Math.floor(diff / (86400 * 30))}m`
  else rel = `hace ${Math.floor(diff / (86400 * 365))}a`
  if (diff < 0) {
    const future = Math.abs(diff)
    if (future < 86400) rel = `en ${Math.floor(future / 3600)}h`
    else rel = `en ${Math.floor(future / 86400)}d`
  }
  if (!includeAbsolute) return rel
  return rel
}

function startOfDay(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

// ── Mounted + keyboard ──────────────────────────────────────────────────
function onKeydown(e) {
  // Ignorar si está escribiendo en un input/textarea
  const t = e.target.tagName
  if (t === 'INPUT' || t === 'TEXTAREA' || e.target.isContentEditable) return
  if (e.key === '/') {
    e.preventDefault()
    nextTick(() => searchInputRef.value?.$el?.querySelector('input')?.focus())
  } else if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    abrirCrear()
  } else if (e.key === 'Escape' && drawerVisible.value) {
    drawerVisible.value = false
  } else if (drawerVisible.value && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault()
    navegar(e.key === 'ArrowLeft' ? -1 : 1)
  }
}

// Mide la altura real del header sticky y la expone como --gf-header-h en
// la página. Así la lista compacta se ancla justo debajo del header (colisiona
// con él, no se deja tapar) sin depender de un valor mágico que se desfasa
// cuando los pills/filtros hacen wrap en pantallas medianas.
let _headerRO = null
function measureHeader() {
  if (!stickyHeaderRef.value || !pageRef.value) return
  pageRef.value.style.setProperty('--gf-header-h', `${stickyHeaderRef.value.offsetHeight}px`)
}

onMounted(() => {
  cargar()
  cargarCatalogos()
  cargarProyectos()
  cargarUsuarios()
  window.addEventListener('keydown', onKeydown)
  nextTick(() => {
    measureHeader()
    if (window.ResizeObserver && stickyHeaderRef.value) {
      _headerRO = new ResizeObserver(measureHeader)
      _headerRO.observe(stickyHeaderRef.value)
    }
  })
})

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  _headerRO?.disconnect()
})

// Limpiar drawer al cerrar
watch(drawerVisible, (val) => {
  if (!val) {
    setTimeout(() => { drawerFalla.value = null }, 200)
  }
})

// Si el usuario cambia de bucket y la falla abierta NO pertenece al nuevo bucket,
// cerrar el panel para evitar inconsistencias (ej: viendo una activa y cambias a resueltas).
// NOTA: sólo se aplica al cambio de bucket, no a filtros de búsqueda/proyecto/etc.
// para no interrumpir al usuario mientras refina la lista.
watch(bucket, (newBucket) => {
  if (!drawerVisible.value || !drawerFalla.value) return
  if (newBucket === 'todas') return
  const bucketDeLaFallaAbierta = bucketDeFalla(drawerFalla.value)
  if (bucketDeLaFallaAbierta !== newBucket) {
    drawerVisible.value = false
  }
})

// Si la falla seleccionada cambia de bucket por edición (ej: marcar resuelta) y el
// usuario está viendo Activas, el panel sigue abierto mostrando los datos finales —
// se considera intencional ya que el usuario acaba de actuar sobre esa falla.
</script>

<style scoped>
/* ── Página: layout con scroll híbrido ──────────────────────────────── */
.gf-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Header sticky con title + buckets + filtros — pieza visual unificada */
.gf-sticky-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #f3f4f6;
  padding-top: 4px;
  padding-bottom: 12px;       /* gris hasta el inicio del contenido — sin "gap" desnudo */
  display: flex;
  flex-direction: column;
  gap: 0;                      /* topbar + toolbar pegados, sin franja gris entre ellos */
}
/* El contenedor de scroll (<main>) tiene padding 24px. Un sticky top:0 queda
   anclado 24px por debajo del borde visible, dejando una franja superior por la
   que el contenido (lista compacta / panel detalle) se asomaba al hacer scroll.
   Este "cap" full-bleed tapa esa franja (arriba y en los bordes laterales). */
.gf-sticky-header::before {
  content: "";
  position: absolute;
  left: -24px;
  right: -24px;
  bottom: 100%;
  height: 28px;
  background: #f3f4f6;
  pointer-events: none;
}

/* ── Top bar (parte superior del card unificado) ───────────────────── */
.gf-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 10px;
  background: #fff;
  border-radius: 10px 10px 0 0;  /* sólo bordes superiores redondeados */
  border: 1px solid #ece8f4;
  border-bottom: none;
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
  min-height: 42px;
}
.gf-topbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.gf-topbar-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
  flex-shrink: 0;
}

/* Bucket pills inline */
.gf-bucket-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
  justify-content: center;
  min-width: 0;
}
.bucket-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #6b5a8a;
  transition: all 0.12s;
  white-space: nowrap;
}
.bucket-pill:hover { background: #faf7ff; }
.bucket-pill--active {
  background: #faf5ff;
  border-color: rgba(145, 91, 216, 0.25);
}
.bucket-pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.bucket-pill-label { color: inherit; }
.bucket-pill-count {
  font-weight: 700;
  font-size: 12px;
}

/* ── Toolbar (parte inferior del card unificado, divisor sutil) ────── */
.gf-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #fff;
  border-radius: 0 0 10px 10px;
  border: 1px solid #ece8f4;
  border-top: 1px solid #ece8f4;  /* divisor interno entre filas */
  box-shadow: 0 1px 3px rgba(28, 18, 50, 0.04);
}
.gf-toolbar :deep(.p-inputtext),
.gf-toolbar :deep(.p-select),
.gf-toolbar :deep(.p-datepicker-input) {
  font-size: 12px !important;
  padding-top: 5px !important;
  padding-bottom: 5px !important;
}
.gf-toolbar :deep(.p-select-label) {
  font-size: 12px !important;
  padding-top: 5px !important;
  padding-bottom: 5px !important;
}

/* ── Bucket cards (vista no usada actualmente — backup) ──────────────── */
.bucket-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ece8f4;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  overflow: hidden;
  text-align: left;
}
.bucket-card:hover { background: #faf9fc; transform: translateY(-1px); }
.bucket-card--active { background: #faf7ff; }

.bucket-icon {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 10px; font-size: 16px;
  flex-shrink: 0;
}
.bucket-count {
  font-size: 24px; font-weight: 800; line-height: 1;
}
.bucket-label {
  font-size: 12px; font-weight: 600; color: #6b5a8a;
  text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px;
}
.bucket-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 3px; opacity: 0.65;
}

/* ── Prio stripe + pill ────────────────────────────────────────────────── */
.prio-stripe {
  width: 4px; height: 32px; border-radius: 2px; margin: 0 auto;
}
.prio-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

/* ── Category dot ──────────────────────────────────────────────────────── */
.cat-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 0 2px #fff;
}

/* ── Avatar ────────────────────────────────────────────────────────────── */
.avatar-sm {
  width: 24px; height: 24px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 10px; font-weight: 700;
  flex-shrink: 0;
}
.avatar-sm--empty {
  background: #e5e7eb !important; color: #9ca3af !important;
}

/* ── SLA mini ──────────────────────────────────────────────────────────── */
.sla-mini {
  display: flex; flex-direction: column; gap: 2px;
}
.sla-mini-bar {
  width: 100%; height: 4px;
  background: #f3f4f6; border-radius: 2px; overflow: hidden;
}
.sla-mini-fill {
  height: 100%; border-radius: 2px; transition: width 0.3s;
}
.sla-mini-text {
  font-size: 10px; font-weight: 600; line-height: 1;
}

/* ── Row actions ──────────────────────────────────────────────────────── */
.row-actions {
  display: flex; gap: 2px; opacity: 0.4;
  transition: opacity 0.15s;
}
:deep(tr:hover) .row-actions { opacity: 1; }

/* ── Quick action label ───────────────────────────────────────────────── */
.qa-label {
  width: 78px;
  font-size: 11px;
  font-weight: 600;
  color: #6b5a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* ── Push layout (lista + panel lateral) ──────────────────────────────── */
/* Alturas: AppTopbar=56px, padding p-6=24px*2 = 48px. Total a descontar = 104px (~6.5rem) */
.gf-layout { display: block; }
.gf-main { min-width: 0; }

/* En lg+, cuando hay panel abierto, layout grid: lista compacta + panel ancho */
@media (min-width: 1024px) {
  .gf-layout--split {
    display: grid;
    grid-template-columns: minmax(230px, 290px) minmax(0, 1fr);
    gap: 16px;
    /* stretch (no 'start'): la columna izquierda (.gf-main) debe ocupar TODA
       la altura de la fila (= alto del panel). Si solo midiera su contenido, el
       sticky de la lista compacta no tendría recorrido y se iría con el scroll.
       Con stretch, la lista compacta queda fija durante todo el scroll del panel. */
    align-items: stretch;
  }
  /* La columna izquierda estirada es el containing block del sticky; la lista
     compacta se ancla arriba y el espacio sobrante queda vacío (sin afectar nada). */
  .gf-layout--split .gf-main { align-self: stretch; }
}
@media (min-width: 1440px) {
  .gf-layout--split {
    grid-template-columns: minmax(250px, 325px) minmax(0, 1fr);
  }
}

/* Aside: en <lg = overlay; en lg+ = panel en flujo (sticky) */
.gf-aside {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  justify-content: flex-end;
}
.gf-aside-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(28, 18, 50, 0.35);
  backdrop-filter: blur(2px);
}
.gf-aside-panel {
  position: relative;
  width: 100%;
  max-width: 560px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(28, 18, 50, 0.12);
  overflow: hidden;
}

@media (min-width: 1024px) {
  /* El panel detalle ya NO es sticky: fluye con el scroll de la página */
  .gf-aside {
    position: static;
    z-index: auto;
    display: block;
    max-height: none;
  }
  .gf-aside-backdrop { display: none; }
  .gf-aside-panel {
    max-width: none;
    height: auto;            /* contenido define la altura */
    border-radius: 12px;
    border: 1px solid #ece8f4;
    box-shadow: 0 4px 14px rgba(28, 18, 50, 0.08);
  }
}

/* Header / body / footer del panel */
.gf-drawer-header {
  display: flex; align-items: center; gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid #ece8f4;
  background: #fff;
  flex-shrink: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}
.gf-drawer-header > :deep(.p-button) {
  flex-shrink: 0;
}
.gf-drawer-body {
  padding: 16px 18px;
  display: flex; flex-direction: column; gap: 16px;
  flex: 1;
  /* SIN overflow propio: el contenido del panel scrollea con la página */
}
/* ── Sistema tipográfico del panel detalle ─────────────────────────────
   Sólo 3 niveles para evitar caos:
   - title (h3): text-sm font-bold (14px / semibold)
   - body:      text-sm (14px / 400)
   - meta:      text-xs gray-500 (12px / 500) — siempre AA legible
*/
.gf-drawer-body :deep(.p-tag) {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 8px;
}

.gf-section {
  background: #fff;
  border: 1px solid #ece8f4;
  border-radius: 10px;
  padding: 14px;
}
.gf-section--filled {
  background: #faf9fc;
  border-color: #ece8f4;
}
.gf-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.gf-section-icon {
  color: #915BD8;
  font-size: 13px;
}
.gf-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #2C2039;
  margin: 0;
}
.gf-section-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: #915BD8;
  background: rgba(145, 91, 216, 0.1);
  padding: 1px 8px;
  border-radius: 999px;
  min-width: 22px;
  text-align: center;
}
.gf-save-flag {
  margin-left: auto;
  font-size: 11.5px;
  color: #6b5a8a;
  display: flex;
  align-items: center;
  gap: 4px;
}
.gf-save-flag--ok { color: #047857; font-weight: 600; }

.gf-subhead {
  font-size: 11.5px;
  font-weight: 700;
  color: #6b5a8a;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin: 0 0 4px;
}
.gf-body-text {
  font-size: 14px;
  line-height: 1.55;
  color: #2C2039;
  margin: 0;
}

/* Hero — info de identificación al abrir */
.gf-hero {
  background: linear-gradient(180deg, #faf7ff 0%, #fff 100%);
  border: 1px solid #e9ddff;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gf-hero-desc {
  font-size: 15px;
  line-height: 1.5;
  color: #1f1530;
  font-weight: 500;
  margin: 0;
  white-space: pre-line;
}
.gf-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid #e9ddff;
}
@media (max-width: 480px) {
  .gf-facts { grid-template-columns: 1fr; }
}
.gf-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.gf-fact-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #6b5a8a;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.gf-fact-label i { font-size: 11px; }
.gf-fact-value {
  font-size: 14px;
  color: #2C2039;
  font-weight: 500;
  margin: 0;
  word-break: break-word;
}

/* Grid 2-col para Edición rápida + SLA en pantallas anchas */
.gf-twocol {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .gf-twocol { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}

/* Field row dentro de "Edición rápida" */
.gf-field-row { display: flex; align-items: center; gap: 8px; }
.gf-field-label {
  width: 70px;
  font-size: 12.5px;
  font-weight: 600;
  color: #4a3b6b;
  flex-shrink: 0;
}

/* SLA stat */
.gf-sla-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
}
.gf-sla-num { font-size: 28px; font-weight: 800; line-height: 1; }
.gf-sla-of { font-size: 13px; color: #6b5a8a; font-weight: 500; }

/* Avatar tamaños */
.avatar-xs {
  width: 18px; height: 18px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 9px; font-weight: 700;
  flex-shrink: 0;
}
.avatar-md {
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}

/* Sugerencia destacada */
.gf-suggestion {
  display: flex;
  gap: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 12px 14px;
}
.gf-suggestion-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(217, 119, 6, 0.18);
  color: #92400e;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.gf-suggestion-icon i { font-size: 14px; }
.gf-suggestion-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin: 0 0 3px;
}
.gf-suggestion-text {
  font-size: 14px;
  color: #1f1530;
  margin: 0;
  line-height: 1.45;
}

/* Add note */
.gf-add-note {
  background: #faf9fc;
  border: 1px solid #ece8f4;
  border-radius: 8px;
  padding: 10px;
}
.gf-add-note :deep(textarea) { font-size: 14px; }

/* Acciones inline al final del scroll del panel (NO sticky) */
.gf-actions-inline {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.gf-actions-inline :deep(.p-button) {
  flex: 1 1 140px;
  min-width: 0;
  padding-top: 9px;
  padding-bottom: 9px;
  font-size: 13.5px;
  font-weight: 600;
}

/* Tabla con mismos bordes + sombra que el panel para que combinen visualmente */
.gf-table-wrap {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ece8f4;
  box-shadow: 0 4px 14px rgba(28, 18, 50, 0.08);
  overflow: hidden;
}
@media (min-width: 1024px) {
  .gf-layout--split .gf-table-wrap {
    /* La tabla ocupa toda la altura disponible junto al panel */
    max-height: calc(100vh - var(--gf-header-h, 6.5rem) - 1rem);
    display: flex;
    flex-direction: column;
  }
  .gf-layout--split .gf-table-wrap :deep(.p-datatable) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .gf-layout--split .gf-table-wrap :deep(.p-datatable-wrapper) {
    flex: 1;
    overflow: auto;
  }
}

/* ── DataTable density tweaks ─────────────────────────────────────────── */
:deep(.gf-table .p-datatable-tbody > tr) { cursor: pointer; transition: background 0.12s; }
:deep(.gf-table .p-datatable-tbody > tr > td) {
  padding: 10px 12px;
  vertical-align: middle;
}
:deep(.gf-table .p-datatable-thead > tr > th) {
  background: #faf9fc;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #6b5a8a;
  padding: 10px 12px;
}
:deep(.gf-table .p-datatable-tbody > tr.gf-row-active) {
  background: #faf5ff !important;
  box-shadow: inset 3px 0 0 #915BD8;
}
:deep(.gf-table .p-datatable-tbody > tr.gf-row-active > td) {
  border-color: #e9ddff;
}
:deep(.gf-table .p-datatable-wrapper) {
  overflow-x: auto;
}

/* En split-mode comprimimos buckets y headers para ahorrar espacio */
@media (min-width: 1024px) {
  .gf-layout--split .gf-main { /* hint para hijos */ }
  .gf-layout--split .gf-buckets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Line clamp utility */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

/* ── Compact list (panel abierto en lg+) ───────────────────────────────── */
.gf-compact {
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ece8f4;
  box-shadow: 0 4px 14px rgba(28, 18, 50, 0.08);
  overflow: hidden;
}
@media (min-width: 1024px) {
  /* La lista compacta se ancla JUSTO DEBAJO del sticky-header usando su altura
     real medida (--gf-header-h). Así "choca" con el header y no se deja tapar,
     sin depender de un valor fijo que se desfasa cuando los filtros hacen wrap.
     Fallback 6.25rem para el primer frame antes de medir. */
  .gf-compact {
    position: sticky;
    top: var(--gf-header-h, 6.25rem);
    max-height: calc(100vh - var(--gf-header-h, 6.25rem) - 1.25rem);
    z-index: 1;
  }
}
.gf-compact-header {
  padding: 10px 14px;
  border-bottom: 1px solid #ece8f4;
  background: #faf9fc;
  flex-shrink: 0;
}
.gf-compact-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  padding: 24px;
}
.gf-compact-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.gf-compact-row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 14px 10px 10px;
  border: none;
  background: #fff;
  border-bottom: 1px solid #f3f1f8;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.12s;
}
.gf-compact-row:hover { background: #faf9fc; }
.gf-compact-row--active {
  background: #faf5ff;
}
.gf-compact-row--active::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: #915BD8;
}
.gf-compact-stripe {
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}
.gf-compact-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gf-compact-line1 {
  display: flex;
  align-items: center;
  gap: 6px;
}
.gf-compact-code {
  font-family: 'Courier New', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #6b5a8a;
  background: #f3f1f8;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.2px;
}
.gf-compact-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: auto;
}
.gf-compact-line2 {
  font-size: 13px;
  font-weight: 500;
  color: #2C2039;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}
.gf-compact-row--active .gf-compact-line2 { color: #4a3b6b; font-weight: 600; }
</style>
