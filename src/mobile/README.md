# `src/mobile/` — App móvil "Unergy Solar" (monitoreo-tipo-app)

App **independiente** del resto de la plataforma. Vive en el mismo repo y mismo deploy,
pero está **aislada por ruta y por carpeta**: todo su código propio está aquí dentro.

> **Regla para el equipo:** si NO estás trabajando en la app móvil, no necesitas tocar
> nada de esta carpeta. Y para cambiar la app móvil, en el 95% de los casos solo se
> edita aquí dentro. Los "ganchos" en archivos compartidos (abajo) son mínimos y estables.

## Qué es
PWA instalable para ver generación solar en tiempo real y reconectar plantas desde el
celular. Rutas: `/m/login` y `/m/solar`. No pasa por la UI de la plataforma (login y
layout propios). Ver diseño en `docs/superpowers/specs/2026-06-08-app-movil-solar-design.md`.

## Contenido (todo lo propio de la app)
```
src/mobile/
├── MobileLoginView.vue      # login (token de larga duración, 30 días)
├── MobileSolarView.vue      # Generación: selector + gráfica + reconectar
├── MobileFallasView.vue     # Fallas: lista + filtros + registrar (bitácora de monitoreo)
├── solarSeries.js           # extractores de series (inversores/medidor)
├── usePwa.js                # registra el service worker (solo en PROD, scope /m/)
└── components/
    ├── ProjectLiveChart.vue   # gráfica combinada inversores + medidor (+ línea "ahora")
    ├── ReconnectSheet.vue     # hoja inferior de reconexión (lógica de Laura)
    ├── NotificationsSheet.vue # campana: notificaciones del día
    ├── FallaDetailSheet.vue   # detalle de falla: estado/prioridad/asignado + seguimientos
    ├── FallaCreateSheet.vue   # registrar falla (form móvil)
    └── MobileTabBar.vue       # navegación inferior (Generación / Fallas)
```
Rutas: `/m/solar` (Generación), `/m/fallas` (Fallas). Las fallas reusan los endpoints
`/fallas`, `/fallas/catalogos`, `/fallas/{id}`, `/fallas/{id}/seguimientos` — los mismos
que la vista web `operaciones/gestión de fallas`.
Assets PWA (deben ir en `public/` para servirse en la raíz):
- `public/manifest.webmanifest`
- `public/sw-mobile.js`

## "Ganchos" en archivos compartidos (lo único que toca el resto del repo)
Estos archivos tienen unas pocas líneas que conectan la app móvil. Cambiarlos puede
afectar a la plataforma, así que tratar con cuidado:

| Archivo | Qué agrega para la app móvil |
|---------|------------------------------|
| `src/router/index.js` | rutas `/m`, `/m/login`, `/m/solar` + guard que manda a `/m/login` |
| `src/App.vue` | si `route.meta.mobile` → render a pantalla completa (sin sidebar/topbar) |
| `src/api/client.js` | en 401, si estás en `/m/...` redirige a `/m/login` (no a `/login`) |
| `src/stores/auth.js` | `loginMobile()` → `POST /api/v1/auth/token/mobile` |
| `index.html` | `<link rel="manifest">` + metas apple-mobile-web-app + `viewport-fit=cover` |

## Backend asociado (repo `Backend Operaciones`)
- `POST /api/v1/auth/token/mobile` — login con token largo (`MOBILE_JWT_EXPIRE_MINUTES`, 30d).
- Reusa endpoints existentes: `/generacion-solar/monitoring[/{id}]`, `/reconectadores/estados`,
  `/reconectadores/{id}/comando`. **No** se modificó la lógica de monitoreo ni de reconexión.
