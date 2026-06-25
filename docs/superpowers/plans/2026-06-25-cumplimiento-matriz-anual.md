# Matriz Anual de Cumplimiento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nueva pestaña "Matriz anual" en MEM/Cumplimiento que muestra, por año, una matriz jerárquica contrato→proyectos × 12 meses con cumplimiento por mes, e export a Excel con fórmulas + outline colapsable + estilo de marca.

**Architecture:** Backend expone un endpoint agregado `/cumplimiento/anual-matriz?year=` que reúsa el núcleo de cálculo de `get_anual` (extraído a un helper) y deduplica las llamadas a la API Unergy entre contratos. El frontend añade una pestaña con tabla HTML propia (1ª columna y header fijos) y un builder de Excel con `xlsx-js-style`.

**Tech Stack:** FastAPI + SQLAlchemy (backend), Vue 3 `<script setup>` + PrimeVue + Tailwind (frontend), `xlsx-js-style` (export).

## Global Constraints

- Solo contratos PPA de **venta** (mismo universo que el simulador/Estrategia).
- Cumplimiento por mes, regla del mínimo: contrato **No cumple** si algún mes tiene `estado === 'deficit'`.
- Valor mensual por celda: real (mes cerrado) | proyección de cierre (mes actual) | proyección 30d (mes futuro). Reusar la lógica existente de `get_anual` — NO recalcular distinto.
- **Invariante:** `contrato.meses[m].valor_mwh == Σ proyectos[*].meses[m].valor_mwh` (para que `=SUM` en Excel cuadre).
- Colores semáforo: verde `#2e7d32` (ok), rojo `#D64455` (déficit), turquesa `#14B8A6` (excedente), gris `#b0a0c0` (sin compromisos). Reusar `estadoColor/estadoBadge/estadoLabel`.
- No tocar nombres internos ya desplegados (`cantidad_proyectos`, JSON `plantas_esperadas`).
- Deploy: ramas de feature + PR a master (no push directo); auto-deploy Railway/Vercel al merge.

**Archivos clave (contexto):**
- Backend: `Backend Operaciones/app/api/v1/cumplimiento.py` — `get_anual` (~1127), `_resolve_gescon` (~265), helpers `_fetch_month`/`_fetch_recent_avg`/`_unergy_token`, endpoint `get_simulador` (~627) para la selección de contratos de venta.
- Frontend: `unergy-operaciones-frontend/src/views/MEM/CumplimientoV2View.vue` — `TABS` (~1169), `watch(activeTab)` (~2298), helpers de estado (~1725), patrón export GESCON en `src/views/MEM/GesconView.vue` (~431-551).

---

## File Structure

- **Modify** `Backend Operaciones/app/api/v1/cumplimiento.py`
  - Extraer `_anual_meses_para_contrato(...)` (refactor de `get_anual`, añade `valor_mwh` por proyecto).
  - Añadir `_rollup_cumplimiento(meses)` (función pura de rollup).
  - Añadir endpoint `get_anual_matriz` (`GET /cumplimiento/anual-matriz`).
- **Create** `Backend Operaciones/scripts/tests/test_matriz_anual.py` — tests standalone runnables con `python` (sin dependencia de pytest) para las funciones puras.
- **Modify** `unergy-operaciones-frontend/src/views/MEM/CumplimientoV2View.vue`
  - Pestaña "Matriz anual": state, `loadAnualMatriz`, `watch`, bloque `v-show`, tabla.
- **Create** `unergy-operaciones-frontend/src/views/MEM/cumplimientoMatrizExcel.js` — `construirLibroMatriz(data, year)` (función pura → workbook).
- **Create** `unergy-operaciones-frontend/scripts/test_matriz_excel.mjs` — test Node del builder de Excel.

---

## Task 1: Backend — extraer helper `_anual_meses_para_contrato` (refactor de get_anual)

**Files:**
- Modify: `Backend Operaciones/app/api/v1/cumplimiento.py` (función `get_anual`, ~1196-1328)
- Test: `Backend Operaciones/scripts/tests/test_matriz_anual.py`

**Interfaces:**
- Produces: `_anual_meses_para_contrato(contrato, year, gescon_per_month, month_cache, avg_cache, today) -> tuple[list[dict], list[dict]]` que retorna `(meses, proyectos)` donde cada `mes` tiene los campos actuales de `get_anual` MÁS `valor_mwh`, y `proyectos` es `[{id, nombre, sub_project, pct_despacho_rep, meses:[{month, valor_mwh, pct_despacho, es_duplicado}]}]`. Caches y `gescon_per_month` se reciben ya poblados (sin I/O dentro del helper).

- [ ] **Step 1: Escribir el test de la invariante (falla primero)**

Crear `Backend Operaciones/scripts/tests/test_matriz_anual.py`:

