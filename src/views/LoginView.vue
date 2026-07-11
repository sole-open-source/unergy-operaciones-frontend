<template>
  <div class="min-h-screen flex items-center justify-center" style="background-color: #2C2039;">
    <!-- Background accent -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style="background: #915BD8;"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style="background: #915BD8;"></div>
    </div>

    <div class="relative w-full max-w-sm mx-4">
      <!-- Card -->
      <div class="rounded-2xl shadow-2xl overflow-hidden" style="background-color: #FDFAF7;">
        <!-- Header with logo -->
        <div class="px-10 pt-10 pb-6 text-center">
          <img src="/logos/Stacked_Logo_pupura_energico.png" alt="Unergy" class="h-16 w-auto mx-auto object-contain" />
          <p class="text-sm mt-3" style="color: #6b5a8a;">Plataforma de Operaciones</p>
        </div>

        <!-- Form -->
        <main id="main-content" tabindex="-1" class="px-10 pb-10">
          <h1 class="sr-only">Ingresar a la Plataforma de Operaciones de Unergy</h1>
          <form @submit.prevent="submit" class="space-y-4" aria-describedby="login-error">
            <div>
              <label for="login-email" class="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style="color: #2C2039;">Correo</label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="tu@unergy.io"
                required
                :aria-invalid="error ? 'true' : undefined"
                aria-describedby="login-error"
                class="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style="border: 1.5px solid #d4c8e8; background: white; color: #2C2039;"
                onfocus="this.style.borderColor='#915BD8'"
                onblur="this.style.borderColor='#d4c8e8'"
              />
            </div>

            <div>
              <label for="login-password" class="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style="color: #2C2039;">Contraseña</label>
              <input
                id="login-password"
                v-model="password"
                type="password"
                name="password"
                autocomplete="current-password"
                placeholder="••••••••"
                required
                :aria-invalid="error ? 'true' : undefined"
                aria-describedby="login-error"
                class="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style="border: 1.5px solid #d4c8e8; background: white; color: #2C2039;"
                onfocus="this.style.borderColor='#915BD8'"
                onblur="this.style.borderColor='#d4c8e8'"
              />
            </div>

            <div id="login-error" role="alert" aria-live="assertive">
              <div v-if="error" class="text-xs px-3 py-2 rounded-lg" style="background: #fde8e8; color: #b3261e;">
                {{ error }}
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              :aria-busy="loading ? 'true' : undefined"
              class="w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all mt-2"
              style="background-color: #915BD8; color: #FDFAF7;"
              onmouseover="if(!this.disabled) this.style.backgroundColor='#7a46c0'"
              onmouseout="if(!this.disabled) this.style.backgroundColor='#915BD8'"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <i class="pi pi-spin pi-spinner text-xs" />
                Ingresando...
              </span>
              <span v-else>Ingresar</span>
            </button>
          </form>

          <div class="text-center mt-4">
            <RouterLink to="/forgot-password" class="text-xs hover:underline" style="color: #915BD8;">
              ¿Olvidaste tu contraseña?
            </RouterLink>
          </div>
        </main>
      </div>

      <p class="text-center text-xs mt-6" style="color: rgba(253,250,247,0.35);">
        © {{ new Date().getFullYear() }} Unergy · Operaciones
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Error de conexión'
  } finally {
    loading.value = false
  }
}
</script>
