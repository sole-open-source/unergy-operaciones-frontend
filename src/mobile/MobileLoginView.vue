<template>
  <div class="ml-root">
    <div class="ml-card">
      <img src="/logos/Logo_avena.png" alt="Unergy" class="ml-logo" />
      <h1 class="ml-title">Solar</h1>
      <p class="ml-sub">Monitoreo en tiempo real</p>

      <form class="ml-form" @submit.prevent="onSubmit">
        <label class="ml-label">Correo
          <input v-model="email" class="ml-input" type="email" inputmode="email"
            autocomplete="username" placeholder="tu@unergy.io" required />
        </label>
        <label class="ml-label">Contraseña
          <input v-model="password" class="ml-input" type="password"
            autocomplete="current-password" placeholder="••••••••" required />
        </label>

        <div v-if="error" class="ml-error"><i class="pi pi-exclamation-triangle" /> {{ error }}</div>

        <button class="ml-submit" type="submit" :disabled="loading || !email || !password">
          <i v-if="loading" class="pi pi-spin pi-spinner" />
          <i v-else class="pi pi-sun" />
          {{ loading ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>

      <p class="ml-hint">La sesión se mantiene activa en este dispositivo.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePwa } from '@/mobile/usePwa'

const router = useRouter()
const auth = useAuthStore()
const { register } = usePwa()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await auth.loginMobile(email.value.trim(), password.value)
    router.replace('/m/solar')
  } catch (err) {
    error.value = err.response?.data?.detail || 'No se pudo ingresar. Verifica tus datos.'
  } finally {
    loading.value = false
  }
}

onMounted(() => { register() })
</script>

<style scoped>
.ml-root {
  min-height: 100vh; min-height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: linear-gradient(160deg, #2C2039 0%, #4C1D95 60%, #915BD8 130%);
}
.ml-card {
  width: 100%; max-width: 380px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
  border-radius: 24px; padding: 34px 26px 28px;
  text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
}
.ml-logo { height: 34px; margin: 0 auto 18px; display: block; }
.ml-title { font-size: 30px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.5px; }
.ml-sub { font-size: 13px; color: rgba(255,255,255,0.6); margin: 4px 0 26px; }

.ml-form { text-align: left; }
.ml-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 16px; }
.ml-input {
  width: 100%; margin-top: 7px; padding: 14px 15px; font-size: 16px;
  border-radius: 13px; border: 1.5px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.08); color: #fff;
}
.ml-input::placeholder { color: rgba(255,255,255,0.4); }
.ml-input:focus { outline: none; border-color: #F6FF72; background: rgba(255,255,255,0.12); }

.ml-error {
  display: flex; align-items: center; gap: 8px; font-size: 13px; color: #fecaca;
  background: rgba(220,38,38,0.18); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px;
}
.ml-submit {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 15px; border: none; border-radius: 14px; font-size: 16px; font-weight: 700;
  color: #2C2039; background: #F6FF72; margin-top: 4px;
}
.ml-submit:disabled { opacity: .5; }
.ml-hint { font-size: 11px; color: rgba(255,255,255,0.45); margin: 18px 0 0; }
</style>
