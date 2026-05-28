<template>
  <!-- Panel inline (no overlay) — vive dentro de /operaciones/informes-mensuales -->
  <div class="em-panel">

      <!-- ══ HEADER del pipeline (sub-toolbar) ══════════════════════ -->
      <header class="em-header">
        <div class="em-header-left">
          <p class="em-header-sub">
            Pipeline · <b>Edición</b> → <b>Revisión</b> → <b>Comentarios</b> → <b>Aprobación</b> → <b>Envío</b>
          </p>
        </div>

        <div class="em-header-right">
          <div class="em-search-wrap">
            <i class="pi pi-search em-search-icon" />
            <input v-model="busqueda" type="text" placeholder="Buscar proyecto…" class="em-search-input" />
            <button v-if="busqueda" class="em-search-clear" @click="busqueda = ''" title="Limpiar">✕</button>
          </div>
          <div class="em-month-picker">
            <button class="em-month-nav" @click="cambiarMes(-1)" title="Mes anterior">‹</button>
            <input type="month" v-model="mesSel" :max="mesMax" class="em-month-input" />
            <button class="em-month-nav" @click="cambiarMes(1)" :disabled="mesSel === mesMax" title="Mes siguiente">›</button>
          </div>
          <Button icon="pi pi-refresh" outlined size="small" :loading="loading" @click="cargar"
                  v-tooltip.bottom="'Actualizar lista'" />
        </div>
      </header>

      <!-- ══ KPI strip (compacto) ═════════════════════════════════ -->
      <div class="em-kpis">
        <button class="em-kpi" :class="{ 'em-kpi--on': filtro === '' }" @click="filtro = ''">
          <span class="em-kpi-num">{{ resumen.total }}</span>
          <span class="em-kpi-lbl">Total</span>
        </button>
        <button class="em-kpi em-kpi-pend" :class="{ 'em-kpi--on': filtro === 'pendiente' }" @click="filtro = filtro === 'pendiente' ? '' : 'pendiente'">
          <span class="em-kpi-num">{{ resumen.pendiente }}</span>
          <span class="em-kpi-lbl">Pendientes</span>
        </button>
        <button class="em-kpi em-kpi-coms" :class="{ 'em-kpi--on': filtro === 'comentado' }" @click="filtro = filtro === 'comentado' ? '' : 'comentado'">
          <span class="em-kpi-num">{{ resumen.comentado }}</span>
          <span class="em-kpi-lbl">Con comentarios</span>
        </button>
        <button class="em-kpi em-kpi-resol" :class="{ 'em-kpi--on': filtro === 'resuelto' }" @click="filtro = filtro === 'resuelto' ? '' : 'resuelto'">
          <span class="em-kpi-num">{{ resumen.resuelto }}</span>
          <span class="em-kpi-lbl">Resueltos</span>
        </button>
        <button class="em-kpi em-kpi-ver" :class="{ 'em-kpi--on': filtro === 'verificado' }" @click="filtro = filtro === 'verificado' ? '' : 'verificado'">
          <span class="em-kpi-num">{{ resumen.verificado }}</span>
          <span class="em-kpi-lbl">Verificados</span>
        </button>
        <button class="em-kpi em-kpi-env" :class="{ 'em-kpi--on': filtro === 'enviado' }" @click="filtro = filtro === 'enviado' ? '' : 'enviado'">
          <span class="em-kpi-num">{{ resumen.enviado }}</span>
          <span class="em-kpi-lbl">Enviados</span>
        </button>
      </div>

      <!-- ══ Acciones masivas ══════════════════════════════════ -->
      <div v-if="puedeEnviarBatch.length > 0 && permisoEnviar" class="em-batch-bar">
        <span class="em-batch-info">
          <i class="pi pi-info-circle" />
          {{ puedeEnviarBatch.length }} informe{{ puedeEnviarBatch.length !== 1 ? 's' : '' }} verificado{{ puedeEnviarBatch.length !== 1 ? 's' : '' }} listo{{ puedeEnviarBatch.length !== 1 ? 's' : '' }} para envío
        </span>
        <Button label="Enviar todos al cliente" icon="pi pi-send" size="small"
                :loading="enviandoBatch" @click="abrirConfirmEnvio" class="em-btn-send" />
      </div>

      <!-- ══ Contenido (layout split o full) ══════════════════ -->
      <div class="em-content" :class="{ 'em-content--split': !!drawerInf }">

        <!-- ── IZQUIERDA: lista compacta (split) o tabla completa ─────── -->
        <div class="em-main">

          <!-- LISTA COMPACTA cuando el panel derecho está abierto -->
          <div v-if="drawerInf" class="em-compact">
            <div class="em-compact-header">
              <span class="em-compact-count">{{ filtrados.length }} informe{{ filtrados.length !== 1 ? 's' : '' }}</span>
            </div>
            <div v-if="loading" class="em-compact-empty">
              <ProgressSpinner style="width:24px;height:24px" />
            </div>
            <div v-else-if="!filtrados.length" class="em-compact-empty">
              <i class="pi pi-inbox" style="font-size:20px;color:#A89EC0;margin-bottom:6px" />
              <p style="font-size:11px;color:#6B5A8A;margin:0">Sin resultados</p>
            </div>
            <div v-else class="em-compact-list">
              <button v-for="inf in filtrados" :key="inf.id"
                      class="em-compact-row"
                      :class="{ 'em-compact-row--active': drawerInf?.id === inf.id }"
                      @click="abrirDrawer(inf)">
                <span class="em-compact-dot" :style="{ background: estadoColor(pipelineEstado(inf)) }" />
                <div class="em-compact-info">
                  <div class="em-compact-nombre">{{ inf.proyecto_nombre || inf.sub_project }}</div>
                  <div class="em-compact-meta">
                    <span class="em-tipo-tag">{{ tipoLabel(inf.tipo) }}</span>
                    <span :class="['em-state-pill', `em-pill-${pipelineEstado(inf)}`]" style="font-size:9px;padding:1px 6px">
                      {{ estadoLabel(pipelineEstado(inf)) }}
                    </span>
                  </div>
                </div>
                <div class="em-compact-actions" @click.stop>
                  <button class="em-icon-btn em-btn-edit"
                          @click="editar(inf)"
                          v-tooltip.right="'Editar informe'"
                          style="width:22px;height:22px;font-size:11px">
                    <i class="pi pi-pencil" />
                  </button>
                </div>
              </button>
            </div>
          </div>

          <!-- TABLA COMPLETA cuando no hay panel abierto -->
          <div v-else class="em-table-wrap">
            <div v-if="loading" class="em-state">
              <ProgressSpinner style="width:32px;height:32px" />
              <span>Cargando informes del mes…</span>
            </div>
            <div v-else-if="!filtrados.length" class="em-state em-state-empty">
              <i class="pi pi-inbox text-3xl" style="color:#A89EC0" />
              <p class="em-state-title">{{ filtro ? 'Sin informes en este estado' : 'No hay informes guardados para este mes' }}</p>
              <p class="em-state-sub">
                {{ filtro ? 'Quita el filtro para ver todos.' : 'Genera informes desde el wizard de arriba y aparecerán aquí.' }}
              </p>
            </div>
            <table v-else class="em-table">
              <thead>
                <tr>
                  <th class="em-col-estado">Estado</th>
                  <th>Proyecto</th>
                  <th>Tipo</th>
                  <th>Editado</th>
                  <th>Verificado por</th>
                  <th>Enviado</th>
                  <th class="em-col-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inf in filtrados" :key="inf.id"
                    class="em-row"
                    :class="{ 'em-row--active': drawerInf?.id === inf.id }"
                    @click="abrirDrawer(inf)">
                  <td>
                    <span :class="['em-state-pill', `em-pill-${pipelineEstado(inf)}`]">
                      {{ estadoLabel(pipelineEstado(inf)) }}
                    </span>
                  </td>
                  <td class="em-td-proj">
                    <div class="em-proj-nombre">{{ inf.proyecto_nombre || inf.sub_project }}</div>
                    <div class="em-proj-sub" v-if="inf.proyecto_nombre && inf.sub_project !== inf.proyecto_nombre">{{ inf.sub_project }}</div>
                  </td>
                  <td>
                    <span class="em-tipo-tag">{{ tipoLabel(inf.tipo) }}</span>
                  </td>
                  <td class="em-td-fecha">
                    <div>{{ inf.editado_en ? formatFecha(inf.editado_en) : '—' }}</div>
                    <div class="em-fecha-sub" v-if="inf.editado_por_nombre">{{ inf.editado_por_nombre }}</div>
                  </td>
                  <td class="em-td-fecha">
                    <div v-if="inf.aprobado_por_nombre">
                      <span class="em-fecha-sub">{{ inf.aprobado_por_nombre }}</span>
                    </div>
                    <div v-else class="em-td-empty">—</div>
                  </td>
                  <td class="em-td-fecha">
                    <div v-if="inf.correo_enviado">
                      <span class="em-mail-ok">📧 {{ inf.correo_enviado_en ? formatFecha(inf.correo_enviado_en) : '✓' }}</span>
                      <div class="em-fecha-sub" v-if="inf.enviado_por_nombre">{{ inf.enviado_por_nombre }}</div>
                    </div>
                    <div v-else class="em-td-empty">—</div>
                  </td>
                  <td class="em-td-acciones" @click.stop>
                    <button class="em-icon-btn em-btn-edit" @click="editar(inf)"
                            v-tooltip.bottom="'Editar informe en pantalla completa'">
                      <i class="pi pi-pencil" />
                    </button>
                    <button class="em-icon-btn"
                            :class="{
                              'em-btn-coms-on': comentariosPendientes(inf) > 0,
                              'em-btn-coms-resolved': comentariosTotales(inf) > 0 && comentariosPendientes(inf) === 0,
                              'em-btn-coms-empty': comentariosTotales(inf) === 0,
                            }"
                            @click="abrirDrawer(inf, 'comentarios')"
                            v-tooltip.bottom="comentariosTooltip(inf)">
                      <i class="pi pi-comments" />
                      <span v-if="comentariosTotales(inf) > 0" class="em-coms-badge"
                            :class="{ 'em-coms-badge--err': comentariosPendientes(inf) > 0 }">
                        {{ comentariosPendientes(inf) || comentariosTotales(inf) }}
                      </span>
                    </button>
                    <button v-if="puedeVerificar(inf)" class="em-icon-btn em-btn-verify"
                            :disabled="!permisoVerificar"
                            @click="abrirDrawer(inf, 'verificar')"
                            v-tooltip.bottom="permisoVerificar ? 'Revisar y verificar (aprobar)' : 'Sólo Juan José puede verificar'">
                      <i class="pi pi-check-circle" />
                    </button>
                    <button v-if="inf.estado === 'aprobado' && !inf.correo_enviado" class="em-icon-btn em-btn-send"
                            :disabled="!permisoEnviar || enviandoIds.has(inf.id)"
                            @click="enviarUno(inf)"
                            v-tooltip.bottom="permisoEnviar ? 'Enviar al correo del cliente' : 'Sólo Laura H. (o admin) puede enviar'">
                      <i :class="enviandoIds.has(inf.id) ? 'pi pi-spin pi-spinner' : 'pi pi-send'" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Faltantes -->
            <div v-if="!loading && faltantes.length > 0" class="em-faltantes-wrap">
              <button class="em-faltantes-toggle" @click="showFaltantes = !showFaltantes">
                <span class="em-faltantes-badge">{{ faltantes.length }}</span>
                <span>Proyecto{{ faltantes.length !== 1 ? 's' : '' }} sin informe en {{ mesLabel }}</span>
                <i :class="showFaltantes ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" style="margin-left:auto;font-size:11px;color:#6B5A8A" />
              </button>
              <transition name="fade">
                <div v-if="showFaltantes" class="em-faltantes-list">
                  <div v-for="p in faltantes" :key="p" class="em-faltante-row">
                    <span class="em-faltante-dot" />
                    <span class="em-faltante-nombre">{{ p }}</span>
                    <span class="em-faltante-hint">Sin informe operacional</span>
                  </div>
                </div>
              </transition>
            </div>

          </div>
        </div><!-- /em-main -->

        <!-- ── DERECHA: panel detalle ──────────────────────────────────── -->
        <transition name="slide-right">
          <aside v-if="drawerInf" class="em-detail">
            <!-- Backdrop solo en móvil -->
            <div class="em-detail-backdrop" @click="cerrarDrawer" />

            <div class="em-detail-panel">
              <!-- Header del panel -->
              <header class="em-drawer-head">
                <div class="em-drawer-head-info">
                  <div class="em-drawer-title">{{ drawerInf.proyecto_nombre || drawerInf.sub_project }}</div>
                  <div class="em-drawer-sub">
                    <span class="em-tipo-tag">{{ tipoLabel(drawerInf.tipo) }}</span>
                    <span>·</span>
                    <span>{{ drawerInf.periodo_display || formatPeriodo(drawerInf.periodo_desde) }}</span>
                    <span>·</span>
                    <span :class="['em-state-pill', `em-pill-${pipelineEstado(drawerInf)}`]">
                      {{ estadoLabel(pipelineEstado(drawerInf)) }}
                    </span>
                  </div>
                </div>
                <div class="em-drawer-head-actions">
                  <button class="em-close" @click="cerrarDrawer" title="Cerrar panel">✕</button>
                </div>
              </header>

              <!-- Tabs internas del panel -->
              <div class="em-drawer-tabs">
                <button class="em-drawer-tab" :class="{ 'em-drawer-tab--on': drawerTab === 'preview' }"
                        @click="drawerTab = 'preview'">
                  <i class="pi pi-eye" /> Previsualización
                </button>
                <button class="em-drawer-tab" :class="{ 'em-drawer-tab--on': drawerTab === 'comentarios' }"
                        @click="drawerTab = 'comentarios'">
                  <i class="pi pi-comments" /> Comentarios
                  <span v-if="comentariosTotales(drawerInf) > 0" class="em-drawer-tab-badge"
                        :class="{ 'em-drawer-tab-badge--err': comentariosPendientes(drawerInf) > 0 }">
                    {{ comentariosPendientes(drawerInf) || comentariosTotales(drawerInf) }}
                  </span>
                </button>
                <button v-if="puedeVerificar(drawerInf)" class="em-drawer-tab"
                        :class="{ 'em-drawer-tab--on': drawerTab === 'verificar' }"
                        @click="drawerTab = 'verificar'">
                  <i class="pi pi-check-circle" /> Verificar
                </button>
              </div>

              <div class="em-drawer-body">

                <!-- ── PREVIEW (iframe) ─────────────────────────────── -->
                <div v-if="drawerTab === 'preview'" class="em-preview-wrap">
                  <div v-if="loadingDetalle" class="em-state">
                    <ProgressSpinner style="width:28px;height:28px" />
                    <span>Cargando informe…</span>
                  </div>
                  <div v-else-if="!detalleHtml" class="em-state em-state-empty">
                    <i class="pi pi-file" />
                    <p>Sin contenido del informe</p>
                  </div>
                  <template v-else>
                    <!-- Toolbar de acciones -->
                    <div class="em-preview-toolbar">
                      <span v-if="drawerInf?.estado === 'aprobado'" class="em-edit-locked">
                        🔒 Aprobado — reabre desde Verificar para editar
                      </span>
                      <div class="em-preview-actions">
                        <Button v-if="drawerInf?.estado !== 'aprobado'"
                                label="Editar" icon="pi pi-pencil" outlined size="small"
                                @click="editar(drawerInf)" />
                        <Button label="PDF" icon="pi pi-print" outlined size="small" severity="warn"
                                @click="imprimirDetalle" v-tooltip.bottom="'Imprimir / exportar PDF'" />
                      </div>
                    </div>
                    <!-- Iframe con el informe renderizado -->
                    <div class="em-preview-frame">
                      <iframe :key="previewKey"
                              ref="previewIframeRef"
                              class="em-preview-iframe"
                              :srcdoc="previewDoc"
                              sandbox="allow-same-origin" />
                    </div>
                  </template>
                </div>

                <!-- ── COMENTARIOS ──────────────────────────────────── -->
                <div v-else-if="drawerTab === 'comentarios'" class="em-coms-wrap">
                  <div v-if="!drawerInf.comentarios?.length" class="em-state em-state-empty em-state-coms-empty">
                    <i class="pi pi-comments text-3xl" style="color:#A89EC0" />
                    <p class="em-state-title">Sin comentarios todavía</p>
                    <p class="em-state-sub">
                      {{ permisoVerificar
                        ? 'Agrega observaciones que el equipo deba subsanar antes de enviar.'
                        : 'Cuando el verificador deje observaciones, aparecerán aquí.' }}
                    </p>
                  </div>
                  <div v-else class="em-coms-list">
                    <div v-for="c in (drawerInf.comentarios || [])" :key="c.id"
                         class="em-com" :class="{ 'em-com--resuelto': c.resuelto }">
                      <div class="em-com-head">
                        <div class="em-com-autor">
                          <div class="em-com-avatar" :style="{ background: avatarColor(c.autor_email) }">
                            {{ (c.autor_nombre || c.autor_email || '?').charAt(0).toUpperCase() }}
                          </div>
                          <div>
                            <div class="em-com-autor-nombre">{{ c.autor_nombre || c.autor_email }}</div>
                            <div class="em-com-fecha">{{ formatFechaCorta(c.created_at) }}</div>
                          </div>
                        </div>
                        <span v-if="c.resuelto" class="em-com-estado-ok">✅ Subsanado</span>
                        <span v-else class="em-com-estado-pend">⚠️ Pendiente</span>
                      </div>
                      <div class="em-com-msg">{{ c.mensaje }}</div>
                      <div v-if="c.resuelto && c.respuesta" class="em-com-respuesta">
                        <div class="em-com-respuesta-lbl">Respuesta de quien subsanó:</div>
                        <div>{{ c.respuesta }}</div>
                        <div class="em-com-fecha em-com-respuesta-meta">
                          {{ c.resuelto_por_nombre || c.resuelto_por_email }} · {{ formatFechaCorta(c.resuelto_en) }}
                        </div>
                      </div>
                      <div v-if="!c.resuelto" class="em-com-actions">
                        <button class="em-btn-sm em-btn-resolver"
                                :disabled="actuandoComentarioId === c.id"
                                @click="abrirResolver(c)">
                          <i class="pi pi-check" /> Marcar subsanado
                        </button>
                        <button v-if="puedeBorrarComentario(c)" class="em-btn-sm em-btn-borrar"
                                :disabled="actuandoComentarioId === c.id"
                                @click="borrarComentario(c)">
                          <i class="pi pi-trash" /> Eliminar
                        </button>
                      </div>
                      <!-- Inline form para subsanar -->
                      <div v-if="resolviendoId === c.id" class="em-resolver-form">
                        <label class="em-resolver-lbl">¿Cómo se subsanó? (opcional)</label>
                        <textarea v-model="resolviendoTexto" rows="2"
                                  placeholder="Describe brevemente qué se cambió o ajustó…"
                                  class="em-textarea" />
                        <div class="em-resolver-actions">
                          <button class="em-btn-sm em-btn-ghost" @click="resolviendoId = null">Cancelar</button>
                          <button class="em-btn-sm em-btn-resolver" :disabled="actuandoComentarioId === c.id"
                                  @click="resolverComentario(c)">
                            Confirmar subsanación
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Form nuevo comentario -->
                  <div v-if="drawerInf.estado !== 'aprobado'" class="em-com-add">
                    <textarea v-model="nuevoComentario" rows="3"
                              :placeholder="permisoVerificar
                                ? 'Escribe una observación para que el equipo subsane…'
                                : 'Sólo el verificador puede agregar observaciones. Tú puedes subsanar los comentarios existentes.'"
                              class="em-textarea"
                              :disabled="!permisoVerificar" />
                    <div class="em-com-add-actions">
                      <Button label="Agregar comentario" icon="pi pi-plus" size="small"
                              :disabled="!permisoVerificar || !nuevoComentario.trim() || agregandoComentario"
                              :loading="agregandoComentario"
                              @click="agregarComentario" />
                    </div>
                  </div>
                  <div v-else class="em-aprobado-msg">
                    ✅ Informe aprobado/verificado · ya no se aceptan más observaciones
                  </div>
                </div>

                <!-- ── VERIFICAR ─────────────────────────────────────── -->
                <div v-else-if="drawerTab === 'verificar'" class="em-verify-wrap">
                  <div v-if="!permisoVerificar" class="em-verify-blocked">
                    <i class="pi pi-lock text-3xl" style="color:#D97706" />
                    <p class="em-state-title">Verificación restringida</p>
                    <p class="em-state-sub">
                      Sólo <b>Juan José Pacheco</b> ({{ EMAIL_VERIFICADOR }}) o un administrador pueden verificar informes.
                    </p>
                  </div>
                  <template v-else>
                    <div class="em-verify-check">
                      <div class="em-check-row" :class="{ 'em-check-row--err': comentariosPendientes(drawerInf) > 0 }">
                        <span>{{ comentariosPendientes(drawerInf) > 0 ? '⚠️' : '✅' }}</span>
                        <span>
                          <b>{{ comentariosPendientes(drawerInf) }}</b>
                          comentario{{ comentariosPendientes(drawerInf) !== 1 ? 's' : '' }} sin subsanar
                          {{ comentariosPendientes(drawerInf) > 0 ? '— se debe subsanar antes de aprobar' : '' }}
                        </span>
                      </div>
                      <div class="em-check-row">
                        <span>{{ drawerInf.editado_por_nombre ? '✅' : '—' }}</span>
                        <span>Última edición: <b>{{ drawerInf.editado_por_nombre || 'sin registro' }}</b>
                          {{ drawerInf.editado_en ? ' · ' + formatFecha(drawerInf.editado_en) : '' }}
                        </span>
                      </div>
                      <div class="em-check-row">
                        <span>{{ drawerInf.estado === 'aprobado' ? '✅' : '🕒' }}</span>
                        <span>Estado actual: <b>{{ estadoLabel(pipelineEstado(drawerInf)) }}</b></span>
                      </div>
                    </div>
                    <div class="em-verify-actions">
                      <Button v-if="drawerInf.estado !== 'aprobado'"
                              label="✅ Verificar y aprobar"
                              :disabled="comentariosPendientes(drawerInf) > 0 || verificando"
                              :loading="verificando"
                              @click="verificarYAprobar" class="em-btn-verify-big" />
                      <Button v-else
                              label="↩ Reabrir para corrección" outlined severity="warn" size="small"
                              @click="reabrir" />
                      <p class="em-verify-hint">
                        {{ drawerInf.estado === 'aprobado'
                          ? 'Si necesitas devolver el informe para corregir algo, reábrelo y agrega comentarios.'
                          : 'Aprueba sólo si el contenido es correcto y todas las observaciones están subsanadas.' }}
                      </p>
                    </div>
                  </template>
                </div>

              </div><!-- /em-drawer-body -->
            </div><!-- /em-detail-panel -->
          </aside>
        </transition>

      </div><!-- /em-content -->

      <!-- ══ Modal confirmación envío masivo ═════════════════════════ -->
      <transition name="fade">
        <div v-if="confirmEnvio" class="em-modal-bd" @click.self="cerrarConfirmEnvio">
          <div class="em-modal">
            <header class="em-modal-head">
              <div>
                <h3>Enviar {{ puedeEnviarBatch.length }} informe{{ puedeEnviarBatch.length !== 1 ? 's' : '' }} verificado{{ puedeEnviarBatch.length !== 1 ? 's' : '' }}</h3>
                <p>Se enviará por correo al cliente operacional registrado de cada proyecto.</p>
              </div>
              <button class="em-close" :disabled="enviandoBatch" @click="cerrarConfirmEnvio">✕</button>
            </header>
            <div class="em-modal-body">
              <div v-if="!enviandoBatch && !resultadoBatch" class="em-modal-list">
                <div v-for="(inf, i) in puedeEnviarBatch" :key="inf.id" class="em-modal-row">
                  <span class="em-modal-num">{{ i + 1 }}</span>
                  <div class="em-modal-info">
                    <div class="em-modal-info-nombre">{{ inf.proyecto_nombre || inf.sub_project }}</div>
                    <div class="em-modal-info-meta">
                      <span class="em-tipo-tag">{{ tipoLabel(inf.tipo) }}</span> ·
                      {{ inf.periodo_display || formatPeriodo(inf.periodo_desde) }}
                    </div>
                  </div>
                  <span class="em-mail-ico">📧</span>
                </div>
              </div>
              <div v-else-if="enviandoBatch" class="em-modal-progress">
                <div class="em-bar-wrap"><div class="em-bar" :style="{ width: `${(progBatch.hechos / progBatch.total) * 100}%` }" /></div>
                <div class="em-prog-row">
                  <span class="em-prog-num">{{ progBatch.hechos }} / {{ progBatch.total }}</span>
                  <span class="em-prog-msg">{{ progBatch.actual }}</span>
                </div>
              </div>
              <div v-else class="em-modal-result">
                <div class="em-result-big">
                  <span class="em-result-ok" v-if="resultadoBatch.ok">✅ {{ resultadoBatch.ok }}</span>
                  <span class="em-result-err" v-if="resultadoBatch.err">⚠️ {{ resultadoBatch.err }}</span>
                </div>
                <div v-for="d in resultadoBatch.detalles" :key="d.id" class="em-result-row"
                     :class="{ 'em-result-row--err': !d.ok }">
                  <span>{{ d.ok ? '✅' : '⚠️' }}</span>
                  <div>
                    <div class="em-result-nombre">{{ d.nombre }}</div>
                    <div class="em-result-msg">{{ d.msg }}</div>
                  </div>
                </div>
              </div>
            </div>
            <footer class="em-modal-foot">
              <Button v-if="!enviandoBatch && !resultadoBatch" label="Cancelar" outlined size="small" @click="cerrarConfirmEnvio" />
              <Button v-if="!enviandoBatch && !resultadoBatch"
                      :label="`Confirmar envío de ${puedeEnviarBatch.length}`"
                      icon="pi pi-send" size="small" @click="ejecutarEnvioBatch" class="em-btn-send" />
              <Button v-if="resultadoBatch" label="Cerrar" size="small" @click="cerrarConfirmEnvio" />
            </footer>
          </div>
        </div>
      </transition>

      <!-- Toast simple -->
      <transition name="fade">
        <div v-if="toastMsg" :class="['em-toast', toastErr ? 'em-toast-err' : 'em-toast-ok']">
          {{ toastMsg }}
        </div>
      </transition>

  </div><!-- /em-panel -->

  <!-- ══ EDITOR PANTALLA COMPLETA (teleport al body para cubrir TODO) ══ -->
  <Teleport to="body">
    <transition name="fade">
      <div v-if="editandoFullscreen" class="em-editor-overlay">
        <!-- Toolbar fija -->
        <div class="em-editor-bar">
          <div class="em-editor-bar-left">
            <i class="pi pi-pencil" style="color:#915BD8;font-size:13px" />
            <span class="em-editor-title">{{ editorInf?.proyecto_nombre || editorInf?.sub_project }}</span>
            <span class="em-tipo-tag" v-if="editorInf">{{ tipoLabel(editorInf.tipo) }}</span>
            <span v-if="editorInf" class="em-editor-periodo">
              · {{ editorInf.periodo_display || formatPeriodo(editorInf.periodo_desde) }}
            </span>
          </div>
          <div class="em-editor-bar-right">
            <button class="em-btn-sm em-btn-ghost" @click="imprimirEditor">
              <i class="pi pi-print" /> PDF
            </button>
            <button class="em-btn-sm em-btn-ghost" :disabled="guardandoEditor" @click="cerrarEditor">
              <i class="pi pi-times" /> Cerrar sin guardar
            </button>
            <button class="em-btn-sm em-btn-resolver" :disabled="guardandoEditor" @click="guardarEditor">
              <i :class="guardandoEditor ? 'pi pi-spin pi-spinner' : 'pi pi-save'" />
              {{ guardandoEditor ? 'Guardando…' : 'Guardar versión' }}
            </button>
          </div>
        </div>
        <!-- Iframe editable -->
        <div class="em-editor-body">
          <iframe ref="editorIframeRef"
                  class="em-editor-iframe"
                  :srcdoc="editorDoc"
                  sandbox="allow-same-origin"
                  title="Editor de informe" />
        </div>
        <!-- Hint edición -->
        <div class="em-editor-hint">
          <i class="pi pi-info-circle" />
          Haz clic en cualquier texto para editarlo directamente · Los cambios no se guardan hasta presionar "Guardar versión"
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import api from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { buildReportHtmlDoc } from '@/utils/rptStyles'

