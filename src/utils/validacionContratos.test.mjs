/**
 * Prueba mínima de la validación de solapamiento de contratos ASIC.
 * Ejecutar:  node src/utils/validacionContratos.test.mjs
 *
 * No hay runner (vitest/jest) en el repo, así que este test lee el módulo fuente,
 * quita los `export` (que node no interpreta en .js bajo package CommonJS) y corre
 * aserciones. Mismo patrón que conciliacionMandatos.test.mjs.
 */
import { z } from 'zod'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadModule } from './_esmLoader.mjs'

const here = dirname(fileURLToPath(import.meta.url))
// El módulo ahora importa zod y el saneador → se cargan con el loader de pruebas
// inyectando esas dependencias (el saneador con su núcleo, sin DOMPurify).
const sanitizer = loadModule(join(here, 'sanitizer.js'), { DOMPurify: undefined })
const api = loadModule(join(here, 'validacionContratos.js'), { z, sanitizeString: sanitizer.sanitizeString })
const {
  toIsoDate, checkDateOverlap, findReplacementContract, validateContractUniqueness,
  conflictosAtribucion, finEfectivoIso, sanitizeContrato, validateContratoMetadata,
} = api

let ok = true
const assert = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) ok = false }

// ── toIsoDate ──────────────────────────────────────────────────────
assert(toIsoDate('2026-01-05T12:00:00') === '2026-01-05', 'toIsoDate recorta string ISO')
assert(toIsoDate(new Date(2026, 0, 5)) === '2026-01-05', 'toIsoDate de Date usa componentes locales (sin correr día)')
assert(toIsoDate(null) === null, 'toIsoDate(null) = null')

// ── checkDateOverlap: los cuatro casos del plan ────────────────────
const base = [{ id: 1, fecha_inicio: '2026-01-01', fecha_fin: '2026-06-30' }]

assert(checkDateOverlap('2026-07-01', '2026-12-31', base).length === 0,
  'Sin solapamiento (rangos disjuntos)')
assert(checkDateOverlap('2026-06-30', '2026-12-31', base).length === 1,
  'Solapamiento en un solo día (borde inclusivo)')
assert(checkDateOverlap('2026-05-01', '2026-08-01', base).length === 1,
  'Solapamiento parcial')
assert(checkDateOverlap('2025-01-01', '2027-01-01', base).length === 1,
  'Solapamiento total (envuelve al existente)')
assert(checkDateOverlap('2026-01-01', '2026-06-30', base).length === 1,
  'Fechas iguales solapan')

// Fecha fin abierta (null) = vigente indefinido → cruza con cualquier futuro.
assert(checkDateOverlap('2030-01-01', null, [{ id: 9, fecha_inicio: '2020-01-01', fecha_fin: null }]).length === 1,
  'Fin abierto se trata como infinito')

