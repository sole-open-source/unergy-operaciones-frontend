import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BASE = import.meta.env.VITE_API_URL || ''

/** Lee el tiempo de expiración del JWT sin verificar firma. */
function tokenExpired(jwt) {
  if (!jwt) return true
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')))
    return !exp || Date.now() >= exp * 1000
  } catch { return true }
}

/** Decodifica el payload completo del JWT (sin verificar firma). */
function decodeJwtPayload(jwt) {
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')))
  } catch { return null }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = localStorage.getItem('token')
  const tokenValid = !!stored && !tokenExpired(stored)
  const token = ref(tokenValid ? stored : null)

  // ── Recuperar usuario ────────────────────────────────────────────────────────
  // Fuente de verdad: localStorage.user si existe con rol válido.
  // Fallback: decodificar el JWT (contiene sub, rol, nombre, email).
  // Esto cubre el caso donde localStorage.user se borró pero el token sigue vivo.
  let initialUser = null
  try {
    const raw = localStorage.getItem('user')
    if (raw) initialUser = JSON.parse(raw)
  } catch { initialUser = null }

  if (token.value && (!initialUser?.rol)) {
    // localStorage.user está vacío o sin rol — reconstruir desde JWT
    const payload = decodeJwtPayload(token.value)
    if (payload?.sub && payload?.rol) {
      initialUser = {
        id:     payload.sub,
        rol:    payload.rol,
        nombre: payload.nombre || '',
        email:  payload.email  || '',
      }
      localStorage.setItem('user', JSON.stringify(initialUser))
    }
  }

  const user = ref(initialUser)

  // Si el token expiró, limpiar estado
  if (!token.value) {
    if (stored) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    user.value = null
  }

  // ── Computeds ────────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !tokenExpired(token.value))
  const role            = computed(() => user.value?.rol || null)

  function can(...roles) {
    if (!role.value) return false
    return roles.includes(role.value) || role.value === 'admin'
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  // `endpoint` permite usar el login de larga duración para la app móvil (PWA).
  async function _doLogin(email, password, endpoint) {
    const resp = await fetch(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    })
    const data = await resp.json()
    if (!resp.ok) throw { response: { data } }

    token.value = data.access_token
    localStorage.setItem('token', data.access_token)

    // Decodificar payload del nuevo token para obtener datos del usuario
    const b64 = data.access_token.split('.')[1]
      .replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(
      b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')
    ))
    user.value = {
      id:     payload.sub,
      rol:    payload.rol,
      nombre: payload.nombre,
      email:  payload.email,
    }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function login(email, password) {
    return _doLogin(email, password, '/api/v1/auth/token')
  }

  // Login para la app móvil: token de larga duración (30 días).
  async function loginMobile(email, password) {
    return _doLogin(email, password, '/api/v1/auth/token/mobile')
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, role, can, login, loginMobile, logout }
})
