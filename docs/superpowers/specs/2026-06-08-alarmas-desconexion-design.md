# Alarmas de desconexión + campana de notificaciones — Diseño

**Fecha:** 2026-06-08
**Repos:** `Backend Operaciones` (evaluador) + `unergy-operaciones-frontend` (campana móvil)

## Objetivo
Detectar automáticamente proyectos solares con problemas de medición/desconexión y
avisar vía notificaciones in-app (campana). Corre en el scheduler de 15 min que ya
existe en Railway. La plataforma ya tiene campana; se agrega también en la app móvil.

## Alarmas (v1)
Por proyecto monitoreado (filtro: `en_operacion`, `project_id_solenium` set, `minigranja`,
`srv_operacion`). Dos fuentes: **inversores** (Solenium) y **medidor** (Gaia).
Una fuente está "con dato" si su potencia actual > 0.5 kW (inversor: además categoría de
disponibilidad ≠ `disconnect`).

| Tipo | Severidad | Condición |
|------|-----------|-----------|
| `FUENTE_UNICA` | alerta | El proyecto no tiene medidor (Gaia) configurado → solo inversores, no se puede cruzar |
| `SIN_DATOS` | alerta | **De día**, ambas fuentes en 0 / sin datos |
| `POSIBLE_DESCONEXION` | alerta | **De día**, una fuente genera y la otra en 0 (peligro: aparentemente desconectado) |
| `RECUPERACION` | info | El proyecto vuelve a reportar normal tras una alarma |

Ventana de día: 07:00–17:00 Colombia (de noche ambas en 0 es normal). Umbrales
(`ZERO_KW`, ventana horaria) como constantes ajustables. **Fase 2:** inversor divergente.

## Anti-spam + renovación diaria
Tabla `alarma_estado(proyecto_id, categoria, estado, dia, updated_at)`, UNIQUE(proyecto_id, categoria).
- `categoria` ∈ {`fuente`, `runtime`}. `estado` = ok / fuente_unica / sin_datos / posible_desconexion.
- Notifica solo cuando el estado **cambia** (problema o recuperación).
- Si el problema persiste y `dia` < hoy (Colombia) → re-notifica una vez ese día.
- Sobrevive reinicios de Railway (estado en BD).

## Arquitectura (enfoque A)
`app/services/alarmas/desconexion.py::evaluar_desconexiones()` llamado dentro de
`services/mgs/scheduler.py::poll_once` (try/except, no rompe MGS). Eficiente:
- 2 llamadas Solenium de flota (`get_availability` + `get_project_summary`) → inversores.
- 1 snapshot Gaia por proyecto con medidor (`get_node_electrical_snapshot`), en paralelo.
- Resolución medidor: `find_gaia_node_pair` (match por nombre, sin costo de red).
- Guarda: si Solenium devuelve vacío (API caída) → no evalúa (evita falsas alarmas).

## Entrega
Crea filas `Notificacion` (sistema in-app existente) para usuarios con rol
`admin`/`operaciones`/`monitoreo`. `tipo`=alerta (info en recuperación), `link`=`/proyectos/{id}`.
- **Plataforma:** campana en `AppTopbar.vue` ya existe → aparecen solas.
- **App móvil:** campana nueva en el header de `MobileSolarView` + `NotificationsSheet.vue`,
  usando `/notificaciones`, `/notificaciones/count`, `/notificaciones/{id}/leer`.
- "Renovación diaria": el badge cuenta no-leídas; cada día trae alarmas frescas por el re-aviso.

## Archivos
**Backend:** `app/services/alarmas/__init__.py`, `app/services/alarmas/desconexion.py`;
DDL tabla `alarma_estado` en `init_db.py` + `_PENDING_DDLS` de `main.py`; hook en `scheduler.py`.
**Frontend:** `src/mobile/components/NotificationsSheet.vue` + campana en `MobileSolarView.vue`.

## Fuera de alcance (v1)
Inversor divergente (fase 2), push/WhatsApp, configuración de umbrales por UI.
