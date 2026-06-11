# Garantías Ajustes XM — Persistencia en Backend

**Fecha:** 2026-06-11  
**Estado:** Aprobado  
**Repos afectados:** backend + frontend

---

## Contexto

El historial de Garantías Ajustes XM (registros semanal/TXR/mensual) actualmente se persiste en `localStorage` del navegador. Se migra a PostgreSQL vía un nuevo endpoint en el backend FastAPI, de modo que todo el equipo comparte el mismo historial. Se agrega edición completa de cada registro desde un Dialog en el frontend.

---

## Backend

### Modelo — `app/models/garantias_ajustes.py`

Nuevo modelo `GarantiaAjuste`, sin FK a usuario (visible para todo el equipo).

```python
class TipoAjuste(str, enum.Enum):
    semanal = "semanal"
    txr     = "txr"
    mensual = "mensual"

class GarantiaAjuste(Base, TimestampMixin):
    __tablename__ = "garantias_ajustes"

    id                  : Mapped[int]   = mapped_column(BigInteger, primary_key=True)
    tipo                : Mapped[TipoAjuste]
    fecha               : Mapped[date]

    # Precios (solo semanales)
    pb                  : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    restricciones       : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    stn                 : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    trm                 : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    ptb                 : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))

    # Totales UNGC/UNGG (semanales)
    total_ungc          : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    total_ungg          : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    total_consignar     : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))

    # Custodia (semanales)
    disponible_custodia : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    congelado           : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
    saldo               : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))

    # TXR / Mensual
    total_ajuste_txr    : Mapped[Optional[float]]  = mapped_column(Numeric(18, 2))
```

### Schemas — `app/schemas/garantias_ajustes.py`

- `GarantiaAjusteCreate` — todos los campos requeridos excepto nullable opcionales
- `GarantiaAjusteUpdate` — todos los campos opcionales (PATCH parcial)
- `GarantiaAjusteOut` — incluye `id`, `created_at`, `updated_at`; campos Numeric casteados a `float | None`

### Router — `app/api/v1/garantias_ajustes.py`

Prefijo `/garantias-ajustes`. Todos los endpoints requieren `Depends(get_current_user)` (sin restricción de admin).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Lista todos, ordenados por `fecha DESC` |
| `POST` | `/` | Crea un nuevo registro |
| `PATCH` | `/{id}` | Actualiza campos (parcial) |
| `DELETE` | `/{id}` | Elimina un registro |

### Migración Alembic — `alembic/versions/NNN_garantias_ajustes.py`

- `op.create_table("garantias_ajustes", ...)` con todos los campos
- Enum PostgreSQL `tipo_ajuste` con valores `semanal`, `txr`, `mensual`
- Índice en `fecha`
- Se agrega en `_PENDING_DDLS` de `app/main.py` para aplicar en el próximo deploy

### Registro en router principal

Agregar en `app/api/v1/__init__.py` (o donde se registran los routers):
```python
from .garantias_ajustes import router as garantias_ajustes_router
api_router.include_router(garantias_ajustes_router, prefix="/garantias-ajustes", tags=["garantias-ajustes"])
```

---

## Frontend

### `useGarantiasHistorial.js` — reescritura completa

Reemplaza toda la lógica de `localStorage` por llamadas a la API.

```js
import { ref } from 'vue'
import api from '@/api/client.js'

export function useGarantiasHistorial() {
  const historial = ref([])
  const loading = ref(false)

  async function cargar() {
    loading.value = true
    const { data } = await api.get('/garantias-ajustes')
    historial.value = data.map(toFrontend)
    loading.value = false
  }

  async function guardar(registro) {
    const { data } = await api.post('/garantias-ajustes', toBackend(registro))
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

  // PB anterior y menciones permanecen en localStorage (preferencias personales)
  function getPbAnterior() { ... }
  function setPbAnterior(v) { ... }
  function getMenciones() { ... }
  function setMenciones(v) { ... }

  return { historial, loading, cargar, guardar, actualizar, eliminar,
           getPbAnterior, setPbAnterior, getMenciones, setMenciones }
}
```

**Mapeo de nombres** (snake_case backend ↔ camelCase frontend):

| Backend | Frontend |
|---------|----------|
| `total_ungc` | `totalUNGC` |
| `total_ungg` | `totalUNGG` |
| `total_consignar` | `totalConsignar` |
| `disponible_custodia` | `disponibleCustodia` |
| `total_ajuste_txr` | `totalAjusteTXR` |
| `created_at` | `createdAt` |

### `HistoricoTab.vue` — cambios

1. Llama `store.cargar()` en `onMounted`
2. Agrega botón ✏️ por fila (junto al de eliminar)
3. Elimina botones "Exportar JSON" e "Importar JSON"
4. Mantiene "Exportar a Excel" (usa los datos en memoria)

### `EditAjusteDialog.vue` — nuevo componente

Dialog de PrimeVue con todos los campos del registro en inputs editables:
- `tipo` — Dropdown (semanal / txr / mensual), read-only (no tiene sentido cambiar el tipo)
- `fecha` — DatePicker
- Precios: `pb`, `restricciones`, `stn`, `trm`, `ptb` — InputNumber
- Totales: `totalUNGC`, `totalUNGG`, `totalConsignar` — InputNumber
- Custodia: `disponibleCustodia`, `congelado`, `saldo` — InputNumber
- `totalAjusteTXR` — InputNumber
- Botones: Cancelar / Guardar (llama `store.actualizar(id, campos)`)

---

## Manejo de errores

- `cargar()` muestra toast de error si falla (red o 401)
- `guardar()`, `actualizar()`, `eliminar()` muestran toast de error en caso de fallo; el ref local no se modifica si el API call falla
- El interceptor Axios existente maneja 401 (redirect a login) y 403

---

## localStorage — claves que se conservan

| Clave | Contenido | Razón |
|-------|-----------|-------|
| `garantias_pb_anterior` | PB semana anterior | Preferencia personal del usuario |
| `garantias_menciones` | Menciones del mensaje | Preferencia personal del usuario |
| `garantias_historial` | **SE ELIMINA** | Migrado a BD |

---

## Consideraciones

- El campo `tipo` no es editable desde el Dialog (cambiar el tipo alteraría la semántica del registro)
- No hay paginación en el GET inicial — el historial crece lento (una entrada por semana aproximadamente)
- Los datos de custodia y precios se muestran como `—` si son `null`, tanto en tabla como en chart