```python
"""Tests standalone (sin pytest): `python scripts/tests/test_matriz_anual.py`."""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import date

# Stub mínimo de asignación GESCON para el helper (atributos que usa get_anual).
class _Proy:
    def __init__(self, nombre, sp, pid): self.nombre_comercial=nombre; self.sub_project=sp; self.id=pid
class _Asic:
    def __init__(self, nombre, sp, pid, pct, dup=False, fi=None, ff=None):
        self.proyecto=_Proy(nombre, sp, pid); self.proyecto_id=pid
        self.porcentaje_despacho=pct; self.es_duplicado=dup
        self.fecha_inicio=fi; self.fecha_fin=ff

def test_invariante_contrato_igual_suma_proyectos():
    from app.api.v1.cumplimiento import _anual_meses_para_contrato
    class C:  # contrato mínimo
        id=1; nombre_interno="X"; numero_codigo_contrato="C1"; comprador_nombre="Comp"
    today = date(2030, 1, 15)  # todos los meses del 2026 son pasados → tipo_datos "real"
    gpm = {m: [_Asic("A","spA",10,0.5), _Asic("B","spB",20,0.5)] for m in range(1,13)}
    # month_cache: gen bruta por (mes, sub_project)
    month_cache = {}
    for m in range(1,13):
        month_cache[(m,"spA")] = {"mwh": 100.0}
        month_cache[(m,"spB")] = {"mwh": 40.0}
    meses, proyectos = _anual_meses_para_contrato(C(), 2026, gpm, month_cache, {}, today)
    assert len(meses) == 12 and len(proyectos) == 2
    for i, mes in enumerate(meses):
        suma = sum(p["meses"][i]["valor_mwh"] or 0 for p in proyectos)
        assert abs(mes["valor_mwh"] - suma) < 1e-6, f"mes {i+1}: {mes['valor_mwh']} != {suma}"

if __name__ == "__main__":
    test_invariante_contrato_igual_suma_proyectos()
    print("OK test_matriz_anual (Task 1)")
```

- [ ] **Step 2: Ejecutar el test — debe fallar**

Run: `cd "Backend Operaciones" && python scripts/tests/test_matriz_anual.py`
Expected: `ImportError: cannot import name '_anual_meses_para_contrato'`

- [ ] **Step 3: Refactor — extraer el helper de `get_anual`**

En `cumplimiento.py`, mover el cuerpo del loop `for m in range(1, 13):` de `get_anual` (la parte que construye cada `mes` y `plantas_mes`, ~líneas 1196-1317) a una función nueva ubicada justo ANTES de `get_anual`:

```python
def _anual_meses_para_contrato(contrato, year, gescon_per_month, month_cache, avg_cache, today):
    """Construye los 12 meses + desglose por proyecto para un contrato.
    Caches (month_cache/avg_cache) y gescon_per_month vienen ya poblados (sin I/O aquí).
    Retorna (meses, proyectos) con `valor_mwh` por mes (real|cierre|futuro) tanto a nivel
    contrato como por proyecto, manteniendo: contrato.valor_mwh == Σ proyectos.valor_mwh.
    """
    import calendar
    from datetime import date
    comp_map = {  # compromisos del año (min/max/plantas) — se consultan fuera y se pasan? NO:
        r.mes: r for r in []  # (placeholder eliminado en Step siguiente; ver nota)
    }
    # ... (cuerpo trasladado; ver Step 3b)
```

> NOTA: `comp_map` (compromisos de energía) hoy se consulta dentro de `get_anual` por DB. El helper
> debe recibirlo o consultarlo. Para no meter I/O en el helper, **pásalo como parámetro**.

Ajustar firma a:
`_anual_meses_para_contrato(contrato, year, gescon_per_month, comp_map, month_cache, avg_cache, today)`

- [ ] **Step 3b: Trasladar el cuerpo y añadir `valor_mwh` por proyecto**

Dentro del helper, replica EXACTAMENTE el cálculo actual por mes de `get_anual` (proration, `gp`,
`gen_contrato`, `gen_total`, `gen_cierre`, `estado`, etc.). Cambios mínimos:
1. Acumular un dict `proyectos_acc[(pid, sp, nombre)]` con una lista de 12 `valor_mwh` por proyecto.
2. El `valor_mwh` por proyecto en el mes `m`:
   - mes pasado (`real`): `gen_contrato` (el ya calculado por proyecto).
   - mes actual: proyección de cierre del proyecto = `gen_contrato_actual + avg_planta * pct * proration * dias_restantes` (usa el mismo `avg` por planta que ya se usa para `gen_cierre`).
   - mes futuro: `gen_contrato` proyectado (ya es proyección).
3. El `valor_mwh` del contrato en el mes `m`:
   - mes pasado: `gen_total`
   - mes actual: `gen_cierre`
   - mes futuro: `gen_proy` (gen_total proyectada)
4. Cada `mes` del contrato añade `"valor_mwh": <según tipo>`.
5. Construir `proyectos = [{"id":pid,"nombre":nombre,"sub_project":sp,"pct_despacho_rep":<último pct>, "meses":[{"month":m,"valor_mwh":v,"pct_despacho":pct,"es_duplicado":dup} ...]}]`.

Devolver `(meses, proyectos)`.

- [ ] **Step 3c: Hacer que `get_anual` use el helper**

En `get_anual`, tras poblar `gescon_per_month`, `comp_map`, `month_cache`, `avg_cache`, reemplazar el
loop por:

```python
    meses, _proyectos = _anual_meses_para_contrato(
        contrato, year, gescon_per_month, comp_map, month_cache, avg_cache, today
    )
    return {"contrato": {...igual que hoy...}, "year": year, "meses": meses}
```

(La respuesta pública de `get_anual` no cambia: sigue exponiendo `meses` con los mismos campos +
`valor_mwh` adicional, que es retrocompatible.)

- [ ] **Step 4: Ejecutar test — debe pasar**

Run: `cd "Backend Operaciones" && python scripts/tests/test_matriz_anual.py`
Expected: `OK test_matriz_anual (Task 1)`

- [ ] **Step 5: Verificar que no rompió get_anual**

Run: `cd "Backend Operaciones" && python -m py_compile app/api/v1/cumplimiento.py && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
cd "Backend Operaciones"
git add app/api/v1/cumplimiento.py scripts/tests/test_matriz_anual.py
git commit -m "refactor(cumplimiento): extraer _anual_meses_para_contrato + valor_mwh por proyecto"
```

---

## Task 2: Backend — función pura `_rollup_cumplimiento(meses)`

**Files:**
- Modify: `Backend Operaciones/app/api/v1/cumplimiento.py`
- Test: `Backend Operaciones/scripts/tests/test_matriz_anual.py` (añadir test)

