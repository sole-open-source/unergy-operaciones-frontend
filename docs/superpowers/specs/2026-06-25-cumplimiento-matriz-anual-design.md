# Diseño — Pestaña "Matriz anual" (MEM / Cumplimiento)

**Fecha:** 2026-06-25
**Autor:** Juan José + Claude
**Estado:** Aprobado para implementación

## Objetivo

Nueva pestaña dentro de MEM / Cumplimiento (`CumplimientoV2View.vue`), junto a Estrategia,
Cumplimiento, Proyectos y Energía transada. Permite visualizar, **por año y por contrato**,
la proyección y ejecución de energía de los proyectos vinculados a cada contrato, en una
**matriz jerárquica Contrato → Proyectos × 12 meses**, con indicadores de cumplimiento y
exportación a Excel con fórmulas, outline colapsable y estilo de marca.

## Decisiones tomadas

1. **Estado de cumplimiento:** por mes, regla del mínimo. Cada mes se evalúa contra su mínimo
   (real en cerrados, proyección de cierre en el actual, proyección 30d en futuros). El contrato
   **No cumple** si algún mes proyecta déficit; **Cumple** en caso contrario.
2. **Alcance:** solo contratos PPA de **venta** (los que tienen compromisos de energía min/max).
3. **Excel:** fórmulas vivas (totales) + outline colapsable (proyectos bajo contrato) + estilo de
   marca y semáforo, como el export de GESCON. Las proyecciones van como valores (vienen de la API).
4. **Fuente de datos:** endpoint nuevo agregado que reúsa la lógica de `get_anual` y deduplica las
   llamadas a Unergy entre contratos (A1).
5. **UI:** tabla HTML propia con 1ª columna y header fijos, toggles de expansión (B1).

## Arquitectura

### Backend — `GET /cumplimiento/anual-matriz?year=Y`

Archivo: `Backend Operaciones/app/api/v1/cumplimiento.py`.

Refactor: extraer el núcleo de `get_anual` (cálculo de 12 meses de un contrato dado un set de
asignaciones GESCON y caches de generación) a un helper reutilizable
`_anual_meses_para_contrato(contrato, year, gescon_per_month, month_cache, avg_cache, today)`.
`get_anual` (single) y el nuevo endpoint llaman al mismo helper → una sola fuente de verdad.

Algoritmo del endpoint:
1. Query de contratos de venta (mismo universo que el simulador/Estrategia: PPA con `tipo_contrato`
   venta y/o con compromisos de energía).
2. Para cada contrato, resolver `_resolve_gescon` por los 12 meses.
3. Construir el set GLOBAL de fetches necesarios: `(sub_project, month)` para meses cerrados/actual y
   `sub_project` para promedios (actual/futuros), **deduplicado entre todos los contratos**.
4. Ejecutar los fetches únicos a Unergy UNA vez cada uno (ThreadPoolExecutor, como hoy) → caches
   compartidos `month_cache` y `avg_cache`.
5. Ensamblar por contrato vía el helper.

Respuesta:
```jsonc
{
  "year": 2026,
  "contratos": [
    {
      "id", "nombre_interno", "numero_codigo_contrato", "comprador_nombre",
      "meses": [ // 12
        { "month", "valor_mwh",      // valor a mostrar: real (cerrado) | cierre (actual) | proyección (futuro)
          "gen_mwh", "gen_proyectada_cierre", "min_mwh", "max_mwh",
          "estado",                  // ok | deficit | excedente | sin_compromisos
          "tipo_datos",              // real | mes_actual | proyeccion_historica
          "compras_bolsa_mwh", "excedentes_bolsa_mwh", "exposicion_bolsa_duplicados_mwh" }
      ],
      "proyectos": [
        { "id", "nombre", "sub_project", "pct_despacho_rep",
          // valor_mwh por proyecto = MISMA semántica que el contrato: real (cerrado) | proyección de
          // cierre del proyecto (actual) | proyección 30d del proyecto (futuro). INVARIANTE:
          // contrato.meses[m].valor_mwh == Σ proyectos[*].meses[m].valor_mwh  → permite =SUM en Excel.
          "meses": [ { "month", "valor_mwh", "pct_despacho", "es_duplicado" } ] }
      ],
      // rollups (calculados en backend)
      "estado_cumplimiento": "cumple" | "no_cumple",
      "meses_en_deficit": 0,
      "requiere_bolsa": false,        // algún mes en déficit o con duplicados
      "total_anual_mwh", "total_min_anual_mwh", "bolsa_anual_mwh",
      "n_plantas", "plantas_contrato_max", "plantas_inscritas_max"
    }
  ]
}
```

