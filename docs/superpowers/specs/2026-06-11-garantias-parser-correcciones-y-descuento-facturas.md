# Garantías — Correcciones de parser + Descuento de facturas (PDF)

**Fecha:** 2026-06-11
**Estado:** Aprobado (estructura real verificada por Adhara)
**Repo:** frontend (`sole-open-source/unergy-operaciones-frontend`)
**Entrega:** Por fases — Fase 1 (parser) → build/deploy/verificar → Fase 2 (PDF)

---

## Contexto

El parser actual de Garantías Ajustes XM (`useGarantiasParser.js`) se construyó contra una estructura supuesta de los Excel de XM. La estructura real verificada difiere. Este spec corrige el parsing y añade una feature nueva: el descuento de facturas XM (PDF) integrado en el flujo Semanales, que ajusta el "Disponible" de custodia usado en el panel y el mensaje.

**Decisiones de arquitectura (confirmadas):**
- La feature PDF vive **integrada en el flujo Semanales** (no en una tab aparte). El "Disponible ajustado" fluye al panel de custodia (Paso 2) y al mensaje (Paso 3).
- Entrega **por fases**: Fase 1 corrige el parser; Fase 2 añade el PDF.

**No se toca el backend:** el historial sigue persistiendo solo totales + precios + custodia (campos fijos ya existentes en `garantias_ajustes`). El desglose de ajustes dinámicos y el detalle de facturas son solo de visualización.

---

# FASE 1 — Correcciones de parser

## 1.1 Archivo "Garantía Semanal Mensual"

**Hoja:** sin nombre fijo. Buscar la hoja cuyo nombre cumpla `/dep[oó]sito\s*sem/i` (es la primera hoja). Fallback: primera hoja del workbook.

**Encabezados:** fila índice **8**.
- Col 0 = `CÓDIGO`, col 1 = `AGENTE`, col 2 = `ACTIVIDAD`.
- Las columnas de **ajustes** van desde col índice **3** en adelante.
- **Los nombres de las columnas de ajuste cambian cada semana** → leerlos dinámicamente desde fila 8, col 3, hasta la última columna con encabezado no vacío. **No hardcodear.**

**Datos:** desde fila índice **9** hasta (sin incluir) la fila donde `col 0 === 'TOTAL'`.
- Cada fila de datos: col 0 = código del agente (`UNGC` / `UNGG`), valores de ajuste en cols 3..N.
- **UNGC puede no aparecer** (caso real). Si no existe la fila UNGC, mostrar el bloque UNGC igual, con todos los ajustes en `0`.

**Bloque de precios:** ubicado **después** de la fila `TOTAL`. Etiqueta en col 1, valor en col 2. Extraer:
- `PB`
- `Restricciones`
- `STN`
- el que **empiece con** `TRM del` (texto variable) → `trm`
- `PTB`

## 1.2 Tabla resultado por agente (output de `parseSemanales`)

Por cada agente (`UNGC` y `UNGG`):
- **Una fila por cada columna de ajuste** leída dinámicamente: `{ label: <nombre de la columna>, valor: <monto> }`.
- Luego una fila `{ label: 'TIE', valor: <TIE del agente desde WEB Garantías> }`.
- Luego una fila `{ label: 'TOTAL A PAGAR', valor: <suma de ajustes + TIE> }`.

Totales (lo que persiste y alimenta el mensaje):
- `totalUNGC` = suma de ajustes UNGC + TIE UNGC
- `totalUNGG` = suma de ajustes UNGG + TIE UNGG
- `totalConsignar` = `totalUNGC + totalUNGG` (fila final "UNGG y UNGC — TOTAL A PAGAR")

> La forma de `ungc`/`ungg` sigue siendo `{label, valor}[]`, compatible con `BloqueCodigo.vue`. La fila `TOTAL A PAGAR` se incluye dentro del arreglo o se pasa como `total` al componente (ver detalle de implementación en el plan).

## 1.3 Saldo Cuenta Custodia

**Hoja:** `WebBalancePubrdl`.

Buscar la fila donde `col 1 === '3050200006371'`:
- **Disponible** = col 9 (mostrar en rojo si `< 0`)
- **Congelado** = col 3 + col 4
- **Saldo** = col 2 (directo, NO sumar)
- **Transferencias** = col 7

**Panel de custodia (Paso 2)** — 4 cards:
1. `Disponible`
2. `Disponible (Aplicación de garantía)` = Disponible + (totalUNGG + totalUNGC) — en verde
3. `Congelado`
4. `Saldo`

## 1.4 WEB Garantías

**Hoja:** `DEPÓSITO` (mayúsculas, con tilde).
- Encabezados fila índice **9**, datos desde índice **10**.
- Código en col 1, `TIE` = col 4.
- Buscar filas `UNGC` y `UNGG`; su col 4 es el TIE que alimenta la fila TIE de cada bloque en la tabla resultado.

## 1.5 TXR / Mensuales

