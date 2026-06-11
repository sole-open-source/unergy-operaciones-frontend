# App móvil "Unergy Solar" — Diseño

**Fecha:** 2026-06-08
**Autor:** Juan José + Claude
**Repo:** `unergy-operaciones-frontend` (+ pequeño cambio en `Backend Operaciones`)

## Objetivo
Una app instalable en el celular (tipo PWA), **aparte de la plataforma de monitoreo**,
para ver en tiempo real la generación solar por proyecto y poder **reconectar** una planta.
No pasa por la UI de la plataforma: tiene su propio login, su propio layout y su propia URL.

## Decisiones (acordadas)
- **Layout:** un proyecto a la vez, se cambia deslizando / con flechas.
- **Gráfica:** una sola, superponiendo **Inversores** (morado `#915BD8`) y **Medidor** (turquesa `#14B8A6`) sobre el mismo eje de tiempo.
- **Sin** total generado, **sin** diff medidor, **sin** % cumplimiento.
- **Reconectar:** botón por planta (lógica original de Laura, recuperada de git `a00d863`/`ef618ae`).
- **Login una vez:** JWT de larga duración (30 días) + PWA instalable.

## Arquitectura (enfoque A)
Rutas nuevas con prefijo `/m` dentro del mismo repo frontend, con layout propio sin
sidebar/topbar. Reusa `api/client.js`, el `auth store` y los endpoints existentes.

### Rutas
- `/m/login` — login móvil (público).
- `/m/solar` — vista en vivo (requiere sesión). `meta.mobile = true`.
- Guard: sin sesión y `to.meta.mobile` → `/m/login` (no el `/login` de la plataforma).

### Autenticación
- Login contra `POST /api/v1/auth/token/mobile` (nuevo, igual que `/token` pero con
  expiración larga vía `MOBILE_JWT_EXPIRE_MINUTES`, default 43200 = 30 días).
- Token guardado en `localStorage.token` (mismo key, así el `api-client` funciona sin cambios).
- 401: el `api-client` redirige a `/m/login` cuando la ruta actual empieza por `/m/`, si no a `/login`.

### Datos en vivo (endpoints existentes)
- `GET /generacion-solar/monitoring` → `{ projects: [{ proyecto_id, nombre, status }] }`.
- `GET /generacion-solar/monitoring/{id}` → detalle con `power_curve` (inversores) y
  `gaia_snapshot_principal/respaldo.time_series.power` (medidor).
- Extractores `mapMinutes` / `TIME_LABELS` / `gaiaTime` / mejor snapshot: portados desde
  `SolarLiveView.vue`. Carga perezosa: solo el detalle de la planta visible (+ vecinas opcional).
- Auto-refresh cada 60s + botón refrescar + "actualizado HH:MM".

### Reconectar (lógica de Laura)
- `GET /reconectadores/estados` → estado `active` (ON/OFF/null) por planta con relay.
- Botón visible solo si la planta tiene relay. Abre **bottom sheet**: acción ON/OFF +
  usuario/contraseña Solenium (usuario precargado de `localStorage.sl_rcn_creds_v1`,
  contraseña en blanco) → `POST /reconectadores/{id}/comando`.
- La contraseña **nunca** se guarda (decisión de auditoría original).

### PWA (manual, sin dependencia nueva)
- `public/manifest.webmanifest`: `name "Unergy Solar"`, `start_url /m/solar`, `scope /m/`,
  `display standalone`, theme `#915BD8`, ícono `/favicon.png` (512×512).
- `public/sw-mobile.js`: service worker registrado **solo** desde `/m` con `scope:'/m/'`
  (no controla la plataforma). Runtime cache network-first para el shell; **no** cachea `/api`.

## Componentes / archivos
**Frontend**
- `src/layouts/MobileLayout.vue` — shell full-height.
- `src/views/Mobile/MobileLoginView.vue`
- `src/views/Mobile/MobileSolarView.vue`
- `src/views/Mobile/components/ProjectLiveChart.vue` — gráfica combinada.
- `src/views/Mobile/components/ReconnectSheet.vue` — hoja de reconexión.
- `src/composables/usePwa.js` — registra el SW (scope `/m/`).
- Editar: `src/router/index.js`, `src/App.vue`, `src/api/client.js`, `src/stores/auth.js`, `index.html`.
- Nuevos: `public/manifest.webmanifest`, `public/sw-mobile.js`.

**Backend**
- `app/core/security.py` — `create_access_token(data, expires_minutes=None)`.
- `app/core/config.py` — `MOBILE_JWT_EXPIRE_MINUTES: int = 43200`.
- `app/api/v1/auth.py` — `POST /auth/token/mobile`.

## Errores / estados
- Sin proyectos / cargando / sin conexión → estados claros.
- Solenium sin configurar (503) / planta sin relay (404) → mensaje amable, oculta botón.
- Reconexión fallida (credenciales malas 401 / 502) → error dentro de la hoja.

## Fuera de alcance (YAGNI)
Histórico, totales, multi-usuario avanzado, push notifications. Se puede agregar después.
