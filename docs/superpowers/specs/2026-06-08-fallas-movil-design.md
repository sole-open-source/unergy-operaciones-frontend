# Bitácora de fallas en la app móvil — Diseño

**Fecha:** 2026-06-08
**Repo:** `unergy-operaciones-frontend` (solo frontend; reusa el backend de fallas existente)

## Objetivo
Llevar la bitácora de monitoreo (`operaciones/gestión de fallas`) a la app móvil: revisar
fallas, registrar nuevas y cambiar estados desde el celular, con la misma información que
la web pero en una UX táctil simple. Para el equipo de monitoreo.

## Navegación
La app móvil ahora tiene 2 secciones con una barra inferior (`MobileTabBar`):
**Generación** (`/m/solar`) y **Fallas** (`/m/fallas`).

## Pantallas
1. **Lista (`MobileFallasView`)**: buscador + chips de filtro por estado (Todas + cada estado);
   tarjetas con franja de prioridad, código, tipo, proyecto, estado, prioridad, tiempo y
   responsable. Abiertas primero. Botón **+** para registrar.
2. **Detalle (`FallaDetailSheet`)**: bottom sheet con descripción, datos (proyecto, fechas,
   responsable, energía perdida), causa raíz/acciones, y **acciones táctiles con autosave**:
   cambiar estado (chips), prioridad (chips) y asignado (select) → `PATCH /fallas/{id}`.
   Seguimientos: lista + agregar nota (con cambio de estado opcional) → `POST /fallas/{id}/seguimientos`.
   Botón **Marcar resuelta** / **Reabrir**.
3. **Registrar (`FallaCreateSheet`)**: form mínimo — proyecto (select nativo), tipo (select
   agrupado o texto libre), prioridad (chips), estado (chips, default "abierta"), descripción,
   fecha (default hoy), nota opcional → `POST /fallas` (un proyecto) + seguimiento si hay nota.

## Contratos backend (reuso, sin cambios)
- `GET /fallas?page&size` (PaginatedResponse: items/total) — carga todas las páginas.
- `GET /fallas/catalogos` → {estados, prioridades, tipos, resoluciones}.
- `GET /fallas/{id}`, `PATCH /fallas/{id}` (FallaUpdate: estado_id, prioridad_id, asignado_a_id, fecha_resolucion…).
- `POST /fallas` (FallaCreate: proyecto_id, tipo_id|tipo_libre, estado_id, prioridad_id, descripcion, fecha_identificacion).
- `POST /fallas/{id}/seguimientos` (nota, estado_nuevo_id?). `GET /proyectos`, `GET /usuarios`.

## UX móvil
Selects nativos (picker del SO) para listas largas (proyecto/tipo); chips táctiles para
estado/prioridad (pocas opciones); bottom sheets con animación; targets grandes; campana
de notificaciones en el header (reusa `NotificationsSheet`).

## Verificación
Build OK; render headless (Edge) confirma boot, routing y guard (rutas `/m/*` sin sesión →
`/m/login`); transform de todos los módulos sin error; contratos cruzados contra los schemas
del backend. (No se hizo click-through autenticado por falta de credenciales en el entorno.)

## Fuera de alcance (v1)
Adjuntos/fotos en móvil, multi-proyecto al crear (móvil crea de a uno), edición de campos
avanzados (causa raíz/SLA) — se editan desde la web.