### Frontend — nueva pestaña en `CumplimientoV2View.vue`

- Añadir `'Matriz anual'` a `TABS` (índice 4); state `anualMatrizData`, `anualMatrizYear`,
  `expandedMatriz` (Set de ids); `loadAnualMatriz(year)`; condición en `watch(activeTab)`; bloque
  `v-show="activeTab === 4"`.
- **Tabla HTML propia**: header sticky + 1ª columna sticky. Columnas: Contrato/Proyecto · Ene…Dic ·
  Total · Estado · Energía. Fila de contrato (chevron, nombre, comprador, nº plantas) con 12 celdas
  coloreadas por `estado` del mes (helpers `estadoColor/estadoBadge/estadoLabel`), Total anual, badge
  Cumple/No cumple, badge Real/Bolsa. Al expandir: sub-filas de proyecto (sangradas) con generación
  mensual (`gen_contrato_mwh`) y participación (`pct_despacho` %). Fila final TOTAL (suma por mes).
- **Indicadores de contrato**: Estado cumplimiento (rollup), Estado energético (real/bolsa), Total
  anual, MWh a bolsa (tooltip), plantas inscritas/contrato (reusa variables existentes).
- **UX de riesgo**: chip "Solo no cumple" + búsqueda (patrón Estrategia); resaltado de contratos en
  déficit; leyenda real/cierre/futuro y real/bolsa.
- Selector de año reusando el patrón existente.

### Export a Excel (`xlsx-js-style`, patrón `GesconView.vue`)

Builder en módulo aparte (p.ej. `src/views/MEM/cumplimientoMatrizExcel.js`) para mantener la vista
enfocada. Estructura:
- Título + subtítulo (merge, marca) + año.
- Header: Contrato/Proyecto · Ene…Dic · Total anual · Mín anual · Estado · Bolsa (MWh).
- Por contrato (outline level 0): celdas de mes = `=SUM(rangoProyectos)`; Total = `=SUM(Ene:Dic)`;
  Mín anual valor; Estado texto; Bolsa valor/fórmula. Relleno de marca + color semáforo por celda.
- Filas de proyecto (outline level 1, colapsables vía `!rows[i].level = 1`): generación mensual y
  participación.
- Fila TOTAL general: `=SUM` de filas de contrato por mes + total.
- `!cols` (anchos), `!autofilter`, congelar 1ª columna/header si soportado.

El builder rastrea índices de fila al construir para emitir referencias de fórmula correctas.

## Componentes y límites

- **Helper backend `_anual_meses_para_contrato`**: entrada (contrato, year, asignaciones, caches);
  salida (12 meses del contrato + desglose por proyecto con su `valor_mwh` mensual, manteniendo la
  invariante contrato = Σ proyectos). Sin I/O propio (recibe caches ya pobladas) → testeable.
- **Endpoint `anual-matriz`**: orquesta query + dedup de fetches + ensamblado. Único punto con I/O.
- **`loadAnualMatriz` (frontend)**: fetch + estado de carga/error.
- **`cumplimientoMatrizExcel.js`**: función pura `construirLibro(data)` → workbook; testeable en
  cuanto a fórmulas/outline sin DOM.

## Testing

- Backend: `py_compile`; test de rollup (`estado_cumplimiento`/`meses_en_deficit`/`requiere_bolsa`
  a partir de estados mensuales) y de dedup de fetches (que cada (sub_project, month) único se pida
  una vez).
- Frontend: `npm run build`; test del builder de Excel (referencias de fórmula `=SUM(...)`, niveles
  de outline, totales) en Node.
- Verificación manual: comparar valores de la matriz contra la tab Cumplimiento (deben coincidir).

## Reuso

Scaffolding de pestaña + lazy load; `_resolve_gescon`; lógica de proyección de `get_anual`; helpers
de estado/color; patrón de filtro/búsqueda de Estrategia; patrón de export de GESCON
(`xlsx-js-style`); variables plantas inscritas/contrato ya construidas.

## Fuera de alcance (YAGNI)

- Contratos de compra (solo venta).
- Recrear la fórmula de proyección dentro de Excel (las proyecciones son valores).
- Edición inline en la matriz (es vista de análisis/lectura).
