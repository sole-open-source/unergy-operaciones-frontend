// ─────────────────────────────────────────────────────────────────────────────
// Punto único de manejo de credenciales del frontend.
//
// Centraliza el almacenamiento del token de acceso y del usuario, además de la
// decodificación del JWT, de modo que la estrategia de almacenamiento se pueda
// cambiar en un solo lugar (auth store, cliente axios y vistas la consumen).
//
// SEGURIDAD — léase antes de modificar:
//   • Hoy el token de acceso se guarda en localStorage por compatibilidad:
//     sobrevive recargas y se comparte entre pestañas, que es lo que la
//     operación diaria espera. localStorage es legible por JavaScript, así que
//     NO protege ante XSS.
//   • La protección real contra el robo de token por XSS es que el BACKEND
//     emita el refresh token en una cookie httpOnly + Secure + SameSite=Strict
//     y que el access token sea de vida corta. Eso no se puede lograr solo desde
//     el frontend. Ver SECURITY.md.
//   • Cuando exista ese flujo, basta cambiar `STORAGE` / las funciones de abajo
//     (p. ej. mantener el access token solo en memoria) sin tocar el resto de la
//     app.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

// Backend de almacenamiento. Cambiarlo aquí (p. ej. a sessionStorage o a un
// objeto en memoria) ajusta toda la app sin más cambios.
const STORAGE = window.localStorage

// ── Token de acceso ──────────────────────────────────────────────────────────
export function getAccessToken() {
  try {
    return STORAGE.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token) {
  try {
    if (token) STORAGE.setItem(TOKEN_KEY, token)
    else STORAGE.removeItem(TOKEN_KEY)
  } catch {
    /* almacenamiento no disponible (modo privado, etc.) */
  }
}

// ── Usuario en caché ─────────────────────────────────────────────────────────
export function getStoredUser() {
  try {
    const raw = STORAGE.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  try {
    if (user) STORAGE.setItem(USER_KEY, JSON.stringify(user))
    else STORAGE.removeItem(USER_KEY)
  } catch {
    /* almacenamiento no disponible */
  }
}

// ── Limpieza total (logout / 401) ────────────────────────────────────────────
export function clearTokens() {
  try {
    STORAGE.removeItem(TOKEN_KEY)
    STORAGE.removeItem(USER_KEY)
  } catch {
    /* almacenamiento no disponible */
  }
}

// ── Helpers de JWT ───────────────────────────────────────────────────────────
// Decodifican el payload SIN verificar la firma. La verificación de firma es
// responsabilidad del backend; el frontend solo lee claims (sub, rol, exp…).
export function decodeJwtPayload(jwt) {
  if (!jwt) return null
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')))
  } catch {
    return null
  }
}

export function isTokenExpired(jwt) {
  const payload = decodeJwtPayload(jwt)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}

// Token de preview solo-DEV (no es un token real): termina en `.preview`.
// No debe disparar logout ante un 401 del backend.
export function isPreviewToken(jwt) {
  return import.meta.env.DEV && typeof jwt === 'string' && jwt.endsWith('.preview')
}
