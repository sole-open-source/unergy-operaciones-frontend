// ─────────────────────────────────────────────────────────────────────────────
// Esquemas Zod para el formulario de Cliente (ClienteForm.vue).
//
// Valida el formato de NIT/Cédula, sanea razón social y demás texto libre, y
// verifica el correo. Se usa junto con `sanitizeObject` en la vista: primero se
// sanea el payload completo y luego se valida contra este esquema (passthrough
// para no perder campos que el backend espere y que no estén modelados aquí).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod'
import { sanitizeString } from '../sanitizer.js'

// Texto libre saneado y opcional (el formulario omite los vacíos al enviar).
const textoOpc = (max = 255) =>
  z.string().max(max, `Máximo ${max} caracteres`).transform((v) => sanitizeString(v)).optional()

// Porcentaje 0–100 opcional.
const pctOpc = z.number().min(0, 'No puede ser negativo').max(100, 'No puede superar 100').optional()

// NIT/Cédula: solo dígitos, puntos o guion (p. ej. "900.123.456-7" o cédula).
const nitCedula = z
  .string()
  .transform((v) => sanitizeString(v))
  .refine((v) => v === '' || /^[\d.\-\s]{5,20}$/.test(v), 'NIT/Cédula inválido (solo dígitos, punto o guion)')
  .optional()

// Correo saneado y validado. Vacío se trata como ausente.
const correo = z
  .string()
  .transform((v) => sanitizeString(v))
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Correo electrónico inválido')
  .optional()

export const clienteSchema = z
  .object({
    razon_social_nombre: z
      .string({ message: 'La razón social es obligatoria' })
      .transform((v) => sanitizeString(v))
      .refine((v) => v.length > 0, 'La razón social es obligatoria')
      .refine((v) => v.length <= 255, 'Máximo 255 caracteres'),
    nit_cedula: nitCedula,
    tipo_persona: z.enum(['natural', 'juridica']).optional(),
    representante_legal: textoOpc(255),
    correo_electronico: correo,
    telefono_contacto: textoOpc(40),
    ciudad: textoOpc(120),
    departamento: textoOpc(120),
    direccion: textoOpc(255),
    origen_tipo: z.enum(['prospeccion_propia', 'recomendacion', 'referido', 'otro']).nullable().optional(),
    origen_detalle: textoOpc(255),
    banco: textoOpc(120),
    tipo_cuenta: z.enum(['ahorros', 'corriente']).optional(),
    numero_cuenta: textoOpc(40),
    titular_cuenta: textoOpc(160),
    iva_pct: pctOpc,
    retencion_pct: pctOpc,
    reteica_pct: pctOpc,
  })
  .passthrough()

// Valida un payload de cliente sin lanzar. Devuelve { success, data, errors }.
export function validateCliente(input) {
  const result = clienteSchema.safeParse(input)
  if (result.success) return { success: true, data: result.data, errors: [] }
  return { success: false, data: null, errors: result.error.issues }
}

// Sanea y valida una lista de correos separados por coma o punto y coma.
// Devuelve solo los correos válidos ya saneados.
export function sanitizeEmailList(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[;,]/)
    .map((e) => sanitizeString(e))
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
}
