# Detalle de falla — mostrar la clasificación estructurada (web + móvil)

**Fecha:** 2026-07-03
**Autor:** Juan José (Unergy) + Claude
**Estado:** Propuesta — pendiente de aprobación

## Problema

El registro de fallas migró a la metodología estructurada (jerárquica por activo):
**Sistema** (Red / Frontera / Inversores / Eventos adversos) → **equipo/evento** →
**detalle**, y para inversores una lista de inversores afectados, cada uno con sus
**tipos de falla**. El backend ya persiste y devuelve todo esto en `FallaOut`
(`categoria_codigo`, `subtipo_codigo`, `subtipo_detalle`, `frontera_afecta_medicion`,
`frontera_perdida_comunicacion`, `inversores_perdida_comunicacion`,
`inversores_afectados[]` y el snapshot `clasificacion`).

Pero las **vistas de revisión** de una falla no muestran nada de eso:

- **Web** `views/Fallas/FallaDetailView.vue` → solo pinta `tipo.etiqueta || tipo_libre`
  y la categoría legacy (`falla.tipo.categoria`).
- **Móvil** `mobile/components/FallaDetailSheet.vue` → igual, solo `tipo.etiqueta || tipo_libre`.

Resultado: al revisar una falla no se ve el equipo, el detalle ni los inversores
afectados con su tipo de falla. Además, el título legacy a veces **contradice** lo
reportado (p.ej. "Fusible de string quemado" en una falla de Red).

## Objetivo

Que la vista de detalle (web y móvil) **muestre la falla, el equipo y el detalle**
tal como se registraron con la metodología nueva. **Sin tocar las fechas** ni la
lógica de SLA/tiempos, seguimientos ni adjuntos.

No hay cambios de backend: `FallaOut` ya trae todo. Solo frontend.

## Fuente de datos

El snapshot `falla.clasificacion` (JSONB) ya viene con etiquetas resueltas:

```js
{
  categoria: 'inversores',            // código del sistema
  categoria_etiqueta: 'Inversores',
  subtipo: 'medidor_principal',       // opcional (Red/Frontera/Eventos)
  subtipo_etiqueta: 'Medidor principal',
  detalle: 'texto libre',             // opcional
  afecta_medicion: true,              // solo frontera
  perdida_comunicacion: false,        // solo frontera
  inversores: [                       // solo inversores
    { proyecto_inversor_id, nombre: 'Inversor 1', potencia_kw: 300,
      tipos: ['baja_tension_ac'], tipos_etiquetas: ['Baja tensión AC'] }
  ]
}
```

Para fallas **legacy** (sin clasificación) `clasificacion` es `null` → se hace
respaldo a `tipo.etiqueta`/`tipo_libre` (comportamiento actual, intacto).

## Diseño

### 1. Helper de presentación (lógica compartida, DRY)

Extender `src/utils/fallaTitulo.js` con `clasificacionDetalle(falla)` que normaliza
la clasificación en un modelo de presentación agnóstico al estilo, que consumen
ambas plataformas (web con Tailwind/PrimeVue, móvil con CSS propio):

```js
// Devuelve null si la falla no tiene clasificación estructurada (legacy).
clasificacionDetalle(f) => {
  categoria:      'inversores',
  categoriaEtiqueta: 'Inversores',
  categoriaColor: '#915BD8',          // de COLOR_CAT existente
  icono:          'pi pi-server',     // mapa de íconos por categoría
  subtitulo:      'Medidor principal',// subtipo_etiqueta (o '' )
  detalle:        'texto libre'|null,
  pendienteReclasificar: bool,        // de f.pendiente_reclasificar
  frontera: { afectaMedicion: bool, perdidaComunicacion: bool } | null,
  inversores: [                        // [] si no aplica
    { nombre: 'Inversor 1', potenciaKw: 300, tipos: ['Baja tensión AC', …] }
  ],
}
```

Reglas:
- `inversores[].tipos` usa `tipos_etiquetas` del snapshot; respaldo a
  `inversores_afectados[].tipos` (códigos) si el snapshot no los trae.