**Interfaces:**
- Produces: `_rollup_cumplimiento(meses: list[dict]) -> dict` con claves `estado_cumplimiento` ("cumple"|"no_cumple"), `meses_en_deficit` (int), `requiere_bolsa` (bool), `total_anual_mwh` (float), `total_min_anual_mwh` (float), `bolsa_anual_mwh` (float). Consume `meses` del Task 1 (usa `estado`, `valor_mwh`, `min_mwh`, `compras_bolsa_mwh`, `exposicion_bolsa_duplicados_mwh`).

- [ ] **Step 1: Test (falla primero)** — añadir a `test_matriz_anual.py`:

```python
def test_rollup_cumplimiento():
    from app.api.v1.cumplimiento import _rollup_cumplimiento
    meses = [
        {"estado":"ok","valor_mwh":100,"min_mwh":90,"compras_bolsa_mwh":0,"exposicion_bolsa_duplicados_mwh":None},
        {"estado":"deficit","valor_mwh":80,"min_mwh":90,"compras_bolsa_mwh":10,"exposicion_bolsa_duplicados_mwh":None},
        {"estado":"excedente","valor_mwh":200,"min_mwh":90,"compras_bolsa_mwh":0,"exposicion_bolsa_duplicados_mwh":5},
    ]
    r = _rollup_cumplimiento(meses)
    assert r["estado_cumplimiento"] == "no_cumple"
    assert r["meses_en_deficit"] == 1
    assert r["requiere_bolsa"] is True
    assert abs(r["total_anual_mwh"] - 380) < 1e-6
    assert abs(r["bolsa_anual_mwh"] - 15) < 1e-6  # 10 compras + 5 duplicados
```

Y añadir su llamada en el bloque `if __name__ == "__main__":`.

- [ ] **Step 2: Ejecutar — falla** (`ImportError: _rollup_cumplimiento`).
Run: `cd "Backend Operaciones" && python scripts/tests/test_matriz_anual.py`

- [ ] **Step 3: Implementar** (añadir cerca de `_anual_meses_para_contrato`):

```python
def _rollup_cumplimiento(meses: list[dict]) -> dict:
    deficit = sum(1 for m in meses if m.get("estado") == "deficit")
    bolsa = sum((m.get("compras_bolsa_mwh") or 0) + (m.get("exposicion_bolsa_duplicados_mwh") or 0) for m in meses)
    return {
        "estado_cumplimiento": "no_cumple" if deficit > 0 else "cumple",
        "meses_en_deficit": deficit,
        "requiere_bolsa": bolsa > 0,
        "total_anual_mwh": round(sum(m.get("valor_mwh") or 0 for m in meses), 3),
        "total_min_anual_mwh": round(sum(m.get("min_mwh") or 0 for m in meses), 3),
        "bolsa_anual_mwh": round(bolsa, 3),
    }
```

- [ ] **Step 4: Ejecutar — pasa**
Run: `cd "Backend Operaciones" && python scripts/tests/test_matriz_anual.py`
Expected: imprime ambos OK.

- [ ] **Step 5: Commit**

```bash
cd "Backend Operaciones"
git add app/api/v1/cumplimiento.py scripts/tests/test_matriz_anual.py
git commit -m "feat(cumplimiento): rollup de cumplimiento anual por contrato"
```

---

## Task 3: Backend — endpoint `/cumplimiento/anual-matriz` con fetches deduplicados

**Files:**
- Modify: `Backend Operaciones/app/api/v1/cumplimiento.py` (nuevo endpoint, junto a `get_anual`)
- Test: `Backend Operaciones/scripts/tests/test_matriz_anual.py` (test del builder de set de fetches)

**Interfaces:**
- Consumes: `_anual_meses_para_contrato`, `_rollup_cumplimiento`, `_resolve_gescon`, `_fetch_month`, `_fetch_recent_avg`, `_unergy_token` (existentes).
- Produces: `GET /cumplimiento/anual-matriz?year=Y` → `{ year, contratos: [{...meses, proyectos, rollups...}] }` (ver spec).

- [ ] **Step 1: Test del set de fetches deduplicados (falla primero)** — añadir a `test_matriz_anual.py`:

```python
def test_dedup_fetch_set():
    from app.api.v1.cumplimiento import _build_fetch_sets
    from datetime import date
    today = date(2026, 6, 15)
    # dos contratos comparten "spA" en meses pasados → debe deduplicar
    gpm_por_contrato = {
        1: {m: [_Asic("A","spA",10,1.0)] for m in range(1,13)},
        2: {m: [_Asic("A","spA",10,1.0), _Asic("B","spB",20,1.0)] for m in range(1,13)},
    }
    need_month, need_avg = _build_fetch_sets(gpm_por_contrato, 2026, today)
    # spA en meses pasados (1..5) una sola vez aunque esté en 2 contratos
    assert ("spA", 1) in need_month
    assert len([x for x in need_month if x == ("spA", 1)]) == 1
    assert "spA" in need_avg  # para proyección (mes actual/futuros)
```

Añadir su llamada al `__main__`.

- [ ] **Step 2: Ejecutar — falla** (`ImportError: _build_fetch_sets`).

- [ ] **Step 3: Implementar `_build_fetch_sets` + endpoint**

`_build_fetch_sets(gpm_por_contrato, year, today) -> tuple[set, set]` replica la lógica de
detección de `need_month`/`need_avg` de `get_anual` (líneas ~1156-1170) pero sobre TODOS los
contratos, devolviendo sets `{(sub_project, month)}` y `{sub_project}` deduplicados:

