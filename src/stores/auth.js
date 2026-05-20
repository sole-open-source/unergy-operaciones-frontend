import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BASE = import.meta.env.VITE_API_URL || ''

function tokenExpired(jwt) {
  if (!jwt) return true
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')))
    return !exp || Date.now() >= exp * 1000
  } catch { return true }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = localStorage.getItem('token')
  const token = ref(stored && !tokenExpired(stored) ? stored : null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  if (!token.value && stored) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    user.value = null
  }

  const isAuthenticated = computed(() => !!token.value && !tokenExpired(token.value))
  const role = computed(() => user.value?.rol || null)

  function can(...roles) {
    return roles.includes(role.value) || role.value === 'admin'
  }

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
    const b64 = data.access_token.split('.')[1]
      .replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(
      b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')
    ))
    user.value = {
      id: payload.sub, rol: payload.rol,
      nombre: payload.nombre, email: payload.email,
    }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, role, can, login, logout }
})
