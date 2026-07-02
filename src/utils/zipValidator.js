import JSZip from 'jszip'

/**
 * Validación estricta de archivos ZIP antes de procesarlos (cliente) o subirlos
 * al backend. Previene tres clases de ataque:
 *
 *   1. Corrupción / suplantación de formato  → se verifica el "magic number"
 *      (firma binaria PK\x03\x04) en lugar de confiar en la extensión o el
 *      MIME type reportado por el navegador, que es fácilmente falsificable.
 *   2. Zip Slip (path traversal)             → se rechaza cualquier entrada con
 *      ruta absoluta o segmentos '..' que apuntarían fuera del directorio de
 *      extracción.
 *   3. Ejecución de código malicioso         → se rechazan extensiones peligrosas
 *      (.exe, .bat, .sh, ...) dentro del ZIP y, si el llamador lo indica, se
 *      aplica además una allowlist estricta acorde al contexto de negocio.
 *
 * Cada modo de falla lanza un `ZipValidationError` con un `code` estable para
 * que la vista muestre un mensaje claro al usuario.
 */

// Firma de un archivo ZIP estándar (encabezado de archivo local): PK\x03\x04.
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

// Extensiones que nunca deben viajar dentro de un ZIP de negocio: ejecutables,
// scripts y otros formatos que pueden ejecutar código en el equipo del usuario.
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'sh', 'cmd', 'com', 'msi', 'scr', 'js', 'mjs', 'cjs',
  'vbs', 'vbe', 'jse', 'ps1', 'psm1', 'jar', 'app', 'dll', 'so',
  'dylib', 'bin', 'reg', 'lnk', 'apk', 'deb', 'rpm', 'wsf', 'hta',
])

// Allowlists por contexto de negocio. Se exportan para que cada vista aplique
// la que corresponde a los archivos que legítimamente maneja.
export const ALLOWED_EXTENSIONS_ARRIENDOS = ['pdf', 'jpg', 'jpeg', 'png']
export const ALLOWED_EXTENSIONS_MANDATOS  = ['pdf', 'xlsx', 'xls', 'xml', 'csv']

export class ZipValidationError extends Error {
  /**
   * @param {string} code    Código estable del modo de falla.
   * @param {string} message Mensaje legible (español) para el usuario.
   * @param {string} [entry] Ruta de la entrada del ZIP que causó la falla.
   */
  constructor(code, message, entry = null) {
    super(message)
    this.name = 'ZipValidationError'
    this.code = code
    this.entry = entry
  }
}