```python
def _build_fetch_sets(gpm_por_contrato: dict, year: int, today) -> tuple[set, set]:
    need_month, need_avg = set(), set()
    for gpm in gpm_por_contrato.values():
        for m in range(1, 13):
            is_current = (year == today.year and m == today.month)
            is_future = (year > today.year) or (year == today.year and m > today.month)
            for asic in gpm[m]:
                sp = asic.proyecto.sub_project if asic.proyecto else None
                if not sp:
                    continue
                if is_future:
                    need_avg.add(sp)
                elif is_current:
                    need_month.add((sp, m)); need_avg.add(sp)
                else:
                    need_month.add((sp, m))
    return need_month, need_avg
```

Endpoint (junto a `get_anual`):

```python
@router.get("/anual-matriz")
def get_anual_matriz(
    year: int = Query(..., ge=2020, le=2050),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Matriz anual contrato->proyectos x 12 meses (solo venta). Deduplica fetches a Unergy."""
    today = date.today()

    # 1. Contratos de venta (mismo universo que el simulador). Reusar el query de get_simulador:
    #    PPA con tipo_contrato venta (o sin marcar) — ver get_simulador (~627) y replicar EXACTO.
    contratos = _query_contratos_venta(db)  # ver Step 3b

    # 2. GESCON por contrato/mes
    gpm_por_contrato = {}
    comp_por_contrato = {}
    for c in contratos:
        gpm_por_contrato[c.id] = {
            m: (_resolve_gescon(db, c.numero_codigo_contrato, year, m) if c.numero_codigo_contrato else [])
            for m in range(1, 13)
        }
        comp_por_contrato[c.id] = {
            r.mes: r for r in db.query(PPACompromisoEnergia).filter(
                PPACompromisoEnergia.contrato_id == c.id, PPACompromisoEnergia.año == year
            ).all()
        }

    # 3. Set global de fetches deduplicado + 4. fetch único en paralelo (reusar patrón get_anual)
    need_month, need_avg = _build_fetch_sets(gpm_por_contrato, year, today)
    month_cache, avg_cache = {}, {}
    if need_month or need_avg:
        try:
            token = _unergy_token()
        except Exception:
            token = None
        if token and need_month:
            from concurrent.futures import ThreadPoolExecutor
            def _ft(task):
                sp, m = task
                return task, _fetch_month(token, sp, year, m)
            with ThreadPoolExecutor(max_workers=min(len(need_month), 12)) as pool:
                for (sp, m), res in pool.map(_ft, list(need_month)):
                    month_cache[(m, sp)] = res
        if token and need_avg:
            from concurrent.futures import ThreadPoolExecutor
            def _fa(sp):
                return sp, _fetch_recent_avg(token, sp)
            with ThreadPoolExecutor(max_workers=min(len(need_avg), 12)) as pool:
                for sp, res in pool.map(_fa, list(need_avg)):
                    avg_cache[sp] = res

    # 5. Ensamblar por contrato
    out = []
    for c in contratos:
        meses, proyectos = _anual_meses_para_contrato(
            c, year, gpm_por_contrato[c.id], comp_por_contrato[c.id], month_cache, avg_cache, today
        )
        rollup = _rollup_cumplimiento(meses)
        out.append({
            "id": c.id, "nombre_interno": c.nombre_interno,
            "numero_codigo_contrato": c.numero_codigo_contrato, "comprador_nombre": c.comprador_nombre,
            "meses": meses, "proyectos": proyectos,
            "n_plantas": max((len(gpm_por_contrato[c.id][m]) for m in range(1, 13)), default=0),
            **rollup,
        })
    return {"year": year, "contratos": out}
```

> Verifica que `_fetch_month`/`_fetch_recent_avg` tengan esas firmas exactas en `get_anual`; si
> difieren, ajusta las llamadas para que coincidan con las del cuerpo actual de `get_anual`.

- [ ] **Step 3b: `_query_contratos_venta`**

Localiza en `get_simulador` (~627) el query que selecciona contratos de venta y extráelo a
`_query_contratos_venta(db) -> list[PPAContrato]` (reúsalo en ambos sitios). Si el simulador filtra
por `tipo_contrato == 'venta'` (o `!= 'compra'`), replícalo idéntico.

- [ ] **Step 4: Ejecutar test del dedup — pasa**
Run: `cd "Backend Operaciones" && python scripts/tests/test_matriz_anual.py`
Expected: todos los OK.

- [ ] **Step 5: Compilar**
Run: `cd "Backend Operaciones" && python -m py_compile app/api/v1/cumplimiento.py && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
cd "Backend Operaciones"
git add app/api/v1/cumplimiento.py scripts/tests/test_matriz_anual.py
git commit -m "feat(cumplimiento): endpoint /anual-matriz (matriz anual venta, fetches deduplicados)"
```

---

## Task 4: Frontend — scaffolding de la pestaña "Matriz anual"

**Files:**
- Modify: `unergy-operaciones-frontend/src/views/MEM/CumplimientoV2View.vue`

**Interfaces:**
- Consumes: `GET /cumplimiento/anual-matriz?year=` (Task 3).
- Produces: state `anualMatrizData`, `anualMatrizYear`, `expandedMatriz`, `matrizSoloNoCumple`, `matrizBusqueda`; función `loadAnualMatriz()`; pestaña índice 4.

- [ ] **Step 1: Añadir la pestaña a `TABS`**

Localiza `const TABS = ['Estrategia', 'Cumplimiento', 'Proyectos', 'Energía transada']` (~1169) y
cámbialo a:

```javascript
const TABS = ['Estrategia', 'Cumplimiento', 'Proyectos', 'Energía transada', 'Matriz anual']
```

- [ ] **Step 2: State + carga**

Cerca del resto de state de tabs, añade:

