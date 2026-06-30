# Reporte de fallas estructurado (jerárquico por sistema/equipo)

**Fecha:** 2026-06-29
**Estado:** En implementación
**Repos:** `unergy-operaciones-backend` + `unergy-operaciones-frontend` (web + app móvil)

## Objetivo

Reemplazar la clasificación **plana** del reporte de fallas (un solo `tipo` de catálogo) por una
estructura **jerárquica basada en el activo afectado**: el usuario elige primero el **sistema**
(Red / Frontera / Inversores / Eventos adversos) y según la selección se despliegan solo las
opciones de ese sistema. Esto estandariza reportes, habilita indicadores por sistema/equipo y
sienta la base para **alarmas automáticas**.

> **Las fallas viejas NO se tocan.** Conservan su `tipo_id`/`tipo_libre` y se siguen mostrando
> igual. Solo las **nuevas** usan la ruta estructurada. La estructura es **aditiva**.

## Estructura canónica (fuente única)

Definida en backend `app/services/fallas/estructura.py` (`ESTRUCTURA_FALLAS`) y expuesta vía
`GET /fallas/estructura`. La consumen el form web y el móvil (sin hardcode duplicado).

### 1. Red — `red`
Eventos del suministro eléctrico externo. Opciones (`subtipo_codigo`):
- `baja_tension`, `alta_tension`, `variacion_frecuencia`
- `mantenimiento_red` → **requiere detalle** (motivo: árbol sobre línea, fusible, mant. programado, cambio de poste…)
- `acometida_mt` (acometida en media tensión), `transformador`
- `desconexion_sin_identificar` → **estado temporal**: marca `pendiente_reclasificar=true`; debe reclasificarse luego con la causa definitiva.

### 2. Frontera — `frontera`
Equipos de medición comercial. Equipo afectado (`subtipo_codigo`):
- `medidor_principal`, `medidor_respaldo`, `ct`, `pt`, `caja_pruebas`, `modem_comunicaciones`

Más dos flags independientes:
- `frontera_afecta_medicion` (bool) — la falla afecta la medición comercial
- `frontera_perdida_comunicacion` (bool) — pérdida de conectividad de datos → **alarma de comunicaciones de frontera**

### 3. Inversores — `inversores`
Cada proyecto tiene su lista **parametrizable** de inversores (`proyecto_inversores`). Config típica
minigranja: 3×300 kW + 1×50 kW + 1×40 kW (Baraya y San Pedro son excepciones). **Regla:** la suma de
`potencia_nominal_kw` de los inversores no puede superar `proyecto_info_tecnica.potencia_ac_kw`.

El reporte permite seleccionar **uno o varios inversores** a la vez (evita duplicar la falla). Para
los inversores seleccionados se reportan **uno o varios tipos de falla**:
- `no_generacion`, `generacion_anomala`, `limitacion_potencia`, `strings_mal_conectados`, `perdida_comunicacion`

`perdida_comunicacion` en ≥1 inversor → **alarma de comunicaciones de inversores**.

### 4. Eventos adversos — `eventos_adversos`
- `incendio`, `inundacion`, `huracan`, `otro` → `otro` **requiere detalle**.

## Modelo de datos (backend)

**`fallas`** (columnas nuevas, `ALTER ... ADD COLUMN IF NOT EXISTS`, NULL en fallas viejas):
- `categoria_codigo VARCHAR(50)` (red|frontera|inversores|eventos_adversos), indexado
- `subtipo_codigo VARCHAR(80)` — opción/equipo específico
- `subtipo_detalle TEXT` — texto libre (motivo mant. red / evento "otro")
- `clasificacion JSONB` — snapshot estructurado completo (fuente para mostrar/auditar)
- `pendiente_reclasificar BOOLEAN NOT NULL DEFAULT FALSE`
- `frontera_afecta_medicion BOOLEAN`, `frontera_perdida_comunicacion BOOLEAN`
- `inversores_perdida_comunicacion BOOLEAN` (derivada: algún inversor con `perdida_comunicacion`)