const auth = useAuthStore()

const EMAIL_VERIFICADOR     = 'juan.jose@unergy.io'
const EMAIL_VERIFICADOR_ALT = 'juanjose@unergy.io'
const EMAIL_REMITENTE       = 'laura.h@unergy.io'
const LS_MES_KEY            = 'em_pipeline_mes'

const userEmail = computed(() => (auth.user?.email || '').toLowerCase())
const userRol   = computed(() => auth.user?.rol || '')
const permisoVerificar = computed(() =>
  userRol.value === 'admin' || [EMAIL_VERIFICADOR, EMAIL_VERIFICADOR_ALT].includes(userEmail.value)
)
const permisoEnviar = computed(() =>
  permisoVerificar.value || userEmail.value === EMAIL_REMITENTE
)

// ── Estado ─────────────────────────────────────────────────────
const today  = new Date()
const mesMax = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const _prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
const mesPrevio = `${_prevDate.getFullYear()}-${String(_prevDate.getMonth() + 1).padStart(2, '0')}`
const _savedMes = localStorage.getItem(LS_MES_KEY)
const mesSel = ref((_savedMes && _savedMes <= mesMax) ? _savedMes : mesPrevio)

const informes   = ref([])
const loading    = ref(false)
const filtro     = ref('')
const busqueda   = ref('')