```javascript
const anualMatrizData = ref(null)
const anualMatrizLoading = ref(false)
const anualMatrizError = ref('')
const anualMatrizYear = ref(new Date().getFullYear())
const expandedMatriz = ref([])              // ids de contrato expandidos
const matrizSoloNoCumple = ref(false)
const matrizBusqueda = ref('')

async function loadAnualMatriz() {
  anualMatrizLoading.value = true
  anualMatrizError.value = ''
  try {
    const { data } = await api.get('/cumplimiento/anual-matriz', { params: { year: anualMatrizYear.value } })
    anualMatrizData.value = data
  } catch (e) {
    anualMatrizError.value = e.response?.data?.detail || e.message
  } finally {
    anualMatrizLoading.value = false
  }
}

function toggleMatriz(id) {
  const i = expandedMatriz.value.indexOf(id)
  if (i >= 0) expandedMatriz.value.splice(i, 1)
  else expandedMatriz.value.push(id)
}
```

- [ ] **Step 3: Lazy load en `watch(activeTab)`**

En el `watch(activeTab)` (~2298) añade:

```javascript
  if (tab === 4 && !anualMatrizData.value) loadAnualMatriz()
```

- [ ] **Step 4: Bloque `v-show` esqueleto**

Tras el bloque de la tab "Energía transada", añade:

```vue
<div v-show="activeTab === 4" class="space-y-4">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2">
      <Select v-model="anualMatrizYear" :options="years" class="w-28" @change="loadAnualMatriz" />
      <label class="flex items-center gap-1.5 text-sm" style="color:#7a6e8a;">
        <Checkbox v-model="matrizSoloNoCumple" :binary="true" /> Solo no cumple
      </label>
      <InputText v-model="matrizBusqueda" placeholder="Buscar contrato…" class="text-sm" />
    </div>
    <Button label="Exportar Excel" icon="pi pi-download" size="small" outlined
            :disabled="!anualMatrizData" @click="exportarMatrizExcel" />
  </div>
  <ProgressSpinner v-if="anualMatrizLoading" />
  <Message v-else-if="anualMatrizError" severity="error" :closable="false">{{ anualMatrizError }}</Message>
  <!-- tabla: Task 5 -->
</div>
```

> Verifica que `years`, `Select`, `Checkbox`, `InputText`, `Button`, `Message`, `ProgressSpinner` ya
> estén importados/disponibles en el componente (lo están: se usan en otras tabs). `exportarMatrizExcel`
> se define en Task 6 — por ahora declara un stub `function exportarMatrizExcel() {}`.

- [ ] **Step 5: Build**
Run: `cd unergy-operaciones-frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built in ...`

- [ ] **Step 6: Commit**

```bash
cd unergy-operaciones-frontend
git add src/views/MEM/CumplimientoV2View.vue
git commit -m "feat(cumplimiento): scaffolding pestaña Matriz anual (state + carga + filtros)"
```

---

## Task 5: Frontend — tabla matriz (contrato + proyectos + indicadores + totales)

**Files:**
- Modify: `unergy-operaciones-frontend/src/views/MEM/CumplimientoV2View.vue`

**Interfaces:**
- Consumes: `anualMatrizData`, `expandedMatriz`, helpers `estadoColor/estadoBadge/estadoLabel` (~1725), `MESES`.
- Produces: computed `matrizFiltrada`, `matrizTotalesMensuales`; render de la tabla.

- [ ] **Step 1: Computeds de filtro y totales**

```javascript
const matrizFiltrada = computed(() => {
  const cs = anualMatrizData.value?.contratos || []
  const q = matrizBusqueda.value.trim().toLowerCase()
  return cs.filter(c =>
    (!matrizSoloNoCumple.value || c.estado_cumplimiento === 'no_cumple') &&
    (!q || (c.nombre_interno || c.numero_codigo_contrato || '').toLowerCase().includes(q)
        || (c.comprador_nombre || '').toLowerCase().includes(q))
  )
})

const matrizTotalesMensuales = computed(() => {
  const tot = Array.from({ length: 12 }, () => 0)
  for (const c of matrizFiltrada.value)
    c.meses.forEach((m, i) => { tot[i] += m.valor_mwh || 0 })
  return tot
})

function fmtMwh(v) { return v == null ? '—' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 }) }
```

- [ ] **Step 2: Render de la tabla** (reemplaza el comentario `<!-- tabla: Task 5 -->`):

