# Seguridad — Frontend de Operaciones

Resumen de la auditoría de seguridad del frontend y de las decisiones tomadas.
Incluye los puntos que **deben** atenderse en el backend, ya que no pueden
resolverse solo desde el cliente.

## 1. Almacenamiento de credenciales

- Todo el manejo de tokens está centralizado en [`src/utils/security.js`](src/utils/security.js):
  `getAccessToken`, `setAccessToken`, `getStoredUser`, `setStoredUser`,
  `clearTokens`, `decodeJwtPayload`, `isTokenExpired`, `isPreviewToken`.
  El store de auth (`src/stores/auth.js`), el cliente axios (`src/api/client.js`)
  y las vistas que hacían `fetch` directo consumen estas funciones; ya no hay
  acceso disperso a `localStorage` ni lógica de decodificación de JWT duplicada.
- **Estrategia actual:** el access token se guarda en `localStorage`. Sobrevive
  recargas y se comparte entre pestañas, que es lo que la operación diaria
  espera. `localStorage` es legible por JavaScript, por lo que **no protege ante
  XSS**. Moverlo a `sessionStorage` o a memoria no cambia eso (siguen siendo
  legibles por JS) y sí degrada la UX (logout en cada recarga / no compartir
  sesión entre pestañas).

### Acción requerida en el backend (corrige el riesgo real de XSS)

1. Emitir el **refresh token** en una cookie `httpOnly` + `Secure` +
   `SameSite=Strict`. Una cookie httpOnly no es accesible desde JavaScript, así
   que un XSS no puede robarla.
2. Hacer el **access token de vida corta** (p. ej. 5–15 min) y renovarlo con el
   refresh token vía cookie.
3. Exponer un endpoint de logout que invalide el refresh token en servidor.

Cuando esto exista, en el frontend basta:
- En `src/api/client.js`, habilitar `withCredentials: true` (ya documentado en
  el archivo) para que el navegador envíe la cookie.
- En `src/utils/security.js`, cambiar `STORAGE` para mantener el access token
  solo en memoria. El resto de la app no necesita cambios.

## 2. Autorización

- El control de acceso por rol vive en el router (`src/router/index.js`,
  `meta.roles`) y **el backend valida cada petición**. El frontend solo oculta
  UI; la autoridad es del servidor.
- El interceptor de `src/api/client.js` maneja:
  - **401** → limpia tokens y redirige al login (respeta el login móvil).
  - **403** → muestra un toast "Acceso denegado" con el detalle del backend.
- Gestión de usuarios (`/admin/usuarios`) está restringida a `admin` y
  `operaciones` en el router y debe seguir validándose server-side.

## 3. API Keys (`src/views/Admin/ApiKeysDialog.vue`)

Ya cumple las buenas prácticas y se mantienen:
- La generación es **backend-only**; el frontend solo llama a `/api-keys`.
- La key en claro se muestra **una sola vez** tras crearla y no es recuperable.
- Las keys existentes se listan **enmascaradas** (`key_prefix` + `...`).
- Se añadió una advertencia en la UI para educar sobre el manejo seguro (tratar
  la key como contraseña, guardarla en un gestor de secretos, revocarla si se
  expone).

## 4. Integración con Google Drive (Fallas)

`src/views/Fallas/FallaArchivos.vue` y `FallaForm.vue` **no manejan credenciales
de Google en el cliente**. Todo pasa por el backend (`/fallas/{id}/archivos`),
que es quien guarda las credenciales OAuth, refresca tokens y aplica los scopes
mínimos. No hay llamadas directas del navegador a la API de Google. Mantener este
patrón de proxy para cualquier nueva integración externa.

## 5. Cabeceras de seguridad y CORS

- **CSP:** se agregó una `Content-Security-Policy-Report-Only` en `index.html`.
  No bloquea; reporta violaciones en consola para afinar la política. Cuando ya
  no haya violaciones legítimas, migrar a `Content-Security-Policy` (modo bloqueo).
  Nota: el código usa atributos `style=` y handlers inline (`onfocus`, etc.), por
  eso `style-src` incluye `'unsafe-inline'`; idealmente migrar esos estilos a
  clases para poder endurecer también `script-src`.
  - **Orígenes externos legítimos ya incluidos** (para que el modo bloqueo no
    rompa funcionalidad real al migrar):
    - `https://fonts.googleapis.com` (`style-src`) y `https://fonts.gstatic.com`
      (`font-src`): Google Fonts importado en `src/assets/main.css` y en los
      reportes imprimibles (`src/utils/rptStyles.js`, `LiquidacionPdfView.vue`).
    - `https://cdnjs.cloudflare.com` (`script-src`): pdf.js cargado por
      `src/views/Finanzas/ValidadorMandatosView.vue`.
    Idealmente self-hostear estos recursos y luego retirarlos del CSP. Las teselas
    de OpenStreetMap (`FallasMapView.vue`) ya quedan cubiertas por `img-src https:`.
- **CORS:** en desarrollo el proxy de Vite hace que frontend y API compartan
  origen (no hay CORS). En producción, configurar en el servidor una política
  CORS estricta (orígenes permitidos explícitos, `Allow-Credentials` solo si se
  usan cookies).
- **HSTS:** debe enviarse desde el servidor
  (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).
  No puede establecerse desde un `<meta>`.

## Checklist pendiente (backend)

- [ ] Refresh token en cookie `httpOnly`/`Secure`/`SameSite`.
- [ ] Access token de vida corta + renovación.
- [ ] Cabecera HSTS en respuestas HTTPS.
- [ ] Política CORS estricta en producción.
- [ ] Confirmar scopes OAuth mínimos en la integración de Drive.
