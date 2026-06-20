import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAccessToken,
  setAccessToken,
  getStoredUser,
  setStoredUser,
  clearTokens,
  decodeJwtPayload,
  isTokenExpired,
} from '@/utils/security'

const BASE = import.meta.env.VITE_API_URL || ''

export const useAuthStore = defineStore('auth', () => {
  const stored = getAccessToken()
  const tokenValid = !!stored && !isTokenExpired(stored)
  const token = ref(tokenValid ? stored : null)

  // ── Recuperar usuario ────────────────────────────────────────────────────────
  // Fuente de verdad: usuario en caché si existe con rol válido.
  // Fallback: decodificar el JWT (contiene sub, rol, nombre, email).
  // Esto cubre el caso donde el usuario en caché se borró pero el token sigue vivo.
  let initialUser = getStoredUser()

  if (token.value && !initialUser?.rol) {
    // Usuario en caché vacío o sin rol — reconstruir desde el JWT
    const payload = decodeJwtPayload(token.value)
    if (payload?.sub && payload?.rol) {
      initialUser = {
        id:     payload.sub,
        rol:    payload.rol,
        nombre: payload.nombre || '',
        email:  payload.email  || '',
      }
      setStoredUser(initialUser)
    }
  }

  const user = ref(initialUser)

  // Si el token expiró, limpiar estado
  if (!token.value) {
    if (stored) clearTokens()
    user.value = null
  }

  // ── Computeds ────────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !isTokenExpired(token.value))
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
    setAccessToken(data.access_token)

    // Decodificar payload del nuevo token para obtener datos del usuario
    const payload = decodeJwtPayload(data.access_token) || {}
    user.value = {
      id:     payload.sub,
      rol:    payload.rol,
      nombre: payload.nombre,
      email:  payload.email,
    }
    setStoredUser(user.value)
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
    clearTokens()
  }

  // Solo en desarrollo: simula login sin backend para preview de vistas
  function previewLogin(rol) {
    if (!import.meta.env.DEV) return
    const h = btoa('{"alg":"HS256","typ":"JWT"}').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
    const p = btoa(`{"sub":"99","rol":"${rol}","nombre":"Preview ${rol}","email":"preview@unergy.io","exp":9999999999}`).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
    const fakeToken = `${h}.${p}.preview`
    token.value = fakeToken
    user.value = { id: '99', rol, nombre: `Preview ${rol}`, email: 'preview@unergy.io' }
    setAccessToken(fakeToken)
    setStoredUser(user.value)
  }

  return { token, user, isAuthenticated, role, can, login, loginMobile, logout, previewLogin }
})