```vue
<div v-if="anualMatrizData" class="overflow-x-auto border rounded-lg" style="border-color:rgba(44,32,57,0.08);">
  <table class="cv-matriz text-sm">
    <thead>
      <tr>
        <th class="sticky-col text-left px-3 py-2">Contrato / Proyecto</th>
        <th v-for="(mes, i) in MESES" :key="i" class="px-2 py-2 text-right">{{ mes.slice(0,3) }}</th>
        <th class="px-3 py-2 text-right">Total</th>
        <th class="px-3 py-2 text-center">Estado</th>
        <th class="px-3 py-2 text-center">Energía</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="c in matrizFiltrada" :key="c.id">
        <!-- Fila contrato -->
        <tr class="cv-matriz-contrato cursor-pointer" @click="toggleMatriz(c.id)">
          <td class="sticky-col px-3 py-1.5">
            <i class="pi text-xs mr-1" :class="expandedMatriz.includes(c.id) ? 'pi-chevron-down' : 'pi-chevron-right'" />
            <span class="font-semibold">{{ c.nombre_interno || c.numero_codigo_contrato }}</span>
            <span class="text-xs ml-1" style="color:#7a6e8a;">{{ c.comprador_nombre }} · {{ c.n_plantas }} pl.</span>
          </td>
          <td v-for="(m, i) in c.meses" :key="i" class="px-2 py-1.5 text-right font-mono"
              :style="{ color: estadoColor(m.estado) }"
              v-tooltip.top="estadoLabel(m.estado) + ' · ' + (m.tipo_datos)">{{ fmtMwh(m.valor_mwh) }}</td>
          <td class="px-3 py-1.5 text-right font-mono font-bold">{{ fmtMwh(c.total_anual_mwh) }}</td>
          <td class="px-3 py-1.5 text-center">
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  :style="estadoBadge(c.estado_cumplimiento === 'cumple' ? 'ok' : 'deficit')"
                  v-tooltip.top="c.meses_en_deficit + ' mes(es) en déficit'">
              {{ c.estado_cumplimiento === 'cumple' ? '✓ Cumple' : '✗ No cumple' }}
            </span>
          </td>
          <td class="px-3 py-1.5 text-center">
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  :style="estadoBadge(c.requiere_bolsa ? 'excedente' : 'ok')"
                  v-tooltip.top="c.requiere_bolsa ? (fmtMwh(c.bolsa_anual_mwh) + ' MWh vía bolsa') : 'Cubierto con generación real'">
              {{ c.requiere_bolsa ? '◆ Bolsa' : '● Real' }}
            </span>
          </td>
        </tr>
        <!-- Filas proyecto (expandidas) -->
        <template v-if="expandedMatriz.includes(c.id)">
          <tr v-for="p in c.proyectos" :key="c.id + '-' + p.id" class="cv-matriz-proyecto">
            <td class="sticky-col px-3 py-1 pl-8">
              <span>{{ p.nombre }}</span>
              <span class="text-xs ml-1" style="color:#7a6e8a;">{{ Math.round((p.pct_despacho_rep||0)*100) }}% part.</span>
            </td>
            <td v-for="(m, i) in p.meses" :key="i" class="px-2 py-1 text-right font-mono text-xs" style="color:#5a5168;">
              {{ fmtMwh(m.valor_mwh) }}
            </td>
            <td colspan="3"></td>
          </tr>
        </template>
      </template>
      <!-- Total general -->
      <tr class="cv-matriz-total">
        <td class="sticky-col px-3 py-2 font-bold">TOTAL ({{ matrizFiltrada.length }})</td>
        <td v-for="(t, i) in matrizTotalesMensuales" :key="i" class="px-2 py-2 text-right font-mono font-bold">{{ fmtMwh(t) }}</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>
</div>
```

- [ ] **Step 3: Estilos** (añadir al `<style scoped>` del componente):

```css
.cv-matriz { width: 100%; border-collapse: separate; border-spacing: 0; }
.cv-matriz thead th { position: sticky; top: 0; background: #faf8fd; z-index: 2; font-weight: 600; color: #2C2039; border-bottom: 1px solid rgba(44,32,57,0.1); }
.cv-matriz .sticky-col { position: sticky; left: 0; background: #fff; z-index: 1; min-width: 240px; }
.cv-matriz thead .sticky-col { z-index: 3; background: #faf8fd; }
.cv-matriz-contrato:hover { background: #f6f2fb; }
.cv-matriz-contrato .sticky-col { background: #fff; }
.cv-matriz-proyecto { background: #fbfafd; }
.cv-matriz-proyecto .sticky-col { background: #fbfafd; }
.cv-matriz-total td { border-top: 2px solid rgba(44,32,57,0.15); background: #f3eefb; }
.cv-matriz-total .sticky-col { background: #f3eefb; }
```

- [ ] **Step 4: Build**
Run: `cd unergy-operaciones-frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built`

- [ ] **Step 5: Commit**

```bash
cd unergy-operaciones-frontend
git add src/views/MEM/CumplimientoV2View.vue
git commit -m "feat(cumplimiento): tabla Matriz anual (contrato/proyecto x 12 meses + indicadores)"
```

---

## Task 6: Frontend — export a Excel con fórmulas + outline + estilo

**Files:**
- Create: `unergy-operaciones-frontend/src/views/MEM/cumplimientoMatrizExcel.js`
- Create: `unergy-operaciones-frontend/scripts/test_matriz_excel.mjs`
- Modify: `unergy-operaciones-frontend/src/views/MEM/CumplimientoV2View.vue` (reemplazar stub `exportarMatrizExcel`)

**Interfaces:**
- Produces: `construirMatrizAOA(data, year) -> { aoa, rowLevels, formulaCells, totalRow }` (función PURA, sin SheetJS, testeable en Node) y `exportarMatrizExcel()` que la usa con `xlsx-js-style`.
- Consumes: `anualMatrizData` (Task 3).

- [ ] **Step 1: Test del builder puro (falla primero)** — crear `scripts/test_matriz_excel.mjs`:

```javascript
import { construirMatrizAOA } from '../src/views/MEM/cumplimientoMatrizExcel.js'

const data = { year: 2026, contratos: [{
  id: 1, nombre_interno: 'C1', comprador_nombre: 'Comp', n_plantas: 2,
  estado_cumplimiento: 'no_cumple', requiere_bolsa: true, total_anual_mwh: 24, total_min_anual_mwh: 12, bolsa_anual_mwh: 3,
  meses: Array.from({length:12},(_,i)=>({ month:i+1, valor_mwh:2, min_mwh:1, estado:'ok' })),
  proyectos: [
    { id:10, nombre:'A', pct_despacho_rep:0.5, meses:Array.from({length:12},(_,i)=>({month:i+1,valor_mwh:1})) },
    { id:11, nombre:'B', pct_despacho_rep:0.5, meses:Array.from({length:12},(_,i)=>({month:i+1,valor_mwh:1})) },
  ],
}]}

let pass=0, fail=0
const ok=(n,c)=>{ if(c){pass++;console.log('  ✓ '+n)} else {fail++;console.log('  ✗ '+n)} }

const { aoa, rowLevels, formulaCells } = construirMatrizAOA(data, 2026)
// La fila de contrato debe tener fórmulas =SUM de las 2 filas de proyecto en cada mes
const contratoFormula = formulaCells.find(f => f.kind === 'contrato_mes')
ok('fórmula de mes de contrato es SUM', /^SUM\(/.test(contratoFormula.f))
// Outline: filas de proyecto en nivel 1
ok('proyectos en outline level 1', rowLevels.some(l => l === 1))
// Total general usa SUM de filas de contrato
ok('total general SUM', formulaCells.some(f => f.kind === 'total_mes' && /^SUM\(/.test(f.f)))
// Total anual de contrato = SUM(Ene:Dic) de su propia fila
ok('total anual contrato SUM', formulaCells.some(f => f.kind === 'contrato_total'))

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0)
```

