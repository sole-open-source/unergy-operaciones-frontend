// ─────────────────────────────────────────────────────────────────────────────
// Esquemas Zod para Mandatos (validador de mandatos + conciliación).
//
// `mandatoSchema` valida los overrides manuales / metadatos de un mandato.
// `mandatoCeldaSchema` valida una fila proveniente de un Excel (Odoo) tras el
// saneamiento de celdas hecho por fileValidator.js.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { sanitizeString } from '../sanitizer.js'

const texto = (max = 255) =>
  z.string().max(max, `Máximo ${max} caracteres`).transform((v) => sanitizeString(v, { stripMarkup: false }))

// inversionista_id puede llegar como número (id) o como código/string.
const inversionistaId = z.union([
  z.number().int().positive('El id de inversionista debe ser positivo'),
  z.string().min(1, 'El inversionista es obligatorio').transform((v) => sanitizeString(v, { stripMarkup: false })),
])

export const mandatoSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM'),
  cmu: z.number({ message: 'El CMU debe ser numérico' }).nonnegative('El CMU no puede ser negativo'),
  inversionista_id: inversionistaId,
})

// Fila mínima de un mandato en el Excel de conciliación (campos de interés).
export const mandatoCeldaSchema = z.object({
  planta: texto(160).optional(),
  inversionista: texto(160).optional(),
  valor: z.number({ message: 'El valor debe ser numérico' }).finite('Valor inválido'),
})

export function validateMandato(input) {
  const result = mandatoSchema.safeParse(input)
  if (result.success) return { success: true, data: result.data, errors: [] }
  return { success: false, data: null, errors: result.error.issues }
}
