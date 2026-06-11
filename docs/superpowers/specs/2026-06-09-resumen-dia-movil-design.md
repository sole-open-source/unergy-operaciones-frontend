# Resumen del día — vista móvil (`/m/resumen`)

> Diseño aprobado 2026-06-09. Feature de la app móvil (`src/mobile/`). Ver
> [2026-06-08-app-movil-solar-design.md](2026-06-08-app-movil-solar-design.md).

## Objetivo
Una vista de "resumen del día" en la app móvil con: (1) top de generación del día
por **medidores**, (2) top de generación del día por **inversores**, y (3) resumen
de **fallas creadas o que cambiaron de estado hoy**. Todo táctil y user-friendly.

## Navegación
Tercera pestaña en la barra inferior: `Generación · Fallas · Resumen`. Ruta
`/m/resumen` (mismas metas/guards que `/m/solar`).

## Layout (scroll vertical)
1. **Encabezado:** fecha de hoy + dos totales del día (Σ kWh medidor / Σ kWh inversor).
2. **Top Medidores:** lista ordenada desc por energía del día — número de ranking,
   nombre del proyecto, kWh + barra proporcional. **Todos** los proyectos (scroll).
3. **Top Inversores:** igual, fuente inversores.
4. **Fallas de hoy:** dos grupos — *Creadas hoy* y *Cambiaron de estado hoy*
   (chip estado anterior → nuevo). Cada fila abre `FallaDetailSheet` (reutilizado).

Estados de carga/vacío por sección. Refresco manual (botón) + al montar.

## Backend (repo Backend Operaciones)

### `GET /generacion-solar/resumen-dia`
```
{ fecha,
  medidor:  { total, top: [{ proyecto_id, nombre, kwh }] },   # desc
  inversor: { total, top: [{ proyecto_id, nombre, kwh }] } }  # desc
```
- Matching proyectos↔Solenium idéntico a `generacion-hoy` (`_find_solenium_id`).
- **Medidor:** `frontier_generation_kwh` de `get_project_summary()` (1 batch).
- **Inversor:** `get_generation(sol_id, ayer, hoy)` por proyecto, sumando entradas de
  hoy, en paralelo (ThreadPoolExecutor). Caché en memoria TTL 120s (`CACHE_TTL_GENHOY`).
- Helpers puros testeables: `_sum_today_inverter_kwh(gen_map, today_str)`,
  `_meter_kwh_from_summary(summary)`.

### `GET /fallas/actividad-hoy`
```
{ fecha,
  creadas: [FallaOut],
  cambios_estado: [{ falla: FallaOut, estado_anterior, estado_nuevo, hora }] }
```
- Ventana del día en zona horaria de Colombia (UTC-5) → límites en UTC.
- **Creadas:** `Falla.created_at >= inicio_dia` (no borradas).
- **Cambios de estado:** `FallaSeguimiento` con `estado_nuevo_id` no nulo y
  `created_at >= inicio_dia`; por falla se toma el último cambio de hoy y como
  `estado_anterior` el `estado_nuevo` del seguimiento de cambio inmediatamente
  anterior (o null).

## Frontend (repo unergy-operaciones-frontend, `src/mobile/`)
- `MobileResumenView.vue` — la vista (sigue el estilo `ms-*` de `MobileSolarView`).
- `MobileTabBar.vue` — agregar 3er ítem "Resumen" (`pi-chart-bar`).
- `router/index.js` — ruta `/m/resumen` (meta.mobile + requiresAuth).
- Reutiliza `FallaDetailSheet`, `api/client`, helpers de formato.

## Pruebas
- Backend: unit de los helpers puros de generación (suma kWh hoy, kWh medidor).
- Frontend: `vite build` sin errores.
- Verificación en producción (snippet autenticado + revisión visual en el celular).

## No-objetivos (YAGNI)
- Sin rango de fechas (solo "hoy"). Sin exportar. Sin edición desde el resumen
  (solo lectura + abrir detalle de falla). Sin push nuevos.