- [ ] **Step 2: Ejecutar — falla** (módulo no existe).
Run: `cd unergy-operaciones-frontend && node scripts/test_matriz_excel.mjs`
Expected: error de import.

- [ ] **Step 3: Implementar `cumplimientoMatrizExcel.js`**

```javascript
// Builder PURO de la matriz para Excel. construirMatrizAOA no depende de SheetJS (testeable en Node).
// Layout de columnas: 0=Contrato/Proyecto, 1..12=meses, 13=Total, 14=Mín anual, 15=Estado, 16=Bolsa.
const MES_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const COL = { primera: 0, mes1: 1, total: 13, min: 14, estado: 15, bolsa: 16 }

function colLetter(idx) { // 0->A, 1->B...
  let s = ''; idx += 1
  while (idx > 0) { const r = (idx - 1) % 26; s = String.fromCharCode(65 + r) + s; idx = Math.floor((idx - 1) / 26) }
  return s
}

export function construirMatrizAOA(data, year) {
  const aoa = []
  const rowLevels = []     // outline level por fila de datos (0 contrato, 1 proyecto)
  const formulaCells = []  // {r, c, f, kind}
  // Encabezados (filas 0-1 título, fila 2 header)
  aoa.push([`Matriz anual de cumplimiento — ${year}`]); rowLevels.push(0)
  aoa.push([]); rowLevels.push(0)
  const header = ['Contrato / Proyecto', ...MES_ABBR, 'Total', 'Mín anual', 'Estado', 'Bolsa (MWh)']
  aoa.push(header); rowLevels.push(0)

  for (const c of data.contratos) {
    const contratoRow = aoa.length        // índice (0-based) de la fila del contrato (Excel = +1)
    const row = new Array(17).fill('')
    row[COL.primera] = `${c.nombre_interno || c.numero_codigo_contrato} (${c.n_plantas} pl.)`
    row[COL.min] = c.total_min_anual_mwh
    row[COL.estado] = c.estado_cumplimiento === 'cumple' ? '✓ Cumple' : '✗ No cumple'
    row[COL.bolsa] = c.bolsa_anual_mwh
    aoa.push(row); rowLevels.push(0)

    // filas de proyecto (nivel 1) — primero las añadimos para conocer el rango
    const projStart = aoa.length
    for (const p of c.proyectos) {
      const pr = new Array(17).fill('')
      pr[COL.primera] = `    ${p.nombre} (${Math.round((p.pct_despacho_rep || 0) * 100)}% part.)`
      for (let m = 0; m < 12; m++) pr[COL.mes1 + m] = p.meses[m]?.valor_mwh ?? 0
      aoa.push(pr); rowLevels.push(1)
    }
    const projEnd = aoa.length - 1

    // fórmulas de la fila de contrato: cada mes = SUM(proyectos en esa col)
    for (let m = 0; m < 12; m++) {
      const c0 = colLetter(COL.mes1 + m)
      if (c.proyectos.length) {
        formulaCells.push({ r: contratoRow, c: COL.mes1 + m, kind: 'contrato_mes',
          f: `SUM(${c0}${projStart + 1}:${c0}${projEnd + 1})` })
      } else {
        aoa[contratoRow][COL.mes1 + m] = c.meses[m]?.valor_mwh ?? 0
      }
    }
    // total anual del contrato = SUM(Ene:Dic) de su propia fila
    formulaCells.push({ r: contratoRow, c: COL.total, kind: 'contrato_total',
      f: `SUM(${colLetter(COL.mes1)}${contratoRow + 1}:${colLetter(COL.mes1 + 11)}${contratoRow + 1})` })
  }

  // Fila total general
  const totalRow = aoa.length
  const trow = new Array(17).fill('')
  trow[COL.primera] = `TOTAL (${data.contratos.length})`
  aoa.push(trow); rowLevels.push(0)
  // recolectar filas de contrato (nivel 0 con datos, excluyendo header/título y total)
  const contratoRows = []
  data.contratos.forEach((c, idx) => {}) // (las refs ya se generaron arriba; recalculamos por barrido)
  for (let r = 3; r < totalRow; r++) if (rowLevels[r] === 0) contratoRows.push(r)
  for (let m = 0; m < 12; m++) {
    const cl = colLetter(COL.mes1 + m)
    const refs = contratoRows.map(r => `${cl}${r + 1}`).join('+')
    formulaCells.push({ r: totalRow, c: COL.mes1 + m, kind: 'total_mes', f: refs ? `SUM(${refs.replace(/\+/g, ',')})` : '0' })
  }
  return { aoa, rowLevels, formulaCells, totalRow, headerRow: 2 }
}
```

- [ ] **Step 4: Ejecutar test — pasa**
Run: `cd unergy-operaciones-frontend && node scripts/test_matriz_excel.mjs`
Expected: `4 passed, 0 failed`

- [ ] **Step 5: `exportarMatrizExcel()` en la vista (usa xlsx-js-style)**