- `frontera` solo se llena para `categoria === 'frontera'`.
- Reutiliza `tituloFalla()` y `categoriaFalla()` ya existentes para el encabezado.

Sin llamadas de red nuevas; todo sale de la falla ya cargada.

### 2. Web — `FallaDetailView.vue`

- **Encabezado:** el título (línea `{{ falla.tipo?.etiqueta || falla.tipo_libre }}`)
  y el tag de categoría pasan a usar `tituloFalla(falla)` / `categoriaFalla(falla)`.
  Respaldo legacy automático dentro del helper.
- **Nuevo bloque "Clasificación" como primera tarjeta** de la columna principal
  (antes de "Información general"), solo si `clasificacionDetalle(falla)` no es null:
  - Fila cabecera: ícono + `categoriaEtiqueta` (con su color) + `subtitulo`.
  - Chip "Pendiente de reclasificar" si aplica.
  - `detalle` como párrafo si existe.
  - **Frontera:** dos badges — "Afecta medición" / "Pérdida de comunicación"
    (color según activo/inactivo).
  - **Inversores:** lista de tarjetas, una por inversor, con nombre + potencia y
    sus tipos de falla como chips.
- En "Información general" el campo **"Tipo de falla"** se reemplaza por
  **"Equipo / evento"** usando `tituloFalla(falla)` (para no mostrar el tipo legacy
  contradictorio). El resto de campos (proyecto, registrado por, asignado, **todas
  las fechas**, resolución, tiempo de afectación) queda **igual**.

Estilo: mismas tarjetas `bg-white rounded-xl shadow-sm p-5` y patrón de headers de
sección ya usados en la vista. Cero cambios en SLA, adjuntos, seguimientos,
edición (`FallaForm`) ni quick-edit.

### 3. Móvil — `FallaDetailSheet.vue`

- **Header del sheet:** `fd-type` usa `tituloFalla(fa)`.
- **Nuevo bloque "Clasificación"** justo debajo de la descripción (`fd-desc`),
  antes de los chips de Estado, solo si hay clasificación:
  - Etiqueta de sistema con color + subtítulo (equipo/evento).
  - Chip "Pendiente de reclasificar" si aplica.
  - Detalle como texto si existe.
  - Frontera: badges "Afecta medición" / "Pérdida de comunicación".
  - Inversores: por cada inversor, nombre + potencia y chips de tipos de falla.
- Estilo nativo del sheet (clases `fd-*` nuevas, misma paleta morada `#915BD8` /
  `#2C2039`). No se toca Estado, Prioridad, Asignado, fechas (`fd-facts`),
  causa raíz, seguimientos ni los botones resolver/reabrir.

### 4. Respaldo legacy

Si `clasificacion` es `null` (fallas viejas): no se renderiza el bloque nuevo y el
encabezado cae al tipo/`tipo_libre` legacy mediante el helper. Comportamiento
idéntico al actual — cero regresión para fallas históricas.

## Fuera de alcance (YAGNI)

- No se editan fechas ni lógica de SLA/tiempos.
- No se agrega edición de la clasificación desde el detalle (eso ya vive en
  `FallaForm` web / `FallaCreateSheet` móvil).
- No se toca la lista/monitoreo ni el backend.

## Archivos afectados

- `src/utils/fallaTitulo.js` — nuevo `clasificacionDetalle()` (+ mapa de íconos).
- `src/views/Fallas/FallaDetailView.vue` — bloque Clasificación + encabezado + label.
- `src/mobile/components/FallaDetailSheet.vue` — bloque Clasificación + header.

## Verificación

- Falla de **inversores** (p.ej. una reciente): muestra los inversores afectados con
  sus tipos de falla como chips.
- Falla de **frontera**: muestra equipo + badges de afecta-medición / pérdida-comunicación.
- Falla de **red/evento**: muestra el evento + detalle libre.
- Falla **legacy** sin clasificación: sin bloque nuevo, encabezado como antes.
- En todos los casos: fechas, SLA, seguimientos y adjuntos sin cambios.
