// ─────────────────────────────────────────────────────────────────────────────
// Puente entre errores de validación Zod y la UI (PrimeVue Toast).
//
// Convierte los `issues` de un ZodError en mensajes legibles por campo, para
// distinguir claramente un error de VALIDACIÓN local de un error del BACKEND.
// ─────────────────────────────────────────────────────────────────────────────

// ¿Es un error de Zod? (evita importar la clase para no acoplar).
export function isZodError(err) {
  return !!err && (err.name === 'ZodError' || Array.isArray(err.issues))
}

// Lista de { field, message } a partir de un ZodError (o de sus issues).
export function zodIssuesToMessages(err) {
  const issues = Array.isArray(err) ? err : err?.issues || []
  return issues.map((i) => ({
    field: Array.isArray(i.path) ? i.path.join('.') : String(i.path ?? ''),
    message: i.message,
  }))
}

// Mapa { campo: mensaje } para pintar errores por campo en el formulario.
export function zodErrorsByField(err) {
  const map = {}
  for (const { field, message } of zodIssuesToMessages(err)) {
    if (field && !map[field]) map[field] = message
  }
  return map
}

// Texto multilínea "campo: mensaje" para el detalle de un Toast.
export function zodIssuesToText(err) {
  return zodIssuesToMessages(err)
    .map(({ field, message }) => (field ? `${field}: ${message}` : message))
    .join('\n')
}

// Muestra un Toast de error de validación (distinto de los errores de API).
export function showZodError(toast, err, summary = 'Datos inválidos') {
  if (!toast) return
  toast.add({
    severity: 'warn',
    summary,
    detail: zodIssuesToText(err) || 'Revisa los campos del formulario.',
    life: 5000,
  })
}