Reemplaza el stub por:

```javascript
async function exportarMatrizExcel() {
  if (!anualMatrizData.value) return
  const XLSX = await import('xlsx-js-style')
  const { construirMatrizAOA } = await import('./cumplimientoMatrizExcel.js')
  const { aoa, rowLevels, formulaCells, totalRow, headerRow } = construirMatrizAOA(anualMatrizData.value, anualMatrizYear.value)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // Fórmulas
  for (const fc of formulaCells) {
    const ref = XLSX.utils.encode_cell({ r: fc.r, c: fc.c })
    ws[ref] = { t: 'n', f: fc.f }
  }
  // Outline (filas de proyecto colapsables)
  ws['!rows'] = rowLevels.map(l => (l > 0 ? { level: l } : {}))
  // Estilo cabecera + total
  const bold = { font: { bold: true } }
  for (let c = 0; c < 17; c++) {
    const h = XLSX.utils.encode_cell({ r: headerRow, c })
    if (ws[h]) ws[h].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '915BD8' } } }
    const t = XLSX.utils.encode_cell({ r: totalRow, c })
    if (ws[t]) ws[t].s = bold
  }
  // Título
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 })
  if (ws[titleRef]) ws[titleRef].s = { font: { bold: true, sz: 14 } }
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 16 } }]
  ws['!cols'] = [{ wch: 34 }, ...Array(12).fill({ wch: 8 }), { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }]
  ws['!autofilter'] = { ref: `A${headerRow + 1}:Q${totalRow + 1}` }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz anual')
  XLSX.writeFile(wb, `matriz_anual_cumplimiento_${anualMatrizYear.value}.xlsx`)
}
```

- [ ] **Step 6: Build**
Run: `cd unergy-operaciones-frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built`

- [ ] **Step 7: Commit**

```bash
cd unergy-operaciones-frontend
git add src/views/MEM/cumplimientoMatrizExcel.js scripts/test_matriz_excel.mjs src/views/MEM/CumplimientoV2View.vue
git commit -m "feat(cumplimiento): export Excel de Matriz anual (fórmulas + outline + estilo)"
```

---

## Task 7: Verificación integral + despliegue

**Files:** ninguno nuevo (verificación + PRs).

- [ ] **Step 1: Verificar dependencia `xlsx-js-style`**

Run: `cd unergy-operaciones-frontend && node -e "require('xlsx-js-style'); console.log('ok')"`
Expected: `ok` (ya se usa en GesconView). Si falla: `npm i xlsx-js-style` y commitear el lock.

- [ ] **Step 2: Verificación manual (con backend+frontend corriendo)**
  - Abrir MEM/Cumplimiento → pestaña "Matriz anual" → seleccionar año.
  - Comparar los valores de un contrato contra la pestaña "Cumplimiento" (deben coincidir).
  - Expandir un contrato: las sumas de proyectos por mes == valor del contrato (invariante).
  - "Solo no cumple" filtra; búsqueda filtra.
  - Exportar Excel: abrir, verificar que (a) las celdas de mes del contrato muestran la SUMA y son fórmulas, (b) las filas de proyecto colapsan con el outline de Excel, (c) el total general suma.

- [ ] **Step 3: Backend — branch + PR**

```bash
cd "Backend Operaciones"
git fetch origin master
git checkout -b feat/cumplimiento-anual-matriz origin/master
git cherry-pick <commits de Task 1-3>
git push -u origin feat/cumplimiento-anual-matriz
gh pr create --base master --title "feat(cumplimiento): endpoint matriz anual" --body "..."
```

- [ ] **Step 4: Frontend — branch + PR** (incluye spec, plan y código)

```bash
cd unergy-operaciones-frontend
# la rama feat/cumplimiento-matriz-anual ya tiene el spec+plan; cherry-pick/rebase los commits de Task 4-6
git push -u origin feat/cumplimiento-matriz-anual
gh pr create --base master --title "feat(cumplimiento): pestaña Matriz anual + export Excel" --body "..."
```

- [ ] **Step 5: Merge backend primero, luego frontend** (pedir OK explícito de deploy a Juan), y resync local no destructivo.

---

## Self-Review

**Spec coverage:**
- Pestaña nueva en MEM/Cumplimiento → Task 4. ✓
- Jerarquía contrato→proyecto expandible → Task 5. ✓
- 12 meses cerrado/actual/futuro → Task 1 (reúsa get_anual) + Task 3. ✓
- Indicador cumplimiento (cumple/no cumple por mes) → Task 2 (rollup) + Task 5. ✓
- Indicador energético (real/bolsa) → Task 2 (`requiere_bolsa`) + Task 5. ✓
- Info por proyecto (generación, participación, nº plantas) → Task 1 (proyectos) + Task 5. ✓
- Export Excel con fórmulas/outline/totales/estilo → Task 6. ✓
- Reuso de componentes/lógica → Tasks 1,4,5,6 (get_anual, helpers estado, patrón GESCON). ✓

**Placeholder scan:** El `comp_map` placeholder del Step 3 de Task 1 se resuelve explícitamente (pasar `comp_map` como parámetro) en Step 3a/3b. Sin TBD/TODO de implementación. ✓

**Type consistency:** `_anual_meses_para_contrato(contrato, year, gescon_per_month, comp_map, month_cache, avg_cache, today)` usado idéntico en Task 1 (def) y Task 3 (call). `_rollup_cumplimiento(meses)` y `_build_fetch_sets(gpm_por_contrato, year, today)` consistentes def/call. `construirMatrizAOA(data, year)` consistente. Campos `valor_mwh`, `estado`, `requiere_bolsa`, `meses_en_deficit` consistentes entre backend y frontend. ✓
