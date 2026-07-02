/**
 * Pruebas del validador estricto de ZIP.
 * Ejecutar:  node src/utils/zipValidator.test.mjs
 *
 * Igual que conciliacionMandatos.test.mjs, no hay runner (vitest/jest) en el
 * repo. El módulo fuente es ESM (`import JSZip from 'jszip'` + `export`), que
 * node no ejecuta directamente bajo este package CommonJS. Así que:
 *   - se lee el código fuente,
 *   - se quitan la línea de import y los `export`,
 *   - se evalúa inyectando JSZip como parámetro (importado aquí, en el .mjs).
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import JSZip from 'jszip'

const here = dirname(fileURLToPath(import.meta.url))
let src = fs.readFileSync(join(here, 'zipValidator.js'), 'utf8')
src = src
  .replace(/^import .*$/gm, '')          // quita `import JSZip from 'jszip'`
  .replace(/^export const /gm, 'const ')
  .replace(/^export class /gm, 'class ')
  .replace(/^export async function /gm, 'async function ')
  .replace(/^export function /gm, 'function ')
const factory = new Function('JSZip', src +
  '\nreturn { validateZipFile, ZipValidationError, ALLOWED_EXTENSIONS_ARRIENDOS, ALLOWED_EXTENSIONS_MANDATOS };')
const { validateZipFile, ALLOWED_EXTENSIONS_ARRIENDOS } = factory(JSZip)

let ok = true
const assert = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false }

// Construye un Blob ZIP real (con firma PK correcta) a partir de un mapa de archivos.
async function makeZipBlob(files) {
  const zip = new JSZip()
  for (const [name, content] of Object.entries(files)) zip.file(name, content)
  const u8 = await zip.generateAsync({ type: 'uint8array' })
  return new Blob([u8], { type: 'application/zip' })
}

// Ejecuta validateZipFile y devuelve el `code` del error, o 'OK' si no falla.
async function codeOf(file, opts) {
  try {
    await validateZipFile(file, opts)
    return 'OK'
  } catch (e) {
    return e.code || 'THREW_' + (e.name || 'Error')
  }
}

async function run() {
  // 1) ZIP válido con solo PDFs/XLSX → pasa.
  {
    const blob = await makeZipBlob({
      'pago_1/cuenta_cobro.pdf': 'x',
      'reporte.xlsx': 'y',
    })
    const res = await validateZipFile(blob, { allowedExtensions: ['pdf', 'xlsx'] })
    assert(res.entries.length === 2, `ZIP válido: 2 entradas (obtuvo ${res.entries.length})`)
    assert(!!res.zip, 'ZIP válido: devuelve la instancia JSZip cargada para reutilizar')
  }

  // 1b) ZIP de Arriendos con PDF + JPG → pasa con la allowlist de Arriendos
  //     (regresión: el JPG de factura_electronica NO debe rechazarse).
  {
    const blob = await makeZipBlob({
      'pago_1/COLXXP1_cuenta_cobro.pdf': 'x',
      'pago_1/factura_electronica.jpg': 'img',
    })
    assert(await codeOf(blob, { allowedExtensions: ALLOWED_EXTENSIONS_ARRIENDOS }) === 'OK',
      'ZIP de Arriendos con JPG: pasa (no se rompe el flujo formato D)')
  }

  // 2) ZIP con un .exe adentro → DANGEROUS_FILE_FOUND.
  {
    const blob = await makeZipBlob({ 'pago_1/cuenta.pdf': 'x', 'malware.exe': 'MZ' })
    assert(await codeOf(blob, { allowedExtensions: ['pdf'] }) === 'DANGEROUS_FILE_FOUND',
      'ZIP con .exe: DANGEROUS_FILE_FOUND')
  }
  // 2b) El ejecutable se detecta aunque no se pase allowlist (blocklist siempre activa).
  {
    const blob = await makeZipBlob({ 'doc.pdf': 'x', 'run.bat': 'echo' })
    assert(await codeOf(blob) === 'DANGEROUS_FILE_FOUND',
      'ZIP con .bat sin allowlist: DANGEROUS_FILE_FOUND (blocklist siempre activa)')
  }

  // 3) ZIP con entrada '../../etc/passwd' → ZIP_SLIP_DETECTED.
  {
    const blob = await makeZipBlob({ 'pago_1/ok.pdf': 'x', '../../../etc/passwd': 'root' })
    assert(await codeOf(blob) === 'ZIP_SLIP_DETECTED', 'ZIP con ../.. : ZIP_SLIP_DETECTED')
  }
  // 3b) Ruta absoluta → también ZIP_SLIP_DETECTED.
  {
    const blob = await makeZipBlob({ 'doc.pdf': 'x' })
    // Inserta una ruta absoluta manualmente en un ZIP nuevo.
    const zip = new JSZip()
    zip.file('doc.pdf', 'x')
    zip.file('/etc/hosts', 'y')
    const u8 = await zip.generateAsync({ type: 'uint8array' })
    const abs = new Blob([u8], { type: 'application/zip' })
    assert(await codeOf(abs) === 'ZIP_SLIP_DETECTED', 'ZIP con ruta absoluta: ZIP_SLIP_DETECTED')
  }

  // 4) Archivo de texto renombrado a .zip → INVALID_MAGIC_NUMBER.
  {
    const fake = new Blob(['esto no es un zip, es texto plano'], { type: 'application/zip' })
    assert(await codeOf(fake) === 'INVALID_MAGIC_NUMBER', 'Texto renombrado .zip: INVALID_MAGIC_NUMBER')
  }

  // 5) ZIP con firma correcta pero estructura corrupta → CORRUPTED_ZIP.
  {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00, 0x13, 0x37, 0x42, 0x42])
    const corrupt = new Blob([bytes], { type: 'application/zip' })
    assert(await codeOf(corrupt) === 'CORRUPTED_ZIP', 'ZIP con firma PK pero basura: CORRUPTED_ZIP')
  }

  // 6) ZIP válido pero con extensión fuera de la allowlist → DISALLOWED_FILE_TYPE.
  {
    const blob = await makeZipBlob({ 'nota.txt': 'hola' })
    assert(await codeOf(blob, { allowedExtensions: ['pdf'] }) === 'DISALLOWED_FILE_TYPE',
      'ZIP con .txt y allowlist [pdf]: DISALLOWED_FILE_TYPE')
  }

  // 7) ZIP totalmente vacío → sin firma PK\x03\x04 (solo fin de directorio
  //    central PK\x05\x06) → INVALID_MAGIC_NUMBER.
  {
    const zip = new JSZip()
    const u8 = await zip.generateAsync({ type: 'uint8array' })
    const empty = new Blob([u8], { type: 'application/zip' })
    assert(await codeOf(empty) === 'INVALID_MAGIC_NUMBER',
      'ZIP totalmente vacío: INVALID_MAGIC_NUMBER (no hay encabezado de archivo local)')
  }

  // 7b) ZIP solo con carpetas (sin archivos reales) → EMPTY_ZIP.
  {
    const zip = new JSZip()
    zip.folder('pago_1')
    const u8 = await zip.generateAsync({ type: 'uint8array' })
    const soloCarpetas = new Blob([u8], { type: 'application/zip' })
    assert(await codeOf(soloCarpetas) === 'EMPTY_ZIP', 'ZIP solo con carpetas: EMPTY_ZIP')
  }

  console.log(ok ? '\n✅ Todos los tests pasaron' : '\n❌ Hay tests fallidos')
  process.exit(ok ? 0 : 1)
}

run()