- **Mapear columnas por nombre de encabezado, no por posición** (el orden varía entre hojas).
- Columnas ausentes se muestran vacías (no rompen).
- La tabla de resultado renderiza dinámicamente las columnas presentes (el listado de 25 columnas del diseño original es la unión esperada, no un requisito rígido).

---

# FASE 2 — Descuento de facturas (PDF), integrado en Semanales

## 2.1 Carga

- En el **Paso 1 (Cargar)** de Semanales se añade una zona de carga **opcional** para uno o varios PDF de XM (multi-archivo). Cada PDF puede contener varios documentos, **uno por página**.
- Leer con `pdfjs-dist` (v6, ya instalado) **página por página** extrayendo el texto.
- Configurar el worker de pdf.js para Vite (ver plan).

## 2.2 Extracción por documento (4 campos) — reglas al pie de la letra

El error de "valores que no son" viene de tomar el número/fecha equivocado. Seguir exactamente:

**1. Tipo de documento** (por el título superior de la página):
| Título contiene | Tipo | Default |
|---|---|---|
| `FACTURA ELECTRÓNICA DE VENTA` (ASIC, NDAS, OSE) | **DÉBITO** (Unergy paga) | se descuenta |
| `Nota credito…` (ASNC) | CRÉDITO a favor | NO descontar |
| `Informe de Ventas` (ASIV) | ingreso por venta | NO descontar |
| `Ajuste de Ventas a Cargo` (AAVC) | — | NO descontar |
| `Ajuste de Ventas a Favor` (AAVF) | crédito | NO descontar |

**2. Valor Total:** SOLO el número tras la etiqueta literal `Valor Total:` de la cabecera (el grande).
- NO tomar `SUBTOTAL`, `I.V.A`, `VALOR TOTAL` de la tabla de ítems, ni valores de renglones.
- Regex: `/Valor Total:\s*([\d.,]+)/`, **primer match por documento**.
- Formato CO: `.` = miles, `,` = decimales → `9.755,00` → `9755.00`.

**3. Vencimiento:** SOLO la fecha bajo la etiqueta `Vencimiento`.
- NO tomar `Fecha de Generación`, `Fecha de Expedición` ni `Periodo Facturado`.
- Formato `DD-mmm-YY` español (ej. `18-jun-26`). Meses: `ene feb mar abr may jun jul ago sep/sept oct nov dic`. `26` → `2026`.

**4. Número de documento:** el identificador junto al título (`ASIC123303`, etc.). Para mostrar y evitar duplicados.

## 2.3 Cálculo

- **Fecha objetivo** = viernes de la semana actual (configurable en ⚙ Ajustes / campo editable).
- Marcar por defecto los `DÉBITO` cuyo `Vencimiento <= fecha objetivo`.
- `Total a descontar` = suma de los **marcados**.
- `Disponible ajustado` = `Disponible − Total a descontar`.
- **Usar `Disponible ajustado` en el panel y en el mensaje** cuando haya facturas cargadas. (Si no hay PDF, el panel/mensaje usan el Disponible original.)

> Punto a confirmar en revisión: cuando hay descuento, la card "Disponible (Aplicación de garantía)" usa el Disponible **ajustado** como base. Propuesta: sí (coherente con "usar el ajustado en el panel").

## 2.4 UI (en Paso 2, debajo del panel de custodia)

Tabla **editable** con todos los documentos:

| ✓ | Número | Tipo | Concepto | Valor Total | Vencimiento |

- Columna `Concepto`: etiqueta legible derivada del tipo (ej. "Factura de venta", "Nota crédito", "Informe de ventas", "Ajuste a cargo/favor").
- Los `DÉBITO` que vencen `<=` fecha objetivo vienen **marcados**; el resto **desmarcado**; el usuario puede cambiar cualquiera.
- Al pie: **Disponible original**, **Total descontado**, **Disponible ajustado**.
- Mostrar la **página de origen** de cada documento.
- **Avisos de revisión manual** (warning visible, no bloqueante):
  - una página con **más de un** `Valor Total:`
  - una página **sin** fecha de vencimiento
- Si el PDF es **escaneado (sin texto extraíble)**: avisar y permitir **ingreso manual** de los campos.

## 2.5 Mensaje (Paso 3)

El mensaje usa `Disponible ajustado` en la línea de disponible cuando hay facturas. Opcionalmente puede listar el total descontado (a confirmar en implementación; por defecto solo refleja el disponible ajustado).

---

## Manejo de errores

- Parser: mensajes claros por hoja/celda no encontrada (ya existe el patrón `errors[]`).
- PDF: por documento, si falta `Valor Total:` o `Vencimiento`, marcar para revisión manual sin abortar el resto.
- PDF escaneado: aviso + ingreso manual.

## Verificación (regla del proyecto)

- `npm run build` local debe pasar **antes** de cada push (un build roto congela producción).
- Cada fase: build → push `origin master` → verificar bundle en producción.

## Fuera de alcance

- Cambios en backend / esquema `garantias_ajustes`.
- Persistir el detalle de facturas o el desglose de ajustes dinámicos (solo visualización).
- Tab TXF (sigue como placeholder).