**`falla_inversores`** (tabla nueva, `create_all`): un renglón por inversor afectado en una falla →
indicadores "inversor con más fallas" y por tipo.
- `id, falla_id FK, proyecto_inversor_id FK (nullable), nombre, potencia_kw, tipos JSONB (list[str]), created_at`

**`proyecto_inversores`** (columnas nuevas): `nombre VARCHAR(120)`, `orden INT DEFAULT 0`, `activo BOOLEAN DEFAULT TRUE`.

### Continuidad con catálogos
Se siembran (idempotente) `fallas_cat_categorias` + `fallas_cat_tipos` desde `ESTRUCTURA_FALLAS`
(tipo.codigo = `"{categoria}.{subtipo}"`). Al crear estructurada se mapea `subtipo_codigo → tipo_id`
para que las vistas/analytics legacy (que muestran `falla.tipo.etiqueta`) sigan funcionando. Para
inversores se usa el tipo del primer tipo de falla + `tipo_libre` con resumen legible.

## Endpoints
- `GET /fallas/estructura` → `ESTRUCTURA_FALLAS` (auth, como `/catalogos`).
- `POST /fallas` extendido: acepta `categoria_codigo`, `subtipo_codigo`, `subtipo_detalle`,
  `frontera_afecta_medicion`, `frontera_perdida_comunicacion`, `inversores: [{proyecto_inversor_id?, nombre?, potencia_kw?, tipos:[...]}]`.
  Camino estructurado: valida contra estructura, deriva flags, inserta `falla_inversores`, arma `clasificacion`,
  evalúa alarmas. Camino legacy intacto si no viene `categoria_codigo`.
- `PATCH /fallas/{id}`: añade los mismos campos → permite **reclasificar** (set categoría/subtipo/detalle, limpia `pendiente_reclasificar`).
- Inversores CRUD (ya existía `GET/POST/PATCH/DELETE /proyectos/{id}/inversores`): se añade validación suma ≤ `potencia_ac_kw` y campos `nombre/orden/activo`.

## Alarmas (`app/services/fallas/alarmas.py`)
Función de decisión **pura** `decidir_alarmas(frontera_com, inversores_com)` →
- frontera → `comunicacion_frontera`
- inversores → `comunicacion_inversores`
- ambas (en la misma falla o en fallas activas simultáneas del proyecto) → **`comunicacion_total` (crítica)**

Entrega: filas `Notificacion` a roles admin/operaciones (mismo patrón que desconexión MGS) con
anti-spam vía `alarma_estado(proyecto_id, categoria)`. Hook en `POST /fallas` envuelto en try/except
(nunca rompe la creación). La estructura permite añadir reglas nuevas sin tocar la clasificación.

## Frontend
**Web** (`FallaForm.vue`): al **crear**, flujo jerárquico — selector de sistema → campos condicionales
(Red: opción + motivo/aviso pendiente; Frontera: equipo + 2 toggles; Inversores: multiselect de
inversores del proyecto + multiselect de tipos de falla + gestión parametrizable; Eventos: opción + detalle).
Inversores fuerza **un solo proyecto**. Edición de fallas viejas (sin categoría) usa el form legacy.

**Móvil** (`src/mobile/components/FallaCreateSheet.vue`): mismo flujo con chips de sistema +
selects nativos + bottom sheet, reusando `/fallas/estructura` y `/proyectos/{id}/inversores`.

## Testing
- Unit (pytest, funciones puras): validación de estructura, suma de inversores, `decidir_alarmas`.
- Integración local (TestClient + Postgres local real, JSONB): crear falla por cada categoría,
  reclasificar, alarmas, validación inversores.
- Frontend: `npm run build`.
- Post-deploy: verificación en producción (openapi/rutas, round-trip).
