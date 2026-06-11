/**
 * Composable compartido para documentos de Arriendos.
 * Metadatos en localStorage; blobs (PDF) en IndexedDB.
 */
import { ref } from 'vue'

const DB_NAME   = 'arriendos_docs_db'
const STORE_NAME = 'blobs'
const META_KEY   = 'arriendos_docs_meta'

// Estado reactivo compartido: { [blobKey]: { filename, proyecto, persona, periodo, codigo } }
export const docsMeta = ref({})

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE_NAME)
    req.onsuccess  = e => resolve(e.target.result)
    req.onerror    = () => reject(req.error)
  })
}

export async function storeBlob(key, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, key)
    tx.oncomplete = resolve
    tx.onerror    = () => reject(tx.error)
  })
}

export async function getBlob(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = e => resolve(e.target.result ?? null)
    req.onerror   = () => reject(req.error)
  })
}

// ── Metadatos (localStorage) ───────────────────────────────────────────────────

export function loadDocsMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) docsMeta.value = JSON.parse(raw)
  } catch {}
}

export function saveDocsMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(docsMeta.value)) } catch {}
}

// ── Descarga ───────────────────────────────────────────────────────────────────

export async function downloadDoc(blobKey) {
  const meta = docsMeta.value[blobKey]
  if (!meta) return
  const blob = await getBlob(blobKey)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = meta.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Clave de doc para un proyecto + período ────────────────────────────────────
export function docKey(proyectoId, periodo) {
  return `${proyectoId}__${periodo}`
}