const todosProyectos  = ref([])
const showFaltantes   = ref(false)

// Drawer / panel detalle
const drawerInf      = ref(null)
const drawerTab      = ref('preview')
const detalleHtml    = ref('')
const loadingDetalle = ref(false)
const previewKey     = ref(0)          // ← fuerza reload del iframe
const previewIframeRef = ref(null)     // ref al iframe de previsualización

// Editor pantalla completa
const editandoFullscreen = ref(false)
const editorInf          = ref(null)
const editorHtml         = ref('')
const editorIframeRef    = ref(null)
const guardandoEditor    = ref(false)

// Comentarios
const nuevoComentario      = ref('')
const agregandoComentario  = ref(false)
const resolviendoId        = ref(null)
const resolviendoTexto     = ref('')
const actuandoComentarioId = ref(null)

// Verificación
const verificando = ref(false)

// Envío masivo
const confirmEnvio   = ref(false)
const enviandoBatch  = ref(false)
const progBatch      = ref({ hechos: 0, total: 0, actual: '' })
const resultadoBatch = ref(null)
const enviandoIds    = ref(new Set())

// Toast
const toastMsg = ref('')
const toastErr = ref(false)
let _toastTimer = null
function toast(msg, err = false) {
  toastMsg.value = msg; toastErr.value = err
  if (_toastTimer) clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { toastMsg.value = '' }, 4000)
}