// Devuelve la extensión en minúsculas de una ruta ('carpeta/x.PDF' → 'pdf').
function extensionOf(path) {
  const base = path.split(/[/\\]/).pop() || ''
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

// Detecta rutas que escaparían del directorio de extracción (Zip Slip):
// rutas absolutas (unix o Windows) o cualquier segmento '..'.
function isPathTraversal(path) {
  if (path.startsWith('/') || path.startsWith('\\')) return true
  if (/^[a-zA-Z]:[\\/]/.test(path)) return true            // C:\ , D:/ ...
  return path.split(/[/\\]/).some(seg => seg === '..')
}

// Artefactos que el sistema operativo inyecta automáticamente al comprimir una
// carpeta, NO archivos de negocio: Windows (Thumbs.db, desktop.ini) y macOS
// (.DS_Store y los "resource forks" __MACOSX/ y ._*). No son peligrosos y el
// usuario no los puso a propósito, así que se IGNORAN (no entran a `entries`) en
// vez de rechazar el ZIP completo. Sin esto, una carpeta de Arriendos con JPGs
// zippeada a mano en Windows arrastra Thumbs.db y el ZIP legítimo (formato D con
// factura .jpg) se rechazaría por 'tipo no permitido (.db)' — regresión sobre un
// flujo que antes funcionaba. La blocklist de ejecutables se evalúa ANTES que
// esto, así que un artefacto no puede usarse para colar código.
const OS_ARTIFACT_NAMES = new Set(['thumbs.db', 'desktop.ini', '.ds_store'])
function isBenignOsArtifact(path) {
  const segments = path.split(/[/\\]/)
  const base = (segments.pop() || '').toLowerCase()
  if (OS_ARTIFACT_NAMES.has(base)) return true
  if (base.startsWith('._')) return true                   // AppleDouble resource fork
  return segments.includes('__MACOSX')
}


/**
 * Valida un archivo ZIP de forma estricta.
 *
 * @param {File|Blob} file  Archivo seleccionado por el usuario.
 * @param {object}   [opts]
 * @param {string[]} [opts.allowedExtensions] Allowlist estricta. Si se omite,
 *        solo se aplica la blocklist de extensiones peligrosas.
 * @returns {Promise<{ zip: JSZip, entries: string[] }>} El ZIP ya cargado (para
 *        reutilizarlo sin volver a parsear) y las rutas de sus archivos.
 * @throws {ZipValidationError}
 */
export async function validateZipFile(file, opts = {}) {
  if (!file) {
    throw new ZipValidationError('NO_FILE', 'No se recibió ningún archivo.')
  }

  const allow = opts.allowedExtensions
    ? new Set(opts.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, '')))
    : null

  // Se leen los bytes una sola vez. File/Blob (navegador) y Blob (Node >=18)
  // exponen arrayBuffer(), y JSZip.loadAsync acepta ArrayBuffer en ambos.
  const buffer = await file.arrayBuffer()

  // 1) Magic number. La extensión y el MIME (file.type) son solo pistas; la
  //    firma binaria es la única fuente confiable del formato real.
  const magic = new Uint8Array(buffer.slice(0, ZIP_MAGIC.length))
  if (!ZIP_MAGIC.every((b, i) => magic[i] === b)) {
    throw new ZipValidationError(
      'INVALID_MAGIC_NUMBER',
      'El archivo no es un ZIP válido o está dañado.',
    )
  }

  // 2) Estructura interna. Un ZIP con firma correcta pero contenido dañado
  //    hará fallar loadAsync → lo reportamos como corrupto.
  let zip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch (err) {
    throw new ZipValidationError(
      'CORRUPTED_ZIP',
      'El ZIP está dañado o no se pudo leer su estructura.',
    )
  }

  // 3) Inspección entrada por entrada.
  const entries = []
  const paths = []
  zip.forEach((path) => { paths.push(path) })

  for (const path of paths) {
    if (isPathTraversal(path)) {
      throw new ZipValidationError(
        'ZIP_SLIP_DETECTED',
        'El ZIP contiene rutas de archivo no válidas y fue rechazado por seguridad.',
        path,
      )
    }

    const entry = zip.files[path]
    if (entry?.dir) continue                 // las carpetas no tienen extensión que validar

    const ext = extensionOf(path)

    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new ZipValidationError(
        'DANGEROUS_FILE_FOUND',
        `El ZIP contiene un archivo ejecutable no permitido: ${path}`,
        path,
      )
    }

    // Basura del SO (Thumbs.db, desktop.ini, .DS_Store, __MACOSX/, ._*): se
    // ignora sin tumbar el ZIP. Va DESPUÉS de la blocklist para que un ejecutable
    // no pueda esconderse detrás de una ruta __MACOSX/.
    if (isBenignOsArtifact(path)) continue

    if (allow && ext && !allow.has(ext)) {
      throw new ZipValidationError(
        'DISALLOWED_FILE_TYPE',
        `El ZIP contiene un tipo de archivo no permitido (.${ext}): ${path}`,
        path,
      )
    }

    entries.push(path)
  }

  if (!entries.length) {
    throw new ZipValidationError(
      'EMPTY_ZIP',
      'El ZIP no contiene archivos.',
    )
  }

  return { zip, entries }
}
