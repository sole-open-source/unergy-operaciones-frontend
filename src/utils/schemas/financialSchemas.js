// ─────────────────────────────────────────────────────────────────────────────
// Esquemas Zod para los formularios financieros.
//
// Refuerzan el tipado estricto (números positivos, fechas, períodos YYYY-MM) y
// limpian el texto de forma NO destructiva (control-chars + trim): el texto que
// viaja al backend no se mutila; la defensa XSS vive en el render. El esquema
// de Mandatos vive en `mandatoSchemas.js` y se re-exporta aquí por conveniencia.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { sanitizeString } from '../sanitizer.js'
import { mandatoSchema } from './mandatoSchemas.js'

// Texto libre saneado (se limpia SIEMPRE, aunque venga vacío).
const textoSaneado = (max = 255) =>
  z.string().max(max, `Máximo ${max} caracteres`).transform((v) => sanitizeString(v, { stripMarkup: false }))

// Período contable en formato YYYY-MM.
export const periodoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM')

// ── Arriendos ────────────────────────────────────────────────────────────────
// valor_base / canon_archivo son de solo lectura (vienen de Sun Factory) pero se
// validan como no negativos por si se reutiliza el esquema en una carga.
export const arriendoSchema = z.object({
  periodo: periodoSchema,
  valor_base: z.number({ message: 'El valor base debe ser numérico' }).nonnegative('El valor base no puede ser negativo'),
  canon_archivo: z.number().nonnegative('El canon no puede ser negativo').nullable().optional(),
})

// Tasa IPC — es el input editable real de ArriendosOperaciones.vue.
export const ipcTasaSchema = z.object({
  año: z.number({ message: 'El año es obligatorio' }).int('El año debe ser entero').gte(2000, 'Año inválido').lte(2100, 'Año inválido'),
  tasa: z.number({ message: 'La tasa es obligatoria' }).gte(0, 'La tasa no puede ser negativa').lte(1, 'La tasa debe expresarse como fracción (0–1)'),
  fuente: textoSaneado(120).optional().default('DANE'),
  confirmado: z.boolean().optional(),
})

// ── Costos ───────────────────────────────────────────────────────────────────
export const costoSchema = z.object({
  monto: z.number({ message: 'El monto debe ser numérico' }).positive('El monto debe ser mayor que 0'),
  fecha: z.coerce.date({ message: 'Fecha inválida' }),
  tipo_accion: textoSaneado(80).refine((v) => v.length > 0, 'El tipo de acción es obligatorio'),
})

export { mandatoSchema }

// Helper: valida y sanea un objeto contra un esquema. Devuelve
// { success, data, errors } sin lanzar (útil en handlers de vista).
export function validateFinancial(schema, input) {
  const result = schema.safeParse(input)
  if (result.success) return { success: true, data: result.data, errors: [] }
  return { success: false, data: null, errors: result.error.issues }
}
