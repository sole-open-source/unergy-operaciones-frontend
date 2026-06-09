import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

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

  // ── API key efímera ───────────────────────────────────────────────────────────
  // Las API keys nunca se persisten en localStorage (serían legibles desde JS y
  // sobrevivirían al cierre de sesión). Se guardan solo en memoria, durante la
  // vida de la sesión, y se limpian al cerrar sesión mediante el watch de abajo.
  const apiKey = ref(null)
  function setApiKey(key) { apiKey.value = key || null }
  function clearApiKey() { apiKey.value = null }

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
  async function login(email, password) {
    const resp = await fetch(`${BASE}/api/v1/auth/token`, {
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

  // ── Logout ───────────────────────────────────────────────────────────────────
  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  // Limpiar cualquier estado sensible en memoria cuando el token desaparece
  // (logout, expiración o invalidación desde otra pestaña).
  watch(token, (t) => {
    if (!t) clearApiKey()
  })

  return { token, user, apiKey, isAuthenticated, role, can, login, logout, setApiKey, clearApiKey }
})