// ── Computed ───────────────────────────────────────────────────
function pipelineEstado(inf) {
  if (inf.correo_enviado)        return 'enviado'
  if (inf.estado === 'aprobado') return 'verificado'
  const total = (inf.comentarios || []).length
  const pend  = (inf.comentarios || []).filter(c => !c.resuelto).length
  if (pend  > 0) return 'comentado'
  if (total > 0) return 'resuelto'
  if (inf.estado === 'revisado') return 'resuelto'
  return 'pendiente'
}

const ESTADO_COLORS = {
  pendiente:  '#D97706',
  comentado:  '#DC2626',
  resuelto:   '#2563EB',
  verificado: '#16A34A',
  enviado:    '#7C3AED',
}
function estadoColor(e) { return ESTADO_COLORS[e] || '#9CA3AF' }

const mesLabel = computed(() => {
  if (!mesSel.value) return ''
  const [y, m] = mesSel.value.split('-')
  const n = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
             'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][+m]
  return `${n} ${y}`
})

const proyectosConInforme = computed(() =>
  new Set(informes.value.filter(i => i.tipo === 'op').map(i => i.sub_project))
)
const faltantes = computed(() =>
  todosProyectos.value.filter(p => !proyectosConInforme.value.has(p))
)
const filtrados = computed(() => {
  let list = informes.value
  if (filtro.value) list = list.filter(i => pipelineEstado(i) === filtro.value)
  if (busqueda.value.trim()) {
    const q = busqueda.value.trim().toLowerCase()
    list = list.filter(i =>
      (i.proyecto_nombre || '').toLowerCase().includes(q) ||
      (i.sub_project || '').toLowerCase().includes(q)
    )
  }
  return list
})
const resumen = computed(() => {
  const r = { total: informes.value.length, pendiente: 0, comentado: 0, resuelto: 0, verificado: 0, enviado: 0 }
  informes.value.forEach(i => { r[pipelineEstado(i)] = (r[pipelineEstado(i)] || 0) + 1 })
  return r
})
const puedeEnviarBatch = computed(() =>
  informes.value.filter(i => i.estado === 'aprobado' && !i.correo_enviado)
)

// Iframe preview doc (computado de detalleHtml)
const previewDoc = computed(() => {
  if (!detalleHtml.value) return '<html><body></body></html>'
  return buildReportHtmlDoc(detalleHtml.value, {
    title:  drawerInf.value?.proyecto_nombre || 'Informe',
    bgGray: true,
  })
})

// Iframe editor doc (editable) — sólo cambia al abrir el editor, no durante la edición
const editorDoc = computed(() => {
  if (!editorHtml.value) return '<html><body></body></html>'
  return buildReportHtmlDoc(editorHtml.value, {
    title:    editorInf.value?.proyecto_nombre || 'Editor',
    bgGray:   false,
    editable: true,
  })
})

// ── Helpers ────────────────────────────────────────────────────
function comentariosTotales(inf)    { return (inf.comentarios || []).length }
function comentariosPendientes(inf) { return (inf.comentarios || []).filter(c => !c.resuelto).length }
function comentariosTooltip(inf) {
  const t = comentariosTotales(inf), p = comentariosPendientes(inf)
  if (t === 0) return 'Sin comentarios'
  if (p === 0) return `${t} comentario(s) — todos subsanados`
  return `${p} de ${t} comentarios sin subsanar`
}
function puedeVerificar(inf)  { return inf.estado !== 'aprobado' }
function puedeBorrarComentario(c) {
  return (c.autor_email || '').toLowerCase() === userEmail.value || userRol.value === 'admin'
}
function tipoLabel(t) {
  return { op: 'Operacional', fmo: 'FMO', port: 'Portafolio' }[t] || (t || '—').toUpperCase()
}
function estadoLabel(e) {
  return {
    pendiente: 'Pendiente', comentado: 'Con comentarios', resuelto: 'Comentarios resueltos',
    verificado: 'Verificado', enviado: 'Enviado'
  }[e] || e
}
function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatFechaCorta(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function formatPeriodo(iso) {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  const mes = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+m] || m
  return `${mes} ${y}`
}
function avatarColor(email) {
  const colors = ['#915BD8','#F97316','#16A34A','#2563EB','#DC2626','#D97706','#9333EA','#0891B2']
  let h = 0
  for (const c of (email || '')) h = ((h << 5) - h) + c.charCodeAt(0) | 0
  return colors[Math.abs(h) % colors.length]
}

