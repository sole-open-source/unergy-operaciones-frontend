// ─────────────────────────────────────────────────────────────────────────────
// Validación de seguridad para cargas de archivos ZIP.
//
// Mitiga dos riesgos al procesar ZIPs subidos por el usuario:
//   1. Zip Slip — entradas con rutas que escapan del directorio destino mediante
//      ".." o rutas absolutas ("/etc/passwd", "C:\..."). Aunque el frontend no
//      escribe a disco, el nombre de la entrada puede terminar viajando al
//      backend como nombre de archivo; se rechaza en origen (defensa en capas).
//      NOTA: JSZip ya colapsa ".." al cargar (ej. "a/../../x" → "x"), por lo que
//      en la práctica el gate efectivo son las rutas ABSOLUTAS (que JSZip sí
//      preserva) + `getSafeFilePath` al construir el nombre final. El chequeo de
//      ".." se mantiene por si el ZIP proviene de un cargador que no normaliza.
//   2. Tipos de archivo peligrosos — se valida la extensión contra una allowlist
//      para evitar que se propaguen ejecutables (.exe, .bat, .js, …).
//
// `validateZipEntries` NO lanza: devuelve { valid, errors } para que la vista
// muestre un mensaje claro y aborte el proceso. `getSafeFilePath` normaliza una
// ruta a una forma relativa y segura (usada como defensa en capas al construir
// el nombre del archivo que se envía al backend).
// ─────────────────────────────────────────────────────────────────────────────

// Extensiones permitidas por defecto (documentos tabulares). Cada vista puede
// pasar su propia allowlist vía la opción `allowedExtensions`.
export const DEFAULT_ALLOWED_EXTENSIONS = ['csv', 'xls', 'xlsx']

// Entradas de metadatos que crean macOS/Windows al comprimir. No se procesan ni
// deben bloquear una carga legítima; se ignoran (pero el chequeo de Zip Slip no
// aplica a ellas porque nunca escapan de la raíz).
const IGNORED_ENTRY = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$)/i

// ── Normalización de rutas ─────────────────────────────────────────────────────
export function getSafeFilePath(rawPath) {
  if (!rawPath) return ''
  let p = String(rawPath).replace(/\\/g, '/')   // separadores windows → unix
  p = p.replace(/^[a-zA-Z]:/, '')                // descarta letra de unidad (C:)
  const out = []
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') { out.pop(); continue }    // colapsa sin escapar de la raíz
    out.push(seg)
  }
  return out.join('/')
}

// ── Detectores de patrones peligrosos ──────────────────────────────────────────
function isAbsolutePath(rawPath) {
  const p = String(rawPath || '')
  return p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(p)
}

function hasTraversal(rawPath) {
  return String(rawPath || '').replace(/\\/g, '/').split('/').some(seg => seg === '..')
}

function getExtension(rawPath) {
  const base = String(rawPath || '').replace(/\\/g, '/').split('/').pop() || ''
  const i = base.lastIndexOf('.')
  return i > 0 ? base.slice(i + 1).toLowerCase() : ''
}

// ── Validación de todas las entradas del ZIP ────────────────────────────────────
// zip: objeto JSZip (se lee su mapa `.files`: ruta → { name, dir }).
// options.allowedExtensions: string[] de extensiones permitidas (sin punto).
export function validateZipEntries(zip, options = {}) {
  const allowed = (options.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS)
    .map(e => String(e).toLowerCase())
  const errors = []
  const files = (zip && zip.files) || {}

  for (const path of Object.keys(files)) {
    const entry = files[path]
    if (entry && entry.dir) continue
    if (IGNORED_ENTRY.test(path)) continue

    if (isAbsolutePath(path)) {
      errors.push({ path, code: 'ABSOLUTE_PATH', message: `Ruta absoluta no permitida: ${path}` })
      continue
    }
    if (hasTraversal(path)) {
      errors.push({ path, code: 'PATH_TRAVERSAL', message: `Ruta con recorrido de directorios (..): ${path}` })
      continue
    }
    const ext = getExtension(path)
    if (!allowed.includes(ext)) {
      errors.push({
        path,
        code: 'DISALLOWED_EXTENSION',
        message: `Tipo de archivo no permitido${ext ? `: .${ext}` : ''} (${path})`,
      })
    }
  }

  return { valid: errors.length === 0, errors }
}