// ── conflictosAtribucion: mismo activo, estados y auto-exclusión ───
const universo = [
  { id: 1, proyecto_id: 10, estado_solicitud: 'publicado', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' },
  { id: 2, proyecto_id: 99, estado_solicitud: 'publicado', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' },
  { id: 3, proyecto_id: 10, estado_solicitud: 'terminado', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' },
]
assert(conflictosAtribucion({ proyecto_id: 10, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-01' }, universo).length === 1,
  'Conflicto solo con la misma planta (proyecto 10), no con la 99')
assert(conflictosAtribucion({ id: 1, proyecto_id: 10, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-01' }, universo).length === 0,
  'Se excluye a sí mismo por id al editar')
assert(conflictosAtribucion({ proyecto_id: 10, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-01' },
  [universo[2]]).length === 0,
  'Un contrato terminado no genera conflicto de atribución')
assert(conflictosAtribucion({ proyecto_id: null, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-01' }, universo).length === 0,
  'Sin planta seleccionada no hay conflicto que evaluar')

// ── findReplacementContract: mismo SIC, activo, cruzado ────────────
const porSic = [
  { id: 1, codigo_sic_contrato: '88806', estado_solicitud: 'publicado', fecha_inicio: '2025-01-01', fecha_fin: '2026-12-31' },
  { id: 2, codigo_sic_contrato: '99999', estado_solicitud: 'publicado', fecha_inicio: '2025-01-01', fecha_fin: '2026-12-31' },
]
const repl = findReplacementContract({ codigo_sic_contrato: '88806', fecha_inicio: '2026-06-01', fecha_fin: '2027-06-01' }, porSic)
assert(repl.length === 1 && repl[0].id === 1, 'Reemplazo: encuentra el contrato del mismo SIC que se cruza')
assert(findReplacementContract({ codigo_sic_contrato: null, fecha_inicio: '2026-06-01' }, porSic).length === 0,
  'Sin SIC no hay candidato a reemplazar')

// ── validateContractUniqueness: duplicado exacto ───────────────────
const existentes = [
  { id: 1, codigo_sic_contrato: '88806', proyecto_id: 10, tipo_solicitud: 'registro', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' },
]
const nuevoDup = { codigo_sic_contrato: '88806', proyecto_id: 10, tipo_solicitud: 'registro', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' }
assert(validateContractUniqueness(nuevoDup, existentes).length === 1, 'Detecta duplicado exacto')
assert(validateContractUniqueness({ ...nuevoDup, fecha_fin: '2027-01-01' }, existentes).length === 0,
  'Distinta fecha fin → no es duplicado exacto')
assert(validateContractUniqueness({ ...nuevoDup, id: 1 }, existentes).length === 0,
  'No se cuenta a sí mismo como duplicado')

// ── Ventanas EFECTIVAS: el falso positivo de La Reserva (SIC 89116) ─
// La fila vieja de la planta en su SIC anterior conserva fecha_fin cruda 2030,
// pero un relevo (modificación con otra planta) la recortó al 2026-02-06.
assert(finEfectivoIso({ fecha_fin: '2030-03-31', fecha_fin_efectiva: '2026-02-06' }) === '2026-02-06',
  'finEfectivoIso prefiere la ventana efectiva sobre la cruda')
assert(finEfectivoIso({ fecha_fin: '2030-03-31' }) === '2030-03-31',
  'finEfectivoIso cae a la cruda si el backend no manda efectiva (compat)')

const filaSuperadaLaReserva = {
  id: 1, proyecto_id: 12, estado_solicitud: 'publicado', codigo_sic_contrato: '87137',
  fecha_inicio: '2025-04-03', fecha_fin: '2030-03-31', fecha_fin_efectiva: '2026-02-06',
}
assert(conflictosAtribucion(
  { proyecto_id: 12, fecha_inicio: '2026-02-07', fecha_fin: '2039-12-31' },
  [filaSuperadaLaReserva]).length === 0,
  'La Reserva: la fila superada por un relevo NO genera conflicto (ventanas efectivas disjuntas)')
assert(conflictosAtribucion(
  { proyecto_id: 12, fecha_inicio: '2026-02-07', fecha_fin: '2039-12-31' },
  [{ ...filaSuperadaLaReserva, fecha_fin_efectiva: undefined }]).length === 1,
  'Sin efectiva (backend viejo) se conserva el comportamiento anterior (fallback a cruda)')
assert(conflictosAtribucion(
  { proyecto_id: 12, fecha_inicio: '2026-01-01', fecha_fin: '2039-12-31' },
  [filaSuperadaLaReserva]).length === 1,
  'Si la ventana propuesta pisa el tramo efectivamente vigente, el cruce es REAL y sigue alarmando')

// ── Exclusiones: bolsa y terminaciones ─────────────────────────────
assert(conflictosAtribucion(
  { proyecto_id: 12, fecha_inicio: '2026-01-01', fecha_fin: '2039-12-31' },
  [{ ...filaSuperadaLaReserva, es_duplicado: true }]).length === 0,
  'Una fila ya marcada compra en bolsa no vuelve a generar conflicto')
assert(conflictosAtribucion(
  { proyecto_id: 12, fecha_inicio: '2026-01-01', fecha_fin: '2039-12-31' },
  [{ ...filaSuperadaLaReserva, tipo_solicitud: 'terminacion' }]).length === 0,
  'Una terminación no es un contrato que genere: no cuenta como conflicto')

// ── Editar una fila que el servidor ya recortó ─────────────────────
// El corte lo impone el relevo del SIC: aunque el form diga fin 2030, la
// ventana propuesta termina 2026-02-06 → no cruza con el nuevo hogar (89116).
assert(conflictosAtribucion(
  { id: 1, proyecto_id: 12, fecha_inicio: '2025-04-03', fecha_fin: '2030-03-31' },
  [filaSuperadaLaReserva,
   { id: 3, proyecto_id: 12, estado_solicitud: 'publicado', codigo_sic_contrato: '89116',
     fecha_inicio: '2026-02-07', fecha_fin: '2039-12-31', fecha_fin_efectiva: '2039-12-31' }],
  ).length === 0,
  'Editar la fila recortada respeta su corte: no alarma contra el nuevo hogar de la planta')

// ── Saneamiento y validación de metadatos (nuevo) ──────────────────
const contratoSucio = sanitizeContrato({
  codigo_sic_contrato: '<b>88806</b>',
  observaciones: '<script>alert(1)</script>ok',
  proyecto_id: 10,
})
assert(contratoSucio.codigo_sic_contrato === '88806', 'sanitizeContrato limpia el código SIC')
assert(contratoSucio.observaciones === 'ok', 'sanitizeContrato limpia observaciones (XSS)')
assert(contratoSucio.proyecto_id === 10, 'sanitizeContrato preserva campos no textuales')

assert(validateContratoMetadata({ fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31', valor: 1000 }).success,
  'validateContratoMetadata acepta metadatos coherentes')
assert(!validateContratoMetadata({ fecha_inicio: '2026-12-31', fecha_fin: '2026-01-01' }).success,
  'validateContratoMetadata rechaza fecha_fin anterior a fecha_inicio')
assert(!validateContratoMetadata({ valor: -5 }).success,
  'validateContratoMetadata rechaza importe negativo')

console.log(ok ? '\n✅ TODO OK' : '\n❌ HAY FALLOS')
process.exit(ok ? 0 : 1)
