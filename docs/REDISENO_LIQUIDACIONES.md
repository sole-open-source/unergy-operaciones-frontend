# Rediseño del módulo de Liquidaciones — qué cambió

> Para el equipo (en especial Jessica, que mantiene Liquidaciones). Todos los cambios son
> **aditivos sobre la API existente** — no se tocó la lógica del backend ni los serializadores,
> ni el proceso de carga por Excel. Desplegado a producción (Vercel) en master.

## Resumen
Liquidaciones pasó de varias rutas sueltas a **una sola vista con pestañas** y se rediseñó la
vista de detalle (el "ojito") para que sea más clara, responsive y útil para dirección.

## 1. Vista principal `/liquidaciones` (una sola, con pestañas)
Barra superior morada con pestañas (deep-link por `?tab=`):
- **Resumen** — dashboard del período: KPIs (ingresos/costos/neto/margen/liquidados/sin liquidar)
  con comparativo vs mes anterior, ingresos por tipo, pipeline de los 8 estados y tendencia 12 meses.
- **Proyectos** — la tabla Proyecto → Año → Mes de siempre. Filtros (búsqueda, estado, tipo de venta)
  ahora **se recuerdan** (localStorage).
- **Inversionistas** — la vista por inversionista de siempre; el gráfico de barras ahora es real (Chart.js).
- **Cargar Excel** — el mismo flujo de carga, ahora integrado como pestaña.

Las rutas viejas (`/liquidaciones/inversionista`, `/liquidaciones/cargar-excel`) siguen
funcionando: redirigen a la pestaña correspondiente.

## 2. Vista de detalle (ícono del ojo) — rediseñada
Orden de arriba hacia abajo:
1. **Encabezado** — proyecto, período, estado, y **un solo** enlace al *Estado de Resultados* (Hoja
   de Google). Botones "Editar resumen" y "Estado".
2. **Ingresos vs Costos — este mes vs promedio del proyecto** — barras por ítem (Ingresos, Costos
   operativos, Facturas, Neto) comparando el mes actual contra el **promedio histórico** del proyecto,
   con variación %.
3. **Estado de Resultados (tabla)** — cascada Ingresos → Comercialización/Bolsa → Costos OPEX →
   Facturas → **Ingreso neto**, con el **soporte de cada línea inline** (chip 📎; el IVA/impuestos no
   piden soporte).
4. **Generación del mes** — kWh/día (datos en vivo de la API de monitoreo Unergy) + **tarifas de
   servicio del proyecto** (Representación / CGM / Administración, $/kWh, indexadas al año del período).
5. **Datos contables** — comprobante, consecutivos, tasa.

### Cómo se calcula el INGRESO NETO (fórmula oficial)
```
neto = valor a pagar (mandato de ingresos)   ← bruto − comercialización − compras + ventas ± ajuste
     − mandato de costos                       ← arriendo, servicios públicos, internet, mantenimientos…
     − facturas de servicio                    ← CGM + Representación + Administración
```
Se usa el `valor_neto_cop` del mandato directamente (cubre el caso NEU automáticamente). La misma
fórmula se usa en el dashboard, el comparativo y la tabla — todo cuadra entre sí.

## ⚠️ Cambio importante para el día a día
Para simplificar, **se quitaron de la vista de detalle las secciones editables de Ingresos / Costos /
Servicios** (las pestañas/tablas con los botones de agregar/editar/eliminar líneas). Eso significa que
**la edición de líneas, mandatos, costos y facturas ya no se hace desde el detalle** — el flujo de
captura sigue siendo la **carga por Excel** (pestaña "Cargar Excel"). En el detalle quedan activos
"Editar resumen" (tasa, comprobante, consecutivos, URL de la Hoja, observaciones) y "Estado".

> Jessica: si necesitas volver a editar/añadir un soporte a una línea puntual sin pasar por Excel,
> avísanos y reactivamos esa edición de forma inline (sin traer de vuelta las tablas completas).

## Notas técnicas
- Capa compartida nueva: `src/constants/liquidaciones.js` y `src/utils/liquidaciones.js` (formatos,
  catálogos y la fórmula del neto) — antes estaban duplicados en 4 archivos.
- Componentes del detalle en `src/views/Liquidaciones/components/`:
  `IngresoCostoComparativo.vue`, `EstadoResultados.vue`, `GeneracionMensualChart.vue`,
  `NetoMensualBar.vue`.
- Sin cambios en el backend (un ajuste de permisos de solo-lectura quedó pendiente de aprobación).
