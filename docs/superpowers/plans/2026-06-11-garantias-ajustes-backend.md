# Garantías Ajustes XM — Backend Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el historial de Garantías Ajustes XM de localStorage a PostgreSQL y agregar edición completa de registros desde un Dialog.

**Architecture:** Nuevo modelo `GarantiaAjuste` en el backend FastAPI con router CRUD completo; el composable `useGarantiasHistorial` se reescribe para llamar la API en lugar de localStorage; se agrega `EditAjusteDialog.vue` con todos los campos editables.

**Tech Stack:** Python 3 + FastAPI + SQLAlchemy 2 (Mapped) + PostgreSQL | Vue 3 + PrimeVue 4 + Axios

---

## Estructura de archivos

**Backend** (`unergy-operaciones-backend-master`):
- Create: `app/models/garantias_ajustes.py` — modelo `GarantiaAjuste` + enum `TipoAjusteEnum`
- Create: `app/schemas/garantias_ajustes.py` — schemas Create / Update / Out
- Create: `app/api/v1/garantias_ajustes.py` — router con GET / POST / PATCH / DELETE
- Modify: `app/api/v1/router.py` — registrar el router nuevo
- Modify: `app/main.py` — agregar DDL a `_PENDING_DDLS`

**Frontend** (`unergy-operaciones-frontend-master`):
- Modify: `src/views/Garantias/AjustesXM/composables/useGarantiasHistorial.js` — reemplazar localStorage por API
- Create: `src/views/Garantias/AjustesXM/EditAjusteDialog.vue` — Dialog de edición
- Modify: `src/views/Garantias/AjustesXM/tabs/HistoricoTab.vue` — botón editar, quitar JSON import/export, estado loading

---

## Task 1: Backend — Modelo + Schemas

**Repos:** `unergy-operaciones-backend-master`

**Files:**
- Create: `app/models/garantias_ajustes.py`
- Create: `app/schemas/garantias_ajustes.py`

- [ ] **Step 1: Crear el modelo**

Crear `app/models/garantias_ajustes.py`:

```python
"""GarantiaAjuste — registro de ajustes XM semanales/TXR/mensuales."""
import enum
from datetime import date
from typing import Optional

from sqlalchemy import BigInteger, Date, Enum as SAEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class TipoAjusteEnum(str, enum.Enum):
    semanal = "semanal"
    txr     = "txr"
    mensual = "mensual"


class GarantiaAjuste(Base, TimestampMixin):
    __tablename__ = "garantias_ajustes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tipo: Mapped[TipoAjusteEnum] = mapped_column(
        SAEnum(TipoAjusteEnum, name="tipo_ajuste_xm_enum"), nullable=False
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    pb:            Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    restricciones: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    stn:           Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    trm:           Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    ptb:           Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)

    total_ungc:          Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    total_ungg:          Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    total_consignar:     Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)

    disponible_custodia: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    congelado:           Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    saldo:               Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)

    total_ajuste_txr:    Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
```

- [ ] **Step 2: Crear los schemas**

Crear `app/schemas/garantias_ajustes.py`:

```python
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


TIPOS_AJUSTE = ("semanal", "txr", "mensual")


class GarantiaAjusteCreate(BaseModel):
    tipo:  Literal["semanal", "txr", "mensual"]
    fecha: date

    pb:            Optional[float] = None
    restricciones: Optional[float] = None
    stn:           Optional[float] = None
    trm:           Optional[float] = None
    ptb:           Optional[float] = None

    total_ungc:          Optional[float] = None
    total_ungg:          Optional[float] = None
    total_consignar:     Optional[float] = None

    disponible_custodia: Optional[float] = None
    congelado:           Optional[float] = None
    saldo:               Optional[float] = None

    total_ajuste_txr:    Optional[float] = None


class GarantiaAjusteUpdate(BaseModel):
    fecha: Optional[date] = None

    pb:            Optional[float] = None
    restricciones: Optional[float] = None
    stn:           Optional[float] = None
    trm:           Optional[float] = None
    ptb:           Optional[float] = None

    total_ungc:          Optional[float] = None
    total_ungg:          Optional[float] = None
    total_consignar:     Optional[float] = None

    disponible_custodia: Optional[float] = None
    congelado:           Optional[float] = None
    saldo:               Optional[float] = None

    total_ajuste_txr:    Optional[float] = None


class GarantiaAjusteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:    int
    tipo:  str
    fecha: date

    pb:            Optional[float] = None
    restricciones: Optional[float] = None
    stn:           Optional[float] = None
    trm:           Optional[float] = None
    ptb:           Optional[float] = None

    total_ungc:          Optional[float] = None
    total_ungg:          Optional[float] = None
    total_consignar:     Optional[float] = None

    disponible_custodia: Optional[float] = None
    congelado:           Optional[float] = None
    saldo:               Optional[float] = None

    total_ajuste_txr:    Optional[float] = None

    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 3: Commit**

```
git add app/models/garantias_ajustes.py app/schemas/garantias_ajustes.py
git commit -m "feat(garantias-ajustes): add GarantiaAjuste model and schemas"
```

---

## Task 2: Backend — Router CRUD

**Repos:** `unergy-operaciones-backend-master`

**Files:**
- Create: `app/api/v1/garantias_ajustes.py`

- [ ] **Step 1: Crear el router**

Crear `app/api/v1/garantias_ajustes.py`:

```python
"""Garantías Ajustes XM — historial de ajustes semanal/TXR/mensual."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.models.garantias_ajustes import GarantiaAjuste
from app.schemas.garantias_ajustes import (
    GarantiaAjusteCreate,
    GarantiaAjusteUpdate,
    GarantiaAjusteOut,
)

router = APIRouter(prefix="/garantias-ajustes", tags=["Garantías Ajustes"])


def _to_out(r: GarantiaAjuste) -> dict:
    return {
        "id":    r.id,
        "tipo":  r.tipo.value if r.tipo else None,
        "fecha": r.fecha.isoformat() if r.fecha else None,
        "pb":            float(r.pb)            if r.pb            is not None else None,
        "restricciones": float(r.restricciones) if r.restricciones is not None else None,
        "stn":           float(r.stn)           if r.stn           is not None else None,
        "trm":           float(r.trm)           if r.trm           is not None else None,
        "ptb":           float(r.ptb)           if r.ptb           is not None else None,
        "total_ungc":          float(r.total_ungc)          if r.total_ungc          is not None else None,
        "total_ungg":          float(r.total_ungg)          if r.total_ungg          is not None else None,
        "total_consignar":     float(r.total_consignar)     if r.total_consignar     is not None else None,
        "disponible_custodia": float(r.disponible_custodia) if r.disponible_custodia is not None else None,
        "congelado":           float(r.congelado)           if r.congelado           is not None else None,
        "saldo":               float(r.saldo)               if r.saldo               is not None else None,
        "total_ajuste_txr":    float(r.total_ajuste_txr)    if r.total_ajuste_txr    is not None else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("")
def list_ajustes(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = (
        db.query(GarantiaAjuste)
        .order_by(GarantiaAjuste.fecha.desc(), GarantiaAjuste.id.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("", status_code=201)
def create_ajuste(
    data: GarantiaAjusteCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    row = GarantiaAjuste(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/{ajuste_id}")
def update_ajuste(
    ajuste_id: int,
    data: GarantiaAjusteUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    row = db.query(GarantiaAjuste).filter(GarantiaAjuste.id == ajuste_id).first()
    if not row:
        raise HTTPException(404, "Registro no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{ajuste_id}", status_code=204)
def delete_ajuste(
    ajuste_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    row = db.query(GarantiaAjuste).filter(GarantiaAjuste.id == ajuste_id).first()
    if not row:
        raise HTTPException(404, "Registro no encontrado")
    db.delete(row)
    db.commit()
```

- [ ] **Step 2: Commit**

```
git add app/api/v1/garantias_ajustes.py
git commit -m "feat(garantias-ajustes): add CRUD router"
```

---

## Task 3: Backend — Registro del router + DDL + deploy

**Repos:** `unergy-operaciones-backend-master`

**Files:**
- Modify: `app/api/v1/router.py`
- Modify: `app/main.py`

- [ ] **Step 1: Registrar el router**

En `app/api/v1/router.py`, agregar la importación y el `include_router` al final de la lista existente:

Añadir al bloque de imports (después de `from app.api.v1 import ... garantias`):
```python
from app.api.v1 import garantias_ajustes
```

Añadir después de `api_router.include_router(garantias.router)`:
```python
api_router.include_router(garantias_ajustes.router)
```

- [ ] **Step 2: Agregar DDL a _PENDING_DDLS**

En `app/main.py`, agregar al final de la lista `_PENDING_DDLS` (antes del corchete de cierre `]`):

```python
    # migration 012 — garantias_ajustes XM historial
    "CREATE TYPE tipo_ajuste_xm_enum AS ENUM ('semanal', 'txr', 'mensual')",
    """CREATE TABLE IF NOT EXISTS garantias_ajustes (
        id BIGSERIAL PRIMARY KEY,
        tipo tipo_ajuste_xm_enum NOT NULL,
        fecha DATE NOT NULL,
        pb NUMERIC(18,2),
        restricciones NUMERIC(18,2),
        stn NUMERIC(18,2),
        trm NUMERIC(18,2),
        ptb NUMERIC(18,2),
        total_ungc NUMERIC(18,2),
        total_ungg NUMERIC(18,2),
        total_consignar NUMERIC(18,2),
        disponible_custodia NUMERIC(18,2),
        congelado NUMERIC(18,2),
        saldo NUMERIC(18,2),
        total_ajuste_txr NUMERIC(18,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    "CREATE INDEX IF NOT EXISTS ix_garantias_ajustes_fecha ON garantias_ajustes (fecha)",
```

- [ ] **Step 3: Commit y push → dispara deploy en Railway**

```
git add app/api/v1/router.py app/main.py
git commit -m "feat(garantias-ajustes): register router and add DDL migration"
git push origin master
```

Esperar que Railway complete el deploy antes de continuar con los tasks de frontend. Verificar en los logs de Railway que el DDL se ejecutó sin error (`CREATE TABLE`, `CREATE INDEX`).

---

## Task 4: Frontend — Reescribir useGarantiasHistorial

**Repos:** `unergy-operaciones-frontend-master`

**Files:**
- Modify: `src/views/Garantias/AjustesXM/composables/useGarantiasHistorial.js`

- [ ] **Step 1: Reemplazar el composable completo**

Reemplazar todo el contenido de `src/views/Garantias/AjustesXM/composables/useGarantiasHistorial.js`:

```js
import { ref } from 'vue'
import api from '@/api/client.js'

const PB_KEY = 'garantias_pb_anterior'
const MENCIONES_KEY = 'garantias_menciones'

function toFrontend(r) {
  return {
    id:               r.id,
    tipo:             r.tipo,
    fecha:            r.fecha,
    pb:               r.pb,
    restricciones:    r.restricciones,
    stn:              r.stn,
    trm:              r.trm,
    ptb:              r.ptb,
    totalUNGC:        r.total_ungc,
    totalUNGG:        r.total_ungg,
    totalConsignar:   r.total_consignar,
    disponibleCustodia: r.disponible_custodia,
    congelado:        r.congelado,
    saldo:            r.saldo,
    totalAjusteTXR:   r.total_ajuste_txr,
    createdAt:        r.created_at,
    updatedAt:        r.updated_at,
  }
}

function toBackend(r) {
  const d = {}
  if ('fecha' in r)              d.fecha = r.fecha
  if ('pb' in r)                 d.pb = r.pb
  if ('restricciones' in r)      d.restricciones = r.restricciones
  if ('stn' in r)                d.stn = r.stn
  if ('trm' in r)                d.trm = r.trm
  if ('ptb' in r)                d.ptb = r.ptb
  if ('totalUNGC' in r)          d.total_ungc = r.totalUNGC
  if ('totalUNGG' in r)          d.total_ungg = r.totalUNGG
  if ('totalConsignar' in r)     d.total_consignar = r.totalConsignar
  if ('disponibleCustodia' in r) d.disponible_custodia = r.disponibleCustodia
  if ('congelado' in r)          d.congelado = r.congelado
  if ('saldo' in r)              d.saldo = r.saldo
  if ('totalAjusteTXR' in r)     d.total_ajuste_txr = r.totalAjusteTXR
  return d
}

export function useGarantiasHistorial() {
  const historial = ref([])
  const loading   = ref(false)

  async function cargar() {
    loading.value = true
    try {
      const { data } = await api.get('/garantias-ajustes')
      historial.value = data.map(toFrontend)
    } finally {
      loading.value = false
    }
  }

  async function guardar(registro) {
    const payload = { tipo: registro.tipo, fecha: registro.fecha, ...toBackend(registro) }
    const { data } = await api.post('/garantias-ajustes', payload)
    historial.value.unshift(toFrontend(data))
  }

  async function actualizar(id, campos) {
    const { data } = await api.patch(`/garantias-ajustes/${id}`, toBackend(campos))
    const idx = historial.value.findIndex(r => r.id === id)
    if (idx !== -1) historial.value[idx] = toFrontend(data)
  }

  async function eliminar(id) {
    await api.delete(`/garantias-ajustes/${id}`)
    historial.value = historial.value.filter(r => r.id !== id)
  }

  function getPbAnterior() {
    const v = localStorage.getItem(PB_KEY)
    return v != null ? parseFloat(v) : null
  }

  function setPbAnterior(v) {
    if (v != null) localStorage.setItem(PB_KEY, String(v))
  }

  function getMenciones() {
    return localStorage.getItem(MENCIONES_KEY) || ''
  }

  function setMenciones(v) {
    localStorage.setItem(MENCIONES_KEY, v || '')
  }

  return {
    historial,
    loading,
    cargar,
    guardar,
    actualizar,
    eliminar,
    getPbAnterior,
    setPbAnterior,
    getMenciones,
    setMenciones,
  }
}
```

- [ ] **Step 2: Verificar**

Confirmar que `SemanalesTab.vue`, `TxrTab.vue` y `MensualesTab.vue` siguen funcionando: usan `store.guardar(...)` que ahora devuelve una Promise. En cada tab, cambiar la llamada a `guardarRegistro` para que sea `async` y espere el resultado:

En `SemanalesTab.vue`, `TxrTab.vue` y `MensualesTab.vue`, la función `guardarRegistro` debe tener `await` antes de `store.guardar(...)`:

```js
// Antes
function guardarRegistro() {
  store.guardar({ ... })
  toast.add(...)
}

// Después (en los 3 tabs)
async function guardarRegistro() {
  try {
    await store.guardar({ ... })
    toast.add({ severity: 'success', summary: 'Guardado en historial', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 })
  }
}
```

Aplicar este mismo cambio en los 3 archivos:
- `src/views/Garantias/AjustesXM/tabs/SemanalesTab.vue`
- `src/views/Garantias/AjustesXM/tabs/TxrTab.vue`
- `src/views/Garantias/AjustesXM/tabs/MensualesTab.vue`

- [ ] **Step 3: Commit**

```
git add src/views/Garantias/AjustesXM/composables/useGarantiasHistorial.js
git add src/views/Garantias/AjustesXM/tabs/SemanalesTab.vue
git add src/views/Garantias/AjustesXM/tabs/TxrTab.vue
git add src/views/Garantias/AjustesXM/tabs/MensualesTab.vue
git commit -m "feat(garantias-historial): replace localStorage with backend API"
```

---

## Task 5: Frontend — EditAjusteDialog

**Repos:** `unergy-operaciones-frontend-master`

**Files:**
- Create: `src/views/Garantias/AjustesXM/EditAjusteDialog.vue`

- [ ] **Step 1: Crear el componente**

Crear `src/views/Garantias/AjustesXM/EditAjusteDialog.vue`:

```vue
<template>
  <Dialog
    :visible="visible"
    modal
    header="Editar registro"
    style="width: 560px"
    @update:visible="$emit('close')"
  >
    <div class="space-y-5 py-2">

      <!-- Tipo + Fecha -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Tipo</label>
          <div class="px-3 py-2 rounded-lg text-sm bg-gray-50" style="border:1px solid #e8e0f0;color:#6b5a8a">
            {{ local.tipo }}
          </div>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Fecha</label>
          <input type="date" v-model="local.fecha"
            class="w-full px-3 py-2 rounded-lg text-sm"
            style="border:1px solid #e8e0f0;outline:none" />
        </div>
      </div>

      <!-- Precios -->
      <div>
        <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:#6b5a8a">Precios</p>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div v-for="field in precioFields" :key="field.key" class="space-y-0.5">
            <label class="text-xs" style="color:#9ca3af">{{ field.label }}</label>
            <InputNumber v-model="local[field.key]" fluid :max-fraction-digits="4"
              placeholder="—" :pt="{ root: { class: 'w-full' } }" />
          </div>
        </div>
      </div>

      <!-- Totales UNGC / UNGG -->
      <div>
        <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:#6b5a8a">Totales UNGC / UNGG</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div v-for="field in totalesFields" :key="field.key" class="space-y-0.5">
            <label class="text-xs" style="color:#9ca3af">{{ field.label }}</label>
            <InputNumber v-model="local[field.key]" fluid :max-fraction-digits="0"
              placeholder="—" :pt="{ root: { class: 'w-full' } }" />
          </div>
        </div>
      </div>

      <!-- Custodia -->
      <div>
        <p class="text-xs font-bold uppercase tracking-wider mb-2" style="color:#6b5a8a">Custodia</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div v-for="field in custodiaFields" :key="field.key" class="space-y-0.5">
            <label class="text-xs" style="color:#9ca3af">{{ field.label }}</label>
            <InputNumber v-model="local[field.key]" fluid :max-fraction-digits="0"
              placeholder="—" :pt="{ root: { class: 'w-full' } }" />
          </div>
        </div>
      </div>

      <!-- TXR / Mensual -->
      <div class="space-y-0.5">
        <label class="text-xs font-semibold uppercase tracking-wide" style="color:#6b5a8a">Ajuste TXR / Mensual</label>
        <InputNumber v-model="local.totalAjusteTXR" fluid :max-fraction-digits="0"
          placeholder="—" :pt="{ root: { class: 'w-full' } }" />
      </div>

    </div>

    <template #footer>
      <Button label="Cancelar" text severity="secondary" @click="$emit('close')" />
      <Button label="Guardar" icon="pi pi-check" :loading="saving" @click="guardar"
        style="background:#915BD8;border-color:#915BD8" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { useToast } from 'primevue/usetoast'
import { useGarantiasHistorial } from './composables/useGarantiasHistorial.js'

const props = defineProps({
  visible: Boolean,
  registro: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const toast = useToast()
const store = useGarantiasHistorial()

const saving = ref(false)
const local  = ref({})

watch(
  () => props.registro,
  (r) => { if (r) local.value = { ...r } },
  { immediate: true },
)

const precioFields = [
  { key: 'pb',            label: 'PB ($)' },
  { key: 'restricciones', label: 'Restricciones ($)' },
  { key: 'stn',           label: 'STN ($)' },
  { key: 'trm',           label: 'TRM' },
  { key: 'ptb',           label: 'PTB ($)' },
]

const totalesFields = [
  { key: 'totalUNGC',      label: 'Total UNGC' },
  { key: 'totalUNGG',      label: 'Total UNGG' },
  { key: 'totalConsignar', label: 'Total consignar' },
]

const custodiaFields = [
  { key: 'disponibleCustodia', label: 'Disponible' },
  { key: 'congelado',          label: 'Congelado' },
  { key: 'saldo',              label: 'Saldo' },
]

async function guardar() {
  if (!props.registro?.id) return
  saving.value = true
  try {
    await store.actualizar(props.registro.id, local.value)
    toast.add({ severity: 'success', summary: 'Registro actualizado', life: 2500 })
    emit('close')
  } catch {
    toast.add({ severity: 'error', summary: 'Error al guardar', life: 3000 })
  } finally {
    saving.value = false
  }
}
</script>
```

- [ ] **Step 2: Commit**

```
git add src/views/Garantias/AjustesXM/EditAjusteDialog.vue
git commit -m "feat(garantias-ajustes): add EditAjusteDialog component"
```

---

## Task 6: Frontend — Actualizar HistoricoTab + deploy

**Repos:** `unergy-operaciones-frontend-master`

**Files:**
- Modify: `src/views/Garantias/AjustesXM/tabs/HistoricoTab.vue`

- [ ] **Step 1: Reemplazar HistoricoTab.vue completo**

Reemplazar todo el contenido de `src/views/Garantias/AjustesXM/tabs/HistoricoTab.vue`:

```vue
<template>
  <div class="space-y-5">

    <!-- Controles -->
    <div class="flex flex-wrap gap-2 justify-end">
      <Button label="Exportar a Excel" icon="pi pi-file-excel" severity="secondary" outlined size="small"
        @click="exportarExcel" />
    </div>

    <!-- Loading -->
    <div v-if="store.loading.value" class="py-12 text-center" style="color:#6b5a8a">
      <i class="pi pi-spin pi-spinner text-2xl block mb-2" style="color:#c4b8d4" />
      Cargando historial...
    </div>

    <!-- Tabla resumen -->
    <div v-else-if="store.historial.value.length" class="bg-white rounded-xl shadow-sm overflow-hidden"
      style="border:1px solid #e8e0f0">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b">
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:#6b5a8a">Fecha</th>
            <th class="px-3 py-2 text-left text-xs font-semibold" style="color:#6b5a8a">Tipo</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">PB</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">UNGC</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">UNGG</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Total</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Disponible</th>
            <th class="px-3 py-2 text-right text-xs font-semibold" style="color:#6b5a8a">Saldo</th>
            <th class="px-3 py-2 text-center text-xs font-semibold" style="color:#6b5a8a">—</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.historial.value" :key="r.id"
            class="border-b last:border-b-0 hover:bg-gray-50/50">
            <td class="px-3 py-2 tabular-nums" style="color:#2C2039">{{ r.fecha }}</td>
            <td class="px-3 py-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :style="tipoBadge(r.tipo)">
                {{ r.tipo }}
              </span>
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs" style="color:#6b5a8a">
              {{ r.pb != null ? fmtCOP(r.pb) : '—' }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.totalUNGC != null ? fmtCOP(r.totalUNGC) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.totalUNGG != null ? fmtCOP(r.totalUNGG) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold" style="color:#2C2039">
              {{ r.totalConsignar != null ? fmtCOP(r.totalConsignar) : (r.totalAjusteTXR != null ? fmtCOP(r.totalAjusteTXR) : '—') }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.disponibleCustodia != null ? fmtCOP(r.disponibleCustodia) : '—' }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-xs">{{ r.saldo != null ? fmtCOP(r.saldo) : '—' }}</td>
            <td class="px-3 py-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <Button icon="pi pi-pencil" text rounded size="small"
                  style="color:#915BD8" @click="abrirEditar(r)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger"
                  @click="confirmarEliminar(r.id)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="py-12 text-center" style="color:#6b5a8a">
      <i class="pi pi-inbox text-3xl mb-2 block" style="color:#c4b8d4" />
      No hay registros en el historial. Confirma un reporte desde Semanales, TXR o Mensuales.
    </div>

    <!-- Gráfica de tendencia -->
    <div v-if="filteredHistorial.length > 1" class="bg-white rounded-xl shadow-sm p-4 space-y-3"
      style="border:1px solid #e8e0f0">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-semibold" style="color:#2C2039">Tendencia histórica</h3>
        <div class="flex gap-1">
          <button v-for="rng in rangos" :key="rng.key"
            @click="rangoActivo = rng.key"
            class="px-3 py-1 text-xs rounded-lg font-medium transition-colors"
            :style="rangoActivo === rng.key
              ? 'background:#915BD8;color:white'
              : 'color:#6b5a8a;border:1px solid #e8e0f0'">
            {{ rng.label }}
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-3">
        <label v-for="serie in seriesConfig" :key="serie.key"
          class="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input type="checkbox" v-model="seriesVisible[serie.key]" class="accent-purple-600" />
          <span :style="{ color: serie.color }">●</span>
          <span style="color:#374151">{{ serie.label }}</span>
        </label>
      </div>
      <div style="height:280px;position:relative">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- Dialog de edición -->
    <EditAjusteDialog
      :visible="showEdit"
      :registro="registroSeleccionado"
      @close="showEdit = false"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { useGarantiasHistorial } from '../composables/useGarantiasHistorial.js'
import { fmtCOP } from '../utils/formatters.js'
import { exportHistorialExcel } from '../utils/excelExport.js'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import EditAjusteDialog from '../EditAjusteDialog.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const toast = useToast()
const store = useGarantiasHistorial()

onMounted(() => {
  store.cargar().catch(() => {
    toast.add({ severity: 'error', summary: 'Error cargando historial', life: 4000 })
  })
})

const showEdit = ref(false)
const registroSeleccionado = ref(null)

function abrirEditar(r) {
  registroSeleccionado.value = r
  showEdit.value = true
}

async function confirmarEliminar(id) {
  try {
    await store.eliminar(id)
    toast.add({ severity: 'success', summary: 'Registro eliminado', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error al eliminar', life: 3000 })
  }
}

function exportarExcel() {
  exportHistorialExcel(store.historial.value)
}

function tipoBadge(tipo) {
  const map = {
    semanal: 'background:#f3f0f7;color:#915BD8',
    txr:     'background:#dbeafe;color:#1d4ed8',
    mensual: 'background:#d1fae5;color:#065f46',
  }
  return map[tipo] || 'background:#f3f4f6;color:#6b7280'
}

const rangoActivo = ref('4w')
const seriesVisible = ref({
  totalConsignar: true,
  pb: true,
  disponible: true,
  ajusteTxr: false,
})

const rangos = [
  { key: '4w',  label: 'Últimas 4 semanas' },
  { key: '3m',  label: 'Últimos 3 meses' },
  { key: 'all', label: 'Todo' },
]

const seriesConfig = [
  { key: 'totalConsignar', label: 'Total consignar', color: '#10B981' },
  { key: 'disponible',     label: 'Disponible custodia', color: '#3B82F6' },
  { key: 'ajusteTxr',      label: 'Ajuste TXR',    color: '#F59E0B' },
  { key: 'pb',             label: 'PB',             color: '#915BD8' },
]

const filteredHistorial = computed(() => {
  const all = [...store.historial.value]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (rangoActivo.value === 'all') return all
  const cutoff = new Date()
  if (rangoActivo.value === '4w') cutoff.setDate(cutoff.getDate() - 28)
  else cutoff.setMonth(cutoff.getMonth() - 3)
  const cutStr = cutoff.toISOString().slice(0, 10)
  return all.filter(r => r.fecha >= cutStr)
})

const chartData = computed(() => {
  const labels = filteredHistorial.value.map(r => r.fecha)
  const datasets = []
  if (seriesVisible.value.totalConsignar) datasets.push({
    label: 'Total consignar',
    data: filteredHistorial.value.map(r => r.totalConsignar ?? r.totalAjusteTXR ?? null),
    borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)',
    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
  })
  if (seriesVisible.value.disponible) datasets.push({
    label: 'Disponible custodia',
    data: filteredHistorial.value.map(r => r.disponibleCustodia ?? null),
    borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)',
    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
  })
  if (seriesVisible.value.ajusteTxr) datasets.push({
    label: 'Ajuste TXR',
    data: filteredHistorial.value.map(r => r.totalAjusteTXR ?? null),
    borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)',
    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
  })
  if (seriesVisible.value.pb) datasets.push({
    label: 'PB ($)',
    data: filteredHistorial.value.map(r => r.pb ?? null),
    borderColor: '#915BD8', backgroundColor: 'rgba(145,91,216,0.08)',
    fill: false, tension: 0.4, pointRadius: 4, yAxisID: 'y2',
  })
  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'top' },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed.y
          if (v == null) return null
          return ` ${ctx.dataset.label}: ${Math.abs(v) >= 1e6
            ? '$' + (v / 1e6).toFixed(1) + 'M'
            : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)}`
        },
      },
    },
  },
  scales: {
    y: {
      position: 'left',
      ticks: {
        callback: (v) => Math.abs(v) >= 1e9 ? '$' + (v/1e9).toFixed(1)+'B'
          : Math.abs(v) >= 1e6 ? '$' + (v/1e6).toFixed(1)+'M'
          : '$' + (v/1e3).toFixed(0)+'k',
      },
    },
    y2: {
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { callback: (v) => '$' + v.toFixed(0) },
    },
  },
}))
</script>
```

- [ ] **Step 2: Commit y push → Vercel despliega**

```
git add src/views/Garantias/AjustesXM/tabs/HistoricoTab.vue
git commit -m "feat(garantias-historico): wire API, add edit dialog, remove JSON import/export"
git push origin master
```

---

## Self-Review checklist

| Requisito del spec | Task |
|---|---|
| Modelo `GarantiaAjuste` con todos los campos Numeric(18,2) nullable | Task 1 |
| Enum `TipoAjusteEnum` (semanal / txr / mensual) | Task 1 |
| Schemas Create / Update (todos opcionales) / Out | Task 1 |
| GET / POST / PATCH / DELETE con `get_current_user` (sin admin) | Task 2 |
| `_to_out()` castea Numeric → float, isoformat en fechas | Task 2 |
| Router registrado en `app/api/v1/router.py` | Task 3 |
| DDL en `_PENDING_DDLS` + índice en `fecha` | Task 3 |
| `toFrontend` mapea snake_case → camelCase (totalUNGC, etc.) | Task 4 |
| `toBackend` mapea camelCase → snake_case (sólo campos presentes) | Task 4 |
| `cargar()` carga desde API en `onMounted` de HistoricoTab | Task 6 |
| `guardar()` async con try/catch en los 3 tabs | Task 4 |
| `actualizar(id, campos)` → PATCH | Task 4 |
| `eliminar(id)` → DELETE con try/catch | Task 6 |
| `getPbAnterior` / `setPbAnterior` / `getMenciones` / `setMenciones` en localStorage | Task 4 |
| `EditAjusteDialog` con todos los campos editables (tipo read-only) | Task 5 |
| Botón ✏️ por fila en HistoricoTab | Task 6 |
| Loading state en HistoricoTab | Task 6 |
| Exportar Excel conservado | Task 6 |
| Botones JSON import/export eliminados | Task 6 |
| Backend push primero, frontend push después | Tasks 3, 6 |