// ── Cargar informes ─────────────────────────────────────────────
async function cargar() {
  if (!mesSel.value) return
  loading.value = true
  localStorage.setItem(LS_MES_KEY, mesSel.value)
  try {
    const [y, m] = mesSel.value.split('-').map(Number)
    const desde   = `${y}-${String(m).padStart(2,'0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const hasta   = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
    const { data } = await api.get('/informes/', {
      params: { periodo_desde_gte: desde, periodo_desde_lte: hasta, limit: 500 }
    })
    informes.value = data || []
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message), true)
  } finally {
    loading.value = false
  }
}

async function cargarProyectos() {
  try {
    const { data } = await api.get('/monitoreo/_legacy', { params: { action: 'getProjects' } })
    let list = Array.isArray(data) ? data : (data?.projects || [])
    todosProyectos.value = list
      .map(p => (typeof p === 'string' ? p : (p.sub_project || p.nombre_comercial || p.name || '')))
      .filter(Boolean)
  } catch { /* no crítico */ }
}

function cambiarMes(delta) {
  if (!mesSel.value) return
  const [y, m] = mesSel.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  if (nuevo > mesMax) return
  mesSel.value = nuevo
}
watch(mesSel, () => { filtro.value = ''; busqueda.value = ''; cargar() })
onMounted(() => { cargar(); cargarProyectos() })

// ── Panel detalle (derecha en split) ───────────────────────────
async function abrirDrawer(inf, tab = 'preview') {
  drawerInf.value = inf
  drawerTab.value = tab
  detalleHtml.value = ''
  loadingDetalle.value = true
  try {
    const { data } = await api.get(`/informes/${inf.id}`)
    const idx = informes.value.findIndex(i => i.id === inf.id)
    if (idx >= 0) Object.assign(informes.value[idx], data)
    drawerInf.value = informes.value[idx] || data
    detalleHtml.value = data.html_content || ''
  } catch (e) {
    toast('⚠️ Error al cargar el informe', true)
  } finally {
    loadingDetalle.value = false
  }
}
function cerrarDrawer() {
  drawerInf.value = null
  detalleHtml.value = ''
  resolviendoId.value = null
  nuevoComentario.value = ''
}

// ── Imprimir desde el panel detalle (FIX: ventana limpia con CSS) ──
function imprimirDetalle() {
  if (!detalleHtml.value) return
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return toast('⚠️ No se pudo abrir ventana de impresión (popup bloqueado)', true)
  const doc = buildReportHtmlDoc(detalleHtml.value, {
    title:  drawerInf.value?.proyecto_nombre || 'Informe Operacional',
    bgGray: false,
  })
  w.document.open()
  w.document.write(doc)
  w.document.close()
  w.focus()
  // Esperar a que se cargue la fuente antes de imprimir
  setTimeout(() => w.print(), 600)
}

// ── Editor pantalla completa ────────────────────────────────────
async function editar(inf) {
  // Si no tenemos el HTML todavía (informe no cargado en drawer), lo buscamos
  let htmlToEdit = ''
  if (drawerInf.value?.id === inf.id && detalleHtml.value) {
    htmlToEdit = detalleHtml.value
  } else {
    try {
      const { data } = await api.get(`/informes/${inf.id}`)
      htmlToEdit = data.html_content || ''
      // Actualizar el cache local también
      const idx = informes.value.findIndex(i => i.id === inf.id)
      if (idx >= 0) Object.assign(informes.value[idx], data)
      if (drawerInf.value?.id === inf.id) {
        drawerInf.value = informes.value[idx] || data
        detalleHtml.value = htmlToEdit
      }
    } catch (e) {
      toast('⚠️ No se pudo cargar el informe para editar', true)
      return
    }
  }
  if (!htmlToEdit) {
    toast('⚠️ El informe no tiene contenido para editar', true)
    return
  }
  editorInf.value  = inf
  editorHtml.value = htmlToEdit
  editandoFullscreen.value = true
}

function cerrarEditor() {
  if (guardandoEditor.value) return
  editandoFullscreen.value = false
  editorInf.value  = null
  editorHtml.value = ''
}

async function guardarEditor() {
  if (!editorInf.value || !editorIframeRef.value) return
  guardandoEditor.value = true
  try {
    const body = editorIframeRef.value.contentDocument?.body
    if (!body) throw new Error('No se pudo acceder al contenido del editor')
    const newHtml = body.innerHTML
    const inf = editorInf.value
    const payload = {
      tipo:            inf.tipo,
      sub_project:     inf.sub_project,
      periodo_desde:   inf.periodo_desde,
      periodo_hasta:   inf.periodo_hasta,
      periodo_display: inf.periodo_display,
      proyecto_nombre: inf.proyecto_nombre,
      html_content:    newHtml,
    }
    const { data } = await api.post('/informes/', payload)
    // Actualizar cache local
    const idx = informes.value.findIndex(i => i.id === inf.id)
    if (idx >= 0) Object.assign(informes.value[idx], data)
    // Actualizar el drawer si está abierto con este mismo informe
    if (drawerInf.value?.id === inf.id) {
      drawerInf.value = informes.value[idx] || data
      detalleHtml.value = newHtml
      previewKey.value++ // fuerza refresh del iframe de previsualización
    }
    toast('💾 Cambios guardados correctamente')
    cerrarEditor()
  } catch (e) {
    const detail = e.response?.data?.detail
    toast('⚠️ ' + (Array.isArray(detail) ? detail[0]?.msg : (detail || e.message)), true)
  } finally {
    guardandoEditor.value = false
  }
}

function imprimirEditor() {
  if (!editorIframeRef.value) return
  const body = editorIframeRef.value.contentDocument?.body
  if (!body) return
  const currentHtml = body.innerHTML
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return toast('⚠️ No se pudo abrir ventana de impresión (popup bloqueado)', true)
  const doc = buildReportHtmlDoc(currentHtml, {
    title:  editorInf.value?.proyecto_nombre || 'Informe Operacional',
    bgGray: false,
  })
  w.document.open()
  w.document.write(doc)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 600)
}

// ── Comentarios ────────────────────────────────────────────────
async function agregarComentario() {
  if (!nuevoComentario.value.trim() || !drawerInf.value) return
  agregandoComentario.value = true
  try {
    const { data } = await api.post(`/informes/${drawerInf.value.id}/comentarios`,
                                    { mensaje: nuevoComentario.value.trim() })
    const idx = informes.value.findIndex(i => i.id === drawerInf.value.id)
    if (idx >= 0) Object.assign(informes.value[idx], data)
    drawerInf.value = informes.value[idx]
    nuevoComentario.value = ''
    toast('💬 Comentario agregado')
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message), true)
  } finally {
    agregandoComentario.value = false
  }
}
function abrirResolver(c) { resolviendoId.value = c.id; resolviendoTexto.value = '' }
async function resolverComentario(c) {
  if (!drawerInf.value) return
  actuandoComentarioId.value = c.id
  try {
    const { data } = await api.patch(`/informes/${drawerInf.value.id}/comentarios/${c.id}/resolver`,
                                     { respuesta: resolviendoTexto.value || null })
    const idx = informes.value.findIndex(i => i.id === drawerInf.value.id)
    if (idx >= 0) Object.assign(informes.value[idx], data)
    drawerInf.value = informes.value[idx]
    resolviendoId.value   = null
    resolviendoTexto.value = ''
    toast('✅ Comentario subsanado')
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message), true)
  } finally {
    actuandoComentarioId.value = null
  }
}
async function borrarComentario(c) {
  if (!drawerInf.value || !confirm('¿Eliminar este comentario?')) return
  actuandoComentarioId.value = c.id
  try {
    const { data } = await api.delete(`/informes/${drawerInf.value.id}/comentarios/${c.id}`)
    const idx = informes.value.findIndex(i => i.id === drawerInf.value.id)
    if (idx >= 0) Object.assign(informes.value[idx], data)
    drawerInf.value = informes.value[idx]
    toast('🗑️ Comentario eliminado')
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message), true)
  } finally {
    actuandoComentarioId.value = null
  }
}

// ── Verificar ──────────────────────────────────────────────────
async function verificarYAprobar() {
  if (!drawerInf.value) return
  if (comentariosPendientes(drawerInf.value) > 0) {
    toast('⚠️ Resuelve todos los comentarios pendientes antes de aprobar', true)
    return
  }
  verificando.value = true
  try {
    if (drawerInf.value.estado === 'borrador') {
      const { data } = await api.patch(`/informes/${drawerInf.value.id}/estado`, { estado: 'revisado' })
      const idx = informes.value.findIndex(i => i.id === drawerInf.value.id)
      if (idx >= 0) Object.assign(informes.value[idx], data)
      drawerInf.value = informes.value[idx]
    }
    const { data: d2 } = await api.patch(`/informes/${drawerInf.value.id}/estado`, { estado: 'aprobado' })
    const idx = informes.value.findIndex(i => i.id === drawerInf.value.id)
    if (idx >= 0) Object.assign(informes.value[idx], d2)
    drawerInf.value = informes.value[idx]
    drawerTab.value = 'preview'
    toast('✅ Informe verificado y aprobado')
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message), true)
  } finally {
    verificando.value = false
  }
}
async function reabrir() {
  if (!drawerInf.value) return
  if (!confirm('¿Reabrir este informe? Volverá a borrador y se podrán agregar nuevos comentarios.')) return
  try {
    const { data } = await api.patch(`/informes/${drawerInf.value.id}/estado`, { estado: 'borrador' })
    const idx = informes.value.findIndex(i => i.id === drawerInf.value.id)
    if (idx >= 0) Object.assign(informes.value[idx], data)
    drawerInf.value = informes.value[idx]
    toast('↩ Informe reabierto para corrección')
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message) + ' — usa "Devolver a borrador" en el editor.', true)
  }
}

// ── Envío individual ───────────────────────────────────────────
async function enviarUno(inf) {
  if (!permisoEnviar.value || enviandoIds.value.has(inf.id)) return
  const newSet = new Set(enviandoIds.value); newSet.add(inf.id); enviandoIds.value = newSet
  try {
    const { data } = await api.post(`/informes/${inf.id}/enviar`, {})
    const idx = informes.value.findIndex(i => i.id === inf.id)
    if (idx >= 0) {
      informes.value[idx].correo_enviado    = true
      informes.value[idx].correo_enviado_en = new Date().toISOString()
      informes.value[idx].enviado_por_nombre = auth.user?.nombre || ''
    }
    if (drawerInf.value?.id === inf.id) drawerInf.value = informes.value[idx]
    toast(`✉️ Enviado a ${data.enviado_a}`)
  } catch (e) {
    toast('⚠️ ' + (e.response?.data?.detail || e.message), true)
  } finally {
    const ns = new Set(enviandoIds.value); ns.delete(inf.id); enviandoIds.value = ns
  }
}

// ── Envío masivo ───────────────────────────────────────────────
function abrirConfirmEnvio() {
  resultadoBatch.value = null
  progBatch.value = { hechos: 0, total: 0, actual: '' }
  confirmEnvio.value = true
}
function cerrarConfirmEnvio() {
  if (enviandoBatch.value) return
  confirmEnvio.value = false
  if (resultadoBatch.value) resultadoBatch.value = null
}
async function ejecutarEnvioBatch() {
  const items = [...puedeEnviarBatch.value]
  if (!items.length) return
  enviandoBatch.value = true
  progBatch.value = { hechos: 0, total: items.length, actual: '' }
  const detalles = []
  const CONC = 3
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const my = idx++
      const inf = items[my]
      progBatch.value = { ...progBatch.value, actual: inf.proyecto_nombre || inf.sub_project }
      const nombre = `${inf.proyecto_nombre || inf.sub_project} · ${inf.periodo_display || inf.periodo_desde}`
      try {
        const { data } = await api.post(`/informes/${inf.id}/enviar`, {})
        const ix = informes.value.findIndex(i => i.id === inf.id)
        if (ix >= 0) {
          informes.value[ix].correo_enviado    = true
          informes.value[ix].correo_enviado_en = new Date().toISOString()
          informes.value[ix].enviado_por_nombre = auth.user?.nombre || ''
        }
        detalles.push({ id: inf.id, nombre, ok: true, msg: `Enviado a ${data.enviado_a}` })
      } catch (e) {
        detalles.push({ id: inf.id, nombre, ok: false, msg: e.response?.data?.detail || e.message })
      } finally {
        progBatch.value = { ...progBatch.value, hechos: progBatch.value.hechos + 1 }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, items.length) }, worker))
  resultadoBatch.value = {
    ok: detalles.filter(d => d.ok).length,
    err: detalles.filter(d => !d.ok).length,
    detalles: detalles.sort((a, b) => Number(a.ok) - Number(b.ok)),
  }
  enviandoBatch.value = false
}
</script>

<style scoped>
/* ── Panel principal ──────────────────────────────────────────── */
.em-panel {
  background: transparent;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Sora', system-ui, sans-serif;
}

/* ── Header ───────────────────────────────────────────────────── */
.em-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #fff; padding: 8px 16px; flex-wrap: wrap;
  border-bottom: 1px solid #ECE7F2;
  box-shadow: 0 1px 3px rgba(28,18,50,.04);
}
.em-header-left  { display: inline-flex; align-items: center; gap: 12px; min-width: 0; }
.em-header-right { display: inline-flex; align-items: center; gap: 8px; }
.em-header-sub   { font-size: 11px; color: #6B5A8A; margin: 0; }
.em-header-sub b { color: #6D28D9; font-weight: 700; }

.em-month-picker {
  display: inline-flex; align-items: center;
  background: #F4F1FA; border: 1px solid #E5E2EC; border-radius: 7px; overflow: hidden;
}
.em-month-nav {
  background: transparent; border: none; color: #6D28D9;
  width: 26px; height: 28px; cursor: pointer; font-size: 14px; font-weight: 700;
  transition: background .15s;
}
.em-month-nav:hover:not(:disabled) { background: #E9DEFC; }
.em-month-nav:disabled { opacity: .35; cursor: not-allowed; }
.em-month-input {
  background: transparent; border: none; color: #2C2039;
  font-family: inherit; font-size: 12px; font-weight: 700;
  padding: 3px 4px; outline: none; color-scheme: light;
}

/* ── KPIs ─────────────────────────────────────────────────────── */
.em-kpis {
  display: grid; grid-template-columns: repeat(6, 1fr);
  background: #fff; border-bottom: 1px solid #ECE7F2;
}
@media (max-width: 800px) { .em-kpis { grid-template-columns: repeat(3, 1fr); } }
.em-kpi {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: transparent; border: none; border-right: 1px solid #ECE7F2;
  padding: 10px 8px; cursor: pointer; font-family: inherit; transition: background .12s; position: relative;
}
.em-kpi:last-child { border-right: none; }
.em-kpi:hover  { background: #FAF8FE; }
.em-kpi--on    { background: #F3E8FF; }
.em-kpi--on::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #915BD8;
}
.em-kpi-num { font-size: 20px; font-weight: 900; color: #1A1025; line-height: 1; }
.em-kpi-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #6B5A8A; }
.em-kpi-pend   .em-kpi-num { color: #92400E; }
.em-kpi-coms   .em-kpi-num { color: #991B1B; }
.em-kpi-resol  .em-kpi-num { color: #1D4ED8; }
.em-kpi-ver    .em-kpi-num { color: #166534; }
.em-kpi-env    .em-kpi-num { color: #5B21B6; }

/* ── Batch bar ────────────────────────────────────────────────── */
.em-batch-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: #F0FDF4; border-bottom: 1px solid #BBF7D0;
  padding: 8px 16px;
}
.em-batch-info { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #166534; font-weight: 600; }
.em-batch-info i { color: #16A34A; }
.em-btn-send :deep(.p-button), :deep(.em-btn-send) {
  background: #16A34A !important; border-color: #16A34A !important;
}
.em-btn-send :deep(.p-button:hover), :deep(.em-btn-send:hover) { background: #15803D !important; }

/* ── Layout: full vs split ────────────────────────────────────── */
.em-content {
  display: block;
  min-height: calc(100vh - 270px);
}
/* En pantallas anchas + panel abierto: grid split */
@media (min-width: 1024px) {
  .em-content--split {
    display: grid;
    grid-template-columns: minmax(230px, 280px) minmax(0, 1fr);
    /* La columna izquierda se estira para que el sticky funcione */
    align-items: start;
    height: calc(100vh - 200px);
    overflow: hidden;
  }
  .em-content--split .em-main {
    height: 100%;
    overflow-y: auto;
    border-right: 1px solid #ECE7F2;
  }
}

/* ── Lista compacta (columna izquierda en split) ──────────────── */
.em-compact {
  display: flex; flex-direction: column;
  height: 100%; min-height: 0;
}
.em-compact-header {
  padding: 8px 14px;
  background: #FAF8FE;
  border-bottom: 1px solid #ECE7F2;
  flex-shrink: 0;
}
.em-compact-count {
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .5px; color: #6B5A8A;
}
.em-compact-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 24px;
}
.em-compact-list {
  flex: 1; overflow-y: auto; min-height: 0;
}
.em-compact-row {
  position: relative; width: 100%;
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px;
  background: transparent; border: none;
  border-bottom: 1px solid #F3F0F9;
  cursor: pointer; font-family: inherit;
  text-align: left;
  transition: background .12s;
}
.em-compact-row:hover { background: #FAF8FE; }
.em-compact-row--active {
  background: #F3E8FF;
}
.em-compact-row--active::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: #915BD8;
}
.em-compact-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.em-compact-info { flex: 1; min-width: 0; }
.em-compact-nombre {
  font-size: 12px; font-weight: 700; color: #1A1025;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.em-compact-meta {
  display: flex; align-items: center; gap: 4px; margin-top: 2px; flex-wrap: wrap;
}
.em-compact-actions { flex-shrink: 0; }

/* ── Tabla completa (columna única sin split) ─────────────────── */
.em-table-wrap { flex: 1; min-width: 0; padding: 10px 12px 30px; }
.em-main { min-width: 0; }

.em-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 50px 24px; background: #fff; border-radius: 10px;
  border: 1px solid #ECE7F2; color: #6B5A8A; font-size: 13px;
}
.em-state-empty { padding: 60px 24px; }
.em-state-title { font-size: 14px; font-weight: 800; color: #2C2039; margin: 4px 0 0; }
.em-state-sub   { font-size: 12px; color: #6B5A8A; max-width: 380px; text-align: center; }

.em-table {
  width: 100%; border-collapse: collapse;
  background: #fff; border-radius: 10px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.em-table thead tr { background: #F7F4FD; border-bottom: 2px solid #ECE7F2; }
.em-table thead th {
  padding: 9px 12px; text-align: left; font-size: 10px;
  font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #6B5A8A; white-space: nowrap;
}
.em-col-estado   { width: 130px; }
.em-col-acciones { width: 140px; text-align: right; }
.em-row { border-bottom: 1px solid #F3F0F9; cursor: pointer; transition: background .12s; }
.em-row:last-child { border-bottom: none; }
.em-row:hover { background: #FAF8FE; }
.em-row--active { background: #F3E8FF !important; }
.em-row td { padding: 9px 12px; vertical-align: middle; font-size: 12px; color: #2C2039; }
.em-td-proj   { min-width: 180px; }
.em-proj-nombre { font-weight: 700; font-size: 13px; }
.em-proj-sub    { font-size: 10px; color: #9CA3AF; margin-top: 1px; }
.em-tipo-tag {
  font-size: 9px; font-weight: 700;
  background: #F3F0FF; color: #7C3AED; border: 1px solid #E9D5FF;
  border-radius: 4px; padding: 1px 6px;
}
.em-td-fecha { min-width: 110px; font-size: 11px; }
.em-fecha-sub { font-size: 10px; color: #9CA3AF; margin-top: 1px; }
.em-td-empty  { color: #D1D5DB; }
.em-mail-ok   { color: #166534; font-size: 11px; font-weight: 700; }

/* Estado pills */
.em-state-pill {
  display: inline-block; font-size: 10px; font-weight: 800;
  padding: 3px 9px; border-radius: 20px; letter-spacing: .4px;
  white-space: nowrap; text-transform: uppercase;
}
.em-pill-pendiente  { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
.em-pill-comentado  { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }
.em-pill-resuelto   { background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE; }
.em-pill-verificado { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
.em-pill-enviado    { background: #EDE9FE; color: #5B21B6; border: 1px solid #DDD6FE; }

/* Botones de acción por fila */
.em-td-acciones { white-space: nowrap; text-align: right; }
.em-icon-btn {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; margin-left: 2px;
  background: transparent; border: 1px solid #E5E2EC; border-radius: 6px;
  cursor: pointer; font-family: inherit; font-size: 13px; transition: all .14s;
}
.em-icon-btn:hover:not(:disabled) { background: #F4F1FA; border-color: #C7A8F0; }
.em-icon-btn:disabled { opacity: .5; cursor: not-allowed; }
.em-btn-edit    { color: #6D28D9; }
.em-btn-verify  { color: #16A34A; border-color: #BBF7D0; }
.em-btn-verify:hover:not(:disabled) { background: #F0FDF4; }
.em-btn-send    { color: #2563EB; border-color: #BFDBFE; }
.em-btn-send:hover:not(:disabled) { background: #EFF6FF; }
.em-btn-coms-on       { color: #DC2626; border-color: #FECACA; background: #FEF2F2; }
.em-btn-coms-on:hover:not(:disabled) { background: #FEE2E2; }
.em-btn-coms-resolved { color: #2563EB; border-color: #BFDBFE; }
.em-btn-coms-empty    { color: #9CA3AF; }
.em-coms-badge {
  position: absolute; top: -6px; right: -6px;
  background: #6D28D9; color: #fff; font-size: 9px; font-weight: 800;
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
}
.em-coms-badge--err { background: #DC2626; }

/* ── Panel detalle (derecha en split) ─────────────────────────── */
/* En móvil: overlay fixed */
.em-detail {
  position: fixed; inset: 0;
  display: flex; align-items: stretch; justify-content: flex-end;
  z-index: 30;
}
.em-detail-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.35); backdrop-filter: blur(2px);
}
.em-detail-panel {
  position: relative; width: 100%; max-width: 540px;
  background: #fff;
  display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,.18);
  overflow: hidden;
}
/* En desktop con split: el aside es in-flow (no overlay) */
@media (min-width: 1024px) {
  .em-content--split .em-detail {
    position: static; z-index: auto;
    display: block; height: 100%;
  }
  .em-content--split .em-detail-backdrop { display: none; }
  .em-content--split .em-detail-panel {
    max-width: none; width: 100%; height: 100%;
    box-shadow: none;
  }
}

.em-drawer-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid #ECE7F2;
  background: #FAF8FE;
  flex-shrink: 0;
}
.em-drawer-head-info { flex: 1; min-width: 0; }
.em-drawer-head-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: 8px; }
.em-drawer-title { font-size: 13px; font-weight: 800; color: #1A1025; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.em-drawer-sub {
  font-size: 10px; color: #6B5A8A; margin-top: 3px;
  display: inline-flex; align-items: center; gap: 5px; flex-wrap: wrap;
}

.em-close {
  background: #fff; border: 1px solid #E5E2EC; color: #6B5A8A;
  cursor: pointer; padding: 0; width: 26px; height: 26px;
  border-radius: 7px; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.em-close:hover { background: #F4F1FA; color: #2C2039; }

.em-drawer-tabs {
  display: flex; gap: 0; border-bottom: 1px solid #ECE7F2;
  padding: 0 14px; background: #fff; flex-shrink: 0;
}
.em-drawer-tab {
  position: relative; display: inline-flex; align-items: center; gap: 5px;
  background: transparent; border: none; padding: 9px 12px;
  font-family: inherit; font-size: 12px; font-weight: 700;
  color: #6B5A8A; cursor: pointer; border-bottom: 2px solid transparent;
  transition: color .15s;
}
.em-drawer-tab:hover { color: #2C2039; }
.em-drawer-tab--on   { color: #6D28D9; border-bottom-color: #915BD8; }
.em-drawer-tab-badge {
  background: #6D28D9; color: #fff; font-size: 9px; font-weight: 800;
  padding: 1px 6px; border-radius: 8px; margin-left: 2px;
}
.em-drawer-tab-badge--err { background: #DC2626; }

.em-drawer-body { flex: 1; overflow-y: auto; padding: 12px 14px; min-height: 0; }

/* ── Preview con iframe ───────────────────────────────────────── */
.em-preview-wrap { display: flex; flex-direction: column; gap: 8px; height: 100%; }
.em-preview-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap;
  background: #FAF8FE; border: 1px solid #ECE7F2; border-radius: 8px;
  padding: 7px 12px; flex-shrink: 0;
}
.em-preview-actions { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.em-edit-locked { font-size: 10px; color: #92400E; font-style: italic; }

.em-preview-frame {
  background: #ECE9F2; border-radius: 10px; padding: 0;
  border: 1px solid #DAD3EA; overflow: hidden;
  flex: 1; min-height: 400px;
}
.em-preview-iframe {
  width: 100%; height: 100%; border: none; display: block;
  min-height: 500px;
}
@media (min-width: 1024px) {
  .em-preview-frame { min-height: 0; }
  .em-preview-iframe { height: 100%; min-height: calc(100vh - 320px); }
}

/* ── Comentarios ──────────────────────────────────────────────── */
.em-coms-wrap  { display: flex; flex-direction: column; gap: 12px; }
.em-coms-list  { display: flex; flex-direction: column; gap: 10px; }
.em-com {
  background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
  padding: 10px 12px; position: relative;
}
.em-com--resuelto { background: #F0FDF4; border-color: #BBF7D0; }
.em-com-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.em-com-autor { display: inline-flex; align-items: center; gap: 8px; }
.em-com-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 11px; font-weight: 800;
}
.em-com-autor-nombre { font-size: 12px; font-weight: 700; color: #1A1025; }
.em-com-fecha        { font-size: 10px; color: #6B5A8A; }
.em-com-estado-ok    { font-size: 10px; font-weight: 700; color: #166534; }
.em-com-estado-pend  { font-size: 10px; font-weight: 700; color: #DC2626; }
.em-com-msg { font-size: 13px; color: #2C2039; line-height: 1.55; margin: 4px 0 6px; white-space: pre-wrap; }
.em-com-respuesta {
  background: rgba(255,255,255,.6); border-left: 3px solid #16A34A;
  border-radius: 0 8px 8px 0; padding: 8px 10px; margin-top: 6px;
}
.em-com-respuesta-lbl { font-size: 9px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
.em-com-respuesta-meta { margin-top: 4px; }
.em-com-actions { display: flex; gap: 6px; margin-top: 8px; }

.em-btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: inherit; font-size: 11px; font-weight: 700;
  border-radius: 6px; padding: 4px 10px; cursor: pointer; border: 1px solid;
  transition: all .14s;
}
.em-btn-sm:disabled { opacity: .5; cursor: not-allowed; }
.em-btn-resolver { background: #16A34A; color: #fff; border-color: #16A34A; }
.em-btn-resolver:hover:not(:disabled) { background: #15803D; border-color: #15803D; }
.em-btn-borrar { background: #fff; color: #DC2626; border-color: #FECACA; }
.em-btn-borrar:hover:not(:disabled) { background: #FEF2F2; }
.em-btn-ghost { background: #fff; color: #6B5A8A; border-color: #E5E2EC; }
.em-btn-ghost:hover:not(:disabled) { background: #F4F1FA; color: #2C2039; }

.em-resolver-form {
  margin-top: 8px; background: rgba(255,255,255,.7);
  border-radius: 8px; padding: 10px;
}
.em-resolver-lbl { font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: .4px; display: block; margin-bottom: 4px; }
.em-resolver-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }

.em-textarea {
  width: 100%; border: 1.5px solid #E5E2EC; border-radius: 8px;
  padding: 8px 10px; font-family: inherit; font-size: 12px; color: #2C2039;
  outline: none; resize: vertical; background: #fff;
}
.em-textarea:focus    { border-color: #915BD8; }
.em-textarea:disabled { background: #F4F1FA; color: #9CA3AF; }
.em-com-add {
  background: #FAF8FE; border: 1px dashed #DAD3EA; border-radius: 10px; padding: 12px;
}
.em-com-add-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
.em-aprobado-msg {
  background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;
  padding: 10px 12px; font-size: 12px; color: #166534;
}
.em-state-coms-empty { background: #FAF8FE; border-color: #ECE7F2; padding: 30px 20px; }

/* ── Verificar ────────────────────────────────────────────────── */
.em-verify-wrap { display: flex; flex-direction: column; gap: 14px; }
.em-verify-blocked {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 40px 20px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px;
}
.em-verify-check {
  background: #FAF8FE; border: 1px solid #ECE7F2; border-radius: 10px;
  padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
}
.em-check-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #2C2039; }
.em-check-row--err { color: #991B1B; }
.em-verify-actions { display: flex; flex-direction: column; gap: 8px; }
.em-btn-verify-big :deep(.p-button), :deep(.em-btn-verify-big) {
  background: #16A34A !important; border-color: #16A34A !important; font-weight: 800 !important;
}
.em-btn-verify-big :deep(.p-button:hover), :deep(.em-btn-verify-big:hover) { background: #15803D !important; }
.em-verify-hint { font-size: 11px; color: #6B5A8A; font-style: italic; margin: 0; }

/* ── Modal envío masivo ───────────────────────────────────────── */
.em-modal-bd {
  position: fixed; inset: 0;
  background: rgba(26,16,37,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 60; padding: 20px;
}
.em-modal {
  background: #fff; border-radius: 14px; width: 100%; max-width: 580px; max-height: 88vh;
  overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
}
.em-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #ECE7F2;
}
.em-modal-head h3 { font-size: 15px; font-weight: 800; color: #1A1025; margin: 0 0 3px; }
.em-modal-head p  { font-size: 11px; color: #6B5A8A; margin: 0; }
.em-modal-body { padding: 14px 20px; overflow-y: auto; flex: 1; }
.em-modal-foot {
  padding: 12px 20px; border-top: 1px solid #ECE7F2;
  display: flex; gap: 8px; justify-content: flex-end; background: #FAF8FE;
}
.em-modal-list { display: flex; flex-direction: column; gap: 8px; }
.em-modal-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; background: #FAF8FE; border: 1px solid #ECE7F2; border-radius: 8px;
}
.em-modal-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: #915BD8; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;
}
.em-modal-info { flex: 1; min-width: 0; }
.em-modal-info-nombre { font-size: 12px; font-weight: 700; color: #1A1025; }
.em-modal-info-meta { font-size: 10px; color: #6B5A8A; display: inline-flex; gap: 6px; align-items: center; margin-top: 1px; }
.em-mail-ico { font-size: 13px; }
.em-modal-progress { padding: 8px 0; }
.em-bar-wrap { background: #ECE7F2; border-radius: 99px; height: 6px; overflow: hidden; margin-bottom: 8px; }
.em-bar { height: 100%; background: linear-gradient(90deg, #16A34A, #15803D); border-radius: 99px; transition: width .25s ease; }
.em-prog-row { display: flex; justify-content: space-between; }
.em-prog-num { font-size: 14px; font-weight: 800; color: #166534; }
.em-prog-msg { font-size: 11px; color: #6B5A8A; max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.em-modal-result { padding: 4px 0; }
.em-result-big {
  display: flex; gap: 12px; justify-content: center;
  font-size: 22px; font-weight: 900; margin-bottom: 10px;
  padding-bottom: 10px; border-bottom: 1px solid #ECE7F2;
}
.em-result-ok  { color: #16A34A; }
.em-result-err { color: #DC2626; }
.em-result-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 7px 10px; margin-bottom: 4px;
  background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;
}
.em-result-row--err { background: #FEF2F2; border-color: #FECACA; }
.em-result-nombre { font-size: 11px; font-weight: 700; color: #1A1025; }
.em-result-msg    { font-size: 10px; color: #6B5A8A; }

/* ── Toast ────────────────────────────────────────────────────── */
.em-toast {
  position: fixed; bottom: 24px; right: 24px;
  padding: 10px 16px; border-radius: 9px; font-size: 12px; font-weight: 700;
  z-index: 70; box-shadow: 0 4px 18px rgba(0,0,0,.16);
}
.em-toast-ok  { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }
.em-toast-err { background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }

/* ── Búsqueda ─────────────────────────────────────────────────── */
.em-search-wrap { position: relative; display: inline-flex; align-items: center; }
.em-search-icon { position: absolute; left: 8px; color: #9CA3AF; font-size: 12px; pointer-events: none; }
.em-search-input {
  background: #F4F1FA; border: 1px solid #E5E2EC; border-radius: 7px;
  padding: 4px 28px 4px 26px; font-family: inherit; font-size: 12px; color: #2C2039;
  outline: none; width: 180px; transition: border-color .15s, width .2s;
}
.em-search-input:focus { border-color: #915BD8; width: 220px; }
.em-search-input::placeholder { color: #A89EC0; }
.em-search-clear {
  position: absolute; right: 6px;
  background: none; border: none; cursor: pointer; color: #9CA3AF; font-size: 10px; padding: 0; line-height: 1;
}
.em-search-clear:hover { color: #6D28D9; }

/* ── Faltantes ────────────────────────────────────────────────── */
.em-faltantes-wrap {
  margin: 0 12px 10px; border: 1px solid #FDE68A; border-radius: 10px;
  overflow: hidden; background: #FFFBEB;
}
.em-faltantes-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px;
  background: transparent; border: none; cursor: pointer; font-family: inherit;
  font-size: 12px; font-weight: 700; color: #92400E; text-align: left;
}
.em-faltantes-toggle:hover { background: #FEF3C7; }
.em-faltantes-badge {
  background: #D97706; color: #fff; font-size: 10px; font-weight: 800;
  padding: 1px 7px; border-radius: 8px; min-width: 18px; text-align: center;
}
.em-faltantes-list { display: flex; flex-direction: column; padding: 4px 14px 10px; gap: 4px; }
.em-faltante-row {
  display: flex; align-items: center; gap: 8px; padding: 4px 6px;
  border-radius: 6px; background: rgba(254,243,199,.5);
}
.em-faltante-dot    { width: 6px; height: 6px; border-radius: 50%; background: #D97706; flex-shrink: 0; }
.em-faltante-nombre { font-size: 12px; font-weight: 700; color: #78350F; flex: 1; }
.em-faltante-hint   { font-size: 10px; color: #92400E; font-style: italic; }

/* ── Editor pantalla completa ─────────────────────────────────── */
.em-editor-overlay {
  position: fixed; inset: 0;
  background: #fff;
  display: flex; flex-direction: column;
  z-index: 100;
}
.em-editor-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 20px;
  background: #1A1025;
  color: #FDFAF7;
  flex-shrink: 0;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}
.em-editor-bar-left {
  display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;
  flex-wrap: wrap;
}
.em-editor-bar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.em-editor-title {
  font-size: 14px; font-weight: 800; color: #FDFAF7;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.em-editor-periodo { font-size: 11px; color: rgba(253,250,247,.6); }
.em-editor-body {
  flex: 1; overflow: hidden; background: #ECE9F2; position: relative;
}
.em-editor-iframe {
  width: 100%; height: 100%; border: none; display: block;
}
.em-editor-hint {
  padding: 5px 16px;
  background: #2C2039;
  color: rgba(253,250,247,.55);
  font-size: 10px;
  display: flex; align-items: center; gap: 6px;
  flex-shrink: 0;
}
.em-editor-hint i { color: #915BD8; }

/* ── Transiciones ─────────────────────────────────────────────── */
.slide-right-enter-active, .slide-right-leave-active { transition: all .25s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
