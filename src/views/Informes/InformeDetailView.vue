<template>
  <div v-if="informe" class="space-y-6">
    <!-- Back + header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded @click="$router.push('/informes')" />
        <div>
          <h1 class="text-xl font-bold" style="color: #2C2039;">{{ informe.proyecto_nombre || informe.sub_project }}</h1>
          <p class="text-xs" style="color: #6b5a8a;">
            {{ tipoLabel[informe.tipo] || informe.tipo }} — {{ informe.periodo_display || `${informe.periodo_desde} — ${informe.periodo_hasta}` }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Tag :value="estadoLabel[informe.estado]" :severity="estadoSeverity[informe.estado]" class="text-sm" />
        <Tag v-if="informe.correo_enviado" value="Enviado" severity="success" class="text-sm" />
      </div>
    </div>

    <!-- Metadata cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl p-4" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold mb-1" style="color: #6b5a8a;">Creado por</p>
        <p class="font-semibold" style="color: #2C2039;">{{ informe.creado_por_nombre || '—' }}</p>
        <p class="text-xs mt-0.5" style="color: #6b5a8a;">{{ fmtDate(informe.creado_en) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold mb-1" style="color: #6b5a8a;">Editado por</p>
        <p class="font-semibold" style="color: #2C2039;">{{ informe.editado_por_nombre || '—' }}</p>
        <p class="text-xs mt-0.5" style="color: #6b5a8a;">{{ fmtDate(informe.editado_en) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4" style="border: 1px solid #e8e0f0;">
        <p class="text-xs uppercase tracking-wide font-semibold mb-1" style="color: #6b5a8a;">Aprobado por</p>
        <p class="font-semibold" style="color: #2C2039;">{{ informe.aprobado_por_nombre || '—' }}</p>
        <p class="text-xs mt-0.5" style="color: #6b5a8a;">{{ fmtDate(informe.aprobado_en) }}</p>
      </div>
    </div>

    <!-- Actions bar -->
    <div class="bg-white rounded-xl p-4 flex flex-wrap items-center gap-3" style="border: 1px solid #e8e0f0;">
      <!-- State transitions -->
      <Button v-if="informe.estado === 'borrador'"
              label="Marcar como revisado" icon="pi pi-check" severity="warn"
              @click="changeEstado('revisado')" :loading="changing" />

      <Button v-if="informe.estado === 'revisado'"
              label="Aprobar informe" icon="pi pi-verified" severity="success"
              @click="changeEstado('aprobado')" :loading="changing" />

      <Button v-if="informe.estado === 'revisado'"
              label="Devolver a borrador" icon="pi pi-undo" severity="secondary" outlined
              @click="changeEstado('borrador')" :loading="changing" />

      <!-- Send email -->
      <Button v-if="informe.estado === 'aprobado' && !informe.correo_enviado"
              label="Enviar al cliente" icon="pi pi-send" severity="info"
              @click="enviar" :loading="sending" />

      <Button v-if="informe.estado === 'aprobado' && informe.correo_enviado"
              label="Reenviar" icon="pi pi-replay" severity="secondary" outlined
              @click="enviar" :loading="sending" />

      <!-- Delete -->
      <Button v-if="informe.estado !== 'aprobado'"
              label="Eliminar" icon="pi pi-trash" severity="danger" text
              @click="confirmDelete" :loading="deleting" class="ml-auto" />

      <span v-if="informe.correo_enviado" class="text-xs ml-auto" style="color: #10B981;">
        <i class="pi pi-check-circle mr-1" />
        Enviado {{ fmtDate(informe.correo_enviado_en) }}
      </span>
    </div>

    <!-- HTML preview -->
    <div class="bg-white rounded-xl overflow-hidden" style="border: 1px solid #e8e0f0;">
      <div class="px-5 py-3 flex items-center justify-between" style="background: #f8f5fc; border-bottom: 1px solid #e8e0f0;">
        <span class="text-sm font-semibold" style="color: #2C2039;">Vista previa del informe</span>
        <Button v-if="informe.html_content" label="Imprimir" icon="pi pi-print" severity="secondary" text size="small" @click="printReport" />
      </div>
      <div class="p-6">
        <div v-if="informe.html_content" v-html="informe.html_content" class="informe-preview" />
        <div v-else class="text-center py-12" style="color: #6b5a8a;">
          <i class="pi pi-file text-4xl mb-3 block" style="color: #d1c4e9;" />
          <p>Este informe no tiene contenido HTML</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else-if="loading" class="flex items-center justify-center py-20">
    <i class="pi pi-spin pi-spinner text-3xl" style="color: #915BD8;" />
  </div>

  <!-- Not found -->
  <div v-else class="text-center py-20">
    <i class="pi pi-exclamation-triangle text-4xl mb-3 block" style="color: #CA8A04;" />
    <p class="font-semibold" style="color: #2C2039;">Informe no encontrado</p>
    <Button label="Volver a informes" icon="pi pi-arrow-left" severity="secondary" class="mt-4"
            @click="$router.push('/informes')" />
  </div>

  <!-- Delete confirm dialog -->
  <Dialog v-model:visible="showDeleteDialog" header="Eliminar informe" :modal="true" :closable="true" style="width: 400px;">
    <p style="color: #2C2039;">Este informe se eliminará permanentemente. Esta acción no se puede deshacer.</p>
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="showDeleteDialog = false" />
      <Button label="Eliminar" icon="pi pi-trash" severity="danger" @click="doDelete" :loading="deleting" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/client'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'

const route = useRoute()
const router = useRouter()

const informe = ref(null)
const loading = ref(true)
const changing = ref(false)
const sending = ref(false)
const deleting = ref(false)
const showDeleteDialog = ref(false)

const tipoLabel = { op: 'Operacional', fmo: 'FMO', port: 'Portfolio' }
const estadoLabel = { borrador: 'Borrador', revisado: 'En revisión', aprobado: 'Aprobado' }
const estadoSeverity = { borrador: 'secondary', revisado: 'warn', aprobado: 'success' }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toast(severity, summary, detail) {
  if (typeof window.__primeToast === 'function') {
    window.__primeToast({ severity, summary, detail, life: 4000 })
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/informes/${route.params.id}`)
    informe.value = data
  } catch {
    informe.value = null
  } finally {
    loading.value = false
  }
}

async function changeEstado(nuevoEstado) {
  changing.value = true
  try {
    const { data } = await api.patch(`/informes/${informe.value.id}/estado`, { estado: nuevoEstado })
    Object.assign(informe.value, data)
    toast('success', 'Estado actualizado', `Informe ahora está en "${estadoLabel[nuevoEstado]}"`)
  } catch (e) {
    toast('error', 'Error', e.response?.data?.detail || 'No se pudo cambiar el estado')
  } finally {
    changing.value = false
  }
}

async function enviar() {
  sending.value = true
  try {
    const { data } = await api.post(`/informes/${informe.value.id}/enviar`)
    informe.value.correo_enviado = true
    informe.value.correo_enviado_en = new Date().toISOString()
    toast('success', 'Enviado', `Informe enviado a ${data.enviado_a}`)
  } catch (e) {
    toast('error', 'Error al enviar', e.response?.data?.detail || 'No se pudo enviar el email')
  } finally {
    sending.value = false
  }
}

function confirmDelete() {
  showDeleteDialog.value = true
}

async function doDelete() {
  deleting.value = true
  try {
    await api.delete(`/informes/${informe.value.id}`)
    toast('success', 'Eliminado', 'Informe eliminado correctamente')
    router.push('/informes')
  } catch (e) {
    toast('error', 'Error', e.response?.data?.detail || 'No se pudo eliminar')
  } finally {
    deleting.value = false
    showDeleteDialog.value = false
  }
}

function printReport() {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe — ${informe.value.proyecto_nombre || informe.value.sub_project}</title><style>body{font-family:Arial,sans-serif;margin:20mm;}</style></head><body>${informe.value.html_content}</body></html>`)
  w.document.close()
  w.print()
}

onMounted(load)
</script>

<style>
.informe-preview img {
  max-width: 100%;
  height: auto;
}
.informe-preview table {
  border-collapse: collapse;
  width: 100%;
}
.informe-preview th,
.informe-preview td {
  border: 1px solid #e8e0f0;
  padding: 6px 10px;
  text-align: left;
  font-size: 13px;
}
.informe-preview th {
  background: #f8f5fc;
  font-weight: 600;
}
</style>
