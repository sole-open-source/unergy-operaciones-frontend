<template>
  <div class="min-h-screen flex items-center justify-center" style="background-color: #2C2039;">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style="background: #915BD8;"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style="background: #915BD8;"></div>
    </div>

    <div class="relative w-full max-w-sm mx-4">
      <div class="rounded-2xl shadow-2xl overflow-hidden" style="background-color: #FDFAF7;">
        <div class="px-10 pt-10 pb-6 text-center">
          <img src="/logos/Stacked_Logo_pupura_energico.png" alt="Unergy" class="h-16 w-auto mx-auto object-contain" />
          <p class="text-sm mt-3" style="color: #6b5a8a;">Recuperar contraseña</p>
        </div>

        <div class="px-10 pb-10">
          <!-- Success state -->
          <div v-if="sent" class="text-center space-y-3">
            <div class="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style="background: rgba(16,185,129,0.1);">
              <i class="pi pi-check text-2xl" style="color: #10B981;" />
            </div>
            <p class="text-sm" style="color: #2C2039;">
              Si existe una cuenta con <strong>{{ email }}</strong>, recibirás un correo con las instrucciones para restablecer tu contraseña.
            </p>
            <RouterLink to="/login" class="block text-xs mt-4 hover:underline" style="color: #915BD8;">
              Volver al inicio de sesión
            </RouterLink>
          </div>

          <!-- Form state -->
          <form v-else @submit.prevent="submit" class="space-y-4">
            <p class="text-xs" style="color: #6b5a8a;">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <div>
              <label class="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style="color: #2C2039;">Correo</label>
              <input
                v-model="email"
                type="email"
                placeholder="tu@unergy.io"
                required
                class="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style="border: 1.5px solid #d4c8e8; background: white; color: #2C2039;"
                onfocus="this.style.borderColor='#915BD8'"
                onblur="this.style.borderColor='#d4c8e8'"
              />
            </div>

            <div v-if="error" class="text-xs px-3 py-2 rounded-lg" style="background: #fde8e8; color: #c0392b;">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all mt-2"
              style="background-color: #915BD8; color: #FDFAF7;"
              onmouseover="if(!this.disabled) this.style.backgroundColor='#7a46c0'"
              onmouseout="if(!this.disabled) this.style.backgroundColor='#915BD8'"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <i class="pi pi-spin pi-spinner text-xs" />
                Enviando...
              </span>
              <span v-else>Enviar enlace</span>
            </button>

            <div class="text-center">
              <RouterLink to="/login" class="text-xs hover:underline" style="color: #915BD8;">
                Volver al inicio de sesión
              </RouterLink>
            </div>
          </form>
        </div>
      </div>

      <p class="text-center text-xs mt-6" style="color: rgba(253,250,247,0.35);">
        © {{ new Date().getFullYear() }} Unergy · Operaciones
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api/client'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    sent.value = true
  } catch (e) {
    // Always show success to prevent email enumeration
    sent.value = true
  } finally {
    loading.value = false
  }
}
</script>
